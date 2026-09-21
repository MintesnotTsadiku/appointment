"""Phase 3 scenario bootstrap (clearly labelled backend provisioning).

The individual onboarding wizard is blocked at the availability step (HTTP 500),
so the customer booking and provider schedule journeys cannot be reached through
the wizard. This probe provisions a *solo-equivalent* scenario for downstream
assessment only: the same solo user becomes one provider inside one organization
with one service, one location, availability and two appointments today.

This is test setup, not a product onboarding path. The lifecycle completion table
marks the wizard steps blocked. Re-running is idempotent. Prints no credentials.
"""

import frappe
from frappe.utils import nowdate

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
SOLO = "p3-solo-owner@example.test"
ORG_NAME = "P3SOLO Org"
ORG_SLUG = "p3solo-org"
PROVIDER_NAME = "P3 Solo Owner"
LOCATION_NAME = "P3SOLO Studio"
SERVICE_NAME = "P3SOLO Consultation"
UAA_SLUG = "p3solo-scenario"
WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday")

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")
frappe.flags.ignore_permissions = True


def info(msg):
    print(msg)


if not frappe.db.exists("Organization", ORG_NAME):
    org = frappe.get_doc(
        {
            "doctype": "Organization",
            "organization_name": ORG_NAME,
            "organization_type": "Other",
            "slug": ORG_SLUG,
            "owner_user": SOLO,
            "is_active": 1,
            "enable_public_booking": 1,
            "managers": [
                {
                    "user": SOLO,
                    "full_name": "P3 Solo Owner",
                    "can_manage_providers": 1,
                    "can_manage_services": 1,
                }
            ],
        }
    )
    org.insert(ignore_permissions=True)
    info("created organization: %s" % org.name)
org = frappe.get_doc("Organization", ORG_NAME)

provider = frappe.get_doc("Provider", PROVIDER_NAME)
provider.organization = org.name
provider.organization_status = "Active"
provider.set("organizations", [])
provider.append(
    "organizations",
    {"organization": org.name, "status": "Active", "accept_org_bookings": 1, "is_primary": 1},
)

if not frappe.db.exists("Location", LOCATION_NAME):
    location = frappe.get_doc(
        {
            "doctype": "Location",
            "location_name": LOCATION_NAME,
            "organization": org.name,
            "timezone": "Africa/Addis_Ababa",
            "is_active": 1,
            "opening_hours": [
                {"day_of_week": day, "start_time": "09:00:00", "end_time": "17:00:00", "is_open": 1}
                for day in WEEKDAYS
            ],
        }
    )
    location.insert(ignore_permissions=True)
    info("created location: %s" % location.name)
location = frappe.get_doc("Location", LOCATION_NAME)

provider.set("locations", [])
provider.append("locations", {"location": location.name, "is_primary": 1})
provider.save(ignore_permissions=True)
info("provider linked to org/location: %s" % provider.name)

if not frappe.db.exists("User Appointment Availability", {"slug": UAA_SLUG}):
    availability = frappe.get_doc(
        {
            "doctype": "User Appointment Availability",
            "user": SOLO,
            "provider": provider.name,
            "enable_scheduling": 1,
            "slug": UAA_SLUG,
            "meeting_provider": "builtin",
            "available_durations": [{"title": "P3 30 minutes", "duration": 1800, "allow_rescheduling": 1}],
            "appointment_time_slot": [
                {"day": day, "start_time": "09:00:00", "end_time": "17:00:00"} for day in WEEKDAYS
            ],
        }
    )
    availability.insert(ignore_permissions=True)
    info("created availability: %s slug=%s" % (availability.name, availability.slug))

existing_service = frappe.get_all("Service", filters={"service_name": SERVICE_NAME}, pluck="name")
if not existing_service:
    service = frappe.get_doc(
        {
            "doctype": "Service",
            "service_name": SERVICE_NAME,
            "duration": 30,
            "price": 500,
            "organization": org.name,
            "is_active": 1,
            "service_providers": [{"provider": provider.name, "is_primary": 1, "status": "Active"}],
        }
    )
    service.insert(ignore_permissions=True)
    info("created service: %s" % service.name)
else:
    service = frappe.get_doc("Service", existing_service[0])

existing_et = frappe.get_all("EventType", filters={"service": service.name, "provider": provider.name}, pluck="name")
if not existing_et:
    event_type = frappe.get_doc(
        {
            "doctype": "EventType",
            "naming_series": "EVT-.YYYY.-.######",
            "event_type_name": "P3SOLO Consultation",
            "service": service.name,
            "provider": provider.name,
            "location": location.name,
            "is_active": 1,
        }
    )
    event_type.insert(ignore_permissions=True)
    info("created event type: %s" % event_type.name)
else:
    event_type = frappe.get_doc("EventType", existing_et[0])

from appointment.onboarding import make_slug

service_slug = make_slug(event_type.name)
info("ORG_SLUG=%s" % org.slug)
info("SERVICE_SLUG=%s" % service_slug)
info("BOOKING_PATH=/schedule/org/%s/%s" % (org.slug, service_slug))
info("PROVIDER_ID=%s" % provider.name)
info("LOCATION_ID=%s" % location.name)
info("SERVICE_ID=%s" % service.name)

# Two appointments today for the provider schedule / reschedule / no-show flow.
existing_apts = frappe.get_all("Appointment", filters={"provider": provider.name}, pluck="name")
if len(existing_apts) < 2:
    for client, start, end, status in (
        ("P3 Assefa Bekele", "09:00:00", "09:30:00", "Confirmed"),
        ("P3 Marta Girma", "14:00:00", "14:30:00", "Confirmed"),
    ):
        apt = frappe.get_doc(
            {
                "doctype": "Appointment",
                "appointment_id": "P3-APT-%s" % frappe.generate_hash(length=8).upper(),
                "event_type": event_type.name,
                "provider": provider.name,
                "location": location.name,
                "service": service.name,
                "client_name": client,
                "client_email": "%s@example.test" % client.lower().replace(" ", "."),
                "client_phone": "+251900000444",
                "appointment_date": nowdate(),
                "start_time": start,
                "end_time": end,
                "status": status,
            }
        )
        apt.insert(ignore_permissions=True)
        info("created appointment: %s %s %s" % (apt.name, client, start))

frappe.db.commit()
info("scenario bootstrap committed")
frappe.destroy()
