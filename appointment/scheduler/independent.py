"""Exclusive provider businesses use the same booking transaction and capacity rules."""

import frappe
import pytz
from frappe.utils import cint, get_time

from appointment.scheduler import booking_access

_SETUP = object()
DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


def require_owner(provider):
    doc = frappe.get_doc("Provider", provider)
    if (frappe.session.user == "Guest" or doc.user != frappe.session.user
            or not doc.is_active or doc.organization or doc.organizations
            or not frappe.db.get_value("User", doc.user, "enabled")):
        frappe.throw("Only this independent business owner may change its booking setup.", frappe.PermissionError)
    return doc


def matches(service, location, provider):
    return bool(not service.organization and not location.organization
                and service.independent_provider == provider.name
                and location.independent_provider == provider.name
                and not provider.organization and not provider.organizations)


def config_provider(doc):
    if doc.doctype == "EventType":
        return frappe.db.get_value("Service", doc.service, "independent_provider")
    return doc.get("independent_provider")


def permits(doc, user):
    provider = config_provider(doc)
    if doc.doctype == "EventType" and provider:
        if not matches(frappe.get_doc("Service", doc.service), frappe.get_doc("Location", doc.location), frappe.get_doc("Provider", doc.provider)):
            return False
    return bool(provider and not booking_access.config_organization(doc)
                and provider in booking_access.providers(user)
                and not frappe.db.get_value("Provider", provider, "organization")
                and not frappe.db.exists("Provider Organization", {"parent": provider, "parenttype": "Provider"}))


def validate(doc):
    if doc.doctype == "Provider" and not doc.is_new() and (doc.organization or doc.organizations):
        if frappe.db.exists("Service", {"independent_provider": doc.name}):
            frappe.throw("Keep this independent business separate. Use another provider record for organization membership.", frappe.PermissionError)
    if doc.doctype not in ("Service", "Location", "EventType"):
        return
    provider = config_provider(doc)
    old = doc.get_doc_before_save()
    if old and config_provider(old) and config_provider(old) != provider:
        frappe.throw("The independent business owner cannot be changed.", frappe.PermissionError)
    if not provider:
        return
    if booking_access.config_organization(doc):
        frappe.throw("An offering must have exactly one business owner.", frappe.PermissionError)
    old = doc.get_doc_before_save()
    if old and (config_provider(old) != provider or booking_access.config_organization(old)):
        frappe.throw("The independent business owner cannot be changed.", frappe.PermissionError)
    if doc.doctype == "EventType":
        service = frappe.get_doc("Service", doc.service)
        location = frappe.get_doc("Location", doc.location)
        owner = frappe.get_doc("Provider", doc.provider)
        if not matches(service, location, owner):
            frappe.throw("Offering links must belong to the same independent business.", frappe.PermissionError)


def overview(provider):
    owner = require_owner(provider)
    services = frappe.get_all("Service", filters={"independent_provider": owner.name, "organization": ["is", "not set"]}, pluck="name")
    return [{"offering": row.name, "service": frappe.db.get_value("Service", row.service, "service_name"),
             "business_name": owner.provider_name, "published": bool(owner.enable_public_booking),
             "public_path": "/schedule/individual/" + row.name}
            for row in frappe.get_all("EventType", filters={"provider": owner.name, "service": ["in", services or [""]]}, fields=["name", "service"])]


@frappe.whitelist()
def workspace():
    owners = [name for name in booking_access.providers() if not frappe.db.get_value("Provider", name, "organization")
              and not frappe.db.exists("Provider Organization", {"parent": name, "parenttype": "Provider"})]
    if len(owners) != 1:
        frappe.throw("Choose one independent business.", frappe.PermissionError)
    return {"provider": owners[0], "offerings": overview(owners[0])}


@frappe.whitelist(methods=["POST"])
def create(provider, location_name, service_name, timezone, duration, opens_at, closes_at, weekdays):
    from appointment.scheduler.booking import lock_provider, offering

    owner = require_owner(provider)
    if timezone not in pytz.all_timezones or not 5 <= cint(duration) <= 480:
        frappe.throw("Choose a valid time zone and a duration between 5 and 480 minutes.")
    days = frappe.parse_json(weekdays) if isinstance(weekdays, str) else weekdays
    if not isinstance(days, list) or not days or any(day not in DAYS for day in days) or get_time(opens_at) >= get_time(closes_at):
        frappe.throw("Choose operating days and a closing time after opening time.")
    if any(not isinstance(value, str) or not value.strip() or len(value) > 100 for value in (location_name, service_name)):
        frappe.throw("Enter location and service names of at most 100 characters.")
    lock_provider(owner)
    existing = overview(owner.name)
    if existing:
        frappe.throw("Your first offering already exists. Review it before creating another.")
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        location = frappe.get_doc({"doctype": "Location", "location_name": location_name.strip(),
            "independent_provider": owner.name, "timezone": timezone, "is_active": 1,
            "opening_hours": [{"day_of_week": day, "is_open": int(day in days), "start_time": opens_at, "end_time": closes_at} for day in DAYS]})
        service = frappe.get_doc({"doctype": "Service", "service_name": service_name.strip(),
            "independent_provider": owner.name, "duration": cint(duration), "use_default_hours": 1, "is_active": 1})
        for doc in (location, service):
            doc.flags.independent_setup = _SETUP
            doc.insert(ignore_permissions=True)
        event = frappe.get_doc({"doctype": "EventType", "event_type_name": service_name.strip(),
            "service": service.name, "location": location.name, "provider": owner.name, "is_active": 1})
        event.flags.independent_setup = _SETUP
        event.insert(ignore_permissions=True)
        offering(event.name)
        return overview(owner.name)[0]
    finally:
        frappe.flags.syncing_booking_urls = previous


@frappe.whitelist(methods=["POST"])
def publish(provider, published):
    from appointment.onboarding import _ONBOARDING_UPDATE
    from appointment.scheduler.booking import lock_provider, offering

    owner = require_owner(provider)
    lock_provider(owner)
    if str(published) not in {"0", "1"}:
        frappe.throw("Choose a valid publication state.")
    rows = overview(owner.name)
    if cint(published) and not rows:
        frappe.throw("Create an offering before publishing.")
    for row in rows:
        offering(row["offering"])
    owner.enable_public_booking = cint(published)
    owner.flags.onboarding_update = _ONBOARDING_UPDATE
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        owner.save(ignore_permissions=True)
    finally:
        frappe.flags.syncing_booking_urls = previous
    return overview(owner.name)


@frappe.whitelist(allow_guest=True)
def public_offering(offering_id):
    from appointment.scheduler.booking import offering

    event, service, location, provider, business = offering(offering_id, public=True)
    if business.doctype != "Provider":
        frappe.throw("Choose an independent offering.", frappe.PermissionError)
    return {"offering": event.name, "business_name": provider.provider_name, "service": service.service_name,
            "duration": int(event.duration_override or service.duration), "timezone": location.timezone}
