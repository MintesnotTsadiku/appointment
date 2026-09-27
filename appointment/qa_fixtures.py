"""Deterministic, self-cleaning fixtures for Agent Plane browser QA.

``appointment.qa_runner.run`` calls :func:`setup` before the browser run and
:func:`teardown` in a ``finally`` block, so every browser manifest gets a
deterministic QA organization, provider, location, service, event type,
provider user/availability (so booking slots exist) and a QA appointment for
reschedule/cancel, and leaves no ambiguous records behind.

Manifests reference the values through ``fixtures.provider:
appointment.qa_fixtures.fixture_values`` as ``{qa_org_slug}``,
``{qa_service_slug}``, ``{qa_appointment_name}`` and friends.

This is disposable-site QA tooling, never a supported data path.
"""

from __future__ import annotations

from typing import Any

import frappe
from frappe.utils import add_days, nowdate

MARKER_PREFIX = "QA-BROWSER"
# Deletion order matters: Booking Event / Appointment Group reference the
# provider's User Appointment Availability, so they must go first or their
# controllers raise on the missing link.
_CREATED_DOCTYPES = (
    "Appointment",
    "Walk In",
    "Booking Event",
    "Appointment Group",
    "EventType",
    "Service",
    "User Appointment Availability",
    "Location",
    "Provider",
    "Organization",
    "User",
)
_SNAPSHOT_DOCTYPES = ("Appointment Group", "Booking Event")
_WEEKDAYS = (
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
)

_STATE: dict[str, Any] = {}


def setup() -> dict[str, Any]:
    """Create the deterministic QA fixture once per process."""
    if _STATE.get("marker"):
        return _STATE

    _cleanup_stale()
    _STATE["snapshot"] = {
        doctype: set(frappe.get_all(doctype, pluck="name", limit_page_length=0))
        for doctype in _SNAPSHOT_DOCTYPES
        if frappe.db.exists("DocType", doctype)
    }

    marker = f"{MARKER_PREFIX}-{frappe.generate_hash(length=6)}"
    lower_marker = marker.lower()

    user = _insert(
        "User",
        email=f"{lower_marker}@qa.local",
        first_name="QA Browser Provider",
        send_welcome_email=0,
        enabled=1,
        user_type="System User",
    )
    organization = _insert(
        "Organization",
        organization_name=f"{marker} Org",
        organization_type="Other",
        slug=lower_marker,
        owner_user="Administrator",
        is_active=1,
        enable_public_booking=1,
        managers=[
            {
                "user": "Administrator",
                "full_name": "Administrator",
                "can_manage_providers": 1,
                "can_manage_services": 1,
            }
        ],
    )
    provider = _insert(
        "Provider",
        provider_name=f"{marker} Provider",
        full_name="QA Browser Provider",
        email=user.name,
        user=user.name,
        is_active=1,
        organization=organization.name,
        organization_status="Active",
        organizations=[
            {
                "organization": organization.name,
                "status": "Active",
                "accept_org_bookings": 1,
                "is_primary": 1,
            }
        ],
    )
    location = _insert(
        "Location",
        location_name=f"{marker} Location",
        organization=organization.name,
        timezone="Africa/Addis_Ababa",
        is_active=1,
        opening_hours=[
            {
                "day_of_week": day,
                "start_time": "09:00:00",
                "end_time": "18:00:00",
                "is_open": 1,
            }
            for day in _WEEKDAYS
        ],
    )
    provider.append("locations", {"location": location.name, "is_primary": 1})
    provider.save(ignore_permissions=True)

    # The settings availability page saves against the Provider linked to the
    # *session* user (`onboarding.save_availability`). Administrator has no
    # provider unless we create one, so give the QA run an Administrator-owned
    # provider + location with default Mon-Fri hours. This is test setup for a
    # disposable site, not a supported data path.
    admin_provider = _insert(
        "Provider",
        provider_name=f"{marker} Admin Provider",
        full_name="QA Admin Provider",
        user="Administrator",
        is_active=1,
        organization=organization.name,
        organization_status="Active",
        organizations=[
            {
                "organization": organization.name,
                "status": "Active",
                "accept_org_bookings": 1,
                "is_primary": 1,
            }
        ],
    )
    admin_location = _insert(
        "Location",
        location_name=f"{marker} Admin Location",
        organization=organization.name,
        timezone="Africa/Addis_Ababa",
        is_active=1,
        opening_hours=[
            {
                "day_of_week": day,
                "start_time": "08:30:00",
                "end_time": "18:00:00",
                "is_open": 1,
            }
            for day in _WEEKDAYS[:5]
        ],
    )
    admin_provider.append("locations", {"location": admin_location.name, "is_primary": 1})
    admin_provider.save(ignore_permissions=True)

    availability = _insert(
        "User Appointment Availability",
        user=user.name,
        provider=provider.name,
        enable_scheduling=1,
        slug=lower_marker,
        meeting_provider="builtin",
        available_durations=[
            {
                "title": "QA 30 minutes",
                "duration": 1800,
                "allow_rescheduling": 1,
            }
        ],
        appointment_time_slot=[{"day": day, "start_time": "09:00:00", "end_time": "17:00:00"} for day in _WEEKDAYS],
    )
    duration_id = availability.available_durations[0].name

    service = _insert(
        "Service",
        service_name=f"{marker} Service",
        duration=30,
        price=250,
        organization=organization.name,
        is_active=1,
        service_providers=[{"provider": provider.name, "is_primary": 1, "status": "Active"}],
    )
    event_type = _insert(
        "EventType",
        naming_series="EVT-.YYYY.-.######",
        event_type_name=f"{marker} EventType",
        service=service.name,
        provider=provider.name,
        location=location.name,
        is_active=1,
    )

    appointment = _insert(
        "Appointment",
        appointment_id=f"QA-APT-{frappe.generate_hash(length=8).upper()}",
        event_type=event_type.name,
        provider=provider.name,
        location=location.name,
        service=service.name,
        client_name=f"{marker} Client",
        client_email=f"{lower_marker}-client@qa.local",
        client_phone="+251900000111",
        appointment_date=add_days(nowdate(), 1),
        start_time="10:00:00",
        end_time="10:30:00",
        status="Confirmed",
    )
    frappe.db.commit()

    from appointment.onboarding import make_slug

    _STATE.update(
        {
            "marker": marker,
            "organization": organization.name,
            "provider": provider.name,
            "location": location.name,
            "service": service.name,
            "event_type": event_type.name,
            "user": user.name,
            "availability": availability.name,
            "duration_id": duration_id,
            "appointment": appointment.name,
            "org_slug": organization.slug,
            "service_slug": make_slug(event_type.name),
            "service_name": service.service_name,
            "provider_name": provider.provider_name,
            "location_name": location.location_name,
            "new_service_name": f"{marker} Browser Service",
            "client_name": appointment.client_name,
            "admin_location": admin_location.name,
            "admin_location_name": admin_location.location_name,
        }
    )
    return _STATE


def fixture_values(manifest: dict[str, Any] | None = None) -> dict[str, str]:
    """Fixture provider for Agent Plane manifests."""
    state = setup()
    return {
        "qa_marker": state["marker"],
        "qa_org_slug": state["org_slug"],
        "qa_service_slug": state["service_slug"],
        "qa_service_name": state["service_name"],
        "qa_new_service_name": state["new_service_name"],
        "qa_provider_name": state["provider_name"],
        "qa_location_name": state["location_name"],
        "qa_provider_id": state["provider"],
        "qa_location_id": state["location"],
        "qa_service_id": state["service"],
        "qa_duration_id": state["duration_id"],
        "qa_appointment_name": state["appointment"],
        "qa_client_name": state["client_name"],
        "qa_admin_location_id": state["admin_location"],
        "qa_admin_location_name": state["admin_location_name"],
        "qa_customer_name": f"{state['marker']} Customer",
        "qa_customer_email": f"{state['marker'].lower()}-customer@qa.local",
    }


def debug_slots() -> dict[str, Any]:
    """Diagnostics helper for disposable QA: why are (or aren't) slots available?"""
    from frappe.utils import add_days, nowdate

    from appointment.api.personal_meet import (
        get_organization_meeting_windows,
        get_time_slots,
    )

    state = setup()
    windows = get_organization_meeting_windows(state["org_slug"], state["service_slug"])
    duration_id = (windows.get("durations") or [{}])[0].get("id") or state["duration_id"]
    date = add_days(nowdate(), 1)
    slots = get_time_slots(
        duration_id=duration_id,
        date=date,
        user_timezone_offset="3",
        organization_id=state["organization"],
        service_id=state["service"],
    )
    if isinstance(slots, tuple):
        slots = slots[0]
    return {
        "duration_id": duration_id,
        "windows": windows,
        "date": date,
        "available_days": (slots or {}).get("available_days"),
        "slot_count": len((slots or {}).get("all_available_slots_for_data") or []),
        "is_invalid_date": (slots or {}).get("is_invalid_date"),
        "debug": (slots or {}).get("debug_messages"),
    }


def teardown() -> dict[str, Any]:
    """Delete every record created for the QA run.

    Also sweeps marker-prefixed records created through the browser UI (for
    example a walk-in, a booked appointment or a service) and any Booking
    Event/Appointment Group created during the run, so a failed scenario never
    leaks ambiguous production-like data.
    """
    removed: list[str] = []
    # Run artifacts (Booking Event / Appointment Group) reference the fixture's
    # User Appointment Availability, so remove them before the tracked records.
    removed.extend(_cleanup_run_artifacts())
    if _STATE.get("marker"):
        for doctype, name in reversed(list(_STATE.get("created", []))):
            if frappe.db.exists(doctype, name) and _safe_delete(doctype, name):
                removed.append(f"{doctype}:{name}")
    removed.extend(_cleanup_stale())
    _STATE.clear()
    frappe.db.commit()
    return {"removed": list(dict.fromkeys(removed))}


def _insert(doctype: str, **values):
    doc = frappe.get_doc({"doctype": doctype, **values})
    doc.insert(ignore_permissions=True)
    _STATE.setdefault("created", []).append((doctype, doc.name))
    return doc


def _safe_delete(doctype: str, name: str) -> bool:
    """Delete one record and commit immediately.

    Committing per record means a later delete failure (which rolls back its own
    transaction) cannot resurrect records already cleaned up.
    """
    try:
        frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
        frappe.db.commit()
        return True
    except Exception:  # best-effort cleanup of disposable QA rows
        frappe.db.rollback()
        return False


def _cleanup_run_artifacts() -> list[str]:
    """Delete Booking Events and Appointment Groups created during this run."""
    removed: list[str] = []
    snapshot = _STATE.get("snapshot") or {}
    for doctype in _SNAPSHOT_DOCTYPES:
        if not frappe.db.exists("DocType", doctype):
            continue
        before = snapshot.get(doctype, set())
        for name in frappe.get_all(doctype, pluck="name", limit_page_length=0):
            if name in before:
                continue
            if _safe_delete(doctype, name):
                removed.append(f"{doctype}:{name}")
    return removed


def _cleanup_stale() -> list[str]:
    """Remove any leftover QA-BROWSER records from a previous crashed run."""
    filters_by_doctype: dict[str, dict] = {
        "Appointment": {"client_name": ["like", f"{MARKER_PREFIX}-%"]},
        "Walk In": {"client_name": ["like", f"{MARKER_PREFIX}-%"]},
        "EventType": {"event_type_name": ["like", f"{MARKER_PREFIX}-%"]},
        "Service": {"service_name": ["like", f"{MARKER_PREFIX}-%"]},
        "User Appointment Availability": {"slug": ["like", f"{MARKER_PREFIX.lower()}-%"]},
        "Location": {"location_name": ["like", f"{MARKER_PREFIX}-%"]},
        "Provider": {"provider_name": ["like", f"{MARKER_PREFIX}-%"]},
        "Organization": {"organization_name": ["like", f"{MARKER_PREFIX}-%"]},
        "Booking Event": {"subject": ["like", f"%{MARKER_PREFIX}-%"]},
        "Appointment Group": {"linked_doctype": ["like", f"{MARKER_PREFIX.lower()}-%"]},
        "User": {"email": ["like", f"{MARKER_PREFIX.lower()}-%@qa.local"]},
    }
    removed: list[str] = []
    for doctype in _CREATED_DOCTYPES:
        if not frappe.db.exists("DocType", doctype):
            continue
        for name in frappe.get_all(doctype, filters=filters_by_doctype[doctype], pluck="name", limit_page_length=0):
            if _safe_delete(doctype, name):
                removed.append(f"{doctype}:{name}")
    return removed
