"""Customer self-service: a signed manage link per booking, and policy-driven changes.

A token is `<appointment>.<manage_version>.<signature>`. `validate_document`
raises `manage_version` whenever the time or status changes, so every earlier
link stops working. A link also stops when the appointment starts.

The business's booking policy decides what the customer may do:
- reschedule only outside the reschedule window, at most MAX_SELF_RESCHEDULES times;
- cancel up to the start, with the late fee and refund shown before confirming.
No money moves: the fee and refund are recorded for staff.
See docs/features/CUSTOMER_SELF_SERVICE_PLAN.md.
"""

import hashlib
import hmac
from datetime import datetime, timedelta

import frappe
import pytz
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cint, flt, get_datetime, get_url
from frappe.utils.password import get_encryption_key

from appointment.scheduler import business_owner, payments
from appointment.scheduler.booking import CUSTOMER_CHANGE
from appointment.scheduler.helpers.policy_engine import get_applicable_policies

MAX_SELF_RESCHEDULES = 2
OPEN = ("Pending", "Confirmed")
INVALID = _("This link no longer works. Use the link in your latest email, or contact the business.")


# ---------------------------------------------------------------------------
# Token
# ---------------------------------------------------------------------------
def token_for(doc):
    version = cint(doc.manage_version)
    return f"{doc.name}.{version}.{_sign(doc.name, version)}"


def manage_url(doc):
    """`/<slug>/booking/<token>` for an organization, `/schedule/individual/booking/<token>` for an independent provider."""
    owner = business_owner.for_booking(doc)
    return get_url(f"{owner.manage_root}/{token_for(doc)}") if owner and owner.manage_root else ""


def _sign(name, version):
    key = get_encryption_key().encode()
    return hmac.new(key, f"manage:{name}:{version}".encode(), hashlib.sha256).hexdigest()[:32]


def _verify(token, slug=None, independent=0):
    """The booking for a valid, current token, or None.

    The organization route passes its slug; the independent route asks for a provider-owned booking.
    """
    try:
        name, version, signature = (token or "").rsplit(".", 2)
        version = int(version)
    except ValueError:
        return None
    if not hmac.compare_digest(signature, _sign(name, version)) or not frappe.db.exists("Appointment", name):
        return None
    doc = frappe.get_doc("Appointment", name)
    if cint(doc.manage_version) != version or doc.status not in OPEN or _hours_left(doc) <= 0:
        return None
    if slug and frappe.db.get_value("Organization", doc.organization, "slug") != slug:
        return None
    if cint(independent) and (doc.organization or not business_owner.for_booking(doc)):
        return None
    return doc


def _require(token, slug=None, independent=0):
    doc = _verify(token, slug, independent)
    if not doc:
        frappe.throw(INVALID, frappe.PermissionError)
    return doc


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------
def _now():
    return datetime.now(pytz.UTC).replace(tzinfo=None)


def _hours_left(doc, now=None):
    return (get_datetime(doc.starts_at) - (now or _now())).total_seconds() / 3600


def _policy(doc):
    zone = pytz.timezone(doc.booking_timezone or "Africa/Addis_Ababa")
    local_date = pytz.UTC.localize(get_datetime(doc.starts_at)).astimezone(zone).date()
    policies = get_applicable_policies(doc.service, doc.location, doc.provider, datetime.combine(local_date, datetime.min.time()))
    return policies[0] if policies else None


def decide(doc, now=None):
    """What the customer may do now, with the fee and refund a cancel would record."""
    hours_left = _hours_left(doc, now)
    is_open = doc.status in OPEN and hours_left > 0
    policy = _policy(doc)
    reschedule_window = cint(policy.get("reschedule_window_hours")) if policy else 0
    cancellation_window = cint(policy.get("cancellation_window_hours")) if policy else 0

    if not is_open:
        reschedule_block = "closed"
    elif cint(doc.self_reschedules) >= MAX_SELF_RESCHEDULES:
        reschedule_block = "limit"
    elif reschedule_window and hours_left < reschedule_window:
        reschedule_block = "window"
    else:
        reschedule_block = None

    late = bool(is_open and cancellation_window and hours_left < cancellation_window)
    fee = _late_fee(doc, policy) if late else 0.0
    paid = flt(doc.amount_paid)
    return dict(
        hours_left=round(max(hours_left, 0), 1),
        can_reschedule=reschedule_block is None,
        reschedule_block=reschedule_block,
        reschedule_window_hours=reschedule_window,
        reschedules_left=max(MAX_SELF_RESCHEDULES - cint(doc.self_reschedules), 0),
        can_cancel=is_open,
        cancel_late=late,
        cancellation_window_hours=cancellation_window,
        fee=fee,
        amount_paid=paid,
        refund=_refund(paid, fee, policy),
        refund_policy=(policy or {}).get("refund_policy") or "Full Refund",
    )


def _late_fee(doc, policy):
    if flt(policy.get("late_cancellation_fee_amount")) > 0:
        return flt(policy.get("late_cancellation_fee_amount"))
    percentage = flt(policy.get("late_cancellation_fee_percentage"))
    # A percentage fee applies to what the booking costs: the offering's price times the quantity.
    unit = flt(frappe.db.get_value("EventType", doc.event_type, "price_override")) or flt(frappe.db.get_value("Service", doc.service, "price"))
    price = unit * max(1, cint(doc.get("quantity") or 1))
    return round(price * percentage / 100, 2) if percentage > 0 else 0.0


def _refund(paid, fee, policy):
    rule = (policy or {}).get("refund_policy") or "Full Refund"
    if rule == "No Refund":
        return 0.0
    base = paid * 0.5 if rule == "Partial Refund" else paid
    return round(max(base - fee, 0.0), 2)


# ---------------------------------------------------------------------------
# Guest APIs
# ---------------------------------------------------------------------------
@frappe.whitelist(allow_guest=True)
@rate_limit(limit=30, seconds=60)
def view(token, slug=None, independent=0):
    doc = _verify(token, slug, independent)
    if not doc:
        return {"valid": False, "message": INVALID}
    return _projection(doc)


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=10, seconds=60, methods=["POST"])
def reschedule(token, start_time, slug=None, independent=0):
    """Move the booking to a new start (ISO UTC from the slots API), keeping its length."""
    doc = _require(token, slug, independent)
    rules = decide(doc)
    if not rules["can_reschedule"]:
        frappe.throw(_("This booking can no longer be moved online. Contact the business."), frappe.ValidationError)
    zone = pytz.timezone(doc.booking_timezone)
    start = get_datetime(start_time.replace("Z", "")) if isinstance(start_time, str) else start_time
    local_start = pytz.UTC.localize(start.replace(tzinfo=None)).astimezone(zone)
    if (local_start.astimezone(pytz.UTC).replace(tzinfo=None) - _now()) <= timedelta(0):
        frappe.throw(_("Choose a time in the future."))
    duration = get_datetime(doc.ends_at) - get_datetime(doc.starts_at)
    local_end = local_start + duration
    if local_end.date() != local_start.date():
        frappe.throw(_("The booking must fit within one operating day."))
    # The same lifecycle as a staff change; validate_document checks hours and capacity.
    doc.appointment_date = local_start.date()
    doc.start_time = local_start.strftime("%H:%M:%S")
    doc.end_time = local_end.strftime("%H:%M:%S")
    doc.self_reschedules = cint(doc.self_reschedules) + 1
    doc.flags.customer_change = CUSTOMER_CHANGE
    doc.save(ignore_permissions=True)
    return _projection(doc)


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=10, seconds=60, methods=["POST"])
def cancel(token, accept_fee=0, slug=None, independent=0):
    doc = _require(token, slug, independent)
    rules = decide(doc)
    if not rules["can_cancel"]:
        frappe.throw(INVALID, frappe.PermissionError)
    if rules["fee"] > 0 and not cint(accept_fee):
        frappe.throw(_("Confirm the late cancellation fee to cancel."), frappe.ValidationError)
    doc.status = "Cancelled"
    doc.cancellation_fee = rules["fee"]
    doc.refund_due = rules["refund"]
    doc.cancellation_reason = _("Cancelled by the customer")
    doc.flags.customer_change = CUSTOMER_CHANGE
    doc.save(ignore_permissions=True)
    return {"valid": False, "cancelled": True, "fee": rules["fee"], "refund": rules["refund"], "amount_paid": rules["amount_paid"]}


def _projection(doc):
    """What the guest may see: this booking and the business's public contact only."""
    business = business_owner.for_booking(doc)
    location = frappe.db.get_value(
        "Location", doc.location, ["location_name", "address_line_1", "address_line_2", "city"], as_dict=True
    ) or {}
    address = ", ".join(filter(None, [location.get("address_line_1"), location.get("address_line_2"), location.get("city")]))
    return {
        "valid": True,
        "token": token_for(doc),
        "business": dict(
            id=business.key, name=business.display_name, slug=business.slug, phone=business.phone, email=business.email,
            kind=business.kind, book_path=business.book_path, my_bookings_path=business.my_bookings_path,
            manage_root=business.manage_root,
        ),
        "booking": dict(
            reference=doc.appointment_id or doc.name,
            offering=doc.event_type,
            service=frappe.db.get_value("Service", doc.service, "service_name"),
            provider=frappe.db.get_value("Provider", doc.provider, "full_name") if doc.provider else None,
            resources=[frappe.db.get_value("Resource", row.resource, "resource_name") for row in doc.get("resources") or []],
            quantity=cint(doc.get("quantity") or 1),
            location=location.get("location_name"),
            address=address or None,
            starts_at=get_datetime(doc.starts_at).isoformat() + "Z",
            ends_at=get_datetime(doc.ends_at).isoformat() + "Z",
            timezone=doc.booking_timezone,
            status=doc.status,
            duration_minutes=int((get_datetime(doc.ends_at) - get_datetime(doc.starts_at)).total_seconds() // 60),
        ),
        "rules": decide(doc),
        "currency": "ETB",
        "payment": payments.public_view(payments.latest_payment(doc.name)),
    }
