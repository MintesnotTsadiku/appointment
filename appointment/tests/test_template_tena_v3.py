"""Template reimagination, phase 2: Tena v3, "Clear Path" (docs/design/TENA_V3.md).

The recipe compiles with night photos, mobile crops and the expressive level; every packaged file matches
its checksum; the showcase catalog lists every file; and the showcase content for v3 uses the package's
own photos, the door-to-door visit and the clinic in numbers.
"""

import hashlib
import unittest

from appointment.demo import showcase_public
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.recipes import _read, get_recipe
from appointment.public_experience.showcase_catalog import APP_ROOT, load_showcase_catalog

IMAGERY = "public_experience/manifest/design/imagery/tena-clear-path.v1.json"
ROLES = {"hero.tena", "band.tena", "proof.tena", "team.tena", "faq.tena", "benefit.tena", "room1.tena", "room2.tena", "room3.tena",
         *(f"visit{n}.tena" for n in range(1, 5)), *(f"care{n}.tena" for n in range(1, 4))}


class TestTenaV3Recipe(unittest.TestCase):
    def test_v3_compiles_with_night_photos_mobile_crops_and_expressive_motion(self):
        recipe = get_recipe("tena-clinic", 3)
        self.assertEqual(recipe.primitives["imagery"].key, "tena-clear-path")
        design = compile_design("tena-clinic", 3, {"motion": "expressive"}, None, ["en", "am"]).as_dict()
        self.assertEqual(design["motion"], "expressive")
        self.assertEqual(design["layout"]["rendererVersion"], 3)
        self.assertEqual(ROLES, {name for name in design["assets"] if name.endswith(".tena")})
        hero = design["assets"]["hero.primary"]
        self.assertTrue(hero["darkSrc"].endswith("/tena-v3/hero-night.webp"))
        self.assertTrue(design["assets"]["band.tena"]["darkMobileSrc"].endswith("/tena-v3/band-night-m.webp"))
        self.assertEqual(hero["formats"], ["avif"])
        self.assertNotIn("checksums", hero, "per-file checksums stay in the manifest, not in the public design")
        self.assertEqual(design["assets"]["section.detail"]["src"], design["assets"]["visit2.tena"]["src"])
        self.assertEqual(recipe.default_inputs["motion"], "standard", "new sites start at standard motion")
        self.assertEqual(recipe.required_sections, recipe.supported_sections, "Tena v3 renders every section it supports")

    def test_v2_stays_loadable_and_unchanged(self):
        design = compile_design("tena-clinic", 2, {"motion": "calm"}, None, ["en", "am"]).as_dict()
        self.assertEqual(design["layout"]["rendererVersion"], 2)
        for asset in design["assets"].values():
            self.assertFalse({"darkSrc", "formats", "widths", "mobileWidth"} & set(asset), "the v2 design keeps its compiled shape")

    def test_every_packaged_tena_v3_file_matches_its_checksum_and_the_catalog(self):
        imagery = _read(IMAGERY)
        root = APP_ROOT / "public"
        listed = {}
        for role, asset in imagery["assets"].items():
            files = {asset["src"]: asset["checksum"]}
            files.update({asset["src"].rsplit("/", 1)[0] + "/" + name: value for name, value in asset["checksums"].items()})
            for url in [asset["mobileSrc"], asset.get("darkSrc"), asset.get("darkMobileSrc")]:
                if url:
                    self.assertIn(url, files, f"{role}: {url} needs a checksum")
            for url, checksum in files.items():
                path = root / url.removeprefix("/assets/appointment/")
                self.assertEqual("sha256:" + hashlib.sha256(path.read_bytes()).hexdigest(), checksum, url)
                if url.endswith(".webp"):
                    self.assertIn(url.replace(".webp", ".avif"), files, f"{role}: AVIF next to {url}")
            for width in asset["widths"]:
                self.assertIn(asset["src"].replace(".webp", f"-w{width}.webp"), files)
            self.assertIn("no patient faces", asset["provenance"]["review"])
            listed.update(files)
        site = load_showcase_catalog()["sites"]["tena"]
        catalog = {row["asset"]: "sha256:" + row["checksum"] for row in site["templateAssets"]}
        self.assertEqual(catalog, listed, "the showcase catalog lists every Tena v3 file with its checksum")
        on_disk = {f"/assets/appointment/brand-experience/support/tena-v3/{path.name}" for path in (root / "brand-experience/support/tena-v3").iterdir()}
        self.assertEqual(on_disk, set(catalog), "no unlisted file ships in the package folder")
        self.assertEqual((site["heroRole"], site["detailRole"]), ("hero.tena", "visit2.tena"))

    def test_open_figures_ship_next_to_the_body_face(self):
        fonts = APP_ROOT / "public/fonts/tena"
        for weight in (400, 700):
            self.assertTrue((fonts / f"tena-figures-{weight}.woff2").is_file())
        self.assertIn("Atkinson Hyperlegible Next", (fonts / "tena-figures.OFL.txt").read_text(encoding="utf-8"))

    def test_showcase_content_uses_the_package_photos_and_four_visit_steps(self):
        scenes = showcase_public.V3_SCENES["tena"]
        photos = [scenes["hero"], scenes["about"], *scenes["services"], *scenes["locations"], *scenes["process"]]
        for path, english, amharic in photos:
            self.assertTrue(path.startswith("/assets/appointment/brand-experience/support/tena-v3/"), path)
            self.assertTrue(english and amharic, path)
            self.assertTrue((APP_ROOT / "public" / path.removeprefix("/assets/appointment/")).is_file(), path)
        self.assertEqual(len(scenes["process"]), len(showcase_public.PROCESS_STEPS["tena"]), "one photo for each step of the visit")
        self.assertGreaterEqual(len(showcase_public.EXTRA_TESTIMONIALS["tena"]), 2, "three or more reviews give the marquee")
        for label, value, note in showcase_public.PROOF["tena"]:
            self.assertIn(label, showcase_public.AM)
            self.assertIn(note, showcase_public.AM)
        for quote, quote_am, name, role, role_am in showcase_public.EXTRA_TESTIMONIALS["tena"]:
            self.assertNotRegex(quote.lower(), r"demo|fictional|test")
            self.assertTrue(quote_am and role_am)
