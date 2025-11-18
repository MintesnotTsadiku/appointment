"""
Dashboard API endpoints for provider home page
"""
import frappe
from frappe import _
from datetime import datetime, timedelta


@frappe.whitelist()
def stats(period="week"):
    """
    Get dashboard statistics from real Appointment data
    period: 'week' or 'month'
    """
    user = frappe.session.user
    
    try:
        # Get Provider for this user
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not provider_name:
            # Return zeros if no provider exists
            frappe.response["message"] = {
                "appointments_this_week": 0,
                "upcoming_today": 0,
                "booking_rate_change": 0,
                "revenue": 0
            }
            return
        
        from datetime import datetime, timedelta
        
        today = datetime.now().date()
        start_of_week = today - timedelta(days=today.weekday())
        start_of_last_week = start_of_week - timedelta(days=7)
        end_of_last_week = start_of_week - timedelta(days=1)
        
        # Appointments this week
        appointments_this_week = frappe.db.count("Appointment", {
            "provider": provider_name,
            "appointment_date": [">=", start_of_week.isoformat()],
            "status": ["in", ["Pending", "Confirmed", "Completed"]]
        })
        
        # Appointments last week (for comparison)
        appointments_last_week = frappe.db.count("Appointment", {
            "provider": provider_name,
            "appointment_date": [">=", start_of_last_week.isoformat(), "<=", end_of_last_week.isoformat()],
            "status": ["in", ["Pending", "Confirmed", "Completed"]]
        })
        
        # Calculate booking rate change
        if appointments_last_week > 0:
            booking_rate_change = round(((appointments_this_week - appointments_last_week) / appointments_last_week) * 100, 1)
        else:
            booking_rate_change = 100 if appointments_this_week > 0 else 0
        
        # Upcoming today
        upcoming_today = frappe.db.count("Appointment", {
            "provider": provider_name,
            "appointment_date": today.isoformat(),
            "status": ["in", ["Pending", "Confirmed"]]
        })
        
        # Revenue this week (sum of amount_paid)
        revenue = frappe.db.sql("""
            SELECT COALESCE(SUM(amount_paid), 0) 
            FROM `tabAppointment`
            WHERE provider = %s
            AND appointment_date >= %s
            AND status IN ('Pending', 'Confirmed', 'Completed')
        """, (provider_name, start_of_week.isoformat()), as_list=True)[0][0] or 0
        
        frappe.response["message"] = {
            "appointments_this_week": appointments_this_week,
            "upcoming_today": upcoming_today,
            "booking_rate_change": booking_rate_change,
            "revenue": float(revenue)
        }
    except Exception as e:
        frappe.log_error(str(e), "Dashboard: Stats Error")
        # Return zeros on error
        frappe.response["message"] = {
            "appointments_this_week": 0,
            "upcoming_today": 0,
            "booking_rate_change": 0,
            "revenue": 0
        }


@frappe.whitelist()
def recent_activity(limit=10, offset=0):
    """
    Get recent appointment activity from real Appointment data
    """
    user = frappe.session.user
    
    try:
        # Get Provider for this user
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not provider_name:
            frappe.response["message"] = {
                "activities": []
            }
            return
        
        # Get recent appointments ordered by creation date
        appointments = frappe.get_all("Appointment",
            filters={"provider": provider_name},
            fields=["name", "appointment_id", "client_name", "service", "status", 
                   "appointment_date", "start_time", "creation", "modified"],
            order_by="creation desc",
            limit=limit,
            start=offset
        )
        
        activities = []
        for apt in appointments:
            # Determine activity type based on status and modification time
            if apt.status == "Cancelled":
                activity_type = "cancellation"
            elif apt.modified != apt.creation:
                # Modified after creation likely means reschedule
                activity_type = "reschedule"
            else:
                activity_type = "booking"
            
            # Get service name
            service_name = apt.service
            if apt.service:
                service_doc = frappe.db.get_value("Service", apt.service, "service_name", cache=True)
                if service_doc:
                    service_name = service_doc
            
            # Generate title for activity
            if activity_type == "booking":
                title = f"{apt.client_name} booked {service_name or 'Service'}"
            elif activity_type == "cancellation":
                title = f"{apt.client_name} cancelled {service_name or 'Service'}"
            elif activity_type == "reschedule":
                title = f"{apt.client_name} rescheduled {service_name or 'Service'}"
            else:
                title = f"{apt.client_name} - {service_name or 'Service'}"
            
            activities.append({
                "type": activity_type,
                "customer": apt.client_name,
                "time": apt.creation.isoformat() if apt.creation else datetime.now().isoformat(),
                "service": service_name or "Service",
                "appointment_id": apt.appointment_id or apt.name,
                "title": title
            })
        
        frappe.response["message"] = {
            "activities": activities
        }
    except Exception as e:
        frappe.log_error(str(e), "Dashboard: Recent Activity Error")
        frappe.response["message"] = {
            "activities": []
        }


@frappe.whitelist()
def alerts():
    """
    Get dashboard alerts and notifications based on real system state
    """
    user = frappe.session.user
    
    try:
        alerts_list = []
        
        # Get Provider for this user
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not provider_name:
            frappe.response["message"] = {
                "alerts": []
            }
            return
        
        provider = frappe.get_doc("Provider", provider_name)
        
        # Check 1: Missing availability
        if provider.locations and len(provider.locations) > 0:
            location_name = provider.locations[0].location
            location = frappe.get_doc("Location", location_name)
            
            if not location.opening_hours or len(location.opening_hours) == 0:
                alerts_list.append({
                    "id": "alert-no-availability",
                    "type": "warning",
                    "message": "Availability not set. Customers cannot book appointments!",
                    "priority": 100,
                    "action_url": "/settings/availability",
                    "dismissible": True
                })
        else:
            alerts_list.append({
                "id": "alert-no-location",
                "type": "warning",
                "message": "No location configured. Add a location to accept bookings.",
                "priority": 90,
                "action_url": "/settings/location",
                "dismissible": True
            })
        
        # Check 2: Google Calendar not connected (if preference is google)
        if provider.calendar_preference == "google":
            # TODO: Check if Google Calendar OAuth is actually connected
            # For now, just check if preference is set
            alerts_list.append({
                "id": "alert-google-calendar",
                "type": "info",
                "message": "Google Calendar preference set. Complete OAuth setup to enable sync.",
                "priority": 50,
                "action_url": "/settings/calendar",
                "dismissible": True
            })
        
        # Check 3: No services created
        services = frappe.db.get_all("Service", filters={"owner": user}, limit=1)
        if not services:
            alerts_list.append({
                "id": "alert-no-services",
                "type": "warning",
                "message": "No services created. Add your first service to start accepting bookings.",
                "priority": 80,
                "action_url": "/settings/services",
                "dismissible": True
            })
        
        # Check 4: No EventTypes created
        event_types = frappe.db.get_all("EventType", filters={"owner": user}, limit=1)
        if not event_types:
            alerts_list.append({
                "id": "alert-no-event-types",
                "type": "info",
                "message": "Create your first appointment type to get a booking link.",
                "priority": 60,
                "action_url": "/settings/services",
                "dismissible": True
            })
        
        # Check 5: Onboarding not complete
        if not provider.onboarding_complete:
            alerts_list.append({
                "id": "alert-onboarding-incomplete",
                "type": "info",
                "message": "Complete your onboarding to unlock all features.",
                "priority": 40,
                "action_url": "/home",
                "dismissible": True
            })
        
        frappe.response["message"] = {
            "alerts": alerts_list
        }
    except Exception as e:
        frappe.log_error(str(e), "Dashboard: Alerts Error")
        frappe.response["message"] = {
            "alerts": []
        }

