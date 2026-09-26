"""Monitoring must preserve permissions, exceptions, and confidential payloads."""

import sys
import unittest
from unittest.mock import patch

import frappe

from appointment.content import monitoring
from appointment.tests.test_content_entitlements import require_target


class MonitoringTests(unittest.TestCase):
    def test_private_payload_is_never_logged(self):
        @monitoring.observed("newsletter.unsubscribe")
        def unsubscribe(token):
            raise ValueError("secret recipient and token " + token)

        with patch.object(monitoring, "record") as record:
            with self.assertRaises(ValueError):
                unsubscribe("PRIVATE-TOKEN")
            record.assert_called_once_with("newsletter.unsubscribe", "failure", None, "ValueError")
            self.assertNotIn("PRIVATE-TOKEN", str(record.call_args))

    def test_foreign_business_is_not_attributed_to_owner_counters(self):
        owner = frappe._dict(owner_type="Organization", organization="foreign", provider=None)
        with patch.object(frappe.db, "get_value", return_value=owner), patch.object(monitoring.tenancy, "can_manage_business", return_value=False):
            self.assertIsNone(monitoring._authorized_site({"site": "foreign-site"}, "site"))

    def test_failed_observation_does_not_change_success(self):
        @monitoring.observed("article.publish")
        def publish(site):
            return {"release": "safe-release"}

        with patch.object(monitoring, "_authorized_site", side_effect=RuntimeError("Unavailable cache")), patch.object(monitoring, "record") as record:
            self.assertEqual(publish("owned"), {"release": "safe-release"})
            record.assert_called_once_with("article.publish", "success", None)

    def test_monitor_failure_does_not_mask_business_operation(self):
        with patch.object(frappe, "logger", side_effect=OSError("Unavailable log")):
            monitoring.record("article.publish", "failure", "owned", "ValidationError")

    def test_held_background_delivery_is_distinct_from_success(self):
        @monitoring.observed("newsletter.worker", scope="campaign")
        def deliver(name):
            return {"status": "Held"}

        with patch.object(monitoring, "_authorized_site", return_value="owned"), patch.object(monitoring, "record") as record:
            self.assertEqual(deliver("campaign"), {"status": "Held"})
            record.assert_called_once_with("newsletter.worker", "state.Held", "owned")


def run():
    require_target()
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(MonitoringTests))
    if not result.wasSuccessful():
        raise RuntimeError("Content monitoring tests failed")
    return {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
