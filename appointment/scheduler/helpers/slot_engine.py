# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

"""
Slot Engine for conflict detection, buffer time enforcement, and slot filtering.
"""

import frappe
from frappe import _
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import pytz
from appointment.scheduler.availability import get_availability_for_booking


def check_conflicts(
    provider_name: str,
    location_name: str,
    start_time: datetime,
    end_time: datetime,
    exclude_appointment: Optional[str] = None
) -> List[Dict]:
    """
    Check for conflicting appointments.
    
    Args:
        provider_name: Provider name
        location_name: Location name
        start_time: Proposed start time
        end_time: Proposed end time
        exclude_appointment: Appointment name to exclude from conflict check (for rescheduling)
    
    Returns:
        List of conflicting appointments:
        [
            {
                "appointment_name": "APT-00001",
                "start_time": "2025-01-20 14:00:00",
                "end_time": "2025-01-20 15:00:00",
                "client_name": "John Doe"
            },
            ...
        ]
    """
    # Get system timezone
    system_timezone = frappe.db.get_single_value("System Settings", "time_zone") or "Africa/Addis_Ababa"
    try:
        tz = pytz.timezone(system_timezone)
    except pytz.UnknownTimeZoneError:
        tz = pytz.timezone("Africa/Addis_Ababa")
    
    # Ensure timezone-aware datetimes
    if isinstance(start_time, str):
        start_time = frappe.utils.get_datetime(start_time)
    if isinstance(end_time, str):
        end_time = frappe.utils.get_datetime(end_time)
    
    if start_time.tzinfo is None:
        start_time = tz.localize(start_time)
    if end_time.tzinfo is None:
        end_time = tz.localize(end_time)
    
    # Convert to naive datetime for database query (Frappe stores as naive)
    start_time_naive = start_time.replace(tzinfo=None)
    end_time_naive = end_time.replace(tzinfo=None)
    
    # Get conflicting appointments
    # Check both Appointment and Booking Event doctypes
    conflicts = []
    
    # Check Appointment doctype
    appointment_filters = {
        "provider": provider_name,
        "location": location_name,
        "status": ["in", ["Pending", "Confirmed"]]
    }
    
    if exclude_appointment:
        appointment_filters["name"] = ["!=", exclude_appointment]
    
    appointments = frappe.get_all(
        "Appointment",
        filters=appointment_filters,
        fields=["name", "appointment_id", "appointment_date", "start_time", "end_time", "client_name", "status"]
    )
    
    for apt in appointments:
        apt_date = frappe.utils.get_datetime(f"{apt.appointment_date} {apt.start_time}")
        apt_end = frappe.utils.get_datetime(f"{apt.appointment_date} {apt.end_time}")
        
        # Check for overlap
        if _times_overlap(start_time_naive, end_time_naive, apt_date, apt_end):
            conflicts.append({
                "appointment_name": apt.name,
                "appointment_id": apt.appointment_id,
                "start_time": apt_date.strftime("%Y-%m-%d %H:%M:%S"),
                "end_time": apt_end.strftime("%Y-%m-%d %H:%M:%S"),
                "client_name": apt.client_name,
                "status": apt.status
            })
    
    # Check Booking Event doctype (for calendar-based bookings)
    # Get provider's user
    provider_user = frappe.db.get_value("Provider", provider_name, "user")
    if provider_user:
        # Get events for this provider
        event_filters = {
            "status": ["in", ["Open", "Confirmed"]],
            "starts_on": ["<", end_time_naive],
            "ends_on": [">", start_time_naive]
        }
        
        # Get events linked to this provider via User Appointment Availability
        user_availability = frappe.get_all(
            "User Appointment Availability",
            filters={"user": provider_user, "enable_scheduling": 1},
            fields=["name"],
            limit=1
        )
        
        if user_availability:
            ua_name = user_availability[0].name
            # Get events linked to this User Appointment Availability
            events = frappe.get_all(
                "Booking Event",
                filters=event_filters,
                fields=["name", "starts_on", "ends_on", "subject", "status"]
            )
            
            # Filter events that are linked to this provider
            for event in events:
                # Check if event is linked to this provider's User Appointment Availability
                event_doc = frappe.get_doc("Booking Event", event.name)
                if hasattr(event_doc, "custom_user_calendar") and event_doc.custom_user_calendar == ua_name:
                    if _times_overlap(start_time_naive, end_time_naive, event.starts_on, event.ends_on):
                        conflicts.append({
                            "appointment_name": event.name,
                            "appointment_id": event.name,
                            "start_time": event.starts_on.strftime("%Y-%m-%d %H:%M:%S") if event.starts_on else None,
                            "end_time": event.ends_on.strftime("%Y-%m-%d %H:%M:%S") if event.ends_on else None,
                            "client_name": event.subject or "Calendar Event",
                            "status": event.status
                        })
    
    return conflicts


def _times_overlap(start1: datetime, end1: datetime, start2: datetime, end2: datetime) -> bool:
    """Check if two time ranges overlap."""
    if not start1 or not end1 or not start2 or not end2:
        return False
    
    # Convert to datetime if needed
    if isinstance(start1, str):
        start1 = frappe.utils.get_datetime(start1)
    if isinstance(end1, str):
        end1 = frappe.utils.get_datetime(end1)
    if isinstance(start2, str):
        start2 = frappe.utils.get_datetime(start2)
    if isinstance(end2, str):
        end2 = frappe.utils.get_datetime(end2)
    
    # Remove timezone for comparison
    if start1.tzinfo:
        start1 = start1.replace(tzinfo=None)
    if end1.tzinfo:
        end1 = end1.replace(tzinfo=None)
    if start2.tzinfo:
        start2 = start2.replace(tzinfo=None)
    if end2.tzinfo:
        end2 = end2.replace(tzinfo=None)
    
    # Check overlap: start1 < end2 AND start2 < end1
    return start1 < end2 and start2 < end1


def apply_buffer_times(
    slots: List[Dict],
    buffer_before: int,
    buffer_after: int,
    existing_appointments: List[Dict]
) -> List[Dict]:
    """
    Apply buffer times to slots, removing slots that violate buffer rules.
    
    Args:
        slots: List of available slots
        buffer_before: Minutes to block before each appointment
        buffer_after: Minutes to block after each appointment
        existing_appointments: List of existing appointments
    
    Returns:
        Filtered list of slots with buffers applied
    """
    if not slots or not existing_appointments:
        return slots
    
    if buffer_before == 0 and buffer_after == 0:
        return slots
    
    filtered_slots = []
    
    for slot in slots:
        slot_start = frappe.utils.get_datetime(slot.get("start_time"))
        slot_end = frappe.utils.get_datetime(slot.get("end_time"))
        
        if slot_start.tzinfo:
            slot_start = slot_start.replace(tzinfo=None)
        if slot_end.tzinfo:
            slot_end = slot_end.replace(tzinfo=None)
        
        is_valid = True
        
        for apt in existing_appointments:
            apt_start = frappe.utils.get_datetime(apt.get("start_time"))
            apt_end = frappe.utils.get_datetime(apt.get("end_time"))
            
            if apt_start.tzinfo:
                apt_start = apt_start.replace(tzinfo=None)
            if apt_end.tzinfo:
                apt_end = apt_end.replace(tzinfo=None)
            
            # Check if slot violates buffer_before
            if buffer_before > 0:
                buffer_start = apt_start - timedelta(minutes=buffer_before)
                if slot_start < apt_start and slot_end > buffer_start:
                    is_valid = False
                    break
            
            # Check if slot violates buffer_after
            if buffer_after > 0:
                buffer_end = apt_end + timedelta(minutes=buffer_after)
                if slot_start < buffer_end and slot_end > apt_end:
                    is_valid = False
                    break
        
        if is_valid:
            filtered_slots.append(slot)
    
    return filtered_slots


def filter_by_working_hours(
    slots: List[Dict],
    location_name: str,
    service_name: Optional[str] = None,
    provider_name: Optional[str] = None
) -> List[Dict]:
    """
    Filter slots to only include times within working hours.
    
    Uses availability.py functions to get working hours.
    """
    if not slots:
        return []
    
    # Get availability for this combination
    availability = get_availability_for_booking(location_name, service_name, provider_name)
    
    if not availability:
        return []
    
    # Group availability by day of week
    availability_by_day = {}
    for avail in availability:
        day = avail.get("day_of_week")
        if day not in availability_by_day:
            availability_by_day[day] = []
        availability_by_day[day].append(avail)
    
    filtered_slots = []
    
    for slot in slots:
        slot_start = frappe.utils.get_datetime(slot.get("start_time"))
        slot_end = frappe.utils.get_datetime(slot.get("end_time"))
        
        # Get day of week
        day_name = slot_start.strftime("%A")
        
        # Check if this day has availability
        if day_name not in availability_by_day:
            continue
        
        # Check if slot time is within any availability range for this day
        slot_time = slot_start.time()
        slot_end_time = slot_end.time()
        
        is_valid = False
        for avail in availability_by_day[day_name]:
            if not avail.get("is_open"):
                continue
            
            avail_start = _parse_time(avail.get("start_time"))
            avail_end = _parse_time(avail.get("end_time"))
            
            # Check if slot is completely within availability range
            if slot_time >= avail_start and slot_end_time <= avail_end:
                is_valid = True
                break
        
        if is_valid:
            filtered_slots.append(slot)
    
    return filtered_slots


def _parse_time(time_str: str):
    """Parse time string to time object."""
    from datetime import time as time_class
    if isinstance(time_str, str):
        parts = time_str.split(":")
        hours = int(parts[0])
        minutes = int(parts[1]) if len(parts) > 1 else 0
        seconds = int(parts[2]) if len(parts) > 2 else 0
        return time_class(hours, minutes, seconds)
    return time_str


def filter_by_time_off(slots: List[Dict], provider_name: str) -> List[Dict]:
    """
    Filter out slots during provider's time-off periods.
    
    Check Provider doctype for time-off records (if they exist) or User Appointment Availability.
    """
    if not slots:
        return []
    
    # Get provider's user
    provider_user = frappe.db.get_value("Provider", provider_name, "user")
    if not provider_user:
        return slots
    
    # Check User Appointment Availability for time-off periods
    # This would need to be implemented based on how time-off is stored
    # For now, we'll check if there's a time-off field or child table
    
    # Get User Appointment Availability
    user_availability = frappe.get_all(
        "User Appointment Availability",
        filters={"user": provider_user, "enable_scheduling": 1},
        fields=["name"],
        limit=1
    )
    
    if not user_availability:
        return slots
    
    # For now, return all slots (time-off filtering can be enhanced later)
    # This would require checking against a time-off doctype or field
    # that stores provider's unavailable periods
    
    return slots

