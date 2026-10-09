"""Customers of independent providers: profiles, emails, manage links and My bookings.

Two independent providers (A and B) each publish one offering. Guests book both
with the same email. Every test rolls back to a savepoint.
See docs/features/INDEPENDENT_PROVIDER_CUSTOMERS_PLAN.md.
"""

from datetime import datetime, timedelta
import json
import sys
import unittest
from unittest import mock

import frappe
import pytz
from frappe.utils import get_url

from appointment.public_experience import solo_setup
from appointment.scheduler import (
    booking, customer_identity, customers, independent, my_bookings, notifications, self_service,
)
from appointment.scheduler.notification_email import send_notification
from appointment.tests.test_content_entitlements import EntitlementIsolationTests, _cleanup, require_target

EMAIL = "selam.tadesse@example.test"


class IndependentCustomerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        EntitlementIsolationTests.setUpClass()
        cls.fixture = EntitlementIsolationTests.state

    @classmethod
    def tearDownClass(cls):
        _cleanup(cls.fixture)

    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("independent_customers")
        self.businesses = {suffix: self._business(suffix) for suffix in ("A", "B")}
        frappe.set_user("Guest")

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="independent_customers")

    def _business(self, suffix):
        frappe.set_user(self.fixture["owners"][suffix])
        provider = solo_setup.create(f"{self.fixture['marker']} Studio {suffix}")["provider"]
        row = independent.create(provider, f"{self.fixture['marker']} Room {suffix}", "Portrait session",
                                 "Africa/Addis_Ababa", 30, "09:00", "17:00", list(independent.DAYS))
        independent.publish(provider, 1)
        frappe.set_user("Administrator")
        return frappe._dict(provider=provider, offering=row["offering"], key="Provider:" + provider,
                            name=frappe.db.get_value("Provider", provider, "provider_name"))

    def _slots(self, offering, count=3):
        for offset in range(2, 20):
            day = (datetime.now() + timedelta(days=offset)).date().isoformat()
            found = [row for row in booking.slots(offering, day)["all_available_slots_for_data"] if row["available"]]
            if len(found) >= count:
                return found
        self.fail("No free independent slots in the next weeks.")

    def _book(self, suffix="A", slot=0, email=EMAIL, phone=""):
        offering = self.businesses[suffix].offering
        start = self._slots(offering)[slot]
        frappe.set_user("Guest")
        result = booking.book(offering, start["start_time"], start["end_time"], "Selam Tadesse", email,
                              frappe.generate_hash(length=24), user_phone=phone)
        return frappe.get_doc("Appointment", result["booking_id"])

    def test_booking_creates_and_links_a_provider_owned_profile(self):
        doc = self._book()
        self.assertFalse(doc.organization)
        profile = frappe.get_doc("Customer Profile", doc.customer)
        self.assertEqual(profile.independent_provider, self.businesses["A"].provider)
        self.assertFalse(profile.organization)
        self.assertEqual(profile.primary_email, EMAIL)

    def test_matching_stays_inside_one_provider(self):
        first = self._book("A", 0, phone="0911223344")
        again = self._book("A", 1, email="other.address@example.test", phone="+251911223344")
        self.assertEqual(again.customer, first.customer, "The phone matches within the provider.")
        elsewhere = self._book("B", 0)
        self.assertNotEqual(elsewhere.customer, first.customer, "The same email at another provider is another customer.")
        self.assertEqual(frappe.db.get_value("Customer Profile", elsewhere.customer, "independent_provider"), self.businesses["B"].provider)
        self.assertEqual(customer_identity.find_by_key(self.businesses["B"].key, phone="0911223344"), {})

    def test_profile_needs_exactly_one_owner(self):
        frappe.set_user("Administrator")
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc(dict(doctype="Customer Profile", display_name="Abel Bekele",
                                organization=self.fixture["orgs"]["A"], independent_provider=self.businesses["A"].provider)).insert()
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc(dict(doctype="Customer Profile", display_name="Abel Bekele")).insert()

    def test_confirmation_email_carries_the_provider_name_and_manage_link(self):
        doc = self._book()
        frappe.set_user("Administrator")
        row = frappe.get_all("Appointment Notification", filters={"appointment": doc.name},
                             fields=["name", "event", "status", "independent_provider", "organization"])[0]
        self.assertEqual((row.event, row.status), ("Confirmation", "Queued"))
        self.assertEqual(row.independent_provider, self.businesses["A"].provider)
        send_notification(row.name)
        queue = frappe.get_doc("Email Queue", frappe.db.get_value("Appointment Notification", row.name, "email_queue"))
        message = _unwrapped(queue.message)
        self.assertIn(f"Your booking with {self.businesses['A'].name} is confirmed", message)
        self.assertIn("/schedule/individual/booking/", message)
        self.assertIn(f"/schedule/individual/{self.businesses['A'].offering}/my-bookings", message)

    def test_reminder_is_queued(self):
        doc = self._book()
        frappe.set_user("Administrator")
        now = datetime.now(pytz.UTC).replace(tzinfo=None)
        frappe.db.set_value("Appointment", doc.name, {"starts_at": now + timedelta(hours=3), "creation": now - timedelta(days=3)}, update_modified=False)
        notifications.send_due_reminders()
        events = frappe.get_all("Appointment Notification", filters={"appointment": doc.name}, pluck="event")
        self.assertIn("Reminder", events)

    def test_opting_out_is_per_provider(self):
        mine, other = self._book("A"), self._book("B")
        frappe.set_user("Guest")
        with mock.patch("frappe.utils.verified_command.verify_request", return_value=True), \
                mock.patch("frappe.respond_as_web_page"):
            notifications.unsubscribe(self.businesses["A"].key, EMAIL)
        frappe.set_user("Administrator")
        saved = frappe.get_all("Customer Notification Opt Out", filters={"email": EMAIL}, fields=["organization", "independent_provider"])
        self.assertEqual([(row.organization, row.independent_provider) for row in saved], [(None, self.businesses["A"].provider)])
        self.assertEqual(notifications.queue_notification(frappe.get_doc("Appointment", mine.name), "Reminder"), "opted_out")
        self.assertEqual(notifications.queue_notification(frappe.get_doc("Appointment", other.name), "Reminder"), "queued")

    def test_manage_link_opens_reschedules_and_cancels(self):
        doc = self._book()
        url = self_service.manage_url(doc)
        self.assertTrue(url.startswith(get_url("/schedule/individual/booking/")))
        token = url.rsplit("/", 1)[1]
        frappe.set_user("Guest")
        view = self_service.view(token, independent=1)
        self.assertTrue(view["valid"])
        self.assertEqual((view["business"]["kind"], view["business"]["name"]), ("provider", self.businesses["A"].name))
        self.assertFalse(self_service.view(token, slug=frappe.db.get_value("Organization", self.fixture["orgs"]["A"], "slug"))["valid"])
        target = self._slots(self.businesses["A"].offering)[2]
        frappe.set_user("Guest")
        moved = self_service.reschedule(token, target["start_time"], independent=1)
        self.assertEqual(moved["booking"]["starts_at"].replace("Z", ""), target["start_time"].replace("Z", "").split("+")[0])
        self.assertFalse(self_service.view(token, independent=1)["valid"], "The old link stops working after a move.")
        cancelled = self_service.cancel(moved["token"], independent=1)
        self.assertTrue(cancelled["cancelled"])
        self.assertEqual(frappe.db.get_value("Appointment", doc.name, "status"), "Cancelled")

    def test_my_bookings_lists_only_this_providers_bookings(self):
        mine, other = self._book("A"), self._book("B")
        offering = self.businesses["A"].offering
        frappe.set_user("Guest")
        my_bookings.request_link(email=EMAIL, offering=offering)
        sent = frappe.get_all("Email Queue", filters={"reference_doctype": "Provider", "reference_name": self.businesses["A"].provider}, pluck="message")
        self.assertTrue(any(f"/schedule/individual/{offering}/my-bookings?token=" in _unwrapped(message) for message in sent))
        token = my_bookings.link_token(self.businesses["A"].key, EMAIL)
        with self.assertRaises(frappe.PermissionError):
            my_bookings.open_link(token=token, offering=self.businesses["B"].offering)
        session = my_bookings.open_link(token=token, offering=offering)["session"]
        listed = my_bookings.bookings(session=session, email=EMAIL, offering=offering)
        references = {row["reference"] for row in listed["upcoming"] + listed["past"]}
        self.assertIn(mine.appointment_id or mine.name, references)
        self.assertNotIn(other.appointment_id or other.name, references)
        self.assertTrue(all(row["manage_path"].startswith("/schedule/individual/booking/") for row in listed["upcoming"]))
        self.assertFalse(my_bookings.bookings(session=session, email=EMAIL, offering=self.businesses["B"].offering)["valid"])

    def test_only_the_provider_reads_its_customers(self):
        doc = self._book()
        key = self.businesses["A"].key
        frappe.set_user(self.fixture["owners"]["A"])
        found = customers.search(key)
        self.assertEqual(found["role"], "manager")
        self.assertEqual([row["name"] for row in found["customers"]], [doc.customer])
        self.assertEqual(customers.get(doc.customer)["history"][0]["name"], doc.name)
        self.assertFalse(notifications.get_settings(key)["editable"])
        frappe.set_user(self.fixture["owners"]["B"])
        for call in (lambda: customers.search(key), lambda: customers.get(doc.customer),
                     lambda: customers.save(key, display_name="Abel Bekele"), lambda: notifications.get_settings(key)):
            with self.assertRaises(frappe.PermissionError):
                call()


def _unwrapped(message):
    """The queued MIME text without quoted-printable soft line breaks."""
    return message.replace("=\r\n", "")


def run():
    require_target()
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(IndependentCustomerTests)
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(suite)
    summary = {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
    print(json.dumps(summary))
    if not result.wasSuccessful():
        raise RuntimeError("Independent customer tests failed")
    return summary
