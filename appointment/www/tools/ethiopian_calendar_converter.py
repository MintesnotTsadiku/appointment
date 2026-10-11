"""Free Ethiopian calendar (date) converter in English and Amharic.

Today's Ethiopian date and the month table are rendered on the server so search engines and
visitors without JavaScript see them. `public/js/tools/calendar-converter.js` converts dates in
both directions with the same algorithm (`appointment.growth.ethiopian_calendar`).
"""

from __future__ import annotations

from appointment.growth import ethiopian_calendar as ec
from appointment.growth.tools import page

SLUG = "ethiopian-calendar-converter"
no_cache = 1


def today_context(lang: str) -> dict:
    today = ec.today_in_addis()
    ethiopian = ec.to_ethiopian(today)
    return {
        "today_iso": today.isoformat(),
        "today_ethiopian": ethiopian,
        "today_weekday": ec.weekday(today, lang),
        "today_label": ec.format_date(ethiopian, lang),
        "today_ethiopian_am": ec.format_date(ethiopian, "am"),
        "today_gregorian": ec.format_gregorian(today, lang),
    }


def month_rows(year: int, lang: str) -> list[dict]:
    rows = []
    for number, (amharic, english) in enumerate(ec.MONTHS, start=1):
        first = ec.to_gregorian(year, number, 1)
        rows.append(
            {
                "number": number,
                "amharic": amharic,
                "english": english,
                "days": ec.days_in_month(year, number),
                "starts": ec.format_gregorian(first, lang),
                "weekday": ec.weekday(first, lang),
            }
        )
    return rows


def get_context(context):
    page.build(context, SLUG)
    t = context.t
    lang = context.lang
    today = today_context(lang)
    year = today["today_ethiopian"].year
    strings = {
        key: t(key)
        for key in ("invalidDate", "leapNote", "commonNote", "shareText", "copyResult")
    }
    strings.update({key: t(f"tools.common.{key}") for key in ("copied", "copyFailed")})
    context.update(
        {
            **today,
            "ethiopian_year": year,
            "month_rows": month_rows(year, lang),
            "current_month": today["today_ethiopian"].month,
            "months": [{"value": i, "label": f"{am} · {en}" if lang == "en" else am} for i, (am, en) in enumerate(ec.MONTHS, start=1)],
            "gregorian_months": [
                {"value": i, "label": am if lang == "am" else en} for i, (am, en) in enumerate(ec.GREGORIAN_MONTHS, start=1)
            ],
            "days31": list(range(1, 32)),
            "days30": list(range(1, 31)),
            "tool_data": page.js_data(
                {"lang": lang, "strings": strings, "today": today["today_iso"], "linkBack": context.link_back,
                 "linkBackShort": context.link_back_short}
            ),
        }
    )
    return context
