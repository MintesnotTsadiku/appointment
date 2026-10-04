"""Exact draft restoration for the five journal-owned demo websites."""
import json
import frappe
from appointment.tests.homepage_demo_fixture import HomepageDemoFixture

SITE_FIELDS = ("site_title", "website_setup_json", "draft_version", "modified", "modified_by")
BRAND_FIELDS = ("application_name", "brand_inputs_json", "draft_version", "modified", "modified_by")


class TemplateAppearanceFixture(HomepageDemoFixture):
    def prepare(self, *, request):
        result = super().prepare(request=request)
        drafts = []
        for row in result["fixture_identity"]["world"].values():
            doc = frappe.get_doc("Public Site", row["site"])
            profile = frappe.get_doc("Brand Profile", doc.brand_profile)
            drafts.append({"site": doc.name, "profile": profile.name,
                           "site_fields": {key: doc.get(key) for key in SITE_FIELDS},
                           "brand_fields": {key: profile.get(key) for key in BRAND_FIELDS},
                           "sections": [section.as_dict() for section in doc.sections]})
        result["fixture_identity"]["drafts"] = json.loads(json.dumps(drafts, default=str))
        return result

    def provide_execution_context(self, *, fixture_identity, request):
        result = super().provide_execution_context(fixture_identity=fixture_identity, request=request)
        result["environment"]["TEMPLATE_APPEARANCE_WORLD"] = json.dumps(fixture_identity["world"])
        return result

    def cleanup(self, *, fixture_identity, request):
        for draft in fixture_identity["drafts"]:
            frappe.db.set_value("Public Site", draft["site"], draft["site_fields"], update_modified=False)
            frappe.db.set_value("Brand Profile", draft["profile"], draft["brand_fields"], update_modified=False)
            frappe.db.delete("Public Site Section", {"parent": draft["site"]})
            for section in draft["sections"]:
                frappe.get_doc(section).db_insert()
        frappe.db.commit()
        super().cleanup(fixture_identity=fixture_identity, request=request)
        return {"ok": True, "message": "Exact demo website and brand draft fields and sections restored."}

    def audit(self, *, fixture_identity, request):
        result = super().audit(fixture_identity=fixture_identity, request=request)
        for draft in fixture_identity["drafts"]:
            for doctype, name, fields in [("Public Site", draft["site"], draft["site_fields"]),
                                           ("Brand Profile", draft["profile"], draft["brand_fields"])]:
                doc = frappe.get_doc(doctype, name)
                if any(str(doc.get(key)) != str(value) for key, value in fields.items()):
                    result["ok"] = False
        return result


adapter = TemplateAppearanceFixture()


def review_status(name):
    from appointment.tests.content_browser_bootstrap import SITE

    if frappe.local.site != SITE:
        raise RuntimeError("Review requires the isolated acceptance site")
    doc = frappe.get_doc("Browser QA Run", name)
    if doc.suite_id not in ("template-appearance", "website-setup", "content-templates"):
        raise RuntimeError("Expected a website validation run")
    return dict(run=name, status=doc.status, outcome=doc.outcome,
                source_version=doc.source_version,
                summary=json.loads(doc.scenario_summary_json or "{}"),
                cleanup=json.loads(doc.cleanup_json or "{}"),
                audit=json.loads(doc.audit_json or "{}"),
                baseline_changed_count=doc.baseline_changed_count,
                baseline_changes=[dict(name=row["name"], status=row["status"]) for row in json.loads(doc.baseline_json or "{}").get("changes", [])],
                strict_visual_pass=doc.status == "Passed" and not doc.baseline_changed_count)


def export_review(name):
    """Keep behavior evidence and explicitly report visual baseline changes."""
    import hashlib
    import shutil
    from pathlib import Path

    result = review_status(name)
    doc = frappe.get_doc("Browser QA Run", name)
    expected = 20 if doc.suite_id == "content-templates" else 1
    if (result["summary"].get("passed") != expected or result["summary"].get("failed")
            or result["summary"].get("flaky") or not result["cleanup"].get("ok")
            or not result["audit"].get("ok")):
        raise RuntimeError("All behavior checks and exact cleanup must pass")
    root = Path("/tmp/agent_browser_qa") / name
    destination = Path(frappe.get_app_path("appointment", "..")).resolve() / "qa/evidence/template-appearance/final-review" / doc.suite_id
    destination.mkdir(parents=True, exist_ok=True)
    prefixes = ("selam-", "bloom-", "meron-", "abugida-", "tena-", "website-", "certified-")
    inventory = []
    for row in json.loads(doc.artifact_files_json or "[]"):
        source = Path(row.get("path", "")).resolve()
        if row.get("kind") != "screenshot" or not source.name.startswith(prefixes):
            continue
        if doc.suite_id == "content-templates" and not source.stem.endswith(("-landing", "-book", "-scheduler")):
            continue
        if root not in source.parents or source.suffix != ".png":
            raise RuntimeError("Unexpected screenshot path")
        target = destination / source.name
        shutil.copyfile(source, target)
        inventory.append(dict(file=source.name, sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    if not inventory:
        raise RuntimeError("No authored screenshots")
    result["artifacts"] = inventory
    (destination / "validation.json").write_text(json.dumps(result, indent=2) + "\n")
    return dict(run=name, screenshots=len(inventory), destination=str(destination),
                strict_visual_pass=result["strict_visual_pass"])
