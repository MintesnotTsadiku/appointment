import frappe
from frappe import _
from frappe.model.document import Document

from appointment.scheduler import business_owner


class CustomerNotificationSettings(Document):
    def autoname(self):
        # The owner key: the organization name, as before, or `Provider:<provider>`.
        self.name = business_owner.record_key(self)

    def validate(self):
        if bool(self.organization) == bool(self.independent_provider):
            frappe.throw(_("Message settings must belong to exactly one business."))
        business_owner.for_record(self)  # Raises when the owner does not exist.
        if not self.is_new() and self.name != business_owner.record_key(self):
            frappe.throw(_("The business of these settings cannot be changed."))
