# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class ServiceProvider(Document):
	"""Child table linking Providers to Services (many-to-many relationship with additional fields)"""
	
	def validate(self):
		"""Validate Service Provider child table row"""
		# Validate price_override is positive if set
		if self.price_override and self.price_override < 0:
			frappe.throw(_("Price Override must be a positive number"))
		
		# Validate duration_override is positive if set
		if self.duration_override and self.duration_override < 0:
			frappe.throw(_("Duration Override must be a positive number"))
		
		# Validate commission_rate is between 0 and 100 if set
		if self.commission_rate is not None:
			if self.commission_rate < 0 or self.commission_rate > 100:
				frappe.throw(_("Commission Rate must be between 0 and 100"))
		
		# Validate that only one provider is marked as primary per service
		if self.is_primary and self.parent:
			# Get all other Service Provider rows for this service
			other_primaries = frappe.get_all(
				"Service Provider",
				filters={
					"parent": self.parent,
					"name": ["!=", self.name],
					"is_primary": 1
				},
				limit=1
			)
			
			if other_primaries:
				frappe.throw(_("Only one provider can be marked as primary for a service"))

