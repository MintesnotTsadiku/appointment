# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime


class ConfigurationSettings(Document):
	def validate(self):
		"""Handle button clicks during validation"""
		# Generate Demo Data
		if self.get('btn_generate_demo_data'):
			self.btn_generate_demo_data = 0
			frappe.flags.generate_demo_data = True
		
		# Delete Demo Data
		if self.get('btn_delete_demo_data'):
			self.btn_delete_demo_data = 0
			frappe.flags.delete_demo_data = True
	
	def on_update(self):
		"""Execute actions after save"""
		if frappe.flags.generate_demo_data:
			frappe.flags.generate_demo_data = False
			try:
				self.generate_selected_data()
			except Exception as e:
				frappe.log_error(str(e), "Demo Data Generation Error")
				frappe.throw(str(e))
		
		if frappe.flags.delete_demo_data:
			frappe.flags.delete_demo_data = False
			try:
				self.delete_selected_data()
			except Exception as e:
				frappe.log_error(str(e), "Demo Data Deletion Error")
				frappe.throw(str(e))
	
	def log(self, message):
		"""Append to generation log"""
		timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
		log_entry = f"{timestamp} - {message}\n"
		current_log = frappe.db.get_value('Configuration Settings', self.name, 'demo_generation_log') or ""
		new_log = current_log + log_entry
		# Update in database directly to avoid recursion and concurrency issues
		# Use update_modified=False to prevent timestamp change
		frappe.db.set_value('Configuration Settings', self.name, 'demo_generation_log', new_log, update_modified=False)
		frappe.db.commit()
		# Update local copy
		self.demo_generation_log = new_log
	
	def generate_selected_data(self):
		"""Generate selected demo data types in correct order"""
		try:
			from frappe_appointment.demo_data import (
				generate_organizations, 
				generate_providers,
				generate_services,
				generate_locations,
				generate_appointments
			)
			
			self.log("🚀 Starting demo data generation...")
			generated = []
			
			# Generate in dependency order
			if self.include_organizations:
				count = self.demo_org_count or 3
				result = generate_organizations(count)
				self.log(f"✓ Generated {count} organizations")
				generated.append(f"{count} organizations")
			
			if self.include_providers:
				count = self.demo_provider_count or 5
				result = generate_providers(count)
				self.log(f"✓ Generated {count} providers")
				generated.append(f"{count} providers")
			
			if self.include_services:
				count = self.demo_service_count or 5
				result = generate_services(count)
				self.log(f"✓ Generated {count} services")
				generated.append(f"{count} services")
			
			if self.include_locations:
				count = self.demo_location_count or 3
				result = generate_locations(count)
				self.log(f"✓ Generated {count} locations")
				generated.append(f"{count} locations")
			
			if self.include_appointments:
				count = self.demo_appointment_count or 10
				days = self.demo_date_range_days or 14
				result = generate_appointments(count, days)
				event_types_count = result.get("event_types", 0)
				appointments_count = result.get("appointments", 0)
				booking_events_count = result.get("booking_events", 0)
				self.log(f"✓ Generated {event_types_count} event types, {appointments_count} appointments, and {booking_events_count} booking events (last {days} days)")
				generated.append(f"{event_types_count} event types, {appointments_count} appointments, {booking_events_count} booking events")
			
			# Generate Policies (Sprint 2) - after services, locations, and providers are created
			# Check if we have the necessary data to create policies
			services_exist = frappe.db.count("Service") > 0
			locations_exist = frappe.db.count("Location") > 0
			providers_exist = frappe.db.count("Provider") > 0
			
			if services_exist or locations_exist or providers_exist:
				try:
					from frappe_appointment.demo_data_policies import generate_policies_for_existing_data
					result = generate_policies_for_existing_data()
					policy_count = result.get("count", 0)
					if policy_count > 0:
						self.log(f"✓ Generated {policy_count} policies")
						generated.append(f"{policy_count} policies")
				except Exception as e:
					# Don't fail entire generation if policies fail
					frappe.log_error(f"Policy generation failed: {str(e)}", "Demo Data: Policy Generation Error")
					self.log(f"⚠ Policy generation skipped: {str(e)}")
			
			if generated:
				self.log("✅ Generation complete!")
				summary = ", ".join(generated)
				frappe.msgprint(f"Successfully generated: {summary}", alert=True, indicator="green")
			else:
				frappe.msgprint("No data types selected. Please check at least one option.", alert=True, indicator="orange")
		
		except Exception as e:
			frappe.log_error(str(e), "Demo Data: Generation Error")
			self.log(f"✗ Generation failed: {str(e)}")
			frappe.throw(f"Failed to generate demo data: {str(e)}")
	
	def delete_selected_data(self):
		"""Delete selected demo data types in reverse order"""
		try:
			from frappe_appointment.demo_data import (
				clear_appointments,
				clear_providers,
				clear_organizations
			)
			
			self.log("🗑️ Starting demo data deletion...")
			deleted = []
			
			# Delete in reverse dependency order
			if self.include_appointments:
				result = clear_appointments()
				self.log("✓ Deleted demo appointments")
				deleted.append("appointments")
			
			# Note: Locations and Services deletion will be implemented
			# For now, they would be handled by the clear functions
			
			if self.include_providers:
				result = clear_providers()
				self.log("✓ Deleted demo providers")
				deleted.append("providers")
			
			if self.include_organizations:
				result = clear_organizations()
				self.log("✓ Deleted demo organizations")
				deleted.append("organizations")
			
			if deleted:
				self.log("✅ Deletion complete!")
				summary = ", ".join(deleted)
				frappe.msgprint(f"Successfully deleted: {summary}", alert=True, indicator="orange")
			else:
				frappe.msgprint("No data types selected. Please check at least one option.", alert=True, indicator="orange")
		
		except Exception as e:
			frappe.log_error(str(e), "Demo Data: Deletion Error")
			self.log(f"✗ Deletion failed: {str(e)}")
			frappe.throw(f"Failed to delete demo data: {str(e)}")
