"""Customer SMS: phone numbers, the per-business switch, muting and gateway replies.

No test reaches AfroMessage. The gateway URL points at an unused host, and
`deliver` is tested with a mocked HTTP response.
"""

from unittest.mock import MagicMock, patch

import frappe

from appointment.scheduler import notification_sms, notifications
from appointment.tests.test_customer_notifications import OWNER, BloomBookingCase

GATEWAY = "https://sms-gateway.invalid/api/send"


def configure_gateway():
    settings = frappe.get_single("SMS Settings")
    settings.sms_gateway_url = GATEWAY
    settings.message_parameter = "message"
    settings.receiver_parameter = "to"
    settings.use_post = 1
    settings.set("parameters", [
        {"parameter": "Content-Type", "value": "application/json", "header": 1},
        {"parameter": "Authorization", "value": "Bearer test-token", "header": 1},
    ])
    settings.save(ignore_permissions=True)


def gateway_reply(body):
    response = MagicMock(status_code=200)
    response.json.return_value = body
    return response


class TestCustomerSms(BloomBookingCase):
    def test_phone_numbers_normalize_to_international_form(self):
        cases = {
            "0911 234 567": "+251911234567", "0711234567": "+251711234567", "911234567": "+251911234567",
            "251911234567": "+251911234567", "+251-911-234-567": "+251911234567", "+44 20 7946 0958": "+442079460958",
            "12345": "", "call me": "", "": "",
        }
        for raw, expected in cases.items():
            self.assertEqual(notification_sms.normalize_phone(raw), expected, raw)

    def test_sms_is_off_by_default(self):
        frappe.set_user("Administrator")
        configure_gateway()
        frappe.set_user("Guest")
        booking_id = self._book(phone="0911234567")["booking_id"]

        self.assertEqual(self._rows(booking_id, "SMS"), [])

    def test_enabling_sms_without_a_gateway_is_refused(self):
        frappe.set_user(OWNER)
        with self.assertRaises(frappe.ValidationError):
            notifications.save_settings(self.org, sms_enabled=1)

    def test_muted_site_records_the_sms_and_sends_nothing(self):
        frappe.set_user("Administrator")
        configure_gateway()
        frappe.set_user(OWNER)
        notifications.save_settings(self.org, sms_enabled=1)
        frappe.set_user("Guest")
        booking_id = self._book(phone="0911234567", language="am")["booking_id"]
        [row] = self._rows(booking_id, "SMS")
        self.assertEqual((row.status, row.recipient), ("Queued", "+251911234567"))

        with patch("appointment.scheduler.notification_sms.requests.post") as post:
            notification_sms.send_notification(row.name)
        post.assert_not_called()
        [row] = self._rows(booking_id, "SMS")
        self.assertEqual((row.status, row.skip_reason), ("Skipped", "muted"))
        self.assertIn("ሰዓት", row.message)

    def test_missing_phone_is_recorded_as_no_recipient(self):
        frappe.set_user("Administrator")
        configure_gateway()
        frappe.set_user(OWNER)
        notifications.save_settings(self.org, sms_enabled=1)
        frappe.set_user("Guest")
        result = self._book()

        self.assertEqual(result["notification_status"], "queued")
        [row] = self._rows(result["booking_id"], "SMS")
        self.assertEqual((row.status, row.skip_reason), ("Skipped", "no_recipient"))

    def test_gateway_success_returns_the_message_id(self):
        frappe.set_user("Administrator")
        configure_gateway()
        reply = {"acknowledge": "success", "response": {"status": "Send", "message_id": "abc-123", "to": "+251911234567"}}
        with patch("appointment.scheduler.notification_sms.requests.post", return_value=gateway_reply(reply)) as post:
            self.assertEqual(notification_sms.deliver("+251911234567", "Hello"), "abc-123")

        sent = post.call_args.kwargs
        self.assertEqual(sent["json"], {"message": "Hello", "to": "+251911234567"})
        self.assertEqual(sent["headers"]["Authorization"], "Bearer test-token")

    def test_gateway_error_with_http_200_is_a_failure(self):
        frappe.set_user("Administrator")
        configure_gateway()
        reply = {"acknowledge": "error", "response": {"errors": ["Invalid sender"]}}
        with patch("appointment.scheduler.notification_sms.requests.post", return_value=gateway_reply(reply)):
            with self.assertRaises(frappe.ValidationError):
                notification_sms.deliver("+251911234567", "Hello")
