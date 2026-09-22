"""Phase 4 downstream fixture (clearly labelled, Administrator-prepared).

The organization manager's browser onboarding auto-completed immediately after the
organization profile step (see analysis.md F1), so the wizard could not be used to
add providers/services/locations. This probe prepares the downstream fixture that
the reception and provider journeys are evaluated against. It is NOT evidence of
successful UI onboarding and is labelled as a fixture scenario.

Idempotent. Creates only P4-labelled records plus one P4 second-provider user.
Never touches the four retained users' credentials or role bindings.
"""

import frappe
from frappe.utils import nowdate

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
ORG = "P4 Organization"
ORG_OWNER = "appointment-review-manager@example.test"
PROVIDER_ONE_USER = "appointment-review-provider@example.test"
PROVIDER_TWO_USER = "p4-provider-two@example.test"
P1 = "P4 Provider One"
P2 = "P4 Provider Two"
LOC_A = "P4 Location Alpha"
LOC_B = "P4 Location Beta"
SVC_A = "P4 Service Alpha"
SVC_B = "P4 Service Beta"
WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")
frappe.flags.ignore_permissions = True


def note(msg):
    print(msg)


def ensure_user(email, first_name, user_type, roles):
    if frappe.db.exists("User", email):
        doc = frappe.get_doc("User", email)
    else:
        doc = frappe.get_doc({
            "doctype": "User",
            "email": email,
            "first_name": first_name,
            "send_welcome_email": 0,
            "enabled": 1,
            "user_type": user_type,
        })
        doc.insert(ignore_permissions=True)
    doc.set("roles", [{"role": r} for r in roles])
    doc.save(ignore_permissions=True)
    note("user %s roles=%s" % (email, sorted(frappe.get_roles(email))))


def ensure_org():
    if not frappe.db.exists("Organization", ORG):
        org = frappe.get_doc({
            "doctype": "Organization",
            "organization_name": ORG,
            "organization_type": "Other",
            "slug": "p4-organization",
            "owner_user": ORG_OWNER,
            "is_active": 1,
            "enable_public_booking": 1,
        })
        org.insert(ignore_permissions=True)
    # Ensure an Organization Manager child row for the retained manager.
    org = frappe.get_doc("Organization", ORG)
    if not any(m.user == ORG_OWNER for m in org.managers):
        org.append("managers", {
            "user": ORG_OWNER,
            "full_name": "Appointment Review Manager",
            "can_manage_providers": 1,
            "can_manage_services": 1,
        })
        org.save(ignore_permissions=True)
    note("org %s managers=%s" % (ORG, [m.user for m in org.managers]))


def ensure_provider(name, user, phone, role_status="Active"):
    existing = frappe.db.get_value("Provider", {"provider_name": name}, "name")
    if existing:
        doc = frappe.get_doc("Provider", existing)
    else:
        doc = frappe.new_doc("Provider")
        doc.provider_name = name
        doc.full_name = name
    doc.user = user
    doc.email = user
    doc.phone = phone
    doc.organization = ORG
    doc.organization_status = role_status
    doc.accept_org_bookings = 1
    doc.is_active = 1
    if not doc.get("organizations"):
        doc.append("organizations", {
            "organization": ORG, "status": "Active",
            "accept_org_bookings": 1, "is_primary": 1,
        })
    if not doc.get("locations"):
        loc = frappe.db.get_value("Location", {"location_name": LOC_A}, "name")
        doc.append("locations", {"location": loc, "is_primary": 1})
    doc.save(ignore_permissions=True)
    note("provider %s user=%s" % (doc.name, doc.user))
    return doc


def ensure_location(name, organization, open_all=True):
    existing = frappe.db.get_value("Location", {"location_name": name}, "name")
    if existing:
        return existing
    doc = frappe.get_doc({
        "doctype": "Location",
        "location_name": name,
        "organization": organization,
        "timezone": "Africa/Addis_Ababa",
        "is_active": 1,
        "opening_hours": [
            {"day_of_week": d, "start_time": "09:00:00", "end_time": "18:00:00",
             "is_open": 1 if (open_all or d in WEEKDAYS[:5]) else 0}
            for d in WEEKDAYS
        ],
    })
    doc.insert(ignore_permissions=True)
    note("location %s" % doc.name)
    return doc.name


def ensure_service(name, duration, price, providers):
    existing = frappe.db.get_value("Service", {"service_name": name}, "name")
    if existing:
        return existing
    doc = frappe.get_doc({
        "doctype": "Service",
        "service_name": name,
        "duration": duration,
        "price": price,
        "organization": ORG,
        "is_active": 1,
        "service_providers": [
            {"provider": p, "is_primary": 1, "status": "Active"} for p in providers
        ],
    })
    doc.insert(ignore_permissions=True)
    note("service %s" % doc.name)
    return doc.name


def ensure_event_type(name, service, provider, location):
    existing = frappe.db.get_value("EventType", {"event_type_name": name}, "name")
    if existing:
        return existing
    doc = frappe.get_doc({
        "doctype": "EventType",
        "naming_series": "EVT-.YYYY.-.######",
        "event_type_name": name,
        "service": service,
        "provider": provider,
        "location": location,
        "is_active": 1,
    })
    doc.insert(ignore_permissions=True)
    note("event_type %s" % doc.name)
    return doc.name


def ensure_availability(user, provider):
    if frappe.db.exists("User Appointment Availability", {"provider": provider}):
        return
    doc = frappe.get_doc({
        "doctype": "User Appointment Availability",
        "user": user,
        "provider": provider,
        "enable_scheduling": 1,
        "slug": "p4-provider-one",
        "meeting_provider": "builtin",
        "available_durations": [
            {"title": "P4 30 minutes", "duration": 1800, "allow_rescheduling": 1}
        ],
        "appointment_time_slot": [
            {"day": d, "start_time": "09:00:00", "end_time": "17:00:00"} for d in WEEKDAYS
        ],
    })
    doc.insert(ignore_permissions=True)
    note("availability %s" % doc.name)


def ensure_appointment(appointment_id, event_type, provider, location, service,
                       client_name, start, end, status="Confirmed", date=None):
    if frappe.db.exists("Appointment", {"appointment_id": appointment_id}):
        return
    doc = frappe.get_doc({
        "doctype": "Appointment",
        "appointment_id": appointment_id,
        "event_type": event_type,
        "provider": provider,
        "location": location,
        "service": service,
        "client_name": client_name,
        "client_email": "%s@example.test" % appointment_id.lower(),
        "client_phone": "+251900000600",
        "appointment_date": date or nowdate(),
        "start_time": start,
        "end_time": end,
        "status": status,
    })
    doc.insert(ignore_permissions=True)
    note("appointment %s %s %s" % (doc.name, doc.appointment_date, doc.start_time))


ensure_user(PROVIDER_TWO_USER, "P4 Provider Two", "System User",
            ["All", "Guest", "Desk User", "Provider"])
ensure_org()
ensure_location(LOC_A, ORG)
ensure_location(LOC_B, ORG)
p1 = ensure_provider(P1, PROVIDER_ONE_USER, "+251900000501")
p2 = ensure_provider(P2, PROVIDER_TWO_USER, "+251900000502")
svc_a = ensure_service(SVC_A, 30, 400, [p1.name, p2.name])
svc_b = ensure_service(SVC_B, 45, 600, [p1.name])
et_a = ensure_event_type("P4 EventType Alpha", svc_a, p1.name, LOC_A)
et_b = ensure_event_type("P4 EventType Beta", svc_b, p1.name, LOC_B)
ensure_availability(PROVIDER_ONE_USER, p1.name)
ensure_appointment("P4-APT-RESCHED", et_a, p1.name, LOC_A, svc_a, "P4 Reschedule Client", "11:00:00", "11:30:00")
ensure_appointment("P4-APT-CANCEL", et_a, p1.name, LOC_A, svc_a, "P4 Cancel Client", "12:00:00", "12:30:00")
ensure_appointment("P4-APT-COMPLETE", et_a, p1.name, LOC_A, svc_a, "P4 Complete Client", "13:00:00", "13:30:00")
ensure_appointment("P4-APT-WORKLOAD", et_a, p1.name, LOC_A, svc_a, "P4 Workload Client", "14:00:00", "14:30:00")

frappe.db.commit()
print("P4-FIXTURE-DONE org=%s p1=%s p2=%s svc_a=%s svc_b=%s" % (ORG, p1.name, p2.name, svc_a, svc_b))
