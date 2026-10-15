"""Selam Movement v3, "Tempo" (docs/design/SELAM_V3.md): the recipe, the imagery manifest with the five
movement frames and their night photos, the checksums, the showcase catalog entry and the showcase content."""

import hashlib
import json
import unittest

from appointment.demo import showcase_public
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.recipes import _read, get_recipe
from appointment.public_experience.showcase_catalog import APP_ROOT

IMAGERY = "public_experience/manifest/design/imagery/selam-tempo.v1.json"
CATALOG = APP_ROOT / "public_experience/manifest/showcase/catalog.v1.json"
FOLDER = "brand-experience/support/selam-v3"
FRAMES = ("hero.selam", "flow2.selam", "flow3.selam", "flow4.selam", "flow5.selam")
NIGHT_ROLES = {*FRAMES, "band.selam"}


class TestSelamV3(unittest.TestCase):
	def test_v3_is_the_latest_recipe_and_v2_stays_loadable(self):
		self.assertEqual(get_recipe("selam-movement").version, 3)
		self.assertEqual(get_recipe("selam-movement", 2).version, 2)
		recipe = get_recipe("selam-movement", 3)
		self.assertEqual(recipe.default_inputs["motion"], "standard", "new sites start at standard motion")
		self.assertEqual(recipe.adjustments["motion"]["choices"], ["calm", "standard", "expressive"])
		for section in ("process", "proof", "testimonials", "benefits"):
			self.assertIn(section, recipe.required_sections)

	def test_v3_compiles_with_five_frames_and_their_night_photos(self):
		design = compile_design("selam-movement", 3, {"motion": "expressive"}, None, ["en", "am"]).as_dict()
		self.assertEqual(design["motion"], "expressive")
		self.assertEqual((design["layout"]["rendererKey"], design["layout"]["rendererVersion"]), ("selam-movement", 3))
		hero = design["assets"]["hero.primary"]
		self.assertTrue(hero["src"].endswith("/selam-v3/hero.webp"))
		self.assertTrue(hero["darkSrc"].endswith("/selam-v3/hero-night.webp"))
		self.assertTrue(hero["darkMobileSrc"].endswith("/selam-v3/hero-night-m.webp"))
		self.assertEqual(hero["formats"], ["avif"])
		self.assertNotIn("checksums", hero, "per-file checksums stay in the manifest")
		for role in FRAMES:
			self.assertTrue(design["assets"][role]["darkSrc"], f"{role} has a night photo, so the scrub stays in one light")
		for role in ("session1.selam", "session2.selam", "beat1.selam", "beat3.selam", "benefit.selam", "quote.selam", "interlude.selam", "studio.selam", "band.selam"):
			self.assertIn(role, design["assets"])

	def test_every_packaged_selam_v3_file_matches_its_checksum(self):
		imagery = _read(IMAGERY)
		self.assertEqual({role for role, asset in imagery["assets"].items() if asset.get("darkSrc")}, NIGHT_ROLES)
		root = APP_ROOT / "public"
		listed = set()
		for role, asset in imagery["assets"].items():
			self.assertEqual(asset["provenance"]["source"], "generated", role)
			folder = asset["src"].rsplit("/", 1)[0]
			files = {asset["src"]: asset["checksum"], **{f"{folder}/{name}": value for name, value in asset["checksums"].items()}}
			for url in (asset["mobileSrc"], asset.get("darkSrc"), asset.get("darkMobileSrc")):
				if url:
					self.assertIn(url, files, f"{role}: {url} needs a checksum")
			for url, checksum in files.items():
				path = root / url.removeprefix("/assets/appointment/")
				self.assertTrue(path.is_file(), path)
				self.assertEqual("sha256:" + hashlib.sha256(path.read_bytes()).hexdigest(), checksum, url)
				if url.endswith(".webp"):
					self.assertIn(url.replace(".webp", ".avif"), files, f"{role}: AVIF next to {url}")
				listed.add(url)
		on_disk = {f"/assets/appointment/{FOLDER}/{path.name}" for path in (root / FOLDER).iterdir()}
		self.assertEqual(on_disk, listed, "every packaged file is in the manifest")
		# The hero frame stays light on a phone (guardrail G1: at most 180 KB).
		self.assertLess((root / FOLDER / "hero-m.webp").stat().st_size, 180_000)

	def test_the_showcase_catalog_lists_every_selam_v3_file(self):
		site = json.loads(CATALOG.read_text(encoding="utf-8"))["sites"]["selam"]
		self.assertEqual((site["heroRole"], site["detailRole"]), ("hero.selam", "interlude.selam"))
		root = APP_ROOT / "public"
		self.assertEqual(hashlib.sha256((root / site["heroAsset"].removeprefix("/assets/appointment/")).read_bytes()).hexdigest(), site["heroChecksum"])
		assets = {entry["asset"]: entry["checksum"] for entry in site["templateAssets"]}
		self.assertEqual(len(assets), len(list((root / FOLDER).iterdir())))
		for url, checksum in assets.items():
			self.assertEqual(hashlib.sha256((root / url.removeprefix("/assets/appointment/")).read_bytes()).hexdigest(), checksum, url)

	def test_the_showcase_content_uses_the_packaged_photos_with_amharic_descriptions(self):
		scenes = showcase_public.V3_SCENES["selam"]
		self.assertTrue(scenes["hero"][0].endswith("/selam-v3/hero.webp"), "the hero is the first movement frame")
		entries = [scenes["hero"], scenes["about"], *scenes["services"], *scenes["locations"], *scenes["process"]]
		for path, english, amharic in entries:
			self.assertTrue((APP_ROOT / "public" / path.removeprefix("/assets/appointment/")).is_file(), path)
			self.assertTrue(english and amharic and english != amharic)
		self.assertGreaterEqual(len(showcase_public.EXTRA_TESTIMONIALS["selam"]), 2, "a pull quote and a review marquee")
		for quote, quote_am, name, role, role_am in showcase_public.EXTRA_TESTIMONIALS["selam"]:
			self.assertTrue(quote_am and role_am)
			self.assertNotRegex(f"{quote} {role}", r"(?i)fictional|demo|test")
