"""The showcase seeder's guard: development sites, the named server showcase site, and refusals.

Reads only: the guard is checked with a patched site name, config and journal path; nothing is seeded.

Run: bench --site <site> run-tests --module appointment.tests.test_showcase_site_guard
"""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import frappe

from appointment.demo import showcase

SERVER_SITE = "showcase.example.com"
FLAGS = {"rich_demo_enabled": 1, "mute_emails": 1, "pause_scheduler": 1}


class ShowcaseSiteGuardTests(unittest.TestCase):
    def setUp(self):
        frappe.set_user("Administrator")
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.journal = Path(self.folder.name) / "rich-demo-v1.json"

    def guard(self, site, conf, journal_exists=False, counts=None):
        if journal_exists:
            self.journal.write_text("{}")
        patches = [
            patch.object(frappe.local, "site", site),
            patch.object(frappe.local, "conf", frappe._dict(conf)),
            patch.object(showcase, "state_path", return_value=self.journal),
        ]
        if counts is not None:
            patches.append(patch.object(frappe.db, "count", side_effect=lambda doctype, *a, **k: counts.get(doctype, 0)))
        for item in patches:
            item.start()
        try:
            showcase.require_target()
        finally:
            for item in reversed(patches):
                item.stop()

    def test_named_empty_server_site_is_allowed(self):
        self.guard(SERVER_SITE, {**FLAGS, "showcase_site": SERVER_SITE}, counts={})

    def test_named_site_with_existing_businesses_is_refused_on_first_seed(self):
        with self.assertRaises(frappe.ValidationError) as caught:
            self.guard(SERVER_SITE, {**FLAGS, "showcase_site": SERVER_SITE}, counts={"Organization": 3, "Appointment": 40})
        self.assertIn("Organization", str(caught.exception))
        self.assertIn("Appointment", str(caught.exception))

    def test_named_site_with_its_own_journal_can_seed_again(self):
        self.guard(SERVER_SITE, {**FLAGS, "showcase_site": SERVER_SITE}, journal_exists=True, counts={"Organization": 5})

    def test_a_site_that_is_not_named_is_refused(self):
        with self.assertRaises(frappe.ValidationError):
            self.guard(SERVER_SITE, {**FLAGS, "showcase_site": "other.example.com"}, counts={})
        with self.assertRaises(frappe.ValidationError):
            self.guard(SERVER_SITE, dict(FLAGS), counts={})

    def test_every_safety_flag_is_still_required(self):
        for missing in FLAGS:
            conf = {**FLAGS, "showcase_site": SERVER_SITE}
            conf.pop(missing)
            with self.assertRaises(frappe.ValidationError, msg=missing):
                self.guard(SERVER_SITE, conf, counts={})

    def test_development_sites_work_as_before(self):
        self.guard("drill.localhost", {**FLAGS, "worktree_development": 1}, counts={"Organization": 5})
        with self.assertRaises(frappe.ValidationError):
            self.guard("drill.localhost", dict(FLAGS), counts={})

    def test_only_the_administrator_may_seed(self):
        frappe.set_user("Guest")
        try:
            with self.assertRaises(frappe.PermissionError):
                self.guard(SERVER_SITE, {**FLAGS, "showcase_site": SERVER_SITE}, counts={})
        finally:
            frappe.set_user("Administrator")
