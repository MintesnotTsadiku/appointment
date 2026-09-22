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
from appointment.scheduler.helpers.policy_engine import validate_reschedule, get_applicable_policies
from appointment.scheduler.helpers.slot_engine import check_conflicts
from appointment.helpers.overrides import add_response_code


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
    from appointment.scheduler.booking_access import require_staff
    require_staff()
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
        "appointment_date": ["between", [start_date, end_date]],
        "status": ["in", ["Pending", "Confirmed", "Completed", "Cancelled", "No Show"]]
    }

    if location_name:
        filters["location"] = location_name

    if provider_name:
        filters["provider"] = provider_name

    # Get appointments (only select fields that exist in Appointment doctype)
    appointments = frappe.get_list(
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
        apt["start_time"] = get_time(apt.start_time).strftime("%H:%M:%S")
        apt["end_time"] = get_time(apt.end_time).strftime("%H:%M:%S")
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
    from appointment.scheduler.booking_access import require_access
    org = frappe.db.get_value("Service", service_name, "organization")
    require_access(frappe._dict(organization=org, provider=provider_name))
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
                "location": location_name,
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
        appointment.appointment_id = f"APT-{now_datetime().strftime('%Y%m%d%H%M%S%f')}"

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
    from appointment.scheduler.booking_access import require_access
    require_access(frappe.get_doc("Appointment", appointment_name))
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
    from appointment.scheduler.booking_access import require_access
    require_access(frappe.get_doc("Appointment", appointment_name))
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
    walk_ins = frappe.get_list(
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
    from appointment.scheduler.booking_access import config_permission
    walk_in_doc = frappe.get_doc("Walk In", walk_in_name)
    if not config_permission(walk_in_doc, permission_type="write"):
        frappe.throw("Not permitted to assign this walk-in", frappe.PermissionError)
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
                "location": location_name,
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

        appointment.appointment_id = f"APT-{now_datetime().strftime('%Y%m%d%H%M%S%f')}"
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
    services = frappe.get_list(
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
    providers = frappe.get_list(
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
    locations = frappe.get_list(
        "Location",
        filters={"is_active": 1},
        fields=["name", "location_name"],
        order_by="location_name"
    )

    return {"locations": locations}, 200

