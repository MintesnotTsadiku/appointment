"""
Dashboard API endpoints for provider home page
"""
import frappe
from frappe import _
from datetime import datetime, timedelta
import random


@frappe.whitelist()
def stats(period="week"):
    """
    Get dashboard statistics
    period: 'week' or 'month'
    """
    user = frappe.session.user
    
    # TODO: Calculate real stats from appointments
    # For now, return mock data
    
    # Generate realistic mock data
    appointments_this_week = random.randint(15, 30)
    upcoming_today = random.randint(2, 5)
    booking_rate_change = random.randint(-10, 25)
    revenue = random.randint(20000, 50000)
    
    frappe.response["message"] = {
        "appointments_this_week": appointments_this_week,
        "upcoming_today": upcoming_today,
        "booking_rate_change": booking_rate_change,
        "revenue": revenue
    }


@frappe.whitelist()
def recent_activity(limit=10, offset=0):
    """
    Get recent appointment activity
    """
    user = frappe.session.user
    
    # TODO: Fetch real appointments from database
    # For now, return mock data
    
    mock_activities = [
        {
            "type": "booking",
            "customer": "John Doe",
            "time": (datetime.now() - timedelta(hours=2)).isoformat(),
            "appointment_id": frappe.generate_hash(length=10),
            "title": "John Doe booked 2:00 PM today"
        },
        {
            "type": "cancellation",
            "customer": "Mary Smith",
            "time": (datetime.now() - timedelta(hours=5)).isoformat(),
            "appointment_id": frappe.generate_hash(length=10),
            "title": "Mary Smith canceled appointment tomorrow"
        },
        {
            "type": "reschedule",
            "customer": "Peter Johnson",
            "time": (datetime.now() - timedelta(hours=8)).isoformat(),
            "appointment_id": frappe.generate_hash(length=10),
            "title": "Peter Johnson rescheduled to next week"
        },
        {
            "type": "booking",
            "customer": "Sarah Williams",
            "time": (datetime.now() - timedelta(days=1)).isoformat(),
            "appointment_id": frappe.generate_hash(length=10),
            "title": "Sarah Williams booked 11:00 AM today"
        },
        {
            "type": "booking",
            "customer": "David Brown",
            "time": (datetime.now() - timedelta(days=1, hours=3)).isoformat(),
            "appointment_id": frappe.generate_hash(length=10),
            "title": "David Brown booked 3:00 PM tomorrow"
        },
    ]
    
    frappe.response["message"] = {
        "activities": mock_activities[offset:offset+limit]
    }


@frappe.whitelist()
def alerts():
    """
    Get dashboard alerts and notifications
    """
    user = frappe.session.user
    
    # TODO: Generate real alerts based on system state
    # For now, return mock alerts
    
    mock_alerts = [
        {
            "type": "warning",
            "message": "Missing availability for this Saturday. Set your hours to accept bookings.",
            "priority": 2,
            "action_url": "/settings/availability",
            "dismissible": True
        },
        {
            "type": "info",
            "message": "Google Calendar sync is working smoothly. Last synced 5 minutes ago.",
            "priority": 1,
            "action_url": None,
            "dismissible": True
        },
    ]
    
    frappe.response["message"] = {
        "alerts": mock_alerts
    }

