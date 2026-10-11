"""Free Amharic appointment reminder message generator, in English and Amharic.

Messages are built in the browser (`public/js/tools/reminder.js`); nothing typed is sent to the
server. The message templates come from the catalog group `tools.reminder.tpl` in both languages,
because every page shows an Amharic and an English message.
"""

from __future__ import annotations

import datetime

from appointment.growth import ethiopian_calendar as ec
from appointment.growth.tools import page
from appointment.growth.tools.catalog import english_catalog

SLUG = "amharic-appointment-reminder"
TEMPLATE_GROUP = "tools.reminder.tpl"
no_cache = 1


def templates(t) -> dict:
    prefix = TEMPLATE_GROUP + "."
    keys = [key[len(prefix) :] for key in english_catalog() if key.startswith(prefix)]
    return {key: t.both(prefix + key) for key in keys}


def get_context(context):
    page.build(context, SLUG)
    t = context.t
    lang = context.lang
    tomorrow = ec.today_in_addis() + datetime.timedelta(days=1)
    ethiopian = ec.to_ethiopian(tomorrow)
    strings = {key: t(key) for key in ("characters", "segments", "encodingUnicode", "encodingGsm")}
    strings["ethiopianTimeSuffix"] = t.both("ethiopianTimeSuffix")
    strings.update({key: t(f"tools.common.{key}") for key in ("copied", "copyFailed")})
    context.update(
        {
            "examples": {key: t(key + "Example") for key in ("business", "customer", "service", "location")},
            "ethiopian_months": [{"value": i, "label": am if lang == "am" else f"{am} · {en}"} for i, (am, en) in enumerate(ec.MONTHS, 1)],
            "gregorian_months": [{"value": i, "label": am if lang == "am" else en} for i, (am, en) in enumerate(ec.GREGORIAN_MONTHS, 1)],
            "default_gregorian": tomorrow,
            "default_ethiopian": ethiopian,
            "year_options": [ethiopian.year - 1, ethiopian.year, ethiopian.year + 1],
            "gregorian_years": [tomorrow.year - 1, tomorrow.year, tomorrow.year + 1],
            "hours": list(range(1, 13)),
            "minutes": ["00", "15", "30", "45"],
            "tool_data": page.js_data(
                {"lang": lang, "strings": strings, "templates": templates(t), "linkBack": context.link_back}
            ),
        }
    )
    return context
