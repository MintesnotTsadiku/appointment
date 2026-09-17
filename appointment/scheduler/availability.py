# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

"""
Availability resolution functions for Location → Service → Provider hierarchy.

Priority order (most specific → least specific):
1. Provider.opening_hours (if defined)
2. Service.opening_hours (if defined)
3. Location.opening_hours (base/fallback)

Each level can only RESTRICT availability, not expand it.
"""

import frappe
from frappe import _
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple


def get_availability_for_booking(location_name: str, service_name: Optional[str] = None, provider_name: Optional[str] = None) -> List[Dict]:
    """
    Get intersected availability for a booking combination.
    
    Args:
        location_name: Location name (required)
        service_name: Service name (optional)
        provider_name: Provider name (optional)
    
    Returns:
        List of opening hours dicts with intersected time ranges
        Format: [{"day_of_week": "Monday", "start_time": "09:00:00", "end_time": "17:00:00", "is_open": 1}, ...]
    """
    # Start with Location availability (base)
    location = frappe.get_doc("Location", location_name)
    location_hours = _get_opening_hours_list(location.opening_hours) if location.opening_hours else []
    
    if not location_hours:
        return []
    
    # Intersect with Service hours if provided
    service_hours = None
    if service_name:
        service = frappe.get_doc("Service", service_name)
        if service.opening_hours and not service.use_default_hours:
            service_hours = _get_opening_hours_list(service.opening_hours)
        else:
            # Use Location hours if Service uses defaults
            service_hours = location_hours
    
    # Intersect with Provider hours if provided
    provider_hours = None
    if provider_name:
        provider = frappe.get_doc("Provider", provider_name)
        if provider.opening_hours and not provider.use_default_hours:
            provider_hours = _get_opening_hours_list(provider.opening_hours)
        else:
            # Use Service/Location hours if Provider uses defaults
            provider_hours = service_hours if service_hours else location_hours
    
    # Intersect all levels
    result = location_hours
    if service_hours:
        result = _intersect_time_ranges(result, service_hours)
    if provider_hours:
        result = _intersect_time_ranges(result, provider_hours)
    
    return result


def get_available_booking_options(location_name: str, service_name: Optional[str] = None) -> Dict:
    """
    Get availability options for different booking levels.
    
    Args:
        location_name: Location name
        service_name: Service name (optional)
    
    Returns:
        Dict with:
        - location_level: Location.opening_hours
        - service_level: Service.opening_hours (if service_name provided) OR Location.opening_hours
        - provider_level: List of providers with their individual availability
    """
    location = frappe.get_doc("Location", location_name)
    location_hours = _get_opening_hours_list(location.opening_hours) if location.opening_hours else []
    
    result = {
        "location_level": location_hours,
        "service_level": location_hours,
        "provider_level": []
    }
    
    # Get Service level availability
    if service_name:
        service = frappe.get_doc("Service", service_name)
        if service.opening_hours and not service.use_default_hours:
            service_hours = _get_opening_hours_list(service.opening_hours)
            result["service_level"] = _intersect_time_ranges(location_hours, service_hours)
        else:
            result["service_level"] = location_hours
    
    # Get Provider level availability
    # Get all providers offering this service at this location
    if service_name:
        event_types = frappe.get_all(
            "EventType",
            filters={"service": service_name, "location": location_name, "is_active": 1},
            fields=["provider"]
        )
        provider_names = list(set([et.provider for et in event_types if et.provider]))
    else:
        # Get all providers at this location
        providers = frappe.get_all(
            "Provider",
            filters={"locations.location": location_name},
            fields=["name"]
        )
        provider_names = [p.name for p in providers]
    
    for provider_name in provider_names:
        provider_hours = get_availability_for_booking(location_name, service_name, provider_name)
        result["provider_level"].append({
            "provider": provider_name,
            "availability": provider_hours
        })
    
    return result


def _intersect_time_ranges(ranges1: List[Dict], ranges2: List[Dict]) -> List[Dict]:
    """
    Intersect two lists of time ranges.
    
    Args:
        ranges1: First list of opening hours
        ranges2: Second list of opening hours
    
    Returns:
        List of intersected time ranges
    """
    # Group by day
    ranges1_by_day = _group_by_day(ranges1)
    ranges2_by_day = _group_by_day(ranges2)
    
    result = []
    
    # Intersect each day
    all_days = set(list(ranges1_by_day.keys()) + list(ranges2_by_day.keys()))
    
    for day in all_days:
        day_ranges1 = ranges1_by_day.get(day, [])
        day_ranges2 = ranges2_by_day.get(day, [])
        
        if not day_ranges1:
            continue
        if not day_ranges2:
            continue
        
        # Intersect ranges for this day
        intersected = _intersect_day_ranges(day_ranges1, day_ranges2)
        result.extend(intersected)
    
    return result


def _intersect_day_ranges(ranges1: List[Dict], ranges2: List[Dict]) -> List[Dict]:
    """
    Intersect time ranges for a single day.
    
    Args:
        ranges1: List of time ranges for the day
        ranges2: List of time ranges for the day
    
    Returns:
        List of intersected ranges
    """
    result = []
    
    for r1 in ranges1:
        if not r1.get("is_open"):
            continue
        
        start1 = _time_to_seconds(r1["start_time"])
        end1 = _time_to_seconds(r1["end_time"])
        
        for r2 in ranges2:
            if not r2.get("is_open"):
                continue
            
            start2 = _time_to_seconds(r2["start_time"])
            end2 = _time_to_seconds(r2["end_time"])
            
            # Find intersection
            intersect_start = max(start1, start2)
            intersect_end = min(end1, end2)
            
            if intersect_start < intersect_end:
                result.append({
                    "day_of_week": r1["day_of_week"],
                    "start_time": _seconds_to_time(intersect_start),
                    "end_time": _seconds_to_time(intersect_end),
                    "is_open": 1
                })
    
    return result


def _group_by_day(ranges: List[Dict]) -> Dict[str, List[Dict]]:
    """Group time ranges by day of week."""
    grouped = {}
    for r in ranges:
        day = r.get("day_of_week")
        if day:
            if day not in grouped:
                grouped[day] = []
            grouped[day].append(r)
    return grouped


def _get_opening_hours_list(opening_hours_table) -> List[Dict]:
    """Convert opening_hours child table to list of dicts."""
    result = []
    for oh in opening_hours_table:
        if oh.is_open:
            result.append({
                "day_of_week": oh.day_of_week,
                "start_time": str(oh.start_time),
                "end_time": str(oh.end_time),
                "is_open": 1
            })
    return result


def _time_to_seconds(time_str: str) -> int:
    """Convert time string (HH:MM:SS) to seconds since midnight."""
    if isinstance(time_str, timedelta):
        return int(time_str.total_seconds())
    
    parts = str(time_str).split(":")
    hours = int(parts[0])
    minutes = int(parts[1]) if len(parts) > 1 else 0
    seconds = int(parts[2]) if len(parts) > 2 else 0
    return hours * 3600 + minutes * 60 + seconds


def _seconds_to_time(seconds: int) -> str:
    """Convert seconds since midnight to time string (HH:MM:SS)."""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def validate_availability_hierarchy(location_name: str, service_name: Optional[str] = None, provider_name: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Validate that Provider hours ⊆ Service hours ⊆ Location hours.
    
    Args:
        location_name: Location name
        service_name: Service name (optional)
        provider_name: Provider name (optional)
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    location = frappe.get_doc("Location", location_name)
    location_hours = _get_opening_hours_list(location.opening_hours) if location.opening_hours else []
    location_by_day = _group_by_day(location_hours)
    
    # Validate Service hours
    if service_name:
        service = frappe.get_doc("Service", service_name)
        if service.opening_hours and not service.use_default_hours:
            service_hours = _get_opening_hours_list(service.opening_hours)
            service_by_day = _group_by_day(service_hours)
            
            # Check each day
            for day, day_ranges in service_by_day.items():
                location_day_ranges = location_by_day.get(day, [])
                if not location_day_ranges:
                    return False, _(f"Service hours for {day} extend beyond Location hours. Location is closed on {day}.")
                
                # Check each service range is within location ranges
                for service_range in day_ranges:
                    if not _is_range_within_parent(service_range, location_day_ranges):
                        return False, _(f"Service hours for {day} ({service_range['start_time']} - {service_range['end_time']}) extend beyond Location hours.")
    
    # Validate Provider hours
    if provider_name:
        provider = frappe.get_doc("Provider", provider_name)
        if provider.opening_hours and not provider.use_default_hours:
            provider_hours = _get_opening_hours_list(provider.opening_hours)
            provider_by_day = _group_by_day(provider_hours)
            
            # Get parent hours (Service or Location)
            if service_name:
                service = frappe.get_doc("Service", service_name)
                if service.opening_hours and not service.use_default_hours:
                    parent_hours = _get_opening_hours_list(service.opening_hours)
                else:
                    parent_hours = location_hours
            else:
                parent_hours = location_hours
            
            parent_by_day = _group_by_day(parent_hours)
            
            # Check each day
            for day, day_ranges in provider_by_day.items():
                parent_day_ranges = parent_by_day.get(day, [])
                if not parent_day_ranges:
                    return False, _(f"Provider hours for {day} extend beyond parent availability. No availability on {day}.")
                
                # Check each provider range is within parent ranges
                for provider_range in day_ranges:
                    if not _is_range_within_parent(provider_range, parent_day_ranges):
                        return False, _(f"Provider hours for {day} ({provider_range['start_time']} - {provider_range['end_time']}) extend beyond parent availability.")
    
    return True, None


def _is_range_within_parent(range_dict: Dict, parent_ranges: List[Dict]) -> bool:
    """Check if a time range is within any of the parent ranges."""
    range_start = _time_to_seconds(range_dict["start_time"])
    range_end = _time_to_seconds(range_dict["end_time"])
    
    for parent_range in parent_ranges:
        if not parent_range.get("is_open"):
            continue
        
        parent_start = _time_to_seconds(parent_range["start_time"])
        parent_end = _time_to_seconds(parent_range["end_time"])
        
        # Check if range is completely within parent
        if range_start >= parent_start and range_end <= parent_end:
            return True
    
    return False


def apply_default_hours(doctype: str, docname: str, parent_doctype: Optional[str] = None, parent_docname: Optional[str] = None) -> None:
    """
    Apply default hours (8:30 AM - 6:00 PM, Mon-Fri) or inherit from parent.
    
    Args:
        doctype: DocType name (Location, Service, or Provider)
        docname: Document name
        parent_doctype: Parent doctype (Service for Provider, Location for Service)
        parent_docname: Parent document name
    """
    doc = frappe.get_doc(doctype, docname)
    
    # Default hours: 8:30 AM - 6:00 PM, Monday-Friday
    default_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    default_start = "08:30:00"
    default_end = "18:00:00"
    
    if parent_doctype and parent_docname:
        # Inherit from parent
        parent = frappe.get_doc(parent_doctype, parent_docname)
        if parent.opening_hours:
            # Copy parent hours
            doc.opening_hours = []
            for oh in parent.opening_hours:
                if oh.is_open:
                    doc.append("opening_hours", {
                        "day_of_week": oh.day_of_week,
                        "start_time": oh.start_time,
                        "end_time": oh.end_time,
                        "is_open": 1
                    })
        else:
            # Use defaults
            _add_default_hours(doc, default_days, default_start, default_end)
    else:
        # Use defaults
        _add_default_hours(doc, default_days, default_start, default_end)
    
    doc.use_default_hours = 1
    doc.save(ignore_permissions=True)


def _add_default_hours(doc, days: List[str], start_time: str, end_time: str) -> None:
    """Add default hours to a document."""
    doc.opening_hours = []
    for day in days:
        doc.append("opening_hours", {
            "day_of_week": day,
            "start_time": start_time,
            "end_time": end_time,
            "is_open": 1
        })



