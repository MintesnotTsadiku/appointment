# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class EventType(Document):
	def validate(self):
		"""Validate that linked Provider, Service, and Location exist"""
		if self.provider and not frappe.db.exists("Provider", self.provider):
			# Try to find provider by provider_name (display name)
			matching_providers = frappe.get_all("Provider",
				filters={"provider_name": self.provider},
				fields=["name"],
				limit=1
			)
			if matching_providers:
				# Auto-fix: use the correct document name
				self.provider = matching_providers[0].name
			else:
				frappe.throw(f"EventType {self.name} has invalid provider: {self.provider}. Provider does not exist.")
		
		if self.service and not frappe.db.exists("Service", self.service):
			frappe.throw(f"EventType {self.name} has invalid service: {self.service}. Service does not exist.")
		
		if self.location and not frappe.db.exists("Location", self.location):
			frappe.throw(f"EventType {self.name} has invalid location: {self.location}. Location does not exist.")
	
	def on_update(self):
		"""Sync booking URLs when event types change"""
		# Skip if we're already syncing to prevent recursion
		if frappe.flags.syncing_booking_urls:
			return
		
		try:
			from appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider, sync_booking_urls_for_organization
			
			# Sync for provider
			if self.provider:
				sync_booking_urls_for_provider(self.provider)
			
			# Sync for organization if service is linked to one
			if self.service and frappe.db.exists("Service", self.service):
				service = frappe.get_doc("Service", self.service)
				if service.organization and frappe.db.exists("Organization", service.organization):
					sync_booking_urls_for_organization(service.organization)
		except Exception as e:
			# Don't fail the save if URL sync fails
			frappe.log_error(str(e), "EventType: Sync Booking URLs Error")
