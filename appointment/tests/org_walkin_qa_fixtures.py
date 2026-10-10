"""QA fixtures for organization walk-ins at reception (qa/manifests/develop-features/org-walkin.yaml).

The run adds two Bloom walk-ins for "Cut and shape" and assigns them:
- one with a preferred provider (Hanna) at Bole main studio,
- one without a preferred provider at Bole quiet styling room.
`browser_values` gives the first open time of each within the next 24 hours, which the assigned booking must match.
When Bloom has nothing open in the next 24 hours (Sunday after closing to Monday morning), the values are empty.

Run `setup` before the manifest and `cleanup` afterwards. Cleanup removes the walk-ins, their bookings,
notification rows and the customer profiles the run made.
See docs/features/WALKIN_HOURS_PLAN.md.
"""

from datetime import datetime, timedelta

import frappe
import pytz

from appointment.demo import showcase
from appointment.scheduler import booking
from appointment.tests import demo_offerings

# Client phones are unique to this run, so cleanup finds exactly what the run made.
PHONES = ("+251911736401", "+251911736402")
QUIET_ROOM = "Bole quiet styling room"


def setup():
    frappe.set_user("Administrator")
    cleanup()
    return browser_values()


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    hanna = demo_offerings.cut_hanna()
    service, location, provider = frappe.db.get_value("EventType", hanna, ["service", "location", "provider"])
    quiet = frappe.get_all("EventType", filters={"service": service, "location": QUIET_ROOM, "is_active": 1}, pluck="name")
    values.update(
        qa_org_walkin_service=service,
        qa_org_walkin_location=location,
        qa_org_walkin_provider=provider,
        qa_org_walkin_quiet_location=QUIET_ROOM,
    )
    for prefix, events in (("qa_org_walkin", [hanna]), ("qa_org_walkin_any", quiet)):
        first = min(filter(None, (_first_open(event) for event in events)), default=None)
        values[f"{prefix}_date"] = str(first.date()) if first else ""
        values[f"{prefix}_start"] = f"{first.hour}:{first.minute:02}:{first.second:02}" if first else ""
    return values


def _first_open(event):
    """The offering's first open local start within the next 24 hours, or None."""
    parts = booking.offering(event)
    zone = pytz.timezone(parts.location.timezone)
    now = datetime.now(pytz.UTC)
    latest = now + timedelta(hours=24)
    for day in sorted({now.astimezone(zone).date(), latest.astimezone(zone).date()}):
        for row in booking.open_slots(parts, day)["all_available_slots_for_data"]:
            start = datetime.fromisoformat(row["start_time"].replace("Z", "+00:00"))
            if row["available"] and now <= start <= latest:
                return start.astimezone(zone).replace(tzinfo=None)
    return None


def cleanup():
    frappe.set_user("Administrator")
    for name in frappe.get_all("Walk In", filters={"client_phone": ["in", PHONES]}, pluck="name"):
        frappe.delete_doc("Walk In", name, ignore_permissions=True, force=True)
    customers = set()
    for row in frappe.get_all("Appointment", filters={"client_phone": ["in", PHONES]}, fields=["name", "customer"]):
        for notification in frappe.get_all("Appointment Notification", filters={"appointment": row.name}, pluck="name"):
            frappe.delete_doc("Appointment Notification", notification, ignore_permissions=True, force=True)
        frappe.delete_doc("Appointment", row.name, ignore_permissions=True, force=True)
        customers.add(row.customer)
    profiles = frappe.get_all("Customer Profile", filters={"primary_phone": ["in", PHONES]}, pluck="name")
    for name in customers.union(profiles) - {None}:
        if not frappe.db.exists("Appointment", {"customer": name}):
            frappe.delete_doc("Customer Profile", name, ignore_permissions=True, force=True)
    frappe.db.commit()
