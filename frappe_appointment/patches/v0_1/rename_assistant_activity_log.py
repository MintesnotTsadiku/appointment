import frappe
from frappe.model.rename_doc import rename_doc


def execute():
    module = frappe.db.get_value("DocType", "Activity Log", "module")

    # Only rename if the conflicting DocType came from this app's Assistants module.
    if module != "Assistants":
        return

    if frappe.db.exists("DocType", "Assistant Activity Log"):
        return

    rename_doc(
        "DocType",
        "Activity Log",
        "Assistant Activity Log",
        force=True,
        ignore_permissions=True,
    )

    frappe.db.set_value("DocType", "Assistant Activity Log", "module", "Assistants")


