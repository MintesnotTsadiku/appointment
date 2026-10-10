"""Walk-ins are assigned within open hours, and policy templates are served in the caller's language.

Organization checks use the rich demo business Bloom: "Cut and shape" at Bole main studio is offered
by Hanna and Eden. Independent checks use one QA independent provider, as in test_independent_followups.
A fixed clock stands in for "now" in the walk-in API, so a request can come at night.
Every test rolls back what it creates; the walk-in APIs commit, so their commits are held for the test.
See docs/features/WALKIN_HOURS_PLAN.md.
"""

from datetime import datetime, timedelta
import json
from pathlib import Path
import unittest
from unittest import mock

import frappe
import pytz
from frappe.utils import add_days, getdate, nowdate

from appointment.scheduler import booking
from appointment.scheduler.api import desk, policy_manager
from appointment.scheduler.helpers.policy_templates import POLICY_TEMPLATES
# Modules, not classes: a test class imported here would run again with this module.
from appointment.tests import demo_offerings
from appointment.tests import test_content_entitlements as entitlements
from appointment.tests import test_independent_customers as customers
from appointment.tests.test_customer_notifications import MANAGER, OWNER

ZONE = pytz.timezone("Africa/Addis_Ababa")
NOT_OPEN = "This time is not open for the walk-in's service. Choose another time."
NOTHING_OPEN = "Nothing is open for this service in the next 24 hours."


def _clock(day, wall_time):
    """`datetime` for the walk-in API with "now" fixed at a local wall time."""
    fixed = ZONE.localize(datetime.combine(getdate(day), datetime.strptime(wall_time, "%H:%M").time())).astimezone(pytz.UTC)

    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed.astimezone(tz) if tz else fixed.astimezone(ZONE).replace(tzinfo=None)

    return mock.patch.object(desk, "datetime", Clock)


def _open_times(event, day):
    """The offering's available slots on a day, as local wall times."""
    rows = booking.open_slots(booking.offering(event), day)["all_available_slots_for_data"]
    return [_wall(row) for row in rows if row["available"]]


def _wall(row):
    start, end = (datetime.fromisoformat(row[key].replace("Z", "+00:00")).astimezone(ZONE).replace(tzinfo=None)
                  for key in ("start_time", "end_time"))
    return start, end


def _starts(doc, field="start_time"):
    return datetime.combine(getdate(doc.appointment_date), datetime.strptime(str(doc.get(field)), "%H:%M:%S").time())


class WalkInCase(unittest.TestCase):
    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("walkin_hours")
        self.held = mock.patch.object(frappe.db, "commit")
        self.held.start()

    def tearDown(self):
        self.held.stop()
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="walkin_hours")


class OrganizationWalkInHoursTests(WalkInCase):
    @classmethod
    def setUpClass(cls):
        frappe.set_user("Administrator")
        cls.hanna, cls.eden = demo_offerings.cut_hanna(), demo_offerings.cut_eden()
        if not cls.hanna or not cls.eden:
            raise unittest.SkipTest("Rich demo businesses are not seeded on this site.")
        cls.service, cls.location, cls.hanna_provider = frappe.db.get_value("EventType", cls.hanna, ["service", "location", "provider"])
        cls.eden_provider = frappe.db.get_value("EventType", cls.eden, "provider")
        cls.day = next((add_days(nowdate(), offset) for offset in range(2, 16)
                        if len(_open_times(cls.hanna, add_days(nowdate(), offset))) >= 3
                        and len(_open_times(cls.eden, add_days(nowdate(), offset))) >= 3), None)
        if not cls.day:
            raise unittest.SkipTest("No free Bloom times in the next two weeks.")

    def _walk_in(self, provider=None):
        frappe.set_user(MANAGER)
        result = desk.add_walk_in(client_name="Meron Alemu", client_phone="+251911400611", service_requested=self.service,
                                  location_name=self.location, provider_preferred=provider)
        self.assertTrue(result.get("success"), result)
        return result["walk_in"]["name"]

    def _assign(self, name, provider=None, at="02:00", preferred_time=None):
        with _clock(self.day, at):
            return desk.assign_walk_in_to_slot(name, provider, self.location, preferred_time)

    def _book_as_guest(self, event, start, end):
        frappe.set_user("Guest")
        to_utc = lambda value: ZONE.localize(value).astimezone(pytz.UTC).isoformat().replace("+00:00", "Z")
        booking.book(event, to_utc(start), to_utc(end), "Hirut Bekele", f"qa-{frappe.generate_hash(length=8)}@example.test",
                     frappe.generate_hash(length=24))
        frappe.set_user(MANAGER)

    def _bookings_on_day(self, provider):
        return frappe.db.count("Appointment", {"provider": provider, "appointment_date": self.day, "status": ["in", booking.ACTIVE]})

    def test_assignment_at_night_falls_inside_open_hours(self):
        start, end = _open_times(self.hanna, self.day)[0]
        name = self._walk_in(self.hanna_provider)
        result = self._assign(name, self.hanna_provider)
        self.assertTrue(result.get("success"), result)
        doc = frappe.get_doc("Appointment", result["appointment"]["name"])
        self.assertEqual((_starts(doc), _starts(doc, "end_time")), (start, end))
        parts = booking.offering(self.hanna)
        hours = booking.effective_hours(parts.service, parts.location, parts.provider, self.day)
        wall = lambda value: datetime.combine(getdate(self.day), datetime.strptime(str(value), "%H:%M:%S").time())
        self.assertTrue(any(wall(h["start_time"]) <= start and end <= wall(h["end_time"]) for h in hours), hours)
        self.assertEqual((doc.event_type, doc.provider, doc.location), (self.hanna, self.hanna_provider, self.location))
        self.assertEqual(frappe.db.get_value("Walk In", name, ["status", "assigned_appointment"]), ("assigned", doc.name))

    def test_preferred_provider_is_used_when_free(self):
        first = _open_times(self.eden, self.day)[0][0]
        name = self._walk_in(self.eden_provider)
        result = self._assign(name)  # Reception sends no provider; the walk-in's preference counts.
        self.assertTrue(result.get("success"), result)
        doc = frappe.get_doc("Appointment", result["appointment"]["name"])
        self.assertEqual((doc.provider, doc.event_type), (self.eden_provider, self.eden))
        self.assertEqual(_starts(doc), first)

    def test_without_preference_the_earliest_provider_is_chosen(self):
        frappe.set_user(MANAGER)
        self._book_as_guest(self.hanna, *_open_times(self.hanna, self.day)[0])
        firsts = {self.hanna_provider: _open_times(self.hanna, self.day)[0][0], self.eden_provider: _open_times(self.eden, self.day)[0][0]}
        name = self._walk_in()
        result = self._assign(name)
        self.assertTrue(result.get("success"), result)
        doc = frappe.get_doc("Appointment", result["appointment"]["name"])
        self.assertEqual(_starts(doc), min(firsts.values()))
        self.assertEqual(firsts[doc.provider], _starts(doc))
        if firsts[self.hanna_provider] != firsts[self.eden_provider]:
            self.assertEqual(doc.provider, min(firsts, key=firsts.get))

    def test_equal_times_go_to_the_provider_with_fewer_bookings(self):
        frappe.set_user(MANAGER)
        self._book_as_guest(self.hanna, *_open_times(self.hanna, self.day)[-1])  # A late booking leaves the first time free.
        first = {provider: _open_times(event, self.day)[0][0] for provider, event in ((self.hanna_provider, self.hanna), (self.eden_provider, self.eden))}
        if first[self.hanna_provider] != first[self.eden_provider]:
            self.skipTest("Hanna and Eden do not share a first open time on this day.")
        counts = {provider: self._bookings_on_day(provider) for provider in first}
        if counts[self.hanna_provider] == counts[self.eden_provider]:
            self.skipTest("Hanna and Eden have the same number of bookings on this day.")
        result = self._assign(self._walk_in())
        self.assertTrue(result.get("success"), result)
        self.assertEqual(frappe.db.get_value("Appointment", result["appointment"]["name"], "provider"), min(counts, key=counts.get))

    def test_explicit_time_is_checked_against_open_hours(self):
        name = self._walk_in(self.hanna_provider)
        refused = self._assign(name, self.hanna_provider, preferred_time=f"{self.day} 03:00:00")
        self.assertEqual(refused, {"error": NOT_OPEN})
        self.assertEqual(frappe.db.get_value("Walk In", name, "status"), "waiting")

        start = _open_times(self.hanna, self.day)[1][0]
        result = self._assign(name, self.hanna_provider, preferred_time=str(start))
        self.assertTrue(result.get("success"), result)
        self.assertEqual(_starts(frappe.get_doc("Appointment", result["appointment"]["name"])), start)

    def test_nothing_open_in_the_next_24_hours_is_refused(self):
        monday = next(add_days(nowdate(), offset) for offset in range(1, 8) if getdate(add_days(nowdate(), offset)).weekday() == 0)
        parts = booking.offering(self.hanna)
        if booking.effective_hours(parts.service, parts.location, parts.provider, monday):
            self.skipTest("Bloom is open on Mondays on this site.")
        name = self._walk_in(self.hanna_provider)
        with _clock(monday, "00:30"):
            refused = desk.assign_walk_in_to_slot(name, self.hanna_provider, self.location)
        self.assertEqual(refused, {"error": NOTHING_OPEN})
        self.assertEqual(frappe.db.get_value("Walk In", name, ["status", "assigned_appointment"]), ("waiting", None))


class IndependentWalkInHoursTests(WalkInCase):
    """Independent providers keep their walk-in behavior: a later time instead of a refusal."""

    _business = customers.IndependentCustomerTests._business

    @classmethod
    def setUpClass(cls):
        entitlements.EntitlementIsolationTests.setUpClass()
        cls.fixture = entitlements.EntitlementIsolationTests.state

    @classmethod
    def tearDownClass(cls):
        entitlements._cleanup(cls.fixture)

    def test_independent_walk_in_takes_the_first_open_time(self):
        business = self._business("A")
        day = next(add_days(nowdate(), offset) for offset in range(2, 16) if _open_times(business.offering, add_days(nowdate(), offset)))
        frappe.set_user(self.fixture["owners"]["A"])
        service = frappe.db.get_value("EventType", business.offering, "service")
        names = []
        for phone in ("+251911400621", "+251911400622"):
            added = desk.add_walk_in(client_name="Meron Alemu", client_phone=phone, service_requested=service, business=business.key)
            names.append(added["walk_in"]["name"])
        location = frappe.db.get_value("Walk In", names[0], "location")
        first, second = (start for start, _end in _open_times(business.offering, day)[:2])
        with _clock(day, "02:00"):
            result = desk.assign_walk_in_to_slot(names[0], business.provider, location)
            # An explicit time outside the hours still moves to the next open time.
            later = desk.assign_walk_in_to_slot(names[1], business.provider, location, f"{day} 03:00:00")
        for outcome, expected in ((result, first), (later, second)):
            self.assertTrue(outcome.get("success"), outcome)
            doc = frappe.get_doc("Appointment", outcome["appointment"]["name"])
            self.assertEqual((_starts(doc), doc.provider, doc.event_type), (expected, business.provider, business.offering))
            self.assertFalse(doc.organization)


class PolicyTemplateLanguageTests(unittest.TestCase):
    def tearDown(self):
        frappe.set_user("Administrator")

    def _templates(self, language):
        frappe.set_user(OWNER)
        previous, frappe.local.lang = frappe.local.lang, language
        try:
            return {row["key"]: row for row in policy_manager.get_policy_templates()["templates"]}
        finally:
            frappe.local.lang = previous

    def test_templates_are_served_in_the_callers_language(self):
        catalog = Path(frappe.get_app_path("appointment")).parent / "frontend" / "src" / "lib" / "i18n" / "translations"
        english = json.loads((catalog / "en.json").read_text(encoding="utf-8"))["server"]["policyTemplates"]
        amharic = json.loads((catalog / "am.json").read_text(encoding="utf-8"))["server"]["policyTemplates"]
        to_amharic = {english[key]: amharic[key] for key in english}

        served = self._templates("en")
        self.assertEqual(set(served), set(POLICY_TEMPLATES))
        for key, template in POLICY_TEMPLATES.items():
            self.assertEqual((served[key]["name"], served[key]["description"]), (template["name"], template["description"]))

        served = self._templates("am")
        self.assertEqual(set(served), set(POLICY_TEMPLATES))
        for key, template in POLICY_TEMPLATES.items():
            self.assertEqual(served[key]["name"], to_amharic[template["name"]])
            self.assertEqual(served[key]["description"], to_amharic[template["description"]])
            self.assertEqual(served[key]["deposit_percentage"], template["deposit_percentage"])
