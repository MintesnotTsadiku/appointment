"""Deterministic, self-cleaning fixtures for Agent Plane browser QA.

``appointment.qa_runner.run`` calls :func:`setup` before the browser run and
:func:`teardown` in a ``finally`` block, so every browser manifest gets a
deterministic QA organization, provider, location, service and event type and
leaves no ambiguous records behind.

Manifests reference the values through ``fixtures.provider:
appointment.qa_fixtures.fixture_values`` as ``{{qa_org_slug}}``,
``{{qa_service_slug}}`` and friends.

This is disposable-site QA tooling, never a supported data path.
"""

from __future__ import annotations

from typing import Any

import frappe

MARKER_PREFIX = "QA-BROWSER"
_CREATED_DOCTYPES = (
    "Appointment",
    "Walk In",
    "EventType",
    "Service",
    "Location",
    "Provider",
    "Organization",
)

_STATE: dict[str, Any] = {}


def setup() -> dict[str, Any]:
    """Create the deterministic QA fixture once per process."""
    if _STATE.get("marker"):
        return _STATE

    _cleanup_stale()
    marker = f"{MARKER_PREFIX}-{frappe.generate_hash(length=6)}"
    organization = _insert(
        "Organization",
        organization_name=f"{marker} Org",
        organization_type="Other",
        slug=marker.lower(),
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
        is_active=1,
    )
    provider.append("locations", {"location": location.name, "is_primary": 1})
    provider.save(ignore_permissions=True)
    service = _insert(
        "Service",
        service_name=f"{marker} Service",
        duration=30,
        price=250,
        organization=organization.name,
        is_active=1,
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
            "org_slug": organization.slug,
            "service_slug": make_slug(event_type.name),
            "service_name": service.service_name,
            "new_service_name": f"{marker} Browser Service",
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
    }


def teardown() -> dict[str, Any]:
    """Delete every record created for the QA run.

    Also sweeps marker-prefixed records created through the browser UI (for
    example a walk-in or service) so a failed scenario never leaks ambiguous
    production-like data.
    """
    removed: list[str] = []
    if _STATE.get("marker"):
        for doctype, name in reversed(list(_STATE.get("created", []))):
            if frappe.db.exists(doctype, name):
                try:
                    frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
                    removed.append(f"{doctype}:{name}")
                except Exception:  # best-effort cleanup of disposable QA rows
                    frappe.db.rollback()
    removed.extend(_cleanup_stale())
    _STATE.clear()
    frappe.db.commit()
    return {"removed": removed}


def _insert(doctype: str, **values):
    doc = frappe.get_doc({"doctype": doctype, **values})
    doc.insert(ignore_permissions=True)
    _STATE.setdefault("created", []).append((doctype, doc.name))
    return doc


def _cleanup_stale() -> list[str]:
    """Remove any leftover QA-BROWSER records from a previous crashed run."""
    field_by_doctype = {
        "Appointment": "client_name",
        "Walk In": "client_name",
        "EventType": "event_type_name",
        "Service": "service_name",
        "Location": "location_name",
        "Provider": "provider_name",
        "Organization": "organization_name",
    }
    removed: list[str] = []
    for doctype in _CREATED_DOCTYPES:
        if not frappe.db.exists("DocType", doctype):
            continue
        field = field_by_doctype[doctype]
        filters = {field: ["like", f"{MARKER_PREFIX}-%"]}
        for name in frappe.get_all(doctype, filters=filters, pluck="name", limit_page_length=0):
            try:
                frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
                removed.append(f"{doctype}:{name}")
            except Exception:  # best-effort cleanup
                frappe.db.rollback()
    return removed
