# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class WalkIn(Document):
	def before_insert(self):
		"""Set created_at timestamp"""
		if not self.created_at:
			self.created_at = now_datetime()
	
	def validate(self):
		"""Validate walk-in data"""
		if self.status == "assigned" and not self.assigned_appointment:
			frappe.throw("Assigned appointment is required when status is 'assigned'")
		
		# If assigned_appointment is set, verify it exists
		if self.assigned_appointment:
			if not frappe.db.exists("Appointment", self.assigned_appointment):
				frappe.throw("Assigned appointment does not exist")


