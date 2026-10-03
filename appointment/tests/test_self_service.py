"""Customer self-service: manage links, policy windows, fees, refunds and emails.

Uses the rich demo business Bloom. Every test rolls back what it creates.
"""

from datetime import datetime, timedelta

import frappe
import pytz

from appointment.scheduler import booking, self_service
from appointment.scheduler.notification_email import render
from appointment.tests.test_customer_notifications import MANAGER, BloomBookingCase


def _utc_now():
    return datetime.now(pytz.UTC).replace(tzinfo=None)


class TestSelfService(BloomBookingCase):
    def _booking(self, slot=0, paid=0):
        booking_id = self._book(slot=slot)["booking_id"]
        frappe.set_user("Administrator")
        if paid:
            frappe.db.set_value("Appointment", booking_id, "amount_paid", paid, update_modified=False)
        doc = frappe.get_doc("Appointment", booking_id)
        frappe.set_user("Guest")
        return doc

    def _policy(self, **values):
        frappe.set_user("Administrator")
        fields = {"cancellation_window_hours": 0, "reschedule_window_hours": 0, **values}
        policy = frappe.get_doc(dict(
            doctype="Policy", policy_name="QA self-service policy", applies_to="All Services",
            organization=self.org, created_by_organization=self.org, is_active=1,
            valid_from=frappe.utils.add_days(frappe.utils.nowdate(), -30), **fields,
        )).insert(ignore_permissions=True)
        frappe.set_user("Guest")
        return policy

    def _starts_in(self, doc, hours):
        frappe.db.set_value("Appointment", doc.name, "starts_at", _utc_now() + timedelta(hours=hours), update_modified=False)

    # Link -----------------------------------------------------------------
    def test_link_shows_only_this_booking(self):
        doc = self._booking()
        token = self_service.token_for(doc)
        view = self_service.view(token, frappe.db.get_value("Organization", self.org, "slug"))

        self.assertTrue(view["valid"])
        self.assertEqual(view["booking"]["reference"], doc.appointment_id)
        self.assertNotIn("client_email", str(view))
        self.assertTrue(view["rules"]["can_reschedule"] and view["rules"]["can_cancel"])

    def test_tampered_token_or_wrong_business_is_refused(self):
        doc = self._booking()
        other = self._booking(slot=1)
        name, version, signature = self_service.token_for(doc).rsplit(".", 2)

        self.assertFalse(self_service.view(f"{other.name}.{version}.{signature}")["valid"])
        self.assertFalse(self_service.view(self_service.token_for(doc), "another-business")["valid"])
        self.assertFalse(self_service.view("not-a-token")["valid"])

    def test_link_stops_when_the_appointment_starts(self):
        doc = self._booking()
        self._starts_in(doc, -0.1)
        self.assertFalse(self_service.view(self_service.token_for(frappe.get_doc("Appointment", doc.name)))["valid"])

    def test_staff_change_retires_the_link(self):
        doc = self._booking()
        token = self_service.token_for(doc)
        frappe.set_user(MANAGER)
        booking.change(doc.name, "cancel", str(frappe.db.get_value("Appointment", doc.name, "modified")))

        self.assertFalse(self_service.view(token)["valid"])
        self.assertEqual(frappe.db.get_value("Appointment", doc.name, "last_changed_by"), "Staff")

    # Reschedule -----------------------------------------------------------
    def test_customer_reschedules_without_a_policy(self):
        doc = self._booking()
        old_token = self_service.token_for(doc)
        moved = self_service.reschedule(old_token, self.slots[2]["start_time"])

        saved = frappe.get_doc("Appointment", doc.name)
        self.assertEqual(saved.self_reschedules, 1)
        self.assertEqual(saved.last_changed_by, "Customer")
        self.assertEqual(moved["booking"]["starts_at"], self.slots[2]["start_time"])
        self.assertEqual(moved["booking"]["duration_minutes"], doc_duration(doc))
        self.assertFalse(self_service.view(old_token)["valid"])
        self.assertTrue(self_service.view(moved["token"])["valid"])
        events = frappe.get_all("Appointment Notification", filters={"appointment": doc.name, "channel": "Email"}, pluck="event")
        self.assertIn("Reschedule", events)

    def test_reschedule_limit(self):
        doc = self._booking()
        frappe.db.set_value("Appointment", doc.name, "self_reschedules", self_service.MAX_SELF_RESCHEDULES, update_modified=False)
        doc = frappe.get_doc("Appointment", doc.name)

        self.assertEqual(self_service.decide(doc)["reschedule_block"], "limit")
        with self.assertRaises(frappe.ValidationError):
            self_service.reschedule(self_service.token_for(doc), self.slots[2]["start_time"])

    def test_reschedule_inside_the_window_is_refused(self):
        self._policy(reschedule_window_hours=24)
        doc = self._booking()
        self._starts_in(doc, 3)
        doc = frappe.get_doc("Appointment", doc.name)

        rules = self_service.decide(doc)
        self.assertEqual((rules["can_reschedule"], rules["reschedule_block"]), (False, "window"))
        self.assertTrue(rules["can_cancel"])

    # Cancel ---------------------------------------------------------------
    def test_early_cancel_has_no_fee(self):
        self._policy(cancellation_window_hours=24, late_cancellation_fee_amount=100)
        doc = self._booking(paid=300)
        result = self_service.cancel(self_service.token_for(doc))

        saved = frappe.get_doc("Appointment", doc.name)
        self.assertEqual((result["fee"], result["refund"]), (0, 300))
        self.assertEqual((saved.status, saved.last_changed_by), ("Cancelled", "Customer"))

    def test_late_cancel_needs_consent_and_records_fee_and_refund(self):
        self._policy(cancellation_window_hours=24, late_cancellation_fee_amount=100, refund_policy="Full Refund")
        doc = self._booking(paid=300)
        self._starts_in(doc, 3)
        token = self_service.token_for(frappe.get_doc("Appointment", doc.name))

        with self.assertRaises(frappe.ValidationError):
            self_service.cancel(token)
        self_service.cancel(token, accept_fee=1)
        saved = frappe.get_doc("Appointment", doc.name)
        self.assertEqual((saved.status, saved.cancellation_fee, saved.refund_due), ("Cancelled", 100, 200))
        self.assertFalse(self_service.view(token)["valid"])

    def test_percentage_fee_and_partial_refund(self):
        self._policy(cancellation_window_hours=48, late_cancellation_fee_percentage=50, refund_policy="Partial Refund")
        doc = self._booking(paid=400)
        self._starts_in(doc, 2)
        price = frappe.utils.flt(frappe.db.get_value("Service", doc.service, "price"))

        rules = self_service.decide(frappe.get_doc("Appointment", doc.name))
        self.assertEqual(rules["fee"], round(price * 0.5, 2))
        self.assertEqual(rules["refund"], round(max(200 - price * 0.5, 0), 2))

    def test_without_a_policy_cancel_is_free_until_the_start(self):
        doc = self._booking(paid=250)
        self._starts_in(doc, 0.5)
        rules = self_service.decide(frappe.get_doc("Appointment", doc.name))

        self.assertEqual((rules["can_cancel"], rules["cancel_late"], rules["fee"], rules["refund"]), (True, False, 0, 250))
        self.assertTrue(rules["can_reschedule"])

    # Emails -----------------------------------------------------------------
    def test_emails_carry_the_manage_link_and_customer_wording(self):
        self._policy(cancellation_window_hours=24, late_cancellation_fee_amount=100)
        doc = self._booking(paid=300)
        slug = frappe.db.get_value("Organization", self.org, "slug")
        confirmation = render("Confirmation", doc, "en", doc.client_email)["html"]
        self.assertIn(f"/{slug}/booking/{self_service.token_for(doc)}", confirmation)

        self._starts_in(doc, 3)
        self_service.cancel(self_service.token_for(frappe.get_doc("Appointment", doc.name)), accept_fee=1)
        cancelled = frappe.get_doc("Appointment", doc.name)
        html = render("Cancellation", cancelled, "en", cancelled.client_email)["html"]
        self.assertIn("you cancelled your booking", html)
        self.assertIn("ETB 100.00", html)
        self.assertNotIn("/booking/", html)


def doc_duration(doc):
    return int((frappe.utils.get_datetime(doc.ends_at) - frappe.utils.get_datetime(doc.starts_at)).total_seconds() // 60)
