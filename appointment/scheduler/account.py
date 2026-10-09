"""Personal account details for the authenticated user."""
import frappe
from frappe import _
from appointment.scheduler.appearance import require_user


@frappe.whitelist(methods=['GET'])
def load():
    require_user()
    return _details(frappe.get_doc('User', frappe.session.user))


@frappe.whitelist(methods=['POST'])
def save(details):
    require_user()
    value = frappe.parse_json(details)
    if not isinstance(value, dict) or set(value) != {'first_name', 'last_name', 'mobile_no'}:
        frappe.throw(_('Provide your name and phone number only.'))
    for field, text in value.items():
        if not isinstance(text, str) or len(text) > 140:
            frappe.throw(_('Use text of up to 140 characters for account details.'))
        value[field] = text.strip()
    if not value['first_name']:
        frappe.throw(_('First name is required.'))
    user = frappe.get_doc('User', frappe.session.user)
    user.update(value)
    # Only these personal fields can be changed, always on the signed-in user.
    user.save(ignore_permissions=True)
    return _details(user)


def _details(user):
    return dict(first_name=user.first_name or '', last_name=user.last_name or '',
                full_name=user.full_name or user.name, email=user.email,
                mobile_no=user.mobile_no or '', user_image=user.user_image)
