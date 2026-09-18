# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Policy(Document):
	def validate(self):
		"""Validate policy fields"""
		# Validate that deposit_percentage and deposit_amount are not both set
		if self.deposit_percentage and self.deposit_percentage > 0 and self.deposit_amount and self.deposit_amount > 0:
			frappe.throw(_("Cannot set both deposit percentage and deposit amount. Please use only one."))
		
		# Validate cancellation_window_hours >= 0
		if self.cancellation_window_hours < 0:
			frappe.throw(_("Cancellation window hours must be 0 or greater."))
		
		# Validate reschedule_window_hours >= 0
		if self.reschedule_window_hours < 0:
			frappe.throw(_("Reschedule window hours must be 0 or greater."))
		
		# Validate dates (valid_from <= valid_to if both set)
		if self.valid_from and self.valid_to:
			if self.valid_from > self.valid_to:
				frappe.throw(_("Valid From date must be before or equal to Valid To date."))
		
		# Validate applies_to field requirements
		if self.applies_to == "All Services" and not self.organization:
			frappe.throw(_("Organization is required when 'Applies To' is set to 'All Services'."))
		
		if self.applies_to == "Specific Service" and not self.service:
			frappe.throw(_("Service is required when 'Applies To' is set to 'Specific Service'."))
		
		if self.applies_to == "Specific Location" and not self.location:
			frappe.throw(_("Location is required when 'Applies To' is set to 'Specific Location'."))
		
		if self.applies_to == "Specific Provider" and not self.provider:
			frappe.throw(_("Provider is required when 'Applies To' is set to 'Specific Provider'."))
		
		# Validate permissions based on user role
		if not self.is_new():
			# Only validate permissions on update (not on insert, as API handles that)
			self._validate_permissions()
	
	def _validate_permissions(self):
		"""Validate user has permission to create/edit this policy"""
		user = frappe.session.user
		
		# System Manager has full access
		if "System Manager" in frappe.get_roles(user):
			return
		
		# Check if user is a provider
		user_provider = frappe.db.get_value("Provider", {"user": user}, "name")
		
		# Check if user owns/manages an organization
		user_org = frappe.db.get_value("Organization", {"owner_user": user}, "name")
		if not user_org:
			org_manager = frappe.get_all(
				"Organization Manager",
				filters={"user": user, "status": "Active"},
				fields=["parent"],
				limit=1
			)
			if org_manager:
				user_org = org_manager[0].parent
		
		# Validate provider-specific policies
		if self.applies_to == "Specific Provider":
			if not user_provider:
				frappe.throw(_("Only providers can create provider-specific policies."))
			if self.provider != user_provider:
				frappe.throw(_("You can only create policies for your own provider account."))
		
		# Validate organization policies
		elif self.applies_to in ["All Services", "Specific Service", "Specific Location"]:
			if not user_org:
				frappe.throw(_("Only organization owners/managers can create organization policies."))
			
			# Verify service belongs to organization
			if self.applies_to == "Specific Service" and self.service:
				service_org = frappe.db.get_value("Service", self.service, "organization")
				if service_org != user_org:
					frappe.throw(_("Service does not belong to your organization."))
			
			# Verify location belongs to organization
			if self.applies_to == "Specific Location" and self.location:
				location_org = frappe.db.get_value("Location", self.location, "organization")
				if location_org != user_org:
					frappe.throw(_("Location does not belong to your organization."))

