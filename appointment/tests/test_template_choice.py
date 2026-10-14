"""The template a new owner chose in the landing gallery: kept with the sign-up, validated against the
certified recipes, used for the first website draft, and switched on an existing site only on request.

Reuses the referral test case: commits are patched and every test rolls back to a savepoint.
See docs/growth/TEMPLATE_GALLERY.md.
"""

import json
from unittest import mock

import frappe

from appointment.growth import referrals, template_choice
from appointment.onboarding import set_onboarding_type
from appointment.public_experience import api, setup, template_switch
from appointment.scheduler import registration
from appointment.tests.test_growth_referrals import ReferralCase


class TestTemplateChoice(ReferralCase):
    def _signup(self, template, source="template_gallery"):
        email = f"liya.{frappe.generate_hash(length=6)}@example.test"
        frappe.set_user("Guest")
        with mock.patch("frappe.db.commit"):
            registration.signup(email, "Liya Bekele", "A-long-passphrase-2026", source=source, template=template)
        frappe.set_user("Administrator")
        return email

    def _start(self, business, recipe):
        frappe.set_user(business.user)
        slug = "liya-" + frappe.generate_hash(length=8)
        draft = setup.start("Organization", business.organization, "Liya Counselling", slug, recipe)
        frappe.set_user("Administrator")
        return draft

    def test_signup_keeps_a_certified_template_and_ignores_unknown_keys(self):
        chosen = self._signup("Ergata-Therapy")
        unknown = self._signup("../../etc")
        self.assertEqual(frappe.db.get_value("Business Signup Source", {"signup_user": chosen}, "template"), "ergata-therapy")
        self.assertIsNone(frappe.db.get_value("Business Signup Source", {"signup_user": unknown}, "template"))
        self.assertEqual(frappe.db.get_value("Business Signup Source", {"signup_user": unknown}, "source"), "template_gallery")
        self.assertIsNone(template_choice.clean("not-a-template"))

    def test_the_choice_follows_the_account_to_its_business_until_it_has_a_site(self):
        user = self._signup("ergata-therapy")
        self.assertEqual(template_choice.for_user(user), "ergata-therapy")
        frappe.set_user(user)
        set_onboarding_type("organization")  # As the onboarding page does before it creates the business.
        frappe.set_user("Administrator")
        business = self._org("Liya Counselling", source="template_gallery", user=user)
        row = frappe.get_value("Business Signup Source", {"signup_user": user}, ["status", "template"], as_dict=True)
        self.assertEqual((row.status, row.template), ("Attached", "ergata-therapy"))
        frappe.set_user(user)
        chosen = template_choice.chosen_template()
        self.assertEqual((chosen["key"], chosen["label"]), ("ergata-therapy", "Ergata Therapy"))
        self.assertTrue(chosen["image"].startswith("/assets/"))
        self.assertEqual(api.website_setup_context()["galleryTemplate"], "ergata-therapy")
        frappe.set_user("Administrator")
        draft = self._start(business, template_choice.for_user(user))
        self.assertEqual(draft["recipeKey"], "ergata-therapy")
        profile = frappe.get_doc("Brand Profile", draft["profile"])
        self.assertEqual(json.loads(profile.brand_inputs_json)["heroAsset"], "hero.ergata")
        self.assertIn("approaches", [row["type"] for row in draft["sections"]])
        # With a website, the stored choice no longer preselects anything.
        self.assertIsNone(template_choice.for_user(user))

    def test_note_template_keeps_the_referral_and_needs_a_session(self):
        user = self._owner("Hanna", "Girma")
        referrals.remember_signup(user, "TENA123", "telegram_share")
        frappe.set_user(user)
        self.assertEqual(template_choice.note_template("bloom-hair"), {"stored": True})
        self.assertEqual(template_choice.note_template("unknown"), {"stored": False})
        frappe.set_user("Administrator")
        row = frappe.get_value("Business Signup Source", {"signup_user": user}, ["ref_code", "source", "template"], as_dict=True)
        self.assertEqual((row.ref_code, row.source, row.template), ("TENA123", "telegram_share", "bloom-hair"))
        referrals.remember_signup(user, "TENA123", "telegram_share")
        self.assertEqual(frappe.db.get_value("Business Signup Source", {"signup_user": user}, "template"), "bloom-hair")
        frappe.set_user("Guest")
        with self.assertRaises(frappe.PermissionError):
            template_choice.note_template("bloom-hair")

    def test_switching_an_existing_site_keeps_edited_words_and_takes_the_new_defaults(self):
        business = self._org("Liya Counselling")
        draft = self._start(business, "tena-clinic")
        frappe.set_user(business.user)
        about = next(row for row in draft["sections"] if row["type"] == "about")
        edited = {**about["content"], "body": {"en": "Family counselling in Bole since 2019."}}
        saved = setup.save(draft["site"], draft["draftVersion"], "content", sections=[{"type": "about", "content": edited}])
        switched = template_switch.switch(saved["site"], saved["draftVersion"], "ergata-therapy")
        self.assertEqual(switched["recipeKey"], "ergata-therapy")
        sections = {row["type"]: row["content"] for row in switched["sections"]}
        self.assertEqual(sections["about"]["body"]["en"], "Family counselling in Bole since 2019.")
        self.assertIn("approaches", sections)
        profile = frappe.get_doc("Brand Profile", switched["profile"])
        self.assertEqual((profile.recipe_key, json.loads(profile.brand_inputs_json)["heroAsset"]), ("ergata-therapy", "hero.ergata"))
        preview = setup.preview(switched["site"], switched["draftVersion"])
        self.assertEqual(preview["recipeKey"], "ergata-therapy")
        with self.assertRaises(Exception):
            template_switch.switch(switched["site"], switched["draftVersion"], "not-a-template")
        frappe.set_user("Administrator")

    def test_switch_needs_the_current_draft_and_the_owner(self):
        business = self._org("Liya Counselling")
        draft = self._start(business, "tena-clinic")
        frappe.set_user(business.user)
        from appointment.public_experience.errors import StaleDraftError

        with self.assertRaises(StaleDraftError):
            template_switch.switch(draft["site"], draft["draftVersion"] - 1, "bloom-hair")
        frappe.set_user(self._owner("Abel", "Tesfaye"))
        with self.assertRaises(frappe.PermissionError):
            template_switch.switch(draft["site"], draft["draftVersion"], "bloom-hair")
        frappe.set_user("Administrator")
