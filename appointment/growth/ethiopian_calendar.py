"""Ethiopian (Ge'ez) calendar conversion: the Python twin of `public/js/tools/ethiopian-calendar.js`.

The Ethiopian year has 12 months of 30 days and a 13th month, Pagume, of 5
days (6 in a leap year). An Ethiopian year is a leap year when `year % 4 == 3`,
so Pagume 6 falls just before a Gregorian leap year. Both directions go
through the Julian Day Number. Both twins are tested with
`appointment/growth/vectors/ethiopian_calendar.json`.
"""

from __future__ import annotations

import datetime

#: Julian Day Number of the day before Meskerem 1, year 1 (Amete Mihret era).
EPOCH = 1723856

MONTHS = (
    ("መስከረም", "Meskerem"),
    ("ጥቅምት", "Tikimt"),
    ("ኅዳር", "Hidar"),
    ("ታኅሣሥ", "Tahsas"),
    ("ጥር", "Tir"),
    ("የካቲት", "Yekatit"),
    ("መጋቢት", "Megabit"),
    ("ሚያዝያ", "Miyazya"),
    ("ግንቦት", "Ginbot"),
    ("ሰኔ", "Sene"),
    ("ሐምሌ", "Hamle"),
    ("ነሐሴ", "Nehase"),
    ("ጳጉሜ", "Pagume"),
)
GREGORIAN_MONTHS = (
    ("ጃንዩወሪ", "January"),
    ("ፌብሩወሪ", "February"),
    ("ማርች", "March"),
    ("ኤፕሪል", "April"),
    ("ሜይ", "May"),
    ("ጁን", "June"),
    ("ጁላይ", "July"),
    ("ኦገስት", "August"),
    ("ሴፕቴምበር", "September"),
    ("ኦክቶበር", "October"),
    ("ኖቬምበር", "November"),
    ("ዲሴምበር", "December"),
)
WEEKDAYS = (
    ("ሰኞ", "Monday"),
    ("ማክሰኞ", "Tuesday"),
    ("ረቡዕ", "Wednesday"),
    ("ሐሙስ", "Thursday"),
    ("ዓርብ", "Friday"),
    ("ቅዳሜ", "Saturday"),
    ("እሑድ", "Sunday"),
)


class EthiopianDate(tuple):
    """`(year, month, day)` with month 13 for Pagume."""

    def __new__(cls, year: int, month: int, day: int):
        if not is_valid(year, month, day):
            raise ValueError(f"Invalid Ethiopian date {year}-{month}-{day}")
        return super().__new__(cls, (year, month, day))

    year = property(lambda self: self[0])
    month = property(lambda self: self[1])
    day = property(lambda self: self[2])


def is_leap(year: int) -> bool:
    return year % 4 == 3


def days_in_month(year: int, month: int) -> int:
    if month == 13:
        return 6 if is_leap(year) else 5
    return 30


def is_valid(year: int, month: int, day: int) -> bool:
    return year >= 1 and 1 <= month <= 13 and 1 <= day <= days_in_month(year, month)


def to_jdn(year: int, month: int, day: int) -> int:
    return EPOCH + 365 + 365 * (year - 1) + year // 4 + 30 * month + day - 31


def from_jdn(jdn: int) -> EthiopianDate:
    cycle, rest = divmod(jdn - EPOCH, 1461)
    year = 4 * cycle + rest // 365 - rest // 1460
    day_of_year = rest % 365 + 365 * (rest // 1460)
    return EthiopianDate(year, day_of_year // 30 + 1, day_of_year % 30 + 1)


def to_ethiopian(date: datetime.date) -> EthiopianDate:
    """Gregorian date to Ethiopian date."""

    return from_jdn(date.toordinal() + 1721425)


def to_gregorian(year: int, month: int, day: int) -> datetime.date:
    """Ethiopian date to Gregorian date; raises ValueError for an invalid date."""

    EthiopianDate(year, month, day)
    return datetime.date.fromordinal(to_jdn(year, month, day) - 1721425)


def format_date(date: tuple[int, int, int], lang: str = "en") -> str:
    """`"Meskerem 1, 2017"` in English, `"መስከረም 1 ቀን 2017 ዓ.ም."` in Amharic."""

    year, month, day = date
    if lang == "am":
        return f"{MONTHS[month - 1][0]} {day} ቀን {year} ዓ.ም."
    return f"{MONTHS[month - 1][1]} {day}, {year}"


def format_gregorian(date: datetime.date, lang: str = "en") -> str:
    """`"September 11, 2024"` in English, `"ሴፕቴምበር 11 ቀን 2024"` in Amharic."""

    amharic, english = GREGORIAN_MONTHS[date.month - 1]
    return f"{amharic} {date.day} ቀን {date.year}" if lang == "am" else f"{english} {date.day}, {date.year}"


def weekday(date: datetime.date, lang: str = "en") -> str:
    return WEEKDAYS[date.weekday()][0 if lang == "am" else 1]


def today_in_addis() -> datetime.date:
    """Today's date in Addis Ababa (UTC+3, no daylight saving time)."""

    now = datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=3)
    return now.date()
