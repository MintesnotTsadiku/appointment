"""Agent Plane values for qa/manifests/customer-profiles. Reads only; creates nothing."""

from datetime import datetime

import frappe
import pytz
from frappe.utils import add_days, nowdate

from appointment.demo import showcase
from appointment.scheduler import booking

OFFERING = "EVT-2026-000109"  # Bloom: Cut and shape, Rahel Girma, Bole quiet styling room


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    event = frappe.get_doc("EventType", OFFERING)
    organization = frappe.db.get_value("Service", event.service, "organization")
    sample = frappe.get_all(
        "Customer Profile", filters={"organization": organization, "status": "Active"}, pluck="display_name",
        order_by="display_name asc", limit=1,
    )
    values.update(
        qa_cp_service=event.service,
        qa_cp_provider=event.provider,
        qa_cp_location=event.location,
        qa_cp_time=_late_free_time(event),
        qa_cp_search=(sample[0].split()[0] if sample else ""),
    )
    return values


def _late_free_time(event):
    """A free start time tomorrow in 24-hour HH:MM, for the desk's time input."""
    tomorrow = add_days(nowdate(), 1)
    zone = pytz.timezone(frappe.db.get_value("Location", event.location, "timezone"))
    free = [s["start_time"] for s in booking.slots(event.name, tomorrow)["all_available_slots_for_data"] if s["available"]]
    if not free:
        return ""
    local = pytz.UTC.localize(datetime.fromisoformat(free[-2 if len(free) > 1 else -1].rstrip("Z"))).astimezone(zone)
    return local.strftime("%H:%M")
