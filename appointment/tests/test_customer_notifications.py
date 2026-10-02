"""Customer notifications: trigger, queue, templates, reminders, limits and isolation.

Uses the rich demo business Bloom. Nothing here commits: each test rolls back
its bookings, notification rows and Email Queue rows. Email is muted on the
development site, so `frappe.sendmail` only creates Email Queue rows.
"""

import unittest
from datetime import datetime, timedelta

import frappe
import pytz
from frappe.utils import add_days, nowdate

from appointment.scheduler import booking, notifications
from appointment.scheduler.notification_email import render, send_notification

OWNER = "bloom.owner@example.test"
MANAGER = "bloom.manager@example.test"
OTHER_OWNER = "tena.owner@example.test"
OFFERING = "EVT-2026-000109"  # Cut and shape, Rahel Girma, Bole quiet styling room


class TestCustomerNotifications(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        frappe.set_user("Administrator")
        cls.org = frappe.db.get_value("Organization", {"owner_user": OWNER}, "name")
        if not cls.org or not frappe.db.exists("EventType", OFFERING):
            raise unittest.SkipTest("Rich demo businesses are not seeded on this site.")
        cls.slots = cls._free_slots()

    @classmethod
    def _free_slots(cls):
        for offset in range(2, 30):
            found = [s for s in booking.slots(OFFERING, add_days(nowdate(), offset))["all_available_slots_for_data"] if s["available"]]
            if len(found) >= 3:
                return found
        raise unittest.SkipTest("No free Bloom slots in the next month.")

    def setUp(self):
        frappe.set_user("Guest")

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback()

    def _book(self, slot=0, email=None, language=None, name="Selam Test"):
        start = self.slots[slot]
        return booking.book(
            OFFERING, start["start_time"], start["end_time"], name,
            email or f"qa-{frappe.generate_hash(length=8)}@example.test",
            frappe.generate_hash(length=24), organization_id=self.org, language=language,
        )

    def _rows(self, booking_id):
        return frappe.get_all(
            "Appointment Notification", filters={"appointment": booking_id},
            fields=["name", "event", "status", "skip_reason"], order_by="creation asc",
        )

    def test_booking_queues_one_confirmation_email(self):
        result = self._book()
        self.assertEqual(result["notification_status"], "queued")
        [row] = self._rows(result["booking_id"])
        self.assertEqual((row.event, row.status), ("Confirmation", "Queued"))

        send_notification(row.name)
        queue = frappe.get_doc("Email Queue", frappe.db.get_value("Appointment Notification", row.name, "email_queue"))
        self.assertEqual((queue.reference_doctype, queue.reference_name), ("Appointment", result["booking_id"]))
        self.assertEqual(queue.status, "Not Sent")

        frappe.set_user(MANAGER)
        [shown] = notifications.for_appointment(result["booking_id"])
        self.assertEqual((shown.event, shown.status), ("Confirmation", "Queued"))

    def test_repeated_request_queues_nothing_more(self):
        start = self.slots[0]
        args = (OFFERING, start["start_time"], start["end_time"], "Repeat", "qa-repeat@example.test", "r" * 24)
        first = booking.book(*args, organization_id=self.org)
        again = booking.book(*args, organization_id=self.org)

        self.assertEqual(again, first)
        self.assertEqual(len(self._rows(first["booking_id"])), 1)

    def test_staff_reschedule_and_cancel_each_queue_one_message(self):
        booking_id = self._book()["booking_id"]
        frappe.set_user(MANAGER)
        doc = frappe.get_doc("Appointment", booking_id)
        later = self.slots[2]["start_time"]
        local = pytz.UTC.localize(datetime.fromisoformat(later.rstrip("Z"))).astimezone(pytz.timezone(doc.booking_timezone))

        moved = booking.change(booking_id, "reschedule", str(doc.modified), local.date().isoformat(), local.strftime("%H:%M:%S"))
        cancelled = booking.change(booking_id, "cancel", moved["modified"])

        self.assertEqual((moved["notification_status"], cancelled["notification_status"]), ("queued", "queued"))
        self.assertEqual([row.event for row in self._rows(booking_id)], ["Confirmation", "Reschedule", "Cancellation"])

    def test_notes_edit_queues_nothing(self):
        booking_id = self._book()["booking_id"]
        frappe.set_user("Administrator")
        doc = frappe.get_doc("Appointment", booking_id)
        doc.notes = "Bring a reference photo"
        doc.save(ignore_permissions=True)

        self.assertEqual(notifications.status_of(doc), "not_applicable")
        self.assertEqual(len(self._rows(booking_id)), 1)

    def test_disabled_event_is_recorded_and_not_sent(self):
        frappe.set_user(OWNER)
        notifications.save_settings(self.org, send_confirmation=0)
        frappe.set_user("Guest")
        result = self._book()

        self.assertEqual(result["notification_status"], "disabled")
        [row] = self._rows(result["booking_id"])
        self.assertEqual((row.status, row.skip_reason), ("Skipped", "disabled"))

    def test_lead_time_outside_range_is_refused(self):
        frappe.set_user(OWNER)
        with self.assertRaises(frappe.ValidationError):
            notifications.save_settings(self.org, reminder_lead_hours=0)

    def test_reminder_job_is_idempotent_and_follows_reschedule(self):
        booking_id = self._book()["booking_id"]
        frappe.set_user("Administrator")
        now = datetime.now(pytz.UTC).replace(tzinfo=None)
        frappe.db.set_value("Appointment", booking_id, {"starts_at": now + timedelta(hours=3), "creation": now - timedelta(days=3)}, update_modified=False)

        notifications.send_due_reminders()
        notifications.send_due_reminders()
        reminders = [row for row in self._rows(booking_id) if row.event == "Reminder"]
        self.assertEqual(len(reminders), 1)

        frappe.db.set_value("Appointment", booking_id, "starts_at", now + timedelta(hours=5), update_modified=False)
        notifications.send_due_reminders()
        self.assertEqual(len([row for row in self._rows(booking_id) if row.event == "Reminder"]), 2)

    def test_booking_inside_lead_time_gets_no_reminder(self):
        booking_id = self._book()["booking_id"]
        frappe.set_user("Administrator")
        now = datetime.now(pytz.UTC).replace(tzinfo=None)
        frappe.db.set_value("Appointment", booking_id, "starts_at", now + timedelta(hours=3), update_modified=False)

        notifications.send_due_reminders()
        self.assertEqual([row.event for row in self._rows(booking_id)], ["Confirmation"])

    def test_opt_out_stops_reminders_only(self):
        email = "qa-optout@example.test"
        booking_id = self._book(email=email)["booking_id"]
        frappe.set_user("Administrator")
        frappe.get_doc(dict(
            doctype="Customer Notification Opt Out", organization=self.org, email=email,
            opt_out_key=notifications.opt_out_key(self.org, email),
        )).insert(ignore_permissions=True)

        doc = frappe.get_doc("Appointment", booking_id)
        self.assertEqual(notifications.queue_notification(doc, "Reminder"), "opted_out")
        self.assertEqual(self._rows(booking_id)[0].status, "Queued")

    def test_rate_limit_per_address_and_business(self):
        email = "qa-flood@example.test"
        earlier = self._book()["booking_id"]
        for count in range(notifications.LIMIT_ADDRESS_PER_BUSINESS_DAY):
            frappe.get_doc(dict(
                doctype="Appointment Notification", appointment=earlier, organization=self.org,
                event="Confirmation", recipient=email, status="Queued", dedupe_key=f"qa-flood-{count}",
            )).insert(ignore_permissions=True)

        self.assertEqual(self._book(slot=1, email=email)["notification_status"], "rate_limited")

    def test_staff_changes_are_not_limited_per_address(self):
        email = "qa-busy@example.test"
        booking_id = self._book(email=email)["booking_id"]
        for count in range(notifications.LIMIT_ADDRESS_PER_BUSINESS_DAY):
            frappe.get_doc(dict(
                doctype="Appointment Notification", appointment=booking_id, organization=self.org,
                event="Reschedule", recipient=email, status="Queued", dedupe_key=f"qa-busy-{count}",
            )).insert(ignore_permissions=True)
        frappe.set_user(MANAGER)
        doc = frappe.get_doc("Appointment", booking_id)

        self.assertEqual(booking.change(booking_id, "cancel", str(doc.modified))["notification_status"], "queued")

    def test_templates_escape_and_link_only_to_the_business(self):
        booking_id = self._book(language="am")["booking_id"]
        frappe.set_user("Administrator")
        doc = frappe.get_doc("Appointment", booking_id)
        # Save-time sanitizing strips script tags, so set the name in memory to test the template itself.
        doc.client_name = "<script>alert(1)</script>"
        slug = frappe.db.get_value("Organization", self.org, "slug")

        for event in notifications.EVENT_SETTING:
            for language in ("en", "am"):
                html = render(event, doc, language, doc.client_email)["html"]
                self.assertNotIn("<script>", html)
                self.assertIn("&lt;script&gt;", html)
                links = [part.split('"', 1)[0] for part in html.split('href="')[1:]]
                self.assertTrue(links[0].endswith(f"/{slug}/book"), links)
                self.assertEqual(len(links), 2 if event == "Reminder" else 1)
        amharic = render("Confirmation", doc, "am", doc.client_email)
        self.assertIn("ሰዓት", amharic["html"])
        if frappe.db.exists("Translation", {"language": "am", "source_text": "Booking confirmed"}):
            self.assertIn("ቀጠሮ ተረጋግጧል", amharic["html"])
        self.assertEqual(notifications.customer_language(doc), "am")

    def test_other_business_manager_is_refused(self):
        booking_id = self._book()["booking_id"]
        frappe.set_user(OTHER_OWNER)
        for call in (
            lambda: notifications.get_settings(self.org),
            lambda: notifications.save_settings(self.org, send_reminder=0),
            lambda: notifications.for_appointment(booking_id),
        ):
            with self.assertRaises(frappe.PermissionError):
                call()
