"""Canonical public-experience demo entry points.

The rich demo owns all seeded public sites; this module remains only as a
small operational alias for callers that used the older command name.
"""

from appointment.demo import showcase as rich_demo


def seed_demo_sites():
    return rich_demo.seed()


def teardown_demo_sites():
    return rich_demo.cleanup()
