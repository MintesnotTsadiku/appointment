"""Immutable, business-scoped workbook audit records."""

import frappe
from frappe import _
from frappe.model.document import Document

from appointment.content.tenancy import require_manage_business


class OrganizationWorkbookImport(Document):
    def validate(self):
        from appointment.organization_import.service import _IMPORT_WRITE

        require_manage_business("Organization", self.organization)
        if not self.is_new() or self.flags.workbook_factory is not _IMPORT_WRITE:
            frappe.throw(_("Workbook audit records can only be created by a confirmed import."), frappe.PermissionError)
        self.imported_by = frappe.session.user

    def on_trash(self):
        frappe.throw(_("Workbook audit records cannot be deleted."), frappe.PermissionError)
