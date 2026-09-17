# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class VAProfile(Document):
	def validate(self):
		"""Validate max_clients and update current_clients"""
		if self.max_clients not in [1, 2, 3]:
			frappe.throw("Max clients must be 1, 2, or 3")
		
		# Calculate current active clients
		self.update_current_clients()
	
	def update_current_clients(self):
		"""Calculate current active clients"""
		active_assignments = frappe.get_all(
			"Assistant Client Assignment",
			filters={
				"assistant": self.name,
				"status": "active"
			},
			fields=["name"]
		)
		self.current_clients = len(active_assignments)
		
		# Check if current exceeds max
		if self.current_clients > self.max_clients:
			frappe.throw(f"Current clients ({self.current_clients}) exceeds max clients ({self.max_clients})")
	
	def on_update(self):
		"""Update current clients after save"""
		self.update_current_clients()

