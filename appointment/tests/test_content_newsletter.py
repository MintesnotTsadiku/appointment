"""Normal-owner newsletter consent and local delivery, with exact cleanup."""

import json
import sys
import unittest
from unittest.mock import patch

import frappe
from frappe.utils import add_to_date, now_datetime
from frappe.utils.password import delete_all_passwords_for

from appointment.content import entitlements
from appointment.content.newsletter import api, audience, campaigns, core, delivery, senders
from appointment.public_experience import setup
from appointment.tests.test_content_entitlements import EntitlementIsolationTests, _cleanup, require_target


class NewsletterTests(unittest.TestCase):
    def setUp(self):
        EntitlementIsolationTests.setUpClass()
        self.fixture = EntitlementIsolationTests.state
        self.sites = {}
        for suffix in ("A", "B"):
            frappe.set_user(self.fixture["owners"][suffix])
            draft = setup.start("Organization", self.fixture["orgs"][suffix], "Newsletter test",
                                "newsletter-" + frappe.generate_hash(length=10), "tena-clinic")
            draft = setup.save(draft["site"], draft["draftVersion"], "features", features=["newsletter"])
            setup.publish(draft["site"], draft["draftVersion"])
            self.sites[suffix] = frappe.get_doc("Public Site", draft["site"])
        frappe.db.commit()
        self.owner()
        self.mail = patch.object(frappe, "sendmail", side_effect=AssertionError("External mail is forbidden"))
        self.mail.start()
        self.jobs = patch.object(frappe, "enqueue")
        self.jobs.start()

    def tearDown(self):
        self.jobs.stop()
        self.mail.stop()
        frappe.set_user("Administrator")
        sites = [doc.name for doc in self.sites.values()]
        scoped = {"public_site": ["in", sites]}
        for name in frappe.get_all("Newsletter Audience Member", filters=scoped, pluck="name"):
            delete_all_passwords_for("Newsletter Audience Member", name)
        for doctype in core.TYPES:
            frappe.db.delete(doctype, scoped)
        ownerships = frappe.get_all("Content Ownership", filters={**scoped, "source_doctype": "Newsletter"}, fields=["source_name"])
        frappe.db.delete("Content Ownership", scoped)
        for row in ownerships:
            frappe.db.delete("Newsletter Email Group", {"parent": row.source_name})
            frappe.db.delete("Newsletter", {"name": row.source_name})
        for site in sites:
            group = frappe.db.get_value("Email Group", {"title": "Website newsletter " + site}, "name")
            if group:
                frappe.db.delete("Email Group", {"name": group})
        for doctype in ("Published Content Release", "Experience Release"):
            frappe.db.delete(doctype, scoped)
        for row in frappe.get_all("Public Experience Outbox", fields=["name", "payload_json"]):
            if json.loads(row.payload_json or "{}").get("site") in sites:
                frappe.db.delete("Public Experience Outbox", {"name": row.name})
        profiles = [doc.brand_profile for doc in self.sites.values()]
        frappe.db.delete("Brand Revision", {"brand_profile": ["in", profiles]})
        frappe.db.delete("Public Site", {"name": ["in", sites]})
        frappe.db.delete("Brand Profile", {"name": ["in", profiles]})
        frappe.db.delete("Business Entitlement", {"organization": ["in", list(self.fixture["orgs"].values())]})
        _cleanup(self.fixture)

    def owner(self, suffix="A"):
        frappe.set_user(self.fixture["owners"][suffix])

    def action_token(self, kind):
        message = frappe.get_all("Local Email Message", filters={"public_site": self.sites["A"].name, "kind": kind},
                                 fields=["payload_json"], order_by="creation desc", limit_page_length=1)[0]
        return json.loads(message.payload_json)["actionPath"].rsplit("/", 1)[1]

    def subscriber(self, confirm=True):
        frappe.set_user("Guest")
        audience.subscribe(self.sites["A"].slug, "reader@example.test", 1)
        token = self.action_token("Audience Confirmation")
        if confirm:
            audience.confirm(token)
        self.owner()
        return frappe.get_doc("Newsletter Audience Member", {"public_site": self.sites["A"].name, "email": "reader@example.test"}), token

    def sender(self, verify=True):
        self.owner()
        result = senders.request(self.sites["A"].name, "sender@example.test", "Clinic updates")
        if verify:
            frappe.set_user("Guest")
            senders.verify(self.action_token("Sender Verification"))
            self.owner()
        return result["sender"]

    def campaign(self):
        member, _ = self.subscriber()
        sender = self.sender()
        draft = campaigns.create_draft(self.sites["A"].name, sender, "Helpful update", "# Welcome\nA safe update.")
        result = campaigns.queue(self.sites["A"].name, draft["ownership"], sender, "request-" + frappe.generate_hash(length=20))
        return member, sender, draft, result["campaign"]

    def test_explicit_consent_opaque_single_use_and_no_guest_records(self):
        frappe.set_user("Guest")
        with self.assertRaises(frappe.ValidationError):
            audience.subscribe(self.sites["A"].slug, "reader@example.test", 0)
        member, token = self.subscriber(False)
        self.assertEqual(len(token), 43)
        self.assertNotIn("reader", token)
        self.assertNotEqual(member.confirmation_hash, token)
        frappe.set_user("Guest")
        audience.confirm(token)
        with self.assertRaises(frappe.ValidationError):
            audience.confirm(token)
        with self.assertRaises(frappe.PermissionError):
            api.workspace(self.sites["A"].name)
        self.assertEqual(frappe.db.get_value(member.doctype, member.name, "status"), "Confirmed")

    def test_public_snapshot_exposes_enabled_signup_without_drafts(self):
        from appointment.public_experience import api as public_api

        frappe.set_user("Guest")
        with patch.object(public_api, "_request_host", return_value=frappe.local.site):
            snapshot = public_api.get_public_experience_snapshot(public_path="/" + self.sites["A"].slug)
        self.assertEqual(snapshot["siteSlug"], self.sites["A"].slug)
        self.assertEqual(snapshot["features"], ["newsletter"])
        self.assertNotIn("website_setup_json", snapshot)

    def test_sender_verification_required_and_preview_is_unsent(self):
        self.subscriber()
        sender = self.sender(False)
        draft = campaigns.create_draft(self.sites["A"].name, sender, "Update", "Safe content")
        preview = campaigns.preview(self.sites["A"].name, draft["ownership"], sender)
        self.assertFalse(preview["audience_sent"])
        with self.assertRaises(frappe.ValidationError):
            campaigns.queue(self.sites["A"].name, draft["ownership"], sender, "pending-sender-request")
        self.assertEqual(frappe.db.count("Business Newsletter Campaign", {"public_site": self.sites["A"].name}), 0)

    def test_expired_confirmation_and_repeated_sender_requests(self):
        member, token = self.subscriber(False)
        member.confirmation_expires = add_to_date(now_datetime(), hours=-1)
        core.write(member)
        frappe.set_user("Guest")
        with self.assertRaises(frappe.ValidationError):
            audience.confirm(token)
        sender = self.sender(False)
        first_hash = frappe.db.get_value("Newsletter Sender Identity", sender, "verification_hash")
        self.sender(False)
        self.assertEqual(frappe.db.get_value("Newsletter Sender Identity", sender, "verification_hash"), first_hash)
        self.assertEqual(frappe.db.count("Local Email Message", {"public_site": self.sites["A"].name, "kind": "Sender Verification"}), 1)

    def test_audience_quota_and_unpublished_signup_fail_closed(self):
        frappe.set_user("Administrator")
        entitlements.set_capability("Organization", self.fixture["orgs"]["A"], None, "newsletter", "Active", limits={"audience": 1})
        self.subscriber()
        frappe.set_user("Guest")
        with self.assertRaises(frappe.ValidationError):
            audience.subscribe(self.sites["A"].slug, "another@example.test", 1)
        with self.assertRaises(frappe.DoesNotExistError):
            audience.subscribe("missing-website", "another@example.test", 1)

    def test_immutable_snapshot_and_idempotent_local_delivery(self):
        member, sender, draft, name = self.campaign()
        campaign = frappe.get_doc("Business Newsletter Campaign", name)
        post = frappe.get_doc("Newsletter", draft["newsletter"])
        post.message_md = "Changed private draft"
        post.save()
        self.assertNotIn("Changed private", campaign.content_json)
        campaign.content_json = "{}"
        with self.assertRaises(frappe.PermissionError):
            core.write(campaign)
        self.assertEqual(delivery.deliver_campaign(name)["status"], "Delivered")
        delivery.deliver_campaign(name)
        self.assertEqual(frappe.db.count("Local Email Message", {"campaign": name, "kind": "Campaign Delivery"}), 1)
        self.assertEqual(frappe.db.get_value("Business Newsletter Campaign", name, "delivered_count"), 1)
        self.assertEqual(member.status, "Confirmed")

    def test_suppression_is_rechecked_before_capture(self):
        member, _, _, name = self.campaign()
        audience.suppress(member.name, "Do not contact")
        result = delivery.deliver_campaign(name)
        self.assertEqual(result["skipped"], 1)
        self.assertEqual(result["captured"], 0)
        frappe.set_user("Guest")
        audience.subscribe(self.sites["A"].slug, member.email, 1)
        self.assertEqual(frappe.db.get_value(member.doctype, member.name, "status"), "Suppressed")

    def test_unsubscribe_after_queue_is_rechecked_before_delivery(self):
        member, _, _, name = self.campaign()
        token = member.get_password("unsubscribe_token")
        frappe.set_user("Guest")
        audience.unsubscribe(token)
        self.owner()
        result = delivery.deliver_campaign(name)
        self.assertEqual(result["skipped"], 1)
        self.assertEqual(result["captured"], 0)

    def test_expired_entitlement_holds_send_but_unsubscribe_still_works(self):
        member, _, _, name = self.campaign()
        token = member.get_password("unsubscribe_token")
        frappe.set_user("Administrator")
        entitlements.set_capability("Organization", self.fixture["orgs"]["A"], None, "newsletter", "Expired")
        self.owner()
        self.assertEqual(delivery.deliver_campaign(name)["status"], "Held")
        frappe.set_user("Guest")
        audience.unsubscribe(token)
        self.assertEqual(frappe.db.get_value(member.doctype, member.name, "status"), "Unsubscribed")
        self.assertEqual(frappe.db.count("Local Email Message", {"campaign": name}), 0)

    def test_throttle_and_retry_do_not_duplicate_captures(self):
        _, _, _, name = self.campaign()
        with patch.object(delivery, "_throttle", return_value=False):
            self.assertEqual(delivery.deliver_campaign(name)["status"], "Scheduled")
        doc = frappe.get_doc("Business Newsletter Campaign", name)
        doc.status = "Queued"
        core.write(doc)
        with patch.object(core, "capture", side_effect=RuntimeError("Synthetic local sink failure")):
            self.assertEqual(delivery.deliver_campaign(name)["status"], "Error")
        campaigns.retry(name)
        self.assertEqual(delivery.deliver_campaign(name)["status"], "Delivered")
        self.assertEqual(frappe.db.count("Local Email Message", {"campaign": name}), 1)

    def test_monthly_quota_and_request_replay(self):
        _, sender, draft, _ = self.campaign()
        site = self.sites["A"].name
        first = campaigns.queue(site, draft["ownership"], sender, "same-request-identity")
        repeated = campaigns.queue(site, draft["ownership"], sender, "same-request-identity")
        self.assertEqual(first["campaign"], repeated["campaign"])
        self.assertTrue(repeated["replayed"])
        campaigns.queue(site, draft["ownership"], sender, "third-request-identity")
        campaigns.queue(site, draft["ownership"], sender, "fourth-request-identity")
        with self.assertRaises(frappe.ValidationError):
            campaigns.queue(site, draft["ownership"], sender, "fifth-request-identity")

    def test_foreign_owner_cannot_read_sink_or_suppress_or_queue(self):
        member, sender, draft, name = self.campaign()
        message = frappe.db.get_value("Local Email Message", {"public_site": self.sites["A"].name}, "name")
        self.owner("B")
        for operation in (lambda: api.workspace(self.sites["A"].name), lambda: api.get_local_message(message),
                          lambda: audience.suppress(member.name, "Foreign action"), lambda: campaigns.retry(name),
                          lambda: campaigns.queue(self.sites["B"].name, draft["ownership"], sender, "foreign-request-identity")):
            with self.assertRaises(frappe.PermissionError):
                operation()
        self.assertEqual(frappe.get_list("Newsletter Audience Member", pluck="name"), [])


def run():
    require_target()
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(NewsletterTests))
    report = {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
    if not result.wasSuccessful():
        raise RuntimeError(json.dumps(report))
    return report
