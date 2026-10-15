"""Meron Atelier v3, "The Fitting Room" (docs/design/MERON_V3.md): the recipe, the imagery manifest with
night photos and checksums, and the showcase catalog entry."""

import hashlib
import json
import unittest

from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.recipes import _read, get_recipe
from appointment.public_experience.showcase_catalog import APP_ROOT

IMAGERY = "public_experience/manifest/design/imagery/meron-fitting-room.v1.json"
CATALOG = APP_ROOT / "public_experience/manifest/showcase/catalog.v1.json"
NIGHT_ROLES = {"loop1.meron", "loop2.meron", "loop3.meron", "band.meron"}


class TestMeronV3(unittest.TestCase):
	def test_v3_is_the_latest_recipe_and_v2_stays_loadable(self):
		self.assertEqual(get_recipe("meron-atelier").version, 3)
		self.assertEqual(get_recipe("meron-atelier", 2).version, 2)
		recipe = get_recipe("meron-atelier", 3)
		self.assertEqual(recipe.default_inputs["motion"], "standard", "new sites start at standard motion")
		self.assertIn("gallery", recipe.supported_sections)
		self.assertNotIn("gallery", recipe.required_sections)

	def test_v3_compiles_with_the_film_night_photos_and_expressive_motion(self):
		design = compile_design("meron-atelier", 3, {"motion": "expressive"}, None, ["en", "am"]).as_dict()
		self.assertEqual(design["motion"], "expressive")
		self.assertEqual((design["layout"]["rendererKey"], design["layout"]["rendererVersion"]), ("meron-atelier", 3))
		hero = design["assets"]["hero.primary"]
		self.assertTrue(hero["src"].endswith("/meron-v3/loop1.webp"))
		self.assertTrue(hero["darkSrc"].endswith("/meron-v3/loop1-night.webp"))
		self.assertEqual(hero["formats"], ["avif"])
		self.assertNotIn("checksums", hero, "per-file checksums stay in the manifest")
		for role in ("story1.meron", "story4.meron", "before.meron", "after.meron", "swatch.meron", "atelier.meron"):
			self.assertIn(role, design["assets"])

	def test_every_packaged_meron_v3_file_matches_its_checksum(self):
		imagery = _read(IMAGERY)
		self.assertEqual(set(role for role, asset in imagery["assets"].items() if asset.get("darkSrc")), NIGHT_ROLES)
		root = APP_ROOT / "public"
		listed = set()
		for role, asset in imagery["assets"].items():
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
		on_disk = {f"/assets/appointment/brand-experience/support/meron-v3/{path.name}" for path in (root / "brand-experience/support/meron-v3").iterdir()}
		self.assertEqual(on_disk, listed, "every packaged file is in the manifest")

	def test_the_showcase_catalog_lists_every_meron_v3_file(self):
		site = json.loads(CATALOG.read_text(encoding="utf-8"))["sites"]["meron"]
		self.assertEqual((site["heroRole"], site["detailRole"]), ("loop1.meron", "atelier.meron"))
		root = APP_ROOT / "public"
		assets = {entry["asset"]: entry["checksum"] for entry in site["templateAssets"]}
		self.assertEqual(len(assets), len(list((root / "brand-experience/support/meron-v3").iterdir())))
		for url, checksum in assets.items():
			self.assertEqual(hashlib.sha256((root / url.removeprefix("/assets/appointment/")).read_bytes()).hexdigest(), checksum, url)
