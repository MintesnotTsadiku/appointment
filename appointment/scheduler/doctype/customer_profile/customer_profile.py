import frappe
from frappe import _
from frappe.model.document import Document

from appointment.scheduler import customer_identity


class CustomerProfile(Document):
    def autoname(self):
        # Random, so an ID reveals nothing about how many customers a business has.
        self.name = "CUS-" + frappe.generate_hash(length=10).upper()

    def validate(self):
        customer_identity.prepare_profile(self)

    def on_trash(self):
        if frappe.db.exists("Appointment", {"customer": self.name}):
            frappe.throw(_("This customer has bookings. Archive the profile instead."))
