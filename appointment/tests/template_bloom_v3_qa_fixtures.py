"""QA fixtures for Bloom v3, "Golden Hour Salon" (`qa/manifests/growth/template-bloom-v3*.yaml`).

The pages are the seeded Bole Bloom Hair Studio showcase (`appointment.demo.showcase.seed`) on recipe
`bloom-hair` v3. The fixture makes no business records. One manifest scenario books an appointment as a
guest to capture the booking-success moment; that guest always uses the client below.

`setup()` records the time. `cleanup()` deletes only the bookings and the customer profile of that one
client that were made at the Bloom showcase after `setup()` and are not in the seeder journal. Every delete
uses one exact name; nothing runs with an empty filter.
"""

import json

import frappe

from appointment.demo import showcase

STATE_KEY = "appointment_template_bloom_v3_qa"
QA_CLIENT = "Tsion Alemu"
QA_EMAIL = "tsion.alemu@example.test"
QA_PHONE = "0900 000 017"


def setup():
    frappe.set_user("Administrator")
    cleanup()
    frappe.db.set_default(STATE_KEY, json.dumps({"since": frappe.utils.now()}))
    frappe.db.commit()
    return browser_values()


def browser_values(manifest=None):
    values = showcase.browser_values(manifest) if showcase.state_path().exists() else {}
    values.update({"qa_bloom_slug": "bloom-studio", "qa_bloom_client": QA_CLIENT, "qa_bloom_email": QA_EMAIL, "qa_bloom_phone": QA_PHONE,
                   "qa_bloom_open_day": _open_day()})
    return values


def _open_day():
    """The next day the studio opens (it is closed on Monday), from tomorrow in Addis Ababa."""
    from datetime import datetime, timedelta

    import pytz

    day = datetime.now(pytz.timezone("Africa/Addis_Ababa")).date() + timedelta(days=1)
    while day.strftime("%A") == "Monday":
        day += timedelta(days=1)
    return str(day)


def cleanup():
    frappe.set_user("Administrator")
    state = _state()
    since = state.get("since")
    if not since or not showcase.state_path().exists():
        frappe.db.set_default(STATE_KEY, "")
        frappe.db.commit()
        return {"deleted": 0}
    journal = showcase.load_state()
    organization = journal["businesses"]["bloom"]["organization"]
    owned = {tuple(entry) for entry in journal["created"]}
    _require(organization)
    deleted = 0
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        for name in frappe.get_all("Appointment", filters={"organization": organization, "client_email": QA_EMAIL, "creation": [">=", since]}, pluck="name"):
            if ("Appointment", name) in owned:
                continue
            for notification in frappe.get_all("Appointment Notification", filters={"appointment": name}, pluck="name"):
                _delete_one("Appointment Notification", notification)
            _delete_one("Appointment", name)
            deleted += 1
        for name in frappe.get_all("Customer Profile", filters={"organization": organization, "primary_email": QA_EMAIL, "creation": [">=", since]}, pluck="name"):
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
