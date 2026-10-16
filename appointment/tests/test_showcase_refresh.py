"""Showcase refresh: what it removes, what it keeps, and when it refuses.

Each test builds a small journal-owned showcase business in a temporary journal, plus a business the
journal does not own. Commits are no-ops and every test rolls back to a savepoint. The new seed is
replaced by a stub here; the full refresh with a real seed is drilled on a throwaway site
(docs/operations/content-showcases.md, "Refresh around today").

Run: bench --site <site> run-tests --module appointment.tests.test_showcase_refresh
"""

import random
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import frappe
from frappe.utils import add_days, nowdate

from appointment.demo import showcase, showcase_refresh
from appointment.scheduler import booking, independent, workspace


class ShowcaseJournalCase(unittest.TestCase):
    """A temporary journal with one showcase business, and a business the journal does not own."""

    def setUp(self):
        frappe.set_user("Administrator")
        commit = mock.patch("frappe.db.commit")
        commit.start()
        self.addCleanup(commit.stop)
        frappe.db.savepoint("showcase_refresh")
        self._syncing = frappe.flags.syncing_booking_urls
        frappe.flags.syncing_booking_urls = True
        self.enterContext(showcase.local_side_effects())  # As the seeder: no contacts for the staff users.
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.journal = Path(folder.name) / "rich-demo-v1.json"
        for target, value in (("state_path", mock.Mock(return_value=self.journal)), ("require_target", mock.Mock())):
            patcher = mock.patch.object(showcase, target, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.state = dict(version=showcase.VERSION, site=frappe.local.site, anchor_date=add_days(nowdate(), -200),
                          base_url="http://localhost", created=[], personas=[], businesses={}, appointments=[])
        self.showcase = self._business("Kidus Grooming")
        self._journal(self.showcase)
        self._booking_link_row(self.showcase)
        self.file = self._file(self.showcase)
        self.seeded = self._book(self.showcase, 0, "Liya Tadesse")
        showcase.remember(self.state, "Appointment", self.seeded.name)
        showcase.remember(self.state, "Customer Profile", self.seeded.customer)
        self.state["appointments"].append(self.seeded.name)
        showcase.write_state(self.state)
        self.other = self._business("Lulit Tailoring")

    def tearDown(self):
        frappe.set_user("Administrator")
        frappe.db.rollback(save_point="showcase_refresh")
        frappe.flags.syncing_booking_urls = self._syncing

    # Helpers ------------------------------------------------------------------
    def _business(self, name):
        name = f"{name} {random.randint(10000, 99999)}"
        user = f"owner.{frappe.generate_hash(length=8)}@example.test"
        frappe.get_doc(dict(doctype="User", email=user, first_name=name.split()[0], enabled=1, send_welcome_email=0,
                            user_type="Website User", roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
        frappe.set_user(user)
        row = workspace.create(name, f"{name} Bole", "Haircut and style", "Africa/Addis_Ababa", 30, "08:00", "18:00",
                               list(independent.DAYS), frappe.generate_hash(length=24))
        workspace.publish(row["organization"], 1)
        frappe.set_user("Administrator")
        return frappe._dict(row, user=user)

    def _independent(self, name):
        """A journal-owned independent showcase, as Ergata: its locations and services link to the provider."""
        from appointment.public_experience import solo_setup

        name = f"{name} {random.randint(10000, 99999)}"
        user = f"owner.{frappe.generate_hash(length=8)}@example.test"
        frappe.get_doc(dict(doctype="User", email=user, first_name=name.split()[0], enabled=1, send_welcome_email=0,
                            user_type="System User", roles=[{"role": "Provider"}])).insert(ignore_permissions=True)
        frappe.set_user(user)
        provider = solo_setup.create(name)["provider"]
        row = independent.create(provider, f"{name} Kazanchis", "Counselling session", "Africa/Addis_Ababa", 60,
                                 "08:30", "17:30", list(independent.DAYS))
        independent.publish(provider, 1)
        frappe.set_user("Administrator")
        event = frappe.get_doc("EventType", row["offering"])
        for doctype, record in [("User", user), ("Provider", provider), ("Location", event.location),
                                ("Service", event.service), ("EventType", event.name)]:
            showcase.remember(self.state, doctype, record)
        self.state.setdefault("independents", {})["yared"] = dict(provider=provider, owner=user,
                                                                  public_path="/yared-counselling")
        showcase.write_state(self.state)
        return frappe._dict(provider=provider, user=user, offering=event.name, location=event.location,
                            service=event.service)

    def _journal(self, business):
        event = frappe.get_doc("EventType", business.offering)
        showcase.remember(self.state, "User", business.user)
        for doctype, name in [("Organization", business.organization), ("Provider", event.provider),
                              ("Location", event.location), ("Service", event.service), ("EventType", event.name)]:
            showcase.remember(self.state, doctype, name)
        self.state["businesses"]["kidus"] = dict(organization=business.organization, owner=business.user,
                                                 providers=[event.provider], public_path="/schedule/org/kidus")

    def _booking_link_row(self, business):
        """A booking URL row of the organization pointing at its service, as the booking link sync makes."""
        organization = frappe.get_doc("Organization", business.organization)
        service = frappe.db.get_value("EventType", business.offering, "service")
        organization.append("booking_urls", {"service": service}).db_insert()

    def _file(self, business):
        name = f"kidus-{frappe.generate_hash(length=8)}.txt"
        doc = frappe.get_doc(dict(doctype="File", file_name=name, content=b"Kidus Grooming price list", is_private=0,
                                  attached_to_doctype="Organization", attached_to_name=business.organization))
        doc.insert(ignore_permissions=True)
        showcase.remember(self.state, "File", doc.name)
        self.addCleanup(lambda: Path(frappe.get_site_path("public", "files", name)).unlink(missing_ok=True))
        return doc

    def _file_path(self):
        return Path(frappe.get_site_path("public", self.file.file_url.lstrip("/")))

    def _book(self, business, index, person):
        for offset in range(2, 30):
            slots = [s for s in booking.slots(business.offering, add_days(nowdate(), offset))["all_available_slots_for_data"]
                     if s["available"]]
            if len(slots) > index:
                break
        email = f"{person.split()[0].lower()}.{frappe.generate_hash(length=6)}@example.test"
        frappe.set_user("Guest")
        result = booking.book(business.offering, slots[index]["start_time"], slots[index]["end_time"], person, email,
                              frappe.generate_hash(length=24))
        frappe.set_user("Administrator")
        return frappe.get_doc("Appointment", result["booking_id"])


class ShowcaseRefreshTests(ShowcaseJournalCase):
    def test_dry_run_lists_journal_and_visitor_records_and_changes_nothing(self):
        visitor = self._book(self.showcase, 1, "Hanna Girma")
        outside = self._book(self.other, 0, "Abel Kebede")
        report = showcase.refresh(dry_run=True)
        self.assertTrue(report["dry_run"])
        self.assertEqual(report["journal_records"]["Appointment"], 1)
        self.assertEqual(report["journal_records"]["Organization"], 1)
        self.assertEqual(report["visitor_records"]["Appointment"], 1)
        self.assertEqual(report["visitor_records"]["Customer Profile"], 1)
        self.assertEqual(report["refused"], [])
        self.assertGreaterEqual(report["kept"]["bookings"], 1)
        for name in (self.seeded.name, visitor.name, outside.name):
            self.assertTrue(frappe.db.exists("Appointment", name))
        self.assertTrue(self.journal.exists())

    def test_refresh_removes_visitor_bookings_on_showcases_only(self):
        visitor = self._book(self.showcase, 1, "Hanna Girma")
        outside = self._book(self.other, 0, "Abel Kebede")
        with mock.patch.object(showcase, "seed", side_effect=self._stub_seed) as seed:
            report = showcase.refresh(anchor_date=nowdate(), dry_run=False)
        seed.assert_called_once_with(base_url="http://localhost", anchor_date=nowdate())
        for doctype, name in [("Appointment", self.seeded.name), ("Appointment", visitor.name),
                              ("Customer Profile", visitor.customer), ("Organization", self.showcase.organization),
                              ("User", self.showcase.user)]:
            self.assertFalse(frappe.db.exists(doctype, name), (doctype, name))
        self.assertTrue(frappe.db.exists("Appointment", outside.name))
        self.assertTrue(frappe.db.exists("Organization", self.other.organization))
        self.assertEqual(report["bookings_after"]["anchor_date"], nowdate())

    def test_a_visitor_record_that_reaches_another_business_is_refused(self):
        visitor = self._book(self.showcase, 1, "Hanna Girma")
        other_location = frappe.db.get_value("EventType", self.other.offering, "location")
        frappe.db.set_value("Appointment", visitor.name, "location", other_location, update_modified=False)
        report = showcase.refresh(dry_run=True)
        self.assertEqual(report["refused_count"], 1)
        self.assertIn(other_location, report["refused"][0]["reason"])
        with mock.patch.object(showcase, "seed") as seed, self.assertRaises(frappe.ValidationError):
            showcase.refresh(dry_run=False)
        seed.assert_not_called()
        self.assertTrue(frappe.db.exists("Appointment", self.seeded.name))
        self.assertTrue(frappe.db.exists("Organization", self.showcase.organization))
        self.assertTrue(self.journal.exists())

    def test_every_record_goes_after_the_records_that_link_to_it(self):
        self._book(self.showcase, 1, "Hanna Girma")
        plan = showcase_refresh.ShowcaseRefresh(showcase.load_state())
        order = [entry for entry, _releases in plan.order.steps]
        position = {entry: index for index, entry in enumerate(order)}
        self.assertEqual(plan.order.unbroken, [])
        self.assertEqual(set(order), set(plan.owned) | set(plan.found))
        released = {(parent, entry) for entry, releases in plan.order.steps for _dt, _field, parent in releases}
        for target, linkers in plan.blocks.items():
            for linker in linkers - {parent for parent, entry in released if entry == target}:
                self.assertLess(position[linker], position[target], (linker, target))
        files = [index for index, entry in enumerate(order) if entry[0] == "File"]
        self.assertEqual(files, list(range(len(order) - len(files), len(order))))

    def test_the_organization_service_cycle_is_broken_through_child_rows(self):
        plan = showcase_refresh.ShowcaseRefresh(showcase.load_state())
        self.assertEqual(plan.order.unbroken, [])
        released = [(entry, releases) for entry, releases in plan.order.steps if releases]
        self.assertEqual(released[0][0][0], "Service")
        self.assertEqual(released[0][1][0][:2], ("Booking URL", "service"))

    def test_files_stay_on_disk_until_the_removal_commits(self):
        path = self._file_path()
        organization = self.showcase.organization
        original = showcase._delete_entry

        def fail_on_organization(doctype, name):
            if doctype == "Organization":
                raise frappe.ValidationError("stop")
            return original(doctype, name)

        with mock.patch.object(showcase, "_delete_entry", side_effect=fail_on_organization), \
                mock.patch("frappe.db.rollback"), self.assertRaises(frappe.ValidationError):
            showcase.refresh(dry_run=False)
        self.assertTrue(path.exists())
        self.assertTrue(frappe.db.exists("Organization", organization))
        with mock.patch.object(showcase, "seed", side_effect=self._stub_seed):
            showcase.refresh(dry_run=False)
        self.assertFalse(path.exists())

    def test_refresh_needs_the_journal_and_the_guard(self):
        self.journal.unlink()
        with self.assertRaises(frappe.ValidationError):
            showcase.refresh(dry_run=True)
        showcase.write_state(self.state)
        showcase.require_target.side_effect = frappe.ValidationError("guard")
        with self.assertRaises(frappe.ValidationError):
            showcase.refresh(dry_run=False)
        self.assertTrue(frappe.db.exists("Appointment", self.seeded.name))

    def _stub_seed(self, base_url, anchor_date):
        showcase.write_state({**self.state, "anchor_date": anchor_date, "created": []})
        return {"counts": {}}


if __name__ == "__main__":
    unittest.main()
