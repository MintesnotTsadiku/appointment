"""QA fixture for `qa/manifests/growth/provider-page*.yaml`: an independent provider without a website.

`setup()` creates, and records by exact name:

- Rahel Girma Nutrition: an independent dietitian (owner rahel.girma.nutrition@example.test) with no Public
  Site, so her provider page uses the platform look. Two places (a Kazanchis consultation room and an online
  Zoom room) and three services: a video check-in (online only), a body composition assessment (in person
  only) and a meal plan consultation in both formats (two offerings of one service).
- Her page address `rahel-nutrition`. Setup first gives the page `rahel-girma-nutrition`, then changes it
  the way the Grow page does (`short_links.change`), so `rahel-girma-nutrition` is a former address that
  redirects.

The people and places are fictional. `cleanup()` deletes only what this module recorded, by exact name,
through `frappe.delete_doc`, and does nothing for an empty value. Deleting the provider also deletes its
former addresses (`provider_page.delete_aliases`).
"""

import json

import frappe

STATE_KEY = "appointment_provider_page_qa"
OWNER = "rahel.girma.nutrition@example.test"
BUSINESS = "Rahel Girma Nutrition"
FIRST_SLUG = "rahel-girma-nutrition"
SLUG = "rahel-nutrition"
TZ = "Africa/Addis_Ababa"
DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
OPEN_DAYS = [day for day in DAYS if day != "Sunday"]
PHOTO = "/assets/appointment/brand-experience/providers/rahel-girma.webp"
OFFICE = "Kazanchis consultation room"
ONLINE = "Rahel online consultations"
BIO = ("Registered dietitian in Addis Ababa. Practical eating plans for diabetes, pregnancy, sport and "
       "healthy weight, built around Ethiopian food and fasting seasons.")
# name, duration, price, formats, description
SERVICES = (
    ("Meal plan consultation", 60, 1200, ("in_person", "online"),
     "A full review of your eating, health goals and fasting days, and a two-week plan you can cook at home."),
    ("Nutrition check-in by video", 30, 600, ("online",),
     "A short follow-up to adjust your plan, review your food diary and answer questions."),
    ("Body composition assessment", 45, 900, ("in_person",),
     "Weight, waist and body composition measurements with a clear explanation of what they mean for you."),
)


def setup():
    from appointment.scheduler import independent
    from appointment.public_experience import solo_setup
    from appointment.growth import short_links

    frappe.set_user("Administrator")
    cleanup()
    state = {"users": [], "providers": []}
    frappe.get_doc(dict(doctype="User", email=OWNER, first_name="Rahel", last_name="Girma", send_welcome_email=0,
                        enabled=1, user_type="System User", time_zone=TZ, roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
    state["users"].append(OWNER)
    _save(state)
    frappe.set_user(OWNER)
    provider = solo_setup.create(BUSINESS)["provider"]
    state["providers"].append(provider)
    _save(state)
    first = SERVICES[0]
    row = independent.create(provider, OFFICE, first[0], TZ, first[1], "08:30", "17:30", OPEN_DAYS)
    frappe.set_user("Administrator")
    _shape(provider, row["offering"])
    frappe.set_user(OWNER)
    independent.publish(provider, 1)
    if frappe.db.get_value("Provider", provider, "public_slug") != FIRST_SLUG:
        short_links.change("Provider:" + provider, FIRST_SLUG)
    short_links.change("Provider:" + provider, SLUG)
    frappe.set_user("Administrator")
    frappe.db.commit()
    return {"provider": provider, "slug": SLUG}


def browser_values(manifest=None):
    state = _state()
    provider = (state.get("providers") or [""])[0]
    services = {name: frappe.db.get_value("Service", {"independent_provider": provider, "service_name": name}, "name") or ""
                for name, *_ in SERVICES} if provider else {}
    online_offering = ""
    if services.get(SERVICES[1][0]):
        online_offering = frappe.db.get_value("EventType", {"service": services[SERVICES[1][0]]}, "name") or ""
    return {
        "qa_provider_slug": SLUG,
        "qa_provider_former_slug": FIRST_SLUG,
        "qa_provider_name": "Rahel Girma",
        "qa_provider_business": BUSINESS,
        "qa_provider_both_service": services.get(SERVICES[0][0], ""),
        "qa_provider_online_service": services.get(SERVICES[1][0], ""),
        "qa_provider_office_service": services.get(SERVICES[2][0], ""),
        "qa_provider_online_offering": online_offering,
        "qa_provider_client": "Liya Haile",
        "qa_provider_client_email": "liya.haile@example.test",
    }


def cleanup():
    frappe.set_user("Administrator")
    state = _state()
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        for provider in state.get("providers") or []:
            _remove_business(provider)
            _delete_one("Provider", provider)
        for user in state.get("users") or []:
            _delete_where("Provider", "user", user)
            _delete_one("User", user)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()


# ---------------------------------------------------------------------------
# Building
# ---------------------------------------------------------------------------
def _shape(provider, first_offering):
    """Office address, the online room, the three services and the provider's profile."""
    from appointment.scheduler.booking import offering

    event = frappe.get_doc("EventType", first_offering)
    office = frappe.get_doc("Location", event.location)
    office.update({"address_line_1": "Nigist Towers, fourth floor, room 407", "address_line_2": "Kazanchis",
                   "city": "Addis Ababa", "timezone": TZ})
    office.save(ignore_permissions=True)
    online = frappe.get_doc({"doctype": "Location", "location_name": ONLINE, "independent_provider": provider, "timezone": TZ,
                             "is_active": 1, "location_type": "Online", "video_platform": "Zoom", "meeting_link_mode": "Per booking",
                             "opening_hours": [{"day_of_week": day, "is_open": int(day in OPEN_DAYS), "start_time": "07:30",
                                                "end_time": "19:30"} for day in DAYS]}).insert(ignore_permissions=True)
    places = {"in_person": office.name, "online": online.name}
    for name, duration, price, formats, description in SERVICES:
        if name == SERVICES[0][0]:
            service = frappe.get_doc("Service", event.service)
            service.update({"price": price, "description": description})
            service.save(ignore_permissions=True)
        else:
            service = frappe.get_doc({"doctype": "Service", "service_name": name, "independent_provider": provider,
                                      "duration": duration, "price": price, "description": description,
                                      "use_default_hours": 1, "is_active": 1}).insert(ignore_permissions=True)
        for meet in formats:
            if service.name == event.service and meet == "in_person":
                continue  # the first offering, made by `independent.create`
            created = frappe.get_doc({"doctype": "EventType", "event_type_name": f"{name} ({meet.replace('_', ' ')})",
                                      "service": service.name, "location": places[meet], "provider": provider,
                                      "is_active": 1}).insert(ignore_permissions=True)
            offering(created.name)
    doc = frappe.get_doc("Provider", provider)
    doc.update({"full_name": "Rahel Girma", "display_name": "Rahel Girma", "bio": BIO, "profile_photo": PHOTO,
                "spoken_languages": json.dumps(["am", "en", "om"]), "timezone": TZ})
    doc.save(ignore_permissions=True)


# ---------------------------------------------------------------------------
# Cleanup helpers: one exact value each
# ---------------------------------------------------------------------------
def _remove_business(provider):
    _require(provider)
    for name in frappe.get_all("Appointment", filters={"provider": provider}, pluck="name"):
        _delete_where("Appointment Notification", "appointment", name)
        _delete_one("Appointment", name)
    for service in frappe.get_all("Service", filters={"independent_provider": provider}, pluck="name"):
        _delete_where("EventType", "service", service)
        _delete_one("Service", service)
    for doctype in ("Customer Profile", "Location"):
        _delete_where(doctype, "independent_provider", provider)


def _delete_where(doctype, field, value):
    _require(value)
    for name in frappe.get_all(doctype, filters={field: value}, pluck="name"):
        _delete_one(doctype, name)


def _delete_one(doctype, name):
    _require(name)
    if frappe.db.exists(doctype, name):
        frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)


def _require(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Refusing a cleanup filter without one exact value.")


def _state():
    # Read the row itself: the defaults cache can still hold the value from before the last setup.
    return json.loads(frappe.db.get_value("DefaultValue", {"parent": "__default", "defkey": STATE_KEY}, "defvalue") or "{}")


def _save(state):
    frappe.db.set_default(STATE_KEY, json.dumps(state))
