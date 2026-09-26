"""Immutable campaign snapshots, quotas, and idempotent local background delivery."""

import hashlib
import json
import re

import frappe

from appointment.content.monitoring import observed
from frappe.utils import get_datetime, now_datetime

from appointment.content import entitlements
from appointment.content.newsletter import core
from appointment.content.sanitize import html_to_blocks, markdown_to_html


def create_draft(site, sender, subject, body):
    doc = core.owner_site(site, capability=True)
    identity = _sender(sender, doc, verified=False)
    _content(subject, body)
    if frappe.db.count("Content Ownership", {"public_site": site, "source_doctype": "Newsletter"}) >= 50:
        frappe.throw("This website already has 50 newsletter drafts.")
    group_name = "Website newsletter " + site
    group = frappe.db.get_value("Email Group", {"title": group_name}, "name")
    if not group:
        # This empty upstream support record is never the delivery audience.
        group = frappe.get_doc({"doctype": "Email Group", "title": group_name}).insert(ignore_permissions=True).name
    draft = frappe.get_doc({"doctype": "Newsletter", "subject": subject.strip(), "content_type": "Markdown",
                            "message_md": body, "sender_email": identity.sender_email, "sender_name": identity.sender_name,
                            "email_group": [{"email_group": group}], "published": 0, "schedule_sending": 0,
                            "send_unsubscribe_link": 0, "send_webview_link": 0}).insert()
    ownership = frappe.get_doc({"doctype": "Content Ownership", **core.owner_fields(doc),
                                "source_doctype": "Newsletter", "source_name": draft.name, "capability": "newsletter"}).insert()
    return {"ownership": ownership.name, "newsletter": draft.name}


def preview(site, ownership, sender):
    doc = core.owner_site(site, capability=True)
    draft = _draft(ownership, doc)
    identity = _sender(sender, doc, verified=False)
    content = _content(draft.subject, draft.message_md or "")
    capture = core.capture(doc, "Campaign Preview", identity.sender_email, draft.subject,
                           {"content": content, "sender": identity.sender_email, "delivery": "local-email-sink",
                            "message": "Unsent preview. No audience receives this message."},
                           "preview:" + frappe.generate_hash(length=32))
    return {"message": capture, "delivery": "local-email-sink", "audience_sent": False}


def queue(site, ownership, sender, request_id, scheduled_at=None, locale="en"):
    doc = core.owner_site(site, capability=True)
    if not re.fullmatch(r"[A-Za-z0-9_-]{16,100}", request_id or ""):
        frappe.throw("A campaign request identity is required.")
    if locale not in {"en", "am"}:
        frappe.throw("Choose a supported newsletter language.")
    frappe.db.sql("select name from `tabPublic Site` where name=%s for update", site)
    key = hashlib.sha256((core.business_key(doc) + "\0" + request_id).encode()).hexdigest()
    repeated = frappe.db.get_value("Business Newsletter Campaign", {"idempotency_key": key}, "name")
    if repeated:
        prior = frappe.get_doc("Business Newsletter Campaign", repeated)
        original = _draft(ownership, doc)
        if prior.newsletter != original.name or prior.sender_identity != sender:
            frappe.throw("This request identity was already used for a different campaign.")
        return {"campaign": repeated, "replayed": True, "delivery": "local-email-sink"}
    draft = _draft(ownership, doc)
    identity = _sender(sender, doc)
    when = get_datetime(scheduled_at) if scheduled_at else now_datetime()
    if scheduled_at and when < now_datetime():
        frappe.throw("Choose a future newsletter time.")
    month = when.strftime("%Y-%m")
    count = frappe.db.count("Business Newsletter Campaign", {**core.business_filters(doc), "business_month": month})
    entitlements.enforce_limit(doc.owner_type, doc.organization, doc.provider, "newsletter", "monthly_sends", count + 1)
    members = frappe.get_all("Newsletter Audience Member", filters={**core.business_filters(doc), "public_site": site, "status": "Confirmed", "locale": locale},
                             pluck="name", order_by="name", limit_page_length=2001)
    if not members:
        frappe.throw("No confirmed subscribers are available for this language.")
    if len(members) > 2000:
        frappe.throw("Split this audience before sending; a local campaign supports at most 2,000 confirmed subscribers.")
    entitlements.enforce_limit(doc.owner_type, doc.organization, doc.provider, "newsletter", "audience", len(members))
    content = {**_content(draft.subject, draft.message_md or ""), "locale": locale}
    campaign = frappe.get_doc({"doctype": "Business Newsletter Campaign", **core.owner_fields(doc),
                               "newsletter": draft.name, "sender_identity": sender, "subject": draft.subject,
                               "sender_email": identity.sender_email, "content_json": json.dumps(content),
                               "audience_json": json.dumps(members), "idempotency_key": key, "business_month": month,
                               "scheduled_at": when, "status": "Scheduled" if scheduled_at else "Queued",
                               "created_by": frappe.session.user})
    core.write(campaign)
    if not scheduled_at:
        _enqueue(campaign.name)
    return {"campaign": campaign.name, "replayed": False, "delivery": "local-email-sink"}


@observed("newsletter.worker", scope="campaign")
def deliver(name):
    from appointment.content.newsletter.delivery import deliver_campaign

    return deliver_campaign(name)


def run_due(site=None):
    filters = {"status": "Scheduled", "scheduled_at": ["<=", now_datetime()]}
    if site:
        core.owner_site(site, capability=True)
        filters["public_site"] = site
    names = frappe.get_all("Business Newsletter Campaign", filters=filters, pluck="name", limit_page_length=100)
    for name in names:
        campaign = core.lock(frappe.get_doc("Business Newsletter Campaign", name))
        if campaign.status != "Scheduled" or get_datetime(campaign.scheduled_at) > now_datetime():
            continue
        campaign.status = "Queued"
        core.write(campaign, trusted=True)
        _enqueue(name)
    return {"queued": len(names), "delivery": "local-email-sink"}


def retry(name):
    doc = frappe.get_doc("Business Newsletter Campaign", name)
    core.owner_site(doc.public_site, capability=True)
    core.lock(doc)
    if doc.status not in {"Error", "Held"} or int(doc.retry_count or 0) >= 3:
        frappe.throw("This campaign cannot be retried; the retry limit is three.")
    _sender(doc.sender_identity, doc)
    doc.retry_count = int(doc.retry_count or 0) + 1
    doc.status = "Queued"
    doc.last_error = None
    core.write(doc)
    _enqueue(name)
    return {"campaign": name, "delivery": "local-email-sink"}


def cancel(name):
    doc = frappe.get_doc("Business Newsletter Campaign", name)
    core.owner_site(doc.public_site)
    core.lock(doc)
    if doc.status == "Delivered":
        frappe.throw("This campaign has already been captured in the local sink.")
    doc.status = "Cancelled"
    core.write(doc)
    return {"status": doc.status}


def _enqueue(name):
    frappe.enqueue("appointment.content.newsletter.campaigns.deliver", queue="short", name=name,
                   enqueue_after_commit=True, job_id="newsletter-local:" + name, deduplicate=True)


def _sender(name, site, verified=True):
    doc = frappe.get_doc("Newsletter Sender Identity", name)
    if core.owner_tuple(doc) != core.owner_tuple(site) or doc.public_site != (site.name if site.doctype == "Public Site" else site.public_site):
        frappe.throw("Choose a sender from this business website.", frappe.PermissionError)
    if verified and doc.status != "Verified Local":
        frappe.throw("Verify the sender in the local email sink before sending.")
    return doc


def _draft(name, site):
    ownership = frappe.get_doc("Content Ownership", name)
    if ownership.source_doctype != "Newsletter" or ownership.public_site != site.name or core.owner_tuple(ownership) != core.owner_tuple(site):
        frappe.throw("Choose a newsletter draft from this website.", frappe.PermissionError)
    ownership.check_permission("read")
    doc = frappe.get_doc("Newsletter", ownership.source_name)
    doc.check_permission("read")
    if doc.content_type != "Markdown":
        frappe.throw("Use the safe Markdown newsletter editor.")
    return doc


def _content(subject, body):
    if not isinstance(subject, str) or not subject.strip() or len(subject) > 200 or any(char in subject for char in "<>\r\n"):
        frappe.throw("Provide a plain subject of at most 200 characters.")
    if not isinstance(body, str) or not body.strip() or len(body) > 100000:
        frappe.throw("Write a newsletter of at most 100,000 characters.")
    return {"subject": subject.strip(), "blocks": html_to_blocks(markdown_to_html(body))}
