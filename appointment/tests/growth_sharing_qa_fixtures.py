"""QA fixtures for the Grow page sharing tools (workstream B).

- Bloom Studio (showcase) is used read-only: the owner opens Grow, copies and shares, previews the card,
  opens the poster and checks short-link ideas. The run never changes a showcase slug.
- A fixture independent business with its own published website, for the Amharic dark mobile run and
  the slug change, which the run reverts in the same scenario.

Run `setup` before `qa/manifests/growth/sharing-*.yaml` and `cleanup` afterwards. Cleanup deletes
only the records this module created, by exact name.
"""

import json

import frappe

from appointment.demo import showcase

USER = "qa-sharing-owner@example.test"
BUSINESS = "Lemlem Beauty Corner"
SLUG = "lemlem-beauty-corner"
STATE_KEY = "appointment_growth_sharing_qa"
DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


def setup():
    from appointment.public_experience import setup as website, solo_setup
    from appointment.scheduler import independent

    frappe.set_user("Administrator")
    cleanup()
    frappe.get_doc(dict(doctype="User", email=USER, first_name="Lemlem", last_name="Tadesse", send_welcome_email=0,
                        enabled=1, user_type="System User", roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True
    try:
        frappe.set_user(USER)
        provider = solo_setup.create(BUSINESS)["provider"]
        independent.create(provider, "Lemlem studio, Piassa", "Braiding", "Africa/Addis_Ababa", 60, "08:30", "18:30",
                           [day for day in DAYS if day != "Sunday"])
        independent.publish(provider, 1)
        draft = website.start("Provider", provider, BUSINESS, SLUG, "selam-movement")
        frappe.set_user("Administrator")
        site = frappe.get_doc("Public Site", draft["site"])
        if "am" not in [row.locale for row in site.enabled_locales]:
            site.append("enabled_locales", {"locale": "am", "enabled": 1, "translation_status": "Complete"})
            site.save(ignore_permissions=True)
        frappe.set_user(USER)
        website.publish(site.name, frappe.db.get_value("Public Site", site.name, "draft_version"))
    finally:
        frappe.flags.syncing_booking_urls = previous
        frappe.set_user("Administrator")
    frappe.db.set_default(STATE_KEY, json.dumps({"provider": provider, "site": site.name}))
    frappe.db.commit()
    return {"provider": provider, "site": site.name}


def browser_values(manifest=None):
    values = showcase.browser_values(manifest)
    state = json.loads(frappe.db.get_default(STATE_KEY) or "{}")
    bloom = showcase.load_state()["businesses"]["bloom"]
    values["qa_share_bloom_key"] = bloom["organization"]
    values["qa_share_bloom_slug"] = frappe.db.get_value("Public Site", {"organization": bloom["organization"],
                                                         "status": "Published"}, "slug") or ""
    values["qa_share_solo_key"] = "Provider:" + state.get("provider", "")
    values["qa_share_solo_slug"] = SLUG
    values["qa_share_solo_new_slug"] = "lemlem-braids"
    return values


def cleanup():
    """Remove the fixture business. Every delete uses one exact name; nothing is filtered by a list."""

    frappe.set_user("Administrator")
    previous = frappe.flags.syncing_booking_urls
    frappe.flags.syncing_booking_urls = True  # the booking-URL sync commits; cleanup commits once at the end
    try:
        for provider in frappe.get_all("Provider", filters={"user": USER}, pluck="name"):
            _remove_sites("Provider", provider)
            for doctype, field in (("Appointment", "provider"), ("EventType", "provider")):
                for name in frappe.get_all(doctype, filters={field: provider}, pluck="name"):
                    frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)
            for doctype in ("Customer Profile", "Service", "Location"):
                for name in frappe.get_all(doctype, filters={"independent_provider": provider}, pluck="name"):
                    frappe.delete_doc(doctype, name, ignore_permissions=True, force=True)
            frappe.delete_doc("Provider", provider, ignore_permissions=True, force=True)
        if frappe.db.exists("User", USER):
            frappe.delete_doc("User", USER, ignore_permissions=True, force=True)
    finally:
        frappe.flags.syncing_booking_urls = previous
    frappe.db.set_default(STATE_KEY, "")
    frappe.db.commit()


def _remove_sites(owner_type, owner):
    field = "organization" if owner_type == "Organization" else "provider"
    for site in frappe.get_all("Public Site", filters={"owner_type": owner_type, field: owner}, pluck="name"):
        for alias in frappe.get_all("Public Site Slug Alias", filters={"public_site": site}, pluck="name"):
            frappe.delete_doc("Public Site Slug Alias", alias, ignore_permissions=True, force=True)
        frappe.db.set_value("Public Site", site, "current_release", None, update_modified=False)
        for doctype in ("Published Content Release", "Experience Release"):
            if frappe.db.exists("DocType", doctype):
                for name in frappe.get_all(doctype, filters={"public_site": site}, pluck="name"):
                    frappe.db.delete(doctype, {"name": name})
        frappe.delete_doc("Public Site", site, ignore_permissions=True, force=True)
    for profile in frappe.get_all("Brand Profile", filters={"owner_type": owner_type, field: owner}, pluck="name"):
        frappe.db.set_value("Brand Profile", profile, "active_revision", None, update_modified=False)
        for revision in frappe.get_all("Brand Revision", filters={"brand_profile": profile}, pluck="name"):
            frappe.db.delete("Brand Revision", {"name": revision})
        frappe.delete_doc("Brand Profile", profile, ignore_permissions=True, force=True)
