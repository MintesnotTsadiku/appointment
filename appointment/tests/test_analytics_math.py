"""Focused deterministic tests for analytics definitions."""

import csv
import io
import unittest
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import frappe

from appointment.scheduler import analytics


class AnalyticsMathTest(unittest.TestCase):
    def test_interval_union_does_not_double_count_overlaps(self):
        self.assertEqual(analytics._interval_minutes([(0, 120), (60, 180), (180, 240)]), 240)

    def test_multi_provider_capacity_is_summed_not_merged(self):
        intervals = {
            "provider-a": [(0, 120), (60, 180)],
            "provider-b": [(0, 180)],
        }
        self.assertEqual(analytics._minutes_by_provider(intervals), 360)

    def test_no_show_denominator_and_status_semantics(self):
        now = datetime(2026, 9, 23, 12, 0, tzinfo=ZoneInfo("Africa/Addis_Ababa"))
        rows = [
            frappe._dict(appointment_date=date(2026, 9, 22), end_time=time(10), status="Completed"),
            frappe._dict(appointment_date=date(2026, 9, 22), end_time=time(11), status="No Show"),
            frappe._dict(appointment_date=date(2026, 9, 22), end_time=time(12), status="Cancelled"),
            frappe._dict(appointment_date=date(2026, 9, 23), end_time=time(13), status="No Show"),
            frappe._dict(appointment_date=date(2026, 9, 22), end_time=time(13), status="Confirmed"),
        ]
        metric = analytics._no_show(rows, now)
        self.assertEqual((metric["numerator"], metric["denominator"], metric["rate"]), (1, 2, 50.0))

    def test_zero_denominator_is_unavailable_not_zero(self):
        metric = analytics._no_show([], datetime(2026, 9, 23, tzinfo=timezone.utc))
        self.assertFalse(metric["available"])
        self.assertIsNone(metric["rate"])
        self.assertEqual(metric["denominator"], 0)

    def test_business_timezone_controls_period_boundary(self):
        instant = datetime(2026, 9, 22, 21, 30, tzinfo=timezone.utc)
        local_now, start, end = analytics._period_bounds(instant, ZoneInfo("Africa/Addis_Ababa"), 7)
        self.assertEqual(local_now.date(), date(2026, 9, 23))
        self.assertEqual((start, end), (date(2026, 9, 17), date(2026, 9, 23)))

    def test_occupied_union_includes_no_show_and_buffers_not_cancelled(self):
        day = date(2026, 9, 23)
        rows = [
            frappe._dict(appointment_date=day, start_time=time(9), end_time=time(10), status="Completed", provider="p", service="s", occupied_from=None, occupied_until=None, booking_timezone="UTC"),
            frappe._dict(appointment_date=day, start_time=time(9, 30), end_time=time(10, 30), status="No Show", provider="p", service="s", occupied_from=None, occupied_until=None, booking_timezone="UTC"),
            frappe._dict(appointment_date=day, start_time=time(11), end_time=time(12), status="Cancelled", provider="p", service="s", occupied_from=None, occupied_until=None, booking_timezone="UTC"),
        ]
        self.assertEqual(analytics._occupied_minutes(rows, day, day, ZoneInfo("UTC"), {"s": (15, 15)}), 120)

    def test_csv_formula_prefix_and_quoting(self):
        self.assertEqual(analytics._csv_safe(" =2+2"), "' =2+2")
        output = io.StringIO()
        csv.writer(output).writerow([analytics._csv_safe("+SUM(A1:A2)"), 'A, "quoted" name'])
        self.assertIn("'+SUM", output.getvalue())
        self.assertIn('"A, ""quoted"" name"', output.getvalue())


def run():
    result = unittest.TextTestRunner(verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(AnalyticsMathTest)
    )
    if not result.wasSuccessful():
        raise AssertionError("Analytics math tests failed")
    return {"passed": True, "tests": result.testsRun}
