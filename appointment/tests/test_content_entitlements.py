"""Entitlement and business-ownership isolation acceptance.

Restricted to the isolated content-publishing site. Creates only synthetic
records under a unique marker and removes exactly those records during cleanup.
It never touches records it did not create.
"""

import json
import sys
import unittest

import frappe

from appointment.content import entitlements, tenancy
from appointment.content.entitlements import CAPABILITY_SET, DEFAULT_PLAN

MARKER = "CNT-"
REQUIRED_SITE_FRAGMENT = "feat-content-publishing"


def require_target():
    if not frappe.conf.get("worktree_development") or REQUIRED_SITE_FRAGMENT not in frappe.local.site:
        frappe.throw(
            "This suite is restricted to the isolated content-publishing implementation site."
        )


def _insert(state, doctype, **values):
    doc = frappe.get_doc(dict(doctype=doctype, **values)).insert(ignore_permissions=True)
    state["created"].append([doctype, doc.name])
    return doc


def _cleanup(state):
    frappe.set_user("Administrator")
    frappe.flags.ignore_permissions = True
    # Memberships reference both users and organizations; remove them first so an
    # organization delete is not blocked by a link.
    orgs = list(state.get("orgs", {}).values())
    users = state.get("users", [])
    for membership in frappe.get_all(
        "Business Membership",
        filters={"user": ["in", users or ["__none__"]]},
        pluck="name",
    ) + (
        frappe.get_all("Business Membership", filters={"organization": ["in", orgs]}, pluck="name")
        if orgs
        else []
    ):
        try:
            frappe.delete_doc("Business Membership", membership, force=True, ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"content entitlement cleanup membership: {membership}")
    # Delete in dependency order, ignoring anything already gone.
    for doctype, name in reversed(state["created"]):
        try:
            if frappe.db.exists(doctype, name):
                frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"content entitlement cleanup: {doctype} {name}")
    for membership in frappe.get_all(
        "Business Membership",
        filters={"user": ["in", state.get("users", []) or ["__none__"]]},
        pluck="name",
    ):
        try:
            frappe.delete_doc("Business Membership", membership, force=True, ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"content entitlement cleanup membership: {membership}")
    frappe.db.commit()


class EntitlementUnitTests(unittest.TestCase):
    def test_capability_registry_is_closed(self):
        self.assertIn("blog", CAPABILITY_SET)
        self.assertIn("gallery", CAPABILITY_SET)
        self.assertIn("newsletter", CAPABILITY_SET)
        self.assertIn("public_site", CAPABILITY_SET)
        # Advanced capabilities are not granted by default.
        self.assertNotIn(DEFAULT_PLAN["custom_domain"]["state"], entitlements.ACTIVE_STATES)
        self.assertNotIn(DEFAULT_PLAN["managed_video"]["state"], entitlements.ACTIVE_STATES)
        self.assertNotIn(DEFAULT_PLAN["advanced_brand_service"]["state"], entitlements.ACTIVE_STATES)

    def test_base_capabilities_default_to_trial(self):
        for capability in ("public_site", "blog", "gallery", "newsletter"):
            self.assertIn(DEFAULT_PLAN[capability]["state"], entitlements.ACTIVE_STATES)

    def test_unknown_capability_is_rejected(self):
        with self.assertRaises(frappe.ValidationError):
            entitlements.normalize_capability("not_a_capability")
        self.assertIsNone(entitlements.resolve_entitlement("Organization", "does-not-exist", None, "nope"))

    def test_active_owner_key_rejects_ambiguous_ownership(self):
        self.assertIsNone(tenancy.active_owner_key("Organization", None, None))
        self.assertIsNone(tenancy.active_owner_key("Organization", "X", "Y"))
        self.assertEqual(tenancy.active_owner_key("Organization", "X", None), "organization:X")
        self.assertEqual(tenancy.active_owner_key("Provider", None, "P"), "provider:P")


class EntitlementIsolationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        require_target()
        frappe.set_user("Administrator")
        cls.state = {"created": [], "users": [], "orgs": {}, "owners": {}}
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

        # Explicit entitlement: grant blog to business A only; B relies on defaults.
        entitlements.set_capability("Organization", cls.state["orgs"]["A"], None, "blog", "Active")
        cls.state["entitlement_a"] = frappe.db.get_value(
            "Business Entitlement",
            {"active_owner_key": f"organization:{cls.state['orgs']['A']}", "capability": "blog"},
            "name",
        )
        cls.state["created"].append(["Business Entitlement", cls.state["entitlement_a"]])

        # One owned Blog Post per business.
        cls.state["posts"] = {}
        cls.state["ownership"] = {}
        for suffix in ("A", "B"):
            category = _insert(cls.state, "Blog Category", title=f"{marker} Category {suffix}")
            blogger = _insert(
                cls.state,
                "Blogger",
                short_name=f"{marker}-{suffix}",
                full_name=f"{marker} Blogger {suffix}",
                user=cls.state["owners"][suffix],
            )
            post = _insert(
                cls.state,
                "Blog Post",
                title=f"{marker} Post {suffix}",
                blog_category=category.name,
                blogger=blogger.name,
                content_type="Markdown",
                content=f"# {marker} {suffix}",
                published=0,
            )
            cls.state["posts"][suffix] = post.name
            ownership = _insert(
                cls.state,
                "Content Ownership",
                source_doctype="Blog Post",
                source_name=post.name,
                owner_type="Organization",
                organization=cls.state["orgs"][suffix],
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

    def test_default_capability_resolves_active(self):
        resolved = entitlements.resolve_entitlement(
            "Organization", self.state["orgs"]["B"], None, "gallery"
        )
        self.assertTrue(resolved["active"])
        self.assertEqual(resolved["source"], "Default")

    def test_explicit_entitlement_overrides_default_and_is_auditable(self):
        resolved = entitlements.resolve_entitlement(
            "Organization", self.state["orgs"]["A"], None, "blog"
        )
        self.assertTrue(resolved["active"])
        self.assertEqual(resolved["source"], "Administrator")
        self.assertEqual(resolved["limits"], {})

    def test_suspended_capability_fails_closed(self):
        entitlements.set_capability(
            "Organization", self.state["orgs"]["A"], None, "custom_domain", "Suspended"
        )
        row = frappe.db.get_value(
            "Business Entitlement",
            {"active_owner_key": f"organization:{self.state['orgs']['A']}", "capability": "custom_domain"},
            "name",
        )
        self.state["created"].append(["Business Entitlement", row])
        self.assertFalse(
            entitlements.is_capable("Organization", self.state["orgs"]["A"], None, "custom_domain")
        )
        with self.assertRaises(frappe.PermissionError):
            entitlements.require_capability(
                "Organization", self.state["orgs"]["A"], None, "custom_domain"
            )

    def test_limit_enforcement_uses_business_limits(self):
        entitlements.set_capability(
            "Organization",
            self.state["orgs"]["A"],
            None,
            "blog",
            "Active",
            limits={"articles": 2},
        )
        # 2 articles allowed; the third is refused.
        entitlements.enforce_limit(
            "Organization", self.state["orgs"]["A"], None, "blog", "articles", 2
        )
        with self.assertRaises(frappe.ValidationError):
            entitlements.enforce_limit(
                "Organization", self.state["orgs"]["A"], None, "blog", "articles", 3
            )

    def test_owner_sees_only_own_ownership_rows(self):
        self._as("A")
        rows = frappe.get_list("Content Ownership", fields=["name"], limit_page_length=0)
        names = {row.name for row in rows}
        self.assertIn(self.state["ownership"]["A"], names)
        self.assertNotIn(self.state["ownership"]["B"], names)

    def test_direct_read_of_foreign_ownership_is_denied(self):
        self._as("B")
        self.assertFalse(
            frappe.has_permission(
                "Content Ownership", doc=self.state["ownership"]["A"], user=self.state["owners"]["B"]
            )
        )
        with self.assertRaises(frappe.PermissionError):
            frappe.get_doc("Content Ownership", self.state["ownership"]["A"]).check_permission("read")

    def test_owner_sees_only_own_blog_posts(self):
        self._as("A")
        titles = {
            row.title
            for row in frappe.get_list("Blog Post", fields=["title"], limit_page_length=0)
        }
        self.assertIn(f"{self.state['marker']} Post A", titles)
        self.assertNotIn(f"{self.state['marker']} Post B", titles)

    def test_guest_cannot_read_upstream_authoring_records(self):
        frappe.set_user("Guest")
        self.assertFalse(
            frappe.has_permission("Blog Post", doc=self.state["posts"]["A"], user="Guest")
        )
        with self.assertRaises(frappe.PermissionError):
            frappe.get_list("Blog Post", fields=["name"], limit_page_length=0)

    def test_missing_ownership_fails_closed(self):
        # Business B's post has ownership; a post with no ownership maps to no business.
        self.assertFalse(
            entitlements.is_capable("Organization", "nonexistent-org", None, "blog")
        )
        with self.assertRaises(frappe.PermissionError):
            tenancy.require_business_owner("Organization", None, None)


def diagnose():
    """Report the runtime identity and whether the Content module was synced."""

    import appointment
    from frappe.modules.utils import get_module_list

    return {
        "appointment_path": appointment.__file__,
        "site": frappe.local.site,
        "modules": get_module_list("appointment"),
        "module_def_content": bool(frappe.db.exists("Module Def", "Content")),
        "doctype_business_entitlement": bool(frappe.db.exists("DocType", "Business Entitlement")),
        "doctype_content_ownership": bool(frappe.db.exists("DocType", "Content Ownership")),
    }


def reset_module_cache():
    """Drop the cached app/installed-app module map after a modules.txt change."""

    frappe.cache.delete_value(["app_modules", "installed_app_modules"])
    frappe.clear_cache()
    return {"cleared": True}


def leftover_counts():
    """Count any records left behind by the synthetic content suites."""

    markers = ("CNT-", "REL-", "GAL-")
    checks = {}
    for doctype, field in (
        ("Business Entitlement", "active_owner_key"),
        ("Content Ownership", "ownership_key"),
        ("Gallery Collection", "title"),
        ("Blog Post", "title"),
        ("Public Site", "site_title"),
        ("Organization", "organization_name"),
        ("User", "email"),
    ):
        total = 0
        for marker in markers:
            total += frappe.db.count(doctype, {field: ["like", f"%{marker}%"]})
        checks[doctype] = total
    return checks


def purge_markers():
    """Remove any synthetic content-suite records left behind by earlier runs."""

    frappe.set_user("Administrator")
    frappe.flags.ignore_permissions = True
    markers = ("CNT-", "REL-", "GAL-")
    users: list[str] = []
    orgs: list[str] = []
    for marker in markers:
        users += frappe.get_all("User", filters={"email": ["like", f"%{marker}%"]}, pluck="name")
        orgs += frappe.get_all(
            "Organization", filters={"organization_name": ["like", f"%{marker}%"]}, pluck="name"
        )
    memberships = frappe.get_all(
        "Business Membership", filters={"user": ["in", users or ["__none__"]]}, pluck="name"
    )
    if orgs:
        memberships += frappe.get_all(
            "Business Membership", filters={"organization": ["in", orgs]}, pluck="name"
        )
    for membership in memberships:
        frappe.delete_doc("Business Membership", membership, force=True, ignore_permissions=True)
    for org in orgs:
        try:
            frappe.delete_doc("Organization", org, force=True, ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"purge organization {org}")
    for user in users:
        try:
            frappe.delete_doc("User", user, force=True, ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"purge user {user}")
    frappe.db.commit()
    return leftover_counts()


def run():
    require_target()
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    summary = {
        "tests": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
    }
    print(json.dumps(summary))
    if not result.wasSuccessful():
        raise AssertionError("Content entitlement/isolation acceptance failed.")
    return summary
