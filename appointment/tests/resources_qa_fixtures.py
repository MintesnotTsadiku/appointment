"""Agent Plane fixtures for qa/manifests/resources.

`setup()` gives Bloom a "Styling chair (QA)" type that "Cut and shape" needs:
chairs 1 and 2 at the main studio, both blocked all of the QA day (the first
day Rahel has open times), and quiet chairs A and B at the quiet room. It books
Rahel (quiet room) that day, which takes quiet chair A. Guests then find no open
"Cut and shape" time with Eden that day but open times with Rahel; staff move Rahel's booking between A and B.
`cleanup()` releases the QA chairs from upcoming bookings (runs that add a
chair assign it to demo bookings, as the feature does) and removes everything
the fixture and the runs created.
"""

from datetime import datetime, timedelta

import frappe
import pytz
from frappe.utils import add_days, get_time, nowdate

from appointment.demo import showcase
from appointment.scheduler import booking, resources
from appointment.tests import demo_offerings

TYPE_NAME = "Styling chair (QA)"
RAHEL = demo_offerings.cut_rahel()  # Cut and shape, Rahel, Bole quiet styling room
MAIN = "Bole main studio"
QUIET = "Bole quiet styling room"
EMAIL = "qa-resource-reception@example.test"


def _org():
    return frappe.db.get_value("Service", frappe.db.get_value("EventType", RAHEL, "service"), "organization")


def setup():
    frappe.set_user("Administrator")
    cleanup()
    org = _org()
    kind = frappe.get_doc(dict(doctype="Resource Type", organization=org, type_name=TYPE_NAME)).insert(ignore_permissions=True)
    made = {}
    for name, location in (("Chair 1", MAIN), ("Chair 2", MAIN), ("Quiet chair A", QUIET), ("Quiet chair B", QUIET)):
        made[name] = frappe.get_doc(dict(doctype="Resource", organization=org, resource_name=name, resource_type=kind.name, location=location)).insert(ignore_permissions=True).name
    service = frappe.get_doc("Service", frappe.db.get_value("EventType", RAHEL, "service"))
    service.set("resource_needs", [dict(resource_type=kind.name)])
    resources._save_needs(service)

    zone = pytz.timezone(frappe.db.get_value("Location", MAIN, "timezone"))
    day = _qa_day()
    day_start = zone.localize(datetime.combine(frappe.utils.getdate(day), datetime.min.time())).astimezone(pytz.UTC).replace(tzinfo=None)
    for name in ("Chair 1", "Chair 2"):
        frappe.get_doc(dict(
            doctype="Resource Block", organization=org, resource=made[name], starts_at=day_start,
            ends_at=day_start + timedelta(days=1), reason="QA: closed for cleaning",
        )).insert(ignore_permissions=True)

    slot = next(s for s in booking.slots(RAHEL, day)["all_available_slots_for_data"] if s["available"])
    frappe.set_user("Guest")
    result = booking.book(RAHEL, slot["start_time"], slot["end_time"], "Resource QA", EMAIL, frappe.generate_hash(length=24), organization_id=org)
    frappe.set_user("Administrator")
    frappe.db.delete("Email Queue", {"reference_doctype": "Appointment", "reference_name": result["booking_id"]})
    frappe.db.commit()
    return browser_values()


def _qa_day():
    """The first day from tomorrow on where Rahel has an open time."""
    for offset in range(1, 14):
        day = add_days(nowdate(), offset)
        if any(s["available"] for s in booking.slots(RAHEL, day)["all_available_slots_for_data"]):
            return str(day)
    frappe.throw("No open Rahel day in the next two weeks.")


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    org = _org()
    kind = frappe.db.get_value("Resource Type", {"organization": org, "type_name": TYPE_NAME}, "name")
    chairs = dict(frappe.get_all("Resource", filters={"resource_type": kind or ""}, fields=["resource_name", "name"], as_list=True))
    values["qa_res_chair_a"] = chairs.get("Quiet chair A", "")
    values["qa_res_chair_b"] = chairs.get("Quiet chair B", "")
    name = frappe.db.get_value("Appointment", {"client_email": EMAIL}, "name")
    values["qa_res_booking_id"] = name or ""
    if name:
        doc = frappe.get_doc("Appointment", name)
        values["qa_res_day"] = str(doc.appointment_date)
        values["qa_res_block_start"] = f"{doc.appointment_date}T{get_time(doc.start_time):%H:%M}"
        values["qa_res_block_end"] = f"{doc.appointment_date}T{get_time(doc.end_time):%H:%M}"
    return values


def cleanup():
    frappe.set_user("Administrator")
    names = frappe.get_all("Appointment", filters={"client_email": EMAIL}, pluck="name")
    customers = set(frappe.get_all("Appointment", filters={"name": ["in", names or [""]]}, pluck="customer"))
    frappe.db.delete("Appointment Notification", {"appointment": ["in", names or [""]]})
    frappe.db.delete("Email Queue", {"reference_doctype": "Appointment", "reference_name": ["in", names or [""]]})
    for name in names:
        frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
    for name in customers:
        if name and not frappe.db.exists("Appointment", {"customer": name}):
            frappe.delete_doc("Customer Profile", name, ignore_permissions=True, force=True)
    org = _org()
    kinds = frappe.get_all("Resource Type", filters={"organization": org, "type_name": TYPE_NAME}, pluck="name")
    service = frappe.get_doc("Service", frappe.db.get_value("EventType", RAHEL, "service"))
    if any(row.resource_type in kinds for row in service.resource_needs):
        service.set("resource_needs", [row for row in service.resource_needs if row.resource_type not in kinds])
        resources._save_needs(service)
    # Adding resources during a run assigns them to upcoming demo bookings (by design);
    # release them through the normal booking save before the resources go.
    resources.assign_upcoming(org, service.name)
    for name in frappe.get_all("Resource", filters={"resource_type": ["in", kinds or [""]]}, pluck="name"):
        frappe.delete_doc("Resource", name, ignore_permissions=True, force=True)
    for name in kinds:
        frappe.delete_doc("Resource Type", name, ignore_permissions=True, force=True)
    frappe.db.commit()
    return {"appointments": len(names), "types": len(kinds)}
