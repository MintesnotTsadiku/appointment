"""Location settings: an owner lists, adds, edits and removes the places of the businesses they manage.

The owners are the organizations the user manages and the user's own independent business. A place is
in person (a street address) or online (a video platform and a meeting link policy, see `online_meeting`).
An independent owner can offer existing sessions at a new place in the same step: each chosen session gets
an offering (EventType) at that place, so customers can book it there.
"""

import frappe
import pytz
from frappe import _
from appointment.scheduler import business_owner, membership, online_meeting

DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
DEFAULT_DAYS = DAYS[:5]
DEFAULT_HOURS = ("08:30:00", "18:00:00")
NAME_LIMIT = 100
TEXT_LIMIT = 140


# ---------------------------------------------------------------------------
# Owners
# ---------------------------------------------------------------------------
def _independent(user):
    from appointment.scheduler.booking_access import providers

    return [name for name in providers(user)
            if not frappe.db.get_value("Provider", name, "organization")
            and not frappe.db.exists("Provider Organization", {"parent": name, "parenttype": "Provider"})]


def owners(user=None):
    """The businesses whose places this user may manage, as owner keys with labels."""
    user = user or frappe.session.user
    rows = [{"key": name, "kind": "organization", "label": frappe.db.get_value("Organization", name, "organization_name") or name}
            for name in membership.manager_organizations(user)]
    rows += [{"key": business_owner.PREFIX + name, "kind": "provider",
              "label": frappe.db.get_value("Provider", name, "provider_name") or name} for name in _independent(user)]
    return rows


def _require_owner(key):
    if key not in {row["key"] for row in owners()}:
        frappe.throw(_("You cannot manage the places of this business."), frappe.PermissionError)
    return business_owner.from_key(key)


def _owner_filters(owner):
    if owner.organization:
        return {"organization": owner.organization}
    return {"independent_provider": owner.provider, "organization": ["is", "not set"]}


def _owner_key(location):
    if location.organization:
        return location.organization
    return business_owner.PREFIX + location.independent_provider if location.independent_provider else None


def _require_location(name):
    location = frappe.get_doc("Location", name)
    _require_owner(_owner_key(location))
    return location


# ---------------------------------------------------------------------------
# APIs
# ---------------------------------------------------------------------------
@frappe.whitelist()
def overview():
    """The user's businesses and their places. Owners see the private fixed link of their own places."""
    rows = owners()
    locations = []
    for row in rows:
        owner = business_owner.from_key(row["key"])
        for location in frappe.get_all("Location", filters=_owner_filters(owner), order_by="creation asc",
                                       fields=["name", "location_name", "address_line_1", "address_line_2", "city", "phone",
                                               "timezone", "is_active", "location_type", "video_platform",
                                               "meeting_link_mode", "meeting_link"]):
            locations.append(_view(location, row))
    return {"owners": rows, "locations": locations, "platforms": list(online_meeting.PLATFORMS),
            "sessions": _sessions(rows)}


@frappe.whitelist(methods=["POST"])
def save(owner, location_name, location_type=online_meeting.IN_PERSON, location=None, address_line_1="",
         address_line_2="", city="", phone="", timezone="Africa/Addis_Ababa", video_platform="",
         meeting_link_mode=online_meeting.FIXED, meeting_link="", sessions=None):
    """Create a place for `owner`, or update `location`. Independent owners may offer chosen sessions there."""
    business = _require_owner(owner)
    name = " ".join((location_name or "").split())
    if not 2 <= len(name) <= NAME_LIMIT:
        frappe.throw(_("Enter a place name of 2 to {0} characters.").format(NAME_LIMIT))
    if timezone not in pytz.all_timezones:
        frappe.throw(_("Choose a valid time zone."))
    texts = {"address_line_1": address_line_1, "address_line_2": address_line_2, "city": city, "phone": phone}
    if any(not isinstance(value, str) or len(value) > TEXT_LIMIT for value in texts.values()):
        frappe.throw(_("Enter address and phone values of at most {0} characters.").format(TEXT_LIMIT))
    online = location_type == online_meeting.ONLINE
    if location_type not in (online_meeting.IN_PERSON, online_meeting.ONLINE):
        frappe.throw(_("Choose In person or Online."))
    if not online and len(address_line_1.strip()) < 3:
        frappe.throw(_("Enter the street address of this place."))
    doc = _require_location(location) if location else None
    if doc and _owner_key(doc) != business.key:
        frappe.throw(_("You cannot manage the places of this business."), frappe.PermissionError)
    clash = frappe.db.get_value("Location", {"location_name": name}, "name")
    if clash and (not doc or clash != doc.name):
        frappe.throw(_("A place with this name already exists. Choose another name."))
    values = {key: value.strip() for key, value in texts.items()}
    values.update(location_name=name, timezone=timezone, location_type=location_type,
                  video_platform=video_platform if online else "", meeting_link_mode=meeting_link_mode if online else online_meeting.FIXED,
                  meeting_link=meeting_link if online else "")
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        if doc:
            doc.update(values)
            doc.save(ignore_permissions=True)
        else:
            doc = frappe.get_doc({"doctype": "Location", "is_active": 1, **values, **business_owner.record_fields(business),
                                  "opening_hours": _first_hours(business)})
            doc.insert(ignore_permissions=True)
        _offer_sessions(business, doc, sessions)
    finally:
        frappe.flags.syncing_booking_urls = previous
    return _view(doc, {"key": business.key})


@frappe.whitelist(methods=["POST"])
def remove(location):
    """Remove a place that no active offering uses."""
    doc = _require_location(location)
    if frappe.db.exists("EventType", {"location": doc.name, "is_active": 1}):
        frappe.throw(_("This place has active sessions. Move or turn off those sessions first."))
    if frappe.db.exists("Appointment", {"location": doc.name, "status": ["in", ["Pending", "Confirmed"]]}):
        frappe.throw(_("This place has open bookings. It cannot be removed."))
    frappe.delete_doc("Location", doc.name, ignore_permissions=True)
    return {"removed": doc.name}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _view(location, owner_row):
    address = ", ".join(part for part in (location.address_line_1, location.address_line_2, location.city) if part)
    hours = frappe.db.count("Opening Hours", {"parent": location.name, "parenttype": "Location", "is_open": 1})
    online = online_meeting.is_online(location)
    return {
        "name": location.name, "owner": owner_row["key"], "location_name": location.location_name,
        "location_type": location.get("location_type") or online_meeting.IN_PERSON,
        "address": "" if online else address, "address_line_1": location.address_line_1 or "",
        "address_line_2": location.address_line_2 or "", "city": location.city or "", "phone": location.phone or "",
        "timezone": location.timezone, "video_platform": location.get("video_platform") or "",
        "meeting_link_mode": location.get("meeting_link_mode") or online_meeting.FIXED,
        # The owner's own private link, shown only in their settings.
        "meeting_link": location.get("meeting_link") or "",
        "opening_hours_count": hours, "has_opening_hours": bool(hours),
        "sessions": frappe.get_all("EventType", filters={"location": location.name, "is_active": 1}, pluck="service"),
    }


def _sessions(rows):
    """Independent owners' sessions, so a new place can offer them."""
    found = []
    for row in rows:
        if row["kind"] != "provider":
            continue
        provider = row["key"].removeprefix(business_owner.PREFIX)
        for service in frappe.get_all("Service", filters={"independent_provider": provider, "organization": ["is", "not set"], "is_active": 1},
                                      fields=["name", "service_name"], order_by="creation asc"):
            found.append({"owner": row["key"], "name": service.name, "service_name": service.service_name})
    return found


def _first_hours(owner):
    """A new place opens like the owner's first place, else Monday to Friday 08:30 to 18:00."""
    first = frappe.get_all("Location", filters=_owner_filters(owner), pluck="name", order_by="creation asc", limit=1)
    rows = frappe.get_doc("Location", first[0]).opening_hours if first else []
    if rows:
        return [{"day_of_week": row.day_of_week, "is_open": row.is_open, "start_time": row.start_time, "end_time": row.end_time} for row in rows]
    return [{"day_of_week": day, "is_open": int(day in DEFAULT_DAYS), "start_time": DEFAULT_HOURS[0], "end_time": DEFAULT_HOURS[1]} for day in DAYS]


def _offer_sessions(owner, location, sessions):
    """Independent owners: one offering per chosen session at this place."""
    chosen = frappe.parse_json(sessions) if isinstance(sessions, str) else (sessions or [])
    if not chosen:
        return
    if not owner.provider or not isinstance(chosen, list) or len(chosen) > 50:
        frappe.throw(_("Choose sessions of your own independent business."))
    allowed = set(owner.services or [])
    for service in chosen:
        if service not in allowed:
            frappe.throw(_("Choose sessions of your own independent business."), frappe.PermissionError)
        if frappe.db.exists("EventType", {"service": service, "location": location.name, "provider": owner.provider}):
            continue
        service_name = frappe.db.get_value("Service", service, "service_name")
        frappe.get_doc({"doctype": "EventType", "event_type_name": f"{service_name} · {location.location_name}"[:140],
                        "service": service, "location": location.name, "provider": owner.provider,
                        "is_active": 1}).insert(ignore_permissions=True)
