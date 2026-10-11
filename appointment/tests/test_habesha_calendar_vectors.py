"""The Python Habesha clock and Ethiopian calendar helpers pass the vectors shared with the JS twins."""

from __future__ import annotations

import datetime
import json
import os
import unittest

import frappe

from appointment.growth import ethiopian_calendar as ec
from appointment.growth import habesha


def _vectors(name: str) -> dict:
    with open(os.path.join(frappe.get_app_path("appointment"), "growth", "vectors", name), encoding="utf-8") as handle:
        return json.load(handle)


class TestHabeshaVectors(unittest.TestCase):
    def test_conversions_and_ranges(self):
        vectors = _vectors("habesha.json")
        for key, word in vectors["periods"].items():
            self.assertEqual(habesha.PERIODS[key]["am"], word)
        for hour, minute, habesha_hour, period in vectors["to_habesha"]:
            self.assertEqual(habesha.to_habesha(hour, minute), (habesha_hour, minute, period))
        for habesha_hour, minute, half, hour in vectors["from_habesha"]:
            self.assertEqual(habesha.from_habesha(habesha_hour, minute, half), (hour, minute))
        for start, end, english, amharic in vectors["ranges"]:
            self.assertEqual(habesha.format_hours_range(start, end, "en"), english)
            self.assertEqual(habesha.format_hours_range(start, end, "am"), amharic)

    def test_round_trip_with_period_keys(self):
        for hour in range(24):
            for minute in (0, 1, 30, 59):
                habesha_hour, _, period = habesha.to_habesha(hour, minute)
                self.assertEqual(habesha.from_habesha(habesha_hour, minute, period), (hour, minute))

    def test_rejects_malformed_times(self):
        for value in ("24:00", "7:60", "", "noon"):
            with self.assertRaises(ValueError):
                habesha.parse_wall_time(value)


class TestEthiopianCalendarVectors(unittest.TestCase):
    def test_known_dates_both_ways(self):
        vectors = _vectors("ethiopian_calendar.json")
        for iso, ethiopian, note in vectors["pairs"]:
            date = datetime.date.fromisoformat(iso)
            self.assertEqual(tuple(ec.to_ethiopian(date)), tuple(ethiopian), note)
            self.assertEqual(ec.to_gregorian(*ethiopian), date, note)
        for year in vectors["leap_years"]:
            self.assertTrue(ec.is_leap(year))
        for year in vectors["common_years"]:
            self.assertFalse(ec.is_leap(year))
        for invalid in vectors["invalid"]:
            with self.assertRaises(ValueError):
                ec.to_gregorian(*invalid)

    def test_every_day_for_ten_years_round_trips(self):
        day = datetime.date(2020, 1, 1)
        while day < datetime.date(2030, 1, 1):
            self.assertEqual(ec.to_gregorian(*ec.to_ethiopian(day)), day)
            day += datetime.timedelta(days=1)

    def test_labels(self):
        self.assertEqual(ec.format_date((2017, 1, 1), "am"), "መስከረም 1 ቀን 2017 ዓ.ም.")
        self.assertEqual(ec.format_gregorian(datetime.date(2024, 9, 11), "am"), "ሴፕቴምበር 11 ቀን 2024")
        self.assertEqual(ec.weekday(datetime.date(2026, 10, 12), "am"), "ሰኞ")
