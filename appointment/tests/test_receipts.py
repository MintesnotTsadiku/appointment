"""Payment receipts and monthly statements.

Builds on the Bloom payment fixture from test_payments; every test rolls back.
"""

from unittest.mock import patch

import frappe
import pytz
from frappe.utils import flt

from appointment.scheduler import notification_email, payments, receipts, self_service, statements
from appointment.tests import test_payments as base
from appointment.tests.test_customer_notifications import OTHER_OWNER, OWNER


class TestReceipts(base.TestPayments):
    # Reuses TestPayments helpers; its own tests are not repeated here.
    def run(self, result=None):
        if self._testMethodName.startswith("test_rcpt_"):
            return super().run(result)
        return None

    def setUp(self):
        super().setUp()
        frappe.set_user("Administrator")

    def tearDown(self):
        super().tearDown()
        frappe.defaults._clear_cache("__default")

    def _confirmed(self, slot=0):
        _result, doc, payment = self._paid_booking(slot=slot)
        frappe.set_user(OWNER)
        payments.confirm(payment.name)
        frappe.set_user("Administrator")
        return doc, frappe.get_doc("Booking Payment", payment.name)

    def _receipt(self, payment, kind="Payment"):
        return frappe.get_doc("Payment Receipt", {"booking_payment": payment.name, "kind": kind, "status": "Issued"})

    def _month(self):
        zone = pytz.timezone(receipts.business_zone(self.org))
        return pytz.UTC.localize(receipts._utc_now()).astimezone(zone).strftime("%Y-%m")

    # Receipts ---------------------------------------------------------------
    def test_rcpt_paid_issues_a_numbered_receipt_emailed_as_pdf(self):
        self._business(receipt_prefix="QAB")
        doc, payment = self._confirmed(0)
        first = self._receipt(payment)
        self.assertRegex(first.receipt_number, r"^QAB-\d{4}-\d{5}$")
        self.assertEqual((first.amount, first.issuer, first.customer_name), (payment.amount, "Business", doc.client_name))

        _doc2, payment2 = self._confirmed(1)
        second = self._receipt(payment2)
        self.assertEqual(int(second.receipt_number[-5:]), int(first.receipt_number[-5:]) + 1)

        row = frappe.get_doc("Appointment Notification", {"appointment": doc.name, "event": "Payment receipt"})
        self.assertEqual((row.receipt, row.channel), (first.name, "Email"))
        notification_email.send_notification(row.name)
        # Inline attachments travel inside the queued MIME message.
        queue = frappe.get_doc("Email Queue", frappe.db.get_value("Appointment Notification", row.name, "email_queue"))
        self.assertIn(f"{first.receipt_number}.pdf", queue.message)
        self.assertTrue(receipts.render_pdf(first).startswith(b"%PDF"))

    def test_rcpt_paid_twice_keeps_one_receipt(self):
        _doc, payment = self._confirmed(0)
        receipts.issue(payment, "Payment")
        self.assertEqual(frappe.db.count("Payment Receipt", {"booking_payment": payment.name, "kind": "Payment"}), 1)

    def test_rcpt_platform_collected_payments_use_the_platform_series(self):
        self._platform(receipt_prefix="QAP", legal_name="QA Platform PLC", tin="0000001",
                       platform_bank_accounts=[{"bank": "Platform Bank", "account_name": "Platform", "account_number": "9000"}])
        self._business(collection_override="Platform collects")
        _doc, payment = self._confirmed(0)
        receipt = self._receipt(payment)
        self.assertTrue(receipt.receipt_number.startswith("QAP-"))
        self.assertEqual((receipt.issuer, receipt.issuer_name, receipt.issuer_tin), ("Platform", "QA Platform PLC", "0000001"))

    def test_rcpt_a_rolled_back_number_is_issued_again(self):
        first = receipts.next_number("QAROLL", 2099)
        frappe.db.rollback()
        self.assertEqual(receipts.next_number("QAROLL", 2099), first)

    def test_rcpt_refund_receipt_and_correction_voids_the_earlier_one(self):
        _doc, payment = self._confirmed(0)
        frappe.set_user(OWNER)
        payments.record_refund(payment.name, 100, reference="R-1")
        first = self._receipt(payment, "Refund")
        self.assertEqual(first.amount, 100)
        payments.record_refund(payment.name, 120, reference="R-2")
        frappe.set_user("Administrator")
        self.assertEqual(frappe.db.get_value("Payment Receipt", first.name, "status"), "Void")
        self.assertEqual(self._receipt(payment, "Refund").amount, 120)

    def test_rcpt_downloads_need_the_link_or_booking_access(self):
        doc, payment = self._confirmed(0)
        receipt = self._receipt(payment)
        frappe.set_user("Guest")
        receipts.download(self_service.token_for(doc), receipt.name)
        self.assertTrue(frappe.local.response.filecontent.startswith(b"%PDF"))
        with self.assertRaises(frappe.PermissionError):
            receipts.download("bad.0.token", receipt.name)
        frappe.set_user(OTHER_OWNER)
        with self.assertRaises(frappe.PermissionError):
            receipts.download_staff(receipt.name)
        frappe.set_user(OWNER)
        receipts.download_staff(receipt.name)

    def test_rcpt_business_sets_prefix_and_tin(self):
        frappe.set_user(OWNER)
        view = payments.save_settings(self.org, receipt_prefix="bl-oom 1", tin=" 0012345678 ")
        self.assertEqual((view["receipt_prefix"], view["tin"]), ("BLOOM1", "0012345678"))

    # Statements -------------------------------------------------------------
    def test_rcpt_statement_totals_for_business_collected_payments(self):
        self._platform(platform_fee_type="Fixed", platform_fee_value=50, free_bookings=0, collection_mode="Business collects")
        month = self._month()
        before = statements.build(self.org, month)["totals"]
        _doc, payment = self._confirmed(0)
        frappe.set_user(OWNER)
        payments.record_refund(payment.name, 40)
        data = statements.get_statement(self.org, month)
        totals = data["totals"]
        self.assertEqual(round(totals["collected_business"] - before["collected_business"], 2), flt(payment.amount))
        self.assertEqual(round(totals["fees_due"] - before["fees_due"], 2), 50)
        self.assertEqual(round(totals["refunded_business"] - before["refunded_business"], 2), 40)
        self.assertEqual(round(totals["net"] - before["net"], 2), round(flt(payment.amount) - 50 - 40, 2))
        self.assertTrue(any(row["receipt"] for row in data["payments"]))
        self.assertTrue(statements.to_csv(data).startswith(",".join(statements.CSV_COLUMNS)))
        self.assertTrue(statements.to_pdf(data, "am").startswith(b"%PDF"))

    def test_rcpt_statement_for_platform_collected_payments_counts_the_payout(self):
        self._platform(platform_fee_type="Percent", platform_fee_value=10, free_bookings=0,
                       platform_bank_accounts=[{"bank": "Platform Bank", "account_name": "Platform", "account_number": "9000"}])
        self._business(collection_override="Platform collects")
        month = self._month()
        before = statements.build(self.org, month)["totals"]
        _doc, payment = self._confirmed(0)
        totals = statements.build(self.org, month)["totals"]
        fee = round(flt(payment.amount) * 0.1, 2)
        self.assertEqual(round(totals["collected_platform"] - before["collected_platform"], 2), flt(payment.amount))
        self.assertEqual(round(totals["net"] - before["net"], 2), round(flt(payment.amount) - fee, 2))

    def test_rcpt_statement_access(self):
        frappe.set_user(OTHER_OWNER)
        with self.assertRaises(frappe.PermissionError):
            statements.get_statement(self.org, self._month())
        frappe.set_user(OWNER)
        with self.assertRaises(frappe.ValidationError):
            statements.get_statement(self.org, "2026-13")

    def test_rcpt_monthly_email_goes_once_to_the_owner(self):
        self._confirmed(0)
        month = self._month()
        with patch.object(statements, "previous_month", return_value=month):
            first = statements.send_monthly_statements()
            again = statements.send_monthly_statements()
        self.assertGreaterEqual(first["sent"], 1)
        self.assertEqual(again["sent"], 0)
        queue = frappe.get_all("Email Queue", filters={"reference_doctype": "Organization", "reference_name": self.org}, fields=["name", "message"])
        self.assertEqual(len(queue), 1)
        for name in (f"statement-{month}.csv", f"statement-{month}.pdf"):
            self.assertIn(name, queue[0].message)
        recipients = frappe.get_all("Email Queue Recipient", filters={"parent": queue[0].name}, pluck="recipient")
        self.assertEqual(recipients, [frappe.db.get_value("User", OWNER, "email")])
