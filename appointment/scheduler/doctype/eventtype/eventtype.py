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
	
		if not self.provider:
			self._validate_resource_offering()

		if self.service and self.location and self.provider:
			org = frappe.db.get_value("Service", self.service, "organization")
			if org and (frappe.db.get_value("Location", self.location, "organization") != org or not frappe.db.exists("Provider Organization", {"parent": self.provider, "parenttype": "Provider", "organization": org, "status": "Active"})):
				frappe.throw("Offering links must belong to the same business", frappe.PermissionError)

	def _validate_resource_offering(self):
		"""An offering without a provider is a resource-only offering for one resource."""
		if not self.resource:
			frappe.throw("An offering needs a provider, or a resource when its service is booked without staff.")
		service = frappe.db.get_value("Service", self.service, ["organization", "resource_only"], as_dict=True)
		resource = frappe.db.get_value("Resource", self.resource, ["organization", "location"], as_dict=True)
		if not service or not service.resource_only:
			frappe.throw("Only a service booked without staff can have an offering without a provider.")
		if not resource or resource.organization != service.organization or resource.location != self.location:
			frappe.throw("Offering links must belong to the same business", frappe.PermissionError)

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
