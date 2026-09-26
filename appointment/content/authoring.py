"""Business-scoped article and collection drafts for the website workspace."""

import base64
import binascii

import frappe

from appointment.content import entitlements, tenancy
from appointment.public_experience.reserved import normalize_slug, slug_error
from appointment.public_experience.setup import require_site


def _scope(site, capability):
    doc = require_site(site)
    entitlements.require_capability(doc.owner_type, doc.organization, doc.provider, capability)
    frappe.db.sql("select name from `tabPublic Site` where name=%s for update", doc.name)
    return doc, {"owner_type": doc.owner_type, "organization": doc.organization, "provider": doc.provider}


def _address(slug):
    value = normalize_slug(slug)
    error = slug_error(value)
    if error:
        frappe.throw(error)
    return value


def create_article(site, title, slug, body, summary=""):
    doc, scope = _scope(site, "blog")
    slug = _address(slug)
    if not isinstance(body, str) or not body.strip() or len(body) > 100000:
        frappe.throw("Write an article of at most 100,000 characters.")
    count = frappe.db.count("Content Ownership", {"public_site": site, "source_doctype": "Blog Post"})
    entitlements.enforce_limit(doc.owner_type, doc.organization, doc.provider, "blog", "articles", count + 1)
    category_title = "Website " + doc.name
    category = frappe.db.get_value("Blog Category", {"title": category_title}, "name")
    if not category:
        # Upstream support records are created only by this authorized factory;
        # editors cannot supply categories or bloggers from another business.
        category = frappe.get_doc({"doctype": "Blog Category", "title": category_title}).insert(ignore_permissions=True).name
    blogger_key = "website-" + doc.name
    blogger = frappe.db.get_value("Blogger", {"user": frappe.session.user}, "name") or frappe.db.get_value("Blogger", {"short_name": blogger_key}, "name")
    if not blogger:
        blogger = frappe.get_doc({"doctype": "Blogger", "short_name": blogger_key,
                                  "full_name": doc.site_title}).insert(ignore_permissions=True).name
    post = frappe.get_doc({"doctype": "Blog Post", "title": title, "blog_category": category,
                           "blogger": blogger, "route": f"content-draft/{doc.name}/{slug}",
                           "content_type": "Markdown", "content": body, "content_md": body,
                           "blog_intro": summary, "published": 0, "enable_email_notification": 0}).insert()
    ownership = frappe.get_doc({"doctype": "Content Ownership", **scope,
                                "public_site": site, "source_doctype": "Blog Post",
                                "source_name": post.name, "capability": "blog"}).insert()
    return {"ownership": ownership.name, "source": post.name, "modified": str(post.modified)}


def create_gallery(site, title, slug, summary="", items=None):
    doc, scope = _scope(site, "gallery")
    if not isinstance(items, list) or not items or len(items) > 200:
        frappe.throw("Add between one and 200 gallery items.")
    allowed = {"media_type", "image", "video_provider", "video_id", "caption", "alt_text", "credit",
               "display_date", "focal_x", "focal_y", "consent_status", "consent_evidence", "thumbnail", "poster"}
    gallery = frappe.get_doc({"doctype": "Gallery Collection", **scope, "public_site": site,
                              "title": title, "slug": _address(slug), "summary": summary,
                              "cover": next((item.get("image") for item in items if isinstance(item, dict) and item.get("media_type", "image") == "image"), None)})
    for index, item in enumerate(items):
        if not isinstance(item, dict) or set(item) - allowed:
            frappe.throw("Gallery items must use supported media fields.")
        if item.get("media_type", "image") == "image":
            if not frappe.db.exists("File", {"file_url": item.get("image"),
                                               "attached_to_doctype": "Public Site", "attached_to_name": site}):
                frappe.throw("Choose an image from this website's media library.", frappe.PermissionError)
        gallery.append("items", {**item, "sort_order": index})
    gallery.insert()
    ownership = frappe.get_doc({"doctype": "Content Ownership", **scope, "public_site": site,
                                "source_doctype": "Gallery Collection", "source_name": gallery.name,
                                "capability": "gallery"}).insert()
    return {"ownership": ownership.name, "source": gallery.name, "modified": str(gallery.modified)}


def upload_image(site, content_base64, public_consent):
    doc, _ = _scope(site, "gallery")
    if str(public_consent) not in {"1", "True", "true"}:
        frappe.throw("Confirm that this image may be made public.")
    if not isinstance(content_base64, str) or len(content_base64) > 7 * 1024 * 1024:
        frappe.throw("Choose an image smaller than 5 MB.")
    try:
        content = base64.b64decode(content_base64, validate=True)
    except (ValueError, binascii.Error):
        frappe.throw("The image upload is invalid.")
    from appointment.public_experience.media import sanitize_image
    from frappe.utils.file_manager import save_file

    sanitized, mime = sanitize_image(content)
    extension = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}[mime]
    files = frappe.get_all("File", filters={"attached_to_doctype": "Public Site", "attached_to_name": site}, fields=["file_size"])
    if len(files) >= 200:
        frappe.throw("The website media library is full.")
    ceiling = entitlements.effective_limits(doc.owner_type, doc.organization, doc.provider, "gallery").get("storage_mb")
    if ceiling is not None and sum(int(row.file_size or 0) for row in files) + len(sanitized) > int(ceiling) * 1024 * 1024:
        frappe.throw("The image would exceed your gallery storage limit.")
    file = save_file("gallery-" + frappe.generate_hash(length=16) + "." + extension, sanitized,
                     "Public Site", site, is_private=0)
    return {"name": file.name, "url": file.file_url}


def get_draft(ownership):
    own = frappe.get_doc("Content Ownership", ownership)
    tenancy.require_manage_business(own.owner_type, own.organization, own.provider)
    source = frappe.get_doc(own.source_doctype, own.source_name)
    source.check_permission("read")
    if own.source_doctype == "Blog Post":
        return {"ownership": own.name, "title": source.title, "body": source.content_md or source.content,
                "summary": source.blog_intro, "modified": str(source.modified), "type": "article"}
    if own.source_doctype == "Gallery Collection":
        return {"ownership": own.name, "title": source.title, "summary": source.summary,
                "modified": str(source.modified), "type": "gallery", "items": source.items}
    frappe.throw("Choose an article or gallery draft.")


def save_article(ownership, expected_modified, title, body, summary=""):
    own = frappe.get_doc("Content Ownership", ownership)
    tenancy.require_manage_business(own.owner_type, own.organization, own.provider)
    entitlements.require_capability(own.owner_type, own.organization, own.provider, "blog")
    if own.source_doctype != "Blog Post":
        frappe.throw("Choose an article draft.")
    frappe.db.sql("select name from `tabBlog Post` where name=%s for update", own.source_name)
    post = frappe.get_doc("Blog Post", own.source_name)
    if str(post.modified) != str(expected_modified):
        frappe.throw("This article changed. Reload before saving.")
    if not isinstance(body, str) or not body.strip() or len(body) > 100000:
        frappe.throw("Write an article of at most 100,000 characters.")
    post.title, post.content, post.content_md, post.blog_intro = title, body, body, summary
    post.save()
    return get_draft(own.name)
