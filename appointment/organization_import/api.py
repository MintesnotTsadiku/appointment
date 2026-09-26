"""Authenticated template download and organization workbook dry run."""

import base64
import binascii

import frappe

from appointment.content.tenancy import require_manage_business
from appointment.organization_import import workbook
from appointment.scheduler.workspace import require_provider_account


def require_scope(organization=None):
    require_provider_account()
    if organization:
        require_manage_business("Organization", organization)
    elif "Organization Manager" not in frappe.get_roles():
        frappe.throw("An organization owner account is required for workbook setup.", frappe.PermissionError)


@frappe.whitelist(methods=["GET"])
def import_context():
    from appointment.scheduler.membership import manager_organizations

    require_scope()
    return {"organizations": [{"name": name, "label": frappe.db.get_value("Organization", name, "organization_name")}
                              for name in manager_organizations()], "version": workbook.VERSION}


@frappe.whitelist(methods=["GET"])
def download_template():
    require_scope()
    frappe.local.response.filename = "organization.v1.xlsx"
    frappe.local.response.filecontent = workbook.template()
    frappe.local.response.type = "download"
    frappe.local.response.display_content_as = "attachment"


def decode_upload(content_base64):
    if not isinstance(content_base64, str) or len(content_base64) > 7 * 1024 * 1024:
        frappe.throw("Choose an XLSX workbook smaller than 5 MB.")
    try:
        return base64.b64decode(content_base64, validate=True)
    except (ValueError, binascii.Error):
        frappe.throw("Upload the original XLSX workbook again.")


@frappe.whitelist(methods=["POST"])
def preview_import(content_base64, organization=None):
    from appointment.organization_import.service import preview

    require_scope(organization)
    return preview(decode_upload(content_base64), organization)


@frappe.whitelist(methods=["POST"])
def confirm_import(content_base64, organization, expected_hash, confirmed):
    from appointment.organization_import.service import confirm

    require_scope(organization)
    return confirm(decode_upload(content_base64), organization, expected_hash, confirmed)
