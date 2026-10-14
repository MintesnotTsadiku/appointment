# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class Organization(Document):
	def validate(self):
		self.validate_slug()

	def validate_slug(self):
		"""A new or changed slug must not be another business's address.

		Organization slugs share one address space with website slugs, former addresses and provider page
		addresses (`/<slug>` resolves to one of them). Every path that sets the slug (setup, import,
		onboarding, Desk) passes here. An unchanged slug is never checked again, so existing slugs stay valid.
		"""
		if not self.slug or (not self.is_new() and not self.has_value_changed("slug")):
			return
		from appointment.growth.short_links import ORGANIZATION_TAKEN, organization_slug_taken

		if organization_slug_taken(self.slug, self.name):
			frappe.throw(_(ORGANIZATION_TAKEN).format(self.slug), title=_("Address already used"))

	def on_update(self):
		"""Sync booking URLs when organization is updated"""
		# Skip if we're already syncing to prevent recursion
		if frappe.flags.syncing_booking_urls:
			return
		
		# Skip during demo data generation to avoid link validation errors
		# Booking URLs will be synced later after all services/providers are created
		if getattr(frappe.flags, 'skip_booking_url_sync', False):
			return
		
		try:
			from appointment.scheduler.booking_url_manager import sync_booking_urls_for_organization
			sync_booking_urls_for_organization(self.name)
		except Exception as e:
			# Don't fail the save if URL sync fails
			frappe.log_error(str(e), "Organization: Sync Booking URLs Error")
