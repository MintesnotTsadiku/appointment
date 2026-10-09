"""Calculations over rows and offerings already scoped by the report authority."""
from collections import Counter, defaultdict
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
import frappe
from frappe import _
from appointment.scheduler import booking

BOOKED = {"Pending", "Confirmed", "Completed"}
CAPACITY_BOOKED = BOOKED | {"No Show"}
NO_SHOW_DENOMINATOR = {"Completed", "No Show"}


# Codes whose UI label differs only by case. The Translation table compares text without
# case, so the code itself cannot carry its own translation; use the label's.
CODE_LABELS = {"No Show": "No show", "Gallery Collection": "Gallery collection"}


def _code_label(code):
    return _(CODE_LABELS.get(code, code))


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
    if row.get('ends_at'):
        return row.ends_at < local_now.astimezone(timezone.utc).replace(tzinfo=None)
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



def _rollup(rows, start, end, local_now, names, prices, provider_names, location_names, money):
    selected = [row for row in rows if start <= row.appointment_date <= end]
    statuses = Counter(row.status for row in selected)
    booked = [row for row in selected if row.status in BOOKED]
    # A linked customer profile identifies the customer; unlinked rows fall back to the email.
    customers = Counter(row.get("customer") or row.client_email.lower() for row in booked if row.get("customer") or row.client_email)
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
            if row.provider:  # Resource-only bookings have no provider.
                providers[row.provider] += 1
            locations[row.location] += 1
            booked_minutes += max(0,(row.ends_at-row.starts_at).total_seconds()/60) if row.get('starts_at') and row.get('ends_at') else max(0, _minute(row.end_time) - _minute(row.start_time))
            instant=row.starts_at.replace(tzinfo=timezone.utc).astimezone(local_now.tzinfo) if row.get('starts_at') else None
            heatmap[(instant.weekday() if instant else row.appointment_date.weekday(), instant.hour if instant else int(str(row.start_time).split(':')[0]))] += 1
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
        "services": [{"id": key, "name": names.get(key) or _("Service"), "count": value} for key, value in services.most_common()],
        "providers": [{"id": key, "name": provider_names.get(key) or _("Provider"), "count": value} for key, value in providers.most_common()],
        "locations": [{"id": key, "name": location_names.get(key) or _("Location"), "count": value} for key, value in locations.most_common()],
        "heatmap": [{"weekday": day, "hour": hour, "count": value} for (day, hour), value in sorted(heatmap.items())],
    }
    if money:
        result.update(catalog_value=round(catalog, 2), recorded_payments=round(payments, 2))
    return result



def _working_minutes(offerings, start, end, business_zone, return_intervals=False, documents=None):
    docs, intervals = documents if documents is not None else {}, defaultdict(list)
    for row in offerings:
        for doctype, name in (("Service", row.service), ("Provider", row.provider), ("Location", row.location)):
            if (doctype, name) not in docs:
                docs[(doctype, name)] = frappe.get_doc(doctype, name)
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
    return intervals if return_intervals else _minutes_by_provider(intervals)



def _occupied_minutes(rows, start, end, zone, buffers):
    lower = datetime.combine(start, time.min, zone).astimezone(timezone.utc).replace(tzinfo=None)
    upper = datetime.combine(end + timedelta(days=1), time.min, zone).astimezone(timezone.utc).replace(tzinfo=None)
    intervals = defaultdict(list)
    for row in rows:
        if row.status not in CAPACITY_BOOKED or not start <= row.appointment_date <= end or not row.provider:
            continue  # Provider utilization counts only bookings with a provider.
        if row.occupied_from and row.occupied_until:
            opened, closed = row.occupied_from, row.occupied_until
        else:
            continue  # Missing historical occupied intervals cannot be reconstructed from current buffers.
        if min(closed, upper) > max(opened, lower):
            intervals[row.provider].append((max(opened, lower), min(closed, upper)))
    return _minutes_by_provider(intervals)



def _utilization(rows, offerings, start, end, zone, buffers, documents=None):
    capacity = _working_minutes(offerings, start, end, zone, documents=documents)
    occupied = _occupied_minutes(rows, start, end, zone, buffers)
    return {
        "available": capacity > 0, "booked_minutes": occupied, "capacity_minutes": capacity,
        "booked_hours": round(occupied / 60, 1), "available_hours": round(capacity / 60, 1),
        "rate": round(occupied / capacity * 100, 1) if capacity else None,
        "statuses": sorted(CAPACITY_BOOKED), "includes_buffers": True, "schedule_basis": "current",
    }

