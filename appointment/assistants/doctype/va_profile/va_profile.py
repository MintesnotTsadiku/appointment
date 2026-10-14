# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class VAProfile(Document):
	def validate(self):
		"""Validate max_clients and update current_clients"""
		if self.max_clients not in [1, 2, 3]:
			frappe.throw(_("An assistant can take 1, 2 or 3 clients."))
		
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
			frappe.throw(
				_("This assistant has {0} active clients, more than the maximum of {1}.").format(
					self.current_clients, self.max_clients
				)
			)
	
	def on_update(self):
		"""Update current clients after save"""
		self.update_current_clients()

