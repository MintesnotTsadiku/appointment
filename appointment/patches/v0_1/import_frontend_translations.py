"""Seed the framework `Translation` DocType from the bundled React catalog.

The React app historically shipped a JSON dictionary. This one-time patch
converts those entries into the canonical English-source -> translation records
for Amharic, after which administrators manage translations in the `Translation`
DocType. It is safe to re-run: existing translations are only updated.
"""

import json
from pathlib import Path

import frappe


def _flatten(value, prefix=""):
    flat = {}
    for key, item in value.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(item, dict):
            flat.update(_flatten(item, full_key))
        elif isinstance(item, str):
            flat[full_key] = item
    return flat


def execute():
    app_root = Path(frappe.get_app_path("appointment")).parent
    base = app_root / "frontend" / "src" / "lib" / "i18n" / "translations"
    en_path = base / "en.json"
    am_path = base / "am.json"
    if not en_path.is_file() or not am_path.is_file():
        return

    english = _flatten(json.loads(en_path.read_text(encoding="utf-8")))
    amharic = _flatten(json.loads(am_path.read_text(encoding="utf-8")))

    pairs = {}
    for key, source in english.items():
        translated = amharic.get(key)
        if source and translated and translated != source:
            pairs[source] = translated

    for source, translated in pairs.items():
        existing = frappe.db.get_value(
            "Translation", {"language": "am", "source_text": source}, "name"
        )
        if existing:
            if frappe.db.get_value("Translation", existing, "translated_text") != translated:
                frappe.db.set_value("Translation", existing, "translated_text", translated)
        else:
            frappe.get_doc(
                {
                    "doctype": "Translation",
                    "language": "am",
                    "source_text": source,
                    "translated_text": translated,
                }
            ).insert(ignore_permissions=True)
    frappe.db.commit()
