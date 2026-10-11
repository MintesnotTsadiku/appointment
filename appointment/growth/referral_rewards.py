"""Business referral qualification and the free-booking credits it earns.

A referred business qualifies when it reaches the threshold of real bookings:
bookings that took place (completed, or confirmed with a start in the past) for
customers who are not the owner and do not use a reserved test address. Counting
only bookings that happened keeps cancelled or invented future bookings out. Then each side gets a Free Booking
Credit row. Credits are append-only and keyed, so rewarding runs at most once
and the platform fee waiver can always be traced to a row.
"""

import frappe
from frappe.query_builder.functions import Coalesce, Count, Sum
from frappe.utils import cint, now_datetime

from appointment.growth.referral_codes import PARTNER_PREFIX, owner_user
from appointment.growth.settings import growth
from appointment.scheduler import business_owner

# Reserved for documentation and tests (RFC 2606 / RFC 6761); bookings from them never count.
TEST_DOMAINS = ("example.com", "example.org", "example.net", "example.test", "test", "invalid", "localhost", "example")
DAILY_LIMIT = 500


def bonus_free_bookings(owner_key):
    """Free bookings a business earned through referrals, on top of the platform allowance."""
    credit = frappe.qb.DocType("Free Booking Credit")
    total = (
        frappe.qb.from_(credit).select(Sum(credit.free_bookings))
        .where((credit.owner_key == owner_key) & (credit.status == "Credited"))
    ).run()
    return cint(total[0][0]) if total else 0


def real_bookings(owner_key):
    """Bookings that count toward qualification for one business."""
    owner = business_owner.from_key(owner_key)
    appointment = frappe.qb.DocType("Appointment")
    email = Coalesce(appointment.client_email, "")
    took_place = (appointment.status == "Completed") | (
        (appointment.status == "Confirmed") & (appointment.starts_at <= _utc_now())
    )
    query = frappe.qb.from_(appointment).select(Count(appointment.name)).where(took_place)
    if owner.organization:
        query = query.where(appointment.organization == owner.organization)
    else:
        if not owner.services:
            return 0
        query = query.where(
            (appointment.provider == owner.provider) & (Coalesce(appointment.organization, "") == "")
            & appointment.service.isin(owner.services)
        )
    for domain in TEST_DOMAINS:
        query = query.where(email.not_like(f"%@{domain}") & email.not_like(f"%.{domain}"))
    user = owner_user(owner_key)
    if user:
        query = query.where(email != user)
    return cint(query.run()[0][0])


def check_business(owner_key):
    """Update progress for a referred business and reward it at the threshold. Cheap when nothing is pending."""
    name = frappe.db.get_value("Business Referral", {"referred_owner_key": owner_key, "status": ["!=", "Rewarded"]}, "name")
    if not name or not growth()["business_referrals_enabled"]:
        return None
    return evaluate(name)


def evaluate(name):
    """Recount one referral and reward it once when it reaches the threshold."""
    count = real_bookings(frappe.db.get_value("Business Referral", name, "referred_owner_key"))
    frappe.db.set_value("Business Referral", name, "qualifying_bookings", count, update_modified=False)
    threshold = max(1, cint(growth()["referral_threshold_bookings"]))
    if count >= threshold:
        reward(name)
    return frappe.db.get_value("Business Referral", name, "status")


def reward(name):
    """Credit both sides exactly once. The row lock serializes the hook and the daily job."""
    frappe.db.sql("select name from `tabBusiness Referral` where name=%s for update", name)
    referral = frappe.get_doc("Business Referral", name)
    if referral.status == "Rewarded":
        return referral
    settings = growth()
    now = now_datetime()
    if referral.status == "Pending":
        referral.db_set({"status": "Qualified", "qualified_at": now})
    amount = cint(settings["referral_reward_free_bookings"])
    _credit(referral, "referred", referral.referred_owner_key, amount, "Referred business bonus")
    if referral.referrer_partner:
        _credit_partner(referral, cint(settings["partner_reward_free_bookings"]))
    elif referral.referrer_owner_key:
        _credit(referral, "referrer", referral.referrer_owner_key, amount, "Referral reward")
    referral.db_set({"status": "Rewarded", "rewarded_at": now})
    return referral


def daily():
    """Safety net for bookings the hook missed (imports, status changes made in bulk)."""
    if not growth()["business_referrals_enabled"]:
        return 0
    names = frappe.get_all("Business Referral", filters={"status": ["!=", "Rewarded"]}, pluck="name", limit=DAILY_LIMIT)
    for name in names:
        try:
            evaluate(name)
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            frappe.log_error(title="Referral qualification failed", reference_doctype="Business Referral", reference_name=name)
    return len(names)


# ---------------------------------------------------------------------------
# Credits
# ---------------------------------------------------------------------------
def _credit(referral, side, owner_key, amount, reason):
    if amount <= 0 or not owner_key:
        return
    owner = business_owner.from_key(owner_key)
    _insert_credit(referral, side, dict(
        owner_key=owner_key, free_bookings=amount, reason=reason, status="Credited", **business_owner.record_fields(owner),
    ))


def _credit_partner(referral, amount):
    """A partner is not a business. Its reward is owed for manual payout, or credited to its own business when linked."""
    if amount <= 0:
        return
    linked = frappe.db.get_value("Growth Partner", referral.referrer_partner, "linked_owner_key")
    if linked:
        owner = business_owner.from_key(linked)
        values = dict(owner_key=linked, status="Credited", **business_owner.record_fields(owner))
    else:
        values = dict(owner_key=PARTNER_PREFIX + referral.referrer_partner, status="Payout owed")
    _insert_credit(referral, "partner", dict(
        free_bookings=amount, reason="Partner reward", growth_partner=referral.referrer_partner, **values,
    ))


def _utc_now():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).replace(tzinfo=None)


def _insert_credit(referral, side, values):
    key = f"{referral.name}:{side}"
    if frappe.db.exists("Free Booking Credit", {"credit_key": key}):
        return
    frappe.get_doc(dict(
        doctype="Free Booking Credit", business_referral=referral.name, credit_key=key,
        note=f"Referral of {referral.referred_name}", **values,
    )).insert(ignore_permissions=True)
