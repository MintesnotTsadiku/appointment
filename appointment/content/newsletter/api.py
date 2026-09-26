"""Thin owner newsletter and local email sink APIs."""

import json

import frappe

from appointment.content.newsletter import audience, campaigns, core, senders


@frappe.whitelist(methods=["GET"])
def workspace(site, page=1):
    doc = core.owner_site(site)
    filters = core.business_filters(doc)
    page = max(1, int(page))
    members = frappe.get_all("Newsletter Audience Member", filters=filters,
                             fields=["name", "email", "status", "locale", "consent_at", "confirmed_at", "suppression_reason"],
                             limit_start=(page - 1) * 50, limit_page_length=50, order_by="creation desc")
    return {"audience": members, "audienceCount": frappe.db.count("Newsletter Audience Member", filters),
            "senders": frappe.get_all("Newsletter Sender Identity", filters=filters, fields=["name", "sender_email", "sender_name", "status"]),
            "drafts": [{"ownership": row.name, "subject": frappe.db.get_value("Newsletter", row.source_name, "subject")}
                       for row in frappe.get_all("Content Ownership", filters={"public_site": site, "source_doctype": "Newsletter"}, fields=["name", "source_name"])],
            "campaigns": frappe.get_all("Business Newsletter Campaign", filters=filters,
                                        fields=["name", "subject", "status", "scheduled_at", "delivered_count", "skipped_count", "retry_count", "last_error"],
                                        order_by="creation desc", limit_page_length=50),
            "messages": frappe.get_all("Local Email Message", filters=filters, fields=["name", "kind", "recipient", "subject", "creation"],
                                       order_by="creation desc", limit_page_length=50),
            "entitlement": core.entitlements.resolve_entitlement(doc.owner_type, doc.organization, doc.provider, "newsletter"),
            "delivery": "local-email-sink"}


@frappe.whitelist(methods=["POST"])
def request_sender(site, email, name):
    return senders.request(site, email, name)


@frappe.whitelist(methods=["POST"])
def create_draft(site, sender, subject, body):
    return campaigns.create_draft(site, sender, subject, body)


@frappe.whitelist(methods=["POST"])
def preview_draft(site, ownership, sender):
    return campaigns.preview(site, ownership, sender)


@frappe.whitelist(methods=["POST"])
def queue_campaign(site, ownership, sender, request_id, scheduled_at=None, locale="en"):
    return campaigns.queue(site, ownership, sender, request_id, scheduled_at, locale)


@frappe.whitelist(methods=["POST"])
def retry_campaign(campaign):
    return campaigns.retry(campaign)


@frappe.whitelist(methods=["POST"])
def cancel_campaign(campaign):
    return campaigns.cancel(campaign)


@frappe.whitelist(methods=["POST"])
def run_due(site):
    return campaigns.run_due(site)


@frappe.whitelist(methods=["POST"])
def suppress_member(member, reason):
    return audience.suppress(member, reason)


@frappe.whitelist(methods=["GET"])
def get_local_message(message):
    doc = frappe.get_doc("Local Email Message", message)
    doc.check_permission("read")
    core.owner_site(doc.public_site)
    return {"kind": doc.kind, "recipient": doc.recipient, "subject": doc.subject,
            "payload": json.loads(doc.payload_json), "delivery": "local-email-sink"}
