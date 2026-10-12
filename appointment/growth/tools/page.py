"""Shared context for every free tool page in English (`/tools/...`) and Amharic (`/am/tools/...`)."""

from __future__ import annotations

import json
import os

import frappe
from frappe.utils import get_url

from appointment.growth.tools import colors, og_image, registry
from appointment.growth.tools.catalog import Translator

TITLE_LIMIT = 60
COMMON = "tools.common"


def request_lang() -> str:
    """The page language comes from the URL: `/am/tools/...` is Amharic, everything else English."""

    request = getattr(frappe.local, "request", None)
    path = getattr(request, "path", "") or ""
    return "am" if path == "/am/tools" or path.startswith("/am/tools/") else "en"


def build(context, slug: str, lang: str | None = None):
    """Fill the Jinja context of a tool page. Raises a 404 when tools are switched off."""

    if not registry.tools_enabled():
        raise frappe.PageDoesNotExistError
    lang = lang or request_lang()
    frappe.local.lang = lang  # brand taglines and `_()` follow the page language
    from appointment.growth.brand import brand

    tool = registry.get(slug)
    t = Translator(tool.group, lang)
    values = brand()
    product = values["product_name"]
    title = _seo_title(t("title"), product)
    alternates = {code: get_url(tool.path(code)) for code in registry.LANGS}
    link_back = f"{alternates[lang]}?source={tool.source}"
    faq = [(t(f"faq{i}q"), t(f"faq{i}a")) for i in range(1, tool.faq_count + 1)]
    context.update(
        {
            "no_header": 1,
            "no_breadcrumbs": 1,
            "no_cache": 1,
            "lang": lang,
            "t": t,
            "tool": tool,
            "title": title,
            "h1": t("h1"),
            "description": t("description"),
            "canonical_url": alternates[lang],  # Frappe overwrites `canonical` with the resolved route (no /am prefix)
            "alternates": alternates,
            "other_lang": "en" if lang == "am" else "am",
            "brand": values,
            "product_name": product,
            "colors": colors.palette(values.get("primary_color")),
            "cta_href": cta_href(tool),
            "link_back": link_back,
            "link_back_short": f"{values['short_host']}{tool.path(lang)}",
            "faq": faq,
            "faq_json_ld": json_ld(faq_schema(faq)) if faq else "",
            "app_json_ld": json_ld(app_schema(tool, t, alternates[lang], lang)) if tool.slug else "",
            "og_image": og_image.image_url(
                tool.slug, lang, t("h1"), t(f"{COMMON}.freeTool"), f"{values['short_host']}{tool.path(lang)}"
            ),
            "nav_tools": [_card(item, lang) for item in registry.TOOLS],
            "asset_version": asset_version(tool),
            "year": frappe.utils.now_datetime().year,
        }
    )
    return context


def _seo_title(tool_title: str, product: str) -> str:
    full = f"{tool_title} | {product}"
    return full if len(full) <= TITLE_LIMIT else tool_title[:TITLE_LIMIT]


def _card(tool: registry.Tool, lang: str) -> dict:
    t = Translator(tool.group, lang)
    return {"slug": tool.slug, "href": tool.path(lang), "name": t("name"), "summary": t("summary"), "icon": tool.icon}


def cta_href(tool: registry.Tool) -> str:
    """Sign-up with the tool as the source; the home page when self sign-up is closed."""

    try:
        from appointment.scheduler.registration import self_signup_enabled

        base = "/signup" if self_signup_enabled() else "/"
    except Exception:
        base = "/"
    return f"{base}?source={tool.source}"


def faq_schema(faq: list[tuple[str, str]]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": question, "acceptedAnswer": {"@type": "Answer", "text": answer}}
            for question, answer in faq
        ],
    }


def app_schema(tool: registry.Tool, t: Translator, url: str, lang: str) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": t("h1"),
        "description": t("description"),
        "url": url,
        "inLanguage": lang,
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Any",
        "isAccessibleForFree": True,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "ETB"},
    }


def json_ld(data: dict) -> str:
    """JSON for a `<script type="application/ld+json">` block, safe to embed in HTML."""

    encoded = json.dumps(data, ensure_ascii=False)
    return encoded.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def js_data(data: dict) -> str:
    """Page data for the tool script (`<script type="application/json">`)."""

    return json_ld(data)


def asset_version(tool: registry.Tool) -> str:
    public = os.path.join(frappe.get_app_path("appointment"), "public")
    paths = [
        os.path.join(public, "css", "tools.css"),
        os.path.join(public, "js", "habesha-time.js"),
        os.path.join(public, "js", "tools", "tools-common.js"),
        os.path.join(public, "js", "tools", "ethiopian-calendar.js"),
    ]
    if tool.script:
        paths.append(os.path.join(public, "js", "tools", f"{tool.script}.js"))
    try:
        return str(int(max(os.path.getmtime(path) for path in paths if os.path.exists(path))))
    except ValueError:
        return "1"
