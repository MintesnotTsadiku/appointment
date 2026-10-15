"""First-paint data and preload hints of the public page shells (appointment/public_experience/shell_boot.py).

The shell inlines exactly what the guest API returns for the requested address, escapes it so that no HTML parser
can close the element early, and adds preload hints only for safe packaged files. The tests patch the API and
need no records.
"""

from __future__ import annotations

import json
import re
import unittest
from datetime import datetime
from types import SimpleNamespace
from unittest import mock
from zoneinfo import ZoneInfo

import frappe

from appointment.public_experience import api, shell_boot

ADDIS = ZoneInfo("Africa/Addis_Ababa")
DAY = datetime(2026, 10, 15, 10, 0, tzinfo=ADDIS)
NIGHT = datetime(2026, 10, 15, 20, 0, tzinfo=ADDIS)
SUPPORT = "/assets/appointment/brand-experience/support/bloom-v3/"


def design(version: int = 3, key: str = "bloom-hair", **assets) -> dict:
    hero = {
        "src": SUPPORT + "hero.webp",
        "mobileSrc": SUPPORT + "hero-m.webp",
        "darkSrc": SUPPORT + "hero-night.webp",
        "darkMobileSrc": SUPPORT + "hero-night-m.webp",
        "formats": ["avif"],
    }
    return {
        "layout": {"rendererKey": key, "rendererVersion": version},
        "typography": {
            "roles": {"display": {"family": "Bloom Poster"}, "body": {"family": "Bloom Text"}},
            "fontAssets": [
                {"family": "Bloom Poster", "src": "/assets/appointment/fonts/bloom/anton.woff2", "format": "woff2", "scripts": ["latin"]},
                {"family": "Bloom Poster", "src": "/assets/appointment/fonts/bloom/noto-sans-ethiopic-condensed.woff2", "format": "woff2", "scripts": ["ethiopic"]},
                {"family": "Bloom Text", "src": "/assets/appointment/fonts/bloom/karla.woff2", "format": "woff2", "scripts": ["latin"]},
            ],
        },
        "assets": {"hero.primary": hero, **assets},
    }


def snapshot(**overrides) -> dict:
    value = {
        "contract": "appointment-public-snapshot.v2",
        "locale": "en",
        "compiledDesign": design(),
        "sections": [{"type": "hero", "content": {"title": {"en": "Bloom </script><script>alert(1)</script> & co"}}}],
    }
    value.update(overrides)
    return value


class ShellBootTests(unittest.TestCase):
    def test_website_addresses_and_their_kinds(self):
        route = lambda path: shell_boot._site_route([part for part in path.split("/") if part])
        self.assertEqual(route("/bloom-studio"), ("landing", None))
        self.assertEqual(route("/bloom-studio/am"), ("landing", "am"))
        self.assertEqual(route("/bloom-studio/book"), ("book", None))
        self.assertEqual(route("/bloom-studio/blog/first-cut"), ("content", None))
        self.assertEqual(route("/bloom-studio/gallery"), ("content", None))
        for other in ("/", "/settings", "/schedule/org/bloom-studio", "/bloom-studio/booking/token", "/bloom-studio/my-bookings", "/bloom-studio/fr", "/tools/x", "/a/b/c/d"):
            self.assertIsNone(route(other), other)

    def test_boot_data_is_the_guest_api_projection(self):
        published, config = snapshot(), {"source": "experience-release", "compiledDesign": design()}
        with mock.patch.object(api, "get_public_experience_snapshot", return_value=published) as get_snapshot, \
                mock.patch.object(api, "get_public_ui_config", return_value=config) as get_config:
            data, links = shell_boot.boot_parts("/bloom-studio/book", {"locale": "am"})
        get_snapshot.assert_called_once_with(locale="am", public_path="/bloom-studio/book", optional=1)
        get_config.assert_called_once_with(locale="en", public_path="/bloom-studio/book", optional=0)
        self.assertEqual(data, {"path": "/bloom-studio/book", "locale": "am", "snapshot": published, "config": config})
        # `/book` is not a landing page: the font only, no hero photo.
        self.assertEqual(len(links), 1)
        self.assertIn('href="/assets/appointment/fonts/bloom/anton.woff2"', links[0])

    def test_unknown_language_and_missing_site_add_nothing(self):
        with mock.patch.object(api, "get_public_experience_snapshot", return_value=None) as get_snapshot:
            self.assertIsNone(shell_boot.boot_parts("/no-such-site", {}))
            self.assertIsNone(shell_boot.boot_parts("/settings/website", {}))
        get_snapshot.assert_called_once()
        with mock.patch.object(api, "get_public_experience_snapshot", return_value=snapshot()) as get_snapshot, \
                mock.patch.object(api, "get_public_ui_config", return_value={}):
            data, _links = shell_boot.boot_parts("/bloom-studio/book", {"locale": "<fr>"})
        self.assertIsNone(data["locale"])

    def test_scheduler_inlines_only_a_published_website_config(self):
        config = {"source": "experience-release", "locale": "en", "compiledDesign": design()}
        with mock.patch.object(api, "get_public_ui_config", return_value=config) as get_config:
            data, links = shell_boot.boot_parts("/schedule/org/bloom-studio/EVT-1", {})
        get_config.assert_called_once_with(locale=None, public_path="/bloom-studio", optional=1)
        self.assertEqual(data, {"path": "/schedule/org/bloom-studio/EVT-1", "configs": {"/bloom-studio": config}})
        self.assertEqual(len(links), 1)
        with mock.patch.object(api, "get_public_ui_config", return_value={"source": "packaged-recipe"}):
            self.assertIsNone(shell_boot.boot_parts("/schedule/org/bloom-studio", {}))

    def test_boot_element_cannot_be_closed_early(self):
        element = shell_boot.boot_element({"snapshot": snapshot()})
        body = element[len('<script type="application/json" id="pe-boot">'):-len("</script>")]
        self.assertNotIn("<", body)
        self.assertNotIn(">", body)
        self.assertNotIn("&", body)
        self.assertEqual(json.loads(body)["snapshot"]["sections"][0]["content"]["title"]["en"], "Bloom </script><script>alert(1)</script> & co")

    def test_font_preload_is_the_display_face_of_the_page_script(self):
        latin = shell_boot.font_preloads(design(), "en")
        ethiopic = shell_boot.font_preloads(design(), "am")
        self.assertEqual(latin, ['<link rel="preload" as="font" type="font/woff2" href="/assets/appointment/fonts/bloom/anton.woff2" crossorigin>'])
        self.assertIn("noto-sans-ethiopic-condensed.woff2", ethiopic[0])
        unsafe = design()
        for asset in unsafe["typography"]["fontAssets"]:
            asset["src"] = "https://example.com/font.woff2"
        self.assertEqual(shell_boot.font_preloads(unsafe, "en"), [])

    def test_hero_preload_follows_the_kit_night_rule(self):
        sections = snapshot()["sections"]
        day = shell_boot.hero_preloads(design(), sections, None, DAY)
        self.assertEqual(len(day), 2)
        self.assertIn(f'href="{SUPPORT}hero-m.avif" type="image/avif" media="(max-width: 640px) and (prefers-color-scheme: light)" fetchpriority="high"', day[0])
        self.assertIn(f'href="{SUPPORT}hero-night-m.avif" type="image/avif" media="(max-width: 640px) and (prefers-color-scheme: dark)"', day[1])
        night = shell_boot.hero_preloads(design(), sections, None, NIGHT)
        self.assertEqual(len(night), 1)
        self.assertIn(f'href="{SUPPORT}hero-night-m.avif"', night[0])
        self.assertIn('media="(max-width: 640px)"', night[0])
        self.assertIn("hero-m.avif", shell_boot.hero_preloads(design(), sections, "light", DAY)[0])
        self.assertIn("hero-night-m.avif", shell_boot.hero_preloads(design(), sections, "dark", DAY)[0])

    def test_hero_preload_only_for_kit_templates_and_packaged_photos(self):
        sections = snapshot()["sections"]
        self.assertEqual(shell_boot.hero_preloads(design(version=2), sections, None, DAY), [])
        self.assertEqual(len(shell_boot.hero_preloads(design(version=2, key="ergata-therapy"), sections, None, DAY)), 2)
        owner_photo = [{"type": "hero", "content": {"image": "/files/owner-hero.webp"}}]
        self.assertEqual(shell_boot.hero_preloads(design(), owner_photo, None, DAY), [])
        packaged = [{"type": "hero", "content": {"image": SUPPORT + "hero.webp"}}]
        self.assertEqual(len(shell_boot.hero_preloads(design(), packaged, None, DAY)), 2)
        unsafe = design()
        unsafe["assets"]["hero.primary"]["mobileSrc"] = "javascript:alert(1)"
        unsafe["assets"]["hero.primary"].pop("darkSrc")
        self.assertEqual(shell_boot.hero_preloads(unsafe, sections, None, DAY), [])

    def test_shell_tags_fail_safe(self):
        request = SimpleNamespace(method="GET", path="/bloom-studio", args={})
        with mock.patch.object(frappe.local, "request", request, create=True), \
                mock.patch.object(shell_boot, "boot_parts", side_effect=RuntimeError("broken")), \
                mock.patch.object(frappe, "log_error") as log_error:
            self.assertEqual(shell_boot.shell_boot_tags(), "")
        log_error.assert_called_once()
        with mock.patch.object(frappe.local, "request", SimpleNamespace(method="POST", path="/bloom-studio", args={}), create=True):
            self.assertEqual(shell_boot.shell_boot_tags(), "")

    def test_shell_tags_wrap_the_block_for_the_page(self):
        request = SimpleNamespace(method="GET", path="/bloom-studio", args={})
        with mock.patch.object(frappe.local, "request", request, create=True), \
                mock.patch.object(api, "get_public_experience_snapshot", return_value=snapshot()), \
                mock.patch.object(api, "get_public_ui_config", return_value={"compiledDesign": design()}):
            html = str(shell_boot.shell_boot_tags())
        self.assertTrue(html.startswith(shell_boot.BLOCK_START) and html.endswith(shell_boot.BLOCK_END))
        self.assertEqual(len(re.findall(r'<script type="application/json" id="pe-boot">', html)), 1)
        self.assertNotIn("</script><script>", html)

    def test_website_addresses_use_the_lean_entry_when_built(self):
        with mock.patch("os.path.exists", return_value=True):
            self.assertEqual(shell_boot.shell_template("/bloom-studio"), shell_boot.SITE_SHELL)
            self.assertEqual(shell_boot.shell_template("/bloom-studio/book"), shell_boot.SITE_SHELL)
            self.assertIsNone(shell_boot.shell_template("/schedule/org/bloom-studio"))
            self.assertIsNone(shell_boot.shell_template("/settings/website"))
        with mock.patch("os.path.exists", return_value=False):
            self.assertIsNone(shell_boot.shell_template("/bloom-studio"))
