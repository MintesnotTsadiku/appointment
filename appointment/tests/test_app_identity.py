import importlib
import unittest

import frappe
from frappe.modules.utils import get_module_path

CANONICAL_APP = "appointment"
CANONICAL_MODULE = "Appointment"
LEGACY_MODULE = "Frappe Appointment"

BUSINESS_BASELINE = {
    "Appointment": 70,
    "Organization": 3,
    "Provider": 5,
    "Service": 79,
}

APP_MODULES = (
    "Assistants",
    "Channels",
    "Appointment",
    "Payments",
    "Scheduler",
    "Tasks",
)

MODULE_OWNED_DOCTYPES = (
    "Appointment Group",
    "Appointment Settings",
    "Appointment Slot Duration",
    "Appointment Time Slot",
    "Event DocType Link",
    "Members",
    "Organization",
    "Organization Manager",
    "Provider Delegation",
    "User Appointment Availability",
)

UNCHANGED_BUSINESS_DOCTYPES = (
    "Appointment",
    "Appointment Group",
    "Appointment Settings",
    "Organization",
    "Provider",
    "Service",
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


class TestModuleIdentity(unittest.TestCase):
    def test_primary_module_package_imports(self):
        module = importlib.import_module("appointment.appointment")
        self.assertTrue(module.__file__.endswith("/appointment/appointment/__init__.py"))

    def test_old_module_package_is_gone(self):
        with self.assertRaises(ModuleNotFoundError):
            importlib.import_module(f"{CANONICAL_APP}.frappe_appointment")

    def test_module_path_resolves_to_new_folder(self):
        path = get_module_path(CANONICAL_MODULE)
        self.assertTrue(path.endswith("/appointment/appointment"), path)

    def test_old_module_is_not_registered(self):
        self.assertFalse(frappe.db.exists("Module Def", LEGACY_MODULE))

    def test_new_module_is_owned_by_app(self):
        row = frappe.db.get_value("Module Def", CANONICAL_MODULE, ["app_name"], as_dict=True)
        self.assertIsNotNone(row, f"Module Def {CANONICAL_MODULE} is missing")
        self.assertEqual(row.app_name, CANONICAL_APP)

    def test_all_app_modules_are_owned_by_app(self):
        rows = frappe.get_all(
            "Module Def",
            filters={"name": ["in", APP_MODULES]},
            fields=["name", "app_name"],
        )
        self.assertEqual({row.name for row in rows}, set(APP_MODULES))
        self.assertEqual({row.app_name for row in rows}, {CANONICAL_APP})

    def test_module_owned_doctypes_use_new_module(self):
        rows = frappe.get_all(
            "DocType",
            filters={"name": ["in", MODULE_OWNED_DOCTYPES]},
            fields=["name", "module"],
        )
        self.assertEqual({row.name for row in rows}, set(MODULE_OWNED_DOCTYPES))
        self.assertEqual({row.module for row in rows}, {CANONICAL_MODULE})

    def test_business_doctypes_are_unchanged(self):
        for doctype in UNCHANGED_BUSINESS_DOCTYPES:
            self.assertTrue(frappe.db.exists("DocType", doctype), doctype)

    def test_scheduled_jobs_have_no_old_module_path(self):
        stale = frappe.get_all(
            "Scheduled Job Type",
            filters={"method": ["like", f"{CANONICAL_APP}.frappe_appointment.%"]},
            pluck="method",
        )
        self.assertEqual(stale, [])

    def test_important_whitelisted_paths_resolve(self):
        importlib.import_module(
            "appointment.appointment.doctype.appointment_settings.appointment_settings"
        )
        importlib.import_module(
            "appointment.appointment.doctype.appointment_group.appointment_group"
        )
        # A whitelisted method object must resolve through frappe.get_attr.
        fn = frappe.get_attr(
            "appointment.appointment.doctype.appointment_settings.appointment_settings.get_default_email_template"
        )
        self.assertTrue(callable(fn))

    def test_scheduled_job_methods_importable(self):
        methods = frappe.get_all(
            "Scheduled Job Type",
            filters={"method": ["like", f"{CANONICAL_APP}.%"]},
            pluck="method",
        )
        self.assertTrue(methods)
        for method in methods:
            self.assertTrue(callable(frappe.get_attr(method)), method)

    def test_email_templates_are_imported(self):
        from appointment.tasks.import_email_templates import (
            DEFAULT_EMAIL_TEMPLATE_FIELDS,
        )

        for template in set(DEFAULT_EMAIL_TEMPLATE_FIELDS.values()):
            self.assertTrue(frappe.db.exists("Email Template", template), template)

    def test_appointment_settings_defaults_resolve(self):
        from appointment.tasks.import_email_templates import (
            DEFAULT_EMAIL_TEMPLATE_FIELDS,
        )

        settings = frappe.get_single("Appointment Settings")
        for fieldname, fallback in DEFAULT_EMAIL_TEMPLATE_FIELDS.items():
            value = settings.get(fieldname) or fallback
            self.assertTrue(frappe.db.exists("Email Template", value), (fieldname, value))
