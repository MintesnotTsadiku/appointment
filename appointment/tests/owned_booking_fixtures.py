"""Exact, owned synthetic fixtures for the isolated implementation acceptance suite."""

import json
from pathlib import Path

import frappe
from frappe.utils import add_days, nowdate


def require_target():
    if not frappe.conf.get("worktree_development") or "implement-owned-booking-slice" not in frappe.local.site:
        frappe.throw("This suite is restricted to the isolated owned-booking implementation site.")


def setup():
    require_target()
    frappe.set_user("Administrator")
    frappe.flags.syncing_booking_urls = True
    marker = "OWN-" + frappe.generate_hash(length=8)
    state = {"marker": marker, "created": [], "businesses": [], "day": add_days(nowdate(), 2)}

    def insert(dt, **values):
        doc = frappe.get_doc(dict(doctype=dt, **values)).insert(ignore_permissions=True)
        state["created"].append([dt, doc.name])
        return doc

    for suffix in ("A", "B"):
        user = insert(
            "User",
            email=f"{marker.lower()}-{suffix.lower()}@example.test",
            first_name=f"{marker} Provider {suffix}",
            send_welcome_email=0,
            enabled=1,
            time_zone="Africa/Addis_Ababa",
            user_type="System User",
            roles=[{"role": "Provider"}],
        )
        org = insert(
            "Organization",
            organization_name=f"{marker} Business {suffix}",
            slug=f"{marker.lower()}-{suffix.lower()}",
            organization_type="Other",
            owner_user="Administrator",
            enable_public_booking=1,
            is_active=1,
        )
        provider = insert(
            "Provider",
            provider_name=f"{marker} Provider {suffix}",
            user=user.name,
            is_active=1,
            use_default_hours=1,
            organizations=[{"organization": org.name, "status": "Active", "accept_org_bookings": 1}],
        )
        hours = [
            dict(day_of_week=d, start_time="09:00:00", end_time="18:00:00", is_open=1)
            for d in ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
        ]
        location = insert(
            "Location",
            location_name=f"{marker} Location {suffix}",
            organization=org.name,
            timezone="Africa/Addis_Ababa",
            is_active=1,
            opening_hours=hours,
        )
        service = insert(
            "Service",
            service_name=f"{marker} Consultation {suffix}",
            organization=org.name,
            duration=30,
            price=250,
            is_active=1,
            use_default_hours=1,
            buffer_before=0,
            buffer_after=0,
        )
        event = insert(
            "EventType",
            event_type_name=f"{marker} Offering {suffix}",
            service=service.name,
            provider=provider.name,
            location=location.name,
            is_active=1,
        )
        state["businesses"].append(
            dict(
                user=user.name,
                org=org.name,
                provider=provider.name,
                location=location.name,
                service=service.name,
                offering=event.name,
                slug=org.slug,
            )
        )
    customer = insert(
        "User",
        email=f"{marker.lower()}-customer@example.test",
        first_name="Synthetic Customer",
        send_welcome_email=0,
        enabled=1,
        user_type="Website User",
    )
    state["customer"] = customer.name
    frappe.db.commit()
    frappe.flags.syncing_booking_urls = False
    return state


def cleanup(state):
    require_target()
    frappe.set_user("Administrator")
    frappe.flags.syncing_booking_urls = True
    orgs = [b["org"] for b in state["businesses"]]
    # Booking names are discovered through the exact owned businesses, never by
    # global snapshot or prefix. Capture exact children before deleting parents.
    appointments = frappe.get_all("Appointment", filters={"organization": ["in", orgs]}, pluck="name")
    removed = []
    for name in appointments:
        frappe.delete_doc("Appointment", name, force=True, ignore_permissions=True)
        frappe.db.delete("Version", {"ref_doctype": "Appointment", "docname": name})
        removed.append(["Appointment", name])
    for dt, name in reversed(state["created"]):
        if frappe.db.exists(dt, name):
            if dt == "User":
                from frappe.sessions import clear_sessions

                clear_sessions(user=name, force=True)
            frappe.delete_doc(dt, name, force=True, ignore_permissions=True)
            if dt == "User":
                frappe.db.delete("DefaultValue", {"parent": name})
            removed.append([dt, name])
    frappe.db.commit()
    remaining = [[dt, name] for dt, name in removed if frappe.db.exists(dt, name)]
    assert not remaining, remaining
    child_remaining = []
    for dt, name in removed:
        for field in frappe.get_meta(dt).get_table_fields():
            count = frappe.db.count(field.options, {"parent": name, "parenttype": dt})
            if count:
                child_remaining.append([field.options, name, count])
    assert not child_remaining, child_remaining
    frappe.flags.syncing_booking_urls = False
    return {
        "removed_count": len(removed),
        "remaining_exact_records": remaining,
        "remaining_exact_children": child_remaining,
    }


def state_path():
    return Path(frappe.get_site_path("private", "owned-booking-fixture.json"))


def prepare_browser():
    require_target()
    if state_path().exists():
        frappe.throw("A browser fixture is already retained; finish its exact cleanup first.")
    state = setup()
    state_path().write_text(json.dumps(state))
    state_path().chmod(0o600)
    return state


def browser_values(manifest=None):
    state = json.loads(state_path().read_text())
    b = state["businesses"][0]
    return {
        "qa_org_slug": b["slug"],
        "qa_service_slug": b["offering"],
        "qa_provider_user": b["user"],
        "qa_service_name": state["marker"] + " Consultation A",
    }


def finish_browser():
    state = json.loads(state_path().read_text())
    result = cleanup(state)
    state_path().unlink()
    return result


def verify_browser():
    require_target()
    state = json.loads(state_path().read_text())
    a, b = state["businesses"]
    records = frappe.get_all(
        "Appointment",
        filters={
            "organization": a["org"],
            "client_email": ["in", ["owned-browser@example.test", "owned-mobile@example.test"]],
        },
        fields=[
            "name",
            "organization",
            "provider",
            "service",
            "location",
            "owner",
            "client_email",
            "booking_timezone",
            "start_time",
            "starts_at",
            "ends_at",
            "status",
        ],
    )
    assert records, "Guest browser booking missing"
    from appointment.scheduler.booking_access import can_access

    for row in records:
        assert row.owner == "Guest" and row.provider == a["provider"]
        assert can_access(row, a["user"]) and not can_access(row, b["user"])
        row["history_count"] = frappe.db.count("Version", {"ref_doctype": "Appointment", "docname": row.name})
        assert row["history_count"] >= 1
    return {"stored": records, "provider_user": a["user"], "foreign_user": b["user"], "source": __file__}
