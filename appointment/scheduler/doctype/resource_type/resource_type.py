import frappe
from frappe import _
from frappe.model.document import Document


class ResourceType(Document):
    def validate(self):
        self.type_name = (self.type_name or "").strip()
        if not self.type_name:
            frappe.throw(_("Enter a name for the resource type."))
        if frappe.db.exists("Resource Type", {"organization": self.organization, "type_name": self.type_name, "name": ["!=", self.name]}):
            frappe.throw(_("This business already has a resource type with this name."))

    def on_trash(self):
        if frappe.db.exists("Resource", {"resource_type": self.name}) or frappe.db.exists("Service Resource Need", {"resource_type": self.name}):
            frappe.throw(_("This resource type is in use. Turn it off instead."))
