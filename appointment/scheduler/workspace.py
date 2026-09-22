"""Authenticated business setup and publication through the owned offering model."""

import hashlib
import json
import re

import frappe
import pytz
from frappe import _
from frappe.utils import get_time

from appointment.scheduler import membership
from appointment.scheduler.booking import lock_provider, offering
from appointment.scheduler.booking_access import managed_organizations

_SETUP_CREATE = object()
DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


def require_provider_account():
    """Any enabled signed-in account may create its own business.

    Owners are granted the Provider and Organization Manager capabilities when
    the business is created, so a brand new signup can complete setup without a
    manual role change.
    """
    user = frappe.session.user
    if user == "Guest" or not frappe.db.get_value("User", user, "enabled"):
        frappe.throw(_("Sign in to set up a business."), frappe.PermissionError)
    return user


@frappe.whitelist()
def overview():
    require_provider_account()
    organizations = managed_organizations()
    rows = []
    for name in organizations:
        org = frappe.get_doc("Organization", name)
        for event in frappe.get_all(
            "EventType",
            filters={
                "service": ["in", frappe.get_all("Service", filters={"organization": name}, pluck="name") or [""]]
            },
            fields=["name", "service", "provider", "location", "is_active"],
        ):
            rows.append(
                dict(
                    organization=name,
                    business_name=org.organization_name,
                    published=bool(org.enable_public_booking and event.is_active),
                    offering=event.name,
                    service=frappe.db.get_value("Service", event.service, "service_name"),
                    timezone=frappe.db.get_value("Location", event.location, "timezone"),
                    public_path=f"/schedule/org/{org.slug}/{event.name}",
                )
            )
    return rows


@frappe.whitelist(methods=["POST"])
def create(business_name, location_name, service_name, timezone, duration, opens_at, closes_at, weekdays, request_id):
    user = require_provider_account()
    if timezone not in pytz.all_timezones:
        frappe.throw(_("Choose a valid IANA time zone."))
    duration = int(duration)
    if duration < 5 or duration > 480:
        frappe.throw(_("Duration must be between 5 and 480 minutes."))
    days = json.loads(weekdays) if isinstance(weekdays, str) else weekdays
    if not isinstance(days, list) or not days or any(day not in DAYS for day in days):
        frappe.throw(_("Choose at least one operating day."))
    if get_time(opens_at) >= get_time(closes_at):
        frappe.throw(_("Closing time must follow opening time on the same day."))
    if not re.fullmatch(r"[A-Za-z0-9_-]{16,100}", request_id or ""):
        frappe.throw(_("A setup request identity is required."))
    for label in (business_name, location_name, service_name):
        if not str(label or "").strip() or len(label) > 100:
            frappe.throw(_("Names must contain 1–100 characters."))
    # Serialize self-setup retries and give this operation an unguessable stable slug.
    key = hashlib.sha256((user + "\0" + request_id).encode()).hexdigest()
    slug = "business-" + key[:24]
    payload = dict(
        business=business_name.strip(),
        location=location_name.strip(),
        service=service_name.strip(),
        timezone=timezone,
        duration=duration,
        opens_at=str(get_time(opens_at)),
        closes_at=str(get_time(closes_at)),
        days=sorted(set(days)),
    )
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    lock_provider(frappe._dict(user=user))
    existing = frappe.db.sql(
        "select setup_request_hash, setup_request_result from `tabOrganization` where setup_request_key=%s and owner_user=%s for update",
        (key, user),
        as_dict=True,
    )
    if existing:
        if existing[0].setup_request_hash != digest:
            frappe.throw(_("This setup request was already used for different details."))
        return json.loads(existing[0].setup_request_result)
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        org = frappe.get_doc(
            dict(
                doctype="Organization",
                organization_name=business_name.strip(),
                slug=slug,
                owner_user=user,
                organization_type="Other",
                timezone=timezone,
                is_active=1,
                enable_public_booking=0,
                setup_request_key=key,
                setup_request_hash=digest,
            )
        )
        org.flags.workspace_setup = _SETUP_CREATE
        org.insert(ignore_permissions=True)
        provider = frappe.get_doc(
            dict(
                doctype="Provider",
                provider_name=f"{business_name.strip()} — {frappe.db.get_value('User', user, 'full_name')}",
                user=user,
                is_active=1,
                use_default_hours=1,
                organizations=[dict(organization=org.name, status="Active", accept_org_bookings=1)],
            )
        ).insert(ignore_permissions=True)
        location = frappe.get_doc(
            dict(
                doctype="Location",
                location_name=location_name.strip(),
                organization=org.name,
                timezone=timezone,
                is_active=1,
                opening_hours=[
                    dict(day_of_week=day, is_open=int(day in days), start_time=opens_at, end_time=closes_at)
                    for day in DAYS
                ],
            )
        ).insert(ignore_permissions=True)
        service = frappe.get_doc(
            dict(
                doctype="Service",
                service_name=service_name.strip(),
                organization=org.name,
                duration=duration,
                price=0,
                use_default_hours=1,
                is_active=1,
            )
        ).insert(ignore_permissions=True)
        event = frappe.get_doc(
            dict(
                doctype="EventType",
                event_type_name=service_name.strip(),
                service=service.name,
                provider=provider.name,
                location=location.name,
                is_active=1,
            )
        ).insert(ignore_permissions=True)
        offering(event.name)
        membership.grant_roles(user, ("Provider", "Organization Manager"))
        result = next(row for row in overview() if row["organization"] == org.name)
        org.setup_request_result = json.dumps(result)
        org.save(ignore_permissions=True)
        return result
    finally:
        frappe.flags.syncing_booking_urls = previous


@frappe.whitelist(methods=["POST"])
def publish(organization, published):
    require_provider_account()
    if organization not in managed_organizations():
        frappe.throw(_("Only this business's manager can publish its booking page."), frappe.PermissionError)
    enabled = frappe.utils.cint(published)
    if enabled not in (0, 1):
        frappe.throw(_("Invalid publication state."))
    if enabled:
        rows = [row for row in overview() if row["organization"] == organization]
        if not rows:
            frappe.throw(_("Create an offering before publishing."))
        for row in rows:
            offering(row["offering"])
    org = frappe.get_doc("Organization", organization)
    org.enable_public_booking = enabled
    org.save(ignore_permissions=True)
    return {"published": bool(enabled)}
