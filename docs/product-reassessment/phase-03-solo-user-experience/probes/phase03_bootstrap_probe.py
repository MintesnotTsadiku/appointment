"""Phase 3 bootstrap probe (QA access provisioning, not product signup).

Creates the fresh synthetic identities Phase 3 needs. This is *test harness
provisioning*: the product's own signup remains untested and is labelled as
such. The identities deliberately do NOT use the runner's ``QA-BROWSER`` prefix
so ``appointment.qa_fixtures.teardown`` does not delete them mid-assessment.

Creates:
  - p3-solo-owner@example.test : System User with All, Guest, Desk User,
    Provider (the least-privileged login a solo provider would hold here).
  - p3-solo-customer@example.test : Website User with All, Guest.

No passwords are set: browser runs use ``frappe_session`` which creates the
session server-side. Re-running is idempotent.
"""

import frappe

SITE = "meet-beta-fix-appointment-beta-readiness-01dea7.localhost"

SOLO_EMAIL = "p3-solo-owner@example.test"
CUSTOMER_EMAIL = "p3-solo-customer@example.test"

frappe.init(site=SITE)
frappe.connect()
frappe.set_user("Administrator")
frappe.flags.ignore_permissions = True


def ensure_user(email, first_name, user_type, roles):
    if frappe.db.exists("User", email):
        doc = frappe.get_doc("User", email)
        doc.enabled = 1
        doc.user_type = user_type
        doc.set("roles", [])
        for role in roles:
            if not frappe.db.exists("Role", role):
                print("MISSING ROLE:", role)
                continue
            doc.append("roles", {"role": role})
        doc.save(ignore_permissions=True)
        created = False
    else:
        doc = frappe.get_doc(
            {
                "doctype": "User",
                "email": email,
                "first_name": first_name,
                "send_welcome_email": 0,
                "enabled": 1,
                "user_type": user_type,
                "roles": [{"role": role} for role in roles],
            }
        )
        doc.insert(ignore_permissions=True)
        created = True
    print(("CREATED " if created else "UPDATED ") + email)
    print("  user_type:", doc.user_type)
    print("  roles:", sorted(frappe.get_roles(email)))
    return doc


ensure_user(SOLO_EMAIL, "P3 Solo Owner", "System User", ["All", "Guest", "Desk User", "Provider"])
ensure_user(CUSTOMER_EMAIL, "P3 Solo Customer", "Website User", ["All", "Guest"])

frappe.db.commit()
print("commit ok")
frappe.destroy()
