"""Phase 3 follow-up — verify stored appointment outcomes after the update run."""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

fields = ["name", "appointment_date", "start_time", "end_time", "status", "modified", "modified_by"]
for name in ("P3B-APT-MORN1", "P3B-APT-MORN2", "P3B-APT-AFT"):
    if frappe.db.exists("Appointment", name):
        row = frappe.db.get_value("Appointment", name, fields, as_dict=True)
        print(row)
    else:
        print("MISSING", name)

frappe.destroy()
