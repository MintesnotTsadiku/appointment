"""Business-scoped support counts; never expose tokens or recipient payloads."""

import frappe
from frappe.utils import get_datetime, now_datetime, time_diff_in_seconds

from appointment.content.newsletter import core
from appointment.content.monitoring import site_counters


@frappe.whitelist(methods=["GET"])
def business_health(site):
    doc = core.owner_site(site)
    scope = {"public_site": doc.name}
    pending = frappe.get_all("Business Newsletter Campaign", filters={**scope, "status": ["in", ["Queued", "Running", "Scheduled"]]},
                             fields=["status", "scheduled_at", "creation", "retry_count"])
    due = [row for row in pending if row.status != "Scheduled" or not row.scheduled_at or get_datetime(row.scheduled_at) <= now_datetime()]
    return {
        "dueCampaigns": len(due),
        "oldestDueCampaignAgeSeconds": max([max(0, time_diff_in_seconds(now_datetime(), row.scheduled_at or row.creation)) for row in due] or [0]),
        "pendingCampaignRetries": sum(int(row.retry_count or 0) for row in pending),
        "organizationImportCounters": site_counters("organization:" + doc.organization) if doc.organization else {},
        "operationCounters": site_counters(doc.name),
        "counterRetentionDays": 90,
        "counterStorage": "Redis; advisory and reset on cache loss",
        "publication": _counts("Published Content Release", scope),
        "experienceReleases": frappe.db.count("Experience Release", scope),
        "mediaFiles": frappe.db.count("File", {"attached_to_doctype": "Public Site", "attached_to_name": doc.name}),
        "workbookImports": frappe.db.count("Organization Workbook Import", {"organization": doc.organization}) if doc.organization else 0,
        "audience": _counts("Newsletter Audience Member", scope),
        "campaigns": _counts("Business Newsletter Campaign", scope),
        "localMessages": frappe.db.count("Local Email Message", scope),
        "delivery": "local-email-sink",
        "externalDeliveryEnabled": False,
        "bounceTransport": "Unavailable: external delivery is disabled",
    }


def _counts(doctype, scope):
    rows = frappe.get_all(doctype, filters=scope, fields=["status", {"COUNT": "name", "as": "total"}], group_by="status")
    return {row.status: row.total for row in rows}
