# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
import json
from datetime import datetime, timezone
from frappe.model.document import Document
from frappe.utils import now_datetime


class WalkIn(Document):
	def before_save(self):
		old = self.get_doc_before_save()
		events = json.loads(old.workflow_events or "[]") if old else []
		self.assigned_at = old.assigned_at if old else None
		if old:self.created_at = old.created_at
		if not old or old.status != self.status or old.assigned_appointment != self.assigned_appointment:
			stamp = datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
			events.append(dict(type=self.status, timestamp=stamp, actor=frappe.session.user,
				walk_in=self.name, booking=self.assigned_appointment, sequence=len(events)))
			if self.status == "assigned":
				self.assigned_at = stamp
		self.workflow_events = json.dumps(events)
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
			from appointment.scheduler.booking_access import require_access
			appointment = frappe.get_doc("Appointment", self.assigned_appointment)
			require_access(appointment)
			if self.location and appointment.location != self.location:
				frappe.throw("Assigned appointment must belong to this walk-in location.")





