"""Background delivery captures local messages and rechecks each recipient."""

import json

import frappe
from frappe.utils import add_to_date, now_datetime

from appointment.content.newsletter import campaigns, core


def deliver_campaign(name):
    while True:
        doc = core.lock(frappe.get_doc("Business Newsletter Campaign", name))
        if doc.status in {"Delivered", "Cancelled", "Error", "Held", "Scheduled"}:
            return {"status": doc.status, "delivery": "local-email-sink"}
        try:
            core.require_newsletter(doc)
            campaigns._sender(doc.sender_identity, doc)
        except (frappe.PermissionError, frappe.ValidationError):
            doc.status = "Held"
            doc.last_error = "Restore newsletter access and verify the sender before retrying."
            core.write(doc, trusted=True)
            frappe.db.commit()
            return {"status": doc.status}
        members = json.loads(doc.audience_json or "[]")
        cursor = int(doc.cursor or 0)
        if cursor >= len(members):
            doc.status = "Delivered"
            core.write(doc, trusted=True)
            frappe.db.commit()
            return {"status": doc.status, "captured": doc.delivered_count, "skipped": doc.skipped_count,
                    "delivery": "local-email-sink"}
        if not _throttle(doc):
            doc.status = "Scheduled"
            doc.scheduled_at = add_to_date(now_datetime(), seconds=65)
            doc.last_error = "Local delivery paused by the sending throttle. It will resume when due."
            core.write(doc, trusted=True)
            frappe.db.commit()
            return {"status": doc.status}
        doc.status = "Running"
        member = frappe.get_doc("Newsletter Audience Member", members[cursor]) if frappe.db.exists("Newsletter Audience Member", members[cursor]) else None
        if member:
            core.lock(member)
        if not member or member.status != "Confirmed" or core.owner_tuple(member) != core.owner_tuple(doc) or member.public_site != doc.public_site:
            doc.skipped_count = int(doc.skipped_count or 0) + 1
        else:
            try:
                unsubscribe = member.get_password("unsubscribe_token")
                if not unsubscribe or core.token_hash(unsubscribe) != member.unsubscribe_hash:
                    raise ValueError("Missing unsubscribe token")
                core.capture(doc, "Campaign Delivery", member.email, doc.subject,
                             {"content": json.loads(doc.content_json), "sender": doc.sender_email,
                              "unsubscribePath": f"/newsletter/unsubscribe/{unsubscribe}", "delivery": "local-email-sink"},
                             f"campaign:{doc.name}:recipient:{member.name}", campaign=doc.name, audience=member.name, trusted=True)
                doc.delivered_count = int(doc.delivered_count or 0) + 1
            except Exception:
                doc.status = "Error"
                doc.last_error = "Local capture failed. Review the campaign and retry; previously captured messages will not be duplicated."
                core.write(doc, trusted=True)
                frappe.db.commit()
                frappe.log_error(frappe.get_traceback(), "Newsletter local capture failure")
                return {"status": doc.status}
        doc.cursor = cursor + 1
        core.write(doc, trusted=True)
        frappe.db.commit()


def _throttle(doc):
    minute = now_datetime().strftime("%Y%m%d%H%M")
    root = f"newsletter-local:{frappe.local.site}:{minute}:"
    for suffix, limit in (("global", 500), (core.business_key(doc), 100)):
        key = root + suffix
        count = frappe.cache.incr(key)
        if count == 1:
            frappe.cache.expire(key, 120)
        if count > limit:
            return False
    return True
