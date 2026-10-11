"""Customer touchpoints: "Powered by" in emails and SMS, book-again links, and the customer-to-business prompt.

Bloom bookings come from the rich demo (the class skips without it). Independent businesses are made
inside each test and rolled back. See docs/growth/TOUCHPOINTS.md.
"""

import time
import unittest
from datetime import timedelta
from unittest.mock import patch

import frappe
from frappe.utils import add_days, get_url, now_datetime, nowdate

from appointment.growth import business_prompt, touchpoints
from appointment.public_experience import solo_setup
from appointment.scheduler import booking, independent, my_bookings, notification_sms, self_service
from appointment.scheduler.notification_email import render
from appointment.tests import demo_offerings
from appointment.tests.test_guest_endpoints import GuestRequest, calls_until_limited

OWNER = "bloom.owner@example.test"
OFFERING = demo_offerings.cut_rahel()
CUSTOMER = "Liya Haile"
PHONE = "0911445566"


def growth_with(**changes):
    """Patch Growth Settings values for the code under test, keeping the language-resolved texts."""
    original = touchpoints.growth

    def patched():
        return {**original(), **changes}

    return patch.multiple(touchpoints, growth=patched), patch.object(business_prompt, "growth", patched)


class TouchpointCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        frappe.set_user("Administrator")
        cls.org = frappe.db.get_value("Organization", {"owner_user": OWNER}, "name")
        if not cls.org or not OFFERING or not frappe.db.exists("EventType", OFFERING):
            raise unittest.SkipTest("Rich demo businesses are not seeded on this site.")
        cls.slug = frappe.db.get_value("Organization", cls.org, "slug")

    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("growth_touchpoints")
        # Nothing in a test may commit: the booking-URL sync and setup helpers stay inside the savepoint.
        commit = patch("frappe.db.commit")
        commit.start()
        self.addCleanup(commit.stop)
        syncing = frappe.flags.syncing_booking_urls
        frappe.flags.syncing_booking_urls = True
        self.addCleanup(setattr, frappe.flags, "syncing_booking_urls", syncing)

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="growth_touchpoints")

    def _slot(self, offering, index=0):
        for offset in range(2, 30):
            found = [s for s in booking.slots(offering, add_days(nowdate(), offset))["all_available_slots_for_data"] if s["available"]]
            if len(found) > index:
                return found[index]
        self.skipTest("No free slots in the next month.")

    def _book(self, offering=None, email=None, index=0, language=None):
        offering = offering or OFFERING
        slot = self._slot(offering, index)
        frappe.set_user("Guest")
        result = booking.book(
            offering, slot["start_time"], slot["end_time"], CUSTOMER, email or f"qa-tp-{frappe.generate_hash(length=8)}@example.test",
            frappe.generate_hash(length=24), user_phone=PHONE, organization_id=None if offering != OFFERING else self.org,
            language=language,
        )
        frappe.set_user("Administrator")
        return result, frappe.get_doc("Appointment", result["booking_id"])

    def _independent(self):
        user = f"qa-tp-owner-{frappe.generate_hash(length=6)}@example.test"
        frappe.get_doc(dict(doctype="User", email=user, first_name="Meron", last_name="Alemu", send_welcome_email=0,
                            enabled=1, user_type="Website User")).insert(ignore_permissions=True)
        frappe.set_user(user)
        provider = solo_setup.create("Meron Alemu Studio")["provider"]
        row = independent.create(provider, "Meron Alemu Studio", "Skin consultation", "Africa/Addis_Ababa", 30, "09:00", "17:00",
                                 list(independent.DAYS))
        independent.publish(provider, 1)
        frappe.set_user("Administrator")
        return provider, row["offering"]


class TestEmailFooter(TouchpointCase):
    def test_footer_follows_the_flag_and_the_language(self):
        _result, doc = self._book()
        for language, text in (("en", "Get your own booking page"), ("am", "የራስዎን የቀጠሮ ገጽ")):
            with touchpoints.language(language):
                own_page = touchpoints.growth()["own_page_text"]
            self.assertIn(text, own_page)
            html = render("Confirmation", doc, language, doc.client_email)["html"]
            self.assertIn("source=powered_by_email", html)
            self.assertIn(frappe.utils.escape_html(own_page), html)
            self.assertIn(touchpoints.brand()["product_name"], html)
        first, second = growth_with(powered_by_emails=False)
        with first, second:
            for event in ("Confirmation", "Reminder", "Cancellation"):
                html = render(event, doc, "en", doc.client_email)["html"]
                self.assertNotIn("powered_by_email", html)

    def test_every_customer_event_carries_the_footer(self):
        _result, doc = self._book()
        for event in ("Confirmation", "Reschedule", "Reminder", "Cancellation"):
            self.assertIn("source=powered_by_email", render(event, doc, "en", doc.client_email)["html"], event)


class TestBookAgain(TouchpointCase):
    def test_organization_link_preselects_the_service(self):
        _result, doc = self._book()
        expected = get_url(f"/schedule/org/{self.slug}/{OFFERING}")
        self.assertEqual(touchpoints.book_again_url(doc), expected)
        for event in ("Confirmation", "Reminder"):
            html = render(event, doc, "en", doc.client_email)["html"]
            self.assertIn(expected, html, event)
            self.assertIn("Book again in 10 seconds", html)
        self.assertNotIn(expected, render("Cancellation", doc, "en", doc.client_email)["html"])
        first, second = growth_with(book_again_enabled=False)
        with first, second:
            html = render("Reminder", doc, "en", doc.client_email)["html"]
            self.assertNotIn(expected, html)
            self.assertIn(get_url(f"/{self.slug}/book"), html)

    def test_independent_link_and_fallback(self):
        provider, offering = self._independent()
        _result, doc = self._book(offering)
        self.assertEqual(touchpoints.book_again_url(doc), get_url(f"/schedule/individual/{offering}"))
        owner = frappe._dict(organization=None, provider=provider, slug=None, book_path="/schedule/individual/first")
        with patch.object(touchpoints, "_bookable", return_value=False):  # The offering is no longer public.
            self.assertEqual(touchpoints.book_again_path(owner, offering), "/schedule/individual/first")
        self.assertEqual(touchpoints.book_again_path(None, offering), "")

    def test_my_bookings_lists_book_again_for_past_bookings_only(self):
        _result, doc = self._book()
        _later, upcoming = self._book(email=doc.client_email, index=1)
        frappe.db.set_value("Appointment", doc.name, {"status": "Completed", "starts_at": now_datetime() - timedelta(days=3),
                                                      "ends_at": now_datetime() - timedelta(days=3, minutes=-30)}, update_modified=False)
        session = my_bookings.session_token(self.org, doc.client_email)
        frappe.set_user("Guest")
        listed = my_bookings.bookings(slug=self.slug, session=session, email=doc.client_email)
        [past] = listed["past"]
        self.assertEqual(past["book_again_path"], f"/schedule/org/{self.slug}/{OFFERING}")
        self.assertTrue(all("book_again_path" not in row and "offering" not in row for row in listed["upcoming"]))
        first, second = growth_with(book_again_enabled=False)
        with first, second, patch("appointment.growth.settings.growth", touchpoints.growth):
            self.assertIsNone(my_bookings.bookings(slug=self.slug, session=session, email=doc.client_email)["past"][0]["book_again_path"])


class TestSmsSegments(unittest.TestCase):
    def test_gsm_and_ucs2_limits(self):
        self.assertEqual(touchpoints.sms_encoding("Hello {there}"), "GSM")
        self.assertEqual(touchpoints.sms_encoding("Page — free"), "UCS-2")
        self.assertEqual(touchpoints.sms_encoding("ቀጠሮ"), "UCS-2")
        self.assertEqual(touchpoints.sms_parts("a" * 160), 1)
        self.assertEqual(touchpoints.sms_parts("a" * 161), 2)
        self.assertEqual(touchpoints.sms_parts("a" * 306), 2)
        self.assertEqual(touchpoints.sms_parts("a" * 307), 3)
        self.assertEqual(touchpoints.sms_parts("a" * 159 + "€"), 2, "An extension character costs two septets.")
        self.assertEqual(touchpoints.sms_parts("ሀ" * 70), 1)
        self.assertEqual(touchpoints.sms_parts("ሀ" * 71), 2)
        self.assertEqual(touchpoints.sms_parts("ሀ" * 134), 2)
        self.assertEqual(touchpoints.sms_parts("ሀ" * 135), 3)

    def test_a_line_is_added_only_when_it_costs_no_extra_segment(self):
        self.assertEqual(touchpoints.append_if_fits("a" * 100, "b" * 59), "a" * 100 + "\n" + "b" * 59)
        self.assertEqual(touchpoints.append_if_fits("a" * 100, "b" * 60), "a" * 100)
        self.assertEqual(touchpoints.append_if_fits("ሀ" * 60, "ለ" * 10), "ሀ" * 60)
        self.assertEqual(touchpoints.append_if_fits("ሀ" * 80, "ለ" * 40), "ሀ" * 80 + "\n" + "ለ" * 40)
        # An English line that is not GSM would turn the message into UCS-2 and cost a segment.
        self.assertEqual(touchpoints.append_if_fits("a" * 60, "free — now"), "a" * 60)
        self.assertEqual(touchpoints.append_if_fits("text", ""), "text")


class TestSmsLines(TouchpointCase):
    def test_lines_respect_flags_and_segments(self):
        _result, doc = self._book()
        text = notification_sms.render("Reminder", doc, "en")
        self.assertEqual(touchpoints.sms_parts(text), 1)
        if "powered_by_sms" in text:
            self.assertIn(f"{touchpoints.brand()['short_host']}/signup?source=powered_by_sms", text)
        first, second = growth_with(powered_by_sms=False, book_again_enabled=False)
        with first, second:
            plain = notification_sms.render("Reminder", doc, "en")
        self.assertNotIn("\n", plain)
        self.assertLessEqual(touchpoints.sms_parts(text), touchpoints.sms_parts(plain))
        for language in ("en", "am"):
            for event in notification_sms.COPY:
                with first, second:
                    plain = notification_sms.render(event, doc, language)
                self.assertEqual(touchpoints.sms_parts(notification_sms.render(event, doc, language)), touchpoints.sms_parts(plain))

    def test_short_confirmation_gets_the_powered_by_line(self):
        _result, doc = self._book()
        line = touchpoints.sms_with_extras("Confirmation", doc, "en", "Bloom: booked.")
        self.assertIn("source=powered_by_sms", line)
        self.assertNotIn("—", line)
        self.assertEqual(touchpoints.sms_with_extras("Confirmation", doc, "en", "a" * 158), "a" * 158)


class TestBusinessPrompt(TouchpointCase):
    def test_prefill_round_trip_without_personal_data_in_urls(self):
        result, doc = self._book()
        token = self_service.token_for(doc)
        frappe.set_user("Guest")
        self.assertTrue(business_prompt.prompt(token)["show"])
        path = business_prompt.create_prefill(token)["path"]
        self.assertTrue(path.startswith("/signup?source=customer_prompt&prefill="))
        for private in (doc.client_email, CUSTOMER, "Liya", PHONE, "911445566", doc.name, result["booking_id"]):
            self.assertNotIn(private, path)
        prefill = path.split("prefill=")[1]
        details = business_prompt.read_prefill(prefill)
        self.assertEqual((details["full_name"], details["email"], details["business_name"]), (CUSTOMER, doc.client_email, CUSTOMER))
        self.assertNotIn("phone", details)
        # Other links built for customers never carry personal data either.
        for url in (touchpoints.signup_url("powered_by_email"), touchpoints.short_signup_link("powered_by_sms"), touchpoints.book_again_url(doc)):
            self.assertNotIn("@", url)
            self.assertNotIn("Liya", url)

    def test_expired_and_tampered_tokens_are_refused(self):
        _result, doc = self._book()
        frappe.set_user("Guest")
        prefill = business_prompt.create_prefill(self_service.token_for(doc))["path"].split("prefill=")[1]
        later = time.time() + business_prompt.PREFILL_SECONDS + 5
        with patch.object(business_prompt.time, "time", return_value=later):
            self.assertIsNone(business_prompt.load(prefill))
            with self.assertRaises(frappe.PermissionError):
                business_prompt.read_prefill(prefill)
        nonce, expires, signature = prefill.split(".")
        self.assertIsNone(business_prompt.load(f"{nonce}.{int(expires) + 600}.{signature}"))
        self.assertIsNone(business_prompt.load("not-a-token"))
        business_prompt.discard(prefill)
        self.assertIsNone(business_prompt.load(prefill))

    def test_wrong_or_old_booking_cannot_start_the_prompt(self):
        _result, doc = self._book()
        _other, other = self._book(index=1)
        token = self_service.token_for(doc)
        name, version, signature = token.rsplit(".", 2)
        frappe.set_user("Guest")
        for bad in (f"{other.name}.{version}.{signature}", f"{name}.{int(version) + 1}.{signature}", "", None):
            self.assertFalse(business_prompt.prompt(bad)["show"])
            with self.assertRaises(frappe.PermissionError):
                business_prompt.create_prefill(bad)
        frappe.set_user("Administrator")
        frappe.db.set_value("Appointment", doc.name, "creation", now_datetime() - timedelta(hours=1), update_modified=False)
        frappe.set_user("Guest")
        with self.assertRaises(frappe.PermissionError):
            business_prompt.create_prefill(token)

    def test_hidden_for_existing_accounts_staff_and_when_off(self):
        _result, doc = self._book(email=OWNER)
        frappe.set_user("Guest")
        self.assertFalse(business_prompt.prompt(self_service.token_for(doc))["show"], "An owner already has an account.")
        _result, fresh = self._book(index=1)
        token = self_service.token_for(fresh)
        frappe.set_user(OWNER)
        self.assertFalse(business_prompt.prompt(token)["show"], "Signed-in staff do not see it.")
        frappe.set_user("Guest")
        first, second = growth_with(customer_business_prompt_enabled=False)
        with first, second:
            self.assertFalse(business_prompt.prompt(token)["show"])
            with self.assertRaises(frappe.PermissionError):
                business_prompt.create_prefill(token)

    def test_create_prefill_is_rate_limited(self):
        _result, doc = self._book()
        token = self_service.token_for(doc)
        with GuestRequest():
            ran = calls_until_limited(lambda: business_prompt.create_prefill(token), 8)
        self.assertEqual(ran, 5)

    def test_quick_start_makes_a_live_page_with_the_booking_phone(self):
        _result, doc = self._book()
        frappe.set_user("Guest")
        prefill = business_prompt.create_prefill(self_service.token_for(doc))["path"].split("prefill=")[1]
        frappe.set_user("Administrator")
        frappe.get_doc(dict(doctype="User", email=doc.client_email, first_name="Liya", last_name="Haile", send_welcome_email=0,
                            enabled=1, user_type="Website User")).insert(ignore_permissions=True)
        frappe.set_user(doc.client_email)
        created = business_prompt.quick_start("Liya Haile Beauty", "Eyebrow shaping", prefill=prefill)
        provider = frappe.get_doc("Provider", created["provider"])
        self.assertEqual((provider.provider_name, provider.enable_public_booking, provider.phone), ("Liya Haile Beauty", 1, "+251911445566"))
        self.assertTrue(created["public_path"].startswith("/schedule/individual/"))
        frappe.set_user("Guest")
        offering = created["public_path"].rsplit("/", 1)[1]
        self.assertEqual(independent.public_offering(offering)["service"], "Eyebrow shaping")
        self.assertIsNone(business_prompt.load(prefill), "The prefill token is spent.")

    def test_quick_start_needs_a_signed_in_person_and_a_service(self):
        frappe.set_user("Guest")
        with self.assertRaises(frappe.PermissionError):
            business_prompt.quick_start("Shop", "Haircut")
        frappe.set_user("Administrator")
        with self.assertRaises(frappe.ValidationError):
            business_prompt.quick_start("Shop", "  ")
