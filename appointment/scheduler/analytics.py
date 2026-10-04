"""Permission-scoped booking analytics and aggregate CSV export."""

from collections import defaultdict
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import frappe
from frappe import _

from appointment.scheduler import booking, booking_access, membership

from appointment.scheduler.analytics_calculations import (
    _elapsed, _interval_minutes, _merge_intervals, _minute, _minutes_by_provider, _no_show, _occupied_minutes, _period_bounds, _rollup, _utilization, _wall_time, _working_minutes,
    BOOKED, CAPACITY_BOOKED, NO_SHOW_DENOMINATOR,
)
from appointment.scheduler.analytics_export import _csv_safe, _csv_rows

PERIODS = {1, 7, 30, 90}


def _visible(row, workspace, own_providers, scopes):
    if workspace["is_manager"]:
        return True
    if workspace["role"] == membership.ROLE_PROVIDER:
        return row.provider in own_providers
    return workspace["role"] == membership.ROLE_RECEPTIONIST and any(
        scope["organization"] == row.organization
        and (not scope["locations"] or row.location in scope["locations"])
        and (not scope["provider"] or row.provider == scope["provider"])
        for scope in scopes
    )


def _offerings(organization, service_ids, workspace, own_providers, scopes):
    if not service_ids:
        return []
    events = frappe.get_all("EventType", filters={"service": ["in", service_ids], "is_active": 1},
                            fields=["name", "service", "provider", "location"], limit_page_length=0)
    providers = {row.provider for row in events}
    locations = {row.location for row in events}
    active_providers = set(frappe.get_all("Provider", filters={"name": ["in", list(providers) or [""]], "is_active": 1}, pluck="name", limit_page_length=0))
    location_scope = {"independent_provider": organization.removeprefix("Provider:"), "organization": ["is", "not set"]} if organization.startswith("Provider:") else {"organization": organization}
    active_locations = set(frappe.get_all("Location", filters={"name": ["in", list(locations) or [""]], **location_scope, "is_active": 1}, pluck="name", limit_page_length=0))
    members = set(frappe.get_all("Provider Organization", filters={
        "parent": ["in", list(providers) or [""]], "parenttype": "Provider",
        "organization": organization, "status": "Active",
    }, pluck="parent", limit_page_length=0))
    if organization.startswith("Provider:"):
        members = {organization.removeprefix("Provider:")}
    visible = []
    for row in events:
        row.organization = organization
        if row.provider in active_providers & members and row.location in active_locations and _visible(row, workspace, own_providers, scopes):
            visible.append(row)
    return visible


def _resource_usage(organization, workspace, scopes, start, end, business_zone):
    """Room and equipment use: units booked over the units the open hours allow, per resource.

    Open hours are the resource's location hours; a pool of N offers N units at a time.
    Providers do not see this panel; receptionists see the resources in their locations.
    """
    if workspace["role"] == membership.ROLE_PROVIDER and not workspace["is_manager"]:
        return None
    filters = {"organization": organization, "is_active": 1}
    if not workspace["is_manager"]:
        allowed = {loc for scope in scopes if scope["organization"] == organization for loc in (scope["locations"] or [])}
        if allowed:
            filters["location"] = ["in", list(allowed)]
    items = frappe.get_all("Resource", filters=filters, fields=["name", "resource_name", "resource_type", "location", "capacity"], limit_page_length=0)
    if not items:
        return []
    lower = datetime.combine(start, time.min, business_zone).astimezone(timezone.utc).replace(tzinfo=None)
    upper = datetime.combine(end + timedelta(days=1), time.min, business_zone).astimezone(timezone.utc).replace(tzinfo=None)
    open_minutes = {}
    for location_name in {item.location for item in items}:
        location = frappe.get_doc("Location", location_name)
        zone = ZoneInfo(location.timezone or str(business_zone))
        spans = []
        for offset in range(-1, (end - start).days + 2):
            day = start + timedelta(days=offset)
            for hours in booking.effective_hours(None, location, None, day):
                opened = datetime.combine(day, _wall_time(hours["start_time"]), zone).astimezone(timezone.utc).replace(tzinfo=None)
                closed = datetime.combine(day, _wall_time(hours["end_time"]), zone).astimezone(timezone.utc).replace(tzinfo=None)
                if min(closed, upper) > max(opened, lower):
                    spans.append((max(opened, lower), min(closed, upper)))
        open_minutes[location_name] = _interval_minutes(spans)
    held = frappe.db.sql(
        """select r.resource, r.units, a.occupied_from, a.occupied_until from `tabAppointment Resource` r
        inner join `tabAppointment` a on a.name = r.parent and r.parenttype = 'Appointment'
        where r.resource in %s and a.status in %s and a.occupied_from < %s and a.occupied_until > %s""",
        (tuple(item.name for item in items), tuple(CAPACITY_BOOKED), upper, lower), as_dict=True,
    )
    booked = defaultdict(float)
    for row in held:
        minutes = (min(row.occupied_until, upper) - max(row.occupied_from, lower)).total_seconds() / 60
        booked[row.resource] += max(0, minutes) * max(1, int(row.units or 1))
    types = dict(frappe.get_all("Resource Type", filters={"organization": organization}, fields=["name", "type_name"], as_list=True))
    locations = dict(frappe.get_all("Location", filters={"name": ["in", list(open_minutes)]}, fields=["name", "location_name"], as_list=True))
    result = []
    for item in items:
        capacity = max(1, int(item.capacity or 1))
        available = open_minutes.get(item.location, 0) * capacity
        result.append({
            "resource": item.name, "name": item.resource_name, "type_name": types.get(item.resource_type, ""),
            "location_name": locations.get(item.location, item.location), "capacity": capacity,
            "booked_hours": round(booked[item.name] / 60, 1), "available_hours": round(available / 60, 1),
            "rate": round(booked[item.name] / available * 100, 1) if available else None,
        })
    return sorted(result, key=lambda row: (-(row["rate"] or 0), row["name"]))


def _authorize(organization, period):
    if frappe.session.user == "Guest" or not frappe.db.get_value("User", frappe.session.user, "enabled"):
        frappe.throw(_("Sign in to view your dashboard."), frappe.PermissionError)
    if organization.startswith("Provider:"):
        from appointment.scheduler.independent import require_owner
        owner = require_owner(organization.removeprefix("Provider:"))
        workspace = dict(organization=organization, role="Owner", is_manager=True, provider=owner.name)
    else:
        workspace = membership.workspace_for(organization)
    if not workspace:
        frappe.throw(_("This business is not in your workspace."), frappe.PermissionError)
    try:
        period = int(period)
    except (TypeError, ValueError):
        frappe.throw(_("Choose a valid reporting period."))
    if period not in PERIODS:
        frappe.throw(_("Choose a valid reporting period."))
    return workspace, period


def _report(organization, period, filters=None, records_for=None, offset=0):
    from appointment.scheduler.analytics_filters import ReportFilters
    from appointment.scheduler.analytics_metrics import enrich, filter_segment
    workspace, period = _authorize(organization, period)
    independent = organization.removeprefix("Provider:") if organization.startswith("Provider:") else None
    if independent:
        owner = frappe.get_doc("Provider", independent)
        org = frappe._dict(timezone=frappe.db.get_value("Location", {"independent_provider": independent}, "timezone") or "UTC", organization_name=owner.display_name or owner.provider_name)
        record_scope = {"provider": independent, "organization": ["is", "not set"]}
        service_scope = {"independent_provider": independent, "organization": ["is", "not set"]}
    else:
        org = frappe.db.get_value("Organization", organization, ["timezone", "organization_name"], as_dict=True)
        record_scope = service_scope = {"organization": organization}
    zone = ZoneInfo(org.timezone or "UTC")
    local_now, start, today = _period_bounds(datetime.now(timezone.utc), zone, period)
    selection = ReportFilters(filters, today, period)
    start, end = selection.start, selection.end
    period = (end - start).days + 1
    previous_start, future_end = start - timedelta(days=period), today + timedelta(days=6)
    rows = []
    while True:
        page = frappe.get_all("Appointment", filters=record_scope,
            fields=["organization", "appointment_date", "start_time", "end_time", "status", "client_email", "customer", "client_name", "service", "provider", "location", "amount_paid", "occupied_from", "occupied_until", "starts_at", "ends_at", "booking_timezone", "name", "creation", "modified", "client_phone", "cancellation_reason", "booking_source", "referral_code", "agreed_price", "agreed_currency", "discount_amount", "discount_code", "price_captured_at", "confirmed_at", "cancelled_at", "arrived_at", "checked_in_at", "actual_start", "actual_end", "workflow_events", "recovered_from"],
            order_by="appointment_date asc, name asc", start=len(rows), limit_page_length=1000)
        rows.extend(page)
        if len(page) < 1000:
            break
    own_providers, scopes = set(booking_access.providers()), booking_access.reception_scope()
    rows = [row for row in rows if _visible(row, workspace, own_providers, scopes)]
    services = {row.name: row for row in frappe.get_all("Service", filters=service_scope,
        fields=["name", "service_name", "price", "buffer_before", "buffer_after", "is_active"], limit_page_length=0)}
    provider_ids, location_ids = list({row.provider for row in rows}), list({row.location for row in rows})
    provider_names = {row.name: (row.display_name or row.provider_name or row.name) for row in frappe.get_all("Provider", filters={"name": ["in", provider_ids or [""]]}, fields=["name", "display_name", "provider_name"], limit_page_length=0)}
    location_names = {row.name: row.location_name for row in frappe.get_all("Location", filters={"name": ["in", location_ids or [""]]}, fields=["name", "location_name"], limit_page_length=0)}
    names, prices = ({key: row.service_name for key, row in services.items()}, {key: row.price for key, row in services.items()})
    buffers = {key: (int(row.buffer_before or 0), int(row.buffer_after or 0)) for key, row in services.items()}
    offerings = _offerings(organization, [key for key, row in services.items() if row.is_active], workspace, own_providers, scopes)
    selection.authorize(offerings + rows)
    history = rows
    rows = [row for row in rows if selection.matches(row)]
    operational = rows
    offerings = [row for row in offerings if all(not selection.data.get(key) or row.get(field) in selection.data[key] for key, field in (("providers", "provider"), ("locations", "location"), ("services", "service")))]
    rows = filter_segment(rows, history, selection, zone)
    if records_for:
        from appointment.scheduler.analytics_records import select
        return select(records_for,rows,operational,selection,zone,today,offset)
    reporting = []
    for row in rows:
        report_date = selection.date(row, zone)
        if report_date:
            copy = frappe._dict(row)
            copy.appointment_date = report_date
            reporting.append(copy)
    previous_filters = ReportFilters({**selection.data, "start": previous_start.isoformat(), "end": (start-timedelta(days=1)).isoformat()}, today, period)
    previous_rows = filter_segment(operational, history, previous_filters, zone)
    previous_reporting = []
    for row in previous_rows:
        report_date = previous_filters.date(row, zone)
        if report_date:
            copy = frappe._dict(row)
            copy.appointment_date = report_date
            previous_reporting.append(copy)
    money = bool(workspace["is_manager"])
    current = _rollup(reporting, start, end, local_now, names, prices, provider_names, location_names, money)
    previous = _rollup(previous_reporting, previous_start, start - timedelta(days=1), local_now, names, prices, provider_names, location_names, money)
    documents={}
    current["utilization"] = _utilization(rows, offerings, start, end, zone, buffers, documents)
    current["resources"] = _resource_usage(organization, workspace, scopes, start, end, zone)
    previous["utilization"] = _utilization(rows, offerings, previous_start, start - timedelta(days=1), zone, buffers, documents)
    if selection.basis != "appointment":
        for rollup in (current, previous):
            rollup["utilization"].update(available=False, rate=None)
    upcoming = [row for row in operational if today <= row.appointment_date <= future_end and row.status in ("Pending", "Confirmed")]
    report = {
        "business_name": org.organization_name, "role": workspace["role"], "timezone": org.timezone or "UTC",
        "period": period, "start": start.isoformat(), "end": end.isoformat(), "today": today.isoformat(),
        "current": current, "previous": {key: previous[key] for key in ("total", "active", "completed", "cancelled", "no_show", "booked_hours", "no_show_rate", "utilization")},
        "today_confirmed": sum(row.appointment_date == today and row.status == "Confirmed" for row in upcoming),
        "next_seven_days": len(upcoming),
        "workspace_schedule": [dict(booking=row.name, customer=row.client_name or "Customer", service=names.get(row.service, row.service), provider=provider_names.get(row.provider, row.provider), date=str(row.appointment_date), time=str(row.start_time), end_time=str(row.end_time), status=row.status) for row in sorted(upcoming, key=lambda item: (item.appointment_date, item.start_time, item.name))],
        "definitions": {
            "no_show": "No Show / (Completed + No Show), after appointment end in the business timezone. Cancellations and unresolved bookings are excluded.",
            "utilization": "Union of occupied provider intervals / union of current eligible provider working windows. Pending, Confirmed, Completed and No Show consume capacity; cancellations do not. Service buffers count.",
            "schedule_limit": "Past schedules are not snapshotted, so historical capacity uses today's hours, holidays, offerings and assignments. Status is the latest recorded value.",
        },
        "financial_note": _("Catalog value uses current service prices and is an estimate, not collected revenue.") if money else None,
    }

    enrich(report, rows, history, operational, selection, zone, money, workspace, offerings, prices, documents)
    report['current']['utilization'].update(coverage=report['metrics']['utilization']['coverage'],coverage_note=report['metrics']['utilization'].get('coverage_note'),rate=report['metrics']['utilization']['value'])
    if money:report['current']['recorded_payments']=report['metrics']['recorded_payments']['value']
    prior_report = {**report, "current": previous}
    enrich(prior_report, previous_rows, history, operational, previous_filters, zone, money, prices=prices)
    for key, metric in report["metrics"].items():
        prior = prior_report["metrics"].get(key)
        if prior and key not in {"agenda", "upcoming", "attention"}:
            metric["comparison"] = {"basis": "previous equivalent period", "start": previous_start.isoformat(),
                "end": (start-timedelta(days=1)).isoformat(), "value": prior["value"], "coverage": prior["coverage"],
                "change": metric["value"]-prior["value"] if metric["value"] is not None and prior["value"] is not None and metric["coverage"]==prior["coverage"]=="complete" else None}
    return report


@frappe.whitelist(methods=["GET"])
def overview(organization: str, period: int = 30, filters: str = "{}"):
    return _report(organization, period, filters)


@frappe.whitelist(methods=['GET'])
def records(organization: str, metric_id: str, period: int=30, filters: str='{}', offset: int=0):
    from appointment.scheduler.analytics_records import SUPPORTED
    if metric_id not in SUPPORTED:
        frappe.throw('This metric does not support a booking record drill-down.')
    try:offset=int(offset)
    except (ValueError,TypeError):frappe.throw('Choose a valid record page.')
    if offset<0 or offset>100000:frappe.throw('Choose a valid record page.')
    return _report(organization,period,filters,metric_id,offset)


@frappe.whitelist(methods=["GET"])
def widget(organization: str, metric_id: str, period: int = 30, filters: str = "{}"):
    report = _report(organization, period, filters)
    if metric_id not in report["metrics"]:
        frappe.throw("This widget is unavailable in your scope.", frappe.PermissionError)
    return report["metrics"][metric_id]



@frappe.whitelist(methods=['GET'])
def export_csv(organization: str, period: int=30, filters: str='{}'):
    from appointment.scheduler.analytics_export import export_report
    return export_report(organization,period,filters)
