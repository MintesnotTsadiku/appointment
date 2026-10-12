"""Customer to business: "Do you take appointments too?" after a booking, and one-tap setup.

The confirmation screen holds the booking's manage token. With it, the guest asks for a
prefill token: a signed, single-business, 30-minute token whose name, email and phone live
only in the cache. The sign-up page reads the details by that token, so no personal data
travels in a URL. `quick_start` then makes the independent business, its first offering
and publishes it, so the new owner has a live booking page right away.
See docs/growth/TOUCHPOINTS.md.
"""

import hashlib
import hmac
import json
import time
from datetime import timedelta

import frappe
from frappe import _
from frappe.rate_limiter import rate_limit
from frappe.utils import get_datetime, now_datetime
from frappe.utils.password import get_encryption_key

from appointment.growth.settings import growth
from appointment.growth.touchpoints import signup_path
from appointment.scheduler import registration, self_service

PREFILL_SECONDS = 30 * 60
# Only a booking made in the last half hour can start the prompt: it is "the booking just made".
FRESH_BOOKING = timedelta(minutes=30)
STAFF_ROLES = registration.STAFF_ROLES + ("System Manager",)
SOURCE = "customer_prompt"


def _invalid():
    return _("This setup link has expired. Start again from the booking page.")


# ---------------------------------------------------------------------------
# Who sees the prompt
# ---------------------------------------------------------------------------
def _booking(manage_token):
    """The booking behind a current manage token, made in the last half hour, or None."""
    doc = self_service._verify(manage_token)
    if not doc or now_datetime() - get_datetime(doc.creation) > FRESH_BOOKING:
        return None
    return doc


def _has_account(email):
    return bool(email) and bool(frappe.db.exists("User", {"name": email.strip().lower()}))


def _is_staff():
    user = frappe.session.user
    return user != "Guest" and (user == "Administrator" or any(role in STAFF_ROLES for role in frappe.get_roles(user)))


def eligible(doc):
    """Show the prompt unless it is off, the visitor is staff, or the booking email already has an account.

    An account covers every business owner. Sign-up refuses an existing email anyway.
    """
    return bool(doc) and growth()["customer_business_prompt_enabled"] and not _is_staff() and not _has_account(doc.client_email)


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=30, seconds=600)
def prompt(manage_token=None):
    """Whether the confirmation screen shows the "Do you take appointments too?" card."""
    return {"show": eligible(_booking(manage_token))}


# ---------------------------------------------------------------------------
# Prefill token
# ---------------------------------------------------------------------------
def _sign(nonce, expires):
    return hmac.new(get_encryption_key().encode(), f"growth-prefill:{nonce}:{expires}".encode(), hashlib.sha256).hexdigest()[:32]


def _cache_key(nonce):
    return f"appointment:growth:prefill:{nonce}"


def issue(doc):
    """A signed prefill token for this booking's customer. The details stay server side."""
    nonce = frappe.generate_hash(length=24)
    expires = int(time.time()) + PREFILL_SECONDS
    details = dict(full_name=(doc.client_name or "").strip()[:100], email=(doc.client_email or "").strip().lower(),
                   phone=(doc.client_phone or "").strip()[:30], booking=doc.name)
    frappe.cache.set_value(_cache_key(nonce), json.dumps(details), expires_in_sec=PREFILL_SECONDS)
    return f"{nonce}.{expires}.{_sign(nonce, expires)}"


def load(token):
    """The stored details for a valid, unexpired prefill token, or None."""
    try:
        nonce, expires, signature = (token or "").split(".")
        expires = int(expires)
    except ValueError:
        return None
    if expires < time.time() or not hmac.compare_digest(signature, _sign(nonce, expires)):
        return None
    stored = frappe.cache.get_value(_cache_key(nonce))
    return json.loads(stored) if stored else None


def discard(token):
    nonce = (token or "").split(".")[0]
    if nonce:
        frappe.cache.delete_value(_cache_key(nonce))


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=5, seconds=600, methods=["POST"])
def create_prefill(manage_token=None):
    """Exchange the booking's manage token for a sign-up path with a prefill token."""
    doc = _booking(manage_token)
    if not eligible(doc):
        frappe.throw(_invalid(), frappe.PermissionError)
    return {"path": signup_path(SOURCE, prefill=issue(doc))}


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=30, seconds=600)
def read_prefill(token=None):
    """The sign-up form's starting values. The business name starts as the person's name."""
    details = load(token)
    if not details:
        frappe.throw(_invalid(), frappe.PermissionError)
    return dict(full_name=details["full_name"], email=details["email"], has_phone=bool(details["phone"]),
                business_name=details["full_name"])


# ---------------------------------------------------------------------------
# One-tap setup
# ---------------------------------------------------------------------------
@frappe.whitelist(methods=["POST"])
@rate_limit(limit=5, seconds=600, methods=["POST"], user_based=True)
def quick_start(business_name, service_name, prefill=None, timezone="Africa/Addis_Ababa"):
    """Make the signed-in person's independent business, its first offering, and publish it.

    Uses the existing solo setup and independent booking setup, so every rule there still applies.
    The sign-up call already kept `source` and `ref` (referrals.remember_signup); the referrals
    module attaches them when this provider is saved.
    """
    from appointment.public_experience import solo_setup
    from appointment.scheduler import independent

    if frappe.session.user == "Guest":
        frappe.throw(_("Sign in to create your booking page."), frappe.PermissionError)
    service_name = service_name.strip() if isinstance(service_name, str) else ""
    if not service_name or len(service_name) > 100:
        frappe.throw(_("Enter what you offer, in at most 100 characters."))
    created = solo_setup.create(business_name, timezone, service_name=service_name, publish=1)
    provider = created["provider"]
    details = load(prefill) if prefill else None
    if details and details["email"] == frappe.session.user and details["phone"]:
        _set_phone(provider, details["phone"])
    if prefill:
        discard(prefill)
    offering = independent.overview(provider)[0]
    return {"provider": provider, "business_name": business_name.strip(), "public_path": offering["public_path"],
            "business_path": created["business_path"], "published": created["published"],
            "service": offering["service"], "landing": created["landing"]}


def _set_phone(provider, phone):
    from appointment.onboarding import _ONBOARDING_UPDATE
    from appointment.scheduler import notification_sms

    number = notification_sms.normalize_phone(phone)
    if not number or frappe.db.get_value("Provider", provider, "phone"):
        return
    doc = frappe.get_doc("Provider", provider)
    doc.phone = number
    doc.flags.onboarding_update = _ONBOARDING_UPDATE
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        doc.save(ignore_permissions=True)
    finally:
        frappe.flags.syncing_booking_urls = previous
