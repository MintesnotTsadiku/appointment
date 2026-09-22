"""Phase 3 cleanup: remove the fresh synthetic identities and labelled scenario.

Preserves the retained `appointment-review-*` users, Browser Accounts and Browser
Sessions documented in ../browser-qa-access.md. Deletes only `p3-*` / `P3SOLO*`
records created by the Phase 3 bootstrap probes. Idempotent.
"""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
SOLO = "p3-solo-owner@example.test"
CUSTOMER = "p3-solo-customer@example.test"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")
frappe.flags.ignore_permissions = True

removed = []


def try_delete(doctype, name):
    try:
        if frappe.db.exists(doctype, name):
            frappe.delete_doc(doctype, name, force=True, ignore_permissions=True, delete_permanently=True)
            removed.append("%s:%s" % (doctype, name))
            frappe.db.commit()
    except Exception as exc:
        print("DELETE-ERR", doctype, name, repr(exc))
        frappe.db.rollback()


# Appointments first (no dependents), then child-referencing records.
for name in frappe.get_all("Appointment", filters={"provider": "P3 Solo Owner"}, pluck="name"):
    try_delete("Appointment", name)
for name in frappe.get_all("Booking Event", filters={"subject": ["like", "%P3 Solo%"]}, pluck="name"):
    try_delete("Booking Event", name)
for name in frappe.get_all("Appointment Group", filters={"linked_doctype": ["like", "p3solo%"]}, pluck="name"):
    try_delete("Appointment Group", name)

for name in frappe.get_all("EventType", filters={"event_type_name": ["like", "P3SOLO%"]}, pluck="name"):
    try_delete("EventType", name)
for name in frappe.get_all("Service", filters={"service_name": ["like", "P3SOLO%"]}, pluck="name"):
    try_delete("Service", name)
for name in frappe.get_all("User Appointment Availability", filters={"slug": "p3solo-scenario"}, pluck="name"):
    try_delete("User Appointment Availability", name)
for name in frappe.get_all("Location", filters={"location_name": ["like", "P3SOLO%"]}, pluck="name"):
    try_delete("Location", name)
for name in frappe.get_all("Provider", filters={"provider_name": ["like", "P3 Solo%"]}, pluck="name"):
    try_delete("Provider", name)
for name in frappe.get_all("Organization", filters={"organization_name": ["like", "P3SOLO%"]}, pluck="name"):
    try_delete("Organization", name)

for email in (SOLO, CUSTOMER):
    try_delete("User", email)

frappe.db.commit()

print("removed:", removed)
print("remaining p3 users:", frappe.get_all("User", filters={"name": ["like", "p3-%"]}, pluck="name"))
print("remaining P3SOLO business records:",
      frappe.get_all("Organization", filters={"organization_name": ["like", "P3SOLO%"]}, pluck="name"),
      frappe.get_all("Provider", filters={"provider_name": ["like", "P3 Solo%"]}, pluck="name"),
      frappe.get_all("Appointment", filters={"provider": "P3 Solo Owner"}, pluck="name"))
print("retained QA users present:",
      [e for e in ["appointment-review-manager@example.test", "appointment-review-provider@example.test",
                   "appointment-review-reception@example.test", "appointment-review-customer@example.test"]
       if frappe.db.exists("User", e)])

frappe.destroy()
