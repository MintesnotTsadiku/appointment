# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime


class TaskProject(Document):
	def before_insert(self):
		"""Set defaults before inserting"""
		if not self.created_by:
			self.created_by = frappe.session.user
		if not self.created_at:
			self.created_at = datetime.now()
		if not self.status:
			self.status = "Planning"
	
	def on_update(self):
		"""Calculate progress when tasks are updated"""
		self.calculate_progress()
	
	def calculate_progress(self):
		"""Calculate project progress based on completed tasks"""
		tasks = frappe.get_all(
			"Task",
			filters={"project": self.name},
			fields=["status"]
		)
		
		if not tasks:
			self.progress = 0
			return
		
		completed = len([t for t in tasks if t.status == "Completed"])
		total = len(tasks)
		self.progress = int((completed / total) * 100) if total > 0 else 0
		
		# Auto-update status based on progress
		if self.progress == 100 and self.status != "Completed":
			self.status = "Completed"
		elif self.progress > 0 and self.status == "Planning":
			self.status = "In Progress"

