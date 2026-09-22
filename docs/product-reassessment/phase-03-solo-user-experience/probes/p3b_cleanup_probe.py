"""Phase 3 follow-up cleanup — remove P3B synthetic fixtures via direct DB deletes.

`frappe.delete_doc` is blocked by the runtime's paused, overloaded job queue
(QueueOverloaded, 550 queued jobs), so this probe removes the synthetic rows with
`frappe.db.delete`. It touches only `p3b-*` / `P3B*` records and preserves the four
retained `appointment-review-*` users, Browser Accounts and Browser Sessions.
"""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
USERS = ["p3b-solo-owner@example.test", "p3b-solo-customer@example.test", "p3b-onb@example.test"]

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")
frappe.flags.ignore_permissions = True

removed = {}


def dbdelete(doctype, filters):
    try:
        before = frappe.db.count(doctype, filters)
        if before:
            frappe.db.delete(doctype, filters)
            removed["%s" % doctype] = before
    except Exception as exc:
        print("DBDELETE-ERR", doctype, filters, repr(exc))
        frappe.db.rollback()


# Business records created by the P3B scenario bootstrap.
dbdelete("Appointment", {"appointment_id": ["like", "P3B-%"]})
dbdelete("User Appointment Availability", {"slug": "p3b-scenario"})
dbdelete("EventType", {"event_type_name": ["like", "P3B%"]})
dbdelete("Service", {"service_name": ["like", "P3B%"]})
dbdelete("Location", {"location_name": ["like", "P3B%"]})
dbdelete("Provider", {"provider_name": ["like", "P3B%"]})
dbdelete("Organization", {"organization_name": ["like", "P3B%"]})

# Any provider created for the fresh users by the onboarding attempt.
for user in USERS:
    dbdelete("Provider", {"user": user})

# Remove the fresh users and their role/permission rows.
for user in USERS:
    dbdelete("Has Role", {"parent": user})
    dbdelete("User Permission", {"user": user})
    dbdelete("User", {"name": user})

frappe.db.commit()

print("removed:", removed)
print("remaining p3b users:", frappe.get_all("User", filters={"name": ["like", "p3b-%"]}, pluck="name"))
print("remaining p3b business:",
      frappe.get_all("Organization", filters={"organization_name": ["like", "P3B%"]}, pluck="name"),
      frappe.get_all("Provider", filters={"provider_name": ["like", "P3B%"]}, pluck="name"),
      frappe.get_all("Appointment", filters={"appointment_id": ["like", "P3B-%"]}, pluck="name"))
print("business counts:",
      "Org", frappe.db.count("Organization"), "Provider", frappe.db.count("Provider"),
      "Service", frappe.db.count("Service"), "Location", frappe.db.count("Location"),
      "EventType", frappe.db.count("EventType"), "Appointment", frappe.db.count("Appointment"),
      "BookingEvent", frappe.db.count("Booking Event"), "ApptGroup", frappe.db.count("Appointment Group"))
print("retained QA users present:",
      [e for e in ["appointment-review-manager@example.test", "appointment-review-provider@example.test",
                   "appointment-review-reception@example.test", "appointment-review-customer@example.test"]
       if frappe.db.exists("User", e)])
print("Browser Accounts:", frappe.db.count("Browser Account"), "Browser Sessions:", frappe.db.count("Browser Session"))

frappe.destroy()
