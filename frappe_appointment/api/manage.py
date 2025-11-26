"""
Management API for hierarchical view and CRUD operations
Provides complete hierarchy with validation for organization owners and solo providers
"""

import frappe
from frappe import _


# =====================================================
# VALIDATION FUNCTIONS
# =====================================================

def validate_service(service_name):
    """Validate a service - check if it has providers and EventTypes"""
    issues = []
    
    # Check Service Provider child table
    service_providers = frappe.get_all(
        "Service Provider",
        filters={"parent": service_name, "status": "Active"},
        fields=["provider"],
        limit=1
    )
    
    has_providers = len(service_providers) > 0
    
    # Check EventTypes
    event_types = frappe.get_all(
        "EventType",
        filters={"service": service_name, "is_active": 1},
        fields=["name"],
        limit=1
    )
    
    has_event_types = len(event_types) > 0
    
    if not has_providers:
        issues.append("No providers linked to this service")
    if not has_event_types:
        issues.append("No EventTypes created for this service")
    
    return {
        "has_providers": has_providers,
        "has_event_types": has_event_types,
        "providers_count": len(service_providers),
        "event_types_count": len(event_types),
        "issues": issues,
        "status": "complete" if has_providers and has_event_types else ("warning" if has_providers or has_event_types else "error")
    }


def validate_event_type(event_type_name):
    """Validate an EventType - check if it has provider, service, location, and availability"""
    issues = []
    
    try:
        event_type = frappe.get_doc("EventType", event_type_name)
        
        has_provider = bool(event_type.provider)
        has_service = bool(event_type.service)
        has_location = bool(event_type.location)
        
        # Check if provider has availability
        has_availability = False
        if has_provider:
            provider = frappe.get_doc("Provider", event_type.provider)
            if provider.user_appointment_availability:
                availability = frappe.get_doc("User Appointment Availability", provider.user_appointment_availability)
                has_availability = availability.enable_scheduling == 1
        
        if not has_provider:
            issues.append("No provider assigned")
        if not has_service:
            issues.append("No service linked")
        if not has_location:
            issues.append("No location assigned")
        if not has_availability:
            issues.append("Provider has no availability set")
        
        return {
            "has_provider": has_provider,
            "has_service": has_service,
            "has_location": has_location,
            "has_availability": has_availability,
            "issues": issues,
            "status": "complete" if has_provider and has_service and has_location and has_availability else ("warning" if has_provider and has_service else "error")
        }
    except Exception as e:
        return {
            "has_provider": False,
            "has_service": False,
            "has_location": False,
            "has_availability": False,
            "issues": [f"Error loading EventType: {str(e)}"],
            "status": "error"
        }


def validate_location(location_name):
    """Validate a location - check if it has address and timezone"""
    issues = []
    
    try:
        location = frappe.get_doc("Location", location_name)
        
        # Location has address_line_1, address_line_2, city (not a single 'address' field)
        has_address = bool(location.address_line_1 or location.address_line_2)
        has_timezone = bool(location.timezone)
        
        if not has_address:
            issues.append("Missing address")
        if not has_timezone:
            issues.append("Missing timezone")
        
        return {
            "has_address": has_address,
            "has_timezone": has_timezone,
            "issues": issues,
            "status": "complete" if has_address and has_timezone else ("warning" if has_address or has_timezone else "error")
        }
    except Exception as e:
        return {
            "has_address": False,
            "has_timezone": False,
            "issues": [f"Error loading location: {str(e)}"],
            "status": "error"
        }


def validate_provider(provider_name):
    """Validate a provider - check if they have availability and EventTypes"""
    issues = []
    
    try:
        provider = frappe.get_doc("Provider", provider_name)
        
        has_availability = bool(provider.user_appointment_availability)
        if has_availability:
            availability = frappe.get_doc("User Appointment Availability", provider.user_appointment_availability)
            has_availability = availability.enable_scheduling == 1
        
        event_types = frappe.get_all(
            "EventType",
            filters={"provider": provider_name, "is_active": 1},
            fields=["name"]
        )
        
        has_event_types = len(event_types) > 0
        
        if not has_availability:
            issues.append("No availability set")
        if not has_event_types:
            issues.append("No EventTypes created")
        
        return {
            "has_availability": has_availability,
            "has_event_types": has_event_types,
            "event_types_count": len(event_types),
            "issues": issues,
            "status": "complete" if has_availability and has_event_types else ("warning" if has_availability or has_event_types else "error")
        }
    except Exception as e:
        return {
            "has_availability": False,
            "has_event_types": False,
            "event_types_count": 0,
            "issues": [f"Error loading provider: {str(e)}"],
            "status": "error"
        }


def validate_organization(org_name):
    """Validate an organization - check complete setup"""
    issues = []
    
    try:
        org = frappe.get_doc("Organization", org_name)
        
        # Check services
        services = frappe.get_all("Service", filters={"organization": org_name}, fields=["name"])
        has_services = len(services) > 0
        
        # Check locations
        locations = frappe.get_all("Location", filters={"organization": org_name}, fields=["name"])
        has_locations = len(locations) > 0
        
        # Check providers
        org_providers = frappe.get_all(
            "Provider Organization",
            filters={"organization": org_name, "status": "Active"},
            fields=["parent"],
            distinct=True
        )
        has_providers = len(org_providers) > 0
        
        # Check booking URLs
        has_booking_urls = False
        if hasattr(org, 'booking_urls') and org.booking_urls:
            active_urls = [url for url in org.booking_urls if url.is_active == 1]
            has_booking_urls = len(active_urls) > 0
        
        if not has_services:
            issues.append("No services created")
        if not has_locations:
            issues.append("No locations created")
        if not has_providers:
            issues.append("No providers linked")
        if not has_booking_urls:
            issues.append("No booking URLs generated")
        
        return {
            "has_services": has_services,
            "has_locations": has_locations,
            "has_providers": has_providers,
            "has_booking_urls": has_booking_urls,
            "services_count": len(services),
            "locations_count": len(locations),
            "providers_count": len(org_providers),
            "issues": issues,
            "status": "complete" if has_services and has_locations and has_providers and has_booking_urls else ("warning" if has_services or has_locations or has_providers else "error")
        }
    except Exception as e:
        return {
            "has_services": False,
            "has_locations": False,
            "has_providers": False,
            "has_booking_urls": False,
            "services_count": 0,
            "locations_count": 0,
            "providers_count": 0,
            "issues": [f"Error loading organization: {str(e)}"],
            "status": "error"
        }


# =====================================================
# HIERARCHY FUNCTIONS
# =====================================================

@frappe.whitelist()
def get_provider_centric_hierarchy():
    """
    Get management hierarchy organized by Provider → Organizations → Locations → Services → EventTypes
    Only shows providers that belong to organizations the user owns/manages
    Respects access control - doesn't show private provider information
    """
    user = frappe.session.user
    
    try:
        # Get ALL organizations the user owns or manages
        owner_orgs = frappe.get_all(
            "Organization",
            filters={"owner_user": user},
            fields=["name"],
            order_by="organization_name asc"
        )
        
        manager_orgs = frappe.db.sql("""
            SELECT DISTINCT o.name
            FROM `tabOrganization` o
            INNER JOIN `tabOrganization Manager` om ON om.parent = o.name
            WHERE om.user = %s
        """, (user,), as_dict=True)
        
        # Combine and get unique org names
        all_org_names = set([org["name"] for org in owner_orgs])
        all_org_names.update([org["name"] for org in manager_orgs])
        
        if not all_org_names:
            return {
                "user_type": "none",
                "message": "No organizations found. You need to own or manage at least one organization."
            }
        
        # Get all providers that belong to these organizations (via Provider Organization child table)
        provider_org_links = frappe.get_all(
            "Provider Organization",
            filters={"organization": ["in", list(all_org_names)], "status": "Active"},
            fields=["parent", "organization", "is_primary", "status"],
            order_by="parent asc, is_primary desc"
        )
        
        # Group providers by provider name
        providers_map = {}
        for link in provider_org_links:
            provider_name = link.parent
            org_name = link.organization
            
            if provider_name not in providers_map:
                providers_map[provider_name] = {
                    "provider_name": provider_name,
                    "organizations": []
                }
            
            providers_map[provider_name]["organizations"].append({
                "organization": org_name,
                "is_primary": link.is_primary,
                "status": link.status
            })
        
        # Build hierarchy for each provider
        providers_hierarchy = []
        for provider_name, provider_data in providers_map.items():
            try:
                provider = frappe.get_doc("Provider", provider_name)
                provider_validation = validate_provider(provider_name)
                
                # Build organizations hierarchy for this provider
                orgs_hierarchy = []
                for org_link in provider_data["organizations"]:
                    org_name = org_link["organization"]
                    
                    # Verify user still has access to this organization
                    if org_name not in all_org_names:
                        continue
                    
                    # Get organization details
                    org = frappe.get_doc("Organization", org_name)
                    
                    # Get locations used by this provider in this organization
                    # Get EventTypes for this provider in this organization
                    provider_event_types = frappe.get_all(
                        "EventType",
                        filters={"provider": provider_name, "is_active": 1},
                        fields=["name", "event_type_name", "service", "location", "description"]
                    )
                    
                    # Get unique locations from EventTypes that belong to this organization
                    location_names = set()
                    service_names = set()
                    for et in provider_event_types:
                        if et.location:
                            # Verify location belongs to this organization
                            location = frappe.db.get_value("Location", et.location, ["organization"], as_dict=True)
                            if location and location.organization == org_name:
                                location_names.add(et.location)
                        if et.service:
                            # Verify service belongs to this organization
                            service = frappe.db.get_value("Service", et.service, ["organization"], as_dict=True)
                            if service and service.organization == org_name:
                                service_names.add(et.service)
                    
                    # Build locations hierarchy
                    locations_hierarchy = []
                    for loc_name in location_names:
                        try:
                            location = frappe.get_doc("Location", loc_name)
                            location_validation = validate_location(loc_name)
                            address_parts = [location.address_line_1, location.address_line_2, location.city]
                            address = ", ".join([part for part in address_parts if part])
                            
                            # Get services at this location for this provider
                            location_services = []
                            for svc_name in service_names:
                                # Check if this service has EventTypes at this location for this provider
                                has_event_type = frappe.db.exists("EventType", {
                                    "service": svc_name,
                                    "location": loc_name,
                                    "provider": provider_name,
                                    "is_active": 1
                                })
                                
                                if has_event_type:
                                    service = frappe.get_doc("Service", svc_name)
                                    service_validation = validate_service(svc_name)
                                    
                                    # Get EventTypes for this service-location-provider combination
                                    event_types = []
                                    for et in provider_event_types:
                                        if et.service == svc_name and et.location == loc_name:
                                            et_validation = validate_event_type(et.name)
                                            event_types.append({
                                                **et,
                                                "validation": et_validation
                                            })
                                    
                                    location_services.append({
                                        "name": service.name,
                                        "service_name": service.service_name,
                                        "duration": service.duration,
                                        "price": service.price,
                                        "description": service.description,
                                        "validation": service_validation,
                                        "event_types": event_types
                                    })
                            
                            locations_hierarchy.append({
                                "name": location.name,
                                "location_name": location.location_name,
                                "address": address,
                                "address_line_1": location.address_line_1,
                                "address_line_2": location.address_line_2,
                                "city": location.city,
                                "phone": location.phone,
                                "timezone": location.timezone,
                                "validation": location_validation,
                                "services": location_services
                            })
                        except:
                            pass
                    
                    orgs_hierarchy.append({
                        "name": org.name,
                        "organization_name": org.organization_name,
                        "slug": org.slug,
                        "is_primary": org_link["is_primary"],
                        "locations": locations_hierarchy
                    })
                
                # Get booking URLs for this provider (only organization-related, not private)
                provider_booking_urls = []
                if provider.email:
                    availability = frappe.db.get_value("User Appointment Availability", {"user": provider.email}, "name")
                    if availability:
                        availability_doc = frappe.get_doc("User Appointment Availability", availability)
                        if hasattr(availability_doc, 'booking_urls') and availability_doc.booking_urls:
                            for url_row in availability_doc.booking_urls:
                                if url_row.is_active:
                                    # Only include organization-related URLs, not personal/private ones
                                    if url_row.url_type in ["organization", "service", "provider"]:
                                        provider_booking_urls.append({
                                            "url_type": url_row.url_type,
                                            "slug": url_row.slug,
                                            "full_url": url_row.full_url,
                                            "description": url_row.description,
                                            "access_level": url_row.access_level,
                                            "service": url_row.service if hasattr(url_row, 'service') else None,
                                            "location": url_row.location if hasattr(url_row, 'location') else None
                                        })
                
                providers_hierarchy.append({
                    "name": provider.name,
                    "provider_name": provider.provider_name,
                    "email": provider.email,
                    "phone": provider.phone,
                    "validation": provider_validation,
                    "booking_urls": provider_booking_urls,
                    "organizations": orgs_hierarchy
                })
            except Exception as e:
                frappe.log_error(str(e), f"Provider Centric Hierarchy: Error building provider {provider_name}")
                continue
        
        return {
            "user_type": "organization_owner" if owner_orgs else "organization_member",
            "view_type": "provider_centric",
            "providers": providers_hierarchy
        }
    
    except Exception as e:
        frappe.log_error(str(e), "Provider Centric Hierarchy: Get Hierarchy Error")
        return {
            "user_type": "error",
            "error": str(e)
        }


@frappe.whitelist()
def get_management_hierarchy():
    """
    Get complete management hierarchy with validation
    Returns different structure based on user type (org owner, org member, individual)
    Now supports multiple organizations for users who own/manage multiple orgs
    """
    user = frappe.session.user
    
    try:
        # Get ALL organizations the user owns
        owner_orgs = frappe.get_all(
            "Organization",
            filters={"owner_user": user},
            fields=["name", "organization_name", "slug", "organization_type", "email", "phone", "timezone", "language", "description"],
            order_by="organization_name asc"
        )
        
        # Get organizations where user is a manager
        manager_orgs = frappe.db.sql("""
            SELECT DISTINCT o.name, o.organization_name, o.slug, o.organization_type, 
                   o.email, o.phone, o.timezone, o.language, o.description
            FROM `tabOrganization` o
            INNER JOIN `tabOrganization Manager` om ON om.parent = o.name
            WHERE om.user = %s
            ORDER BY o.organization_name asc
        """, (user,), as_dict=True)
        
        # Combine and deduplicate
        all_orgs = {org.name: org for org in owner_orgs}
        for org in manager_orgs:
            if org.name not in all_orgs:
                all_orgs[org.name] = org
        
        if all_orgs:
            # User owns or manages organizations
            user_type = "organization_owner" if owner_orgs else "organization_member"
            organizations = []
            
            for org_name, org_data in all_orgs.items():
                org_hierarchy = _build_organization_hierarchy(org_name)
                organizations.append(org_hierarchy)
            
            # If only one org, return it directly for backward compatibility
            if len(organizations) == 1:
                return {
                    "user_type": user_type,
                    "organization": organizations[0],
                    "organizations": organizations  # Also include array for multiple orgs
                }
            else:
                # Multiple organizations - return array
                return {
                    "user_type": user_type,
                    "organizations": organizations,
                    "organization": organizations[0] if organizations else None  # First one for backward compatibility
                }
        
        # Check if provider belongs to organizations (as member, not owner)
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        if provider_name:
            provider = frappe.get_doc("Provider", provider_name)
            if hasattr(provider, 'organizations') and provider.organizations:
                # Get primary organization
                primary_org = None
                for org_row in provider.organizations:
                    if org_row.status == "Active" and org_row.is_primary:
                        primary_org = org_row.organization
                        break
                
                if not primary_org and provider.organizations:
                    primary_org = provider.organizations[0].organization
                
                if primary_org:
                    return {
                        "user_type": "organization_member",
                        "organization": _build_organization_hierarchy(primary_org)
                    }
            
            # If no org, build individual provider hierarchy
            return _build_individual_provider_hierarchy(provider_name)
        
        # Fallback - no org or provider found
        return {
            "user_type": "none",
            "message": "No provider or organization found. Please complete onboarding first."
        }
    
    except Exception as e:
        frappe.log_error(str(e), "Management API: Get Hierarchy Error")
        return {
            "user_type": "error",
            "error": str(e)
        }


def _build_organization_hierarchy(org_name):
    """Build complete hierarchy for an organization"""
    org = frappe.get_doc("Organization", org_name)
    
    # Get booking URLs for this organization
    booking_urls = []
    if hasattr(org, 'booking_urls') and org.booking_urls:
        for url_row in org.booking_urls:
            if url_row.is_active:
                booking_urls.append({
                    "url_type": url_row.url_type,
                    "slug": url_row.slug,
                    "full_url": url_row.full_url,
                    "description": url_row.description,
                    "access_level": url_row.access_level,
                    "service": url_row.service if hasattr(url_row, 'service') else None,
                    "provider": url_row.provider if hasattr(url_row, 'provider') else None
                })
    
    # Get validation
    validation = validate_organization(org_name)
    
    # Get services with their providers and EventTypes
    services = []
    all_services = frappe.get_all(
        "Service",
        filters={"organization": org_name},
        fields=["name", "service_name", "duration", "price", "description", "is_active"]
    )
    
    for service in all_services:
        service_validation = validate_service(service.name)
        
        # Get Service Provider child table entries
        service_providers = frappe.get_all(
            "Service Provider",
            filters={"parent": service.name, "status": "Active"},
            fields=["provider", "is_primary", "price_override", "duration_override", "status"]
        )
        
        # Get provider details
        provider_details = []
        for sp in service_providers:
            try:
                provider = frappe.get_doc("Provider", sp.provider)
                provider_details.append({
                    "name": provider.name,
                    "provider_name": provider.provider_name,
                    "is_primary": sp.is_primary,
                    "price_override": sp.price_override,
                    "duration_override": sp.duration_override
                })
            except:
                pass
        
        # Get EventTypes for this service
        event_types = []
        all_event_types = frappe.get_all(
            "EventType",
            filters={"service": service.name, "is_active": 1},
            fields=["name", "event_type_name", "provider", "location", "description"]
        )
        
        for et in all_event_types:
            et_validation = validate_event_type(et.name)
            event_types.append({
                **et,
                "validation": et_validation
            })
        
        services.append({
            **service,
            "currency": "ETB",  # Default currency (Service doctype doesn't have currency field)
            "validation": service_validation,
            "service_providers": provider_details,
            "event_types": event_types
        })
    
    # Get locations
    locations = []
    all_locations = frappe.get_all(
        "Location",
        filters={"organization": org_name},
        fields=["name", "location_name", "address_line_1", "address_line_2", "city", "phone", "timezone", "is_active"]
    )
    
    for location in all_locations:
        location_validation = validate_location(location.name)
        # Combine address fields for display
        address_parts = [location.address_line_1, location.address_line_2, location.city]
        address = ", ".join([part for part in address_parts if part])
        locations.append({
            **location,
            "address": address,  # Combined address for frontend
            "validation": location_validation
        })
    
    # Get providers
    providers = []
    org_provider_rows = frappe.get_all(
        "Provider Organization",
        filters={"organization": org_name, "status": "Active"},
        fields=["parent", "is_primary", "status"]
    )
    
    for org_prov in org_provider_rows:
        try:
            provider = frappe.get_doc("Provider", org_prov.parent)
            provider_validation = validate_provider(provider.name)
            
            # Get booking URLs for this provider (from User Appointment Availability)
            provider_booking_urls = []
            if provider.email:
                availability = frappe.db.get_value("User Appointment Availability", {"user": provider.email}, "name")
                if availability:
                    availability_doc = frappe.get_doc("User Appointment Availability", availability)
                    if hasattr(availability_doc, 'booking_urls') and availability_doc.booking_urls:
                        for url_row in availability_doc.booking_urls:
                            if url_row.is_active:
                                provider_booking_urls.append({
                                    "url_type": url_row.url_type,
                                    "slug": url_row.slug,
                                    "full_url": url_row.full_url,
                                    "description": url_row.description,
                                    "access_level": url_row.access_level,
                                    "service": url_row.service if hasattr(url_row, 'service') else None,
                                    "location": url_row.location if hasattr(url_row, 'location') else None
                                })
            
            # Get EventTypes for this provider
            provider_event_types = frappe.get_all(
                "EventType",
                filters={"provider": provider.name, "is_active": 1},
                fields=["name", "event_type_name", "service", "location"]
            )
            
            providers.append({
                "name": provider.name,
                "provider_name": provider.provider_name,
                "email": provider.email,
                "phone": provider.phone,
                "is_primary": org_prov.is_primary,
                "validation": provider_validation,
                "booking_urls": provider_booking_urls,
                "event_types": provider_event_types
            })
        except:
            pass
    
    return {
        "name": org.name,
        "organization_name": org.organization_name,
        "slug": org.slug,
        "organization_type": org.organization_type,
        "email": org.email,
        "phone": org.phone,
        "timezone": org.timezone,
        "language": org.language,
        "description": org.description,
        "validation": validation,
        "booking_urls": booking_urls,
        "services": services,
        "locations": locations,
        "providers": providers
    }


def _build_individual_provider_hierarchy(provider_name):
    """Build hierarchy for individual/solo provider"""
    provider = frappe.get_doc("Provider", provider_name)
    provider_validation = validate_provider(provider_name)
    
    # Get EventTypes
    event_types = []
    all_event_types = frappe.get_all(
        "EventType",
        filters={"provider": provider_name, "is_active": 1},
        fields=["name", "event_type_name", "service", "location", "description"]
    )
    
    for et in all_event_types:
        et_validation = validate_event_type(et.name)
        
        # Get service details
        service_details = None
        if et.service:
            try:
                service = frappe.get_doc("Service", et.service)
                service_details = {
                    "name": service.name,
                    "service_name": service.service_name,
                    "duration": service.duration,
                    "price": service.price
                }
            except:
                pass
        
        # Get provider booking URLs for this event type's provider
        provider_booking_urls = []
        if et.provider:
            try:
                provider = frappe.get_doc("Provider", et.provider)
                if provider.email:
                    availability = frappe.db.get_value("User Appointment Availability", {"user": provider.email}, "name")
                    if availability:
                        availability_doc = frappe.get_doc("User Appointment Availability", availability)
                        if hasattr(availability_doc, 'booking_urls') and availability_doc.booking_urls:
                            for url_row in availability_doc.booking_urls:
                                if url_row.is_active and (not url_row.service or url_row.service == et.service):
                                    provider_booking_urls.append({
                                        "url_type": url_row.url_type,
                                        "slug": url_row.slug,
                                        "full_url": url_row.full_url,
                                        "description": url_row.description
                                    })
            except:
                pass
        
        event_types.append({
            **et,
            "validation": et_validation,
            "service_details": service_details,
            "provider_booking_urls": provider_booking_urls
        })
    
    # Get locations used by this provider
    location_names = set([et.location for et in all_event_types if et.location])
    locations = []
    for loc_name in location_names:
        try:
            location = frappe.get_doc("Location", loc_name)
            location_validation = validate_location(loc_name)
            # Combine address fields for display
            address_parts = [location.address_line_1, location.address_line_2, location.city]
            address = ", ".join([part for part in address_parts if part])
            locations.append({
                "name": location.name,
                "location_name": location.location_name,
                "address": address,  # Combined address for frontend
                "address_line_1": location.address_line_1,
                "address_line_2": location.address_line_2,
                "city": location.city,
                "phone": location.phone,
                "timezone": location.timezone,
                "validation": location_validation
            })
        except:
            pass
    
    # Get services for this provider (from EventTypes)
    # Services are linked to providers through EventTypes, not directly
    service_names = set([et.service for et in all_event_types if et.service])
    services = []
    for svc_name in service_names:
        try:
            service = frappe.get_doc("Service", svc_name)
            services.append({
                "name": service.name,
                "service_name": service.service_name,
                "duration": service.duration,
                "price": service.price,
                "description": service.description
            })
        except:
            pass
    
    # Also get services without organization that might be used by this provider
    # (Services that don't belong to any organization - individual services)
    individual_services = frappe.get_all(
        "Service",
        filters={"organization": ["is", "not set"], "is_active": 1},
        fields=["name", "service_name", "duration", "price", "description"]
    )
    for svc in individual_services:
        if svc.name not in service_names:
            # Check if this service has EventTypes for this provider
            has_event_type = frappe.db.exists("EventType", {
                "service": svc.name,
                "provider": provider_name,
                "is_active": 1
            })
            if has_event_type:
                services.append({
                    "name": svc.name,
                    "service_name": svc.service_name,
                    "duration": svc.duration,
                    "price": svc.price,
                    "description": svc.description
                })
    
    return {
        "user_type": "individual",
        "provider": {
            "name": provider.name,
            "provider_name": provider.provider_name,
            "email": provider.email,
            "phone": provider.phone,
            "validation": provider_validation,
            "event_types": event_types,
            "locations": locations,
            "services": services  # Add services for dropdowns
        }
    }


# =====================================================
# CRUD ENDPOINTS
# =====================================================

@frappe.whitelist()
def create_service(service_name, duration, organization=None, price=0, currency="ETB", description="", buffer_before=5, buffer_after=5):
    """Create a new service"""
    user = frappe.session.user
    
    try:
        service = frappe.new_doc("Service")
        service.service_name = service_name
        service.duration = duration
        # Service doctype uses buffer_before and buffer_after
        service.buffer_before = buffer_before
        service.buffer_after = buffer_after
        service.price = price
        # Note: Service doctype doesn't have currency field - price is always in ETB
        service.description = description
        service.is_active = 1
        
        if organization:
            service.organization = organization
            # Verify user can manage this organization
            org = frappe.get_doc("Organization", organization)
            if org.owner_user != user:
                frappe.throw(_("You don't have permission to create services for this organization"))
        
        service.insert(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "service_id": service.name,
            "message": f"Service '{service_name}' created successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Management API: Create Service Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def update_service(service_id, **kwargs):
    """Update an existing service"""
    user = frappe.session.user
    
    try:
        service = frappe.get_doc("Service", service_id)
        
        # Verify permissions
        if service.organization:
            org = frappe.get_doc("Organization", service.organization)
            if org.owner_user != user:
                frappe.throw(_("You don't have permission to update this service"))
        
        # Update fields (handle special cases)
        for key, value in kwargs.items():
            if key == "buffer_time":
                # Map buffer_time to buffer_before and buffer_after
                service.buffer_before = value
                service.buffer_after = value
            elif key == "currency":
                # Service doctype doesn't have currency field - skip it
                continue
            elif hasattr(service, key):
                setattr(service, key, value)
        
        service.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": f"Service updated successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Management API: Update Service Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def delete_service(service_id):
    """Delete a service"""
    user = frappe.session.user
    
    try:
        service = frappe.get_doc("Service", service_id)
        
        # Verify permissions
        if service.organization:
            org = frappe.get_doc("Organization", service.organization)
            if org.owner_user != user:
                frappe.throw(_("You don't have permission to delete this service"))
        
        service_name = service.service_name
        frappe.delete_doc("Service", service_id, ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": f"Service '{service_name}' deleted successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Management API: Delete Service Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def create_location(location_name, organization, address_line_1="", address_line_2="", city="Addis Ababa", phone="", timezone="Africa/Addis_Ababa", **kwargs):
    """Create a new location"""
    user = frappe.session.user
    
    try:
        # Verify user can manage this organization
        org = frappe.get_doc("Organization", organization)
        if org.owner_user != user:
            frappe.throw(_("You don't have permission to create locations for this organization"))
        
        location = frappe.new_doc("Location")
        location.location_name = location_name
        location.organization = organization
        # Location doctype has address_line_1, address_line_2, city (not a single 'address' field)
        # For backward compatibility, if 'address' is passed, use it as address_line_1
        if 'address' in kwargs:
            location.address_line_1 = kwargs.get('address', '')
        else:
            location.address_line_1 = address_line_1
            location.address_line_2 = address_line_2
            location.city = city
            location.phone = phone
        location.timezone = timezone
        location.is_active = 1
        location.insert(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "location_id": location.name,
            "message": f"Location '{location_name}' created successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Management API: Create Location Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def update_location(location_id, **kwargs):
    """Update an existing location"""
    user = frappe.session.user
    
    try:
        location = frappe.get_doc("Location", location_id)
        
        # Verify permissions
        if location.organization:
            org = frappe.get_doc("Organization", location.organization)
            if org.owner_user != user:
                frappe.throw(_("You don't have permission to update this location"))
        
        # Update fields (handle address field mapping)
        for key, value in kwargs.items():
            if key == "address":
                # If 'address' is provided, try to parse it or set as address_line_1
                # For now, just set as address_line_1
                location.address_line_1 = value
            elif hasattr(location, key):
                setattr(location, key, value)
        
        location.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": f"Location updated successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Management API: Update Location Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def delete_location(location_id):
    """Delete a location"""
    user = frappe.session.user
    
    try:
        location = frappe.get_doc("Location", location_id)
        
        # Verify permissions
        if location.organization:
            org = frappe.get_doc("Organization", location.organization)
            if org.owner_user != user:
                frappe.throw(_("You don't have permission to delete this location"))
        
        location_name = location.location_name
        frappe.delete_doc("Location", location_id, ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": f"Location '{location_name}' deleted successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Management API: Delete Location Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def create_event_type(event_type_name, service, provider, location, description=""):
    """Create a new EventType"""
    user = frappe.session.user
    
    try:
        # Verify service exists and user has permission
        service_doc = frappe.get_doc("Service", service)
        if service_doc.organization:
            org = frappe.get_doc("Organization", service_doc.organization)
            if org.owner_user != user:
                frappe.throw(_("You don't have permission to create EventTypes for this service"))
        
        event_type = frappe.new_doc("EventType")
        event_type.event_type_name = event_type_name
        event_type.service = service
        event_type.provider = provider
        event_type.location = location
        event_type.description = description
        event_type.is_active = 1
        event_type.insert(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "event_type_id": event_type.name,
            "message": f"EventType '{event_type_name}' created successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Management API: Create EventType Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def update_event_type(event_type_id, **kwargs):
    """Update an existing EventType"""
    user = frappe.session.user
    
    try:
        event_type = frappe.get_doc("EventType", event_type_id)
        
        # Verify permissions via service
        if event_type.service:
            service = frappe.get_doc("Service", event_type.service)
            if service.organization:
                org = frappe.get_doc("Organization", service.organization)
                if org.owner_user != user:
                    frappe.throw(_("You don't have permission to update this EventType"))
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(event_type, key):
                setattr(event_type, key, value)
        
        event_type.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": f"EventType updated successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Management API: Update EventType Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def delete_event_type(event_type_id):
    """Delete an EventType"""
    user = frappe.session.user
    
    try:
        event_type = frappe.get_doc("EventType", event_type_id)
        
        # Verify permissions via service
        if event_type.service:
            service = frappe.get_doc("Service", event_type.service)
            if service.organization:
                org = frappe.get_doc("Organization", service.organization)
                if org.owner_user != user:
                    frappe.throw(_("You don't have permission to delete this EventType"))
        
        event_type_name = event_type.event_type_name
        frappe.delete_doc("EventType", event_type_id, ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": f"EventType '{event_type_name}' deleted successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Management API: Delete EventType Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def link_provider_to_service(service_id, provider_id, is_primary=0, price_override=None, duration_override=None):
    """Link a provider to a service via Service Provider child table"""
    user = frappe.session.user
    
    try:
        service = frappe.get_doc("Service", service_id)
        
        # Verify permissions
        if service.organization:
            org = frappe.get_doc("Organization", service.organization)
            if org.owner_user != user:
                frappe.throw(_("You don't have permission to link providers to this service"))
        
        # Check if provider is already linked
        existing = [sp for sp in service.service_providers if sp.provider == provider_id]
        if existing:
            return {
                "success": False,
                "error": "Provider is already linked to this service"
            }
        
        # Add provider
        service.append("service_providers", {
            "provider": provider_id,
            "status": "Active",
            "is_primary": is_primary,
            "price_override": price_override,
            "duration_override": duration_override
        })
        
        service.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": "Provider linked to service successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Management API: Link Provider Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def unlink_provider_from_service(service_id, provider_id):
    """Unlink a provider from a service"""
    user = frappe.session.user
    
    try:
        service = frappe.get_doc("Service", service_id)
        
        # Verify permissions
        if service.organization:
            org = frappe.get_doc("Organization", service.organization)
            if org.owner_user != user:
                frappe.throw(_("You don't have permission to unlink providers from this service"))
        
        # Remove provider
        service.service_providers = [sp for sp in service.service_providers if sp.provider != provider_id]
        service.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": "Provider unlinked from service successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Management API: Unlink Provider Error")
        return {
            "success": False,
            "error": str(e)
        }

