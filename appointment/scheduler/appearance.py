"""Curated application appearance for the authenticated user only."""
import json

import frappe
from frappe import _
from frappe.cache_manager import clear_defaults_cache

KEY = "appointment:appearance:v1"
DEFAULTS = dict(version=1, palette="codex", mode="system", typography="system", text_size="standard", density="comfortable")
CHOICES = dict(palette={"codex", "violet", "ocean", "forest"}, mode={"light", "dark", "system"},
               typography={"system", "noto", "serif"}, text_size={"standard", "large"},
               density={"comfortable", "compact"})


@frappe.whitelist(methods=["GET"])
def load():
    require_user()
    raw = frappe.defaults.get_user_default(KEY)
    if not raw:
        return dict(DEFAULTS)
    try:
        return validate(frappe.parse_json(raw))
    except (frappe.ValidationError, ValueError, TypeError):
        return dict(DEFAULTS)


@frappe.whitelist(methods=["POST"])
def save(preferences):
    require_user()
    value = validate(frappe.parse_json(preferences))
    # Lock the user so simultaneous first saves cannot duplicate default rows.
    frappe.db.sql("select name from tabUser where name=%s for update", frappe.session.user)
    user = frappe.session.user
    frappe.defaults.set_user_default(KEY, json.dumps(value), user=user)
    # A concurrent reader can cache the previous value before this write commits.
    frappe.db.after_commit.add(lambda: clear_defaults_cache(user))
    return value


def validate(value):
    if not isinstance(value, dict) or set(value) != set(DEFAULTS) or type(value.get("version")) is not int or value["version"] != 1:
        frappe.throw(_("Choose supported application appearance settings."))
    for key, choices in CHOICES.items():
        if not isinstance(value[key], str) or value[key] not in choices:
            frappe.throw(_("Choose a supported application appearance option."))
    return {key: value[key] for key in DEFAULTS}


def require_user():
    if frappe.session.user == "Guest" or not frappe.db.get_value("User", frappe.session.user, "enabled"):
        frappe.throw(_("Sign in to manage appearance."), frappe.PermissionError)
