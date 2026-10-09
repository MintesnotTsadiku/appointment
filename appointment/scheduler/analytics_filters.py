"""Validated shared filters for reports, drill-downs and exports."""

import json
from datetime import datetime, timezone

import frappe
from frappe import _

STATUSES = {"Pending", "Confirmed", "Completed", "Cancelled", "No Show"}
SOURCES = {"online", "staff", "walk-in", "import", "unknown"}


class ReportFilters:
    def __init__(self, value, today, period):
        self.data = frappe.parse_json(value or "{}")
        if not isinstance(self.data, dict):
            frappe.throw(_("Filters must be an object."))
        allowed = {"start", "end", "basis", "providers", "locations", "services", "statuses", "sources", "segment", "granularity"}
        if set(self.data) - allowed:
            frappe.throw(_("Unsupported analytics filter."))
        self.start = frappe.utils.getdate(self.data.get("start") or today - __import__("datetime").timedelta(days=period - 1))
        self.end = frappe.utils.getdate(self.data.get("end") or today)
        if self.start > self.end or (self.end - self.start).days > 365:
            frappe.throw(_("Choose a date range of at most 366 days."))
        self.basis = self.data.get("basis", "appointment")
        if self.basis not in {"appointment", "creation", "outcome", "event"}:
            frappe.throw(_("Choose a supported time basis."))
        for key in ("providers", "locations", "services", "statuses", "sources"):
            values = self.data.get(key, [])
            if not isinstance(values, list) or len(values) > 100 or any(not isinstance(item, str) for item in values):
                frappe.throw(_("Filter values must be lists of IDs."))
        if set(self.data.get("statuses", [])) - STATUSES or set(self.data.get("sources", [])) - SOURCES:
            frappe.throw(_("Unsupported status or booking source."))
        if self.data.get("segment", "all") not in {"all", "new", "returning", "repeat"}:
            frappe.throw(_("Choose a supported customer segment."))
        if self.data.get("granularity", "daily") not in {"daily", "weekly", "monthly"}:
            frappe.throw(_("Choose a supported granularity."))

    def authorize(self, offerings):
        for key, field in (("providers", "provider"), ("locations", "location"), ("services", "service")):
            if set(self.data.get(key, [])) - {row.get(field) for row in offerings}:
                frappe.throw(_("A filter is outside your permitted business scope."), frappe.PermissionError)

    def matches(self, row):
        for key, field in (("providers", "provider"), ("locations", "location"), ("services", "service"), ("statuses", "status")):
            if self.data.get(key) and row.get(field) not in self.data[key]:
                return False
        return not self.data.get("sources") or (row.booking_source or "unknown") in self.data["sources"]

    def date(self, row, zone):
        if self.basis == "appointment":
            return row.appointment_date
        if self.basis == "creation":
            # Frappe creation is stored in the system timezone, unlike our explicit UTC capture.
            system_zone = __import__("zoneinfo").ZoneInfo(frappe.utils.get_system_timezone())
            return row.creation.replace(tzinfo=system_zone).astimezone(zone).date()
        events = json.loads(row.workflow_events or "[]")
        if self.basis == "outcome":
            events = [event for event in events if event["type"] in {"cancel", "complete", "no-show"}]
        return self.event_date(events[-1], zone) if events else None

    @staticmethod
    def event_date(event, zone):
        return datetime.fromisoformat(event["timestamp"]).replace(tzinfo=timezone.utc).astimezone(zone).date()
