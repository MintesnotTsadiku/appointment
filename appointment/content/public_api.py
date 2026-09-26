"""Guest-safe public read API for published content.

Public traffic reads only Active Published Content Releases. Drafts, unpublished
authoring records and previews are never reachable here. Previews are
session-bound and served by a separate handler.
"""

from __future__ import annotations

import frappe
from frappe import _

from appointment.content import gallery as gallery_module
from appointment.content import releases

_MAX_PAGE_SIZE = 50


def _published_site(slug: str) -> str:
    if not slug:
        frappe.throw(_("A public site is required."), frappe.DoesNotExistError)
    site = frappe.db.get_value(
        "Public Site", {"slug": slug}, ["name", "status"], as_dict=True
    )
    if not site or site.status != "Published":
        frappe.throw(_("This site has no published content."), frappe.DoesNotExistError)
    return site.name


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_article_index(site: str, locale: str | None = None, page: int = 1, page_size: int = 20):
    site_name = _published_site(site)
    page = max(1, int(page or 1))
    page_size = min(_MAX_PAGE_SIZE, max(1, int(page_size or 20)))
    offset = (page - 1) * page_size
    result = releases.list_public_articles(site_name, locale, page_size, offset)
    result["page"] = page
    result["pageSize"] = page_size
    return result


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_article_detail(site: str, route: str, locale: str | None = None):
    site_name = _published_site(site)
    if not route or not route.startswith(releases.ARTICLE_ROUTE_PREFIX) or ".." in route:
        frappe.throw(_("The article route is not valid."), frappe.DoesNotExistError)
    article = releases.get_public_article(site_name, route, locale)
    if not article:
        frappe.throw(_("This article is not published."), frappe.DoesNotExistError)
    return article


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_gallery_index(site: str, locale: str | None = None, page: int = 1, page_size: int = 20):
    site_name = _published_site(site)
    page = max(1, int(page or 1))
    page_size = min(_MAX_PAGE_SIZE, max(1, int(page_size or 20)))
    result = releases.list_public_galleries(site_name, locale, page_size, (page - 1) * page_size)
    result["page"] = page
    result["pageSize"] = page_size
    return result


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_gallery_detail(site: str, route: str, locale: str | None = None):
    site_name = _published_site(site)
    if not route or not route.startswith(gallery_module.GALLERY_ROUTE_PREFIX) or ".." in route:
        frappe.throw(_("The gallery route is not valid."), frappe.DoesNotExistError)
    gallery = releases.get_public_gallery(site_name, route, locale)
    if not gallery:
        frappe.throw(_("This gallery is not published."), frappe.DoesNotExistError)
    return gallery


@frappe.whitelist(methods=["GET"])
def get_content_preview(token: str):
    entry = releases.consume_article_preview(token)
    if not entry:
        frappe.throw(_("This preview is unavailable or has expired."), frappe.PermissionError)
    return {
        "publicSite": entry.get("publicSite"),
        "route": entry.get("route"),
        "locale": entry.get("locale"),
        "projection": entry.get("projection"),
        "expiresAt": entry.get("expiresAt"),
    }
