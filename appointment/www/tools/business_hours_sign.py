"""Free bilingual business-hours sign maker, in English and Amharic.

The sample sign is rendered on the server with `appointment.growth.habesha`, so the page shows a
complete sign without JavaScript. `public/js/tools/hours-sign.js` rebuilds it from the editor with
the same rules.
"""

from __future__ import annotations

from appointment.growth import habesha
from appointment.growth.ethiopian_calendar import WEEKDAYS
from appointment.growth.tools import colors, page
from appointment.growth.tools.catalog import text

SLUG = "business-hours-sign"
no_cache = 1

#: Sample week: Monday first, as on most Ethiopian shop signs.
DEFAULT_WEEK = (
    [("08:30", "17:30")],
    [("08:30", "17:30")],
    [("08:30", "17:30")],
    [("08:30", "17:30")],
    [("08:30", "17:30")],
    [("09:00", "13:00")],
    [],
)


def week_rows(week=DEFAULT_WEEK) -> list[dict]:
    rows = []
    for index, ranges in enumerate(week):
        amharic, english = WEEKDAYS[index]
        rows.append(
            {
                "index": index,
                "amharic": amharic,
                "english": english,
                "ranges": [
                    {
                        "start": start,
                        "end": end,
                        "intl": habesha.format_hours_range(start, end, "en"),
                        "habesha": habesha.format_hours_range(start, end, "am"),
                    }
                    for start, end in ranges
                ],
            }
        )
    return rows


def get_context(context):
    page.build(context, SLUG)
    t = context.t
    strings = {key: t.both(key) for key in ("closed", "kicker", "phone", "bookOnline")}
    strings["credit"] = t("credit", "{0}")
    strings.update({key: t(key) for key in ("addBreak", "removeBreak", "open")})
    strings["closedToggle"] = t("closed")
    context.update(
        {
            "rows": week_rows(),
            "sign_strings": strings,
            "default_color": context.colors["brand"],
            "default_color_ink": "#ffffff" if colors.contrast(colors.parse(context.colors["brand"]), (255, 255, 255)) >= 4.5 else "#111111",
            "business_example": t("businessExample"),
            # The app's shared phone hint, the same text as every other phone field.
            "phone_hint": text("controls.phone.hint", context.lang),
            "tool_data": page.js_data(
                {
                    "lang": context.lang,
                    "strings": strings,
                    "week": [[list(r) for r in day] for day in DEFAULT_WEEK],
                    "weekdays": [list(day) for day in WEEKDAYS],
                    "linkBack": context.link_back,
                    "linkBackShort": context.link_back_short,
                }
            ),
        }
    )
    return context
