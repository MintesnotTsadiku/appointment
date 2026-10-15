"""Fixture for qa/manifests/growth/assistants-am-dark.yaml.

Creates a small, realistic assistant practice: three virtual assistants, three
clients, three assignments and six tasks around today (one overdue, one done), so
the VA profiles, client profiles, assignments and tasks pages have content to show
in Amharic and English. Cleanup deletes exactly these records, by name: the tasks
of the three clients, their assignments, the profiles and their users.

Run `setup` before the manifest and `cleanup` after it.
"""

from unittest.mock import patch

import frappe
from frappe.utils import add_days, nowdate

from appointment.assistants.api import assistant_api
from appointment.tasks.api import task_api

VAS = (
	{"full_name": "Hiwot Assefa", "email": "hiwot.assefa.va@example.test", "phone": "0911 52 40 11", "assistant_tier": "senior", "max_clients": 3},
	{"full_name": "Bethlehem Girma", "email": "bethlehem.girma.va@example.test", "phone": "0911 52 40 12", "assistant_tier": "standard", "max_clients": 2},
	{"full_name": "Yonas Mekonnen", "email": "yonas.mekonnen.va@example.test", "phone": "0911 52 40 13", "assistant_tier": "junior", "max_clients": 1},
)
CLIENTS = (
	{"full_name": "Liya Tesfaye", "email": "liya.tesfaye.client@example.test", "phone": "0911 52 40 21"},
	{"full_name": "Samuel Alemayehu", "email": "samuel.alemayehu.client@example.test", "phone": "0911 52 40 22"},
	{"full_name": "Meseret Desta", "email": "meseret.desta.client@example.test", "phone": "0911 52 40 23"},
)
# (assistant index, client index, model)
ASSIGNMENTS = ((0, 0, "1:2"), (0, 1, "1:2"), (1, 2, "1:1"))
# (title, client index, assistant index or None, priority, status, day offset, time, minutes)
TASKS = (
	("Book flights to Bahir Dar for the board retreat", 2, 1, "Urgent", "Requested", 0, "16:00", 45),
	("Confirm Friday supplier deliveries", 0, 0, "High", "In Progress", 1, "10:00", 30),
	("Prepare the monthly sales summary", 1, 0, "Medium", "Assigned", 2, "14:30", 90),
	("Update the client contact list", 1, None, "Low", "Requested", 4, "11:00", 60),
	("Reply to customer emails from the weekend", 0, 0, "Low", "Completed", -1, "09:00", 40),
	("Renew the business licence paperwork", 2, 1, "High", "Assigned", -2, "15:00", 120),
)
EMAILS = tuple(row["email"] for row in VAS + CLIENTS)


def setup():
	frappe.set_user("Administrator")
	cleanup()
	with patch.object(frappe.db, "commit"):
		vas = [assistant_api.create_va_profile(dict(row))["data"]["name"] for row in VAS]
		clients = [assistant_api.create_client_profile(dict(row))["data"]["name"] for row in CLIENTS]
		for va, client, model in ASSIGNMENTS:
			assistant_api.create_assignment(
				{"va_profile": vas[va], "client_profile": clients[client], "assignment_model": model, "start_date": add_days(nowdate(), -30)}
			)
		for title, client, va, priority, status, offset, time, minutes in TASKS:
			task_api.create_task(
				{
					"title": title,
					"client_profile": clients[client],
					"assignee": vas[va] if va is not None else None,
					"priority": priority,
					"status": status,
					"deadline": f"{add_days(nowdate(), offset)} {time}:00",
					"estimated_duration": minutes,
				}
			)
	frappe.db.commit()
	return browser_values()


def browser_values(manifest=None):
	return {
		"qa_va_name": VAS[0]["full_name"],
		"qa_client_name": CLIENTS[0]["full_name"],
		# Assignment cards show the client's name, with the profile id (the email) under it.
		"qa_client_email": CLIENTS[0]["email"],
		"qa_task_title": TASKS[1][0],
	}


def cleanup():
	frappe.set_user("Administrator")
	clients = [email for email in (row["email"] for row in CLIENTS) if frappe.db.exists("Client Profile", email)]
	vas = [email for email in (row["email"] for row in VAS) if frappe.db.exists("VA Profile", email)]
	if clients:
		for name in frappe.get_all("Task", filters={"client_profile": ["in", clients]}, pluck="name"):
			frappe.delete_doc("Task", name, ignore_permissions=True, force=True)
		for name in frappe.get_all("Assistant Client Assignment", filters={"client_profile": ["in", clients]}, pluck="name"):
			frappe.delete_doc("Assistant Client Assignment", name, ignore_permissions=True, force=True)
	if vas:
		for name in frappe.get_all("Assistant Client Assignment", filters={"assistant": ["in", vas]}, pluck="name"):
			frappe.delete_doc("Assistant Client Assignment", name, ignore_permissions=True, force=True)
	for name in clients:
		frappe.delete_doc("Client Profile", name, ignore_permissions=True, force=True)
	for name in vas:
		frappe.delete_doc("VA Profile", name, ignore_permissions=True, force=True)
	for email in EMAILS:
		if frappe.db.exists("User", email):
			frappe.delete_doc("User", email, ignore_permissions=True, force=True)
	frappe.db.commit()
