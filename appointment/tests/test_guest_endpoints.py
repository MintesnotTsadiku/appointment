"""Guest endpoint review fixes: rate limits, no other customer's data, no exception text.

Mocks every lookup; creates no records. See docs/operations/GUEST_ENDPOINT_REVIEW.md.
"""

import json
import unittest
from unittest.mock import MagicMock, patch

import frappe
from werkzeug.test import EnvironBuilder
from werkzeug.wrappers import Request

from appointment.api import personal_meet
from appointment.overrides import event_override
from appointment.scheduler import registration
from appointment.scheduler.doctype.landing_page_settings import api as landing_api


class GuestRequest:
    """A guest POST from a unique address, so the rate-limit counters start at zero."""

    def __enter__(self):
        self.user = frappe.session.user
        self.ip = "203.0.113." + str(int(frappe.generate_hash(length=4), 16) % 250 + 1)
        self.previous = (getattr(frappe.local, "request", None), getattr(frappe.local, "request_ip", None))
        frappe.local.request = Request(EnvironBuilder(method="POST").get_environ())
        frappe.local.request_ip = self.ip
        frappe.set_user("Guest")
        return self

    def __exit__(self, *exc):
        for key in frappe.cache.get_keys(f"rl:*{self.ip}*"):
            frappe.cache.delete(key)
        frappe.local.request, frappe.local.request_ip = self.previous
        frappe.set_user(self.user)
        return False


def calls_until_limited(call, attempts):
    """How many calls ran before the rate limit refused one."""
    for count in range(attempts):
        try:
            call()
        except frappe.RateLimitExceededError:
            return count
        except (frappe.ValidationError, frappe.PermissionError):
            frappe.clear_messages()
    return attempts


class TestGuestEndpoints(unittest.TestCase):
    def test_signup_is_rate_limited(self):
        with GuestRequest(), patch.object(registration, "requires_verification", return_value=False), \
                patch.object(registration, "self_signup_enabled", return_value=False):
            ran = calls_until_limited(lambda: registration.signup("qa-signup@example.test", password="x"), 15)
        self.assertEqual(ran, 10)

    def test_legacy_booking_event_creation_is_rate_limited(self):
        group = MagicMock()
        with GuestRequest(), patch.object(event_override, "utc_to_sys_time", return_value=None), \
                patch.object(event_override, "is_valid_time_slots", return_value=False):
            ran = calls_until_limited(
                lambda: event_override._create_event_for_appointment_group(group, "2026-10-12", "a", "b", "+00:00"), 15)
        self.assertEqual(ran, 10)

    def test_legacy_booking_conflict_does_not_name_other_customers(self):
        tomorrow = frappe.utils.add_days(frappe.utils.nowdate(), 1)
        rows = {
            "User Appointment Availability": [frappe._dict(name="UAA-QA", user="provider-qa@example.test")],
            "Provider": [frappe._dict(name="PRV-QA")],
            "Provider Location": [frappe._dict(location="LOC-QA")],
            "EventType": [],
        }
        conflict = [{"appointment_name": "APT-QA", "client_name": "Selam Bekele", "status": "Confirmed"}]
        with patch.object(frappe, "get_doc", return_value=frappe._dict(parent="UAA-QA")), \
                patch.object(frappe, "get_all", side_effect=lambda doctype, **kwargs: rows[doctype]), \
                patch("appointment.scheduler.helpers.slot_engine.check_conflicts", return_value=conflict):
            response = personal_meet.book_time_slot(
                "DUR-QA", tomorrow, "09:00:00", "09:30:00", "+00:00", "Guest QA", "guest-qa@example.test")
        self.assertEqual(frappe.local.response.pop("http_status_code", None), 409)
        self.assertNotIn("conflicts", response)
        self.assertNotIn("Selam Bekele", json.dumps(response))

    def test_landing_settings_error_hides_the_exception(self):
        with patch.object(frappe, "get_doc", side_effect=RuntimeError("secret internal detail")), \
                patch.object(frappe, "log_error"):
            response = landing_api.get_landing_page_settings()
        self.assertFalse(response["success"])
        self.assertNotIn("secret internal detail", json.dumps(response))


class TestWorkspaceSetupProvider(unittest.TestCase):
    """The first business setup names its provider, so the setup answer shows who books."""

    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("workspace_setup")

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="workspace_setup")

    def test_new_business_provider_has_a_name(self):
        from appointment.scheduler import workspace

        email = f"qa-setup-{frappe.generate_hash(length=8)}@example.test"
        frappe.get_doc(dict(doctype="User", email=email, first_name="Selam", last_name="Kebede", send_welcome_email=0,
                            enabled=1, user_type="System User", roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
        frappe.set_user(email)
        result = workspace.create("QA Setup Studio", "QA Setup Room", "QA Setup Visit", "Africa/Addis_Ababa", 30,
                                  "09:00", "17:00", list(workspace.DAYS), frappe.generate_hash(length=32))
        frappe.set_user("Administrator")
        self.assertTrue(result.get("provider_name"), result)
        self.assertEqual(frappe.db.get_value("Provider", {"user": email}, "full_name"), "Selam Kebede")
