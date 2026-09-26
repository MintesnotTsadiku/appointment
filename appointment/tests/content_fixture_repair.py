"""Explicit repair of two known, interrupted synthetic test fixtures."""

import re

import frappe

from appointment.tests.test_content_entitlements import require_target, purge_markers
from appointment.tests.website_browser_fixture import WebsiteBrowserFixture


def run():
    require_target()
    frappe.set_user("Administrator")
    adapter = WebsiteBrowserFixture()
    providers = [row.name for row in frappe.get_all("Provider", fields=["name", "provider_name", "user"])
                 if re.fullmatch(r"Independent website [a-zA-Z0-9]{8}", row.provider_name or "")
                 and re.fullmatch(r"cnt-[a-zA-Z0-9]{8}-owner-[ab]@example.test", row.user or "")]
    sites = frappe.get_all("Public Site", filters={"provider": ["in", providers or ["__none__"]]}, pluck="name")
    for row in frappe.get_all("Public Site", filters={"site_title": "Permission check", "slug": ["like", "permission-check%"]}, fields=["name", "organization"]):
        organization = frappe.db.get_value("Organization", row.organization, "organization_name")
        if not re.fullmatch(r"CNT-[a-zA-Z0-9]{8} Business A", organization or row.organization or ""):
            raise RuntimeError("Refusing to repair a non-fixture website")
        sites.append(row.name)
    profiles = [frappe.db.get_value("Public Site", site, "brand_profile") for site in sites]
    profiles = [name for name in profiles if name]
    for profile in frappe.get_all("Brand Profile", filters={"profile_name": "Permission check"}, fields=["name", "organization"]):
        if re.fullmatch(r"CNT-[a-zA-Z0-9]{8} Business A", profile.organization or ""):
            references = frappe.get_all("Public Site", filters={"brand_profile": profile.name}, pluck="name")
            if any(name not in sites for name in references):
                raise RuntimeError("Refusing to remove a profile referenced outside the diagnostic fixture")
            profiles.append(profile.name)
    profiles = list(set(profiles))
    for site in sites:
        ownership = frappe.get_all("Content Ownership", filters={"public_site": site}, fields=["name", "source_doctype", "source_name"])
        for row in ownership:
            adapter._delete(row.source_doctype, [row.source_name])
        adapter._delete("Content Ownership", [row.name for row in ownership])
        for doctype in ("Experience Release", "Published Content Release"):
            adapter._delete(doctype, frappe.get_all(doctype, filters={"public_site": site}, pluck="name"))
    adapter._delete("Public Site", sites)
    adapter._delete("Brand Revision", frappe.get_all("Brand Revision", filters={"brand_profile": ["in", profiles or ["__none__"]]}, pluck="name"))
    adapter._delete("Brand Profile", profiles)
    adapter._delete("Provider", providers)
    frappe.db.commit()
    return {"known_fixture_sites_removed": len(sites), "known_fixture_providers_removed": len(providers), "remaining": purge_markers()}
