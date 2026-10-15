"""QA fixtures for Ergata v2 (`qa/manifests/growth/template-ergata-v2*.yaml`, `booking-journey-ergata.yaml`).

The pages are the seeded Yared Tesfaye Counselling showcase (`appointment.demo.showcase.seed`) on recipe
`ergata-therapy` v2. This fixture makes no business records. The journey books one session as a guest, phone
first, to capture the booking-success moment; that guest is always the client below.

`setup()` records the time. `cleanup()` deletes only the bookings and the customer profile of that one client
that were made at the showcase after `setup()` and are not in the seeder journal. Every delete uses one exact
name; nothing runs with an empty filter. Run `cleanup()` after the journey manifest.
"""

import json

import frappe

from appointment.demo import ergata_showcase, independent_world

STATE_KEY = "appointment_template_ergata_v2_qa"
QA_CLIENT = "Liya Mekonnen"
QA_PHONE = "0900 000 019"
QA_PHONE_E164 = "+251900000019"


def setup():
    frappe.set_user("Administrator")
    cleanup()
    frappe.db.set_default(STATE_KEY, json.dumps({"since": frappe.utils.now()}))
    frappe.db.commit()
    return browser_values()


def browser_values(manifest=None):
    from appointment.tests import template_ergata_qa_fixtures

    values = template_ergata_qa_fixtures.browser_values(manifest)
    values.update({"qa_ergata_slug": ergata_showcase.SLUG, "qa_ergata_client": QA_CLIENT, "qa_ergata_phone": QA_PHONE})
    return values


def cleanup(since=None):
    """`since` (optional) widens the window to an earlier run of this session, for example after a lost state."""
    frappe.set_user("Administrator")
    since = since or _state().get("since")
    seeded = independent_world.seeded(ergata_showcase.SHOWCASE.key)
    if not since or not seeded:
        frappe.db.set_default(STATE_KEY, "")
        frappe.db.commit()
        return {"deleted": 0}
    provider = seeded["provider"]
    _require(provider)
    owned = {tuple(entry) for entry in seeded["created"]}
    deleted = 0
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        bookings = frappe.get_all("Appointment", filters={"provider": provider, "client_phone": QA_PHONE_E164, "client_name": QA_CLIENT,
                                                          "creation": [">=", since]}, pluck="name")
        for name in sorted(bookings):
            if ("Appointment", name) in owned:
                continue
            for notification in frappe.get_all("Appointment Notification", filters={"appointment": name}, pluck="name"):
                _delete_one("Appointment Notification", notification)
            _delete_one("Appointment", name)
            deleted += 1
        profiles = frappe.get_all("Customer Profile", filters={"independent_provider": provider, "primary_phone": QA_PHONE_E164,
                                                               "display_name": QA_CLIENT, "creation": [">=", since]}, pluck="name")
        for name in sorted(profiles):
            if ("Customer Profile", name) not in owned:
                _delete_one("Customer Profile", name)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()
    return {"deleted": deleted}


def _delete_one(doctype, name):
    _require(name)
    if frappe.db.exists(doctype, name):
        frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)


def _require(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Refusing a cleanup filter without one exact value.")


def _state():
    return json.loads(frappe.db.get_value("DefaultValue", {"parent": "__default", "defkey": STATE_KEY}, "defvalue") or "{}")
