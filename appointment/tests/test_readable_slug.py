"""New businesses get a short address from their name instead of a generated one.

Reads only: `_readable_slug` checks availability and creates nothing.

Run: bench --site <site> run-tests --module appointment.tests.test_readable_slug
"""

import unittest

import frappe

from appointment.growth import short_links
from appointment.scheduler.workspace import _readable_slug


class ReadableSlugTests(unittest.TestCase):
    def test_slug_comes_from_the_business_name(self):
        slug = _readable_slug("Selam Kidane Hair Studio PLC")
        self.assertTrue(slug)
        self.assertTrue(slug.startswith("selam"))
        self.assertIsNone(short_links.problem(slug))

    def test_taken_address_is_skipped(self):
        taken = frappe.get_all("Organization", filters={"slug": ["is", "set"]}, pluck="slug", limit=1)
        if not taken:
            self.skipTest("No organization with a slug on this site.")
        self.assertNotEqual(_readable_slug(taken[0].replace("-", " ")), taken[0])

    def test_name_without_latin_letters_keeps_the_generated_address(self):
        self.assertIsNone(_readable_slug("ሰላም የውበት ሳሎን"))
