import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
frappe.init(site=SITE)
frappe.connect()

import appointment
print("appointment.__file__ =", appointment.__file__)

print("\n== leftover P2ISO records ==")
for dt in ["Appointment", "Organization", "Provider", "Service", "Location", "EventType", "Walk In", "Booking Event"]:
    print(dt, "count_all=", frappe.db.count(dt))
print("\n== users P2ISO ==")
print(frappe.get_all("User", filters={"name": ["like", "%p2iso%"]}, pluck="name"))
print("\n== Any P2ISO in Appointment/Service/Walk In (name like) ==")
for dt in ["Appointment", "Service", "Walk In", "Booking Event", "Location", "Provider", "Organization"]:
    rows = frappe.get_all(dt, filters={"name": ["like", "%P2ISO%"]}, pluck="name")
    print(dt, rows)
print("\n== broad field scan ==")
for dt, field in [("Appointment", "client_name"), ("Service", "service_name"), ("Walk In", "client_name"), ("Booking Event", "subject"), ("Organization", "organization_name"), ("Provider", "provider_name"), ("Location", "location_name")]:
    rows = frappe.get_all(dt, filters={field: ["like", "%P2ISO%"]}, pluck="name")
    if rows:
        print("LEFTOVER", dt, rows)
print("scan done")

print("\n== total business counts ==")
for dt in ["Appointment", "Organization", "Provider", "Service", "Location", "EventType", "Walk In", "Booking Event", "User Appointment Availability", "Policy"]:
    print(dt, frappe.db.count(dt))
print("User count:", frappe.db.count("User"))

frappe.destroy()
