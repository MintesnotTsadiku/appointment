"""The landing template gallery lists every certified template from the manifests."""

import unittest
from unittest.mock import patch

from appointment.public_experience import template_gallery
from appointment.public_experience.recipes import list_recipes
from appointment.public_experience.reserved import RESERVED_ROOT_PATHS
from appointment.public_experience.showcase_catalog import APP_ROOT, validate_showcase_catalog


class TestTemplateGallery(unittest.TestCase):
    def gallery(self, published: dict[str, str]):
        with patch.object(template_gallery, "_published_titles", return_value=published):
            return template_gallery.template_gallery()["templates"]

    def test_every_certified_recipe_is_listed_once(self):
        rows = self.gallery({})
        self.assertEqual([row["key"] for row in rows], [recipe.key for recipe in list_recipes()])
        for row in rows:
            self.assertTrue(row["label"] and row["audience"])
            self.assertEqual(row["themes"], ["light", "dark"])
            self.assertIn("en", row["locales"])

    def test_previews_are_shipped_checksummed_files(self):
        validate_showcase_catalog()
        for row in self.gallery({}):
            self.assertEqual(set(row["previews"]), {"desktop", "mobile"}, row["key"])
            for asset in row["previews"].values():
                self.assertTrue((APP_ROOT / "public" / asset.removeprefix("/assets/appointment/")).is_file(), asset)

    def test_live_example_only_while_the_showcase_is_published(self):
        rows = {row["key"]: row for row in self.gallery({"bloom-studio": "Bole Bloom Hair Studio"})}
        self.assertEqual(rows["bloom-hair"]["showcase"], {"path": "/bloom-studio", "title": "Bole Bloom Hair Studio"})
        self.assertIsNone(rows["tena-clinic"]["showcase"], "an unpublished showcase still lists the template, without a live link")
        self.assertTrue(rows["tena-clinic"]["previews"])

    def test_a_broken_recipe_is_left_out_and_the_rest_still_list(self):
        from appointment.public_experience import recipes
        from appointment.public_experience.errors import DesignManifestError

        real = recipes.get_recipe

        def get_recipe(key, *args, **kwargs):
            if key == "tena-clinic":
                raise DesignManifestError("design manifest is missing: imagery/example.v1.json")
            return real(key, *args, **kwargs)

        with patch.object(recipes, "get_recipe", side_effect=get_recipe), patch("frappe.log_error") as log_error:
            keys = [row["key"] for row in self.gallery({})]
        self.assertNotIn("tena-clinic", keys)
        self.assertIn("bloom-hair", keys)
        log_error.assert_called_once()

    def test_templates_path_is_reserved(self):
        self.assertIn("templates", RESERVED_ROOT_PATHS)


if __name__ == "__main__":
    unittest.main()
