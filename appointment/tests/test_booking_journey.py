"""One card per service: sibling offerings, times across providers, service photos and handoff paths.

Uses the Bloom showcase: "Cut and shape" is offered by Hanna and Eden at the main studio and by Rahel
at the quiet styling room. Every test reads only; nothing is written.
"""

import unittest

import frappe
from frappe.utils import add_days, nowdate

from appointment.api import personal_meet
from appointment.public_experience import api as public_api
from appointment.public_experience import service_media
from appointment.scheduler import booking
from appointment.tests import demo_offerings

HANNA = demo_offerings.cut_hanna()
EDEN = demo_offerings.cut_eden()
RAHEL = demo_offerings.cut_rahel()


class TestBookingJourney(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        frappe.set_user("Administrator")
        if not all(name and frappe.db.exists("EventType", name) for name in (HANNA, EDEN, RAHEL)):
            raise unittest.SkipTest("The Bloom showcase is not seeded on this site.")
        cls.service = frappe.db.get_value("EventType", HANNA, "service")
        cls.org = frappe.db.get_value("Service", cls.service, "organization")
        cls.slug = frappe.db.get_value("Organization", cls.org, "slug")

    def setUp(self):
        frappe.set_user("Guest")

    def tearDown(self):
        frappe.set_user("Administrator")

    def _open_day(self):
        for offset in range(1, 8):
            day = add_days(nowdate(), offset)
            if booking.service_slots(HANNA, day)["all_available_slots_for_data"]:
                return day
        self.skipTest("No open day in the next week.")

    def test_siblings_cover_every_provider_of_the_service_with_the_anchor_first(self):
        parts = booking.offering(EDEN, public=True)
        names = [item.event.name for item in booking.sibling_offerings(parts)]
        self.assertEqual(names[0], EDEN)
        self.assertEqual(set(names), {HANNA, EDEN, RAHEL})
        self.assertEqual(len(names), len(set(names)))

    def test_service_slots_merge_providers_and_name_each_offering(self):
        result = booking.service_slots(HANNA, self._open_day(), organization_id=self.org)
        rows = result["all_available_slots_for_data"]
        self.assertEqual(result["provider_count"], 3)
        self.assertEqual({row["offering_id"] for row in rows}, {HANNA, EDEN, RAHEL})
        self.assertEqual([row["start_time"] for row in rows], sorted(row["start_time"] for row in rows))
        providers = {frappe.db.get_value("EventType", row["offering_id"], "provider") for row in rows}
        self.assertEqual(providers, {row["provider_id"] for row in rows})
        self.assertNotIn("client_name", str(rows))

    def test_service_slots_refuse_another_business(self):
        with self.assertRaises(frappe.PermissionError):
            booking.service_slots(HANNA, self._open_day(), organization_id="Another business")
        frappe.clear_messages()

    def test_meeting_windows_list_the_offerings_with_their_places(self):
        result = personal_meet.get_organization_meeting_windows(self.slug, RAHEL)
        offerings = result["offerings"]
        self.assertEqual(offerings[0]["id"], RAHEL)
        self.assertEqual({row["id"] for row in offerings}, {HANNA, EDEN, RAHEL})
        self.assertEqual(result["provider_count"], 3)
        self.assertEqual(result["providers"][0]["id"], frappe.db.get_value("EventType", RAHEL, "provider"))
        places = {row["id"]: row["location"]["location_name"] for row in offerings}
        self.assertEqual(places[RAHEL], "Bole quiet styling room")
        self.assertEqual(places[HANNA], "Bole main studio")
        for row in offerings:
            self.assertNotIn("meeting_link", row["location"])

    def test_services_and_windows_carry_the_published_service_photo(self):
        photos = service_media.for_organization(self.org)
        if not photos:
            self.skipTest("The Bloom website is not published on this site.")
        found = photos[self.service]
        catalog = personal_meet.get_organization_services(self.slug)
        cut = [row for row in catalog["services"] if row["service_id"] == self.service]
        self.assertEqual({(row["image"], row["photo_index"]) for row in cut}, {(found["image"], found["index"])})
        self.assertTrue(found["image"].startswith("/assets/appointment/"))
        self.assertGreaterEqual(found["index"], 0)
        windows = personal_meet.get_organization_meeting_windows(self.slug, HANNA)
        self.assertEqual((windows["image"], windows["photo_index"]), (found["image"], found["index"]))
        # The website's own words for the service, in each language it publishes.
        self.assertEqual(cut[0]["local_name"].get("en"), "Cut and shape")
        self.assertTrue(cut[0]["local_name"].get("am"))
        self.assertEqual(windows["local_name"], cut[0]["local_name"])
        self.assertTrue(all(isinstance(text, str) for text in cut[0]["local_description"].values()))

    def test_service_media_keeps_only_local_paths(self):
        self.assertEqual(service_media._safe("/assets/appointment/support/a.webp"), "/assets/appointment/support/a.webp")
        self.assertEqual(service_media._safe("/files/look-1.webp"), "/files/look-1.webp")
        for value in ("https://example.com/a.webp", "/files/../private/a.webp", "/assets/frappe/a.png", "/files/a b.webp", None, 3):
            self.assertEqual(service_media._safe(value), "")
        self.assertEqual(service_media.for_organization(None), {})
        self.assertEqual(service_media._texts({"en": "Cut", "am": "", "x" * 9: "no", "fr": 3}), {"en": "Cut"})
        self.assertEqual(service_media._texts("Cut"), {})

    def test_snapshot_paths_open_each_service_with_any_provider(self):
        frappe.set_user("Administrator")
        paths = public_api._organization_booking_paths(self.org, self.slug)
        self.assertIn(self.service, paths)
        path = paths[self.service]
        self.assertTrue(path.startswith(f"/schedule/org/{self.slug}/"))
        self.assertTrue(path.endswith("?with=any"))
        anchor = path.split("/")[-1].split("?")[0]
        self.assertEqual(frappe.db.get_value("EventType", anchor, "service"), self.service)

    def test_independent_offering_has_no_siblings(self):
        frappe.set_user("Administrator")
        name = frappe.db.sql(
            """select e.name from `tabEventType` e join `tabService` s on s.name = e.service
            where ifnull(s.organization, '') = '' and e.is_active = 1 limit 1"""
        )
        if not name:
            self.skipTest("No independent offering on this site.")
        try:
            parts = booking.offering(name[0][0], public=True)
        except (frappe.PermissionError, frappe.ValidationError):
            frappe.clear_messages()
            self.skipTest("The independent offering is not public.")
        self.assertEqual(booking.sibling_offerings(parts), [parts])
