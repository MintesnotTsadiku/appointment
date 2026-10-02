"""Staff sidebar logo resolution for business workspaces. Read-only apart from one rolled-back write."""

import unittest

import frappe

from appointment.scheduler.membership import workspace_logo


class TestWorkspaceLogo(unittest.TestCase):
    def test_brand_logo_is_used_when_business_has_none(self):
        brand = frappe.db.get_value(
            "Brand Profile",
            {"organization": ["is", "set"], "lifecycle": ["!=", "Archived"], "logo_compact": ["is", "set"]},
            ["organization", "logo_compact"],
            as_dict=True,
        )
        if not brand:
            self.skipTest("No active brand profile with a compact logo on this site.")
        if frappe.db.get_value("Organization", brand.organization, "logo"):
            self.skipTest("The business already has its own logo.")
        self.assertEqual(workspace_logo(brand.organization), brand.logo_compact)

    def test_business_logo_wins(self):
        organization = frappe.db.get_value("Organization", {}, "name")
        if not organization:
            self.skipTest("No business on this site.")
        frappe.db.savepoint("workspace_logo_test")
        try:
            frappe.db.set_value("Organization", organization, "logo", "/files/test-logo.png", update_modified=False)
            self.assertEqual(workspace_logo(organization), "/files/test-logo.png")
        finally:
            frappe.db.rollback(save_point="workspace_logo_test")

    def test_unknown_business_has_no_logo(self):
        self.assertIsNone(workspace_logo("Missing business for logo test"))
