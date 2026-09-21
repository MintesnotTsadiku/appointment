"""Phase 3 bounded follow-up — fixture bootstrap (clearly distinct P3B prefix).

Recreates the synthetic identities and labelled solo-equivalent scenario that the
original Phase 3 cleanup removed. Adds three appointments for the update
diagnosis: two single-digit-hour mornings (09:00, 09:45) and a two-digit control
(14:00). Test setup only; not product onboarding. Idempotent. Prints IDs/slugs.

No credentials are set; browser runs use frappe_session or the public Guest flow.
"""

import frappe
from frappe.utils import nowdate

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
SOLO = "p3b-solo-owner@example.test"
CUSTOMER = "p3b-solo-customer@example.test"
ORG_NAME = "P3B Org"
ORG_SLUG = "p3b-org"
PROVIDER_NAME = "P3B Solo Owner"
LOCATION_NAME = "P3B Studio"
SERVICE_NAME = "P3B Consultation"
UAA_SLUG = "p3b-scenario"
WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday")

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")
frappe.flags.ignore_permissions = True


def info(msg):
    print(msg)


def ensure_user(email, first_name, user_type, roles):
    if frappe.db.exists("User", email):
        doc = frappe.get_doc("User", email)
        doc.enabled = 1
        doc.user_type = user_type
        doc.set("roles", [{"role": role} for role in roles])
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.get_doc(
            {
                "doctype": "User",
                "email": email,
                "first_name": first_name,
                "send_welcome_email": 0,
                "enabled": 1,
                "user_type": user_type,
                "roles": [{"role": role} for role in roles],
            }
        )
        doc.insert(ignore_permissions=True)
    info("user: %s roles=%s type=%s" % (email, sorted(frappe.get_roles(email)), doc.user_type))


ensure_user(SOLO, "P3B Solo Owner", "System User", ["All", "Guest", "Desk User", "Provider"])
ensure_user(CUSTOMER, "P3B Solo Customer", "Website User", ["All", "Guest"])

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
            "managers": [{"user": SOLO, "full_name": "P3B Solo Owner", "can_manage_providers": 1, "can_manage_services": 1}],
        }
    )
    org.insert(ignore_permissions=True)
    info("organization: %s slug=%s" % (org.name, org.slug))
org = frappe.get_doc("Organization", ORG_NAME)

provider_filters = {"provider_name": PROVIDER_NAME, "user": SOLO}
existing_provider = frappe.get_all("Provider", filters=provider_filters, pluck="name")
if existing_provider:
    provider = frappe.get_doc("Provider", existing_provider[0])
else:
    provider = frappe.get_doc(
        {
            "doctype": "Provider",
            "provider_name": PROVIDER_NAME,
            "full_name": "P3B Solo Owner",
            "email": SOLO,
            "user": SOLO,
            "is_active": 1,
            "organization": org.name,
            "organization_status": "Active",
        }
    )
    provider.insert(ignore_permissions=True)
provider.organization = org.name
provider.organization_status = "Active"
provider.set("organizations", [])
provider.append("organizations", {"organization": org.name, "status": "Active", "accept_org_bookings": 1, "is_primary": 1})

if not frappe.db.exists("Location", LOCATION_NAME):
    location = frappe.get_doc(
        {
            "doctype": "Location",
            "location_name": LOCATION_NAME,
            "organization": org.name,
            "timezone": "Africa/Addis_Ababa",
            "is_active": 1,
            "opening_hours": [
                {"day_of_week": day, "start_time": "09:00:00", "end_time": "17:00:00", "is_open": 1} for day in WEEKDAYS
            ],
        }
    )
    location.insert(ignore_permissions=True)
    info("location: %s" % location.name)
location = frappe.get_doc("Location", LOCATION_NAME)
provider.set("locations", [])
provider.append("locations", {"location": location.name, "is_primary": 1})
provider.save(ignore_permissions=True)
info("provider: %s" % provider.name)

if not frappe.db.exists("User Appointment Availability", {"slug": UAA_SLUG}):
    availability = frappe.get_doc(
        {
            "doctype": "User Appointment Availability",
            "user": SOLO,
            "provider": provider.name,
            "enable_scheduling": 1,
            "slug": UAA_SLUG,
            "meeting_provider": "builtin",
            "available_durations": [{"title": "P3B 30 minutes", "duration": 1800, "allow_rescheduling": 1}],
            "appointment_time_slot": [{"day": day, "start_time": "09:00:00", "end_time": "17:00:00"} for day in WEEKDAYS],
        }
    )
    availability.insert(ignore_permissions=True)
    info("availability: %s slug=%s" % (availability.name, availability.slug))

existing_service = frappe.get_all("Service", filters={"service_name": SERVICE_NAME}, pluck="name")
if existing_service:
    service = frappe.get_doc("Service", existing_service[0])
else:
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
    info("service: %s" % service.name)

existing_et = frappe.get_all("EventType", filters={"service": service.name, "provider": provider.name}, pluck="name")
if existing_et:
    event_type = frappe.get_doc("EventType", existing_et[0])
else:
    event_type = frappe.get_doc(
        {
            "doctype": "EventType",
            "naming_series": "EVT-.YYYY.-.######",
            "event_type_name": "P3B Consultation",
            "service": service.name,
            "provider": provider.name,
            "location": location.name,
            "is_active": 1,
        }
    )
    event_type.insert(ignore_permissions=True)
    info("event_type: %s" % event_type.name)

from appointment.onboarding import make_slug

info("ORG_SLUG=%s" % org.slug)
info("SERVICE_SLUG=%s" % make_slug(event_type.name))
info("BOOKING_PATH=/schedule/org/%s/%s" % (org.slug, make_slug(event_type.name)))
info("PROVIDER_ID=%s" % provider.name)
info("UAA=%s" % UAA_SLUG)

appointments = {
    "P3B-APT-MORN1": ("P3B Morning One", "09:00:00", "09:30:00"),
    "P3B-APT-MORN2": ("P3B Morning Two", "09:45:00", "10:15:00"),
    "P3B-APT-AFT": ("P3B Afternoon", "14:00:00", "14:30:00"),
}
for name, (client, start, end) in appointments.items():
    if frappe.db.exists("Appointment", name):
        info("appointment exists: %s" % name)
        continue
    apt = frappe.get_doc(
        {
            "doctype": "Appointment",
            "appointment_id": name,
            "event_type": event_type.name,
            "provider": provider.name,
            "location": location.name,
            "service": service.name,
            "client_name": client,
            "client_email": "%s@example.test" % name.lower(),
            "client_phone": "+251900000444",
            "appointment_date": nowdate(),
            "start_time": start,
            "end_time": end,
            "status": "Confirmed",
        }
    )
    apt.insert(ignore_permissions=True)
    info("appointment: %s %s %s-%s" % (apt.name, client, start, end))

frappe.db.commit()
info("P3B bootstrap committed")
frappe.destroy()
