# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from datetime import datetime


class ConfigurationSettings(Document):
	def onload(self):
		"""Set default values for Assistants & Tasks checkboxes and counts if not set"""
		# Set all Assistants & Tasks checkboxes to checked by default if not already set
		if self.get('include_assistant_skills') is None:
			self.include_assistant_skills = 1
		if self.get('demo_assistant_skill_count') is None:
			self.demo_assistant_skill_count = 10
		
		if self.get('include_task_categories') is None:
			self.include_task_categories = 1
		if self.get('demo_task_category_count') is None:
			self.demo_task_category_count = 5
		
		if self.get('include_task_templates') is None:
			self.include_task_templates = 1
		if self.get('demo_task_template_count') is None:
			self.demo_task_template_count = 3
		
		if self.get('include_va_profiles') is None:
			self.include_va_profiles = 1
		if self.get('demo_va_profile_count') is None:
			self.demo_va_profile_count = 5
		
		if self.get('include_client_profiles') is None:
			self.include_client_profiles = 1
		if self.get('demo_client_profile_count') is None:
			self.demo_client_profile_count = 10
		
		if self.get('include_assignments') is None:
			self.include_assignments = 1
		if self.get('demo_assignment_count') is None:
			self.demo_assignment_count = 8
		
		if self.get('include_task_projects') is None:
			self.include_task_projects = 1
		if self.get('demo_task_project_count') is None:
			self.demo_task_project_count = 5
		
		if self.get('include_tasks') is None:
			self.include_tasks = 1
		if self.get('demo_task_count') is None:
			self.demo_task_count = 20
	
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
		
		# Generate Assistants & Tasks Demo Data
		if self.get('btn_generate_at_demo_data'):
			self.btn_generate_at_demo_data = 0
			frappe.flags.generate_at_demo_data = True
		
		# Delete Assistants & Tasks Demo Data
		if self.get('btn_delete_at_demo_data'):
			self.btn_delete_at_demo_data = 0
			frappe.flags.delete_at_demo_data = True
	
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
		
		if frappe.flags.generate_at_demo_data:
			frappe.flags.generate_at_demo_data = False
			try:
				self.generate_assistants_tasks_demo_data()
			except Exception as e:
				frappe.log_error(str(e), "Assistants & Tasks Demo Data: Generation Error")
				frappe.throw(str(e))
		
		if frappe.flags.delete_at_demo_data:
			frappe.flags.delete_at_demo_data = False
			try:
				self.delete_assistants_tasks_demo_data()
			except Exception as e:
				frappe.log_error(str(e), "Assistants & Tasks Demo Data: Deletion Error")
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
	
	def at_log(self, message):
		"""Append to Assistants & Tasks generation log"""
		timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
		log_entry = f"{timestamp} - {message}\n"
		current_log = frappe.db.get_value('Configuration Settings', self.name, 'at_demo_generation_log') or ""
		new_log = current_log + log_entry
		# Update in database directly to avoid recursion and concurrency issues
		# Use update_modified=False to prevent timestamp change
		frappe.db.set_value('Configuration Settings', self.name, 'at_demo_generation_log', new_log, update_modified=False)
		frappe.db.commit()
		# Update local copy
		self.at_demo_generation_log = new_log
	
	def generate_selected_data(self):
		"""Generate selected demo data types in correct order"""
		try:
			from appointment.demo_data import (
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
					from appointment.demo_data_policies import generate_policies_for_existing_data
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
			from appointment.demo_data import (
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
	
	def generate_assistants_tasks_demo_data(self):
		"""Generate selected Assistants & Tasks demo data types in correct order"""
		try:
			from appointment.demo_data_assistants_tasks import (
				generate_assistant_skills,
				generate_task_categories,
				generate_task_templates,
				generate_va_profiles,
				generate_client_profiles,
				generate_assignments,
				generate_task_projects,
				generate_tasks
			)
			
			self.at_log("🚀 Starting Assistants & Tasks demo data generation...")
			generated = []
			
			# Generate in dependency order
			if self.include_assistant_skills:
				count = self.demo_assistant_skill_count or 10
				result = generate_assistant_skills(count)
				self.at_log(f"✓ Generated {count} assistant skills")
				generated.append(f"{count} assistant skills")
				frappe.db.commit()
			
			if self.include_task_categories:
				count = self.demo_task_category_count or 5
				result = generate_task_categories(count)
				self.at_log(f"✓ Generated {count} task categories")
				generated.append(f"{count} task categories")
				frappe.db.commit()
			
			if self.include_task_templates:
				count = self.demo_task_template_count or 3
				result = generate_task_templates(count)
				self.at_log(f"✓ Generated {count} task templates")
				generated.append(f"{count} task templates")
				frappe.db.commit()
			
			if self.include_va_profiles:
				count = self.demo_va_profile_count or 5
				result = generate_va_profiles(count)
				self.at_log(f"✓ Generated {count} VA profiles")
				generated.append(f"{count} VA profiles")
				frappe.db.commit()
			
			if self.include_client_profiles:
				count = self.demo_client_profile_count or 10
				result = generate_client_profiles(count)
				self.at_log(f"✓ Generated {count} client profiles")
				generated.append(f"{count} client profiles")
				frappe.db.commit()
			
			if self.include_assignments:
				count = self.demo_assignment_count or 8
				result = generate_assignments(count)
				self.at_log(f"✓ Generated {count} assignments")
				generated.append(f"{count} assignments")
				frappe.db.commit()
			
			if self.include_task_projects:
				count = self.demo_task_project_count or 5
				result = generate_task_projects(count)
				self.at_log(f"✓ Generated {count} task projects")
				generated.append(f"{count} task projects")
				frappe.db.commit()
			
			if self.include_tasks:
				count = self.demo_task_count or 20
				result = generate_tasks(count)
				self.at_log(f"✓ Generated {count} tasks")
				generated.append(f"{count} tasks")
				frappe.db.commit()
			
			if generated:
				self.at_log("✅ Generation complete!")
				summary = ", ".join(generated)
				frappe.msgprint(f"Successfully generated: {summary}", alert=True, indicator="green")
			else:
				frappe.msgprint("No data types selected. Please check at least one option.", alert=True, indicator="orange")
		
		except Exception as e:
			frappe.log_error(str(e), "Assistants & Tasks Demo Data: Generation Error")
			self.at_log(f"✗ Generation failed: {str(e)}")
			frappe.throw(f"Failed to generate Assistants & Tasks demo data: {str(e)}")
	
	def delete_assistants_tasks_demo_data(self):
		"""Delete selected Assistants & Tasks demo data types in reverse order"""
		try:
			from appointment.demo_data_assistants_tasks import (
				clear_tasks,
				clear_task_projects,
				clear_assignments,
				clear_client_profiles,
				clear_va_profiles,
				clear_task_templates,
				clear_task_categories,
				clear_assistant_skills
			)
			
			self.at_log("🗑️ Starting Assistants & Tasks demo data deletion...")
			deleted = []
			
			# Delete in reverse dependency order
			if self.include_tasks:
				result = clear_tasks()
				count = result.get("count", 0)
				if count > 0:
					self.at_log(f"✓ Deleted {count} tasks")
					deleted.append(f"{count} tasks")
				frappe.db.commit()
			
			if self.include_task_projects:
				result = clear_task_projects()
				count = result.get("count", 0)
				if count > 0:
					self.at_log(f"✓ Deleted {count} task projects")
					deleted.append(f"{count} task projects")
				frappe.db.commit()
			
			if self.include_assignments:
				result = clear_assignments()
				count = result.get("count", 0)
				if count > 0:
					self.at_log(f"✓ Deleted {count} assignments")
					deleted.append(f"{count} assignments")
				frappe.db.commit()
			
			if self.include_client_profiles:
				result = clear_client_profiles()
				count = result.get("count", 0)
				if count > 0:
					self.at_log(f"✓ Deleted {count} client profiles")
					deleted.append(f"{count} client profiles")
				frappe.db.commit()
			
			if self.include_va_profiles:
				result = clear_va_profiles()
				count = result.get("count", 0)
				if count > 0:
					self.at_log(f"✓ Deleted {count} VA profiles")
					deleted.append(f"{count} VA profiles")
				frappe.db.commit()
			
			if self.include_task_templates:
				result = clear_task_templates()
				count = result.get("count", 0)
				if count > 0:
					self.at_log(f"✓ Deleted {count} task templates")
					deleted.append(f"{count} task templates")
				frappe.db.commit()
			
			if self.include_task_categories:
				result = clear_task_categories()
				count = result.get("count", 0)
				if count > 0:
					self.at_log(f"✓ Deleted {count} task categories")
					deleted.append(f"{count} task categories")
				frappe.db.commit()
			
			if self.include_assistant_skills:
				result = clear_assistant_skills()
				count = result.get("count", 0)
				if count > 0:
					self.at_log(f"✓ Deleted {count} assistant skills")
					deleted.append(f"{count} assistant skills")
				frappe.db.commit()
			
			if deleted:
				self.at_log("✅ Deletion complete!")
				summary = ", ".join(deleted)
				frappe.msgprint(f"Successfully deleted: {summary}", alert=True, indicator="orange")
			else:
				frappe.msgprint("No data types selected. Please check at least one option.", alert=True, indicator="orange")
		
		except Exception as e:
			frappe.log_error(str(e), "Assistants & Tasks Demo Data: Deletion Error")
			self.at_log(f"✗ Deletion failed: {str(e)}")
			frappe.throw(f"Failed to delete Assistants & Tasks demo data: {str(e)}")
