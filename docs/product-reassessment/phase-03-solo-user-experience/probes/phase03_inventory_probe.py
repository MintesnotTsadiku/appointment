"""Phase 3 read-only inventory probe.

Records the pre-scenario state of the preserved isolated site so later fixtures
and cleanup can be judged against a known starting point. Prints no credentials.
"""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

print("== runtime ==")
print("site:", SITE)
print("installed_apps:", frappe.get_installed_apps())
print("time_zone:", frappe.db.get_single_value("System Settings", "time_zone"))
print("developer_mode:", frappe.conf.get("developer_mode"))
print("mute_emails:", frappe.conf.get("mute_emails"))
print("pause_scheduler:", frappe.conf.get("pause_scheduler"))

print("== doctype counts ==")
for dt in [
    "User",
    "Organization",
    "Provider",
    "Service",
    "Location",
    "EventType",
    "User Appointment Availability",
    "Appointment",
    "Walk In",
    "Booking Event",
    "Appointment Group",
    "Browser Account",
    "Browser Session",
    "Browser QA Run",
    "Role",
]:
    try:
        print("count %-34s %s" % (dt, frappe.db.count(dt)))
    except Exception as exc:
        print("count %-34s ERR %s" % (dt, exc))

print("== phase-03 markers already present ==")
for dt, field, filt in [
    ("User", "email", ["like", "p3-%"]),
    ("Organization", "organization_name", ["like", "P3SOLO%"]),
    ("Provider", "provider_name", ["like", "P3SOLO%"]),
    ("Service", "service_name", ["like", "P3SOLO%"]),
]:
    try:
        rows = frappe.get_all(dt, filters={field: filt}, pluck="name", limit_page_length=0)
        print("%s:" % dt, rows)
    except Exception as exc:
        print("%s ERR %s" % (dt, exc))

print("== retained QA identities ==")
for email in [
    "appointment-review-manager@example.test",
    "appointment-review-provider@example.test",
    "appointment-review-reception@example.test",
    "appointment-review-customer@example.test",
]:
    if frappe.db.exists("User", email):
        roles = sorted(frappe.get_roles(email))
        print("retained:", email, "roles:", roles, "enabled:", frappe.db.get_value("User", email, "enabled"))
    else:
        print("retained MISSING:", email)

print("== existing organizations (first 30) ==")
for row in frappe.get_all(
    "Organization",
    fields=["name", "organization_name", "slug", "enable_public_booking", "owner_user"],
    limit_page_length=30,
    order_by="creation desc",
):
    print(row)

print("== existing providers (first 30) ==")
for row in frappe.get_all(
    "Provider", fields=["name", "provider_name", "user", "organization", "is_active"], limit_page_length=30, order_by="creation desc"
):
    print(row)

print("== existing users (last 30) ==")
for row in frappe.get_all(
    "User", fields=["name", "enabled", "user_type"], limit_page_length=30, order_by="creation desc"
):
    print(row)

frappe.destroy()
