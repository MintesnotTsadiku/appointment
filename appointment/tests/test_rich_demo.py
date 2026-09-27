"""Destructive only to the exact rich-demo journal on an explicitly enabled local site."""

import hashlib
import json
from collections import Counter
from datetime import timedelta

import frappe
from frappe.utils import getdate

from appointment.scheduler import booking, booking_access, membership
from appointment.demo import showcase as rich_demo


def fingerprint(records):
    payload = [(dt, name, frappe.get_doc(dt, name).as_dict()) for dt, name in records]
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


def verify():
    rich_demo.require_target()
    state = rich_demo.load_state()
    assert len(state["businesses"]) == 5
    assert len(state["appointments"]) >= 300
    assert state_path_mode() == 0o600
    assert state["public_experience_version"] == rich_demo.PUBLIC_EXPERIENCE_VERSION
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

    assert state["content_version"] == rich_demo.CONTENT_VERSION
    published_headlines = set()
    published_ctas = set()
    for key, business in state["businesses"].items():
        detail = rich_demo.DEMO_CONTENT[key]
        organization = frappe.get_doc("Organization", business["organization"])
        assert organization.description == detail["description"]
        assert organization.email == detail["contact"]["email"]
        assert organization.phone == detail["contact"]["phone"]
        assert organization.email.endswith("@example.test")
        assert organization.phone.startswith("000 ")
        for index, provider_id in enumerate(business["providers"]):
            provider = frappe.get_doc("Provider", provider_id)
            assert provider.bio == detail["provider_bios"][index]
            assert provider.display_name == provider.full_name
            assert provider.email.endswith("@example.test")
            assert frappe.db.get_value("User", provider.user, "user_image") == rich_demo.PROVIDER_PORTRAITS[provider.display_name]
        for index, location_id in enumerate(business["locations"]):
            location = frappe.get_doc("Location", location_id)
            location_detail = detail["locations"][index]
            assert location.address_line_1 == location_detail["address_line_1"]
            assert location.address_line_2 == location_detail["address_line_2"]
            assert location.phone == location_detail["phone"]
            assert {row.day_of_week for row in location.opening_hours if row.is_open} == set(business["days"])
        service_ids = []
        for offering in business["offerings"]:
            if offering["service"] not in service_ids:
                service_ids.append(offering["service"])
        for index, service_id in enumerate(service_ids):
            service = frappe.get_doc("Service", service_id)
            expected = detail["services"][index]
            assert (service.service_name, service.duration, int(service.price)) == (expected["name"], expected["duration"], expected["price"])
            assert service.description == expected["description"]

        assert frappe.db.exists("Brand Profile", business["brand_profile"])
        brand_profile = frappe.get_doc("Brand Profile", business["brand_profile"])
        assert brand_profile.logo_primary == rich_demo.DEMO_BRAND_RECIPES[key]["logo"]
        assert brand_profile.logo_compact == rich_demo.DEMO_BRAND_RECIPES[key]["logo"]
        assert brand_profile.favicon == rich_demo.DEMO_BRAND_RECIPES[key]["favicon"]
        assert frappe.db.exists("Public Site", business["public_site"])
        assert frappe.db.exists("Experience Release", business["experience_release"])
        assert frappe.db.get_value("Public Site", business["public_site"], "current_release") == business["experience_release"]
        assert frappe.db.get_value("Brand Profile", business["brand_profile"], "active_revision")
        assert business["public_experience_path"].startswith("/")
        catalog = get_organization_services(frappe.db.get_value("Organization", business["organization"], "slug"))
        assert catalog["provider_count"] == len(business["providers"])
        assert len(catalog["providers"]) == len(business["providers"])
        assert {row["avatar"] for row in catalog["providers"]} == {
            rich_demo.PROVIDER_PORTRAITS[frappe.db.get_value("Provider", provider_id, "display_name")]
            for provider_id in business["providers"]
        }
        assert catalog["description"] == business["description"]

        release = frappe.get_doc("Experience Release", business["experience_release"])
        snapshot = json.loads(release.normalized_json)
        sections = {section["type"]: section["content"] for section in snapshot["sections"]}
        identity = snapshot["compiledDesign"]["identity"]
        assert identity["logoPrimary"] == rich_demo.DEMO_BRAND_RECIPES[key]["logo"]
        assert identity["logoCompact"] == rich_demo.DEMO_BRAND_RECIPES[key]["logo"]
        assert identity["favicon"] == rich_demo.DEMO_BRAND_RECIPES[key]["favicon"]
        expected_sections = {"hero", "services", "providers", "process", "benefits", "testimonials", "proof", "locations", "about", "faq", "contact", "booking_cta", "footer"}
        assert expected_sections <= set(sections)
        assert sections["hero"]["title"]["en"] == detail["headline"]
        assert sections["hero"]["primaryAction"]["label"]["en"] == detail["cta"]["hero_primary"]
        assert sections["hero"]["primaryAction"]["href"] == f"/{business['public_experience_path'].strip('/')}/book"
        assert sections["booking_cta"]["action"]["label"]["en"] == detail["cta"]["booking_primary"]
        assert sections["booking_cta"]["action"]["href"] == f"/{business['public_experience_path'].strip('/')}/book"
        assert len(sections["services"]["items"]) == len(service_ids)
        assert [item["name"]["en"] for item in sections["services"]["items"]] == [frappe.db.get_value("Service", service_id, "service_name") for service_id in service_ids]
        assert all("ETB" in item["summary"]["en"] and "minutes" in item["summary"]["en"] for item in sections["services"]["items"])
        assert [item["name"]["en"] for item in sections["providers"]["items"]] == [frappe.db.get_value("Provider", provider_id, "display_name") for provider_id in business["providers"]]
        assert all(item["specialties"] and item["credentials"] for item in sections["providers"]["items"])
        assert [item["image"] for item in sections["providers"]["items"]] == [rich_demo.PROVIDER_PORTRAITS[frappe.db.get_value("Provider", provider_id, "display_name")] for provider_id in business["providers"]]
        assert detail["trust"] in sections["about"]["body"]["en"]
        assert len(sections["footer"]["items"]) == 2
        assert len(sections["faq"]["items"]) == 3
        assert sections["contact"]["email"] == detail["contact"]["email"]
        assert sections["contact"]["phone"] == detail["contact"]["phone"]
        assert sections["contact"]["action"]["intent"] == "call"
        published_headlines.add(detail["headline"])
        published_ctas.add(detail["cta"]["booking_primary"])
        if key == "tena":
            snapshot_text = json.dumps(snapshot).lower()
            assert "guaranteed cure" not in snapshot_text
            assert "board-certified" not in snapshot_text
            assert "specialist physician" not in snapshot_text
        # The seed anchor can be yesterday when a long-lived stack crosses
        # midnight; always exercise a future date that is still inside the
        # seeded 30-day horizon.
        day = max(getdate(state["anchor_date"]), getdate()) + timedelta(days=1)
        while day.strftime("%A") not in business["days"]:
            day += timedelta(days=1)
        slot_result = booking.slots(business["offerings"][0]["id"], str(day), business["organization"])
        assert slot_result["total_slots_for_day"] > 0
        assert any(slot["available"] for slot in slot_result["all_available_slots_for_data"])
        assert any(slot["booked"] for slot in slot_result["all_available_slots_for_data"])
    assert len(published_headlines) == 5
    assert len(published_ctas) == 5
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
            "published brand and public site per business",
            "differentiated service/provider/location/public copy",
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
