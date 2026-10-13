"""Online locations: the location type, the private meeting link of a booking, and who may see it.

Each test makes two independent businesses with their own owner accounts inside a savepoint and rolls them
back; `frappe.db.commit` is patched so nothing persists. Email is muted on the development site, so mail
only creates Email Queue rows. See docs/growth/ONLINE_LOCATIONS.md.

Run: bench --site <site> run-tests --module appointment.tests.test_online_locations
"""

import json
import unittest
from datetime import timedelta
from unittest.mock import patch

import frappe
from frappe.utils import add_days, get_datetime, nowdate

from appointment.public_experience import api as public_api
from appointment.public_experience import solo_setup
from appointment.scheduler import booking, business_owner, independent, locations, my_bookings, notification_email
from appointment.scheduler import notification_sms, online_meeting, self_service

FIXED_LINK = "https://meet.google.com/abc-defg-hij"


class OnlineLocationCase(unittest.TestCase):
    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("online_locations")
        commit = patch("frappe.db.commit")
        commit.start()
        self.addCleanup(commit.stop)
        syncing = frappe.flags.syncing_booking_urls
        frappe.flags.syncing_booking_urls = True
        self.addCleanup(setattr, frappe.flags, "syncing_booking_urls", syncing)
        self.tag = frappe.generate_hash(length=6)
        self.owner, self.provider = self._business("Meron", "Meron Tadesse Counselling")
        self.other, self.other_provider = self._business("Dawit", "Dawit Alemu Therapy")
        frappe.set_user(self.owner)
        self.key = business_owner.PREFIX + self.provider
        self.service = business_owner.from_key(self.key).services[0]

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="online_locations")

    def _business(self, first, name):
        frappe.set_user("Administrator")
        user = f"{first.lower()}.{self.tag}@example.test"
        frappe.get_doc(dict(doctype="User", email=user, first_name=first, last_name="Online", send_welcome_email=0,
                            enabled=1, user_type="Website User")).insert(ignore_permissions=True)
        frappe.set_user(user)
        provider = solo_setup.create(f"{name} {self.tag}", service_name="Individual session", publish=1)["provider"]
        return user, provider

    def _online_place(self, mode=online_meeting.FIXED, link=FIXED_LINK, platform="Google Meet"):
        frappe.set_user(self.owner)
        place = locations.save(self.key, f"Online room {self.tag} {mode[:3]}", online_meeting.ONLINE,
                               video_platform=platform, meeting_link_mode=mode, meeting_link=link, sessions=[self.service])
        offering = frappe.db.get_value("EventType", {"location": place["name"], "service": self.service}, "name")
        return place, offering

    def _first_offering(self):
        """The in-person offering that solo setup made."""
        return frappe.get_all("EventType", filters={"provider": self.provider}, pluck="name", order_by="creation asc", limit=1)[0]

    def _book(self, offering, email=None, phone=""):
        frappe.set_user("Guest")
        for offset in range(1, 15):
            free = [row for row in booking.slots(offering, add_days(nowdate(), offset))["all_available_slots_for_data"] if row["available"]]
            if free:
                result = booking.book(offering, free[0]["start_time"], free[0]["end_time"], "Hanna Girma",
                                      email or f"hanna.{frappe.generate_hash(length=6)}@example.test",
                                      frappe.generate_hash(length=24), user_phone=phone, language="en")
                frappe.set_user("Administrator")
                return result, frappe.get_doc("Appointment", {"appointment_id": result["booking_id"]})
        self.skipTest("No free time in the next two weeks.")


class TestLocationType(OnlineLocationCase):
    def test_existing_and_new_places_are_in_person_by_default(self):
        first = self._first_offering()
        location = frappe.get_doc("Location", frappe.db.get_value("EventType", first, "location"))
        self.assertEqual(location.location_type, online_meeting.IN_PERSON)
        self.assertEqual((location.video_platform or "", location.meeting_link or ""), ("", ""))

    def test_online_place_needs_an_https_link_for_a_fixed_link(self):
        for bad in ("http://meet.example.com/room", "javascript:alert(1)", "meet.google.com/abc", "https://localhost/room",
                    "https://user:secret@meet.example.com/room", "https://meet.example.com/a b"):
            with self.assertRaises(frappe.ValidationError, msg=bad):
                self._online_place(link=bad)
        with self.assertRaises(frappe.ValidationError):
            self._online_place(link="")

    def test_per_booking_place_keeps_no_link_and_in_person_clears_online_fields(self):
        place, _offering = self._online_place(mode=online_meeting.PER_BOOKING, link=FIXED_LINK)
        self.assertEqual(frappe.db.get_value("Location", place["name"], "meeting_link") or "", "")
        doc = frappe.get_doc("Location", place["name"])
        doc.update({"location_type": online_meeting.IN_PERSON, "address_line_1": "Africa Avenue"})
        doc.save(ignore_permissions=True)
        self.assertEqual((doc.video_platform, doc.meeting_link), ("", ""))

    def test_in_person_place_needs_a_street_address(self):
        with self.assertRaises(frappe.ValidationError):
            locations.save(self.key, f"Office {self.tag}", online_meeting.IN_PERSON, address_line_1="")

    def test_other_business_cannot_manage_the_place(self):
        place, _offering = self._online_place()
        frappe.set_user(self.other)
        self.assertNotIn(place["name"], [row["name"] for row in locations.overview()["locations"]])
        with self.assertRaises(frappe.PermissionError):
            locations.save(self.key, "Taken over", online_meeting.ONLINE, location=place["name"], meeting_link=FIXED_LINK)
        with self.assertRaises(frappe.PermissionError):
            locations.remove(place["name"])
        with self.assertRaises(frappe.PermissionError):
            frappe.get_doc("Location", place["name"]).check_permission("read")

    def test_walk_in_refuses_an_online_place(self):
        place, _offering = self._online_place()
        frappe.set_user("Administrator")
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc(dict(doctype="Walk In", client_name="Abel", client_phone="0911000000", location=place["name"],
                                independent_provider=self.provider, status="waiting")).insert(ignore_permissions=True)


class TestOnlineBooking(OnlineLocationCase):
    def test_booking_at_online_place_is_online_and_copies_the_fixed_link(self):
        _place, offering = self._online_place()
        result, doc = self._book(offering)
        self.assertEqual((doc.is_online, doc.meeting_link), (1, FIXED_LINK))
        self.assertNotIn(FIXED_LINK, json.dumps(result), "the booking response is not a private channel")
        _result, in_person = self._book(self._first_offering())
        self.assertEqual((in_person.is_online, in_person.meeting_link or ""), (0, ""))

    def test_public_payloads_never_contain_the_link(self):
        _place, offering = self._online_place()
        _result, doc = self._book(offering)
        # A service offered both in person and online has no single format; make this one online only.
        mixed = public_api._session_formats(provider=self.provider)[0]
        self.assertNotIn(self.service, mixed)
        frappe.db.set_value("EventType", self._first_offering(), "is_active", 0)
        frappe.set_user("Guest")
        payloads = [
            independent.public_offering(offering),
            booking.slots(offering, add_days(nowdate(), 1)),
            public_api._session_formats(provider=self.provider),
        ]
        text = json.dumps(payloads, default=str)
        self.assertNotIn("meet.google.com", text)
        public = payloads[0]["location"]
        self.assertEqual((public["location_type"], public["platform"], public["address"]), ("online", "Google Meet", ""))
        sessions, places = payloads[2]
        self.assertEqual(sessions[self.service]["locationType"], "online")
        self.assertIn("online", {row["locationType"] for row in places.values()})
        self.assertIn("in_person", {row["locationType"] for row in places.values()})

    def test_owner_sets_a_per_booking_link_and_other_business_cannot(self):
        _place, offering = self._online_place(mode=online_meeting.PER_BOOKING, link="")
        _result, doc = self._book(offering)
        self.assertEqual((doc.is_online, doc.meeting_link or ""), (1, ""))
        link = "https://zoom.us/j/9876543210"

        frappe.set_user(self.other)
        with self.assertRaises(frappe.PermissionError):
            online_meeting.for_booking(doc.name)
        with self.assertRaises(frappe.PermissionError):
            online_meeting.set_link(doc.name, link, str(doc.modified))

        frappe.set_user(self.owner)
        with self.assertRaises(frappe.ValidationError):
            online_meeting.set_link(doc.name, "http://zoom.us/j/1", str(doc.modified))
        view = online_meeting.set_link(doc.name, link, str(doc.modified))
        self.assertEqual((view["meeting_link"], view["can_change"]), (link, True))
        self.assertEqual(view["notification_status"], "queued")
        self.assertEqual(frappe.db.get_value("Appointment", doc.name, "meeting_link"), link)
        events = frappe.get_all("Appointment Notification", filters={"appointment": doc.name}, pluck="event")
        self.assertIn("Meeting link", events)
        with self.assertRaises(frappe.TimestampMismatchError):
            online_meeting.set_link(doc.name, link, str(doc.modified))

    def test_in_person_booking_has_no_meeting_link(self):
        _result, doc = self._book(self._first_offering())
        frappe.set_user(self.owner)
        with self.assertRaises(frappe.ValidationError):
            online_meeting.set_link(doc.name, FIXED_LINK, str(doc.modified))


class TestCustomerChannels(OnlineLocationCase):
    def test_email_and_sms_carry_only_this_customers_link(self):
        _place, offering = self._online_place(mode=online_meeting.PER_BOOKING, link="")
        _first, mine = self._book(offering, email="hanna.mine@example.test", phone="0911223344")
        _second, theirs = self._book(offering, email="abel.theirs@example.test")
        frappe.set_user(self.owner)
        online_meeting.set_link(mine.name, "https://zoom.us/j/1111111111", str(mine.modified))
        theirs.reload()
        online_meeting.set_link(theirs.name, "https://zoom.us/j/2222222222", str(theirs.modified))
        frappe.set_user("Administrator")
        mine.reload()
        for event in ("Confirmation", "Reminder", "Meeting link"):
            for language in ("en", "am"):
                html = notification_email.render(event, mine, language, mine.client_email)["html"]
                self.assertIn("https://zoom.us/j/1111111111", html, (event, language))
                self.assertNotIn("2222222222", html)
                sms = notification_sms.render(event, mine, language)
                self.assertIn("https://zoom.us/j/1111111111", sms, (event, language))
                self.assertNotIn("2222222222", sms)
        cancelled = notification_email.render("Cancellation", mine, "en", mine.client_email)["html"]
        self.assertNotIn("1111111111", cancelled, "a closed booking does not repeat the link")

    def test_email_without_a_link_yet_says_it_will_follow(self):
        _place, offering = self._online_place(mode=online_meeting.PER_BOOKING, link="")
        _result, doc = self._book(offering)
        html = notification_email.render("Confirmation", doc, "en", doc.client_email)["html"]
        self.assertIn("We will send you the session link before your session.", html)
        self.assertIn("Online video · Google Meet", html)

    def test_manage_page_needs_the_token_and_shows_the_join_window(self):
        _place, offering = self._online_place()
        _result, doc = self._book(offering)
        frappe.set_user("Guest")
        for token in ("", "nonsense", f"{doc.name}.0.{'0' * 32}", f"{doc.name}.{doc.manage_version + 1}.{self_service._sign(doc.name, doc.manage_version + 1)}"):
            view = self_service.view(token, independent=1)
            self.assertFalse(view["valid"])
            self.assertNotIn("meet.google.com", json.dumps(view, default=str))
        view = self_service.view(self_service.token_for(doc), independent=1)
        online = view["booking"]["online"]
        self.assertEqual((view["booking"]["location_type"], online["meeting_link"], online["platform"]), ("online", FIXED_LINK, "Google Meet"))
        self.assertIsNone(view["booking"]["address"])
        opens = get_datetime(online["join_opens_at"].rstrip("Z"))
        self.assertEqual(get_datetime(doc.starts_at) - opens, timedelta(minutes=online_meeting.JOIN_LEAD_MINUTES))

    def test_online_manage_link_works_until_the_end(self):
        _place, offering = self._online_place()
        _result, doc = self._book(offering)
        during = get_datetime(doc.starts_at) + timedelta(minutes=10)
        self.assertTrue(self_service._link_open(doc, during))
        self.assertFalse(self_service._link_open(doc, get_datetime(doc.ends_at) + timedelta(minutes=1)))
        self.assertEqual(self_service.decide(doc, during)["can_cancel"], False)

    def test_my_bookings_shows_the_link_only_with_a_session(self):
        _place, offering = self._online_place()
        _result, doc = self._book(offering, email="hanna.list@example.test")
        frappe.set_user("Guest")
        refused = my_bookings.bookings(offering=offering, session="1.bad", email=doc.client_email)
        self.assertFalse(refused["valid"])
        session = my_bookings.session_token(self.key, doc.client_email)
        listing = my_bookings.bookings(offering=offering, session=session, email=doc.client_email)
        [row] = [row for row in listing["upcoming"] if row["reference"] == doc.appointment_id]
        self.assertEqual((row["location_type"], row["online"]["meeting_link"]), ("online", FIXED_LINK))
        frappe.set_user("Guest")
        other = my_bookings.bookings(offering=offering, session=my_bookings.session_token(self.key, "someone@example.test"),
                                     email="someone@example.test")
        self.assertNotIn("meet.google.com", json.dumps(other, default=str))
