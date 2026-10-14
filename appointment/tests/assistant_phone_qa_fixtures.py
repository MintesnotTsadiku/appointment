"""Fixture for qa/manifests/growth/phone-assistants.yaml.

The manifest creates one VA profile and one client profile through the assistant
modals, with the people and emails below, and edits their phone numbers. Cleanup
deletes exactly these two profiles and their two users, by name.

Run `setup` before the manifest and `cleanup` after it.
"""

import frappe

VA_EMAIL = "selamawit.bekele.va@example.test"
CLIENT_EMAIL = "dawit.tadesse.client@example.test"
# Profiles are named after their user (autoname `field:user`).
RECORDS = (("VA Profile", VA_EMAIL), ("Client Profile", CLIENT_EMAIL))


def setup():
    frappe.set_user("Administrator")
    cleanup()
    return browser_values()


def browser_values(manifest=None):
    return {"qa_va_email": VA_EMAIL, "qa_client_email": CLIENT_EMAIL}


def stored_phones():
    """The stored numbers, for checking a run: User.mobile_no for the VA, Client Profile.phone for the client."""
    return {"va": frappe.db.get_value("User", VA_EMAIL, "mobile_no"),
            "client": frappe.db.get_value("Client Profile", CLIENT_EMAIL, "phone")}


def cleanup():
    frappe.set_user("Administrator")
    for doctype, name in RECORDS:
        if frappe.db.exists(doctype, name):
            frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)
    for email in (VA_EMAIL, CLIENT_EMAIL):
        if frappe.db.exists("User", email):
            frappe.delete_doc("User", email, ignore_permissions=True, force=True)
    frappe.db.commit()
