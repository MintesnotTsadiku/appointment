"""Frappe `Translation` DocType backed localisation for the React app.

English source strings are the message ids. Translations live in the framework's
own `Translation` DocType, so an administrator adds or edits a language there
and the app picks it up on the next language switch. No second dictionary store.
"""

from __future__ import annotations

import json
from pathlib import Path

import frappe

DEFAULT_LANGUAGE = "en"
FALLBACK_LANGUAGES = ("en", "am")

_APP_SOURCES: set | None = None


def _flatten(value, prefix=""):
    flat = {}
    for key, item in value.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(item, dict):
            flat.update(_flatten(item, full_key))
        elif isinstance(item, str):
            flat[full_key] = item
    return flat


def _app_english_sources():
    """English message ids the app ships, so only real languages are offered."""
    global _APP_SOURCES
    if _APP_SOURCES is not None:
        return _APP_SOURCES
    _APP_SOURCES = set()
    try:
        app_root = Path(frappe.get_app_path("appointment")).parent
        en_path = app_root / "frontend" / "src" / "lib" / "i18n" / "translations" / "en.json"
        if en_path.is_file():
            _APP_SOURCES = set(_flatten(json.loads(en_path.read_text(encoding="utf-8"))).values())
    except (OSError, ValueError):
        _APP_SOURCES = set()
    return _APP_SOURCES


@frappe.whitelist(allow_guest=True)
def messages(language=None):
    language = language or (getattr(frappe.local, "lang", None) or DEFAULT_LANGUAGE)
    rows = frappe.get_all(
        "Translation",
        filters={"language": language},
        fields=["source_text", "translated_text"],
        limit_page_length=0,
    )
    return {
        "language": language,
        "messages": {
            row.source_text: row.translated_text
            for row in rows
            if row.source_text and row.translated_text
        },
    }


@frappe.whitelist(allow_guest=True)
def languages():
    """Languages with app translations, plus the required fallbacks."""
    app_sources = _app_english_sources()
    names = {"en"}
    if app_sources:
        rows = frappe.get_all("Translation", fields=["language", "source_text"], limit_page_length=0)
        names.update(row.language for row in rows if row.source_text in app_sources and row.language)
    else:
        names.update(FALLBACK_LANGUAGES)
    for code in FALLBACK_LANGUAGES:
        names.add(code)
    ordered = ["en", *sorted(name for name in names if name != "en")]
    return {"languages": ordered}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def set_language(language):
    user = frappe.session.user
    if user != "Guest":
        frappe.db.set_value("User", user, "language", language)
        frappe.db.commit()
    return messages(language)

