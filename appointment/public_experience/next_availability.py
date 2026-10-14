"""Live "next free time" facts for a published website (the owner setting `booking.liveAvailability`).

The answer has counts and start times only: the next free start per business, per service and per
provider, and how many times are still free today. It never has a customer, a booking or a note.
It reads the same slot rules as the scheduler (`scheduler.booking.open_slots`) for the next 7 days,
and only for offerings that the scheduler itself would show to a guest (`offering(public=True)`).

The owner turns it on in website setup; the setting goes live with the next publish, because the
endpoint reads the published release. New sites start with it off. The showcase seeder turns it on.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import frappe
import pytz

SETTING = "liveAvailability"
CACHE_SECONDS = 60
DAYS = 7
DEFAULT_ZONE = "Africa/Addis_Ababa"
_CLOSED = {"enabled": False}


def enabled(booking: object) -> bool:
    """The owner setting in a site's booking options (draft or release). Off unless it is exactly true."""
    return isinstance(booking, dict) and booking.get(SETTING) is True


def _public_offerings(organization: str | None, provider: str | None):
    """The offerings a guest can book on this business's scheduler, as resolved scheduler parts."""
    from appointment.scheduler.booking import offering

    if organization:
        if not frappe.db.get_value("Organization", organization, "enable_public_booking"):
            return []
        services = frappe.get_all("Service", filters={"organization": organization}, pluck="name")
        names = frappe.get_all("EventType", filters={"is_active": 1, "service": ["in", services]}, pluck="name") if services else []
    elif provider:
        if not frappe.db.get_value("Provider", provider, "enable_public_booking"):
            return []
        names = frappe.get_all("EventType", filters={"is_active": 1, "provider": provider}, pluck="name")
    else:
        return []
    found = []
    documents: dict = {}
    for name in sorted(names):
        try:
            found.append(offering(name, public=True, documents=documents))
        except (frappe.PermissionError, frappe.ValidationError, frappe.DoesNotExistError):
            frappe.clear_messages()
    return found


def _free_starts(parts, day, now):
    """Free start instants (naive UTC) of one offering on one local day, after `now`."""
    from appointment.scheduler.booking import open_slots

    try:
        rows = open_slots(parts, str(day))["all_available_slots_for_data"]
    except frappe.ValidationError:
        frappe.clear_messages()
        return []
    starts = []
    for row in rows:
        if not row.get("available"):
            continue
        start = datetime.fromisoformat(row["start_time"].removesuffix("Z"))
        if start > now:
            starts.append(start)
    return starts


def _iso(value: datetime) -> str:
    return value.replace(microsecond=0).isoformat() + "Z"


def compute(organization: str | None, provider: str | None, now: datetime | None = None) -> dict:
    """The availability summary. `now` is naive UTC (tests pass a fixed clock)."""
    now = now or datetime.now(timezone.utc).replace(tzinfo=None)
    offerings = _public_offerings(organization, provider)
    if not offerings:
        return {"enabled": True, "timezone": DEFAULT_ZONE, "next": None, "todayLeft": 0, "services": {}, "providers": {}}
    zone_name = offerings[0].location.timezone or DEFAULT_ZONE
    zone = pytz.timezone(zone_name)
    today = pytz.UTC.localize(now).astimezone(zone).date()
    services: dict[str, dict] = {}
    providers: dict[str, dict] = {}
    today_free: set[tuple[str, datetime]] = set()
    best = None
    for parts in offerings:
        event, service, _location, person, _business = parts
        who = person.name if person else (event.resource or "")
        for offset in range(DAYS):
            day = today + timedelta(days=offset)
            starts = _free_starts(parts, day, now)
            if offset == 0:
                today_free.update((who, start) for start in starts)
                for bucket, key in ((services, service.name), (providers, who)):
                    if key:
                        bucket.setdefault(key, {"next": None, "todayLeft": 0, "_today": set()})["_today"].update(starts)
            if not starts:
                continue
            first = min(starts)
            for bucket, key in ((services, service.name), (providers, who)):
                if not key:
                    continue
                row = bucket.setdefault(key, {"next": None, "todayLeft": 0, "_today": set()})
                if row["next"] is None or first < row["next"]:
                    row["next"] = first
            if best is None or first < best[0]:
                best = (first, service.name, who, event.name)
            break
    for bucket in (services, providers):
        for row in bucket.values():
            row["todayLeft"] = len(row.pop("_today"))
            row["next"] = _iso(row["next"]) if row["next"] else None
    return {
        "enabled": True,
        "timezone": zone_name,
        "next": {"start": _iso(best[0]), "service": best[1], "provider": best[2] or None, "offering": best[3]} if best else None,
        "todayLeft": len(today_free),
        "services": services,
        "providers": providers,
    }


def for_context(context) -> dict:
    """The cached summary for a resolved, published site; `{"enabled": False}` when the owner has it off."""
    from appointment.public_experience.resolver import public_snapshot

    snapshot = public_snapshot(context.release)
    if not enabled(snapshot.get("booking")):
        return dict(_CLOSED)
    key = f"public_experience:next_availability:{context.public_site}:{context.release}"
    try:
        cached = frappe.cache.get_value(key)
    except Exception:
        cached = None
    if isinstance(cached, dict):
        return cached
    result = compute(context.organization, context.provider)
    result["generatedAt"] = _iso(datetime.now(timezone.utc).replace(tzinfo=None))
    try:
        frappe.cache.set_value(key, result, expires_in_sec=CACHE_SECONDS)
    except Exception:
        pass
    return result
