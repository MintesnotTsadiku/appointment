"""Guest journey fixture on seeder-owned businesses; cleanup is limited to this fixture's bookings.

Setup records a boundary before the named guest books. Cleanup excludes every seeder-owned record
and deletes by exact document name, provider, phone, guest name and creation boundary.
"""
import json
import frappe
from appointment.demo import independent_world
from appointment.demo.new_template_showcases import SHOWCASES

STATE_KEY = "appointment_template_collection_qa"
CLIENT = "Liya Mekonnen"


def browser_values(manifest=None):
    values = {"qa_collection_client": CLIENT}
    for index, definition in enumerate(SHOWCASES):
        values[f"qa_{definition.key.replace('-', '_')}_phone"] = f"0900 000 {120+index:03}"
    return values


def setup():
    frappe.set_user("Administrator")
    cleanup()
    frappe.db.set_default(STATE_KEY, json.dumps({"since": frappe.utils.now()}))
    frappe.db.commit()
    return browser_values()


def cleanup():
    frappe.set_user("Administrator")
    state = json.loads(frappe.db.get_value("DefaultValue", {"parent": "__default", "defkey": STATE_KEY}, "defvalue") or "{}")
    if not state.get("since"):
        return {"deleted": 0}
    deleted = 0
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        for index, definition in enumerate(SHOWCASES):
            seeded = independent_world.seeded(definition.key)
            if not seeded:
                continue
            provider = seeded["provider"]
            if not provider:
                raise ValueError("A fixture cleanup requires an exact provider.")
            owned = {tuple(entry) for entry in seeded["created"]}
            phone = f"+251900000{120+index:03}"
            appointments = frappe.get_all("Appointment", filters={"provider": provider, "client_phone": phone,
                "client_name": CLIENT, "creation": [">=", state["since"]]}, pluck="name")
            for name in appointments:
                if ("Appointment", name) in owned:
                    continue
                for notification in frappe.get_all("Appointment Notification", filters={"appointment": name}, pluck="name"):
                    _delete("Appointment Notification", notification)
                _delete("Appointment", name)
                deleted += 1
            profiles = frappe.get_all("Customer Profile", filters={"independent_provider": provider,
                "primary_phone": phone, "display_name": CLIENT, "creation": [">=", state["since"]]}, pluck="name")
            for name in profiles:
                if ("Customer Profile", name) not in owned:
                    _delete("Customer Profile", name)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()
    return {"deleted": deleted}


def _delete(doctype, name):
    if not isinstance(name, str) or not name.strip():
        raise ValueError("Fixture cleanup requires an exact document name.")
    if frappe.db.exists(doctype, name):
        frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)
