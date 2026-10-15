"""Abugida v3, "Living Manuscript": the recipe, its packaged photos and the showcase content
(docs/design/ABUGIDA_V3.md)."""

import hashlib
import json
import unittest

from appointment.demo import showcase_public
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.errors import DesignCompilationError
from appointment.public_experience.recipes import _read, get_recipe
from appointment.public_experience.showcase_catalog import APP_ROOT, REPO_ROOT, load_showcase_catalog

IMAGERY = "public_experience/manifest/design/imagery/abugida-living-manuscript.v1.json"
FOLDER = APP_ROOT / "public" / "brand-experience" / "support" / "abugida-v3"
URL = "/assets/appointment/brand-experience/support/abugida-v3/"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class TestAbugidaV3Recipe(unittest.TestCase):
    def test_v3_compiles_with_candle_lit_photos_mobile_crops_and_expressive_motion(self):
        recipe = get_recipe("abugida-language", 3)
        design = compile_design("abugida-language", 3, {"motion": "expressive"}, None, ["en", "am"]).as_dict()
        self.assertEqual(design["motion"], "expressive")
        self.assertEqual(design["layout"]["rendererVersion"], 3)
        hero = design["assets"]["hero.primary"]
        self.assertTrue(hero["darkSrc"].endswith("/abugida-v3/hero-night.webp"))
        self.assertTrue(hero["darkMobileSrc"].endswith("/abugida-v3/hero-night-m.webp"))
        self.assertEqual((hero["width"], hero["height"]), (1024, 1280), "the hero is a 4:5 crop with both people in the frame")
        self.assertEqual(hero["formats"], ["avif"])
        self.assertIn("darkSrc", design["assets"]["band.abugida"])
        self.assertEqual(design["assets"]["section.detail"]["src"], URL + "story.webp")
        self.assertEqual(design["typography"]["roles"]["display"]["family"], "Abugida Alegreya", "Alegreya with Abyssinica SIL stays")
        self.assertEqual(design["tokens"]["light"]["canvas"], "#f4ecdc", "a warmer parchment")
        self.assertIn("gallery", recipe.supported_sections)
        self.assertNotIn("gallery", recipe.required_sections)
        self.assertEqual(recipe.default_inputs["motion"], "standard", "new sites start at standard motion")

    def test_v2_stays_registered_and_unchanged(self):
        with self.assertRaises(DesignCompilationError):
            compile_design("abugida-language", 2, {"motion": "expressive"}, None, ["en", "am"])
        design = compile_design("abugida-language", 2, {"motion": "calm"}, None, ["en", "am"]).as_dict()
        self.assertEqual(design["layout"]["rendererVersion"], 2)
        for asset in design["assets"].values():
            self.assertFalse({"darkSrc", "formats", "widths", "mobileWidth"} & set(asset), "older designs stay byte-identical")

    def test_every_packaged_file_is_in_the_manifest_with_its_checksum(self):
        imagery = _read(IMAGERY)
        listed = {}
        for role, asset in imagery["assets"].items():
            listed[asset["src"]] = asset["checksum"]
            listed.update({URL + name: value for name, value in asset["checksums"].items()})
            for url in [asset["mobileSrc"], asset.get("darkSrc"), asset.get("darkMobileSrc")]:
                if url:
                    self.assertIn(url, listed, f"{role}: {url} needs a checksum")
            for width in asset["widths"]:
                self.assertIn(asset["src"].replace(".webp", f"-w{width}.webp"), listed)
        on_disk = {URL + path.name for path in FOLDER.iterdir()}
        self.assertEqual(set(listed), on_disk, "every file is recorded once, and nothing is left out")
        for url, checksum in listed.items():
            self.assertEqual("sha256:" + sha(FOLDER / url.removeprefix(URL)), checksum, url)
            if url.endswith(".webp"):
                self.assertIn(url.replace(".webp", ".avif"), listed, f"AVIF next to {url}")
        for role, asset in imagery["assets"].items():
            self.assertEqual(asset["provenance"]["source"], "generated", role)
            self.assertIn("no text, logos or client faces", asset["provenance"]["review"], role)

    def test_phone_heroes_and_desktop_files_stay_within_the_image_budget(self):
        self.assertLessEqual((FOLDER / "hero-m.webp").stat().st_size, 180 * 1024)
        self.assertLessEqual((FOLDER / "hero-night-m.webp").stat().st_size, 180 * 1024)
        for path in FOLDER.glob("*.webp"):
            limit = 120 * 1024 if path.stem.endswith("-m") else 200 * 1024
            self.assertLessEqual(path.stat().st_size, limit, path.name)


class TestAbugidaShowcase(unittest.TestCase):
    def test_the_catalog_moves_the_showcase_to_v3_files(self):
        site = load_showcase_catalog()["sites"]["abugida"]
        recipe = get_recipe(site["recipe"])
        self.assertEqual(recipe.version, 3)
        self.assertIn(site["heroRole"], recipe.adjustments["heroAsset"]["choices"])
        self.assertIn(site["detailRole"], recipe.adjustments["detailAsset"]["choices"])
        self.assertEqual(site["heroAsset"], URL + "hero.webp")
        files = {entry["asset"]: entry["checksum"] for entry in site["templateAssets"]}
        self.assertEqual(set(files), {URL + path.name for path in FOLDER.iterdir()})
        for url, checksum in files.items():
            self.assertEqual(sha(FOLDER / url.removeprefix(URL)), checksum, url)

    def test_showcase_photos_are_packaged_roles_with_amharic_descriptions(self):
        packaged = {asset["src"] for asset in _read(IMAGERY)["assets"].values()}
        scenes = showcase_public.V3_SCENES["abugida"]
        entries = [scenes["hero"], scenes["about"], *scenes["services"], *scenes["locations"]]
        self.assertEqual(len({path for path, _, _ in entries}), len(entries), "no photo repeats on the page")
        for path, english, amharic in entries:
            self.assertIn(path, packaged, "the template keeps the night photo and the mobile crop")
            self.assertTrue(english and amharic)
            self.assertNotRegex(english.lower(), r"demo|test|fictional")

    def test_enough_consented_reviews_for_the_marginalia_marquee(self):
        reviews = showcase_public.EXTRA_TESTIMONIALS["abugida"]
        self.assertGreaterEqual(len(reviews), 2, "the first review is the page text; two or more notes run in the marquee")
        for quote, quote_am, name, role, role_am in reviews:
            self.assertTrue(quote and quote_am and name and role and role_am)

    def test_every_template_string_is_in_english_and_amharic(self):
        root = REPO_ROOT / "frontend" / "src" / "lib" / "i18n" / "translations"
        english = json.loads((root / "en.json").read_text(encoding="utf-8"))["publicSite"]["abugida"]
        amharic = json.loads((root / "am.json").read_text(encoding="utf-8"))["publicSite"]["abugida"]
        self.assertEqual(set(english), set(amharic))
        for key, value in amharic.items():
            self.assertRegex(value, r"[ሀ-፿]", f"publicSite.abugida.{key} is Amharic")
