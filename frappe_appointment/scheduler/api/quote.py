# Copyright (c) 2025, minte and contributors
# For license information, please see license.txt

"""
Quote API for booking quotes with pricing and policies.
"""

import frappe
from frappe import _
from datetime import datetime
from frappe_appointment.scheduler.helpers.policy_engine import calculate_booking_quote
from frappe_appointment.helpers.overrides import add_response_code


@frappe.whitelist(allow_guest=True)
@add_response_code
def get_booking_quote(
    service_name: str,
    location_name: str = None,
    provider_name: str = None,
    appointment_date: str = None
):
    """
    GET /api/method/frappe_appointment.scheduler.api.quote.get_booking_quote
    
    Returns booking quote with pricing and policies.
    
    Args (via request):
        service_name: Service name (required)
        location_name: Location name (optional)
        provider_name: Provider name (optional)
        appointment_date: ISO date string (optional)
    
    Returns:
        {
            "quote": {
                "total_price": 1000.0,
                "deposit_amount": 500.0,
                "deposit_percentage": 50.0,
                "remaining_amount": 500.0,
                "currency": "ETB",
                "cancellation_deadline": "2025-01-20 14:00:00",
                "reschedule_deadline": "2025-01-20 14:00:00",
                "late_cancellation_fee": 200.0,
                "no_show_fee": 1000.0,
                "refund_policy": "Full Refund",
                "policies": [
                    {
                        "policy_name": "Standard Deposit Policy",
                        "deposit_percentage": 50.0,
                        "cancellation_window_hours": 24
                    }
                ]
            }
        }
    """
    # Validate required parameters
    if not service_name:
        return {"error": "service_name is required"}, 400
    
    # Get service price
    try:
        service = frappe.get_doc("Service", service_name)
        service_price = float(service.price or 0.0)
    except frappe.DoesNotExistError:
        return {"error": f"Service '{service_name}' not found"}, 404
    
    # Parse appointment date if provided
    appointment_datetime = None
    if appointment_date:
        try:
            appointment_datetime = frappe.utils.get_datetime(appointment_date)
        except Exception:
            return {"error": "Invalid appointment_date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)"}, 400
    
    # Calculate quote
    try:
        quote = calculate_booking_quote(
            service_name=service_name,
            service_price=service_price,
            location_name=location_name,
            provider_name=provider_name,
            appointment_date=appointment_datetime
        )
        
        # Format policies for response (remove internal fields)
        formatted_policies = []
        for policy in quote.get("policies", []):
            formatted_policies.append({
                "policy_name": policy.get("policy_name"),
                "deposit_percentage": policy.get("deposit_percentage"),
                "deposit_amount": policy.get("deposit_amount"),
                "cancellation_window_hours": policy.get("cancellation_window_hours"),
                "reschedule_window_hours": policy.get("reschedule_window_hours"),
                "late_cancellation_fee_percentage": policy.get("late_cancellation_fee_percentage"),
                "late_cancellation_fee_amount": policy.get("late_cancellation_fee_amount"),
                "no_show_fee_percentage": policy.get("no_show_fee_percentage"),
                "refund_policy": policy.get("refund_policy")
            })
        
        quote["policies"] = formatted_policies
        
        return {
            "quote": quote
        }, 200
    
    except Exception as e:
        frappe.log_error(f"Error calculating booking quote: {str(e)}", "Quote API Error")
        return {"error": "Failed to calculate quote. Please try again."}, 500








