"""Business overview rows name their location and provider so offerings stay distinguishable."""

import unittest

import frappe

from appointment.scheduler import workspace

OWNER = "bloom.owner@example.test"


class TestWorkspaceOverview(unittest.TestCase):
    def setUp(self):
        if not frappe.db.exists("User", OWNER):
            self.skipTest("Rich demo businesses are not seeded on this site.")
        frappe.set_user(OWNER)

    def tearDown(self):
        frappe.set_user("Administrator")

    def test_same_service_rows_name_location_and_provider(self):
        rows = [row for row in workspace.overview() if row["service"] == "Cut and shape"]

        self.assertGreater(len(rows), 1)
        self.assertEqual(
            {row["location_name"] for row in rows}, {"Bole main studio", "Bole quiet styling room"}
        )
        labels = {(row["location_name"], row["provider_name"]) for row in rows}
        self.assertEqual(len(labels), len(rows))
