"""QA fixtures for develop's features inside the merged staff shell.

- A Bloom booking on the first open day, for reception stages, the change reason and reception state.
- A QA independent provider with one offering, for the independent-owner home and booking page.

Run `setup` before `qa/manifests/develop-features/*.yaml` and `cleanup` afterwards.
"""

import json

import frappe

from appointment.demo import showcase
from appointment.scheduler import booking, independent
from appointment.tests import demo_offerings, qa_days

EMAIL = "qa-dev-stages@example.test"
INDEPENDENT_USER = "qa-independent-owner@example.test"
INDEPENDENT_NAME = "QA Independent Studio"
STATE_KEY = "appointment_develop_features_qa"
INVITEE = "qa-dev-invitee@example.test"


def setup():
    frappe.set_user("Administrator")
    cleanup()
    offering = demo_offerings.cut_rahel()
    day = qa_days.open_day(offering)
    slot = next(s for s in booking.slots(offering, day)["all_available_slots_for_data"] if s["available"])
    frappe.set_user("Guest")
    result = booking.book(offering, slot["start_time"], slot["end_time"], "QA Develop Stages", EMAIL, "qa-dev-stages-0001")
    frappe.set_user("Administrator")

    frappe.get_doc(dict(doctype="User", email=INDEPENDENT_USER, first_name="QA Independent", send_welcome_email=0,
                        enabled=1, user_type="System User", roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
    frappe.set_user(INDEPENDENT_USER)
    from appointment.public_experience import solo_setup

    provider = solo_setup.create(INDEPENDENT_NAME)["provider"]
    row = independent.create(provider, "QA Independent room", "QA Independent consultation", "Africa/Addis_Ababa",
                             30, "09:00", "17:00", list(independent.DAYS))
    frappe.set_user("Administrator")
    location = frappe.db.get_value("Appointment", result["booking_id"], "location")
    saved = frappe.db.get_value("Location", location, ["reception_state", "reception_events"], as_dict=True)
    frappe.db.set_default(STATE_KEY, json.dumps({"booking": result["booking_id"], "day": str(day), "provider": provider,
                                                 "offering": row.get("offering"), "location": location,
                                                 "reception_state": saved.reception_state, "reception_events": saved.reception_events}))
    frappe.db.commit()
    return {"booking": result["booking_id"], "provider": provider}


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    state = json.loads(frappe.db.get_default(STATE_KEY) or "{}")
    values["qa_dev_booking_id"] = state.get("booking", "")
    values["qa_dev_day"] = state.get("day", "")
    location = frappe.db.get_value("Appointment", state.get("booking"), "location") if state.get("booking") else None
    values["qa_dev_location"] = location or ""
    return values


def cleanup():
    frappe.set_user("Administrator")
    state = json.loads(frappe.db.get_default(STATE_KEY) or "{}")
    if state.get("location"):
        # Reception state is the location's own setting; put back what the run changed.
        frappe.db.set_value("Location", state["location"], {"reception_state": state.get("reception_state"),
                            "reception_events": state.get("reception_events")}, update_modified=False)
    # Invitations are an audit record: revoke the QA one rather than deleting it.
    from appointment.content import staff_invitations

    for name in frappe.get_all("Business Staff Invitation", filters={"email": INVITEE, "status": "Pending"}, pluck="name"):
        staff_invitations.revoke(name)
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True  # The booking-URL sync commits; cleanup commits once at the end.
    try:
        for name in frappe.get_all("Appointment", filters={"client_email": EMAIL}, pluck="name"):
            customer = frappe.db.get_value("Appointment", name, "customer")
            frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
            if customer and not frappe.db.exists("Appointment", {"customer": customer}):
                frappe.delete_doc("Customer Profile", customer, ignore_permissions=True, force=True)
        for provider in frappe.get_all("Provider", filters={"user": INDEPENDENT_USER}, pluck="name"):
            for name in frappe.get_all("Appointment", filters={"provider": provider}, pluck="name"):
                frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
            for name in frappe.get_all("EventType", filters={"provider": provider}, pluck="name"):
                frappe.delete_doc("EventType", name, ignore_permissions=True, force=True)
            for doctype in ("Service", "Location"):
                for name in frappe.get_all(doctype, filters={"independent_provider": provider}, pluck="name"):
                    frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)
            frappe.delete_doc("Provider", provider, ignore_permissions=True, force=True)
        if frappe.db.exists("User", INDEPENDENT_USER):
            frappe.delete_doc("User", INDEPENDENT_USER, ignore_permissions=True, force=True)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()
