"""QA fixtures for the Ergata Therapy template (`qa/manifests/growth/template-ergata*.yaml`).

The showcase is Yared Tesfaye Counselling, an independent counselling psychologist (owner
yared.tesfaye.counselling@example.test) who meets clients in an office in Bole and over online video: two
Location records (the Bole office and an Online location with a fixed Google Meet link), six offerings, and a
published Ergata website at `/yared-counselling` in English and Amharic. Its definition is shared with the
seeder: `appointment/demo/ergata_showcase.py`.

`setup()` uses the seeded showcase when the site has one (`appointment.demo.showcase.seed`), and otherwise
makes its own copy from the same definition. Either way it then records, by exact name:

- two online bookings for the manage page and the reception desk (one with its join window open now);
- Hiwot Family Therapy Centre: a small group practice (organization, owner hiwot.family.therapy@example.test)
  with no website yet, so its owner sees the template chooser.

The people, places and credentials are fictional. `cleanup()` deletes only what this module made: every
delete uses one exact name or one exact single-value filter, and it does nothing when the record is empty.
With the seeded showcase it never deletes a record of the seeder journal; it deletes only the fixture
bookings and what the QA runs added to the showcase after `setup()` (bookings, customer profiles, locations
and their offerings).
"""

import json
import secrets

import frappe

from appointment.demo import ergata_showcase, independent_showcase, independent_world, showcase

SHOWCASE = ergata_showcase.SHOWCASE
STATE_KEY = "appointment_template_ergata_qa"
SOLO = SHOWCASE.owner_email
PRACTICE_OWNER = "hiwot.family.therapy@example.test"
BUSINESS = SHOWCASE.business
PRACTICE = "Hiwot Family Therapy Centre"
SLUG = SHOWCASE.slug
TZ = SHOWCASE.timezone
DAYS = independent_showcase.DAYS
OPEN_DAYS = list(SHOWCASE.open_days)
ASSETS = ergata_showcase.ASSETS
PHONE = SHOWCASE.phone
OFFICE = SHOWCASE.office.name
ONLINE = SHOWCASE.online.name
OFFICE_ADDRESS = ergata_showcase.OFFICE_ADDRESS
MEETING_LINK = ergata_showcase.MEETING_LINK
PLATFORM = ergata_showcase.PLATFORM
SESSIONS = SHOWCASE.sessions
QA_CLIENT = "Selamawit Bekele"
QA_CLIENT_EMAIL = "selamawit.bekele@example.test"


def setup():
    frappe.set_user("Administrator")
    cleanup()
    seeded = independent_world.seeded(SHOWCASE.key)
    state = {"users": [], "providers": [], "organizations": [], "sites": [], "bookings": [],
             "reused": seeded["provider"] if seeded else None, "since": frappe.utils.now()}
    _save(state)  # Recorded first, so a failed setup can still be cleaned.
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        services = seeded["services"] if seeded else _solo_practice(state)
        _bookings(state, services)
        _group_practice(state)
    finally:
        frappe.flags.syncing_booking_urls = previous
        frappe.set_user("Administrator")
        _save(state)
    frappe.db.commit()
    site = seeded["public_site"] if seeded else (state.get("sites") or [None])[0]
    return {"slug": SLUG, "site": site, "seeded": bool(seeded), "practice": (state.get("organizations") or [None])[0]}


def browser_values(manifest=None):
    values = showcase.browser_values(manifest) if showcase.state_path().exists() else {}
    state = _state()
    values["qa_ergata_slug"] = SLUG
    values["qa_ergata_owner"] = SOLO
    values["qa_ergata_practice_owner"] = PRACTICE_OWNER
    values["qa_ergata_practice"] = (state.get("organizations") or [""])[0]
    join = state.get("join_booking")
    if join and frappe.db.exists("Appointment", join):
        from appointment.scheduler import self_service

        doc = frappe.get_doc("Appointment", join)
        values["qa_online_manage_path"] = self_service.manage_url(doc).replace(frappe.utils.get_url(), "")
        values["qa_online_booking"] = join
        values["qa_online_client"] = QA_CLIENT
    desk = state.get("desk_booking")
    if desk and frappe.db.exists("Appointment", desk):
        values["qa_online_desk_booking"] = desk
        values["qa_online_desk_date"] = str(frappe.db.get_value("Appointment", desk, "appointment_date"))
    provider = _provider(state)
    if provider:
        values["qa_online_intro_service"] = frappe.db.get_value(
            "Service", {"independent_provider": provider, "service_name": SESSIONS[0].name}, "name") or ""
    # The owner adds one more online room in `online-location.yaml`; each run takes a free name.
    values["qa_online_new_location"] = next(
        (name for name in ("Evening video room", "Weekend video room", "Morning video room", "Second video room")
         if not frappe.db.exists("Location", {"location_name": name})), "Late video room")
    return values


def _provider(state):
    return state.get("reused") or (state.get("providers") or [""])[0]


def _user(state, email, first, last):
    frappe.get_doc(dict(doctype="User", email=email, first_name=first, last_name=last, send_welcome_email=0, enabled=1,
                        user_type="System User", time_zone=TZ, roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
    state["users"].append(email)
    _save(state)


def _solo_practice(state):
    """The fixture's own copy of the showcase, from the shared definition. Returns its services by name."""
    _user(state, SOLO, *SHOWCASE.owner_name)
    lists = {"Provider": "providers", "Public Site": "sites"}

    def record(doctype, name):
        if doctype in lists and name not in state[lists[doctype]]:
            state[lists[doctype]].append(name)
            _save(state)

    return independent_showcase.build(SHOWCASE, record)["services"]


def _bookings(state, services):
    state["join_booking"] = _join_ready_booking(services["Individual session online"])
    state["bookings"].append(state["join_booking"])
    _save(state)
    state["desk_booking"] = _online_booking(services["First session online"], "Dawit Mengistu", "dawit.mengistu@example.test")
    state["bookings"].append(state["desk_booking"])
    _save(state)


def _online_booking(service, client, email):
    """An online booking at the first free time from tomorrow, through the normal booking lifecycle."""
    from datetime import datetime, timedelta

    import pytz

    from appointment.scheduler import booking

    event = frappe.get_all("EventType", filters={"service": service}, pluck="name", order_by="creation asc", limit=1)[0]
    parts = booking.offering(event, public=True)
    today = datetime.now(pytz.timezone(TZ)).date()
    slot = next(row for offset in range(1, 15)
                for row in booking.open_slots(parts, today + timedelta(days=offset))["all_available_slots_for_data"] if row["available"])
    result = booking.book(event, slot["start_time"], slot["end_time"], client, email,
                          "ergata-online-" + secrets.token_hex(8), user_phone="+251911000106", language="en")
    return frappe.db.get_value("Appointment", {"appointment_id": result["booking_id"]}, "name")


def _join_ready_booking(service):
    """One online booking whose join window is open now, for the manage page.

    It is booked through the normal lifecycle at the first free time, then its times move to now, because the
    booking rules refuse a start in the past. Only this QA fixture does that.
    """
    from datetime import datetime, timedelta

    import pytz

    name = _online_booking(service, QA_CLIENT, QA_CLIENT_EMAIL)
    zone = pytz.timezone(TZ)
    start = datetime.now(pytz.UTC).replace(second=0, microsecond=0) - timedelta(minutes=5)
    end = start + timedelta(minutes=50)
    local_start, local_end = start.astimezone(zone), end.astimezone(zone)
    naive = lambda value: value.replace(tzinfo=None)  # noqa: E731
    frappe.db.set_value("Appointment", name, {
        "starts_at": naive(start), "ends_at": naive(end), "occupied_from": naive(start), "occupied_until": naive(end),
        "appointment_date": local_start.date(), "start_time": local_start.strftime("%H:%M:%S"), "end_time": local_end.strftime("%H:%M:%S"),
    }, update_modified=False)
    return name


def _group_practice(state):
    from appointment.scheduler import workspace

    _user(state, PRACTICE_OWNER, "Hiwot", "Alemayehu")
    frappe.set_user(PRACTICE_OWNER)
    row = workspace.create(PRACTICE, f"{PRACTICE}, Sarbet", "Family therapy session", TZ, 60, "09:00", "18:00",
                           OPEN_DAYS, "template-ergata-" + secrets.token_hex(8))
    frappe.set_user("Administrator")
    state["organizations"].append(row["organization"])
    _save(state)


def cleanup():
    """Delete what `setup` recorded. Nothing is filtered by a list or an empty value."""
    frappe.set_user("Administrator")
    state = _state()
    if not any(state.get(key) for key in ("users", "providers", "organizations", "sites", "bookings", "reused")):
        return
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        for name in state.get("bookings") or []:
            _delete_booking(name)
        if state.get("reused"):
            _remove_qa_additions(state["reused"], state.get("since"))
        for site in state.get("sites") or []:
            _remove_site(site)
        for provider in state.get("providers") or []:
            _remove_business("independent_provider", provider, provider=provider)
            _delete_one("Provider", provider)
        for organization in state.get("organizations") or []:
            _remove_business("organization", organization)
            _delete_where("Business Membership", "organization", organization)
            for name in frappe.get_all("Provider Organization", filters={"organization": organization, "parenttype": "Provider"}, pluck="parent"):
                _delete_one("Provider", name)
            _delete_one("Organization", organization)
        for user in state.get("users") or []:
            _delete_where("Provider", "user", user)
            _delete_where("Business Membership", "user", user)
            _delete_one("User", user)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()


def _delete_booking(name):
    _require(name)
    _delete_where("Appointment Notification", "appointment", name)
    _delete_one("Appointment", name)


def _remove_qa_additions(provider, since):
    """What the QA runs added to the seeded showcase after `setup()`. Seeder-owned records always stay."""
    _require(provider)
    _require(since)
    seeded = independent_world.seeded(SHOWCASE.key)
    if not seeded or seeded["provider"] != provider:
        return
    owned = {tuple(entry) for entry in seeded["created"]}

    def added(doctype, field, value):
        _require(value)
        names = frappe.get_all(doctype, filters={field: value, "creation": [">=", since]}, pluck="name")
        return [name for name in names if (doctype, name) not in owned]

    for name in added("Appointment", "provider", provider):
        _delete_booking(name)
    for name in added("Customer Profile", "independent_provider", provider):
        _delete_one("Customer Profile", name)
    for location in added("Location", "independent_provider", provider):
        for event in added("EventType", "location", location):
            _delete_one("EventType", event)
        _delete_one("Location", location)
    for event in added("EventType", "provider", provider):
        _delete_one("EventType", event)
    for service in added("Service", "independent_provider", provider):
        _delete_one("Service", service)


def _remove_site(site):
    _require(site)
    if not frappe.db.exists("Public Site", site):
        return
    profile = frappe.db.get_value("Public Site", site, "brand_profile")
    _delete_where("Public Site Slug Alias", "public_site", site)
    frappe.db.set_value("Public Site", site, "current_release", None, update_modified=False)
    for doctype in ("Published Content Release", "Experience Release"):
        if frappe.db.exists("DocType", doctype):
            for name in frappe.get_all(doctype, filters={"public_site": site}, pluck="name"):
                frappe.db.delete(doctype, {"name": name})
    for outbox in frappe.get_all("Public Experience Outbox", filters={"idempotency_key": ["like", f"publish:{site}:%"]}, pluck="name"):
        _delete_one("Public Experience Outbox", outbox)
    _delete_one("Public Site", site)
    if profile:
        frappe.db.set_value("Brand Profile", profile, "active_revision", None, update_modified=False)
        for revision in frappe.get_all("Brand Revision", filters={"brand_profile": profile}, pluck="name"):
            frappe.db.delete("Brand Revision", {"name": revision})
        _delete_one("Brand Profile", profile)


def _remove_business(field, value, provider=None):
    _require(value)
    bookings = frappe.get_all("Appointment", filters={"provider": provider} if provider else {"organization": value}, pluck="name")
    for name in bookings:
        _delete_where("Appointment Notification", "appointment", name)
        _delete_one("Appointment", name)
    for service in frappe.get_all("Service", filters={field: value}, pluck="name"):
        _delete_where("EventType", "service", service)
        _delete_one("Service", service)
    for doctype in ("Customer Profile", "Location"):
        _delete_where(doctype, field, value)


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
