"""Amharic names on public pages, the owner's name settings, and the retirement of template version 1.

Business and provider names come in both languages from the public APIs (`localized_names`), owners
edit them side by side (`public_names`, the profile form, website setup), and a retired template
version still renders but is never offered to a new site. The go-live report names published
websites on an older version.

Reuses the referral test case: commits are patched and every test rolls back to a savepoint.
"""

import json
from types import SimpleNamespace
from unittest import mock

import frappe
from frappe.utils import add_days, nowdate

from appointment import onboarding
from appointment.api import personal_meet
from appointment.growth import directory, sharing
from appointment.ops import go_live, readiness_sites
from appointment.ops.checks import PASS, WARN
from appointment.public_experience import publisher, setup
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.recipes import (
    RETIRED_VERSIONS, available_recipes, get_recipe, is_retired, latest_version, require_offered,
)
from appointment.public_experience.errors import UnknownRecipeError
from appointment.growth import touchpoints
from appointment.scheduler import (
    booking, business_owner, independent, localized_names, locations, my_bookings, notification_email, notification_sms,
    public_names, self_service,
)
from appointment.tests.test_growth_referrals import ReferralCase

BUSINESS_AM = "ቦሌ ብሉም የፀጉር ስቱዲዮ"
DESCRIPTION_AM = "የተፈጥሮ ፀጉር እንክብካቤ በቦሌ።"
PROVIDER_AM = "ሐና ተስፋዬ"
PLACE_AM = "የቦሌ ዋና ስቱዲዮ"
ADDRESS_AM = "ቦሌ፣ ከአፍሪካ ጎዳና ገባ ብሎ፣ ዋናው ስቱዲዮ፣ አዲስ አበባ"


class TestAmharicNames(ReferralCase):
    def _named_business(self):
        business = self._org("Bole Bloom")
        provider = frappe.db.get_value("EventType", business.offering, "provider")
        frappe.set_user(business.user)
        saved = public_names.save_business_names(
            business.organization, frappe.db.get_value("Organization", business.organization, "organization_name"),
            BUSINESS_AM, "Natural hair care in Bole.", DESCRIPTION_AM,
            json.dumps([{"id": provider, "name": "Hanna Tesfaye", "name_am": PROVIDER_AM}]))
        frappe.set_user("Administrator")
        return business, provider, saved

    # Public names -----------------------------------------------------------
    def test_scheduler_answers_carry_the_names_in_both_languages(self):
        business, provider, saved = self._named_business()
        self.assertEqual(saved["name"]["am"], BUSINESS_AM)
        self.assertEqual(saved["providers"], [{"id": provider, "name": {"en": "Hanna Tesfaye", "am": PROVIDER_AM}}])
        frappe.set_user("Guest")
        services = personal_meet.get_organization_services(business.slug)
        windows = personal_meet.get_organization_meeting_windows(business.slug, business.offering)
        frappe.set_user("Administrator")
        self.assertEqual(services["local_company"]["am"], BUSINESS_AM)
        self.assertEqual(services["local_business_description"], {"en": "Natural hair care in Bole.", "am": DESCRIPTION_AM})
        self.assertEqual(services["providers"][0]["local_name"], {"en": "Hanna Tesfaye", "am": PROVIDER_AM})
        self.assertEqual(services["services"][0]["provider_local_name"]["am"], PROVIDER_AM)
        self.assertEqual(windows["local_company"]["am"], BUSINESS_AM)
        self.assertEqual(windows["offerings"][0]["provider"]["local_name"]["am"], PROVIDER_AM)
        for offset in range(1, 14):
            rows = booking.service_slots(business.offering, add_days(nowdate(), offset))["all_available_slots_for_data"]
            if rows:
                self.assertEqual(rows[0]["provider_local_name"], {"en": "Hanna Tesfaye", "am": PROVIDER_AM})
                break
        else:
            self.fail("No times in the next two weeks.")

    def test_directory_and_link_previews_use_the_page_language(self):
        business, _provider, _saved = self._named_business()
        page = directory.booking_pages([business.organization])[business.organization]
        self.assertEqual(page["names"]["am"], BUSINESS_AM)
        self.assertEqual(page["descriptions"]["am"], DESCRIPTION_AM)
        self.assertEqual(page["descriptions"]["en"], "Natural hair care in Bole.")
        owner = business_owner.from_key(business.organization)
        self.assertEqual(sharing._owner_name(owner, "am"), BUSINESS_AM)
        self.assertEqual(sharing._owner_name(owner, "en"), owner.display_name)

    def test_an_empty_amharic_name_falls_back_to_english(self):
        row = {"display_name": "Hanna Tesfaye", "display_name_am": "  "}
        self.assertEqual(localized_names.provider_names(row), {"en": "Hanna Tesfaye"})
        self.assertEqual(localized_names.in_language(localized_names.provider_names(row), "am"), "Hanna Tesfaye")
        self.assertEqual(localized_names.in_language({"en": "Tena", "am": "ጤና"}, "am"), "ጤና")
        self.assertEqual(localized_names.in_language({"am": "ጤና"}, "en"), "ጤና")

    def test_showcase_portraits_offer_the_small_avatar(self):
        warm = "/assets/appointment/brand-experience/providers/warm/hanna-tesfaye.webp"
        self.assertEqual(localized_names.avatar(warm), warm.replace(".webp", "-192.webp"))
        for other in ("/files/owner-photo.webp", "/assets/appointment/brand-experience/providers/missing.webp", None):
            self.assertEqual(localized_names.avatar(other), other)

    # Owner settings ----------------------------------------------------------
    def test_only_a_manager_edits_the_names_of_their_own_business_and_providers(self):
        business, provider, _saved = self._named_business()
        other = self._org("Tena Clinic")
        frappe.set_user(other.user)
        with self.assertRaises(frappe.PermissionError):
            public_names.save_business_names(business.organization, "Bole Bloom", "ቦሌ")
        stranger = frappe.db.get_value("EventType", other.offering, "provider")
        frappe.set_user(business.user)
        with self.assertRaises(frappe.PermissionError):
            public_names.save_business_names(business.organization, "Bole Bloom", providers=[{"id": stranger, "name": "X"}])
        with self.assertRaises(frappe.ValidationError):
            public_names.save_business_names(business.organization, "  ")
        with self.assertRaises(frappe.ValidationError):
            public_names.save_business_names(business.organization, "Bole Bloom", "<b>ቦሌ</b>")
        self.assertEqual([row["organization"] for row in public_names.business_names()], [business.organization])
        frappe.set_user("Administrator")
        self.assertEqual(frappe.db.get_value("Provider", provider, "display_name_am"), PROVIDER_AM)

    def test_a_provider_edits_their_own_public_name_in_both_languages(self):
        solo = self._solo("Rahel Nutrition")
        frappe.set_user(solo.user)
        onboarding.update_provider_profile(display_name="Rahel Girma", display_name_am=" ራሔል  ግርማ ")
        onboarding.get_provider_profile()
        profile = frappe.response["message"]
        frappe.set_user("Guest")
        offering = independent.public_offering(solo.offering)
        frappe.set_user("Administrator")
        self.assertEqual((profile["display_name"], profile["display_name_am"]), ("Rahel Girma", "ራሔል ግርማ"))
        self.assertEqual(offering["business_local_name"]["am"], "ራሔል ግርማ")

    def test_the_website_keeps_its_amharic_name_for_publishing(self):
        business, _provider, _saved = self._named_business()
        frappe.set_user(business.user)
        draft = setup.start("Organization", business.organization, "Bole Bloom", "bloom-" + frappe.generate_hash(length=8), "bloom-hair")
        site = frappe.get_doc("Public Site", draft["site"])
        # Without its own Amharic name, the website takes the business's Amharic name.
        self.assertEqual(publisher._local_title(site), {"am": BUSINESS_AM})
        saved = setup.save(draft["site"], draft["draftVersion"], "brand", title_am="ብሉም")
        frappe.set_user("Administrator")
        self.assertEqual(saved["titleAm"], "ብሉም")
        self.assertEqual(publisher._local_title(frappe.get_doc("Public Site", draft["site"])), {"am": "ብሉም"})
        self.assertEqual((saved["recipeVersion"], saved["latestRecipeVersion"]), (latest_version("bloom-hair"),) * 2)

    # Places, manage booking, My bookings and messages ------------------------
    def _named_place(self, business):
        """The business's place with an Amharic name and address, saved by its owner in Settings › Locations."""
        place = frappe.db.get_value("EventType", business.offering, "location")
        row = frappe.db.get_value("Location", place, ["location_name", "timezone"], as_dict=True)
        frappe.set_user(business.user)
        saved = locations.save(business.organization, row.location_name, location=place, address_line_1="Bole, off Africa Avenue",
                               address_line_2="Main studio", city="Addis Ababa", timezone=row.timezone,
                               location_name_am=f"  {PLACE_AM} ", address_am=ADDRESS_AM)
        frappe.set_user("Administrator")
        return place, saved

    def test_owners_name_their_places_in_amharic_and_public_pages_send_both(self):
        business, _provider, _saved = self._named_business()
        place, saved = self._named_place(business)
        self.assertEqual((saved["location_name_am"], saved["address_am"]), (PLACE_AM, ADDRESS_AM))
        # Saving without the Amharic values (an older client) keeps them.
        frappe.set_user(business.user)
        locations.save(business.organization, saved["location_name"], location=place, address_line_1="Bole, off Africa Avenue",
                       city="Addis Ababa", timezone=saved["timezone"])
        with self.assertRaises(frappe.ValidationError):
            locations.save(business.organization, saved["location_name"], location=place, address_line_1="Bole, off Africa Avenue",
                           city="Addis Ababa", timezone=saved["timezone"], address_am="<b>ቦሌ</b>")
        frappe.set_user("Guest")
        windows = personal_meet.get_organization_meeting_windows(business.slug, business.offering)
        frappe.set_user("Administrator")
        self.assertEqual(frappe.db.get_value("Location", place, "location_name_am"), PLACE_AM)
        self.assertEqual(windows["location"]["local_location_name"], {"en": saved["location_name"], "am": PLACE_AM})
        self.assertEqual(windows["location"]["local_address"], {"en": "Bole, off Africa Avenue, Addis Ababa", "am": ADDRESS_AM})
        self.assertEqual(windows["offerings"][0]["location"]["local_location_name"]["am"], PLACE_AM)

    def test_an_online_place_has_no_address_in_any_language(self):
        row = {"location_name": "Online room", "location_name_am": "የኦንላይን ክፍል", "address_line_1": "Bole", "address_am": "ቦሌ",
               "location_type": "Online"}
        self.assertEqual(localized_names.place_names(row), {"local_location_name": {"en": "Online room", "am": "የኦንላይን ክፍል"},
                                                            "local_address": {}})
        self.assertEqual(localized_names.location_addresses({"address_line_1": "", "city": "Addis Ababa"}), {})
        self.assertEqual(localized_names.for_language({"am": "ጤና"}, "am", "Tena"), "ጤና")
        self.assertEqual(localized_names.for_language({"am": "ጤና"}, "en", "Tena"), "Tena")
        self.assertEqual(localized_names.for_language({}, "am", "Tena"), "Tena")

    def test_an_independent_offering_sends_its_place_in_both_languages(self):
        solo = self._solo("Rahel Nutrition")
        place = frappe.db.get_value("EventType", solo.offering, "location")
        frappe.db.set_value("Location", place, {"address_line_1": "Kazanchis", "location_name_am": "የካዛንቺስ ቢሮ", "address_am": "ካዛንቺስ፣ አዲስ አበባ"})
        frappe.set_user("Guest")
        offering = independent.public_offering(solo.offering)
        frappe.set_user("Administrator")
        self.assertEqual(offering["location"]["local_location_name"]["am"], "የካዛንቺስ ቢሮ")
        self.assertEqual(offering["location"]["local_address"]["am"], "ካዛንቺስ፣ አዲስ አበባ")

    def test_manage_booking_and_my_bookings_carry_the_amharic_names(self):
        business, _provider, _saved = self._named_business()
        place, _ = self._named_place(business)
        doc = self._book(business, 0, "Liya Tadesse")
        view = self_service._projection(doc)
        self.assertEqual(view["local_names"]["business"]["am"], BUSINESS_AM)
        self.assertEqual(view["local_names"]["provider"], {"en": "Hanna Tesfaye", "am": PROVIDER_AM})
        self.assertEqual(view["local_names"]["location"]["am"], PLACE_AM)
        self.assertEqual(view["local_names"]["address"]["am"], ADDRESS_AM)
        owner = business_owner.from_key(business.organization)
        frappe.set_user("Guest")
        listing = my_bookings.bookings(slug=business.slug, session=my_bookings.session_token(owner.key, doc.client_email),
                                       email=doc.client_email)
        frappe.set_user("Administrator")
        self.assertEqual(listing["local_business_name"]["am"], BUSINESS_AM)
        self.assertEqual(listing["upcoming"][0]["local_provider"]["am"], PROVIDER_AM)
        self.assertEqual(frappe.db.get_value("Appointment", doc.name, "location"), place)

    def test_amharic_messages_use_the_amharic_names_and_english_messages_do_not(self):
        business, _provider, _saved = self._named_business()
        self._named_place(business)
        doc = self._book(business, 0, "Liya Tadesse")
        amharic = notification_email.render("Confirmation", doc, "am", doc.client_email)
        english = notification_email.render("Confirmation", doc, "en", doc.client_email)
        for name in (BUSINESS_AM, PROVIDER_AM, PLACE_AM):
            self.assertIn(name, amharic["html"])
            self.assertNotIn(name, english["html"])
        self.assertIn(BUSINESS_AM, amharic["subject"])
        sms = {language: notification_sms.render("Confirmation", doc, language) for language in ("am", "en")}
        self.assertIn(BUSINESS_AM, sms["am"])
        self.assertNotIn(BUSINESS_AM, sms["en"])
        # The segment guard still holds: Amharic is UCS-2 and stays within two parts.
        self.assertLessEqual(touchpoints.sms_parts(sms["am"]), 2)
        with mock.patch("appointment.scheduler.my_bookings.frappe.sendmail") as sendmail:
            my_bookings._send_link(business_owner.from_key(business.organization), doc.client_email, "am")
        self.assertIn(BUSINESS_AM, sendmail.call_args.kwargs["subject"])

    # Template version 1 -------------------------------------------------------
    def test_retired_versions_render_but_are_not_offered(self):
        offered = {recipe.key: recipe.version for recipe in available_recipes()}
        for key, retired in RETIRED_VERSIONS.items():
            self.assertTrue(retired)
            self.assertNotIn(offered[key], retired, key)
            for version in retired:
                self.assertTrue(is_retired(key, version))
                pinned = get_recipe(key, version)  # still loadable for releases that pin it
                design = compile_design(key, version, {"motion": "calm"}, None, ["en", "am"]).as_dict()
                self.assertEqual((pinned.version, design["layout"]["rendererVersion"]), (version, version))
                with self.assertRaises(UnknownRecipeError):
                    require_offered(key, version)
                require_offered(key, version, (key, version))  # a document already on it keeps it
        self.assertTrue(is_retired("ergata-therapy", 1))
        self.assertFalse(is_retired("ergata-therapy", 2))

    def test_a_new_site_cannot_start_on_a_retired_version(self):
        business = self._org("Selam Movement")
        frappe.set_user(business.user)
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc({"doctype": "Public Site", "owner_type": "Organization", "organization": business.organization,
                            "site_title": "Selam", "slug": "selam-" + frappe.generate_hash(length=8),
                            "recipe_key": "selam-movement", "recipe_version": 1}).insert()
        draft = setup.start("Organization", business.organization, "Selam", "selam-" + frappe.generate_hash(length=8), "selam-movement")
        frappe.set_user("Administrator")
        self.assertEqual(frappe.db.get_value("Public Site", draft["site"], "recipe_version"), latest_version("selam-movement"))

    def test_a_draft_profile_on_a_retired_version_starts_the_site_on_the_latest(self):
        business = self._org("Meron Atelier")
        frappe.set_user(business.user)
        draft = setup.start("Organization", business.organization, "Meron", "meron-" + frappe.generate_hash(length=8), "meron-atelier")
        frappe.set_user("Administrator")
        # An old profile left from an archived website (written directly, as an old release would have it).
        frappe.db.set_value("Brand Profile", draft["profile"], "recipe_version", 1)
        frappe.db.set_value("Public Site", draft["site"], {"status": "Archived", "active_owner_key": None})
        frappe.set_user(business.user)
        again = setup.start("Organization", business.organization, "Meron", "meron-" + frappe.generate_hash(length=8), "meron-atelier")
        frappe.set_user("Administrator")
        self.assertEqual(frappe.db.get_value("Brand Profile", again["profile"], "recipe_version"), latest_version("meron-atelier"))

    def test_go_live_lists_published_websites_on_an_older_version(self):
        rows = [frappe._dict(name="s1", slug="old-salon", current_release="r1"), frappe._dict(name="s2", slug="new-salon", current_release="r2")]
        releases = [frappe._dict(name="r1", recipe_key="bloom-hair", recipe_version=1),
                    frappe._dict(name="r2", recipe_key="bloom-hair", recipe_version=latest_version("bloom-hair"))]
        with mock.patch.object(readiness_sites.frappe, "get_all", side_effect=[rows, releases]):
            row = readiness_sites.PublicSites().template_versions()
        self.assertEqual(row["status"], WARN)
        self.assertIn("/old-salon: bloom-hair v1 (retired)", row["detail"])
        self.assertNotIn("new-salon", row["detail"])
        self.assertIn("Republish to upgrade", row["fix"])
        with mock.patch.object(readiness_sites.frappe, "get_all", side_effect=[rows[1:], releases[1:]]):
            self.assertEqual(readiness_sites.PublicSites().template_versions()["status"], PASS)
        self.assertIn("template_versions", {row["key"] for row in go_live.report()["checks"]})


class TestNamesHelpers(ReferralCase):
    def test_pair_drops_empty_values_and_limits_length(self):
        self.assertEqual(localized_names.pair(" Tena  Clinic ", ""), {"en": "Tena Clinic"})
        self.assertEqual(len(localized_names.pair("x" * 300, None)["en"]), 140)
        self.assertEqual(localized_names.organization_descriptions(SimpleNamespace(get={"description": "a", "description_am": "ለ"}.get)),
                         {"en": "a", "am": "ለ"})
