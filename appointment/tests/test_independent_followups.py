"""Independent provider follow-ups: rescheduling with any publish state, and walk-ins.

Two independent providers (A and B) each have one offering, as in test_independent_customers.
Organization checks use the rich demo business Bloom. Every test rolls back what it creates;
the walk-in APIs commit, so their commits are held for the test.
See docs/features/INDEPENDENT_PROVIDER_FOLLOWUPS_PLAN.md.
"""

from datetime import datetime, timedelta
import unittest
from unittest import mock

import frappe
import pytz

from appointment.scheduler import booking, independent, self_service
from appointment.scheduler.api import desk
# Modules, not classes: a test class imported here would run again with this module.
from appointment.tests import test_content_entitlements as entitlements
from appointment.tests import test_customer_notifications as notices
from appointment.tests import test_independent_customers as customers
from appointment.tests.test_customer_notifications import MANAGER, OFFERING


def _day(slot):
    return slot["start_time"][:10]


class IndependentFollowupTests(unittest.TestCase):
    _business = customers.IndependentCustomerTests._business
    _slots = customers.IndependentCustomerTests._slots
    _book = customers.IndependentCustomerTests._book

    @classmethod
    def setUpClass(cls):
        entitlements.EntitlementIsolationTests.setUpClass()
        cls.fixture = entitlements.EntitlementIsolationTests.state

    @classmethod
    def tearDownClass(cls):
        entitlements._cleanup(cls.fixture)

    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("independent_followups")
        self.businesses = {suffix: self._business(suffix) for suffix in ("A", "B")}
        self.held = mock.patch.object(frappe.db, "commit")
        self.held.start()
        frappe.set_user("Guest")

    def tearDown(self):
        self.held.stop()
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="independent_followups")

    def _as_owner(self, suffix):
        frappe.set_user(self.fixture["owners"][suffix])

    # Rescheduling ----------------------------------------------------------
    def test_unpublished_offering_is_rescheduled_through_the_manage_link(self):
        doc = self._book()
        target = self._slots(self.businesses["A"].offering)[2]
        self._as_owner("A")
        independent.publish(self.businesses["A"].provider, 0)
        frappe.set_user("Guest")
        with self.assertRaises(frappe.PermissionError):
            booking.slots(self.businesses["A"].offering, _day(target))

        token = self_service.token_for(doc)
        times = self_service.slots(token, _day(target), independent=1)["all_available_slots_for_data"]
        self.assertIn(target["start_time"], [row["start_time"] for row in times if row["available"]])
        moved = self_service.reschedule(token, target["start_time"], independent=1)
        self.assertEqual(moved["booking"]["starts_at"], target["start_time"])

    def test_tampered_or_expired_token_gets_no_times(self):
        doc = self._book()
        day = _day(self._slots(self.businesses["A"].offering)[0])
        other = self._book(slot=1)
        name, version, signature = self_service.token_for(doc).rsplit(".", 2)
        for token in (f"{other.name}.{version}.{signature}", "not-a-token"):
            with self.assertRaises(frappe.PermissionError):
                self_service.slots(token, day, independent=1)

        frappe.db.set_value("Appointment", doc.name, "starts_at", datetime.now(pytz.UTC).replace(tzinfo=None) - timedelta(minutes=5),
                            update_modified=False)
        with self.assertRaises(frappe.PermissionError):
            self_service.slots(self_service.token_for(frappe.get_doc("Appointment", doc.name)), day, independent=1)

    def test_booking_that_cannot_change_gets_no_times(self):
        doc = self._book()
        day = _day(self._slots(self.businesses["A"].offering)[0])
        frappe.db.set_value("Appointment", doc.name, "self_reschedules", self_service.MAX_SELF_RESCHEDULES, update_modified=False)
        result = self_service.slots(self_service.token_for(frappe.get_doc("Appointment", doc.name)), day, independent=1)
        self.assertEqual(result["all_available_slots_for_data"], [])

    # Walk-ins --------------------------------------------------------------
    def _service(self, suffix):
        return frappe.db.get_value("EventType", self.businesses[suffix].offering, "service")

    def _walk_in(self, suffix="A", name="Meron Alemu"):
        self._as_owner(suffix)
        result = desk.add_walk_in(client_name=name, client_phone="+251911400500", service_requested=self._service(suffix),
                                  business=self.businesses[suffix].key)
        self.assertTrue(result.get("success"), result)
        return result["walk_in"]["name"]

    def test_provider_adds_sees_and_assigns_a_walk_in(self):
        business = self.businesses["A"]
        name = self._walk_in()
        walk_in = frappe.get_doc("Walk In", name)
        self.assertEqual(walk_in.independent_provider, business.provider)
        self.assertEqual(walk_in.provider_preferred, business.provider)
        self.assertEqual(walk_in.location, frappe.db.get_value("EventType", business.offering, "location"))
        queue = desk.get_walk_ins(business=business.key)["walk_ins"]
        self.assertEqual([row["name"] for row in queue], [name])

        result = desk.assign_walk_in_to_slot(name, business.provider, walk_in.location)
        self.assertTrue(result.get("success"), result)
        appointment = frappe.get_doc("Appointment", result["appointment"]["name"])
        self.assertFalse(appointment.organization)
        self.assertEqual((appointment.provider, appointment.event_type), (business.provider, business.offering))
        self.assertEqual(frappe.db.get_value("Walk In", name, ["status", "assigned_appointment"]), ("assigned", appointment.name))
        self.assertEqual(frappe.db.get_value("Customer Profile", appointment.customer, "independent_provider"), business.provider)
        self.assertEqual(desk.get_walk_ins(business=business.key)["walk_ins"], [])

    def test_another_owner_cannot_see_or_change_the_walk_in(self):
        name = self._walk_in("A")
        self._as_owner("B")
        with self.assertRaises(frappe.PermissionError):
            desk.get_walk_ins(business=self.businesses["A"].key)
        self.assertNotIn(name, [row["name"] for row in desk.get_walk_ins(business=self.businesses["B"].key)["walk_ins"]])
        self.assertNotIn(name, [row["name"] for row in desk.get_walk_ins()["walk_ins"]])
        with self.assertRaises(frappe.PermissionError):
            desk.assign_walk_in_to_slot(name, self.businesses["B"].provider, None)
        with self.assertRaises(frappe.PermissionError):
            desk.add_walk_in(client_name="Meron Alemu", client_phone="+251911400500", business=self.businesses["A"].key)
        with mock.patch.object(frappe.db, "rollback"):  # The API rolls back its own failure; keep the test's savepoint.
            refused = desk.add_walk_in(client_name="Meron Alemu", client_phone="+251911400500",
                                       service_requested=self._service("A"), business=self.businesses["B"].key)
        self.assertFalse(refused.get("success"))
        self.assertEqual(frappe.db.get_value("Walk In", name, "status"), "waiting")

    def test_walk_in_needs_exactly_one_business(self):
        frappe.set_user("Administrator")
        bloom_location = frappe.db.get_value("EventType", OFFERING, "location")
        with self.assertRaises(frappe.PermissionError):
            frappe.get_doc(dict(doctype="Walk In", client_name="Meron Alemu", client_phone="+251911400500",
                                location=bloom_location, independent_provider=self.businesses["A"].provider)).insert()


class OrganizationFollowupTests(notices.BloomBookingCase):
    """Organizations keep their reschedule times and walk-ins."""

    def test_organization_reschedule_times_are_unchanged(self):
        result = self._book()
        doc = frappe.get_doc("Appointment", result["booking_id"])
        slug = frappe.db.get_value("Organization", self.org, "slug")
        day = _day(self.slots[0])
        token = self_service.token_for(doc)
        public = booking.slots(OFFERING, day, self.org)["all_available_slots_for_data"]
        self.assertEqual(self_service.slots(token, day, slug)["all_available_slots_for_data"], public)
        with self.assertRaises(frappe.PermissionError):
            self_service.slots(token, day, "another-business")
        moved = self_service.reschedule(token, self.slots[2]["start_time"], slug)
        self.assertEqual(moved["booking"]["starts_at"], self.slots[2]["start_time"])

    def test_organization_walk_ins_are_unchanged(self):
        frappe.set_user(MANAGER)
        location = frappe.db.get_value("EventType", OFFERING, "location")
        with mock.patch.object(frappe.db, "commit"):
            result = desk.add_walk_in(client_name="Meron Alemu", client_phone="+251911400500", location_name=location)
        self.assertTrue(result.get("success"), result)
        name = result["walk_in"]["name"]
        self.assertFalse(frappe.db.get_value("Walk In", name, "independent_provider"))
        self.assertIn(name, [row["name"] for row in desk.get_walk_ins(location_name=location)["walk_ins"]])
