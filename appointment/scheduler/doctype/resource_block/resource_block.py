import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime


class ResourceBlock(Document):
    def validate(self):
        if frappe.db.get_value("Resource", self.resource, "organization") != self.organization:
            frappe.throw(_("The resource must belong to this business."))
        if get_datetime(self.ends_at) <= get_datetime(self.starts_at):
            frappe.throw(_("The block must end after it starts."))
