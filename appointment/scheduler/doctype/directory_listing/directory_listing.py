import frappe
from frappe import _
from frappe.model.document import Document


class DirectoryListing(Document):
    def validate(self):
        if self.listed and not (self.category and self.area):
            frappe.throw(_("Choose a category and an area before you list your business."))
        if self.listed and not self.listed_at:
            self.listed_at = frappe.utils.now_datetime()
        if not self.listed:
            self.listed_at = None
