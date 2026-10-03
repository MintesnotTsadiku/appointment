import frappe
from frappe import _
from frappe.model.document import Document


class Resource(Document):
    def validate(self):
        self.resource_name = (self.resource_name or "").strip()
        if not self.resource_name:
            frappe.throw(_("Enter a name for the resource."))
        if frappe.db.get_value("Resource Type", self.resource_type, "organization") != self.organization:
            frappe.throw(_("Resource types must belong to this business."))
        if frappe.db.get_value("Location", self.location, "organization") != self.organization:
            frappe.throw(_("The location must belong to this business."))
        if frappe.db.exists("Resource", {"organization": self.organization, "location": self.location, "resource_name": self.resource_name, "name": ["!=", self.name]}):
            frappe.throw(_("This location already has a resource with this name."))

    def on_trash(self):
        # Bookings keep their resource as history, so a used resource is turned off, never deleted.
        if frappe.db.exists("Appointment Resource", {"resource": self.name}):
            frappe.throw(_("This resource has bookings. Turn it off instead."))
        frappe.db.delete("Resource Block", {"resource": self.name})
