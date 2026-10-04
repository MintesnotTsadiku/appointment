"""Sender verification captured in the local sink; no external verification claim."""

import hashlib

import frappe
from frappe.utils import add_to_date, get_datetime, now_datetime

from appointment.content.newsletter import core


def request(site, address, name):
    doc = core.owner_site(site, capability=True)
    address = core.email(address)
    if not isinstance(name, str) or not name.strip() or len(name) > 100 or any(char in name for char in "<>\r\n"):
        frappe.throw("Provide a sender name of at most 100 characters.")
    frappe.db.sql("select name from `tabPublic Site` where name=%s for update", doc.name)
    key = hashlib.sha256((core.business_key(doc) + "\0" + address).encode()).hexdigest()
    existing = frappe.db.get_value("Newsletter Sender Identity", {"sender_key": key}, "name")
    if not existing and frappe.db.count("Newsletter Sender Identity", core.business_filters(doc)) >= 3:
        frappe.throw("This business already has three sender identities.")
    sender = core.lock(frappe.get_doc("Newsletter Sender Identity", existing)) if existing else frappe.get_doc(
        {"doctype": "Newsletter Sender Identity", **core.owner_fields(doc), "sender_key": key, "sender_email": address})
    if sender.status == "Verified Local":
        return {"sender": sender.name, "status": sender.status}
    if existing and sender.status == "Pending" and sender.modified and get_datetime(sender.modified) > add_to_date(now_datetime(), minutes=-30):
        return {"sender": sender.name, "status": sender.status, "delivery": "local-email-sink"}
    value, digest = core.token()
    sender.sender_name = name.strip()
    sender.status = "Pending"
    sender.verification_hash = digest
    sender.verification_expires = add_to_date(now_datetime(), hours=24)
    core.write(sender)
    core.capture(doc, "Sender Verification", address, "Verify your newsletter sender in the local email sink",
                 {"message": "This verifies local sink delivery only; it does not verify external email delivery.",
                  "actionPath": f"/newsletter/sender/{value}"}, "sender:" + digest)
    return {"sender": sender.name, "status": sender.status, "delivery": "local-email-sink"}


def verify(token):
    digest = core.token_hash(token)
    name = frappe.db.get_value("Newsletter Sender Identity", {"verification_hash": digest}, "name") if digest else None
    if not name:
        frappe.throw("This sender verification link is invalid or has expired.")
    doc = core.lock(frappe.get_doc("Newsletter Sender Identity", name))
    if doc.verification_hash != digest or doc.status != "Pending" or get_datetime(doc.verification_expires) < now_datetime():
        frappe.throw("This sender verification link is invalid or has expired.")
    core.require_newsletter(doc)
    doc.status = "Verified Local"
    doc.verified_at = now_datetime()
    doc.verification_method = "Local email sink"
    doc.verification_hash = None
    doc.verification_expires = None
    core.write(doc, trusted=True)
    return {"message": "Sender verified for the local email sink. External delivery remains disabled."}
