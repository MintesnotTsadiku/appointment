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
				generate_appointments,
				link_providers_to_services,
				generate_event_types,
				fix_location_addresses,
				add_available_durations_to_providers
			)
			
			self.log("🚀 Starting demo data generation...")
			generated = []
			
			# Generate in dependency order
			if self.include_organizations:
				count = self.demo_org_count or 3
				result = generate_organizations(count)
				self.log(f"✓ Generated {count} organizations")
				generated.append(f"{count} organizations")
				frappe.db.commit()
			
			if self.include_providers:
				count = self.demo_provider_count or 5
				result = generate_providers(count)
				self.log(f"✓ Generated {count} providers")
				generated.append(f"{count} providers")
				frappe.db.commit()
			
			if self.include_services:
				count = self.demo_service_count or 5
				result = generate_services(count)
				self.log(f"✓ Generated {count} services")
				generated.append(f"{count} services")
				frappe.db.commit()
				
				# CRITICAL: Ensure all services have providers linked
				self.log("🔗 Linking providers to services...")
				link_result = link_providers_to_services()
				linked_count = link_result.get("count", 0)
				if linked_count > 0:
					self.log(f"✓ Linked {linked_count} providers to services")
				frappe.db.commit()
			
			if self.include_locations:
				count = self.demo_location_count or 3
				result = generate_locations(count)
				self.log(f"✓ Generated {count} locations")
				generated.append(f"{count} locations")
				frappe.db.commit()
				
				# Fix any locations with missing addresses
				self.log("🔧 Fixing location addresses...")
				fix_result = fix_location_addresses()
				fixed_count = fix_result.get("count", 0)
				if fixed_count > 0:
					self.log(f"✓ Fixed {fixed_count} location addresses")
				frappe.db.commit()
			
			# CRITICAL: Generate EventTypes BEFORE appointments
			# This ensures all services have EventTypes with correct provider links
			if self.include_appointments:
				# First, ensure providers have available durations
				self.log("⏱️ Adding available durations to providers...")
				duration_result = add_available_durations_to_providers()
				duration_count = duration_result.get("count", 0)
				if duration_count > 0:
					self.log(f"✓ Added durations to {duration_count} providers")
				frappe.db.commit()
				
				# Generate EventTypes for all services and providers
				self.log("📅 Generating EventTypes...")
				eventtype_result = generate_event_types()
				eventtype_count = eventtype_result.get("count", 0)
				if eventtype_count > 0:
					self.log(f"✓ Generated {eventtype_count} EventTypes")
				frappe.db.commit()
			
			if self.include_appointments:
				count = self.demo_appointment_count or 10
				days = self.demo_date_range_days or 14
				result = generate_appointments(count, days)
				appointments_count = result.get("appointments", 0)
				booking_events_count = result.get("booking_events", 0)
				self.log(f"✓ Generated {appointments_count} appointments and {booking_events_count} booking events (last {days} days)")
				generated.append(f"{appointments_count} appointments, {booking_events_count} booking events")
				frappe.db.commit()
			
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
