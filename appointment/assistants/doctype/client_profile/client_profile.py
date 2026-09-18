# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ClientProfile(Document):
	def validate(self):
		"""Validate and sync assignment type"""
		if self.assigned_assistant:
			assignment = frappe.db.get_value(
				"Assistant Client Assignment",
				{
					"assistant": self.assigned_assistant,
					"client_profile": self.name,
					"status": "active"
				},
				"assignment_type"
			)
			if assignment:
				self.assignment_type = assignment

