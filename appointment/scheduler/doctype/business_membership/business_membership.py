import frappe
from frappe.model.document import Document


class BusinessMembership(Document):
    def validate(self):
        if frappe.session.user == "Administrator":
            return
        from appointment.scheduler import membership

        membership.require_manager(self.organization)
        old = self.get_doc_before_save()
        if old and old.organization != self.organization:
            frappe.throw("A membership cannot move to another business.", frappe.PermissionError)
        if self.membership_role not in membership.ASSIGNABLE_ROLES:
            frappe.throw("Choose Manager, Provider, or Receptionist.", frappe.PermissionError)
        if not frappe.db.exists("User", {"name": self.user, "enabled": 1}):
            frappe.throw("Choose an enabled staff account.")
        membership._validate_provider(self.organization, self.provider)
        membership._validate_locations(self.organization, [row.location for row in self.locations])

    def on_update(self):
        from appointment.scheduler.membership import grant_membership_roles

        grant_membership_roles(self.user, self.membership_role)
