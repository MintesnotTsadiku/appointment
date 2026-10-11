import frappe


def pick(values: dict, field: str) -> str:
    """The `<field>_am` text for Amharic sessions, else `<field>_en`; falls back to English."""
    english = values.get(f"{field}_en") or ""
    if (frappe.local.lang or "en").split("-")[0] == "am":
        return values.get(f"{field}_am") or english
    return english
