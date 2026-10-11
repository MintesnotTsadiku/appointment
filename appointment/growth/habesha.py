"""Ethiopian (Habesha) clock helpers: the Python twin of `public/js/habesha-time.js`.

The Habesha clock counts 12 hours from sunrise (06:00) and 12 hours from
sunset (18:00): Habesha hour = international hour - 6 on a 12-hour dial, and
minutes do not change. The period words match the staff formatter
(`frontend/src/lib/time.ts`): ሌሊት night (00-05), ጠዋት morning (06-11),
ከሰዓት afternoon (12-17), ምሽት evening (18-23). Both twins are tested with
`appointment/growth/vectors/habesha.json`.
"""

from __future__ import annotations

PERIODS = {
    "night": {"am": "ሌሊት", "en": "night"},
    "morning": {"am": "ጠዋት", "en": "morning"},
    "afternoon": {"am": "ከሰዓት", "en": "afternoon"},
    "evening": {"am": "ምሽት", "en": "evening"},
}
HALVES = {"day": {"am": "ቀን", "en": "day"}, "night": {"am": "ሌሊት", "en": "night"}}
#: Periods of the day half (06:00-17:59); the others belong to the night half.
DAY_PERIODS = ("morning", "afternoon")


def period_key(hour24: int) -> str:
    if hour24 < 6:
        return "night"
    if hour24 < 12:
        return "morning"
    if hour24 < 18:
        return "afternoon"
    return "evening"


def to_habesha(hour: int, minute: int = 0) -> tuple[int, int, str]:
    """International 24-hour time to `(habesha_hour_1_to_12, minute, period_key)`."""

    return (hour - 6) % 12 or 12, minute, period_key(hour)


def from_habesha(hour: int, minute: int = 0, period: str = "morning") -> tuple[int, int]:
    """Habesha hour (1-12) with a period key, or the half "day"/"night", to `(hour24, minute)`."""

    base = 6 if period in DAY_PERIODS or period == "day" else 18
    return (base + hour % 12) % 24, minute


def half_key(hour24: int) -> str:
    return "day" if 6 <= hour24 < 18 else "night"


def parse_wall_time(value: str) -> tuple[int, int]:
    """`"HH:MM"` to `(hour, minute)`; raises ValueError when malformed."""

    hour_text, _, minute_text = str(value or "").strip().partition(":")
    hour, minute = int(hour_text), int(minute_text or 0)
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError(value)
    return hour, minute


def format_international(hour: int, minute: int) -> str:
    return f"{hour % 12 or 12}:{minute:02d} {'AM' if hour < 12 else 'PM'}"


def format_habesha(hour: int, minute: int, with_period: bool = True) -> str:
    """`"ጠዋት 2:30"` style label for an international time."""

    habesha_hour, minute, period = to_habesha(hour, minute)
    text = f"{habesha_hour}:{minute:02d}"
    return f"{PERIODS[period]['am']} {text}" if with_period else text


def format_time(value: str, lang: str = "en") -> str:
    """A stored `HH:MM` value as international (`en`) or Habesha (`am`) time."""

    hour, minute = parse_wall_time(value)
    return format_habesha(hour, minute) if lang == "am" else format_international(hour, minute)


def format_hours_range(start: str, end: str, lang: str = "en") -> str:
    """Opening hours `start`-`end` (`HH:MM`) in international (`en`) or Habesha (`am`) time.

    The Habesha form repeats the period word only when it changes:
    08:30-17:30 is `"ጠዋት 2:30 – ከሰዓት 11:30"` and 08:00-11:00 is `"ጠዋት 2:00 – 5:00"`.
    """

    if lang != "am":
        return f"{format_time(start, 'en')} – {format_time(end, 'en')}"
    start_hm, end_hm = parse_wall_time(start), parse_wall_time(end)
    start_period, end_period = period_key(start_hm[0]), period_key(end_hm[0])
    first = format_habesha(*start_hm)
    if start_period == end_period:
        return f"{first} – {format_habesha(*end_hm, with_period=False)}"
    return f"{first} – {format_habesha(*end_hm)}"
