"""Chapa checkout with a mocked HTTP client: start, verify, callback and the signed webhook.

No request reaches Chapa. Uses the rich demo business Bloom; every test rolls back.
"""

import hashlib
import hmac
import json
from unittest.mock import MagicMock, patch

import frappe
from werkzeug.test import EnvironBuilder
from werkzeug.wrappers import Request

from appointment.scheduler import payments, payments_chapa, self_service
from appointment.tests import test_payments as base

SECRET = "CHASECK_TEST-qa"
WEBHOOK_SECRET = "qa-webhook-hash"


def reply(body, status=200):
    response = MagicMock(status_code=status)
    response.json.return_value = body
    return response


class TestChapa(base.TestPayments):
    # Reuses TestPayments helpers; its own tests are not repeated here.
    def run(self, result=None):
        if self._testMethodName.startswith("test_chapa_"):
            return super().run(result)
        return None

    def setUp(self):
        super().setUp()
        frappe.set_user("Administrator")
        self._business(accept_chapa=1, chapa_secret_key=SECRET, chapa_webhook_secret=WEBHOOK_SECRET)
        frappe.set_user("Guest")

    def tearDown(self):
        frappe.local.request = None
        super().tearDown()

    def _started(self):
        _result, doc, payment = self._paid_booking(method=payments.CHAPA)
        token = self_service.token_for(doc)
        frappe.set_user("Guest")
        with patch("appointment.scheduler.payments_chapa.requests.post",
                   return_value=reply({"status": "success", "data": {"checkout_url": "https://checkout.chapa.co/qa"}})) as post:
            started = payments_chapa.start(token)
        return doc, frappe.get_doc("Booking Payment", payment.name), token, post, started

    def test_chapa_hold_is_short(self):
        _result, doc, payment = self._paid_booking(method=payments.CHAPA)
        hold = frappe.utils.get_datetime(payment.hold_expires_at) - frappe.utils.get_datetime(payment.creation)
        self.assertLessEqual(hold.total_seconds(), 20 * 60 + 5 * 3600)  # 15 minutes, creation is in local time

    def test_chapa_start_sends_the_amount_and_stores_the_reference(self):
        _doc, payment, _token, post, started = self._started()
        body = post.call_args.kwargs["json"]
        self.assertEqual(started["checkout_url"], "https://checkout.chapa.co/qa")
        self.assertEqual((body["amount"], body["currency"]), (f"{payment.amount:.2f}", "ETB"))
        self.assertEqual(post.call_args.kwargs["headers"]["Authorization"], f"Bearer {SECRET}")
        self.assertTrue(body["return_url"].endswith("?payment=chapa"))
        self.assertEqual(payment.tx_ref, body["tx_ref"])

    def test_chapa_return_confirms_only_after_verify(self):
        doc, payment, token, _post, _started = self._started()
        ok = {"status": "success", "data": {"status": "success", "amount": payment.amount, "currency": "ETB", "reference": "CHREF1"}}
        with patch("appointment.scheduler.payments_chapa.requests.get", return_value=reply(ok)):
            view = payments_chapa.confirm_return(token)
        self.assertEqual(view["status"], "Paid")
        self.assertEqual(frappe.db.get_value("Appointment", doc.name, "status"), "Confirmed")
        self.assertEqual(frappe.db.get_value("Booking Payment", payment.name, "provider_reference"), "CHREF1")

    def test_chapa_short_or_failed_payment_is_not_accepted(self):
        _doc, payment, token, _post, _started = self._started()
        short = {"status": "success", "data": {"status": "success", "amount": payment.amount - 1, "currency": "ETB"}}
        with patch("appointment.scheduler.payments_chapa.requests.get", return_value=reply(short)):
            self.assertEqual(payments_chapa.confirm_return(token)["status"], "Awaiting payment")
        failed = {"status": "success", "data": {"status": "failed", "amount": payment.amount, "currency": "ETB"}}
        with patch("appointment.scheduler.payments_chapa.requests.get", return_value=reply(failed)):
            self.assertEqual(payments_chapa.confirm_return(token)["status"], "Awaiting payment")

    def test_chapa_webhook_needs_a_valid_signature(self):
        _doc, payment, _token, _post, _started = self._started()
        raw = json.dumps({"event": "charge.success", "tx_ref": payment.tx_ref, "status": "success"}).encode()
        ok = {"status": "success", "data": {"status": "success", "amount": payment.amount, "currency": "ETB", "reference": "CHREF2"}}

        self._request(raw, "bad-signature")
        with self.assertRaises(frappe.PermissionError):
            payments_chapa.webhook()

        self._request(raw, hmac.new(WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest())
        with patch("appointment.scheduler.payments_chapa.requests.get", return_value=reply(ok)):
            payments_chapa.webhook()
            payments_chapa.webhook()  # Chapa retries; a repeat changes nothing.
        self.assertEqual(frappe.db.get_value("Booking Payment", payment.name, "status"), "Paid")
        self.assertEqual(frappe.db.count("Platform Ledger Entry", {"booking_payment": payment.name}), 0)

    def test_chapa_expired_hold_cancels_the_checkout(self):
        doc, payment, _token, _post, _started = self._started()
        frappe.set_user("Administrator")
        frappe.db.set_value("Booking Payment", payment.name, "hold_expires_at", frappe.utils.add_to_date(None, days=-1), update_modified=False)
        with patch("appointment.scheduler.payments_chapa.requests.put") as put:
            payments.process_holds()
        self.assertIn(payment.tx_ref, put.call_args.args[0])
        self.assertEqual(frappe.db.get_value("Appointment", doc.name, "status"), "Cancelled")

    def _request(self, raw, signature):
        builder = EnvironBuilder(method="POST", data=raw, headers={"x-chapa-signature": signature, "Content-Type": "application/json"})
        frappe.local.request = Request(builder.get_environ())
