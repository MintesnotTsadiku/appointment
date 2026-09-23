"""Destructive only to the exact rich-demo journal on an explicitly enabled local site."""

import hashlib
import json
from collections import Counter
from datetime import timedelta

import frappe
from frappe.utils import getdate

from appointment.scheduler import booking, booking_access, membership
from appointment.tests import rich_demo


def fingerprint(records):
    payload = [(dt, name, frappe.get_doc(dt, name).as_dict()) for dt, name in records]
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


def verify():
    rich_demo.require_target()
    state = rich_demo.load_state()
    assert len(state["businesses"]) == 5
    assert len(state["appointments"]) >= 300
    assert state_path_mode() == 0o600
    rows = [frappe.get_doc("Appointment", name) for name in state["appointments"]]
    for row in rows:
        event = frappe.get_doc("EventType", row.event_type)
        assert (row.service, row.provider, row.location) == (event.service, event.provider, event.location)
        assert row.organization == frappe.db.get_value("Service", row.service, "organization")
        assert row.booking_timezone == rich_demo.TZ
        assert row.client_email.endswith("@example.test")
        assert row.ends_at > row.starts_at
        assert frappe.db.exists("Version", {"ref_doctype": "Appointment", "docname": row.name})
    active = [r for r in rows if r.status in booking.ACTIVE]
    for index, row in enumerate(active):
        assert not any(
            other.provider == row.provider
            and other.occupied_from < row.occupied_until
            and other.occupied_until > row.occupied_from
            for other in active[index + 1 :]
        )
    assert {r.status for r in rows} >= {"Confirmed", "Cancelled", "Completed", "No Show"}
    assert state["rescheduled"]
    from appointment.api.personal_meet import get_organization_services

    for business in state["businesses"].values():
        catalog = get_organization_services(frappe.db.get_value("Organization", business["organization"], "slug"))
        assert catalog["provider_count"] == len(business["providers"])
        assert len(catalog["providers"]) == len(business["providers"])
        assert catalog["description"] == business["description"]
        day = getdate(state["anchor_date"]) + timedelta(days=1)
        while day.strftime("%A") not in business["days"]:
            day += timedelta(days=1)
        slot_result = booking.slots(business["offerings"][0]["id"], str(day), business["organization"])
        assert slot_result["total_slots_for_day"] > 0
        assert any(slot["available"] for slot in slot_result["all_available_slots_for_data"])
        assert any(slot["booked"] for slot in slot_result["all_available_slots_for_data"])
    bloom = state["businesses"]["bloom"]
    scoped = [r for r in rows if booking_access.can_access(r, "bloom.reception@example.test")]
    assert scoped and all(
        r.organization == bloom["organization"] and r.location == bloom["locations"][0] for r in scoped
    )
    owned = [r for r in rows if booking_access.can_access(r, "bloom.provider1@example.test")]
    assert owned and all(r.provider == bloom["providers"][1] for r in owned)
    assert not any(booking_access.can_access(r, "Guest") for r in rows)
    for persona in state["personas"]:
        frappe.set_user(persona["email"])
        context = membership.context()
        if persona["key"] == "multi.manager":
            assert len(context["workspaces"]) == 2
            assert context["state"] in ("selection", "workspace")
        else:
            assert context["landing"] == persona["landing"]
    frappe.set_user("Administrator")
    before = fingerprint(state["created"])
    private_before = rich_demo.state_path().read_bytes()
    rich_demo.seed()
    assert fingerprint(state["created"]) == before
    assert rich_demo.state_path().read_bytes() == private_before
    return {
        "passed": [
            "relationships",
            "durations",
            "timezone",
            "non-deliverable contacts",
            "lifecycle history",
            "provider capacity",
            "public slots and occupied capacity",
            "public provider counts and business copy",
            "reception location isolation",
            "provider scope",
            "guest isolation",
            "role landings",
            "idempotent inventory and credentials",
            "mode 600",
        ],
        "appointments": len(rows),
        "statuses": dict(Counter(r.status for r in rows)),
    }


def state_path_mode():
    return rich_demo.state_path().stat().st_mode & 0o777


def _roundtrip():
    """Verify exact cleanup, collision rejection and unchanged unrelated data; retain a reseeded demo."""
    rich_demo.require_target()
    state = rich_demo.load_state()
    original = list(state["created"])
    # A real pre-existing unrelated record must survive cleanup byte-for-byte.
    email = "preservation." + frappe.generate_hash(length=12) + "@example.test"
    sentinel = frappe.get_doc(
        dict(doctype="User", email=email, first_name="Preservation sentinel", send_welcome_email=0)
    ).insert(ignore_permissions=True)
    frappe.db.commit()
    before = fingerprint([("User", sentinel.name)])
    try:
        rich_demo.cleanup()
        assert all(not frappe.db.exists(dt, name) for dt, name in original)
        assert fingerprint([("User", sentinel.name)]) == before
        # A colliding user must never be adopted or have their password/roles changed.
        collision = frappe.get_doc(
            dict(doctype="User", email="selam.owner@example.test", first_name="Existing account", send_welcome_email=0)
        ).insert(ignore_permissions=True)
        frappe.db.commit()
        collision_before = fingerprint([("User", collision.name)])
        try:
            try:
                rich_demo.seed()
                raise AssertionError("Expected collision refusal")
            except frappe.ValidationError:
                pass
            assert fingerprint([("User", collision.name)]) == collision_before
        finally:
            frappe.delete_doc("User", collision.name, ignore_permissions=True, delete_permanently=True)
            frappe.db.commit()
        rich_demo.seed(base_url=state["base_url"], anchor_date=state["anchor_date"])
        assert fingerprint([("User", sentinel.name)]) == before
        result = verify()
        result["passed"] += ["exact cleanup", "pre-existing record preservation", "collision refusal", "cleanup/reseed"]
        return result
    finally:
        frappe.set_user("Administrator")
        frappe.delete_doc("User", sentinel.name, ignore_permissions=True, delete_permanently=True)
        frappe.db.commit()


def roundtrip():
    with rich_demo.local_side_effects():
        return _roundtrip()
