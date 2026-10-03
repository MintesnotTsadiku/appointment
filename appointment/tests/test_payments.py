"""Booking payments: checkout amounts, holds, bank-transfer proof, review, ledger, expiry and refunds.

Uses the rich demo business Bloom with payment turned on for the test only.
Every test rolls back what it creates.
"""

import base64
from datetime import datetime, timedelta

import frappe
import pytz

from appointment.scheduler import payments, self_service
from appointment.scheduler.notification_email import render
from appointment.tests.test_customer_notifications import MANAGER, OFFERING, OTHER_OWNER, OWNER, BloomBookingCase

PNG = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 64).decode()


def _utc_now():
    return datetime.now(pytz.UTC).replace(tzinfo=None)


class TestPayments(BloomBookingCase):
    def setUp(self):
        super().setUp()
        frappe.set_user("Administrator")
        self._business(require=1)
        frappe.set_user("Guest")

    def tearDown(self):
        super().tearDown()
        frappe.clear_document_cache("Payment Settings", "Payment Settings")

    # Helpers ----------------------------------------------------------------
    def _business(self, require=1, **values):
        settings = payments.business(self.org)
        settings.accept_bank_transfer = 1
        settings.set("bank_accounts", [{"bank": "QA Bank", "account_name": "Bloom QA", "account_number": "1000123456"}])
        settings.update(values)
        settings.save(ignore_permissions=True) if not settings.is_new() else settings.insert(ignore_permissions=True)
        frappe.db.set_value("Organization", self.org, "require_payment", require)

    def _platform(self, **values):
        settings = frappe.get_single("Payment Settings")
        settings.update(values)
        settings.save(ignore_permissions=True)
        frappe.clear_document_cache("Payment Settings", "Payment Settings")

    def _deposit_policy(self, percentage):
        frappe.get_doc(dict(
            doctype="Policy", policy_name="QA deposit", applies_to="All Services", organization=self.org,
            created_by_organization=self.org, is_active=1, valid_from=frappe.utils.add_days(frappe.utils.nowdate(), -30),
            cancellation_window_hours=0, reschedule_window_hours=0, deposit_percentage=percentage,
        )).insert(ignore_permissions=True)

    def _paid_booking(self, method=payments.BANK, slot=0):
        frappe.set_user("Guest")
        start = self.slots[slot]
        from appointment.scheduler import booking

        result = booking.book(
            OFFERING, start["start_time"], start["end_time"], "Pay Test", f"qa-pay-{slot}@example.test",
            frappe.generate_hash(length=24), organization_id=self.org, payment_method=method,
        )
        frappe.set_user("Administrator")
        return result, frappe.get_doc("Appointment", result["booking_id"]), payments.latest_payment(result["booking_id"])

    def _price(self):
        return frappe.utils.flt(frappe.db.get_value("Service", frappe.db.get_value("EventType", OFFERING, "service"), "price"))

    # Quote ------------------------------------------------------------------
    def test_no_payment_when_the_business_does_not_require_it(self):
        frappe.set_user("Administrator")
        frappe.db.set_value("Organization", self.org, "require_payment", 0)
        self.assertFalse(payments.checkout(OFFERING, self.slots[0]["start_time"])["required"])

    def test_full_price_without_a_deposit_and_split_with_one(self):
        quote = payments.checkout(OFFERING, self.slots[0]["start_time"])
        self.assertEqual((quote["amount_due"], quote["balance_due"], quote["methods"]), (self._price(), 0, [payments.BANK]))

        frappe.set_user("Administrator")
        self._deposit_policy(30)
        quote = payments.checkout(OFFERING, self.slots[0]["start_time"])
        self.assertEqual(quote["amount_due"], round(self._price() * 0.3, 2))
        self.assertEqual(quote["balance_due"], round(self._price() * 0.7, 2))
        self.assertTrue(quote["is_deposit"])

    # Hold -------------------------------------------------------------------
    def test_paid_booking_is_held_pending_with_a_deadline_and_a_request_email(self):
        result, doc, payment = self._paid_booking()
        self.assertEqual((result["status"], doc.status, payment.status), ("Pending", "Pending", "Awaiting payment"))
        self.assertEqual(result["payment"]["accounts"][0]["account_number"], "1000123456")
        self.assertTrue(result["manage_path"].startswith("/bloom-studio/booking/"))
        self.assertLessEqual(frappe.utils.get_datetime(payment.hold_expires_at), _utc_now() + timedelta(hours=24, minutes=1))
        self.assertLessEqual(frappe.utils.get_datetime(payment.hold_expires_at), frappe.utils.get_datetime(doc.starts_at) - timedelta(hours=2))
        events = frappe.get_all("Appointment Notification", filters={"appointment": doc.name, "channel": "Email"}, pluck="event")
        self.assertEqual(events, ["Payment request"])
        html = render("Payment request", doc, "en", doc.client_email)["html"]
        self.assertIn("1000123456", html)
        self.assertIn("/booking/", html)

    def test_method_must_be_one_the_business_accepts(self):
        with self.assertRaises(frappe.ValidationError):
            self._paid_booking(method=None)
        with self.assertRaises(frappe.ValidationError):
            self._paid_booking(method=payments.CHAPA)

    # Bank transfer review ---------------------------------------------------------
    def test_proof_then_staff_confirmation_confirms_the_booking(self):
        _result, doc, payment = self._paid_booking()
        token = self_service.token_for(doc)
        frappe.set_user("Guest")
        view = payments.submit_proof(token, reference="TXN-778", file_name="receipt.png", file_data=PNG)
        self.assertEqual(view["status"], "Submitted")
        proof = frappe.db.get_value("Booking Payment", payment.name, "proof")
        self.assertTrue(frappe.db.get_value("File", {"file_url": proof}, "is_private"))

        frappe.set_user(MANAGER)
        payments.confirm(payment.name)
        saved = frappe.get_doc("Appointment", doc.name)
        self.assertEqual((saved.status, saved.amount_paid), ("Confirmed", payment.amount))
        self.assertTrue(self_service.view(token)["valid"], "Paying must not retire the manage link.")
        self.assertIn("Confirmation", frappe.get_all("Appointment Notification", filters={"appointment": doc.name}, pluck="event"))

    def test_reject_reopens_the_payment_with_a_reason(self):
        _result, doc, payment = self._paid_booking()
        frappe.set_user("Guest")
        payments.submit_proof(self_service.token_for(doc), reference="WRONG")
        frappe.set_user(MANAGER)
        payments.reject(payment.name, "No transfer with this reference")
        saved = frappe.get_doc("Booking Payment", payment.name)
        self.assertEqual((saved.status, saved.reject_reason), ("Rejected", "No transfer with this reference"))

        frappe.set_user("Guest")
        self.assertEqual(payments.submit_proof(self_service.token_for(doc), reference="TXN-2")["status"], "Submitted")

    def test_other_business_cannot_review_and_guests_need_the_link(self):
        _result, doc, payment = self._paid_booking()
        frappe.set_user(OTHER_OWNER)
        with self.assertRaises(frappe.PermissionError):
            payments.confirm(payment.name)
        frappe.set_user("Guest")
        with self.assertRaises(frappe.PermissionError):
            payments.submit_proof("bad.0.token", reference="X")

    def test_proof_files_are_limited_to_images_and_pdf(self):
        _result, doc, _payment = self._paid_booking()
        frappe.set_user("Guest")
        with self.assertRaises(frappe.ValidationError):
            payments.submit_proof(self_service.token_for(doc), file_name="run.exe", file_data=PNG)

    # Ledger -----------------------------------------------------------------
    def test_business_collects_records_the_platform_fee(self):
        self._platform(platform_fee_type="Fixed", platform_fee_value=50, free_bookings=0, collection_mode="Business collects")
        _result, _doc, payment = self._paid_booking()
        frappe.set_user(OWNER)
        payments.confirm(payment.name)
        rows = frappe.get_all("Platform Ledger Entry", filters={"booking_payment": payment.name}, fields=["entry_type", "amount", "status"])
        self.assertEqual([(r.entry_type, r.amount, r.status) for r in rows], [("Platform fee", 50, "Due")])

    def test_free_allowance_waives_the_fee(self):
        self._platform(platform_fee_type="Percent", platform_fee_value=10, free_bookings=1000)
        _result, _doc, payment = self._paid_booking()
        frappe.set_user(OWNER)
        payments.confirm(payment.name)
        self.assertEqual(frappe.db.get_value("Platform Ledger Entry", {"booking_payment": payment.name}, "status"), "Waived")

    def test_platform_collects_for_one_business_and_records_the_payout(self):
        self._platform(platform_fee_type="Percent", platform_fee_value=10, free_bookings=0,
                       platform_bank_accounts=[{"bank": "Platform Bank", "account_name": "Platform", "account_number": "9000"}])
        frappe.set_user("Administrator")
        self._business(collection_override="Platform collects")
        result, _doc, payment = self._paid_booking()
        self.assertEqual((payment.collector, result["payment"]["accounts"][0]["account_number"]), ("Platform", "9000"))

        frappe.set_user(OWNER)
        payments.confirm(payment.name)
        rows = {r.entry_type: r.amount for r in frappe.get_all("Platform Ledger Entry", filters={"booking_payment": payment.name}, fields=["entry_type", "amount"])}
        fee = round(payment.amount * 0.1, 2)
        self.assertEqual(rows, {"Platform fee": fee, "Payout due": round(payment.amount - fee, 2)})

    # Expiry and reminder ---------------------------------------------------------
    def test_unpaid_hold_expires_and_frees_the_slot(self):
        _result, doc, payment = self._paid_booking()
        frappe.db.set_value("Booking Payment", payment.name, "hold_expires_at", _utc_now() - timedelta(minutes=1), update_modified=False)
        payments.process_holds()

        saved = frappe.get_doc("Appointment", doc.name)
        self.assertEqual((frappe.db.get_value("Booking Payment", payment.name, "status"), saved.status), ("Expired", "Cancelled"))
        html = render("Cancellation", saved, "en", saved.client_email)["html"]
        self.assertIn("payment was not received", html)
        self._paid_booking()  # The same slot can be booked again.

    def test_bank_reminder_goes_out_once_at_half_time(self):
        _result, doc, payment = self._paid_booking()
        frappe.db.set_value("Booking Payment", payment.name, {
            "creation": frappe.utils.add_to_date(None, hours=-20), "hold_expires_at": _utc_now() + timedelta(hours=2),
        }, update_modified=False)
        payments.process_holds()
        payments.process_holds()
        reminders = frappe.get_all("Appointment Notification", filters={"appointment": doc.name, "event": "Payment reminder"}, pluck="name")
        self.assertEqual(len(reminders), 1)

    # Refund -----------------------------------------------------------------
    def test_refund_is_recorded_with_proof(self):
        _result, _doc, payment = self._paid_booking()
        frappe.set_user(OWNER)
        payments.confirm(payment.name)
        with self.assertRaises(frappe.ValidationError):
            payments.record_refund(payment.name, payment.amount + 1)
        payments.record_refund(payment.name, 100, reference="REF-1", file_name="refund.png", file_data=PNG)
        saved = frappe.get_doc("Booking Payment", payment.name)
        self.assertEqual((saved.status, saved.refund_amount, saved.refund_reference), ("Refunded", 100, "REF-1"))
        self.assertTrue(saved.refund_proof)

    # Settings ---------------------------------------------------------------
    def test_require_payment_needs_a_method(self):
        frappe.set_user("Administrator")
        settings = payments.business(self.org)
        settings.set("bank_accounts", [])
        settings.save(ignore_permissions=True)
        frappe.set_user(OWNER)
        with self.assertRaises(frappe.ValidationError):
            payments.save_settings(self.org, require_payment=1)

    def test_owner_cannot_change_who_collects(self):
        frappe.set_user(OWNER)
        payments.save_settings(self.org, accept_bank_transfer=1)
        self.assertEqual(payments.get_settings(self.org)["collector"], "Business")
        self.assertNotIn("collection_override", payments.save_settings.__code__.co_varnames)
