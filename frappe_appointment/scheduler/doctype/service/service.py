# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe_appointment.scheduler.availability import validate_availability_hierarchy


class Service(Document):
	def before_save(self):
		"""Validate availability hierarchy if custom hours are set."""
		if self.opening_hours and not self.use_default_hours:
			self.validate_availability()
	
	def validate_availability(self):
		"""Validate that Service hours are within Location hours."""
		# Get location from EventTypes for this service
		event_types = frappe.get_all(
			"EventType",
			filters={"service": self.name, "is_active": 1},
			fields=["location"],
			limit=1
		)
		
		location_name = event_types[0].location if event_types else None
		if not location_name:
			return  # No location linked, skip validation
		
		# Validate hierarchy
		is_valid, error_msg = validate_availability_hierarchy(
			location_name=location_name,
			service_name=self.name
		)
		
		if not is_valid:
			frappe.throw(_(error_msg or "Service availability must be within Location hours."))
	
	def on_update(self):
		"""Sync booking URLs for related providers/organizations"""
		# Skip if we're already syncing to prevent recursion
		if frappe.flags.syncing_booking_urls:
			return
		
		try:
			from frappe_appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider, sync_booking_urls_for_organization
			
			# Sync for organization if linked and exists
			if self.organization and frappe.db.exists("Organization", self.organization):
				sync_booking_urls_for_organization(self.organization)
			
			# Sync for providers linked via Service Provider child table
			if hasattr(self, 'service_providers') and self.service_providers:
				for service_provider in self.service_providers:
					if service_provider.provider and service_provider.status == "Active":
						try:
							sync_booking_urls_for_provider(service_provider.provider)
						except Exception:
							# Skip individual provider sync errors
							pass
		except Exception as e:
			# Don't fail the save if URL sync fails
			frappe.log_error(str(e), "Service: Sync Booking URLs Error")