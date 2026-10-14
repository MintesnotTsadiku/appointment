"""Whitelisted APIs for customer referrals: owner offer, guest share and invite, staff vouchers.

Guests reach a customer's code only with a booking reference or a My bookings
session, which already prove they are that customer. An invite lookup reveals
only the referrer's first name, and only for a code of the same business.
"""

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import get_url

from appointment.growth import customer_referrals as core
from appointment.growth import referral_codes
from appointment.growth.settings import growth
from appointment.scheduler import business_owner, my_bookings


# ---------------------------------------------------------------------------
# Owner
# ---------------------------------------------------------------------------
@frappe.whitelist()
def get_offer(business):
    _require_owner(business)
    rewards = frappe.get_all(
        "Customer Referral Reward", filters={"owner_key": business}, fields=core.REWARD_FIELDS, order_by="creation desc", limit=20
    )
    counts = {status: frappe.db.count("Customer Referral Reward", {"owner_key": business, "status": status}) for status in ("Issued", "Redeemed")}
    return dict(
        available=growth()["customer_referrals_enabled"], offer=core.offer_view(core.offer(business)),
        issued=counts["Issued"], redeemed=counts["Redeemed"], rewards=rewards,
    )


@frappe.whitelist(methods=["POST"])
def save_offer(business, enabled=0, reward_type="Percent", percent=None, reward_text=None, ends_on=None, friend_gets_offer=0):
    _require_owner(business)
    if not growth()["customer_referrals_enabled"]:
        frappe.throw(_("Customer referrals are turned off for the platform."), frappe.PermissionError)
    core.save_offer(business, enabled, reward_type, percent, reward_text, ends_on, friend_gets_offer)
    return get_offer(business)


# ---------------------------------------------------------------------------
# Guests
# ---------------------------------------------------------------------------
@frappe.whitelist(allow_guest=True)
@rate_limit(limit=30, seconds=60)
def share(booking_id=None):
    """The booking customer's personal share link, shown after booking."""
    name = frappe.db.get_value("Appointment", {"appointment_id": booking_id}, "name") if booking_id else None
    if not name:
        return {"active": False}
    doc = frappe.get_doc("Appointment", name)
    return _share_view(core.booking_owner_key(doc), doc.customer)


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=30, seconds=60)
def my_share(slug=None, session=None, email=None, offering=None, provider_slug=None):
    """The share link on My bookings, for a signed-in customer."""
    owner = my_bookings._business(slug, offering, provider_slug)
    address = my_bookings._session_email(owner.key, session, email)
    profiles = my_bookings._profiles(owner, address) if address else []
    return _share_view(owner.key, profiles[0] if profiles else None)


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=60, seconds=60)
def invite(code=None, slug=None, offering=None, provider_slug=None):
    """"You were invited by <first name>" for a friend who opens a share link (scheduler or provider page)."""
    try:
        owner = my_bookings._business(slug, offering, provider_slug)
    except frappe.DoesNotExistError:
        return {"valid": False}
    clean = referral_codes.clean(code)
    holder = frappe.db.get_value("Customer Referral Code", clean, ["customer_profile", "owner_key"], as_dict=True) if clean else None
    row = core.active_offer(owner.key)
    if not holder or holder.owner_key != owner.key or not row:
        return {"valid": False}
    name = frappe.db.get_value("Customer Profile", holder.customer_profile, "display_name")
    return dict(valid=True, code=clean, first_name=referral_codes.first_name(name), business_name=owner.display_name, **_public_offer(row))


def _share_view(owner_key, profile):
    row = core.active_offer(owner_key)
    if not row or not profile:
        return {"active": False}
    owner = business_owner.from_key(owner_key)
    code = referral_codes.customer_code(profile)
    return dict(active=True, code=code, link=booking_link(owner, code), business_name=owner.display_name, **_public_offer(row))


def _public_offer(row):
    view = core.offer_view(row)
    return dict(reward_type=view["reward_type"], percent=view["percent"], reward_text=view["reward_text"],
                friend_gets_offer=view["friend_gets_offer"], ends_on=view["ends_on"])


def booking_link(owner, code):
    """The scheduler of the business with the code; the scheduler reads `ref` before booking."""
    if owner.organization:
        return get_url(f"/schedule/org/{owner.slug}?ref={code}")
    return get_url(f"{owner.book_path}?ref={code}")


# ---------------------------------------------------------------------------
# Staff
# ---------------------------------------------------------------------------
@frappe.whitelist()
def booking_referral(appointment):
    """"Referred by" and the vouchers that matter at the desk for one booking."""
    from appointment.scheduler.booking_access import require_access

    doc = frappe.get_doc("Appointment", appointment)
    require_access(doc)
    vouchers = core.rewards_for(doc.customer) if doc.customer else []
    return dict(
        referred_by=core.referrer_of(doc),
        issued=frappe.get_all("Customer Referral Reward", filters={"appointment": doc.name}, fields=core.REWARD_FIELDS),
        vouchers=[row for row in vouchers if row.status == "Issued"],
    )


@frappe.whitelist()
def customer_rewards(customer_id):
    from appointment.scheduler.customers import _require_customer

    _require_customer(customer_id, ("manager", "reception"))
    code = frappe.db.get_value("Customer Referral Code", {"customer_profile": customer_id}, "name")
    friends = frappe.db.count("Customer Referral Reward", {"customer_profile": customer_id, "role": "Referrer"})
    return dict(code=code, friends_referred=friends, rewards=core.rewards_for(customer_id))


@frappe.whitelist(methods=["POST"])
def redeem(reward, appointment=None):
    from appointment.scheduler.customers import role_in

    owner_key = frappe.db.get_value("Customer Referral Reward", reward, "owner_key")
    if not owner_key or role_in(owner_key) not in ("manager", "reception"):
        frappe.throw(_("You cannot redeem this reward."), frappe.PermissionError)
    return core.redeem(reward, appointment).as_dict()


def _require_owner(business):
    from appointment.growth.referrals import require_owner

    require_owner(business)
