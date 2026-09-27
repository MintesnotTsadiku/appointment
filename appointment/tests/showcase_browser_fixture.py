"""Read-only managed browser context for the journal-owned content showcases."""

import hashlib
import json

import frappe

from appointment.demo import showcase
from appointment.demo.content_world import load_content
from appointment.tests.content_browser_bootstrap import SITE


class ShowcaseBrowserFixture:
    def prepare(self, *, request):
        if frappe.local.site != SITE or not frappe.conf.get("worktree_development"):
            raise RuntimeError("Showcase acceptance requires the isolated implementation site")
        content, _ = load_content()
        state = showcase.load_state()
        if state.get("phase") != "ready" or not state.get("published_content"):
            raise RuntimeError("Run the explicit showcase content seeder before this visual suite")
        world = {}
        for key, business in state["businesses"].items():
            site = business["public_site"]
            world[key] = {"root": business["public_experience_path"], "scheduler": business["public_path"],
                          "name": business["name"], "recipe": showcase.DEMO_BRAND_RECIPES[key]["recipe"],
                          "article": content["sites"][key]["articles"][0][1], "site": site,
                          "release": frappe.db.get_value("Public Site", site, "current_release")}
        return {"ok": True, "fixture_identity": {"site": SITE, "world": world, "before": self._fingerprint(world)}}

    def provide_execution_context(self, *, fixture_identity, request):
        from pathlib import Path

        environment = {"SHOWCASE_QA_WORLD": json.dumps(fixture_identity["world"])}
        if request.get("suite") == "content-accessibility":
            engine = Path("/tmp/content-qa-dependencies/package/axe.min.js")
            if hashlib.sha256(engine.read_bytes()).hexdigest() != "e9e5863c33a874f09bc01acd9234b7e3c871479f5eef8802fa582544465e6d01":
                raise RuntimeError("Install the pinned, checksummed accessibility test engine.")
            environment["CONTENT_QA_AXE_PATH"] = str(engine)
        return {"environment": environment}

    def cleanup(self, *, fixture_identity, request):
        return {"ok": True, "message": "Read-only visual suite; no business or content records were created."}

    def audit(self, *, fixture_identity, request):
        if fixture_identity.get("site") != SITE:
            raise RuntimeError("Invalid showcase fixture identity")
        unchanged = fixture_identity["before"] == self._fingerprint(fixture_identity["world"])
        return {"ok": unchanged, "read_only": True, "publication_inventory_unchanged": unchanged,
                "remaining_record_count": 0}

    def _fingerprint(self, world):
        records = []
        for row in world.values():
            records.append([row["site"], frappe.db.get_value("Public Site", row["site"], "current_release")])
            records.extend(frappe.get_all("Published Content Release", filters={"public_site": row["site"]},
                                           fields=["name", "content_hash", "status"], order_by="name"))
        return hashlib.sha256(json.dumps(records, sort_keys=True, default=str).encode()).hexdigest()


adapter = ShowcaseBrowserFixture()
