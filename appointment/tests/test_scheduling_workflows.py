"""Functional scheduling workflow tests.

These tests exercise the real model and whitelisted API boundary for the
scheduling domain because several of these workflows are not yet reachable in a
deterministic way through the public browser UI (see
``docs/rename/testing-guide.md`` for the documented browser blockers).

Every created record is prefixed with a unique run marker and removed in
``tearDown``. The tests never mutate pre-existing records.

Run with::

    bench --site <site> run-tests --module appointment.tests.test_scheduling_workflows \
        --skip-before-tests
"""

from __future__ import annotations

import json
import unittest
from datetime import timedelta
from pathlib import Path

import frappe
from frappe.utils import add_days, nowdate

MARKER_PREFIX = "QA-WF"


class TestSchedulingWorkflows(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        frappe.set_user("Administrator")
        cls.marker = f"{MARKER_PREFIX}-{frappe.generate_hash(length=6)}"
        cls.created: list[tuple[str, str]] = []
        frappe.flags.syncing_booking_urls = True
        cls._build_fixture()

    @classmethod
    def tearDownClass(cls):
        cls._cleanup()

    # ------------------------------------------------------------------
    # Fixture construction / teardown
    # ------------------------------------------------------------------
    @classmethod
    def _build_fixture(cls):
        cls.org = cls._insert(
            "Organization",
            organization_name=f"{cls.marker} Org",
            organization_type="Other",
            slug=cls.marker.lower(),
            owner_user="Administrator",
            is_active=1,
            enable_public_booking=1,
            managers=[
                {
                    "user": "Administrator",
                    "full_name": "Administrator",
                    "can_manage_providers": 1,
                    "can_manage_services": 1,
                }
            ],
        )
        cls.user = cls._insert("User", email=f"{cls.marker.lower()}-provider@example.test",
                               first_name="Regression provider", enabled=1, send_welcome_email=0)
        cls.provider = cls._insert(
            "Provider",
            provider_name=f"{cls.marker} Provider",
            full_name="QA Provider",
            user=cls.user.name,
            organizations=[{"organization":cls.org.name,"status":"Active","accept_org_bookings":1}],
            is_active=1,
            organization=cls.org.name,
            organization_status="Active",
        )
        cls.location = cls._insert(
            "Location",
            location_name=f"{cls.marker} Location",
            timezone="Africa/Addis_Ababa",
            opening_hours=[{"day_of_week":day,"start_time":"08:00:00","end_time":"18:00:00","is_open":1}
                           for day in ("Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday")],
            organization=cls.org.name,
            is_active=1,
        )
        cls.service = cls._insert(
            "Service",
            service_name=f"{cls.marker} Service",
            duration=30,
            price=250,
            organization=cls.org.name,
            is_active=1,
        )
        cls.event_type = cls._insert(
            "EventType",
            naming_series="EVT-.YYYY.-.######",
            event_type_name=f"{cls.marker} EventType",
            service=cls.service.name,
            provider=cls.provider.name,
            location=cls.location.name,
            is_active=1,
        )

    @classmethod
    def _insert(cls, doctype, **values):
        doc = frappe.get_doc({"doctype": doctype, **values})
        doc.insert(ignore_permissions=True)
        cls.created.append((doctype, doc.name))
        return doc

    @classmethod
    def _cleanup(cls):
        for doctype, name in reversed(cls.created):
            if not frappe.db.exists(doctype, name):
                continue
            try:
                frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
            except Exception:  # best-effort cleanup of disposable QA rows
                frappe.db.rollback()
        frappe.db.commit()
        frappe.flags.syncing_booking_urls = False

    # ------------------------------------------------------------------
    # Scenarios
    # ------------------------------------------------------------------
    def test_provider_service_location_configuration_persists(self):
        provider = frappe.get_doc("Provider", self.provider.name)
        service = frappe.get_doc("Service", self.service.name)
        location = frappe.get_doc("Location", self.location.name)
        self.assertEqual(provider.organization, self.org.name)
        self.assertEqual(provider.organization_status, "Active")
        self.assertEqual(service.organization, self.org.name)
        self.assertEqual(service.duration, 30)
        self.assertEqual(location.organization, self.org.name)

    def test_availability_rule_persists(self):
        user = self._insert(
            "User",
            email=f"{self.marker.lower()}-avail@example.invalid",
            first_name="QA Availability",
            send_welcome_email=0,
            enabled=1,
        )
        availability = self._insert(
            "User Appointment Availability",
            user=user.name,
            provider=self.provider.name,
            enable_scheduling=1,
            appointment_time_slot=[{"day": "Monday", "start_time": "09:00:00", "end_time": "17:00:00"}],
        )
        reloaded = frappe.get_doc("User Appointment Availability", availability.name)
        slots = reloaded.appointment_time_slot
        self.assertEqual(len(slots), 1)
        self.assertEqual(slots[0].day, "Monday")
        self.assertEqual(frappe.utils.get_time(slots[0].start_time), frappe.utils.get_time("09:00:00"))
        self.assertEqual(frappe.utils.get_time(slots[0].end_time), frappe.utils.get_time("17:00:00"))

    def test_reception_booking_creates_confirmed_appointment(self):
        from appointment.scheduler.api.desk import create_desk_appointment

        appointment_date = add_days(nowdate(),1)
        result = create_desk_appointment(
            client_name=f"{self.marker} Client",
            client_phone="+251900000001",
            client_email=f"{self.marker.lower()}-client@example.invalid",
            service_name=self.service.name,
            provider_name=self.provider.name,
            location_name=self.location.name,
            start_time="09:00:00",
            appointment_date=appointment_date,
        )
        self.assertNotIn("error", result, result)
        name = result["appointment"]["name"]
        self.created.append(("Appointment", name))
        saved = frappe.get_doc("Appointment", name)
        self.assertEqual(saved.status, "Confirmed")
        self.assertEqual(saved.service, self.service.name)
        self.assertEqual(saved.provider, self.provider.name)
        self.assertEqual(saved.location, self.location.name)

    def test_reschedule_updates_persisted_time(self):
        from appointment.scheduler.api.desk import reschedule_appointment

        appointment = self._make_appointment("10:00:00")
        result = reschedule_appointment(appointment.name, new_start_time="11:30:00")
        self.assertNotIn("error", result, result)
        saved = frappe.get_doc("Appointment", appointment.name)
        self.assertEqual(str(saved.start_time), "11:30:00")
        self.assertEqual(str(saved.end_time), "12:00:00")

    def test_cancellation_updates_status(self):
        from appointment.scheduler.api.desk import update_appointment

        appointment = self._make_appointment("13:00:00")
        result = update_appointment(appointment.name, status="Cancelled")
        self.assertNotIn("error", result, result)
        saved = frappe.get_doc("Appointment", appointment.name)
        self.assertEqual(saved.status, "Cancelled")

    def test_walk_in_queue_and_status_transition(self):
        from appointment.scheduler.api.desk import add_walk_in, get_walk_ins

        result = add_walk_in(
            client_name=f"{self.marker} Walk-In",
            client_phone="+251900000002",
            service_requested=self.service.name,
            location_name=self.location.name,
            provider_preferred=self.provider.name,
        )
        self.assertNotIn("error", result, result)
        walk_in_name = result["walk_in"]["name"]
        self.created.append(("Walk In", walk_in_name))

        queue = get_walk_ins(location_name=self.location.name)
        self.assertIn(walk_in_name, [row["name"] for row in queue["walk_ins"]])

        walk_in = frappe.get_doc("Walk In", walk_in_name)
        self.assertEqual(walk_in.status, "waiting")
        # `assigned` requires an appointment link, so exercise the other valid
        # waiting -> cancelled transition.
        walk_in.status = "cancelled"
        walk_in.save(ignore_permissions=True)
        self.assertEqual(frappe.db.get_value("Walk In", walk_in_name, "status"), "cancelled")

    def test_public_booking_catalog_exposes_qa_service(self):
        from appointment.api.personal_meet import get_organization_services
        from appointment.onboarding import make_slug

        catalog = get_organization_services(self.org.slug)
        self.assertNotIn("error", catalog, catalog)
        slugs = {entry["slug"] for entry in catalog["services"]}
        self.assertIn(self.event_type.name, slugs)

    def test_english_and_amharic_translations_available(self):
        repo_root = Path(frappe.get_app_path("appointment")).parent
        translations = repo_root / "frontend" / "src" / "lib" / "i18n" / "translations"
        english = json.loads((translations / "en.json").read_text(encoding="utf-8"))
        amharic = json.loads((translations / "am.json").read_text(encoding="utf-8"))
        self.assertEqual(english["nav"]["pricing"], "Pricing")
        self.assertEqual(amharic["nav"]["pricing"], "ዋጋ")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _make_appointment(self, start_time):
        end_hour, end_minute = int(start_time[:2]), int(start_time[3:5])
        end = timedelta(hours=end_hour, minutes=end_minute + 30)
        end_time = f"{end.seconds // 3600:02d}:{(end.seconds // 60) % 60:02d}:00"
        appointment_id = f"APT-{frappe.generate_hash(length=10).upper()}"
        appointment = self._insert(
            "Appointment",
            appointment_id=appointment_id,
            event_type=self.event_type.name,
            provider=self.provider.name,
            location=self.location.name,
            service=self.service.name,
            client_name=f"{self.marker} Client",
            client_email=f"{self.marker.lower()}-client@example.invalid",
            client_phone="+251900000003",
            appointment_date=add_days(nowdate(), 1),
            start_time=start_time,
            end_time=end_time,
            status="Confirmed",
        )
        return appointment
