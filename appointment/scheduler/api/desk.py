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
from appointment.scheduler import notifications


@frappe.whitelist()
@add_response_code
def get_desk_appointments(date: str = None, location_name: str = None, provider_name: str = None, view: str = "day", organization: str = None, resource: str = None):
    """
    Get appointments for day/week view with filters.

    Args:
        date: Date string (YYYY-MM-DD). Defaults to today.
        location_name: Filter by location (optional)
        provider_name: Filter by provider (optional)
        view: "day" or "week". Defaults to "day"
        organization: Active business. Validated against membership every call.
        resource: Only bookings holding this room or machine (optional)

    Returns:
        Appointments plus the authorized scope, so the UI can distinguish
        "no bookings" from "filtered out" and "no access".
    """
    from appointment.scheduler.booking_access import (
        require_staff,
        business_scope,
        reception_scope,
        managed_organizations,
    )
    require_staff()
    user = frappe.session.user
    authorized = business_scope(user)
    if organization and user != "Administrator" and organization not in authorized:
        frappe.throw(_("You do not have access to this business."), frappe.PermissionError)
    if not organization and len(authorized) == 1:
        organization = authorized[0]
    scopes = reception_scope(user)

    # Default to today if not provided
    if not date:
        date = getdate().strftime("%Y-%m-%d")

    # Range calculations use the business time zone when known, else system.
    tz_name = (
        frappe.db.get_value("Organization", organization, "timezone") if organization else None
    ) or frappe.db.get_single_value("System Settings", "time_zone") or "Africa/Addis_Ababa"
    try:
        tz = pytz.timezone(tz_name)
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
    statuses = ["Pending", "Confirmed", "Completed", "Cancelled", "No Show"]
    base_filters = {
        "appointment_date": ["between", [start_date, end_date]],
        "status": ["in", statuses],
    }
    if organization:
        base_filters["organization"] = organization

    filters = dict(base_filters)
    if location_name:
        filters["location"] = location_name
    if provider_name:
        filters["provider"] = provider_name
    if resource:
        filters["name"] = ["in", frappe.get_all(
            "Appointment Resource", filters={"resource": resource, "parenttype": "Appointment"}, pluck="parent"
        ) or [""]]

    # Get appointments (only select fields that exist in Appointment doctype).
    # get_list applies the record-level appointment_query in addition to filters.
    appointments = frappe.get_list(
        "Appointment",
        filters=filters,
        fields=[
            "name", "appointment_id", "appointment_date", "start_time", "end_time",
            "client_name", "client_email", "client_phone", "customer", "last_changed_by",
            "cancellation_fee", "refund_due", "service",
            "provider", "location", "status",
            "amount_paid", "notes", "event_type", "event", "organization", "booking_timezone", "modified", "quantity"
        ],
        order_by="appointment_date, start_time"
    )
    unfiltered_count = len(
        frappe.get_list("Appointment", filters=base_filters, fields=["name"], limit_page_length=0)
    )

    # Enrich with service, provider, location, resource and business display names.
    from appointment.scheduler.resources import names_for

    resource_names = names_for([apt.name for apt in appointments])
    for apt in appointments:
        apt["resource_names"] = resource_names.get(apt.name, [])
        apt["start_time"] = get_time(apt.start_time).strftime("%H:%M:%S")
        apt["end_time"] = get_time(apt.end_time).strftime("%H:%M:%S")
        apt["service_name"] = (
            frappe.db.get_value("Service", apt.get("service"), "service_name") if apt.get("service") else ""
        ) or ""
        apt["provider_name"] = (
            frappe.db.get_value("Provider", apt.get("provider"), "provider_name") if apt.get("provider") else ""
        ) or ""
        apt["location_name"] = (
            frappe.db.get_value("Location", apt.get("location"), "location_name") if apt.get("location") else ""
        ) or ""
        apt["organization_name"] = (
            frappe.db.get_value("Organization", apt.get("organization"), "organization_name")
            if apt.get("organization")
            else ""
        ) or ""

    # Next day with a booking inside the authorized scope, to guide recovery.
    upcoming = frappe.get_list(
        "Appointment",
        filters={"appointment_date": [">=", getdate()], "status": ["in", statuses]},
        fields=["appointment_date"],
        order_by="appointment_date asc",
        limit_page_length=1,
    )

    scope = {
        "organization": organization,
        "organization_name": frappe.db.get_value("Organization", organization, "organization_name")
        if organization
        else None,
        "organizations": authorized,
        "is_manager": organization in managed_organizations(user) if organization else False,
        "receptionist": bool(scopes),
        "locations": list(
            dict.fromkeys(loc for item in scopes for loc in item["locations"])
        ),
        "providers": list(dict.fromkeys(item["provider"] for item in scopes if item["provider"])),
    }

    return {
        "appointments": appointments,
        "count": len(appointments),
        "unfiltered_count": unfiltered_count,
        "scope": scope,
        "date": getdate(date).isoformat(),
        "view": view,
        "timezone": tz_name,
        "next_date": upcoming[0].appointment_date.isoformat() if upcoming else None,
    }, 200


@frappe.whitelist()
@add_response_code
def create_desk_appointment(
    client_name: str,
    client_phone: str = None,
    client_email: str = None,
    service_name: str = None,
    provider_name: str = None,
    location_name: str = None,
    start_time: str = None,
    end_time: str = None,
    notes: str = None,
    appointment_date: str = None,
    customer: str = None,
    resource_name: str = None,
    quantity: int = 1,
):
    """
    Create appointment on behalf of client.

    Args:
        client_name: Client name
        client_phone: Client phone
        client_email: Client email (optional)
        service_name: Service name
        provider_name: Provider name
        location_name: Location name
        start_time: Start time (HH:MM:SS or datetime string)
        end_time: End time (HH:MM:SS or datetime string). If not provided, calculated from service duration
        notes: Optional notes
        appointment_date: Appointment date (YYYY-MM-DD). Defaults to today
        customer: Customer Profile to link. Without it, the server matches or creates one.
        resource_name: For a service booked without staff, the room or machine (instead of a provider).

    Returns:
        Created appointment
    """
    from appointment.scheduler.booking_access import require_access
    org = frappe.db.get_value("Service", service_name, "organization")
    resource_only = bool(frappe.db.get_value("Service", service_name, "resource_only"))
    if resource_only:
        provider_name = None
        location_name = frappe.db.get_value("Resource", resource_name, "location") if resource_name else None
    require_access(frappe._dict(organization=org, provider=provider_name, location=location_name))
    try:
        # Validate required fields
        if not all([client_name, service_name, resource_name if resource_only else provider_name, location_name, start_time]):
            return {"error": _("Missing required fields")}, 400

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

        # Resource-only bookings have no provider; booking validation checks the resource.
        conflicts = [] if resource_only else check_conflicts(
            provider_name=provider_name,
            location_name=location_name,
            start_time=start_datetime,
            end_time=end_datetime
        )

        if conflicts:
            return {
                "error": _("Time slot conflicts with existing appointment"),
                "conflicts": conflicts
            }, 409

        # Get event type for this service and provider
        event_type = frappe.get_all(
            "EventType",
            filters={
                "service": service_name,
                **({"resource": resource_name} if resource_only else {"provider": provider_name}),
                "location": location_name,
                "is_active": 1
            },
            fields=["name"],
            limit=1
        )

        if not event_type:
            return {"error": _("No active event type found for this service and provider")}, 404

        event_type_name = event_type[0].name

        # Create appointment
        appointment = frappe.new_doc("Appointment")
        appointment.client_name = client_name
        appointment.client_phone = client_phone or ""
        appointment.client_email = client_email or ""
        appointment.customer = customer or None
        appointment.service = service_name
        appointment.provider = provider_name
        appointment.location = location_name
        appointment.event_type = event_type_name
        appointment.quantity = frappe.utils.cint(quantity) or 1
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
        notification_status = notifications.status_of(appointment)
        appointment.reload()
        return {
            "success": True,
            "appointment": appointment.as_dict(),
            "message": _("Appointment created successfully"),
            "notification_status": notification_status,
        }, 200

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Desk API: Create Appointment Error")
        return {"error": _("Failed to create appointment: {0}").format(str(e))}, 500


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

                # Booking validation checks resource-only bookings, which have no provider.
                conflicts = [] if not appointment.provider else check_conflicts(
                    provider_name=appointment.provider,
                    location_name=appointment.location,
                    start_time=new_start_datetime,
                    end_time=new_end_datetime,
                    exclude_appointment=appointment_name
                )

                if conflicts:
                    return {
                        "error": _("New time slot conflicts with existing appointment"),
                        "conflicts": conflicts
                    }, 409

            appointment.appointment_date = new_date
            appointment.start_time = new_start_time_str
            appointment.end_time = new_end_time_str

        appointment.save(ignore_permissions=True)
        frappe.db.commit()

        notification_status = notifications.status_of(appointment)
        appointment.reload()
        return {
            "success": True,
            "appointment": appointment.as_dict(),
            "message": _("Appointment updated successfully"),
            "notification_status": notification_status,
        }, 200

    except frappe.DoesNotExistError:
        return {"error": _("Appointment not found")}, 404
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Desk API: Update Appointment Error")
        return {"error": _("Failed to update appointment: {0}").format(str(e))}, 500


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

        # Check for conflicts (excluding current appointment); booking validation covers resource-only bookings.
        conflicts = [] if not appointment.provider else check_conflicts(
            provider_name=appointment.provider,
            location_name=appointment.location,
            start_time=new_start_datetime,
            end_time=new_end_datetime,
            exclude_appointment=appointment_name
        )

        if conflicts:
            return {
                "error": _("New time slot conflicts with existing appointment"),
                "conflicts": conflicts
            }, 409

        # Update appointment
        appointment.appointment_date = new_appointment_date
        appointment.start_time = new_start_time_str
        appointment.end_time = new_end_time_str
        appointment.save(ignore_permissions=True)
        frappe.db.commit()

        notification_status = notifications.status_of(appointment)
        appointment.reload()
        return {
            "success": True,
            "appointment": appointment.as_dict(),
            "message": _("Appointment rescheduled successfully"),
            "notification_status": notification_status,
        }, 200

    except frappe.DoesNotExistError:
        return {"error": _("Appointment not found")}, 404
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Desk API: Reschedule Appointment Error")
        return {"error": _("Failed to reschedule appointment: {0}").format(str(e))}, 500


@frappe.whitelist()
@add_response_code
def get_walk_ins(location_name: str = None, business: str = None):
    """
    Get waiting walk-ins for a location.

    Args:
        location_name: Filter by location (optional). If not provided, returns all waiting walk-ins
        business: `Provider:<provider>` for an independent provider's own queue (optional)

    Returns:
        List of walk-ins with status "waiting"
    """
    filters = {
        "status": "waiting"
    }
    provider = _independent_business(business)
    if provider:
        filters["independent_provider"] = provider

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
    notes: str = None,
    customer: str = None,
    business: str = None,
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
        customer: Customer Profile picked at the desk (optional)
        business: `Provider:<provider>` when an independent provider adds to their own queue (optional)

    Returns:
        Created walk-in
    """
    provider = _independent_business(business)
    try:
        if not client_name or not client_phone:
            return {"error": _("Client name and phone are required")}, 400

        # Create walk-in
        walk_in = frappe.new_doc("Walk In")
        walk_in.client_name = client_name
        walk_in.client_phone = client_phone
        if client_email:
            walk_in.client_email = client_email
        if provider:
            # The provider's own offering; the walk-in validates that everything named belongs to it.
            walk_in.independent_provider = provider
            location_name = location_name or _independent_location(provider, service_requested)
            provider_preferred = provider_preferred or provider
            if customer:
                from appointment.scheduler.doctype.walk_in.walk_in import owned_by

                if not owned_by(provider, "Customer Profile", customer):
                    return {"error": _("The customer belongs to another business")}, 403
                walk_in.customer = customer
        elif customer:
            from appointment.scheduler.booking_access import business_scope

            business = frappe.db.get_value("Customer Profile", customer, "organization")
            location_business = frappe.db.get_value("Location", location_name, "organization") if location_name else business
            if business not in business_scope() or location_business != business:
                return {"error": _("The customer belongs to another business")}, 403
            walk_in.customer = customer
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
            "message": _("Walk-in added to queue")
        }, 200

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Desk API: Add Walk-In Error")
        return {"error": _("Failed to add walk-in: {0}").format(str(e))}, 500


@frappe.whitelist()
@add_response_code
def assign_walk_in_to_slot(walk_in_name: str, provider_name: str = None, location_name: str = None, preferred_time: str = None):
    """
    Assign walk-in to the first open time within 24 hours.

    Args:
        walk_in_name: Walk-in name
        provider_name: Provider name (optional; defaults to the walk-in's preferred provider, else any provider of the service)
        location_name: Location name (optional; defaults to the walk-in's location)
        preferred_time: Preferred time (HH:MM:SS or datetime string). If not provided, finds the first open time.
            An organization's walk-in is booked at exactly this time, or refused when it is not open.

    Returns:
        Created appointment
    """
    from appointment.scheduler.booking_access import config_permission
    walk_in_doc = frappe.get_doc("Walk In", walk_in_name)
    if not config_permission(walk_in_doc, permission_type="write"):
        frappe.throw(_("Not permitted to assign this walk-in"), frappe.PermissionError)
    if walk_in_doc.independent_provider:
        # An independent walk-in books the provider's own offering; the booking has no organization.
        from appointment.scheduler.independent import require_owner

        if frappe.session.user != "Administrator":
            require_owner(walk_in_doc.independent_provider)
        if provider_name and provider_name != walk_in_doc.independent_provider:
            frappe.throw(_("Not permitted to assign this walk-in"), frappe.PermissionError)
        provider_name = walk_in_doc.independent_provider
        location_name = walk_in_doc.location or location_name
    try:
        # Get walk-in
        walk_in = frappe.get_doc("Walk In", walk_in_name)

        if walk_in.status != "waiting":
            return {"error": _("Walk-in is not in waiting status")}, 400

        # Get service
        service_name = walk_in.service_requested
        if not service_name:
            return {"error": _("Walk-in does not have a service requested")}, 400

        if walk_in.independent_provider:
            # The offering's own open times, so the booking falls inside the provider's hours.
            slot = _independent_slot(service_name, provider_name, location_name, preferred_time)
            if not slot:
                return {"error": _("No available slots found in the next 24 hours")}, 404
            slot_start, slot_end = slot

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
                return {"error": _("No active event type found for this service and provider")}, 404

            event_type_name = event_type[0].name
        else:
            # The first open time of the location's offerings, so the booking respects opening hours and rooms.
            location_name = location_name or walk_in.location
            slot = _organization_slot(service_name, provider_name or walk_in.provider_preferred, location_name, preferred_time)
            if not slot and preferred_time:
                return {"error": _("This time is not open for the walk-in's service. Choose another time.")}, 400
            if not slot:
                return {"error": _("Nothing is open for this service in the next 24 hours.")}, 404
            slot_start, slot_end, event_type_name, provider_name = slot

        # Create appointment
        appointment_date = slot_start.date().strftime("%Y-%m-%d")
        start_time_str = slot_start.time().strftime("%H:%M:%S")
        end_time_str = slot_end.time().strftime("%H:%M:%S")

        # Create appointment
        appointment = frappe.new_doc("Appointment")
        appointment.client_name = walk_in.client_name
        appointment.client_phone = walk_in.client_phone
        appointment.client_email = walk_in.client_email or ""
        appointment.customer = walk_in.customer or None
        appointment.service = service_name
        appointment.provider = provider_name
        appointment.location = location_name
        appointment.event_type = event_type_name
        appointment.appointment_date = appointment_date
        appointment.start_time = start_time_str
        appointment.end_time = end_time_str
        appointment.status = "Confirmed"
        appointment.flags.analytics_terms = {"source": "walk-in"}
        if walk_in.notes:
            appointment.notes = f"Walk-in: {walk_in.notes}"

        appointment.appointment_id = f"APT-{now_datetime().strftime('%Y%m%d%H%M%S%f')}"
        appointment.flags.skip_customer_notification = True  # The customer is at the desk.
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
            "message": _("Walk-in assigned to appointment slot")
        }, 200

    except frappe.DoesNotExistError:
        return {"error": _("Walk-in not found")}, 404
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Desk API: Assign Walk-In Error")
        return {"error": _("Failed to assign walk-in: {0}").format(str(e))}, 500


def _organization_slot(service_name, provider_name, location_name, preferred_time=None):
    """The first open time of an organization's offerings for the service at the location within 24 hours, or None.

    Returns local wall times, the offering and its provider. A preferred provider narrows the offerings to theirs;
    otherwise the earliest time wins, then the provider with fewer bookings that day.
    An explicit time is used as given when it is open.
    """
    from appointment.scheduler.booking import is_open, offering

    filters = {"service": service_name, "location": location_name, "is_active": 1, **({"provider": provider_name} if provider_name else {})}
    choices = []
    for name in frappe.get_all("EventType", filters=filters, pluck="name", order_by="creation asc"):
        try:
            parts = offering(name)
        except (frappe.ValidationError, frappe.PermissionError):
            frappe.clear_messages()
            continue  # An inactive provider, membership or user offers no time.
        zone = pytz.timezone(parts.location.timezone)
        now = datetime.now(pytz.UTC)
        if preferred_time:
            local = get_datetime(preferred_time if " " in preferred_time else f"{now.astimezone(zone).date()} {preferred_time}")
            start = zone.localize(local).astimezone(pytz.UTC)
            end = start + timedelta(minutes=int(parts.event.duration_override or parts.service.duration))
            found = (start, end) if is_open(parts, start.replace(tzinfo=None), end.replace(tzinfo=None)) else None
        else:
            found = _first_open(parts, zone, now, now + timedelta(hours=24))
        if found:
            choices.append((found, parts, zone))
    if not choices:
        return None
    (start, end), parts, zone = min(choices, key=lambda c: (c[0][0], _bookings_on(c[1].provider, c[0][0].astimezone(c[2]).date())))
    return (*_wall_times(start, end, zone), parts.event.name, parts.provider.name if parts.provider else None)


def _independent_slot(service_name, provider_name, location_name, preferred_time=None):
    """The first open time of an independent provider's offering within 24 hours, as local wall times, or None."""
    from appointment.scheduler.booking import offering

    events = frappe.get_all("EventType", filters={"service": service_name, "provider": provider_name,
                            "location": location_name, "is_active": 1}, pluck="name", limit=1)
    if not events:
        return None
    parts = offering(events[0])
    zone = pytz.timezone(parts.location.timezone or "Africa/Addis_Ababa")
    earliest = datetime.now(pytz.UTC)
    if preferred_time:
        local = get_datetime(preferred_time if " " in preferred_time else f"{earliest.astimezone(zone).date()} {preferred_time}")
        earliest = max(earliest, zone.localize(local).astimezone(pytz.UTC))
    found = _first_open(parts, zone, earliest, earliest + timedelta(hours=24))
    return _wall_times(*found, zone) if found else None


def _first_open(parts, zone, earliest, latest):
    """The offering's first available start and end (aware UTC) from `earliest` to `latest`, or None."""
    from appointment.scheduler.booking import open_slots

    for day in sorted({earliest.astimezone(zone).date(), latest.astimezone(zone).date()}):
        for row in open_slots(parts, day)["all_available_slots_for_data"]:
            start = datetime.fromisoformat(row["start_time"].replace("Z", "+00:00"))
            if row["available"] and earliest <= start <= latest:
                return start, datetime.fromisoformat(row["end_time"].replace("Z", "+00:00"))
    return None


def _wall_times(start, end, zone):
    return start.astimezone(zone).replace(tzinfo=None), end.astimezone(zone).replace(tzinfo=None)


def _bookings_on(provider, day):
    """The provider's active bookings on a local day; a resource-only offering has none."""
    from appointment.scheduler.booking import ACTIVE

    if not provider:
        return 0
    return frappe.db.count("Appointment", {"provider": provider.name, "appointment_date": day, "status": ["in", ACTIVE]})


def _independent_business(business):
    """The provider for a `Provider:<provider>` workspace key its owner uses, else None (organizations keep their checks)."""
    from appointment.scheduler import business_owner
    from appointment.scheduler.independent import require_owner

    if not (business or "").startswith(business_owner.PREFIX):
        return None
    provider = business_owner.from_key(business).provider
    if frappe.session.user != "Administrator":
        require_owner(provider)
    return provider


def _independent_location(provider, service=None):
    """The location of the provider's offering for this service, or of their first offering."""
    filters = {"provider": provider, "is_active": 1, **({"service": service} if service else {})}
    rows = frappe.get_all("EventType", filters=filters, pluck="location", order_by="creation asc", limit=1)
    return rows[0] if rows else None


@frappe.whitelist()
@add_response_code
def get_services_list(organization: str = None):
    """
    Get list of active services, optionally scoped to one business.
    """
    filters = {"is_active": 1}
    if organization:
        filters["organization"] = organization
    services = frappe.get_list(
        "Service",
        filters=filters,
        fields=["name", "service_name", "duration", "price", "organization", "resource_only", "allow_quantity", "max_quantity"],
        order_by="service_name"
    )

    return {"services": services}, 200


@frappe.whitelist()
@add_response_code
def get_providers_list(organization: str = None):
    """
    Get list of active providers, optionally scoped to one business.
    """
    filters = {"is_active": 1}
    if organization:
        provider_names = frappe.get_all(
            "Provider Organization",
            filters={"organization": organization, "parenttype": "Provider", "status": "Active"},
            pluck="parent",
        )
        filters["name"] = ["in", provider_names or [""]]
    providers = frappe.get_list(
        "Provider",
        filters=filters,
        fields=["name", "provider_name", "full_name", "user"],
        order_by="provider_name"
    )

    return {"providers": providers}, 200


@frappe.whitelist()
@add_response_code
def get_locations_list(organization: str = None):
    """
    Get list of active locations, optionally scoped to one business.
    """
    filters = {"is_active": 1}
    if organization:
        filters["organization"] = organization
    locations = frappe.get_list(
        "Location",
        filters=filters,
        fields=["name", "location_name", "organization", "timezone", "reception_state"],
        order_by="location_name"
    )

    return {"locations": locations}, 200
