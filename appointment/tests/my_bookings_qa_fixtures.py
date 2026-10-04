"""Agent Plane fixtures for qa/manifests/my-bookings.

`setup()` books two Bloom appointments for qa-mine@example.test. `browser_values()`
makes four one-time links (one per scenario; links are single use, so the
values are made once per run). `cleanup()` removes the bookings, their profile
and the sign-in emails.
"""

import frappe
from frappe.utils import add_days, nowdate

from appointment.demo import showcase
from appointment.scheduler import booking, my_bookings

ORG = "Bole Bloom Hair Studio"
OFFERING = "EVT-2026-000109"  # Cut and shape, Rahel, Bole quiet styling room
EMAIL = "qa-mine@example.test"


def setup():
    frappe.set_user("Administrator")
    cleanup()
    booked = 0
    for offset in range(1, 14):
        free = [s for s in booking.slots(OFFERING, add_days(nowdate(), offset))["all_available_slots_for_data"] if s["available"]]
        for slot in free[: 2 - booked]:
            frappe.set_user("Guest")
            booking.book(OFFERING, slot["start_time"], slot["end_time"], "Mine QA", EMAIL, frappe.generate_hash(length=24), organization_id=ORG)
            frappe.set_user("Administrator")
            booked += 1
        if booked == 2:
            break
    frappe.db.delete("Email Queue", {"reference_doctype": "Appointment", "reference_name": ["in", _names() or [""]]})
    frappe.db.commit()
    return browser_values()


def _names():
    return frappe.get_all("Appointment", filters={"client_email": EMAIL}, pluck="name")


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    slug = frappe.db.get_value("Organization", ORG, "slug")
    values["qa_mine_email"] = EMAIL
    for index in range(1, 5):
        values[f"qa_mine_link_{index}"] = f"/{slug}/my-bookings?token={my_bookings.link_token(ORG, EMAIL)}"
    return values


def cleanup():
    frappe.set_user("Administrator")
    names = _names()
    customers = set(frappe.get_all("Appointment", filters={"name": ["in", names or [""]]}, pluck="customer"))
    frappe.db.delete("Appointment Notification", {"appointment": ["in", names or [""]]})
    frappe.db.delete("Email Queue", {"reference_doctype": "Appointment", "reference_name": ["in", names or [""]]})
    for name in frappe.get_all("Email Queue", filters={"reference_doctype": "Organization", "reference_name": ORG, "message": ["like", "%my-bookings?token=%"]}, pluck="name"):
        frappe.delete_doc("Email Queue", name, ignore_permissions=True, force=True)
    for name in names:
        frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
    for name in customers:
        if name and not frappe.db.exists("Appointment", {"customer": name}):
            frappe.delete_doc("Customer Profile", name, ignore_permissions=True, force=True)
    frappe.db.commit()
    return {"appointments": len(names)}
