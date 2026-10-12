"""Free Ethiopian (Habesha) time converter: a server-rendered page in English and Amharic.

The 24-row reference table and the FAQ are rendered here so the page is useful without
JavaScript. `public/js/tools/time-converter.js` adds the live converter with the same rule
(`appointment.growth.habesha`): Habesha hour = international hour - 6 on a 12-hour dial.
"""

from __future__ import annotations

from appointment.growth import habesha
from appointment.growth.tools import page

SLUG = "ethiopian-time-converter"
no_cache = 1


def reference_rows(lang: str) -> list[dict]:
    rows = []
    for hour24 in range(24):
        hour, _minute, period = habesha.to_habesha(hour24, 0)
        half = habesha.half_key(hour24)
        period_am = habesha.PERIODS[period]["am"]
        half_am = habesha.HALVES[half]["am"]
        label = period_am if lang == "am" else f"{period_am} ({habesha.PERIODS[period]['en']})"
        if half_am != period_am:
            # Night hours 00-05 are ሌሊት in both names; show the word once.
            label = f"{label} · {half_am}"
        rows.append(
            {
                "intl_24": f"{hour24:02d}:00",
                "intl_12": habesha.format_international(hour24, 0),
                "text": f"{hour}:00",
                "half": half,
                "label": label,
            }
        )
    return rows


def js_strings(t) -> dict:
    keys = ("enterTime", "fromTime", "otherHalf", "dayWord", "nightWord", "nightPeriod")
    return {key: t(f"js.{key}") for key in keys}


def get_context(context):
    page.build(context, SLUG)
    t = context.t
    context.update(
        {
            "rows": reference_rows(context.lang),
            "hours": list(range(1, 13)),
            "minutes": [f"{m:02d}" for m in range(0, 60, 5)],
            "tool_data": page.js_data({"lang": context.lang, "strings": js_strings(t)}),
        }
    )
    return context
