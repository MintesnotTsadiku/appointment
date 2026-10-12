"""The onboarding success link opens the business page, not the first service.

Reads only: `business_path` looks up an existing organization and creates nothing. The
Public Site lookup is replaced in memory so both branches are checked on any site.

Run: bench --site <site> run-tests --module appointment.tests.test_onboarding_business_path
"""

import unittest
from unittest import mock

import frappe

from appointment.scheduler.workspace import business_path

SITE_OF = "appointment.growth.sharing.site_of"


class OnboardingBusinessPathTests(unittest.TestCase):
    def setUp(self):
        rows = frappe.get_all("Organization", filters={"slug": ["is", "set"]}, fields=["name", "slug"], limit=1)
        if not rows:
            self.skipTest("No organization with a slug on this site.")
        self.org = rows[0]

    def test_published_site_is_the_business_page(self):
        site = frappe._dict(name="site", slug="tena-family-care", status="Published")
        with mock.patch(SITE_OF, return_value=site):
            self.assertEqual(business_path(self.org.name), "/tena-family-care")

    def test_draft_site_falls_back_to_the_booking_page(self):
        site = frappe._dict(name="site", slug="tena-family-care", status="Draft")
        with mock.patch(SITE_OF, return_value=site):
            self.assertEqual(business_path(self.org.name), f"/schedule/org/{self.org.slug}")

    def test_without_a_site_the_booking_page_is_used(self):
        with mock.patch(SITE_OF, return_value=None):
            path = business_path(self.org.name)
        self.assertEqual(path, f"/schedule/org/{self.org.slug}")
        self.assertEqual(path.count("/"), 3, "the link must not point at one service")

    def test_live_site_matches_sharing(self):
        from appointment.growth.sharing import public_path
        from appointment.scheduler import business_owner

        self.assertEqual(business_path(self.org.name), public_path(business_owner.from_key(self.org.name)))
