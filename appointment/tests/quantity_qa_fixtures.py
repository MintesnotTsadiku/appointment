"""Agent Plane fixtures for qa/manifests/quantity.

`setup()` gives Bloom a QA service "Group studio session (QA)" booked without
staff from a 6-seat pool "Studio seats (QA)", where customers choose up to 4
seats at 200 ETB each. Guests book 3 seats; staff see "× 3", filter reception by
the pool, and see its use in Insights. `cleanup()` removes everything.
"""

import json

import frappe
from frappe.utils import add_days, nowdate

from appointment.demo import showcase
from appointment.scheduler import booking, resources

ORG = "Bole Bloom Hair Studio"
OWNER = "bloom.owner@example.test"
MAIN = "Bole main studio"
SERVICE_NAME = "Group studio session (QA)"
SEAT_TYPE = "Studio seat (QA)"
STATE_KEY = "appointment_quantity_qa_state"


def _service():
    return frappe.db.get_value("Service", {"organization": ORG, "service_name": SERVICE_NAME}, "name")


def setup():
    frappe.set_user("Administrator")
    cleanup()
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True  # The booking-URL sync commits; this fixture commits once at the end.
    try:
        service = frappe.get_doc(dict(doctype="Service", service_name=SERVICE_NAME, organization=ORG, duration=60, price=200,
                                      description="A small group session in the studio; book a seat for each person.")).insert(ignore_permissions=True)
    finally:
        frappe.flags.syncing_booking_urls = previous
    seat_type = frappe.get_doc(dict(doctype="Resource Type", organization=ORG, type_name=SEAT_TYPE)).insert(ignore_permissions=True).name
    pool = frappe.get_doc(dict(doctype="Resource", organization=ORG, resource_name="Studio seats (QA)", resource_type=seat_type,
                               location=MAIN, capacity=6)).insert(ignore_permissions=True).name
    frappe.set_user(OWNER)
    resources.save_service_needs(service.name, [{"resource_type": seat_type}], resource_only=1, allow_quantity=1, max_quantity=4)
    frappe.set_user("Administrator")
    offering = frappe.db.get_value("EventType", {"service": service.name, "resource": pool}, "name")
    for offset in range(1, 14):
        day = add_days(nowdate(), offset)
        if any(s["available"] for s in booking.slots(offering, day, quantity=3)["all_available_slots_for_data"]):
            frappe.db.set_default(STATE_KEY, json.dumps(dict(day=str(day), service=service.name, pool=pool, offering=offering)))
            break
    frappe.db.commit()
    return browser_values()


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    values.update({f"qa_qty_{key}": value for key, value in json.loads(frappe.db.get_default(STATE_KEY) or "{}").items()})
    values["qa_qty_guest_id"] = frappe.db.get_value("Appointment", {"client_email": "qa-qty-guest-en@example.test"}, "name") or ""
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
    kinds = frappe.get_all("Resource Type", filters={"organization": ORG, "type_name": SEAT_TYPE}, pluck="name")
    for name in frappe.get_all("Resource", filters={"resource_type": ["in", kinds or [""]]}, pluck="name"):
        frappe.delete_doc("Resource", name, ignore_permissions=True, force=True)
    for name in kinds:
        frappe.delete_doc("Resource Type", name, ignore_permissions=True, force=True)
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()
    return {"appointments": len(names), "service": service}
