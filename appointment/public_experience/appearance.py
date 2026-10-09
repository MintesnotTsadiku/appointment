"""Versioned choices compatible with each certified template."""
from frappe import _

from appointment.public_experience.canonical import hash_document
from appointment.public_experience.errors import DesignCompilationError
from appointment.public_experience.recipes import _read


def selected_primitive(recipe, kind, choice):
    choices = _read("public_experience/manifest/design/appearance-options.v1.json")[recipe.key]
    rows = choices["palettes" if kind == "palette" else "fonts"]
    selected = next((row for row in rows if row["key"] == (choice or "default")), None)
    if selected is None:
        raise DesignCompilationError(_("Choose an approved template appearance option."), details={"field": kind})
    folder = "palettes" if kind == "palette" else "typography"
    document = _read(f"public_experience/manifest/design/{folder}/{selected['primitive']}.v1.json")
    reference = {"kind": kind, "key": document["key"], "version": document["version"], "hash": hash_document(document)}
    return document, reference


def options(recipe):
    choices = _read("public_experience/manifest/design/appearance-options.v1.json")[recipe.key]
    palettes, fonts = [], []
    for row in choices["palettes"]:
        document, _reference = selected_primitive(recipe, "palette", row["key"])
        palettes.append({"key": row["key"], "label": row["label"], "sample": document["semantic"]["light"]})
    for row in choices["fonts"]:
        document, _reference = selected_primitive(recipe, "typography", row["key"])
        fonts.append({"key": row["key"], "label": row["label"], "roles": document["roles"],
                      "fontAssets": document["fontAssets"], "fallbacks": document["fallbacks"],
                      "scripts": document["supportedScripts"]})
    return {"palettes": palettes, "fonts": fonts}
