# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from appointment.scheduler.availability import validate_availability_hierarchy


class Provider(Document):
	def before_save(self):
		"""Auto-populate provider_name if not set or empty"""
		if not self.provider_name or self.provider_name.strip() == "":
			self.provider_name = self.get_display_name()
		
		# Auto-link User Appointment Availability if not set
		if not self.user_appointment_availability and self.email:
			# Find User Appointment Availability by user email
			availability = frappe.db.get_value("User Appointment Availability", {"user": self.email}, "name")
			if availability:
				self.user_appointment_availability = availability
		
		# Validate availability hierarchy if custom hours are set
		# Safely check if opening_hours exists and has data, and use_default_hours is not set
		opening_hours = getattr(self, 'opening_hours', [])
		use_default_hours = getattr(self, 'use_default_hours', 1)  # Default to True if not set
		if opening_hours and not use_default_hours:
			self.validate_availability()
	
	def validate_availability(self):
		"""Validate that Provider hours are within Service and Location hours."""
		if not self.locations:
			return  # No locations, skip validation
		
		# Get first location (for now, validate against first location)
		# TODO: Support multiple locations
		location_name = self.locations[0].location if self.locations else None
		if not location_name:
			return
		
		# Get service from EventTypes for this provider
		event_types = frappe.get_all(
			"EventType",
			filters={"provider": self.name, "location": location_name, "is_active": 1},
			fields=["service"],
			limit=1
		)
		
		service_name = event_types[0].service if event_types else None
		
		# Validate hierarchy
		is_valid, error_msg = validate_availability_hierarchy(
			location_name=location_name,
			service_name=service_name,
			provider_name=self.name
		)
		
		if not is_valid:
			frappe.throw(_(error_msg or "Provider availability must be within Service and Location hours."))
	
	def get_display_name(self):
		"""
		Get the display name for the provider based on priority:
		1. Display Name (if provided)
		2. Full Name (if provided)
		3. Linked User's full name
		4. Linked User's email (fallback)
		"""
		# Priority 1: Display Name
		if self.display_name:
			return self.display_name
		
		# Priority 2: Full Name
		if self.full_name:
			return self.full_name
		
		# Priority 3 & 4: Get from linked User
		if self.user:
			user_doc = frappe.get_cached_doc("User", self.user)
			if user_doc.full_name:
				return user_doc.full_name
			return user_doc.email
		
		# Fallback: Use email if available
		if self.email:
			return self.email
		
		return "Provider"
	
	def on_update(self):
		"""Sync booking URLs when provider is updated"""
		# Skip if we're already syncing to prevent recursion
		if frappe.flags.syncing_booking_urls:
			return
		
		try:
			from appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider
			sync_booking_urls_for_provider(self.name)
		except Exception as e:
			# Don't fail the save if URL sync fails
			frappe.log_error(str(e), "Provider: Sync Booking URLs Error")
