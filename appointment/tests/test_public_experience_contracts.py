"""Pure contract tests for the single curated recipe/public projection path."""

import sys
import unittest

from appointment.public_experience.actions import project_action, validate_action
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.errors import DesignCompilationError, UnknownRecipeError, UnsafeActionIntentError
from appointment.public_experience.recipes import get_recipe, list_recipes, recipe_versions
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
            {"applicationName": "Tena Family Clinic", "shortName": "Tena", "motion": "calm", "logoPrimary": "/assets/appointment/brand-experience/brands/tena-logo.webp", "logoCompact": "/assets/appointment/brand-experience/brands/tena-logo.webp", "favicon": "/assets/appointment/brand-experience/brands/tena-favicon.png"},
            {"sections": list(recipe.required_sections), "locales": ["en", "am"], "content_richness": "rich"},
        )
        second = compile_design(
            recipe.key,
            recipe.version,
            {"applicationName": "Tena Family Clinic", "shortName": "Tena", "motion": "calm", "logoPrimary": "/assets/appointment/brand-experience/brands/tena-logo.webp", "logoCompact": "/assets/appointment/brand-experience/brands/tena-logo.webp", "favicon": "/assets/appointment/brand-experience/brands/tena-favicon.png"},
            {"sections": list(recipe.required_sections), "locales": ["en", "am"], "content_richness": "rich"},
        )
        self.assertEqual(first.content_hash, second.content_hash)
        artifact = first.as_dict()
        self.assertEqual(artifact["contract"], "appointment-compiled-design.v1")
        self.assertEqual(artifact["identity"]["applicationName"], "Tena Family Clinic")
        self.assertEqual(artifact["identity"]["logoCompact"], "/assets/appointment/brand-experience/brands/tena-logo.webp")
        self.assertEqual(artifact["identity"]["favicon"], "/assets/appointment/brand-experience/brands/tena-favicon.png")
        self.assertEqual(artifact["layout"]["contentSchemaVersion"], 2)
        self.assertEqual(set(artifact["tokens"]), {"light", "dark"})
        self.assertTrue(artifact["validation"]["ok"])

    def test_published_recipe_versions_stay_loadable_and_the_gallery_offers_the_latest(self):
        for recipe in list_recipes():
            versions = recipe_versions(recipe.key)
            self.assertEqual(versions, (1, 2), recipe.key)
            self.assertEqual(recipe.version, 2, "the gallery offers the Taste v1 version")
            pinned = get_recipe(recipe.key, 1)
            self.assertEqual(pinned.version, 1)
            self.assertNotEqual(pinned.content_hash, recipe.content_hash)
            for version in versions:
                design = compile_design(recipe.key, version, {"motion": "calm"}, None, ["en", "am"]).as_dict()
                self.assertEqual(design["layout"]["rendererVersion"], version, f"{recipe.key} v{version} renders with its own package")
            self.assertNotIn("independently implemented", recipe.description)
        with self.assertRaises(UnknownRecipeError):
            get_recipe("tena-clinic", 3)

    def test_taste_v1_typography_is_distinct_and_bundled(self):
        display_faces = set()
        for recipe in list_recipes():
            design = compile_design(recipe.key, recipe.version, {"motion": "calm"}, None, ["en", "am"]).as_dict()
            typography = design["typography"]
            display_faces.add(typography["roles"]["display"]["family"])
            scripts = {script for asset in typography["fontAssets"] for script in asset["scripts"]}
            self.assertEqual(scripts, {"latin", "ethiopic"}, recipe.key)
            for asset in typography["fontAssets"]:
                self.assertTrue(asset["src"].startswith(f"/assets/appointment/fonts/{recipe.key.split('-')[0]}/"), asset["src"])
                self.assertIn("Open Font License", asset["license"])
        self.assertEqual(len(display_faces), 5, "no two templates share a display face")

    def test_unknown_or_unsafe_adjustments_fail_closed(self):
        with self.assertRaises(UnknownRecipeError):
            get_recipe("not-certified")
        with self.assertRaises(DesignCompilationError):
            compile_design(brand_inputs={"accentColor": "javascript:bad"})
        with self.assertRaises(DesignCompilationError):
            compile_design(brand_inputs={"logoPrimary": "https://evil.example/logo.png"})


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

    def test_owner_photos_are_optional_local_assets_with_localized_alt(self):
        photo = {"image": "/assets/appointment/brand-experience/support/tena/scene-3.webp", "imageAlt": {"en": "The clinic reception.", "am": "የክሊኒኩ መቀበያ።"}}
        about = {"title": {"en": "About"}, "body": {"en": "A small clinic."}}
        self.assertTrue(validate_typed_section("about", about).ok, "content published before photos existed stays valid")
        self.assertTrue(validate_typed_section("about", {**about, **photo}).ok)
        service = {"id": "s1", "name": {"en": "Consultation"}, "durationMinutes": 30}
        services = validate_typed_section("services", {"title": {"en": "Services"}, "items": [{**service, **photo}]})
        self.assertTrue(services.ok, services.issues)
        location = {"id": "l1", "name": {"en": "Reception"}, "address": {"en": "CMC"}}
        locations = validate_typed_section("locations", {"title": {"en": "Visit"}, "items": [{**location, **photo}]})
        self.assertTrue(locations.ok, locations.issues)
        remote = validate_typed_section("about", {**about, "image": "https://cdn.example/photo.jpg"})
        self.assertIn("local_asset", {issue.rule for issue in remote.issues})
        markup = validate_typed_section("about", {**about, **photo, "imageAlt": {"en": "<img onerror=x>"}})
        self.assertFalse(markup.ok)


def run():
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise AssertionError("Public experience contract tests failed")
    return {"passed": True, "tests": result.testsRun}
