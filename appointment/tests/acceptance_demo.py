"""Provision the retained synthetic acceptance walkthrough for the owner.

This is intentionally separate from the automated acceptance fixtures. It creates
realistic synthetic businesses, staff accounts and appointments that the owner
can walk through, and writes credentials plus an exact cleanup manifest to a
private mode-600 file outside Git.

It never touches the owner's own businesses (Minte cafe / CMC / Best Cafe) and
never deletes records it did not create.
"""

import json
import os
from pathlib import Path

import frappe
from frappe.utils import add_days, nowdate
from frappe.utils.password import update_password

from appointment.scheduler import booking, membership, workspace

MARKER = "DEMO-"

ROLES = {
    "established_owner": ("Provider", "Organization Manager"),
    "other_business_owner": ("Provider", "Organization Manager"),
    "provider": ("Provider",),
    "receptionist": ("Front Desk",),
    "manager": ("Organization Manager", "Provider"),
    "unassigned": ("Front Desk",),
    "new_owner": (),
}


def require_target():
    if not frappe.conf.get("worktree_development") or "implement-owned-booking-slice" not in frappe.local.site:
        frappe.throw("The acceptance demo is restricted to the isolated implementation site.")


DEMO_ORG_NAMES = ("Bole Bloom Studio", "Kazanchis Dental Care")
DEMO_EMAILS = (
    "demo.owner@example.test",
    "demo.provider@example.test",
    "demo.reception@example.test",
    "demo.other@example.test",
    "demo.multi@example.test",
    "demo.unassigned@example.test",
    "demo.newowner@example.test",
)


def reset():
    """Remove only records created by this module (exact demo names/emails)."""
    require_target()
    frappe.set_user("Administrator")
    frappe.flags.syncing_booking_urls = True
    try:
        orgs = frappe.get_all(
            "Organization", filters={"organization_name": ["in", list(DEMO_ORG_NAMES)]}, pluck="name", ignore_permissions=True
        )
        services = frappe.get_all("Service", filters={"organization": ["in", orgs or [""]]}, pluck="name", ignore_permissions=True)
        for name in frappe.get_all("Appointment", filters={"organization": ["in", orgs or [""]]}, pluck="name", ignore_permissions=True):
            frappe.delete_doc("Appointment", name, force=True, ignore_permissions=True)
            frappe.db.delete("Version", {"ref_doctype": "Appointment", "docname": name})
        for name in frappe.get_all(
            "Business Membership", filters={"organization": ["in", orgs or [""]]}, pluck="name", ignore_permissions=True
        ):
            frappe.delete_doc("Business Membership", name, force=True, ignore_permissions=True)
        for name in frappe.get_all(
            "Business Membership", filters={"user": ["in", list(DEMO_EMAILS)]}, pluck="name", ignore_permissions=True
        ):
            frappe.delete_doc("Business Membership", name, force=True, ignore_permissions=True)
        for name in frappe.get_all("EventType", filters={"service": ["in", services or [""]]}, pluck="name", ignore_permissions=True):
            frappe.delete_doc("EventType", name, force=True, ignore_permissions=True)
        for name in services:
            frappe.delete_doc("Service", name, force=True, ignore_permissions=True)
        for name in frappe.get_all("Location", filters={"organization": ["in", orgs or [""]]}, pluck="name", ignore_permissions=True):
            frappe.delete_doc("Location", name, force=True, ignore_permissions=True)
        for name in frappe.get_all("Provider", filters={"user": ["in", list(DEMO_EMAILS)]}, pluck="name", ignore_permissions=True):
            frappe.delete_doc("Provider", name, force=True, ignore_permissions=True)
        for name in orgs:
            frappe.delete_doc("Organization", name, force=True, ignore_permissions=True)
        for email in DEMO_EMAILS:
            if frappe.db.exists("User", email):
                from frappe.sessions import clear_sessions

                clear_sessions(user=email, force=True)
                frappe.delete_doc("User", email, force=True, ignore_permissions=True)
                frappe.db.delete("DefaultValue", {"parent": email})
                frappe.db.delete("Has Role", {"parent": email})
        frappe.db.commit()
    finally:
        frappe.flags.syncing_booking_urls = False
        frappe.set_user("Administrator")
    if demo_path().exists():
        demo_path().unlink()
    return {"reset": list(orgs)}


def demo_path():
    return Path(frappe.get_site_path("private", "acceptance-demo.json"))


def _create_user(state, email, first_name, roles=()):
    if frappe.db.exists("User", email):
        user = frappe.get_doc("User", email)
    else:
        user = frappe.get_doc(
            {
                "doctype": "User",
                "email": email,
                "first_name": first_name,
                "send_welcome_email": 0,
                "enabled": 1,
                "user_type": "System User",
                "time_zone": "Africa/Addis_Ababa",
            }
        ).insert(ignore_permissions=True)
        state["created"].append(["User", user.name])
    password = frappe.generate_hash(length=24)
    update_password(user.name, password)
    if roles:
        membership.grant_roles(user.name, roles)
    state["credentials"].append({"email": user.name, "password": password, "roles": list(roles)})
    return user.name, password


def provision():
    require_target()
    if demo_path().exists():
        frappe.throw("The retained acceptance demo already exists; reuse its private file or clean it first.")

    frappe.set_user("Administrator")
    frappe.flags.syncing_booking_urls = True
    state = {"created": [], "credentials": [], "businesses": {}, "bookings": []}

    try:
        # 1. Established owner creates the anchor business through the real API.
        established_owner, _ = _create_user(
            state, "demo.owner@example.test", "Hanna Tesfaye", ROLES["established_owner"]
        )
        frappe.set_user(established_owner)
        base = workspace.create(
            "Bole Bloom Studio",
            "Bole Studio",
            "Hair & Scalp Consultation",
            "Africa/Addis_Ababa",
            30,
            "09:00",
            "17:00",
            list(workspace.DAYS),
            frappe.generate_hash(length=32),
        )
        state["created"].extend(
            [
                ["Organization", base["organization"]],
                ["Service", frappe.db.get_value("EventType", base["offering"], "service")],
                ["Provider", frappe.db.get_value("EventType", base["offering"], "provider")],
                ["Location", frappe.db.get_value("EventType", base["offering"], "location")],
                ["EventType", base["offering"]],
            ]
        )
        org = base["organization"]

        # 2. A second location and a named provider make reception meaningful.
        hours = [
            dict(day_of_week=day, start_time="09:00:00", end_time="17:00:00", is_open=1) for day in workspace.DAYS
        ]
        annex = frappe.get_doc(
            {
                "doctype": "Location",
                "location_name": "Bole Annex Room",
                "organization": org,
                "timezone": "Africa/Addis_Ababa",
                "is_active": 1,
                "opening_hours": hours,
            }
        ).insert(ignore_permissions=True)
        state["created"].append(["Location", annex.name])

        provider_user, _ = _create_user(state, "demo.provider@example.test", "Selam Bekele", ROLES["provider"])
        provider_response = membership.assign_member(org, provider_user, "Provider", full_name="Selam Bekele")
        state["created"].append(["Business Membership", provider_response["membership"]])
        provider = provider_response["provider"]

        styling_service = frappe.get_doc(
            {
                "doctype": "Service",
                "service_name": "Full Styling Session",
                "organization": org,
                "duration": 30,
                "price": 0,
                "use_default_hours": 1,
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)
        state["created"].append(["Service", styling_service.name])
        styling = frappe.get_doc(
            {
                "doctype": "EventType",
                "event_type_name": "Full Styling Session",
                "service": styling_service.name,
                "provider": provider,
                "location": annex.name,
                "is_active": 1,
            }
        ).insert(ignore_permissions=True)
        state["created"].append(["EventType", styling.name])

        # 3. Receptionist scoped to the Bole Studio location.
        receptionist, _ = _create_user(state, "demo.reception@example.test", "Meron Alemu", ROLES["receptionist"])
        reception_response = membership.assign_member(
            org,
            receptionist,
            "Receptionist",
            full_name="Meron Alemu",
            locations=[frappe.db.get_value("EventType", base["offering"], "location")],
        )
        state["created"].append(["Business Membership", reception_response["membership"]])

        workspace.publish(org, 1)

        # 4. Second business for isolation checks.
        other_owner, _ = _create_user(
            state, "demo.other@example.test", "Dawit Haile", ROLES["other_business_owner"]
        )
        frappe.set_user(other_owner)
        second = workspace.create(
            "Kazanchis Dental Care",
            "Kazanchis Clinic",
            "Dental Checkup",
            "Africa/Addis_Ababa",
            30,
            "09:00",
            "17:00",
            list(workspace.DAYS),
            frappe.generate_hash(length=32),
        )
        state["created"].extend(
            [
                ["Organization", second["organization"]],
                ["Service", frappe.db.get_value("EventType", second["offering"], "service")],
                ["Provider", frappe.db.get_value("EventType", second["offering"], "provider")],
                ["Location", frappe.db.get_value("EventType", second["offering"], "location")],
                ["EventType", second["offering"]],
            ]
        )
        workspace.publish(second["organization"], 1)

        # 5. Multi-business account: receptionist here, manager there.
        multi, _ = _create_user(state, "demo.multi@example.test", "Rahel Girma", ROLES["manager"])
        frappe.set_user(established_owner)
        multi_a = membership.assign_member(org, multi, "Receptionist", full_name="Rahel Girma")
        state["created"].append(["Business Membership", multi_a["membership"]])
        frappe.set_user(other_owner)
        multi_b = membership.assign_member(second["organization"], multi, "Manager", full_name="Rahel Girma")
        state["created"].append(["Business Membership", multi_b["membership"]])

        # 6. Unassigned staff and a brand-new owner.
        _create_user(state, "demo.unassigned@example.test", "Yonas Kebede", ROLES["unassigned"])
        _create_user(state, "demo.newowner@example.test", "Alem Tadesse", ROLES["new_owner"])

        # 7. Appointments on current upcoming dates through the real guest flow.
        frappe.db.commit()
        frappe.set_user("Guest")
        est_location = frappe.db.get_value("EventType", base["offering"], "location")
        schedule = [
            (base["offering"], add_days(nowdate(), 1), 9, 30, "Synthetic Customer One", "demo.customer1@example.test"),
            (styling.name, add_days(nowdate(), 1), 11, 0, "Synthetic Customer Two", "demo.customer2@example.test"),
            (base["offering"], add_days(nowdate(), 1), 14, 0, "Synthetic Customer Three", "demo.customer3@example.test"),
            (styling.name, add_days(nowdate(), 2), 10, 0, "Synthetic Customer Four", "demo.customer4@example.test"),
        ]
        for offering, day, hour, minute, name, email in schedule:
            end_minutes = hour * 60 + minute + 30
            end_hour, end_minute = divmod(end_minutes, 60)
            result = booking.book(
                offering,
                f"{day}T{hour:02}:{minute:02}:00+03:00",
                f"{day}T{end_hour:02}:{end_minute:02}:00+03:00",
                name,
                email,
                frappe.generate_hash(length=32),
            )
            state["bookings"].append(result["booking_id"])
            state["created"].append(["Appointment", result["booking_id"]])
        frappe.set_user("Administrator")
        frappe.db.commit()

        state["businesses"] = {
            "established": {
                "organization": org,
                "name": "Bole Bloom Studio",
                "location": est_location,
                "provider": provider,
                "offering": base["offering"],
                "styling_offering": styling.name,
                "public_path": base["public_path"],
            },
            "second": {
                "organization": second["organization"],
                "name": "Kazanchis Dental Care",
                "public_path": second["public_path"],
            },
        }
        state["dates"] = {
            "booking_days": [add_days(nowdate(), 1), add_days(nowdate(), 2)],
            "timezone": "Africa/Addis_Ababa",
        }
    finally:
        frappe.flags.syncing_booking_urls = False
        frappe.set_user("Administrator")

    fd = os.open(demo_path(), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as output:
        json.dump(state, output, indent=2)
    return {
        "credentials_path": str(demo_path().resolve()),
        "businesses": state["businesses"],
        "dates": state["dates"],
        "bookings": state["bookings"],
        "accounts": [{"email": item["email"], "roles": item["roles"]} for item in state["credentials"]],
        "warning": "Passwords are only in the private file; never commit or paste them.",
    }


def browser_values(manifest=None):
    """Fixture provider for Agent Plane role manifests."""
    state = json.loads(demo_path().read_text())
    businesses = state["businesses"]
    return {
        "qa_newowner_user": "demo.newowner@example.test",
        "qa_owner_user": "demo.owner@example.test",
        "qa_provider_user": "demo.provider@example.test",
        "qa_reception_user": "demo.reception@example.test",
        "qa_other_user": "demo.other@example.test",
        "qa_multi_user": "demo.multi@example.test",
        "qa_unassigned_user": "demo.unassigned@example.test",
        "qa_business_name": businesses["established"]["name"],
        "qa_second_business_name": businesses["second"]["name"],
        "qa_booking_day": state["dates"]["booking_days"][0],
    }


def cleanup_demo():
    require_target()
    state = json.loads(demo_path().read_text())
    frappe.set_user("Administrator")
    frappe.flags.syncing_booking_urls = True
    try:
        for name in frappe.get_all(
            "Appointment",
            filters={"organization": ["in", [b["organization"] for b in state["businesses"].values()]]},
            pluck="name",
        ):
            frappe.delete_doc("Appointment", name, force=True, ignore_permissions=True)
            frappe.db.delete("Version", {"ref_doctype": "Appointment", "docname": name})
        for name in frappe.get_all(
            "Business Membership",
            filters={"organization": ["in", [b["organization"] for b in state["businesses"].values()]]},
            pluck="name",
        ):
            frappe.delete_doc("Business Membership", name, force=True, ignore_permissions=True)
        for doctype, name in reversed(state["created"]):
            if frappe.db.exists(doctype, name):
                frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
        frappe.db.commit()
    finally:
        frappe.flags.syncing_booking_urls = False
        frappe.set_user("Administrator")
    demo_path().unlink()
    return {"removed": len(state["created"])}
