"""
Booking URL Manager
Auto-populates booking URLs as child tables in User Appointment Availability and Organization
"""

import frappe
from frappe import _


def sync_booking_urls_for_provider(provider_name):
	"""
	Populate booking URLs for a provider
	- Personal link (from User Appointment Availability)
	- Service-specific links (for each service)
	- Location-specific links (for each location)
	"""
	# Prevent recursion
	if frappe.flags.syncing_booking_urls:
		return
	
	try:
		frappe.flags.syncing_booking_urls = True
		
		# Reload provider to get latest data
		frappe.db.commit()  # Ensure any pending changes are committed
		provider = frappe.get_doc("Provider", provider_name)
		provider.reload()
		user_email = provider.email
		
		if not user_email or not frappe.db.exists("User", user_email):
			return
		
		# Get User Appointment Availability for this provider
		availability = frappe.db.get_value("User Appointment Availability", {"user": user_email}, "name")
		if not availability:
			return
		
		# Reload availability document to get latest data
		availability_doc = frappe.get_doc("User Appointment Availability", availability)
		availability_doc.reload()
		
		# Check if booking_urls field exists
		if not hasattr(availability_doc, 'booking_urls'):
			return
		
		# Track existing URLs to avoid duplicates
		existing_urls = {}
		if availability_doc.booking_urls:
			for url_row in availability_doc.booking_urls:
				# Use slug as unique identifier
				key = f"{url_row.url_type}:{url_row.slug}"
				existing_urls[key] = True
		
		# If booking_urls is empty, initialize it
		if not availability_doc.booking_urls:
			availability_doc.booking_urls = []
		
		# 1. Personal link (from User Appointment Availability slug)
		if availability_doc.slug:
			key = f"personal:{availability_doc.slug}"
			if key not in existing_urls:
				availability_doc.append("booking_urls", {
					"url_type": "personal",
					"slug": availability_doc.slug,
					"full_url": f"/schedule/in/{availability_doc.slug}",
					"is_active": 1 if availability_doc.enable_scheduling else 0,
					"access_level": "public",
					"description": f"Personal booking link for {provider.provider_name}",
					"created_from": "User Appointment Availability"
				})
		
		# 2. Service-specific links
		# Get services linked to this provider from child table
		service_providers = frappe.get_all("Service Provider",
			filters={"provider": provider_name, "status": "Active"},
			fields=["parent"]
		)
		service_names = [sp.get("parent") for sp in service_providers]
		services = []
		if service_names:
			services = frappe.get_all("Service",
				filters={"name": ["in", service_names]},
				fields=["name", "service_name"]
			)
		
		# Also get services from provider's organizations
		provider_orgs = []
		if hasattr(provider, 'organizations') and provider.organizations:
			provider_orgs = [org_row.organization for org_row in provider.organizations]
		
		if provider_orgs:
			org_services = frappe.get_all("Service",
				filters={"organization": ["in", provider_orgs]},
				fields=["name", "service_name"]
			)
			# Merge and deduplicate
			existing_service_names = {s.get("name") for s in services}
			for svc in org_services:
				if svc.get("name") not in existing_service_names:
					services.append(svc)
		
		# Get EventTypes for these services
		for service in services:
			event_types = frappe.get_all("EventType",
				filters={"service": service.get("name"), "provider": provider_name, "is_active": 1},
				fields=["name"]
			)
			
			for event_type in event_types:
				# Use EventType name as slug (it's already URL-safe)
				slug = event_type.get("name")
				key = f"service:{slug}"
				if key not in existing_urls:
					availability_doc.append("booking_urls", {
						"url_type": "service",
						"slug": slug,
						"full_url": f"/schedule/in/{slug}",
						"is_active": 1,
						"access_level": "public",
						"service": service.get("name"),
						"provider": provider_name,
						"description": f"Service booking: {service.get('service_name')}",
						"created_from": "User Appointment Availability"
					})
		
		# 3. Location-specific links
		provider_locations = []
		if hasattr(provider, 'locations') and provider.locations:
			provider_locations = [loc_row.location for loc_row in provider.locations]
		
		for location_name in provider_locations:
			location = frappe.get_doc("Location", location_name)
			if location.location_name:
				# Create a slug from location name
				slug = _make_slug(location.location_name)
				key = f"location:{slug}"
				if key not in existing_urls:
					availability_doc.append("booking_urls", {
						"url_type": "location",
						"slug": slug,
						"full_url": f"/schedule/in/{slug}",
						"is_active": 1,
						"access_level": "public",
						"location": location_name,
						"provider": provider_name,
						"description": f"Location booking: {location.location_name}",
						"created_from": "User Appointment Availability"
					})
		
		# Save without triggering hooks to prevent recursion
		availability_doc.flags.ignore_validate = True
		availability_doc.flags.ignore_links = True
		availability_doc.flags.ignore_validate_update_after_submit = True
		# Store original modified time to restore it
		original_modified = frappe.db.get_value('User Appointment Availability', availability_doc.name, 'modified')
		availability_doc.save(ignore_permissions=True)
		# Restore original modified time to prevent concurrency issues
		if original_modified:
			frappe.db.set_value('User Appointment Availability', availability_doc.name, 'modified', original_modified)
		frappe.db.commit()
		
	except Exception as e:
		import traceback
		error_msg = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
		frappe.log_error(error_msg, "Booking URL Manager: Sync Provider URLs Error")
		# Don't raise - just log the error to prevent blocking
		pass
	finally:
		frappe.flags.syncing_booking_urls = False


def sync_booking_urls_for_organization(org_name):
	"""
	Populate booking URLs for an organization
	- Organization main link
	- Service-specific links (for each service)
	- Provider-specific links (for each provider in org)
	"""
	# Prevent recursion
	if frappe.flags.syncing_booking_urls:
		return
	
	try:
		frappe.flags.syncing_booking_urls = True
		
		# Check if organization exists before trying to load it
		if not frappe.db.exists("Organization", org_name):
			frappe.log_error(f"Organization {org_name} not found - skipping booking URL sync", "Booking URL Manager: Organization Not Found")
			return
		
		# Reload organization to get latest data and avoid concurrency issues
		frappe.db.commit()  # Ensure any pending changes are committed
		org = frappe.get_doc("Organization", org_name)
		org.reload()
		
		if not org.slug:
			return
		
		# Check if booking_urls field exists
		if not hasattr(org, 'booking_urls'):
			# Field doesn't exist, skip sync
			return
		
		# Track existing URLs to avoid duplicates
		existing_urls = {}
		if org.booking_urls:
			for url_row in org.booking_urls:
				# Use slug as unique identifier
				key = f"{url_row.url_type}:{url_row.slug}"
				existing_urls[key] = True
		
		# If booking_urls is empty, initialize it
		if not org.booking_urls:
			org.booking_urls = []
		
		# 1. Organization main link
		key = f"organization:{org.slug}"
		if key not in existing_urls:
			org.append("booking_urls", {
				"url_type": "organization",
				"slug": org.slug,
				"full_url": f"/schedule/org/{org.slug}",
				"is_active": 1 if org.enable_public_booking else 0,
				"access_level": "public" if org.enable_public_booking else "private",
				"description": f"Main booking page for {org.organization_name}",
				"created_from": "Organization"
			})
		
		# 2. Service-specific links
		services = frappe.get_all("Service",
			filters={"organization": org_name},
			fields=["name", "service_name"]
		)
		
		for service in services:
			# VALIDATION: Check if service has providers before creating URLs
			# Check Service Provider child table
			service_providers = frappe.get_all(
				"Service Provider",
				filters={"parent": service.get("name"), "status": "Active"},
				fields=["provider"],
				limit=1
			)
			
			# If no Service Provider entries, check EventTypes for providers in this org
			if not service_providers:
				# Get EventTypes for this service
				event_types = frappe.get_all("EventType",
					filters={"service": service.get("name"), "is_active": 1},
					fields=["provider", "name"]
				)
				
				# Check if any EventType providers are in this organization
				if event_types:
					event_type_providers = [et.get("provider") for et in event_types if et.get("provider")]
					org_provider_names = frappe.get_all(
						"Provider Organization",
						filters={"organization": org_name, "status": "Active"},
						fields=["parent"],
						pluck="parent"
					)
					
					# Only create URLs if at least one provider from EventTypes is in the org
					has_valid_provider = any(prov in org_provider_names for prov in event_type_providers if prov)
					if not has_valid_provider:
						# Skip this service - no valid providers
						continue
			else:
				# Service has Service Provider entries, verify they're in the organization
				provider_names = [sp.get("provider") for sp in service_providers]
				org_provider_names = frappe.get_all(
					"Provider Organization",
					filters={"organization": org_name, "status": "Active"},
					fields=["parent"],
					pluck="parent"
				)
				
				has_valid_provider = any(prov in org_provider_names for prov in provider_names)
				if not has_valid_provider:
					# Skip this service - providers not in organization
					continue
			
			# Get EventTypes for this service
			event_types = frappe.get_all("EventType",
				filters={"service": service.get("name"), "is_active": 1},
				fields=["name"]
			)
			
			for event_type in event_types:
				# Organization service URL format: /schedule/org/{org_slug}/{event_type_slug}
				slug = event_type.get("name")
				key = f"service:{slug}"
				if key not in existing_urls:
					org.append("booking_urls", {
						"url_type": "service",
						"slug": slug,
						"full_url": f"/schedule/org/{org.slug}/{slug}",
						"is_active": 1,
						"access_level": "public" if org.enable_public_booking else "private",
						"service": service.get("name"),
						"description": f"Service booking: {service.get('service_name')}",
						"created_from": "Organization"
					})
		
		# 3. Provider-specific links
		# Get providers linked to this organization
		# Note: Provider Organization uses 'status' field (not 'organization_status')
		providers = frappe.get_all("Provider Organization",
			filters={"organization": org_name, "status": "Active"},
			fields=["parent"]
		)
		
		for provider_row in providers:
			provider_name = provider_row.get("parent")
			# Check if provider exists before trying to get it
			if not frappe.db.exists("Provider", provider_name):
				continue
			
			try:
				provider = frappe.get_doc("Provider", provider_name)
				
				if provider.provider_name:
					slug = _make_slug(provider.provider_name)
					key = f"provider:{slug}"
					if key not in existing_urls:
						# Provider URLs point to organization main page
						# Provider selection happens on the org booking page
						org.append("booking_urls", {
							"url_type": "provider",
							"slug": slug,
							"full_url": f"/schedule/org/{org.slug}",
							"is_active": 1,
							"access_level": "public" if org.enable_public_booking else "private",
							"provider": provider_name,
							"description": f"Provider booking: {provider.provider_name} (select provider on booking page)",
							"created_from": "Organization"
						})
			except Exception:
				# Skip if provider can't be loaded
				continue
		
		# 4. Include provider booking URLs from User Appointment Availability
		# Get all providers in this organization and their booking URLs
		for provider_row in providers:
			provider_name = provider_row.get("parent")
			if not frappe.db.exists("Provider", provider_name):
				continue
			
			try:
				provider = frappe.get_doc("Provider", provider_name)
				user_email = provider.email
				
				if not user_email:
					continue
				
				# Get User Appointment Availability for this provider
				availability_name = frappe.db.get_value("User Appointment Availability", {"user": user_email}, "name")
				if not availability_name:
					continue
				
				availability_doc = frappe.get_doc("User Appointment Availability", availability_name)
				
				# Check if availability has booking_urls
				if not hasattr(availability_doc, 'booking_urls') or not availability_doc.booking_urls:
					continue
				
				# Copy provider booking URLs to organization (with provider reference)
				for provider_url in availability_doc.booking_urls:
					if not provider_url.is_active:
						continue
					
					# Create unique key for this URL
					# Use provider name + url_type + slug to avoid duplicates
					key = f"provider_{provider_name}:{provider_url.url_type}:{provider_url.slug}"
					
					if key not in existing_urls:
						# Add provider's booking URL to organization
						org.append("booking_urls", {
							"url_type": provider_url.url_type,
							"slug": provider_url.slug,
							"full_url": provider_url.full_url,
							"is_active": provider_url.is_active,
							"access_level": provider_url.access_level,
							"service": provider_url.service if hasattr(provider_url, 'service') else None,
							"provider": provider_name,
							"location": provider_url.location if hasattr(provider_url, 'location') else None,
							"description": f"{provider.provider_name}: {provider_url.description or provider_url.slug}",
							"created_from": "User Appointment Availability"
						})
						existing_urls[key] = True  # Mark as added to avoid duplicates
			except Exception as e:
				# Skip if there's an error loading provider or availability
				frappe.log_error(f"Error copying provider URLs for {provider_name}: {str(e)}", "Booking URL Manager: Copy Provider URLs")
				continue
		
		# Save without triggering hooks to prevent recursion
		org.flags.ignore_validate = True
		org.flags.ignore_links = True
		org.flags.ignore_validate_update_after_submit = True
		# Store original modified time to restore it
		original_modified = frappe.db.get_value('Organization', org.name, 'modified')
		org.save(ignore_permissions=True)
		# Restore original modified time to prevent concurrency issues
		if original_modified:
			frappe.db.set_value('Organization', org.name, 'modified', original_modified)
		frappe.db.commit()
		
	except Exception as e:
		import traceback
		error_msg = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
		frappe.log_error(error_msg, "Booking URL Manager: Sync Organization URLs Error")
		# Don't raise - just log the error to prevent blocking
		pass
	finally:
		frappe.flags.syncing_booking_urls = False


def sync_booking_urls_for_user_availability(availability_name):
	"""
	Sync URLs when User Appointment Availability changes
	This will sync URLs for the associated provider
	"""
	# Prevent recursion
	if frappe.flags.syncing_booking_urls:
		return
	
	try:
		availability = frappe.get_doc("User Appointment Availability", availability_name)
		user_email = availability.user
		
		# Find provider for this user
		provider_name = frappe.db.get_value("Provider", {"email": user_email}, "name")
		if provider_name:
			sync_booking_urls_for_provider(provider_name)
		
	except Exception as e:
		frappe.log_error(str(e), "Booking URL Manager: Sync User Availability URLs Error")
		raise


def _make_slug(text):
	"""Create URL-safe slug from text"""
	import re
	# Remove special characters, keep alphanumeric, hyphens, and dots
	slug = re.sub(r'[^a-zA-Z0-9\-\.]', '-', str(text))
	# Remove multiple consecutive hyphens
	slug = re.sub(r'-+', '-', slug)
	# Remove leading/trailing hyphens
	slug = slug.strip('-')
	return slug.lower()

