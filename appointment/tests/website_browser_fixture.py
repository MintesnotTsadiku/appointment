"""Exact lifecycle for businesses created by the normal-owner browser journey."""

import json
from pathlib import Path
import tempfile

import frappe

from appointment.tests.content_browser_bootstrap import ALLOWED_SITES, USER


class WebsiteBrowserFixture:
    def prepare(self, *, request):
        if frappe.local.site not in ALLOWED_SITES or not frappe.conf.get("worktree_development"):
            raise RuntimeError("Website browser fixtures require the isolated development site")
        marker = "WQA-websiteacceptance"
        if frappe.db.exists("Organization", {"organization_name": ["in", [marker, marker + " Workbook"]]}) or frappe.db.exists("Public Site", {"slug": marker.lower()}):
            return {"ok": False, "error": "The acceptance identity already exists; preserve it and investigate.", "fixture_identity": {}}
        directory = tempfile.mkdtemp(prefix="appointment-workbook-qa-")
        return {"ok": True, "fixture_identity": {"marker": marker, "user": USER, "site": frappe.local.site, "workbook_directory": directory, "providers_before": frappe.get_all("Provider", filters={"user": USER}, pluck="name")}}

    def provide_execution_context(self, *, fixture_identity, request):
        from io import BytesIO
        from openpyxl import load_workbook
        from appointment.organization_import.workbook import template

        source = Path(frappe.get_app_path("appointment")) / "public/brand-experience/support/tena/scene-1.webp"
        directory = Path(fixture_identity["workbook_directory"])
        book = load_workbook(BytesIO(template()))
        book["Organization"].append(["clinic", fixture_identity["marker"], "Africa/Addis_Ababa", USER])
        book["Providers"].append(["owner", "Workbook owner", USER, "Synthetic owner"])
        book["Team"].append(["owner", USER, "Workbook owner", "Provider", "owner", "main,branch"])
        for key, label in (("main", "Workbook main"), ("branch", "Workbook branch")):
            book["Locations"].append([key, label, "Africa/Addis_Ababa", "Synthetic address", ""])
            book["Availability"].append([key + "-mon", key, "Monday", "09:00", "17:00", "Africa/Addis_Ababa"])
            book["Services"].append([key + "-visit", fixture_identity["marker"] + " " + label + " consultation", 30, 0, key, "owner", 1, 0])
        book["Website Content"].append(["intro", "hero_subtitle", "Reviewed workbook website introduction."])
        valid = directory / "valid.xlsx"
        invalid = directory / "invalid.xlsx"
        book.save(valid)
        book["Services"]["C2"] = "not a duration"
        book.save(invalid)
        book["Services"]["C2"] = 30
        book["Organization"]["A2"] = "new-clinic"
        book["Organization"]["B2"] = fixture_identity["marker"] + " Workbook"
        created = directory / "new.xlsx"
        book.save(created)
        book.close()
        return {"environment": {"WEBSITE_QA_MARKER": fixture_identity["marker"], "WEBSITE_QA_IMAGE": str(source),
                                "WEBSITE_QA_WORKBOOK": str(valid), "WEBSITE_QA_BAD_WORKBOOK": str(invalid),
                                "WEBSITE_QA_NEW_WORKBOOK": str(created), "WEBSITE_QA_SITE": frappe.local.site,
                                "WEBSITE_QA_PRIVATE_DIRECTORY": str(directory)}}

    def _organizations(self, identity):
        self._require_identity(identity)
        primary = frappe.get_all("Organization", filters={"organization_name": ["in", [identity["marker"], identity["marker"] + " Workbook"]],
                                 "owner_user": USER}, pluck="name")
        secondary = frappe.get_all("Organization", filters={"organization_name": identity["marker"] + " Isolation",
                                   "owner_user": identity["marker"].lower() + "-staff@example.test"}, pluck="name")
        return primary + secondary

    def _require_identity(self, identity):
        if frappe.local.site not in ALLOWED_SITES or identity.get("site") != frappe.local.site or identity.get("user") != USER or identity.get("marker") != "WQA-websiteacceptance":
            raise RuntimeError("Invalid website browser fixture identity")

    def _delete(self, doctype, names):
        if not names:
            return
        if doctype == "Blogger":
            frappe.db.delete("User Permission", {"allow": "Blogger", "for_value": ["in", names]})
        meta = frappe.get_meta(doctype)
        for field in meta.get_table_fields():
            frappe.db.delete(field.options, {"parenttype": doctype, "parent": ["in", names]})
        frappe.db.delete(doctype, {"name": ["in", names]})

    def cleanup(self, *, fixture_identity, request):
        organizations = self._organizations(fixture_identity)
        for organization in organizations:
            from frappe.utils.password import delete_all_passwords_for
            invitation_names = frappe.get_all("Business Staff Invitation", filters={"organization": organization}, pluck="name")
            for invitation_name in invitation_names:
                delete_all_passwords_for("Business Staff Invitation", invitation_name)
            self._delete("Business Staff Invitation", invitation_names)
            sites = frappe.get_all("Public Site", filters={"organization": organization}, pluck="name")
            profiles = frappe.get_all("Brand Profile", filters={"organization": organization}, pluck="name")
            from appointment.content.newsletter.core import TYPES
            from frappe.utils.password import delete_all_passwords_for

            members = frappe.get_all("Newsletter Audience Member", filters={"organization": organization}, pluck="name")
            for member in members:
                delete_all_passwords_for("Newsletter Audience Member", member)
            for doctype in TYPES:
                self._delete(doctype, frappe.get_all(doctype, filters={"organization": organization}, pluck="name"))
            ownerships = frappe.get_all("Content Ownership", filters={"organization": organization},
                                       fields=["name", "source_doctype", "source_name"])
            for own in ownerships:
                self._delete(own.source_doctype, [own.source_name])
            self._delete("Content Ownership", [row.name for row in ownerships])
            for file in frappe.get_all("File", filters={"attached_to_doctype": "Public Site",
                                                       "attached_to_name": ["in", sites or ["__none__"]]}, pluck="name"):
                frappe.delete_doc("File", file, force=True, ignore_permissions=True)
            for site in sites:
                self._delete("Email Group", frappe.get_all("Email Group", filters={"title": "Website newsletter " + site}, pluck="name"))
                self._delete("Blog Category", frappe.get_all("Blog Category", filters={"title": "Website " + site}, pluck="name"))
                self._delete("Blogger", frappe.get_all("Blogger", filters={"short_name": "website-" + site}, pluck="name"))
            for doctype in ("Published Content Release", "Experience Release"):
                self._delete(doctype, frappe.get_all(doctype, filters={"public_site": ["in", sites or ["__none__"]]}, pluck="name"))
            for outbox in frappe.get_all("Public Experience Outbox", fields=["name", "payload_json"]):
                if json.loads(outbox.payload_json or "{}").get("site") in sites:
                    self._delete("Public Experience Outbox", [outbox.name])
            self._delete("Brand Revision", frappe.get_all("Brand Revision", filters={"brand_profile": ["in", profiles or ["__none__"]]}, pluck="name"))
            self._delete("Public Site", sites)
            self._delete("Brand Profile", profiles)
            services = frappe.get_all("Service", filters={"organization": organization}, pluck="name")
            events = frappe.get_all("EventType", filters={"service": ["in", services or ["__none__"]]}, pluck="name")
            self._delete("EventType", events)
            self._delete("Service", services)
            self._delete("Location", frappe.get_all("Location", filters={"organization": organization}, pluck="name"))
            self._delete("Business Membership", frappe.get_all("Business Membership", filters={"organization": organization}, pluck="name"))
            self._delete("Organization Workbook Import", frappe.get_all("Organization Workbook Import", filters={"organization": organization}, pluck="name"))
            self._delete("Business Entitlement", frappe.get_all("Business Entitlement", filters={"organization": organization}, pluck="name"))
            # The workspace factory labels only its newly created provider with this exact business name.
            providers = frappe.get_all("Provider", filters={"user": USER,
                "provider_name": ["like", fixture_identity["marker"] + " — %"]}, pluck="name")
            self._delete("Provider", providers)
            self._delete("Provider", frappe.get_all("Provider", filters={"user": USER,
                         "provider_name": organization + " — Workbook owner"}, pluck="name"))
            self._delete("Organization", [organization])
        staff_email = fixture_identity["marker"].lower() + "-staff@example.test"
        new_owner_providers = [name for name in frappe.get_all("Provider", filters={"user": USER}, pluck="name")
                               if name not in fixture_identity.get("providers_before", [])]
        self._delete("Provider", new_owner_providers)
        self._delete("Provider", frappe.get_all("Provider", filters={"user": staff_email}, pluck="name"))
        accounts = frappe.get_all("Browser Account", filters={"owner_user": staff_email, "account_label": "Acceptance receptionist — " + frappe.local.site}, pluck="name")
        from agent_harness.browser.governed_runtime import is_storage_state_ref, storage_state_path_for_ref
        for account in accounts:
            sessions = frappe.get_all("Browser Session", filters={"browser_account": account}, fields=["name", "encrypted_profile_ref"])
            for session in sessions:
                if is_storage_state_ref(session.encrypted_profile_ref):
                    storage_state_path_for_ref(session.encrypted_profile_ref).unlink(missing_ok=True)
            self._delete("Browser Session", [row.name for row in sessions])
            from frappe.utils.password import delete_all_passwords_for
            delete_all_passwords_for("Browser Account", account)
        self._delete("Browser Account", accounts)
        if frappe.db.exists("User", staff_email):
            frappe.delete_doc("User", staff_email, force=True, ignore_permissions=True)
        frappe.db.commit()
        directory = Path(fixture_identity.get("workbook_directory", ""))
        if directory.parent != Path(tempfile.gettempdir()) or not directory.name.startswith("appointment-workbook-qa-"):
            raise RuntimeError("Workbook fixture directory is outside the owned temporary scope")
        for name in ("valid.xlsx", "invalid.xlsx", "new.xlsx", "staff-credentials.json"):
            (directory / name).unlink(missing_ok=True)
        directory.rmdir()
        return {"ok": True, "deleted_businesses": len(organizations)}

    def audit(self, *, fixture_identity, request):
        remaining = self._organizations(fixture_identity)
        marker = fixture_identity["marker"]
        scope = [marker, marker + " Workbook", marker + " Isolation"]
        counts = {"Organization": len(remaining),
                  "Business Entitlement": frappe.db.count("Business Entitlement", {"organization": ["in", scope]}),
                  "Organization Workbook Import": frappe.db.count("Organization Workbook Import", {"organization": ["in", scope]}),
                  "Imported Locations": frappe.db.count("Location", {"organization": ["in", scope]}),
                  "Imported Services": frappe.db.count("Service", {"organization": ["in", scope]}),
                  "Imported Memberships": frappe.db.count("Business Membership", {"organization": ["in", scope]}),
                  "Imported Providers": frappe.db.count("Provider", {"user": USER, "provider_name": ["in", [name + " — Workbook owner" for name in scope]]}),
                  "Imported Offerings": frappe.db.count("EventType", {"event_type_name": ["like", marker + " Workbook%"]}),
                  "Content Ownership": frappe.db.count("Content Ownership", {"organization": ["in", scope]}),
                  "Gallery Collection": frappe.db.count("Gallery Collection", {"organization": ["in", scope]}),
                  "Published Content Release": frappe.db.count("Published Content Release", {"organization": ["in", scope]}),
                  "Public Site": frappe.db.count("Public Site", {"organization": ["in", scope]}),
                  "Brand Profile": frappe.db.count("Brand Profile", {"organization": ["in", scope]}),
                  "Location": frappe.db.count("Location", {"location_name": marker + " Main"}),
                  "Service": frappe.db.count("Service", {"service_name": marker + " Consultation"}),
                  "Blog Post": frappe.db.count("Blog Post", {"title": marker + " Preparing for your visit"}),
                  "Provider": frappe.db.count("Provider", {"user": USER, "provider_name": ["like", marker + " — %"]})}
        from appointment.content.newsletter.core import TYPES

        counts.update({doctype: frappe.db.count(doctype, {"organization": ["in", scope]}) for doctype in TYPES})
        counts["Staff Invitations"] = frappe.db.count("Business Staff Invitation", {"organization": ["in", scope]})
        counts["Invited Staff"] = int(bool(frappe.db.exists("User", marker.lower() + "-staff@example.test")))
        count = sum(counts.values())
        return {"ok": count == 0, "remaining_record_count": count, "remaining": counts}


adapter = WebsiteBrowserFixture()
