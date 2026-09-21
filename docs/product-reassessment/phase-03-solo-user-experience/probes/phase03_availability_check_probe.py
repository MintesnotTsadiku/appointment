"""Phase 3 check: did the location availability change persist, and what does the
slot engine read?"""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

loc = frappe.get_doc("Location", "P3SOLO Studio")
print("Location timezone:", loc.timezone)
for row in loc.opening_hours:
    print("  opening_hours:", row.day_of_week, row.start_time, row.end_time, "is_open=", row.is_open)

uaa = frappe.get_all(
    "User Appointment Availability",
    filters={"slug": "p3solo-scenario"},
    fields=["name", "user", "provider", "enable_scheduling"],
    limit=1,
)
print("UAA:", uaa)
if uaa:
    u = frappe.get_doc("User Appointment Availability", uaa[0]["name"])
    for row in u.appointment_time_slot:
        print("  uaa slot:", row.day, row.start_time, row.end_time)
    for row in u.available_durations:
        print("  duration:", row.title, row.duration)

frappe.destroy()
