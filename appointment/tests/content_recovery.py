"""Explicit isolated recovery fixtures and read-only restored-data verification."""

import hashlib
import json
from pathlib import Path

import frappe

from appointment.tests.content_fresh_site import PRIMARY_SITE, RESTORE_SITE, RUNTIME

EMAILS = ("content-recovery-confirmed@example.test", "content-recovery-suppressed@example.test")


def prepare():
    _require(PRIMARY_SITE)
    from appointment.content.newsletter import audience, core

    site = audience.public_site("selam-studio")
    if frappe.db.exists("Newsletter Audience Member", {"email": ["in", EMAILS]}):
        raise RuntimeError("Recovery fixtures already exist; preserve and inspect them.")
    previous = frappe.session.user
    try:
        frappe.set_user("Guest")
        for address in EMAILS:
            audience.subscribe(site.slug, address, 1)
            name = frappe.db.get_value("Newsletter Audience Member", {"public_site": site.name, "email": address}, "name")
            payload = frappe.db.get_value("Local Email Message", {"audience_member": name, "kind": "Audience Confirmation"}, "payload_json")
            audience.confirm(json.loads(payload)["actionPath"].rsplit("/", 1)[1])
            if address == EMAILS[1]:
                owner = frappe.db.get_value("Organization", site.organization, "owner_user")
                frappe.set_user(owner)
                audience.suppress(name, "Explicit synthetic recovery suppression")
                frappe.set_user("Guest")
        frappe.db.commit()
        return save_snapshot()
    finally:
        frappe.set_user(previous)


def save_snapshot():
    _require(PRIMARY_SITE)
    rows = frappe.get_all("Newsletter Audience Member", filters={"email": ["in", EMAILS]}, fields=["email", "status"])
    if {row.email: row.status for row in rows} != {EMAILS[0]: "Confirmed", EMAILS[1]: "Suppressed"}:
        raise RuntimeError("The two explicit recovery consent fixtures are incomplete.")
    snapshot = inventory()
    path = RUNTIME / "content-recovery-before.json"
    with path.open("x") as stream:
        path.chmod(0o600)
        json.dump(snapshot, stream, sort_keys=True, indent=2)
    return {"site": frappe.local.site, "audience_fixtures": 2, "snapshot_hash": _digest(snapshot)}


def inventory():
    _require(PRIMARY_SITE, RESTORE_SITE)
    from appointment.content import releases
    from appointment.content.newsletter import core
    from appointment.public_experience.canonical import hash_document

    rows = frappe.get_all("Published Content Release", fields=["*"])
    hashes = []
    for row in rows:
        document = releases._release_document(row.public_site, row.content_type, row.route, row.locale,
                    json.loads(row.content_json), json.loads(row.media_json or "{}"))
        if hash_document(document) != row.content_hash:
            raise RuntimeError("A restored publication hash is invalid.")
        hashes.append((row.name, row.content_hash, row.status, row.route))
    media = []
    for row in frappe.get_all("File", filters={"attached_to_doctype": "Public Site"}, fields=["name", "file_url"]):
        content = frappe.get_doc("File", row.name).get_content()
        media.append((row.name, row.file_url, hashlib.sha256(content).hexdigest()))
    members = []
    for row in frappe.get_all("Newsletter Audience Member", fields=["name", "email", "status", "audit_json", "unsubscribe_hash"]):
        token = frappe.get_doc("Newsletter Audience Member", row.name).get_password("unsubscribe_token")
        if core.token_hash(token) != row.unsubscribe_hash:
            raise RuntimeError("Restored encrypted consent tokens do not match their hashes.")
        members.append((row.name, hashlib.sha256(row.email.encode()).hexdigest(), row.status,
                        row.unsubscribe_hash, hashlib.sha256((row.audit_json or "").encode()).hexdigest()))
    return {"releases": sorted(hashes), "media": sorted(media), "audience": sorted(members),
            "counts": {doctype: frappe.db.count(doctype) for doctype in (
                "Experience Release", "Content Ownership", "Blog Post", "Gallery Collection",
                "Newsletter", "Newsletter Sender Identity", "Business Newsletter Campaign",
                "Local Email Message", "Organization Workbook Import")}}


def verify_restore():
    _require(RESTORE_SITE)
    expected = json.loads((RUNTIME / "content-recovery-before.json").read_text())
    actual = inventory()
    if _digest(expected) != _digest(actual):
        raise RuntimeError("Restored releases, media, consent, or audit inventory differs.")
    if not frappe.conf.get("mute_emails") or not frappe.conf.get("pause_scheduler"):
        raise RuntimeError("The recovery target must retain isolated delivery settings.")
    return {"matched": True, "releases": len(actual["releases"]), "media": len(actual["media"]),
            "audience": len(actual["audience"]), "snapshot_hash": _digest(actual)}


def cleanup_source():
    """Remove only this drill's exact consent fixtures after verified restoration."""
    _require(PRIMARY_SITE)
    from frappe.utils.password import delete_all_passwords_for

    expected = json.loads((RUNTIME / "content-recovery-before.json").read_text())
    if _digest(expected) != _digest(inventory()):
        raise RuntimeError("The recovery source changed; preserve its fixtures for review.")
    site = frappe.db.get_value("Public Site", {"slug": "selam-studio"}, "name")
    names = frappe.get_all("Newsletter Audience Member", filters={"email": ["in", EMAILS], "public_site": site}, pluck="name")
    if len(names) != 2:
        raise RuntimeError("Exact recovery consent cleanup requires both owned fixtures.")
    frappe.db.delete("Local Email Message", {"audience_member": ["in", names]})
    for name in names:
        delete_all_passwords_for("Newsletter Audience Member", name)
    frappe.db.delete("Newsletter Audience Member", {"name": ["in", names]})
    frappe.db.commit()
    return {"exact_fixture_audience_removed": 2, "showcase_publications_preserved": True}


def _digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _require(*sites):
    if frappe.local.site not in sites or not frappe.conf.get("worktree_development"):
        raise RuntimeError("Recovery helpers require an explicitly isolated content site.")
