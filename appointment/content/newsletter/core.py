"""Newsletter record boundaries, token handling, and local-only messages."""

import hashlib
import json
import re
import secrets

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from appointment.content import entitlements, tenancy

_WRITE = object()
TYPES = ("Newsletter Audience Member", "Newsletter Sender Identity", "Business Newsletter Campaign", "Local Email Message")


class NewsletterRecord(Document):
    def validate(self):
        if self.flags.newsletter_factory is not _WRITE:
            frappe.throw(_("Use the business newsletter workspace to change newsletter records."), frappe.PermissionError)
        tenancy.require_business_owner(self.owner_type, self.organization, self.provider)
        site = frappe.db.get_value("Public Site", self.public_site, ["owner_type", "organization", "provider"], as_dict=True)
        if not site or owner_tuple(site) != owner_tuple(self):
            frappe.throw(_("The newsletter record requires its business website."), frappe.PermissionError)
        old = self.get_doc_before_save()
        if old and owner_tuple(old) != owner_tuple(self):
            frappe.throw(_("Newsletter records cannot move to another business."), frappe.PermissionError)
        if old and self.doctype == "Local Email Message":
            frappe.throw(_("Captured email messages are immutable."), frappe.PermissionError)
        if old and self.doctype == "Business Newsletter Campaign":
            for field in ("newsletter", "sender_identity", "subject", "sender_email", "content_json", "audience_json", "idempotency_key", "business_month"):
                if old.get(field) != self.get(field):
                    frappe.throw(_("A queued newsletter's content and audience cannot change."), frappe.PermissionError)

    def on_trash(self):
        frappe.throw(_("Newsletter consent, delivery, and audit records cannot be deleted."), frappe.PermissionError)


def owner_tuple(doc):
    return doc.owner_type, doc.organization or None, doc.provider or None


def owner_fields(doc):
    return {"owner_type": doc.owner_type, "organization": doc.organization, "provider": doc.provider, "public_site": doc.name if doc.doctype == "Public Site" else doc.public_site}


def owner_site(site, *, capability=False):
    doc = frappe.get_doc("Public Site", site)
    tenancy.require_manage_business(doc.owner_type, doc.organization, doc.provider)
    if capability:
        require_newsletter(doc)
    return doc


def require_newsletter(doc):
    return entitlements.require_capability(doc.owner_type, doc.organization, doc.provider, "newsletter")


def business_filters(doc):
    return {"owner_type": doc.owner_type, "organization": doc.organization, "provider": doc.provider}


def business_key(doc):
    return tenancy.require_business_owner(doc.owner_type, doc.organization, doc.provider)


def email(value):
    value = str(value or "").strip().lower()
    if len(value) > 160 or not re.fullmatch(r"[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+", value):
        frappe.throw(_("Enter a complete email address."))
    return value


def token():
    value = secrets.token_urlsafe(32)
    return value, token_hash(value)


def token_hash(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]{40,100}", value):
        return None
    return hashlib.sha256(value.encode()).hexdigest()


def write(doc, *, trusted=False):
    doc.flags.newsletter_factory = _WRITE
    return doc.insert(ignore_permissions=trusted) if doc.is_new() else doc.save(ignore_permissions=trusted)


def lock(doc):
    if doc.doctype not in TYPES:
        raise ValueError("Unsupported newsletter lock")
    frappe.db.sql(f"select name from `tab{doc.doctype}` where name=%s for update", doc.name)
    doc.reload()
    return doc


def capture(site, kind, recipient, subject, payload, key, *, campaign=None, audience=None, trusted=False):
    """Capture an immutable local message; this never invokes email transport."""
    identity = hashlib.sha256((business_key(site) + "\0" + key).encode()).hexdigest()
    existing = frappe.db.get_value("Local Email Message", {"delivery_key": identity}, "name")
    if existing:
        return existing
    doc = frappe.get_doc({"doctype": "Local Email Message", **owner_fields(site), "kind": kind,
                          "recipient": email(recipient), "subject": subject, "payload_json": json.dumps(payload),
                          "delivery_key": identity, "campaign": campaign, "audience_member": audience})
    return write(doc, trusted=trusted).name


def consent_audit(doc, action, source):
    history = json.loads(doc.audit_json or "[]")
    history.append({"action": action, "source": source, "at": str(now_datetime()), "actor": frappe.session.user})
    doc.audit_json = json.dumps(history[-100:])


def permission(doc, user=None, permission_type="read", ptype=None, **kwargs):
    operation = ptype or permission_type
    if operation not in {"read", "select", "report", "print", "export", "create", "write"}:
        return False
    if operation in {"create", "write"} and doc.flags.newsletter_factory is not _WRITE:
        return False
    return tenancy.can_manage_business(doc.owner_type, doc.organization, doc.provider, user or frappe.session.user)


def audience_query(user=None):
    return tenancy.owner_query_condition("tabNewsletter Audience Member", user)


def sender_query(user=None):
    return tenancy.owner_query_condition("tabNewsletter Sender Identity", user)


def campaign_query(user=None):
    return tenancy.owner_query_condition("tabBusiness Newsletter Campaign", user)


def sink_query(user=None):
    return tenancy.owner_query_condition("tabLocal Email Message", user)
