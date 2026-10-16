"""Template reimagination, phase 1: the v3 imagery contract, motion levels, the new image slots and
the gallery section, and the guest next-availability endpoint (docs/design/TEMPLATE_V3_KIT.md)."""

import copy
import hashlib
import json
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

import frappe

from appointment.public_experience import next_availability
from appointment.public_experience.design_compiler import _validate_imagery, compile_design
from appointment.public_experience.errors import DesignCompilationError, DesignManifestError, PublicResolutionError
from appointment.public_experience.recipes import (
    EXPRESSION_CHOICES,
    EXPRESSION_DEFAULTS,
    RECIPE_MANIFESTS,
    _read,
    _recipe,
    get_recipe,
)
from appointment.public_experience.section_schemas import validate_typed_section
from appointment.public_experience.showcase_catalog import APP_ROOT

IMAGERY = "public_experience/manifest/design/imagery/bloom-golden-hour.v1.json"


def t(english, amharic=None):
    return {"en": english, **({"am": amharic} if amharic else {})}


class TestBloomV3Recipe(unittest.TestCase):
    def test_v3_compiles_with_night_photos_mobile_crops_and_expressive_motion(self):
        recipe = get_recipe("bloom-hair", 3)
        design = compile_design("bloom-hair", 3, {"motion": "expressive"}, None, ["en", "am"]).as_dict()
        self.assertEqual(design["motion"], "expressive")
        self.assertEqual(design["layout"]["rendererVersion"], 3)
        hero = design["assets"]["hero.primary"]
        self.assertTrue(hero["darkSrc"].endswith("/bloom-v3/hero-night.webp"))
        self.assertTrue(hero["darkMobileSrc"].endswith("/bloom-v3/hero-night-m.webp"))
        self.assertEqual((hero["mobileWidth"], hero["mobileHeight"]), (720, 900))
        self.assertEqual(hero["formats"], ["avif"])
        self.assertNotIn("checksums", hero, "per-file checksums stay in the manifest, not in the public design")
        self.assertIn("gallery", recipe.supported_sections)
        self.assertNotIn("gallery", recipe.required_sections)
        self.assertEqual(recipe.default_inputs["motion"], "standard", "new sites start at standard motion")

    def test_v2_recipes_refuse_the_expressive_level_and_keep_their_compiled_shape(self):
        with self.assertRaises(DesignCompilationError):
            compile_design("bloom-hair", 2, {"motion": "expressive"}, None, ["en", "am"])
        design = compile_design("bloom-hair", 2, {"motion": "calm"}, None, ["en", "am"]).as_dict()
        for asset in design["assets"].values():
            self.assertFalse({"darkSrc", "formats", "widths", "mobileWidth"} & set(asset), "older designs stay byte-identical")

    def test_every_packaged_bloom_v3_file_matches_its_checksum(self):
        imagery = _read(IMAGERY)
        root = APP_ROOT / "public"
        for role, asset in imagery["assets"].items():
            files = {asset["src"]: asset["checksum"]}
            files.update({asset["src"].rsplit("/", 1)[0] + "/" + name: value for name, value in asset["checksums"].items()})
            for url in [asset["mobileSrc"], asset.get("darkSrc"), asset.get("darkMobileSrc")]:
                if url:
                    self.assertIn(url, files, f"{role}: {url} needs a checksum")
            for url, checksum in files.items():
                path = root / url.removeprefix("/assets/appointment/")
                self.assertTrue(path.is_file(), path)
                self.assertEqual("sha256:" + hashlib.sha256(path.read_bytes()).hexdigest(), checksum, url)
                if url.endswith(".webp"):
                    self.assertIn(url.replace(".webp", ".avif"), files, f"{role}: AVIF next to {url}")
            for width in asset["widths"]:
                self.assertIn(asset["src"].replace(".webp", f"-w{width}.webp"), files)

    def test_the_imagery_contract_stays_closed(self):
        base = copy.deepcopy(_read(IMAGERY))
        role = base["assets"]["hero.bloom"]
        for change in (
            {"darkSrc": "https://example.test/night.webp"},
            {"widths": [2000]},
            {"widths": [960, 640]},
            {"formats": ["gif"]},
            {"mobileWidth": 720, "mobileHeight": None},
            {"script": "x"},
        ):
            with self.subTest(change=change):
                document = copy.deepcopy(base)
                document["assets"]["hero.bloom"] = {**copy.deepcopy(role), **change}
                if change.get("mobileHeight", 1) is None:
                    document["assets"]["hero.bloom"].pop("mobileHeight")
                with self.assertRaises(DesignManifestError):
                    _validate_imagery(document)
        night_mobile_only = copy.deepcopy(base)
        night_mobile_only["assets"]["hero.bloom"].pop("darkSrc")
        with self.assertRaises(DesignManifestError):
            _validate_imagery(night_mobile_only)

    def test_appearance_options_offer_the_recipe_motion_levels(self):
        from appointment.public_experience.appearance import options

        self.assertEqual(options(get_recipe("bloom-hair", 3))["motion"], ["calm", "standard", "expressive"])
        self.assertEqual(options(get_recipe("bloom-hair", 2))["motion"], ["calm", "standard"])


class TestNewImageSlotsAndGallery(unittest.TestCase):
    def test_process_testimonials_and_contact_take_an_optional_photo(self):
        photo = {"image": "/assets/appointment/brand-experience/support/bloom-v3/story.webp", "imageAlt": t("The salon"), "imageFocus": {"x": 50, "y": 40}}
        process = {"title": t("Your visit"), "items": [{"step": 1, "title": t("Arrive"), "description": t("Settle in."), **photo}], **photo}
        self.assertTrue(validate_typed_section("process", process).ok)
        reviews = {"title": t("Reviews"), "items": [{"quote": t("Calm."), "attribution": t("Liya"), "consent": True}], **photo}
        self.assertTrue(validate_typed_section("testimonials", reviews).ok)
        self.assertTrue(validate_typed_section("contact", {"title": t("Contact"), **photo}).ok)
        unsafe = {"title": t("Contact"), "image": "https://example.test/a.webp"}
        self.assertIn("local_asset", {issue.rule for issue in validate_typed_section("contact", unsafe).issues})

    def test_an_owner_photo_in_a_new_slot_needs_its_description(self):
        content = {"title": t("Reviews"), "items": [], "image": "/files/section-abc.webp"}
        self.assertIn("alt_required", {issue.rule for issue in validate_typed_section("testimonials", content).issues})

    def test_gallery_items_need_a_photo_and_stay_within_twelve(self):
        item = {"image": "/files/section-abc.webp", "imageAlt": t("Braids", "ሹሩባ"), "caption": t("Knotless braids")}
        self.assertTrue(validate_typed_section("gallery", {"title": t("Our work"), "items": [item]}).ok)
        self.assertTrue(validate_typed_section("gallery", {"title": t("Our work"), "items": []}).ok, "an empty gallery shows the template's own looks")
        missing = validate_typed_section("gallery", {"title": t("Our work"), "items": [{"caption": t("Braids")}]})
        self.assertIn("items[0].image", {issue.field for issue in missing.issues})
        many = validate_typed_section("gallery", {"title": t("Our work"), "items": [item] * 13})
        self.assertIn("max_items", {issue.rule for issue in many.issues})
        markup = validate_typed_section("gallery", {"title": t("Our work"), "items": [{**item, "caption": t("<b>x</b>")}]})
        self.assertIn("safe_text", {issue.rule for issue in markup.issues})


def _parts(name, service, provider, zone="Africa/Addis_Ababa"):
    return SimpleNamespace(
        event=SimpleNamespace(name=name, resource=None), service=SimpleNamespace(name=service),
        location=SimpleNamespace(timezone=zone), provider=SimpleNamespace(name=provider), business=SimpleNamespace(),
    )


def _resolved(parts):
    """Scheduler parts unpack like `ResolvedOffering`."""
    class Resolved(tuple):
        def __new__(cls, value):
            item = super().__new__(cls, (value.event, value.service, value.location, value.provider, value.business))
            item.location = value.location
            return item
    return Resolved(parts)


class TestNextAvailability(unittest.TestCase):
    NOW = datetime(2026, 10, 15, 8, 0)  # 11:00 in Addis Ababa, a Thursday

    def test_the_owner_setting_is_off_unless_it_is_exactly_true(self):
        self.assertFalse(next_availability.enabled({}))
        self.assertFalse(next_availability.enabled({"liveAvailability": "yes"}))
        self.assertFalse(next_availability.enabled(None))
        self.assertTrue(next_availability.enabled({"liveAvailability": True}))

    def test_summary_has_counts_and_start_times_only(self):
        offerings = [_resolved(_parts("EVT-1", "SVC-wash", "PRV-hanna")), _resolved(_parts("EVT-2", "SVC-cut", "PRV-rahel"))]
        today = [datetime(2026, 10, 15, 11, 30), datetime(2026, 10, 15, 13, 0)]

        def free(parts, day, now):
            if parts[0].name == "EVT-1":
                return today if str(day) == "2026-10-15" else []
            return [datetime(2026, 10, 16, 6, 0)] if str(day) == "2026-10-16" else []

        with patch.object(next_availability, "_public_offerings", return_value=offerings), \
                patch.object(next_availability, "_free_starts", side_effect=free):
            result = next_availability.compute("ORG-1", None, now=self.NOW)
        self.assertEqual(set(result), {"enabled", "timezone", "next", "todayLeft", "services", "providers"})
        self.assertEqual(result["next"], {"start": "2026-10-15T11:30:00Z", "service": "SVC-wash", "provider": "PRV-hanna", "offering": "EVT-1"})
        self.assertEqual(result["todayLeft"], 2)
        self.assertEqual(result["services"]["SVC-cut"], {"next": "2026-10-16T06:00:00Z", "todayLeft": 0})
        self.assertEqual(result["providers"]["PRV-hanna"], {"next": "2026-10-15T11:30:00Z", "todayLeft": 2})
        text = json.dumps(result)
        for secret in ("customer", "email", "phone", "notes", "client"):
            self.assertNotIn(secret, text)

    def test_a_business_without_public_offerings_has_nothing_free(self):
        with patch.object(next_availability, "_public_offerings", return_value=[]):
            result = next_availability.compute("ORG-1", None, now=self.NOW)
        self.assertEqual((result["next"], result["todayLeft"]), (None, 0))

    def test_the_published_setting_decides_and_the_answer_is_cached(self):
        context = SimpleNamespace(release="REL-1", public_site="SITE-1", organization="ORG-1", provider=None)
        with patch("appointment.public_experience.resolver.public_snapshot", return_value={"booking": {"showPrices": True}}), \
                patch.object(next_availability, "compute") as compute:
            self.assertEqual(next_availability.for_context(context), {"enabled": False})
            compute.assert_not_called()
        frappe.cache.delete_value("public_experience:next_availability:SITE-1:REL-1")
        try:
            with patch("appointment.public_experience.resolver.public_snapshot", return_value={"booking": {"liveAvailability": True}}), \
                    patch.object(next_availability, "compute", return_value={"enabled": True, "next": None, "todayLeft": 0, "services": {}, "providers": {}, "timezone": "Africa/Addis_Ababa"}) as compute:
                first = next_availability.for_context(context)
                second = next_availability.for_context(context)
            self.assertEqual(compute.call_count, 1, "a second visitor within 60 seconds reads the cache")
            self.assertEqual(first, second)
            self.assertIn("generatedAt", first)
        finally:
            frappe.cache.delete_value("public_experience:next_availability:SITE-1:REL-1")

    def test_the_guest_endpoint_says_nothing_about_unpublished_paths(self):
        from appointment.public_experience import api

        with patch.object(api.resolver_module, "resolve_public_experience", side_effect=PublicResolutionError("no site")):
            self.assertEqual(api.get_next_availability("/no-such-site"), {"enabled": False})


class TestBookingOptions(unittest.TestCase):
    def test_owners_can_switch_live_availability_and_nothing_else(self):
        from appointment.public_experience import setup

        doc = SimpleNamespace(booking_json=json.dumps({"showPrices": True}))
        self.assertEqual(setup.booking_options(doc), {"liveAvailability": False, "holidayGreetings": False})
        setup._set_booking_options(doc, {"liveAvailability": True})
        self.assertEqual(json.loads(doc.booking_json), {"liveAvailability": True, "showPrices": True})
        self.assertEqual(setup.booking_options(doc), {"liveAvailability": True, "holidayGreetings": False})
        for bad in ({"liveAvailability": "on"}, {"showPrices": False}, ["liveAvailability"]):
            with self.subTest(bad=bad), self.assertRaises(frappe.ValidationError):
                setup._set_booking_options(doc, bad)

    def test_holiday_greetings_are_off_until_the_owner_turns_them_on(self):
        from appointment.public_experience import setup

        doc = SimpleNamespace(booking_json=None)
        self.assertEqual(setup.booking_options(doc), {"liveAvailability": False, "holidayGreetings": False})
        # Only exactly true counts as on.
        doc.booking_json = json.dumps({"holidayGreetings": "yes"})
        self.assertFalse(setup.booking_options(doc)["holidayGreetings"])
        doc.booking_json = json.dumps({"currency": "ETB"})
        setup._set_booking_options(doc, {"holidayGreetings": True, "liveAvailability": False})
        self.assertEqual(json.loads(doc.booking_json), {"currency": "ETB", "holidayGreetings": True, "liveAvailability": False})
        self.assertEqual(setup.booking_options(doc), {"liveAvailability": False, "holidayGreetings": True})
        setup._set_booking_options(doc, {"holidayGreetings": False})
        self.assertFalse(setup.booking_options(doc)["holidayGreetings"])
        for bad in ({"holidayGreetings": 1}, {"holidayGreetings": "on"}, {"holidayMoments": True}):
            with self.subTest(bad=bad), self.assertRaises(frappe.ValidationError):
                setup._set_booking_options(doc, bad)

    def test_showcases_turn_holiday_greetings_on(self):
        from appointment.demo import ergata_showcase, showcase

        self.assertIs(ergata_showcase.SHOWCASE.booking.get("holidayGreetings"), True)
        self.assertIs(ergata_showcase.SHOWCASE.booking.get("liveAvailability"), True)
        self.assertIn('"holidayGreetings": True', showcase.__loader__.get_source(showcase.__name__))


# The forms that the certified packages draw today (docs/design/TEMPLATE_REIMAGINATION.md, section 8).
CURRENT_EXPRESSION = {
    "imagery": "mixed",
    "motion": "expressive",
    "darkMode": "night-photos",
    "holiday": "decoration",
    "success": "animated",
    "greeting": "hero",
}
CERTIFIED = {
    "bloom-hair": 3,
    "selam-movement": 3,
    "tena-clinic": 3,
    "abugida-language": 3,
    "meron-atelier": 3,
    "ergata-therapy": 2,
}
FIXTURE = APP_ROOT / "tests" / "fixtures" / "expression-minimal.recipe.json"


class TestTemplateExpression(unittest.TestCase):
    def _document(self, **expression):
        document = json.loads(FIXTURE.read_text(encoding="utf-8"))
        document["expression"] = {**document["expression"], **expression}
        return document

    def test_certified_recipes_declare_the_forms_they_draw(self):
        for key, version in CERTIFIED.items():
            with self.subTest(recipe=key):
                recipe = get_recipe(key, version)
                self.assertTrue(recipe.expression_declared)
                self.assertEqual(dict(recipe.expression), CURRENT_EXPRESSION)
                self.assertEqual(recipe.as_summary()["expression"], CURRENT_EXPRESSION)
                design = compile_design(key, version, {"motion": "calm"}, None, ["en", "am"]).as_dict()
                self.assertEqual(design["expression"], CURRENT_EXPRESSION, "the compiled design carries the declaration")

    def test_recipes_without_a_declaration_get_the_defaults_and_keep_their_compiled_shape(self):
        for key, versions in RECIPE_MANIFESTS.items():
            for version in versions:
                if CERTIFIED.get(key) == version:
                    continue
                with self.subTest(recipe=key, version=version):
                    recipe = get_recipe(key, version)
                    self.assertFalse(recipe.expression_declared)
                    self.assertEqual(dict(recipe.expression), {**EXPRESSION_DEFAULTS, "motion": "standard"})
                    design = compile_design(key, version, {"motion": "calm"}, None, ["en", "am"]).as_dict()
                    self.assertNotIn("expression", design, "older compiled designs stay byte-identical")

    def test_a_minimal_typographic_recipe_is_valid(self):
        recipe = _recipe(self._document(), "fixture")
        self.assertEqual(
            dict(recipe.expression),
            {"imagery": "typographic", "motion": "calm", "darkMode": "tonal", "holiday": "greeting", "success": "static", "greeting": "header"},
        )
        for quality, choices in EXPRESSION_CHOICES.items():
            for choice in choices:
                if quality == "motion":
                    continue
                self.assertEqual(_recipe(self._document(**{quality: choice}), "fixture").expression[quality], choice)

    def test_the_declaration_is_closed(self):
        bad = {
            "unknown quality": self._document(sparkle="yes"),
            "unknown form": self._document(imagery="neon"),
            "motion above the offered levels": self._document(motion="expressive"),
        }
        missing = self._document()
        del missing["expression"]["success"]
        bad["missing quality"] = missing
        not_object = self._document()
        not_object["expression"] = ["typographic"]
        bad["not an object"] = not_object
        for name, document in bad.items():
            with self.subTest(case=name), self.assertRaises(DesignManifestError):
                _recipe(document, "fixture")


if __name__ == "__main__":
    unittest.main()
