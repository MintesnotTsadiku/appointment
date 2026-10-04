"""Booking payments: checkout amounts, holds, bank-transfer proof, review, refunds and the ledger.

Payment is required when `Organization.require_payment` is on. The amount due
now is the booking policy's deposit (the booking fee), or the full price when
the policy has none. A booking that needs payment starts Pending and holds its
slot until `hold_expires_at`; paying confirms it. Who collects (the business or
the platform) comes from Payment Settings with a per-business override.
See docs/features/BOOKING_PAYMENTS_PLAN.md.
"""

import base64
from datetime import datetime, timedelta

import frappe
import pytz
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cint, flt, get_datetime

from appointment.scheduler import notifications
from appointment.scheduler.booking import PAYMENT_CHANGE
from appointment.scheduler.booking_access import managed_organizations, require_access
from appointment.scheduler.helpers.policy_engine import calculate_booking_quote

BANK = "Bank transfer"
CHAPA = "Chapa"
HOLD = {BANK: timedelta(hours=24), CHAPA: timedelta(minutes=15)}
LATEST_BEFORE_START = timedelta(hours=2)
MIN_HOLD = timedelta(minutes=10)
PROOF_LIMIT_BYTES = 5 * 1024 * 1024
PROOF_TYPES = {".png", ".jpg", ".jpeg", ".webp", ".pdf"}
OPEN_PAYMENT = ("Awaiting payment", "Submitted")


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
def platform():
    return frappe.get_cached_doc("Payment Settings")


def business(organization):
    if frappe.db.exists("Business Payment Settings", organization):
        return frappe.get_doc("Business Payment Settings", organization)
    return frappe.get_doc(dict(doctype="Business Payment Settings", organization=organization, accept_bank_transfer=1))


def collector(organization):
    override = business(organization).collection_override
    mode = override if override in ("Business collects", "Platform collects") else platform().collection_mode
    return "Platform" if mode == "Platform collects" else "Business"


def bank_accounts(organization, who=None):
    who = who or collector(organization)
    rows = platform().platform_bank_accounts if who == "Platform" else business(organization).bank_accounts
    return [dict(bank=r.bank, account_name=r.account_name, account_number=r.account_number, note=r.note) for r in rows]


def chapa_key(organization, who=None, field="chapa_secret_key"):
    who = who or collector(organization)
    doc = platform() if who == "Platform" else business(organization)
    return doc.get_password(field, raise_exception=False) if doc.get(field) else None


def methods(organization):
    """Payment methods a customer can use for this business right now."""
    settings = business(organization)
    available = []
    if settings.accept_bank_transfer and bank_accounts(organization):
        available.append(BANK)
    if settings.accept_chapa and chapa_key(organization):
        available.append(CHAPA)
    return available


def required(organization):
    return bool(frappe.db.get_value("Organization", organization, "require_payment"))


# ---------------------------------------------------------------------------
# Checkout amounts
# ---------------------------------------------------------------------------
def quote_for(event_type, start_utc, quantity=1):
    """Amounts and refund terms for one offering at one start time, for `quantity` (party size)."""
    event = frappe.get_doc("EventType", event_type)
    organization = frappe.db.get_value("Service", event.service, "organization")
    # The offering's own price wins, as on the public page; the quantity multiplies it.
    unit_price = flt(event.price_override) or flt(frappe.db.get_value("Service", event.service, "price"))
    price = round(unit_price * max(1, cint(quantity)), 2)
    zone = pytz.timezone(frappe.db.get_value("Location", event.location, "timezone") or "Africa/Addis_Ababa")
    local = pytz.UTC.localize(get_datetime(start_utc)).astimezone(zone)
    quote = calculate_booking_quote(event.service, price, event.location, event.provider, datetime.combine(local.date(), datetime.min.time()))
    due = flt(quote.get("deposit_amount")) or price
    policy = (quote.get("policies") or [{}])[0] if quote.get("policies") else {}
    return dict(
        required=required(organization) and due > 0,
        currency="ETB",
        service_price=price,
        unit_price=unit_price,
        quantity=max(1, cint(quantity)),
        amount_due=round(min(due, price) if price else due, 2),
        balance_due=round(max(price - due, 0), 2),
        is_deposit=bool(flt(quote.get("deposit_amount"))) and flt(quote.get("deposit_amount")) < price,
        refund_policy=quote.get("refund_policy") or "Full Refund",
        cancellation_window_hours=cint(policy.get("cancellation_window_hours")),
        late_cancellation_fee=flt(quote.get("late_cancellation_fee")),
        methods=methods(organization),
        collector=collector(organization),
    )


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=60, seconds=60)
def checkout(offering_id, start_time, quantity=1):
    """What the booking form shows before the customer confirms."""
    from appointment.scheduler.booking import quantity_for

    quantity = quantity_for(frappe.get_cached_doc("Service", frappe.db.get_value("EventType", offering_id, "service")), quantity)
    return quote_for(offering_id, _utc(start_time), quantity)


def _utc(value):
    value = get_datetime(str(value).replace("Z", ""))
    return value.replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Hold and payment record (called by booking.book)
# ---------------------------------------------------------------------------
def prepare_booking(doc, method):
    """Before insert: a paid booking starts Pending. Returns the quote, or None when no payment is due."""
    quote = quote_for(doc.event_type, _utc_from_doc(doc), doc.get("quantity") or 1)
    if not quote["required"]:
        return None
    if method not in quote["methods"]:
        frappe.throw(_("Choose a payment method this business accepts."))
    _deadline(method, _utc_from_doc(doc))  # Refuses times too close to pay for.
    doc.status = "Pending"
    return quote


def create_for_booking(doc, method, quote):
    """After insert: the Booking Payment that holds the slot, and the payment request email."""
    payment = frappe.get_doc(dict(
        doctype="Booking Payment",
        appointment=doc.name,
        organization=doc.organization,
        customer=doc.customer,
        method=method,
        collector=quote["collector"],
        amount=quote["amount_due"],
        service_price=quote["service_price"],
        balance_due=quote["balance_due"],
        currency=quote["currency"],
        status="Awaiting payment",
        hold_expires_at=_deadline(method, get_datetime(doc.starts_at)),
    )).insert(ignore_permissions=True)
    doc.flags.notification_status = notifications.queue_notification(doc, "Payment request")
    return payment


def _utc_from_doc(doc):
    if doc.starts_at:
        return get_datetime(doc.starts_at)
    zone = pytz.timezone(frappe.db.get_value("Location", doc.location, "timezone") or "Africa/Addis_Ababa")
    local = zone.localize(get_datetime(f"{doc.appointment_date} {doc.start_time}"))
    return local.astimezone(pytz.UTC).replace(tzinfo=None)


def _now():
    return datetime.now(pytz.UTC).replace(tzinfo=None)


def _deadline(method, starts_at):
    now = _now()
    latest = get_datetime(starts_at) - (LATEST_BEFORE_START if method == BANK else timedelta(0))
    deadline = min(now + HOLD[method], latest)
    if deadline - now < MIN_HOLD:
        frappe.throw(
            _("This time is too soon to pay by bank transfer. Choose a later time or pay online.")
            if method == BANK
            else _("This time is too soon to book. Choose a later time.")
        )
    return deadline


def open_payment(appointment):
    name = frappe.db.get_value(
        "Booking Payment", {"appointment": appointment, "status": ["in", OPEN_PAYMENT + ("Rejected",)]}, "name", order_by="creation desc"
    )
    return frappe.get_doc("Booking Payment", name) if name else None


def latest_payment(appointment):
    name = frappe.db.get_value("Booking Payment", {"appointment": appointment}, "name", order_by="creation desc")
    return frappe.get_doc("Booking Payment", name) if name else None


def public_view(payment):
    """What the customer may see about their payment."""
    if not payment:
        return None
    return dict(
        method=payment.method,
        status=payment.status,
        amount=payment.amount,
        service_price=payment.service_price,
        balance_due=payment.balance_due,
        currency=payment.currency,
        hold_expires_at=get_datetime(payment.hold_expires_at).isoformat() + "Z" if payment.hold_expires_at else None,
        accounts=bank_accounts(payment.organization, payment.collector) if payment.method == BANK else [],
        reject_reason=payment.reject_reason if payment.status == "Rejected" else None,
        reference_submitted=bool(payment.reference or payment.proof),
        receipts=[dict(name=r.name, receipt_number=r.receipt_number, kind=r.kind) for r in _receipts(payment.name) if r.status == "Issued"],
    )


def _receipts(payment_name):
    from appointment.scheduler import receipts

    return receipts.for_payment(payment_name)


# ---------------------------------------------------------------------------
# Customer: bank-transfer proof (through the manage link)
# ---------------------------------------------------------------------------
@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=10, seconds=60, methods=["POST"])
def submit_proof(token, reference=None, file_name=None, file_data=None, slug=None):
    from appointment.scheduler.self_service import _require

    doc = _require(token, slug)
    payment = open_payment(doc.name)
    if not payment or payment.method != BANK or payment.status not in ("Awaiting payment", "Rejected"):
        frappe.throw(_("There is no bank transfer waiting for proof on this booking."))
    reference = (reference or "").strip()[:140]
    if not reference and not file_data:
        frappe.throw(_("Enter the transfer reference or attach a screenshot."))
    if file_data:
        payment.proof = _save_proof(payment, file_name, file_data).file_url
    payment.reference = reference or payment.reference
    payment.status = "Submitted"
    payment.reject_reason = None
    payment.submitted_at = _now()
    payment.save(ignore_permissions=True)
    return public_view(payment)


def _save_proof(payment, file_name, file_data):
    name = (file_name or "proof").strip()[:120]
    extension = ("." + name.rsplit(".", 1)[-1].lower()) if "." in name else ""
    if extension not in PROOF_TYPES:
        frappe.throw(_("Attach an image or a PDF."))
    content = base64.b64decode(file_data.split(",", 1)[-1], validate=False)
    if len(content) > PROOF_LIMIT_BYTES:
        frappe.throw(_("The file is too large. The limit is 5 MB."))
    return frappe.get_doc(dict(
        doctype="File", file_name=name, content=content, is_private=1,
        attached_to_doctype="Booking Payment", attached_to_name=payment.name,
    )).insert(ignore_permissions=True)


# ---------------------------------------------------------------------------
# Staff: review and refunds
# ---------------------------------------------------------------------------
def _staff_payment(payment_name):
    payment = frappe.get_doc("Booking Payment", payment_name)
    require_access(frappe.get_doc("Appointment", payment.appointment))
    return payment


@frappe.whitelist()
def for_appointment(appointment):
    require_access(frappe.get_doc("Appointment", appointment))
    rows = frappe.get_all(
        "Booking Payment", filters={"appointment": appointment},
        fields=["name", "method", "collector", "status", "amount", "service_price", "balance_due", "currency", "hold_expires_at",
                "reference", "proof", "submitted_at", "paid_at", "reject_reason", "refund_amount", "refund_reference", "refund_proof", "refunded_at"],
        order_by="creation desc",
    )
    for row in rows:
        row["receipts"] = _receipts(row.name)
    return rows


@frappe.whitelist()
def download_proof(payment, kind="proof"):
    """Stream a private proof file to staff who can access the booking."""
    payment = _staff_payment(payment)
    url = payment.refund_proof if kind == "refund" else payment.proof
    if not url:
        frappe.throw(_("No file was attached."), frappe.DoesNotExistError)
    file = frappe.get_doc("File", {"file_url": url, "attached_to_doctype": "Booking Payment", "attached_to_name": payment.name})
    frappe.local.response.update(dict(filename=file.file_name, filecontent=file.get_content(), type="download", display_content_as="inline"))


@frappe.whitelist(methods=["POST"])
def confirm(payment):
    payment = _staff_payment(payment)
    if payment.status not in ("Submitted", "Awaiting payment"):
        frappe.throw(_("Only a waiting or submitted payment can be confirmed."))
    mark_paid(payment, reviewer=frappe.session.user)
    return payment.as_dict()


@frappe.whitelist(methods=["POST"])
def reject(payment, reason):
    payment = _staff_payment(payment)
    if payment.status != "Submitted":
        frappe.throw(_("Only a submitted payment can be rejected."))
    doc = frappe.get_doc("Appointment", payment.appointment)
    payment.update(dict(
        status="Rejected", reject_reason=(reason or "").strip()[:500] or _("The payment could not be found."),
        reviewed_by=frappe.session.user, hold_expires_at=_retry_deadline(payment, doc), reminder_sent=0,
    ))
    payment.save(ignore_permissions=True)
    return payment.as_dict()


def _retry_deadline(payment, doc):
    try:
        return _deadline(payment.method, get_datetime(doc.starts_at))
    except frappe.ValidationError:
        frappe.clear_messages()
        return _now() + MIN_HOLD


@frappe.whitelist(methods=["POST"])
def record_refund(payment, amount, reference=None, file_name=None, file_data=None):
    payment = _staff_payment(payment)
    if payment.status not in ("Paid", "Refunded"):
        frappe.throw(_("Only a paid payment can be refunded."))
    amount = flt(amount)
    if amount <= 0 or amount > flt(payment.amount):
        frappe.throw(_("Enter a refund between 0 and the amount paid."))
    if file_data:
        name = (file_name or "refund").strip()[:120]
        extension = ("." + name.rsplit(".", 1)[-1].lower()) if "." in name else ""
        if extension not in PROOF_TYPES:
            frappe.throw(_("Attach an image or a PDF."))
        content = base64.b64decode(file_data.split(",", 1)[-1], validate=False)
        if len(content) > PROOF_LIMIT_BYTES:
            frappe.throw(_("The file is too large. The limit is 5 MB."))
        payment.refund_proof = frappe.get_doc(dict(
            doctype="File", file_name=name, content=content, is_private=1,
            attached_to_doctype="Booking Payment", attached_to_name=payment.name,
        )).insert(ignore_permissions=True).file_url
    payment.update(dict(status="Refunded", refund_amount=amount, refund_reference=(reference or "").strip()[:140], refunded_at=_now()))
    payment.save(ignore_permissions=True)
    from appointment.scheduler import receipts

    receipts.issue(payment, "Refund")
    return payment.as_dict()


# ---------------------------------------------------------------------------
# Paid: confirm the booking, write the ledger
# ---------------------------------------------------------------------------
def mark_paid(payment, reviewer=None, provider_reference=None):
    if payment.status == "Paid":
        return payment
    payment.update(dict(status="Paid", paid_at=_now(), reviewed_by=reviewer, provider_reference=provider_reference or payment.provider_reference))
    payment.save(ignore_permissions=True)
    doc = frappe.get_doc("Appointment", payment.appointment)
    doc.amount_paid = flt(doc.amount_paid) + flt(payment.amount)
    if doc.status == "Pending":
        doc.status = "Confirmed"
    doc.flags.payment_change = PAYMENT_CHANGE
    doc.save(ignore_permissions=True)
    _ledger(payment)
    from appointment.scheduler import receipts

    receipts.issue(payment, "Payment")
    return payment


def _fee(payment):
    settings = platform()
    business_settings = business(payment.organization)
    value = flt(business_settings.platform_fee_override if business_settings.override_platform_fee else settings.platform_fee_value)
    if settings.platform_fee_type == "Fixed":
        return round(value, 2)
    if settings.platform_fee_type == "Percent":
        return round(flt(payment.amount) * value / 100, 2)
    return 0.0


def _ledger(payment):
    fee = _fee(payment)
    paid_so_far = frappe.db.count("Booking Payment", {"organization": payment.organization, "status": ["in", ["Paid", "Refunded"]]})
    waived = paid_so_far <= cint(platform().free_bookings)
    if fee > 0 or payment.collector == "Platform":
        frappe.get_doc(dict(
            doctype="Platform Ledger Entry", organization=payment.organization, entry_type="Platform fee", amount=fee,
            status="Waived" if waived or fee <= 0 else "Due", appointment=payment.appointment, booking_payment=payment.name,
            note=_("Free allowance") if waived and fee > 0 else None,
        )).insert(ignore_permissions=True)
    if payment.collector == "Platform":
        kept = 0 if waived else fee
        frappe.get_doc(dict(
            doctype="Platform Ledger Entry", organization=payment.organization, entry_type="Payout due",
            amount=round(flt(payment.amount) - kept, 2), status="Due", appointment=payment.appointment, booking_payment=payment.name,
        )).insert(ignore_permissions=True)


# ---------------------------------------------------------------------------
# Scheduler: reminders and expiry
# ---------------------------------------------------------------------------
def process_holds():
    """Remind once at half time for bank transfers; release unpaid holds at the deadline."""
    now = _now()
    rows = frappe.get_all(
        "Booking Payment",
        filters={"status": ["in", ["Awaiting payment", "Rejected"]], "hold_expires_at": ["is", "set"]},
        fields=["name", "method", "hold_expires_at", "creation", "reminder_sent", "appointment"],
        limit=500,
    )
    expired = reminded = 0
    for row in rows:
        deadline = get_datetime(row.hold_expires_at)
        if deadline <= now:
            _expire(frappe.get_doc("Booking Payment", row.name))
            expired += 1
        elif row.method == BANK and not row.reminder_sent and now >= _halfway(row, deadline):
            doc = frappe.get_doc("Appointment", row.appointment)
            if doc.status == "Pending":
                notifications.queue_notification(doc, "Payment reminder")
            frappe.db.set_value("Booking Payment", row.name, "reminder_sent", 1, update_modified=False)
            reminded += 1
    return {"expired": expired, "reminded": reminded}


def _halfway(row, deadline):
    created = pytz.timezone(frappe.utils.get_system_timezone()).localize(get_datetime(row.creation)).astimezone(pytz.UTC).replace(tzinfo=None)
    return created + (deadline - created) / 2


def _expire(payment):
    payment.db_set("status", "Expired")
    if payment.method == CHAPA and payment.tx_ref:
        try:
            from appointment.scheduler import payments_chapa

            payments_chapa.cancel(payment)
        except Exception:
            frappe.log_error(title="Chapa cancel failed", reference_doctype="Booking Payment", reference_name=payment.name)
    doc = frappe.get_doc("Appointment", payment.appointment)
    if doc.status != "Pending":
        return
    doc.status = "Cancelled"
    doc.cancellation_reason = _("Payment not received")
    doc.flags.payment_change = PAYMENT_CHANGE
    doc.save(ignore_permissions=True)


# ---------------------------------------------------------------------------
# Business settings (owners and managers)
# ---------------------------------------------------------------------------
def _require_manager(organization):
    if organization not in managed_organizations():
        frappe.throw(_("You cannot manage payments for this business."), frappe.PermissionError)


@frappe.whitelist()
def get_settings(organization):
    _require_manager(organization)
    settings = business(organization)
    who = collector(organization)
    return dict(
        require_payment=cint(frappe.db.get_value("Organization", organization, "require_payment")),
        accept_bank_transfer=cint(settings.accept_bank_transfer),
        accept_chapa=cint(settings.accept_chapa),
        bank_accounts=[dict(bank=r.bank, account_name=r.account_name, account_number=r.account_number, note=r.note) for r in settings.bank_accounts],
        chapa_configured=bool(settings.chapa_secret_key),
        collector=who,
        platform_accounts=bank_accounts(organization, "Platform") if who == "Platform" else [],
        methods=methods(organization),
        receipt_prefix=settings.get("receipt_prefix") or "",
        default_receipt_prefix=receipts_prefix_default(organization),
        tin=settings.get("tin") or "",
    )


def receipts_prefix_default(organization):
    from appointment.scheduler import receipts

    return receipts.default_prefix(frappe.db.get_value("Organization", organization, "organization_name"))


@frappe.whitelist(methods=["POST"])
def save_settings(organization, require_payment=None, accept_bank_transfer=None, accept_chapa=None, bank_accounts=None,
                  chapa_secret_key=None, chapa_webhook_secret=None, receipt_prefix=None, tin=None):
    """Owners and managers set methods and accounts. Who collects stays with the platform administrator."""
    import json

    _require_manager(organization)
    settings = business(organization)
    if accept_bank_transfer is not None:
        settings.accept_bank_transfer = cint(accept_bank_transfer)
    if accept_chapa is not None:
        settings.accept_chapa = cint(accept_chapa)
    if bank_accounts is not None:
        rows = json.loads(bank_accounts) if isinstance(bank_accounts, str) else bank_accounts
        settings.set("bank_accounts", [
            dict(bank=(r.get("bank") or "").strip(), account_name=(r.get("account_name") or "").strip(),
                 account_number=(r.get("account_number") or "").strip(), note=(r.get("note") or "").strip() or None)
            for r in rows or [] if (r.get("bank") or "").strip() and (r.get("account_number") or "").strip()
        ])
    if chapa_secret_key:
        settings.chapa_secret_key = chapa_secret_key
    if chapa_webhook_secret:
        settings.chapa_webhook_secret = chapa_webhook_secret
    if receipt_prefix is not None:
        from appointment.scheduler import receipts

        settings.receipt_prefix = receipts.clean_prefix(receipt_prefix) or None
    if tin is not None:
        settings.tin = (tin or "").strip()[:40] or None
    settings.save(ignore_permissions=True) if not settings.is_new() else settings.insert(ignore_permissions=True)
    if require_payment is not None:
        if cint(require_payment) and not methods(organization):
            frappe.throw(_("Add a bank account or set up Chapa before requiring payment."))
        frappe.db.set_value("Organization", organization, "require_payment", cint(require_payment))
    return get_settings(organization)
