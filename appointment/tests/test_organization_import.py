"""Normal-owner workbook confirmation, isolation, retry, and transaction tests."""

from io import BytesIO
import json
import sys
import unittest

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
        with self.assertRaises(frappe.ValidationError):
            self.confirm(content)
        self.assertEqual(frappe.db.count("Location", {"organization": self.fixture["orgs"]["A"]}), before)
        self.assertEqual(frappe.db.count("Organization Workbook Import", {"organization": self.fixture["orgs"]["A"]}), 0)

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
