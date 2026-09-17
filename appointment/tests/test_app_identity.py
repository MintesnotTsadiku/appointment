import importlib
import unittest

import frappe

CANONICAL_APP = "appointment"
LEGACY_APP = "frappe_appointment"

BUSINESS_BASELINE = {
    "Appointment": 70,
    "Organization": 3,
    "Provider": 5,
    "Service": 79,
}


class TestAppIdentity(unittest.TestCase):
    def test_canonical_app_is_installed(self):
        self.assertIn(CANONICAL_APP, frappe.get_installed_apps())
        self.assertNotIn(LEGACY_APP, frappe.get_installed_apps())

    def test_app_path_resolves_to_canonical_package(self):
        path = frappe.get_app_path(CANONICAL_APP)
        self.assertTrue(path.endswith(f"/{CANONICAL_APP}"), path)

    def test_legacy_import_shim_points_at_canonical_package(self):
        canonical = importlib.import_module(CANONICAL_APP)
        legacy = importlib.import_module(LEGACY_APP)
        self.assertEqual(legacy.__file__, canonical.__file__)
        # A nested module still resolves through the shim.
        shim_submodule = importlib.import_module(f"{LEGACY_APP}.api.personal_meet")
        self.assertTrue(shim_submodule.__file__.endswith("/appointment/api/personal_meet.py"))

    def test_module_defs_are_owned_by_canonical_app(self):
        app_names = {
            row[0]
            for row in frappe.db.sql(
                "SELECT DISTINCT app_name FROM `tabModule Def` WHERE app_name IN (%s, %s)",
                (CANONICAL_APP, LEGACY_APP),
            )
        }
        self.assertEqual(app_names, {CANONICAL_APP})

    def test_scheduled_jobs_use_canonical_dotted_paths(self):
        methods = frappe.get_all(
            "Scheduled Job Type",
            filters={"method": ["like", f"{CANONICAL_APP}.%"]},
            pluck="method",
        )
        self.assertTrue(methods)
        legacy = frappe.get_all(
            "Scheduled Job Type",
            filters={"method": ["like", f"{LEGACY_APP}.%"]},
            pluck="method",
        )
        self.assertEqual(legacy, [])

    def test_business_records_preserved(self):
        # On a fresh install the tables are empty; on the cloned production site
        # the exact baseline must be preserved by the identity migration.
        counts = {dt: frappe.db.count(dt) for dt in BUSINESS_BASELINE}
        if not any(counts.values()):
            self.skipTest("fresh site has no business records to compare")
        self.assertEqual(counts, BUSINESS_BASELINE)
