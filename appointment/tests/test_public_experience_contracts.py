"""Pure contract tests for the single curated recipe/public projection path."""

import sys
import unittest
from types import SimpleNamespace

from appointment.public_experience.actions import project_action, validate_action
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.errors import DesignCompilationError, UnknownRecipeError, UnsafeActionIntentError
from appointment.public_experience.recipes import get_recipe, list_recipes, recipe_versions
from appointment.public_experience.section_schemas import validate_typed_section
from appointment.public_experience.csp import after_request, encode_boot_data, shell_nonce


class TestResponsePrivacy(unittest.TestCase):
    def test_boot_data_cannot_close_a_script_tag(self):
        import json

        value = {"name": '</ScRiPt><script src="/files/untrusted.js"></script>&', "locale": "አማርኛ"}
        encoded = encode_boot_data(value)
        self.assertNotIn("<", encoded)
        self.assertNotIn(">", encoded)
        self.assertNotIn("&", encoded)
        self.assertEqual(json.loads(json.loads(encoded)), value)

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
        self.assertIn("location = /assets/appointment/frontend/sw.js", config)
        self.assertIn('add_header Service-Worker-Allowed "/";', config)
        self.assertIn('add_header Cache-Control "no-cache";', config)

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
            ["selam-movement", "bloom-hair", "meron-atelier", "abugida-language", "tena-clinic", "ergata-therapy"],
        )
        for recipe in recipes:
            self.assertEqual(recipe.required_sections[0], "hero")
            self.assertEqual(len(recipe.required_sections), 15 if recipe.key == "ergata-therapy" else 13)

    def test_business_specific_asset_is_projected_to_canonical_slots(self):
        # v2 keeps the business-specific detail role; v3 uses its own story roles.
        recipe = get_recipe("abugida-language", 2)
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
            if recipe.key == "ergata-therapy":
                # Ergata started after the Taste v1 pass; v2 brings it to v3 parity (docs/design/ERGATA_V2.md), v1 stays loadable.
                self.assertEqual(versions, (1, 2))
            else:
                # The template reimagination adds v3 packages (Bloom in phase 1, the others in phase 2); v1 and v2 stay loadable.
                expected = (1, 2, 3) if recipe.key in {"bloom-hair", "selam-movement", "tena-clinic", "meron-atelier", "abugida-language"} else (1, 2)
                self.assertEqual(versions, expected, recipe.key)
                self.assertEqual(recipe.version, expected[-1], "the gallery offers the latest version")
                pinned = get_recipe(recipe.key, 1)
                self.assertEqual(pinned.version, 1)
                self.assertNotEqual(pinned.content_hash, recipe.content_hash)
            for version in versions:
                design = compile_design(recipe.key, version, {"motion": "calm"}, None, ["en", "am"]).as_dict()
                self.assertEqual(design["layout"]["rendererVersion"], version, f"{recipe.key} v{version} renders with its own package")
            self.assertNotIn("independently implemented", recipe.description)
        with self.assertRaises(UnknownRecipeError):
            get_recipe("tena-clinic", 9)

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
        self.assertEqual(len(display_faces), len(list_recipes()), "no two templates share a display face")

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
        hero = validate_typed_section("hero", {"title": {"en": "A calm space to talk"}, **photo})
        self.assertTrue(hero.ok, hero.issues)

    def test_approaches_and_notice_sections_are_closed_and_plain(self):
        approaches = {"title": {"en": "How I work", "am": "የምሠራበት መንገድ"}, "items": [
            {"title": {"en": "CBT"}, "description": {"en": "Notice how thoughts, feelings and actions connect."}}]}
        self.assertTrue(validate_typed_section("approaches", approaches).ok)
        self.assertFalse(validate_typed_section("approaches", {**approaches, "items": [{"title": {"en": "CBT"}}]}).ok)
        self.assertFalse(validate_typed_section("approaches", {**approaches, "html": "<b>x</b>"}).ok)
        notice = {"title": {"en": "This is not an emergency service"}, "body": {"en": "If you are in danger, call now."},
                  "items": [{"label": {"en": "Police", "am": "ፖሊስ"}, "phone": "991"}, {"label": {"en": "Ambulance"}, "phone": "907"}]}
        self.assertTrue(validate_typed_section("notice", notice).ok, validate_typed_section("notice", notice).issues)
        self.assertTrue(validate_typed_section("notice", {"title": {"en": "Note"}}).ok, "phone lines are optional")
        unsafe = {**notice, "items": [{"label": {"en": "Police"}, "phone": "javascript:alert(1)"}]}
        self.assertIn("phone", {issue.rule for issue in validate_typed_section("notice", unsafe).issues})

    def test_ergata_recipe_compiles_with_its_own_primitives_in_both_modes(self):
        recipe = get_recipe("ergata-therapy")
        self.assertIn("approaches", recipe.required_sections)
        self.assertIn("notice", recipe.required_sections)
        design = compile_design(recipe.key, recipe.version, {"motion": "calm"}, None, ["en", "am"]).as_dict()
        self.assertEqual(design["layout"]["rendererKey"], "ergata-therapy")
        self.assertEqual(design["layout"]["rendererVersion"], 2)
        self.assertEqual(set(design["tokens"]), {"light", "dark"})
        hero = design["assets"]["hero.primary"]
        self.assertTrue(hero["src"].endswith("/support/ergata-v2/hero.webp"))
        # v2: the hero and the booking band have night photos; every photo has AVIF files and smaller widths.
        self.assertTrue(hero["darkSrc"].endswith("/support/ergata-v2/hero-night.webp"))
        self.assertTrue(design["assets"]["band.ergata"]["darkSrc"].endswith("/support/ergata-v2/band-night.webp"))
        self.assertEqual(hero["formats"], ["avif"])
        for role in ("testimonial.ergata", "contact.ergata"):
            self.assertIn(role, design["assets"])
        # v1 stays loadable for releases that pin it.
        v1 = compile_design(recipe.key, 1, {"motion": "calm"}, None, ["en", "am"]).as_dict()
        self.assertEqual(v1["layout"]["rendererVersion"], 1)
        self.assertTrue(v1["assets"]["hero.primary"]["src"].endswith("/heroes/ergata-therapy.webp"))
        for choice in ("soft", "paper"):
            compile_design(recipe.key, recipe.version, {"paletteChoice": choice}, None, ["en", "am"])
        alternate = compile_design(recipe.key, recipe.version, {"fontChoice": "alternate"}, None, ["en", "am"]).as_dict()
        self.assertEqual(alternate["typography"]["roles"]["display"]["family"], "Ergata Sans")

    def test_ergata_sessions_and_places_say_how_they_meet(self):
        session = {"id": "s1", "name": {"en": "Individual session online"}, "durationMinutes": 50, "price": 1200, "format": "online"}
        services = {"title": {"en": "Sessions"}, "items": [session, {**session, "id": "s2", "format": "in_person"}]}
        self.assertTrue(validate_typed_section("services", services).ok, validate_typed_section("services", services).issues)
        self.assertIn("enum", {issue.rule for issue in validate_typed_section("services", {**services, "items": [{**session, "format": "zoom"}]}).issues})
        office = {"id": "l1", "format": "in_person", "name": {"en": "Bole office"}, "address": {"en": "Cameroon Street, Bole"},
                  "body": {"en": "A short walk from the roundabout."}, "notes": [{"en": "Parking in the courtyard", "am": "የመኪና ማቆሚያ አለ"}]}
        online = {"id": "l2", "format": "online", "name": {"en": "Online video"}, "address": {"en": "A secure video link"},
                  "notes": [{"en": "Find a quiet room."}], "body": {"en": "Sessions are never recorded."}}
        places = {"title": {"en": "Where we meet"}, "items": [office, online]}
        self.assertTrue(validate_typed_section("locations", places).ok, validate_typed_section("locations", places).issues)
        self.assertFalse(validate_typed_section("locations", {**places, "items": [{**online, "format": "phone"}]}).ok, "a place is a room or online")
        self.assertFalse(validate_typed_section("locations", {**places, "items": [{**office, "notes": ["Parking"]}]}).ok, "notes are localized")
        self.assertFalse(validate_typed_section("locations", {**places, "items": [{**office, "notes": [{"en": "x"}] * 7}]}).ok)

    def test_ergata_image_slots_take_packaged_photos_only(self):
        photo = {"image": "/assets/appointment/brand-experience/support/ergata/approach-walk.webp", "imageAlt": {"en": "A path", "am": "መንገድ"}}
        sections = {
            "benefits": {"title": {"en": "Help"}, "items": []},
            "approaches": {"title": {"en": "Approaches"}, "items": []},
            "faq": {"title": {"en": "Questions"}, "items": []},
            "notice": {"title": {"en": "Not an emergency service"}},
            "booking_cta": {"title": {"en": "Book"}, "action": {"intent": "booking_start", "label": {"en": "Book"}, "placement": "primary"}},
        }
        for kind, content in sections.items():
            self.assertTrue(validate_typed_section(kind, {**content, **photo}).ok, kind)
            self.assertFalse(validate_typed_section(kind, {**content, "image": "https://example.com/a.webp"}).ok, kind)

    def test_ergata_imagery_gives_every_slot_a_small_mobile_file(self):
        from pathlib import Path

        design = compile_design("ergata-therapy", 1, {}, None, ["en", "am"]).as_dict()
        root = Path(__file__).resolve().parents[1] / "public"
        for role in ("needs.ergata", "approach.ergata", "faq.ergata", "office.ergata", "online.ergata", "band.ergata", "window.ergata"):
            asset = design["assets"][role]
            self.assertNotEqual(asset["src"], asset["mobileSrc"], role)
            for key in ("src", "mobileSrc"):
                path = root / asset[key].removeprefix("/assets/appointment/")
                self.assertTrue(path.is_file(), asset[key])
                self.assertLess(path.stat().st_size, 200 * 1024, asset[key])

    def test_ergata_starter_copy_is_bilingual_valid_and_invents_no_facts(self):
        from appointment.public_experience.setup import _apply_starter, starter_content

        recipe = get_recipe("ergata-therapy")
        starter = starter_content(recipe)
        self.assertIsNone(starter_content(get_recipe("tena-clinic")), "recipes without starter copy keep the generic draft")
        text = lambda value: {"en": value}
        content = {kind: {"title": text(kind), "items": []} for kind in recipe.required_sections}
        content["hero"] = {"title": text("Practice"), "primaryAction": {"intent": "booking_start", "label": text("Book"), "placement": "primary"}}
        content["about"] = {"title": text("About"), "body": text("A practice.")}
        content["contact"] = {"title": text("Contact")}
        content["booking_cta"] = {"title": text("Book"), "action": {"intent": "booking_start", "label": text("Book"), "placement": "primary"}}
        content["footer"] = {"body": text("Practice"), "items": []}
        content["providers"]["items"] = [{"id": "p1", "name": text("A"), "role": text("Provider"), "specialties": [], "credentials": []}]
        content["services"]["items"] = [{"id": "s1", "name": text("Intro call"), "durationMinutes": 15, "price": 0}]
        _apply_starter(content, starter, team=False, contact_first=False, intro_call=True)
        for kind in recipe.required_sections:
            report = validate_typed_section(kind, content[kind], allowed_intents=recipe.action_intents)
            self.assertTrue(report.ok, (kind, report.issues))
        self.assertEqual(content["hero"]["secondaryAction"]["intent"], "service_selection")
        self.assertEqual(content["providers"]["items"][0]["role"]["am"], "ቴራፒስት")
        self.assertEqual(content["proof"]["items"], [], "credentials are never invented")
        self.assertEqual(content["testimonials"]["items"], [], "testimonials stay empty until the owner adds consented quotes")
        self.assertEqual(content["services"]["items"][0]["id"], "s1", "sessions come from the business records")
        self.assertEqual([item["phone"] for item in content["notice"]["items"]], ["991", "907"])
        for kind, section in starter.items():
            for field in ("title", "intro", "subtitle", "body", "eyebrow"):
                if field in section:
                    self.assertTrue(section[field].get("am"), f"{kind}.{field} needs Amharic")


def run():
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        raise AssertionError("Public experience contract tests failed")
    return {"passed": True, "tests": result.testsRun}


class TestPublicOrigin(unittest.TestCase):
    def test_platform_host_uses_https_behind_edge_tls(self):
        import frappe
        from unittest.mock import patch
        from appointment.public_experience import resolver

        with patch.dict(frappe.local.conf, {"brand_public_experience_platform_hosts": "book.example.et", "brand_public_experience_edge_tls": 1}):
            self.assertEqual(resolver._origin("book.example.et"), "https://book.example.et")
        with patch.dict(frappe.local.conf, {"brand_public_experience_platform_hosts": "book.example.et", "brand_public_experience_edge_tls": 0}):
            self.assertEqual(resolver._origin("book.example.et"), "http://book.example.et")
        self.assertEqual(resolver._origin("127.0.0.146"), "http://127.0.0.146")

    def test_unknown_public_path_is_not_found(self):
        from appointment.public_experience.errors import PublicResolutionError

        self.assertEqual(PublicResolutionError("missing").http_status_code, 404)

    def test_optional_config_for_an_unpublished_path_is_empty_not_an_error(self):
        from unittest.mock import patch
        from appointment.public_experience import api
        from appointment.public_experience.errors import PublicResolutionError

        missing = PublicResolutionError("no site", details={"reason": "unknown_host"})
        with patch.object(api.resolver_module, "resolve_public_experience", side_effect=missing):
            self.assertIsNone(api.get_public_ui_config(public_path="/new-business", optional=1))
            with self.assertRaises(PublicResolutionError):
                api.get_public_ui_config(public_path="/new-business")
            self.assertIsNone(api.get_public_experience_snapshot(public_path="/new-business", optional=1))
