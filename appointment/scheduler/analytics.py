"""Role-scoped booking analytics for the selected business workspace.

Money is labeled as recorded payments or *catalog value*, never revenue inferred
from the current service price. This module does not expose customer identities.
"""
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import frappe
from frappe import _

from appointment.scheduler import booking_access, membership

PERIODS = {7, 30, 90}
ACTIVE = {"Pending", "Confirmed", "Completed"}


def _clock_hour(value):
    return int(str(value).split(":", 1)[0])


def _minutes(start, end):
    def total(value):
        parts = str(value).split(":")
        return int(parts[0]) * 60 + int(parts[1])
    return max(0, total(end) - total(start))


def _visible(row, workspace, own_providers, scopes):
    if workspace["is_manager"]:
        return True
    if workspace["role"] == membership.ROLE_PROVIDER:
        return row.provider in own_providers
    if workspace["role"] == membership.ROLE_RECEPTIONIST:
        return any(
            scope["organization"] == row.organization
            and (not scope["locations"] or row.location in scope["locations"])
            and (not scope["provider"] or row.provider == scope["provider"])
            for scope in scopes
        )
    return False


def _rollup(rows, start, end, service_names, service_prices, provider_names, location_names, include_money):
    selected = [row for row in rows if start <= row.appointment_date <= end]
    statuses = Counter(row.status for row in selected)
    booked = [row for row in selected if row.status in ACTIVE]
    customer_counts = Counter(row.client_email.lower() for row in booked if row.client_email)
    daily = defaultdict(lambda: {"bookings": 0, "completed": 0, "cancelled": 0})
    services = Counter()
    providers = Counter()
    locations = Counter()
    heatmap = Counter()
    catalog_value = 0.0
    recorded_payments = 0.0
    booked_minutes = 0
    for row in selected:
        day = row.appointment_date.isoformat()
        daily[day]["bookings"] += 1
        if row.status == "Completed":
            daily[day]["completed"] += 1
        if row.status == "Cancelled":
            daily[day]["cancelled"] += 1
        if row.status in ACTIVE:
            services[row.service] += 1
            providers[row.provider] += 1
            locations[row.location] += 1
            booked_minutes += _minutes(row.start_time, row.end_time)
            heatmap[(row.appointment_date.weekday(), _clock_hour(row.start_time))] += 1
            if include_money:
                catalog_value += float(service_prices.get(row.service) or 0)
        if include_money:
            recorded_payments += float(row.amount_paid or 0)
    trend = []
    for offset in range((end - start).days + 1):
        day = (start + timedelta(days=offset)).isoformat()
        trend.append({"date": day, **daily[day]})
    result = {
        "total": len(selected), "active": len(booked),
        "completed": statuses["Completed"], "confirmed": statuses["Confirmed"],
        "cancelled": statuses["Cancelled"], "no_show": statuses["No Show"],
        "unique_customers": len(customer_counts),
        "repeat_customers": sum(count > 1 for count in customer_counts.values()),
        "booked_hours": round(booked_minutes / 60, 1),
        "trend": trend,
        "services": [{"name": service_names.get(key) or _("Service"), "count": count} for key, count in services.most_common(6)],
        "providers": [{"name": provider_names.get(key) or _("Provider"), "count": count} for key, count in providers.most_common(8)],
        "locations": [{"name": location_names.get(key) or _("Location"), "count": count} for key, count in locations.most_common(8)],
        "heatmap": [{"weekday": weekday, "hour": hour, "count": count} for (weekday, hour), count in sorted(heatmap.items())],
    }
    if include_money:
        result["catalog_value"] = round(catalog_value, 2)
        result["recorded_payments"] = round(recorded_payments, 2)
    return result


@frappe.whitelist(methods=["GET"])
def overview(organization: str, period: int = 30):
    """Return bounded booking trends for one authorized business and role."""
    if frappe.session.user == "Guest" or not frappe.db.get_value("User", frappe.session.user, "enabled"):
        frappe.throw(_("Sign in to view your dashboard."), frappe.PermissionError)
    workspace = membership.workspace_for(organization)
    if not workspace:
        frappe.throw(_("This business is not in your workspace."), frappe.PermissionError)
    try:
        period = int(period)
    except (TypeError, ValueError):
        frappe.throw(_("Choose a valid reporting period."))
    if period not in PERIODS:
        frappe.throw(_("Choose a valid reporting period."))
    org = frappe.db.get_value("Organization", organization, ["timezone", "organization_name"], as_dict=True)
    zone = ZoneInfo(org.timezone or "UTC")
    today = datetime.now(zone).date()
    start = today - timedelta(days=period - 1)
    previous_start = start - timedelta(days=period)
    future_end = today + timedelta(days=6)
    rows = []
    while True:
        page = frappe.get_all(
            "Appointment", filters={"organization": organization, "appointment_date": ["between", [previous_start, future_end]]},
            fields=["organization", "appointment_date", "start_time", "end_time", "status", "client_email", "service", "provider", "location", "amount_paid"],
            order_by="appointment_date asc, name asc", start=len(rows), limit_page_length=1000,
        )
        rows.extend(page)
        if len(page) < 1000:
            break
    own_providers = set(booking_access.providers())
    scopes = booking_access.reception_scope()
    rows = [row for row in rows if _visible(row, workspace, own_providers, scopes)]
    services = {r.name: r for r in frappe.get_all("Service", filters={"organization": organization}, fields=["name", "service_name", "price"])}
    provider_ids = list({row.provider for row in rows})
    location_ids = list({row.location for row in rows})
    provider_names = {r.name: (r.display_name or r.provider_name or r.name) for r in frappe.get_all("Provider", filters={"name": ["in", provider_ids or [""]]}, fields=["name", "display_name", "provider_name"])}
    location_names = {r.name: r.location_name for r in frappe.get_all("Location", filters={"name": ["in", location_ids or [""]]}, fields=["name", "location_name"])}
    names = {key: value.service_name for key, value in services.items()}
    prices = {key: value.price for key, value in services.items()}
    include_money = bool(workspace["is_manager"])
    current = _rollup(rows, start, today, names, prices, provider_names, location_names, include_money)
    previous = _rollup(rows, previous_start, start - timedelta(days=1), names, prices, provider_names, location_names, include_money)
    upcoming = [row for row in rows if today <= row.appointment_date <= future_end and row.status in ("Pending", "Confirmed")]
    today_rows = [row for row in upcoming if row.appointment_date == today and row.status == "Confirmed"]
    return {
        "business_name": org.organization_name, "role": workspace["role"], "timezone": org.timezone,
        "period": period, "start": start.isoformat(), "end": today.isoformat(),
        "today": today.isoformat(), "current": current,
        "previous": {key: previous[key] for key in ("total", "active", "completed", "cancelled", "no_show", "booked_hours")},
        "today_confirmed": len(today_rows), "next_seven_days": len(upcoming),
        "financial_note": _("Catalog value uses current service prices and is an estimate, not collected revenue.") if include_money else None,
    }
