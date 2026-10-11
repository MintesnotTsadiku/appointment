"""Free Ethiopian (Habesha) time converter: a server-rendered SEO page.

The 24-row reference table and the FAQ are rendered here so the page is
useful without JavaScript. `public/js/habesha-time.js` adds the live
converter with the same rule: Habesha hour = international hour - 6 on a
12-hour dial, minutes unchanged.
"""

from __future__ import annotations

import json
import os

import frappe
from frappe.utils import get_url

sitemap = 1

PRODUCT_NAME = "Meet.et"
ROUTE = "tools/ethiopian-time-converter"
TITLE = "Ethiopian Time Converter: Habesha Clock to EAT | Meet.et"
H1 = "Ethiopian time converter"
DESCRIPTION = (
    "Convert Ethiopian (Habesha) time to international time and back. "
    "Free, instant and works on your phone, with a full 24-hour table and AM/PM labels."
)

PERIODS = {
    "night": ("ሌሊት", "night"),
    "morning": ("ጠዋት", "morning"),
    "afternoon": ("ከሰዓት", "afternoon"),
    "evening": ("ማታ", "evening"),
}

FAQ = [
    (
        "Why does Ethiopian time start at 6 AM?",
        "The Habesha clock counts hours from sunrise, not from midnight. Ethiopia is close to the equator, "
        "so the sun rises at about 6:00 AM and sets at about 6:00 PM all year. The first hour of the day "
        "ends at 7:00 AM, so 7:00 AM is 1 o'clock (ጠዋት 1 ሰዓት) and 6:00 AM is 12 o'clock. "
        "The count starts again at sunset: 7:00 PM is 1 o'clock at night.",
    ),
    (
        "What does 2 o'clock mean in Ethiopian time?",
        "It depends on the half of the day. 2:00 in the day (ጠዋት 2 ሰዓት) is 8:00 AM. "
        "2:00 at night (ማታ 2 ሰዓት) is 8:00 PM. To convert, add 6 hours to the Habesha hour, "
        "then use the period word to choose AM or PM.",
    ),
    (
        "What are day (ቀን) and night (ሌሊት) in Ethiopian time?",
        "The Habesha clock has two 12-hour cycles. The day cycle (ቀን) runs from 6:00 AM to 5:59 PM, "
        "and the night cycle (ሌሊት) runs from 6:00 PM to 5:59 AM. People usually add a period word: "
        "ጠዋት (morning, 6:00 AM to 11:59 AM), ከሰዓት (afternoon, 12:00 PM to 5:59 PM), "
        "ማታ (evening, 6:00 PM to 11:59 PM) and ሌሊት (late night, 12:00 AM to 5:59 AM).",
    ),
    (
        "Is Ethiopia in a different time zone?",
        "No. The Habesha clock is a different way to count the hours, not a different time zone. "
        "Ethiopia uses East Africa Time (EAT), which is UTC+3 all year, with no daylight saving time. "
        "For example, 3:00 PM EAT in Addis Ababa is 9:00 in Habesha time (ከሰዓት 9 ሰዓት).",
    ),
    (
        "Which clock do banks, airlines and appointments use?",
        "Both clocks are in daily use. Airline schedules, phones and computers show international time (EAT). "
        "In conversation, and at many local shops, offices and banks, people use the Habesha clock. "
        "When you book or confirm an appointment, say which clock you mean, for example "
        "\"ጠዋት 3 ሰዓት (9:00 AM)\", so nobody arrives six hours early or late.",
    ),
    (
        "How do I convert Ethiopian time to international time?",
        "Add 6 hours to the Habesha hour and keep the minutes. Day hours (ቀን) give a time from "
        "6:00 AM to 5:59 PM, and night hours (ሌሊት) give a time from 6:00 PM to 5:59 AM. "
        "For example, ጠዋት 4:30 is 10:30 AM, ማታ 3:00 is 9:00 PM, and ሌሊት 10:00 is 4:00 AM.",
    ),
]


def to_habesha(hour24: int, minute: int = 0) -> dict:
    """Same rule as `HabeshaTime.toHabesha` in public/js/habesha-time.js."""

    hour = (hour24 - 6) % 12 or 12
    half = "day" if 6 <= hour24 < 18 else "night"
    if hour24 < 6:
        period = "night"
    elif hour24 < 12:
        period = "morning"
    elif hour24 < 18:
        period = "afternoon"
    else:
        period = "evening"
    return {
        "text": f"{hour}:{minute:02d}",
        "half": half,
        "half_am": "ቀን" if half == "day" else "ሌሊት",
        "period_am": PERIODS[period][0],
        "period_en": PERIODS[period][1],
    }


def reference_rows() -> list[dict]:
    rows = []
    for hour24 in range(24):
        habesha = to_habesha(hour24)
        rows.append(
            {
                "intl_24": f"{hour24:02d}:00",
                "intl_12": f"{hour24 % 12 or 12}:00 {'AM' if hour24 < 12 else 'PM'}",
                **habesha,
            }
        )
    return rows


def faq_json_ld() -> str:
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": question, "acceptedAnswer": {"@type": "Answer", "text": answer}}
            for question, answer in FAQ
        ],
    }
    encoded = json.dumps(data, ensure_ascii=False)
    return encoded.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def cta_href() -> str:
    """Same target as the landing page's primary call to action."""

    try:
        from appointment.scheduler.registration import self_signup_enabled

        return "/signup" if self_signup_enabled() else "/"
    except Exception:
        return "/"


def script_version() -> str:
    path = os.path.join(frappe.get_app_path("appointment"), "public", "js", "habesha-time.js")
    try:
        return str(int(os.path.getmtime(path)))
    except OSError:
        return "1"


def get_context(context):
    canonical = get_url("/" + ROUTE)
    context.update(
        {
            "no_header": 1,
            "no_breadcrumbs": 1,
            "title": TITLE,
            "h1": H1,
            "description": DESCRIPTION,
            "canonical": canonical,
            "product_name": PRODUCT_NAME,
            "cta_href": cta_href(),
            "rows": reference_rows(),
            "faq": FAQ,
            "faq_json_ld": faq_json_ld(),
            "script_version": script_version(),
            "hours": list(range(1, 13)),
            "minutes": [f"{m:02d}" for m in range(0, 60, 5)],
        }
    )
    return context
