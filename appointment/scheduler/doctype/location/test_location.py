# Copyright (c) 2025, minte and Contributors
# See license.txt

import json
from collections import Counter
from pathlib import Path

from frappe.tests import IntegrationTestCase, UnitTestCase


# On IntegrationTestCase, the doctype test records and all
# link-field test record dependencies are recursively loaded
# Use these module variables to add/remove to/from that list
EXTRA_TEST_RECORD_DEPENDENCIES = []  # eg. ["User"]
IGNORE_TEST_RECORD_DEPENDENCIES = []  # eg. ["User"]


class UnitTestLocation(UnitTestCase):
	"""
	Unit tests for Location.
	Use this class for testing individual functions and methods.
	"""

	def test_each_field_is_defined_once_and_in_the_field_order(self):
		definition = json.loads((Path(__file__).parent / "location.json").read_text())
		names = [field["fieldname"] for field in definition["fields"]]
		self.assertEqual([name for name, count in Counter(names).items() if count > 1], [])
		self.assertEqual(sorted(names), sorted(definition["field_order"]))


class IntegrationTestLocation(IntegrationTestCase):
	"""
	Integration tests for Location.
	Use this class for testing interactions between multiple components.
	"""

	pass
