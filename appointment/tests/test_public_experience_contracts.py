"""Pure contract tests for the single curated recipe/public projection path."""

import sys
import unittest

from appointment.public_experience.actions import project_action, validate_action
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.errors import DesignCompilationError, UnknownRecipeError, UnsafeActionIntentError
from appointment.public_experience.recipes import get_recipe, list_recipes
from appointment.public_experience.section_schemas import validate_typed_section


class TestRecipeCompiler(unittest.TestCase):
    def test_curated_recipe_set_is_registered(self):
        recipes = list_recipes()
        self.assertEqual(
            [recipe.key for recipe in recipes],
            ["selam-movement", "bloom-hair", "meron-atelier", "abugida-language", "tena-clinic"],
        )
        for recipe in recipes:
            self.assertEqual(recipe.required_sections[0], "hero")
            self.assertEqual(len(recipe.required_sections), 13)

    def test_business_specific_asset_is_projected_to_canonical_slots(self):
        recipe = get_recipe("abugida-language")
        result = compile_design(
            recipe.key,
            recipe.version,
            {"heroAsset": "hero.abugida", "detailAsset": "detail.abugida"},
            {"sections": list(recipe.required_sections), "locales": ["en", "am"], "content_richness": "rich"},
        ).as_dict()
        self.assertTrue(result["assets"]["hero.primary"]["src"].endswith("abugida-language.webp"))
        self.assertTrue(result["assets"]["section.detail"]["src"].endswith("abugida-language.webp"))

    def test_compiled_design_is_deterministic_and_identity_aware(self):
        recipe = get_recipe("tena-clinic")
        first = compile_design(
            recipe.key,
            recipe.version,
            {"applicationName": "Tena Family Clinic", "shortName": "Tena", "motion": "calm"},
            {"sections": list(recipe.required_sections), "locales": ["en", "am"], "content_richness": "rich"},
        )
        second = compile_design(
            recipe.key,
            recipe.version,
            {"applicationName": "Tena Family Clinic", "shortName": "Tena", "motion": "calm"},
            {"sections": list(recipe.required_sections), "locales": ["en", "am"], "content_richness": "rich"},
        )
        self.assertEqual(first.content_hash, second.content_hash)
        artifact = first.as_dict()
        self.assertEqual(artifact["contract"], "appointment-compiled-design.v1")
        self.assertEqual(artifact["identity"]["applicationName"], "Tena Family Clinic")
        self.assertEqual(artifact["layout"]["contentSchemaVersion"], 2)
        self.assertEqual(set(artifact["tokens"]), {"light", "dark"})
        self.assertTrue(artifact["validation"]["ok"])

    def test_unknown_or_unsafe_adjustments_fail_closed(self):
        with self.assertRaises(UnknownRecipeError):
            get_recipe("not-certified")
        with self.assertRaises(DesignCompilationError):
            compile_design(brand_inputs={"accentColor": "javascript:bad"})


class TestTypedContentAndActions(unittest.TestCase):
    def test_booking_intent_projects_to_site_scoped_scheduler_handoff(self):
        action = {"intent": "booking_start", "label": {"en": "Book"}, "placement": "primary"}
        self.assertEqual(validate_action(action), [])
        projected = project_action(action, public_path="/tena-studio", phone="000 000 0104", location_query="CMC Addis Ababa")
        self.assertEqual(projected["href"], "/tena-studio/book")
        self.assertNotIn("http", projected["href"])

    def test_arbitrary_authoring_links_and_malformed_actions_are_rejected(self):
        self.assertTrue(validate_action({"intent": "booking_start", "label": {"en": "Book"}, "placement": "primary", "href": "/evil"}))
        with self.assertRaises(UnsafeActionIntentError):
            project_action({"intent": "booking_start", "label": {"en": "Book"}, "placement": "primary"}, public_path="https://evil.example")

    def test_closed_section_schema_accepts_typed_booking_cta_only(self):
        valid = validate_typed_section(
            "booking_cta",
            {"title": {"en": "Ready when you are"}, "body": {"en": "Choose a time."}, "action": {"intent": "booking_start", "label": {"en": "Book"}, "placement": "primary"}},
        )
        self.assertTrue(valid.ok, valid.issues)
        invalid = validate_typed_section("hero", {"title": {"en": "Hello"}, "primaryAction": {"label": {"en": "Go"}, "link": "https://evil.example"}})
        self.assertFalse(invalid.ok)


def run():
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise AssertionError("Public experience contract tests failed")
    return {"passed": True, "tests": result.testsRun}
