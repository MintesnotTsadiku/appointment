"""Showcase cleanup and retire_businesses: link order, refusal without a change, files, dry run.

The journal and businesses come from test_showcase_refresh.ShowcaseJournalCase: commits are no-ops and every
test rolls back to a savepoint. The full cleanup with a real seed is drilled on a throwaway site
(docs/operations/content-showcases.md, "Cleanup").

Run: bench --site <site> run-tests --module appointment.tests.test_showcase_cleanup
"""

import unittest
from collections import Counter
from unittest import mock

import frappe

from appointment.demo import showcase, showcase_refresh
from appointment.tests.test_showcase_refresh import ShowcaseJournalCase


class ShowcaseCleanupTests(ShowcaseJournalCase):
    def setUp(self):
        super().setUp()
        # The seeder sends no customer notifications; the guest booking of the fixture did, so the journal owns it.
        for name in frappe.get_all("Appointment Notification", filters={"appointment": self.seeded.name}, pluck="name"):
            showcase.remember(self.state, "Appointment Notification", name)
        self.solo = self._independent("Yared Counselling")

    def test_cleanup_removes_the_journal_in_link_order_with_an_independent_showcase(self):
        plan = showcase_refresh.JournalCleanup(self.state["created"])
        order = [entry for entry, _releases in plan.order.steps]
        # The old fixed order deleted the Provider before the Location that points at it.
        self.assertLess(order.index(("Location", self.solo.location)), order.index(("Provider", self.solo.provider)))
        released = [(entry, releases) for entry, releases in plan.order.steps if releases]
        self.assertEqual(released[0][0][0], "Service")
        self.assertEqual(released[0][1][0][:2], ("Booking URL", "service"))
        self.assertEqual(plan.blockers, set())
        self.assertEqual(plan.order.unbroken, [])

        report = showcase.cleanup()
        self.assertFalse(report["dry_run"])
        for doctype, name in self.state["created"]:
            self.assertFalse(frappe.db.exists(doctype, name), (doctype, name))
        self.assertTrue(frappe.db.exists("Organization", self.other.organization))
        self.assertFalse(self.journal.exists())
        self.assertFalse(self._file_path().exists())

    def test_a_visitor_booking_blocks_cleanup_and_nothing_changes(self):
        visitor = self._book(self.showcase, 1, "Hanna Girma")
        report = showcase.cleanup(dry_run=True)
        self.assertEqual(report["blockers"]["Appointment"], 1)
        self.assertEqual(report["blockers"]["Customer Profile"], 1)
        self.assertIn(visitor.name, " ".join(report["blocker_examples"]["Appointment"]))

        with mock.patch.object(showcase, "_delete_entry") as delete, \
                self.assertRaises(frappe.ValidationError) as refused:
            showcase.cleanup()
        delete.assert_not_called()
        message = str(refused.exception)
        for text in ("Appointment 1", "Customer Profile 1", "appointment.demo.showcase.refresh", "No data changed"):
            self.assertIn(text, message)
        for doctype, name in self.state["created"]:
            self.assertTrue(frappe.db.exists(doctype, name), (doctype, name))
        self.assertTrue(frappe.db.exists("Appointment", visitor.name))
        self.assertTrue(self._file_path().exists())
        self.assertTrue(self.journal.exists())

    def test_files_stay_on_disk_when_the_removal_fails(self):
        original = showcase._delete_entry

        def fail_on_organization(doctype, name):
            if doctype == "Organization":
                raise frappe.ValidationError("stop")
            return original(doctype, name)

        with mock.patch.object(showcase, "_delete_entry", side_effect=fail_on_organization), \
                mock.patch("frappe.db.rollback"), self.assertRaises(frappe.ValidationError):
            showcase.cleanup()
        self.assertTrue(self._file_path().exists())
        self.assertTrue(self.journal.exists())
        showcase.cleanup()
        self.assertFalse(self._file_path().exists())
        self.assertFalse(self.journal.exists())

    def test_the_dry_run_counts_and_changes_nothing(self):
        report = showcase.cleanup(dry_run="1")
        self.assertTrue(report["dry_run"])
        self.assertEqual(report["journal_records"], dict(Counter(dt for dt, _ in self.state["created"])))
        self.assertEqual(report["journal_records_already_gone"], 0)
        self.assertEqual(report["blockers"], {})
        self.assertGreaterEqual(report["child_rows_released"], 1)
        for doctype, name in self.state["created"]:
            self.assertTrue(frappe.db.exists(doctype, name), (doctype, name))
        self.assertTrue(self._file_path().exists())
        self.assertTrue(self.journal.exists())

    def test_access_rows_of_the_showcase_staff_go_with_the_journal(self):
        frappe.permissions.add_user_permission("Organization", self.showcase.organization, self.showcase.user,
                                               ignore_permissions=True)
        permission = frappe.db.get_value("User Permission", {"user": self.showcase.user,
                                                             "for_value": self.showcase.organization})
        report = showcase.cleanup(dry_run=True)
        self.assertGreaterEqual(report["removed_with_journal"]["User Permission"], 1)
        self.assertEqual(report["blockers"], {})
        showcase.cleanup()
        self.assertFalse(frappe.db.exists("User Permission", permission))

    def test_retire_businesses_removes_one_showcase_through_the_same_path(self):
        report = showcase.retire_businesses(["yared"], dry_run=True)
        self.assertEqual(report["blockers"], {})
        self.assertEqual(report["records"]["Location"], 1)
        self.assertTrue(frappe.db.exists("Location", self.solo.location))
        with mock.patch.object(showcase_refresh, "delete_in_order", wraps=showcase_refresh.delete_in_order) as remove:
            showcase.retire_businesses(["yared"], dry_run=False)
        remove.assert_called_once()
        for doctype, name in [("Provider", self.solo.provider), ("Location", self.solo.location),
                              ("User", self.solo.user)]:
            self.assertFalse(frappe.db.exists(doctype, name), (doctype, name))
        self.assertTrue(frappe.db.exists("Organization", self.showcase.organization))
        state = showcase.load_state()
        self.assertNotIn("yared", state["independents"])
        self.assertNotIn(["Provider", self.solo.provider], state["created"])

    def test_retire_businesses_refuses_on_a_visitor_booking(self):
        self._book(self.solo, 0, "Selam Bekele")
        with self.assertRaises(frappe.ValidationError) as refused:
            showcase.retire_businesses(["yared"], dry_run=False)
        self.assertIn("Appointment 1", str(refused.exception))
        self.assertTrue(frappe.db.exists("Provider", self.solo.provider))
        self.assertIn("yared", showcase.load_state()["independents"])


if __name__ == "__main__":
    unittest.main()
