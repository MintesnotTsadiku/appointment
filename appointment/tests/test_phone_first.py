"""Phone-first booking: one phone rule, phone as the main contact, other people by phone.

Uses the rich demo business Bloom (see BloomBookingCase). Every test rolls back
what it creates. The shared phone cases are in appointment/helpers/phone_vectors.json;
the frontend tests (frontend/tests/phone.test.mjs) read the same file.
"""

import json
import unittest
from pathlib import Path

import frappe

from appointment.helpers import phone
from appointment.patches.v0_1 import normalize_phone_numbers
from appointment.scheduler import booking
from appointment.tests.phones import fresh_phone
from appointment.tests.test_customer_notifications import OFFERING, BloomBookingCase

VECTORS = json.loads((Path(phone.__file__).parent / "phone_vectors.json").read_text(encoding="utf-8"))["cases"]


class TestPhoneRule(unittest.TestCase):
    def test_every_shared_case(self):
        for row in VECTORS:
            with self.subTest(value=row["input"]):
                self.assertEqual(phone.normalize_phone(row["input"]), row["e164"])
                self.assertEqual(phone.phone_problem(row["input"]) is None, bool(row["e164"]))
                display = row.get("display") or row.get("display_server")
                if display:
                    self.assertEqual(phone.format_phone(row["input"]), display)

    def test_the_owner_examples_are_shared_cases(self):
        inputs = {row["input"] for row in VECTORS}
        for example in ("+251911223344", "0911223344", "911223344", "+251711223344", "0711223344", "711223344"):
            self.assertIn(example, inputs)

    def test_a_list_is_split_normalized_and_deduplicated(self):
        self.assertEqual(
            phone.normalize_phone_list("0911223344, +251 91 122 3344;\n0711223344", exclude=["+251711223344"]),
            ["+251911223344"],
        )
        with self.assertRaises(frappe.ValidationError):
            phone.normalize_phone_list("0911223344, call me")

    def test_the_hint_is_the_message_for_a_bad_number(self):
        with self.assertRaises(frappe.ValidationError) as caught:
            phone.require_phone("12345")
        self.assertIn("0911 22 33 44", str(caught.exception))


class TestPhoneFirstBooking(BloomBookingCase):
    def _book_with(self, slot=0, email="", phone_number=None, participants="", name="Meseret Alemu"):
        start = self.slots[slot]
        return booking.book(
            OFFERING, start["start_time"], start["end_time"], name, email, frappe.generate_hash(length=24),
            user_phone=fresh_phone(local=True) if phone_number is None else phone_number,
            organization_id=self.org, participant_phones=participants,
        )

    def _row(self, result):
        return frappe.get_doc("Appointment", result["booking_id"])

    def test_phone_only_booking_is_saved_in_e164_with_a_manage_link(self):
        number = fresh_phone(local=True)
        result = self._book_with(phone_number=number[:4] + " " + number[4:6] + " " + number[6:])
        doc = self._row(result)

        self.assertEqual(doc.client_phone, "+251" + number[1:])
        self.assertFalse(doc.client_email)
        self.assertTrue(result["manage_path"])
        self.assertEqual(frappe.db.get_value("Customer Profile", doc.customer, "primary_phone"), doc.client_phone)
        # No email address: the confirmation email is recorded as skipped, never sent.
        [row] = self._rows(result["booking_id"])
        self.assertEqual((row.status, row.skip_reason), ("Skipped", "no_recipient"))

    def test_phone_and_email_booking_keeps_both(self):
        result = self._book_with(email="selam.haile@example.test", phone_number="+251711223399")
        doc = self._row(result)
        self.assertEqual((doc.client_phone, doc.client_email), ("+251711223399", "selam.haile@example.test"))
        self.assertEqual(result["notification_status"], "queued")

    def test_invalid_phone_is_refused_with_the_hint(self):
        with self.assertRaises(frappe.ValidationError) as caught:
            self._book_with(phone_number="0911 22 33")
        self.assertIn("+251 91 122 3344", str(caught.exception))

    def test_the_same_phone_in_another_form_is_the_same_customer(self):
        number = fresh_phone()
        first = self._row(self._book_with(slot=0, phone_number=number, email="first.address@example.test"))
        local = "0" + number[4:]
        second = self._row(self._book_with(slot=1, phone_number=local[:4] + "-" + local[4:], email="second.address@example.test"))

        self.assertEqual(first.customer, second.customer)
        self.assertEqual(frappe.db.count("Customer Profile", {"organization": self.org, "primary_phone": number}), 1)

    def test_other_people_are_stored_by_phone(self):
        own = fresh_phone()
        result = self._book_with(phone_number=own, participants=f"0911223344, +251 71 122 3344, 911223344, {own}")
        self.assertEqual(self._row(result).participant_phones, "+251911223344\n+251711223344")

    def test_a_bad_participant_number_is_refused(self):
        with self.assertRaises(frappe.ValidationError):
            self._book_with(participants="0911223344, 12345")

    def test_too_many_participants_are_refused(self):
        numbers = ",".join(f"+2519112233{index:02}" for index in range(phone.MAX_PARTICIPANTS + 1))
        with self.assertRaises(frappe.ValidationError):
            self._book_with(participants=numbers)

    def test_email_only_callers_still_book(self):
        # Callers from before phone-first send an email and no phone.
        result = self._book_with(email="earlier.caller@example.test", phone_number="")
        self.assertEqual(self._row(result).client_email, "earlier.caller@example.test")


class TestPhoneFields(unittest.TestCase):
    def setUp(self):
        frappe.set_user("Administrator")

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback()

    def test_saved_phone_fields_are_normalized_and_bad_ones_refused(self):
        location = frappe.get_all("Location", filters={"organization": ["is", "set"]}, pluck="name", limit=1)
        if not location:
            self.skipTest("No organization location on this site.")
        doc = frappe.get_doc("Location", location[0])
        doc.phone = "0911 22 33 44"
        doc.save(ignore_permissions=True)
        self.assertEqual(doc.phone, "+251911223344")
        doc.phone = "0911 22"
        with self.assertRaises(frappe.ValidationError):
            doc.save(ignore_permissions=True)

    def test_unchanged_older_values_do_not_block_other_edits(self):
        location = frappe.get_all("Location", filters={"organization": ["is", "set"]}, pluck="name", limit=1)
        if not location:
            self.skipTest("No organization location on this site.")
        frappe.db.set_value("Location", location[0], "phone", "000 000 0199", update_modified=False)
        doc = frappe.get_doc("Location", location[0])
        doc.address_line_2 = "Second floor"
        doc.save(ignore_permissions=True)
        self.assertEqual(doc.phone, "000 000 0199")

    def test_normalization_patch_is_idempotent(self):
        org = frappe.get_all("Organization", pluck="name", limit=1)
        if not org:
            self.skipTest("No organization on this site.")
        number = fresh_phone()
        profile = frappe.get_doc(dict(doctype="Customer Profile", organization=org[0], display_name="Mekdes Tadesse",
                                      primary_phone=number)).insert(ignore_permissions=True)
        typed = "0" + number[4:6] + " " + number[6:]
        # Older rows were saved in the form people typed.
        frappe.db.set_value("Customer Profile", profile.name, "primary_phone", typed, update_modified=False)
        frappe.db.set_value("Customer Profile", profile.name, "phone_key", None, update_modified=False)

        original = frappe.db.commit
        frappe.db.commit = lambda: None
        try:
            first = normalize_phone_numbers.run()
            second = normalize_phone_numbers.run()
        finally:
            frappe.db.commit = original

        self.assertGreaterEqual(first["changed"], 1)
        self.assertEqual(second["changed"], 0)
        row = frappe.db.get_value("Customer Profile", profile.name, ["primary_phone", "phone_key"], as_dict=True)
        self.assertEqual(row.primary_phone, number)
        self.assertEqual(row.phone_key, profile.phone_key)
