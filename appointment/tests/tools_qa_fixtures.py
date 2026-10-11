"""Agent Plane fixture for the free tool manifests (qa/manifests/tools, qa/manifests/growth/tools-*).

The tools need no records: `setup` and `cleanup` do nothing, and `browser_values` only reads the
platform brand and today's Ethiopian date, so assertions use the configured product name.
"""

from __future__ import annotations

import base64
import json

from appointment.growth import ethiopian_calendar as ec
from appointment.growth.brand import brand

#: A week with a lunch break on Monday, for the print preview (?view=print#s=...).
SIGN_STATE = {
    "name": "ሰላም የውበት ሳሎን",
    "phone": "0911 234 567",
    "link": "example.com/selam",
    "theme": "brand",
    "color": "#1f6f5c",
    "paper": "A5",
    "week": [
        [["08:30", "12:30"], ["13:30", "17:30"]],
        [["08:30", "17:30"]],
        [["08:30", "17:30"]],
        [["08:30", "17:30"]],
        [["08:30", "17:30"]],
        [["09:00", "13:00"]],
        [],
    ],
}


def setup():
    return {}


def cleanup():
    return {}


def sign_hash(state: dict = SIGN_STATE) -> str:
    """The same encoding as `HoursSign.encodeState` in public/js/tools/hours-sign.js."""

    text = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
    return base64.urlsafe_b64encode(text.encode("utf-8")).decode("ascii").rstrip("=")


def browser_values(manifest=None):
    today = ec.to_ethiopian(ec.today_in_addis())
    return {
        "qa_product_name": brand()["product_name"],
        "qa_eth_year": str(today.year),
        "qa_today_en": ec.format_date(today, "en"),
        "qa_today_am": ec.format_date(today, "am"),
        "qa_sign_hash": sign_hash(),
    }
