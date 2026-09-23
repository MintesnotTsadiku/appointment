"""Permission-scoped booking analytics and aggregate CSV export."""

import csv
import io
from collections import Counter, defaultdict
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import frappe
from frappe import _

from appointment.scheduler import booking, booking_access, membership

PERIODS = {7, 30, 90}
BOOKED = {"Pending", "Confirmed", "Completed"}
CAPACITY_BOOKED = BOOKED | {"No Show"}
NO_SHOW_DENOMINATOR = {"Completed", "No Show"}


def _wall_time(value):
    parts = [int(part) for part in str(value).split(":")]
    return time(parts[0], parts[1], parts[2] if len(parts) > 2 else 0)


def _minute(value):
    parts = str(value).split(":")
    return int(parts[0]) * 60 + int(parts[1])


def _merge_intervals(intervals):
    merged = []
    for start, end in sorted((start, end) for start, end in intervals if end > start):
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return [(start, end) for start, end in merged]


def _interval_minutes(intervals):
    total = 0
    for start, end in _merge_intervals(intervals):
        value = end - start
        total += value.total_seconds() / 60 if hasattr(value, "total_seconds") else value
    return int(round(total))


def _minutes_by_provider(intervals):
    return sum(_interval_minutes(rows) for rows in intervals.values())


def _period_bounds(now, zone, period):
    local_now = now.astimezone(zone)
    return local_now, local_now.date() - timedelta(days=period - 1), local_now.date()


def _elapsed(row, local_now):
    return row.appointment_date < local_now.date() or (
        row.appointment_date == local_now.date()
        and _minute(row.end_time) <= local_now.hour * 60 + local_now.minute
    )


def _no_show(rows, local_now):
    resolved = [row for row in rows if row.status in NO_SHOW_DENOMINATOR and _elapsed(row, local_now)]
    numerator, denominator = sum(row.status == "No Show" for row in resolved), len(resolved)
    return {
        "available": denominator > 0, "numerator": numerator, "denominator": denominator,
        "rate": round(numerator / denominator * 100, 1) if denominator else None,
        "statuses": {"numerator": ["No Show"], "denominator": ["Completed", "No Show"]},
    }


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


def _rollup(rows, start, end, local_now, names, prices, provider_names, location_names, money):
    selected = [row for row in rows if start <= row.appointment_date <= end]
    statuses = Counter(row.status for row in selected)
    booked = [row for row in selected if row.status in BOOKED]
    customers = Counter(row.client_email.lower() for row in booked if row.client_email)
    daily = defaultdict(lambda: {"bookings": 0, "completed": 0, "cancelled": 0, "no_show": 0})
    services, providers, locations, heatmap = Counter(), Counter(), Counter(), Counter()
    catalog = payments = booked_minutes = 0
    for row in selected:
        record = daily[row.appointment_date.isoformat()]
        record["bookings"] += 1
        if row.status == "Completed":
            record["completed"] += 1
        elif row.status == "Cancelled":
            record["cancelled"] += 1
        elif row.status == "No Show":
            record["no_show"] += 1
        if row.status in BOOKED:
            services[row.service] += 1
            providers[row.provider] += 1
            locations[row.location] += 1
            booked_minutes += max(0, _minute(row.end_time) - _minute(row.start_time))
            heatmap[(row.appointment_date.weekday(), int(str(row.start_time).split(":")[0]))] += 1
            if money:
                catalog += float(prices.get(row.service) or 0)
        if money:
            payments += float(row.amount_paid or 0)
    result = {
        "total": len(selected), "active": len(booked), "completed": statuses["Completed"],
        "confirmed": statuses["Confirmed"], "cancelled": statuses["Cancelled"],
        "no_show": statuses["No Show"], "unique_customers": len(customers),
        "repeat_customers": sum(count > 1 for count in customers.values()),
        "booked_hours": round(booked_minutes / 60, 1), "no_show_rate": _no_show(selected, local_now),
        "trend": [{"date": (start + timedelta(days=i)).isoformat(), **daily[(start + timedelta(days=i)).isoformat()]}
                  for i in range((end - start).days + 1)],
        "services": [{"name": names.get(key) or _("Service"), "count": value} for key, value in services.most_common(6)],
        "providers": [{"name": provider_names.get(key) or _("Provider"), "count": value} for key, value in providers.most_common(8)],
        "locations": [{"name": location_names.get(key) or _("Location"), "count": value} for key, value in locations.most_common(8)],
        "heatmap": [{"weekday": day, "hour": hour, "count": value} for (day, hour), value in sorted(heatmap.items())],
    }
    if money:
        result.update(catalog_value=round(catalog, 2), recorded_payments=round(payments, 2))
    return result


def _offerings(organization, service_ids, workspace, own_providers, scopes):
    if not service_ids:
        return []
    events = frappe.get_all("EventType", filters={"service": ["in", service_ids], "is_active": 1},
                            fields=["service", "provider", "location"], limit_page_length=0)
    providers = {row.provider for row in events}
    locations = {row.location for row in events}
    active_providers = set(frappe.get_all("Provider", filters={"name": ["in", list(providers) or [""]], "is_active": 1}, pluck="name", limit_page_length=0))
    active_locations = set(frappe.get_all("Location", filters={"name": ["in", list(locations) or [""]], "organization": organization, "is_active": 1}, pluck="name", limit_page_length=0))
    members = set(frappe.get_all("Provider Organization", filters={
        "parent": ["in", list(providers) or [""]], "parenttype": "Provider",
        "organization": organization, "status": "Active",
    }, pluck="parent", limit_page_length=0))
    visible = []
    for row in events:
        row.organization = organization
        if row.provider in active_providers & members and row.location in active_locations and _visible(row, workspace, own_providers, scopes):
            visible.append(row)
    return visible


def _working_minutes(offerings, start, end, business_zone):
    docs, intervals = {}, defaultdict(list)
    for row in offerings:
        for doctype, name in (("Service", row.service), ("Provider", row.provider), ("Location", row.location)):
            docs.setdefault((doctype, name), frappe.get_doc(doctype, name))
    for offset in range((end - start).days + 1):
        day = start + timedelta(days=offset)
        lower = datetime.combine(day, time.min, business_zone).astimezone(timezone.utc).replace(tzinfo=None)
        upper = datetime.combine(day + timedelta(days=1), time.min, business_zone).astimezone(timezone.utc).replace(tzinfo=None)
        for row in offerings:
            service, provider, location = docs[("Service", row.service)], docs[("Provider", row.provider)], docs[("Location", row.location)]
            location_zone = ZoneInfo(location.timezone or str(business_zone))
            for local_day in (day - timedelta(days=1), day, day + timedelta(days=1)):
                for hours in booking.effective_hours(service, location, provider, local_day):
                    opened = datetime.combine(local_day, _wall_time(hours["start_time"]), location_zone).astimezone(timezone.utc).replace(tzinfo=None)
                    closed = datetime.combine(local_day, _wall_time(hours["end_time"]), location_zone).astimezone(timezone.utc).replace(tzinfo=None)
                    if min(closed, upper) > max(opened, lower):
                        intervals[row.provider].append((max(opened, lower), min(closed, upper)))
    return _minutes_by_provider(intervals)


def _occupied_minutes(rows, start, end, zone, buffers):
    lower = datetime.combine(start, time.min, zone).astimezone(timezone.utc).replace(tzinfo=None)
    upper = datetime.combine(end + timedelta(days=1), time.min, zone).astimezone(timezone.utc).replace(tzinfo=None)
    intervals = defaultdict(list)
    for row in rows:
        if row.status not in CAPACITY_BOOKED or not start <= row.appointment_date <= end:
            continue
        if row.occupied_from and row.occupied_until:
            opened, closed = row.occupied_from, row.occupied_until
        else:
            booking_zone = ZoneInfo(row.booking_timezone or str(zone))
            opened = datetime.combine(row.appointment_date, _wall_time(row.start_time), booking_zone).astimezone(timezone.utc).replace(tzinfo=None)
            closed = datetime.combine(row.appointment_date, _wall_time(row.end_time), booking_zone).astimezone(timezone.utc).replace(tzinfo=None)
            before, after = buffers.get(row.service, (0, 0))
            opened, closed = opened - timedelta(minutes=before), closed + timedelta(minutes=after)
        if min(closed, upper) > max(opened, lower):
            intervals[row.provider].append((max(opened, lower), min(closed, upper)))
    return _minutes_by_provider(intervals)


def _utilization(rows, offerings, start, end, zone, buffers):
    capacity = _working_minutes(offerings, start, end, zone)
    occupied = _occupied_minutes(rows, start, end, zone, buffers)
    return {
        "available": capacity > 0, "booked_minutes": occupied, "capacity_minutes": capacity,
        "booked_hours": round(occupied / 60, 1), "available_hours": round(capacity / 60, 1),
        "rate": round(occupied / capacity * 100, 1) if capacity else None,
        "statuses": sorted(CAPACITY_BOOKED), "includes_buffers": True, "schedule_basis": "current",
    }


def _authorize(organization, period):
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
    return workspace, period


def _report(organization, period):
    workspace, period = _authorize(organization, period)
    org = frappe.db.get_value("Organization", organization, ["timezone", "organization_name"], as_dict=True)
    zone = ZoneInfo(org.timezone or "UTC")
    local_now, start, today = _period_bounds(datetime.now(timezone.utc), zone, period)
    previous_start, future_end = start - timedelta(days=period), today + timedelta(days=6)
    rows = []
    while True:
        page = frappe.get_all("Appointment", filters={"organization": organization, "appointment_date": ["between", [previous_start, future_end]]},
            fields=["organization", "appointment_date", "start_time", "end_time", "status", "client_email", "service", "provider", "location", "amount_paid", "occupied_from", "occupied_until", "booking_timezone"],
            order_by="appointment_date asc, name asc", start=len(rows), limit_page_length=1000)
        rows.extend(page)
        if len(page) < 1000:
            break
    own_providers, scopes = set(booking_access.providers()), booking_access.reception_scope()
    rows = [row for row in rows if _visible(row, workspace, own_providers, scopes)]
    services = {row.name: row for row in frappe.get_all("Service", filters={"organization": organization},
        fields=["name", "service_name", "price", "buffer_before", "buffer_after", "is_active"], limit_page_length=0)}
    provider_ids, location_ids = list({row.provider for row in rows}), list({row.location for row in rows})
    provider_names = {row.name: (row.display_name or row.provider_name or row.name) for row in frappe.get_all("Provider", filters={"name": ["in", provider_ids or [""]]}, fields=["name", "display_name", "provider_name"], limit_page_length=0)}
    location_names = {row.name: row.location_name for row in frappe.get_all("Location", filters={"name": ["in", location_ids or [""]]}, fields=["name", "location_name"], limit_page_length=0)}
    names, prices = ({key: row.service_name for key, row in services.items()}, {key: row.price for key, row in services.items()})
    buffers = {key: (int(row.buffer_before or 0), int(row.buffer_after or 0)) for key, row in services.items()}
    offerings = _offerings(organization, [key for key, row in services.items() if row.is_active], workspace, own_providers, scopes)
    money = bool(workspace["is_manager"])
    current = _rollup(rows, start, today, local_now, names, prices, provider_names, location_names, money)
    previous = _rollup(rows, previous_start, start - timedelta(days=1), local_now, names, prices, provider_names, location_names, money)
    current["utilization"] = _utilization(rows, offerings, start, today, zone, buffers)
    previous["utilization"] = _utilization(rows, offerings, previous_start, start - timedelta(days=1), zone, buffers)
    upcoming = [row for row in rows if today <= row.appointment_date <= future_end and row.status in ("Pending", "Confirmed")]
    return {
        "business_name": org.organization_name, "role": workspace["role"], "timezone": org.timezone or "UTC",
        "period": period, "start": start.isoformat(), "end": today.isoformat(), "today": today.isoformat(),
        "current": current, "previous": {key: previous[key] for key in ("total", "active", "completed", "cancelled", "no_show", "booked_hours", "no_show_rate", "utilization")},
        "today_confirmed": sum(row.appointment_date == today and row.status == "Confirmed" for row in upcoming),
        "next_seven_days": len(upcoming),
        "definitions": {
            "no_show": "No Show / (Completed + No Show), after appointment end in the business timezone. Cancellations and unresolved bookings are excluded.",
            "utilization": "Union of occupied provider intervals / union of current eligible provider working windows. Pending, Confirmed, Completed and No Show consume capacity; cancellations do not. Service buffers count.",
            "schedule_limit": "Past schedules are not snapshotted, so historical capacity uses today's hours, holidays, offerings and assignments. Status is the latest recorded value.",
        },
        "financial_note": _("Catalog value uses current service prices and is an estimate, not collected revenue.") if money else None,
    }


@frappe.whitelist(methods=["GET"])
def overview(organization: str, period: int = 30):
    return _report(organization, period)


def _csv_safe(value):
    text = "" if value is None else str(value)
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) else text


def _csv_rows(report):
    current = report["current"]
    no_show, utilization = current["no_show_rate"], current["utilization"]
    rows = [["Section", "Metric", "Value"]]
    rows += [["Scope", key, value] for key, value in (
        ("Business", report["business_name"]), ("Role scope", report["role"]),
        ("Period", f'{report["start"]} to {report["end"]}'), ("Timezone", report["timezone"]),
        ("No-show definition", report["definitions"]["no_show"]),
        ("Utilization definition", report["definitions"]["utilization"]),
        ("Known limit", report["definitions"]["schedule_limit"]),
    )]
    metrics = [
        ("All bookings", current["total"]), ("Completed", current["completed"]), ("Cancelled", current["cancelled"]),
        ("No Show", current["no_show"]), ("No-show numerator", no_show["numerator"]),
        ("No-show denominator", no_show["denominator"]), ("No-show rate (%)", no_show["rate"] if no_show["available"] else "Unavailable"),
        ("Booked capacity hours", utilization["booked_hours"]), ("Available capacity hours", utilization["available_hours"]),
        ("Utilization (%)", utilization["rate"] if utilization["available"] else "Unavailable"),
    ]
    if report["role"] in (membership.ROLE_OWNER, membership.ROLE_MANAGER):
        metrics += [("Catalog value estimate (ETB)", current.get("catalog_value", 0)), ("Recorded payments (ETB)", current.get("recorded_payments", 0))]
    rows += [["Summary", key, value] for key, value in metrics]
    rows += [["Trend", item["date"], f'bookings={item["bookings"]}; completed={item["completed"]}; cancelled={item["cancelled"]}; no_show={item["no_show"]}'] for item in current["trend"]]
    for key, title in (("services", "Service"), ("providers", "Provider"), ("locations", "Location")):
        rows += [[title, item["name"], item["count"]] for item in current[key]]
    return [[_csv_safe(cell) for cell in row] for row in rows]


@frappe.whitelist(methods=["GET"])
def export_csv(organization: str, period: int = 30):
    report = _report(organization, period)
    stream = io.StringIO(newline="")
    csv.writer(stream, lineterminator="\r\n").writerows(_csv_rows(report))
    frappe.response["type"] = "download"
    frappe.response["filename"] = f'appointment-insights-{report["start"]}-{report["end"]}.csv'
    frappe.response["filecontent"] = "\ufeff" + stream.getvalue()
    frappe.response["display_content_as"] = "attachment"
    frappe.response["content_type"] = "text/csv; charset=utf-8"
