"""Upstream drafts cannot bypass immutable routes or governed delivery."""

import json
import sys
import unittest
from unittest.mock import patch

import frappe

from appointment.content import upstream
from appointment.tests.test_content_entitlements import EntitlementIsolationTests, _cleanup, require_target


class UpstreamContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        EntitlementIsolationTests.setUpClass()
        cls.fixture = EntitlementIsolationTests.state

    @classmethod
    def tearDownClass(cls):
        _cleanup(cls.fixture)

    def setUp(self):
        frappe.set_user(self.fixture["owners"]["A"])

    def test_blog_draft_cannot_enable_the_upstream_public_generator(self):
        post = frappe.get_doc("Blog Post", self.fixture["posts"]["A"])
        self.assertIsInstance(post, upstream.GovernedBlogPost)
        post.published = 1
        with self.assertRaises(frappe.ValidationError):
            post.save()
        self.assertFalse(frappe.db.get_value("Blog Post", post.name, "published"))

    def test_blog_generator_cannot_serve_mutable_content(self):
        post = frappe.get_doc("Blog Post", self.fixture["posts"]["A"])
        with self.assertRaises(frappe.DoesNotExistError):
            post.get_context({})

    def test_newsletter_legacy_methods_never_call_email_transport(self):
        doc = frappe.get_doc({"doctype": "Newsletter", "subject": "Synthetic newsletter"})
        self.assertIsInstance(doc, upstream.GovernedNewsletter)
        with patch("frappe.sendmail") as mail:
            for action in (lambda: doc.send_test_email("recipient@example.test"), doc.send_emails,
                           doc.queue_all, lambda: doc.send_newsletter(["recipient@example.test"])):
                with self.assertRaises(frappe.PermissionError):
                    action()
            mail.assert_not_called()

    def test_newsletter_mutable_publication_and_scheduling_are_blocked(self):
        for flags in ({"published": 1}, {"schedule_sending": 1}, {"schedule_send": "2099-01-01 09:00:00"}):
            doc = frappe.get_doc({"doctype": "Newsletter", "subject": "Synthetic newsletter", **flags})
            with self.assertRaises(frappe.ValidationError):
                doc.validate()
        with self.assertRaises(frappe.DoesNotExistError):
            doc.get_context({})

    def test_legacy_guest_signup_is_fail_closed(self):
        frappe.set_user("Guest")
        with patch("frappe.sendmail") as mail:
            with self.assertRaises(frappe.PermissionError):
                upstream.legacy_subscription_unavailable(email="recipient@example.test", email_group="foreign")
            mail.assert_not_called()

    def test_legacy_global_blog_and_rss_routes_are_closed(self):
        for path in ("/blog", "/blog/private-draft", "/rss.xml", "/rss"):
            with patch.object(frappe.local, "request", frappe._dict(path=path), create=True):
                with self.assertRaises(frappe.DoesNotExistError):
                    upstream.block_legacy_public_routes()
        with patch.object(frappe.local, "request", frappe._dict(path="/my-business/blog"), create=True):
            upstream.block_legacy_public_routes()


def run():
    require_target()
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(UpstreamContentTests))
    report = {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
    if not result.wasSuccessful():
        raise RuntimeError(json.dumps(report))
    return report
