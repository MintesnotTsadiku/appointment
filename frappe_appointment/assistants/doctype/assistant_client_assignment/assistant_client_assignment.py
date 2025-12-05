# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class AssistantClientAssignment(Document):
	def validate(self):
		"""Validate assignment constraints"""
		self.validate_assistant_capacity()
		self.validate_assignment_type()
		self.validate_unique_assignment()
	
	def validate_assistant_capacity(self):
		"""Check if assistant can take on this client"""
		if not self.assistant:
			return
		
		va_profile = frappe.get_doc("VA Profile", self.assistant)
		active_assignments = frappe.get_all(
			"Assistant Client Assignment",
			filters={
				"assistant": self.assistant,
				"status": "active",
				"name": ["!=", self.name or ""]
			},
			fields=["name"]
		)
		
		current_count = len(active_assignments)
		
		# If this is a new active assignment, increment count
		if self.status == "active" and (not self.name or frappe.db.get_value("Assistant Client Assignment", self.name, "status") != "active"):
			current_count += 1
		
		if current_count > va_profile.max_clients:
			frappe.throw(
				f"Assistant {va_profile.user} has reached maximum client capacity ({va_profile.max_clients}). "
				f"Current active assignments: {current_count}"
			)
	
	def validate_assignment_type(self):
		"""Validate assignment type matches assistant's capacity"""
		if not self.assistant:
			return
		
		va_profile = frappe.get_doc("VA Profile", self.assistant)
		
		# Check if assignment type is compatible with assistant's max_clients
		type_max = {
			"dedicated": 1,
			"shared_2": 2,
			"shared_3": 3
		}
		
		expected_max = type_max.get(self.assignment_type, 1)
		
		if va_profile.max_clients < expected_max:
			frappe.throw(
				f"Assistant can handle max {va_profile.max_clients} client(s), but assignment type '{self.assignment_type}' requires {expected_max}"
			)
	
	def validate_unique_assignment(self):
		"""Ensure one active assignment per assistant-client pair"""
		if not self.assistant or not self.client_profile:
			return
		
		existing = frappe.db.exists(
			"Assistant Client Assignment",
			{
				"assistant": self.assistant,
				"client_profile": self.client_profile,
				"status": "active",
				"name": ["!=", self.name or ""]
			}
		)
		
		if existing:
			frappe.throw("An active assignment already exists for this assistant-client pair")
	
	def on_update(self):
		"""Update related records after save"""
		self.update_va_profile()
		self.update_client_profile()
	
	def update_va_profile(self):
		"""Update VA Profile's current_clients count"""
		if self.assistant:
			va_profile = frappe.get_doc("VA Profile", self.assistant)
			va_profile.update_current_clients()
			va_profile.save(ignore_permissions=True)
	
	def update_client_profile(self):
		"""Update Client Profile's assigned_assistant and assignment_type"""
		if self.client_profile:
			client = frappe.get_doc("Client Profile", self.client_profile)
			if self.status == "active":
				client.assigned_assistant = self.assistant
				client.assignment_type = self.assignment_type
			elif self.status in ["paused", "ended"]:
				client.assigned_assistant = None
				client.assignment_type = None
			client.save(ignore_permissions=True)

