"""
Onboarding API endpoints for provider setup
"""
import frappe
from frappe import _


@frappe.whitelist()
def get_progress():
    """
    Get onboarding progress for the current user
    Returns the current step and completion status
    """
    user = frappe.session.user
    
    # Try to get existing onboarding progress
    # For now, return mock data (will create OnboardingProgress doctype later)
    
    # TEMPORARY: Set to True to skip onboarding and see dashboard
    # Change back to False to test onboarding wizard
    SKIP_ONBOARDING = True
    
    if SKIP_ONBOARDING:
        from datetime import datetime
        return {
            "current_step": 5,
            "completed_steps": [1, 2, 3, 4, 5],
            "onboarding_complete": True,
            "completed_at": datetime.now().isoformat()
        }
    
    return {
        "current_step": 1,
        "completed_steps": [],
        "onboarding_complete": False,
        "completed_at": None
    }


@frappe.whitelist()
def save_profile(business_name, business_type, timezone, language):
    """
    Save business profile (Step 1)
    """
    user = frappe.session.user
    
    # TODO: Save to database
    # For now, just return success
    frappe.response["message"] = {
        "success": True,
        "profile_id": frappe.generate_hash(length=10)
    }


@frappe.whitelist()
def connect_calendar(provider):
    """
    Connect calendar (Step 2)
    provider: 'google' or 'manual'
    """
    user = frappe.session.user
    
    if provider == "google":
        # TODO: Initiate OAuth flow
        # For now, return mock OAuth URL
        frappe.response["message"] = {
            "oauth_url": None,  # Would be Google OAuth URL
            "success": True
        }
    else:
        # Manual calendar - just mark as connected
        frappe.response["message"] = {
            "success": True
        }


@frappe.whitelist()
def save_availability(weekly_schedule):
    """
    Save weekly availability (Step 3)
    weekly_schedule: JSON object with day keys and time slots
    """
    user = frappe.session.user
    
    # TODO: Save to User Availability doctype
    # For now, just return success
    frappe.response["message"] = {
        "success": True
    }


@frappe.whitelist()
def create_service(name, duration, buffer_time, price, currency="ETB"):
    """
    Create first service/appointment type (Step 4)
    """
    user = frappe.session.user
    
    # TODO: Create Appointment Group
    # For now, return mock data
    service_id = frappe.generate_hash(length=10)
    
    frappe.response["message"] = {
        "success": True,
        "service_id": service_id,
        "booking_url": f"/schedule/in/{service_id}"
    }


@frappe.whitelist()
def complete():
    """
    Mark onboarding as complete (Step 5)
    """
    user = frappe.session.user
    
    # TODO: Update OnboardingProgress doctype
    # For now, return success
    from datetime import datetime
    
    frappe.response["message"] = {
        "success": True,
        "onboarding_complete": True,
        "completed_at": datetime.now().isoformat()
    }


@frappe.whitelist()
def update_step(step):
    """
    Update current onboarding step
    """
    user = frappe.session.user
    
    # TODO: Update OnboardingProgress doctype
    # For now, return updated progress
    frappe.response["message"] = {
        "current_step": int(step),
        "completed_steps": list(range(1, int(step))),
        "onboarding_complete": False
    }

