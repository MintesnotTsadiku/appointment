"""The free Ethiopian time converter is a crawlable, server-rendered page."""

from __future__ import annotations

import html
import re
import unittest

import frappe
import requests

from appointment.public_experience.reserved import is_reserved_slug, slug_error
from appointment.www.tools import ethiopian_time_converter as page

ROUTE = "/tools/ethiopian-time-converter"


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
        self.assertIn(f"<title>{page.TITLE}</title>", self.text)
        self.assertIn("Ethiopian Time Converter", page.TITLE)
        self.assertLessEqual(len(page.TITLE), 60)
        self.assertLessEqual(len(page.DESCRIPTION), 155)
        self.assertEqual(len(re.findall(r"<h1[\s>]", self.html)), 1)
        self.assertIn(f"<h1>{page.H1}</h1>", self.text)
        self.assertNotIn("/assets/appointment/frontend/", self.html, "the React bundle must not load here")

    def test_reference_table_has_every_hour(self):
        self.assertEqual(self.html.count('data-qa="reference-row"'), 24)
        self.assertRegex(self.text, r"8:00 AM</th>\s*<td[^>]*>08:00</td>\s*<td>2:00</td>\s*<td>ጠዋት \(morning\) · ቀን</td>")
        self.assertRegex(self.text, r"12:00 AM</th>\s*<td[^>]*>00:00</td>\s*<td>6:00</td>\s*<td>ሌሊት \(night\) · ሌሊት</td>")

    def test_faq_text_and_json_ld_match(self):
        for question, answer in page.FAQ:
            self.assertIn(question, self.text)
            self.assertIn(answer, self.text)
        self.assertIn('"@type": "FAQPage"', self.html)
        self.assertEqual(self.html.count('"@type": "Question"'), len(page.FAQ))

    def test_seo_metadata(self):
        canonical = frappe.utils.get_url(ROUTE)
        self.assertIn(f'<link rel="canonical" href="{canonical}">', self.html)
        self.assertTrue(canonical.startswith("http"))
        self.assertIn(f'<meta name="description" content="{page.DESCRIPTION}">', self.text)
        self.assertIn('property="og:title"', self.html)
        self.assertIn('property="og:description"', self.html)
        self.assertNotIn("noindex", self.html.lower())
        self.assertNotIn("noindex", self.response.headers.get("X-Robots-Tag", "").lower())

    def test_single_call_to_action(self):
        self.assertEqual(self.html.count('data-qa="tool-cta"'), 1)
        self.assertIn("Take bookings in Habesha time with Meet.et", self.text)

    def test_sitemap_lists_page_and_robots_allows_it(self):
        sitemap = _get("/sitemap.xml")
        self.assertEqual(sitemap.status_code, 200)
        self.assertIn("xml", sitemap.headers.get("Content-Type", ""))
        self.assertIn(f"<loc>{frappe.utils.get_url(ROUTE)}</loc>", sitemap.text)
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
        cases = {6: ("12:00", "ቀን", "ጠዋት"), 13: ("7:00", "ቀን", "ከሰዓት"), 18: ("12:00", "ሌሊት", "ማታ"), 0: ("6:00", "ሌሊት", "ሌሊት")}
        for hour, (text, half, period) in cases.items():
            result = page.to_habesha(hour)
            self.assertEqual((result["text"], result["half_am"], result["period_am"]), (text, half, period))
        self.assertEqual(page.to_habesha(13, 30)["text"], "7:30")
