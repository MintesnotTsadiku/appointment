import importlib
import unittest

import frappe

CANONICAL_APP = "appointment"

BUSINESS_BASELINE = {
    "Appointment": 70,
    "Organization": 3,
    "Provider": 5,
    "Service": 79,
}

APP_MODULES = (
    "Assistants",
    "Channels",
    "Frappe Appointment",
    "Payments",
    "Scheduler",
    "Tasks",
)


class TestAppIdentity(unittest.TestCase):
    def test_canonical_app_is_installed(self):
        self.assertIn(CANONICAL_APP, frappe.get_installed_apps())

    def test_app_path_resolves_to_canonical_package(self):
        path = frappe.get_app_path(CANONICAL_APP)
        self.assertTrue(path.endswith(f"/{CANONICAL_APP}"), path)

    def test_public_api_modules_import_from_canonical_package(self):
        module = importlib.import_module(f"{CANONICAL_APP}.api.personal_meet")
        self.assertTrue(module.__file__.endswith("/appointment/api/personal_meet.py"))

    def test_module_defs_are_owned_by_canonical_app(self):
        rows = frappe.get_all(
            "Module Def",
            filters={"name": ["in", APP_MODULES]},
            fields=["name", "app_name"],
        )
        self.assertEqual({row.name for row in rows}, set(APP_MODULES))
        self.assertEqual({row.app_name for row in rows}, {CANONICAL_APP})

    def test_scheduled_jobs_use_canonical_dotted_paths(self):
        methods = frappe.get_all(
            "Scheduled Job Type",
            filters={"method": ["like", f"{CANONICAL_APP}.%"]},
            pluck="method",
        )
        self.assertTrue(methods)

    def test_business_records_preserved(self):
        # On a fresh install the tables are empty; on a data clone the exact
        # baseline must be preserved.
        counts = {dt: frappe.db.count(dt) for dt in BUSINESS_BASELINE}
        if not any(counts.values()):
            self.skipTest("fresh site has no business records to compare")
        self.assertEqual(counts, BUSINESS_BASELINE)
