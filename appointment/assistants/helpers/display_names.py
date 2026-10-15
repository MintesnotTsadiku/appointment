"""Display names for the people that assignments and tasks link to.

Client and VA profiles are named after their user's email, so a raw link shows an
email. These helpers add the person's name to API rows in two batched queries, however
many rows there are. Callers pass rows they already read with permission checks; the
name is the link's title, like Frappe's own link titles.
"""

import frappe


class DisplayNames:
	"""Looks up the names of a batch of VA and client profile ids."""

	def __init__(self, va_ids=(), client_ids=()):
		self.vas = self._va_names(_ids(va_ids))
		self.clients = self._client_names(_ids(client_ids))

	def va(self, va_id):
		return self.vas.get(va_id) or va_id

	def client(self, client_id):
		return self.clients.get(client_id) or client_id

	@staticmethod
	def _va_names(ids):
		if not ids:
			return {}
		rows = frappe.get_all("User", filters={"name": ["in", ids]}, fields=["name", "full_name"])
		return {row.name: row.full_name for row in rows if row.full_name}

	@staticmethod
	def _client_names(ids):
		if not ids:
			return {}
		Client, User = frappe.qb.DocType("Client Profile"), frappe.qb.DocType("User")
		rows = (
			frappe.qb.from_(Client)
			.left_join(User)
			.on(User.name == Client.user)
			.select(Client.name, Client.full_name, User.full_name)
			.where(Client.name.isin(ids))
		).run()
		# The profile's own name wins; the user's name covers profiles saved without one.
		return {name: own or user for name, own, user in rows if own or user}


def add_task_names(tasks):
	"""Add `client_name` and `assignee_name` to task rows (dicts) in place."""
	names = DisplayNames(
		va_ids=[task.get("assignee") for task in tasks],
		client_ids=[task.get("client_profile") for task in tasks],
	)
	for task in tasks:
		if "client_profile" in task:
			task["client_name"] = names.client(task.get("client_profile"))
		if "assignee" in task:
			task["assignee_name"] = names.va(task.get("assignee")) if task.get("assignee") else None
	return tasks


def add_assignment_names(assignments):
	"""Add `va_name` and `client_name` to assignment rows (dicts) in place."""
	names = DisplayNames(
		va_ids=[row.get("va_profile") for row in assignments],
		client_ids=[row.get("client_profile") for row in assignments],
	)
	for row in assignments:
		if "va_profile" in row:
			row["va_name"] = names.va(row.get("va_profile"))
		if "client_profile" in row:
			row["client_name"] = names.client(row.get("client_profile"))
	return assignments


def _ids(values):
	return sorted({value for value in values if value})
