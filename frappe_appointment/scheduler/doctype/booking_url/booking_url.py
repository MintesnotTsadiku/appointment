# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import re


class BookingURL(Document):
	def validate(self):
		"""Auto-calculate full_url from slug and url_type"""
		if self.slug and self.url_type:
			# Sanitize slug to ensure it's URL-safe
			self.slug = self._sanitize_slug(self.slug)
			
			# Calculate full URL based on type
			if self.url_type == "personal":
				self.full_url = f"/schedule/in/{self.slug}"
			elif self.url_type == "organization":
				# For organization, we need the org slug from parent
				# This will be set by the manager function
				if not self.full_url:
					self.full_url = f"/schedule/org/{self.slug}"
			elif self.url_type == "service":
				# Service URLs can be personal or organization-based
				# This will be set by the manager function based on context
				if not self.full_url:
					self.full_url = f"/schedule/in/{self.slug}"
			elif self.url_type == "provider":
				# Provider-specific link within organization
				if not self.full_url:
					self.full_url = f"/schedule/org/{self.slug}"
			elif self.url_type == "location":
				# Location-specific booking link
				if not self.full_url:
					self.full_url = f"/schedule/in/{self.slug}"
	
	def _sanitize_slug(self, slug):
		"""Ensure slug is URL-safe"""
		# Remove special characters, keep alphanumeric, hyphens, and dots
		slug = re.sub(r'[^a-zA-Z0-9\-\.]', '-', slug)
		# Remove multiple consecutive hyphens
		slug = re.sub(r'-+', '-', slug)
		# Remove leading/trailing hyphens
		slug = slug.strip('-')
		return slug.lower()
