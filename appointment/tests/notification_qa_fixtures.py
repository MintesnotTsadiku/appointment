"""Agent Plane values for qa/manifests/customer-notifications.

The guest manifest books with fixed QA addresses. The staff manifest runs
after it and needs those bookings and a free later time for the reschedule.
It reads only; it creates nothing.
"""

from datetime import datetime

import frappe
import pytz

from appointment.demo import showcase
from appointment.scheduler import booking

GUESTS = {
    f"qa_notify_{language}_{size}": f"qa-notify-{language}-{size}@example.test"
    for language in ("en", "am")
    for size in ("desktop", "mobile")
}


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    # The bookings can share a provider, so each one gets a different free slot.
    for index, (key, email) in enumerate(GUESTS.items()):
        doc = _latest_open_booking(email)
        values[f"{key}_booking"] = doc.name if doc else ""
        values[f"{key}_day"] = str(doc.appointment_date) if doc else ""
        values[f"{key}_new_time"] = _later_free_time(doc, index) if doc else ""
    return values


def _latest_open_booking(email):
    name = frappe.db.get_value(
        "Appointment", {"client_email": email, "status": "Confirmed"}, "name", order_by="creation desc"
    )
    return frappe.get_doc("Appointment", name) if name else None


def _later_free_time(doc, index):
    """A free slot late in the same day, as the 12-hour text the time field accepts."""
    slots = booking.slots(doc.event_type, str(doc.appointment_date))["all_available_slots_for_data"]
    zone = pytz.timezone(doc.booking_timezone)
    free = [s["start_time"] for s in slots if s["available"]]
    if len(free) <= index:
        return ""
    local = pytz.UTC.localize(datetime.fromisoformat(free[-1 - index].rstrip("Z"))).astimezone(zone)
    return local.strftime("%I:%M %p").lstrip("0")
