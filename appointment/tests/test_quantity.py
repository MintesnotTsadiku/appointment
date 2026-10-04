"""Booking quantity (party size) and the resource follow-ups: room use in Insights,
the reception room filter, and services for a business without staff.

Builds on the pool and room fixtures in test_pools; every test rolls back.
"""

from datetime import date, timedelta
from unittest.mock import patch

import frappe
from frappe.utils import flt

from appointment.scheduler import analytics, booking, notification_email, payments, resources, self_service
from appointment.tests import test_pools as pools
from appointment.tests import test_resources as base
from appointment.tests.test_customer_notifications import OWNER

HANNA, EDEN = base.HANNA, base.EDEN


class QuantityCase(pools.PoolCase):
    def _allow(self, most=3):
        frappe.db.set_value("Service", self.service, {"allow_quantity": 1, "max_quantity": most})
        frappe.clear_document_cache("Service", self.service)

    def _book_many(self, offering, slot, quantity):
        frappe.set_user("Guest")
        try:
            result = booking.book(
                offering, slot["start_time"], slot["end_time"], "Party Test", f"qa-qty-{frappe.generate_hash(length=8)}@example.test",
                frappe.generate_hash(length=24), organization_id=self.org, quantity=quantity,
            )
        finally:
            frappe.set_user("Administrator")
        return frappe.get_doc("Appointment", result["booking_id"])


class TestQuantity(QuantityCase):
    def test_quantity_takes_units_and_shapes_slots(self):
        pool = self._pool(capacity=4, units=1)
        self._allow(3)
        slot = self._shared_slots()[0]
        hanna = self._book_many(HANNA, slot, 3)
        self.assertEqual((hanna.quantity, self._units(hanna)), (3, [(pool, 3)]))

        day = self._day(slot)
        two = {s["start_time"]: s["available"] for s in booking.slots(EDEN, day, quantity=2)["all_available_slots_for_data"]}
        one = {s["start_time"]: s["available"] for s in booking.slots(EDEN, day, quantity=1)["all_available_slots_for_data"]}
        self.assertEqual((two[slot["start_time"]], one[slot["start_time"]]), (False, True))
        with self.assertRaises(frappe.ValidationError):
            self._book_many(EDEN, slot, 2)
        self.assertEqual(self._units(self._book_many(EDEN, slot, 1)), [(pool, 1)])

    def test_the_maximum_and_the_switch_are_enforced(self):
        slot = self._shared_slots()[0]
        with self.assertRaises(frappe.ValidationError):
            self._book_many(HANNA, slot, 2)  # The service does not allow a quantity.
        self._allow(3)
        with self.assertRaises(frappe.ValidationError):
            self._book_many(HANNA, slot, 4)

    def test_price_deposit_and_late_fee_use_the_quantity(self):
        self._allow(3)
        slot = self._shared_slots()[0]
        frappe.db.set_value("EventType", HANNA, "price_override", 100)
        quote = payments.quote_for(HANNA, booking.utc(slot["start_time"]), 3)
        self.assertEqual((quote["unit_price"], quote["service_price"], quote["quantity"]), (100, 300, 3))
        doc = self._book_many(HANNA, slot, 3)
        self.assertEqual(self_service._late_fee(doc, {"late_cancellation_fee_percentage": 50}), 150)

    def test_email_shows_the_quantity_and_reception_creates_with_one(self):
        from appointment.scheduler.api import desk

        self._allow(3)
        first, second = self._shared_slots(2)
        doc = self._book_many(HANNA, first, 2)
        html = notification_email.render("Confirmation", doc, "en", doc.client_email)["html"]
        self.assertIn("Quantity", html)

        local = self._local(second)
        frappe.set_user(OWNER)
        with patch.object(frappe.db, "commit"):
            result = desk.create_desk_appointment(
                client_name="Desk party", service_name=self.service, provider_name=frappe.db.get_value("EventType", EDEN, "provider"),
                location_name=base.MAIN, appointment_date=local.date().isoformat(), start_time=local.strftime("%H:%M:%S"), quantity=3,
            )
        self.assertNotIn("error", result, result)
        self.assertEqual(frappe.db.get_value("Appointment", {"client_name": "Desk party"}, "quantity"), 3)


class TestFollowUps(QuantityCase):
    def test_room_use_counts_units_over_open_hours(self):
        pool = self._pool(capacity=2, units=1)
        slot = self._shared_slots()[0]
        doc = self._book(HANNA, slot)
        start = frappe.utils.getdate(doc.appointment_date)
        frappe.set_user(OWNER)
        workspace = {"is_manager": True, "role": "Owner"}
        rows = analytics._resource_usage(self.org, workspace, [], start, start, analytics.ZoneInfo("Africa/Addis_Ababa"))
        row = next(r for r in rows if r["resource"] == pool)
        minutes = (frappe.utils.get_datetime(doc.occupied_until) - frappe.utils.get_datetime(doc.occupied_from)).total_seconds() / 60
        self.assertEqual(row["booked_hours"], round(minutes / 60, 1))
        self.assertEqual(row["capacity"], 2)
        self.assertTrue(row["available_hours"] > row["booked_hours"])
        self.assertIsNone(analytics._resource_usage(self.org, {"is_manager": False, "role": "Provider"}, [], start, start, analytics.ZoneInfo("UTC")))

    def test_reception_filters_by_room(self):
        from appointment.scheduler.api import desk

        chairs = self._chairs(2)
        slot = self._shared_slots()[0]
        hanna = self._book(HANNA, slot)
        held = frappe.get_doc("Appointment", hanna.name).resources[0].resource
        frappe.set_user(OWNER)
        listed = desk.get_desk_appointments(date=str(hanna.appointment_date), organization=self.org, resource=held)
        listed = listed[0] if isinstance(listed, tuple) else listed
        self.assertEqual([row.name for row in listed["appointments"]], [hanna.name])
        other = next(c for c in chairs if c != held)
        listed = desk.get_desk_appointments(date=str(hanna.appointment_date), organization=self.org, resource=other)
        listed = listed[0] if isinstance(listed, tuple) else listed
        self.assertEqual(listed["appointments"], [])

    def test_a_business_without_staff_can_create_a_service(self):
        from appointment import onboarding

        real = frappe.get_all

        def no_staff(doctype, *args, **kwargs):
            if doctype == "Provider Organization":
                return []
            return real(doctype, *args, **kwargs)

        frappe.set_user(OWNER)
        with patch.object(frappe, "get_all", side_effect=no_staff), patch.object(frappe.db, "commit"):
            onboarding.create_service("QA room hire", 60, 0, price=200, organization=self.org, location=base.MAIN)
        service = frappe.db.get_value("Service", {"organization": self.org, "service_name": "QA room hire"}, "name")
        self.assertTrue(service)
        self.assertFalse(frappe.db.exists("EventType", {"service": service}))
