"""
Onboarding API endpoints for provider setup
"""
import re
import frappe
from frappe import _
from datetime import datetime


def make_slug(value: str) -> str:
    """
    Generate a URL-safe slug that matches User Appointment Availability slug rules:
    - lowercase
    - only a-z, 0-9, underscore, hyphen
    - no leading/trailing hyphen
    """
    value = (value or "").lower()
    # replace any non-alphanumeric character with hyphen
    value = re.sub(r"[^a-z0-9]+", "-", value)
    # strip leading/trailing hyphens
    value = value.strip("-")
    return value or "default"


def time_to_str(time_value):
    """
    Helper to convert timedelta or time object to time string (HH:MM:SS)
    This format is required by the validation method in user_appointment_availability.py
    """
    if isinstance(time_value, str):
        # Already a string, ensure it's in HH:MM:SS format
        parts = time_value.split(":")
        if len(parts) == 2:
            return f"{parts[0].zfill(2)}:{parts[1].zfill(2)}:00"
        return time_value
    elif hasattr(time_value, 'total_seconds'):
        # It's a timedelta object
        total_seconds = int(time_value.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    else:
        # Try to convert to string
        return str(time_value)


def _user_can_manage_organization(user, organization_name):
    if not organization_name:
        return False
    owner_user = frappe.db.get_value("Organization", organization_name, "owner_user")
    if owner_user == user:
        return True
    return bool(frappe.db.exists("Organization Manager", {"parent": organization_name, "user": user}))


def _fetch_user_organizations(user):
    """Return organizations the user can manage (owner or listed manager)."""
    base_fields = [
        "name",
        "organization_name",
        "organization_type",
        "slug",
        "email",
        "phone",
        "timezone",
        "language",
        "description",
        "owner_user",
    ]
    owner_orgs = frappe.db.get_all(
        "Organization",
        filters={"owner_user": user},
        fields=base_fields,
        order_by="organization_name asc",
    )
    manager_orgs = frappe.db.sql(
        """
        select
            org.name,
            org.organization_name,
            org.organization_type,
            org.slug,
            org.email,
            org.phone,
            org.timezone,
            org.language,
            org.description,
            org.owner_user
        from `tabOrganization` org
        inner join `tabOrganization Manager` mgr on mgr.parent = org.name
        where mgr.user = %s
        order by org.organization_name asc
        """,
        user,
        as_dict=True,
    )

    organizations = []
    seen = set()

    for org in owner_orgs + manager_orgs:
        if org["name"] in seen:
            continue
        seen.add(org["name"])
        role = "Owner" if org.get("owner_user") == user else "Manager"
        organizations.append({**org, "role": role})

    return organizations


def _resolve_user_organization(user, organization_id=None):
    """
    Determine which organization the user is currently configuring.
    Preference order:
    1. Explicit organization_id (validated)
    2. Provider.onboarding_organization (if still accessible)
    3. First organization the user can manage
    """
    if organization_id:
        if not _user_can_manage_organization(user, organization_id):
            frappe.throw(_("You do not have access to this organization."))
        return organization_id

    provider_data = frappe.db.get_value(
        "Provider", {"user": user}, ["onboarding_organization"], as_dict=True
    )
    selected_org = provider_data.get("onboarding_organization") if provider_data else None
    if selected_org and _user_can_manage_organization(user, selected_org):
        return selected_org

    orgs = _fetch_user_organizations(user)
    if orgs:
        return orgs[0]["name"]

    return None


def _get_manageable_providers(user):
    """Providers created by the user or under organizations they can manage."""
    provider_fields = ["name", "provider_name", "user", "phone", "organization", "organization_status", "owner"]
    provider_map = {}

    owner_providers = frappe.db.get_all("Provider", filters={"owner": user}, fields=provider_fields)
    for prov in owner_providers:
        provider_map[prov["name"]] = {**prov, "source": "owner"}

    managed_orgs = _fetch_user_organizations(user)
    org_names = [org["name"] for org in managed_orgs]
    org_label_map = {org["name"]: org["organization_name"] for org in managed_orgs}

    if org_names:
        org_providers = frappe.db.get_all(
            "Provider",
            filters={"organization": ["in", org_names]},
            fields=provider_fields,
        )
        for prov in org_providers:
            provider_map[prov["name"]] = {**prov, "source": "organization"}

    providers = list(provider_map.values())
    for prov in providers:
        prov["organization_name"] = org_label_map.get(prov.get("organization"))

    return providers


@frappe.whitelist()
def get_progress():
    """
    Get onboarding progress for the current user
    Returns the current step and completion status based on Provider doctype
    
    NEW LOGIC:
    - If user has an organization, automatically skip onboarding and show dashboard
    - Dashboard will show alerts/checklist for any missing setup items
    """
    user = frappe.session.user
    
    # FIRST: Check if user owns/manages an Organization
    # If they have an organization, skip onboarding and go to dashboard
    user_orgs = frappe.get_all(
        "Organization",
        filters={"owner_user": user},
        fields=["name", "organization_name", "slug"],
        limit=1
    )
    
    if user_orgs:
        # User has an organization - skip onboarding, show dashboard
        # Dashboard will show alerts for any missing setup items
        org = user_orgs[0]
        
        # Get provider if exists
        provider = frappe.db.get_value(
            "Provider",
            {"user": user},
            ["name", "onboarding_complete", "onboarding_current_step", "onboarding_type", "organization"],
            as_dict=True,
        )
        
        # Mark onboarding as complete so they see dashboard instead of wizard
        return {
            "current_step": 5,
            "completed_steps": [1, 2, 3, 4, 5],
            "onboarding_complete": True,
            "completed_at": None,  # Will be set if provider exists
            "onboarding_type": provider.get("onboarding_type") if provider else "organization",
            "selected_organization": {
                "name": org.name,
                "organization_name": org.organization_name,
                "slug": org.slug
            },
        }
    
    # SECOND: Check if Provider exists for this user (for individual providers)
    provider = frappe.db.get_value(
        "Provider",
        {"user": user},
        ["name", "onboarding_complete", "onboarding_current_step", "onboarding_type", "onboarding_organization", "organization"],
        as_dict=True,
    )
    
    if provider:
        # Check if provider is linked to an organization
        if provider.get("organization"):
            # Provider belongs to an organization - skip onboarding, show dashboard
            org = frappe.db.get_value(
                "Organization",
                provider.organization,
                ["name", "organization_name", "slug"],
                as_dict=True,
            )
            if org:
                return {
                    "current_step": 5,
                    "completed_steps": [1, 2, 3, 4, 5],
                    "onboarding_complete": True,
                    "completed_at": frappe.db.get_value("Provider", provider.name, "onboarding_completed_at"),
                    "onboarding_type": "organization",
                    "selected_organization": {
                        "name": org.name,
                        "organization_name": org.organization_name,
                        "slug": org.slug
                    },
                }
    
    if provider:
        """
        NEW STRATEGY:
        - Trust Provider.onboarding_current_step as the single source of truth
        - completed_steps is everything BEFORE current_step
        - This avoids jumping ahead based on leftover data (locations, services, etc.)
        - Each step's save API is responsible for bumping onboarding_current_step
        """

        current_step = provider.onboarding_current_step or 1

        selected_org_summary = None
        selected_org = provider.get("onboarding_organization")
        if selected_org:
            selected_org_summary = frappe.db.get_value(
                "Organization",
                selected_org,
                ["name", "organization_name", "slug"],
                as_dict=True,
            )

        # Clamp current_step between 1 and 5
        if current_step < 1:
            current_step = 1
        if current_step > 5:
            current_step = 5

        # Steps completed are all steps before current_step
        completed_steps = list(range(1, int(current_step)))

        # If onboarding_complete flag is set, treat all steps as completed
        if provider.onboarding_complete:
            completed_steps = [1, 2, 3, 4, 5]
            completed_at = frappe.db.get_value("Provider", provider.name, "onboarding_completed_at")
            return {
                "current_step": 5,
                "completed_steps": completed_steps,
                "onboarding_complete": True,
                "completed_at": completed_at,
                "onboarding_type": provider.get("onboarding_type"),
                "selected_organization": selected_org_summary,
            }

        return {
            "current_step": int(current_step),
            "completed_steps": completed_steps,
            "onboarding_complete": False,
            "completed_at": None,
            "onboarding_type": provider.get("onboarding_type"),
            "selected_organization": selected_org_summary,
        }
    
    # No Provider exists - start from Step 1
    return {
        "current_step": 1,
        "completed_steps": [],
        "onboarding_complete": False,
        "completed_at": None,
        "onboarding_type": None
    }


@frappe.whitelist()
def get_debug_info():
    """
    Get comprehensive debug information about current user's setup
    Shows: Organizations, Providers, Services, Locations, Booking Links, etc.
    """
    user = frappe.session.user
    
    try:
        debug_info = {
            "user": {
                "email": user,
                "full_name": frappe.db.get_value("User", user, "full_name"),
                "roles": frappe.get_roles(user)
            },
            "organizations": [],
            "providers": [],
            "services": [],
            "locations": [],
            "event_types": [],
            "booking_links": [],
            "appointments": [],
            "onboarding": {},
            "summary": {}
        }
        
        # Get onboarding progress
        progress = get_progress()
        debug_info["onboarding"] = progress
        
        # Get organizations owned/managed by user
        # Use owner_user field - if Administrator, get all organizations
        if user == "Administrator":
            # Administrator can see all organizations
            user_orgs = frappe.get_all(
                "Organization",
                fields=["name", "organization_name", "organization_type", "email", "phone", "slug", "is_active", "setup_complete", "logo", "owner_user"],
                limit=50
            )
        else:
            # Regular users see only organizations where they are the owner
            user_orgs = frappe.get_all(
                "Organization",
                filters={"owner_user": user},
                fields=["name", "organization_name", "organization_type", "email", "phone", "slug", "is_active", "setup_complete", "logo", "owner_user"]
            )
        
        debug_info["organizations"] = user_orgs
        
        # Get providers for this user
        # For Administrator, show all providers. For others, show providers linked to their organizations
        if user == "Administrator":
            # Administrator can see all providers
            providers = frappe.get_all(
                "Provider",
                fields=["name", "provider_name", "email", "phone", "organization", "onboarding_complete", "onboarding_type", "profile_photo", "is_active", "user"]
            )
        else:
            # Get providers linked to user's organizations
            user_org_names = [org["name"] for org in user_orgs]
            if user_org_names:
                # Get providers that belong to user's organizations
                providers = []
                all_providers = frappe.get_all("Provider", fields=["name", "provider_name", "email", "phone", "organization", "onboarding_complete", "onboarding_type", "profile_photo", "is_active", "user"])
                for prov in all_providers:
                    prov_doc = frappe.get_doc("Provider", prov.name)
                    if hasattr(prov_doc, 'organizations') and prov_doc.organizations:
                        for org_row in prov_doc.organizations:
                            if org_row.organization in user_org_names:
                                providers.append(prov)
                                break
            else:
                # No organizations, check if user has a provider account
                providers = frappe.get_all(
                    "Provider",
                    filters={"user": user},
                    fields=["name", "provider_name", "email", "phone", "organization", "onboarding_complete", "onboarding_type", "profile_photo", "is_active", "user"]
                )
        
        # Get organizations from Provider Organization child table
        for provider in providers:
            provider_doc = frappe.get_doc("Provider", provider.name)
            orgs_list = []
            if hasattr(provider_doc, 'organizations') and provider_doc.organizations:
                for org_row in provider_doc.organizations:
                    org_info = frappe.db.get_value(
                        "Organization",
                        org_row.organization,
                        ["name", "organization_name", "organization_type", "slug"],
                        as_dict=True
                    )
                    if org_info:
                        orgs_list.append({
                            **org_info,
                            "status": org_row.status,
                            "accept_org_bookings": org_row.accept_org_bookings,
                            "is_primary": org_row.is_primary
                        })
            provider["organizations"] = orgs_list
            
            # Get provider locations
            locations_list = []
            if hasattr(provider_doc, 'locations') and provider_doc.locations:
                for loc_row in provider_doc.locations:
                    loc_info = frappe.db.get_value(
                        "Location",
                        loc_row.location,
                        ["name", "location_name", "organization", "address_line_1", "city", "is_active"],
                        as_dict=True
                    )
                    if loc_info:
                        locations_list.append({
                            **loc_info,
                            "is_primary": loc_row.is_primary
                        })
            provider["locations"] = locations_list
        
        debug_info["providers"] = providers
        
        # Get services (all services, not just user's)
        # Note: provider field removed, use service_providers child table instead
        services = frappe.get_all(
            "Service",
            fields=["name", "service_name", "duration", "price", "is_active", "organization"],
            limit=50
        )
        # Add provider information from child table
        for service in services:
            service_providers = frappe.get_all(
                "Service Provider",
                filters={"parent": service.name, "status": "Active"},
                fields=["provider", "is_primary", "price_override", "duration_override"]
            )
            service["providers"] = service_providers
        debug_info["services"] = services
        
        # Get locations
        locations = frappe.get_all(
            "Location",
            fields=["name", "location_name", "organization", "address_line_1", "city", "is_active"],
            limit=50
        )
        debug_info["locations"] = locations
        
        # Get EventTypes
        event_types = frappe.get_all(
            "EventType",
            fields=["name", "event_type_name", "service", "provider", "location", "is_active"],
            limit=50
        )
        debug_info["event_types"] = event_types
        
        # Get booking links (User Appointment Availability)
        # For Administrator, show all booking links. For others, show links for their providers
        if user == "Administrator":
            # Administrator can see all booking links
            booking_links = frappe.get_all(
                "User Appointment Availability",
                fields=["name", "slug", "user", "meeting_provider", "enable_scheduling"],
                limit=100
            )
        else:
            # Get booking links for user's providers
            # First get all providers linked to user's organizations
            provider_emails = []
            for prov in providers:
                if prov.get("email"):
                    provider_emails.append(prov["email"])
            
            # Also check if user has a direct provider account
            user_provider = frappe.get_all(
                "Provider",
                filters={"user": user},
                fields=["email"],
                limit=1
            )
            if user_provider and user_provider[0].get("email"):
                provider_emails.append(user_provider[0]["email"])
            
            # Get booking links for all these providers
            if provider_emails:
                booking_links = frappe.get_all(
                    "User Appointment Availability",
                    filters={"user": ["in", provider_emails]},
                    fields=["name", "slug", "user", "meeting_provider", "enable_scheduling"]
                )
            else:
                # Fallback: just user's own booking links
                booking_links = frappe.get_all(
                    "User Appointment Availability",
                    filters={"user": user},
                    fields=["name", "slug", "user", "meeting_provider", "enable_scheduling"]
                )
        
        # Enrich booking links with provider info and URLs
        for link in booking_links:
            if link.slug:
                link["booking_url"] = f"/schedule/in/{link.slug}"
            
            # Get provider name for this booking link
            if link.user:
                provider_info = frappe.get_all(
                    "Provider",
                    filters={"email": link.user},
                    fields=["name", "provider_name"],
                    limit=1
                )
                if provider_info:
                    link["provider_name"] = provider_info[0].provider_name
                    link["provider_id"] = provider_info[0].name
        
        debug_info["booking_links"] = booking_links
        
        # Get appointments
        provider_names = [p["name"] for p in providers]
        if provider_names:
            appointments = frappe.get_all(
                "Appointment",
                filters={"provider": ["in", provider_names]},
                fields=["name", "appointment_id", "provider", "service", "location", "status", "appointment_date", "client_name"],
                limit=20,
                order_by="appointment_date desc"
            )
            debug_info["appointments"] = appointments
        
        # Create summary
        debug_info["summary"] = {
            "organizations_count": len(user_orgs),
            "providers_count": len(providers),
            "services_count": len(services),
            "locations_count": len(locations),
            "event_types_count": len(event_types),
            "booking_links_count": len(booking_links),
            "appointments_count": len(debug_info.get("appointments", [])),
            "onboarding_complete": progress.get("onboarding_complete", False),
            "onboarding_type": progress.get("onboarding_type"),
            "has_organization": len(user_orgs) > 0,
            "has_provider": len(providers) > 0,
            "has_booking_link": len(booking_links) > 0,
            "has_services": len(services) > 0,
            "has_locations": len(locations) > 0
        }
        
        frappe.response["message"] = debug_info
    
    except Exception as e:
        frappe.log_error(str(e), "Onboarding: Get Debug Info Error")
        frappe.response["message"] = {
            "error": str(e),
            "user": user
        }


@frappe.whitelist()
def get_detailed_checklist():
    """
    Get detailed setup checklist with actual completion status
    Returns granular checklist for dashboard display
    """
    user = frappe.session.user
    
    try:
        # Check if user owns/manages an Organization first
        user_orgs = frappe.get_all(
            "Organization",
            filters={"owner_user": user},
            fields=["name", "organization_name", "slug", "email", "phone", "organization_type"],
            limit=1
        )
        
        is_organization_user = bool(user_orgs)
        organization = user_orgs[0] if user_orgs else None
        
        # Get Provider for this user (might be linked to organization)
        provider_data = frappe.db.get_value(
            "Provider",
            {"user": user},
            ["name", "provider_name", "profile_photo", "timezone", "calendar_preference", "organization", "onboarding_type"],
            as_dict=True
        )
        
        # If provider is linked to organization, use that organization
        # Check Provider Organization child table (new model)
        if provider_data:
            provider_doc = frappe.get_doc("Provider", provider_data.name)
            if hasattr(provider_doc, 'organizations') and provider_doc.organizations:
                # Get first active organization
                for org_row in provider_doc.organizations:
                    if org_row.status == "Active":
                        organization = frappe.db.get_value(
                            "Organization",
                            org_row.organization,
                            ["name", "organization_name", "slug", "email", "phone", "organization_type"],
                            as_dict=True
                        )
                        is_organization_user = bool(organization)
                        break
        
        checklist_items = []
        
        # Organization-specific checklist items
        if is_organization_user and organization:
            org_name = organization.name
            
            # 1. Organization Profile Complete
            org_profile_complete = bool(
                organization.organization_name and
                organization.email and
                organization.phone
            )
            checklist_items.append({
                "id": "org_profile",
                "title": "Complete organization profile",
                "description": "Add name, email, and phone",
                "completed": org_profile_complete,
                "action_url": "/settings/organization",
                "priority": 1
            })
            
            # 2. Organization Providers Added
            # Use Provider Organization child table (new model)
            org_provider_rows = frappe.get_all(
                "Provider Organization",
                filters={"organization": org_name, "status": "Active"},
                fields=["parent"]
            )
            org_provider_names = [row.parent for row in org_provider_rows]
            providers_count = len(org_provider_names)
            has_providers = providers_count > 0
            checklist_items.append({
                "id": "org_providers",
                "title": "Add providers to organization",
                "description": f"{providers_count} provider(s) added",
                "completed": has_providers,
                "action_url": "/settings/providers",
                "priority": 2
            })
            
            # 3. Organization Locations Set Up
            # Get locations through providers in organization
            location_names = set()
            for prov_name in org_provider_names:
                prov_locations = frappe.get_all("Provider Location", filters={"parent": prov_name}, pluck="location")
                location_names.update(prov_locations)
            # Also get organization branch locations
            org_branch_locations = frappe.get_all("Location", filters={"organization": org_name}, pluck="name")
            location_names.update(org_branch_locations)
            locations_count = len(location_names)
            has_locations = locations_count > 0
            checklist_items.append({
                "id": "org_locations",
                "title": "Set up organization locations",
                "description": f"{locations_count} location(s) configured",
                "completed": has_locations,
                "action_url": "/settings/locations",
                "priority": 3
            })
            
            # 4. Organization Services Created
            # Check if any services exist and are linked to organization through EventTypes
            org_event_types = frappe.get_all("EventType", filters={"provider": ["in", org_provider_names]}, fields=["service"], limit=1) if org_provider_names else []
            services_count = frappe.db.count("Service")  # Check total services
            has_services = services_count > 0
            checklist_items.append({
                "id": "org_services",
                "title": "Create organization services",
                "description": f"{services_count} service(s) available",
                "completed": has_services,
                "action_url": "/settings/services",
                "priority": 4
            })
            
            # 5. Organization Availability Set (check if locations have opening hours)
            locations_with_hours = 0
            for loc_name in location_names:
                hours_count = frappe.db.count("Opening Hours", {"parent": loc_name})
                if hours_count > 0:
                    locations_with_hours += 1
            has_availability = locations_with_hours > 0 if location_names else False
            checklist_items.append({
                "id": "org_availability",
                "title": "Set organization availability",
                "description": f"{locations_with_hours}/{len(location_names)} location(s) configured" if location_names else "No locations added yet",
                "completed": has_availability,
                "action_url": "/settings/availability",
                "priority": 5
            })
            
            # 6. Organization Booking Link Shared
            # Check if any provider has a booking link
            # Get provider emails from org_provider_names
            org_provider_emails = []
            for prov_name in org_provider_names:
                prov_email = frappe.db.get_value("Provider", prov_name, "email")
                if prov_email:
                    org_provider_emails.append(prov_email)
            
            has_booking_link = False
            booking_url = None
            for prov_email in org_provider_emails:
                availability_slug = frappe.db.get_value("User Appointment Availability", {"user": prov_email}, "slug")
                if availability_slug:
                    has_booking_link = True
                    booking_url = f"/schedule/in/{availability_slug}"
                    break
            
            # Also check organization's own booking URLs from child table
            if not has_booking_link:
                org_doc = frappe.get_doc("Organization", org_name)
                if hasattr(org_doc, 'booking_urls') and org_doc.booking_urls:
                    for url_row in org_doc.booking_urls:
                        if url_row.is_active and url_row.full_url:
                            has_booking_link = True
                            booking_url = url_row.full_url
                            break
            
            checklist_items.append({
                "id": "org_booking_link",
                "title": "Share organization booking link",
                "description": "Enable public booking for your organization",
                "completed": has_booking_link,
                "action_url": "/settings/booking-link",
                "booking_url": booking_url,
                "priority": 6
            })
            
            # 7. First Organization Booking Received
            # Count appointments for all providers in organization
            # org_provider_names already set above from Provider Organization child table
            booking_count = frappe.db.count("Appointment", {"provider": ["in", org_provider_names]}) if org_provider_names else 0
            has_booking = booking_count > 0
            checklist_items.append({
                "id": "org_first_booking",
                "title": "Receive first organization booking",
                "description": f"{booking_count} booking(s) received",
                "completed": has_booking,
                "action_url": booking_url,
                "priority": 7
            })
            
            # Calculate stats
            completed_count = sum(1 for item in checklist_items if item["completed"])
            total_count = len(checklist_items)
            progress_percent = round((completed_count / total_count) * 100) if total_count > 0 else 0
            
            frappe.response["message"] = {
                "items": checklist_items,
                "completed_count": completed_count,
                "total_count": total_count,
                "progress_percent": progress_percent,
                "all_complete": completed_count == total_count
            }
            return
        
        # Individual provider checklist (existing logic)
        if not provider_data:
            # Return empty checklist if no provider
            frappe.response["message"] = {
                "items": [],
                "completed_count": 0,
                "total_count": 7,
                "progress_percent": 0
            }
            return
        
        provider_name = provider_data.name
        
        # 1. Profile Complete
        profile_complete = bool(
            provider_data.provider_name and 
            provider_data.timezone
        )
        checklist_items.append({
            "id": "profile",
            "title": "Complete your profile",
            "description": "Add your name, photo, and timezone",
            "completed": profile_complete,
            "action_url": "/settings/profile",
            "priority": 1
        })
        
        # 2. Calendar Connected
        calendar_connected = bool(provider_data.calendar_preference in ["google", "builtin"])
        checklist_items.append({
            "id": "calendar",
            "title": "Connect calendar",
            "description": "Google Calendar or use built-in",
            "completed": calendar_connected,
            "action_url": "/settings/calendar",
            "priority": 2
        })
        
        # 3. Availability Set
        has_availability = False
        locations = frappe.db.get_all("Provider Location", filters={"parent": provider_name}, fields=["location"])
        if locations:
            location_name = locations[0].location
            opening_hours_count = frappe.db.count("Opening Hours", {"parent": location_name})
            has_availability = opening_hours_count > 0
        
        checklist_items.append({
            "id": "availability",
            "title": "Set availability",
            "description": "Define your working hours",
            "completed": has_availability,
            "action_url": "/settings/availability",
            "priority": 3
        })
        
        # 4. First Service Created
        service_count = frappe.db.count("EventType", {"provider": provider_name})
        has_service = service_count > 0
        
        checklist_items.append({
            "id": "service",
            "title": "Create appointment type",
            "description": "Add services you offer",
            "completed": has_service,
            "action_url": "/settings/services",
            "priority": 4
        })
        
        # 5. Booking Link Shared (check if user_appointment_availability exists)
        availability_slug = frappe.db.get_value(
            "User Appointment Availability",
            {"user": user},
            "slug"
        )
        has_booking_link = bool(availability_slug)
        
        checklist_items.append({
            "id": "booking_link",
            "title": "Share booking link",
            "description": "Send to your first customer",
            "completed": has_booking_link,
            "action_url": "/settings/booking-link",
            "booking_url": f"/schedule/in/{availability_slug}" if availability_slug else None,
            "priority": 5
        })
        
        # 6. First Booking Received
        booking_count = frappe.db.count("Appointment", {"provider": provider_name})
        has_booking = booking_count > 0
        
        checklist_items.append({
            "id": "first_booking",
            "title": "Receive first booking",
            "description": "Test or get your first customer",
            "completed": has_booking,
            "action_url": f"/schedule/in/{availability_slug}" if availability_slug else None,
            "priority": 6
        })
        
        # 7. Payment Method Configured (placeholder - implement when payment integration ready)
        # For now, check if any payment settings exist
        has_payment = False  # TODO: Implement payment check
        
        checklist_items.append({
            "id": "payment",
            "title": "Add payment method",
            "description": "telebirr or Chapa integration",
            "completed": has_payment,
            "action_url": "/settings/payments",
            "priority": 7
        })
        
        # Calculate stats
        completed_count = sum(1 for item in checklist_items if item["completed"])
        total_count = len(checklist_items)
        progress_percent = round((completed_count / total_count) * 100) if total_count > 0 else 0
        
        frappe.response["message"] = {
            "items": checklist_items,
            "completed_count": completed_count,
            "total_count": total_count,
            "progress_percent": progress_percent,
            "all_complete": completed_count == total_count
        }
    
    except Exception as e:
        frappe.log_error(str(e), "Onboarding: Get Detailed Checklist Error")
        frappe.response["message"] = {
            "items": [],
            "completed_count": 0,
            "total_count": 7,
            "progress_percent": 0,
            "error": str(e)
        }


@frappe.whitelist()
def set_onboarding_type(onboarding_type):
    """
    Set the onboarding type (individual or organization) for the current user
    This is called before the actual onboarding wizard starts
    For Administrator: allows resetting onboarding even after completion
    """
    user = frappe.session.user
    is_administrator = user == "Administrator"
    
    if onboarding_type not in ['individual', 'organization']:
        frappe.throw(_("Invalid onboarding type. Must be 'individual' or 'organization'."))
    
    try:
        # Check if Provider already exists for this user
        existing_provider = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if existing_provider:
            # Update existing Provider
            provider = frappe.get_doc("Provider", existing_provider)
            old_type = provider.onboarding_type
            
            # Reset onboarding if switching types OR if Administrator wants to reset
            if provider.onboarding_type != onboarding_type or is_administrator:
                provider.onboarding_type = onboarding_type
                provider.onboarding_current_step = 1
                provider.onboarding_complete = 0
                provider.onboarding_completed_at = None
                provider.onboarding_organization = None
            else:
                provider.onboarding_type = onboarding_type
            
            if onboarding_type != "organization":
                provider.onboarding_organization = None
            
            provider.save(ignore_permissions=True)
        else:
            # Create a minimal Provider record with just the type set
            provider = frappe.new_doc("Provider")
            provider.user = user
            # Get user's full name and set both full_name and provider_name
            user_full_name = frappe.db.get_value("User", user, "full_name")
            if user_full_name:
                provider.full_name = user_full_name
                provider.provider_name = user_full_name
            else:
                # Fallback to email if no full name
                provider.provider_name = user
            provider.onboarding_type = onboarding_type
            provider.onboarding_current_step = 1
            provider.onboarding_organization = None
            provider.insert(ignore_permissions=True)
        
        frappe.db.commit()
        
        # Return updated progress
        return get_progress()
    except Exception as e:
        frappe.log_error(str(e), "Onboarding: Set Type Error")
        frappe.throw(str(e))


@frappe.whitelist()
def reset_onboarding_type():
    """
    Reset onboarding type for Administrator (for testing purposes)
    Clears onboarding_type to allow re-selection
    """
    user = frappe.session.user
    
    if user != "Administrator":
        frappe.throw(_("Only Administrator can reset onboarding type."))
    
    try:
        # Check if Provider exists
        existing_provider = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if existing_provider:
            provider = frappe.get_doc("Provider", existing_provider)
            provider.onboarding_type = None
            provider.onboarding_current_step = 1
            provider.onboarding_complete = 0
            provider.onboarding_completed_at = None
            provider.save(ignore_permissions=True)
        
        frappe.db.commit()
        
        # Return updated progress
        return get_progress()
    except Exception as e:
        frappe.log_error(str(e), "Onboarding: Reset Type Error")
        frappe.throw(str(e))


@frappe.whitelist()
def save_profile(business_name, business_type, timezone, language):
    """
    Save business profile (Step 1) - Create Provider doctype
    """
    user = frappe.session.user
    
    try:
        # Check if Provider already exists for this user
        existing_provider = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if existing_provider:
            # Update existing Provider
            provider = frappe.get_doc("Provider", existing_provider)
            # Only update provider_name if it's different from the auto-generated one
            # This allows the user to customize it later
            if not provider.display_name and not provider.full_name:
                provider.provider_name = business_name
            provider.full_name = business_name
            provider.timezone = timezone
            provider.language = language
            provider.business_type = business_type
            provider.onboarding_current_step = 2
            provider.save()
        else:
            # Create new Provider
            provider = frappe.new_doc("Provider")
            # Set provider_name explicitly (required field)
            provider.provider_name = business_name
            provider.full_name = business_name
            provider.user = user
            provider.timezone = timezone
            provider.language = language
            provider.business_type = business_type
            provider.onboarding_current_step = 2
            provider.insert()
        
        frappe.db.commit()
        
        frappe.response["message"] = {
            "success": True,
            "profile_id": provider.name
        }
    except Exception as e:
        frappe.log_error(str(e), "Onboarding: Save Profile Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def connect_calendar(calendar_provider):
    """
    Connect calendar (Step 2)
    calendar_provider: 'google' or 'builtin'
    """
    user = frappe.session.user
    
    try:
        # Get Provider for this user
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not provider_name:
            frappe.throw(_("Provider not found. Please complete Step 1 first."))
        
        provider = frappe.get_doc("Provider", provider_name)
        
        if calendar_provider == "google":
            # TODO: Initiate OAuth flow for Google Calendar
            # For now, just mark preference
            provider.calendar_preference = "google"
            provider.onboarding_current_step = 3
            provider.save()
            
            frappe.db.commit()
            
            frappe.response["message"] = {
                "oauth_url": None,  # TODO: Return Google OAuth URL when implemented
                "success": True
            }
        else:
            # Built-in calendar - just mark as connected
            provider.calendar_preference = "builtin"
            provider.onboarding_current_step = 3
            provider.save()
            
            frappe.db.commit()
            
            frappe.response["message"] = {
                "success": True
            }
    except Exception as e:
        frappe.log_error(str(e), "Onboarding: Connect Calendar Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def save_availability(weekly_schedule):
    """
    Save weekly availability (Step 3) - Create Location with Opening Hours
    weekly_schedule: JSON string or dict with day keys and time slots
    """
    import json
    
    user = frappe.session.user
    
    try:
        # Parse weekly_schedule if it's a string
        if isinstance(weekly_schedule, str):
            weekly_schedule = json.loads(weekly_schedule)
        
        # Get Provider for this user
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not provider_name:
            frappe.throw(_("Provider not found. Please complete Step 1 first."))
        
        provider = frappe.get_doc("Provider", provider_name)
        
        # Check if Location already exists for this provider
        location = None
        location_name = f"{provider.provider_name} - Main Location"
        
        # First, check if provider already has locations linked
        if provider.locations:
            location = frappe.get_doc("Location", provider.locations[0].location)
        else:
            # Check if a Location with this name already exists (from previous attempt)
            existing_location = frappe.db.get_value("Location", {"location_name": location_name}, "name")
            if existing_location:
                location = frappe.get_doc("Location", existing_location)
                # Link it to provider if not already linked
                provider.append("locations", {
                    "location": location.name,
                    "is_primary": True
                })
                provider.save()
            else:
                # Create new Location
                location = frappe.new_doc("Location")
                location.location_name = location_name
                location.city = "Addis Ababa"
                location.timezone = provider.timezone or "Africa/Addis_Ababa"
                location.insert(ignore_permissions=True)
                
                # Apply default hours (8:30 AM - 6:00 PM, Mon-Fri)
                from frappe_appointment.scheduler.availability import apply_default_hours
                apply_default_hours("Location", location.name)
                
                # Link Location to Provider
                provider.append("locations", {
                    "location": location.name,
                    "is_primary": True
                })
                provider.save()
        
        # Clear existing opening hours if custom schedule provided
        # Otherwise, keep default hours
        if weekly_schedule:
            location.opening_hours = []
        
        # Map day names
        day_map = {
            "monday": "Monday",
            "tuesday": "Tuesday",
            "wednesday": "Wednesday",
            "thursday": "Thursday",
            "friday": "Friday",
            "saturday": "Saturday",
            "sunday": "Sunday"
        }
        
        # Helper to normalize time strings to HH:MM:SS
        def normalize_time_str(value):
            if not value:
                return None
            # Accept values like "09:00" or "09:00:00"
            parts = str(value).split(":")
            if len(parts) == 2:
                return f"{parts[0].zfill(2)}:{parts[1].zfill(2)}:00"
            if len(parts) == 3:
                return f"{parts[0].zfill(2)}:{parts[1].zfill(2)}:{parts[2].zfill(2)}"
            return value
        
        # Add opening hours from weekly_schedule
        for day_key, schedule in weekly_schedule.items():
            day_name = day_map.get(day_key.lower(), day_key.capitalize())
            
            # Frontend sends list of {start, end} slots per day
            if isinstance(schedule, list):
                for slot in schedule:
                    start_time = normalize_time_str(slot.get("start"))
                    end_time = normalize_time_str(slot.get("end"))
                    if start_time and end_time:
                        location.append("opening_hours", {
                            "day_of_week": day_name,
                            "start_time": start_time,
                            "end_time": end_time,
                            "is_open": 1
                        })
                continue
            
            # Backward-compatibility: object with enabled/start_time/end_time
            if schedule and getattr(schedule, "get", None) and schedule.get("enabled", True):
                location.append("opening_hours", {
                    "day_of_week": day_name,
                    "start_time": normalize_time_str(schedule.get("start_time", "09:00:00")),
                    "end_time": normalize_time_str(schedule.get("end_time", "17:00:00")),
                    "is_open": 1
                })
        
        # If no custom schedule provided, ensure default hours are set
        if not weekly_schedule or not location.opening_hours:
            from frappe_appointment.scheduler.availability import apply_default_hours
            apply_default_hours("Location", location.name)
        
        location.save()
        
        # Apply default hours to Provider (inherit from Location)
        from frappe_appointment.scheduler.availability import apply_default_hours
        apply_default_hours("Provider", provider.name, "Location", location.name)
        
        # Update Provider onboarding step
        provider.onboarding_current_step = 4
        provider.save()
        
        frappe.db.commit()
        
        frappe.response["message"] = {
            "success": True,
            "location_id": location.name
        }
    except Exception as e:
        frappe.log_error(str(e), "Onboarding: Save Availability Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_service_details(service_id):
    """
    Get full details of a service including linked providers
    """
    user = frappe.session.user
    
    try:
        # Get the service
        service = frappe.get_doc("Service", service_id)
        
        # Check access - user must own the organization or be a provider linked to the service
        user_orgs = _fetch_user_organizations(user)
        user_provider = frappe.db.get_value("Provider", {"user": user}, "name")
        
        has_access = False
        if user == "Administrator":
            has_access = True
        elif service.organization:
            # Check if user owns the organization
            for org in user_orgs:
                if org["name"] == service.organization:
                    has_access = True
                    break
        elif user_provider:
            # Check if provider is linked to this service
            service_providers = frappe.get_all(
                "Service Provider",
                filters={"parent": service_id, "provider": user_provider},
                limit=1
            )
            if service_providers:
                has_access = True
        
        if not has_access:
            frappe.throw(_("You don't have access to this service"))
        
        # Get linked providers from Service Provider child table
        service_providers = frappe.get_all(
            "Service Provider",
            filters={"parent": service_id},
            fields=["provider", "is_primary", "status", "price_override", "duration_override", "commission_rate", "notes"],
            order_by="is_primary desc, creation asc"
        )
        
        providers = []
        for sp in service_providers:
            prov = frappe.db.get_value(
                "Provider",
                sp.provider,
                ["name", "provider_name", "email", "phone"],
                as_dict=True
            )
            if prov:
                providers.append({
                    "name": prov.name,
                    "provider_name": prov.provider_name,
                    "email": prov.email,
                    "phone": prov.get("phone", ""),
                    "is_primary": sp.is_primary,
                    "status": sp.status,
                    "price_override": sp.price_override,
                    "duration_override": sp.duration_override,
                    "commission_rate": sp.commission_rate,
                    "notes": sp.notes
                })
        
        frappe.response["message"] = {
            "success": True,
            "service": {
                "name": service.name,
                "service_name": service.service_name,
                "description": service.description or "",
                "duration": service.duration,
                "price": service.price,
                "buffer_before": service.buffer_before,
                "buffer_after": service.buffer_after,
                "organization": service.organization,
                "currency": getattr(service, "currency", "ETB")
            },
            "providers": providers
        }
    except Exception as e:
        frappe.log_error(str(e), "Get Service Details Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_available_providers_for_service(service_id, organization_id=None):
    """
    Get providers that can be linked to a service
    Returns providers in the organization that aren't already linked to the service
    
    Args:
        service_id: Service document name
        organization_id: Optional organization to filter providers
    """
    user = frappe.session.user
    
    try:
        # Get the service
        service = frappe.get_doc("Service", service_id)
        org_name = organization_id or service.organization
        
        if not org_name:
            frappe.throw(_("Service must belong to an organization"))
        
        # Get providers already linked to this service
        existing_providers = frappe.get_all(
            "Service Provider",
            filters={"parent": service_id},
            fields=["provider"]
        )
        existing_provider_names = set([ep.provider for ep in existing_providers])
        
        # Get all providers in the organization (from Provider Organization child table)
        provider_orgs = frappe.get_all(
            "Provider Organization",
            filters={"organization": org_name, "status": "Active"},
            fields=["parent", "is_primary"]
        )
        
        available_providers = []
        for po in provider_orgs:
            if po.parent not in existing_provider_names:
                prov = frappe.db.get_value(
                    "Provider",
                    po.parent,
                    ["name", "provider_name", "email", "phone"],
                    as_dict=True
                )
                if prov:
                    available_providers.append({
                        "name": prov.name,
                        "provider_name": prov.provider_name,
                        "email": prov.email,
                        "phone": prov.get("phone", ""),
                        "is_primary_org": po.is_primary
                    })
        
        frappe.response["message"] = {
            "success": True,
            "providers": available_providers
        }
    except Exception as e:
        frappe.log_error(str(e), "Get Available Providers for Service Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e),
            "providers": []
        }


@frappe.whitelist()
def get_service_providers(service_id=None):
    """
    Get all providers linked to a service
    
    Args:
        service_id: Service document name (optional, returns empty list if not provided)
    
    Returns:
        List of providers with their details
    """
    user = frappe.session.user
    
    try:
        # If service_id is not provided, return empty list
        if not service_id:
            frappe.response["message"] = {
                "success": True,
                "providers": []
            }
            return
        
        # Get the service
        service = frappe.get_doc("Service", service_id)
        
        # Check access - user must own the organization
        user_orgs = _fetch_user_organizations(user)
        has_access = False
        if user == "Administrator":
            has_access = True
        elif service.organization:
            for org in user_orgs:
                if org["name"] == service.organization:
                    has_access = True
                    break
        
        if not has_access:
            frappe.throw(_("You don't have access to this service"))
        
        # Get linked providers from Service Provider child table
        service_providers = frappe.get_all(
            "Service Provider",
            filters={"parent": service_id, "status": "Active"},
            fields=["provider", "is_primary", "status"],
            order_by="is_primary desc, creation asc"
        )
        
        providers = []
        for sp in service_providers:
            prov = frappe.db.get_value(
                "Provider",
                sp.provider,
                ["name", "provider_name", "email", "phone"],
                as_dict=True
            )
            if prov:
                providers.append({
                    "name": prov.name,
                    "provider_name": prov.provider_name,
                    "email": prov.email,
                    "phone": prov.get("phone", ""),
                    "is_primary": sp.is_primary,
                    "status": sp.status
                })
        
        frappe.response["message"] = {
            "success": True,
            "providers": providers
        }
    except Exception as e:
        frappe.log_error(str(e), "Get Service Providers Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e),
            "providers": []
        }


@frappe.whitelist()
def remove_provider_from_service(service_id, provider_id):
    """
    Remove a provider from a service by deleting from Service Provider child table
    """
    user = frappe.session.user
    
    try:
        # Get the service
        service = frappe.get_doc("Service", service_id)
        
        # Find and remove the provider
        found = False
        for sp in service.service_providers:
            if sp.provider == provider_id:
                service.remove(sp)
                found = True
                break
        
        if not found:
            frappe.throw(_("Provider is not linked to this service"))
        
        service.save(ignore_permissions=True)
        
        frappe.response["message"] = {
            "success": True,
            "message": "Provider removed from service successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Remove Provider from Service Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def link_provider_to_service(service_id, provider_id, is_primary=False, price_override=None, duration_override=None, commission_rate=None, notes=""):
    """
    Link a provider to a service by adding to Service Provider child table
    
    Args:
        service_id: Service document name
        provider_id: Provider document name
        is_primary: Whether this provider is primary for the service
        price_override: Optional price override
        duration_override: Optional duration override
        commission_rate: Optional commission rate
        notes: Optional notes
    """
    user = frappe.session.user
    
    try:
        # Get the service
        service = frappe.get_doc("Service", service_id)
        
        # Check if provider is already linked
        existing = frappe.get_all(
            "Service Provider",
            filters={"parent": service_id, "provider": provider_id},
            limit=1
        )
        
        if existing:
            frappe.throw(_("Provider is already linked to this service"))
        
        # If marking as primary, unmark other primaries
        if is_primary:
            existing_primaries = frappe.get_all(
                "Service Provider",
                filters={"parent": service_id, "is_primary": 1},
                fields=["name"]
            )
            for ep in existing_primaries:
                sp_doc = frappe.get_doc("Service Provider", ep.name)
                sp_doc.is_primary = 0
                sp_doc.save(ignore_permissions=True)
        
        # Add provider to service
        service.append("service_providers", {
            "provider": provider_id,
            "status": "Active",
            "is_primary": 1 if is_primary else 0,
            "price_override": float(price_override) if price_override else None,
            "duration_override": int(duration_override) if duration_override else None,
            "commission_rate": float(commission_rate) if commission_rate else None,
            "notes": notes
        })
        
        service.save(ignore_permissions=True)
        
        frappe.response["message"] = {
            "success": True,
            "message": "Provider linked to service successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Link Provider to Service Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_service_form_data():
    """
    Get data needed for service creation form:
    - User's organizations
    - Providers (for organizations or individual)
    - Locations (for organizations or providers)
    """
    user = frappe.session.user
    
    try:
        # Get user's organizations
        user_orgs = _fetch_user_organizations(user)
        
        # Get current user's provider
        user_provider = frappe.db.get_value(
            "Provider",
            {"user": user},
            ["name", "provider_name", "email"],
            as_dict=True
        )
        
        # Get providers for user's organizations
        org_providers_map = {}
        if user_orgs:
            for org in user_orgs:
                # Get providers from Provider Organization child table
                provider_orgs = frappe.get_all(
                    "Provider Organization",
                    filters={"organization": org["name"], "status": "Active"},
                    fields=["parent", "is_primary"]
                )
                providers = []
                for po in provider_orgs:
                    prov = frappe.db.get_value(
                        "Provider",
                        po.parent,
                        ["name", "provider_name", "email"],
                        as_dict=True
                    )
                    if prov:
                        providers.append({
                            **prov,
                            "is_primary": po.is_primary
                        })
                org_providers_map[org["name"]] = providers
        
        # Get locations
        locations = []
        
        # Get organization branch locations
        if user_orgs:
            for org in user_orgs:
                org_locations = frappe.get_all(
                    "Location",
                    filters={"organization": org["name"]},
                    fields=["name", "location_name", "address_line_1", "city"]
                )
                locations.extend(org_locations)
        
        # Get provider locations
        if user_provider:
            provider_doc = frappe.get_doc("Provider", user_provider.name)
            if hasattr(provider_doc, 'locations') and provider_doc.locations:
                for loc_row in provider_doc.locations:
                    loc = frappe.db.get_value(
                        "Location",
                        loc_row.location,
                        ["name", "location_name", "address_line_1", "city", "organization"],
                        as_dict=True
                    )
                    if loc and loc.name not in [l.name for l in locations]:
                        locations.append(loc)
        
        # Deduplicate locations
        seen_locs = set()
        unique_locations = []
        for loc in locations:
            if loc.name not in seen_locs:
                seen_locs.add(loc.name)
                unique_locations.append(loc)
        
        frappe.response["message"] = {
            "organizations": user_orgs,
            "user_provider": user_provider,
            "org_providers": org_providers_map,
            "locations": unique_locations,
            "is_organization_user": len(user_orgs) > 0
        }
    except Exception as e:
        frappe.log_error(str(e), "Get Service Form Data Error")
        frappe.response["message"] = {
            "organizations": [],
            "user_provider": None,
            "org_providers": {},
            "locations": [],
            "is_organization_user": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_provider_locations(organization=None):
    """
    Get all locations accessible to the current user/provider
    If organization is provided, filter locations by that organization
    
    Returns locations from:
    - All locations (for admin users)
    - Provider's linked locations (Provider.locations child table)
    - Organization branch locations (Location.organization)
    - Organizations the user owns/manages
    """
    """
    Get all locations accessible to the current user/provider
    Returns locations from:
    - All locations (for admin users)
    - Provider's linked locations (Provider.locations child table)
    - Organization branch locations (Location.organization)
    - Organizations the user owns/manages
    """
    debug_message = []
    user = frappe.session.user
    locations = []
    seen_locs = set()
    
    debug_message.append(f"=== get_provider_locations() called ===")
    debug_message.append(f"User: {user}")
    debug_message.append(f"Initial locations list: {len(locations)}")
    debug_message.append(f"Initial seen_locs: {len(seen_locs)}")
    
    try:
        # For Administrator, get all locations (filtered by organization if provided)
        if user == "Administrator":
            debug_message.append(f"User is Administrator - fetching all locations")
            filters = {}
            if organization:
                filters["organization"] = organization
                debug_message.append(f"Filtering by organization: {organization}")
            all_locations = frappe.get_all(
                "Location",
                filters=filters,
                fields=["name", "location_name"]
            )
            debug_message.append(f"Query returned {len(all_locations)} locations from DB")
            
            for i, loc in enumerate(all_locations):
                loc_name = loc.get("name")
                loc_display_name = loc.get("location_name")
                debug_message.append(f"  Location {i+1}: name={loc_name}, location_name={loc_display_name}")
                if loc_name:
                    locations.append({
                        "name": loc_name,
                        "location_name": loc_display_name or loc_name
                    })
                    debug_message.append(f"    ✓ Added to locations list (total: {len(locations)})")
                else:
                    debug_message.append(f"    ✗ Skipped - no loc_name")
            
            debug_message.append(f"After processing, locations list has {len(locations)} items")
        else:
            debug_message.append(f"User is NOT Administrator - fetching user-specific locations")
            # Get user's organizations
            user_orgs = _fetch_user_organizations(user)
            debug_message.append(f"User organizations: {len(user_orgs) if user_orgs else 0}")
            if user_orgs:
                debug_message.append(f"Organization names: {[org.get('name') if isinstance(org, dict) else org['name'] for org in user_orgs]}")
            
            # Get organization branch locations
            if user_orgs:
                debug_message.append(f"Fetching organization branch locations...")
                for org in user_orgs:
                    org_name = org.get("name") if isinstance(org, dict) else org["name"]
                    # If organization filter is provided, only get locations from that org
                    if organization and org_name != organization:
                        continue
                    debug_message.append(f"  Fetching locations for org: {org_name}")
                    org_locations = frappe.get_all(
                        "Location",
                        filters={"organization": org_name},
                        fields=["name", "location_name"]
                    )
                    debug_message.append(f"    Found {len(org_locations)} locations for {org_name}")
                    for loc in org_locations:
                        loc_name = loc.get("name") if loc else None
                        loc_display_name = loc.get("location_name") if loc else None
                        debug_message.append(f"      Processing: name={loc_name}, location_name={loc_display_name}, in_seen={loc_name in seen_locs if loc_name else 'N/A'}")
                        if loc_name and loc_name not in seen_locs:
                            seen_locs.add(loc_name)
                            locations.append({
                                "name": loc_name,
                                "location_name": loc_display_name or loc_name
                            })
                            debug_message.append(f"        ✓ Added (total: {len(locations)})")
                        else:
                            debug_message.append(f"        ✗ Skipped")
            else:
                debug_message.append(f"No user organizations found")
            
            # Get provider locations (from Provider.locations child table)
            debug_message.append(f"Checking for user provider...")
            user_provider = frappe.db.get_value(
                "Provider",
                {"user": user},
                ["name"],
                as_dict=True
            )
            debug_message.append(f"User provider: {user_provider}")
            
            if user_provider:
                provider_name = user_provider.get("name") if isinstance(user_provider, dict) else user_provider.name
                debug_message.append(f"Provider name: {provider_name}")
                provider_doc = frappe.get_doc("Provider", provider_name)
                debug_message.append(f"Provider doc loaded: {provider_name}")
                debug_message.append(f"Has locations attr: {hasattr(provider_doc, 'locations')}")
                if hasattr(provider_doc, 'locations'):
                    debug_message.append(f"Provider.locations: {len(provider_doc.locations) if provider_doc.locations else 0}")
                if hasattr(provider_doc, 'locations') and provider_doc.locations:
                    debug_message.append(f"Fetching locations from Provider.locations child table...")
                    for i, loc_row in enumerate(provider_doc.locations):
                        debug_message.append(f"  Location row {i+1}: location={loc_row.location}")
                        loc = frappe.db.get_value(
                            "Location",
                            loc_row.location,
                            ["name", "location_name"],
                            as_dict=True
                        )
                        debug_message.append(f"    Location doc: {loc}")
                        if loc:
                            loc_name = loc.get("name")
                            debug_message.append(f"      loc_name={loc_name}, in_seen={loc_name in seen_locs if loc_name else 'N/A'}")
                            if loc_name and loc_name not in seen_locs:
                                seen_locs.add(loc_name)
                                locations.append({
                                    "name": loc_name,
                                    "location_name": loc.get("location_name")
                                })
                                debug_message.append(f"        ✓ Added (total: {len(locations)})")
                            else:
                                debug_message.append(f"        ✗ Skipped")
                else:
                    debug_message.append(f"No locations in Provider.locations child table")
            
            # Also get personal locations (where organization is null) if user is a provider
            if user_provider:
                debug_message.append(f"Fetching personal locations (organization is null)...")
                personal_locations = frappe.get_all(
                    "Location",
                    filters={"organization": ["is", "not set"]},
                    fields=["name", "location_name"]
                )
                debug_message.append(f"Found {len(personal_locations)} personal locations")
                for loc in personal_locations:
                    loc_name = loc.get("name") if loc else None
                    loc_display_name = loc.get("location_name") if loc else None
                    debug_message.append(f"  Processing: name={loc_name}, location_name={loc_display_name}, in_seen={loc_name in seen_locs if loc_name else 'N/A'}")
                    if loc_name and loc_name not in seen_locs:
                        seen_locs.add(loc_name)
                        locations.append({
                            "name": loc_name,
                            "location_name": loc_display_name or loc_name
                        })
                        debug_message.append(f"    ✓ Added (total: {len(locations)})")
                    else:
                        debug_message.append(f"    ✗ Skipped")
        
        debug_message.append(f"=== Final Results ===")
        debug_message.append(f"Total locations in response: {len(locations)}")
        debug_message.append(f"Locations list: {locations}")
        debug_message.append(f"seen_locs set: {list(seen_locs)}")
        
        frappe.response["message"] = {
            "locations": locations
        }
        
        # Log debug message
        debug_log = "\n".join(debug_message)
        frappe.log_error(debug_log, "Get Provider Locations Debug")
        
    except Exception as e:
        debug_message.append(f"=== EXCEPTION CAUGHT ===")
        debug_message.append(f"Error: {str(e)}")
        debug_message.append(f"Error type: {type(e).__name__}")
        import traceback
        debug_message.append(f"Traceback:\n{traceback.format_exc()}")
        
        debug_log = "\n".join(debug_message)
        frappe.log_error(debug_log, "Get Provider Locations Error")
        
        frappe.response["message"] = {
            "locations": [],
            "error": str(e)
        }


@frappe.whitelist()
def get_user_organizations():
    """
    Get all organizations the current user owns or manages
    Returns list of organizations with name and organization_name
    """
    user = frappe.session.user
    try:
        user_orgs = _fetch_user_organizations(user)
        frappe.response["message"] = {
            "organizations": user_orgs
        }
    except Exception as e:
        frappe.log_error(str(e), "Get User Organizations Error")
        frappe.response["message"] = {
            "organizations": [],
            "error": str(e)
        }


@frappe.whitelist()
def get_provider_services(organization=None, location=None):
    """
    Get all services accessible to the current user/provider
    If organization is provided, filter services by that organization
    If location is provided, filter services by that location (via EventType) - OPTIONAL filter
    
    Returns services from:
    - Services where provider is in service_providers child table
    - Services from organizations the user owns/manages
    - If organization parameter is provided, only services from that organization
    - If location parameter is provided, only services available at that location (via EventType)
    
    NOTE: Location filter is optional - if not provided, shows all services in the organization.
    This allows users to set availability for services even if EventType doesn't exist yet.
    """
    user = frappe.session.user
    
    try:
        services = []
        seen_services = set()
        
        # Get user's organizations
        user_orgs = _fetch_user_organizations(user)
        
        # If organization parameter is provided, validate user has access to it
        if organization:
            if user != "Administrator":
                # Check if user owns or manages this organization
                org_access = False
                for org in user_orgs:
                    if org["name"] == organization:
                        org_access = True
                        break
                if not org_access:
                    frappe.throw(_("You don't have access to this organization"))
        
        # Get user's provider
        user_provider = frappe.db.get_value(
            "Provider",
            {"user": user},
            ["name"],
            as_dict=True
        )
        
        # Get services where provider is in service_providers child table
        if user_provider:
            service_providers = frappe.get_all(
                "Service Provider",
                filters={"provider": user_provider.name, "status": "Active"},
                fields=["parent"]
            )
            service_names = [sp.get("parent") for sp in service_providers]
            if service_names:
                filters = {"name": ["in", service_names]}
                if organization:
                    filters["organization"] = organization
                
                provider_services = frappe.get_all(
                    "Service",
                    filters=filters,
                    fields=["name", "service_name", "organization"]
                )
                
                # If location is provided, filter by EventType (only services available at this location)
                if location:
                    event_types = frappe.get_all(
                        "EventType",
                        filters={"location": location, "is_active": 1},
                        fields=["service"],
                        distinct=True
                    )
                    location_service_names = set([et.service for et in event_types if et.service])
                    provider_services = [svc for svc in provider_services if svc.get("name") in location_service_names]
                
                for svc in provider_services:
                    svc_name = svc.get("name")
                    if svc_name and svc_name not in seen_services:
                        seen_services.add(svc_name)
                        services.append({
                            "name": svc_name,
                            "service_name": svc.get("service_name"),
                            "organization": svc.get("organization")
                        })
        
        # Get services from organizations
        if user_orgs:
            for org in user_orgs:
                # If organization filter is provided, only get services from that org
                org_name = org.get("name") if isinstance(org, dict) else org["name"]
                if organization and org_name != organization:
                    continue
                    
                org_services = frappe.get_all(
                    "Service",
                    filters={"organization": org_name},
                    fields=["name", "service_name", "organization"]
                )
                
                # Filter services by location via EventType (only show services available at this location)
                if location:
                    event_types = frappe.get_all(
                        "EventType",
                        filters={"location": location, "is_active": 1},
                        fields=["service"],
                        distinct=True
                    )
                    location_service_names = set([et.service for et in event_types if et.service])
                    # Only include services that have EventTypes at this location
                    org_services = [svc for svc in org_services if svc.get("name") in location_service_names]
                
                for svc in org_services:
                    svc_name = svc.get("name")
                    if svc_name and svc_name not in seen_services:
                        seen_services.add(svc_name)
                        services.append({
                            "name": svc_name,
                            "service_name": svc.get("service_name"),
                            "organization": svc.get("organization")
                        })
        
        # For Administrator, get all services if no organization filter
        if user == "Administrator" and not organization:
            all_services = frappe.get_all(
                "Service",
                fields=["name", "service_name", "organization"],
                order_by="service_name asc"
            )
            for svc in all_services:
                svc_name = svc.get("name")
                if svc_name and svc_name not in seen_services:
                    seen_services.add(svc_name)
                    services.append({
                        "name": svc_name,
                        "service_name": svc.get("service_name"),
                        "organization": svc.get("organization")
                    })
        
        frappe.response["message"] = {
            "services": services
        }
    except Exception as e:
        frappe.log_error(str(e), "Get Provider Services Error")
        frappe.response["message"] = {
            "services": [],
            "error": str(e)
        }


@frappe.whitelist()
def create_service(name, duration, buffer_time, price=0, currency="ETB", organization=None, provider=None, location=None, selected_providers=None, description=""):
    """
    Create service/appointment type - Unified API for both individual and organization services
    Supports new model with Provider Organization child table
    
    Args:
        name: Service name
        duration: Duration in minutes
        buffer_time: Buffer time in minutes
        price: Price in ETB
        organization: Organization name (optional, for organization services)
        provider: Provider name (optional, for individual services, defaults to user's provider)
        location: Location name (optional, will use first available if not provided)
        selected_providers: List of provider names (for organization services, creates EventTypes for each)
        description: Service description
    """
    user = frappe.session.user
    
    try:
        # Determine if this is an organization or individual service
        is_organization_service = bool(organization)
        
        # Get or determine provider
        # For organization services, provider is optional (we'll use selected_providers)
        # For individual services, we need the user's provider
        provider_name = None
        provider_doc = None
        
        if is_organization_service:
            # For organization services, we don't need a default provider
            # We'll use providers from selected_providers or get all from org
            # Only set provider_name if explicitly provided
            if provider:
                provider_name = provider
                provider_doc = frappe.get_doc("Provider", provider_name)
        else:
            # Individual service - require user's provider
            if not provider:
                provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
                if not provider_name:
                    frappe.throw(_("Provider not found. Please complete your profile first."))
            else:
                provider_name = provider
            
            if provider_name:
                provider_doc = frappe.get_doc("Provider", provider_name)
        
        # Get or determine location
        if not location:
            # Try to get location from organization first
            if organization:
                org_locations = frappe.get_all(
                    "Location",
                    filters={"organization": organization},
                    fields=["name"],
                    limit=1
                )
                if org_locations:
                    location_name = org_locations[0].name
                else:
                    # Fallback to first provider's location if available
                    if provider_doc and provider_doc.locations:
                        location_name = provider_doc.locations[0].location
                    else:
                        # Try to get from any provider in the organization
                        if selected_providers and len(selected_providers) > 0:
                            first_prov = frappe.get_doc("Provider", selected_providers[0])
                            if first_prov.locations:
                                location_name = first_prov.locations[0].location
                            else:
                                frappe.throw(_("Location not found. Please add a location to the organization or providers first."))
                        else:
                            # Get all providers from org and try their locations
                            provider_orgs = frappe.get_all(
                                "Provider Organization",
                                filters={"organization": organization, "status": "Active"},
                                fields=["parent"],
                                limit=1
                            )
                            if provider_orgs:
                                first_prov = frappe.get_doc("Provider", provider_orgs[0].parent)
                                if first_prov.locations:
                                    location_name = first_prov.locations[0].location
                                else:
                                    frappe.throw(_("Location not found. Please add a location to the organization or providers first."))
                            else:
                                frappe.throw(_("Location not found. Please add a location to the organization first."))
            else:
                # Individual provider - use first location
                if not provider_doc or not provider_doc.locations:
                    frappe.throw(_("Location not found. Please add a location first."))
                location_name = provider_doc.locations[0].location
        else:
            location_name = location
        
        location_doc = frappe.get_doc("Location", location_name)
        
        # Determine which providers to create EventTypes for (and add to child table)
        providers_to_create = []
        provider_data_list = []  # Store provider data with overrides
        
        if is_organization_service:
            # Parse selected_providers if it's a string
            if selected_providers:
                if isinstance(selected_providers, str):
                    import json
                    try:
                        selected_providers = json.loads(selected_providers)
                    except:
                        selected_providers = [selected_providers]  # Single value as list
            
            # Get providers from Provider Organization child table
            if selected_providers and len(selected_providers) > 0:
                # Handle both array of strings and array of objects
                if isinstance(selected_providers[0], dict):
                    # Array of objects with provider data
                    for prov_data in selected_providers:
                        prov_id = prov_data.get("provider") or prov_data.get("name")
                        if prov_id:
                            providers_to_create.append(prov_id)
                            provider_data_list.append({
                                "provider": prov_id,
                                "is_primary": prov_data.get("is_primary", False),
                                "price_override": prov_data.get("price_override"),
                                "duration_override": prov_data.get("duration_override"),
                                "commission_rate": prov_data.get("commission_rate"),
                                "notes": prov_data.get("notes")
                            })
                else:
                    # Array of provider names (strings)
                    providers_to_create = selected_providers
                    for prov_id in providers_to_create:
                        provider_data_list.append({
                            "provider": prov_id,
                            "is_primary": False,
                            "price_override": None,
                            "duration_override": None,
                            "commission_rate": None,
                            "notes": None
                        })
            else:
                # Get all active providers in organization
                provider_orgs = frappe.get_all(
                    "Provider Organization",
                    filters={"organization": organization, "status": "Active"},
                    fields=["parent", "is_primary"]
                )
                providers_to_create = [po.parent for po in provider_orgs]
                for po in provider_orgs:
                    provider_data_list.append({
                        "provider": po.parent,
                        "is_primary": po.is_primary or False,
                        "price_override": None,
                        "duration_override": None,
                        "commission_rate": None,
                        "notes": None
                    })
            
            # Validate that we have at least one provider
            if not providers_to_create:
                frappe.throw(_("No active providers found for this organization. Please add providers first."))
        else:
            # Individual service - use current provider
            if not provider_name:
                frappe.throw(_("Provider is required for individual services."))
            providers_to_create = [provider_name]
            provider_data_list.append({
                "provider": provider_name,
                "is_primary": True,  # Individual service has one primary provider
                "price_override": None,
                "duration_override": None,
                "commission_rate": None,
                "notes": None
            })
        
        # Create or update Service
        existing_service = None
        if organization:
            existing_service = frappe.db.get_value("Service", {"service_name": name, "organization": organization}, "name")
        else:
            # For individual services, check if service exists with this provider in child table
            service_providers = frappe.get_all(
                "Service Provider",
                filters={"provider": provider_name, "status": "Active"},
                fields=["parent"]
            )
            service_names = [sp.parent for sp in service_providers] if service_providers else []
            if service_names:
                existing_services = frappe.get_all(
                    "Service",
                    filters={"service_name": name, "name": ["in", service_names]},
                    fields=["name"],
                    limit=1
                )
                existing_service = existing_services[0].name if existing_services else None
        
        if existing_service:
            service = frappe.get_doc("Service", existing_service)
            service.duration = int(duration)
            service.price = float(price) if price else 0
            service.buffer_before = int(buffer_time) if buffer_time else 0
            service.buffer_after = int(buffer_time) if buffer_time else 0
            if description:
                service.description = description
            
            # Update service_providers child table
            # Clear existing providers and re-add
            service.service_providers = []
            for prov_data in provider_data_list:
                service.append("service_providers", {
                    "provider": prov_data["provider"],
                    "status": "Active",
                    "is_primary": prov_data["is_primary"],
                    "price_override": prov_data.get("price_override"),
                    "duration_override": prov_data.get("duration_override"),
                    "commission_rate": prov_data.get("commission_rate"),
                    "notes": prov_data.get("notes")
                })
            
            service.save(ignore_permissions=True)
        else:
            service = frappe.new_doc("Service")
            service.service_name = name
            service.duration = int(duration)
            service.price = float(price) if price else 0
            service.buffer_before = int(buffer_time) if buffer_time else 0
            service.buffer_after = int(buffer_time) if buffer_time else 0
            service.description = description or ""
            service.organization = organization if organization else None
            service.is_active = 1
            
            # Add providers to child table
            for idx, prov_data in enumerate(provider_data_list):
                service.append("service_providers", {
                    "provider": prov_data["provider"],
                    "status": "Active",
                    "is_primary": prov_data["is_primary"] or (idx == 0),  # First provider is primary if not specified
                    "price_override": prov_data.get("price_override"),
                    "duration_override": prov_data.get("duration_override"),
                    "commission_rate": prov_data.get("commission_rate"),
                    "notes": prov_data.get("notes")
                })
            
            service.insert(ignore_permissions=True)
            
            # Apply default hours (inherit from Location)
            from frappe_appointment.scheduler.availability import apply_default_hours
            apply_default_hours("Service", service.name, "Location", location_name)
        
        # Create EventTypes for each provider
        created_event_types = []
        for prov_name in providers_to_create:
            # Verify provider exists
            if not frappe.db.exists("Provider", prov_name):
                continue
            
            # Check if EventType already exists
            existing_event_type = frappe.db.get_value(
                "EventType",
                {"event_type_name": name, "provider": prov_name, "service": service.name},
                "name"
            )
            
            if existing_event_type:
                event_type = frappe.get_doc("EventType", existing_event_type)
                event_type.service = service.name
                event_type.location = location_name
                event_type.description = description or f"{name} - {duration} minutes"
                event_type.save(ignore_permissions=True)
            else:
                event_type = frappe.new_doc("EventType")
                event_type.event_type_name = name
                event_type.service = service.name
                event_type.provider = prov_name
                event_type.location = location_name
                event_type.description = description or f"{name} - {duration} minutes"
                event_type.is_active = 1
                event_type.insert(ignore_permissions=True)
                created_event_types.append(event_type.name)
        
        # Sync booking URLs for the service
        try:
            from frappe_appointment.scheduler.booking_url_manager import sync_booking_urls_for_provider, sync_booking_urls_for_organization
            for prov_name in providers_to_create:
                sync_booking_urls_for_provider(prov_name)
            if organization:
                sync_booking_urls_for_organization(organization)
        except Exception as e:
            frappe.log_error(str(e), "Service Creation: Booking URL Sync Error")
        
        frappe.response["message"] = {
            "success": True,
            "service": service.name,
            "event_types": created_event_types,
            "message": f"Service '{name}' created successfully"
        }
    
    except Exception as e:
        frappe.log_error(str(e), "Create Service Error")
        frappe.throw(_(f"Failed to create service: {str(e)}"))


@frappe.whitelist()
def create_service_legacy(name, duration, buffer_time, price, currency="ETB"):
    """
    Legacy create_service - kept for backward compatibility
    Now redirects to new unified create_service
    """
    return create_service(name, duration, buffer_time, price, currency)


# Note: User Appointment Availability is now created automatically when providers are created
# Availability is configured through the Service/Location/Provider opening_hours hierarchy
# The new create_service API handles both individual and organization services


@frappe.whitelist()
def complete():
    """
    Mark onboarding as complete (Step 5)
    """
    user = frappe.session.user
    
    try:
        # Get Provider for this user
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not provider_name:
            frappe.throw(_("Provider not found. Please complete Step 1 first."))
        
        provider = frappe.get_doc("Provider", provider_name)
        
        # Mark onboarding as complete
        provider.onboarding_complete = True
        provider.onboarding_current_step = 5
        provider.onboarding_completed_at = datetime.now()
        provider.save()
        
        frappe.db.commit()
        
        frappe.response["message"] = {
            "success": True,
            "onboarding_complete": True,
            "completed_at": provider.onboarding_completed_at.isoformat()
        }
    except Exception as e:
        frappe.log_error(str(e), "Onboarding: Complete Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def update_step(step):
    """
    Update current onboarding step
    """
    user = frappe.session.user
    
    try:
        # Get Provider for this user
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if provider_name:
            provider = frappe.get_doc("Provider", provider_name)
            provider.onboarding_current_step = int(step)
            provider.save()
            frappe.db.commit()
        
        # Return updated progress
        progress = get_progress()
        frappe.response["message"] = progress
    except Exception as e:
        frappe.log_error(str(e), "Onboarding: Update Step Error")
        frappe.response["message"] = {
            "current_step": int(step),
            "completed_steps": list(range(1, int(step))),
            "onboarding_complete": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_booking_url():
    """
    Get the appropriate booking URL based on user context:
    - Organization owner → Organization URL (/schedule/org/{org_slug})
    - Organization member → Organization URL (primary org) or Personal URL
    - Individual provider → Personal EventType URL (/schedule/in/{event_type})
    
    Returns the relative booking URL path with context information
    """
    user = frappe.session.user
    
    try:
        # Get Provider for this user
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not provider_name:
            frappe.throw(_("Provider not found. Please complete onboarding first."))
        
        # Get the first EventType for this provider
        event_types = frappe.db.get_all(
            "EventType",
            filters={"provider": provider_name},
            fields=["name"],
            limit=1
        )
        
        if not event_types:
            frappe.throw(_("No EventType found. Please create a service first."))
        
        event_type_name = event_types[0].name
        booking_url = f"/schedule/in/{event_type_name}"
        
        frappe.response["message"] = {
            "success": True,
            "booking_url": booking_url,
            "event_type_id": event_type_name
        }
    except Exception as e:
        frappe.log_error(str(e), "Onboarding: Get Booking URL Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


# ===================================================================
# ORGANIZATION ONBOARDING APIS
# ===================================================================

@frappe.whitelist()
def get_user_organizations():
    """
    Get list of organizations accessible by current user (owner or manager)
    Used for organization selection dropdown in onboarding
    """
    user = frappe.session.user
    
    try:
        # Get organizations where user is owner
        owner_orgs = frappe.db.get_all(
            "Organization",
            filters={"owner_user": user},
            fields=["name", "organization_name", "organization_type", "email", "phone", "timezone", "language", "description", "slug"],
            order_by="modified desc"
        )
        
        # Get organizations where user is a manager
        manager_orgs = frappe.db.sql("""
            SELECT DISTINCT o.name, o.organization_name, o.organization_type, o.email, 
                   o.phone, o.timezone, o.language, o.description, o.slug
            FROM `tabOrganization` o
            INNER JOIN `tabOrganization Manager` om ON om.parent = o.name
            WHERE om.user = %s
            ORDER BY o.modified desc
        """, (user,), as_dict=True)
        
        # Combine and deduplicate
        all_orgs = {org.name: org for org in owner_orgs}
        for org in manager_orgs:
            if org.name not in all_orgs:
                all_orgs[org.name] = org
        
        frappe.response["message"] = {
            "success": True,
            "organizations": list(all_orgs.values())
        }
    except Exception as e:
        frappe.log_error(str(e), "Organization Onboarding: Get User Organizations Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e),
            "organizations": []
        }


@frappe.whitelist()
def get_organization_profile(organization_id):
    """
    Get full details of a specific organization
    Used to populate form when editing existing organization
    """
    user = frappe.session.user
    
    try:
        # Check if user has access (owner or manager)
        org = frappe.get_doc("Organization", organization_id)
        
        # Check ownership
        is_owner = org.owner_user == user
        
        # Check manager access
        is_manager = False
        for manager in org.managers:
            if manager.user == user:
                is_manager = True
                break
        
        if not (is_owner or is_manager):
            frappe.throw(_("You do not have access to this organization"))
        
        frappe.response["message"] = {
            "success": True,
            "organization": {
                "name": org.name,
                "organization_name": org.organization_name,
                "organization_type": org.organization_type,
                "email": org.email,
                "phone": org.phone,
                "timezone": org.timezone,
                "language": org.language,
                "description": org.description,
                "slug": org.slug,
                "is_owner": is_owner
            }
        }
    except Exception as e:
        frappe.log_error(str(e), "Organization Onboarding: Get Organization Profile Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def save_organization_profile(organization_name, organization_type, email, phone, timezone="Africa/Addis_Ababa", language="en", description="", organization_id=None):
    """
    Step 1: Save organization profile
    Creates new or updates existing Organization record
    
    Args:
        organization_id: Optional. If provided, updates existing org (must have access)
    """
    user = frappe.session.user
    
    try:
        if organization_id:
            # Update existing organization
            org = frappe.get_doc("Organization", organization_id)
            
            # Verify access (owner or manager)
            is_owner = org.owner_user == user
            is_manager = any(m.user == user for m in org.managers)
            
            if not (is_owner or is_manager):
                frappe.throw(_("You do not have permission to edit this organization"))
        else:
            # Check if user already has an organization (for auto-select on return)
            existing_org = frappe.db.get_value("Organization", {"owner_user": user}, "name")
            
            if existing_org:
                # Update existing
                org = frappe.get_doc("Organization", existing_org)
            else:
                # Create new
                org = frappe.new_doc("Organization")
                org.owner_user = user
        
        # Update fields
        org.organization_name = organization_name
        org.organization_type = organization_type
        org.email = email
        org.phone = phone
        org.timezone = timezone
        org.language = language
        org.description = description
        
        # Generate slug if not exists
        if not org.slug:
            org.slug = make_slug(organization_name)
        
        # Save
        if org.is_new():
            org.insert(ignore_permissions=True)
        else:
            org.save(ignore_permissions=True)
        
        # Update Provider record to store selected organization and bump step
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        if provider_name:
            provider = frappe.get_doc("Provider", provider_name)
            provider.onboarding_current_step = 2
            provider.organization = org.name  # Store selected org in provider
            provider.save(ignore_permissions=True)
        
        frappe.db.commit()
        
        frappe.response["message"] = {
            "success": True,
            "organization_id": org.name,
            "slug": org.slug
        }
    except Exception as e:
        frappe.log_error(str(e), "Organization Onboarding: Save Profile Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def search_user_providers():
    """
    Search for providers that current user can link to organization
    Returns providers owned by the user or accessible to them
    """
    user = frappe.session.user
    
    try:
        # Get providers where user is the linked user
        providers = frappe.db.get_all(
            "Provider",
            filters={"user": user},
            fields=["name", "provider_name", "full_name", "email", "phone", "organization", "organization_status"],
            order_by="modified desc"
        )
        
        frappe.response["message"] = {
            "success": True,
            "providers": providers
        }
    except Exception as e:
        frappe.log_error(str(e), "Organization Onboarding: Search User Providers Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e),
            "providers": []
        }


@frappe.whitelist()
def add_organization_provider(provider_name, email, phone="", specialization="", invite_existing=False, organization_id=None, existing_provider_id=None):
    """
    Step 2: Add provider to organization
    Creates new Provider or links existing Provider to Organization
    
    Args:
        organization_id: Optional. Specific org to add to (defaults to provider's stored selection)
        existing_provider_id: Optional. If provided with invite_existing=True, links this provider
    """
    user = frappe.session.user
    
    try:
        # Determine which organization to use
        if organization_id:
            org_name = organization_id
        else:
            # Get from Provider's stored selection or fallback to owner lookup
            provider_rec = frappe.db.get_value("Provider", {"user": user}, ["organization"], as_dict=True)
            if provider_rec and provider_rec.organization:
                org_name = provider_rec.organization
            else:
                org_name = frappe.db.get_value("Organization", {"owner_user": user}, "name")
        
        if not org_name:
            frappe.throw(_("Organization not found. Please complete Step 1 first."))
        
        # Check if linking an existing provider by ID
        if existing_provider_id and invite_existing:
            # Link specific existing provider to this organization
            provider = frappe.get_doc("Provider", existing_provider_id)
            provider.organization = org_name
            provider.organization_status = "Active"
            provider.accept_org_bookings = 1
            provider.save(ignore_permissions=True)
        elif invite_existing:
            # Legacy flow: check if user exists and create/link provider
            user_exists = frappe.db.exists("User", email)
            # Check if they have a Provider record
            provider_doc_name = frappe.db.get_value("Provider", {"user": email}, "name")
            
            if provider_doc_name:
                # Link existing Provider to Organization
                provider = frappe.get_doc("Provider", provider_doc_name)
                provider.organization = org_name
                provider.organization_status = "Active"
                provider.accept_org_bookings = 1
                provider.save(ignore_permissions=True)
            else:
                # Create Provider for existing user (if user exists) or new user
                if not user_exists:
                    # Create new User first
                    new_user = frappe.get_doc({
                        "doctype": "User",
                        "email": email,
                        "first_name": provider_name.split()[0] if provider_name else "Provider",
                        "last_name": " ".join(provider_name.split()[1:]) if len(provider_name.split()) > 1 else "",
                        "send_welcome_email": 0,
                        "user_type": "System User"
                    })
                    new_user.insert(ignore_permissions=True)
                
                # Create Provider (for both new and existing users)
                provider = frappe.new_doc("Provider")
                provider.user = email
                provider.provider_name = provider_name
                provider.full_name = provider_name
                provider.phone = phone
                provider.organization = org_name
                provider.organization_status = "Active"
                provider.accept_org_bookings = 1
                provider.onboarding_type = "individual"
                provider.insert(ignore_permissions=True)
        else:
            # Create new provider (not inviting existing)
            user_exists = frappe.db.exists("User", email)
            
            # Create new User if needed
            if not user_exists:
                new_user = frappe.get_doc({
                    "doctype": "User",
                    "email": email,
                    "first_name": provider_name.split()[0] if provider_name else "Provider",
                    "last_name": " ".join(provider_name.split()[1:]) if len(provider_name.split()) > 1 else "",
                    "send_welcome_email": 0,
                    "user_type": "System User"
                })
                new_user.insert(ignore_permissions=True)
            
            # Create Provider
            provider = frappe.new_doc("Provider")
            provider.user = email
            provider.provider_name = provider_name
            provider.full_name = provider_name
            provider.phone = phone
            provider.organization = org_name
            provider.organization_status = "Active"
            provider.accept_org_bookings = 1
            provider.onboarding_type = "individual"
            provider.insert(ignore_permissions=True)
        
        # Bump onboarding step to 3 if this is the first provider added
        owner_provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        if owner_provider_name:
            owner_provider = frappe.get_doc("Provider", owner_provider_name)
            if owner_provider.onboarding_current_step < 3:
                owner_provider.onboarding_current_step = 3
                owner_provider.save(ignore_permissions=True)
        
        frappe.response["message"] = {
            "success": True,
            "provider_id": provider.name,
            "provider_name": provider.provider_name
        }
    except Exception as e:
        frappe.log_error(str(e), "Organization Onboarding: Add Provider Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_organization_providers(organization_id=None):
    """
    Step 2: Get list of providers for the organization
    
    Args:
        organization_id: Optional. Specific org to get providers for (defaults to provider's selection)
    """
    user = frappe.session.user
    
    try:
        # Determine which organization to query
        if organization_id:
            org_name = organization_id
        else:
            # Get from Provider's stored selection or fallback to owner lookup
            provider_rec = frappe.db.get_value("Provider", {"user": user}, ["organization"], as_dict=True)
            if provider_rec and provider_rec.organization:
                org_name = provider_rec.organization
            else:
                org_name = frappe.db.get_value("Organization", {"owner_user": user}, "name")
        
        if not org_name:
            frappe.throw(_("Organization not found"))
        
        # Get all providers for this organization
        providers = frappe.db.get_all(
            "Provider",
            filters={"organization": org_name},
            fields=["name", "provider_name", "user", "phone", "organization_status"],
            order_by="creation asc"
        )
        
        frappe.response["message"] = {
            "success": True,
            "providers": providers
        }
    except Exception as e:
        frappe.log_error(str(e), "Organization Onboarding: Get Providers Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def save_organization_availability(location_name, address, weekly_schedule):
    """
    Step 3: Save organization-wide availability
    Creates Location and Opening Hours, links to all providers
    """
    user = frappe.session.user
    
    try:
        # Get Organization
        org_name = frappe.db.get_value("Organization", {"owner_user": user}, "name")
        if not org_name:
            frappe.throw(_("Organization not found. Please complete Step 1 first."))
        
        org = frappe.get_doc("Organization", org_name)
        
        # Parse weekly_schedule
        if isinstance(weekly_schedule, str):
            import json
            weekly_schedule = json.loads(weekly_schedule)
        
        # Check if Location already exists (for re-runs)
        existing_location = frappe.db.get_value(
            "Location",
            {"location_name": location_name},
            "name"
        )
        
        if existing_location:
            location = frappe.get_doc("Location", existing_location)
            # Clear existing opening hours
            location.opening_hours = []
        else:
            # Create new Location
            location = frappe.new_doc("Location")
            location.location_name = location_name
        
        location.address = address
        location.timezone = org.timezone
        
        # Add opening hours
        for day, slots in weekly_schedule.items():
            if isinstance(slots, list) and len(slots) > 0:
                for slot in slots:
                    # Normalize time format
                    start_time = slot.get("start", "09:00")
                    end_time = slot.get("end", "17:00")
                    
                    # Ensure HH:MM format
                    if len(start_time) == 5:
                        start_time += ":00"
                    if len(end_time) == 5:
                        end_time += ":00"
                    
                    location.append("opening_hours", {
                        "day_of_week": day.capitalize(),
                        "start_time": start_time,
                        "end_time": end_time,
                        "is_open": 1
                    })
        
        if location.is_new():
            location.insert(ignore_permissions=True)
        else:
            location.save(ignore_permissions=True)
        
        # Link all organization providers to this location
        providers = frappe.db.get_all("Provider", filters={"organization": org_name}, fields=["name"])
        
        for prov in providers:
            provider = frappe.get_doc("Provider", prov.name)
            
            # Check if location already linked
            existing_link = False
            for loc_link in provider.locations:
                if loc_link.location == location.name:
                    existing_link = True
                    break
            
            if not existing_link:
                provider.append("locations", {
                    "location": location.name
                })
                provider.save(ignore_permissions=True)
        
        # Bump onboarding step to 4
        owner_provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        if owner_provider_name:
            owner_provider = frappe.get_doc("Provider", owner_provider_name)
            owner_provider.onboarding_current_step = 4
            owner_provider.save(ignore_permissions=True)
        
        frappe.response["message"] = {
            "success": True,
            "location_id": location.name
        }
    except Exception as e:
        frappe.log_error(str(e), "Organization Onboarding: Save Availability Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def create_organization_service(service_name, duration, price=0, description="", provider_assignment="round_robin", providers=None):
    """
    Step 4: Create organization service
    Creates Service, EventType, and User Appointment Availability for each provider
    """
    user = frappe.session.user
    
    try:
        # Get Organization
        org_name = frappe.db.get_value("Organization", {"owner_user": user}, "name")
        if not org_name:
            frappe.throw(_("Organization not found. Please complete Step 1 first."))
        
        org = frappe.get_doc("Organization", org_name)
        
        # Get Location for this organization
        location_list = frappe.db.get_all(
            "Location",
            filters={"timezone": org.timezone},
            fields=["name"],
            limit=1
        )
        
        if not location_list:
            frappe.throw(_("Location not found. Please complete Step 3 first."))
        
        location = frappe.get_doc("Location", location_list[0].name)
        
        # Parse providers list
        if isinstance(providers, str):
            import json
            providers = json.loads(providers)
        
        # Get all organization providers if "all" or None
        if not providers or providers == ["all"]:
            provider_list = frappe.db.get_all("Provider", filters={"organization": org_name}, fields=["name", "user"])
        else:
            provider_list = []
            for prov_name in providers:
                prov = frappe.get_doc("Provider", prov_name)
                provider_list.append({"name": prov.name, "user": prov.user})
        
        # Create or update Service
        existing_service = frappe.db.get_value("Service", {"service_name": service_name, "organization": org_name}, "name")
        
        if existing_service:
            service = frappe.get_doc("Service", existing_service)
            service.duration = duration
            service.price = price
            service.description = description
            service.save(ignore_permissions=True)
        else:
            service = frappe.new_doc("Service")
            service.service_name = service_name
            service.organization = org_name
            service.duration = duration
            service.price = price
            service.description = description
            service.insert(ignore_permissions=True)
            
            # Apply default hours (inherit from Location)
            from frappe_appointment.scheduler.availability import apply_default_hours
            apply_default_hours("Service", service.name, "Location", location.name)
        
        # Create EventType with slug  
        slug = make_slug(service_name)
        # Check for existing EventType by service_name + provider (for organization, use first provider as representative)
        first_provider = provider_list[0]["name"] if provider_list else None
        existing_event_type = frappe.db.get_value("EventType", {"event_type_name": service_name, "provider": first_provider}, "name") if first_provider else None
        
        if existing_event_type:
            event_type = frappe.get_doc("EventType", existing_event_type)
            event_type.service = service.name
            event_type.description = description
            event_type.save(ignore_permissions=True)
        else:
            event_type = frappe.new_doc("EventType")
            event_type.event_type_name = service_name
            event_type.service = service.name
            event_type.provider = first_provider
            event_type.location = location.name
            event_type.description = description
            event_type.insert(ignore_permissions=True)
        
        # For each provider, create User Appointment Availability
        for provider_data in provider_list:
            provider_user = provider_data["user"]
            
            # Check if User Appointment Availability already exists
            existing_avail = frappe.db.get_value(
                "User Appointment Availability",
                {"user": provider_user},
                "name"
            )
            
            if existing_avail:
                avail = frappe.get_doc("User Appointment Availability", existing_avail)
            else:
                avail = frappe.new_doc("User Appointment Availability")
                avail.user = provider_user
                avail.slug = make_slug(f"{org.organization_name}-{provider_user}")
                avail.enable_scheduling = 1
                avail.meeting_provider = "builtin"
            
            # Create/update Appointment Slot Duration
            duration_exists = False
            for existing_duration in avail.available_durations:
                if existing_duration.title == service_name:
                    existing_duration.duration = duration * 60  # Convert to seconds
                    existing_duration.allow_rescheduling = 1
                    duration_exists = True
                    break
            
            if not duration_exists:
                avail.append("available_durations", {
                    "title": service_name,
                    "duration": duration * 60,  # Convert minutes to seconds
                    "allow_rescheduling": 1
                })
            
            # Populate Appointment Time Slot from hierarchical availability
            # Use Location → Service → Provider hierarchy
            # Clear existing time slots
            avail.appointment_time_slot = []
            
            # Get provider name
            provider_name = provider_data["name"]
            
            # Get hierarchical availability (Provider ∩ Service ∩ Location)
            from frappe_appointment.scheduler.availability import get_availability_for_booking
            availability = get_availability_for_booking(
                location_name=location.name,
                service_name=service.name,
                provider_name=provider_name
            )
            
            # Group availability by day and merge time ranges
            day_hours = {}
            for oh in availability:
                if oh.get("is_open"):
                    day = oh["day_of_week"]
                    start_str = time_to_str(oh["start_time"])
                    end_str = time_to_str(oh["end_time"])
                    if day not in day_hours:
                        day_hours[day] = {"start": start_str, "end": end_str}
                    else:
                        # Merge multiple ranges per day (use earliest start and latest end)
                        if start_str < day_hours[day]["start"]:
                            day_hours[day]["start"] = start_str
                        if end_str > day_hours[day]["end"]:
                            day_hours[day]["end"] = end_str
            
            # Add each available day to appointment_time_slot
            for day in sorted(day_hours.keys()):
                avail.append("appointment_time_slot", {
                    "day": day,
                    "start_time": day_hours[day]["start"],
                    "end_time": day_hours[day]["end"]
                })
            
            if avail.is_new():
                avail.insert(ignore_permissions=True)
            else:
                avail.save(ignore_permissions=True)
        
        # Bump onboarding step to 5
        owner_provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        if owner_provider_name:
            owner_provider = frappe.get_doc("Provider", owner_provider_name)
            owner_provider.onboarding_current_step = 5
            owner_provider.save(ignore_permissions=True)
        
        frappe.response["message"] = {
            "success": True,
            "service_id": service.name,
            "event_type_id": event_type.name,
            "slug": slug
        }
    except Exception as e:
        frappe.log_error(str(e), "Organization Onboarding: Create Service Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_organization_booking_urls():
    """
    Step 5: Get booking URLs for organization and services
    """
    user = frappe.session.user
    
    try:
        # Get Organization
        org_name = frappe.db.get_value("Organization", {"owner_user": user}, "name")
        if not org_name:
            frappe.throw(_("Organization not found"))
        
        org = frappe.get_doc("Organization", org_name)
        
        # Organization URL
        org_url = f"/schedule/org/{org.slug}"
        
        # Get all services/event types for this organization
        services = frappe.db.get_all(
            "Service",
            filters={"organization": org_name},
            fields=["name", "service_name"]
        )
        
        service_urls = []
        for service in services:
            # Get corresponding EventType
            event_type = frappe.db.get_value("EventType", {"service": service.name}, "name")
            if event_type:
                slug = make_slug(event_type)
                service_urls.append({
                    "name": service.service_name,
                    "url": f"/schedule/org/{org.slug}/{slug}",
                    "event_type_id": event_type
                })
        
        frappe.response["message"] = {
            "success": True,
            "organization_url": org_url,
            "services": service_urls
        }
    except Exception as e:
        frappe.log_error(str(e), "Organization Onboarding: Get URLs Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def complete_organization_onboarding():
    """
    Step 5: Mark organization onboarding as complete
    """
    user = frappe.session.user
    
    try:
        # Get Organization
        org_name = frappe.db.get_value("Organization", {"owner_user": user}, "name")
        if not org_name:
            frappe.throw(_("Organization not found"))
        
        org = frappe.get_doc("Organization", org_name)
        org.setup_complete = 1
        org.save(ignore_permissions=True)
        
        # Mark Provider onboarding as complete
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        if provider_name:
            provider = frappe.get_doc("Provider", provider_name)
            provider.onboarding_complete = 1
            provider.onboarding_completed_at = frappe.utils.now()
            provider.save(ignore_permissions=True)
        
        frappe.response["message"] = {
            "success": True,
            "onboarding_complete": True
        }
    except Exception as e:
        frappe.log_error(str(e), "Organization Onboarding: Complete Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_provider_profile():
    """
    Get current user's provider profile data
    """
    user = frappe.session.user
    
    try:
        provider = frappe.db.get_value(
            "Provider",
            {"user": user},
            [
                "name",
                "provider_name",
                "full_name",
                "email",
                "phone",
                "bio",
                "timezone",
                "language",
                "business_type",
                "profile_photo",
                "organization"
            ],
            as_dict=True
        )
        
        if not provider:
            frappe.throw(_("Provider profile not found. Please complete onboarding first."))
        
        # Get organization name if exists
        if provider.organization:
            org_name = frappe.db.get_value("Organization", provider.organization, "organization_name")
            provider.organization_name = org_name
        
        frappe.response["message"] = provider
    except Exception as e:
        frappe.log_error(str(e), "Get Provider Profile Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def update_provider_profile(provider_name=None, full_name=None, phone=None, bio=None, timezone=None, language=None, business_type=None):
    """
    Update current user's provider profile
    """
    user = frappe.session.user
    
    try:
        provider_doc_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not provider_doc_name:
            frappe.throw(_("Provider profile not found. Please complete onboarding first."))
        
        provider = frappe.get_doc("Provider", provider_doc_name)
        
        # Update fields if provided
        if provider_name is not None:
            provider.provider_name = provider_name
        if full_name is not None:
            provider.full_name = full_name
        if phone is not None:
            provider.phone = phone
        if bio is not None:
            provider.bio = bio
        if timezone is not None:
            provider.timezone = timezone
        if language is not None:
            provider.language = language
        if business_type is not None:
            provider.business_type = business_type
        
        provider.save(ignore_permissions=True)
        
        frappe.response["message"] = {
            "success": True,
            "message": "Profile updated successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Update Provider Profile Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_location_options():
    """
    Get available providers and services for location creation
    Returns providers the user can assign locations to, and services that can be linked
    """
    user = frappe.session.user
    
    try:
        current_provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not current_provider_name:
            frappe.response["message"] = {
                "providers": [],
                "services": []
            }
            return
        
        current_provider = frappe.get_doc("Provider", current_provider_name)
        
        # Get providers user can assign to
        providers = []
        
        # If user is in an organization, get all providers in that org
        if current_provider.organization:
            org_providers = frappe.get_all(
                "Provider",
                filters={"organization": current_provider.organization},
                fields=["name", "provider_name", "full_name", "user"],
                order_by="provider_name asc"
            )
            providers = [{"name": p["name"], "provider_name": p["provider_name"], "full_name": p.get("full_name")} for p in org_providers]
        else:
            # Individual provider - only themselves
            providers = [{
                "name": current_provider.name,
                "provider_name": current_provider.provider_name,
                "full_name": current_provider.full_name
            }]
        
        # Get services available to link
        # Get services from EventTypes for current provider
        event_types = frappe.get_all(
            "EventType",
            filters={"provider": current_provider_name, "is_active": 1},
            fields=["service"],
            distinct=True
        )
        
        service_ids = [et.service for et in event_types if et.service]
        services = []
        
        if service_ids:
            service_docs = frappe.get_all(
                "Service",
                filters={"name": ["in", service_ids]},
                fields=["name", "service_name", "description"],
                order_by="service_name asc"
            )
            services = [{"name": s["name"], "service_name": s["service_name"], "description": s.get("description", "")} for s in service_docs]
        
        frappe.response["message"] = {
            "providers": providers,
            "services": services
        }
    except Exception as e:
        frappe.log_error(str(e), "Get Location Options Error")
        frappe.response["message"] = {
            "providers": [],
            "services": []
        }


@frappe.whitelist()
def create_location(location_name, address_line_1=None, address_line_2=None, city=None, phone=None, timezone="Africa/Addis_Ababa", provider_id=None, service_ids=None):
    """
    Create a new location and link it to specified provider(s) and optionally services
    Accepts address as a single string (for backward compatibility) or separate fields
    
    Args:
        provider_id: Optional. Provider name to link location to. Defaults to current user's provider.
        service_ids: Optional. List of service names to link this location to.
    """
    user = frappe.session.user
    
    try:
        current_provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not current_provider_name:
            frappe.throw(_("Provider not found. Please complete onboarding first."))
        
        # Check if location with same name exists
        if frappe.db.exists("Location", {"location_name": location_name}):
            frappe.throw(_("Location with this name already exists."))
        
        # Determine which provider(s) to link to
        if provider_id:
            # Validate provider_id is accessible to user
            current_provider = frappe.get_doc("Provider", current_provider_name)
            if current_provider.organization:
                # Check if provider_id is in same organization
                target_provider = frappe.get_doc("Provider", provider_id)
                if target_provider.organization != current_provider.organization:
                    frappe.throw(_("You can only assign locations to providers in your organization."))
            else:
                # Individual provider can only assign to themselves
                if provider_id != current_provider_name:
                    frappe.throw(_("You can only assign locations to your own provider profile."))
            provider_names = [provider_id]
        else:
            # Default to current user's provider
            provider_names = [current_provider_name]
        
        # Handle backward compatibility: if address_line_1 is not provided but address is passed as first param
        # This handles the case where frontend sends "address" as a single field
        if address_line_1 and not address_line_2 and not city:
            # Try to parse address into components (simple split by comma)
            address_parts = address_line_1.split(',')
            if len(address_parts) >= 3:
                address_line_1 = address_parts[0].strip()
                address_line_2 = address_parts[1].strip()
                city = address_parts[2].strip()
            elif len(address_parts) == 2:
                address_line_1 = address_parts[0].strip()
                city = address_parts[1].strip()
        
        # Create location
        location = frappe.new_doc("Location")
        location.location_name = location_name
        location.address_line_1 = address_line_1 or ""
        location.address_line_2 = address_line_2 or ""
        location.city = city or "Addis Ababa"
        location.phone = phone or ""
        location.timezone = timezone or "Africa/Addis_Ababa"
        location.is_active = 1
        
        # Apply default hours (8:30 AM - 6:00 PM, Mon-Fri)
        from frappe_appointment.scheduler.availability import apply_default_hours
        location.insert(ignore_permissions=True)
        apply_default_hours("Location", location.name)
        
        # Link to provider(s)
        for provider_name in provider_names:
            provider = frappe.get_doc("Provider", provider_name)
            # Check if location already linked
            existing_link = [loc for loc in provider.locations if loc.location == location.name]
            if not existing_link:
                provider.append("locations", {"location": location.name})
                provider.save(ignore_permissions=True)
        
        # Link to services via EventTypes (if service_ids provided)
        if service_ids:
            if isinstance(service_ids, str):
                service_ids = [service_ids]  # Handle single service
            
            for service_id in service_ids:
                # Get EventTypes for this service and provider
                event_types = frappe.get_all(
                    "EventType",
                    filters={"service": service_id, "provider": provider_names[0], "is_active": 1},
                    fields=["name"]
                )
                
                # Update EventTypes to include this location
                for et_name in [et.name for et in event_types]:
                    et_doc = frappe.get_doc("EventType", et_name)
                    if not et_doc.location or et_doc.location != location.name:
                        # Create a new EventType for this location if needed
                        # Or update existing if it doesn't have a location
                        if not et_doc.location:
                            et_doc.location = location.name
                            et_doc.save(ignore_permissions=True)
        
        frappe.db.commit()
        
        frappe.response["message"] = {
            "success": True,
            "location_id": location.name
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Create Location Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def delete_service(service_name):
    """
    Delete a service and its associated EventTypes
    """
    user = frappe.session.user
    
    try:
        # Get service by name and owner
        service_doc_name = frappe.db.get_value("Service", {"service_name": service_name, "owner": user}, "name")
        
        if not service_doc_name:
            frappe.throw(_("Service not found."))
        
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        # Get associated EventTypes
        event_types = frappe.get_all("EventType", filters={"service": service_doc_name, "provider": provider_name})
        
        # Delete EventTypes first
        for et in event_types:
            frappe.delete_doc("EventType", et.name, force=1, ignore_permissions=True)
        
        # Delete service
        frappe.delete_doc("Service", service_doc_name, force=1, ignore_permissions=True)
        
        frappe.db.commit()
        
        frappe.response["message"] = {"success": True}
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Delete Service Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def delete_location(location_name):
    """
    Delete a location (only if not in use by active EventTypes)
    """
    user = frappe.session.user
    
    try:
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not provider_name:
            frappe.throw(_("Provider not found."))
        
        location_name_doc = frappe.db.get_value("Location", {"location_name": location_name}, "name")
        if not location_name_doc:
            frappe.throw(_("Location not found."))
        location = frappe.get_doc("Location", location_name_doc)
        
        # Check if location is used by any EventTypes
        event_types = frappe.get_all("EventType", filters={"location": location.name, "is_active": 1})
        
        if event_types:
            frappe.throw(_("Cannot delete location. It is being used by active appointment types."))
        
        # Remove from provider
        provider = frappe.get_doc("Provider", provider_name)
        provider.locations = [loc for loc in provider.locations if loc.location != location.name]
        provider.save(ignore_permissions=True)
        
        # Delete location
        frappe.delete_doc("Location", location.name, force=1, ignore_permissions=True)
        
        frappe.db.commit()
        
        frappe.response["message"] = {"success": True}
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Delete Location Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_availability(level=None, id=None, service_id=None, location_id=None, provider_id=None):
    """
    Get availability for Location, Service, or Provider
    
    Args:
        level: 'location', 'service', or 'provider'
        id: ID of location/service (for location/service level)
        service_id: ID of service (required for provider level)
        location_id: ID of location (optional for provider level, helps with context)
        provider_id: ID of provider (optional for provider level, if not provided uses current user's provider)
    
    Returns:
        {
            schedule: [{day, isOpen, ranges: [{start, end}]}],
            use_default_hours: bool,
            provider: {name, provider_name, email} (only for provider level)
        }
    """
    user = frappe.session.user
    
    days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    # Default empty schedule (all days closed)
    default_schedule = [
        {
            "day": day,
            "isOpen": False,
            "ranges": []
        }
        for day in days_of_week
    ]
    
    try:
        # If level is not provided, return default schedule
        if not level:
            frappe.response["message"] = {
                "schedule": default_schedule,
                "use_default_hours": True
            }
            return
        
        # Validate level parameter
        if level not in ['location', 'service', 'provider']:
            frappe.response["message"] = {
                "schedule": default_schedule,
                "use_default_hours": True
            }
            return
        
        if level == 'location':
            if not id:
                frappe.throw(_("Location ID is required"))
            try:
                location = frappe.get_doc("Location", id)
                opening_hours = location.opening_hours or []
                use_default = getattr(location, 'use_default_hours', 0) or 0
            except frappe.DoesNotExistError:
                # Location doesn't exist, return default schedule
                frappe.response["message"] = {
                    "schedule": default_schedule,
                    "use_default_hours": True
                }
                return
            
        elif level == 'service':
            if not id:
                frappe.throw(_("Service ID is required"))
            try:
                service = frappe.get_doc("Service", id)
                opening_hours = service.opening_hours or []
                use_default = getattr(service, 'use_default_hours', 0) or 0
            except frappe.DoesNotExistError:
                # Service doesn't exist, return default schedule
                frappe.response["message"] = {
                    "schedule": default_schedule,
                    "use_default_hours": True
                }
                return
            
        elif level == 'provider':
            # Provider availability requires a service context
            if not service_id:
                frappe.response["message"] = {
                    "schedule": default_schedule,
                    "use_default_hours": True,
                    "provider": None,
                    "error": "Service ID is required for provider availability"
                }
                return
            
            # Use provided provider_id or get current user's provider
            if provider_id:
                provider_name = provider_id
            else:
                provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
            
            provider_info = None
            
            if not provider_name:
                # Provider not found - return default schedule
                frappe.response["message"] = {
                    "schedule": default_schedule,
                    "use_default_hours": True,
                    "provider": None,
                    "error": "Provider not found. Please select a provider or complete your provider profile first."
                }
                return
            
            # Verify provider is linked to the service
            service_providers = frappe.get_all(
                "Service Provider",
                filters={"parent": service_id, "provider": provider_name, "status": "Active"},
                fields=["provider"]
            )
            
            if not service_providers:
                frappe.response["message"] = {
                    "schedule": default_schedule,
                    "use_default_hours": True,
                    "provider": None,
                    "error": f"Provider is not linked to service {service_id}"
                }
                return
            
            try:
                provider = frappe.get_doc("Provider", provider_name)
                opening_hours = provider.opening_hours or []
                use_default = getattr(provider, 'use_default_hours', 0) or 0
                provider_info = {
                    "name": provider.name,
                    "provider_name": provider.provider_name,
                    "email": provider.email
                }
            except frappe.DoesNotExistError:
                frappe.response["message"] = {
                    "schedule": default_schedule,
                    "use_default_hours": True,
                    "provider": None,
                    "error": "Provider document not found"
                }
                return
        
        # Convert opening_hours to schedule format
        schedule = []
        for day in days_of_week:
            day_hours = [oh for oh in opening_hours if oh.day_of_week == day and oh.is_open]
            schedule.append({
                "day": day,
                "isOpen": len(day_hours) > 0,
                "ranges": [
                    {
                        "start": str(oh.start_time)[:5],  # HH:MM
                        "end": str(oh.end_time)[:5]
                    }
                    for oh in day_hours
                ]
            })
        
        response_data = {
            "schedule": schedule,
            "use_default_hours": bool(use_default)
        }
        
        # Add provider info for provider level
        if level == 'provider' and provider_info:
            response_data["provider"] = provider_info
        
        frappe.response["message"] = response_data
    except Exception as e:
        frappe.log_error(str(e), "Get Availability Error")
        frappe.throw(_(f"Failed to get availability: {str(e)}"))


@frappe.whitelist()
def save_availability(level, id=None, opening_hours=None, use_default_hours=0, provider_id=None):
    """
    Save availability for Location, Service, or Provider
    
    Args:
        level: 'location', 'service', or 'provider'
        id: ID of location/service (not needed for provider)
        opening_hours: List of {day_of_week, start_time, end_time, is_open}
        use_default_hours: 0 or 1
        provider_id: ID of provider (optional for provider level, if not provided uses current user's provider)
    """
    user = frappe.session.user
    
    try:
        if level == 'location':
            if not id:
                frappe.throw(_("Location ID is required"))
            doc = frappe.get_doc("Location", id)
            
            # Validate and fix organization field if it's incorrectly set
            if doc.organization:
                # Check if organization exists
                org_exists = frappe.db.exists("Organization", doc.organization)
                if not org_exists:
                    # Organization doesn't exist - clear it to make this a personal location
                    # This prevents validation errors when saving
                    invalid_org = doc.organization
                    doc.organization = None
                    frappe.log_error(
                        f"Location {doc.name} had invalid organization '{invalid_org}'. Cleared to make it a personal location.",
                        "Location: Invalid Organization Fixed"
                    )
            
        elif level == 'service':
            if not id:
                frappe.throw(_("Service ID is required"))
            doc = frappe.get_doc("Service", id)
            
        elif level == 'provider':
            # Use provided provider_id or get current user's provider
            if provider_id:
                provider_name = provider_id
            else:
                provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
            
            if not provider_name:
                frappe.throw(_("Provider not found. Please select a provider or complete your provider profile first."))
            
            doc = frappe.get_doc("Provider", provider_name)
        else:
            frappe.throw(_("Invalid level. Must be 'location', 'service', or 'provider'"))
        
        # Clear existing opening hours
        doc.opening_hours = []
        
        # Add new opening hours
        if opening_hours:
            for oh in opening_hours:
                doc.append("opening_hours", {
                    "day_of_week": oh.get("day_of_week"),
                    "start_time": oh.get("start_time"),
                    "end_time": oh.get("end_time"),
                    "is_open": oh.get("is_open", 0)
                })
        
        # Set use_default_hours
        if hasattr(doc, 'use_default_hours'):
            doc.use_default_hours = 1 if use_default_hours else 0
        
        doc.save(ignore_permissions=True)
        
        frappe.response["message"] = {"success": True}
    except Exception as e:
        frappe.log_error(str(e), "Save Availability Error")
        frappe.throw(_(f"Failed to save availability: {str(e)}"))


@frappe.whitelist()
def get_appointment_group_form_data():
    """
    Get form data for creating Appointment Groups
    Returns available providers, Google Calendars, and user info
    """
    user = frappe.session.user
    
    try:
        # Get user's provider
        user_provider = frappe.db.get_value(
            "Provider",
            {"user": user},
            ["name", "provider_name", "user", "organization"],
            as_dict=True
        )
        
        # Get user's organizations
        organizations = frappe.get_all(
            "Organization",
            filters={"owner_user": user},
            fields=["name", "organization_name", "slug"]
        )
        
        # Get providers for organizations
        org_providers = {}
        if organizations:
            for org in organizations:
                providers = frappe.get_all(
                    "Provider",
                    filters={"organization": org.name, "is_active": 1},
                    fields=["name", "provider_name", "user", "email"],
                    order_by="creation asc"
                )
                org_providers[org.name] = providers
        
        # Get individual provider if exists
        individual_providers = []
        if user_provider and not user_provider.organization:
            individual_providers.append({
                "name": user_provider.name,
                "provider_name": user_provider.provider_name,
                "user": user_provider.user
            })
        
        # Get Google Calendars
        google_calendars = frappe.get_all(
            "Google Calendar",
            fields=["name"],
            order_by="creation asc"
        )
        
        frappe.response["message"] = {
            "success": True,
            "organizations": organizations,
            "user_provider": user_provider,
            "org_providers": org_providers,
            "individual_providers": individual_providers,
            "google_calendars": google_calendars,
            "is_organization_user": len(organizations) > 0
        }
    except Exception as e:
        frappe.log_error(str(e), "Get Appointment Group Form Data Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def create_appointment_group(
    group_name,
    duration_minutes=30,
    buffer_minutes=5,
    event_creator=None,
    event_organizer=None,
    members=None,
    meet_provider="Custom",
    meet_link=None,
    allow_rescheduling=1,
    minimum_notice_for_reschedule_hours=2,
    minimum_notice_before_event_days=1,
    event_availability_window_days=30
):
    """
    Create an Appointment Group
    
    Args:
        group_name: Name of the group meeting
        duration_minutes: Duration in minutes (default: 30)
        buffer_minutes: Buffer time in minutes (default: 5)
        event_creator: Google Calendar name (required)
        event_organizer: User email for organizer (defaults to current user)
        members: List of member objects with {user, is_mandatory}
        meet_provider: Custom/Zoom/Google Meet (default: Custom)
        meet_link: Meeting link if Custom provider
        allow_rescheduling: 1 or 0 (default: 1)
        minimum_notice_for_reschedule_hours: Hours before reschedule allowed (default: 2)
        minimum_notice_before_event_days: Days notice before event (default: 1)
        event_availability_window_days: Days ahead to show availability (default: 30)
    """
    user = frappe.session.user
    
    try:
        # Validate required fields
        if not group_name or not group_name.strip():
            frappe.throw(_("Group name is required"))
        
        # Check if group name already exists
        if frappe.db.exists("Appointment Group", {"group_name": group_name}):
            frappe.throw(_("An appointment group with this name already exists"))
        
        # Get or validate Google Calendar
        if not event_creator:
            # Try to get first available Google Calendar
            google_calendars = frappe.get_all("Google Calendar", fields=["name"], limit=1)
            if not google_calendars:
                frappe.throw(_("No Google Calendar found. Please create a Google Calendar first."))
            event_creator = google_calendars[0].name
        else:
            # Validate Google Calendar exists
            if not frappe.db.exists("Google Calendar", event_creator):
                frappe.throw(_("Google Calendar not found"))
        
        # Set event organizer (default to current user)
        if not event_organizer:
            event_organizer = user
        
        # Validate event organizer is a valid user
        if not frappe.db.exists("User", event_organizer):
            frappe.throw(_("Event organizer must be a valid user"))
        
        # Parse members
        if isinstance(members, str):
            import json
            try:
                members = json.loads(members)
            except:
                frappe.throw(_("Invalid members format"))
        
        if not members or len(members) == 0:
            frappe.throw(_("At least one member is required"))
        
        # Validate members and ensure at least one is mandatory
        mandatory_count = 0
        for member in members:
            if not member.get("user"):
                frappe.throw(_("Each member must have a user email"))
            
            # Validate user exists
            if not frappe.db.exists("User", member.get("user")):
                frappe.throw(_(f"User {member.get('user')} not found"))
            
            if member.get("is_mandatory"):
                mandatory_count += 1
        
        if mandatory_count == 0:
            frappe.throw(_("At least one member must be marked as mandatory"))
        
        # Create Appointment Group
        appointment_group = frappe.new_doc("Appointment Group")
        appointment_group.group_name = group_name.strip()
        appointment_group.event_creator = event_creator
        appointment_group.event_organizer = event_organizer
        appointment_group.duration_for_event = int(duration_minutes) * 60  # Convert to seconds
        appointment_group.minimum_buffer_time = int(buffer_minutes) * 60  # Convert to seconds
        appointment_group.allow_rescheduling = int(allow_rescheduling)
        appointment_group.minimum_notice_for_reschedule = int(minimum_notice_for_reschedule_hours) * 60 * 60  # Convert to seconds
        appointment_group.minimum_notice_before_event = int(minimum_notice_before_event_days) * 24 * 60 * 60  # Convert to seconds
        appointment_group.event_availability_window = int(event_availability_window_days)
        appointment_group.meet_provider = meet_provider
        
        if meet_link:
            appointment_group.meet_link = meet_link
        elif meet_provider == "Custom":
            # Set default meeting link for Custom provider
            appointment_group.meet_link = "https://meet.example.com/group-meeting"
        
        # Add members
        for member in members:
            appointment_group.append("members", {
                "user": member.get("user"),
                "is_mandatory": 1 if member.get("is_mandatory") else 0
            })
        
        appointment_group.insert(ignore_permissions=True)
        
        # Sync booking URLs
        try:
            from frappe_appointment.scheduler.booking_url_manager import sync_booking_urls_for_appointment_group
            sync_booking_urls_for_appointment_group(appointment_group.name)
            frappe.db.commit()
        except Exception as e:
            frappe.log_error(str(e), f"Sync Group {appointment_group.name} Booking URLs Error")
        
        frappe.response["message"] = {
            "success": True,
            "appointment_group": {
                "name": appointment_group.name,
                "group_name": appointment_group.group_name,
                "booking_url": f"/schedule/gr/{appointment_group.name}"
            }
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Create Appointment Group Error")
        frappe.throw(_(f"Failed to create appointment group: {str(e)}"))

