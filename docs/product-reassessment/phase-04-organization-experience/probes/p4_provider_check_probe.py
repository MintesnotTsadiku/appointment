"""Phase 4 verification probe: appointments per provider, and get_appointments
as the retained provider session would resolve it. Read-only."""

import json

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
PROVIDER_USER = "appointment-review-provider@example.test"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

print("== providers linked to retained provider user ==")
provs = frappe.get_all("Provider", filters={"user": PROVIDER_USER},
                       fields=["name", "provider_name", "user", "organization", "is_active"], limit_page_length=0)
print(json.dumps(provs, indent=2, default=str))

print("== appointments by provider ==")
rows = frappe.get_all("Appointment",
                      fields=["name", "appointment_id", "provider", "client_name",
                              "appointment_date", "start_time", "status"],
                      limit_page_length=0)
for r in rows:
    print(json.dumps(r, default=str))

print("== appointments for provider P4 Provider One ==")
print(frappe.db.count("Appointment", {"provider": "P4 Provider One"}))

print("== as retained provider: get_appointments ==")
frappe.set_user(PROVIDER_USER)
try:
    from appointment.dashboard import get_appointments
    get_appointments(start_date="2026-09-01", end_date="2026-09-30")
    print(json.dumps(frappe.response.get("message"), default=str)[:1500])
except Exception as exc:
    print("ERR", repr(exc))
