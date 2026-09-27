"""Public-route and consent checks on the restored drill target only."""

import json

import frappe

from appointment.tests.content_fresh_site import RESTORE_SITE, RUNTIME
from appointment.tests import content_recovery


class RecoveryBrowserFixture:
    def prepare(self, *, request):
        content_recovery._require(RESTORE_SITE)
        expected = json.loads((RUNTIME / "content-recovery-before.json").read_text())
        actual = content_recovery.inventory()
        for key in ("releases", "media"):
            if content_recovery._digest(expected[key]) != content_recovery._digest(actual[key]):
                raise RuntimeError("Restored public releases or media differ from the backup")
        names = {row.email: row.status for row in frappe.get_all("Newsletter Audience Member", fields=["email", "status"])}
        if names.get(content_recovery.EMAILS[0]) not in {"Confirmed", "Unsubscribed"} or names.get(content_recovery.EMAILS[1]) != "Suppressed" or len(names) != 2:
            raise RuntimeError("The restored consent fixtures are incomplete")
        return {"ok": True, "fixture_identity": {"site": RESTORE_SITE, "release_digest": content_recovery._digest(actual["releases"]),
                "media_digest": content_recovery._digest(actual["media"]), "audience_before": sorted(names.values())}}

    def provide_execution_context(self, *, fixture_identity, request):
        world = []
        for site in frappe.get_all("Public Site", filters={"status": "Published"}, fields=["name", "slug", "recipe_key"]):
            article = frappe.db.get_value("Published Content Release", {"public_site": site.name, "status": "Active", "content_type": "article"}, "route")
            gallery = frappe.db.get_value("Published Content Release", {"public_site": site.name, "status": "Active", "content_type": "gallery_collection"}, "route")
            if not article or not gallery:
                raise RuntimeError("The recovered website lacks published content")
            world.append({"root": "/" + site.slug, "recipe": site.recipe_key, "article": article, "gallery": gallery})
        if len(world) != 5:
            raise RuntimeError("Recovery requires all five backed-up websites")
        member = frappe.get_doc("Newsletter Audience Member", {"email": content_recovery.EMAILS[0]})
        return {"environment": {"RECOVERY_QA_WORLD": json.dumps(world),
                "RECOVERY_QA_UNSUBSCRIBE_PATH": "/newsletter/unsubscribe/" + member.get_password("unsubscribe_token")}}

    def cleanup(self, *, fixture_identity, request):
        return {"ok": True, "restored_businesses_preserved": True,
                "consent_change": "The restored synthetic confirmed address retains its guest-requested unsubscribe audit."}

    def audit(self, *, fixture_identity, request):
        actual = content_recovery.inventory()
        public_unchanged = (fixture_identity["release_digest"] == content_recovery._digest(actual["releases"])
                            and fixture_identity["media_digest"] == content_recovery._digest(actual["media"]))
        status = {row.email: row.status for row in frappe.get_all("Newsletter Audience Member", fields=["email", "status"])}
        consent = status == {content_recovery.EMAILS[0]: "Unsubscribed", content_recovery.EMAILS[1]: "Suppressed"}
        return {"ok": public_unchanged and consent, "publication_and_media_unchanged": public_unchanged,
                "guest_unsubscribe_worked_after_restore": consent, "remaining_record_count": 0,
                "restored_release_count": len(actual["releases"]), "restored_media_count": len(actual["media"])}


adapter = RecoveryBrowserFixture()
