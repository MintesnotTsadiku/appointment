"""Public content route and release compatibility contracts."""

import sys
import unittest
from unittest.mock import patch

import frappe

from appointment.content import releases
from appointment.public_experience.resolver import _route_kind


class PublicContentRoutes(unittest.TestCase):
    def test_content_indexes_and_details_have_distinct_route_kinds(self):
        for route, kind in (
            ("/blog", "blog_index"), ("/blog/", "blog_index"), ("/blog/a-story", "blog_detail"),
            ("/gallery", "gallery_index"), ("/gallery/team", "gallery_detail"),
        ):
            self.assertEqual(_route_kind(route), kind)

    def test_unknown_and_nested_routes_fail_closed(self):
        for route in ("/blog/a/b", "/gallery/..", "/blog/%2e%2e", "/gallery/a.b", "/unknown"):
            self.assertEqual(_route_kind(route), "not_found", route)

    def test_article_detail_projects_version_from_immutable_row(self):
        self._assert_detail_version(releases.get_public_article, "article", "/blog/story")

    def test_gallery_detail_projects_version_from_immutable_row(self):
        self._assert_detail_version(releases.get_public_gallery, "gallery_collection", "/gallery/team")

    def test_indexes_project_version_from_immutable_rows(self):
        row = self._row("/blog/story")
        for loader, key in ((releases.list_public_articles, "articles"), (releases.list_public_galleries, "galleries")):
            with patch.object(frappe, "get_all", return_value=[row]) as read:
                index = loader("site-a", "en")
                self.assertEqual(index[key][0]["templateCompatVersion"], "public-content.v1")
                self.assertEqual(read.call_args.kwargs["filters"]["status"], "Active")
                self.assertEqual(read.call_args.kwargs["filters"]["public_site"], "site-a")

    def _assert_detail_version(self, loader, content_type, route):
        with patch.object(frappe.db, "get_value", return_value=self._row(route)) as read:
            detail = loader("site-a", route, "en")
            self.assertEqual(detail["templateCompatVersion"], "public-content.v1")
            self.assertEqual(read.call_args.args[0], "Published Content Release")
            self.assertEqual(read.call_args.args[1], {
                "public_site": "site-a", "content_type": content_type,
                "status": "Active", "route": route, "locale": "en",
            })

    def _row(self, route):
        return frappe._dict(route=route, locale="en", content_hash="hash", published_at="2026-09-26",
            content_json='{"title":"Story","items":[]}', media_json="{}", seo_json="{}",
            template_compat_version="public-content.v1")


def run():
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(PublicContentRoutes)
    )
    if not result.wasSuccessful():
        raise AssertionError("Public content route contracts failed")
    return {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
