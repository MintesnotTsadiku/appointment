"""Normal-owner workbook confirmation, isolation, retry, and transaction tests."""

from io import BytesIO
import json
import re
import sys
import unittest
from unittest.mock import patch

import frappe
from openpyxl import load_workbook

from appointment.organization_import import service, workbook
from appointment.tests.test_content_entitlements import EntitlementIsolationTests, _cleanup, require_target


class OrganizationImportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        EntitlementIsolationTests.setUpClass()
        cls.fixture = EntitlementIsolationTests.state

    @classmethod
    def tearDownClass(cls):
        _cleanup(cls.fixture)

    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("workbook_test")
        frappe.set_user(self.fixture["owners"]["A"])

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="workbook_test")

    def content(self, change=None):
        user = self.fixture["owners"]["A"]
        book = load_workbook(BytesIO(workbook.template()))
        book["Organization"].append(["clinic", self.fixture["orgs"]["A"], "Africa/Addis_Ababa", user])
        for key, label in (("main", "Main"), ("branch", "Branch")):
            book["Locations"].append([key, label, "Africa/Addis_Ababa", "Synthetic address", ""])
            book["Availability"].append([key + "-mon", key, "Monday", "09:00", "17:00", "Africa/Addis_Ababa"])
            book["Services"].append([key + "-visit", label + " consultation", 30, 0, key, "owner", 1, 0])
        book["Providers"].append(["owner", "Workbook owner", user, "Synthetic owner"])
        book["Team"].append(["owner", user, "Workbook owner", "Provider", "owner", "main,branch"])
        if change:
            change(book)
        output = BytesIO()
        book.save(output)
        book.close()
        return output.getvalue()

    def confirm(self, content, confirmed=1, digest=None):
        return service.confirm(content, self.fixture["orgs"]["A"], digest or workbook.dry_run(content)["sha256"], confirmed)

    def test_owner_imports_two_locations_and_retry_does_not_duplicate(self):
        content = self.content()
        result = self.confirm(content)
        self.assertTrue(result["valid"])
        audit = frappe.get_doc("Organization Workbook Import", result["audit"])
        mapping = json.loads(audit.mapping_json)
        self.assertEqual(len(mapping["Locations"]), 2)
        self.assertEqual(len(mapping["Services"]), 2)
        self.assertEqual(audit.imported_by, self.fixture["owners"]["A"])
        repeated = self.confirm(content)
        self.assertTrue(repeated["replayed"])
        self.assertEqual(result["audit"], repeated["audit"])

    def test_correction_updates_records_by_stable_keys(self):
        first = self.confirm(self.content())
        original = json.loads(frappe.get_doc("Organization Workbook Import", first["audit"]).mapping_json)
        corrected = self.content(lambda book: setattr(book["Services"]["C2"], "value", 45))
        second = self.confirm(corrected)
        current = json.loads(frappe.get_doc("Organization Workbook Import", second["audit"]).mapping_json)
        self.assertEqual(original, current)
        self.assertEqual(frappe.db.get_value("Service", current["Services"]["main-visit"], "duration"), 45)

    def test_confirmation_and_reviewed_hash_are_required(self):
        content = self.content()
        for confirmed, digest in ((0, None), (1, "changed")):
            with self.assertRaises(frappe.ValidationError):
                self.confirm(content, confirmed, digest)
        self.assertEqual(frappe.db.count("Organization Workbook Import", {"organization": self.fixture["orgs"]["A"]}), 0)

    def test_new_business_creation_and_retry_use_normal_permissions(self):
        label = "Workbook-new-" + frappe.generate_hash(length=8)
        content = self.content(lambda book: setattr(book["Organization"]["B2"], "value", label))
        before = frappe.db.count("Organization", {"owner_user": frappe.session.user})
        proposed = service.preview(content, None)
        self.assertTrue(proposed["valid"])
        self.assertEqual(frappe.db.count("Organization", {"owner_user": frappe.session.user}), before)
        result = service.confirm(content, None, proposed["sha256"], 1)
        self.assertEqual(result["organization"], label)
        self.assertEqual(frappe.db.get_value("Organization", label, "owner_user"), frappe.session.user)
        self.assertTrue(service.confirm(content, None, proposed["sha256"], 1)["replayed"])
        self.assertEqual(frappe.db.count("Organization", {"owner_user": frappe.session.user}), before + 1)

    def test_untrusted_organization_insert_cannot_supply_factory_capability(self):
        with self.assertRaises(frappe.PermissionError):
            frappe.get_doc({"doctype": "Organization", "organization_name": "Untrusted-workbook",
                            "owner_user": frappe.session.user, "is_active": 1}).insert()

    def test_failed_new_business_import_rolls_back_without_adopting_foreign_location(self):
        label = "Workbook-new-" + frappe.generate_hash(length=8)
        location_name = label + " — Main"
        frappe.set_user("Administrator")
        syncing = frappe.flags.syncing_booking_urls
        try:
            frappe.flags.syncing_booking_urls = True
            frappe.get_doc({"doctype": "Location", "location_name": location_name,
                            "organization": self.fixture["orgs"]["B"], "timezone": "Africa/Addis_Ababa"}).insert()
        finally:
            frappe.flags.syncing_booking_urls = syncing
        frappe.set_user(self.fixture["owners"]["A"])
        content = self.content(lambda book: setattr(book["Organization"]["B2"], "value", label))
        with self.assertRaises(frappe.DuplicateEntryError):
            service.confirm(content, None, workbook.dry_run(content)["sha256"], 1)
        self.assertFalse(frappe.db.exists("Organization", label))
        self.assertEqual(frappe.db.get_value("Location", location_name, "organization"), self.fixture["orgs"]["B"])

    def test_foreign_owner_cannot_confirm_or_read_audit(self):
        content = self.content()
        result = self.confirm(content)
        frappe.set_user(self.fixture["owners"]["B"])
        with self.assertRaises(frappe.PermissionError):
            self.confirm(content)
        with self.assertRaises(frappe.PermissionError):
            frappe.get_doc("Organization Workbook Import", result["audit"]).check_permission("read")
        self.assertNotIn(result["audit"], frappe.get_list("Organization Workbook Import", pluck="name"))

    def test_failed_application_rolls_back_all_created_rows(self):
        content = self.content(lambda book: book["Website Content"].append(["hero", "hero_title", "Synthetic headline"]))
        before = frappe.db.count("Location", {"organization": self.fixture["orgs"]["A"]})
        with patch("appointment.organization_import.website.apply", side_effect=frappe.ValidationError("Synthetic application failure")):
            with self.assertRaises(frappe.ValidationError):
                self.confirm(content)
        self.assertEqual(frappe.db.count("Location", {"organization": self.fixture["orgs"]["A"]}), before)
        self.assertEqual(frappe.db.count("Organization Workbook Import", {"organization": self.fixture["orgs"]["A"]}), 0)

    def test_website_starter_text_survives_import_before_website_setup(self):
        from appointment.public_experience import setup

        content = self.content(lambda book: book["Website Content"].append(["hero", "hero_title", "Reviewed imported headline"]))
        self.assertTrue(service.preview(content, self.fixture["orgs"]["A"])["valid"])
        result = self.confirm(content)
        audit = frappe.get_doc("Organization Workbook Import", result["audit"])
        self.assertEqual(json.loads(audit.website_content_json)[0]["text"], "Reviewed imported headline")
        draft = setup.start("Organization", self.fixture["orgs"]["A"], "Workbook website", "workbook-pending-test", "tena-clinic")
        hero = next(row for row in draft["sections"] if row["type"] == "hero")
        self.assertEqual(hero["content"]["title"]["en"], "Reviewed imported headline")

    def test_invalid_contact_text_is_reported_without_writes(self):
        content = self.content(lambda book: book["Website Content"].append(["contact", "contact_email", "not an email"]))
        before = frappe.db.count("Location")
        result = service.preview(content, self.fixture["orgs"]["A"])
        self.assertFalse(result["valid"])
        self.assertEqual(result["errors"][0]["cell"], "C2")
        self.assertEqual(frappe.db.count("Location"), before)

    def test_import_audit_cannot_be_edited_or_forged(self):
        result = self.confirm(self.content())
        audit = frappe.get_doc("Organization Workbook Import", result["audit"])
        with self.assertRaises(frappe.PermissionError):
            audit.save()
        audit.name = None
        audit.__islocal = 1
        audit.flags.workbook_factory = None
        with self.assertRaises(frappe.PermissionError):
            audit.insert()


def run():
    require_target()
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(OrganizationImportTests))
    report = {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
    if not result.wasSuccessful():
        raise RuntimeError(json.dumps(report))
    return report


def failed_new_businesses():
    require_target()
    rows = frappe.get_all("Organization", filters={"name": ["like", "Workbook-new-%"]}, fields=["name", "owner_user"])
    return [row for row in rows if re.fullmatch(r"cnt-[a-z0-9]{8}-owner-a@example\.test", row.owner_user or "")]


def purge_failed_business(name, user):
    require_target()
    if {"name": name, "owner_user": user} not in failed_new_businesses():
        raise RuntimeError("This is not an exact reserved failed workbook fixture")
    frappe.set_user("Administrator")
    if frappe.db.exists("Public Site", {"organization": name}):
        raise RuntimeError("Preserve this business: it has an unexpected public site")
    audits = frappe.get_all("Organization Workbook Import", filters={"organization": name}, fields=["name", "mapping_json", "imported_by"])
    if len(audits) != 1 or audits[0].imported_by != user:
        raise RuntimeError("The failed workbook audit does not match its synthetic owner")
    mapping = json.loads(audits[0].mapping_json)
    if set(mapping.get("Locations", {})) != {"main", "branch"} or set(mapping.get("Providers", {})) != {"owner"}:
        raise RuntimeError("The failed workbook records do not match the exact test")
    from appointment.tests.website_browser_fixture import WebsiteBrowserFixture

    delete = WebsiteBrowserFixture()._delete
    for sheet in ("Offerings", "Services", "Locations", "Providers"):
        delete(service.TYPES[sheet], list(mapping.get(sheet, {}).values()))
    delete("Business Membership", frappe.get_all("Business Membership", filters={"organization": name}, pluck="name"))
    delete("Organization Workbook Import", [audits[0].name])
    delete("Organization", [name])
    if not frappe.db.exists("Organization", {"owner_user": user}):
        frappe.delete_doc("User", user, force=True, ignore_permissions=True)
    frappe.db.commit()
    return {"removed_business": name, "remaining_businesses": frappe.db.count("Organization", {"name": name})}
