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
        # Get Provider for this user - try multiple ways
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        # If no provider found by user, try to get any provider owned by this user
        if not provider_name:
            # Check if user owns any provider (for demo data scenarios)
            providers = frappe.get_all("Provider", 
                filters={"owner": user},
                fields=["name"],
                limit=1
            )
            if providers:
                provider_name = providers[0].name
        
        if not provider_name:
            # Log for debugging
            frappe.log_error(f"No provider found for user: {user}", "Dashboard: No Provider")
            # Return zeros if no provider exists
            frappe.response["message"] = {
                "appointments_this_week": 0,
                "upcoming_today": 0,
                "booking_rate_change": 0,
                "revenue": 0,
                "debug": f"No provider found for user: {user}"
            }
            return
        
        from datetime import datetime, timedelta
        
        today = datetime.now().date()
        start_of_week = today - timedelta(days=today.weekday())
        start_of_last_week = start_of_week - timedelta(days=7)
        end_of_last_week = start_of_week - timedelta(days=1)
        
        # Appointments this week - use SQL for better date handling
        appointments_this_week = frappe.db.sql("""
            SELECT COUNT(*) 
            FROM `tabAppointment`
            WHERE provider = %s
            AND appointment_date >= %s
            AND status IN ('Pending', 'Confirmed', 'Completed')
        """, (provider_name, start_of_week.isoformat()), as_list=True)[0][0] or 0
        
        # Appointments last week (for comparison)
        appointments_last_week = frappe.db.sql("""
            SELECT COUNT(*) 
            FROM `tabAppointment`
            WHERE provider = %s
            AND appointment_date >= %s
            AND appointment_date <= %s
            AND status IN ('Pending', 'Confirmed', 'Completed')
        """, (provider_name, start_of_last_week.isoformat(), end_of_last_week.isoformat()), as_list=True)[0][0] or 0
        
        # Calculate booking rate change
        if appointments_last_week > 0:
            booking_rate_change = round(((appointments_this_week - appointments_last_week) / appointments_last_week) * 100, 1)
        else:
            booking_rate_change = 100 if appointments_this_week > 0 else 0
        
        # Upcoming today - use SQL for better date handling
        upcoming_today = frappe.db.sql("""
            SELECT COUNT(*) 
            FROM `tabAppointment`
            WHERE provider = %s
            AND appointment_date = %s
            AND status IN ('Pending', 'Confirmed')
        """, (provider_name, today.isoformat()), as_list=True)[0][0] or 0
        
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


# ===================================================================
# CALENDAR API - Appointment Calendar Management
# ===================================================================

@frappe.whitelist()
def get_appointments(start_date=None, end_date=None, status=None, service=None, provider=None, search=None):
    """
    Get appointments for calendar view with filtering
    Parameters:
    - start_date: Start date (YYYY-MM-DD)
    - end_date: End date (YYYY-MM-DD)
    - status: Filter by status (Confirmed, Completed, Cancelled, Pending, No Show)
    - service: Filter by service ID
    - provider: Filter by provider ID (defaults to user's provider)
    - search: Search term (searches client name, service, appointment_id)
    """
    user = frappe.session.user
    
    try:
        # Get Provider for this user
        user_provider = frappe.db.get_value("Provider", {"user": user}, "name")
        
        # Use provided provider or default to user's provider
        provider_name = provider or user_provider
        
        if not provider_name:
            frappe.response["message"] = {
                "appointments": []
            }
            return
        
        # Build filters
        filters = {"provider": provider_name}
        
        # Date range filter
        if start_date and end_date:
            filters["appointment_date"] = [">=", start_date, "<=", end_date]
        elif start_date:
            filters["appointment_date"] = [">=", start_date]
        elif end_date:
            filters["appointment_date"] = ["<=", end_date]
        
        # Status filter
        if status and status != "All":
            filters["status"] = status
        
        # Service filter
        if service:
            filters["service"] = service
        
        # Get appointments
        appointments = frappe.get_all("Appointment",
            filters=filters,
            fields=["name", "appointment_id", "appointment_date", "start_time", "end_time",
                   "client_name", "client_email", "client_phone", "service", "provider",
                   "location", "status", "amount_paid", "notes", "event_type", "event"],
            order_by="appointment_date asc, start_time asc"
        )
        
        # Apply search filter if provided
        if search:
            search_lower = search.lower()
            appointments = [
                apt for apt in appointments
                if (search_lower in (apt.get("client_name", "") or "").lower() or
                    search_lower in (apt.get("appointment_id", "") or "").lower() or
                    search_lower in (apt.get("service", "") or "").lower())
            ]
        
        # Format appointments with related data
        formatted_appointments = []
        for apt in appointments:
            # Get service name
            service_name = apt.get("service", "")
            if apt.get("service"):
                service_doc = frappe.db.get_value("Service", apt.service, ["service_name", "currency"], as_dict=True, cache=True)
                if service_doc:
                    service_name = service_doc.service_name or apt.service
            
            # Get provider name
            provider_name_attr = provider_name
            if apt.get("provider"):
                provider_doc = frappe.db.get_value("Provider", apt.provider, "provider_name", cache=True)
                if provider_doc:
                    provider_name_attr = provider_doc
            
            # Get location name
            location_name = ""
            if apt.get("location"):
                location_doc = frappe.db.get_value("Location", apt.location, "location_name", cache=True)
                if location_doc:
                    location_name = location_doc
            
            # Format currency
            currency = "ETB"
            if apt.get("service"):
                service_doc = frappe.db.get_value("Service", apt.service, "currency", cache=True)
                if service_doc:
                    currency = service_doc or "ETB"
            
            formatted_appointments.append({
                "name": apt.name,
                "appointment_id": apt.appointment_id or apt.name,
                "appointment_date": apt.appointment_date.isoformat() if apt.appointment_date else None,
                "start_time": str(apt.start_time) if apt.start_time else None,
                "end_time": str(apt.end_time) if apt.end_time else None,
                "client_name": apt.client_name or "",
                "client_email": apt.client_email or "",
                "client_phone": apt.client_phone or "",
                "service": apt.service or "",
                "service_name": service_name,
                "provider": apt.provider or "",
                "provider_name": provider_name_attr,
                "location": apt.location or "",
                "location_name": location_name,
                "status": apt.status or "Pending",
                "amount_paid": float(apt.amount_paid or 0),
                "currency": currency,
                "notes": apt.notes or "",
                "event_type": apt.event_type or "",
                "event": apt.event or ""
            })
        
        frappe.response["message"] = {
            "appointments": formatted_appointments
        }
    except Exception as e:
        frappe.log_error(str(e), "Calendar: Get Appointments Error")
        frappe.response["message"] = {
            "appointments": []
        }


@frappe.whitelist()
def get_calendar_stats():
    """
    Get calendar statistics for quick stats cards
    Returns:
    - this_week: Count of appointments this week
    - upcoming: Count of appointments in next 7 days
    - completed_this_month: Count of completed appointments this month
    """
    user = frappe.session.user
    
    try:
        # Get Provider for this user
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        if not provider_name:
            frappe.response["message"] = {
                "this_week": 0,
                "upcoming": 0,
                "completed_this_month": 0
            }
            return
        
        today = datetime.now().date()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        next_7_days = today + timedelta(days=7)
        start_of_month = today.replace(day=1)
        
        # Appointments this week
        this_week = frappe.db.sql("""
            SELECT COUNT(*) 
            FROM `tabAppointment`
            WHERE provider = %s
            AND appointment_date >= %s
            AND appointment_date <= %s
        """, (provider_name, start_of_week.isoformat(), end_of_week.isoformat()), as_list=True)[0][0] or 0
        
        # Upcoming in next 7 days
        upcoming = frappe.db.sql("""
            SELECT COUNT(*) 
            FROM `tabAppointment`
            WHERE provider = %s
            AND appointment_date > %s
            AND appointment_date <= %s
            AND status IN ('Pending', 'Confirmed')
        """, (provider_name, today.isoformat(), next_7_days.isoformat()), as_list=True)[0][0] or 0
        
        # Completed this month
        completed_this_month = frappe.db.sql("""
            SELECT COUNT(*) 
            FROM `tabAppointment`
            WHERE provider = %s
            AND appointment_date >= %s
            AND status = 'Completed'
        """, (provider_name, start_of_month.isoformat()), as_list=True)[0][0] or 0
        
        frappe.response["message"] = {
            "this_week": this_week,
            "upcoming": upcoming,
            "completed_this_month": completed_this_month
        }
    except Exception as e:
        frappe.log_error(str(e), "Calendar: Get Stats Error")
        frappe.response["message"] = {
            "this_week": 0,
            "upcoming": 0,
            "completed_this_month": 0
        }


@frappe.whitelist()
def get_appointment_details(appointment_id):
    """
    Get full details of a specific appointment
    """
    user = frappe.session.user
    
    try:
        # Get Provider for this user
        provider_name = frappe.db.get_value("Provider", {"user": user}, "name")
        
        # Get appointment - verify it belongs to user's provider
        appointment = frappe.get_doc("Appointment", {"appointment_id": appointment_id})
        
        if appointment.provider != provider_name:
            frappe.throw("You don't have permission to view this appointment", frappe.PermissionError)
        
        # Get related data
        service_name = appointment.service
        if appointment.service:
            service_doc = frappe.get_doc("Service", appointment.service)
            service_name = service_doc.service_name or appointment.service
        
        provider_name_attr = appointment.provider
        if appointment.provider:
            provider_doc = frappe.get_doc("Provider", appointment.provider)
            provider_name_attr = provider_doc.provider_name or appointment.provider
        
        location_name = ""
        if appointment.location:
            location_doc = frappe.get_doc("Location", appointment.location)
            location_name = location_doc.location_name or ""
        
        frappe.response["message"] = {
            "name": appointment.name,
            "appointment_id": appointment.appointment_id,
            "appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None,
            "start_time": str(appointment.start_time) if appointment.start_time else None,
            "end_time": str(appointment.end_time) if appointment.end_time else None,
            "client_name": appointment.client_name,
            "client_email": appointment.client_email,
            "client_phone": appointment.client_phone,
            "service": appointment.service,
            "service_name": service_name,
            "provider": appointment.provider,
            "provider_name": provider_name_attr,
            "location": appointment.location,
            "location_name": location_name,
            "status": appointment.status,
            "amount_paid": float(appointment.amount_paid or 0),
            "notes": appointment.notes or "",
            "event_type": appointment.event_type or "",
            "event": appointment.event or "",
            "cancellation_reason": getattr(appointment, "cancellation_reason", "") or ""
        }
    except frappe.DoesNotExistError:
        frappe.response["message"] = {
            "error": "Appointment not found"
        }
    except Exception as e:
        frappe.log_error(str(e), "Calendar: Get Appointment Details Error")
        frappe.response["message"] = {
            "error": str(e)
        }


# ===================================================================
# ADMIN DASHBOARD - Platform-wide Analytics
# ===================================================================

@frappe.whitelist()
def admin_stats():
    """
    Get platform-wide statistics for admin dashboard
    Only accessible to System Managers
    """
    # Check if user is System Manager
    if "System Manager" not in frappe.get_roles():
        frappe.throw("Only System Managers can access admin dashboard", frappe.PermissionError)
    
    try:
        today = datetime.now().date()
        start_of_week = today - timedelta(days=today.weekday())
        start_of_month = today.replace(day=1)
        start_of_last_month = (start_of_month - timedelta(days=1)).replace(day=1)
        end_of_last_month = start_of_month - timedelta(days=1)
        
        # Total Providers
        total_providers = frappe.db.count("Provider")
        # Check if status field exists before filtering
        try:
            provider_meta = frappe.get_meta("Provider")
            has_status = any(f.fieldname == "status" for f in provider_meta.fields)
            if has_status:
                active_providers = frappe.db.count("Provider", {"status": "Active"})
            else:
                # If no status field, all providers are considered active
                active_providers = total_providers
        except Exception:
            active_providers = total_providers
        
        # Total Organizations
        total_organizations = frappe.db.count("Organization")
        # Check if status field exists before filtering
        try:
            org_meta = frappe.get_meta("Organization")
            has_status = any(f.fieldname == "status" for f in org_meta.fields)
            if has_status:
                active_organizations = frappe.db.count("Organization", {"status": "Active"})
            else:
                # If no status field, all organizations are considered active
                active_organizations = total_organizations
        except Exception:
            active_organizations = total_organizations
        
        # Total Appointments
        total_appointments = frappe.db.count("Appointment")
        appointments_this_week = frappe.db.sql("""
            SELECT COUNT(*) 
            FROM `tabAppointment`
            WHERE appointment_date >= %s
        """, (start_of_week.isoformat(),), as_list=True)[0][0] or 0
        
        appointments_this_month = frappe.db.sql("""
            SELECT COUNT(*) 
            FROM `tabAppointment`
            WHERE appointment_date >= %s
        """, (start_of_month.isoformat(),), as_list=True)[0][0] or 0
        
        appointments_last_month = frappe.db.sql("""
            SELECT COUNT(*) 
            FROM `tabAppointment`
            WHERE appointment_date >= %s
            AND appointment_date <= %s
        """, (start_of_last_month.isoformat(), end_of_last_month.isoformat()), as_list=True)[0][0] or 0
        
        # Appointment Status Breakdown - use frappe.get_all to handle missing columns
        try:
            all_appointments = frappe.get_all("Appointment", 
                fields=["status"],
                limit_page_length=None
            )
            status_counts = {}
            for apt in all_appointments:
                status = apt.get("status", "Unknown")
                status_counts[status] = status_counts.get(status, 0) + 1
        except Exception:
            # If status field doesn't exist, return empty dict
            status_counts = {}
        
        # Revenue Stats - use frappe.get_all to handle missing columns
        try:
            # Total revenue
            all_appointments_revenue = frappe.get_all("Appointment",
                fields=["amount_paid", "status"],
                filters={"status": ["in", ["Pending", "Confirmed", "Completed"]]},
                limit_page_length=None
            )
            total_revenue = sum(float(apt.get("amount_paid", 0) or 0) for apt in all_appointments_revenue)
        except Exception:
            # If status field doesn't exist, get all appointments
            try:
                all_appointments_revenue = frappe.get_all("Appointment",
                    fields=["amount_paid"],
                    limit_page_length=None
                )
                total_revenue = sum(float(apt.get("amount_paid", 0) or 0) for apt in all_appointments_revenue)
            except Exception:
                total_revenue = 0
        
        try:
            # Revenue this month
            appointments_this_month_revenue = frappe.get_all("Appointment",
                fields=["amount_paid", "status", "appointment_date"],
                filters={
                    "appointment_date": [">=", start_of_month.isoformat()],
                    "status": ["in", ["Pending", "Confirmed", "Completed"]]
                },
                limit_page_length=None
            )
            revenue_this_month = sum(float(apt.get("amount_paid", 0) or 0) for apt in appointments_this_month_revenue)
        except Exception:
            # If status field doesn't exist, get all appointments this month
            try:
                appointments_this_month_revenue = frappe.get_all("Appointment",
                    fields=["amount_paid", "appointment_date"],
                    filters={"appointment_date": [">=", start_of_month.isoformat()]},
                    limit_page_length=None
                )
                revenue_this_month = sum(float(apt.get("amount_paid", 0) or 0) for apt in appointments_this_month_revenue)
            except Exception:
                revenue_this_month = 0
        
        try:
            # Revenue last month
            appointments_last_month_revenue = frappe.get_all("Appointment",
                fields=["amount_paid", "status", "appointment_date"],
                filters={
                    "appointment_date": [">=", start_of_last_month.isoformat(), "<=", end_of_last_month.isoformat()],
                    "status": ["in", ["Pending", "Confirmed", "Completed"]]
                },
                limit_page_length=None
            )
            revenue_last_month = sum(float(apt.get("amount_paid", 0) or 0) for apt in appointments_last_month_revenue)
        except Exception:
            # If status field doesn't exist, get all appointments last month
            try:
                appointments_last_month_revenue = frappe.get_all("Appointment",
                    fields=["amount_paid", "appointment_date"],
                    filters={
                        "appointment_date": [">=", start_of_last_month.isoformat(), "<=", end_of_last_month.isoformat()]
                    },
                    limit_page_length=None
                )
                revenue_last_month = sum(float(apt.get("amount_paid", 0) or 0) for apt in appointments_last_month_revenue)
            except Exception:
                revenue_last_month = 0
        
        # Calculate growth rates
        appointment_growth = 0
        if appointments_last_month > 0:
            appointment_growth = round(((appointments_this_month - appointments_last_month) / appointments_last_month) * 100, 1)
        elif appointments_this_month > 0:
            appointment_growth = 100
        
        revenue_growth = 0
        if revenue_last_month > 0:
            revenue_growth = round(((revenue_this_month - revenue_last_month) / revenue_last_month) * 100, 1)
        elif revenue_this_month > 0:
            revenue_growth = 100
        
        # Total Services
        total_services = frappe.db.count("Service")
        
        # Total Locations
        total_locations = frappe.db.count("Location")
        
        # Active Users (users with Provider records)
        active_users = frappe.db.sql("""
            SELECT COUNT(DISTINCT user) 
            FROM `tabProvider`
            WHERE user IS NOT NULL
        """, as_list=True)[0][0] or 0
        
        # Recent Activity (last 10 appointments)
        try:
            recent_appointments = frappe.get_all("Appointment",
                fields=["name", "appointment_id", "client_name", "provider", "status", 
                       "appointment_date", "start_time", "creation", "amount_paid"],
                order_by="creation desc",
                limit=10
            )
        except Exception:
            # If status field doesn't exist, get without status
            try:
                recent_appointments = frappe.get_all("Appointment",
                    fields=["name", "appointment_id", "client_name", "provider", 
                           "appointment_date", "start_time", "creation", "amount_paid"],
                    order_by="creation desc",
                    limit=10
                )
            except Exception:
                recent_appointments = []
        
        # Format recent appointments
        recent_activities = []
        for apt in recent_appointments:
            provider_name = "Unknown"
            if apt.get("provider"):
                provider_name = frappe.db.get_value("Provider", apt.provider, "provider_name", cache=True) or "Unknown"
            recent_activities.append({
                "id": apt.get("appointment_id") or apt.get("name"),
                "client_name": apt.get("client_name", "Unknown"),
                "provider": provider_name,
                "status": apt.get("status", "Unknown"),
                "date": apt.get("appointment_date").isoformat() if apt.get("appointment_date") else None,
                "time": str(apt.get("start_time")) if apt.get("start_time") else None,
                "amount": float(apt.get("amount_paid", 0) or 0),
                "created_at": apt.get("creation").isoformat() if apt.get("creation") else None
            })
        
        # Top Providers by Appointments - use frappe.get_all to avoid status column issues
        try:
            # Get all appointments this month
            appointments_this_month_list = frappe.get_all("Appointment",
                fields=["provider", "amount_paid"],
                filters={"appointment_date": [">=", start_of_month.isoformat()]},
                limit_page_length=None
            )
            
            # Group by provider
            provider_stats = {}
            for apt in appointments_this_month_list:
                provider_name = apt.get("provider")
                if not provider_name:
                    continue
                    
                if provider_name not in provider_stats:
                    provider_stats[provider_name] = {
                        "appointment_count": 0,
                        "total_revenue": 0
                    }
                
                provider_stats[provider_name]["appointment_count"] += 1
                provider_stats[provider_name]["total_revenue"] += float(apt.get("amount_paid", 0) or 0)
            
            # Get provider names and format
            top_providers = []
            for provider_name, stats in sorted(provider_stats.items(), key=lambda x: x[1]["appointment_count"], reverse=True)[:10]:
                provider_doc = frappe.db.get_value("Provider", provider_name, ["name", "provider_name"], as_dict=True)
                if provider_doc:
                    top_providers.append({
                        "name": provider_doc.name,
                        "provider_name": provider_doc.provider_name or provider_doc.name,
                        "appointment_count": stats["appointment_count"],
                        "total_revenue": stats["total_revenue"]
                    })
        except Exception as e:
            frappe.log_error(str(e), "Admin Dashboard: Top Providers Error")
            top_providers = []
        
        frappe.response["message"] = {
            "overview": {
                "total_providers": total_providers,
                "active_providers": active_providers,
                "total_organizations": total_organizations,
                "active_organizations": active_organizations,
                "total_appointments": total_appointments,
                "appointments_this_week": appointments_this_week,
                "appointments_this_month": appointments_this_month,
                "appointment_growth": appointment_growth,
                "total_services": total_services,
                "total_locations": total_locations,
                "active_users": active_users
            },
            "revenue": {
                "total": float(total_revenue),
                "this_month": float(revenue_this_month),
                "last_month": float(revenue_last_month),
                "growth": revenue_growth
            },
            "appointments": {
                "status_breakdown": status_counts,
                "this_week": appointments_this_week,
                "this_month": appointments_this_month,
                "growth": appointment_growth
            },
            "recent_activity": recent_activities,
            "top_providers": top_providers
        }
    except Exception as e:
        frappe.log_error(str(e), "Admin Dashboard: Stats Error")
        frappe.response["message"] = {
            "error": str(e),
            "overview": {},
            "revenue": {},
            "appointments": {},
            "recent_activity": [],
            "top_providers": []
        }

