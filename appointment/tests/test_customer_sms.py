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


class TestSmsDeliveryAndLength(BloomBookingCase):
    def _sent_row(self, message_id="abc-123"):
        booking_id = self._book(phone="0911234567")["booking_id"]
        frappe.set_user("Administrator")
        return frappe.get_doc(dict(
            doctype="Appointment Notification", appointment=booking_id, organization=self.org, event="Confirmation",
            channel="SMS", recipient="+251911234567", status="Sent", provider_message_id=message_id,
            dedupe_key=f"qa-poll-{message_id}",
        )).insert(ignore_permissions=True)

    def _poll(self, report):
        configure_gateway()
        reply = gateway_reply({"acknowledge": "success", "response": report})
        with patch("appointment.scheduler.notification_sms.is_muted", return_value=False), \
                patch("appointment.scheduler.notification_sms.requests.get", return_value=reply) as get:
            notification_sms.poll_delivery()
        return get

    def test_delivered_report_updates_status_and_parts(self):
        row = self._sent_row()
        get = self._poll({"messageId": "abc-123", "status": "DELIVERED", "parts": 2, "cost": 0.4})

        self.assertEqual(get.call_args.args[0], "https://sms-gateway.invalid/api/status")
        self.assertEqual(get.call_args.kwargs["params"], {"id": "abc-123"})
        saved = frappe.db.get_value("Appointment Notification", row.name, ["status", "sms_parts"], as_dict=True)
        self.assertEqual((saved.status, saved.sms_parts), ("Delivered", 2))

    def test_undelivered_report_marks_failure(self):
        row = self._sent_row("def-456")
        self._poll({"messageId": "def-456", "status": "UNDELIV", "parts": 1, "description": "Handset off"})

        saved = frappe.db.get_value("Appointment Notification", row.name, ["status", "error"], as_dict=True)
        self.assertEqual((saved.status, saved.error), ("Failed", "Handset off"))

    def test_unknown_report_keeps_sent(self):
        row = self._sent_row("ghi-789")
        self._poll({"messageId": "ghi-789", "status": "QUEUED", "parts": 1})

        self.assertEqual(frappe.db.get_value("Appointment Notification", row.name, "status"), "Sent")

    def test_muted_site_does_not_poll(self):
        self._sent_row("jkl-000")
        configure_gateway()
        with patch("appointment.scheduler.notification_sms.requests.get") as get:
            self.assertEqual(notification_sms.poll_delivery(), 0)
        get.assert_not_called()

    def test_texts_fit_two_parts(self):
        """Amharic uses UCS-2 (67 characters a part). English uses GSM-7 (160 for one part)."""
        booking_id = self._book()["booking_id"]
        frappe.set_user("Administrator")
        doc = frappe.get_doc("Appointment", booking_id)
        for event in notification_sms.COPY:
            self.assertLessEqual(len(notification_sms.render(event, doc, "en")), 160, event)
            self.assertLessEqual(len(notification_sms.render(event, doc, "am")), 2 * 67, event)
