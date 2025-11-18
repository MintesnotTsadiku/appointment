# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Provider(Document):
	def before_save(self):
		"""Auto-populate provider_name if not set or empty"""
		if not self.provider_name or self.provider_name.strip() == "":
			self.provider_name = self.get_display_name()
	
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
