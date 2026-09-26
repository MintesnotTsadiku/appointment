"""Sanitizer and immutable content-release acceptance.

Restricted to the isolated content-publishing site. Creates synthetic records
under a unique marker and removes exactly those records during cleanup.
"""

import json
import sys
import unittest

import frappe

from appointment.content import entitlements, releases
from appointment.content.sanitize import (
    html_to_blocks,
    markdown_to_html,
    safe_url,
    sanitize_html,
)

MARKER = "REL-"
REQUIRED_SITE_FRAGMENT = "feat-content-publishing"


def require_target():
    if not frappe.conf.get("worktree_development") or REQUIRED_SITE_FRAGMENT not in frappe.local.site:
        frappe.throw("This suite is restricted to the isolated content-publishing implementation site.")


def _insert(state, doctype, **values):
    doc = frappe.get_doc(dict(doctype=doctype, **values)).insert(ignore_permissions=True)
    state["created"].append([doctype, doc.name])
    return doc


def _cleanup(state):
    frappe.set_user("Administrator")
    frappe.flags.ignore_permissions = True
    # Content releases are immutable by design; test cleanup removes only the
    # sites this suite created via a direct, scoped delete.
    sites = [value for key, value in state.get("sites", {}).items()]
    if sites:
        frappe.db.delete("Published Content Release", {"public_site": ["in", sites]})
    for membership in frappe.get_all(
        "Business Membership",
        filters={"user": ["in", state.get("users", []) or ["__none__"]]},
        pluck="name",
    ):
        try:
            frappe.delete_doc("Business Membership", membership, force=True, ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"content release cleanup membership: {membership}")
    for doctype, name in reversed(state["created"]):
        try:
            if frappe.db.exists(doctype, name):
                frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"content release cleanup: {doctype} {name}")
    for membership in frappe.get_all(
        "Business Membership",
        filters={"user": ["in", state.get("users", []) or ["__none__"]]},
        pluck="name",
    ):
        try:
            frappe.delete_doc("Business Membership", membership, force=True, ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"content release cleanup membership: {membership}")
    frappe.db.commit()


class SanitizerUnitTests(unittest.TestCase):
    def test_unsafe_urls_are_rejected(self):
        for bad in ("javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html;base64,AA", "//evil.example/x", "file:///etc/passwd"):
            self.assertIsNone(safe_url(bad), bad)
        self.assertEqual(safe_url("https://example.test/a"), "https://example.test/a")
        self.assertEqual(safe_url("/files/a.png"), "/files/a.png")
        self.assertEqual(safe_url("mailto:a@b.test"), "mailto:a@b.test")

    def test_html_sanitizer_drops_scripts_styles_and_events(self):
        dirty = '<p onclick="x()">Hi <script>alert(1)</script><a href="javascript:bad()">go</a><img src="/files/a.png" onerror="x()"></p>'
        clean = sanitize_html(dirty)
        self.assertNotIn("script", clean.lower())
        self.assertNotIn("onclick", clean.lower())
        self.assertNotIn("onerror", clean.lower())
        self.assertNotIn("javascript:", clean.lower())
        self.assertIn("Hi", clean)
        self.assertIn('src="/files/a.png"', clean)

    def test_blocks_are_closed_and_structured(self):
        blocks = html_to_blocks("<h2>Title</h2><p>Body</p><ul><li>One</li><li>Two</li></ul><pre>code</pre>")
        self.assertEqual(blocks[0]["type"], "heading")
        self.assertEqual(blocks[0]["level"], 2)
        self.assertEqual(blocks[1]["type"], "paragraph")
        self.assertEqual(blocks[2]["type"], "list")
        self.assertEqual(blocks[2]["items"], ["One", "Two"])
        self.assertEqual(blocks[3]["type"], "code")

    def test_markdown_escapes_raw_html_and_unsafe_links(self):
        html = markdown_to_html("Hello <script>alert(1)</script> [x](javascript:bad()) **bold**")
        self.assertNotIn("<script", html.lower())
        self.assertIn("&lt;script&gt;", html)
        self.assertNotIn("javascript:", html.lower())
        self.assertIn("<strong>bold</strong>", html)

    def test_markdown_tables_and_unknown_tags_do_not_leak(self):
        html = markdown_to_html("<iframe src='https://evil'></iframe> plain")
        self.assertNotIn("<iframe", html.lower())


class ContentReleaseAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        require_target()
        frappe.set_user("Administrator")
        cls.state = {"created": [], "users": [], "orgs": {}, "owners": {}, "sites": {}, "posts": {}, "ownership": {}}
        marker = MARKER + frappe.generate_hash(length=8)
        cls.state["marker"] = marker

        for suffix in ("A", "B"):
            owner = _insert(
                cls.state,
                "User",
                email=f"{marker.lower()}-owner-{suffix.lower()}@example.test",
                first_name=f"{marker} owner {suffix}",
                send_welcome_email=0,
                enabled=1,
                user_type="System User",
                roles=[{"role": "Provider"}, {"role": "Organization Manager"}],
            )
            cls.state["users"].append(owner.name)
            org = _insert(
                cls.state,
                "Organization",
                organization_name=f"{marker} Business {suffix}",
                slug=f"{marker.lower()}-{suffix.lower()}",
                organization_type="Other",
                owner_user=owner.name,
                enable_public_booking=1,
                is_active=1,
                timezone="Africa/Addis_Ababa",
            )
            cls.state["orgs"][suffix] = org.name
            cls.state["owners"][suffix] = owner.name
            site = _insert(
                cls.state,
                "Public Site",
                site_title=f"{marker} Site {suffix}",
                owner_type="Organization",
                organization=org.name,
                slug=f"{marker.lower()}-site-{suffix.lower()}",
                recipe_key="tena-clinic",
                recipe_version=1,
                default_locale="en",
                status="Draft",
            )
            cls.state["sites"][suffix] = site.name
            category = _insert(cls.state, "Blog Category", title=f"{marker} Category {suffix}")
            blogger = _insert(
                cls.state,
                "Blogger",
                short_name=f"{marker}-{suffix}",
                full_name=f"{marker} Blogger {suffix}",
                user=owner.name,
            )
            post = _insert(
                cls.state,
                "Blog Post",
                title=f"{marker} Article {suffix}",
                route=f"content-draft/{marker.lower()}-article-{suffix.lower()}",
                blog_category=category.name,
                blogger=blogger.name,
                content_type="Markdown",
                content="# Hello\n\nA **bold** start.\n\n- one\n- two\n\n[bad](javascript:alert(1)) [ok](https://example.test)",
                published=0,
            )
            cls.state["posts"][suffix] = post.name
            for source_doctype, source_name in (("Blog Category", category.name), ("Blogger", blogger.name)):
                _insert(cls.state, "Content Ownership", source_doctype=source_doctype, source_name=source_name,
                        owner_type="Organization", organization=org.name, public_site=site.name, capability="blog")
            ownership = _insert(
                cls.state,
                "Content Ownership",
                source_doctype="Blog Post",
                source_name=post.name,
                owner_type="Organization",
                organization=org.name,
                public_site=site.name,
                capability="blog",
                status="Draft",
            )
            cls.state["ownership"][suffix] = ownership.name
        frappe.db.commit()

    @classmethod
    def tearDownClass(cls):
        _cleanup(cls.state)

    def _as(self, suffix):
        frappe.set_user(self.state["owners"][suffix])

    def test_publish_creates_active_release_and_marks_ownership(self):
        self._as("A")
        release = releases.publish_article(self.state["ownership"]["A"])
        self.assertEqual(release.status, "Active")
        self.assertTrue(release.content_hash)
        post_route = frappe.db.get_value("Blog Post", self.state["posts"]["A"], "route")
        expected_slug = releases.normalize_slug((post_route or "").rsplit("/", 1)[-1])
        self.assertEqual(release.route, f"/blog/{expected_slug}")
        own = frappe.db.get_value("Content Ownership", self.state["ownership"]["A"], "status")
        self.assertEqual(own, "Published")

    def test_foreign_category_or_author_cannot_be_published(self):
        self._as("A")
        post = frappe.get_doc("Blog Post", self.state["posts"]["A"])
        other = frappe.get_doc("Blog Post", self.state["posts"]["B"])
        for field in ("blog_category", "blogger"):
            original = post.get(field)
            post.set(field, other.get(field))
            try:
                with self.assertRaises(frappe.PermissionError):
                    releases.build_article_projection(post, public_site=self.state["sites"]["A"])
            finally:
                post.set(field, original)

    def test_release_projection_is_sanitized(self):
        self._as("A")
        release = releases.publish_article(self.state["ownership"]["A"])
        stored = json.loads(frappe.db.get_value("Published Content Release", release.name, "content_json"))
        serialized = json.dumps(stored).lower()
        self.assertNotIn("javascript:", serialized)
        self.assertNotIn("<script", serialized)
        self.assertTrue(any(block["type"] == "heading" for block in stored["blocks"]))

    def test_republish_supersedes_and_hash_is_stable(self):
        self._as("A")
        first = releases.publish_article(self.state["ownership"]["A"])
        second = releases.publish_article(self.state["ownership"]["A"])
        first_row = frappe.db.get_value(
            "Published Content Release", first.name, ["status", "superseded_by"], as_dict=True
        )
        self.assertEqual(first_row.status, "Superseded")
        self.assertEqual(first_row.superseded_by, second.name)
        self.assertEqual(first.content_hash, second.content_hash)

    def test_route_takeover_by_another_article_is_refused(self):
        self._as("A")
        first = releases.publish_article(self.state["ownership"]["A"])
        category = frappe.db.get_value("Blog Post", self.state["posts"]["A"], "blog_category")
        blogger = frappe.db.get_value("Blog Post", self.state["posts"]["A"], "blogger")
        conflict = _insert(
            self.state,
            "Blog Post",
            title=f"{self.state['marker']} Conflict Article",
            route=f"blog/conflict/{first.route.rsplit('/', 1)[-1]}",
            blog_category=category,
            blogger=blogger,
            content_type="Markdown",
            content="# duplicate",
            published=0,
        )
        own = _insert(
            self.state,
            "Content Ownership",
            source_doctype="Blog Post",
            source_name=conflict.name,
            owner_type="Organization",
            organization=self.state["orgs"]["A"],
            public_site=self.state["sites"]["A"],
            capability="blog",
            status="Draft",
        )
        self._as("A")
        with self.assertRaises(releases.RouteConflictError):
            releases.publish_article(own.name)

    def test_withdraw_and_rollback(self):
        self._as("A")
        first = releases.publish_article(self.state["ownership"]["A"])
        releases.withdraw_release(first.name, "incorrect")
        self.assertIsNone(releases.get_public_article(self.state["sites"]["A"], first.route))
        reinstated = releases.rollback_release(first.name)
        self.assertEqual(reinstated.status, "Active")
        self.assertIsNotNone(releases.get_public_article(self.state["sites"]["A"], first.route))

    def test_public_read_only_returns_active_release(self):
        self._as("A")
        release = releases.publish_article(self.state["ownership"]["A"])
        detail = releases.get_public_article(self.state["sites"]["A"], release.route)
        self.assertIsNotNone(detail)
        self.assertEqual(detail["releaseHash"], release.content_hash)
        index = releases.list_public_articles(self.state["sites"]["A"])
        self.assertTrue(any(item["route"] == release.route for item in index["articles"]))
        # Business B has no release yet: nothing is public for it.
        self.assertEqual(releases.list_public_articles(self.state["sites"]["B"])["articles"], [])

    def test_entitlement_gate_denies_publish(self):
        entitlements.set_capability(
            "Organization", self.state["orgs"]["B"], None, "blog", "Suspended"
        )
        self.state["entitlement_b"] = frappe.db.get_value(
            "Business Entitlement",
            {"active_owner_key": f"organization:{self.state['orgs']['B']}", "capability": "blog"},
            "name",
        )
        self.state["created"].append(["Business Entitlement", self.state["entitlement_b"]])
        self._as("B")
        with self.assertRaises(frappe.PermissionError):
            releases.publish_article(self.state["ownership"]["B"])

    def test_preview_is_session_bound(self):
        self._as("A")
        preview = releases.preview_article(self.state["ownership"]["A"])
        self.assertTrue(preview["token"])
        self._as("A")
        served = releases.consume_article_preview(preview["token"])
        self.assertIsNotNone(served)
        self._as("B")
        self.assertIsNone(releases.consume_article_preview(preview["token"]))


def run():
    require_target()
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    summary = {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
    print(json.dumps(summary))
    if not result.wasSuccessful():
        raise AssertionError("Content release acceptance failed.")
    return summary
