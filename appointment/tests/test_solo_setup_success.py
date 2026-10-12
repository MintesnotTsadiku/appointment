"""Solo setup ends on the business page: setup and publish return `business_path` and `published`.

Each test makes its own owner account and independent business inside a savepoint and rolls it
back; `frappe.db.commit` is patched so nothing persists. See docs/growth/SOLO_SUCCESS.md.

Run: bench --site <site> run-tests --module appointment.tests.test_solo_setup_success
"""

import unittest
from unittest.mock import patch

import frappe

from appointment.growth.sharing import public_path
from appointment.public_experience import solo_setup
from appointment.scheduler import business_owner, independent

SITE_OF = "appointment.growth.sharing.site_of"


class SoloSetupSuccessTests(unittest.TestCase):
    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("solo_setup_success")
        commit = patch("frappe.db.commit")
        commit.start()
        self.addCleanup(commit.stop)
        syncing = frappe.flags.syncing_booking_urls
        frappe.flags.syncing_booking_urls = True
        self.addCleanup(setattr, frappe.flags, "syncing_booking_urls", syncing)
        self.user = f"tsion.gebru.{frappe.generate_hash(length=6)}@example.test"
        frappe.get_doc(dict(doctype="User", email=self.user, first_name="Tsion", last_name="Gebru", send_welcome_email=0,
                            enabled=1, user_type="Website User")).insert(ignore_permissions=True)
        frappe.set_user(self.user)

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="solo_setup_success")

    def expected_path(self, provider):
        return public_path(business_owner.from_key(business_owner.PREFIX + provider))

    def test_name_only_has_no_page_yet(self):
        result = solo_setup.create("Tsion Lash Studio")
        self.assertEqual(result["business_path"], "")
        self.assertFalse(result["published"])
        self.assertEqual(result["landing"], solo_setup.LANDING)

    def test_setup_with_a_service_and_publish_is_live_on_the_business_page(self):
        result = solo_setup.create("Tsion Lash Studio", service_name="Lash extensions", publish=1)
        self.assertTrue(result["published"])
        self.assertEqual(result["business_path"], self.expected_path(result["provider"]))
        self.assertFalse(result["business_path"].startswith("/settings"))
        offering = independent.overview(result["provider"])[0]
        self.assertEqual(offering["service"], "Lash extensions")
        self.assertTrue(frappe.db.get_value("Provider", result["provider"], "enable_public_booking"))

    def test_setup_without_publish_is_an_honest_draft(self):
        result = solo_setup.create("Tsion Lash Studio", service_name="Lash extensions", publish=0)
        self.assertFalse(result["published"])
        self.assertTrue(result["business_path"], "the draft still knows its future page")
        self.assertFalse(frappe.db.get_value("Provider", result["provider"], "enable_public_booking"))

    def test_publish_returns_the_business_page_and_state(self):
        provider = solo_setup.create("Tsion Lash Studio", service_name="Lash extensions")["provider"]
        live = independent.publish(provider, 1)
        self.assertTrue(live["published"])
        self.assertEqual(live["business_path"], self.expected_path(provider))
        self.assertEqual(len(live["offerings"]), 1)
        hidden = independent.publish(provider, 0)
        self.assertFalse(hidden["published"])
        self.assertEqual(hidden["business_path"], live["business_path"])

    def test_published_website_is_the_business_page(self):
        provider = solo_setup.create("Tsion Lash Studio", service_name="Lash extensions")["provider"]
        site = frappe._dict(name="site", slug="tsion-lash", status="Published")
        with patch(SITE_OF, return_value=site):
            live = independent.publish(provider, 1)
        self.assertEqual(live["business_path"], "/tsion-lash")

    def test_service_name_is_validated(self):
        for value in ("", "   ", "x" * 101):
            with self.assertRaises(frappe.ValidationError):
                solo_setup.create("Tsion Lash Studio", service_name=value)

    def test_repeat_setup_keeps_one_offering(self):
        first = solo_setup.create("Tsion Lash Studio", service_name="Lash extensions", publish=1)
        again = solo_setup.create("Tsion Lash Studio", service_name="Brow shaping", publish=1)
        self.assertEqual(first["provider"], again["provider"])
        self.assertEqual(len(independent.overview(again["provider"])), 1)
