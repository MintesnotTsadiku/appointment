"""Fixture for the phone-first manifests (qa/manifests/growth/phone-first*.yaml).

The manifests book at Bloom and add a walk-in with the phone numbers in PHONES,
so cleanup finds exactly what the runs made: bookings and walk-ins whose main
phone is one of PHONES, their notification rows, and the customer profiles
those bookings created.

Run `setup` before the manifests and `cleanup` after them.
"""

import frappe

from appointment.tests import org_walkin_qa_fixtures, qa_days

# Main phone numbers the manifests type: English booking, Amharic booking, walk-in.
PHONES = ("+251911736411", "+251911736412", "+251911736413")


def setup():
    frappe.set_user("Administrator")
    cleanup()
    return browser_values()


def browser_values(manifest=None):
    values = qa_days.browser_values(manifest)
    values.update({key: value for key, value in org_walkin_qa_fixtures.browser_values(manifest).items() if key.startswith("qa_org_walkin")})
    return values


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
