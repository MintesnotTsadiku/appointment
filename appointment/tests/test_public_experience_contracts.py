"""Pure contract tests for the single curated recipe/public projection path."""

import sys
import unittest
from types import SimpleNamespace

from appointment.public_experience.actions import project_action, validate_action
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.errors import DesignCompilationError, UnknownRecipeError, UnsafeActionIntentError
from appointment.public_experience.recipes import get_recipe, list_recipes
from appointment.public_experience.section_schemas import validate_typed_section
from appointment.public_experience.csp import after_request, shell_nonce


class TestResponsePrivacy(unittest.TestCase):
    def test_html_nonce_matches_policy_and_token_pages_remain_private(self):
        import frappe

        previous = getattr(frappe.local, "content_shell_nonce", None)
        try:
            nonce = shell_nonce()
            response = after_request(SimpleNamespace(headers={}, mimetype="text/html"),
                SimpleNamespace(path="/newsletter/confirm/opaque-token"))
            self.assertIn(f"'nonce-{nonce}'", response.headers["Content-Security-Policy"])
            self.assertEqual(response.headers["Cache-Control"], "no-store")
            self.assertEqual(response.headers["Referrer-Policy"], "no-referrer")
        finally:
            frappe.local.content_shell_nonce = previous

    def test_custom_domain_allows_exact_guest_content_apis_only(self):
        from appointment.public_experience.edge import EdgeOptions, _server_block

        config = _server_block("public.example.test", EdgeOptions(frappe_site="test.localhost"), public_only=True)
        for method in ("appointment.content.public_api.get_article_detail",
                       "appointment.content.newsletter.public_api.subscribe",
                       "appointment.scheduler.booking.book"):
            self.assertIn(f"location = /api/method/{method}", config)
        for method in ("appointment.content.api.publish_article",
                       "appointment.content.public_api.get_content_preview",
                       "frappe.client.get"):
            self.assertNotIn(f"location = /api/method/{method}", config)
        self.assertIn("location ~ ^/(app|login|logout|api|private|desk)(/|$) { return 404; }", config)

    def test_preview_and_newsletter_actions_cannot_be_cached_or_indexed(self):
        for path in (
            "/api/method/appointment.content.public_api.get_content_preview",
            "/api/method/appointment.public_experience.api.preview_website",
            "/api/method/appointment.content.newsletter.api.get_local_message",
            "/newsletter/confirm/opaque-token",
        ):
            response = after_request(SimpleNamespace(headers={}), SimpleNamespace(path=path))
            self.assertEqual(response.headers["Cache-Control"], "no-store")
            self.assertEqual(response.headers["X-Robots-Tag"], "noindex, nofollow")

    def test_public_release_reads_get_security_headers_without_private_cache_policy(self):
        response = after_request(SimpleNamespace(headers={}), SimpleNamespace(
            path="/api/method/appointment.content.public_api.get_article_detail"))
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertNotIn("Cache-Control", response.headers)


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


def run():
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise AssertionError("Public experience contract tests failed")
    return {"passed": True, "tests": result.testsRun}
