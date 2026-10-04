"""Agent Plane values for qa/manifests/customer-profiles. Reads only; creates nothing."""

from datetime import datetime

import frappe
import pytz
from frappe.utils import add_days, nowdate

from appointment.demo import showcase
from appointment.scheduler import booking
from appointment.tests import demo_offerings, qa_days

OFFERING = demo_offerings.cut_rahel()  # Bloom: Cut and shape, Rahel Girma, Bole quiet styling room


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
        qa_cp_day=qa_days.open_day(event.name),
        qa_cp_time=_late_free_time(event),
        qa_cp_search=(sample[0].split()[0] if sample else ""),
    )
    return values


def _late_free_time(event):
    """A late free start time on the first open day, in 24-hour HH:MM, for the desk's time input."""
    tomorrow = qa_days.open_day(event.name) or add_days(nowdate(), 1)
    zone = pytz.timezone(frappe.db.get_value("Location", event.location, "timezone"))
    free = [s["start_time"] for s in booking.slots(event.name, tomorrow)["all_available_slots_for_data"] if s["available"]]
    if not free:
        return ""
    local = pytz.UTC.localize(datetime.fromisoformat(free[-2 if len(free) > 1 else -1].rstrip("Z"))).astimezone(zone)
    return local.strftime("%H:%M")


def cleanup():
    """Remove what manager.yaml creates: the two QA merge customers and the booking made through the picker."""
    frappe.set_user("Administrator")
    profiles = frappe.get_all("Customer Profile", filters={"display_name": ["in", ["QA Merge Source", "QA Merge Target"]]}, pluck="name")
    for name in frappe.get_all("Appointment", filters={"customer": ["in", profiles or [""]]}, pluck="name"):
        frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
    # Merged sources point at the target, so they go first.
    for name in sorted(profiles, key=lambda n: frappe.db.get_value("Customer Profile", n, "merged_into") is None):
        frappe.delete_doc("Customer Profile", name, ignore_permissions=True, force=True)
    frappe.db.commit()
    return {"removed_profiles": len(profiles)}
