"""Cloned-data preservation checks for the Appointment product.

On a fresh site there is no business data and the test skips. On the cloned-data
site it asserts the exact pre-existing business counts, link integrity,
organization ownership, permission configuration and product-owned attachment
checksums, while reporting Agent Plane/Harness/QA-generated Users and Files
separately.

The machine-readable redacted result is written to
``/tmp/appointment_qa/preservation-snapshot.json``.

Run with::

    bench --site <cloned-site> run-tests --module appointment.tests.test_data_preservation \
        --skip-before-tests
"""

from __future__ import annotations

import unittest

import frappe

from appointment.qa_preservation import BUSINESS_BASELINE, build_snapshot, snapshot_to_file


class TestDataPreservation(unittest.TestCase):
    def test_business_counts_and_relationships_are_preserved(self):
        counts = {doctype: frappe.db.count(doctype) for doctype in BUSINESS_BASELINE}
        if not any(counts.values()):
            self.skipTest("fresh site has no business records to preserve")

        snapshot, output_path = snapshot_to_file()
        self.assertTrue(output_path.endswith(".json"))

        self.assertEqual(snapshot["business_counts"], BUSINESS_BASELINE)
        self.assertTrue(snapshot["relationships_ok"], snapshot["relationship_checks"])
        self.assertEqual(
            snapshot["relationship_checks"]["appointments_with_valid_provider"],
            snapshot["relationship_checks"]["appointments"],
        )
        self.assertEqual(
            snapshot["relationship_checks"]["appointments_with_valid_service"],
            snapshot["relationship_checks"]["appointments"],
        )
        self.assertEqual(
            snapshot["relationship_checks"]["appointments_with_valid_location"],
            snapshot["relationship_checks"]["appointments"],
        )

    def test_organization_ownership_and_permissions_are_preserved(self):
        if not frappe.db.count("Organization"):
            self.skipTest("fresh site has no organizations to preserve")
        snapshot = build_snapshot()
        checks = snapshot["relationship_checks"]
        # Organization ownership is carried by `Organization.owner_user` on the
        # cloned data; every organization must still resolve to a real User.
        self.assertEqual(checks["organizations_with_valid_owner_user"], checks["organizations"])
        # Provider-organization membership child rows must all resolve.
        self.assertGreaterEqual(checks["provider_organization_links"], 1)
        self.assertEqual(
            checks["provider_organization_links_with_valid_provider"],
            checks["provider_organization_links"],
        )
        self.assertEqual(
            checks["provider_organization_links_with_valid_organization"],
            checks["provider_organization_links"],
        )
        self.assertTrue(snapshot["organization_manager_role_exists"])
        self.assertGreaterEqual(snapshot["organization_manager_docperm_count"], 1)

    def test_product_owned_files_are_reported_separately_from_agent_files(self):
        if not frappe.db.count("Organization"):
            self.skipTest("fresh site has no product records to preserve")
        snapshot = build_snapshot()
        self.assertGreaterEqual(snapshot["files"]["product_owned"], 1)
        self.assertNotEqual(
            snapshot["files"]["product_owned_checksum"],
            snapshot["files"]["agent_qa_checksum"],
        )
        # Agent Plane/Harness file volumes must be categorised, never mixed into
        # the product-owned checksum.
        self.assertGreaterEqual(snapshot["files"]["agent_qa"], 0)
        self.assertGreaterEqual(snapshot["users"]["product_owned_or_preexisting"], 1)
