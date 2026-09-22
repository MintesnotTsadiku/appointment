"""Database and separate HTTP-session acceptance; only on the designated disposable site."""

import json
import subprocess
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

import frappe
import requests
from frappe.utils.password import update_password

from appointment.scheduler import booking
from appointment.tests import owned_booking_fixtures as fixtures

BASE = "http://127.0.0.20:25310"


class OwnedBookingAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.state = fixtures.setup()
        cls.a, cls.b = cls.state["businesses"]
        cls.sessions = []
        cls.day = cls.state["day"]
        cls.results = []
        for item in (cls.a, cls.b, {"user": cls.state["customer"]}):
            password = frappe.generate_hash(length=32)
            update_password(item["user"], password)
            frappe.db.commit()
            session = requests.Session()
            session.trust_env = False
            response = session.post(BASE + "/api/method/login", data={"usr": item["user"], "pwd": password}, timeout=20)
            assert response.status_code == 200, response.status_code
            actual = session.get(BASE + "/api/method/frappe.auth.get_logged_user", timeout=20).json()["message"]
            assert actual == item["user"]
            cls.sessions.append(session)
        frappe.set_user("Administrator")

    @classmethod
    def tearDownClass(cls):
        for session in cls.sessions:
            session.get(BASE + "/api/method/logout", timeout=20)
            session.close()
        cls.cleanup = fixtures.cleanup(cls.state)

    def setUp(self):
        frappe.set_user("Administrator")
        for name in frappe.get_all(
            "Appointment", filters={"organization": ["in", [self.a["org"], self.b["org"]]]}, pluck="name"
        ):
            frappe.delete_doc("Appointment", name, force=True, ignore_permissions=True)
        frappe.db.commit()

    def payload(self, hour=10, minute=0, **changes):
        start = f"{self.day}T{hour:02}:{minute:02}:00+03:00"
        end = (booking.utc(start) + timedelta(minutes=30)).isoformat() + "Z"
        return dict(
            offering_id=self.a["offering"],
            start_time=start,
            end_time=end,
            user_name="Acceptance Customer",
            user_email="booking@example.test",
            request_id=frappe.generate_hash(length=32),
            **changes,
        )

    def post(self, payload):
        # Each request gets a genuinely anonymous client, not a provider session.
        with requests.Session() as s:
            s.trust_env = False
            return s.post(BASE + "/api/method/appointment.scheduler.booking.book", json=payload, timeout=30)

    def test_01_handoff_and_isolation(self):
        result = self.post(self.payload())
        self.assertEqual(result.status_code, 200, result.text[:250])
        name = result.json()["message"]["booking_id"]
        frappe.db.rollback()
        stored = frappe.get_doc("Appointment", name)
        self.assertEqual(stored.organization, self.a["org"])
        self.assertEqual(stored.provider, self.a["provider"])
        history = self.sessions[0].get(
            BASE + "/api/method/appointment.scheduler.booking.history", params={"booking_id": name}, timeout=20
        )
        self.assertEqual(history.status_code, 200)
        self.assertIn("created", history.text)
        foreign_history = self.sessions[1].get(
            BASE + "/api/method/appointment.scheduler.booking.history", params={"booking_id": name}, timeout=20
        )
        self.assertEqual(foreign_history.status_code, 403)

        self.assertTrue(frappe.db.exists("Version", {"ref_doctype": "Appointment", "docname": name}))
        for index in range(3):
            response = self.sessions[index].get(
                BASE + "/api/method/appointment.scheduler.api.desk.get_desk_appointments",
                params={"date": self.day},
                timeout=20,
            )
            if index == 0:
                self.assertEqual(response.status_code, 200, response.text[:250])
                self.assertIn(name, response.text)
            else:
                self.assertNotIn(name, response.text)
            direct = self.sessions[index].get(BASE + "/api/resource/Appointment/" + name, timeout=20)
            self.assertEqual(direct.status_code, 200 if index == 0 else 403, direct.text[:200])
        foreign = self.sessions[1].post(
            BASE + "/api/method/appointment.scheduler.api.desk.update_appointment",
            json={"appointment_name": name, "status": "Cancelled"},
            timeout=20,
        )
        self.assertEqual(foreign.status_code, 403, foreign.text[:200])
        frappe.db.rollback()
        self.assertEqual(frappe.db.get_value("Appointment", name, "status"), "Confirmed")

    def test_02_retry_and_capacity(self):
        payload = self.payload()
        one = self.post(payload)
        two = self.post(payload)
        self.assertEqual(one.status_code, 200, one.text[:200])
        self.assertEqual(two.json()["message"], one.json()["message"])
        changed = dict(payload, user_name="Different")
        self.assertEqual(self.post(changed).status_code, 417)
        self.assertEqual(self.post(self.payload(minute=15)).status_code, 417)
        frappe.db.rollback()
        self.assertEqual(frappe.db.count("Appointment", {"organization": self.a["org"]}), 1)
        name = one.json()["message"]["booking_id"]
        self.assertEqual(frappe.db.count("Version", {"ref_doctype": "Appointment", "docname": name}), 1)

    def test_03_controlled_competition_and_retry(self):
        for same_key in (False, True):
            self.setUp()
            payload = self.payload()
            second = payload if same_key else self.payload(minute=15)
            provider = frappe.get_doc("Provider", self.a["provider"])
            booking.lock_provider(provider)
            with ThreadPoolExecutor(max_workers=2) as executor:
                pending = [executor.submit(self.post, p) for p in (payload, second)]
                time.sleep(0.3)
                self.assertTrue(all(not f.done() for f in pending), "Requests must wait for the held capacity lock")
                frappe.db.commit()
                responses = [f.result() for f in pending]
            successes = [r for r in responses if r.status_code == 200]
            self.assertEqual(len(successes), 2 if same_key else 1, [(r.status_code, r.text[:150]) for r in responses])
            if same_key:
                self.assertEqual(successes[0].json()["message"], successes[1].json()["message"])
            frappe.db.rollback()
            self.assertEqual(frappe.db.count("Appointment", {"organization": self.a["org"]}), 1)

    def test_04_hours_exception_and_buffers(self):
        self.assertEqual(self.post(self.payload(hour=8)).status_code, 417)
        location = frappe.get_doc("Location", self.a["location"])
        location.append("holidays", {"holiday_date": self.day, "holiday_name": "Test closure", "is_all_day": 1})
        location.save(ignore_permissions=True)
        frappe.db.commit()
        self.assertEqual(self.post(self.payload()).status_code, 417)
        location.set("holidays", [])
        location.save(ignore_permissions=True)
        weekday = frappe.utils.getdate(self.day).strftime("%A")
        for row in location.opening_hours:
            if row.day_of_week == weekday:
                row.is_open = 0
        location.save(ignore_permissions=True)
        frappe.db.commit()
        self.assertEqual(self.post(self.payload()).status_code, 417)
        for row in location.opening_hours:
            row.is_open = 1
        location.save(ignore_permissions=True)
        service = frappe.get_doc("Service", self.a["service"])
        service.buffer_after = 15
        service.save(ignore_permissions=True)
        frappe.db.commit()
        self.assertEqual(self.post(self.payload()).status_code, 200)
        self.assertEqual(self.post(self.payload(minute=30)).status_code, 417)
        service.buffer_after = 0
        service.save(ignore_permissions=True)
        frappe.db.commit()

    def test_05_linked_ownership_and_cross_location(self):
        event = frappe.get_doc("EventType", self.a["offering"])
        event.location = self.b["location"]
        with self.assertRaises(frappe.PermissionError):
            event.save(ignore_permissions=True)
        self.assertEqual(self.post(self.payload(organization_id=self.b["org"])).status_code, 403)
        event.reload()
        frappe.db.commit()
        self.assertEqual(self.post(self.payload()).status_code, 200)
        location = frappe.get_doc("Location", self.a["location"]).as_dict()
        for k in ("name", "creation", "modified", "modified_by", "owner"):
            location.pop(k, None)
        location["location_name"] = self.state["marker"] + " Second location"
        other = frappe.get_doc(location).insert(ignore_permissions=True)
        self.state["created"].append(["Location", other.name])
        clone = frappe.get_doc(
            dict(
                doctype="EventType",
                event_type_name="Second location offering",
                service=self.a["service"],
                provider=self.a["provider"],
                location=other.name,
                is_active=1,
            )
        ).insert(ignore_permissions=True)
        self.state["created"].append(["EventType", clone.name])
        frappe.db.commit()
        payload = self.payload(minute=15)
        payload["offering_id"] = clone.name
        self.assertEqual(self.post(payload).status_code, 417)

    def test_06_rollback_and_revoke(self):
        payload = self.payload()
        frappe.set_user("Guest")
        with patch(
            "appointment.scheduler.doctype.appointment.appointment.creation_history",
            side_effect=RuntimeError("Injected history failure"),
        ):
            with self.assertRaises(RuntimeError):
                booking.book(**payload)
        frappe.db.rollback()
        frappe.set_user("Administrator")
        self.assertEqual(frappe.db.count("Appointment", {"organization": self.a["org"]}), 0)
        self.assertEqual(self.post(payload).status_code, 200)
        frappe.db.rollback()
        provider = frappe.get_doc("Provider", self.a["provider"])
        provider.organizations[0].status = "Inactive"
        provider.save(ignore_permissions=True)
        frappe.db.commit()
        response = self.sessions[0].get(
            BASE + "/api/method/appointment.scheduler.api.desk.get_desk_appointments",
            params={"date": self.day},
            timeout=20,
        )
        self.assertEqual(response.json()["message"]["appointments"], [])
        provider.organizations[0].status = "Active"
        provider.save(ignore_permissions=True)
        frappe.db.commit()

    def test_07_timezone_and_dst(self):
        self.assertEqual(booking.utc("2030-01-01T10:00:00+03:00"), booking.utc("2030-01-01T07:00:00Z"))
        for day, hour in [("2030-03-10", "02:30:00"), ("2030-11-03", "01:30:00")]:
            with self.assertRaises(frappe.ValidationError):
                booking.local_instant(day, hour, "America/New_York")

    def test_08_generic_document_boundary_and_history(self):
        payload = self.payload()
        created = self.post(payload)
        self.assertEqual(created.status_code, 200)
        name = created.json()["message"]["booking_id"]
        allowed = self.sessions[0].put(
            BASE + "/api/resource/Appointment/" + name, json={"notes": "Material correction"}, timeout=20
        )
        self.assertEqual(allowed.status_code, 200, allowed.text[:250])
        denied = self.sessions[1].put(
            BASE + "/api/resource/Appointment/" + name, json={"notes": "Foreign correction"}, timeout=20
        )
        self.assertEqual(denied.status_code, 403, denied.text[:250])
        history = self.sessions[0].get(
            BASE + "/api/method/appointment.scheduler.booking.history", params={"booking_id": name}, timeout=20
        )
        self.assertIn("Material correction", history.text)
        generic = dict(
            doctype="Appointment",
            appointment_id="APT-" + frappe.generate_hash(length=20),
            event_type=self.a["offering"],
            provider=self.a["provider"],
            service=self.a["service"],
            location=self.a["location"],
            appointment_date=self.day,
            start_time="12:00:00",
            end_time="12:30:00",
            status="Confirmed",
            client_name="Generic boundary customer",
            client_email="generic@example.test",
            flags={"public_booking": True},
        )
        foreign = self.sessions[1].post(BASE + "/api/resource/Appointment", json=generic, timeout=20)
        self.assertEqual(foreign.status_code, 403, foreign.text[:250])
        generic.pop("flags")
        generic["location"] = self.b["location"]
        mixed = self.sessions[0].post(BASE + "/api/resource/Appointment", json=generic, timeout=20)
        self.assertEqual(mixed.status_code, 403, mixed.text[:250])
        foreign_config = self.sessions[1].put(
            BASE + "/api/resource/Service/" + self.a["service"], json={"duration": 90}, timeout=20
        )
        self.assertEqual(foreign_config.status_code, 403, foreign_config.text[:250])
        calendar = self.sessions[0].get(
            BASE + "/api/method/appointment.dashboard.get_appointments",
            params={"start_date": self.day, "end_date": self.day},
            timeout=20,
        )
        self.assertEqual(calendar.status_code, 200, calendar.text[:250])
        self.assertIn(name, calendar.text)

    def test_09_runtime_surfaces_and_realtime(self):
        session = self.sessions[0]
        self.assertEqual(session.get(BASE + "/", timeout=20).status_code, 200)
        self.assertEqual(session.get(BASE + "/app", timeout=20).status_code, 200)
        repo = Path(frappe.get_app_path("appointment")).parent
        result = subprocess.run(
            ["/home/minte/.nvm/versions/node/v24.12.0/bin/node", str(repo / "qa/check-owned-runtime.mjs")],
            input=json.dumps(
                {
                    "base": BASE,
                    "site": frappe.local.site,
                    "cookie": "; ".join(f"{k}={v}" for k, v in session.cookies.get_dict().items()),
                }
            ),
            text=True,
            capture_output=True,
            timeout=15,
        )
        self.assertEqual(result.returncode, 0, result.stderr[:400])
        self.assertEqual(json.loads(result.stdout)["transport"], "websocket")


def run():
    fixtures.require_target()
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(OwnedBookingAcceptance)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    summary = {
        "tests": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
        "cleanup": getattr(OwnedBookingAcceptance, "cleanup", None),
    }
    print(json.dumps(summary))
    if not result.wasSuccessful():
        raise AssertionError("Owned booking acceptance failed; see the test report.")
    return summary
