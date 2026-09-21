import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
frappe.init(site=SITE)
frappe.connect()

print("== roles in system (app-relevant) ==")
for r in frappe.get_all("Role", filters={"name": ["in", ["Organization Manager", "Front Desk", "Front-Desk", "Assistant", "Provider", "Desk User", "System Manager"]]}, fields=["name", "disabled"]):
    print(r)

print("\n== users with app roles ==")
for u in frappe.get_all("Has Role", filters={"role": ["in", ["Organization Manager", "Front Desk", "Front-Desk", "Assistant", "Provider", "Desk User"]]}, fields=["parent", "role"]):
    print(u)

print("\n== synthetic app users (example.test) ==")
for u in frappe.get_all("User", filters={"name": ["like", "%@example.test"]}, fields=["name", "enabled"]):
    print(u)

print("\n== User Permission rows ==")
print(frappe.db.count("User Permission"))
for up in frappe.get_all("User Permission", fields=["user", "allow", "for_value"], limit=20):
    print(up)

print("\n== Browser Accounts / Sessions ==")
for dt in ["Browser Account", "Browser Session"]:
    if frappe.db.exists("DocType", dt):
        print(dt, frappe.db.count(dt))
        for row in frappe.get_all(dt, fields=["name"], limit=10):
            print("   ", row.name)
    else:
        print(dt, "(doctype absent)")

print("\n== DocPerm for Appointment ==")
for p in frappe.get_all("DocPerm", filters={"parent": "Appointment"}, fields=["role", "read", "write", "create", "delete", "export", "if_owner"]):
    print(p)

print("\n== DocType quick check: Organization Manager child fields ==")
for f in frappe.get_all("DocField", filters={"parent": "Organization Manager"}, fields=["fieldname", "fieldtype", "options", "label"]):
    print(f)

print("\n== scheduled jobs ==")
for j in frappe.get_all("Scheduled Job Type", fields=["method", "frequency", "stopped"]):
    print(j)

print("\n== System Settings time_zone / enable scheduler ==")
print("time_zone:", repr(frappe.db.get_single_value("System Settings", "time_zone")))
print("scheduler paused in common_site_config:", frappe.conf.get("pause_scheduler"), "mute_emails:", frappe.conf.get("mute_emails"))

frappe.destroy()
