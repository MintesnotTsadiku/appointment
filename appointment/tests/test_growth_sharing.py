"""Sharing a booking link: messages, link preview tags and cards, posters, short links and access.

The suite builds one organization and one independent provider, each with a published Public
Site, inside a single transaction and rolls everything back at the end. `frappe.db.commit` is
patched to a no-op, so no code path can persist test records on a shared site.

Run: bench --site <site> run-tests --module appointment.tests.test_growth_sharing
"""

from __future__ import annotations

import os
import shutil
import unittest
from unittest import mock

import frappe

from appointment.growth import og_image, poster, sharing, short_links
from appointment.scheduler import business_owner

DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


class GrowthSharingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._commit = mock.patch.object(frappe.db, "commit", lambda *args, **kwargs: None)
        cls._commit.start()
        cls._sync_flag = frappe.flags.syncing_booking_urls
        frappe.flags.syncing_booking_urls = True  # the booking-URL sync commits unless this is set
        frappe.set_user("Administrator")
        cls.marker = "qa-share-" + frappe.generate_hash(length=6)
        cls.host = frappe.local.site
        cls.org_owner = cls._user("org")
        cls.solo_owner = cls._user("solo")
        cls.other_owner = cls._user("other")
        cls.org = cls._organization(cls.org_owner, "Tsehay Hair Studio")
        cls.other_org = cls._organization(cls.other_owner, "Kebede Tailoring House")
        cls._location(cls.org, "Kazanchis branch", "08:30", "18:30")
        cls.org_site = cls._site("Organization", cls.org, "Tsehay Hair Studio", f"{cls.marker}-org", "tena-clinic", cls.org_owner)
        cls.other_site = cls._site("Organization", cls.other_org, "Kebede Tailoring House", f"{cls.marker}-other", "tena-clinic", cls.other_owner)
        cls.provider = cls._independent(cls.solo_owner)
        cls.solo_site = cls._site("Provider", cls.provider, "Hiwot Wellness", f"{cls.marker}-solo", "selam-movement", cls.solo_owner)
        cls.org_key = cls.org
        cls.solo_key = business_owner.PREFIX + cls.provider
        frappe.set_user("Administrator")

    @classmethod
    def tearDownClass(cls):
        frappe.set_user("Administrator")
        frappe.db.rollback()
        frappe.flags.syncing_booking_urls = cls._sync_flag
        cls._commit.stop()

    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("growth_sharing")

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="growth_sharing")

    # ------------------------------------------------------------------
    # Fixture
    # ------------------------------------------------------------------
    @classmethod
    def _user(cls, suffix):
        return frappe.get_doc(dict(
            doctype="User", email=f"{cls.marker}-{suffix}@example.test", first_name=f"Sharing {suffix}",
            send_welcome_email=0, enabled=1, user_type="System User",
            roles=[{"role": "Provider"}, {"role": "Organization Manager"}],
        )).insert(ignore_permissions=True).name

    @classmethod
    def _organization(cls, owner, name):
        return frappe.get_doc(dict(
            doctype="Organization", organization_name=f"{name} {cls.marker}", slug=f"{cls.marker}-b{frappe.generate_hash(length=4)}",
            organization_type="Other", owner_user=owner, enable_public_booking=1, is_active=1,
            timezone="Africa/Addis_Ababa",
        )).insert(ignore_permissions=True).name

    @classmethod
    def _location(cls, organization, name, opens, closes):
        frappe.get_doc(dict(
            doctype="Location", location_name=name, organization=organization, timezone="Africa/Addis_Ababa", is_active=1,
            opening_hours=[{"day_of_week": day, "is_open": int(day != "Sunday"), "start_time": opens, "end_time": closes} for day in DAYS],
        )).insert(ignore_permissions=True)

    @classmethod
    def _independent(cls, user):
        from appointment.public_experience import solo_setup
        from appointment.scheduler import independent

        frappe.set_user(user)
        provider = solo_setup.create("Hiwot Wellness")["provider"]
        independent.create(provider, "Hiwot room", "Massage", "Africa/Addis_Ababa", 60, "08:30", "18:30", list(DAYS))
        independent.publish(provider, 1)
        frappe.set_user("Administrator")
        return provider

    @classmethod
    def _site(cls, owner_type, owner, title, slug, recipe, user):
        from appointment.public_experience import setup

        frappe.set_user(user)
        draft = setup.start(owner_type, owner, title, slug, recipe)
        frappe.set_user("Administrator")
        site = frappe.get_doc("Public Site", draft["site"])
        if "am" not in [row.locale for row in site.enabled_locales]:
            site.append("enabled_locales", {"locale": "am", "enabled": 1, "translation_status": "Complete"})
            site.save(ignore_permissions=True)
        frappe.set_user(user)
        published = setup.publish(site.name, frappe.db.get_value("Public Site", site.name, "draft_version"))
        frappe.set_user("Administrator")
        return published["site"]

    def owner(self, key):
        return business_owner.from_key(key)

    # ------------------------------------------------------------------
    # Messages and links
    # ------------------------------------------------------------------
    def test_share_message_fills_once_and_keeps_names_as_typed(self):
        link = "https://book.example/x?source=telegram_share"
        self.assertEqual(sharing.fill_message("Book with {business}: {link}", "Abebe {link} & Sons", link),
                         f"Book with Abebe {{link}} & Sons: {link}")
        self.assertEqual(sharing.fill_message("ከ{business} ጋር ቀጠሮ ይያዙ፦ {link}", "ሰላም", link), f"ከሰላም ጋር ቀጠሮ ይያዙ፦ {link}")
        self.assertEqual(sharing.fill_message("Book with {business}", "Abebe", link), f"Book with Abebe {link}")
        self.assertEqual(sharing.fill_message("", "Abebe", link), f"Abebe {link}")
        messages = sharing.share_messages("Abebe", link)
        self.assertEqual(set(messages), {"en", "am"})
        for text in messages.values():
            self.assertIn(link, text)
            self.assertNotIn("{business}", text)

    def test_tracked_url_sets_one_source(self):
        self.assertEqual(sharing.tracked_url("https://b.example/s?source=x&lang=am", "qr_poster"),
                         "https://b.example/s?lang=am&source=qr_poster")
        self.assertEqual(sharing.tracked_url("", "qr_poster"), "")

    def test_grow_context_for_organization_and_independent_owner(self):
        for key, user, site in ((self.org_key, self.org_owner, self.org_site), (self.solo_key, self.solo_owner, self.solo_site)):
            frappe.set_user(user)
            context = sharing.grow_context(key)
            slug = frappe.db.get_value("Public Site", site, "slug")
            self.assertTrue(context["link"]["url"].endswith(f"/{slug}"))
            self.assertTrue(context["link"]["short"].endswith(f"/{slug}"))
            self.assertIn("source=telegram_share", context["link"]["tracked"]["telegram_share"])
            self.assertIn("source=qr_poster", context["link"]["tracked"]["qr_poster"])
            self.assertTrue(context["slug"]["editable"])
            self.assertEqual(set(context["preview"]), {"en", "am"})
            self.assertTrue(context["posters"]["locations"])

    def test_stats_count_visits_from_share_links(self):
        slug = frappe.db.get_value("Public Site", self.org_site, "slug")
        for path, source in ((slug, "telegram_share"), (f"{slug}/book", "qr_poster"), (f"{slug}x", "telegram_share"), (slug, "other")):
            frappe.get_doc(dict(doctype="Web Page View", path=path, source=source)).insert(ignore_permissions=True)
        data = sharing.profile(self.owner(self.org_key))
        result = sharing.stats(self.owner(self.org_key), data)
        self.assertEqual(result["visits"]["telegram_share"], 1)
        self.assertEqual(result["visits"]["qr_poster"], 1)

    # ------------------------------------------------------------------
    # Link preview tags and card
    # ------------------------------------------------------------------
    def test_open_graph_tags_for_org_and_independent_pages_in_both_languages(self):
        for site in (self.org_site, self.solo_site):
            slug = frappe.db.get_value("Public Site", site, "slug")
            english = sharing.page_meta(self.host, f"/{slug}")
            self.assertIsNotNone(english, slug)
            self.assertEqual(english["locale"], "en_US")
            self.assertIn("Book online", english["title"])
            self.assertTrue(english["image"].endswith(".png"))
            self.assertLessEqual(len(english["description"]), 155)
            amharic = sharing.page_meta(self.host, f"/{slug}/am")
            self.assertIsNotNone(amharic, slug)
            self.assertEqual(amharic["locale"], "am_ET")
            self.assertNotEqual(english["image"], amharic["image"])
            path = frappe.get_site_path("public", "files", english["image"].split("/files/", 1)[1])
            self.assertTrue(os.path.exists(path), path)
            tags = sharing.meta_tags(english)
            for name in ("og:title", "og:description", "og:image", "og:url", "twitter:card"):
                self.assertIn(f'"{name}"', tags)
        self.assertIsNone(sharing.page_meta(self.host, "/home"))
        self.assertIsNone(sharing.page_meta(self.host, f"/{self.marker}-nobody"))

    def test_meta_tags_escape_business_text(self):
        tags = sharing.meta_tags(dict(title='A "quoted" <b>name</b>', description="x & y", image="https://i/x.png",
                                      url="https://u/", site_name="<s>", locale="en_US"))
        self.assertNotIn("<b>", tags)
        self.assertNotIn('"quoted"', tags)
        self.assertIn("&amp;", tags)

    def test_share_card_regenerates_when_the_brand_changes(self):
        data = sharing.profile(self.owner(self.org_key), "en")
        first = sharing.card_url(data, "en")
        self.assertEqual(first, sharing.card_url(data, "en"), "same inputs reuse the file")
        changed = {**data, "colors": {**data["colors"], "primary": "#0b6e4f"}}
        second = sharing.card_url(changed, "en")
        self.assertNotEqual(first, second)
        self.assertTrue(os.path.exists(frappe.get_site_path("public", second.lstrip("/"))))
        self.assertFalse(os.path.exists(frappe.get_site_path("public", first.lstrip("/"))), "the stale card is removed")
        renamed = {**changed, "name": changed["name"] + " Plus"}
        self.assertNotEqual(second, sharing.card_url(renamed, "en"))

    def test_render_card_is_generic(self):
        url = og_image.render_card("ሰላም Studio", "Book online", ["Cut", "ቀለም"], None, {"primary": "#123456"}, "am",
                                   footer="b.example/x", key=f"{self.marker}-generic")
        path = frappe.get_site_path("public", url.lstrip("/"))
        from PIL import Image

        with Image.open(path) as image:
            self.assertEqual(image.size, (1200, 630))
        os.remove(path)

    # ------------------------------------------------------------------
    # Poster
    # ------------------------------------------------------------------
    def test_poster_shows_both_clocks_for_org_and_independent(self):
        for key in (self.org_key, self.solo_key):
            html = poster.render_html(self.owner(key), size="A5", theme="dark", languages="both")
            self.assertIn("8:30 AM – 6:30 PM", html)
            self.assertIn("ጠዋት 2:30 – ምሽት 12:30", html)
            self.assertIn("data-poster-qr", html)
            self.assertIn("<svg", html)

    def test_poster_pdf_renders(self):
        if not shutil.which("wkhtmltopdf"):
            self.skipTest("wkhtmltopdf is not installed")
        import io

        from pypdf import PdfReader

        for key in (self.org_key, self.solo_key):
            pdf = poster.render_pdf(self.owner(key), size="A4", theme="light", languages="both")
            self.assertTrue(pdf.startswith(b"%PDF"))
            reader = PdfReader(io.BytesIO(pdf))
            self.assertEqual(len(reader.pages), 1, "the poster fits one page")
            self.assertIn("8:30 AM", reader.pages[0].extract_text())

    def test_poster_options_and_location_are_checked(self):
        owner = self.owner(self.org_key)
        with self.assertRaises(frappe.ValidationError):
            poster.render_html(owner, size="A3")
        foreign = frappe.get_all("Location", filters={"independent_provider": self.provider}, pluck="name")[0]
        with self.assertRaises(frappe.PermissionError):
            poster.render_html(owner, location=foreign)

    def test_hour_rows_group_days(self):
        location = frappe.get_all("Location", filters={"organization": self.org}, pluck="name")[0]
        rows = poster.hour_rows(location)
        self.assertEqual(rows[0]["days_en"], "Mon – Sat")
        self.assertEqual(rows[0]["days_am"], "ሰኞ – ቅዳሜ")
        self.assertTrue(rows[-1]["closed"])
        self.assertEqual(rows[-1]["days_en"], "Sun")

    def test_posters_switch(self):
        frappe.set_user(self.org_owner)
        with mock.patch("appointment.growth.settings.growth", return_value={"posters_enabled": False}):
            with self.assertRaises(frappe.PermissionError):
                poster.poster(self.org_key)

    # ------------------------------------------------------------------
    # Short links
    # ------------------------------------------------------------------
    def test_slug_rules_and_availability(self):
        own = frappe.db.get_value("Public Site", self.org_site, "slug")
        other = frappe.db.get_value("Public Site", self.other_site, "slug")
        other_org_slug = frappe.db.get_value("Organization", self.other_org, "slug")
        self.assertEqual(short_links.problem("ab", self.org_site), "length")
        self.assertEqual(short_links.problem("a" * 31, self.org_site), "length")
        self.assertEqual(short_links.problem("bad--slug", self.org_site), "format")
        self.assertEqual(short_links.problem("admin", self.org_site), "reserved")
        self.assertEqual(short_links.problem("grow", self.org_site), "reserved")
        self.assertEqual(short_links.problem(other, self.org_site), "taken")
        self.assertEqual(short_links.problem(other_org_slug, self.org_site), "taken")
        self.assertIsNone(short_links.problem(f"{self.marker}-free", self.org_site))
        frappe.set_user(self.org_owner)
        result = short_links.check(self.org_key, own)
        self.assertEqual(result["reason"], "current")
        result = short_links.check(self.org_key, "Admin")
        self.assertEqual((result["slug"], result["available"], result["reason"]), ("admin", False, "reserved"))

    def test_suggestions_are_short_valid_and_available(self):
        own = frappe.db.get_value("Public Site", self.org_site, "slug")
        name = frappe.db.get_value("Organization", self.org, "organization_name")
        suggestions = short_links.suggestions(name, self.org_site, own)
        self.assertTrue(1 <= len(suggestions) <= 3)
        for slug in suggestions:
            self.assertNotEqual(slug, own)
            self.assertIsNone(short_links.problem(slug, self.org_site))
        self.assertTrue(short_links.suggestions("ሰላም ስቱዲዮ", self.org_site), "a name without Latin letters still gets ideas")

    def test_slug_change_keeps_old_links_redirecting(self):
        old = frappe.db.get_value("Public Site", self.solo_site, "slug")
        new = f"{self.marker}-new"
        frappe.set_user(self.solo_owner)
        state = short_links.change(self.solo_key, new)
        self.assertEqual(state["slug"], new)
        self.assertIn(old, state["aliases"])
        frappe.set_user("Guest")
        self.assertEqual(short_links.redirect_path(f"/{old}/book", "source=qr_poster"), f"/{new}/book?source=qr_poster")
        self.assertEqual(short_links.resolve(f"/{old}/am?source=qr_poster"), f"/{new}/am?source=qr_poster")
        self.assertIsNone(short_links.redirect_path(f"/{new}"))
        self.assertIsNotNone(sharing.page_meta(self.host, f"/{new}"))
        frappe.set_user(self.other_owner)
        with self.assertRaises(frappe.ValidationError):
            short_links.change(self.other_org, old)  # another business cannot claim the former address
        frappe.set_user(self.solo_owner)
        back = short_links.change(self.solo_key, old)  # the owner may take it back
        self.assertEqual(back["slug"], old)
        self.assertEqual(back["aliases"], [new])
        self.assertFalse(frappe.db.exists(short_links.ALIAS, old))

    def test_public_site_hook_blocks_former_addresses(self):
        frappe.get_doc(dict(doctype=short_links.ALIAS, slug=f"{self.marker}-held", public_site=self.org_site)).insert(ignore_permissions=True)
        site = frappe.get_doc("Public Site", self.other_site)
        site.slug = f"{self.marker}-held"
        with self.assertRaises(frappe.ValidationError):
            site.save(ignore_permissions=True)

    def test_change_rejects_invalid_input(self):
        frappe.set_user(self.org_owner)
        for value in ("ab", "Not Valid", "admin", frappe.db.get_value("Public Site", self.other_site, "slug")):
            with self.assertRaises(frappe.ValidationError, msg=value):
                short_links.change(self.org_key, value)

    # ------------------------------------------------------------------
    # Access
    # ------------------------------------------------------------------
    def test_owner_cannot_use_another_business(self):
        frappe.set_user(self.other_owner)
        for call in (
            lambda: sharing.grow_context(self.org_key),
            lambda: sharing.grow_context(self.solo_key),
            lambda: poster.poster(self.org_key),
            lambda: poster.poster(self.solo_key, format="pdf"),
            lambda: short_links.check(self.org_key, "anything"),
            lambda: short_links.change(self.solo_key, f"{self.marker}-stolen"),
        ):
            with self.assertRaises(frappe.PermissionError):
                call()
        frappe.set_user("Guest")
        with self.assertRaises(frappe.PermissionError):
            sharing.grow_context(self.org_key)
