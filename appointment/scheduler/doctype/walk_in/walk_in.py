# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe import _
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
		self.validate_owner()
		if self.status == "assigned" and not self.assigned_appointment:
			frappe.throw(_("Assigned appointment is required when status is 'assigned'"))
		
		# If assigned_appointment is set, verify it exists
		if self.assigned_appointment:
			if not frappe.db.exists("Appointment", self.assigned_appointment):
				frappe.throw(_("Assigned appointment does not exist"))
			from appointment.scheduler.booking_access import require_access
			appointment = frappe.get_doc("Appointment", self.assigned_appointment)
			require_access(appointment)
			if self.location and appointment.location != self.location:
				frappe.throw(_("Assigned appointment must belong to this walk-in location."))

	def validate_owner(self):
		"""An organization's walk-in belongs to its location's organization; an independent provider's to `independent_provider`.

		Exactly one of the two owns it, and everything the walk-in names belongs to that owner.
		"""
		location = frappe.db.get_value("Location", self.location, ["organization", "independent_provider"], as_dict=True) if self.location else None
		if not self.independent_provider and location and not location.organization:
			self.independent_provider = location.independent_provider
		old = self.get_doc_before_save()
		# A walk-in saved before the field existed takes its owner from its location.
		inferred = not (old and old.independent_provider) and location and self.independent_provider == location.independent_provider
		if old and (old.independent_provider or None) != (self.independent_provider or None) and not inferred:
			frappe.throw(_("The independent business owner cannot be changed."), frappe.PermissionError)
		provider = self.independent_provider
		if not provider:
			return
		owner = frappe.db.get_value("Provider", provider, ["organization", "is_active"], as_dict=True)
		belongs = {
			"location": not location or (not location.organization and location.independent_provider == provider),
			"service": not self.service_requested or owned_by(provider, "Service", self.service_requested),
			"provider": not self.provider_preferred or self.provider_preferred == provider,
			"customer": not self.customer or owned_by(provider, "Customer Profile", self.customer),
		}
		if not owner or owner.organization or frappe.db.exists("Provider Organization", {"parent": provider, "parenttype": "Provider"}) or not all(belongs.values()):
			frappe.throw(_("A walk-in must belong to exactly one business."), frappe.PermissionError)


def owned_by(provider, doctype, name):
	"""True when an independent provider, and no organization, owns this record."""
	row = frappe.db.get_value(doctype, name, ["independent_provider", "organization"], as_dict=True)
	return bool(row and row.independent_provider == provider and not row.organization)
