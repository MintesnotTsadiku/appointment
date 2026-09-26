"""Explicit, journal-owned content expansion for the five fictional showcases."""

import base64
import hashlib
import json
from pathlib import Path

import frappe

from appointment.content import authoring, releases
from appointment.content.newsletter import campaigns, senders
from appointment.public_experience.publisher import publish_experience
from appointment.public_experience.showcase_catalog import APP_ROOT, validate_showcase_catalog

VERSION = 1
MANIFEST = Path(__file__).with_name("content.v1.json")


def load_content():
    content = json.loads(MANIFEST.read_text())
    catalog = validate_showcase_catalog()
    if content.get("contract") != "appointment-showcase-content.v1" or content.get("version") != VERSION:
        raise ValueError("Unsupported showcase content manifest")
    if set(content["sites"]) != set(catalog["sites"]):
        raise ValueError("Showcase content does not cover every certified business")
    for key, world in content["sites"].items():
        if not 3 <= len(world["articles"]) <= 6 or not 2 <= len(world["collections"]) <= 4:
            raise ValueError(f"Incomplete article or gallery world for {key}")
        if len({row[1] for row in world["articles"]}) != len(world["articles"]):
            raise ValueError(f"Duplicate article routes for {key}")
    return content, catalog


def configure(state):
    """Called only by the guarded explicit seeder, never from startup or migration."""
    from appointment.demo import showcase

    content, catalog = load_content()
    digest = hashlib.sha256(MANIFEST.read_bytes()).hexdigest()
    prior = state.get("published_content")
    if prior:
        if prior.get("version") != VERSION or prior.get("manifest_checksum") != digest:
            frappe.throw("The showcase content manifest changed. Use a reviewed version upgrade before reseeding.")
        for doctype, name in prior["records"]:
            if not frappe.db.exists(doctype, name):
                frappe.throw("The published showcase inventory is incomplete; refusing to adopt replacement records.")
        return False
    baseline = {tuple(row) for row in state["created"]}
    for business in state["businesses"].values():
        if frappe.db.exists("Content Ownership", {"public_site": business["public_site"]}) or frappe.db.exists(
            "Blog Category", {"title": "Website " + business["public_site"]}
        ):
            frappe.throw("This showcase has content outside the journal; refusing to adopt it.")
    for key, business in state["businesses"].items():
        site = frappe.get_doc("Public Site", business["public_site"])
        if frappe.db.exists("Content Ownership", {"public_site": site.name}):
            frappe.throw("This showcase already has content outside the journal; refusing to adopt it.")
        frappe.set_user(business["owner"])
        world = content["sites"][key]
        prior_blogger = frappe.db.exists("Blogger", {"short_name": "website-" + site.name})
        article_rows = []
        for title, slug, body in world["articles"]:
            draft = authoring.create_article(site.name, title, slug, f"# {title}\n\n{body}", body.split("\n")[0])
            article_rows.append(draft)
            showcase.remember(state, "Blog Post", draft["source"])
            showcase.remember(state, "Content Ownership", draft["ownership"])
        category = frappe.get_doc("Blog Category", frappe.db.get_value("Blog Post", article_rows[0]["source"], "blog_category"))
        if not prior_blogger:
            blogger = frappe.db.get_value("Blogger", {"short_name": "website-" + site.name}, "name")
            if blogger:
                showcase.remember(state, "Blogger", blogger)
                author = frappe.get_doc("Blogger", blogger)
                author.full_name = frappe.db.get_value("User", business["owner"], "full_name")
                author.save(ignore_permissions=True)
        showcase.remember(state, "Blog Category", category.name)
        category.title = world["category"]
        category.save(ignore_permissions=True)
        for draft in article_rows:
            release = releases.publish_article(draft["ownership"])
            showcase.remember(state, "Published Content Release", release.name)
        media = []
        for asset in catalog["sites"][key]["supportAssets"]:
            path = APP_ROOT / "public" / asset["asset"].removeprefix("/assets/appointment/")
            if hashlib.sha256(path.read_bytes()).hexdigest() != asset["checksum"]:
                frappe.throw("A showcase gallery image failed its checksum.")
            image = authoring.upload_image(site.name, base64.b64encode(path.read_bytes()).decode(), 1)
            showcase.remember(state, "File", image["name"])
            media.append(image["url"])
        for index, title in enumerate(world["collections"]):
            items = [{"media_type": "image", "image": media[index], "alt_text": title,
                      "caption": "A fictional scene from " + business["name"] + ".",
                      "credit": "Project-generated showcase image", "display_date": state["anchor_date"],
                      "consent_status": "Approved", "consent_evidence": "Project-generated fictional people and places; showcase use approved."}]
            if index == 1:
                video = content["provenance"]["video"]
                items.append({"media_type": "video", "video_provider": video["provider"], "video_id": video["id"],
                              "alt_text": video["title"], "thumbnail": media[2], "credit": video["credit"],
                              "caption": "Independent animation example for a governed video link. This is not footage of the business.",
                              "consent_status": "Not Required"})
            draft = authoring.create_gallery(site.name, title, f"showcase-collection-{index + 1}",
                                             "People and places in our fictional showcase.", items)
            showcase.remember(state, "Gallery Collection", draft["source"])
            showcase.remember(state, "Content Ownership", draft["ownership"])
            release = releases.publish_gallery_collection(draft["ownership"])
            showcase.remember(state, "Published Content Release", release.name)
        sender = senders.request(site.name, key + "-updates@example.test", business["name"])
        showcase.remember(state, "Newsletter Sender Identity", sender["sender"])
        draft = campaigns.create_draft(site.name, sender["sender"], "A note from " + business["name"],
                                       f"# Welcome to {business['name']}\n\n{world['articles'][0][2]}\n\nThis is an unsent fictional showcase newsletter.")
        showcase.remember(state, "Newsletter", draft["newsletter"])
        showcase.remember(state, "Content Ownership", draft["ownership"])
        group = frappe.db.get_value("Email Group", {"title": "Website newsletter " + site.name}, "name")
        showcase.remember(state, "Email Group", group)
        preview = campaigns.preview(site.name, draft["ownership"], sender["sender"])
        for name in frappe.get_all("Local Email Message", filters={"public_site": site.name}, pluck="name"):
            showcase.remember(state, "Local Email Message", name)
        site.website_setup_json = json.dumps({"step": "published", "features": ["blog", "gallery", "newsletter"]})
        site.save()
        experience = publish_experience(site, site.draft_version)
        showcase.remember(state, "Experience Release", experience.name)
        for name in frappe.get_all("Public Experience Outbox", filters={"idempotency_key": ["like", f"publish:{site.name}:%"]}, pluck="name"):
            showcase.remember(state, "Public Experience Outbox", name)
        business["experience_release"] = experience.name
        business["articles"] = [row["ownership"] for row in article_rows]
        business["newsletter_draft"] = draft["ownership"]
        business["newsletter_preview"] = preview["message"]
        frappe.set_user("Administrator")
    state["published_content"] = {"version": VERSION, "manifest_checksum": digest,
                                   "records": [row for row in state["created"] if tuple(row) not in baseline]}
    return True


def refresh_covers():
    """Explicitly rebuild only journal-owned collections with an empty cover."""
    from appointment.demo import showcase

    changed = 0
    with showcase.locked():
        state = showcase.load_state()
        owned = {tuple(row) for row in state["created"]}
        for business in state["businesses"].values():
            frappe.set_user(business["owner"])
            rows = frappe.get_all("Content Ownership", filters={"public_site": business["public_site"],
                                  "source_doctype": "Gallery Collection"}, fields=["name", "source_name"])
            for row in rows:
                if ("Gallery Collection", row.source_name) not in owned or ("Content Ownership", row.name) not in owned:
                    frappe.throw("A showcase collection is outside the journal. No content was adopted.")
                doc = frappe.get_doc("Gallery Collection", row.source_name)
                cover = next((item.image for item in doc.items if item.media_type == "image"), None)
                if not doc.cover and cover:
                    doc.cover = cover
                    doc.save()
                    release = releases.publish_gallery_collection(row.name)
                    showcase.remember(state, "Published Content Release", release.name)
                    state["published_content"]["records"].append(["Published Content Release", release.name])
                    changed += 1
        frappe.set_user("Administrator")
        showcase.write_state(state)
        frappe.db.commit()
    return {"rebuilt": changed}


def inventory():
    """Verify the owned expansion without returning credentials or draft payloads."""
    from appointment.demo import showcase
    from appointment.content.canonical import hash_document

    showcase.require_target()
    content, _ = load_content()
    state = showcase.load_state()
    owned = state.get("published_content", {})
    if owned.get("manifest_checksum") != hashlib.sha256(MANIFEST.read_bytes()).hexdigest():
        raise RuntimeError("The seeded content manifest does not match this checkout.")
    for doctype, name in owned["records"]:
        if not frappe.db.exists(doctype, name):
            raise RuntimeError("A journal-owned content record is missing.")
    worlds = {}
    for key, business in state["businesses"].items():
        site = business["public_site"]
        scope = {"public_site": site}
        rows = frappe.get_all("Published Content Release", filters=scope,
                              fields=["content_type", "route", "locale", "content_json", "content_hash", "status"])
        for row in rows:
            expected = hash_document(releases._release_document(site, row.content_type, row.route, row.locale,
                                                               json.loads(row.content_json), None))
            if row.content_hash != expected:
                raise RuntimeError("A showcase publication failed its canonical hash.")
        counts = {"articles": sum(row.status == "Active" and row.content_type == "article" for row in rows),
                  "galleries": sum(row.status == "Active" and row.content_type == "gallery_collection" for row in rows),
                  "newsletterDrafts": frappe.db.count("Content Ownership", {**scope, "source_doctype": "Newsletter"}),
                  "unsentPreviews": frappe.db.count("Local Email Message", {**scope, "kind": "Campaign Preview"}),
                  "audienceMembers": frappe.db.count("Newsletter Audience Member", scope),
                  "campaigns": frappe.db.count("Business Newsletter Campaign", scope)}
        if counts != {"articles": len(content["sites"][key]["articles"]), "galleries": len(content["sites"][key]["collections"]),
                      "newsletterDrafts": 1, "unsentPreviews": 1, "audienceMembers": 0, "campaigns": 0}:
            raise RuntimeError("The showcase content counts do not match the approved unsent inventory.")
        worlds[key] = counts
    return {"version": VERSION, "manifest_checksum": owned["manifest_checksum"], "worlds": worlds,
            "all_release_hashes_valid": True, "owned_records": len(owned["records"]), "external_sends": 0}
