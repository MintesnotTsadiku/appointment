"""User-facing errors for the Assistants and Tasks APIs."""

import frappe


def raise_user_error(error: Exception, message: str, title: str):
	"""Raise a failed API call in the user's language.

	A Frappe error (validation, missing record, permission) already carries a translated
	message for the user, so it is raised unchanged. Anything else is logged with its
	traceback and the user gets `message`, a translated sentence without technical detail.
	"""
	if isinstance(error, frappe.ValidationError) or type(error).__module__ == "frappe.exceptions":
		raise error
	frappe.log_error(title=title, message=frappe.get_traceback())
	frappe.throw(message)
