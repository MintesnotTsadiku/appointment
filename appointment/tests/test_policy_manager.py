"""Booking policy updates: the record ID and the editable label stay separate.

Uses the rich demo businesses. Each test creates one synthetic policy and
removes exactly that policy afterwards.
"""

import unittest

import frappe

from appointment.scheduler.api.policy_manager import create_policy_from_template, update_policy

OWNER = "bloom.owner@example.test"
OTHER_OWNER = "tena.owner@example.test"


class TestUpdatePolicy(unittest.TestCase):
    def setUp(self):
        frappe.set_user("Administrator")
        self.org = frappe.db.get_value("Organization", {"owner_user": OWNER}, "name")
        if not self.org or not frappe.db.exists("User", OTHER_OWNER):
            self.skipTest("Rich demo businesses are not seeded on this site.")
        self.policy = frappe.get_doc(
            doctype="Policy",
            policy_name="QA policy label",
            applies_to="All Services",
            organization=self.org,
            created_by_organization=self.org,
            cancellation_window_hours=24,
            reschedule_window_hours=12,
            valid_from=frappe.utils.nowdate(),
            is_active=1,
        ).insert(ignore_permissions=True)

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.delete_doc("Policy", self.policy.name, ignore_permissions=True, force=True)

    def test_owner_updates_label_by_record_id(self):
        frappe.set_user(OWNER)
        result = update_policy(policy_id=self.policy.name, policy_name="Renamed label")

        self.assertEqual(result["policy"]["name"], self.policy.name)
        self.assertEqual(frappe.db.get_value("Policy", self.policy.name, "policy_name"), "Renamed label")

    def test_owner_saves_the_full_form_payload(self):
        frappe.set_user(OWNER)
        # The staff form sends every field, including an unused provider link.
        update_policy(
            policy_id=self.policy.name, policy_name="Form label", applies_to="All Services",
            organization=self.org, service="", location="", provider=self.org,
            cancellation_window_hours=48, valid_from=frappe.utils.nowdate(), valid_to="",
        )

        saved = frappe.db.get_value("Policy", self.policy.name, ["policy_name", "provider", "cancellation_window_hours"], as_dict=True)
        self.assertEqual((saved.policy_name, saved.provider, saved.cancellation_window_hours), ("Form label", None, 48))

    def test_owner_cannot_move_policy_to_another_business(self):
        frappe.set_user(OWNER)
        update_policy(policy_id=self.policy.name, created_by_organization="Tena Family Clinic")

        self.assertEqual(frappe.db.get_value("Policy", self.policy.name, "created_by_organization"), self.org)

    def test_other_business_owner_is_refused(self):
        frappe.set_user(OTHER_OWNER)
        with self.assertRaises(frappe.PermissionError):
            update_policy(policy_id=self.policy.name, policy_name="Hijacked")

        self.assertEqual(frappe.db.get_value("Policy", self.policy.name, "policy_name"), "QA policy label")


class TestCreatePolicy(unittest.TestCase):
    def setUp(self):
        self.org = frappe.db.get_value("Organization", {"owner_user": OWNER}, "name")
        if not self.org:
            self.skipTest("Rich demo businesses are not seeded on this site.")
        self.created = None

    def tearDown(self):
        frappe.set_user("Administrator")
        if self.created:
            frappe.delete_doc("Policy", self.created, ignore_permissions=True, force=True)
            frappe.db.commit()  # create_policy_from_template commits, so the cleanup must too.

    def test_owner_creates_business_wide_policy(self):
        frappe.set_user(OWNER)
        result = create_policy_from_template(
            template_key="standard", applies_to="All Services", policy_name="QA created", organization_id=self.org
        )
        self.created = result.get("policy", {}).get("name")

        self.assertTrue(result.get("success"), result)
        self.assertEqual(result["policy"]["organization"], self.org)
        self.assertEqual(result["policy"]["created_by_organization"], self.org)
