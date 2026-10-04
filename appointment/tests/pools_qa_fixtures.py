"""Agent Plane fixtures for qa/manifests/pools.

`setup()` gives Bloom a QA service "Meeting room hire (QA)" booked without staff,
with rooms "Room A (QA)" and "Room B (QA)" at the main studio, and a 10-unit
"Dryers (QA)" pool (no service needs it, so no demo booking is touched).
Guests book Room A on the public page; staff book Room B in reception.
`cleanup()` removes everything the fixture and the runs created.
"""

import json

import frappe
import pytz
from frappe.utils import add_days, get_datetime, nowdate

from appointment.demo import showcase
from appointment.scheduler import booking, resources

ORG = "Bole Bloom Hair Studio"
OWNER = "bloom.owner@example.test"
MAIN = "Bole main studio"
SERVICE_NAME = "Meeting room hire (QA)"
ROOM_TYPE, DRYER_TYPE = "Meeting room (QA)", "Hair dryer (QA)"
STATE_KEY = "appointment_pools_qa_state"


def _service():
    return frappe.db.get_value("Service", {"organization": ORG, "service_name": SERVICE_NAME}, "name")


def setup():
    frappe.set_user("Administrator")
    cleanup()
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True  # The booking-URL sync commits; this fixture commits once at the end.
    try:
        service = frappe.get_doc(dict(doctype="Service", service_name=SERVICE_NAME, organization=ORG, duration=60, price=300,
                                      description="A quiet room for a meeting or a call, booked by the hour.")).insert(ignore_permissions=True)
    finally:
        frappe.flags.syncing_booking_urls = previous
    room_type = frappe.get_doc(dict(doctype="Resource Type", organization=ORG, type_name=ROOM_TYPE)).insert(ignore_permissions=True).name
    rooms = {
        letter: frappe.get_doc(dict(doctype="Resource", organization=ORG, resource_name=f"Room {letter} (QA)",
                                    resource_type=room_type, location=MAIN)).insert(ignore_permissions=True).name
        for letter in "AB"
    }
    dryer_type = frappe.get_doc(dict(doctype="Resource Type", organization=ORG, type_name=DRYER_TYPE)).insert(ignore_permissions=True).name
    frappe.get_doc(dict(doctype="Resource", organization=ORG, resource_name="Dryers (QA)", resource_type=dryer_type,
                        location=MAIN, capacity=10)).insert(ignore_permissions=True)
    frappe.set_user(OWNER)
    resources.save_service_needs(service.name, [{"resource_type": room_type}], resource_only=1)
    frappe.set_user("Administrator")

    offering_a = frappe.db.get_value("EventType", {"service": service.name, "resource": rooms["A"]}, "name")
    offering_b = frappe.db.get_value("EventType", {"service": service.name, "resource": rooms["B"]}, "name")
    zone = pytz.timezone(frappe.db.get_value("Location", MAIN, "timezone"))
    for offset in range(1, 14):
        day = add_days(nowdate(), offset)
        free_b = [s for s in booking.slots(offering_b, day)["all_available_slots_for_data"] if s["available"]]
        if free_b and any(s["available"] for s in booking.slots(offering_a, day)["all_available_slots_for_data"]):
            start = pytz.UTC.localize(get_datetime(free_b[0]["start_time"].replace("Z", ""))).astimezone(zone)
            frappe.db.set_default(STATE_KEY, json.dumps(dict(day=str(day), time=start.strftime("%H:%M"), service=service.name,
                                                             room_b=rooms["B"], offering_a=offering_a)))
            break
    frappe.db.commit()
    return browser_values()


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    state = json.loads(frappe.db.get_default(STATE_KEY) or "{}")
    values.update({f"qa_pool_{key}": value for key, value in state.items()})
    values["qa_pool_guest_id"] = frappe.db.get_value("Appointment", {"client_email": "qa-pool-guest-en@example.test"}, "name") or ""
    return values


def cleanup():
    frappe.set_user("Administrator")
    service = _service()
    names = frappe.get_all("Appointment", filters={"service": service or ""}, pluck="name")
    customers = set(frappe.get_all("Appointment", filters={"name": ["in", names or [""]]}, pluck="customer"))
    frappe.db.delete("Appointment Notification", {"appointment": ["in", names or [""]]})
    frappe.db.delete("Email Queue", {"reference_doctype": "Appointment", "reference_name": ["in", names or [""]]})
    for name in names:
        frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
    for name in customers:
        if name and not frappe.db.exists("Appointment", {"customer": name}):
            frappe.delete_doc("Customer Profile", name, ignore_permissions=True, force=True)
    if service:
        for name in frappe.get_all("EventType", filters={"service": service}, pluck="name"):
            frappe.delete_doc("EventType", name, ignore_permissions=True, force=True)
        frappe.db.set_default(resources.PAUSED_KEY.format(service), "")
        frappe.delete_doc("Service", service, ignore_permissions=True, force=True)
    kinds = frappe.get_all("Resource Type", filters={"organization": ORG, "type_name": ["in", [ROOM_TYPE, DRYER_TYPE]]}, pluck="name")
    for name in frappe.get_all("Resource", filters={"resource_type": ["in", kinds or [""]]}, pluck="name"):
        frappe.delete_doc("Resource", name, ignore_permissions=True, force=True)
    for name in kinds:
        frappe.delete_doc("Resource Type", name, ignore_permissions=True, force=True)
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()
    return {"appointments": len(names), "service": service}
