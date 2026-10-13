"""Online locations: how a place meets, and the private meeting link of each booking.

A Location is "In person" (the default) or "Online". An online location names its video platform
(free text, for example Google Meet or Zoom) and has a meeting link policy:

- "Fixed link": one https link for the location. Each new booking copies it.
- "Per booking": staff set a link on each booking after it is made.

A booking at an online location is online (`Appointment.is_online`, set when the booking is made) and keeps
its own `meeting_link`. Staff of the business that owns the booking can set or change it (`set_link`).

The meeting link is private. Public APIs and public pages get only `location_type` and the platform label
(`public_place`). The link goes only to the booked customer: confirmation, reminder and "meeting link" emails
and SMS, the manage page behind the signed token, and My bookings behind the emailed sign-in.
See docs/growth/ONLINE_LOCATIONS.md.
"""

from datetime import timedelta
from urllib.parse import urlsplit

import frappe
from frappe import _
from frappe.utils import cint, get_datetime

from appointment.scheduler.booking_access import require_access

IN_PERSON = "In person"
ONLINE = "Online"
FIXED = "Fixed link"
PER_BOOKING = "Per booking"
# Suggestions only; the platform is free text.
PLATFORMS = ("Google Meet", "Zoom", "Microsoft Teams", "Jitsi", "WhatsApp video", "Telegram video", "Phone")
PLATFORM_LIMIT = 60
LINK_LIMIT = 500
JOIN_LEAD_MINUTES = 15
OPEN = ("Pending", "Confirmed")


# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------
def is_online(location):
    return bool(location) and (location.get("location_type") or IN_PERSON) == ONLINE


def clean_link(value):
    """The link without spaces around it, or "" when empty. Only absolute https links are accepted."""
    link = (value or "").strip()
    if not link:
        return ""
    try:
        parts = urlsplit(link)
        host = parts.hostname or ""
    except ValueError:
        parts, host = None, ""
    if (
        not parts
        or len(link) > LINK_LIMIT
        or parts.scheme != "https"
        or "." not in host
        or parts.username
        or parts.password
        or any(character.isspace() or ord(character) < 32 for character in link)
    ):
        frappe.throw(_("Enter a meeting link that starts with https://"), title=_("Meeting link"))
    return link


def validate_location(doc):
    """Location.validate: the type, the platform label and the link policy."""
    doc.location_type = doc.get("location_type") or IN_PERSON
    if doc.location_type not in (IN_PERSON, ONLINE):
        frappe.throw(_("Choose In person or Online."))
    if doc.location_type == IN_PERSON:
        doc.video_platform, doc.meeting_link, doc.meeting_link_mode = "", "", FIXED
        return
    doc.video_platform = " ".join((doc.get("video_platform") or "").split())
    if len(doc.video_platform) > PLATFORM_LIMIT:
        frappe.throw(_("Enter a video platform name of at most {0} characters.").format(PLATFORM_LIMIT))
    doc.meeting_link_mode = doc.get("meeting_link_mode") or FIXED
    if doc.meeting_link_mode not in (FIXED, PER_BOOKING):
        frappe.throw(_("Choose a fixed meeting link or a link per booking."))
    if doc.meeting_link_mode == PER_BOOKING:
        doc.meeting_link = ""
        return
    doc.meeting_link = clean_link(doc.get("meeting_link"))
    if not doc.meeting_link:
        frappe.throw(_("Enter the fixed meeting link, or choose a link per booking."))


def apply_to_booking(doc, location, old):
    """Appointment.validate: `is_online` comes from the location when the booking is made, then stays."""
    doc.is_online = cint(old.get("is_online")) if old else int(is_online(location))
    if not doc.is_online:
        doc.meeting_link = ""
        return
    doc.meeting_link = clean_link(doc.get("meeting_link"))
    if not old and not doc.meeting_link and location.get("meeting_link_mode") != PER_BOOKING:
        doc.meeting_link = location.get("meeting_link") or ""


def join_opens_at(starts_at):
    return get_datetime(starts_at) - timedelta(minutes=JOIN_LEAD_MINUTES)


# ---------------------------------------------------------------------------
# Projections
# ---------------------------------------------------------------------------
def public_place(location):
    """What a public page may know about a place: its type and platform label. Never the link."""
    online = is_online(location)
    return {"location_type": "online" if online else "in_person",
            "platform": (location.get("video_platform") or "") if online else ""}


def location_facts(name):
    return frappe.db.get_value("Location", name, ["location_type", "video_platform", "meeting_link_mode"], as_dict=True) or {}


def customer_view(doc):
    """The booked customer's view of the session: only for their own booking, behind a token or sign-in."""
    if not cint(doc.get("is_online")):
        return None
    place = location_facts(doc.location)
    return {
        "platform": place.get("video_platform") or "",
        "meeting_link": doc.get("meeting_link") or None,
        "join_opens_at": join_opens_at(doc.starts_at).isoformat() + "Z",
        "ends_at": get_datetime(doc.ends_at).isoformat() + "Z",
        "join_lead_minutes": JOIN_LEAD_MINUTES,
    }


# ---------------------------------------------------------------------------
# Staff APIs
# ---------------------------------------------------------------------------
@frappe.whitelist()
def for_booking(booking):
    """The meeting link section of a booking, for staff of the business that owns it."""
    doc = frappe.get_doc("Appointment", booking)
    require_access(doc)
    return _staff_view(doc)


@frappe.whitelist(methods=["POST"])
def set_link(booking, meeting_link, expected_modified):
    """Set or change the meeting link of one online booking. The customer gets it by email and SMS."""
    from appointment.scheduler.booking import lock_offering, offering
    from appointment.scheduler.notifications import status_of

    doc = frappe.get_doc("Appointment", booking)
    require_access(doc)
    lock_offering(offering(doc.event_type, require_active=False))
    doc.reload()
    require_access(doc)
    if str(doc.modified) != str(expected_modified):
        frappe.throw(_("This booking changed. Reload before editing."), frappe.TimestampMismatchError)
    if not cint(doc.is_online):
        frappe.throw(_("Only an online booking has a meeting link."))
    if doc.status not in OPEN:
        frappe.throw(_("Only pending or confirmed bookings can be changed."))
    link = clean_link(meeting_link)
    if not link:
        frappe.throw(_("Enter a meeting link that starts with https://"), title=_("Meeting link"))
    doc.meeting_link = link
    doc.save(ignore_permissions=True)
    return {**_staff_view(doc), "notification_status": status_of(doc)}


def _staff_view(doc):
    place = location_facts(doc.location)
    return {
        "is_online": bool(cint(doc.get("is_online"))),
        "platform": place.get("video_platform") or "",
        "mode": place.get("meeting_link_mode") or FIXED,
        "meeting_link": doc.get("meeting_link") or "",
        "can_change": bool(cint(doc.get("is_online"))) and doc.status in OPEN,
        "modified": str(doc.modified),
    }
