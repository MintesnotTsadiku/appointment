"""The public provider page: addresses, the guest endpoint, redirects, share meta and the website sync.

The suite builds two independent providers (one gets a published website in some tests) and one
organization inside a single transaction and rolls everything back. `frappe.db.commit` is patched to a
no-op, so no code path can persist test records on a shared site.

Run: bench --site <site> run-tests --module appointment.tests.test_provider_page
"""

from __future__ import annotations

import inspect
import json
import re
import unittest
from unittest import mock

import frappe

from appointment.growth import directory, sharing, short_links, touchpoints
from appointment.scheduler import business_owner, independent, provider_page

DAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


class ProviderPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._commit = mock.patch.object(frappe.db, "commit", lambda *args, **kwargs: None)
        cls._commit.start()
        cls._sync_flag = frappe.flags.syncing_booking_urls
        frappe.flags.syncing_booking_urls = True  # the booking-URL sync commits unless this is set
        frappe.set_user("Administrator")
        cls.marker = "qa-pp-" + frappe.generate_hash(length=6)
        cls.host = frappe.local.site
        cls.owner_user = cls._user("solo")
        cls.other_user = cls._user("other")
        cls.provider, cls.offering = cls._independent(cls.owner_user, f"Selam Tadesse Physio {cls.marker}")
        cls.other, cls.other_offering = cls._independent(cls.other_user, f"Bekele Amare Coaching {cls.marker}")
        cls.org = frappe.get_doc(dict(
            doctype="Organization", organization_name=f"Kidist Clinic {cls.marker}", slug=f"{cls.marker}-org",
            organization_type="Other", owner_user=cls.other_user, enable_public_booking=1, is_active=1,
            timezone="Africa/Addis_Ababa")).insert(ignore_permissions=True).name
        frappe.set_user("Administrator")

    @classmethod
    def tearDownClass(cls):
        frappe.set_user("Administrator")
        frappe.db.rollback()
        frappe.flags.syncing_booking_urls = cls._sync_flag
        cls._commit.stop()

    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("provider_page")

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="provider_page")

    # ------------------------------------------------------------------
    # Fixture
    # ------------------------------------------------------------------
    @classmethod
    def _user(cls, suffix):
        return frappe.get_doc(dict(
            doctype="User", email=f"{cls.marker}-{suffix}@example.test", first_name=f"Page {suffix}",
            send_welcome_email=0, enabled=1, user_type="System User", roles=[{"role": "Provider"}],
        )).insert(ignore_permissions=True).name

    @classmethod
    def _independent(cls, user, name):
        from appointment.public_experience import solo_setup

        frappe.set_user(user)
        provider = solo_setup.create(name)["provider"]
        row = independent.create(provider, f"Room {name}", "Back pain session", "Africa/Addis_Ababa", 45,
                                 "08:30", "18:30", list(DAYS))
        independent.publish(provider, 1)
        frappe.set_user("Administrator")
        return provider, row["offering"]

    def _site(self, slug):
        from appointment.public_experience import setup

        frappe.set_user(self.owner_user)
        draft = setup.start("Provider", self.provider, "Selam Tadesse Physio", slug, "selam-movement")
        published = setup.publish(draft["site"], frappe.db.get_value("Public Site", draft["site"], "draft_version"))
        frappe.set_user("Administrator")
        return published["site"]

    def _online_offering(self):
        """A second offering of the same service at an online place, with a meeting link that must stay private."""
        event = frappe.get_doc("EventType", self.offering)
        place = frappe.get_doc({"doctype": "Location", "location_name": f"Video {self.marker}", "independent_provider": self.provider,
                                "timezone": "Africa/Addis_Ababa", "is_active": 1, "location_type": "Online", "video_platform": "Zoom",
                                "meeting_link_mode": "Fixed link", "meeting_link": "https://zoom.example.test/j/123",
                                "opening_hours": [{"day_of_week": day, "is_open": 1, "start_time": "08:00", "end_time": "20:00"} for day in DAYS]}
                               ).insert(ignore_permissions=True)
        return frappe.get_doc({"doctype": "EventType", "event_type_name": "Back pain session online", "service": event.service,
                               "location": place.name, "provider": self.provider, "is_active": 1}).insert(ignore_permissions=True).name

    def slug(self, provider=None):
        return frappe.db.get_value("Provider", provider or self.provider, "public_slug")

    def change(self, slug, user=None):
        frappe.set_user(user or self.owner_user)
        result = short_links.change(business_owner.PREFIX + self.provider, slug)
        frappe.set_user("Administrator")
        return result

    # ------------------------------------------------------------------
    # Addresses
    # ------------------------------------------------------------------
    def test_setup_gives_a_readable_address(self):
        self.assertTrue(self.slug().startswith("selam-tadesse-physio"), self.slug())
        self.assertIsNone(short_links.problem(self.slug(), None, provider=self.provider))
        self.assertEqual(short_links.problem(self.slug(), None, provider=self.other), "taken")

    def test_generated_addresses_avoid_every_holder(self):
        self.assertRegex(provider_page.generate_slug("ሰላም ፊዚዮቴራፒ"), r"^book-[a-z0-9]{6}$")
        org_slug = frappe.db.get_value("Organization", self.org, "slug")
        self.assertNotEqual(provider_page.generate_slug(org_slug), org_slug)
        self.assertNotEqual(provider_page.generate_slug("Admin"), "admin")
        self.assertNotEqual(provider_page.generate_slug(self.slug()), self.slug())
        frappe.get_doc(dict(doctype=short_links.ALIAS, slug=f"{self.marker}-held", provider=self.other)).insert(ignore_permissions=True)
        self.assertNotEqual(provider_page.generate_slug(f"{self.marker} held"), f"{self.marker}-held")
        site = self._site(f"{self.marker}-site")
        frappe.get_doc(dict(doctype=short_links.ALIAS, slug=f"{self.marker}-old-site", public_site=site)).insert(ignore_permissions=True)
        for taken in (f"{self.marker}-site", f"{self.marker}-old-site"):
            self.assertNotEqual(provider_page.generate_slug(taken.replace("-", " ")), taken)
            self.assertEqual(short_links.problem(taken, None, provider=self.other), "taken")

    def test_backfill_adopts_the_site_and_runs_once(self):
        from appointment.patches.v0_1 import backfill_provider_page_slugs

        site = self._site(f"{self.marker}-web")
        for provider in (self.provider, self.other):
            frappe.db.set_value("Provider", provider, "public_slug", None, update_modified=False)
        backfill_provider_page_slugs.execute()
        self.assertEqual(self.slug(), frappe.db.get_value("Public Site", site, "slug"))
        other = self.slug(self.other)
        self.assertTrue(other)
        backfill_provider_page_slugs.execute()
        self.assertEqual(self.slug(self.other), other)

    def test_a_document_save_never_changes_the_address(self):
        current = self.slug()
        doc = frappe.get_doc("Provider", self.provider)
        doc.public_slug = "admin"
        doc.save(ignore_permissions=True)
        self.assertEqual(self.slug(), current)

    def test_owner_sets_spoken_languages_on_the_profile_page(self):
        from appointment import onboarding

        frappe.set_user(self.owner_user)
        onboarding.update_provider_profile(spoken_languages=json.dumps(["om", "am"]))
        self.assertTrue(frappe.response["message"].get("success"), frappe.response["message"])
        onboarding.get_provider_profile()
        self.assertEqual(frappe.response["message"]["spoken_languages"], ["am", "om"])
        frappe.set_user("Guest")
        self.assertEqual(provider_page.public_provider(self.slug())["languages"], ["am", "om"])

    def test_spoken_languages_keep_known_codes(self):
        doc = frappe.get_doc("Provider", self.provider)
        doc.spoken_languages = json.dumps(["en", "xx", "am", "om"])
        doc.save(ignore_permissions=True)
        self.assertEqual(provider_page.spoken_languages(frappe.db.get_value("Provider", self.provider, "spoken_languages")), ["am", "en", "om"])

    def test_bio_in_each_language_falls_back_to_the_other(self):
        from appointment import onboarding

        english, amharic = "Physiotherapist for back and knee pain.", "ለጀርባና ለጉልበት ሕመም የፊዚዮቴራፒ ባለሙያ።"
        frappe.set_user(self.owner_user)
        onboarding.update_provider_profile(bio=english, bio_am=amharic)
        self.assertTrue(frappe.response["message"].get("success"), frappe.response["message"])
        onboarding.get_provider_profile()
        self.assertEqual((frappe.response["message"]["bio"], frappe.response["message"]["bio_am"]), (english, amharic))
        frappe.set_user("Guest")
        page = provider_page.public_provider(self.slug())
        self.assertEqual((page["bio"], page["bio_am"]), (english, amharic))
        frappe.set_user("Administrator")
        row = {"bio": english, "bio_am": amharic}
        self.assertEqual((provider_page.provider_bio(row, "en"), provider_page.provider_bio(row, "am")), (english, amharic))
        self.assertEqual(provider_page.provider_bio({"bio": english, "bio_am": "  "}, "am"), english)
        self.assertEqual(provider_page.provider_bio({"bio": "", "bio_am": amharic}, "en"), amharic)
        key = business_owner.PREFIX + self.provider
        self.assertEqual(directory.booking_pages([key])[key]["descriptions"], {"en": english, "am": amharic})
        frappe.db.set_value("Provider", self.provider, "bio", "")
        self.assertEqual(directory.booking_pages([key])[key]["descriptions"], {"en": amharic, "am": amharic})

    def test_directory_card_shows_the_description_in_the_page_language(self):
        from appointment.www import directory as directory_page

        page = directory_page.Page.__new__(directory_page.Page)
        row = {"area": "a", "category": "c", "name": "Selam Tadesse", "logo": "", "description": "English",
               "descriptions": {"en": "English", "am": "አማርኛ"}}
        page.areas = {"a": frappe._dict(area_name="Bole", city="Addis Ababa")}
        page.categories = {"c": frappe._dict(category_name="Physio")}
        for lang, expected in (("en", "English"), ("am", "አማርኛ")):
            page.lang = lang
            self.assertEqual(page.card(row)["description"], expected)
        page.lang = "am"
        self.assertEqual(page.card({**row, "descriptions": {}})["description"], "English")

    # ------------------------------------------------------------------
    # Organization slugs share the address space
    # ------------------------------------------------------------------
    def _organization(self, slug, name="Hana Clinic"):
        return frappe.get_doc(dict(
            doctype="Organization", organization_name=f"{name} {self.marker}", slug=slug, organization_type="Other",
            owner_user=self.other_user, is_active=1, timezone="Africa/Addis_Ababa")).insert(ignore_permissions=True)

    def test_an_organization_cannot_take_a_provider_page_address(self):
        frappe.clear_messages()
        with self.assertRaises(frappe.ValidationError) as raised:
            self._organization(self.slug())
        self.assertIn("already used by another business", str(raised.exception))
        doc = frappe.get_doc("Organization", self.org)
        doc.slug = self.slug(self.other)
        with self.assertRaises(frappe.ValidationError):
            doc.save(ignore_permissions=True)

    def test_an_organization_cannot_take_a_former_address_or_another_website(self):
        old = self.slug(self.other)
        frappe.set_user(self.other_user)
        short_links.change(business_owner.PREFIX + self.other, f"{self.marker}-moved")
        frappe.set_user("Administrator")
        with self.assertRaises(frappe.ValidationError):
            self._organization(old)
        site = self._site(f"{self.marker}-site")
        with self.assertRaises(frappe.ValidationError):
            self._organization(frappe.db.get_value("Public Site", site, "slug"), "Tsion Clinic")
        with self.assertRaises(frappe.ValidationError):
            self._organization(f"{self.marker}-org", "Meron Clinic")  # another organization's slug

    def test_an_organization_keeps_its_own_addresses(self):
        doc = frappe.get_doc("Organization", self.org)
        doc.description = "Family clinic in Bole."
        doc.save(ignore_permissions=True)  # its own current slug
        self.assertFalse(short_links.organization_slug_taken(doc.slug, doc.name))
        self.assertTrue(short_links.organization_slug_taken(doc.slug, None))
        # A slug that clashed before this check stays valid until it changes.
        frappe.db.set_value("Organization", self.org, "slug", self.slug(), update_modified=False)
        doc = frappe.get_doc("Organization", self.org)
        doc.description = "Family clinic in Bole, open on Saturdays."
        doc.save(ignore_permissions=True)
        self.assertEqual(frappe.db.get_value("Organization", self.org, "slug"), self.slug())

    def test_every_path_that_sets_an_organization_slug_avoids_page_addresses(self):
        from appointment.scheduler import workspace

        taken = self.slug()
        self.assertEqual(short_links.free_organization_slug(taken), f"{taken}-2")
        self.assertEqual(short_links.free_organization_slug(f"{self.marker}-free"), f"{self.marker}-free")
        self.assertNotEqual(workspace._readable_slug(taken), taken)
        from appointment import onboarding

        source = inspect.getsource(onboarding.save_organization_profile)
        self.assertIn("free_organization_slug(make_slug(organization_name)", source)

    # ------------------------------------------------------------------
    # Guest endpoint
    # ------------------------------------------------------------------
    def test_public_provider_lists_bookable_services_and_hides_private_facts(self):
        online = self._online_offering()
        frappe.db.set_value("Provider", self.provider, "profile_photo", "/private/files/selam.jpg")
        frappe.set_user("Guest")
        page = provider_page.public_provider(self.slug())
        self.assertEqual(page["canonical_slug"], self.slug())
        self.assertEqual(page["photo"], "")
        self.assertEqual(len(page["services"]), 1)
        service = page["services"][0]
        self.assertEqual([row["offering"] for row in service["offerings"]], [self.offering, online])
        self.assertEqual(service["offerings"][1]["location"], {"name": f"Video {self.marker}", "address": "", "location_type": "online", "platform": "Zoom"})
        self.assertTrue(all(row["path"] == f"/schedule/p/{self.slug()}/{row['offering']}" for row in service["offerings"]))
        self.assertNotIn("zoom.example.test", json.dumps(page))
        self.assertNotIn(self.other_offering, json.dumps(page))
        frappe.set_user("Administrator")
        frappe.db.set_value("EventType", online, "is_active", 0)
        frappe.set_user("Guest")
        self.assertEqual(len(provider_page.public_provider(self.slug())["services"][0]["offerings"]), 1)

    def test_unknown_and_unpublished_pages_give_one_answer(self):
        def message(slug):
            frappe.clear_messages()
            with self.assertRaises(frappe.DoesNotExistError) as raised:
                provider_page.public_provider(slug)
            return str(raised.exception)

        frappe.set_user("Guest")
        unknown = message(f"{self.marker}-nobody")
        frappe.set_user("Administrator")
        frappe.db.set_value("Provider", self.provider, "enable_public_booking", 0)
        frappe.set_user("Guest")
        self.assertEqual(message(self.slug()), unknown)
        frappe.set_user("Administrator")
        frappe.db.set_value("Provider", self.provider, "enable_public_booking", 1)
        service = frappe.db.get_value("EventType", self.offering, "service")
        frappe.db.set_value("Service", service, "is_active", 0)
        frappe.set_user("Guest")
        self.assertEqual(message(self.slug()), unknown)

    def test_public_provider_is_a_rate_limited_guest_get(self):
        source = inspect.getsource(provider_page)
        self.assertIn('@frappe.whitelist(allow_guest=True, methods=["GET"])\n@rate_limit(limit=120, seconds=60)\ndef public_provider', source)

    def test_public_offering_checks_the_page_address(self):
        frappe.set_user("Guest")
        self.assertEqual(independent.public_offering(self.offering, slug=self.slug())["provider_slug"], self.slug())
        self.assertEqual(independent.public_offering(self.offering)["provider_slug"], self.slug(), "the older path still opens")
        with self.assertRaises(frappe.PermissionError):
            independent.public_offering(self.offering, slug=self.slug(self.other))

    # ------------------------------------------------------------------
    # Former addresses and short links
    # ------------------------------------------------------------------
    def test_changed_address_keeps_old_links_working(self):
        old = self.slug()
        new = f"{self.marker}-new"
        state = self.change(new)
        self.assertEqual((state["slug"], state["aliases"], state["path"]), (new, [old], f"/schedule/p/{new}"))
        frappe.set_user("Guest")
        self.assertEqual(provider_page.public_provider(old)["canonical_slug"], new)
        self.assertEqual(short_links.redirect_path(f"/schedule/p/{old}/{self.offering}", "source=qr_poster"),
                         f"/schedule/p/{new}/{self.offering}?source=qr_poster")
        self.assertIsNone(short_links.redirect_path(f"/schedule/p/{new}"))
        self.assertEqual(short_links.redirect_path(f"/{new}"), f"/schedule/p/{new}")
        self.assertEqual(short_links.redirect_path(f"/{old}", "source=telegram_share"), f"/schedule/p/{new}?source=telegram_share")
        self.assertEqual(short_links.redirect_path(f"/{new}/am"), f"/schedule/p/{new}?lang=am")
        self.assertIsNone(short_links.redirect_path("/calendar"))
        self.assertIsNone(short_links.redirect_path(f"/{frappe.db.get_value('Organization', self.org, 'slug')}"))
        with self.assertRaises(frappe.ValidationError):
            frappe.set_user(self.other_user)
            short_links.change(business_owner.PREFIX + self.other, old)
        back = self.change(old)
        self.assertEqual((back["slug"], back["aliases"]), (old, [new]))

    def test_another_business_cannot_take_a_page_address(self):
        frappe.set_user(self.other_user)
        with self.assertRaises(frappe.ValidationError):
            short_links.change(business_owner.PREFIX + self.other, self.slug())
        with self.assertRaises(frappe.PermissionError):
            short_links.change(business_owner.PREFIX + self.provider, f"{self.marker}-stolen")
        frappe.set_user("Administrator")
        site = frappe.get_doc("Public Site", self._site(f"{self.marker}-own"))
        site.slug = self.slug(self.other)
        with self.assertRaises(frappe.ValidationError):
            site.save(ignore_permissions=True)

    def test_website_address_and_page_address_stay_one(self):
        first = self.slug()
        site = self._site(f"{self.marker}-web")
        self.assertEqual(self.slug(), f"{self.marker}-web")
        self.assertEqual(frappe.db.get_value(short_links.ALIAS, first, "provider"), self.provider)
        self.change(f"{self.marker}-web2")
        self.assertEqual(self.slug(), f"{self.marker}-web2")
        self.assertEqual(frappe.db.get_value(short_links.ALIAS, f"{self.marker}-web", "public_site"), site)
        self.assertEqual(provider_page.owner_for_slug(f"{self.marker}-web"), (self.provider, f"{self.marker}-web2"))
        self.assertEqual(provider_page.owner_for_slug(first), (self.provider, f"{self.marker}-web2"))
        # A save from anywhere (the website editor, Desk) moves the page address too.
        doc = frappe.get_doc("Public Site", site)
        doc.slug = f"{self.marker}-web3"
        doc.save(ignore_permissions=True)
        self.assertEqual(self.slug(), f"{self.marker}-web3")
        self.assertEqual(frappe.db.get_value(short_links.ALIAS, f"{self.marker}-web2", "public_site"), site)

    def test_deleting_a_provider_deletes_its_former_addresses(self):
        old = self.slug(self.other)
        frappe.set_user(self.other_user)
        short_links.change(business_owner.PREFIX + self.other, f"{self.marker}-moved")
        frappe.set_user("Administrator")
        self.assertTrue(frappe.db.exists(short_links.ALIAS, old))
        provider_page.delete_aliases(frappe.get_doc("Provider", self.other))
        self.assertFalse(frappe.db.exists(short_links.ALIAS, old))

    # ------------------------------------------------------------------
    # Links that point at the page
    # ------------------------------------------------------------------
    def test_links_point_at_the_page_and_the_website_wins(self):
        owner = business_owner.from_key(business_owner.PREFIX + self.provider)
        page = f"/schedule/p/{self.slug()}"
        self.assertEqual((owner.page_slug, owner.slug, owner.book_path), (self.slug(), None, page))
        self.assertIn(f"/schedule/individual/{self.offering}/my-bookings", owner.my_bookings_path)
        self.assertEqual(sharing.public_path(owner), page)
        data = sharing.profile(owner)
        self.assertEqual((data["slug"], data["slug_kind"]), (self.slug(), "provider_page"))
        self.assertTrue(data["short"].endswith(f"/{self.slug()}"))
        frappe.set_user(self.owner_user)
        context = sharing.grow_context(owner.key)
        self.assertEqual((context["slug"]["editable"], context["slug"]["kind"]), (True, "provider_page"))
        self.assertTrue(independent.workspace()["business_path"].endswith(page))
        self.assertEqual(independent.overview(self.provider)[0]["public_path"], f"{page}/{self.offering}")
        frappe.set_user("Administrator")
        self.assertEqual(touchpoints.book_again_path(owner, self.offering), f"{page}/{self.offering}")
        self.assertEqual(directory.booking_pages([owner.key])[owner.key]["href"], page)
        self.assertIn(frappe.utils.get_url(page), [link["loc"] for link in provider_page.sitemap_links()])
        site = self._site(f"{self.marker}-brand")
        owner = business_owner.from_key(business_owner.PREFIX + self.provider)
        self.assertEqual(sharing.public_path(owner), f"/{self.marker}-brand")
        self.assertEqual(owner.book_path, f"/schedule/p/{self.marker}-brand")
        self.assertNotIn(frappe.utils.get_url(f"/schedule/p/{self.marker}-brand"), [link["loc"] for link in provider_page.sitemap_links()])
        self.assertEqual(sharing.profile(owner)["slug_kind"], "site")
        frappe.set_user("Guest")
        self.assertEqual(provider_page.public_provider(self.slug())["site_slug"], frappe.db.get_value("Public Site", site, "slug"))

    def test_referral_invite_accepts_a_page_address(self):
        from appointment.growth import customer_referral_api

        frappe.set_user("Guest")
        self.assertEqual(customer_referral_api.invite(code="NOPE1234", provider_slug=self.slug()), {"valid": False})
        self.assertEqual(customer_referral_api.invite(code="NOPE1234", provider_slug=f"{self.marker}-nobody"), {"valid": False})

    def test_share_meta_for_the_page_in_both_languages(self):
        english = sharing.page_meta(self.host, f"/schedule/p/{self.slug()}")
        self.assertEqual(english["locale"], "en_US")
        self.assertTrue(english["url"].endswith(f"/schedule/p/{self.slug()}"))
        amharic = sharing.page_meta(self.host, f"/schedule/p/{self.slug()}/{self.offering}", "am")
        self.assertEqual(amharic["locale"], "am_ET")
        self.assertEqual(amharic["url"], english["url"], "an offering page points crawlers at the provider page")
        frappe.db.set_value("Provider", self.provider, "enable_public_booking", 0)
        self.assertIsNone(sharing.page_meta(self.host, f"/schedule/p/{self.slug()}"))
        self.assertIsNone(sharing.page_meta(self.host, f"/schedule/p/{self.marker}-nobody"))
        self.assertTrue(re.match(r"^https?://", english["image"]))
