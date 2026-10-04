"""Rooms and equipment: allocation, slots, blocks, staff changes, upcoming bookings and races.

Uses Bloom's "Cut and shape" at the main studio, offered by two stylists
(Hanna and Eden), plus Rahel's offering at the quiet room. Every unit test
rolls back. The race test commits its setup and removes it afterwards.
"""

import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from unittest.mock import patch

import frappe
import pytz
import requests
from frappe.utils import add_days, get_datetime, get_time, nowdate

from appointment.scheduler import booking, resources
from appointment.tests.test_customer_notifications import OTHER_OWNER, OWNER
from appointment.tests import demo_offerings

HANNA = demo_offerings.cut_hanna()  # Cut and shape, Hanna, Bole main studio
EDEN = demo_offerings.cut_eden()  # Cut and shape, Eden, Bole main studio
RAHEL = demo_offerings.cut_rahel()  # Cut and shape, Rahel, Bole quiet styling room
MAIN = "Bole main studio"
# The site's own browser URL (set per worktree stack), so HTTP races hit this site.
BASE = (frappe.conf.get("host_name") or "http://127.0.0.84:44430").rstrip("/")
QA_TYPE = "QA styling chair"


def _free(offering, day):
    return {s["start_time"]: s for s in booking.slots(offering, day)["all_available_slots_for_data"] if s["available"]}


class ResourceCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        frappe.set_user("Administrator")
        if not all(frappe.db.exists("EventType", name) for name in (HANNA, EDEN, RAHEL)):
            raise unittest.SkipTest("Rich demo businesses are not seeded on this site.")
        cls.org = frappe.db.get_value("Service", frappe.db.get_value("EventType", HANNA, "service"), "organization")
        cls.service = frappe.db.get_value("EventType", HANNA, "service")
        cls.shared = cls._find_shared_slots()

    def setUp(self):
        frappe.set_user("Administrator")

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback()
        frappe.clear_document_cache("Service", self.service)

    # Helpers ----------------------------------------------------------------
    def _chairs(self, count=1, need=True, location=MAIN):
        kind = frappe.get_doc(dict(doctype="Resource Type", organization=self.org, type_name=QA_TYPE)).insert(ignore_permissions=True)
        chairs = [
            frappe.get_doc(dict(doctype="Resource", organization=self.org, resource_name=f"QA chair {n + 1}", resource_type=kind.name, location=location)).insert(ignore_permissions=True).name
            for n in range(count)
        ]
        if need:
            self._need(kind.name)
        self.kind = kind.name
        return chairs

    def _need(self, kind, specific=None):
        service = frappe.get_doc("Service", self.service)
        service.set("resource_needs", [dict(resource_type=kind, specific_resource=specific)])
        resources._save_needs(service)

    @classmethod
    def _find_shared_slots(cls):
        """Slots where Hanna, Eden and Rahel are all free on one day, found before any test adds needs."""
        for offset in range(2, 30):
            day = add_days(nowdate(), offset)
            eden, rahel = _free(EDEN, day), _free(RAHEL, day)
            common = [s for t, s in _free(HANNA, day).items() if t in eden and t in rahel]
            if len(common) >= 2:
                return common
        raise unittest.SkipTest("No shared free slots in the next month.")

    def _shared_slots(self, count=2):
        return self.shared[:count]

    def _book(self, offering, slot):
        frappe.set_user("Guest")
        try:
            result = booking.book(
                offering, slot["start_time"], slot["end_time"], "Chair Test", f"qa-res-{frappe.generate_hash(length=8)}@example.test",
                frappe.generate_hash(length=24), organization_id=self.org,
            )
        finally:
            frappe.set_user("Administrator")
        return frappe.get_doc("Appointment", result["booking_id"])

    def _day(self, slot):
        """The slot's local date at the main studio, as booking.slots expects."""
        zone = pytz.timezone(frappe.db.get_value("Location", MAIN, "timezone"))
        return pytz.UTC.localize(get_datetime(slot["start_time"].replace("Z", ""))).astimezone(zone).date().isoformat()

    def _local(self, slot):
        zone = pytz.timezone(frappe.db.get_value("Location", MAIN, "timezone"))
        return pytz.UTC.localize(get_datetime(slot["start_time"].replace("Z", ""))).astimezone(zone)

    def _held(self, doc):
        return [row.resource for row in frappe.get_doc("Appointment", doc.name).resources]


class TestAllocation(ResourceCase):
    def test_one_chair_is_shared_by_two_stylists(self):
        [chair] = self._chairs(1)
        slot = self._shared_slots()[0]
        hanna = self._book(HANNA, slot)
        self.assertEqual(self._held(hanna), [chair])
        # Needs belong to the service, so Rahel's quiet room also needs a chair, and it has none.

        self.assertNotIn(slot["start_time"], _free(EDEN, self._day(slot)), "Eden's slot must close with the chair taken.")
        with self.assertRaises(frappe.ValidationError):
            self._book(EDEN, slot)
        with self.assertRaises(frappe.ValidationError):
            self._book(RAHEL, slot)

    def test_two_chairs_serve_both_stylists_and_other_locations_do_not_count(self):
        chairs = self._chairs(2)
        slot = self._shared_slots()[0]
        held = self._held(self._book(HANNA, slot)) + self._held(self._book(EDEN, slot))
        self.assertEqual(sorted(held), sorted(chairs))

    def test_no_need_means_no_change(self):
        self._chairs(1, need=False)
        slot = self._shared_slots()[0]
        self.assertEqual(self._held(self._book(HANNA, slot)), [])
        self.assertEqual(self._held(self._book(EDEN, slot)), [])

    def test_cancelling_frees_the_chair(self):
        self._chairs(1)
        slot = self._shared_slots()[0]
        hanna = self._book(HANNA, slot)
        frappe.set_user(OWNER)
        booking.change(hanna.name, "cancel", str(frappe.db.get_value("Appointment", hanna.name, "modified")))
        self.assertTrue(self._held(self._book(EDEN, slot)))

    def test_reschedule_keeps_the_chair_when_it_is_free(self):
        chairs = self._chairs(2)
        first, second = self._shared_slots(2)[:2]
        hanna = self._book(HANNA, first)
        before = self._held(hanna)
        local = self._local(second)
        frappe.set_user(OWNER)
        booking.change(hanna.name, "reschedule", str(frappe.db.get_value("Appointment", hanna.name, "modified")),
                       date=local.date().isoformat(), start_time=local.strftime("%H:%M:%S"))
        self.assertEqual(self._held(hanna), before)
        self.assertIn(before[0], chairs)

    def test_specific_resource(self):
        chairs = self._chairs(2, need=False)
        self._need(self.kind, specific=chairs[1])
        slot = self._shared_slots()[0]
        self.assertEqual(self._held(self._book(HANNA, slot)), [chairs[1]])
        with self.assertRaises(frappe.ValidationError):
            self._book(EDEN, slot)

    def test_inactive_resource_offers_no_slots(self):
        slot = self._shared_slots()[0]
        [chair] = self._chairs(1)
        frappe.db.set_value("Resource", chair, "is_active", 0)
        self.assertFalse(_free(HANNA, self._day(slot)))

    def test_block_hides_slots_and_refuses_bookings(self):
        [chair] = self._chairs(1)
        slot = self._shared_slots()[0]
        start = get_datetime(slot["start_time"].replace("Z", ""))
        frappe.get_doc(dict(doctype="Resource Block", organization=self.org, resource=chair,
                            starts_at=start, ends_at=start + timedelta(hours=1))).insert(ignore_permissions=True)
        self.assertNotIn(slot["start_time"], _free(HANNA, self._day(slot)))
        with self.assertRaises(frappe.ValidationError):
            self._book(HANNA, slot)


class TestLocking(ResourceCase):
    def test_slot_listing_takes_no_row_locks_but_booking_does(self):
        self._chairs(1)
        slot = self._shared_slots()[0]
        seen = []
        original = frappe.db.sql

        def spy(query, *args, **kwargs):
            seen.append(str(query))
            return original(query, *args, **kwargs)

        with patch.object(frappe.db, "sql", side_effect=spy):
            booking.slots(HANNA, self._day(slot))
        self.assertFalse([q for q in seen if "for update" in q.lower()], "Slot listing must not wait on bookings in progress.")
        seen.clear()
        with patch.object(frappe.db, "sql", side_effect=spy):
            self._book(HANNA, slot)
        self.assertTrue([q for q in seen if "for update" in q.lower()])


class TestStaffActions(ResourceCase):
    def test_staff_move_a_booking_to_another_free_chair(self):
        chairs = self._chairs(2)
        slot = self._shared_slots()[0]
        hanna = self._book(HANNA, slot)
        other = next(c for c in chairs if c not in self._held(hanna))
        frappe.set_user(OWNER)
        view = resources.set_resource(hanna.name, self.kind, other)
        self.assertEqual(view["needs"][0]["resource"], other)

        eden = self._book(EDEN, slot)
        frappe.set_user(OWNER)
        taken = self._held(eden)[0]
        with self.assertRaises(frappe.ValidationError):
            resources.set_resource(hanna.name, self.kind, taken)
        options = {o["name"]: o["free"] for o in resources.for_booking(hanna.name)["needs"][0]["options"]}
        self.assertEqual(options, {other: True, taken: False})

    def test_another_business_cannot_see_or_change(self):
        chairs = self._chairs(2)
        hanna = self._book(HANNA, self._shared_slots()[0])
        frappe.set_user(OTHER_OWNER)
        with self.assertRaises(frappe.PermissionError):
            resources.set_resource(hanna.name, self.kind, chairs[0])
        with self.assertRaises(frappe.PermissionError):
            resources.overview(self.org)
        with self.assertRaises(frappe.PermissionError):
            resources.save_block(chairs[0], "2030-01-01T10:00", "2030-01-01T11:00")

    def test_block_and_deactivate_list_clashing_bookings(self):
        [chair] = self._chairs(1)
        slot = self._shared_slots()[0]
        hanna = self._book(HANNA, slot)
        local = frappe.get_doc("Appointment", hanna.name)
        start = f"{local.appointment_date}T{get_time(local.start_time):%H:%M}"
        end = f"{local.appointment_date}T{get_time(local.end_time):%H:%M}"
        frappe.set_user(OWNER)
        result = resources.save_block(chair, start, end, "Repair")
        self.assertFalse(result["ok"])
        self.assertEqual([c["booking"] for c in result["conflicts"]], [hanna.name])
        result = resources.save_resource(self.org, "QA chair 1", self.kind, MAIN, name=chair, is_active=0)
        self.assertFalse(result["ok"])
        self.assertFalse(frappe.db.exists("Resource Block", {"resource": chair}))

    def test_saving_needs_assigns_upcoming_bookings_and_lists_the_rest(self):
        self._chairs(1, need=False)
        slot = self._shared_slots()[0]
        hanna = self._book(HANNA, slot)
        eden = self._book(EDEN, slot)
        frappe.set_user(OWNER)
        result = resources.save_service_needs(self.service, [{"resource_type": self.kind}])
        held = [self._held(hanna), self._held(eden)]
        self.assertEqual(sorted(len(h) for h in held), [0, 1])
        self.assertEqual(len([r for r in result["unassigned"] if r["booking"] in (hanna.name, eden.name)]), 1)

        # Editing an unassigned booking's notes still works.
        lacking = eden if not held[1] else hanna
        doc = frappe.get_doc("Appointment", lacking.name)
        doc.notes = "Window seat"
        doc.save(ignore_permissions=True)

        # Dropping the need releases the chair.
        resources.save_service_needs(self.service, [])
        self.assertEqual(self._held(hanna) + self._held(eden), [])

    def test_needs_must_stay_in_the_business(self):
        foreign = frappe.get_doc(dict(doctype="Resource Type", organization=frappe.db.get_value("Organization", {"owner_user": OTHER_OWNER}, "name"), type_name="QA foreign")).insert(ignore_permissions=True)
        frappe.set_user(OWNER)
        with self.assertRaises(frappe.ValidationError):
            resources.save_service_needs(self.service, [{"resource_type": foreign.name}])


class TestRace(ResourceCase):
    """Two guests race for the last chair through separate HTTP requests; exactly one wins."""

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback()
        names = frappe.get_all("Appointment", filters={"client_email": ["like", "qa-race-%"]}, pluck="name")
        # The confirmation email is rendered by a worker after commit; let it finish before removing the booking.
        for _attempt in range(30):
            frappe.db.rollback()
            if not frappe.db.exists("Appointment Notification", {"appointment": ["in", names or [""]], "status": "Queued"}):
                break
            time.sleep(0.5)
        customers = set(frappe.get_all("Appointment", filters={"name": ["in", names or [""]]}, pluck="customer"))
        for table, field in (("Appointment Notification", "appointment"), ("Email Queue", "reference_name")):
            frappe.db.delete(table, {field: ["in", names or [""]]})
        for name in names:
            frappe.delete_doc("Appointment", name, ignore_permissions=True, force=True)
        for name in customers:
            if name and not frappe.db.exists("Appointment", {"customer": name}):
                frappe.delete_doc("Customer Profile", name, ignore_permissions=True, force=True)
        service = frappe.get_doc("Service", self.service)
        service.set("resource_needs", [])
        resources._save_needs(service)
        for name in frappe.get_all("Resource", filters={"resource_name": ["like", "QA chair%"]}, pluck="name"):
            frappe.delete_doc("Resource", name, ignore_permissions=True, force=True)
        for name in frappe.get_all("Resource Type", filters={"type_name": QA_TYPE}, pluck="name"):
            frappe.delete_doc("Resource Type", name, ignore_permissions=True, force=True)
        frappe.db.commit()
        frappe.clear_document_cache("Service", self.service)

    def _post(self, offering, slot):
        return requests.post(BASE + "/api/method/appointment.scheduler.booking.book", timeout=60, data=dict(
            offering_id=offering, start_time=slot["start_time"], end_time=slot["end_time"], user_name="Race Test",
            user_email=f"qa-race-{frappe.generate_hash(length=8)}@example.test", request_id=frappe.generate_hash(length=24),
            organization_id=self.org,
        ))

    def test_last_chair_goes_to_exactly_one_request(self):
        try:
            requests.get(BASE + "/api/method/ping", timeout=5)
        except requests.RequestException:
            raise unittest.SkipTest("The site is not reachable over HTTP.")
        [chair] = self._chairs(1)
        frappe.db.commit()
        slot = self._shared_slots()[0]
        # Hold the chair's row lock so both requests reach the allocation step and wait on it.
        frappe.db.sql("select name from `tabResource` where name=%s for update", chair)
        with ThreadPoolExecutor(max_workers=2) as executor:
            pending = [executor.submit(self._post, offering, slot) for offering in (HANNA, EDEN)]
            time.sleep(1.0)
            self.assertTrue(all(not f.done() for f in pending), "Both requests must wait for the chair lock")
            frappe.db.commit()
            responses = [f.result() for f in pending]
        codes = sorted(r.status_code for r in responses)
        self.assertEqual(codes[0], 200, [r.text[:200] for r in responses])
        self.assertNotEqual(codes[1], 200, [r.text[:200] for r in responses])
        held = frappe.db.sql(
            "select count(*) from `tabAppointment Resource` r join `tabAppointment` a on a.name=r.parent where r.resource=%s and a.status in %s",
            (chair, booking.ACTIVE),
        )[0][0]
        self.assertEqual(held, 1)
