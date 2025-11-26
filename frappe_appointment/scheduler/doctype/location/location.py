# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Location(Document):
	def on_update(self):
		"""Sync booking URLs for related providers/organizations"""
		# Skip if we're already syncing to prevent recursion
		if frappe.flags.syncing_booking_urls:
			return
		
		try:
			from frappe_appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider, sync_booking_urls_for_organization
			
			# Get providers linked to this location
			providers = frappe.get_all("Provider Location",
				filters={"location": self.name},
				fields=["parent"]
			)
			
			for provider_row in providers:
				sync_booking_urls_for_provider(provider_row.parent)
			
			# Sync for organization if this is an organization branch
			if self.organization:
				sync_booking_urls_for_organization(self.organization)
		except Exception as e:
			# Don't fail the save if URL sync fails
			frappe.log_error(str(e), "Location: Sync Booking URLs Error")
