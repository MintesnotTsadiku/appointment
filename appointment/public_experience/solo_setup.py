"""Self-owned independent provider setup without an organization proxy."""

import frappe
from frappe import _
import pytz
from frappe.utils import now_datetime

from appointment.onboarding import _ONBOARDING_UPDATE
from appointment.scheduler import membership, registration


@frappe.whitelist(methods=["POST"])
def create(business_name, timezone="Africa/Addis_Ababa"):
    user = frappe.session.user
    registration.require_may_start_business(user)
    if not isinstance(business_name, str) or not business_name.strip() or len(business_name) > 100:
        frappe.throw(_("Enter a business name of at most 100 characters."))
    if timezone not in pytz.all_timezones:
        frappe.throw(_("Choose a valid time zone."))
    frappe.db.sql("select name from `tabUser` where name=%s for update", user)
    names = frappe.get_all("Provider", filters={"user": user, "is_active": 1}, pluck="name", limit=2)
    if len(names) > 1:
        frappe.throw(_("Choose an existing provider business in Website setup."))
    provider = frappe.get_doc("Provider", names[0]) if names else frappe.get_doc({
        "doctype": "Provider", "user": user, "provider_name": business_name.strip(), "is_active": 1})
    if provider.organization or provider.organizations:
        frappe.throw(_("This provider belongs to an organization. Use its business workspace."), frappe.PermissionError)
    provider.update({"full_name": business_name.strip(), "provider_name": business_name.strip(),
                     "timezone": timezone, "organization_status": "Independent", "onboarding_type": "individual",
                     "onboarding_complete": 1, "onboarding_completed_at": now_datetime()})
    provider.flags.onboarding_update = _ONBOARDING_UPDATE
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        if provider.is_new():
            provider.insert(ignore_permissions=True)
        else:
            provider.save(ignore_permissions=True)
    finally:
        frappe.flags.syncing_booking_urls = previous
    membership.grant_roles(user, ("Provider",))
    return {"provider": provider.name, "business_name": provider.provider_name, "landing": "/settings/independent-booking"}
