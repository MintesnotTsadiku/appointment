import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"

frappe.init(site=SITE)
frappe.connect()

print("session_user:", frappe.session.user)
for dt in ["Appointment", "Organization", "Provider", "Service", "Location", "EventType", "Walk In", "Booking Event", "User Appointment Availability", "Policy"]:
    try:
        print("count %-32s %s" % (dt, frappe.db.count(dt)))
    except Exception as e:
        print("count %-32s ERR %s" % (dt, e))

print("db_user:", frappe.db.get_single_value("System Settings", "time_zone"))
print("installed_apps:", frappe.get_installed_apps())
frappe.destroy()
