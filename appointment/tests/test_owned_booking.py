"""Database and separate HTTP-session acceptance; only on the designated disposable site."""

import json
import re
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
        self.rate_key = frappe.cache.make_key("rl:appointment.scheduler.booking.book:192.0.2.77") + b":60"
        self.rate_previous = (frappe.cache.get(self.rate_key), frappe.cache.ttl(self.rate_key))
        frappe.cache.setex(self.rate_key, 60, 0)
        frappe.db.rollback()  # Refresh the snapshot after independent HTTP commits.
        frappe.set_user("Administrator")
        for name in frappe.get_all(
            "Appointment",
            filters={"organization": ["in", [business["org"] for business in self.state["businesses"]]]},
            pluck="name",
        ):
            frappe.delete_doc("Appointment", name, force=True, ignore_permissions=True)
        frappe.db.commit()

    def tearDown(self):
        previous, ttl = self.rate_previous
        if previous is None:
            frappe.cache.delete(self.rate_key)
        else:
            frappe.cache.setex(self.rate_key, max(1, ttl), previous)

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
            return s.post(
                BASE + "/api/method/appointment.scheduler.booking.book",
                json=payload,
                headers={"X-Forwarded-For": "192.0.2.77"},
                timeout=30,
            )

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
        desk = session.get(BASE + "/app", timeout=20)
        self.assertEqual(desk.status_code, 200)
        token = re.search(r'frappe.csrf_token = "([^"]+)"', desk.text)
        self.assertIsNotNone(token)
        session.headers["X-Frappe-CSRF-Token"] = token.group(1)
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

    def test_10_frozen_instant_and_unpublished_replay(self):
        payload = self.payload()
        first = self.post(payload)
        self.assertEqual(first.status_code, 200, first.text[:200])
        name = first.json()["message"]["booking_id"]
        frappe.db.rollback()
        before = frappe.get_doc("Appointment", name)
        frappe.db.set_value("Location", self.a["location"], "timezone", "Asia/Kolkata")
        frappe.db.set_value("Organization", self.a["org"], "enable_public_booking", 0)
        frappe.db.commit()
        try:
            replay = self.post(payload)
            self.assertEqual(replay.status_code, 200, replay.text[:200])
            self.assertEqual(replay.json(), first.json())
            self.assertEqual(self.post(self.payload(hour=11)).status_code, 403)
            edited = self.sessions[0].put(
                BASE + "/api/resource/Appointment/" + name, json={"notes": "Timezone configuration changed"}, timeout=20
            )
            self.assertEqual(edited.status_code, 200, edited.text[:200])
            frappe.db.rollback()
            after = frappe.get_doc("Appointment", name)
            for field in ("starts_at", "ends_at", "occupied_from", "occupied_until", "booking_timezone"):
                self.assertEqual(before.get(field), after.get(field), field)
        finally:
            frappe.db.set_value("Location", self.a["location"], "timezone", "Africa/Addis_Ababa")
            frappe.db.set_value("Organization", self.a["org"], "enable_public_booking", 1)
            frappe.db.commit()
        self.assertEqual(self.post(self.payload()).status_code, 417)

    def test_11_staff_lifecycle_and_capacity_release(self):
        created = self.post(self.payload())
        name = created.json()["message"]["booking_id"]
        frappe.db.rollback()
        original = frappe.get_doc("Appointment", name)
        command = dict(
            booking_id=name,
            expected_modified=str(original.modified),
            action="reschedule",
            date=self.day,
            start_time="11:00:00",
        )
        endpoint = BASE + "/api/method/appointment.scheduler.booking.change"
        denied = self.sessions[1].post(endpoint, json=command, timeout=20)
        self.assertEqual(denied.status_code, 403)
        changed = self.sessions[0].post(endpoint, json=command, timeout=20)
        self.assertEqual(changed.status_code, 200, changed.text[:300])
        self.assertEqual(changed.json()["message"]["booking_id"], name)
        stale = self.sessions[0].post(endpoint, json=command, timeout=20)
        self.assertEqual(stale.status_code, 417, stale.text[:250])
        self.assertEqual(self.post(self.payload()).status_code, 200)
        self.assertEqual(self.post(self.payload(hour=11)).status_code, 417)
        command.update(action="cancel", expected_modified=changed.json()["message"]["modified"])
        cancelled = self.sessions[0].post(endpoint, json=command, timeout=20)
        self.assertEqual(cancelled.status_code, 200, cancelled.text[:300])
        self.assertEqual(self.post(self.payload(hour=11)).status_code, 200)
        history = self.sessions[0].get(
            BASE + "/api/method/appointment.scheduler.booking.history", params={"booking_id": name}, timeout=20
        )
        self.assertIn("Cancelled", history.text)
        self.assertIn("start_time", history.text)

    def test_12_visible_workspace_api_and_publication(self):
        payload = dict(
            business_name=self.state["marker"] + " Workspace",
            location_name=self.state["marker"] + " Workspace location",
            service_name="First consultation",
            timezone="Africa/Addis_Ababa",
            duration=30,
            opens_at="09:00",
            closes_at="17:00",
            weekdays=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            request_id=frappe.generate_hash(length=32),
        )
        endpoint = BASE + "/api/method/appointment.scheduler.workspace."
        denied = self.sessions[2].post(endpoint + "create", json=payload, timeout=20)
        self.assertEqual(denied.status_code, 403)

        def submit_setup():
            with requests.Session() as session:
                session.trust_env = False
                session.cookies.update(self.sessions[0].cookies)
                session.headers.update(self.sessions[0].headers)
                return session.post(endpoint + "create", json=payload, timeout=20)

        booking.lock_provider(frappe._dict(user=self.a["user"]))
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(submit_setup) for _ in range(2)]
            time.sleep(0.3)
            self.assertFalse(any(future.done() for future in futures))
            frappe.db.commit()
            results = [future.result() for future in futures]
        result = results[0]
        self.assertEqual(result.status_code, 200, result.text[:400])
        self.assertEqual(results[1].status_code, 200, results[1].text[:400])
        self.assertEqual(result.json(), results[1].json())
        row = result.json()["message"]
        frappe.db.rollback()
        event = frappe.get_doc("EventType", row["offering"])
        self.state["businesses"].append(dict(org=row["organization"]))
        self.state["created"].extend(
            [
                ["Organization", row["organization"]],
                ["Provider", event.provider],
                ["Location", event.location],
                ["Service", event.service],
                ["EventType", event.name],
            ]
        )
        replay = self.sessions[0].post(endpoint + "create", json=payload, timeout=20)
        self.assertEqual(replay.json(), result.json())
        mismatch = self.sessions[0].post(endpoint + "create", json={**payload, "duration": 45}, timeout=20)
        self.assertEqual(mismatch.status_code, 417)
        booking_payload = self.payload()
        booking_payload["offering_id"] = event.name
        self.assertEqual(self.post(booking_payload).status_code, 403)
        foreign = self.sessions[1].post(
            endpoint + "publish", json=dict(organization=row["organization"], published=1), timeout=20
        )
        self.assertEqual(foreign.status_code, 403)
        published = self.sessions[0].post(
            endpoint + "publish", json=dict(organization=row["organization"], published=1), timeout=20
        )
        self.assertEqual(published.status_code, 200, published.text[:400])
        booked = self.post(booking_payload)
        self.assertEqual(booked.status_code, 200, booked.text[:1000])

    def test_13_scoped_support_export(self):
        created = self.post(self.payload())
        self.assertEqual(created.status_code, 200, created.text[:300])
        name = created.json()["message"]["booking_id"]
        endpoint = BASE + "/api/method/appointment.scheduler.support.customer_record"
        params = dict(organization=self.a["org"], email="booking@example.test")
        for session in self.sessions:
            response = session.get(endpoint, params=params, timeout=20)
            self.assertEqual(response.status_code, 403)
        frappe.db.rollback()
        frappe.db.set_value("Organization", self.a["org"], "owner_user", self.a["user"])
        frappe.db.commit()
        try:
            own = self.sessions[0].get(endpoint, params=params, timeout=20)
            self.assertEqual(own.status_code, 200, own.text[:300])
            self.assertEqual([row["name"] for row in own.json()["message"]["bookings"]], [name])
            for private in ("request_key", "request_hash", "request_result"):
                self.assertNotIn(private, own.text)
            params["organization"] = self.b["org"]
            self.assertEqual(self.sessions[0].get(endpoint, params=params, timeout=20).status_code, 403)
        finally:
            frappe.db.set_value("Organization", self.a["org"], "owner_user", "Administrator")
            frappe.db.commit()

    def test_14_request_limits(self):
        # Isolated target only: set the exact endpoint/IP bucket to its limit,
        # exercise HTTP rejection, and restore its original value/TTL.
        key = self.rate_key
        previous, ttl = frappe.cache.get(key), frappe.cache.ttl(key)
        frappe.cache.setex(key, 60, 60)
        try:
            response = self.post(self.payload())
            self.assertEqual(response.status_code, 429, response.text[:250])
        finally:
            if previous is None:
                frappe.cache.delete(key)
            else:
                frappe.cache.setex(key, max(1, ttl), previous)

    def test_15_manager_cancellation_after_provider_revocation(self):
        names = []
        for hour in (10, 11):
            response = self.post(self.payload(hour=hour))
            self.assertEqual(response.status_code, 200, response.text[:300])
            names.append(response.json()["message"]["booking_id"])
        frappe.db.rollback()
        frappe.db.set_value("Organization", self.a["org"], "owner_user", self.b["user"])
        frappe.db.commit()
        try:
            for name, mode in zip(names, ("membership", "disabled"), strict=True):
                if mode == "membership":
                    frappe.db.set_value(
                        "Provider Organization",
                        {"parent": self.a["provider"], "organization": self.a["org"]},
                        "status",
                        "Inactive",
                    )
                else:
                    frappe.db.set_value("User", self.a["user"], "enabled", 0)
                doc = frappe.get_doc("Appointment", name)
                frappe.db.commit()
                response = self.sessions[1].post(
                    BASE + "/api/method/appointment.scheduler.booking.change",
                    json=dict(booking_id=name, action="cancel", expected_modified=str(doc.modified)),
                    timeout=20,
                )
                self.assertEqual(response.status_code, 200, response.text[:400])
                self.assertEqual(response.json()["message"]["status"], "Cancelled")
                frappe.db.set_value(
                    "Provider Organization",
                    {"parent": self.a["provider"], "organization": self.a["org"]},
                    "status",
                    "Active",
                )
                frappe.db.commit()
        finally:
            frappe.db.set_value("User", self.a["user"], "enabled", 1)
            frappe.db.set_value(
                "Provider Organization",
                {"parent": self.a["provider"], "organization": self.a["org"]},
                "status",
                "Active",
            )
            frappe.db.set_value("Organization", self.a["org"], "owner_user", "Administrator")
            frappe.db.commit()

    def test_16_legacy_calendar_rejects_impersonation(self):
        response = self.sessions[0].get(
            BASE + "/api/method/appointment.scheduler.doctype.booking_event.booking_event.get_events",
            params={"start": self.day, "end": self.day, "user": "Administrator"},
            timeout=20,
        )
        self.assertEqual(response.status_code, 403, response.text[:300])

    def test_17_linked_private_legacy_calendar_scope(self):
        event = frappe.get_doc(
            dict(
                doctype="Booking Event",
                subject="Owned linked calendar event",
                owner="Guest",
                event_type="Private",
                status="Open",
                starts_on=f"{self.day} 14:00:00",
                ends_on=f"{self.day} 14:30:00",
                send_reminder=0,
                custom_doctype_link_with_event=[dict(reference_doctype="Service", reference_docname=self.a["service"])],
            )
        ).insert(ignore_permissions=True)
        self.state["created"].append(["Booking Event", event.name])
        frappe.db.commit()
        for index, expected in [(0, True), (1, False)]:
            listing = self.sessions[index].get(
                BASE + "/api/resource/Booking Event",
                params={"filters": json.dumps([["name", "=", event.name]])},
                timeout=20,
            )
            self.assertEqual(listing.status_code, 200, listing.text[:300])
            self.assertEqual(bool(listing.json()["data"]), expected)
            calendar = self.sessions[index].get(
                BASE + "/api/method/appointment.scheduler.doctype.booking_event.booking_event.get_events",
                params={"start": self.day, "end": self.day},
                timeout=20,
            )
            self.assertEqual(calendar.status_code, 200, calendar.text[:300])
            self.assertEqual(event.name in calendar.text, expected)


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
