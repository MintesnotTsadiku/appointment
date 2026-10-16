"""Contract coverage for the seven independently authored template packages."""
import hashlib
import json
import unittest
from pathlib import Path

from appointment.demo.new_template_showcases import SHOWCASES
from appointment.demo.independent_showcase import problems
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.colors import contrast_ratio
from appointment.public_experience.recipes import _read, get_recipe
from appointment.public_experience.section_schemas import validate_typed_section
from appointment.public_experience.showcase_catalog import APP_ROOT, validate_showcase_catalog
from appointment.public_experience.appearance import selected_primitive


class TestNewTemplateCollection(unittest.TestCase):
    def test_all_recipes_compile_in_both_languages_with_owned_assets(self):
        for showcase in SHOWCASES:
            with self.subTest(recipe=showcase.recipe):
                design = compile_design(showcase.recipe, 3, {}, None, ["en", "am"]).as_dict()
                self.assertEqual(design["layout"]["rendererKey"], showcase.recipe)
                self.assertEqual(design["motion"], "calm")
                self.assertIn(f"/{showcase.key}-v3/", design["assets"]["hero.primary"]["src"])
                self.assertEqual(design["assets"]["hero.primary"]["formats"], ["avif"])
                for kind in ("palette", "typography"):
                    document, reference = selected_primitive(get_recipe(showcase.recipe, 3), kind, "default")
                    self.assertEqual(reference["version"], 3)
                    self.assertEqual(document["key"], showcase.recipe)

    def test_showcase_content_passes_closed_section_schemas(self):
        for showcase in SHOWCASES:
            self.assertEqual(problems(showcase), [])
            starter = _read(f"public_experience/manifest/content/{showcase.recipe}.v3.json")["sections"]
            content = showcase.sections(starter, "provider", {"in_person": "office", "online": "video"},
                                        {session.name: f"service-{index}" for index, session in enumerate(showcase.sessions)})
            for section, value in content.items():
                with self.subTest(recipe=showcase.recipe, section=section):
                    self.assertEqual(validate_typed_section(section, value).issues, ())
            self.assertEqual({s.meet for s in showcase.sessions}, {"in_person", "online"})

    def test_checksums_and_provider_identity_are_complete(self):
        catalog = validate_showcase_catalog()["sites"]
        locations = []
        for showcase in SHOWCASES:
            locations.extend(showcase.location_names)
            self.assertEqual(catalog[showcase.key]["slug"], showcase.slug)
            imagery = _read(f"public_experience/manifest/design/imagery/{showcase.recipe}.v3.json")
            for role, asset in imagery["assets"].items():
                folder = APP_ROOT / "public" / asset["src"].removeprefix("/assets/appointment/")
                self.assertEqual(asset["checksum"], "sha256:" + hashlib.sha256(folder.read_bytes()).hexdigest())
                for name, checksum in asset["checksums"].items():
                    self.assertEqual(checksum, "sha256:" + hashlib.sha256(folder.with_name(name).read_bytes()).hexdigest(), role)
        self.assertEqual(len(locations), len(set(locations)), "independent location names must not collide")

    def test_text_and_actions_meet_aa_on_each_tonal_surface(self):
        for showcase in SHOWCASES:
            palette = _read(f"public_experience/manifest/design/palettes/{showcase.recipe}.v3.json")
            for mode, colors in palette["semantic"].items():
                for foreground in ("text", "textMuted", "primary"):
                    for background in ("canvas", "surface", "surfaceMuted"):
                        with self.subTest(recipe=showcase.recipe, mode=mode, pair=(foreground, background)):
                            self.assertGreaterEqual(contrast_ratio(colors[foreground], colors[background]), 4.5)
                self.assertGreaterEqual(contrast_ratio(colors["onPrimary"], colors["primary"]), 4.5)

    def test_new_templates_are_ranked_and_selectable_in_owner_setup(self):
        from appointment.public_experience.setup import CATALOG, ranked_catalog, validated_preferences

        for showcase in SHOWCASES:
            industry = CATALOG[showcase.recipe][0]
            self.assertEqual(validated_preferences({"industry": industry}), {"industry": industry})
            ranked = ranked_catalog(industry=industry)
            self.assertEqual(ranked[0]["key"], showcase.recipe)
            self.assertEqual(ranked[0]["score"], 4)
