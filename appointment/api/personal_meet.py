import json
import re

import frappe
import frappe.utils
import pytz

from appointment.frappe_appointment.doctype.appointment_group.appointment_group import _get_time_slots_for_day
from appointment.helpers.overrides import add_response_code
from appointment.helpers.utils import duration_to_string
from appointment.overrides.event_override import _create_event_for_appointment_group


@frappe.whitelist(allow_guest=True)
@add_response_code
def get_meeting_windows(slug):
    user_availability = frappe.get_all(
        "User Appointment Availability", filters={"slug": slug, "enable_scheduling": 1}, fields=["*"]
    )
    if not user_availability:
        # Graceful fallback: allow EventType-based booking links (from onboarding)
        # Try to resolve slug as EventType name
        event_types = frappe.get_all(
            "EventType",
            filters={"name": slug},
            fields=["name", "provider", "description"],
            limit=1,
        )
        if event_types:
            et = event_types[0]
            # Find the provider's linked user if available
            provider_doc = frappe.get_all("Provider", filters={"name": et.get("provider")}, fields=["user", "provider_name"], limit=1)
            user = provider_doc[0]["user"] if provider_doc and provider_doc[0].get("user") else None
            full_name = provider_doc[0]["provider_name"] if provider_doc else slug
            
            # Try to find User Appointment Availability for this user to get actual durations
            durations = []
            if user:
                user_availability_list = frappe.get_all(
                    "User Appointment Availability",
                    filters={"user": user, "enable_scheduling": 1},
                    fields=["name"],
                    limit=1
                )
                if user_availability_list:
                    # Found User Appointment Availability - get actual durations
                    ua_name = user_availability_list[0]["name"]
                    all_durations = frappe.get_all(
                        "Appointment Slot Duration",
                        filters={"parent": ua_name},
                        fields=["name", "title", "duration"]
                    )
                    durations = [
                        {"id": d["name"], "label": d["title"], "duration": int(d["duration"] / 60)}  # Convert seconds to minutes
                        for d in all_durations
                    ]
            
            # Fallback: if no durations found, use Service duration
            if not durations:
                service_link = frappe.get_value("EventType", et["name"], "service")
                default_duration = frappe.get_value("Service", service_link, "duration") if service_link else 30
                # Try to find the actual Appointment Slot Duration record by title
                if user:
                    user_availability_list = frappe.get_all(
                        "User Appointment Availability",
                        filters={"user": user},
                        fields=["name"],
                        limit=1
                    )
                    if user_availability_list:
                        ua_name = user_availability_list[0]["name"]
                        # Look for duration with matching title
                        duration_title = f"{int(default_duration)} min"
                        matching_duration = frappe.get_all(
                            "Appointment Slot Duration",
                            filters={"parent": ua_name, "title": duration_title},
                            fields=["name", "title", "duration"],
                            limit=1
                        )
                        if matching_duration:
                            d = matching_duration[0]
                            durations = [{"id": d["name"], "label": d["title"], "duration": int(d["duration"] / 60)}]
                        else:
                            # Last resort: use first available duration
                            all_durations = frappe.get_all(
                                "Appointment Slot Duration",
                                filters={"parent": ua_name},
                                fields=["name", "title", "duration"],
                                limit=1
                            )
                            if all_durations:
                                d = all_durations[0]
                                durations = [{"id": d["name"], "label": d["title"], "duration": int(d["duration"] / 60)}]
            
            # If still no durations, create a fallback (shouldn't happen if onboarding completed)
            if not durations:
                service_link = frappe.get_value("EventType", et["name"], "service")
                default_duration = frappe.get_value("Service", service_link, "duration") if service_link else 30
                durations = [{"id": "default", "label": f"{int(default_duration)} min", "duration": int(default_duration or 30)}]
            
            return {
                "full_name": full_name,
                "profile_pic": None,
                "banner_image": None,
                "position": None,
                "company": None,
                "meeting_provider": "builtin",
                "durations": durations,
            }, 200
        # Original behavior if nothing found
        return {"error": "No user found"}, 404
    user_availability = user_availability[0]
    user = user_availability.get("user")
    if not user:
        return {"error": "No user found"}, 404

    user = frappe.get_doc("User", user)

    full_name = user.get("full_name")
    profile_pic = user.get("user_image")
    banner_image = user.get("banner_image")
    position = None
    company = None

    installed_apps = frappe.get_installed_apps()
    if "erpnext" in installed_apps:
        employee = frappe.get_all("Employee", filters={"user_id": user.name}, fields=["*"])
        if employee:
            employee = employee[0]
            position = employee.get("designation")
            company = employee.get("company")

    meeting_provider = user_availability.get("meeting_provider")

    all_durations = frappe.get_all(
        "Appointment Slot Duration", filters={"parent": user_availability.get("name")}, fields=["*"]
    )

    durations = [
        {"id": duration.name, "label": duration.title, "duration": duration.duration} for duration in all_durations
    ]

    return {
        "full_name": full_name,
        "profile_pic": profile_pic,
        "banner_image": banner_image,
        "position": position,
        "company": company,
        "meeting_provider": meeting_provider,
        "durations": durations,
    }, 200


@frappe.whitelist(allow_guest=True)
@add_response_code
def get_time_slots(
    duration_id: str, date: str = None, user_timezone_offset: str = None, start_date: str = None, end_date: str = None,
    organization_id: str = None, service_id: str = None
):
    # Only include debug messages in developer mode
    include_debug = frappe.conf.developer_mode or frappe.conf.get("developer_mode")
    debug_messages = [] if include_debug else None
    if debug_messages is not None:
        debug_messages.append(f"[1] API called with duration_id={duration_id}, date={date}, user_timezone_offset={user_timezone_offset}")
    
    # Validate duration_id is not empty
    if not duration_id or duration_id.strip() == "":
        if debug_messages is not None:
            debug_messages.append("[ERROR] duration_id is required but was empty or missing")
        response = {"error": "duration_id is required", "debug_messages": debug_messages}
        frappe.local.response["http_status_code"] = 400
        return response
    
    # Validate date is not in the past (for single date queries)
    if date:
        from frappe.utils import get_datetime, now_datetime
        requested_date = get_datetime(date)
        current_date = now_datetime().replace(hour=0, minute=0, second=0, microsecond=0)
        
        if requested_date.replace(hour=0, minute=0, second=0, microsecond=0) < current_date:
            if debug_messages is not None:
                debug_messages.append(f"[ERROR] Requested date {date} is in the past (current date: {current_date})")
            response = {"error": "Cannot book appointments for past dates", "is_past_date": True}
            if debug_messages is not None:
                response["debug_messages"] = debug_messages
            return response, 400
    
    # Check if this is an organization booking
    if organization_id and service_id:
        # Multi-provider booking with round-robin
        return get_multi_provider_time_slots(
            organization_id, service_id, duration_id, date, user_timezone_offset
        )
    
    if not date and not (start_date and end_date):
        if debug_messages is not None:
            debug_messages.append("[ERROR] Date is required but not provided")
        response = {"error": "Date is required"}
        if debug_messages is not None:
            response["debug_messages"] = debug_messages
        return response, 400

    if not user_timezone_offset:
        if debug_messages is not None:
            debug_messages.append("[ERROR] User timezone offset is required but not provided")
        response = {"error": "User timezone offset is required"}
        if debug_messages is not None:
            response["debug_messages"] = debug_messages
        return response, 400

    # Try to fetch the configured duration; gracefully handle missing records
    try:
        duration = frappe.get_doc("Appointment Slot Duration", duration_id)
        if debug_messages is not None:
            debug_messages.append(f"[2] Found Appointment Slot Duration: name={duration.name}, title={duration.title}, duration={duration.duration}s, parent={duration.parent}")
    except Exception as e:
        if debug_messages is not None:
            debug_messages.append(f"[ERROR] Failed to get Appointment Slot Duration {duration_id}: {str(e)}")
        # If duration_id is "default" or doesn't exist, try to find the first available duration
        # by looking up the User Appointment Availability from the slug in the URL context
        # For now, return empty - the frontend should use the correct duration_id from get_meeting_windows
        empty = {
            "all_available_slots_for_data": [],
            "dates": [],
            "duration": None,
            "starttime": None,
            "endtime": None,
            "total_slots": 0,
            "available_days": [],
            "user": None,
            "label": "Default",
            "rescheduling_allowed": False,
            "is_invalid_date": False,
        }
        if debug_messages is not None:
            empty["debug_messages"] = debug_messages
        return empty, 200

    user_availability = frappe.get_all(
        "User Appointment Availability", filters={"name": duration.get("parent")}, fields=["*"]
    )

    if not user_availability:
        if debug_messages is not None:
            debug_messages.append(f"[ERROR] No User Appointment Availability found for parent={duration.get('parent')}")
        response = {"error": "No user found"}
        if debug_messages is not None:
            response["debug_messages"] = debug_messages
        return response, 404

    user_availability = user_availability[0]
    if debug_messages is not None:
        debug_messages.append(f"[3] Found User Appointment Availability: name={user_availability.get('name')}, user={user_availability.get('user')}, meeting_provider={user_availability.get('meeting_provider')}")

    appointment_group_obj = create_dummy_appointment_group(duration, user_availability)
    if debug_messages is not None:
        debug_messages.append(f"[4] Created appointment_group_obj: {appointment_group_obj.get('name') if isinstance(appointment_group_obj, dict) else 'N/A'}")

    appointment_group = frappe.get_doc(appointment_group_obj)
    if debug_messages is not None:
        debug_messages.append(f"[5] Created Appointment Group doc: name={appointment_group.name}, members_count={len(appointment_group.members)}")
        for i, member in enumerate(appointment_group.members):
            debug_messages.append(f"[5.{i+1}] Member {i+1}: user={member.user}, is_mandatory={member.is_mandatory}")

    if date:
        if debug_messages is not None:
            debug_messages.append(f"[6] Calling _get_time_slots_for_day with date={date}")
        data = _get_time_slots_for_day(appointment_group, date, user_timezone_offset, debug_messages=debug_messages)
    else:
        data = {
            "all_available_slots_for_data": [],
            "dates": [],
            "duration": None,
            "starttime": None,
            "endtime": None,
            "total_slots": 0,
            "available_days": [],
        }

        date = start_date
        cache_dict = {}
        while True:
            datetime = frappe.utils.get_datetime(date)
            enddatetime = frappe.utils.get_datetime(end_date)
            if datetime > enddatetime:
                break
            _data = _get_time_slots_for_day(
                appointment_group, date, user_timezone_offset, time_slot_cache_dict=cache_dict, debug_messages=debug_messages
            )
            if _data["is_invalid_date"]:
                date = _data["next_valid_date"]
                if not isinstance(_data["next_valid_date"], str):
                    date = _data["next_valid_date"].strftime("%Y-%m-%d")
            else:
                data["all_available_slots_for_data"].extend(_data["all_available_slots_for_data"])
                data["dates"].append(_data["date"])
                data["duration"] = _data["duration"]
                data["starttime"] = (
                    min(_data["starttime"], data["starttime"]) if data["starttime"] else _data["starttime"]
                )
                data["endtime"] = max(_data["endtime"], data["endtime"]) if data["endtime"] else _data["endtime"]
                data["total_slots"] += _data["total_slots_for_day"]
                for available_day in _data["available_days"]:
                    if available_day not in data["available_days"]:
                        data["available_days"].append(available_day)
                date = frappe.utils.add_days(date, 1)

    if not data:
        if debug_messages is not None:
            debug_messages.append("[ERROR] _get_time_slots_for_day returned None or empty data")
        response = {"error": "No data returned"}
        if debug_messages is not None:
            response["debug_messages"] = debug_messages
        return response, 500

    if "appointment_group_id" in data:
        del data["appointment_group_id"]
    
    # Apply slot engine filters (working hours, time-off, buffers, conflicts)
    if "all_available_slots_for_data" in data and data["all_available_slots_for_data"]:
        from appointment.scheduler.helpers.slot_engine import (
            filter_by_working_hours,
            filter_by_time_off,
            apply_buffer_times,
            check_conflicts
        )
        
        slots = data["all_available_slots_for_data"]
        original_count = len(slots)
        
        # Get provider, location, and service for filtering
        provider_name = None
        location_name = None
        service_name = None
        
        # Get provider from user_availability
        provider_user = user_availability.get("user")
        provider = frappe.get_all(
            "Provider",
            filters={"user": provider_user},
            fields=["name"],
            limit=1
        )
        if provider:
            provider_name = provider[0].get("name")
            # Get location from provider
            provider_locations = frappe.get_all(
                "Provider Location",
                filters={"parent": provider_name},
                fields=["location"],
                limit=1
            )
            if provider_locations:
                location_name = provider_locations[0].get("location")
            # Get service from EventType
            event_types = frappe.get_all(
                "EventType",
                filters={"provider": provider_name, "is_active": 1},
                fields=["service"],
                limit=1
            )
            if event_types:
                service_name = event_types[0].get("service")
        
        # Apply filters
        if location_name:
            # Filter by working hours
            slots = filter_by_working_hours(slots, location_name, service_name, provider_name)
            if debug_messages is not None:
                debug_messages.append(f"[FILTER] After working hours: {len(slots)} slots")
        
        if provider_name:
            # Filter by time-off
            slots = filter_by_time_off(slots, provider_name)
            if debug_messages is not None:
                debug_messages.append(f"[FILTER] After time-off: {len(slots)} slots")
        
        # Get buffer times from service
        buffer_before = 0
        buffer_after = 0
        if service_name:
            service = frappe.get_doc("Service", service_name)
            buffer_before = service.buffer_before or 0
            buffer_after = service.buffer_after or 0
        
        # Get existing appointments for buffer calculation
        existing_appointments = []
        if provider_name and location_name:
            appointments = frappe.get_all(
                "Appointment",
                filters={
                    "provider": provider_name,
                    "location": location_name,
                    "status": ["in", ["Pending", "Confirmed"]]
                },
                fields=["appointment_date", "start_time", "end_time"]
            )
            for apt in appointments:
                existing_appointments.append({
                    "start_time": f"{apt.appointment_date} {apt.start_time}",
                    "end_time": f"{apt.appointment_date} {apt.end_time}"
                })
        
        # Apply buffer times
        if buffer_before > 0 or buffer_after > 0:
            slots = apply_buffer_times(slots, buffer_before, buffer_after, existing_appointments)
            if debug_messages is not None:
                debug_messages.append(f"[FILTER] After buffer times: {len(slots)} slots")
        
        # Check conflicts and mark slots as unavailable
        if provider_name and location_name:
            for slot in slots:
                if slot.get("booked"):
                    continue  # Skip already booked slots
                
                slot_start = frappe.utils.get_datetime(slot.get("start_time"))
                slot_end = frappe.utils.get_datetime(slot.get("end_time"))
                
                conflicts = check_conflicts(
                    provider_name=provider_name,
                    location_name=location_name,
                    start_time=slot_start,
                    end_time=slot_end
                )
                
                if conflicts:
                    slot["booked"] = True
                    slot["available"] = False
                    slot["conflicts"] = conflicts
        
        # Mark booked slots (for single-provider bookings) - don't filter them out
        slots = mark_booked_slots(slots, debug_messages)
        marked_count = len(slots)
        available_count = len([s for s in slots if not s.get("booked", False)])
        booked_count = len([s for s in slots if s.get("booked", False)])
        
        if debug_messages is not None:
            debug_messages.append(f"[FILTER-FINAL] Filtered slots: {original_count} -> {marked_count} total ({available_count} available, {booked_count} booked)")
        
        data["all_available_slots_for_data"] = slots
        data["available_slots_count"] = available_count
        data["booked_slots_count"] = booked_count
    
    data["user"] = user_availability.get("name")
    data["label"] = duration.title
    data["rescheduling_allowed"] = bool(duration.allow_rescheduling)
    
    if debug_messages is not None:
        data["debug_messages"] = debug_messages
        debug_messages.append(f"[FINAL] Returning data: total_slots={data.get('total_slots_for_day', 0)}, starttime={data.get('starttime')}, endtime={data.get('endtime')}, available_days={data.get('available_days')}")

    return data


@frappe.whitelist(allow_guest=True, methods=["POST"])
@add_response_code
def book_time_slot(
    duration_id: str,
    date: str,
    start_time: str,
    end_time: str,
    user_timezone_offset: str,
    user_name: str,
    user_email: str,
    other_participants: str = None,
    provider_id: str = None,
    organization_id: str = None,
    time_format: str = "12h",
    **args,
):
    # Validate date is not in the past
    from frappe.utils import get_datetime, now_datetime
    requested_date = get_datetime(date)
    current_date = now_datetime().replace(hour=0, minute=0, second=0, microsecond=0)
    
    if requested_date.replace(hour=0, minute=0, second=0, microsecond=0) < current_date:
        return {
            "error": "Cannot book appointments for past dates",
            "is_past_date": True
        }, 400
    
    # Handle organization booking with specific provider
    if organization_id and provider_id:
        # Verify provider belongs to organization using Provider Organization child table
        provider = frappe.get_doc("Provider", provider_id)
        
        # Check if provider is linked to this organization via Provider Organization child table
        provider_org_link = frappe.get_all(
            "Provider Organization",
            filters={"parent": provider_id, "organization": organization_id, "status": "Active"},
            fields=["organization"],
            limit=1
        )
        
        # Also check legacy organization field for backward compatibility
        if not provider_org_link:
            # Check if provider has direct organization field (legacy)
            if hasattr(provider, 'organization') and provider.organization:
                if provider.organization != organization_id:
                    return {"error": "Invalid provider for this organization"}, 400
            else:
                return {"error": "Invalid provider for this organization"}, 400
        
        # Get provider's user
        provider_user = provider.user
        
        # Get User Appointment Availability for this provider
        user_availability = frappe.get_all(
            "User Appointment Availability",
            filters={"user": provider_user, "enable_scheduling": 1},
            fields=["*"],
            limit=1
        )
        
        if not user_availability:
            return {"error": "Provider availability not found"}, 404
        
        user_availability = user_availability[0]
    else:
        # Individual provider booking (existing logic)
        duration = frappe.get_doc("Appointment Slot Duration", duration_id)

        user_availability = frappe.get_all(
            "User Appointment Availability", filters={"name": duration.get("parent")}, fields=["*"]
        )

        if not user_availability:
            return {"error": "No user found"}, 404

        user_availability = user_availability[0]
    
    # Get duration if not already fetched
    if not organization_id:
        duration = frappe.get_doc("Appointment Slot Duration", duration_id)
    else:
        # For organization booking, get duration from provider's availability
        duration = frappe.get_doc("Appointment Slot Duration", duration_id)

    # Get provider, location, and service for conflict detection
    provider_name = None
    location_name = None
    service_name = None
    
    if organization_id and provider_id:
        # Organization booking - we have provider_id and service_id
        provider_name = provider_id
        service_name = args.get("service_id") or args.get("service_name")
        # Get location from service or provider
        if service_name:
            # Try to get location from EventType
            event_type = frappe.get_all(
                "EventType",
                filters={"service": service_name, "provider": provider_id, "is_active": 1},
                fields=["location"],
                limit=1
            )
            if event_type and event_type[0].get("location"):
                location_name = event_type[0].get("location")
            else:
                # Get from provider's first location
                provider_locations = frappe.get_all(
                    "Provider Location",
                    filters={"parent": provider_id},
                    fields=["location"],
                    limit=1
                )
                if provider_locations:
                    location_name = provider_locations[0].get("location")
    else:
        # Individual booking - get from Provider linked to user
        provider_user = user_availability.get("user")
        provider = frappe.get_all(
            "Provider",
            filters={"user": provider_user},
            fields=["name"],
            limit=1
        )
        if provider:
            provider_name = provider[0].get("name")
            # Get location from provider
            provider_locations = frappe.get_all(
                "Provider Location",
                filters={"parent": provider_name},
                fields=["location"],
                limit=1
            )
            if provider_locations:
                location_name = provider_locations[0].get("location")
            # Get service from EventType linked to this provider
            event_types = frappe.get_all(
                "EventType",
                filters={"provider": provider_name, "is_active": 1},
                fields=["service"],
                limit=1
            )
            if event_types:
                service_name = event_types[0].get("service")
    
    # Check for conflicts before creating appointment
    if provider_name and location_name:
        from appointment.scheduler.helpers.slot_engine import check_conflicts
        from frappe.utils import get_datetime
        
        # Build appointment datetime
        appointment_datetime_str = f"{date} {start_time}"
        appointment_end_datetime_str = f"{date} {end_time}"
        appointment_start_dt = get_datetime(appointment_datetime_str)
        appointment_end_dt = get_datetime(appointment_end_datetime_str)
        
        conflicts = check_conflicts(
            provider_name=provider_name,
            location_name=location_name,
            start_time=appointment_start_dt,
            end_time=appointment_end_dt,
            exclude_appointment=None  # For new bookings, no exclusion
        )
        
        if conflicts:
            return {
                "error": "Time slot is already booked",
                "conflicts": conflicts
            }, 409  # Conflict status code
    
    appointment_group_obj = create_dummy_appointment_group(duration, user_availability)

    appointment_group = frappe.get_doc(appointment_group_obj)

    # Get the provider's email address from the User doctype
    provider_user = user_availability.get("user")
    provider_email = frappe.db.get_value("User", provider_user, "email")
    
    # If no email found, fallback to username (but this will cause validation error)
    # In practice, all Users should have emails, but handle gracefully
    if not provider_email or "@" not in provider_email:
        # Try getting from User doc directly
        try:
            user_doc = frappe.get_doc("User", provider_user)
            provider_email = user_doc.email
        except Exception:
            provider_email = None
        
        # If still no email, use a placeholder format (username@system)
        if not provider_email or "@" not in provider_email:
            provider_email = f"{provider_user}@system.local"  # Placeholder email

    event_participants = [
        {
            "reference_doctype": "User Appointment Availability",
            "reference_docname": user_availability.get("name"),
            "email": provider_email,
        },
        {
            "email": user_email,
        },
    ]

    if other_participants:
        other_participants = other_participants.split(",")
        for participant in other_participants:
            if not re.match(r"[^@]+@[^@]+\.[^@]+", participant):
                continue
            event_participants.append(
                {
                    "email": participant.strip(),
                }
            )

    custom_doctype_link_with_event = [
        {
            "reference_doctype": "User Appointment Availability",
            "reference_docname": user_availability.get("name"),
            "value": user_availability.get("user"),
        }
    ]

    if not args.get("custom_doctype_link_with_event", None):
        args["custom_doctype_link_with_event"] = json.dumps(custom_doctype_link_with_event)
    else:
        original_link = json.loads(args["custom_doctype_link_with_event"])
        for link in original_link:
            if link["doctype"] == "User Appointment Availability" and link["name"] == user_availability.get("name"):
                break
        else:
            original_link.append(custom_doctype_link_with_event[0])
            args["custom_doctype_link_with_event"] = json.dumps(original_link)

    if not args.get("Subject", None):
        name = frappe.get_value("User", user_availability.get("user"), "full_name")

        duration_str = duration_to_string(duration.duration)

        args["subject"] = f"Meet: {user_name} <> {name} ({duration_str})"

    args["personal"] = True
    args["user_calendar"] = user_availability.name
    args["appointment_slot_duration"] = duration.name
    args["user_slug"] = user_availability.slug
    args["time_format"] = time_format  # Store user's preferred time format

    success_message = ""

    if args.get("event_token"):
        success_message = "Appointment has been rescheduled."

    response = _create_event_for_appointment_group(
        appointment_group,
        date,
        start_time,
        end_time,
        user_timezone_offset,
        json.dumps(event_participants),
        success_message=success_message,
        return_event_id=True,
        **args,
    )

    return response


def create_dummy_appointment_group(duration, user_availability):
    appointment_group_obj = {
        "doctype": "Appointment Group",
        "group_name": "Personal Meeting",
        "event_creator": user_availability.get("google_calendar"),
        "event_organizer": user_availability.get("user"),
        "members": [{"user": user_availability.get("name"), "is_mandatory": 1}],
        "duration_for_event": duration.duration,
        "minimum_buffer_time": duration.minimum_buffer_time if duration.minimum_buffer_time else None,
        "minimum_notice_before_event": duration.minimum_notice_before_event,
        "event_availability_window": duration.availability_window,
        "meet_provider": user_availability.get("meeting_provider"),
        "meet_link": user_availability.get("meeting_link"),
        "response_email_template": user_availability.get("response_email_template"),
        "linked_doctype": user_availability.get("name"),
        "limit_booking_frequency": duration.limit_booking_frequency,
        "is_personal_meeting": 1,
        "duration_id": duration.name,
        "allow_rescheduling": duration.allow_rescheduling,
        "minimum_notice_for_reschedule": duration.minimum_notice_for_reschedule,
    }

    return appointment_group_obj


@frappe.whitelist(allow_guest=True)
def get_all_timezones():
    return pytz.common_timezones


@frappe.whitelist()
def get_schedular_link(user):
    user_availability = frappe.get_all(
        "User Appointment Availability", filters={"user": user, "enable_scheduling": 1}, fields=["*"]
    )
    if not user_availability:
        return {"error": "No user found"}, 404

    user_availability = user_availability[0]

    all_durations = frappe.get_all(
        "Appointment Slot Duration",
        filters={"parent": user_availability.get("name")},
        fields=["name", "title", "duration"],
    )

    url = frappe.utils.get_url("/schedule/in/{0}".format(user_availability.get("slug")))

    return {
        "url": url,
        "slug": user_availability.get("slug"),
        "available_durations": [
            {
                "id": duration.name,
                "label": duration.title,
                "duration": duration.duration,
                "duration_str": duration_to_string(duration.duration),
                "url": url + "?type=" + duration.name,
            }
            for duration in all_durations
        ],
    }


# ===================================================================
# MULTI-PROVIDER / ORGANIZATION BOOKING LOGIC
# ===================================================================

# Store last assigned provider for round-robin (in-memory cache)
_last_assigned_provider = {}

def get_service_providers(service_name):
    """
    Get all active providers for a service
    Returns list of Provider documents with child table data
    """
    # Get providers from Service Provider child table
    service_providers = frappe.get_all(
        "Service Provider",
        filters={"parent": service_name, "status": "Active"},
        fields=["provider", "is_primary", "price_override", "duration_override", "commission_rate", "notes"],
        order_by="is_primary desc, creation asc"
    )
    
    if not service_providers:
        return []
    
    # Get provider details
    provider_names = [sp.get("provider") for sp in service_providers]
    providers = frappe.get_all(
        "Provider",
        filters={"name": ["in", provider_names]},
        fields=["name", "provider_name", "user"],
        order_by="name"
    )
    
    # Merge child table data with provider data
    provider_map = {p.get("name"): p for p in providers}
    result = []
    for sp in service_providers:
        provider_name = sp.get("provider")
        if provider_name in provider_map:
            prov_data = provider_map[provider_name].copy()  # Already a dict from get_all
            prov_data["is_primary"] = sp.get("is_primary")
            prov_data["price_override"] = sp.get("price_override")
            prov_data["duration_override"] = sp.get("duration_override")
            prov_data["commission_rate"] = sp.get("commission_rate")
            prov_data["notes"] = sp.get("notes")
            result.append(prov_data)
    
    return result


def get_last_assigned_provider(service_name):
    """Get last assigned provider for round-robin"""
    return _last_assigned_provider.get(service_name, None)


def update_last_assigned_provider(service_name, provider_name):
    """Update last assigned provider for round-robin"""
    _last_assigned_provider[service_name] = provider_name


@frappe.whitelist(allow_guest=True)
@add_response_code
def get_organization_services(org_slug):
    """
    Get list of services for an organization (when no specific service is selected)
    Returns organization info and list of available services
    """
    # Get Organization
    org = frappe.get_all(
        "Organization",
        filters={"slug": org_slug, "is_active": 1},
        fields=["name", "organization_name", "logo", "description"],
        limit=1
    )
    
    if not org:
        return {"error": "Organization not found"}, 404
    
    org = org[0]
    
    # Get all services for this organization
    services = frappe.get_all(
        "Service",
        filters={"organization": org["name"], "is_active": 1},
        fields=["name", "service_name", "description", "duration", "price"]
    )
    
    # Get EventType for each service to build URLs
    from appointment.onboarding import make_slug
    service_list = []
    for service in services:
        event_type = frappe.db.get_value("EventType", {"service": service["name"]}, "name")
        if event_type:
            slug = make_slug(event_type)
            service_list.append({
                "name": service["service_name"],
                "description": service.get("description"),
                "duration": service.get("duration", 30),
                "price": service.get("price", 0),
                "url": f"/schedule/org/{org_slug}/{slug}",
                "slug": slug,
                "type": "organization"
            })
    
    # Also get individual provider services (nested services)
    # Get all providers for this organization
    providers = frappe.get_all(
        "Provider",
        filters={"organization": org["name"], "organization_status": "Active"},
        fields=["name", "provider_name", "user"]
    )
    
    # Get individual provider services (services without organization)
    for provider in providers:
        provider_services = frappe.get_all(
            "Service",
            filters={"provider": provider["name"], "organization": ["is", "not set"], "is_active": 1},
            fields=["name", "service_name", "description", "duration", "price"]
        )
        for service in provider_services:
            event_type = frappe.db.get_value("EventType", {"service": service["name"], "provider": provider["name"]}, "name")
            if event_type:
                # Get User Appointment Availability slug for individual provider
                user_avail = frappe.db.get_value("User Appointment Availability", {"user": provider["user"]}, "slug")
                if user_avail:
                    slug = make_slug(event_type)
                    service_list.append({
                        "name": service["service_name"],
                        "description": service.get("description"),
                        "duration": service.get("duration", 30),
                        "price": service.get("price", 0),
                        "url": f"/schedule/in/{user_avail}?type={slug}",
                        "slug": slug,
                        "type": "individual",
                        "provider_name": provider.get("provider_name", provider["user"])
                    })
    
    return {
        "full_name": org["organization_name"],
        "profile_pic": org.get("logo"),
        "banner_image": None,
        "position": None,
        "company": org["organization_name"],
        "description": org.get("description"),
        "is_organization": True,
        "organization_id": org["name"],
        "services": service_list
    }


@frappe.whitelist(allow_guest=True)
@add_response_code
def get_organization_meeting_windows(org_slug, service_slug):
    """
    Get meeting windows for organization booking
    Returns organization info and available durations
    """
    # Get Organization
    org = frappe.get_all(
        "Organization",
        filters={"slug": org_slug, "is_active": 1},
        fields=["name", "organization_name", "logo"],
        limit=1
    )
    
    if not org:
        return {"error": "Organization not found"}, 404
    
    org = org[0]
    
    # Get EventType/Service
    # Try to find by name first (in case slug matches name)
    event_type = frappe.get_all(
        "EventType",
        filters={"name": service_slug},
        fields=["name", "service", "description", "location"],
        limit=1
    )
    
    # If not found, try to find by matching slug (case-insensitive)
    if not event_type:
        # Get all EventTypes and check if any match the slug
        all_event_types = frappe.get_all(
            "EventType",
            fields=["name", "service", "description"]
        )
        for et in all_event_types:
            # Create slug from EventType name and compare
            from appointment.onboarding import make_slug
            et_slug = make_slug(et["name"])
            if et_slug.lower() == service_slug.lower():
                event_type = [et]
                break
    
    if not event_type:
        return {"error": "Service not found"}, 404
    
    event_type = event_type[0]
    
    # Get Service
    service = frappe.get_doc("Service", event_type["service"])
    
    # Get organization's active providers first
    org_provider_names = frappe.get_all(
        "Provider Organization",
        filters={"organization": org["name"], "status": "Active"},
        fields=["parent"],
        pluck="parent"
    )
    
    if not org_provider_names:
        return {"error": "No active providers in organization"}, 404
    
    # Get providers for this service
    providers = get_service_providers(service.name)
    
    # Filter to only include providers in the organization
    if providers:
        providers = [p for p in providers if p.get("name") in org_provider_names]
    
    # If no providers from Service Provider child table, get from EventTypes
    # Find EventTypes for this service that belong to organization providers
    if not providers:
        # Get all EventTypes for this service
        all_event_types = frappe.get_all(
            "EventType",
            filters={"service": service.name, "is_active": 1},
            fields=["provider", "name"]
        )
        
        # Get providers from EventTypes, but only if they're in the organization
        provider_docs = []
        seen_providers = set()
        
        for et in all_event_types:
            prov_name = et.get("provider")
            if not prov_name:
                continue
            
            prov_doc_name = None
            
            # Try direct lookup
            if prov_name in org_provider_names:
                prov_doc_name = prov_name
            elif frappe.db.exists("Provider", prov_name):
                # Check if this provider is in the organization
                if prov_name in org_provider_names:
                    prov_doc_name = prov_name
            else:
                # Try to find by provider_name
                matching = frappe.get_all(
                    "Provider",
                    filters={"provider_name": prov_name, "name": ["in", org_provider_names]},
                    fields=["name"],
                    limit=1
                )
                if matching:
                    prov_doc_name = matching[0].name
            
            # Only add if provider is in organization and not already added
            if prov_doc_name and prov_doc_name not in seen_providers:
                prov = frappe.get_doc("Provider", prov_doc_name)
                provider_docs.append({
                    "name": prov.name,
                    "provider_name": prov.provider_name,
                    "user": prov.user
                })
                seen_providers.add(prov_doc_name)
        
        providers = provider_docs
    
    if not providers:
        return {"error": "No providers available for this service in the organization"}, 404
    
    # Get durations from first provider (all have same durations for org services)
    first_provider = providers[0]
    user_availability_list = frappe.get_all(
        "User Appointment Availability",
        filters={"user": first_provider["user"], "enable_scheduling": 1},
        fields=["name"],
        limit=1
    )
    
    durations = []
    if user_availability_list:
        ua_name = user_availability_list[0]["name"]
        all_durations = frappe.get_all(
            "Appointment Slot Duration",
            filters={"parent": ua_name},
            fields=["name", "title", "duration"]
        )
        durations = [
            {"id": d["name"], "label": d["title"], "duration": int(d["duration"] / 60)}
            for d in all_durations
        ]
    
    # Fallback: use service duration
    if not durations:
        durations = [{
            "id": "default",
            "label": f"{int(service.duration)} min",
            "duration": int(service.duration)
        }]
    
    # Get provider details with their services
    provider_details = []
    for provider in providers:
        # Get provider's services/event types
        provider_event_types = frappe.get_all(
            "EventType",
            filters={"provider": provider["name"]},
            fields=["name", "event_type_name", "service"]
        )
        provider_details.append({
            "id": provider["name"],
            "name": provider.get("provider_name", provider["user"]),
            "user": provider["user"],
            "services": [et["event_type_name"] for et in provider_event_types]
        })
    
    # Get location information from EventType
    location_info = None
    if event_type.get("location"):
        try:
            location = frappe.get_doc("Location", event_type["location"])
            # Combine address fields
            address_parts = [location.address_line_1, location.address_line_2, location.city]
            address = ", ".join([part for part in address_parts if part])
            
            # Check if location is online/virtual
            # Check for is_online field, or if location_name contains "online", "virtual", "zoom", "meet", etc.
            is_online = False
            if hasattr(location, 'is_online') and location.is_online:
                is_online = True
            elif location.location_name:
                online_keywords = ['online', 'virtual', 'zoom', 'meet', 'webex', 'teams', 'video call', 'video call']
                is_online = any(keyword in location.location_name.lower() for keyword in online_keywords)
            # Also check if there's no physical address
            elif not address or address.strip() == "":
                is_online = True
            
            location_info = {
                "name": location.name,
                "location_name": location.location_name,
                "address": address if not is_online else None,
                "address_line_1": location.address_line_1 if not is_online else None,
                "address_line_2": location.address_line_2 if not is_online else None,
                "city": location.city if not is_online else None,
                "phone": location.phone,
                "timezone": location.timezone,
                "is_online": is_online
            }
        except:
            pass
    
    return {
        "full_name": org["organization_name"],
        "profile_pic": org.get("logo"),
        "banner_image": None,
        "position": None,
        "company": org["organization_name"],
        "meeting_provider": "builtin",
        "durations": durations,
        "is_organization": True,
        "organization_id": org["name"],
        "service_id": service.name,
        "provider_count": len(providers),
        "providers": provider_details,
        "location": location_info  # Add location information
    }


def get_booking_configuration(organization_id=None, provider_id=None):
    """
    Get booking configuration with hierarchy: Organization > Provider > System Default
    
    Returns:
        dict: Configuration with keys: disable_past_slots_by, minimum_booking_notice, show_booked_slots
    """
    # System defaults
    config = {
        "disable_past_slots_by": "start_time",  # "start_time" or "end_time"
        "minimum_booking_notice": 0,  # minutes
        "show_booked_slots": True,
    }
    
    # Try to get provider config
    if provider_id:
        provider = frappe.get_all(
            "Provider",
            filters={"name": provider_id},
            fields=["disable_past_slots_by", "minimum_booking_notice", "show_booked_slots"],
            limit=1
        )
        if provider:
            provider = provider[0]
            # Apply provider settings
            if provider.get("disable_past_slots_by"):
                config["disable_past_slots_by"] = "start_time" if provider["disable_past_slots_by"] == "Start Time" else "end_time"
            if provider.get("minimum_booking_notice") is not None:
                config["minimum_booking_notice"] = provider["minimum_booking_notice"]
            if provider.get("show_booked_slots") is not None:
                config["show_booked_slots"] = bool(provider["show_booked_slots"])
    
    # Try to get organization config (overrides provider)
    if organization_id:
        org = frappe.get_all(
            "Organization",
            filters={"name": organization_id},
            fields=["override_provider_booking_settings", "disable_past_slots_by", "minimum_booking_notice", "show_booked_slots"],
            limit=1
        )
        if org and org[0].get("override_provider_booking_settings"):
            org = org[0]
            # Organization overrides all
            if org.get("disable_past_slots_by"):
                config["disable_past_slots_by"] = "start_time" if org["disable_past_slots_by"] == "Start Time" else "end_time"
            if org.get("minimum_booking_notice") is not None:
                config["minimum_booking_notice"] = org["minimum_booking_notice"]
            if org.get("show_booked_slots") is not None:
                config["show_booked_slots"] = bool(org["show_booked_slots"])
    
    return config


def mark_booked_slots(slots, debug_messages=None):
    """
    Mark slots that already have confirmed events as booked
    
    Instead of filtering out booked slots, we mark them with booked=True
    so the UI can show them as disabled (better UX - users see full schedule)
    
    Args:
        slots: List of slot dictionaries with start_time, end_time, provider_id (optional)
        debug_messages: Optional list to append debug info
    
    Returns:
        List of all slots with booked flag set appropriately
    """
    if debug_messages is None:
        debug_messages = []
    
    if not slots:
        return []
    
    marked_slots = []
    booked_count = 0
    
    if debug_messages is not None:
        debug_messages.append(f"[MARK-START] Checking {len(slots)} slots for existing bookings")
    
    # Determine system timezone once so we can normalize comparisons
    system_timezone = frappe.db.get_single_value("System Settings", "time_zone") or "UTC"
    try:
        site_tz = pytz.timezone(system_timezone)
    except pytz.UnknownTimeZoneError:
        site_tz = pytz.UTC
        if debug_messages is not None:
            debug_messages.append(f"[MARK-TZ] Unknown timezone '{system_timezone}', defaulting to UTC")

    def build_time_variants(start: str, end: str):
        """Return tuples of (start, end) timestamps to try when matching events."""
        start_dt = frappe.utils.get_datetime(start)
        end_dt = frappe.utils.get_datetime(end)
        variants = [(start_dt.replace(tzinfo=None), end_dt.replace(tzinfo=None))]

        # If slot carries tz info (UTC), also compare using site timezone naive timestamps
        if start_dt.tzinfo is not None:
            local_start = start_dt.astimezone(site_tz).replace(tzinfo=None)
            local_end = end_dt.astimezone(site_tz).replace(tzinfo=None)
            if (local_start, local_end) not in variants:
                variants.append((local_start, local_end))
        return variants

    for i, slot in enumerate(slots):
        # Check if there's an existing event at this time
        time_variants = build_time_variants(slot["start_time"], slot["end_time"])

        # Log details for 9:00 AM slot specifically
        slot_time_str = str(slot["start_time"])
        is_9am_slot = "09:00:00" in slot_time_str

        if debug_messages is not None and (i == 0 or is_9am_slot):
            debug_messages.append(f"[MARK-CHECK] Slot #{i}: {slot['start_time']} to {slot['end_time']}, Provider: {slot.get('provider_name', 'N/A')}")

        existing_events = []
        matched_variant = None
        for start_variant, end_variant in time_variants:
            event_filters = {
                "starts_on": start_variant,
                "ends_on": end_variant,
                "status": ["in", ["Open", "Confirmed"]],
            }

            existing_events = frappe.get_all(
                "Booking Event",
                filters=event_filters,
                fields=["name", "status", "starts_on", "ends_on"],
                limit=1
            )
            if existing_events:
                matched_variant = (start_variant, end_variant)
                break
        
        # Mark slot as booked if event exists
        if existing_events:
            slot["booked"] = True
            slot["available"] = False
            if debug_messages is not None:
                variant_label = "UTC" if matched_variant and matched_variant == time_variants[0] else "LOCAL"
                debug_messages.append(
                    f"[MARK-BOOKED] Slot {slot['start_time']} ({slot.get('provider_name', 'N/A')}) "
                    f"-> Event: {existing_events[0]['name']}, Status: {existing_events[0]['status']} (matched {variant_label})"
                )
            booked_count += 1
        else:
            slot["booked"] = False
            slot["available"] = True
            # Log 9:00 AM if not booked
            if debug_messages is not None and is_9am_slot:
                debug_messages.append(f"[MARK-AVAILABLE] Slot {slot['start_time']} ({slot.get('provider_name', 'N/A')}) -> No events found, marking as available")
        
        marked_slots.append(slot)
    
    if debug_messages is not None:
        debug_messages.append(f"[MARK-END] Result: {len(slots)} total, {len(slots) - booked_count} available, {booked_count} booked")
        if booked_count > 0:
            booked_list = [f"{s['start_time']} ({s.get('provider_name', 'N/A')})" for s in marked_slots if s.get("booked")]
            debug_messages.append(f"[MARK-BOOKED-LIST] All booked slots: {', '.join(booked_list)}")
    
    return marked_slots


def get_multi_provider_time_slots(org_id, service_id, duration_id, date, user_timezone_offset):
    """
    Get time slots from multiple providers with round-robin assignment
    """
    # Always collect debug messages for troubleshooting
    debug_messages = []
    debug_messages.append(f"[MULTI-START] org_id={org_id}, service_id={service_id}, duration_id={duration_id}, date={date}")
    
    # Get service and providers
    service = frappe.get_doc("Service", service_id)
    debug_messages.append(f"[MULTI] Service found: {service.name}, service_name={service.service_name}")
    
    providers = get_service_providers(service.name)
    debug_messages.append(f"[MULTI] Found {len(providers) if providers else 0} providers for service")
    
    if not providers:
        debug_messages.append("[MULTI-ERROR] No providers found!")
        return {
            "all_available_slots_for_data": [],
            "date": date,
            "duration": None,
            "starttime": None,
            "endtime": None,
            "total_slots_for_day": 0,
            "available_days": [],
            "is_organization": True,
            "provider_count": 0,
            "debug_messages": debug_messages
        }
    
    # Get duration details
    duration = frappe.get_doc("Appointment Slot Duration", duration_id)
    debug_messages.append(f"[MULTI] Duration: {duration.duration} minutes")
    
    # Collect slots from all providers
    all_provider_slots = {}
    
    for idx, provider in enumerate(providers):
        debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] Processing provider: {provider['name']} (user={provider['user']})")
        
        # Get User Appointment Availability for this provider
        user_availability = frappe.get_all(
            "User Appointment Availability",
            filters={"user": provider["user"], "enable_scheduling": 1},
            fields=["*"],
            limit=1
        )
        
        if not user_availability:
            debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] No User Appointment Availability found")
            continue
        
        user_availability = user_availability[0]
        debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] User Availability found: {user_availability.name}")
        
        # Get slots for this provider
        appointment_group_obj = create_dummy_appointment_group(duration, user_availability)
        appointment_group = frappe.get_doc(appointment_group_obj)
        debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] Appointment group created with {len(appointment_group.members)} members")
        
        # Get slots for this date
        debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] Calling _get_time_slots_for_day...")
        slots_data = _get_time_slots_for_day(
            appointment_group, date, user_timezone_offset, debug_messages=debug_messages
        )
        debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] _get_time_slots_for_day returned: type={type(slots_data)}, keys={list(slots_data.keys()) if isinstance(slots_data, dict) else 'N/A'}")
        
        # Check if slots_data is valid (is a dict and has no error)
        # _get_time_slots_for_day returns a FLAT dict with all_available_slots_for_data at the top level
        if slots_data and isinstance(slots_data, dict) and not slots_data.get("error"):
            debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] slots_data is valid dict without error")
            
            # Extract slots directly from slots_data (NOT nested under "today")
            provider_slots = slots_data.get("all_available_slots_for_data", [])
            debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] Extracted {len(provider_slots)} slots from slots_data")
            
            if len(provider_slots) > 0:
                debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] First 3 slots: {provider_slots[:3]}")
                all_provider_slots[provider["name"]] = {
                    "provider": provider,
                    "slots": provider_slots,
                    "data": slots_data  # Use slots_data which has all the data
                }
                debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] Added to all_provider_slots")
            else:
                debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] No slots to add (empty list)")
        else:
            error_msg = slots_data.get("error") if isinstance(slots_data, dict) else "Invalid slots_data format"
            debug_messages.append(f"[MULTI-PROVIDER-{idx+1}] Failed: {error_msg}")
    
    # Merge slots with round-robin assignment
    debug_messages.append(f"[MULTI-MERGE] Starting merge with {len(all_provider_slots)} providers that have slots")
    debug_messages.append(f"[MULTI-MERGE] Provider names with slots: {list(all_provider_slots.keys())}")
    
    merged_slots = merge_slots_round_robin(all_provider_slots, service.name)
    debug_messages.append(f"[MULTI-MERGE] Merge completed, result has {len(merged_slots)} slots")
    
    # Mark booked slots (don't filter them out - show as disabled in UI)
    marked_slots = mark_booked_slots(merged_slots, debug_messages)
    available_count = len([s for s in marked_slots if not s.get("booked", False)])
    booked_count = len([s for s in marked_slots if s.get("booked", False)])
    debug_messages.append(f"[MULTI-MERGE] After marking: {available_count} available, {booked_count} booked (total: {len(marked_slots)})")
    
    if len(marked_slots) > 0:
        debug_messages.append(f"[MULTI-MERGE] First 3 slots: {marked_slots[:3]}")
    
    # Get common data from first provider
    first_data = None
    for prov_data in all_provider_slots.values():
        first_data = prov_data["data"]
        debug_messages.append(f"[MULTI-MERGE] Using first_data from provider, keys: {list(first_data.keys())}")
        break
    
    if not first_data:
        debug_messages.append("[MULTI-MERGE] No first_data found, using defaults")
        first_data = {
            "duration": duration.duration,
            "available_days": [],
            "is_invalid_date": False
        }
    
    # Get booking configuration (Organization settings override Provider settings)
    booking_config = get_booking_configuration(organization_id=org_id)
    debug_messages.append(f"[MULTI-CONFIG] Booking configuration: {booking_config}")
    
    result = {
        "all_available_slots_for_data": marked_slots,
        "date": date,
        "duration": first_data.get("duration"),
        "starttime": marked_slots[0]["start_time"] if marked_slots else None,
        "endtime": marked_slots[-1]["end_time"] if marked_slots else None,
        "total_slots_for_day": len(marked_slots),
        "available_slots_count": available_count,  # Number of bookable slots
        "booked_slots_count": booked_count,  # Number of booked slots
        "available_days": first_data.get("available_days", []),
        "is_organization": True,
        "provider_count": len(providers),
        "user": org_id,  # Use org_id as user for frontend compatibility
        "label": duration.title,
        "rescheduling_allowed": bool(duration.allow_rescheduling),
        "is_invalid_date": first_data.get("is_invalid_date", False),
        "booking_config": booking_config,  # Configuration for frontend
        "debug_messages": debug_messages
    }
    
    debug_messages.append(f"[MULTI-END] Final result: {len(marked_slots)} total slots ({available_count} available, {booked_count} booked), is_invalid_date={result['is_invalid_date']}")
    
    return result


def merge_slots_round_robin(all_provider_slots, service_name):
    """
    Merge slots from multiple providers using round-robin assignment
    
    Returns list of slots with assigned provider:
    [
        {
            "start_time": "2025-11-17 09:00:00+00:00",
            "end_time": "2025-11-17 09:30:00+00:00",
            "provider_id": "PRV-001",
            "provider_name": "Dr. Sarah"
        },
        ...
    ]
    """
    frappe.logger().info(f"[MERGE] merge_slots_round_robin called with {len(all_provider_slots)} providers")
    
    if not all_provider_slots:
        frappe.logger().info("[MERGE] No provider slots to merge, returning empty list")
        return []
    
    # Get last assigned provider for round-robin
    last_assigned = get_last_assigned_provider(service_name)
    
    # Create time slot buckets: {time_key: [provider1, provider2, ...]}
    time_slot_map = {}
    
    # Collect all unique time slots
    for provider_name, data in all_provider_slots.items():
        provider = data["provider"]
        slots = data["slots"]
        frappe.logger().info(f"[MERGE] Provider {provider_name} has {len(slots)} slots")
        
        for slot in slots:
            time_key = f"{slot['start_time']}_{slot['end_time']}"
            if time_key not in time_slot_map:
                time_slot_map[time_key] = []
            time_slot_map[time_key].append(provider)
    
    frappe.logger().info(f"[MERGE] Created time_slot_map with {len(time_slot_map)} unique time slots")
    
    # Sort time slots chronologically
    sorted_time_keys = sorted(time_slot_map.keys())
    frappe.logger().info(f"[MERGE] Sorted {len(sorted_time_keys)} time keys")
    
    # Get providers list for round-robin
    providers_list = list(all_provider_slots.keys())
    frappe.logger().info(f"[MERGE] Providers list for round-robin: {providers_list}")
    
    # Find starting index for round-robin
    current_provider_index = 0
    if last_assigned and last_assigned in providers_list:
        current_provider_index = (providers_list.index(last_assigned) + 1) % len(providers_list)
    frappe.logger().info(f"[MERGE] Starting round-robin from index {current_provider_index}")
    
    # Assign providers to slots using round-robin
    merged_slots = []
    
    for time_key in sorted_time_keys:
        available_providers = time_slot_map[time_key]
        
        # Find next available provider using round-robin
        assigned = False
        for i in range(len(providers_list)):
            provider_index = (current_provider_index + i) % len(providers_list)
            provider_name = providers_list[provider_index]
            
            # Check if this provider is available for this slot
            if any(p["name"] == provider_name for p in available_providers):
                provider = next(p for p in available_providers if p["name"] == provider_name)
                
                start_time, end_time = time_key.split("_")
                merged_slots.append({
                    "start_time": start_time,
                    "end_time": end_time,
                    "provider_id": provider["name"],
                    "provider_name": provider["provider_name"]
                })
                
                # Move to next provider for next slot (true round-robin)
                current_provider_index = (provider_index + 1) % len(providers_list)
                assigned = True
                break
        
        # If no provider available (shouldn't happen), skip slot
        if not assigned:
            continue
    
    # Update last assigned provider for this service
    if merged_slots and providers_list:
        # Store the provider that was assigned to the last slot
        last_slot_provider = merged_slots[-1]["provider_id"]
        update_last_assigned_provider(service_name, last_slot_provider)
        frappe.logger().info(f"[MERGE] Assigned last provider: {last_slot_provider}")
    
    frappe.logger().info(f"[MERGE] Final merged_slots count: {len(merged_slots)}")
    if merged_slots:
        frappe.logger().info(f"[MERGE] First merged slot: {merged_slots[0]}")
        frappe.logger().info(f"[MERGE] Last merged slot: {merged_slots[-1]}")
    
    return merged_slots
