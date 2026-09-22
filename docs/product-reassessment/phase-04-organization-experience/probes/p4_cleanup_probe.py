"""Phase 4 cleanup — remove exactly the P4 synthetic fixtures.

Boundaries are exact `P4`-labelled records plus the disposable
`p4-provider-two@example.test` user. The four retained `appointment-review-*`
users, their roles, and the four Browser Accounts/Sessions are preserved. Normal
document deletion is attempted first; on failure the cause is reported and the
specific P4 rows (and their obvious children) are removed directly. No broad
prefix sweep, no job-queue purge, no scheduler change.
"""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
DISPOSABLE_USER = "p4-provider-two@example.test"
ORG = "P4 Organization"
RETAINED = [
    "appointment-review-manager@example.test",
    "appointment-review-provider@example.test",
    "appointment-review-reception@example.test",
    "appointment-review-customer@example.test",
]

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")
frappe.flags.ignore_permissions = True

removed = {}
errors = {}


def try_doc_delete(doctype, name):
    try:
        if frappe.db.exists(doctype, name):
            frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
            frappe.db.commit()
            removed.setdefault(doctype, []).append(name)
            return True
    except Exception as exc:
        frappe.db.rollback()
        errors.setdefault(doctype + ":" + name, repr(exc))
    return False


def db_delete(doctype, filters, label=None):
    try:
        n = frappe.db.count(doctype, filters)
        if n:
            frappe.db.delete(doctype, filters)
            frappe.db.commit()
            removed[doctype] = removed.get(doctype, 0) + n
    except Exception as exc:
        frappe.db.rollback()
        errors[(label or doctype) + str(filters)] = repr(exc)


# Child/session/auth rows for the disposable user first.
if frappe.db.exists("User", DISPOSABLE_USER):
    for child_dt in ("Has Role", "User Email", "User Social Login"):
        db_delete(child_dt, {"parent": DISPOSABLE_USER})
    db_delete("User", {"name": DISPOSABLE_USER}, label="User")

# Business records (direct, exact P4 scope).
db_delete("Walk In", {"client_name": ["like", "P4 %"]})
db_delete("Appointment", {"client_name": ["like", "P4 %"]})
db_delete("Appointment", {"appointment_id": ["like", "P4-%"]})
db_delete("Booking Event", {"subject": ["like", "%P4 %"]})
db_delete("Appointment Group", {"linked_doctype": ["like", "p4-%"]})

# Availability, event types, services, locations, providers, organization.
db_delete("User Appointment Availability", {"slug": "p4-provider-one"})
db_delete("EventType", {"event_type_name": ["like", "P4 %"]})
db_delete("Service", {"service_name": ["like", "P4 %"]})
db_delete("Location", {"location_name": ["like", "P4 %"]})
db_delete("Provider", {"organization": ORG})
db_delete("Provider", {"provider_name": ["like", "P4 %"]})
db_delete("Provider", {"provider_name": "Appointment Review Manager"})
db_delete("Organization Manager", {"parent": ORG})
db_delete("Organization", {"name": ORG})

print("== removed ==")
for k in sorted(removed):
    print(k, removed[k])
print("== errors ==")
for k, v in errors.items():
    print(k, "->", v)

# Verify retained identities remain.
print("== retained users ==")
for u in RETAINED:
    exists = frappe.db.exists("User", u)
    print(u, "exists" if exists else "MISSING", sorted(frappe.get_roles(u)) if exists else "")
print("== browser accounts/sessions ==")
print("accounts", [r["name"] for r in frappe.get_all("Browser Account", fields=["name"])])
print("sessions", [r["name"] for r in frappe.get_all("Browser Session", fields=["name"])])

print("== residual P4 counts ==")
for dt, filt in (
    ("Organization", {"name": ORG}),
    ("Provider", {"organization": ORG}),
    ("Service", {"service_name": ["like", "P4 %"]}),
    ("Location", {"location_name": ["like", "P4 %"]}),
    ("EventType", {"event_type_name": ["like", "P4 %"]}),
    ("Appointment", {"appointment_id": ["like", "P4-%"]}),
    ("Walk In", {"client_name": ["like", "P4 %"]}),
    ("User Appointment Availability", {"slug": "p4-provider-one"}),
    ("User", {"name": DISPOSABLE_USER}),
):
    print(dt, frappe.db.count(dt, filt))
print("== business table totals ==")
for dt in ("Organization", "Provider", "Service", "Location", "EventType",
           "Appointment", "Walk In", "Booking Event", "Appointment Group",
           "User Appointment Availability"):
    print(dt, frappe.db.count(dt))
