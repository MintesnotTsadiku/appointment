# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime


class Task(Document):
	def before_insert(self):
		"""Set defaults before inserting"""
		if not self.created_by:
			self.created_by = frappe.session.user
		if not self.created_at:
			self.created_at = datetime.now()
		if not self.status:
			self.status = "requested"
		if not self.priority:
			self.priority = "medium"
	
	def before_save(self):
		"""Update timestamps and validate"""
		self.updated_at = datetime.now()
		self.validate_dependencies()
	
	def validate_dependencies(self):
		"""Validate that dependencies don't create circular references"""
		if not self.dependencies:
			return
		
		dependency_names = [dep.depends_on_task for dep in self.dependencies if dep.depends_on_task]
		
		# Check for self-reference
		if self.name and self.name in dependency_names:
			frappe.throw("A task cannot depend on itself")
		
		# Check for circular dependencies (basic check - can be enhanced)
		for dep_name in dependency_names:
			if self.name:
				# Check if the dependency task has this task as a dependency
				dep_task = frappe.get_doc("Task", dep_name)
				if dep_task.dependencies:
					dep_dependencies = [d.depends_on_task for d in dep_task.dependencies if d.depends_on_task]
					if self.name in dep_dependencies:
						frappe.throw(f"Circular dependency detected: Task {self.name} and {dep_name} depend on each other")
	
	def on_update(self):
		"""Called when task is updated"""
		# Auto-update status based on dependencies
		self.check_dependency_completion()
	
	def check_dependency_completion(self):
		"""Check if all dependencies are completed"""
		if not self.dependencies or self.status == "completed":
			return
		
		incomplete_dependencies = []
		for dep in self.dependencies:
			if dep.depends_on_task:
				dep_status = frappe.db.get_value("Task", dep.depends_on_task, "status")
				if dep_status != "completed":
					incomplete_dependencies.append(dep.depends_on_task)
		
		# If task is in_progress but has incomplete dependencies, reset to assigned
		if incomplete_dependencies and self.status == "in_progress":
			self.status = "assigned"
			frappe.msgprint(
				f"Cannot start task: {len(incomplete_dependencies)} dependency(ies) not completed",
				indicator="orange"
			)

