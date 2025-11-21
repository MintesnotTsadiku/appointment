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
    """
    user = frappe.session.user
    
    # Check if Provider exists for this user
    provider = frappe.db.get_value(
        "Provider",
        {"user": user},
        ["name", "onboarding_complete", "onboarding_current_step", "onboarding_type", "onboarding_organization"],
        as_dict=True,
    )
    
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
                location.insert()
                
                # Link Location to Provider
                provider.append("locations", {
                    "location": location.name,
                    "is_primary": True
                })
                provider.save()
        
        # Clear existing opening hours
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
        
        location.save()
        
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
def create_service(name, duration, buffer_time, price, currency="ETB"):
    """
    Create first service/appointment type (Step 4) - Create Service and EventType
    """
    user = frappe.session.user
    
    try:
        # Get Provider for this user
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not provider_name:
            frappe.throw(_("Provider not found. Please complete Step 1 first."))
        
        provider = frappe.get_doc("Provider", provider_name)
        
        # Get primary Location
        if not provider.locations:
            frappe.throw(_("Location not found. Please complete Step 3 first."))
        
        location_name = provider.locations[0].location
        location = frappe.get_doc("Location", location_name)
        
        # Create or update Service
        existing_service = frappe.db.get_value("Service", {"service_name": name, "owner": user}, "name")
        if existing_service:
            service = frappe.get_doc("Service", existing_service)
            service.duration = int(duration)
            service.price = float(price) if price else 0
            service.buffer_before = int(buffer_time) if buffer_time else 0
            service.buffer_after = int(buffer_time) if buffer_time else 0
            service.save()
        else:
            service = frappe.new_doc("Service")
            service.service_name = name
            service.duration = int(duration)
            service.price = float(price) if price else 0
            service.buffer_before = int(buffer_time) if buffer_time else 0
            service.buffer_after = int(buffer_time) if buffer_time else 0
            # No organization for individual providers
            service.organization = None
            service.insert()
        
        # Create or update EventType
        existing_event_type = frappe.db.get_value("EventType", {"event_type_name": name, "provider": provider.name}, "name")
        if existing_event_type:
            event_type = frappe.get_doc("EventType", existing_event_type)
            event_type.service = service.name
            event_type.location = location.name
            event_type.description = f"{name} - {duration} minutes"
            event_type.save()
        else:
            event_type = frappe.new_doc("EventType")
            event_type.event_type_name = name
            event_type.service = service.name
            event_type.provider = provider.name
            event_type.location = location.name
            event_type.description = f"{name} - {duration} minutes"
            event_type.insert()
        
        # Create User Appointment Availability (critical for booking to work)
        # Use a URL-safe slug derived from the event type / service name
        slug = make_slug(event_type.name)

        user_availability = None
        existing_availability = frappe.db.get_value("User Appointment Availability", {"user": user}, "name")
        
        if existing_availability:
            user_availability = frappe.get_doc("User Appointment Availability", existing_availability)
            user_availability.slug = slug
            user_availability.enable_scheduling = 1
            user_availability.meeting_provider = provider.calendar_preference or "builtin"
            # Some upstream versions make Google Calendar mandatory; bypass mandatory check
            user_availability.flags.ignore_mandatory = True
            user_availability.save()
        else:
            user_availability = frappe.new_doc("User Appointment Availability")
            user_availability.user = user
            user_availability.slug = slug
            user_availability.enable_scheduling = 1
            user_availability.meeting_provider = provider.calendar_preference or "builtin"
            # Bypass mandatory field validation (e.g., Google Calendar) for builtin provider
            user_availability.insert(ignore_mandatory=True)
        
        # CRITICAL: Populate appointment_time_slot based on Location's Opening Hours
        # This is required for the booking calendar to show available days
        user_availability = frappe.get_doc("User Appointment Availability", user_availability.name)
        user_availability.appointment_time_slot = []  # Clear existing
        
        # Group Opening Hours by day and find the earliest start and latest end for each day
        day_hours = {}
        for oh in location.opening_hours:
            if oh.is_open:
                day = oh.day_of_week
                start_str = time_to_str(oh.start_time)
                end_str = time_to_str(oh.end_time)
                if day not in day_hours:
                    day_hours[day] = {"start": start_str, "end": end_str}
                else:
                    # If multiple slots per day, use earliest start and latest end
                    # Compare as strings (HH:MM:SS format allows string comparison)
                    if start_str < day_hours[day]["start"]:
                        day_hours[day]["start"] = start_str
                    if end_str > day_hours[day]["end"]:
                        day_hours[day]["end"] = end_str
        
        # Add each available day to appointment_time_slot with start/end times
        # Note: Frappe Time fields accept strings in "HH:MM:SS" format
        for day in sorted(day_hours.keys()):
            user_availability.append("appointment_time_slot", {
                "day": day,
                "start_time": day_hours[day]["start"],  # String in "HH:MM:SS" format
                "end_time": day_hours[day]["end"]      # String in "HH:MM:SS" format
            })
        
        user_availability.flags.ignore_mandatory = True
        user_availability.save()
        
        # Create or update Appointment Slot Duration (required for time slots to appear)
        existing_duration = frappe.db.get_value("Appointment Slot Duration", 
                                                {"parent": user_availability.name, "title": name}, "name")
        if existing_duration:
            duration_doc = frappe.get_doc("Appointment Slot Duration", existing_duration)
            duration_doc.duration = int(duration) * 60  # Convert minutes to seconds
            duration_doc.minimum_buffer_time = int(buffer_time) * 60 if buffer_time else 0
            duration_doc.save()
        else:
            duration_doc = frappe.new_doc("Appointment Slot Duration")
            duration_doc.parent = user_availability.name
            duration_doc.parenttype = "User Appointment Availability"
            duration_doc.parentfield = "available_durations"  # Correct child table field name
            duration_doc.title = name
            duration_doc.duration = int(duration) * 60  # Convert minutes to seconds
            duration_doc.minimum_buffer_time = int(buffer_time) * 60 if buffer_time else 0
            duration_doc.minimum_notice_before_event = 1800  # 30 minutes default
            duration_doc.availability_window = 30  # 30 days ahead
            duration_doc.allow_rescheduling = 1
            duration_doc.limit_booking_frequency = 0
            duration_doc.insert()
        
        # Update Provider onboarding step
        provider.onboarding_current_step = 5
        provider.save()
        
        frappe.db.commit()
        
        frappe.response["message"] = {
            "success": True,
            "service_id": service.name,
            "event_type_id": event_type.name,
            # Use the slug in the URL so it's clean and matches User Appointment Availability
            "booking_url": f"/schedule/in/{slug}",
            "user_availability_id": user_availability.name
        }
    except Exception as e:
        frappe.log_error(str(e), "Onboarding: Create Service Error")
        frappe.response["message"] = {
            "success": False,
            "error": str(e)
        }


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
    Get the booking URL for the current user's EventType
    Returns the relative booking URL path
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
                # Create Provider for existing user
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
            
            # Populate Appointment Time Slot from Location Opening Hours
            # Clear existing time slots
            avail.appointment_time_slot = []
            
            for opening_hour in location.opening_hours:
                if opening_hour.is_open:
                    start_time_str = time_to_str(opening_hour.start_time)
                    end_time_str = time_to_str(opening_hour.end_time)
                    
                    avail.append("appointment_time_slot", {
                        "day": opening_hour.day_of_week,
                        "start_time": start_time_str,
                        "end_time": end_time_str
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

