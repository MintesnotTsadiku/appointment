"""Tenant provisioning configuration and public sign-up.

Supported provisioning modalities are configured in the single
``Appointment Registration Settings`` DocType:

- public self sign-up: Open or Disabled (Verified is reserved and fails closed),
- self-service business creation for a self-signed-up account,
- administrator approval for self sign-ups,
- manager invite/admin provisioning.

Invited/admin provisioning is available by default; it can be turned off so only
an Administrator creates accounts. Guest booking is never affected.
"""

from __future__ import annotations

import frappe
from frappe import _

SETTINGS_DOCTYPE = "Appointment Registration Settings"

DEFAULTS = {
    "self_signup_mode": "Open",
    "allow_self_service_business_creation": 1,
    "require_admin_approval": 0,
    "allow_invite_provisioning": 1,
}

STAFF_ROLES = ("Provider", "Organization Manager", "Front Desk", "Assistant", "Appointment Manager")


def settings():
    stored = frappe.db.get_singles_dict(SETTINGS_DOCTYPE) or {}
    result = dict(DEFAULTS)
    for key in DEFAULTS:
        value = stored.get(key)
        if value in (None, ""):
            continue
        result[key] = value if key == "self_signup_mode" else int(value)
    return result


def self_signup_mode():
    return settings()["self_signup_mode"]


def self_signup_enabled():
    return self_signup_mode() == "Open"


def requires_verification():
    return self_signup_mode() == "Verified"


def requires_admin_approval():
    return bool(settings()["require_admin_approval"])


def self_service_business_creation_allowed():
    return bool(settings()["allow_self_service_business_creation"])


def invite_provisioning_allowed():
    return bool(settings()["allow_invite_provisioning"])


def _is_freely_provisioned(user):
    """Staff/system accounts and accounts already onboarding are always allowed."""
    account = frappe.db.get_value("User", user, ["user_type", "enabled"], as_dict=True)
    if not account or not account.enabled:
        return False
    if account.user_type == "System User":
        return True
    if any(role in STAFF_ROLES for role in frappe.get_roles(user)):
        return True
    return bool(frappe.db.get_value("Provider", {"user": user}, "onboarding_type"))


def may_start_business(user=None):
    user = user or frappe.session.user
    if user == "Guest" or not frappe.db.get_value("User", user, "enabled"):
        return False
    if _is_freely_provisioned(user):
        return True
    return self_service_business_creation_allowed()


def require_may_start_business(user=None):
    user = user or frappe.session.user
    if not may_start_business(user):
        frappe.throw(
            _("Self-service business setup is turned off. Ask an administrator to provision your account."),
            frappe.PermissionError,
        )


def require_invite_provisioning():
    if frappe.session.user == "Administrator":
        return
    if not invite_provisioning_allowed():
        frappe.throw(
            _("Account provisioning is restricted to administrators."),
            frappe.PermissionError,
        )


@frappe.whitelist(allow_guest=True)
def public_settings():
    current = settings()
    return {
        "signup_enabled": current["self_signup_mode"] == "Open",
        "verification_available": False,
        "unavailable_reason": (_("Email verification is not implemented. Ask an administrator to create your account.") if current["self_signup_mode"] == "Verified" else None),
        "self_signup_mode": current["self_signup_mode"],
        "requires_verification": current["self_signup_mode"] == "Verified",
        "self_service_business_creation": bool(current["allow_self_service_business_creation"]),
        "invite_provisioning": bool(current["allow_invite_provisioning"]),
        "admin_approval": bool(current["require_admin_approval"]),
    }


@frappe.whitelist(allow_guest=True, methods=["POST"])
def signup(email, full_name=None, password=None, redirect_to=None):
    if requires_verification():
        frappe.throw(_("Email verification is not implemented. Use Open signup with administrator approval, or administrator provisioning."), frappe.PermissionError)
    if not self_signup_enabled():
        frappe.throw(
            _("Public sign-up is turned off. Ask an administrator to create your account."),
            frappe.PermissionError,
        )
    email = (email or "").strip().lower()
    if not email or len(email) > 120 or "@" not in email:
        frappe.throw(_("Enter a valid email address."))
    if frappe.db.exists("User", email):
        frappe.throw(_("An account already exists for this email address."))

    approval = requires_admin_approval()
    pending = approval
    parts = (full_name or email.split("@")[0]).strip().split(" ", 1)
    doc = frappe.get_doc(
        {
            "doctype": "User",
            "email": email,
            "first_name": parts[0][:100] or email,
            "last_name": (parts[1] if len(parts) > 1 else "")[:100],
            "enabled": 0 if pending else 1,
            "user_type": "Website User",
            "send_welcome_email": 0,
        }
    )
    if not password:
        frappe.throw(_("A password is required."))
    doc.new_password = password
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    if approval:
        status = "pending_approval"
    else:
        status = "active"
    return {
        "email": doc.name,
        "status": status,
        "signup_mode": self_signup_mode(),
        "email_sent": False,
    }
