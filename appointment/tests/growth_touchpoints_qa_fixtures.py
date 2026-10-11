"""Agent Plane fixtures for qa/manifests/growth/touchpoints-*.yaml.

`setup()` makes, at Bloom, one past (completed) and one upcoming booking for a returning
customer, so My bookings shows "Book again" and the manage page shows the platform mark.
It also renders the confirmation and reminder emails (English and Amharic) to static preview
files under `appointment/public/qa-previews/`, which the browser opens at `/assets/...`.
Guests in the manifests book with their own addresses; `cleanup()` removes every booking,
profile, notification and email of those addresses, any account a run made, and the previews.
"""

import json
import os
from datetime import timedelta

import frappe
from frappe.utils import add_days, get_datetime, nowdate

from appointment.demo import showcase
from appointment.scheduler import booking, my_bookings, notification_email, self_service
from appointment.tests import demo_offerings, qa_days

ORG_OWNER = "bloom.owner@example.test"
OFFERING = demo_offerings.cut_rahel()  # Cut and shape, Rahel Girma
RETURNING = "tsion.bekele.qa@example.test"
RETURNING_NAME = "Tsion Bekele"
GUESTS = ("abel.girma.qa@example.test", "hiwot.kebede.qa@example.test", "dawit.alemu.qa@example.test")
STATE_KEY = "appointment_growth_touchpoints_qa"
PREVIEW_DIR = ("public", "qa-previews")


def _org():
    return frappe.db.get_value("Organization", {"owner_user": ORG_OWNER}, "name")


def _preview_dir():
    return frappe.get_app_path("appointment", *PREVIEW_DIR)


def setup():
    frappe.set_user("Administrator")
    cleanup()
    org = _org()
    slots = _free_slots(2)
    booked = []
    for index, slot in enumerate(slots):
        frappe.set_user("Guest")
        result = booking.book(OFFERING, slot["start_time"], slot["end_time"], RETURNING_NAME, RETURNING,
                              f"qa-growth-touch-{index}-{frappe.generate_hash(length=10)}", user_phone="0911728390",
                              organization_id=org, language="en")
        frappe.set_user("Administrator")
        booked.append(result["booking_id"])
    past, upcoming = booked
    # A visit three weeks ago: the customer came, so My bookings offers "Book again".
    start = get_datetime(frappe.db.get_value("Appointment", past, "starts_at")) - timedelta(days=21 + 14)
    frappe.db.set_value("Appointment", past, {"starts_at": start, "ends_at": start + timedelta(minutes=45),
                                              "appointment_date": start.date(), "status": "Completed"}, update_modified=False)
    _write_previews(upcoming)
    frappe.db.delete("Email Queue", {"reference_doctype": "Appointment", "reference_name": ["in", booked]})
    frappe.db.set_default(STATE_KEY, json.dumps({"past": past, "upcoming": upcoming}))
    frappe.db.commit()
    return browser_values()


def _free_slots(count):
    found = []
    for offset in range(3, 21):
        free = [s for s in booking.slots(OFFERING, add_days(nowdate(), offset))["all_available_slots_for_data"] if s["available"]]
        found.extend(free[:1])
        if len(found) == count:
            return found
    raise frappe.ValidationError("No free Bloom slots for the touchpoint QA.")


def _write_previews(name):
    """Confirmation and reminder emails as customers receive them, one file per language."""
    doc = frappe.get_doc("Appointment", name)
    os.makedirs(_preview_dir(), exist_ok=True)
    for event in ("Confirmation", "Reminder"):
        for language in ("en", "am"):
            message = notification_email.render(event, doc, language, doc.client_email)
            page = (f'<!doctype html><html lang="{language}"><head><meta charset="utf-8">'
                    f'<meta name="viewport" content="width=device-width, initial-scale=1"><title>{message["subject"]}</title>'
                    f'<meta name="robots" content="noindex"></head><body style="margin:0">{message["html"]}</body></html>')
            with open(os.path.join(_preview_dir(), f"{event.lower()}-{language}.html"), "w", encoding="utf-8") as handle:
                handle.write(page)


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    org = _org()
    slug = frappe.db.get_value("Organization", org, "slug")
    state = json.loads(frappe.db.get_default(STATE_KEY) or "{}")
    values["qa_open_day"] = qa_days.open_day()
    values["qa_touch_slug"] = slug or ""
    values["qa_touch_offering"] = OFFERING or ""
    for index, email in enumerate(GUESTS, start=1):
        values[f"qa_touch_guest_{index}"] = email
    for index in range(1, 3):
        values[f"qa_touch_mine_link_{index}"] = f"/{slug}/my-bookings?token={my_bookings.link_token(org, RETURNING)}"
    upcoming = state.get("upcoming")
    if upcoming and frappe.db.exists("Appointment", upcoming):
        values["qa_touch_manage_path"] = self_service.manage_url(frappe.get_doc("Appointment", upcoming)).replace(frappe.utils.get_url(), "")
    for event in ("confirmation", "reminder"):
        for language in ("en", "am"):
            values[f"qa_touch_email_{event}_{language}"] = f"/assets/appointment/qa-previews/{event}-{language}.html"
    return values


def cleanup():
    frappe.set_user("Administrator")
    emails = (RETURNING, *GUESTS)
    names = frappe.get_all("Appointment", filters={"client_email": ["in", emails]}, pluck="name")
    customers = set(frappe.get_all("Appointment", filters={"name": ["in", names or [""]]}, pluck="customer"))
    frappe.db.delete("Appointment Notification", {"appointment": ["in", names or [""]]})
    frappe.db.delete("Email Queue", {"reference_doctype": "Appointment", "reference_name": ["in", names or [""]]})
    org = _org()
    for name in frappe.get_all("Email Queue", filters={"reference_doctype": "Organization", "reference_name": org,
                                                       "message": ["like", "%my-bookings?token=%"]}, pluck="name"):
        frappe.delete_doc("Email Queue", name, ignore_permissions=True, force=True)
    for name in names:
        frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
    for name in customers:
        if name and not frappe.db.exists("Appointment", {"customer": name}):
            frappe.delete_doc("Customer Profile", name, ignore_permissions=True, force=True)
    # The manifests stop at the prefilled form; remove anything a manual run may have made.
    for email in emails:
        _remove_account(email)
    previews = _preview_dir()
    if os.path.isdir(previews):
        for file in os.listdir(previews):
            os.remove(os.path.join(previews, file))
        os.rmdir(previews)
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()
    return {"appointments": len(names)}


def _remove_account(email):
    if not frappe.db.exists("User", email):
        return
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        for provider in frappe.get_all("Provider", filters={"user": email}, pluck="name"):
            for name in frappe.get_all("Appointment", filters={"provider": provider}, pluck="name"):
                frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
            for name in frappe.get_all("EventType", filters={"provider": provider}, pluck="name"):
                frappe.delete_doc("EventType", name, ignore_permissions=True, force=True)
            for doctype in ("Service", "Location"):
                for name in frappe.get_all(doctype, filters={"independent_provider": provider}, pluck="name"):
                    frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)
            frappe.delete_doc("Provider", provider, ignore_permissions=True, force=True)
        frappe.delete_doc("User", email, ignore_permissions=True, force=True)
    finally:
        frappe.flags.syncing_booking_urls = previous
