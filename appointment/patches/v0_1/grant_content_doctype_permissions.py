"""Grant business-member roles scoped DocPerm access to upstream authoring.

Frappe's ``has_permission`` hook can only deny; it cannot grant access that the
role permission system already refuses. Appointment therefore adds role
DocPerm rows for the upstream Blog Post and Newsletter DocTypes so that a
business member can reach the list. Appointment's
``permission_query_conditions`` and document-level ``has_permission`` hooks then
restrict every row and document to the member's own business.

Use Custom DocPerm so upstream metadata sync cannot remove the grants. Install
and migration hooks also run this idempotent reconciliation on fresh sites.
"""

import frappe

ROLES = ("Organization Manager", "Provider")
TARGETS = ("Blog Post", "Newsletter", "Blog Category", "Blogger")
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
    from frappe.permissions import setup_custom_perms

    changed = False
    for doctype in TARGETS:
        if not frappe.db.exists("DocType", doctype):
            continue
        changed = bool(setup_custom_perms(doctype)) or changed
        for role in ROLES:
            name = frappe.db.get_value("Custom DocPerm", {"parent": doctype, "role": role, "permlevel": 0, "if_owner": 0}, "name")
            doc = frappe.get_doc("Custom DocPerm", name) if name else frappe.new_doc("Custom DocPerm")
            if name and all(doc.get(flag) == value for flag, value in PERMISSION_FLAGS.items()):
                continue
            doc.parent = doctype
            doc.parenttype = "DocType"
            doc.parentfield = "permissions"
            doc.role = role
            doc.permlevel = 0
            for flag, value in PERMISSION_FLAGS.items():
                setattr(doc, flag, value)
            doc.flags.ignore_permissions = True
            doc.save()
            changed = True
    if changed:
        frappe.clear_cache()
        frappe.db.commit()
