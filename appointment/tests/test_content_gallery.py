"""Gallery media-safety and publication acceptance.

Restricted to the isolated content-publishing site. Creates synthetic records
under a unique marker and removes exactly those records during cleanup.
"""

import io
import json
import sys
import unittest

import frappe

from appointment.content import entitlements, gallery, releases
from appointment.content.gallery import MediaSafetyError

MARKER = "GAL-"
REQUIRED_SITE_FRAGMENT = "feat-content-publishing"


def require_target():
    if not frappe.conf.get("worktree_development") or REQUIRED_SITE_FRAGMENT not in frappe.local.site:
        frappe.throw("This suite is restricted to the isolated content-publishing implementation site.")


def _insert(state, doctype, **values):
    doc = frappe.get_doc(dict(doctype=doctype, **values)).insert(ignore_permissions=True)
    state["created"].append([doctype, doc.name])
    return doc


def _png_bytes(color=(200, 60, 60)) -> bytes:
    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (48, 48), color).save(buffer, format="PNG")
    return buffer.getvalue()


def _cleanup(state):
    frappe.set_user("Administrator")
    frappe.flags.ignore_permissions = True
    sites = list(state.get("sites", {}).values())
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
            frappe.log_error(frappe.get_traceback(), f"gallery cleanup membership: {membership}")
    for doctype, name in reversed(state["created"]):
        try:
            if frappe.db.exists(doctype, name):
                frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"gallery cleanup: {doctype} {name}")
    for membership in frappe.get_all(
        "Business Membership",
        filters={"user": ["in", state.get("users", []) or ["__none__"]]},
        pluck="name",
    ):
        try:
            frappe.delete_doc("Business Membership", membership, force=True, ignore_permissions=True)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"gallery cleanup membership: {membership}")
    frappe.db.commit()


class VideoAllowlistTests(unittest.TestCase):
    def test_youtube_urls_and_ids_are_normalized(self):
        self.assertEqual(gallery.normalize_video("youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ")
        self.assertEqual(gallery.normalize_video("youtube", "https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ")
        self.assertEqual(gallery.normalize_video("youtube", "dQw4w9WgXcQ"), "dQw4w9WgXcQ")

    def test_video_allowlist_rejects_unknown_provider_host_and_junk(self):
        with self.assertRaises(MediaSafetyError):
            gallery.normalize_video("youtube", "https://evil.example/watch?v=dQw4w9WgXcQ")
        with self.assertRaises(MediaSafetyError):
            gallery.normalize_video("dailymotion", "abc123")
        with self.assertRaises(MediaSafetyError):
            gallery.normalize_video("youtube", "not a valid id")

    def test_remote_and_private_media_paths_are_rejected(self):
        self.assertIsNone(gallery.safe_local_media("https://evil.example/x.png"))
        self.assertIsNone(gallery.safe_local_media("/private/files/x.png"))
        self.assertEqual(gallery.safe_local_media("/files/x.png"), "/files/x.png")


class GalleryAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        require_target()
        frappe.set_user("Administrator")
        cls.state = {"created": [], "users": [], "orgs": {}, "owners": {}, "sites": {}}
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
        cls.state["image_url"] = _insert(
            cls.state,
            "File",
            file_name=f"{marker}-image.png",
            is_private=0,
            content=_png_bytes(),
        ).file_url
        frappe.db.commit()

    @classmethod
    def tearDownClass(cls):
        _cleanup(cls.state)

    def _collection(self, suffix="A", status="Draft", video_id="dQw4w9WgXcQ", consent="Not Required"):
        seq = self.state.get("seq", 0) + 1
        self.state["seq"] = seq
        return _insert(
            self.state,
            "Gallery Collection",
            title=f"{self.state['marker']} Gallery {suffix} {seq}",
            slug=f"{self.state['marker'].lower()}-gallery-{suffix}-{seq}",
            owner_type="Organization",
            organization=self.state["orgs"][suffix],
            public_site=self.state["sites"][suffix],
            status=status,
            ordering_mode="manual",
            items=[
                {
                    "media_type": "image",
                    "image": self.state["image_url"],
                    "alt_text": "A red square",
                    "sort_order": 1,
                    "consent_status": consent,
                },
                {
                    "media_type": "video",
                    "video_provider": "youtube",
                    "video_id": video_id,
                    "alt_text": "A reference video",
                    "sort_order": 2,
                    "consent_status": "Not Required",
                },
            ],
        )

    def _ownership(self, collection):
        return _insert(
            self.state,
            "Content Ownership",
            source_doctype="Gallery Collection",
            source_name=collection.name,
            owner_type="Organization",
            organization=collection.organization,
            public_site=collection.public_site,
            capability="gallery",
            status="Draft",
        )

    def test_collection_records_derived_media_metadata(self):
        collection = self._collection()
        image_row = collection.items[0]
        self.assertTrue(image_row.checksum)
        self.assertEqual(image_row.width, 48)
        self.assertEqual(collection.items[1].video_id, "dQw4w9WgXcQ")

    def test_spoofed_image_is_rejected_by_content(self):
        spoof = _insert(self.state, "File", file_name="spoof.png", is_private=0, content=b"not an image")
        with self.assertRaises(frappe.ValidationError):
            _insert(
                self.state,
                "Gallery Collection",
                title=f"{self.state['marker']} Spoof",
                slug=f"{self.state['marker'].lower()}-spoof",
                owner_type="Organization",
                organization=self.state["orgs"]["A"],
                public_site=self.state["sites"]["A"],
                items=[{"media_type": "image", "image": spoof.file_url, "alt_text": "x", "sort_order": 1}],
            )

    def test_invalid_video_identifier_is_refused(self):
        with self.assertRaises(MediaSafetyError):
            self._collection(video_id="bad id!")

    def test_pending_consent_blocks_publication(self):
        with self.assertRaises(MediaSafetyError):
            self._collection(status="Published", consent="Pending")

    def test_publish_and_public_read(self):
        collection = self._collection()
        ownership = self._ownership(collection)
        frappe.set_user(self.state["owners"]["A"])
        release = releases.publish_gallery_collection(ownership.name)
        self.assertEqual(release.status, "Active")
        self.assertTrue(release.route.startswith("/gallery/"))
        detail = releases.get_public_gallery(self.state["sites"]["A"], release.route)
        self.assertIsNotNone(detail)
        self.assertEqual(len(detail["projection"]["items"]), 2)
        self.assertEqual(detail["projection"]["items"][1]["videoProvider"], "youtube")
        index = releases.list_public_galleries(self.state["sites"]["A"])
        self.assertTrue(any(item["route"] == release.route for item in index["galleries"]))
        # A different business sees nothing.
        self.assertEqual(releases.list_public_galleries(self.state["sites"]["B"])["galleries"], [])

    def test_entitlement_gate_denies_create(self):
        entitlements.set_capability("Organization", self.state["orgs"]["B"], None, "gallery", "Suspended")
        self.state["created"].append(
            [
                "Business Entitlement",
                frappe.db.get_value(
                    "Business Entitlement",
                    {"active_owner_key": f"organization:{self.state['orgs']['B']}", "capability": "gallery"},
                    "name",
                ),
            ]
        )
        frappe.set_user(self.state["owners"]["B"])
        with self.assertRaises(frappe.PermissionError):
            _insert(
                self.state,
                "Gallery Collection",
                title=f"{self.state['marker']} Denied",
                slug=f"{self.state['marker'].lower()}-denied",
                owner_type="Organization",
                organization=self.state["orgs"]["B"],
                public_site=self.state["sites"]["B"],
                items=[{"media_type": "image", "image": self.state["image_url"], "alt_text": "x", "sort_order": 1}],
            )
        frappe.set_user("Administrator")


def run():
    require_target()
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    summary = {"tests": result.testsRun, "failures": len(result.failures), "errors": len(result.errors)}
    print(json.dumps(summary))
    if not result.wasSuccessful():
        raise AssertionError("Gallery acceptance failed.")
    return summary
