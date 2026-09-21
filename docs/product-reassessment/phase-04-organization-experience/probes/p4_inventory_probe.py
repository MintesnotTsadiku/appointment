"""Phase 4 inventory probe (read-only).

Reports the current state relevant to organization lifecycle review: retained QA
users and their roles, providers, organizations, memberships, services,
locations, appointments, walk-ins, and the runtime scheduler/email flags.
No mutation. No secrets printed.
"""

import json

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
RETAINED = [
    "appointment-review-manager@example.test",
    "appointment-review-provider@example.test",
    "appointment-review-reception@example.test",
    "appointment-review-customer@example.test",
]

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")

out = {}


def safe(fn, default=None):
    try:
        return fn()
    except Exception as exc:  # pragma: no cover - diagnostic
        return {"error": repr(exc)}


out["site"] = frappe.local.site
out["system_settings_time_zone"] = frappe.db.get_single_value("System Settings", "time_zone")
out["mute_emails"] = frappe.conf.get("mute_emails")
out["scheduler_disable"] = frappe.conf.get("disable_scheduler")

print("== flags ==")
print(json.dumps({k: out[k] for k in ("site", "system_settings_time_zone", "mute_emails", "scheduler_disable")}, indent=2, default=str))

print("\n== retained users ==")
for email in RETAINED:
    if frappe.db.exists("User", email):
        u = frappe.get_doc("User", email)
        print(json.dumps({
            "user": email,
            "enabled": u.enabled,
            "user_type": u.user_type,
            "roles": sorted(frappe.get_roles(email)),
        }, default=str))
    else:
        print(json.dumps({"user": email, "exists": False}))

print("\n== organizations ==")
orgs = frappe.get_all("Organization", fields=["name", "organization_name", "owner_user", "slug", "is_active"], limit_page_length=0)
for o in orgs:
    managers = frappe.get_all("Organization Manager", filters={"parent": o.name}, fields=["user", "full_name", "can_manage_providers", "can_manage_services"], limit_page_length=0)
    print(json.dumps({**o, "managers": managers}, default=str))
print("org_count", len(orgs))

print("\n== providers ==")
provs = frappe.get_all("Provider", fields=["name", "provider_name", "user", "organization", "organization_status", "is_active"], limit_page_length=0)
for p in provs:
    children = frappe.get_all("Provider Organization", filters={"parent": p.name}, fields=["organization", "status", "is_primary", "accept_org_bookings"], limit_page_length=0)
    print(json.dumps({**p, "provider_organizations": children}, default=str))
print("provider_count", len(provs))

print("\n== services / locations / eventtypes ==")
for dt in ("Service", "Location", "EventType"):
    rows = frappe.get_all(dt, fields=["name"], limit_page_length=0)
    print(dt, len(rows))

print("\n== appointments / walk-ins / booking events / appointment groups ==")
for dt in ("Appointment", "Walk In", "Booking Event", "Appointment Group", "User Appointment Availability"):
    try:
        rows = frappe.get_all(dt, fields=["name"], limit_page_length=0)
        print(dt, len(rows))
    except Exception as exc:
        print(dt, "ERR", repr(exc))

print("\n== browser accounts / sessions ==")
for dt in ("Browser Account", "Browser Session"):
    try:
        rows = frappe.get_all(dt, fields=["name"], limit_page_length=0)
        print(dt, [r["name"] for r in rows])
    except Exception as exc:
        print(dt, "ERR", repr(exc))

print("\n== job queue depth ==")
try:
    print("queued", frappe.db.count("RQ Job", {"status": "queued"}))
    print("started", frappe.db.count("RQ Job", {"status": "started"}))
except Exception as exc:
    print("RQ ERR", repr(exc))
