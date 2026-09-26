"""Independent offering ownership, public capacity, and foreign-owner denial."""

from datetime import datetime, timedelta
import json
import sys
import unittest

import frappe

from appointment.public_experience import solo_setup
from appointment.scheduler import booking, booking_access, independent
from appointment.tests.test_content_entitlements import EntitlementIsolationTests, _cleanup, require_target


class IndependentBookingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        EntitlementIsolationTests.setUpClass()
        cls.fixture = EntitlementIsolationTests.state

    @classmethod
    def tearDownClass(cls):
        _cleanup(cls.fixture)

    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("independent_booking")
        frappe.set_user(self.fixture["owners"]["A"])
        self.owner = solo_setup.create(self.fixture["marker"] + " Independent booking")["provider"]
        self.before = frappe.db.count("Organization")
        self.row = independent.create(self.owner, self.fixture["marker"] + " Independent location",
            "Independent consultation", "Africa/Addis_Ababa", 30, "09:00", "17:00", list(independent.DAYS))

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="independent_booking")

    def test_private_publish_guest_book_retry_and_capacity(self):
        with self.assertRaises(frappe.PermissionError):
            independent.public_offering(self.row["offering"])
        independent.publish(self.owner, 1)
        frappe.set_user("Guest")
        info = independent.public_offering(self.row["offering"])
        self.assertEqual(info["service"], "Independent consultation")
        day = (datetime.now() + timedelta(days=2)).date().isoformat()
        available = booking.slots(self.row["offering"], day)["all_available_slots_for_data"]
        slot = next(row for row in available if row["available"])
        arguments = dict(offering_id=self.row["offering"], start_time=slot["start_time"], end_time=slot["end_time"],
                         user_name="Synthetic guest", user_email="independent-test@example.test", request_id="independent-test-request-0001")
        result = booking.book(**arguments)
        self.assertEqual(booking.book(**arguments), result)
        doc = frappe.get_doc("Appointment", result["booking_id"])
        self.assertFalse(doc.organization)
        self.assertEqual(doc.provider, self.owner)
        arguments["request_id"] = "independent-test-request-0002"
        with self.assertRaises(frappe.ValidationError):
            booking.book(**arguments)
        frappe.set_user(self.fixture["owners"]["A"])
        self.assertTrue(booking_access.can_access(doc))
        self.assertEqual(frappe.db.count("Organization"), self.before)
        independent.publish(self.owner, 0)
        with self.assertRaises(frappe.PermissionError):
            independent.public_offering(self.row["offering"])
        self.assertTrue(booking_access.can_access(doc))

    def test_foreign_owner_cannot_configure_publish_or_read_booking(self):
        event, service, location, provider, _ = booking.offering(self.row["offering"])
        frappe.set_user(self.fixture["owners"]["B"])
        for doc in (event, service, location):
            self.assertFalse(booking_access.config_permission(doc))
        with self.assertRaises(frappe.PermissionError):
            independent.publish(provider.name, 1)
        with self.assertRaises(frappe.PermissionError):
            independent.create(provider.name, "Foreign location", "Foreign service", "Africa/Addis_Ababa", 30, "09:00", "17:00", ["Monday"])

    def test_document_lists_include_only_owned_independent_offerings(self):
        event, service, location, _, _ = booking.offering(self.row["offering"])
        for doc in (event, service, location):
            self.assertTrue(booking_access.config_permission(doc))
            self.assertTrue(frappe.get_list(doc.doctype, filters={"name": doc.name}, fields=["name"]))
        frappe.set_user(self.fixture["owners"]["B"])
        for doc in (event, service, location):
            self.assertEqual(frappe.get_list(doc.doctype, filters={"name": doc.name}, fields=["name"]), [])

    def test_mixed_owner_links_and_owner_mutation_fail_closed(self):
        _, service, location, provider, _ = booking.offering(self.row["offering"])
        location.independent_provider = "foreign-provider"
        self.assertFalse(independent.matches(service, location, provider))
        service.organization = self.fixture["orgs"]["A"]
        with self.assertRaises(frappe.PermissionError):
            independent.validate(service)


def run():
    require_target()
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(IndependentBookingTests)
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(suite)
    summary = {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
    print(json.dumps(summary))
    if not result.wasSuccessful():
        raise RuntimeError("Independent booking tests failed")
    return summary
