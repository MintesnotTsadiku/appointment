"""The free Ethiopian time converter is a crawlable, server-rendered page."""

from __future__ import annotations

import html
import re
import unittest

import frappe
import requests

from appointment.growth import habesha
from appointment.growth.brand import brand
from appointment.growth.tools.catalog import text
from appointment.public_experience.reserved import is_reserved_slug, slug_error
from appointment.www.tools import ethiopian_time_converter as page

ROUTE = "/tools/ethiopian-time-converter"
AM_ROUTE = "/am/tools/ethiopian-time-converter"
GROUP = "tools.timeConverter"


def t(key: str, lang: str = "en") -> str:
    return text(f"{GROUP}.{key}", lang)


FAQ = [(t(f"faq{i}q"), t(f"faq{i}a")) for i in range(1, 7)]


def _base_url() -> str:
    return (frappe.conf.get("host_name") or "http://127.0.0.1:47801").rstrip("/")


def _get(path: str) -> requests.Response:
    return requests.get(_base_url() + path, headers={"Host": _host_header()}, timeout=30)


def _host_header() -> str:
    # Through the Vite proxy the Host must stay the public one; direct to Frappe it names the site.
    if frappe.conf.get("host_name"):
        return frappe.conf.host_name.split("://", 1)[-1].rstrip("/")
    return frappe.local.site


class TestTimeConverterPage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.response = _get(ROUTE)
        cls.html = cls.response.text
        cls.text = html.unescape(cls.html)

    def test_page_is_server_rendered_html(self):
        self.assertEqual(self.response.status_code, 200)
        self.assertIn("text/html", self.response.headers.get("Content-Type", ""))
        title = re.search(r"<title>(.*?)</title>", self.text).group(1)
        self.assertTrue(title.startswith(t("title")))
        self.assertIn("Ethiopian Time Converter", title)
        self.assertLessEqual(len(title), 60)
        self.assertLessEqual(len(t("description")), 155)
        self.assertEqual(len(re.findall(r"<h1[\s>]", self.html)), 1)
        self.assertIn(f"<h1>{t('h1')}</h1>", self.text)
        self.assertNotIn("/assets/appointment/frontend/", self.html, "the React bundle must not load here")

    def test_reference_table_has_every_hour(self):
        self.assertEqual(self.html.count('data-qa="reference-row"'), 24)
        self.assertRegex(self.text, r"8:00 AM</th>\s*<td[^>]*>08:00</td>\s*<td>2:00</td>\s*<td>ጠዋት \(morning\) · ቀን</td>")
        self.assertRegex(self.text, r"12:00 AM</th>\s*<td[^>]*>00:00</td>\s*<td>6:00</td>\s*<td>ሌሊት \(night\)</td>")
        self.assertRegex(self.text, r"8:00 PM</th>\s*<td[^>]*>20:00</td>\s*<td>2:00</td>\s*<td>ምሽት \(evening\) · ሌሊት</td>")
        self.assertNotIn("ማታ", self.text, "the evening word is ምሽት, as in the staff app")

    def test_faq_text_and_json_ld_match(self):
        for question, answer in FAQ:
            self.assertIn(question, self.text)
            self.assertIn(answer, self.text)
        self.assertIn('"@type": "FAQPage"', self.html)
        self.assertEqual(self.html.count('"@type": "Question"'), len(FAQ))

    def test_seo_metadata(self):
        canonical = frappe.utils.get_url(ROUTE)
        self.assertIn(f'<link rel="canonical" href="{canonical}">', self.html)
        self.assertTrue(canonical.startswith("http"))
        self.assertIn(f'<meta name="description" content="{t("description")}">', self.text)
        self.assertIn('<meta name="twitter:card" content="summary_large_image">', self.html)
        self.assertIn('property="og:image"', self.html)
        self.assertIn(f'<link rel="alternate" hreflang="am" href="{frappe.utils.get_url(AM_ROUTE)}">', self.html)
        self.assertIn('property="og:title"', self.html)
        self.assertIn('property="og:description"', self.html)
        self.assertNotIn("noindex", self.html.lower())
        self.assertNotIn("noindex", self.response.headers.get("X-Robots-Tag", "").lower())

    def test_single_call_to_action(self):
        self.assertEqual(self.html.count('data-qa="tool-cta"'), 1)
        self.assertIn(t("cta").format(brand()["product_name"]), self.text)
        self.assertIn("?source=tool_ethiopian-time-converter", self.html)

    def test_sitemap_lists_page_and_robots_allows_it(self):
        sitemap = _get("/sitemap.xml")
        self.assertEqual(sitemap.status_code, 200)
        self.assertIn("xml", sitemap.headers.get("Content-Type", ""))
        self.assertIn(f"<loc>{frappe.utils.get_url(ROUTE)}</loc>", sitemap.text)
        self.assertIn(f"<loc>{frappe.utils.get_url(AM_ROUTE)}</loc>", sitemap.text)
        robots = _get("/robots.txt")
        self.assertEqual(robots.status_code, 200)
        self.assertIn("text/plain", robots.headers.get("Content-Type", ""))
        for line in robots.text.splitlines():
            rule = line.split("#", 1)[0].strip().lower()
            if rule.startswith("disallow:"):
                blocked = rule.split(":", 1)[1].strip()
                self.assertFalse(blocked and ROUTE.startswith(blocked), line)

    def test_tools_is_a_reserved_slug(self):
        self.assertTrue(is_reserved_slug("tools"))
        self.assertIsNotNone(slug_error("tools"))

    def test_server_table_follows_the_habesha_rule(self):
        cases = {6: (12, "morning"), 13: (7, "afternoon"), 18: (12, "evening"), 0: (6, "night")}
        for hour, (habesha_hour, period) in cases.items():
            self.assertEqual(habesha.to_habesha(hour), (habesha_hour, 0, period))
        self.assertEqual(habesha.PERIODS["evening"]["am"], "ምሽት")
        rows = page.reference_rows("en")
        self.assertEqual(rows[13]["text"], "7:00")
        self.assertEqual(rows[18]["label"], "ምሽት (evening) · ሌሊት")
        self.assertEqual(page.reference_rows("am")[18]["label"], "ምሽት · ሌሊት")


class TestTimeConverterAmharicPage(unittest.TestCase):
    def test_amharic_page_is_translated(self):
        response = _get(AM_ROUTE)
        self.assertEqual(response.status_code, 200)
        document = html.unescape(response.text)
        self.assertIn('<html lang="am"', document)
        self.assertIn(f"<h1>{t('h1', 'am')}</h1>", document)
        self.assertIn(t("faq1q", "am"), document)
        self.assertIn(f'<link rel="canonical" href="{frappe.utils.get_url(AM_ROUTE)}">', document)
        self.assertIn('hreflang="x-default"', document)
