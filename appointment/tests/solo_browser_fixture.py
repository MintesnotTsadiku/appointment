"""Exact cleanup for a new independent owner's managed browser journey."""

import json

import frappe

from appointment.tests.content_browser_bootstrap import USER
from appointment.tests.website_browser_fixture import WebsiteBrowserFixture


class SoloBrowserFixture(WebsiteBrowserFixture):
    def prepare(self, *, request):
        if frappe.local.site != "meet-beta-content-fresh-b.localhost" or not frappe.conf.get("worktree_development"):
            raise RuntimeError("Independent acceptance requires the second fresh isolated site")
        marker = "WQA-independentacceptance"
        if frappe.db.exists("Provider", {"user": USER}) or frappe.db.count("Organization"):
            raise RuntimeError("Independent acceptance must begin without a provider or organization")
        return {"ok": True, "fixture_identity": {"marker": marker, "user": USER, "site": frappe.local.site}}

    def provide_execution_context(self, *, fixture_identity, request):
        return {"environment": {"SOLO_QA_MARKER": fixture_identity["marker"]}}

    def cleanup(self, *, fixture_identity, request):
        from frappe.utils.password import delete_all_passwords_for
        from appointment.content.newsletter.core import TYPES

        providers = frappe.get_all("Provider", filters={"user": USER, "provider_name": fixture_identity["marker"]}, pluck="name")
        for provider in providers:
            sites = frappe.get_all("Public Site", filters={"owner_type": "Provider", "provider": provider}, pluck="name")
            profiles = frappe.get_all("Brand Profile", filters={"owner_type": "Provider", "provider": provider}, pluck="name")
            members = frappe.get_all("Newsletter Audience Member", filters={"provider": provider}, pluck="name")
            for name in members:
                delete_all_passwords_for("Newsletter Audience Member", name)
            for doctype in TYPES:
                self._delete(doctype, frappe.get_all(doctype, filters={"provider": provider}, pluck="name"))
            ownerships = frappe.get_all("Content Ownership", filters={"provider": provider}, fields=["name", "source_doctype", "source_name"])
            for row in ownerships:
                self._delete(row.source_doctype, [row.source_name])
            self._delete("Content Ownership", [row.name for row in ownerships])
            for site in sites:
                for doctype in ("Published Content Release", "Experience Release"):
                    self._delete(doctype, frappe.get_all(doctype, filters={"public_site": site}, pluck="name"))
                self._delete("Blog Category", frappe.get_all("Blog Category", filters={"title": "Website " + site}, pluck="name"))
                self._delete("Blogger", frappe.get_all("Blogger", filters={"short_name": "website-" + site}, pluck="name"))
                self._delete("Email Group", frappe.get_all("Email Group", filters={"title": "Website newsletter " + site}, pluck="name"))
            for outbox in frappe.get_all("Public Experience Outbox", fields=["name", "payload_json"]):
                if json.loads(outbox.payload_json or "{}").get("site") in sites:
                    self._delete("Public Experience Outbox", [outbox.name])
            self._delete("Public Site", sites)
            self._delete("Brand Revision", frappe.get_all("Brand Revision", filters={"brand_profile": ["in", profiles or ["__none__"]]}, pluck="name"))
            self._delete("Brand Profile", profiles)
            self._delete("Provider", [provider])
        frappe.db.commit()
        return {"ok": True, "exact_independent_businesses_removed": len(providers)}

    def audit(self, *, fixture_identity, request):
        marker = fixture_identity["marker"]
        counts = {doctype: frappe.db.count(doctype, {"provider": marker}) for doctype in (
            "Content Ownership", "Gallery Collection", "Published Content Release", "Newsletter Audience Member",
            "Newsletter Sender Identity", "Business Newsletter Campaign", "Local Email Message", "Brand Profile")}
        counts["Provider"] = frappe.db.count("Provider", {"user": USER, "provider_name": marker})
        counts["Public Site"] = frappe.db.count("Public Site", {"slug": marker.lower()})
        counts["Organization"] = frappe.db.count("Organization")
        count = sum(counts.values())
        return {"ok": count == 0, "remaining_record_count": count, "remaining": counts,
                "organization_proxy_created": False}


adapter = SoloBrowserFixture()
