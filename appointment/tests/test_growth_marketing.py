"""Marketing workstream: the landing promise facts, the partners page and its no-JavaScript form.

The SEO checks read the served pages over HTTP (GET only). The form checks run the page code
in-process with a fake POST request, inside a savepoint, with `frappe.db.commit` patched, so
nothing reaches the shared database. See docs/growth/MARKETING.md.
"""

from __future__ import annotations

import html
import json
import re
import unittest
from unittest import mock

import frappe
import requests
from werkzeug.test import EnvironBuilder
from werkzeug.wrappers import Request

from appointment.growth import marketing, partner_page
from appointment.public_experience.reserved import is_reserved_slug

ROUTES = {"en": "/partners", "am": "/am/partners"}
PARTNER_DOMAIN = "abaa-partners.et"


def _base_url() -> str:
    return (frappe.conf.get("host_name") or "http://127.0.0.1:47801").rstrip("/")


def _host_header() -> str:
    if frappe.conf.get("host_name"):
        return frappe.conf.host_name.split("://", 1)[-1].rstrip("/")
    return frappe.local.site


def _get(path: str) -> requests.Response:
    return requests.get(_base_url() + path, headers={"Host": _host_header()}, timeout=30)


class PagePost:
    """A guest POST to a page path from a unique address; rate-limit counters start at zero."""

    def __init__(self, path: str, data: dict, ip: str | None = None, keep_counters: bool = False):
        self.path, self.data, self.keep_counters = path, data, keep_counters
        self.ip = ip or "198.51.100." + str(int(frappe.generate_hash(length=4), 16) % 250 + 1)

    def __enter__(self):
        self.user = frappe.session.user
        self.previous = (getattr(frappe.local, "request", None), getattr(frappe.local, "request_ip", None),
                         frappe.local.form_dict, frappe.local.lang)
        frappe.local.request = Request(EnvironBuilder(method="POST", path=self.path).get_environ())
        frappe.local.request_ip = self.ip
        frappe.local.form_dict = frappe._dict(self.data)
        frappe.set_user("Guest")
        return self

    def __exit__(self, *exc):
        if not self.keep_counters:
            clear_counters(self.ip)
        frappe.local.request, frappe.local.request_ip, frappe.local.form_dict, frappe.local.lang = self.previous
        frappe.set_user(self.user)
        return False


def clear_counters(ip: str):
    for key in frappe.cache.get_keys(f"rl:*{ip}*"):
        frappe.cache.delete(key)


def _application(**overrides) -> dict:
    data = dict(name="Tigist Worku", organization="Addis Beauty Association",
                email=f"tigist.{frappe.generate_hash(length=6)}@{PARTNER_DOMAIN}", phone="0911234567",
                kind="association", message="Our association has 120 salon members in Bole.")
    data.update(overrides)
    return data


class TestPartnersPageSeo(unittest.TestCase):
    """The page as crawlers and visitors without JavaScript get it."""

    @classmethod
    def setUpClass(cls):
        if not partner_page.enabled():
            raise unittest.SkipTest("The partner program is switched off in Growth Settings.")
        cls.pages = {}
        for lang, route in ROUTES.items():
            response = _get(route)
            cls.pages[lang] = (response, response.text, html.unescape(response.text))

    def test_pages_are_server_rendered(self):
        for lang, (response, raw, text) in self.pages.items():
            with self.subTest(lang=lang):
                self.assertEqual(response.status_code, 200)
                self.assertIn("text/html", response.headers.get("Content-Type", ""))
                self.assertIn(f'<html lang="{lang}"', raw)
                self.assertEqual(len(re.findall(r"<h1[\s>]", raw)), 1)
                self.assertNotIn("/assets/appointment/frontend/", raw, "the React bundle must not load here")
                # Visible without JavaScript: the form, the kit and the FAQ are in the HTML.
                for qa in ("partners-form", "partners-kit", "partners-faq", "partners-steps", "partners-benefits"):
                    self.assertIn(f'data-qa="{qa}"', raw)
                self.assertIn('method="post"', raw)

    def test_seo_metadata(self):
        for lang, (response, raw, text) in self.pages.items():
            with self.subTest(lang=lang):
                title = re.search(r"<title>(.*?)</title>", text).group(1)
                description = re.search(r'<meta name="description" content="(.*?)">', text).group(1)
                self.assertLessEqual(len(title), 60)
                self.assertLessEqual(len(description), 155)
                canonical = frappe.utils.get_url(ROUTES[lang])
                self.assertIn(f'<link rel="canonical" href="{canonical}">', raw)
                for code, route in ROUTES.items():
                    self.assertIn(f'hreflang="{code}" href="{frappe.utils.get_url(route)}"', raw)
                self.assertIn('hreflang="x-default"', raw)
                self.assertIn('<meta name="robots" content="index, follow">', raw)
                self.assertIn('property="og:title"', raw)
                self.assertNotIn("noindex", raw.lower())

    def test_faq_json_ld_matches_the_visible_faq(self):
        for lang, (response, raw, text) in self.pages.items():
            with self.subTest(lang=lang):
                block = re.search(r'<script type="application/ld\+json">(.*?)</script>', raw, re.S).group(1)
                data = json.loads(block)
                self.assertEqual(data["@type"], "FAQPage")
                self.assertEqual(len(data["mainEntity"]), partner_page.FAQ_COUNT)
                for entry in data["mainEntity"]:
                    self.assertIn(entry["name"], text)

    def test_amharic_page_is_in_amharic(self):
        raw = self.pages["am"][1]
        h1 = re.search(r"<h1>(.*?)</h1>", html.unescape(raw), re.S).group(1)
        self.assertRegex(h1, r"[ሀ-፿]", "the Amharic H1 comes from the Translation records")
        self.assertNotEqual(h1, re.search(r"<h1>(.*?)</h1>", self.pages["en"][2], re.S).group(1))

    def test_reward_number_comes_from_growth_settings(self):
        from appointment.growth.settings import growth

        reward = growth()["partner_reward_free_bookings"]
        self.assertIn(f"<strong>{reward}</strong>", self.pages["en"][1])

    def test_sitemap_lists_both_languages_with_alternates(self):
        sitemap = _get("/sitemap.xml")
        self.assertEqual(sitemap.status_code, 200)
        for route in ROUTES.values():
            self.assertIn(f"<loc>{frappe.utils.get_url(route)}</loc>", sitemap.text)
        self.assertIn(f'hreflang="am" href="{frappe.utils.get_url(ROUTES["am"])}"', sitemap.text)

    def test_partners_is_a_reserved_slug(self):
        self.assertTrue(is_reserved_slug("partners"))


class PartnerFormCase(unittest.TestCase):
    def setUp(self):
        frappe.set_user("Administrator")
        commit = mock.patch("frappe.db.commit")
        commit.start()
        self.addCleanup(commit.stop)
        frappe.db.savepoint("growth_marketing")
        settings = dict(frappe.get_attr("appointment.growth.settings.growth")(), partner_program_enabled=True)
        for target in ("appointment.growth.settings.growth", "appointment.growth.partners.growth"):
            patcher = mock.patch(target, return_value=settings)
            patcher.start()
            self.addCleanup(patcher.stop)

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="growth_marketing")

    def post(self, data: dict, lang: str = "en") -> tuple[dict, str]:
        with PagePost(ROUTES[lang], data):
            context = partner_page.build(frappe._dict())
            page = frappe.render_template("appointment/www/partners.html", context)
        return context["form"], page

    def partners(self, email: str) -> int:
        return frappe.db.count("Growth Partner", {"email": email})


class TestPartnerFormWithoutJavaScript(PartnerFormCase):
    def test_post_creates_an_application_through_the_api(self):
        data = _application()
        form, page = self.post(data)
        self.assertEqual(form["state"], "sent")
        self.assertEqual(self.partners(data["email"]), 1)
        row = frappe.db.get_value("Growth Partner", {"email": data["email"]}, ["status", "kind", "partner_name"], as_dict=True)
        self.assertEqual((row.status, row.kind, row.partner_name), ("Pending", "association", "Tigist Worku"))
        self.assertIn('data-qa="partners-success"', page)
        self.assertNotIn('data-qa="partners-success" hidden', page)
        self.assertRegex(page, r'<form[^>]*data-qa="partners-form"[^>]*hidden')

    def test_validation_errors_render_next_to_the_fields(self):
        data = _application(name="", email="not-an-email", kind="club")
        form, page = self.post(data)
        self.assertEqual(form["state"], "invalid")
        self.assertEqual(set(form["errors"]), {"name", "email", "kind"})
        for field in ("name", "email", "kind"):
            self.assertRegex(page, rf'data-error-for="{field}"\s*>[^<]+<')
        self.assertIn('aria-invalid="true"', page)
        self.assertIn('value="Addis Beauty Association"', page, "valid answers are kept")
        self.assertEqual(self.partners("not-an-email"), 0)

    def test_echoed_answers_are_escaped(self):
        script = '"><script>alert(1)</script>'
        data = _application(email="not-an-email", organization=script, message=script)
        form, page = self.post(data)
        self.assertEqual(form["state"], "invalid")
        self.assertNotIn("<script>alert(1)</script>", page)
        self.assertIn("&lt;script&gt;", page)

    def test_api_errors_render_as_a_form_message(self):
        data = _application(phone="12")
        form, page = self.post(data)
        self.assertEqual(form["state"], "failed")
        self.assertTrue(form["message"])
        self.assertIn(html.escape(form["message"]), page)
        self.assertEqual(self.partners(data["email"]), 0)

    def test_filled_trap_field_stores_nothing(self):
        data = _application(website="http://spam.example")
        form, _ = self.post(data)
        self.assertEqual(form["state"], "sent")
        self.assertEqual(self.partners(data["email"]), 0)

    def test_rate_limit_is_shared_with_the_api(self):
        address = "198.51.100.251"
        clear_counters(address)
        self.addCleanup(clear_counters, address)
        states = []
        for _ in range(7):
            with PagePost(ROUTES["en"], _application(), ip=address, keep_counters=True):
                states.append(partner_page.form_state(partner_page.Copy("en"))["state"])
        self.assertEqual(states[:5], ["sent"] * 5)
        self.assertEqual(states[5:], ["failed", "failed"])

    def test_amharic_page_posts_in_amharic(self):
        form, page = self.post(_application(name=""), lang="am")
        self.assertEqual(form["state"], "invalid")
        self.assertIn('<html lang="am"', page)

    def test_guest_form_needs_no_csrf_token(self):
        with PagePost(ROUTES["en"], {}):
            frappe.local.request = Request(EnvironBuilder(method="GET", path=ROUTES["en"]).get_environ())
            self.assertEqual(partner_page.build(frappe._dict())["csrf_token"], "", "guests have no token and need none")


class TestPartnerPageContent(PartnerFormCase):
    def context(self, lang="en"):
        with PagePost(ROUTES[lang], {}):
            frappe.local.request = Request(EnvironBuilder(method="GET", path=ROUTES[lang]).get_environ())
            return partner_page.build(frappe._dict())

    def test_telegram_kit_has_both_languages_and_placeholders(self):
        kit = self.context()["kit"]
        self.assertEqual({post["lang"] for post in kit}, {"en", "am"})
        self.assertEqual(len(kit), 4)
        tools = [post for post in kit if post["id"].startswith("tools-")]
        for post in tools:
            prefix = "/am/tools/" if post["lang"] == "am" else "/tools/"
            self.assertIn(prefix + "ethiopian-time-converter?source=partner_PARTNERCODE", post["text"])
        signup = next(post for post in kit if post["id"] == "signup-en")
        self.assertIn("/signup?ref=PARTNERCODE&source=partner", signup["text"])

    def test_page_is_gone_when_the_program_is_off(self):
        with mock.patch.object(partner_page, "enabled", return_value=False):
            with self.assertRaises(frappe.PageDoesNotExistError):
                self.context()
            self.assertEqual(partner_page.sitemap_links(), [])

    def test_apply_method_is_the_guest_api(self):
        method = frappe.get_attr(partner_page.apply_method())
        self.assertIn(method, frappe.whitelisted)
        self.assertIn(method, frappe.guest_methods)


class TestLandingOffer(unittest.TestCase):
    """The landing page says only what Payment Settings and Growth Settings make true."""

    def offer(self, **payment):
        settings = frappe._dict(platform_fee_type="None", platform_fee_value=0, free_bookings=0)
        settings.update(payment)
        with mock.patch("frappe.get_cached_doc", return_value=settings), \
                mock.patch.object(marketing, "growth", return_value={"marketing_live_minutes": 7}), \
                mock.patch.object(marketing, "_signup_open", return_value=True):
            return marketing.offer()

    def test_no_fee_configured(self):
        result = self.offer()
        self.assertEqual((result["free"], result["free_bookings"], result["live_minutes"]), ("no_fee", 0, 7))

    def test_fee_with_free_allowance(self):
        result = self.offer(platform_fee_type="Percent", platform_fee_value=5, free_bookings=30)
        self.assertEqual((result["free"], result["free_bookings"]), ("free_allowance", 30))

    def test_fee_without_allowance(self):
        result = self.offer(platform_fee_type="Fixed", platform_fee_value=10)
        self.assertEqual((result["free"], result["free_bookings"]), ("free_setup", 0))

    def test_zero_fee_value_counts_as_no_fee(self):
        self.assertEqual(self.offer(platform_fee_type="Fixed", platform_fee_value=0, free_bookings=5)["free"], "no_fee")

    def test_public_offer_is_a_guest_endpoint(self):
        self.assertIn(marketing.public_offer, frappe.guest_methods)
