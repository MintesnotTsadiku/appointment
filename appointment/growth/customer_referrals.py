"""Customer referrals for one business: "Bring a friend".

The owner turns on an offer (a percent off or a free-text reward). Each customer
then has a personal code. When a new customer books with that code, the referrer
gets a Customer Referral Reward voucher, and the friend gets one too when the
owner chose "both". Staff redeem vouchers at the desk; the booking payment flow
has no discount line, so vouchers are never applied to online payments.
"""

import frappe
from frappe import _
from frappe.utils import add_days, cint, getdate, now_datetime, nowdate

from appointment.growth import referral_codes
from appointment.growth.settings import growth
from appointment.scheduler import business_owner

REWARD_FIELDS = [
    "name", "customer_profile", "customer_name", "role", "status", "reward_label", "expires_on",
    "redeemed_at", "appointment", "friend_profile", "creation",
]
DEFAULT_VALID_DAYS = 90
MAX_REWARD_TEXT = 80


# ---------------------------------------------------------------------------
# Offer
# ---------------------------------------------------------------------------
def offer(owner_key):
    """The stored offer of a business, or None."""
    name = frappe.db.get_value("Customer Referral Offer", {"owner_key": owner_key}, "name")
    return frappe.get_doc("Customer Referral Offer", name) if name else None


def active_offer(owner_key):
    """The offer when customer referrals are on for the platform and this business, and it has not ended."""
    if not owner_key or not growth()["customer_referrals_enabled"]:
        return None
    row = offer(owner_key)
    if not row or not row.enabled or (row.ends_on and getdate(row.ends_on) < getdate(nowdate())):
        return None
    return row


def offer_view(row, default_percent=None):
    """What pages show about an offer."""
    percent = cint(default_percent if default_percent is not None else growth()["customer_referral_default_percent"]) or 10
    if not row:
        return dict(enabled=False, reward_type="Percent", percent=percent, reward_text="", ends_on=None, friend_gets_offer=False)
    return dict(
        enabled=bool(row.enabled), reward_type=row.reward_type or "Percent", percent=cint(row.percent) or percent,
        reward_text=row.reward_text or "", ends_on=str(row.ends_on) if row.ends_on else None,
        friend_gets_offer=bool(row.friend_gets_offer),
    )


def reward_label(row):
    """The stored voucher text: `10%` for a percent offer, the owner's words otherwise."""
    return row.reward_text if row.reward_type == "Custom" else f"{cint(row.percent)}%"


def save_offer(owner_key, enabled, reward_type, percent, reward_text, ends_on, friend_gets_offer):
    owner = business_owner.from_key(owner_key)
    if reward_type not in ("Percent", "Custom"):
        frappe.throw(_("Choose a percent off or your own reward."))
    percent = cint(percent)
    text = " ".join(str(reward_text or "").split())[:MAX_REWARD_TEXT]
    if reward_type == "Percent" and not 1 <= percent <= 100:
        frappe.throw(_("Enter a discount between 1 and 100 percent."))
    if reward_type == "Custom" and not text:
        frappe.throw(_("Describe the reward, for example a free hair wash."))
    if ends_on and getdate(ends_on) < getdate(nowdate()):
        frappe.throw(_("The end date cannot be in the past."))
    row = offer(owner_key) or frappe.get_doc(dict(
        doctype="Customer Referral Offer", owner_key=owner_key, voucher_valid_days=DEFAULT_VALID_DAYS,
        **business_owner.record_fields(owner),
    ))
    row.update(dict(
        enabled=cint(enabled), reward_type=reward_type, percent=percent or row.percent, reward_text=text or None,
        ends_on=ends_on or None, friend_gets_offer=cint(friend_gets_offer),
    ))
    row.save(ignore_permissions=True)
    return row


# ---------------------------------------------------------------------------
# Booking hooks
# ---------------------------------------------------------------------------
def on_booking_insert(doc, method=None):
    """Issue vouchers when a new customer books with a friend's code."""
    code = referral_codes.clean(doc.get("referral_code"))
    if not code or not doc.customer:
        return
    owner_key = booking_owner_key(doc)
    holder = frappe.db.get_value("Customer Referral Code", code, ["customer_profile", "owner_key"], as_dict=True)
    row = active_offer(owner_key)
    if not holder or holder.owner_key != owner_key or not row or holder.customer_profile == doc.customer:
        return
    if frappe.db.exists("Appointment", {"customer": doc.customer, "name": ["!=", doc.name]}):
        return  # Only new customers count.
    _issue(row, holder.customer_profile, "Referrer", doc, f"referrer:{owner_key}:{doc.customer}", code)
    if row.friend_gets_offer:
        _issue(row, doc.customer, "Friend", doc, f"friend:{owner_key}:{doc.customer}", code)


def on_booking_cancel(doc):
    """A cancelled referred booking voids the vouchers it issued, unless they were already used."""
    for name in frappe.get_all("Customer Referral Reward", filters={"appointment": doc.name, "status": "Issued"}, pluck="name"):
        frappe.db.set_value("Customer Referral Reward", name, "status", "Expired")


def booking_owner_key(doc):
    if doc.get("organization"):
        return doc.organization
    return business_owner.PREFIX + doc.provider if doc.get("provider") else None


def expire_due():
    """Daily: vouchers past their date expire."""
    names = frappe.get_all(
        "Customer Referral Reward", filters={"status": "Issued", "expires_on": ["<", nowdate()]}, pluck="name", limit=1000
    )
    for name in names:
        frappe.db.set_value("Customer Referral Reward", name, "status", "Expired")
    return len(names)


def _issue(row, profile, role, doc, key, code):
    if frappe.db.exists("Customer Referral Reward", {"reward_key": key}):
        return None
    return frappe.get_doc(dict(
        doctype="Customer Referral Reward", owner_key=row.owner_key, organization=row.organization,
        independent_provider=row.independent_provider, customer_profile=profile,
        customer_name=frappe.db.get_value("Customer Profile", profile, "display_name"), role=role, status="Issued",
        reward_label=reward_label(row), referral_code=code, appointment=doc.name, friend_profile=doc.customer,
        expires_on=add_days(nowdate(), cint(row.voucher_valid_days) or DEFAULT_VALID_DAYS), reward_key=key,
    )).insert(ignore_permissions=True)


# ---------------------------------------------------------------------------
# Vouchers
# ---------------------------------------------------------------------------
def redeem(reward, appointment=None):
    doc = frappe.get_doc("Customer Referral Reward", reward)
    if doc.status != "Issued":
        frappe.throw(_("This reward was already used or has expired."))
    if doc.expires_on and getdate(doc.expires_on) < getdate(nowdate()):
        doc.db_set("status", "Expired")
        frappe.throw(_("This reward has expired."))
    if appointment and booking_owner_key(frappe.get_doc("Appointment", appointment)) != doc.owner_key:
        frappe.throw(_("The booking belongs to another business."), frappe.PermissionError)
    doc.update(dict(status="Redeemed", redeemed_at=now_datetime(), redeemed_by=frappe.session.user, redeemed_appointment=appointment))
    doc.save(ignore_permissions=True)
    return doc


def rewards_for(profile):
    return frappe.get_all("Customer Referral Reward", filters={"customer_profile": profile}, fields=REWARD_FIELDS, order_by="creation desc", limit=50)


def referrer_of(doc):
    """The customer whose code a booking used, as {customer, name}, when it belongs to the same business."""
    code = referral_codes.clean(doc.get("referral_code"))
    holder = frappe.db.get_value("Customer Referral Code", code, ["customer_profile", "owner_key"], as_dict=True) if code else None
    if not holder or holder.owner_key != booking_owner_key(doc):
        return None
    return dict(customer=holder.customer_profile, name=frappe.db.get_value("Customer Profile", holder.customer_profile, "display_name"))
