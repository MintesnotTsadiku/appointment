"""My bookings: the one-time emailed link, the device session, and whose bookings are listed.

Uses Bloom bookings made as a guest; every test rolls back.
"""

import time

import frappe

from appointment.scheduler import my_bookings
from appointment.tests.test_customer_notifications import BloomBookingCase


class TestMyBookings(BloomBookingCase):
    def setUp(self):
        super().setUp()
        self.slug = frappe.db.get_value("Organization", self.org, "slug")
        self.email = f"qa-mine-{frappe.generate_hash(length=8)}@example.test"

    def _queued(self):
        return frappe.db.count("Email Queue", {"reference_doctype": "Organization", "reference_name": self.org, "message": ["like", "%my-bookings?token=%"]})

    def test_request_answers_the_same_and_emails_only_known_addresses(self):
        self._book(0, email=self.email)
        before = self._queued()
        known = my_bookings.request_link(self.slug, self.email.upper())
        unknown = my_bookings.request_link(self.slug, "nobody-" + self.email)
        self.assertEqual(known, unknown)
        self.assertEqual(self._queued() - before, 1)
        my_bookings.request_link(self.slug, self.email)
        self.assertEqual(self._queued() - before, 1, "A second request within two minutes sends nothing.")

    def test_a_link_opens_once_for_its_business_only(self):
        self._book(0, email=self.email)
        token = my_bookings.link_token(self.org, self.email)
        other = frappe.db.get_value("Organization", {"name": ["!=", self.org], "slug": ["is", "set"]}, "slug")
        with self.assertRaises(frappe.PermissionError):
            my_bookings.open_link(other, token)
        opened = my_bookings.open_link(self.slug, token)
        self.assertEqual(opened["email"], self.email)
        with self.assertRaises(frappe.PermissionError):
            my_bookings.open_link(self.slug, token)
        nonce, expires, signature = my_bookings.link_token(self.org, self.email).split(".")
        with self.assertRaises(frappe.PermissionError):
            my_bookings.open_link(self.slug, f"{nonce}.{expires}.{'0' * len(signature)}")

    def test_an_expired_link_is_refused(self):
        nonce = "qa-expired-nonce"
        expires = int(time.time()) - 5
        frappe.cache.set_value(my_bookings._nonce_key(nonce), f"{self.org}\0{self.email}", expires_in_sec=60)
        token = f"{nonce}.{expires}.{my_bookings._sign('link', self.org, self.email, nonce, expires)}"
        with self.assertRaises(frappe.PermissionError):
            my_bookings.open_link(self.slug, token)

    def test_the_session_lists_this_customers_bookings(self):
        first = self._book(0, email=self.email)["booking_id"]
        second = self._book(1, email=self.email.upper())["booking_id"]
        stranger = self._book(2)["booking_id"]
        session = my_bookings.open_link(self.slug, my_bookings.link_token(self.org, self.email))["session"]
        listed = my_bookings.bookings(self.slug, session, self.email)
        references = {row["reference"] for row in listed["upcoming"] + listed["past"]}
        self.assertTrue({first, second} <= references)
        self.assertNotIn(stranger, references)
        self.assertTrue(all(row["manage_path"].startswith(f"/{self.slug}/booking/") for row in listed["upcoming"]))

        frappe.set_user("Administrator")
        profile = frappe.db.get_value("Appointment", first, "customer")
        frappe.db.set_value("Appointment", stranger, "customer", profile)
        frappe.set_user("Guest")
        listed = my_bookings.bookings(self.slug, session, self.email)
        self.assertIn(stranger, {row["reference"] for row in listed["upcoming"] + listed["past"]}, "Profile-linked bookings count too.")

    def test_a_session_is_bound_to_its_email_and_business(self):
        self._book(0, email=self.email)
        session = my_bookings.session_token(self.org, self.email)
        self.assertFalse(my_bookings.bookings(self.slug, session, "someone-else@example.test")["valid"])
        other = frappe.db.get_value("Organization", {"name": ["!=", self.org], "slug": ["is", "set"]}, "slug")
        self.assertFalse(my_bookings.bookings(other, session, self.email)["valid"])
        self.assertTrue(my_bookings.bookings(self.slug, session, self.email)["valid"])
