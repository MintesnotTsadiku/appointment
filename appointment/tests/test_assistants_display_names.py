"""Assignments and tasks carry the display names of the people they link to.

Profiles are named after their user's email. The list and detail APIs add the VA's
and the client's names in a fixed number of queries, however many rows they return.
"""

import unittest
from unittest.mock import patch

import frappe
from frappe.utils import add_days, nowdate

from appointment.assistants.api import assistant_api
from appointment.assistants.helpers.display_names import DisplayNames
from appointment.tasks.api import task_api

VA = {"full_name": "Selamawit Bekele", "email": "selamawit.bekele.va@example.test", "phone": "0911 63 70 01", "max_clients": 3}
CLIENTS = (
	{"full_name": "Dawit Haile", "email": "dawit.haile.client@example.test", "phone": "0911 63 70 02"},
	{"full_name": "Tsion Abebe", "email": "tsion.abebe.client@example.test", "phone": "0911 63 70 03"},
)


class DisplayNameTests(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		frappe.set_user("Administrator")
		cls._commit = patch.object(frappe.db, "commit")
		cls._commit.start()
		cls.va = assistant_api.create_va_profile(dict(VA))["data"]["name"]
		cls.clients = [assistant_api.create_client_profile(dict(row))["data"]["name"] for row in CLIENTS]
		for client in cls.clients:
			assistant_api.create_assignment(
				{"va_profile": cls.va, "client_profile": client, "assignment_model": "1:2", "start_date": nowdate()}
			)
			task_api.create_task(
				{
					"title": "Confirm the venue for the quarterly review",
					"client_profile": client,
					"assignee": cls.va,
					"deadline": f"{add_days(nowdate(), 1)} 10:00:00",
				}
			)

	@classmethod
	def tearDownClass(cls):
		frappe.db.rollback()
		cls._commit.stop()

	def test_assignment_list_and_detail_show_names(self):
		rows = assistant_api.list_assignments({"va_profile": self.va}, page_length=50)["data"]
		self.assertEqual(len(rows), 2)
		self.assertEqual({row["va_name"] for row in rows}, {VA["full_name"]})
		self.assertEqual({row["client_name"] for row in rows}, {row["full_name"] for row in CLIENTS})
		self.assertEqual({row["client_profile"] for row in rows}, set(self.clients))

		detail = assistant_api.get_assignment(rows[0]["name"])["data"]
		self.assertEqual(detail["va_name"], VA["full_name"])
		limited = assistant_api.get_assignment(rows[0]["name"], fields="name,client_profile")["data"]
		self.assertIn(limited["client_name"], {row["full_name"] for row in CLIENTS})

		for_va = assistant_api.get_clients_for_va(self.va)["data"]
		self.assertEqual({row["client_name"] for row in for_va}, {row["full_name"] for row in CLIENTS})
		for_client = assistant_api.get_vas_for_client(self.clients[0])["data"]
		self.assertEqual([row["va_name"] for row in for_client], [VA["full_name"]])

	def test_task_list_and_detail_show_names(self):
		rows = task_api.list_tasks({"assignee": self.va}, page_length=50)["data"]
		self.assertEqual(len(rows), 2)
		self.assertEqual({row["assignee_name"] for row in rows}, {VA["full_name"]})
		self.assertEqual({row["client_name"] for row in rows}, {row["full_name"] for row in CLIENTS})

		detail = task_api.get_task(rows[0]["name"])["data"]
		self.assertEqual(detail["assignee_name"], VA["full_name"])
		self.assertEqual(detail["client_profile"], rows[0]["client_profile"])
		by_client = task_api.get_tasks_by_client(self.clients[1])["data"]
		self.assertEqual([row["assignee_name"] for row in by_client], [VA["full_name"]])

	def test_names_cost_a_fixed_number_of_queries(self):
		with patch.object(frappe.db, "sql", wraps=frappe.db.sql) as sql:
			names = DisplayNames(va_ids=[self.va] * 20, client_ids=self.clients * 10)
		self.assertLessEqual(sql.call_count, 2)
		self.assertEqual(names.va(self.va), VA["full_name"])
		self.assertEqual(names.client(self.clients[1]), CLIENTS[1]["full_name"])

	def test_unknown_or_empty_ids_fall_back_without_queries(self):
		with patch.object(frappe.db, "sql", wraps=frappe.db.sql) as sql:
			names = DisplayNames()
		self.assertEqual(sql.call_count, 0)
		self.assertEqual(names.va("nobody@example.test"), "nobody@example.test")
		self.assertEqual(names.client(None), None)
