# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Organization(Document):
	def on_update(self):
		"""Sync booking URLs when organization is updated"""
		# Skip if we're already syncing to prevent recursion
		if frappe.flags.syncing_booking_urls:
			return
		
		try:
			from frappe_appointment.scheduler.booking_url_manager import sync_booking_urls_for_organization
			sync_booking_urls_for_organization(self.name)
		except Exception as e:
			# Don't fail the save if URL sync fails
			frappe.log_error(str(e), "Organization: Sync Booking URLs Error")
