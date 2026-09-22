"""Phase 5 fixture helpers (assessment-only, no product code changes).

Placed outside the app package so the runner can import it via PYTHONPATH. It
prepares a bookable business via the existing deterministic qa_fixtures and, for
the management journey, a synthetic booking whose product-supplied reschedule
link is returned as a manifest placeholder. The evaluated customer still opens
the link and resubmits through the visible UI; this module only prepares data
and computes URLs.
"""

from __future__ import annotations

from urllib.parse import urlsplit, urlunsplit

import frappe
from frappe.utils import add_days, nowdate

CUSTOMER_BASE = "http://localhost:49510"


def _first(result):
    if isinstance(result, tuple):
        return result[0]
    return result


def _duration_and_slots():
    from appointment import qa_fixtures
    from appointment.api.personal_meet import (
        get_organization_meeting_windows,
        get_time_slots,
    )

    values = qa_fixtures.fixture_values()
    windows = _first(
        get_organization_meeting_windows(values["qa_org_slug"], values["qa_service_slug"])
    )
    durations = (windows or {}).get("durations") or []
    duration_id = (durations[0].get("id") if durations else values["qa_duration_id"])
    org_id = (windows or {}).get("organization_id")
    service_id = (windows or {}).get("service_id") or values["qa_service_id"]
    date = add_days(nowdate(), 1)
    slots = _first(
        get_time_slots(
            duration_id=duration_id,
            date=date,
            user_timezone_offset="180",
            organization_id=org_id,
            service_id=service_id,
        )
    )
    return values, windows, duration_id, org_id, service_id, date, slots or {}


def values(manifest=None):
    """Prepare one synthetic booking and expose its reschedule links."""
    from appointment import qa_fixtures
    from appointment.api.personal_meet import book_time_slot

    values, windows, duration_id, org_id, service_id, date, slots = _duration_and_slots()
    candidates = [s for s in (slots.get("all_available_slots_for_data") or []) if not s.get("booked")]
    if not candidates:
        raise ValueError("P5 fixture: no bookable slots available to prepare the managed booking.")
    # Use the last slot so the earliest slot stays free for the reschedule step.
    slot = candidates[-1]
    response = _first(
        book_time_slot(
            duration_id=duration_id,
            date=date,
            start_time=slot["start_time"],
            end_time=slot["end_time"],
            user_timezone_offset="180",
            user_name="P5 Managed Customer",
            user_email="p5-managed-customer@example.test",
            organization_id=org_id,
            service_id=service_id,
            provider_id=(slot.get("provider") or values["qa_provider_id"]),
            time_format="12h",
        )
    )
    response = response or {}
    product_url = response.get("reschedule_url") or ""
    customer_url = product_url
    if product_url:
        parts = urlsplit(product_url)
        customer_url = urlunsplit((parts.scheme, urlsplit(CUSTOMER_BASE).netloc, parts.path, parts.query, parts.fragment))

    extra = {
        "p5_managed_event": response.get("event_id") or "",
        "p5_managed_date": date,
        "p5_managed_slot_start": slot.get("start_time") or "",
        "p5_product_reschedule_url": product_url,
        "p5_customer_reschedule_url": customer_url,
    }
    extra.update(values)
    return extra


def values_conflict(manifest=None):
    """Book the earliest tomorrow slot so the customer must pick another one."""
    from appointment.api.personal_meet import book_time_slot
    from appointment import qa_fixtures

    values, windows, duration_id, org_id, service_id, date, slots = _duration_and_slots()
    candidates = [s for s in (slots.get("all_available_slots_for_data") or []) if not s.get("booked")]
    if not candidates:
        raise ValueError("P5 fixture: no bookable slots available to prepare the competing booking.")
    slot = candidates[0]
    response = _first(
        book_time_slot(
            duration_id=duration_id,
            date=date,
            start_time=slot["start_time"],
            end_time=slot["end_time"],
            user_timezone_offset="180",
            user_name="P5 Competing Customer",
            user_email="p5-competing@example.test",
            organization_id=org_id,
            service_id=service_id,
            provider_id=(slot.get("provider") or values["qa_provider_id"]),
            time_format="12h",
        )
    )
    response = response or {}
    extra = {
        "p5_conflict_event": response.get("event_id") or "",
        "p5_conflict_date": date,
        "p5_conflict_slot_start": slot.get("start_time") or "",
    }
    extra.update(values)
    return extra


def values_closed(manifest=None):
    """Prepare the same business but with no weekly availability windows.

    Used for the bounded "no available appointments" recovery check.
    """
    from appointment import qa_fixtures

    state = qa_fixtures.setup()
    availability = frappe.get_doc("User Appointment Availability", state["availability"])
    availability.appointment_time_slot = []
    availability.save(ignore_permissions=True)
    frappe.db.commit()
    return qa_fixtures.fixture_values()
