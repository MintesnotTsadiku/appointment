"""Phase 3 record inventory (read-only) for the solo user's business data."""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
SOLO = "p3-solo-owner@example.test"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

for dt in ["Organization", "Provider", "Service", "Location", "EventType", "User Appointment Availability", "Appointment", "Booking Event", "Appointment Group"]:
    print("== %s ==" % dt)
    try:
        fields = [f for f in ["name", "organization_name", "provider_name", "service_name", "location_name", "event_type_name", "user", "organization", "slug", "is_active", "client_name", "appointment_date", "start_time", "status", "subject", "linked_doctype"] if frappe.db.has_column(dt, f)]
        for row in frappe.get_all(dt, fields=fields, limit_page_length=0, order_by="creation desc"):
            print(row)
    except Exception as exc:
        print("ERR", exc)

frappe.destroy()
