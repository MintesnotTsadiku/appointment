"""Year in review: a business's year in numbers, for the owner to share.

The numbers come from the same booking rows, scope and status rules as Insights
(`scheduler.analytics`): the same owner scope, `BOOKED` statuses for bookings and
`_rollup` for customers, services, providers and the weekday/hour heatmap. The
analytics layer does not exclude any records, so this module does not either.

Periods: a calendar year, or an Ethiopian year (Meskerem 1 to Pagume 5/6), each
complete or "so far". A stat is left out when its data is too thin to mean anything.
See docs/growth/SHOWOFF.md.
"""

from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import frappe
from frappe import _

from appointment.growth import ethiopian_calendar as ec
from appointment.growth.settings import growth
from appointment.growth.sharing import require_business
from appointment.scheduler.analytics_calculations import BOOKED, _rollup

#: Fewer bookings than this and the review is "not ready" for the period.
MIN_BOOKINGS = 10
#: Busiest day and hour need this many bookings to be more than noise.
MIN_PATTERN_BOOKINGS = 20
#: Returning-client rate needs this many clients.
MIN_CLIENTS = 10
#: Amharic share needs this many bookings with a recorded language, and this coverage.
MIN_LANGUAGE_ROWS = 20
MIN_LANGUAGE_COVERAGE = 0.3
FIELDS = ["appointment_date", "start_time", "end_time", "status", "client_email", "customer", "service",
          "provider", "location", "starts_at", "ends_at", "customer_language"]


# ---------------------------------------------------------------------------
# Periods
# ---------------------------------------------------------------------------
def ethiopian_year_bounds(year: int) -> tuple[date, date]:
    """Meskerem 1 to the last day of Pagume of Ethiopian `year`, as Gregorian dates."""
    return ec.to_gregorian(year, 1, 1), ec.to_gregorian(year + 1, 1, 1) - timedelta(days=1)


def periods(today: date) -> list[dict]:
    """The four choices, most recently ended complete period first, then the years so far."""
    ethiopian = ec.to_ethiopian(today).year
    complete = [
        dict(key=f"ec-{ethiopian - 1}", calendar="ethiopian", year=ethiopian - 1, so_far=False, bounds=ethiopian_year_bounds(ethiopian - 1)),
        dict(key=f"gc-{today.year - 1}", calendar="gregorian", year=today.year - 1, so_far=False, bounds=(date(today.year - 1, 1, 1), date(today.year - 1, 12, 31))),
    ]
    complete.sort(key=lambda row: row["bounds"][1], reverse=True)
    running = [
        dict(key=f"ec-{ethiopian}-so-far", calendar="ethiopian", year=ethiopian, so_far=True, bounds=(ethiopian_year_bounds(ethiopian)[0], today)),
        dict(key=f"gc-{today.year}-so-far", calendar="gregorian", year=today.year, so_far=True, bounds=(date(today.year, 1, 1), today)),
    ]
    rows = complete + running
    for row in rows:
        start, end = row.pop("bounds")
        row.update(start=start.isoformat(), end=end.isoformat())
    return rows


def period_label(period: dict, lang: str) -> str:
    year = period["year"]
    if period["calendar"] == "ethiopian":
        text = f"{year} ዓ.ም." if lang == "am" else _("Ethiopian year {0}", lang=lang).format(year)
    else:
        text = f"{year} እ.ኤ.አ." if lang == "am" else str(year)
    return _("{0} so far", lang=lang).format(text) if period["so_far"] else text


def _business_today(owner) -> date:
    zone = ZoneInfo(_timezone(owner))
    return datetime.now(zone).date()


def _timezone(owner) -> str:
    if owner.organization:
        return owner.timezone or "Africa/Addis_Ababa"
    return (frappe.db.get_value("Location", {"independent_provider": owner.provider}, "timezone")
            or owner.timezone or "Africa/Addis_Ababa")


# ---------------------------------------------------------------------------
# Numbers
# ---------------------------------------------------------------------------
def _scope(owner) -> dict:
    # Same record scope as `analytics._report`.
    if owner.organization:
        return {"organization": owner.organization}
    return {"provider": owner.provider, "organization": ["is", "not set"]}


def _identity(row):
    return row.get("customer") or (row.client_email or "").lower() or None


def compute(owner, start: date, end: date) -> dict:
    """The review numbers for `owner` between `start` and `end` (inclusive)."""
    scope = _scope(owner)
    zone = ZoneInfo(_timezone(owner))
    rows = frappe.get_all("Appointment", filters={**scope, "appointment_date": ["between", [start, end]]},
                          fields=FIELDS, order_by="appointment_date asc", limit_page_length=0)
    earlier = frappe.get_all("Appointment", filters={**scope, "appointment_date": ["<", start], "status": ["in", list(BOOKED)]},
                             fields=["customer", "client_email"], limit_page_length=0)
    names = dict(frappe.get_all("Service", filters={"name": ["in", list({row.service for row in rows}) or [""]]},
                                fields=["name", "service_name"], as_list=True))
    provider_names = {row.name: row.display_name or row.provider_name or row.name for row in frappe.get_all(
        "Provider", filters={"name": ["in", list({row.provider for row in rows if row.provider}) or [""]]},
        fields=["name", "display_name", "provider_name"])}
    rollup = _rollup(rows, start, end, datetime.now(zone), names, {}, provider_names, {}, False)

    booked = [row for row in rows if row.status in BOOKED]
    visits = Counter(identity for identity in map(_identity, booked) if identity)
    before = {identity for identity in map(_identity, earlier) if identity}
    clients = len(visits)
    bookings = rollup["active"]
    stats = dict(bookings=bookings, clients=clients)

    if before and clients:
        stats["new_clients"] = sum(identity not in before for identity in visits)
    if clients >= MIN_CLIENTS:
        returning = sum(count > 1 or identity in before for identity, count in visits.items())
        stats["returning_rate"] = round(returning / clients * 100)
    if bookings >= MIN_PATTERN_BOOKINGS:
        days, hours = Counter(), Counter()
        for cell in rollup["heatmap"]:
            days[cell["weekday"]] += cell["count"]
            hours[cell["hour"]] += cell["count"]
        weekday, count = days.most_common(1)[0]
        stats["busiest_day"] = dict(weekday=weekday, count=count)
        hour, count = hours.most_common(1)[0]
        stats["busiest_hour"] = dict(hour=hour, count=count)
    if len(rollup["services"]) >= 2 and bookings >= MIN_BOOKINGS:
        top = rollup["services"][0]
        stats["top_service"] = dict(name=top["name"], count=top["count"], share=round(top["count"] / bookings * 100))
    if owner.organization and len(rollup["providers"]) >= 2 and bookings >= MIN_BOOKINGS:
        top = rollup["providers"][0]
        stats["top_provider"] = dict(name=top["name"], count=top["count"])
    languages = Counter(row.customer_language for row in booked if row.customer_language in ("en", "am"))
    recorded = sum(languages.values())
    if recorded >= MIN_LANGUAGE_ROWS and bookings and recorded / bookings >= MIN_LANGUAGE_COVERAGE and languages["am"]:
        stats["amharic_share"] = round(languages["am"] / recorded * 100)
    return dict(ready=bookings >= MIN_BOOKINGS, start=start.isoformat(), end=end.isoformat(), stats=stats)


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
def _resolve(owner, period_key: str | None):
    choices = periods(_business_today(owner))
    if period_key:
        period = next((row for row in choices if row["key"] == period_key), None)
        if not period:
            frappe.throw(_("Choose a period from the list."))
        return period, choices
    return None, choices


def _require_enabled():
    if not growth().get("year_review_enabled"):
        frappe.throw(_("Year in review is not available right now."), frappe.PermissionError)


@frappe.whitelist(methods=["GET"])
def summary(business: str, period: str | None = None):
    """Periods, the chosen (or default) period and its numbers."""
    owner = require_business(business)
    enabled = bool(growth().get("year_review_enabled"))
    chosen, choices = _resolve(owner, period)
    if not enabled:
        return dict(enabled=False, periods=choices, period=None, review=None)
    if chosen is None:
        # The most recent complete period with enough bookings, else the fullest year so far.
        reviews = {row["key"]: compute(owner, date.fromisoformat(row["start"]), date.fromisoformat(row["end"])) for row in choices}
        complete = [row for row in choices if not row["so_far"] and reviews[row["key"]]["ready"]]
        running = sorted((row for row in choices if row["so_far"]), key=lambda row: -reviews[row["key"]]["stats"]["bookings"])
        chosen = (complete or running)[0]
        review = reviews[chosen["key"]]
    else:
        review = compute(owner, date.fromisoformat(chosen["start"]), date.fromisoformat(chosen["end"]))
    for row in choices:
        row["labels"] = dict(en=period_label(row, "en"), am=period_label(row, "am"))
    from appointment.growth.sharing import profile

    business_profile = profile(owner, "en")
    captions = {lang: _("{0}: our {1} in numbers. {2} clients served. Thank you for booking with us!", lang=lang).format(
        business_profile["name"], period_label(chosen, lang), f"{review['stats']['clients']:,}") for lang in ("en", "am")}
    return dict(enabled=True, periods=choices, period=chosen["key"], review=review, captions=captions,
                business=dict(name=business_profile["name"], url=business_profile["url"], short=business_profile["short"]))


@frappe.whitelist(methods=["GET"])
def image(business: str, period: str, lang: str = "en", size: str = "portrait"):
    """The shareable PNG (portrait 1080x1350 or story 1080x1920) in English or Amharic."""
    from appointment.growth.year_review_image import SIZES, render

    owner = require_business(business)
    _require_enabled()
    lang = "am" if lang == "am" else "en"
    if size not in SIZES:
        frappe.throw(_("Choose a supported image size."))
    chosen, _choices = _resolve(owner, period)
    review = compute(owner, date.fromisoformat(chosen["start"]), date.fromisoformat(chosen["end"]))
    if not review["ready"]:
        frappe.throw(_("There are not enough bookings in this period for a review yet."))
    content = render(owner, chosen, review, lang, size)
    frappe.response.filename = f"year-in-review-{chosen['key']}-{lang}-{size}.png"
    frappe.response.filecontent = content
    # "download" serves the PNG with its image type; "binary" would force an octet-stream attachment.
    frappe.response.type = "download"
    frappe.response.display_content_as = "inline"
