# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

"""
Policy Engine for managing booking policies, deposits, and cancellation rules.
"""

import frappe
from frappe import _
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import pytz


def get_applicable_policies(
    service_name: str,
    location_name: Optional[str] = None,
    provider_name: Optional[str] = None,
    appointment_date: Optional[datetime] = None
) -> List[Dict]:
    """
    Get all applicable policies for a booking combination.
    
    Priority order (most specific → least specific):
    1. Provider-specific policies
    2. Service-specific policies
    3. Location-specific policies
    4. All Services policies
    
    Args:
        service_name: Service name (required)
        location_name: Location name (optional)
        provider_name: Provider name (optional)
        appointment_date: Appointment date (optional, for date range validation)
    
    Returns:
        List of policy dicts sorted by priority (most specific first)
    """
    if not service_name:
        return []
    
    # Get system timezone (default: Africa/Addis_Ababa)
    system_timezone = frappe.db.get_single_value("System Settings", "time_zone") or "Africa/Addis_Ababa"
    try:
        tz = pytz.timezone(system_timezone)
    except pytz.UnknownTimeZoneError:
        tz = pytz.timezone("Africa/Addis_Ababa")
    
    # Convert appointment_date to date if datetime
    appointment_date_obj = None
    if appointment_date:
        if isinstance(appointment_date, str):
            appointment_date_obj = frappe.utils.getdate(appointment_date)
        elif isinstance(appointment_date, datetime):
            appointment_date_obj = appointment_date.date()
    
    policies = []
    
    # 1. Provider-specific policies (highest priority)
    if provider_name:
        provider_policies = frappe.get_all(
            "Policy",
            filters={
                "applies_to": "Specific Provider",
                "provider": provider_name,
                "is_active": 1
            },
            fields=["*"]
        )
        for policy in provider_policies:
            if _is_policy_valid(policy, appointment_date_obj):
                policies.append({
                    "priority": 1,
                    "policy": policy
                })
    
    # 2. Service-specific policies
    service_policies = frappe.get_all(
        "Policy",
        filters={
            "applies_to": "Specific Service",
            "service": service_name,
            "is_active": 1
        },
        fields=["*"]
    )
    for policy in service_policies:
        if _is_policy_valid(policy, appointment_date_obj):
            policies.append({
                "priority": 2,
                "policy": policy
            })
    
    # 3. Location-specific policies
    if location_name:
        location_policies = frappe.get_all(
            "Policy",
            filters={
                "applies_to": "Specific Location",
                "location": location_name,
                "is_active": 1
            },
            fields=["*"]
        )
        for policy in location_policies:
            if _is_policy_valid(policy, appointment_date_obj):
                policies.append({
                    "priority": 3,
                    "policy": policy
                })
    
    # 4. All Services policies (lowest priority)
    # Get organization from service to filter "All Services" policies
    service_org = None
    if service_name:
        service_org = frappe.db.get_value("Service", service_name, "organization")
    
    all_services_filters = {
        "applies_to": "All Services",
        "is_active": 1
    }
    # Filter by organization if service belongs to one
    if service_org:
        all_services_filters["organization"] = service_org
    
    all_services_policies = frappe.get_all(
        "Policy",
        filters=all_services_filters,
        fields=["*"]
    )
    for policy in all_services_policies:
        if _is_policy_valid(policy, appointment_date_obj):
            policies.append({
                "priority": 4,
                "policy": policy
            })
    
    # Sort by priority (most specific first)
    policies.sort(key=lambda x: x["priority"])
    
    # Return just the policy dicts
    return [p["policy"] for p in policies]


def _is_policy_valid(policy: Dict, appointment_date: Optional[datetime.date]) -> bool:
    """Check if policy is valid for the given appointment date."""
    if not policy.get("is_active"):
        return False
    
    # Check date range
    valid_from = policy.get("valid_from")
    valid_to = policy.get("valid_to")
    
    if appointment_date:
        if valid_from and appointment_date < frappe.utils.getdate(valid_from):
            return False
        if valid_to and appointment_date > frappe.utils.getdate(valid_to):
            return False
    
    return True


def calculate_booking_quote(
    service_name: str,
    service_price: float,
    location_name: Optional[str] = None,
    provider_name: Optional[str] = None,
    appointment_date: Optional[datetime] = None
) -> Dict:
    """
    Calculate booking quote with deposit and policy information.
    
    Returns:
        {
            "total_price": 1000.0,
            "deposit_amount": 500.0,
            "deposit_percentage": 50.0,
            "remaining_amount": 500.0,
            "currency": "ETB",
            "cancellation_deadline": "2025-01-20 14:00:00",
            "reschedule_deadline": "2025-01-20 14:00:00",
            "late_cancellation_fee": 200.0,
            "no_show_fee": 1000.0,
            "policies": [...],
            "refund_policy": "Full Refund"
        }
    """
    # Get applicable policies
    policies = get_applicable_policies(service_name, location_name, provider_name, appointment_date)
    
    # Use most specific policy (first in list)
    primary_policy = policies[0] if policies else None
    
    # Calculate deposit
    deposit_amount = 0.0
    deposit_percentage = 0.0
    
    if primary_policy:
        if primary_policy.get("deposit_amount") and primary_policy.get("deposit_amount") > 0:
            deposit_amount = float(primary_policy.get("deposit_amount"))
        elif primary_policy.get("deposit_percentage") and primary_policy.get("deposit_percentage") > 0:
            deposit_percentage = float(primary_policy.get("deposit_percentage"))
            deposit_amount = (service_price * deposit_percentage) / 100.0
    
    remaining_amount = service_price - deposit_amount
    
    # Calculate deadlines
    cancellation_deadline = None
    reschedule_deadline = None
    
    if primary_policy and appointment_date:
        system_timezone = frappe.db.get_single_value("System Settings", "time_zone") or "Africa/Addis_Ababa"
        try:
            tz = pytz.timezone(system_timezone)
        except pytz.UnknownTimeZoneError:
            tz = pytz.timezone("Africa/Addis_Ababa")
        
        if isinstance(appointment_date, str):
            appointment_datetime = frappe.utils.get_datetime(appointment_date)
        else:
            appointment_datetime = appointment_date
        
        # Make timezone-aware if not already
        if appointment_datetime.tzinfo is None:
            appointment_datetime = tz.localize(appointment_datetime)
        
        # Calculate cancellation deadline
        cancellation_window = primary_policy.get("cancellation_window_hours", 0)
        if cancellation_window > 0:
            cancellation_deadline = appointment_datetime - timedelta(hours=cancellation_window)
        
        # Calculate reschedule deadline
        reschedule_window = primary_policy.get("reschedule_window_hours", 0)
        if reschedule_window > 0:
            reschedule_deadline = appointment_datetime - timedelta(hours=reschedule_window)
    
    # Calculate fees
    late_cancellation_fee = 0.0
    no_show_fee = 0.0
    
    if primary_policy:
        # Late cancellation fee
        if primary_policy.get("late_cancellation_fee_amount") and primary_policy.get("late_cancellation_fee_amount") > 0:
            late_cancellation_fee = float(primary_policy.get("late_cancellation_fee_amount"))
        elif primary_policy.get("late_cancellation_fee_percentage") and primary_policy.get("late_cancellation_fee_percentage") > 0:
            late_cancellation_fee = (service_price * float(primary_policy.get("late_cancellation_fee_percentage"))) / 100.0
        
        # No show fee
        if primary_policy.get("no_show_fee_percentage") and primary_policy.get("no_show_fee_percentage") > 0:
            no_show_fee = (service_price * float(primary_policy.get("no_show_fee_percentage"))) / 100.0
    
    # Get refund policy
    refund_policy = primary_policy.get("refund_policy", "Full Refund") if primary_policy else "Full Refund"
    
    return {
        "total_price": float(service_price),
        "deposit_amount": deposit_amount,
        "deposit_percentage": deposit_percentage,
        "remaining_amount": remaining_amount,
        "currency": "ETB",
        "cancellation_deadline": cancellation_deadline.strftime("%Y-%m-%d %H:%M:%S") if cancellation_deadline else None,
        "reschedule_deadline": reschedule_deadline.strftime("%Y-%m-%d %H:%M:%S") if reschedule_deadline else None,
        "late_cancellation_fee": late_cancellation_fee,
        "no_show_fee": no_show_fee,
        "policies": policies,
        "refund_policy": refund_policy
    }


def validate_reschedule(appointment_name: str, new_start_time: datetime) -> Tuple[bool, str]:
    """
    Validate if reschedule is allowed based on policies.
    
    Returns:
        (is_allowed: bool, error_message: str)
    """
    try:
        appointment = frappe.get_doc("Appointment", appointment_name)
    except frappe.DoesNotExistError:
        return False, _("Appointment not found.")
    
    # Get applicable policies
    policies = get_applicable_policies(
        appointment.service,
        appointment.location,
        appointment.provider,
        new_start_time
    )
    
    if not policies:
        # No policies = allow reschedule
        return True, ""
    
    primary_policy = policies[0]
    reschedule_window = primary_policy.get("reschedule_window_hours", 0)
    
    if reschedule_window == 0:
        # No restriction
        return True, ""
    
    # Check if reschedule is within window
    system_timezone = frappe.db.get_single_value("System Settings", "time_zone") or "Africa/Addis_Ababa"
    try:
        tz = pytz.timezone(system_timezone)
    except pytz.UnknownTimeZoneError:
        tz = pytz.timezone("Africa/Addis_Ababa")
    
    if isinstance(new_start_time, str):
        new_start_datetime = frappe.utils.get_datetime(new_start_time)
    else:
        new_start_datetime = new_start_time
    
    if new_start_datetime.tzinfo is None:
        new_start_datetime = tz.localize(new_start_datetime)
    
    now = datetime.now(tz)
    deadline = new_start_datetime - timedelta(hours=reschedule_window)
    
    if now > deadline:
        hours_before = (new_start_datetime - now).total_seconds() / 3600
        return False, _("Reschedule must be done at least {0} hours before the appointment. You have {1:.1f} hours remaining.").format(
            reschedule_window, hours_before
        )
    
    return True, ""


def validate_cancellation(appointment_name: str) -> Tuple[bool, str, Dict]:
    """
    Validate if cancellation is allowed and calculate refund.
    
    Returns:
        (is_allowed: bool, error_message: str, refund_info: Dict)
    """
    try:
        appointment = frappe.get_doc("Appointment", appointment_name)
    except frappe.DoesNotExistError:
        return False, _("Appointment not found."), {}
    
    # Get appointment datetime
    appointment_date = frappe.utils.get_datetime(f"{appointment.appointment_date} {appointment.start_time}")
    
    # Get applicable policies
    policies = get_applicable_policies(
        appointment.service,
        appointment.location,
        appointment.provider,
        appointment_date
    )
    
    primary_policy = policies[0] if policies else None
    
    # Check cancellation window
    system_timezone = frappe.db.get_single_value("System Settings", "time_zone") or "Africa/Addis_Ababa"
    try:
        tz = pytz.timezone(system_timezone)
    except pytz.UnknownTimeZoneError:
        tz = pytz.timezone("Africa/Addis_Ababa")
    
    if appointment_date.tzinfo is None:
        appointment_date = tz.localize(appointment_date)
    
    now = datetime.now(tz)
    
    # Calculate refund
    refund_amount = 0.0
    late_fee = 0.0
    is_late = False
    
    if primary_policy:
        cancellation_window = primary_policy.get("cancellation_window_hours", 0)
        deadline = appointment_date - timedelta(hours=cancellation_window) if cancellation_window > 0 else None
        
        if deadline and now > deadline:
            is_late = True
            # Calculate late cancellation fee
            service_price = frappe.db.get_value("Service", appointment.service, "price") or 0.0
            if primary_policy.get("late_cancellation_fee_amount") and primary_policy.get("late_cancellation_fee_amount") > 0:
                late_fee = float(primary_policy.get("late_cancellation_fee_amount"))
            elif primary_policy.get("late_cancellation_fee_percentage") and primary_policy.get("late_cancellation_fee_percentage") > 0:
                late_fee = (float(service_price) * float(primary_policy.get("late_cancellation_fee_percentage"))) / 100.0
        
        # Calculate refund based on policy
        refund_policy = primary_policy.get("refund_policy", "Full Refund")
        amount_paid = appointment.amount_paid or 0.0
        
        if refund_policy == "Full Refund":
            refund_amount = amount_paid - late_fee
        elif refund_policy == "Partial Refund":
            # Partial refund (e.g., 50% of deposit)
            refund_amount = (amount_paid * 0.5) - late_fee
        else:  # No Refund
            refund_amount = 0.0
        
        refund_amount = max(0.0, refund_amount)  # Can't be negative
    else:
        # No policy = full refund
        refund_amount = appointment.amount_paid or 0.0
    
    refund_info = {
        "refund_amount": refund_amount,
        "late_fee": late_fee,
        "is_late": is_late,
        "refund_policy": primary_policy.get("refund_policy", "Full Refund") if primary_policy else "Full Refund"
    }
    
    return True, "", refund_info

