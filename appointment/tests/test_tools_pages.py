"""Every free tool page, in English and Amharic, is a crawlable, translated, server-rendered page.

The HTTP checks read the running site, like `test_time_converter_page`. Nothing here writes to the
database; the switched-off case patches the Growth Settings flag in process.
"""

from __future__ import annotations

import html
import json
import re
import unittest
from unittest.mock import patch

import frappe
import requests
from urllib.parse import urlparse

from appointment.growth.tools import catalog, page, registry
from appointment.public_experience.reserved import is_reserved_slug


def _base_url() -> str:
    return (frappe.conf.get("host_name") or "http://127.0.0.1:47801").rstrip("/")


def _host_header() -> str:
    if frappe.conf.get("host_name"):
        return frappe.conf.host_name.split("://", 1)[-1].rstrip("/")
    return frappe.local.site


def _get(path: str) -> requests.Response:
    return requests.get(_base_url() + path, headers={"Host": _host_header()}, timeout=60)


def _meta(document: str, attr: str, name: str) -> str | None:
    match = re.search(rf'<meta {attr}="{re.escape(name)}" content="([^"]*)"', document)
    return html.unescape(match.group(1)) if match else None


def _link(document: str, rel: str, hreflang: str | None = None) -> str | None:
    lang = f' hreflang="{hreflang}"' if hreflang else ""
    match = re.search(rf'<link rel="{rel}"{lang} href="([^"]*)"', document)
    return html.unescape(match.group(1)) if match else None


def _json_ld(document: str) -> list[dict]:
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', document, re.S)
    return [json.loads(block) for block in blocks]


def _visible_faq(document: str) -> list[tuple[str, str]]:
    section = re.search(r'data-qa="tool-faq">(.*?)</section>', document, re.S)
    if not section:
        return []
    pairs = re.findall(r"<summary><h3>(.*?)</h3></summary>\s*<p>(.*?)</p>", section.group(1), re.S)
    return [(html.unescape(q), html.unescape(a)) for q, a in pairs]


PAGES = [(tool, lang) for tool in (registry.INDEX, *registry.TOOLS) for lang in registry.LANGS]


class TestToolsPages(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.responses = {(tool.slug, lang): _get(tool.path(lang)) for tool, lang in PAGES}

    def test_every_page_is_seo_ready_in_both_languages(self):
        for tool, lang in PAGES:
            with self.subTest(page=tool.path(lang)):
                response = self.responses[(tool.slug, lang)]
                self.assertEqual(response.status_code, 200)
                document = response.text
                title = html.unescape(re.search(r"<title>(.*?)</title>", document, re.S).group(1))
                description = _meta(document, "name", "description")
                self.assertLessEqual(len(title), 60, title)
                self.assertTrue(description)
                self.assertLessEqual(len(description), 155, description)
                self.assertEqual(description, catalog.text(f"{tool.group}.description", lang))
                self.assertEqual(len(re.findall(r"<h1[\s>]", document)), 1)
                self.assertIn(f"<h1>{html.escape(catalog.text(tool.group + '.h1', lang), quote=False)}</h1>", document)
                self.assertIn(f'<html lang="{lang}"', document)
                self.assertEqual(_link(document, "canonical"), frappe.utils.get_url(tool.path(lang)))
                self.assertEqual(_link(document, "alternate", "en"), frappe.utils.get_url(tool.path("en")))
                self.assertEqual(_link(document, "alternate", "am"), frappe.utils.get_url(tool.path("am")))
                self.assertEqual(_link(document, "alternate", "x-default"), frappe.utils.get_url(tool.path("en")))
                self.assertIn(f'href="{frappe.utils.get_url(tool.path("am" if lang == "en" else "en"))}"', document)
                self.assertEqual(_meta(document, "name", "twitter:card"), "summary_large_image")
                self.assertEqual(_meta(document, "name", "robots"), "index, follow")
                self.assertNotIn("/assets/appointment/frontend/", document, "the React bundle must not load here")

    def test_amharic_pages_are_translated(self):
        for tool in (registry.INDEX, *registry.TOOLS):
            with self.subTest(tool=tool.slug or "index"):
                english = catalog.text(f"{tool.group}.h1", "en")
                amharic = catalog.text(f"{tool.group}.h1", "am")
                self.assertNotEqual(english, amharic)
                self.assertRegex(amharic, r"[ሀ-፿]")
                self.assertIn(amharic, html.unescape(self.responses[(tool.slug, "am")].text))

    def test_share_image_is_a_reachable_png(self):
        for tool, lang in PAGES:
            with self.subTest(page=tool.path(lang)):
                image = _meta(self.responses[(tool.slug, lang)].text, "property", "og:image")
                self.assertTrue(image and image.startswith("http"), image)
                self.assertIn("/files/tool-og/", image)
                response = _get(urlparse(image).path)
                self.assertEqual(response.status_code, 200, image)
                self.assertEqual(response.content[:8], b"\x89PNG\r\n\x1a\n")

    def test_faq_json_ld_matches_the_visible_faq(self):
        for tool, lang in PAGES:
            if not tool.faq_count:
                continue
            with self.subTest(page=tool.path(lang)):
                document = self.responses[(tool.slug, lang)].text
                faq = [block for block in _json_ld(document) if block.get("@type") == "FAQPage"]
                self.assertEqual(len(faq), 1)
                structured = [(q["name"], q["acceptedAnswer"]["text"]) for q in faq[0]["mainEntity"]]
                self.assertEqual(structured, _visible_faq(document))
                self.assertEqual(len(structured), tool.faq_count)
                apps = [block for block in _json_ld(document) if block.get("@type") == "WebApplication"]
                self.assertEqual(apps[0]["inLanguage"], lang)

    def test_one_call_to_action_to_sign_up_with_the_tool_source(self):
        for tool, lang in PAGES:
            with self.subTest(page=tool.path(lang)):
                document = self.responses[(tool.slug, lang)].text
                self.assertEqual(document.count('data-qa="tool-cta"'), 1)
                href = re.search(r'<a class="cta" href="([^"]*)" data-qa="tool-cta"', document).group(1)
                self.assertTrue(html.unescape(href).endswith(f"?source={tool.source}"), href)

    def test_tool_pages_link_to_the_index_and_other_tools(self):
        for tool, lang in PAGES:
            document = self.responses[(tool.slug, lang)].text
            index = registry.INDEX.path(lang)
            self.assertIn(f'href="{index}"', document)
            for other in registry.TOOLS:
                self.assertIn(f'href="{other.path(lang)}"', document)

    def test_sitemap_lists_every_page_with_alternates_and_robots_points_to_it(self):
        sitemap = _get("/sitemap.xml")
        self.assertEqual(sitemap.status_code, 200)
        for tool, lang in PAGES:
            self.assertIn(f"<loc>{frappe.utils.get_url(tool.path(lang))}</loc>", sitemap.text)
        self.assertIn('hreflang="am"', sitemap.text)
        robots = _get("/robots.txt")
        self.assertEqual(robots.status_code, 200)
        self.assertIn(f"Sitemap: {frappe.utils.get_url('/sitemap.xml')}", robots.text)

    def test_server_rendered_tool_content(self):
        calendar = html.unescape(self.responses[("ethiopian-calendar-converter", "en")].text)
        from appointment.growth import ethiopian_calendar as ec

        today = ec.to_ethiopian(ec.today_in_addis())
        self.assertIn(ec.format_date(today, "en"), calendar)
        self.assertEqual(calendar.count('data-qa="month-row"'), 13)
        sign = html.unescape(self.responses[("business-hours-sign", "am")].text)
        self.assertIn("8:30 AM – 5:30 PM", sign)
        self.assertIn("ጠዋት 2:30 – ከሰዓት 11:30", sign)
        self.assertIn("@media print", open(frappe.get_app_path("appointment", "public", "css", "tools.css")).read())
        reminder = self.responses[("amharic-appointment-reminder", "am")].text
        self.assertIn("ምሽት", reminder)
        self.assertNotIn(">ማታ<", reminder)


class TestToolsSwitch(unittest.TestCase):
    def test_switched_off_tools_are_not_found_and_leave_the_sitemap(self):
        with patch.object(registry, "tools_enabled", return_value=False):
            with self.assertRaises(frappe.PageDoesNotExistError):
                page.build(frappe._dict(), "ethiopian-time-converter", "en")
            self.assertEqual(registry.sitemap_links(), [])
        with patch.object(registry, "tools_enabled", return_value=True):
            links = registry.sitemap_links()
        self.assertEqual(len(links), 2 * (len(registry.TOOLS) + 1))

    def test_no_hard_coded_brand_in_tool_sources(self):
        import glob
        import os

        root = frappe.get_app_path("appointment")
        sources = glob.glob(os.path.join(root, "www", "tools", "*")) + glob.glob(os.path.join(root, "templates", "tools", "*"))
        sources += glob.glob(os.path.join(root, "growth", "tools", "*.py")) + glob.glob(os.path.join(root, "public", "js", "tools", "*.js"))
        for path in sources:
            if os.path.isfile(path):
                with open(path, encoding="utf-8") as handle:
                    self.assertNotIn("meet.et", handle.read().lower(), path)

    def test_am_is_reserved_and_no_business_uses_it(self):
        self.assertTrue(is_reserved_slug("am"))
        self.assertFalse(frappe.db.exists("Public Site", {"slug": "am"}))

    def test_seo_title_drops_a_long_product_name(self):
        self.assertEqual(page._seo_title("Short tool", "Brand"), "Short tool | Brand")
        self.assertEqual(page._seo_title("A" * 55, "Long brand name"), "A" * 55)
