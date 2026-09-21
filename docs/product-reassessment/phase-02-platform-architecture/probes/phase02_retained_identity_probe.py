import frappe
SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
frappe.init(site=SITE)
frappe.connect()
print("retained QA users:", frappe.get_all("User", filters={"name": ["like", "appointment-review-%@example.test"]}, pluck="name"))
print("browser accounts:", frappe.db.count("Browser Account"), "browser sessions:", frappe.db.count("Browser Session"))
print("user count:", frappe.db.count("User"))
print("business counts:", {dt: frappe.db.count(dt) for dt in ["Appointment","Organization","Provider","Service","Location","EventType","Walk In","Booking Event","Policy","User Appointment Availability"]})
frappe.destroy()
