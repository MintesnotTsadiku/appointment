"""Business-to-business referrals: codes, sign-up attribution and the owner's progress view.

Contract for other workstreams:

- `business_code(owner_key)` returns the business's code and creates it on first use.
- `record_signup(code, owner_key)` links a new business to the business or partner that referred it.
- Sign-up pages pass `?ref=<code>` and `?source=<channel>` to `registration.signup`, which calls
  `remember_signup`. The first business that account creates takes the stored attribution
  (Organization and Provider hooks below), so every new business has a Business Signup Source.
- Guest `apply_partner(name, organization, email, phone, kind, message)` lives in `partners`; it is
  re-exported here so its public path stays `appointment.growth.referrals.apply_partner`.

See docs/growth/REFERRALS.md.
"""

import re

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import cint, now_datetime

from appointment.growth import referral_codes, referral_rewards
from appointment.growth.brand import brand
from appointment.growth.partners import apply_partner  # noqa: F401  (public path of the guest API)
from appointment.growth.referral_codes import business_code, display_name, owner_user  # noqa: F401
from appointment.growth.settings import growth
from appointment.scheduler import business_owner

SOURCE_PATTERN = re.compile(r"^[a-z0-9_-]{1,40}$")
DIRECT = "direct"
REFERRAL = "referral"


# ---------------------------------------------------------------------------
# Attribution
# ---------------------------------------------------------------------------
def clean_source(source, has_ref=False):
    value = str(source or "").strip().lower()
    if SOURCE_PATTERN.match(value):
        return value
    return REFERRAL if has_ref else DIRECT


def remember_signup(user, ref=None, source=None):
    """Keep a new account's sign-up channel until it creates its first business."""
    if not user or user in ("Guest", "Administrator"):
        return None
    code = referral_codes.clean(ref)
    pending = frappe.db.get_value("Business Signup Source", {"signup_user": user, "status": "Pending"}, "name")
    values = dict(source=clean_source(source, bool(code)), ref_code=code or None)
    if pending:
        frappe.db.set_value("Business Signup Source", pending, values)
        return pending
    return frappe.get_doc(dict(doctype="Business Signup Source", signup_user=user, status="Pending", **values)).insert(
        ignore_permissions=True
    ).name


@frappe.whitelist(methods=["POST"])
def note_signup(ref=None, source=None):
    """A signed-in account that opened a referral link before it has a business keeps that link."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Sign in first."), frappe.PermissionError)
    if frappe.db.exists("Business Signup Source", {"signup_user": user, "status": "Attached"}):
        return {"stored": False}
    return {"stored": bool(remember_signup(user, ref, source))}


def attach(user, owner_key):
    """Give a new business its sign-up source and, with a code, its referral. Runs once per business."""
    if not user or user == "Administrator" or frappe.db.exists("Business Signup Source", {"owner_key": owner_key}):
        return None
    pending = frappe.db.get_value("Business Signup Source", {"signup_user": user, "status": "Pending"}, ["name", "source", "ref_code"], as_dict=True)
    if not pending and not getattr(frappe.local, "request", None):
        return None  # Seeders and scripts create businesses without a sign-up.
    owner = business_owner.from_key(owner_key)
    values = dict(
        status="Attached", owner_key=owner_key, business_name=owner.display_name, attached_at=now_datetime(),
        **business_owner.record_fields(owner),
    )
    if pending:
        frappe.db.set_value("Business Signup Source", pending.name, values)
    else:
        pending = frappe._dict(source=DIRECT, ref_code=None)
        frappe.get_doc(dict(doctype="Business Signup Source", signup_user=user, source=DIRECT, **values)).insert(ignore_permissions=True)
    if pending.ref_code:
        record_signup(pending.ref_code, owner_key, source=pending.source, user=user)
    return owner_key


def record_signup(code, owner_key, source=None, user=None):
    """Create the Business Referral for a new business. Returns its name, or None when the code cannot apply."""
    if not growth()["business_referrals_enabled"]:
        return None
    holder = referral_codes.resolve(code)
    if not holder or frappe.db.exists("Business Referral", {"referred_owner_key": owner_key}):
        return None
    user = user or owner_user(owner_key)
    if _is_self_referral(holder, owner_key, user):
        return None
    partner = holder.growth_partner if holder.holder_type == "Partner" else None
    if partner and frappe.db.get_value("Growth Partner", partner, "status") != "Approved":
        return None
    owner = business_owner.from_key(owner_key)
    return frappe.get_doc(dict(
        doctype="Business Referral", referred_owner_key=owner_key, referred_name=owner.display_name,
        organization=owner.organization, independent_provider=owner.provider, status="Pending",
        referral_code=holder.name, source=clean_source(source, True) if source else ("partner" if partner else REFERRAL),
        referrer_owner_key=None if partner else holder.owner_key, referrer_partner=partner,
        referrer_name=holder.holder_name, signup_user=user,
    )).insert(ignore_permissions=True).name


def _is_self_referral(holder, owner_key, user):
    if holder.owner_key == owner_key:
        return True
    if holder.holder_type == "Partner":
        email = frappe.db.get_value("Growth Partner", holder.growth_partner, "email")
        linked = frappe.db.get_value("Growth Partner", holder.growth_partner, "linked_owner_key")
        return bool(user and email and email.lower() == user.lower()) or linked == owner_key
    return bool(user) and owner_user(holder.owner_key) == user


# ---------------------------------------------------------------------------
# Hooks
# ---------------------------------------------------------------------------
def on_organization_insert(doc, method=None):
    attach(doc.owner_user, doc.name)


def on_provider_update(doc, method=None):
    """An independent provider becomes a business when its own setup completes."""
    if doc.onboarding_type != "individual" or not cint(doc.onboarding_complete) or doc.organization or doc.get("organizations"):
        return
    attach(doc.user, business_owner.PREFIX + doc.name)


def on_booking_change(doc, method=None):
    """After a booking is saved: business referral progress, and void customer vouchers on cancellation."""
    from appointment.growth import customer_referrals

    key = customer_referrals.booking_owner_key(doc)
    if key:
        # A referral problem (for example a deleted referrer business) must never block a booking;
        # the daily job evaluates the referral again.
        frappe.db.savepoint("growth_referral_progress")
        try:
            referral_rewards.check_business(key)
        except Exception:
            frappe.db.rollback(save_point="growth_referral_progress")
            frappe.log_error(title="Referral progress check failed", reference_doctype=doc.doctype, reference_name=doc.name)
    if doc.status == "Cancelled" and doc.has_value_changed("status"):
        customer_referrals.on_booking_cancel(doc)


def daily():
    from appointment.growth import customer_referrals

    referral_rewards.daily()
    customer_referrals.expire_due()


# ---------------------------------------------------------------------------
# Owner view
# ---------------------------------------------------------------------------
@frappe.whitelist(allow_guest=True)
@rate_limit(limit=60, seconds=60)
def code_info(code=None):
    """Who invited a visitor to sign up. Codes are meant to be shared, so the holder name is public."""
    holder = referral_codes.resolve(code)
    if not holder or not growth()["business_referrals_enabled"]:
        return {"valid": False}
    return {"valid": True, "name": holder.holder_name, "kind": holder.holder_type}


@frappe.whitelist()
def overview(business):
    """The owner's referral code, link and the businesses it brought in."""
    require_owner(business)
    settings = growth()
    if not settings["business_referrals_enabled"]:
        return {"enabled": False}
    code = business_code(business)
    threshold = max(1, cint(settings["referral_threshold_bookings"]))
    rows = frappe.get_all(
        "Business Referral", filters={"referrer_owner_key": business},
        fields=["name", "referred_name", "status", "qualifying_bookings", "creation", "rewarded_at"],
        order_by="creation desc", limit=100,
    )
    reward = cint(settings["referral_reward_free_bookings"])
    return {
        "enabled": True,
        "code": code,
        "link": signup_link(code),
        "product_name": brand()["product_name"],
        "threshold": threshold,
        "reward": reward,
        "earned_free_bookings": referral_rewards.bonus_free_bookings(business),
        "referrals": [dict(
            name=row.referred_name, status=row.status, bookings=min(cint(row.qualifying_bookings), threshold),
            reward_earned=reward if row.status == "Rewarded" else 0, joined_on=str(row.creation.date()),
        ) for row in rows],
    }


def signup_link(code):
    return f"{brand()['product_url']}/signup?ref={code}"


def require_owner(business):
    from appointment.scheduler.customers import role_in

    if not business or role_in(business) != "manager":
        frappe.throw(_("Only the business owner or a manager can see its referrals."), frappe.PermissionError)
    business_owner.from_key(business)
