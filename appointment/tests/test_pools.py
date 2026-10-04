"""Counted pools and resource-only bookings.

Pools use Bloom's Cut and shape at the main studio (Hanna and Eden). Resource-only
bookings turn Bloom's Scalp care consultation into a meeting-room style service
with two rooms. Every unit test rolls back; the race test commits and cleans up.
"""

import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from unittest.mock import patch

import frappe
import requests
from frappe.utils import add_days, get_datetime, nowdate

from appointment.scheduler import booking, notification_email, resources, self_service
from appointment.tests import test_resources as base
from appointment.tests.test_customer_notifications import OWNER
from appointment.tests import demo_offerings

HANNA, EDEN, MAIN = base.HANNA, base.EDEN, base.MAIN
SCALP_HANNA = demo_offerings.scalp_hanna()  # Scalp care consultation, Hanna, Bole main studio
ROOM_TYPE = "QA meeting room"


class PoolCase(base.ResourceCase):
    def _pool(self, capacity, units):
        [pool] = self._chairs(1, need=False)
        frappe.db.set_value("Resource", pool, "capacity", capacity)
        service = frappe.get_doc("Service", self.service)
        service.set("resource_needs", [dict(resource_type=self.kind, units=units)])
        resources._save_needs(service)
        return pool

    def _units(self, doc):
        return [(row.resource, row.units) for row in frappe.get_doc("Appointment", doc.name).resources]


class TestPools(PoolCase):
    def test_pool_units_come_from_one_resource_until_it_is_full(self):
        pool = self._pool(capacity=3, units=2)
        slot = self._shared_slots()[0]
        self.assertEqual(self._units(self._book(HANNA, slot)), [(pool, 2)])
        self.assertNotIn(slot["start_time"], base._free(EDEN, self._day(slot)), "One unit left is not enough for two.")
        with self.assertRaises(frappe.ValidationError):
            self._book(EDEN, slot)

    def test_pool_with_room_for_both(self):
        pool = self._pool(capacity=4, units=2)
        slot = self._shared_slots()[0]
        self._book(HANNA, slot)
        self.assertEqual(self._units(self._book(EDEN, slot)), [(pool, 2)])

    def test_block_takes_the_whole_pool_and_cancel_frees_units(self):
        pool = self._pool(capacity=10, units=1)
        slot = self._shared_slots()[0]
        start = get_datetime(slot["start_time"].replace("Z", ""))
        block = frappe.get_doc(dict(doctype="Resource Block", organization=self.org, resource=pool,
                                    starts_at=start, ends_at=start + timedelta(hours=1))).insert(ignore_permissions=True)
        with self.assertRaises(frappe.ValidationError):
            self._book(HANNA, slot)
        block.delete(ignore_permissions=True)

        frappe.db.set_value("Resource", pool, "capacity", 1)
        hanna = self._book(HANNA, slot)
        frappe.set_user(OWNER)
        booking.change(hanna.name, "cancel", str(frappe.db.get_value("Appointment", hanna.name, "modified")))
        self.assertEqual(self._units(self._book(EDEN, slot)), [(pool, 1)])

    def test_lowering_the_count_is_refused_while_bookings_hold_it(self):
        pool = self._pool(capacity=4, units=2)
        self._book(HANNA, self._shared_slots()[0])
        frappe.set_user(OWNER)
        result = resources.save_resource(self.org, "QA chair 1", self.kind, MAIN, name=pool, capacity=1)
        self.assertFalse(result["ok"])
        self.assertTrue(resources.save_resource(self.org, "QA chair 1", self.kind, MAIN, name=pool, capacity=6)["ok"])

    def test_reception_view_shows_units_left_for_this_booking(self):
        pool = self._pool(capacity=5, units=2)
        slot = self._shared_slots()[0]
        hanna = self._book(HANNA, slot)
        self._book(EDEN, slot)
        frappe.set_user(OWNER)
        option = resources.for_booking(hanna.name)["needs"][0]["options"][0]
        # Units left for this booking: the count minus what other bookings hold.
        self.assertEqual((option["name"], option["capacity"], option["left"]), (pool, 5, 3))


class RoomCase(base.ResourceCase):
    """Scalp care becomes a service booked without staff, with rooms A and B at the main studio."""

    def setUp(self):
        super().setUp()
        self.scalp = frappe.db.get_value("EventType", SCALP_HANNA, "service")
        kind = frappe.get_doc(dict(doctype="Resource Type", organization=self.org, type_name=ROOM_TYPE)).insert(ignore_permissions=True)
        self.room_type = kind.name
        self.rooms = {
            letter: frappe.get_doc(dict(doctype="Resource", organization=self.org, resource_name=f"QA room {letter}",
                                        resource_type=kind.name, location=MAIN)).insert(ignore_permissions=True).name
            for letter in "AB"
        }
        frappe.set_user(OWNER)
        resources.save_service_needs(self.scalp, [{"resource_type": kind.name}], resource_only=1)
        frappe.set_user("Administrator")
        self.offerings = {
            letter: frappe.db.get_value("EventType", {"service": self.scalp, "resource": room, "is_active": 1}, "name")
            for letter, room in self.rooms.items()
        }

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback()
        frappe.db.set_default(resources.PAUSED_KEY.format(frappe.db.get_value("EventType", SCALP_HANNA, "service")), "")
        frappe.clear_document_cache("Service", frappe.db.get_value("EventType", SCALP_HANNA, "service"))

    def _room_slot(self, letter="A"):
        for offset in range(2, 30):
            day = add_days(nowdate(), offset)
            free = list(base._free(self.offerings[letter], day).values())
            if free:
                return free[0]
        raise unittest.SkipTest("No free room slots in the next month.")


class TestResourceOnly(RoomCase):
    def test_offerings_follow_the_rooms_and_the_mode(self):
        self.assertTrue(all(self.offerings.values()))
        staff = frappe.get_all("EventType", filters={"service": self.scalp, "resource": ["is", "not set"]}, pluck="is_active")
        self.assertTrue(staff and not any(staff), "Staff offerings pause while the service is booked without staff.")

        frappe.set_user(OWNER)
        # Switching assigned the service's existing bookings to rooms A and B, so a new room C is turned off instead.
        room_c = resources.save_resource(self.org, "QA room C", self.room_type, MAIN)["name"]
        offering_c = frappe.db.get_value("EventType", {"service": self.scalp, "resource": room_c}, "name")
        self.assertEqual(frappe.db.get_value("EventType", offering_c, "is_active"), 1)
        self.assertTrue(resources.save_resource(self.org, "QA room C", self.room_type, MAIN, name=room_c, is_active=0)["ok"])
        self.assertEqual(frappe.db.get_value("EventType", offering_c, "is_active"), 0)

        resources.save_service_needs(self.scalp, [{"resource_type": self.room_type}], resource_only=0)
        self.assertEqual(frappe.db.get_value("EventType", self.offerings["A"], "is_active"), 0)
        self.assertEqual(frappe.db.get_value("EventType", SCALP_HANNA, "is_active"), 1, "Paused staff offerings come back.")

    def test_rule_one_need_without_a_specific_resource(self):
        frappe.set_user(OWNER)
        with self.assertRaises(frappe.ValidationError):
            resources.save_service_needs(self.scalp, [], resource_only=1)

    def test_a_room_is_booked_without_staff_and_holds_its_time(self):
        slot = self._room_slot("A")
        room_a = self._book(self.offerings["A"], slot)
        saved = frappe.get_doc("Appointment", room_a.name)
        self.assertIsNone(saved.provider or None)
        self.assertEqual([row.resource for row in saved.resources], [self.rooms["A"]])
        with self.assertRaises(frappe.ValidationError):
            self._book(self.offerings["A"], slot)
        self.assertEqual([row.resource for row in frappe.get_doc("Appointment", self._book(self.offerings["B"], slot).name).resources], [self.rooms["B"]])

        listed = booking.slots(self.offerings["A"], self._day(slot))["all_available_slots_for_data"]
        mine = next(s for s in listed if s["start_time"] == slot["start_time"])
        self.assertEqual((mine["available"], mine["provider_name"]), (False, "QA room A"))

    def test_staff_and_customer_change_a_room_booking(self):
        first, second = list(base._free(self.offerings["A"], self._day(self._room_slot("A"))).values())[:2]
        doc = self._book(self.offerings["A"], first)
        local = self._local(second)
        frappe.set_user(OWNER)
        booking.change(doc.name, "reschedule", str(frappe.db.get_value("Appointment", doc.name, "modified")),
                       date=local.date().isoformat(), start_time=local.strftime("%H:%M:%S"))
        self.assertEqual(str(get_datetime(frappe.db.get_value("Appointment", doc.name, "starts_at"))), str(get_datetime(second["start_time"].replace("Z", "").replace("T", " "))))
        frappe.set_user("Guest")
        self_service.cancel(self_service.token_for(frappe.get_doc("Appointment", doc.name)), accept_fee=1)
        self.assertEqual(frappe.db.get_value("Appointment", doc.name, "status"), "Cancelled")

    def test_emails_name_the_room_and_not_a_provider(self):
        doc = frappe.get_doc("Appointment", self._book(self.offerings["A"], self._room_slot("A")).name)
        html = notification_email.render("Confirmation", doc, "en", doc.client_email)["html"]
        self.assertIn("QA room A", html)
        self.assertNotIn(">Provider<", html)

    def test_reception_creates_a_room_booking(self):
        from appointment.scheduler.api import desk

        slot = self._room_slot("B")
        local = self._local(slot)
        frappe.set_user(OWNER)
        with patch.object(frappe.db, "commit"):
            result = desk.create_desk_appointment(
                client_name="Room walk-up", service_name=self.scalp, resource_name=self.rooms["B"],
                appointment_date=local.date().isoformat(), start_time=local.strftime("%H:%M:%S"),
            )
        self.assertNotIn("error", result, result)
        doc = frappe.get_doc("Appointment", {"client_name": "Room walk-up"})
        self.assertEqual(([row.resource for row in doc.resources], doc.provider or None), ([self.rooms["B"]], None))

    def test_public_page_lists_each_room(self):
        from appointment.api import personal_meet

        slug = frappe.db.get_value("Organization", self.org, "slug")
        names = {row["provider_name"] for row in personal_meet.get_organization_services(slug)["services"] if row["service_id"] == self.scalp}
        self.assertEqual(names, {"QA room A", "QA room B"})


class TestPoolRace(PoolCase):
    """Two guests race for the last units of a pool through separate HTTP requests; exactly one wins."""

    tearDown = base.TestRace.tearDown

    def test_last_units_go_to_exactly_one_request(self):
        try:
            requests.get(base.BASE + "/api/method/ping", timeout=5)
        except requests.RequestException:
            raise unittest.SkipTest("The site is not reachable over HTTP.")
        pool = self._pool(capacity=3, units=2)
        frappe.db.commit()
        slot = self._shared_slots()[0]
        frappe.db.sql("select name from `tabResource` where name=%s for update", pool)
        with ThreadPoolExecutor(max_workers=2) as executor:
            pending = [executor.submit(base.TestRace._post, self, offering, slot) for offering in (HANNA, EDEN)]
            time.sleep(1.0)
            self.assertTrue(all(not f.done() for f in pending), "Both requests must wait for the pool lock")
            frappe.db.commit()
            responses = [f.result() for f in pending]
        codes = sorted(r.status_code for r in responses)
        self.assertEqual(codes[0], 200, [r.text[:200] for r in responses])
        self.assertNotEqual(codes[1], 200, [r.text[:200] for r in responses])
