"""Payment receipts: issued when a payment is confirmed or a refund is recorded.

Whoever collected the money issues the receipt (the business, or the platform
when it collects), with a yearly gapless sequence per issuer. A receipt is a
snapshot; its PDF is rendered from the record on demand. It is a payment
receipt, not a tax invoice. See docs/features/RECEIPTS_AND_STATEMENTS_PLAN.md.
"""

import base64
import re
from functools import lru_cache

import frappe
import pytz
from frappe import _
from frappe.model.naming import getseries
from frappe.utils import cint, escape_html, flt, get_datetime

from appointment.scheduler.booking_access import require_access

TEMPLATE = "appointment/templates/receipts/receipt.html"
# A static Regular instance: wkhtmltopdf cannot render the variable Noto font the web pages use.
FONT = ("public", "fonts", "pdf", "noto-sans-ethiopic-regular.ttf")
PLATFORM_PREFIX = "PLT"


# ---------------------------------------------------------------------------
# Issuer and number
# ---------------------------------------------------------------------------
def default_prefix(name):
    """First word of the business name in capitals, e.g. "Bole Bloom Hair Studio" → "BOLE"."""
    for word in re.split(r"\s+", name or ""):
        letters = re.sub(r"[^A-Za-z0-9]", "", word).upper()
        if letters:
            return letters[:6]
    return "RCP"


def clean_prefix(value):
    return re.sub(r"[^A-Za-z0-9]", "", value or "").upper()[:8]


def issuer(payment):
    """Name, TIN, contact and receipt prefix of whoever collected this payment."""
    from appointment.scheduler import payments

    if payment.collector == "Platform":
        settings = payments.platform()
        return dict(
            issuer="Platform",
            name=settings.get("legal_name") or frappe.db.get_single_value("Website Settings", "app_name") or "Platform",
            tin=settings.get("tin") or "",
            email="", phone="",
            prefix=clean_prefix(settings.get("receipt_prefix")) or PLATFORM_PREFIX,
        )
    business = frappe.get_doc("Organization", payment.organization)
    settings = payments.business(payment.organization)
    return dict(
        issuer="Business",
        name=business.organization_name,
        tin=settings.get("tin") or "",
        email=business.email or "", phone=business.phone or "",
        prefix=clean_prefix(settings.get("receipt_prefix")) or default_prefix(business.organization_name),
    )


def business_zone(organization):
    """The business's time zone: its own setting, else its first location's, else Addis Ababa."""
    zone = frappe.db.get_value("Organization", organization, "timezone")
    if not zone:
        zone = frappe.db.get_value("Location", {"organization": organization}, "timezone", order_by="creation asc")
    return zone or "Africa/Addis_Ababa"


def _utc_now():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(tzinfo=None)


def next_number(prefix, year):
    # tabSeries is updated inside this transaction, so a rollback leaves no gap.
    key = f"{prefix}-{year}-"
    return key + getseries(key, 5)


# ---------------------------------------------------------------------------
# Issue
# ---------------------------------------------------------------------------
def issue(payment, kind):
    """Issue a payment or refund receipt for `payment` and email it. Returns the receipt."""
    from appointment.scheduler import notifications

    if kind == "Payment":
        existing = frappe.db.get_value("Payment Receipt", {"booking_payment": payment.name, "kind": "Payment", "status": "Issued"}, "name")
        if existing:
            return frappe.get_doc("Payment Receipt", existing)
    doc = frappe.get_doc("Appointment", payment.appointment)
    who = issuer(payment)
    zone = pytz.timezone(doc.booking_timezone or "Africa/Addis_Ababa")
    start = pytz.UTC.localize(get_datetime(doc.starts_at)).astimezone(zone) if doc.starts_at else None
    issued_at = _utc_now()
    amount = flt(payment.refund_amount) if kind == "Refund" else flt(payment.amount)
    receipt = frappe.get_doc(dict(
        doctype="Payment Receipt",
        receipt_number=next_number(who["prefix"], pytz.UTC.localize(issued_at).astimezone(pytz.timezone(business_zone(payment.organization))).year),
        kind=kind, status="Issued", issuer=who["issuer"],
        organization=payment.organization, booking_payment=payment.name, appointment=doc.name,
        issuer_name=who["name"], issuer_tin=who["tin"], issuer_email=who["email"], issuer_phone=who["phone"],
        customer_name=doc.client_name, customer_email=doc.client_email,
        service_name=frappe.db.get_value("Service", doc.service, "service_name") + (f" × {doc.quantity}" if cint(doc.get("quantity")) > 1 else ""),
        booking_reference=doc.appointment_id or doc.name,
        booking_start=f"{start:%Y-%m-%d %H:%M} ({zone.zone})" if start else "",
        method=payment.method,
        reference=(payment.refund_reference if kind == "Refund" else payment.reference or payment.provider_reference) or "",
        amount=amount, currency=payment.currency or "ETB",
        balance_due=0 if kind == "Refund" else flt(payment.balance_due),
        issued_at=issued_at, language=notifications.customer_language(doc),
    )).insert(ignore_permissions=True)
    if kind == "Refund":
        # A corrected refund replaces the earlier refund receipt.
        for name in frappe.get_all("Payment Receipt", filters={"booking_payment": payment.name, "kind": "Refund", "status": "Issued", "name": ["!=", receipt.name]}, pluck="name"):
            frappe.db.set_value("Payment Receipt", name, {"status": "Void", "voided_by": receipt.name})
    if doc.client_email:
        notifications.queue_notification(doc, "Payment receipt" if kind == "Payment" else "Refund receipt", receipt=receipt.name)
    return receipt


def for_payment(payment_name):
    return frappe.get_all(
        "Payment Receipt", filters={"booking_payment": payment_name},
        fields=["name", "receipt_number", "kind", "status", "amount", "currency", "issued_at"], order_by="creation asc",
    )


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------
def render_html(receipt):
    language = receipt.language or "en"

    def t(text, *args):
        return _(text, lang=language).format(*(escape_html(str(arg)) for arg in args))

    money = lambda value: f"{receipt.currency} {flt(value):,.2f}"  # noqa: E731
    zone = pytz.timezone(business_zone(receipt.organization))
    issued = pytz.UTC.localize(get_datetime(receipt.issued_at)).astimezone(zone) if receipt.issued_at else None
    rows = [
        (t("Receipt number"), receipt.receipt_number),
        (t("Date"), f"{issued:%Y-%m-%d %H:%M}" if issued else ""),
        (t("Customer"), receipt.customer_name or ""),
        (t("Booking"), receipt.booking_reference or ""),
        (t("Service"), receipt.service_name or ""),
        (t("Appointment time"), receipt.booking_start or ""),
        (t("Payment method"), _(receipt.method or "", lang=language)),
        (t("Payment reference"), receipt.reference or ""),
    ]
    context = dict(
        lang=language, font_url=font_url(),
        title=t("Refund receipt") if receipt.kind == "Refund" else t("Payment receipt"),
        not_invoice=t("Payment receipt — not a tax invoice"),
        void=t("Void — replaced by {0}", receipt.voided_by) if receipt.status == "Void" else "",
        issuer_name=escape_html(receipt.issuer_name or ""),
        issuer_lines=[escape_html(x) for x in (
            t("TIN: {0}", receipt.issuer_tin) if receipt.issuer_tin else "",
            " · ".join(filter(None, [receipt.issuer_phone, receipt.issuer_email])),
        ) if x],
        rows=[(escape_html(label), escape_html(value)) for label, value in rows if value],
        amount_label=t("Amount refunded") if receipt.kind == "Refund" else t("Amount paid"),
        amount=escape_html(money(receipt.amount)),
        balance=escape_html(t("Balance at the visit: {0}", money(receipt.balance_due))) if flt(receipt.balance_due) else "",
        thanks=t("Thank you."),
    )
    return frappe.render_template(TEMPLATE, context)


@lru_cache(maxsize=1)
def font_url():
    """The Ethiopic font inlined as a data URI. Frappe's PDF renderer blocks local files."""
    with open(frappe.get_app_path("appointment", *FONT), "rb") as handle:
        return "data:font/truetype;base64," + base64.b64encode(handle.read()).decode()


def render_pdf(receipt):
    from frappe.utils.pdf import get_pdf

    return get_pdf(render_html(receipt), {"page-size": "A5", "margin-top": "12mm", "margin-bottom": "12mm"})


def attachment(receipt_name):
    receipt = frappe.get_doc("Payment Receipt", receipt_name)
    return {"fname": f"{receipt.receipt_number}.pdf", "fcontent": render_pdf(receipt)}


def _send(receipt):
    frappe.local.response.filename = f"{receipt.receipt_number}.pdf"
    frappe.local.response.filecontent = render_pdf(receipt)
    frappe.local.response.type = "pdf"


# ---------------------------------------------------------------------------
# Downloads
# ---------------------------------------------------------------------------
@frappe.whitelist(allow_guest=True)
def download(token, receipt, slug=None):
    """Customer download through the booking's manage link."""
    from appointment.scheduler.self_service import _require

    doc = _require(token, slug)
    record = frappe.get_doc("Payment Receipt", receipt)
    if record.appointment != doc.name:
        frappe.throw(_("Not permitted to access this booking."), frappe.PermissionError)
    _send(record)


@frappe.whitelist()
def download_staff(receipt):
    record = frappe.get_doc("Payment Receipt", receipt)
    if "System Manager" not in frappe.get_roles():
        require_access(frappe.get_doc("Appointment", record.appointment))
    _send(record)
