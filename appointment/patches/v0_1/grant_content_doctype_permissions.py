"""Grant business-member roles scoped DocPerm access to upstream authoring.

Frappe's ``has_permission`` hook can only deny; it cannot grant access that the
role permission system already refuses. Appointment therefore adds role
DocPerm rows for the upstream Blog Post and Newsletter DocTypes so that a
business member can reach the list. Appointment's
``permission_query_conditions`` and document-level ``has_permission`` hooks then
restrict every row and document to the member's own business.

These roles are not managed by the upstream apps, so the grants are stable
across upstream upgrades. The patch is idempotent.
"""

import frappe

ROLES = ("Organization Manager", "Provider")
TARGETS = ("Blog Post", "Newsletter")
PERMISSION_FLAGS = {
    "read": 1,
    "write": 1,
    "create": 1,
    "email": 1,
    "export": 1,
    "report": 1,
    "print": 1,
}


def execute():
    changed = False
    for doctype in TARGETS:
        if not frappe.db.exists("DocType", doctype):
            continue
        for role in ROLES:
            if frappe.db.exists("DocPerm", {"parent": doctype, "role": role, "permlevel": 0}):
                continue
            doc = frappe.new_doc("DocPerm")
            doc.parent = doctype
            doc.parenttype = "DocType"
            doc.parentfield = "permissions"
            doc.role = role
            doc.permlevel = 0
            for flag, value in PERMISSION_FLAGS.items():
                setattr(doc, flag, value)
            doc.flags.ignore_permissions = True
            doc.insert()
            changed = True
    if changed:
        frappe.clear_cache()
        frappe.db.commit()
