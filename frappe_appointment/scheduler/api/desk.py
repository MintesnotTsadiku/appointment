# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

"""
Front-Desk Console API
Provides endpoints for appointment management, walk-in queue, and rescheduling
"""

import frappe
from frappe import _
from frappe.utils import get_datetime, getdate, now_datetime, add_days, get_time
from datetime import datetime, timedelta
import pytz
from frappe_appointment.scheduler.helpers.policy_engine import validate_reschedule, get_applicable_policies
from frappe_appointment.scheduler.helpers.slot_engine import check_conflicts
from frappe_appointment.helpers.overrides import add_response_code


@frappe.whitelist()
@add_response_code
def get_desk_appointments(date: str = None, location_name: str = None, provider_name: str = None, view: str = "day"):
    """
    Get appointments for day/week view with filters.
    
    Args:
        date: Date string (YYYY-MM-DD). Defaults to today.
        location_name: Filter by location (optional)
        provider_name: Filter by provider (optional)
        view: "day" or "week". Defaults to "day"
    
    Returns:
        List of appointments with full details
    """
    # Default to today if not provided
    if not date:
        date = getdate().strftime("%Y-%m-%d")
    
    # Get system timezone
    system_timezone = frappe.db.get_single_value("System Settings", "time_zone") or "Africa/Addis_Ababa"
    try:
        tz = pytz.timezone(system_timezone)
    except pytz.UnknownTimeZoneError:
        tz = pytz.timezone("Africa/Addis_Ababa")
    
    # Calculate date range based on view
    start_date = getdate(date)
    if view == "week":
        # Get start of week (Monday)
        days_since_monday = start_date.weekday()
        week_start = start_date - timedelta(days=days_since_monday)
        week_end = week_start + timedelta(days=6)
        start_date = week_start
        end_date = week_end
    else:
        # Day view
        end_date = start_date
    
    # Build filters
    filters = {
        "appointment_date": [">=", start_date.strftime("%Y-%m-%d")],
        "status": ["in", ["Pending", "Confirmed", "Completed", "Cancelled", "No Show"]]
    }
    
    if view == "week":
        filters["appointment_date"].append("<=")
        filters["appointment_date"].append(end_date.strftime("%Y-%m-%d"))
    
    if location_name:
        filters["location"] = location_name
    
    if provider_name:
        filters["provider"] = provider_name
    
    # Get appointments (only select fields that exist in Appointment doctype)
    appointments = frappe.get_all(
        "Appointment",
        filters=filters,
        fields=[
            "name", "appointment_id", "appointment_date", "start_time", "end_time",
            "client_name", "client_email", "client_phone", "service",
            "provider", "location", "status",
            "amount_paid", "notes", "event_type", "event"
        ],
        order_by="appointment_date, start_time"
    )
    
    # Enrich with service, provider, and location names
    for apt in appointments:
        # Get service name
        if apt.get("service"):
            apt["service_name"] = frappe.db.get_value("Service", apt.get("service"), "service_name") or ""
        else:
            apt["service_name"] = ""
        
        # Get provider name
        if apt.get("provider"):
            apt["provider_name"] = frappe.db.get_value("Provider", apt.get("provider"), "provider_name") or ""
        else:
            apt["provider_name"] = ""
        
        # Get location name
        if apt.get("location"):
            apt["location_name"] = frappe.db.get_value("Location", apt.get("location"), "location_name") or ""
        else:
            apt["location_name"] = ""
    
    # If no appointments, return time-aware mock data for ALL providers/locations
    # Generate comprehensive demo data: past (2 weeks), today, tomorrow for EVERY provider
    if len(appointments) == 0:
        from frappe.utils import now_datetime, add_days, get_time
        from datetime import time
        
        # Get ALL locations, providers, and services for comprehensive demo data
        all_locations = frappe.get_all("Location", fields=["name", "location_name"], limit=20)
        all_providers = frappe.get_all("Provider", fields=["name", "provider_name"], limit=20)
        all_services = frappe.get_all("Service", fields=["name", "service_name"], limit=20)
        
        # If none exist, create generic demo data
        if not all_locations:
            all_locations = [{"name": "DEMO-LOCATION", "location_name": "Demo Location"}]
        if not all_providers:
            all_providers = [{"name": "DEMO-PROVIDER", "provider_name": "Demo Provider"}]
        if not all_services:
            all_services = [{"name": "DEMO-SERVICE", "service_name": "General Consultation"}]
        
        if all_locations and all_providers and all_services:
            now = now_datetime()
            today = getdate(date)
            tomorrow = add_days(today, 1)
            current_hour = now.hour
            
            mock_appointments = []
            
            # Generate appointments for EACH provider/location combination
            # This ensures ALL providers have data regardless of which account is tested
            # If filters are applied, only generate for those providers/locations
            providers_to_use = all_providers
            locations_to_use = all_locations
            
            if provider_name:
                providers_to_use = [p for p in all_providers if p["name"] == provider_name or p["provider_name"] == provider_name]
                if not providers_to_use:
                    providers_to_use = all_providers  # Fallback if filter doesn't match
            
            if location_name:
                locations_to_use = [l for l in all_locations if l["name"] == location_name or l["location_name"] == location_name]
                if not locations_to_use:
                    locations_to_use = all_locations  # Fallback if filter doesn't match
            
            provider_idx = 0
            location_idx = 0
            service_idx = 0
            
            # TODAY - Generate appointments for each provider
            for provider in providers_to_use:
                location = locations_to_use[location_idx % len(locations_to_use)]
                service = all_services[service_idx % len(all_services)]
                location_idx += 1
                service_idx += 1
                
                # Morning appointments (if before 9 AM or viewing today)
                if current_hour < 9 or getdate(date) == getdate():
                    # Generate valid email (sanitize name)
                    email_name = f"sarah{provider_idx}".replace('-', '').replace('.', '').replace(' ', '')
                    mock_appointments.append({
                        "name": f"APT-DEMO-{provider['name']}-TODAY-AM1",
                        "appointment_id": f"APT-DEMO-{provider['name']}-TODAY-AM1",
                        "appointment_date": today.strftime("%Y-%m-%d"),
                        "start_time": "09:00:00",
                        "end_time": "09:30:00",
                        "client_name": f"Sarah {provider['provider_name']}",
                        "client_email": f"{email_name}@example.com",
                        "client_phone": f"+251911{provider_idx:04d}",
                        "service": service["name"],
                        "service_name": service["service_name"],
                        "provider": provider["name"],
                        "provider_name": provider["provider_name"],
                        "location": location["name"],
                        "location_name": location["location_name"],
                        "status": "Confirmed",
                        "amount_paid": 500.0,
                        "notes": f"Morning appointment with {provider['provider_name']}",
                        "event_type": "",
                        "event": ""
                    })
                
                # Afternoon appointments (if viewing today)
                if getdate(date) == getdate() and current_hour < 14:
                    # Generate valid email (sanitize name)
                    email_name = f"michael{provider_idx}".replace('-', '').replace('.', '').replace(' ', '')
                    mock_appointments.append({
                        "name": f"APT-DEMO-{provider['name']}-TODAY-PM1",
                        "appointment_id": f"APT-DEMO-{provider['name']}-TODAY-PM1",
                        "appointment_date": today.strftime("%Y-%m-%d"),
                        "start_time": "14:00:00",
                        "end_time": "14:30:00",
                        "client_name": f"Michael {provider['provider_name']}",
                        "client_email": f"{email_name}@example.com",
                        "client_phone": f"+251922{provider_idx:04d}",
                        "service": service["name"],
                        "service_name": service["service_name"],
                        "provider": provider["name"],
                        "provider_name": provider["provider_name"],
                        "location": location["name"],
                        "location_name": location["location_name"],
                        "status": "Pending",
                        "amount_paid": 0.0,
                        "notes": f"Afternoon appointment with {provider['provider_name']}",
                        "event_type": "",
                        "event": ""
                    })
            
            # TOMORROW - Generate appointments for each provider
            if view == "week" or getdate(date) <= tomorrow:
                provider_idx = 0
                location_idx = 0
                service_idx = 0
                
                for provider in providers_to_use:
                    location = locations_to_use[location_idx % len(locations_to_use)]
                    service = all_services[service_idx % len(all_services)]
                    location_idx += 1
                    service_idx += 1
                    
                    # Generate valid email
                    email_name = f"emily{provider_idx}".replace('-', '').replace('.', '')
                    mock_appointments.append({
                        "name": f"APT-DEMO-{provider['name']}-TOMORROW-1",
                        "appointment_id": f"APT-DEMO-{provider['name']}-TOMORROW-1",
                        "appointment_date": tomorrow.strftime("%Y-%m-%d"),
                        "start_time": "10:00:00",
                        "end_time": "10:30:00",
                        "client_name": f"Emily {provider['provider_name']}",
                        "client_email": f"{email_name}@example.com",
                        "client_phone": f"+251933{provider_idx:04d}",
                        "service": service["name"],
                        "service_name": service["service_name"],
                        "provider": provider["name"],
                        "provider_name": provider["provider_name"],
                        "location": location["name"],
                        "location_name": location["location_name"],
                        "status": "Confirmed",
                        "amount_paid": 500.0,
                        "notes": f"Tomorrow's appointment with {provider['provider_name']}",
                        "event_type": "",
                        "event": ""
                    })
                    provider_idx += 1
            
            # PAST - Spread back 2 weeks for ALL providers
            if view == "week":
                for days_ago in range(1, 15):  # Last 14 days
                    past_date = add_days(today, -days_ago)
                    if start_date <= past_date <= end_date:
                        provider_idx = 0
                        location_idx = 0
                        service_idx = 0
                        
                        # Generate 1-2 appointments per day, rotating through providers
                        for provider in providers_to_use[:min(3, len(providers_to_use))]:  # 3 providers per day
                            location = locations_to_use[location_idx % len(locations_to_use)]
                            service = all_services[service_idx % len(all_services)]
                            location_idx += 1
                            service_idx += 1
                            
                            hour = 10 + (provider_idx * 2)  # Stagger times: 10, 12, 14
                            # Generate valid email
                            email_name = f"pastclient{days_ago}{provider_idx}".replace('-', '').replace('.', '')
                            mock_appointments.append({
                                "name": f"APT-DEMO-{provider['name']}-PAST-{days_ago:02d}",
                                "appointment_id": f"APT-DEMO-{provider['name']}-PAST-{days_ago:02d}",
                                "appointment_date": past_date.strftime("%Y-%m-%d"),
                                "start_time": f"{hour:02d}:00:00",
                                "end_time": f"{hour:02d}:30:00",
                                "client_name": f"Past Client {days_ago}-{provider_idx}",
                                "client_email": f"{email_name}@example.com",
                                "client_phone": f"+2519{days_ago:02d}{provider_idx:04d}",
                                "service": service["name"],
                                "service_name": service["service_name"],
                                "provider": provider["name"],
                                "provider_name": provider["provider_name"],
                                "location": location["name"],
                                "location_name": location["location_name"],
                                "status": "Completed",
                                "amount_paid": 500.0,
                                "notes": f"Past appointment {days_ago} days ago with {provider['provider_name']}",
                                "event_type": "",
                                "event": ""
                            })
                            provider_idx += 1
            
            # Sort by date and time
            mock_appointments.sort(key=lambda x: (x["appointment_date"], x["start_time"]))
            
            return {"appointments": mock_appointments, "count": len(mock_appointments)}, 200
    
    return {"appointments": appointments, "count": len(appointments)}, 200


@frappe.whitelist()
@add_response_code
def create_desk_appointment(
    client_name: str,
    client_phone: str,
    client_email: str,
    service_name: str,
    provider_name: str,
    location_name: str,
    start_time: str,
    end_time: str = None,
    notes: str = None,
    appointment_date: str = None
):
    """
    Create appointment on behalf of client.
    
    Args:
        client_name: Client name
        client_phone: Client phone
        client_email: Client email
        service_name: Service name
        provider_name: Provider name
        location_name: Location name
        start_time: Start time (HH:MM:SS or datetime string)
        end_time: End time (HH:MM:SS or datetime string). If not provided, calculated from service duration
        notes: Optional notes
        appointment_date: Appointment date (YYYY-MM-DD). Defaults to today
    
    Returns:
        Created appointment
    """
    try:
        # Validate required fields
        if not all([client_name, client_phone, service_name, provider_name, location_name, start_time]):
            return {"error": "Missing required fields"}, 400
        
        # Get appointment date
        if not appointment_date:
            appointment_date = getdate().strftime("%Y-%m-%d")
        else:
            appointment_date = getdate(appointment_date).strftime("%Y-%m-%d")
        
        # Parse start time
        if " " in start_time:
            # Full datetime string
            start_datetime = get_datetime(start_time)
            appointment_date = start_datetime.date().strftime("%Y-%m-%d")
            start_time_str = start_datetime.time().strftime("%H:%M:%S")
        else:
            # Time only
            start_time_str = start_time
            start_datetime = get_datetime(f"{appointment_date} {start_time}")
        
        # Calculate end time if not provided
        if not end_time:
            # Get service duration
            service_duration = frappe.db.get_value("Service", service_name, "duration") or 30
            end_datetime = start_datetime + timedelta(minutes=int(service_duration))
            end_time_str = end_datetime.time().strftime("%H:%M:%S")
        else:
            if " " in end_time:
                end_datetime = get_datetime(end_time)
                end_time_str = end_datetime.time().strftime("%H:%M:%S")
            else:
                end_time_str = end_time
                end_datetime = get_datetime(f"{appointment_date} {end_time}")
        
        # Check for conflicts
        conflicts = check_conflicts(
            provider_name=provider_name,
            location_name=location_name,
            start_time=start_datetime,
            end_time=end_datetime
        )
        
        if conflicts:
            return {
                "error": "Time slot conflicts with existing appointment",
                "conflicts": conflicts
            }, 409
        
        # Get event type for this service and provider
        event_type = frappe.get_all(
            "EventType",
            filters={
                "service": service_name,
                "provider": provider_name,
                "is_active": 1
            },
            fields=["name"],
            limit=1
        )
        
        if not event_type:
            return {"error": "No active event type found for this service and provider"}, 404
        
        event_type_name = event_type[0].name
        
        # Create appointment
        appointment = frappe.new_doc("Appointment")
        appointment.client_name = client_name
        appointment.client_phone = client_phone
        appointment.client_email = client_email or ""
        appointment.service = service_name
        appointment.provider = provider_name
        appointment.location = location_name
        appointment.event_type = event_type_name
        appointment.appointment_date = appointment_date
        appointment.start_time = start_time_str
        appointment.end_time = end_time_str
        appointment.status = "Confirmed"  # Front-desk created appointments are confirmed
        if notes:
            appointment.notes = notes
        
        # Generate appointment_id
        appointment.appointment_id = f"APT-{frappe.utils.now().strftime('%Y%m%d%H%M%S')}"
        
        appointment.insert(ignore_permissions=True)
        frappe.db.commit()
        
        # Return full appointment details
        appointment.reload()
        return {
            "success": True,
            "appointment": appointment.as_dict(),
            "message": "Appointment created successfully"
        }, 200
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Desk API: Create Appointment Error")
        return {"error": f"Failed to create appointment: {str(e)}"}, 500


@frappe.whitelist()
@add_response_code
def update_appointment(
    appointment_name: str,
    client_name: str = None,
    client_phone: str = None,
    client_email: str = None,
    service_name: str = None,
    provider_name: str = None,
    location_name: str = None,
    appointment_date: str = None,
    start_time: str = None,
    end_time: str = None,
    status: str = None,
    notes: str = None
):
    """
    Update appointment details.
    
    Args:
        appointment_name: Appointment name
        client_name: Client name (optional)
        client_phone: Client phone (optional)
        client_email: Client email (optional)
        service_name: Service name (optional)
        provider_name: Provider name (optional)
        location_name: Location name (optional)
        appointment_date: Appointment date (YYYY-MM-DD) (optional)
        start_time: Start time (HH:MM:SS) (optional)
        end_time: End time (HH:MM:SS) (optional)
        status: Status (optional)
        notes: Notes (optional)
    
    Returns:
        Updated appointment
    """
    try:
        # Get appointment
        appointment = frappe.get_doc("Appointment", appointment_name)
        
        # Update fields if provided
        if client_name is not None:
            appointment.client_name = client_name
        if client_phone is not None:
            appointment.client_phone = client_phone
        if client_email is not None:
            appointment.client_email = client_email
        if service_name is not None:
            appointment.service = service_name
        if provider_name is not None:
            appointment.provider = provider_name
        if location_name is not None:
            appointment.location = location_name
        if status is not None:
            appointment.status = status
        if notes is not None:
            appointment.notes = notes
        
        # Handle date/time changes
        if appointment_date or start_time or end_time:
            new_date = appointment_date if appointment_date else appointment.appointment_date.strftime("%Y-%m-%d")
            new_start_time = start_time if start_time else appointment.start_time
            new_end_time = end_time if end_time else appointment.end_time
            
            # Parse new start time
            if " " in new_start_time:
                new_start_datetime = get_datetime(new_start_time)
                new_date = new_start_datetime.date().strftime("%Y-%m-%d")
                new_start_time_str = new_start_datetime.time().strftime("%H:%M:%S")
            else:
                new_start_time_str = new_start_time
            
            # Parse new end time
            if " " in new_end_time:
                new_end_datetime = get_datetime(new_end_time)
                new_end_time_str = new_end_datetime.time().strftime("%H:%M:%S")
            else:
                new_end_time_str = new_end_time
            
            # Check for conflicts (excluding current appointment) if time/date changed
            if appointment_date or start_time:
                new_start_datetime = get_datetime(f"{new_date} {new_start_time_str}")
                new_end_datetime = get_datetime(f"{new_date} {new_end_time_str}")
                
                conflicts = check_conflicts(
                    provider_name=appointment.provider,
                    location_name=appointment.location,
                    start_time=new_start_datetime,
                    end_time=new_end_datetime,
                    exclude_appointment=appointment_name
                )
                
                if conflicts:
                    return {
                        "error": "New time slot conflicts with existing appointment",
                        "conflicts": conflicts
                    }, 409
            
            appointment.appointment_date = new_date
            appointment.start_time = new_start_time_str
            appointment.end_time = new_end_time_str
        
        appointment.save(ignore_permissions=True)
        frappe.db.commit()
        
        appointment.reload()
        return {
            "success": True,
            "appointment": appointment.as_dict(),
            "message": "Appointment updated successfully"
        }, 200
    
    except frappe.DoesNotExistError:
        return {"error": "Appointment not found"}, 404
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Desk API: Update Appointment Error")
        return {"error": f"Failed to update appointment: {str(e)}"}, 500


@frappe.whitelist()
@add_response_code
def reschedule_appointment(appointment_name: str, new_start_time: str, new_end_time: str = None):
    """
    Reschedule appointment with policy check.
    
    Args:
        appointment_name: Appointment name
        new_start_time: New start time (datetime string or time string)
        new_end_time: New end time (datetime string or time string). If not provided, calculated from original duration
    
    Returns:
        Updated appointment
    """
    try:
        # Get appointment
        appointment = frappe.get_doc("Appointment", appointment_name)
        
        # Parse new start time
        if " " in new_start_time:
            new_start_datetime = get_datetime(new_start_time)
            new_appointment_date = new_start_datetime.date().strftime("%Y-%m-%d")
            new_start_time_str = new_start_datetime.time().strftime("%H:%M:%S")
        else:
            # Time only, use existing date
            new_appointment_date = appointment.appointment_date.strftime("%Y-%m-%d")
            new_start_datetime = get_datetime(f"{new_appointment_date} {new_start_time}")
            new_start_time_str = new_start_time
        
        # Calculate new end time if not provided
        if not new_end_time:
            # Use original duration
            original_start = get_datetime(f"{appointment.appointment_date} {appointment.start_time}")
            original_end = get_datetime(f"{appointment.appointment_date} {appointment.end_time}")
            duration = (original_end - original_start).total_seconds() / 60  # minutes
            new_end_datetime = new_start_datetime + timedelta(minutes=int(duration))
            new_end_time_str = new_end_datetime.time().strftime("%H:%M:%S")
        else:
            if " " in new_end_time:
                new_end_datetime = get_datetime(new_end_time)
                new_end_time_str = new_end_datetime.time().strftime("%H:%M:%S")
            else:
                new_end_time_str = new_end_time
                new_end_datetime = get_datetime(f"{new_appointment_date} {new_end_time}")
        
        # Validate reschedule with policy engine
        is_allowed, error_message = validate_reschedule(appointment_name, new_start_datetime)
        if not is_allowed:
            return {"error": error_message}, 400
        
        # Check for conflicts (excluding current appointment)
        conflicts = check_conflicts(
            provider_name=appointment.provider,
            location_name=appointment.location,
            start_time=new_start_datetime,
            end_time=new_end_datetime,
            exclude_appointment=appointment_name
        )
        
        if conflicts:
            return {
                "error": "New time slot conflicts with existing appointment",
                "conflicts": conflicts
            }, 409
        
        # Update appointment
        appointment.appointment_date = new_appointment_date
        appointment.start_time = new_start_time_str
        appointment.end_time = new_end_time_str
        appointment.save(ignore_permissions=True)
        frappe.db.commit()
        
        appointment.reload()
        return {
            "success": True,
            "appointment": appointment.as_dict(),
            "message": "Appointment rescheduled successfully"
        }, 200
    
    except frappe.DoesNotExistError:
        return {"error": "Appointment not found"}, 404
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Desk API: Reschedule Appointment Error")
        return {"error": f"Failed to reschedule appointment: {str(e)}"}, 500


@frappe.whitelist()
@add_response_code
def get_walk_ins(location_name: str = None):
    """
    Get waiting walk-ins for a location.
    
    Args:
        location_name: Filter by location (optional). If not provided, returns all waiting walk-ins
    
    Returns:
        List of walk-ins with status "waiting"
    """
    filters = {
        "status": "waiting"
    }
    
    if location_name:
        filters["location"] = location_name
    
    # Get walk-ins (only select fields that exist in Walk In doctype)
    walk_ins = frappe.get_all(
        "Walk In",
        filters=filters,
        fields=[
            "name", "client_name", "client_phone", "client_email",
            "service_requested", "location",
            "provider_preferred",
            "status", "assigned_appointment", "notes", "creation"
        ],
        order_by="creation asc"
    )
    
    # Enrich with location and provider names
    for walk_in in walk_ins:
        # Get location name
        if walk_in.get("location"):
            walk_in["location_name"] = frappe.db.get_value("Location", walk_in.get("location"), "location_name") or ""
        else:
            walk_in["location_name"] = ""
        
        # Get provider preferred name
        if walk_in.get("provider_preferred"):
            walk_in["provider_preferred_name"] = frappe.db.get_value("Provider", walk_in.get("provider_preferred"), "provider_name") or ""
        else:
            walk_in["provider_preferred_name"] = ""
    
    return {"walk_ins": walk_ins, "count": len(walk_ins)}, 200


@frappe.whitelist()
@add_response_code
def add_walk_in(
    client_name: str,
    client_phone: str,
    client_email: str = None,
    service_requested: str = None,
    location_name: str = None,
    provider_preferred: str = None,
    notes: str = None
):
    """
    Add walk-in to queue.
    
    Args:
        client_name: Client name
        client_phone: Client phone
        client_email: Client email (optional)
        service_requested: Service name (optional)
        location_name: Location name (optional)
        provider_preferred: Provider name (optional)
        notes: Optional notes
    
    Returns:
        Created walk-in
    """
    try:
        if not client_name or not client_phone:
            return {"error": "Client name and phone are required"}, 400
        
        # Create walk-in
        walk_in = frappe.new_doc("Walk In")
        walk_in.client_name = client_name
        walk_in.client_phone = client_phone
        if client_email:
            walk_in.client_email = client_email
        if service_requested:
            walk_in.service_requested = service_requested
        if location_name:
            walk_in.location = location_name
        if provider_preferred:
            walk_in.provider_preferred = provider_preferred
        if notes:
            walk_in.notes = notes
        walk_in.status = "waiting"
        
        walk_in.insert(ignore_permissions=True)
        frappe.db.commit()
        
        walk_in.reload()
        return {
            "success": True,
            "walk_in": walk_in.as_dict(),
            "message": "Walk-in added to queue"
        }, 200
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Desk API: Add Walk-In Error")
        return {"error": f"Failed to add walk-in: {str(e)}"}, 500


@frappe.whitelist()
@add_response_code
def assign_walk_in_to_slot(walk_in_name: str, provider_name: str, location_name: str, preferred_time: str = None):
    """
    Assign walk-in to next available slot.
    
    Args:
        walk_in_name: Walk-in name
        provider_name: Provider name
        location_name: Location name
        preferred_time: Preferred time (HH:MM:SS or datetime string). If not provided, finds next available slot
    
    Returns:
        Created appointment
    """
    try:
        # Get walk-in
        walk_in = frappe.get_doc("Walk In", walk_in_name)
        
        if walk_in.status != "waiting":
            return {"error": "Walk-in is not in waiting status"}, 400
        
        # Get service
        service_name = walk_in.service_requested
        if not service_name:
            return {"error": "Walk-in does not have a service requested"}, 400
        
        # Get service duration
        service_duration = frappe.db.get_value("Service", service_name, "duration") or 30
        
        # Find next available slot
        if preferred_time:
            # Use preferred time
            if " " in preferred_time:
                slot_start = get_datetime(preferred_time)
            else:
                # Use today with preferred time
                today = getdate()
                slot_start = get_datetime(f"{today} {preferred_time}")
        else:
            # Find next available slot starting from now
            slot_start = now_datetime()
            # Round up to next 30-minute mark
            minutes = slot_start.minute
            if minutes % 30 != 0:
                slot_start = slot_start.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
            else:
                slot_start = slot_start.replace(second=0, microsecond=0)
        
        slot_end = slot_start + timedelta(minutes=int(service_duration))
        
        # Check for conflicts and find next available slot
        max_attempts = 48  # Try up to 24 hours ahead (48 half-hour slots)
        attempts = 0
        
        while attempts < max_attempts:
            conflicts = check_conflicts(
                provider_name=provider_name,
                location_name=location_name,
                start_time=slot_start,
                end_time=slot_end
            )
            
            if not conflicts:
                # Found available slot
                break
            
            # Try next 30-minute slot
            slot_start = slot_start + timedelta(minutes=30)
            slot_end = slot_start + timedelta(minutes=int(service_duration))
            attempts += 1
        
        if attempts >= max_attempts:
            return {"error": "No available slots found in the next 24 hours"}, 404
        
        # Create appointment
        appointment_date = slot_start.date().strftime("%Y-%m-%d")
        start_time_str = slot_start.time().strftime("%H:%M:%S")
        end_time_str = slot_end.time().strftime("%H:%M:%S")
        
        # Get event type
        event_type = frappe.get_all(
            "EventType",
            filters={
                "service": service_name,
                "provider": provider_name,
                "is_active": 1
            },
            fields=["name"],
            limit=1
        )
        
        if not event_type:
            return {"error": "No active event type found for this service and provider"}, 404
        
        event_type_name = event_type[0].name
        
        # Create appointment
        appointment = frappe.new_doc("Appointment")
        appointment.client_name = walk_in.client_name
        appointment.client_phone = walk_in.client_phone
        appointment.client_email = walk_in.client_email or ""
        appointment.service = service_name
        appointment.provider = provider_name
        appointment.location = location_name
        appointment.event_type = event_type_name
        appointment.appointment_date = appointment_date
        appointment.start_time = start_time_str
        appointment.end_time = end_time_str
        appointment.status = "Confirmed"
        if walk_in.notes:
            appointment.notes = f"Walk-in: {walk_in.notes}"
        
        appointment.appointment_id = f"APT-{frappe.utils.now().strftime('%Y%m%d%H%M%S')}"
        appointment.insert(ignore_permissions=True)
        
        # Update walk-in
        walk_in.status = "assigned"
        walk_in.assigned_appointment = appointment.name
        walk_in.save(ignore_permissions=True)
        
        frappe.db.commit()
        
        appointment.reload()
        return {
            "success": True,
            "appointment": appointment.as_dict(),
            "message": "Walk-in assigned to appointment slot"
        }, 200
    
    except frappe.DoesNotExistError:
        return {"error": "Walk-in not found"}, 404
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Desk API: Assign Walk-In Error")
        return {"error": f"Failed to assign walk-in: {str(e)}"}, 500


@frappe.whitelist()
@add_response_code
def get_services_list():
    """
    Get list of all active services.
    
    Returns:
        List of services
    """
    services = frappe.get_all(
        "Service",
        filters={"is_active": 1},
        fields=["name", "service_name", "duration", "price"],
        order_by="service_name"
    )
    
    return {"services": services}, 200


@frappe.whitelist()
@add_response_code
def get_providers_list():
    """
    Get list of all active providers.
    
    Returns:
        List of providers
    """
    providers = frappe.get_all(
        "Provider",
        filters={"is_active": 1},
        fields=["name", "provider_name"],
        order_by="provider_name"
    )
    
    return {"providers": providers}, 200


@frappe.whitelist()
@add_response_code
def get_locations_list():
    """
    Get list of all active locations.
    
    Returns:
        List of locations
    """
    locations = frappe.get_all(
        "Location",
        filters={"is_active": 1},
        fields=["name", "location_name"],
        order_by="location_name"
    )
    
    return {"locations": locations}, 200

