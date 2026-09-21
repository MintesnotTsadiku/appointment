"""Phase 3 follow-up — create a bare solo user for the onboarding recovery check.

No provider/organization, so /home shows first-use. Test setup only.
"""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"
EMAIL = "p3b-onb@example.test"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")
frappe.flags.ignore_permissions = True

if frappe.db.exists("User", EMAIL):
    doc = frappe.get_doc("User", EMAIL)
    doc.enabled = 1
    doc.user_type = "System User"
    doc.set("roles", [{"role": r} for r in ["All", "Guest", "Desk User", "Provider"]])
    doc.save(ignore_permissions=True)
    print("UPDATED", EMAIL)
else:
    doc = frappe.get_doc(
        {
            "doctype": "User",
            "email": EMAIL,
            "first_name": "P3B Onboarding",
            "send_welcome_email": 0,
            "enabled": 1,
            "user_type": "System User",
            "roles": [{"role": r} for r in ["All", "Guest", "Desk User", "Provider"]],
        }
    )
    doc.insert(ignore_permissions=True)
    print("CREATED", EMAIL)

print("roles:", sorted(frappe.get_roles(EMAIL)))

# Reset any Provider created by a prior onboarding attempt so /home shows first-use.
for name in frappe.get_all("Provider", filters={"user": EMAIL}, pluck="name"):
    try:
        frappe.delete_doc("Provider", name, force=True, ignore_permissions=True)
        print("deleted provider:", name)
    except Exception as exc:
        print("provider delete error:", name, repr(exc))

print("providers:", frappe.get_all("Provider", filters={"user": EMAIL}, pluck="name"))
frappe.db.commit()
frappe.destroy()
