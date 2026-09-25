"""Integrity checks for the deployable showcase catalog."""

from pathlib import Path
import hashlib
import json
import unittest

from appointment.public_experience.showcase_catalog import (
    REPO_ROOT,
    recipe_assignments,
    validate_showcase_catalog,
)


class TestShowcaseCatalog(unittest.TestCase):
    def test_runtime_assets_and_benchmarks_are_reproducible(self):
        catalog = validate_showcase_catalog()
        self.assertEqual(set(catalog["sites"]), {"selam", "meron", "bloom", "tena", "abugida"})
        self.assertEqual(len({site["slug"] for site in catalog["sites"].values()}), 5)

    def test_seed_assignments_come_from_catalog(self):
        catalog = validate_showcase_catalog()["sites"]
        assignments = recipe_assignments()
        for key, assignment in assignments.items():
            self.assertEqual(assignment["recipe"], catalog[key]["recipe"])
            self.assertEqual(assignment["hero"], catalog[key]["heroRole"])
            self.assertEqual(assignment["detail"], catalog[key]["detailRole"])
            self.assertEqual(assignment["logo"], catalog[key]["logoAsset"])
            self.assertEqual(assignment["favicon"], catalog[key]["faviconAsset"])

    def test_design_reference_manifest_matches_files(self):
        root = REPO_ROOT / "docs" / "design-references" / "public-experience" / "v1"
        manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["contract"], "appointment-design-reference-manifest.v1")
        self.assertEqual(len(manifest["files"]), 13)
        for item in manifest["files"]:
            path = root / item["path"]
            self.assertTrue(path.is_file(), path)
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), item["sha256"])


if __name__ == "__main__":
    unittest.main()
