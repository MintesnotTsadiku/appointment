"""Website setup through a normal owner, with exact synthetic cleanup."""

import json
import base64
from pathlib import Path
import sys
import unittest

import frappe

from appointment.content import entitlements
from appointment.public_experience import setup
from appointment.public_experience.errors import StaleDraftError
from appointment.tests.test_content_entitlements import EntitlementIsolationTests, _cleanup, require_target


class WebsiteSetupTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        EntitlementIsolationTests.setUpClass()
        cls.fixture = EntitlementIsolationTests.state

    @classmethod
    def tearDownClass(cls):
        _cleanup(cls.fixture)

    def setUp(self):
        frappe.set_user("Administrator")
        frappe.db.savepoint("website_setup_test")
        frappe.set_user(self.fixture["owners"]["A"])
        self.uploads = []

    def tearDown(self):
        frappe.set_user("Administrator")
        for name in self.uploads:
            if frappe.db.exists("File", name):
                frappe.delete_doc("File", name, force=True, ignore_permissions=True)
        frappe.db.rollback(save_point="website_setup_test")

    def start(self):
        return setup.start("Organization", self.fixture["orgs"]["A"],
                           "Website setup test", "website-setup-" + frappe.generate_hash(length=8), "tena-clinic")

    def test_owner_can_start_resume_preview_and_publish(self):
        draft = self.start()
        resumed = self.start()
        self.assertEqual(draft["site"], resumed["site"])
        self.assertEqual(draft["draftVersion"], resumed["draftVersion"])
        before = frappe.db.count("Experience Release", {"public_site": draft["site"]})
        preview = setup.preview(draft["site"], draft["draftVersion"])
        self.assertEqual(preview["compiledDesign"]["recipeKey"], "tena-clinic")
        self.assertEqual(frappe.db.count("Experience Release", {"public_site": draft["site"]}), before)
        saved = setup.save(draft["site"], draft["draftVersion"], "readiness", features=["blog", "gallery"])
        published = setup.publish(saved["site"], saved["draftVersion"])
        self.assertEqual(published["status"], "Published")
        self.assertEqual(published["setup"]["step"], "published")

    def test_ranked_templates_have_private_preview_without_creating_records(self):
        owner = self.fixture["orgs"]["A"]
        before = frappe.db.count("Public Site", {"organization": owner})
        catalog = setup.ranked_catalog("health", "calm")
        self.assertEqual(catalog[0]["key"], "tena-clinic")
        for recipe in catalog:
            preview = setup.preview_template("Organization", owner, recipe["key"])
            self.assertEqual(preview["compiledDesign"]["recipeKey"], recipe["key"])
            self.assertTrue(recipe["thumbnail"].startswith("/assets/appointment/"))
        self.assertEqual(frappe.db.count("Public Site", {"organization": owner}), before)

    def test_readiness_compiles_unpublished_brand_and_reports_booking_fix(self):
        draft = self.start()
        result = setup.readiness(draft["site"], draft["draftVersion"])
        checks = {row["check"]: row for row in result["checks"]}
        self.assertTrue(checks["website_draft"]["ok"])
        self.assertFalse(checks["booking"]["ok"])
        self.assertIn("Business settings", checks["booking"]["remediation"])
        self.assertFalse(frappe.db.get_value("Brand Profile", draft["profile"], "active_revision"))
        self.assertEqual(frappe.db.count("Experience Release", {"public_site": draft["site"]}), 0)

    def test_foreign_owner_cannot_resume_save_preview_or_publish(self):
        draft = self.start()
        frappe.set_user(self.fixture["owners"]["B"])
        for operation in (lambda: setup.require_site(draft["site"]),
                          lambda: setup.save(draft["site"], draft["draftVersion"], "content"),
                          lambda: setup.preview(draft["site"], draft["draftVersion"]),
                          lambda: setup.publish(draft["site"], draft["draftVersion"])):
            with self.assertRaises(frappe.PermissionError):
                operation()

    def test_suspended_public_site_blocks_creation(self):
        frappe.set_user("Administrator")
        entitlements.set_capability("Organization", self.fixture["orgs"]["A"], None, "public_site", "Suspended")
        frappe.set_user(self.fixture["owners"]["A"])
        with self.assertRaises(frappe.PermissionError):
            self.start()

    def test_stale_save_and_unknown_features_are_rejected(self):
        draft = self.start()
        setup.save(draft["site"], draft["draftVersion"], "content")
        with self.assertRaises(StaleDraftError):
            setup.save(draft["site"], draft["draftVersion"], "brand")
        current = setup.require_site(draft["site"])
        with self.assertRaises(frappe.ValidationError):
            setup.save(current.name, current.draft_version, "features", features=["arbitrary_script"])

    def test_prefill_never_invents_proof_or_testimonials(self):
        draft = self.start()
        for row in draft["sections"]:
            if row["type"] in {"proof", "testimonials", "providers", "locations"}:
                self.assertEqual(row["content"]["items"], [])
        saved = setup.save(draft["site"], draft["draftVersion"], "skipped")
        self.assertEqual(saved["setup"]["step"], "skipped")
        self.assertEqual(saved["status"], "Draft")

    def test_owner_can_author_publish_and_edit_without_changing_public_release(self):
        from appointment.content import authoring, releases

        draft = self.start()
        created = authoring.create_article(draft["site"], "Getting ready", "getting-ready",
                                           "# Getting ready\nBring your questions.")
        from appointment.content.api import list_owned_content

        self.assertEqual(list_owned_content(draft["site"])["items"][0]["title"], "Getting ready")
        release = releases.publish_article(created["ownership"])
        public = json.loads(release.content_json)
        self.assertIn("Bring your questions", json.dumps(public))
        self.assertIsNone(public["category"])
        self.assertTrue(public["author"])
        post = frappe.get_doc("Blog Post", created["source"])
        frappe.db.set_value("Blogger", post.blogger, "full_name", "Changed author draft")
        index = releases.list_public_articles(draft["site"])["articles"][0]
        self.assertEqual(index["author"], public["author"])
        self.assertIsNone(index["category"])
        article = authoring.get_draft(created["ownership"])
        authoring.save_article(article["ownership"], article["modified"], "Getting ready",
                              "# Changed draft\nA private revision.")
        release.reload()
        self.assertNotIn("private revision", release.content_json)
        frappe.set_user(self.fixture["owners"]["B"])
        with self.assertRaises(frappe.PermissionError):
            authoring.get_draft(created["ownership"])

    def test_decoded_media_is_business_scoped_and_requires_consent(self):
        from appointment.content import authoring, releases

        draft = self.start()
        source = Path(frappe.get_app_path("appointment")) / "public/brand-experience/support/tena/scene-1.webp"
        content = base64.b64encode(source.read_bytes()).decode()
        with self.assertRaises(frappe.ValidationError):
            authoring.upload_image(draft["site"], content, 0)
        upload = authoring.upload_image(draft["site"], content, 1)
        self.uploads.append(upload["name"])
        item = {"media_type": "image", "image": upload["url"], "alt_text": "Clinic consultation",
                "consent_status": "Approved", "consent_evidence": "Synthetic licensed test asset"}
        created = authoring.create_gallery(draft["site"], "A visit", "a-visit", items=[item])
        release = releases.publish_gallery_collection(created["ownership"])
        self.assertIn("Clinic consultation", release.content_json)
        frappe.set_user(self.fixture["owners"]["B"])
        foreign = setup.start("Organization", self.fixture["orgs"]["B"], "Foreign website",
                              "foreign-" + frappe.generate_hash(length=8), "tena-clinic")
        with self.assertRaises(frappe.PermissionError):
            authoring.create_gallery(foreign["site"], "Foreign image", "foreign-image", items=[item])


def run():
    require_target()
    result = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(WebsiteSetupTests))
    report = {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
    if not result.wasSuccessful():
        raise RuntimeError(json.dumps(report))
    return report
