"""Explicit marketing consent, confirmation, suppression, and opaque unsubscribe."""

import hashlib
import json

import frappe
from frappe.utils import add_to_date, get_datetime, now_datetime

from appointment.content import entitlements
from appointment.content.newsletter import core

GENERIC = {"message": "Signup requested. Confirmation is captured in the local email inbox. You can unsubscribe at any time."}


def public_site(slug):
    name = frappe.db.get_value("Public Site", {"slug": slug, "status": "Published"}, "name")
    if not name:
        frappe.throw("Newsletter signup is unavailable.", frappe.DoesNotExistError)
    site = frappe.get_doc("Public Site", name)
    raw = frappe.db.get_value("Experience Release", site.current_release, "normalized_json") if site.current_release else None
    snapshot = json.loads(raw or "{}")
    if "newsletter" not in snapshot.get("features", []):
        frappe.throw("Newsletter signup is unavailable.", frappe.DoesNotExistError)
    core.require_newsletter(site)
    return site


def subscribe(slug, address, consent, locale="en"):
    if str(consent) not in {"1", "True", "true"}:
        frappe.throw("Confirm that you want to receive this business's newsletter.")
    if locale not in {"en", "am"}:
        frappe.throw("Choose a supported language.")
    site = public_site(slug)
    address = core.email(address)
    # Serialize quota checks and repeated signups within this business.
    frappe.db.sql("select name from `tabPublic Site` where name=%s for update", site.name)
    identity = hashlib.sha256((core.business_key(site) + "\0" + address).encode()).hexdigest()
    name = frappe.db.get_value("Newsletter Audience Member", {"audience_key": identity}, "name")
    if name:
        doc = core.lock(frappe.get_doc("Newsletter Audience Member", name))
        if doc.status in {"Confirmed", "Suppressed"}:
            return dict(GENERIC)
        if doc.last_confirmation_at and get_datetime(doc.last_confirmation_at) > add_to_date(now_datetime(), minutes=-30):
            return dict(GENERIC)
    else:
        count = frappe.db.count("Newsletter Audience Member", core.business_filters(site))
        entitlements.enforce_limit(site.owner_type, site.organization, site.provider, "newsletter", "audience", count + 1)
        unsubscribe, digest = core.token()
        doc = frappe.get_doc({"doctype": "Newsletter Audience Member", **core.owner_fields(site),
                              "email": address, "audience_key": identity, "unsubscribe_token": unsubscribe,
                              "unsubscribe_hash": digest})
    confirmation, digest = core.token()
    doc.status = "Pending"
    doc.public_site = site.name
    doc.locale = locale
    doc.consent_source = "public-site"
    doc.consent_at = now_datetime()
    doc.confirmation_hash = digest
    doc.confirmation_expires = add_to_date(now_datetime(), hours=48)
    doc.last_confirmation_at = now_datetime()
    core.consent_audit(doc, "Consent requested", "public-site")
    core.write(doc, trusted=True)
    core.capture(site, "Audience Confirmation", address, f"Confirm updates from {site.site_title}",
                 {"message": "Confirm your newsletter subscription.", "actionPath": f"/newsletter/confirm/{confirmation}"},
                 "consent:" + digest, audience=doc.name, trusted=True)
    return dict(GENERIC)


def confirm(token):
    digest = core.token_hash(token)
    name = frappe.db.get_value("Newsletter Audience Member", {"confirmation_hash": digest}, "name") if digest else None
    if not name:
        frappe.throw("This confirmation link is invalid or has expired.")
    doc = core.lock(frappe.get_doc("Newsletter Audience Member", name))
    if doc.confirmation_hash != digest or not doc.confirmation_expires or get_datetime(doc.confirmation_expires) < now_datetime():
        frappe.throw("This confirmation link is invalid or has expired.")
    if doc.status != "Pending":
        frappe.throw("This confirmation link is no longer active.")
    core.require_newsletter(doc)
    doc.status = "Confirmed"
    doc.confirmed_at = now_datetime()
    doc.confirmation_hash = None
    doc.confirmation_expires = None
    core.consent_audit(doc, "Confirmed", "confirmation-link")
    core.write(doc, trusted=True)
    return {"message": "Your newsletter subscription is confirmed."}


def unsubscribe(token):
    digest = core.token_hash(token)
    name = frappe.db.get_value("Newsletter Audience Member", {"unsubscribe_hash": digest}, "name") if digest else None
    if not name:
        frappe.throw("This unsubscribe link is invalid.")
    doc = core.lock(frappe.get_doc("Newsletter Audience Member", name))
    if doc.unsubscribe_hash != digest:
        frappe.throw("This unsubscribe link is invalid.")
    if doc.status != "Suppressed":
        doc.status = "Unsubscribed"
    doc.unsubscribed_at = now_datetime()
    doc.confirmation_hash = None
    doc.confirmation_expires = None
    core.consent_audit(doc, "Unsubscribed", "unsubscribe-link")
    # Unsubscribe remains available after capability expiry or suspension.
    core.write(doc, trusted=True)
    return {"message": "You are unsubscribed. No further newsletters will be sent."}


def suppress(name, reason):
    doc = frappe.get_doc("Newsletter Audience Member", name)
    core.owner_site(doc.public_site)
    if not isinstance(reason, str) or not reason.strip() or len(reason) > 500:
        frappe.throw("Provide a suppression reason of at most 500 characters.")
    core.lock(doc)
    doc.status = "Suppressed"
    doc.suppression_reason = reason.strip()
    doc.confirmation_hash = None
    core.consent_audit(doc, "Suppressed", "owner")
    core.write(doc)
    return {"status": doc.status}
