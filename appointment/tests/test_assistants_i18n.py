"""Assistants and Tasks speak the user's language on the server too.

Every message the assistant and task APIs (and their DocType controllers) raise is
wrapped in `_()` and has an Amharic entry in the React catalog (`server.assistants`),
which `import_frontend_translations` loads into the `Translation` DocType. Frappe
errors reach the user unchanged; unexpected errors are logged and reported in plain
words, never with technical detail.
"""

import json
import re
import unittest
from pathlib import Path
from unittest.mock import patch

import frappe

from appointment.assistants.api import assistant_api
from appointment.tasks.api import task_api

APP = Path(frappe.get_app_path("appointment"))
CATALOG = APP.parent / "frontend" / "src" / "lib" / "i18n" / "translations"
SOURCES = [
	*sorted((APP / "assistants").rglob("*.py")),
	*sorted((APP / "tasks" / "api").glob("*.py")),
	*sorted((APP / "tasks" / "doctype").rglob("*.py")),
]


def _flat(value, prefix=""):
	flat = {}
	for key, item in value.items():
		full = f"{prefix}.{key}" if prefix else key
		if isinstance(item, dict):
			flat.update(_flat(item, full))
		else:
			flat[full] = item
	return flat


def _catalog():
	english = _flat(json.loads((CATALOG / "en.json").read_text(encoding="utf-8")))
	amharic = _flat(json.loads((CATALOG / "am.json").read_text(encoding="utf-8")))
	return {source: amharic.get(key) for key, source in english.items()}


def _raised(call, language):
	previous, frappe.local.lang = frappe.local.lang, language
	try:
		with patch.object(frappe.db, "commit"):
			call()
	except frappe.ValidationError as error:
		return str(error)
	finally:
		frappe.local.lang = previous
		frappe.local.message_log = []
	raise AssertionError("the call did not raise")


class AssistantServerMessageTests(unittest.TestCase):
	def test_every_server_message_has_an_amharic_entry(self):
		to_amharic = _catalog()
		messages = set()
		for path in SOURCES:
			text = path.read_text(encoding="utf-8")
			messages |= set(re.findall(r'_\("((?:[^"\\]|\\.)*)"\)', text))
			self.assertNotRegex(text, r'_\(f["\']', f"{path.name} formats inside _(), which cannot be translated")
			self.assertNotRegex(text, r'frappe\.throw\(\s*f?["\']', f"{path.name} raises an untranslated message")
		self.assertGreater(len(messages), 40)
		for message in sorted(messages):
			with self.subTest(message=message):
				self.assertTrue(to_amharic.get(message), "missing from the catalog")
				self.assertNotEqual(to_amharic[message], message)

	def test_validation_errors_reach_the_user_in_their_language(self):
		to_amharic = _catalog()
		self.assertEqual(_raised(lambda: task_api.create_task({}), "en"), "Enter a task title.")
		self.assertEqual(_raised(lambda: task_api.create_task({}), "am"), to_amharic["Enter a task title."])
		self.assertEqual(
			_raised(lambda: assistant_api.create_va_profile({"email": "x@example.test"}), "am"),
			to_amharic["Enter the full name."],
		)

	def test_unexpected_errors_are_logged_and_reported_in_plain_words(self):
		with (
			patch.object(frappe.db, "exists", return_value=True),
			patch.object(frappe, "get_doc", side_effect=RuntimeError("database exploded")),
			patch.object(frappe, "log_error") as log_error,
		):
			message = _raised(lambda: task_api.get_task("TASK-0001"), "en")
		self.assertEqual(message, "Could not load the task. Please try again.")
		self.assertNotIn("exploded", message)
		log_error.assert_called_once()
