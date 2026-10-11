"""Platform brand and growth settings: seeding, cache, guest payload and admin-only saves.

Every test rolls back its database changes and clears the cached settings.
"""

import unittest
from unittest.mock import patch

import frappe

from appointment.growth import api, cache, seed
from appointment.growth.brand import brand
from appointment.growth.settings import growth, share_message
from appointment.tests.test_customer_notifications import OWNER

BRAND = "Platform Brand Settings"
GROWTH = "Growth Settings"
PRIVATE_GROWTH = (
    "powered_by_emails", "powered_by_sms", "referral_threshold_bookings", "referral_reward_free_bookings",
    "customer_referral_default_percent", "partner_reward_free_bookings",
)


class TestPlatformBrand(unittest.TestCase):
    def setUp(self):
        frappe.set_user("Administrator")
        # Nothing here may persist: a stray commit would keep test values on the site.
        commit = patch.object(frappe.db, "commit")
        commit.start()
        self.addCleanup(commit.stop)
        self._clear()

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback()
        self._clear()

    def _clear(self):
        cache.clear(BRAND)
        cache.clear(GROWTH)

    def test_seed_fills_only_empty_values_and_is_idempotent(self):
        frappe.db.set_single_value(BRAND, "tagline_en", "")
        frappe.db.set_single_value(BRAND, "product_name", "Custom Name")
        frappe.db.set_single_value(GROWTH, "posters_enabled", 0)
        frappe.db.delete("Singles", {"doctype": GROWTH, "field": "tools_enabled"})
        seed.ensure_defaults()
        self.assertEqual(frappe.db.get_single_value(BRAND, "tagline_en"), seed.BRAND_DEFAULTS["tagline_en"])
        self.assertEqual(frappe.db.get_single_value(BRAND, "product_name"), "Custom Name", "a saved name is kept")
        self.assertEqual(frappe.db.get_single_value(GROWTH, "posters_enabled"), 0, "a switch turned off stays off")
        self.assertEqual(frappe.db.get_single_value(GROWTH, "tools_enabled"), 1, "a switch never saved is seeded on")

        modified = frappe.db.get_single_value(BRAND, "modified")
        seed.ensure_defaults()
        self.assertEqual(frappe.db.get_single_value(BRAND, "modified"), modified, "a second run changes nothing")

    def test_cache_is_cleared_on_save(self):
        before = brand()["product_name"]
        doc = frappe.get_single(BRAND)
        doc.product_name = f"{before} QA"
        doc.save()
        self.assertEqual(brand()["product_name"], f"{before} QA")

        settings = frappe.get_single(GROWTH)
        settings.posters_enabled = 0
        settings.save()
        self.assertFalse(growth()["posters_enabled"])

    def test_texts_follow_the_language(self):
        doc = frappe.get_single(GROWTH)
        doc.share_message_en = "Book {business}: {link}"
        doc.share_message_am = "ቀጠሮ ይያዙ፦ {link}"
        doc.save()
        lang = frappe.local.lang
        try:
            frappe.local.lang = "am"
            self.assertEqual(growth()["share_message"], "ቀጠሮ ይያዙ፦ {link}")
            frappe.local.lang = "en"
            self.assertEqual(share_message("Bloom", "https://x.example/b"), "Book Bloom: https://x.example/b")
        finally:
            frappe.local.lang = lang

    def test_guest_payload_has_only_public_fields(self):
        frappe.set_user("Guest")
        payload = api.public_brand()
        self.assertEqual(set(payload), {"brand", "growth"})
        self.assertTrue(payload["brand"]["product_name"])
        self.assertEqual(set(payload["growth"]), set(api.PUBLIC_GROWTH))
        for field in PRIVATE_GROWTH:
            self.assertNotIn(field, payload["growth"])
        with self.assertRaises(frappe.PermissionError):
            api.get_settings()

    def test_only_platform_admins_can_save(self):
        frappe.set_user(OWNER)
        with self.assertRaises(frappe.PermissionError):
            api.save_settings(brand={"product_name": "Hijacked"})
        with self.assertRaises(frappe.PermissionError):
            api.get_settings()

        frappe.set_user("Administrator")
        saved = api.save_settings(brand={"product_name": "Renamed", "name": "ignored"}, growth={"marketing_live_minutes": 7})
        self.assertEqual(saved["brand"]["product_name"], "Renamed")
        self.assertEqual(saved["growth"]["marketing_live_minutes"], 7)

    def test_invalid_values_are_refused(self):
        for changes in ({"product_url": "javascript:alert(1)"}, {"primary_color": "red"}, {"short_host": "a b/c"}, {"product_name": " "}):
            with self.subTest(changes=changes), self.assertRaises(frappe.ValidationError):
                api.save_settings(brand=changes)
        for changes in ({"share_message_en": "No link here"}, {"customer_referral_default_percent": 120}, {"referral_threshold_bookings": -1}):
            with self.subTest(changes=changes), self.assertRaises(frappe.ValidationError):
                api.save_settings(growth=changes)
