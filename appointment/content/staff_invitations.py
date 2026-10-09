"""Explicit staff account acceptance through an isolated local invitation inbox."""

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.rate_limiter import rate_limit
from frappe.utils import add_days, now_datetime

from appointment.content.newsletter.core import email, token, token_hash
from appointment.scheduler import membership, registration

_WRITE = object()


class StaffInvitation(Document):
    def validate(self):
        if self.flags.invitation_factory is not _WRITE:
            frappe.throw(_("Use the team invitation workspace."), frappe.PermissionError)
        old = self.get_doc_before_save()
        if old and any(old.get(field) != self.get(field) for field in
                       ("organization", "email", "full_name", "invited_by", "token_hash", "expires_at")):
            frappe.throw(_("Invitation identity cannot change."), frappe.PermissionError)

    def on_trash(self):
        frappe.throw(_("Revoke an invitation instead of deleting its audit record."), frappe.PermissionError)


@frappe.whitelist(methods=["POST"])
@rate_limit(limit=20, seconds=60)
def invite(organization, staff_email, full_name):
    actor = membership.require_manager(organization)
    registration.require_invite_provisioning()
    address = email(staff_email)
    if not isinstance(full_name, str) or not full_name.strip() or len(full_name) > 140:
        frappe.throw(_("Enter the staff member's name."))
    value, digest = token()
    doc = frappe.get_doc({"doctype": "Business Staff Invitation", "organization": organization,
                          "email": address, "full_name": full_name.strip(), "invited_by": actor,
                          "status": "Pending", "token_hash": digest, "local_token": value,
                          "expires_at": add_days(now_datetime(), 7)})
    _write(doc)
    return {"invitation": doc.name, "delivery": "local_inbox", "email_sent": False}


@frappe.whitelist(methods=["GET"])
def inbox(organization):
    membership.require_manager(organization)
    rows = frappe.get_all("Business Staff Invitation", filters={"organization": organization},
                          fields=["name", "email", "full_name", "status", "expires_at"],
                          order_by="creation desc", limit=100)
    for row in rows:
        if row.status == "Pending" and row.expires_at > now_datetime():
            doc = frappe.get_doc("Business Staff Invitation", row.name)
            row["acceptance_path"] = "/team/invitation/" + doc.get_password("local_token")
    return {"invitations": rows, "external_delivery": False}


@frappe.whitelist(methods=["POST"])
def revoke(invitation):
    doc = frappe.get_doc("Business Staff Invitation", invitation)
    membership.require_manager(doc.organization)
    _lock(doc)
    if doc.status == "Accepted":
        frappe.throw(_("This account already accepted. Revoke its business membership separately."))
    doc.status = "Revoked"
    _write(doc)
    return {"status": doc.status}


@frappe.whitelist(allow_guest=True, methods=["POST"])
@rate_limit(limit=20, seconds=60)
def accept(invitation_token, password=None):
    digest = token_hash(invitation_token)
    name = digest and frappe.db.get_value("Business Staff Invitation", {"token_hash": digest}, "name")
    if not name:
        frappe.throw(_("This invitation is unavailable."), frappe.PermissionError)
    doc = frappe.get_doc("Business Staff Invitation", name)
    _lock(doc)
    if doc.status != "Pending" or doc.expires_at <= now_datetime():
        frappe.throw(_("This invitation has expired or was already used."), frappe.PermissionError)
    if (not registration.invite_provisioning_allowed() or not membership.user_is_enabled(doc.invited_by)
            or doc.organization not in membership.manager_organizations(doc.invited_by)
            or not frappe.db.get_value("Organization", doc.organization, "is_active")):
        frappe.throw(_("This invitation is no longer authorized."), frappe.PermissionError)
    if frappe.db.exists("User", doc.email):
        if frappe.session.user != doc.email or not membership.user_is_enabled(doc.email):
            frappe.throw(_("Sign in with the invited account before accepting. Its password will not change."),
                         frappe.PermissionError)
    else:
        if not password:
            frappe.throw(_("Choose your account password."))
        parts = doc.full_name.split(" ", 1)
        user = frappe.get_doc({"doctype": "User", "email": doc.email, "first_name": parts[0],
                               "last_name": parts[1] if len(parts) > 1 else "", "enabled": 1,
                               "user_type": "Website User", "send_welcome_email": 0})
        user.new_password = password
        user.insert(ignore_permissions=True)
    doc.status, doc.accepted_at = "Accepted", now_datetime()
    _write(doc, trusted=True)
    return {"status": "Accepted", "email": doc.email,
            "message": _("Your account is ready. The business owner can now assign your role and scope.")}


def permission(doc, user=None, permission_type="read", ptype=None, **kwargs):
    operation = ptype or permission_type
    if operation in {"create", "write"}:
        return doc.flags.invitation_factory is _WRITE
    return operation in {"read", "select", "report"} and doc.organization in membership.manager_organizations(user)


def query(user=None):
    organizations = membership.manager_organizations(user)
    return ("`tabBusiness Staff Invitation`.organization in (" +
            ",".join(frappe.db.escape(name) for name in organizations) + ")") if organizations else "1=0"


def _write(doc, trusted=False):
    doc.flags.invitation_factory = _WRITE
    return doc.insert(ignore_permissions=trusted) if doc.is_new() else doc.save(ignore_permissions=trusted)


def _lock(doc):
    frappe.db.sql("select name from `tabBusiness Staff Invitation` where name=%s for update", doc.name)
    doc.reload()
