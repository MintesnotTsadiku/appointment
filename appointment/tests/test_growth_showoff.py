"""Show-off growth features: the template footer credit flag, the owner's year in review
(numbers, Ethiopian year periods, the share image) and the public business directory.

Each test creates its own businesses and rolls back to a savepoint. Growth Settings are
patched in memory, so the shared settings cache never changes. Nothing commits.
See docs/growth/SHOWOFF.md.
"""

import contextlib
import json
import unittest
from datetime import date, timedelta
from unittest import mock

import frappe
from frappe.utils import get_url

from appointment.growth import api as growth_api
from appointment.growth import directory, year_review
from appointment.public_experience import solo_setup
from appointment.scheduler import independent, workspace
from appointment.www import directory as directory_page

DAYS = list(independent.DAYS)
SETTINGS = dict(directory_enabled=True, year_review_enabled=True, template_credit_enabled=True)


class ShowoffCase(unittest.TestCase):
    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("growth_showoff")
        self._syncing = frappe.flags.syncing_booking_urls
        frappe.flags.syncing_booking_urls = True  # booking URL sync would commit otherwise
        self.settings = dict(SETTINGS)
        stack = contextlib.ExitStack()
        stack.enter_context(mock.patch("frappe.db.commit"))
        for target in ("appointment.growth.directory.growth", "appointment.growth.year_review.growth"):
            stack.enter_context(mock.patch(target, side_effect=lambda: self.settings))
        self.addCleanup(stack.close)
        directory.ensure_defaults()

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.local.form_dict = frappe._dict()
        frappe.db.rollback(save_point="growth_showoff")
        frappe.flags.syncing_booking_urls = self._syncing

    # Businesses -----------------------------------------------------------------
    def _user(self, first, last):
        email = f"{first.lower()}.{last.lower()}.{frappe.generate_hash(length=6)}@example.test"
        frappe.get_doc(dict(doctype="User", email=email, first_name=first, last_name=last, enabled=1, send_welcome_email=0,
                            user_type="Website User", roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
        return email

    def _org(self, name, area="Bole", publish=True):
        user = self._user("Hanna", "Tesfaye")
        frappe.set_user(user)
        row = workspace.create(name, f"{name} {area} room {frappe.generate_hash(length=4)}", "Silk press", "Africa/Addis_Ababa", 30,
                               "08:00", "18:00", DAYS, frappe.generate_hash(length=24))
        if publish:
            workspace.publish(row["organization"], 1)
        frappe.set_user("Administrator")
        event = frappe.db.get_value("EventType", row["offering"], ["service", "provider", "location"], as_dict=True)
        return frappe._dict(key=row["organization"], user=user, organization=row["organization"], **event)

    def _solo(self, name, area="Kazanchis"):
        user = self._user("Selam", "Bekele")
        frappe.set_user(user)
        provider = solo_setup.create(name)["provider"]
        row = independent.create(provider, f"{name} {area} studio {frappe.generate_hash(length=4)}", "Amharic lesson", "Africa/Addis_Ababa",
                                 60, "08:00", "18:00", DAYS)
        independent.publish(provider, 1)
        frappe.set_user("Administrator")
        event = frappe.db.get_value("EventType", row["offering"], ["service", "provider", "location"], as_dict=True)
        return frappe._dict(key="Provider:" + provider, user=user, organization=None, **event)

    def _appointment(self, business, day, hour, email, status="Confirmed", service=None, provider=None, language=None):
        """A past booking row with only the fields the review reads (fixture data, no booking flow)."""
        doc = frappe.get_doc(dict(
            doctype="Appointment", appointment_date=day, start_time=f"{hour:02d}:00:00", end_time=f"{hour:02d}:30:00",
            status=status, client_email=email, client_name=email.split("@")[0].title(), service=service or business.service,
            provider=provider or business.provider, location=business.location, organization=business.organization,
            customer_language=language, booking_source="staff",
        ))
        doc.name = frappe.generate_hash(length=12)
        doc.db_insert()
        return doc


class TestTemplateCredit(ShowoffCase):
    def test_public_brand_carries_the_platform_level_flag(self):
        for value in (True, False):
            with mock.patch("appointment.growth.api.growth", return_value={**dict.fromkeys(growth_api.PUBLIC_GROWTH, ""), "template_credit_enabled": value}):
                self.assertIs(growth_api.public_payload()["growth"]["template_credit_enabled"], value)


class TestYearReviewPeriods(unittest.TestCase):
    def test_ethiopian_year_runs_meskerem_to_pagume(self):
        self.assertEqual(year_review.ethiopian_year_bounds(2018), (date(2025, 9, 11), date(2026, 9, 10)))
        # 2015 E.C. is a leap year (Pagume 6), so 2016 E.C. starts on 12 September.
        self.assertEqual(year_review.ethiopian_year_bounds(2016), (date(2023, 9, 12), date(2024, 9, 10)))
        self.assertEqual(year_review.ethiopian_year_bounds(2015)[1], date(2023, 9, 11), "Pagume 6 ends a leap year.")

    def test_default_order_puts_the_most_recently_ended_period_first(self):
        october = year_review.periods(date(2026, 10, 12))
        self.assertEqual([row["key"] for row in october], ["ec-2018", "gc-2025", "ec-2019-so-far", "gc-2026-so-far"])
        self.assertEqual((october[2]["start"], october[2]["end"]), ("2026-09-11", "2026-10-12"))
        march = year_review.periods(date(2026, 3, 1))
        self.assertEqual([row["key"] for row in march][:2], ["gc-2025", "ec-2017"])
        # The day before Meskerem 1 still belongs to the old Ethiopian year.
        self.assertEqual(year_review.periods(date(2026, 9, 10))[2]["key"], "ec-2018-so-far")

    def test_labels_in_both_languages(self):
        period = year_review.periods(date(2026, 10, 12))[0]
        self.assertEqual(year_review.period_label(period, "am"), "2018 ዓ.ም.")
        self.assertIn("2018", year_review.period_label(period, "en"))
        running = year_review.periods(date(2026, 10, 12))[3]
        self.assertIn("2026", year_review.period_label(running, "en"))


class TestYearReviewNumbers(ShowoffCase):
    def _dataset(self, business):
        """22 booked visits in 2025 by 12 clients, plus cancellations and an older visit."""
        clients = [f"client{index}.{frappe.generate_hash(length=4)}@gmail.com" for index in range(12)]
        monday, saturday = date(2025, 3, 3), date(2025, 3, 1)
        for index in range(10):  # ten one-off visits, Mondays at 09:00, second service, second provider
            self._appointment(business, monday + timedelta(weeks=index), 9, clients[index], service="SRV-OTHER", provider="Other provider",
                              language="am" if index < 3 else "en")
        for index in range(12):  # two regulars, six visits each, Saturdays at 10:00
            self._appointment(business, saturday + timedelta(weeks=index), 10, clients[10 + index % 2], status="Completed", language="am")
        self._appointment(business, date(2025, 6, 2), 15, clients[3], status="Cancelled", language="am")
        self._appointment(business, date(2025, 6, 3), 15, clients[4], status="No Show", language="am")
        self._appointment(business, date(2024, 11, 4), 11, clients[0], status="Completed")
        return clients

    def test_organization_numbers(self):
        business = self._org("Lulit Hair Studio")
        self._dataset(business)
        frappe.set_user(business.user)
        result = year_review.summary(business.key, "gc-2025")
        stats = result["review"]["stats"]
        self.assertTrue(result["review"]["ready"])
        self.assertEqual((stats["bookings"], stats["clients"], stats["new_clients"]), (22, 12, 11))
        self.assertEqual(stats["returning_rate"], 25, "Two regulars plus one client seen before 2025, out of 12.")
        self.assertEqual(stats["busiest_day"], {"weekday": 5, "count": 12})
        self.assertEqual(stats["busiest_hour"], {"hour": 10, "count": 12})
        self.assertEqual(stats["top_service"]["count"], 12)
        self.assertEqual(stats["top_service"]["share"], 55)
        self.assertEqual(stats["top_provider"]["count"], 12)
        self.assertEqual(stats["amharic_share"], 68, "15 of 22 bookings with a language were in Amharic.")
        self.assertEqual(result["period"], "gc-2025")
        self.assertEqual(set(result["captions"]), {"en", "am"})

    def test_independent_provider_hides_thin_and_irrelevant_stats(self):
        business = self._solo("Kalkidan Lessons")
        for index in range(12):
            self._appointment(business, date(2025, 2, 3) + timedelta(days=index), 9 + index % 3, f"learner{index % 6}@gmail.com")
        frappe.set_user(business.user)
        stats = year_review.summary(business.key, "gc-2025")["review"]["stats"]
        self.assertEqual(stats, {"bookings": 12, "clients": 6}, "No history, few clients, one service and no team: only totals.")

    def test_thin_period_is_not_ready_and_the_image_is_refused(self):
        business = self._org("Mekdes Nails")
        for index in range(3):
            self._appointment(business, date(2025, 5, 5) + timedelta(days=index), 10, f"guest{index}@gmail.com")
        frappe.set_user(business.user)
        self.assertFalse(year_review.summary(business.key, "gc-2025")["review"]["ready"])
        with self.assertRaises(frappe.ValidationError):
            year_review.image(business.key, "gc-2025")

    def test_default_period_falls_back_to_the_fullest_year_so_far(self):
        business = self._org("Rahel Braids")
        today = year_review._business_today(frappe._dict(organization=business.key, timezone="Africa/Addis_Ababa"))
        for index in range(11):
            self._appointment(business, today - timedelta(days=index), 10, f"visitor{index}@gmail.com")
        frappe.set_user(business.user)
        result = year_review.summary(business.key)
        self.assertTrue(result["period"].endswith("-so-far"))
        self.assertTrue(result["review"]["ready"])

    def test_permissions_and_flag(self):
        business = self._org("Tigist Beauty")
        stranger = self._user("Abel", "Fikru")
        for user in ("Guest", stranger):
            frappe.set_user(user)
            with self.assertRaises(frappe.PermissionError):
                year_review.summary(business.key)
        frappe.set_user(business.user)
        self.settings["year_review_enabled"] = False
        self.assertFalse(year_review.summary(business.key)["enabled"])
        with self.assertRaises(frappe.PermissionError):
            year_review.image(business.key, "gc-2025")


class TestYearReviewImage(ShowoffCase):
    def test_renders_both_sizes_in_english_and_amharic(self):
        from PIL import Image

        from appointment.growth.tools.og_image import _font
        from appointment.growth.year_review_image import draw

        business = dict(name="Lulit Hair Studio", logo="", colors=dict(primary="#4a1f55", background="#f6f1f6", text="#2a1430"),
                        short="example.test/lulit", url="")
        review = dict(stats=dict(bookings=1284, clients=642, new_clients=410, returning_rate=36, busiest_day=dict(weekday=5, count=300),
                                 busiest_hour=dict(hour=10, count=200), top_service=dict(name="Silk press", count=400, share=31),
                                 top_provider=dict(name="Hanna Tesfaye", count=500), amharic_share=58))
        period = year_review.periods(date(2026, 10, 12))[0]
        platform = dict(product_name="Booking Platform", mark="")
        images = {}
        for lang in ("en", "am"):
            for size, expected in (("portrait", (1080, 1350)), ("story", (1080, 1920))):
                image = draw(business, platform, period, review, lang, size)
                self.assertIsInstance(image, Image.Image)
                self.assertEqual(image.size, expected)
                images[(lang, size)] = image.tobytes()
        self.assertNotEqual(images[("en", "portrait")], images[("am", "portrait")])
        self.assertIsNotNone(_font(True, 40, True).getmask("ደንበኞች").getbbox(), "The Ethiopic font draws Amharic glyphs.")


class TestDirectory(ShowoffCase):
    def _list(self, business, category="salon-barber", area="bole"):
        frappe.set_user(business.user)
        state = directory.save_owner_listing(business.key, 1, category, area)
        frappe.set_user("Administrator")
        return state

    def _page(self, lang="en", **route):
        frappe.local.form_dict = frappe._dict(route, **({"lang": "am"} if lang == "am" else {}))
        return directory_page.get_context(frappe._dict())

    def test_owner_listing_is_off_by_default_with_suggestions(self):
        business = self._org("Bethel Salon", area="Bole")
        frappe.set_user(business.user)
        state = directory.owner_listing(business.key)
        self.assertFalse(state["listed"])
        self.assertTrue(state["published"])
        self.assertEqual(state["area"], "bole", "The location name mentions Bole.")
        self.assertTrue(any(row["value"] == "salon-barber" for row in state["categories"]))
        # Labels follow the staff app's language, not the account language.
        labels = {lang: next(row["label"] for row in directory.owner_listing(business.key, lang)["categories"]
                             if row["value"] == "salon-barber") for lang in ("en", "am")}
        self.assertNotEqual(labels["en"], labels["am"])
        self.assertTrue(labels["en"].isascii())
        # Area options show the city in the page language too.
        cities = {lang: next(row["city"] for row in directory.owner_listing(business.key, lang)["areas"] if row["value"] == "bole")
                  for lang in ("en", "am")}
        self.assertEqual(cities, {"en": "Addis Ababa", "am": "አዲስ አበባ"})

    def test_only_opted_in_published_businesses_appear(self):
        listed = self._org("Saron Hair Lounge")
        quiet = self._org("Feven Hair Corner")
        unpublished = self._org("Mahder Salon", publish=False)
        solo = self._solo("Kalkidan Amharic Lessons")
        self._list(listed)
        self._list(solo, "tutoring", "kirkos")
        frappe.set_user(unpublished.user)
        with self.assertRaises(frappe.ValidationError):
            directory.save_owner_listing(unpublished.key, 1, "salon-barber", "bole")
        frappe.set_user("Administrator")
        frappe.get_doc(dict(doctype="Directory Listing", owner_key=unpublished.key, owner_type="Organization", organization=unpublished.key,
                            listed=1, category="salon-barber", area="bole")).insert(ignore_permissions=True)
        keys = {row["owner_key"]: row for row in directory.listings()}
        self.assertIn(listed.key, keys)
        self.assertIn(solo.key, keys, "Independent providers can be listed too.")
        self.assertNotIn(quiet.key, keys, "Businesses are not listed until the owner opts in.")
        self.assertNotIn(unpublished.key, keys, "A business without a published booking page is left out.")
        self.assertTrue(keys[listed.key]["href"].endswith("?source=directory"))
        self.assertTrue(keys[solo.key]["href"].startswith("/schedule/individual/"))
        self.assertIn("Silk press", keys[listed.key]["services"])
        frappe.set_user(listed.user)
        directory.save_owner_listing(listed.key, 0)
        self.assertNotIn(listed.key, {row["owner_key"] for row in directory.listings()}, "Turning the listing off removes it.")

    def test_category_and_area_pages_and_404s(self):
        business = self._org("Hiwot Barber House")
        self._list(business, "salon-barber", "bole")
        index = self._page()
        self.assertEqual(index["kind"], "index")
        self.assertTrue(any(group["href"] == "/directory/salon-barber" for group in index["groups"]))
        category = self._page(category="salon-barber")
        self.assertIn(business.key, [card["owner_key"] for card in category["cards"]])
        self.assertTrue(any(link["href"] == "/directory/salon-barber/bole" for link in category["area_links"]))
        area = self._page(category="salon-barber", area="bole")
        self.assertEqual(area["h1"], "Book a salon or barber in Bole")
        self.assertLessEqual(len(area["title"]), 60)
        self.assertLessEqual(len(area["description"]), 155)
        self.assertTrue(all(card["href"].endswith("?source=directory") for card in area["cards"]))
        empty_category = frappe.get_all("Directory Category", filters={"enabled": 1, "name": ["not in", [row["category"] for row in directory.listings()]]}, pluck="name", limit=1)
        for route in ({"category": empty_category[0]}, {"category": "salon-barber", "area": "lemi-kura"}, {"category": "no-such-thing"},
                      {"category": "salon-barber", "area": "bole", "page": "9"}):
            with self.assertRaises(frappe.PageDoesNotExistError, msg=str(route)):
                self._page(**route)
        self.settings["directory_enabled"] = False
        with self.assertRaises(frappe.PageDoesNotExistError):
            self._page()

    def test_owner_values_are_escaped_on_the_page(self):
        # Organization names cannot hold < or >, so the markup goes into a service name, which owners edit freely.
        business = self._org('Rose & "Lily" Salon')
        frappe.db.set_value("Service", business.service, "service_name", "<b>Lily</b> silk press")
        self._list(business, "salon-barber", "bole")
        context = self._page(category="salon-barber", area="bole")
        page = frappe.render_template("appointment/www/directory.html", context)
        self.assertIn("<h3>Rose &amp; &#34;Lily&#34; Salon</h3>", page)
        self.assertNotIn("<b>Lily</b>", page)
        self.assertIn("<li>&lt;b&gt;Lily&lt;/b&gt; silk press</li>", page)

    def test_amharic_pages_hreflang_and_json_ld(self):
        business = self._org("Meskerem Beauty Studio")
        self._list(business, "salon-barber", "bole")
        page = self._page("am", category="salon-barber", area="bole")
        self.assertEqual(page["lang"], "am")
        self.assertIn("ቦሌ", page["h1"])
        self.assertEqual({row["lang"]: row["href"] for row in page["alternates"]},
                         {"en": get_url("/directory/salon-barber/bole"), "am": get_url("/am/directory/salon-barber/bole")})
        self.assertEqual(page["canonical_url"], get_url("/am/directory/salon-barber/bole"))
        data = json.loads(page["json_ld"])
        self.assertEqual(data["@type"], "ItemList")
        item = next(row["item"] for row in data["itemListElement"] if row["item"]["name"] == page["cards"][0]["name"])
        self.assertEqual(item["@type"], "LocalBusiness")
        self.assertIn("source=directory", item["url"])
        self.assertEqual(page["cards"][0]["city"], "አዲስ አበባ")
        self.assertEqual(item["address"]["addressRegion"], "Addis Ababa")
        self.assertEqual(json.loads(page["breadcrumb_json_ld"])["@type"], "BreadcrumbList")

    def test_sitemap_lists_only_non_empty_pages_in_both_languages(self):
        business = self._org("Eden Hair Atelier")
        self._list(business, "salon-barber", "bole")
        links = {row["loc"]: row for row in directory_page.sitemap_links()}
        for path in ("/directory", "/directory/salon-barber", "/directory/salon-barber/bole", "/am/directory/salon-barber/bole"):
            self.assertIn(get_url(path), links)
        self.assertNotIn(get_url("/directory/salon-barber/lemi-kura"), links)
        self.assertEqual(links[get_url("/directory/salon-barber/bole")]["alternates"]["am"], get_url("/am/directory/salon-barber/bole"))
        self.settings["directory_enabled"] = False
        self.assertEqual(directory_page.sitemap_links(), [])

    def test_owner_permissions(self):
        business = self._org("Ruth Salon")
        stranger = self._user("Dawit", "Haile")
        for user in ("Guest", stranger):
            frappe.set_user(user)
            with self.assertRaises(frappe.PermissionError):
                directory.owner_listing(business.key)
            with self.assertRaises(frappe.PermissionError):
                directory.save_owner_listing(business.key, 1, "salon-barber", "bole")
