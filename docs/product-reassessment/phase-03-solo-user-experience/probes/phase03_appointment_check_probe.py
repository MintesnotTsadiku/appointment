"""Phase 3 check of the two scenario appointments (why one update no-ops)."""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

fields = [
    "name",
    "appointment_id",
    "client_name",
    "client_email",
    "client_phone",
    "service",
    "provider",
    "location",
    "appointment_date",
    "start_time",
    "end_time",
    "status",
]
for row in frappe.get_all("Appointment", filters={"provider": "P3 Solo Owner"}, fields=fields, limit_page_length=0):
    print(row)

frappe.destroy()
