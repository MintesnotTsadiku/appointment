"""Crawler files: `robots.txt` gains a `Sitemap:` line and `sitemap.xml` gains app pages.

Other features add sitemap entries through the `appointment_sitemap_links` hook: a list of dotted
paths to functions that return `[{"loc", "lastmod", "alternates": {lang: url}}]`. A function returns
an empty list when its feature is switched off, so the pages leave the sitemap.
"""

from __future__ import annotations

import frappe
from frappe.utils import get_url


def robots_txt() -> str:
    """Website Settings (or site config) robots text, with the sitemap location appended once."""

    text = (
        frappe.db.get_single_value("Website Settings", "robots_txt")
        or (frappe.local.conf.robots_txt and frappe.read_file(frappe.local.conf.robots_txt))
        or ""
    ).rstrip()
    if any(line.strip().lower().startswith("sitemap:") for line in text.splitlines()):
        return text + "\n"
    sitemap = f"Sitemap: {get_url('/sitemap.xml')}"
    return f"{text}\n\n{sitemap}\n" if text else f"{sitemap}\n"


def app_sitemap_links() -> list[dict]:
    links = []
    for method in frappe.get_hooks("appointment_sitemap_links") or []:
        links.extend(frappe.get_attr(method)() or [])
    return links


def merge_links(framework_links: list[dict], app_links: list[dict]) -> list[dict]:
    """Framework pages first, then app pages; one entry per URL."""

    seen = set()
    merged = []
    for link in [*framework_links, *app_links]:
        if link["loc"] in seen:
            continue
        seen.add(link["loc"])
        merged.append(link)
    return merged
