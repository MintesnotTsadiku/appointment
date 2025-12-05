"""
Cleanup utility for orphaned Event DocType Link records
"""

import frappe
from frappe import _


@frappe.whitelist()
def cleanup_orphaned_event_links():
    """
    Clean up orphaned Event DocType Link records that reference non-existent Event records.
    This prevents deletion errors when trying to delete User Appointment Availability records.
    """
    frappe.only_for("System Manager")
    
    try:
        # Find orphaned links (links to Event records that don't exist)
        orphaned_links = frappe.db.sql("""
            SELECT name, parent, reference_doctype, reference_docname
            FROM `tabEvent DocType Link` 
            WHERE parent NOT IN (SELECT name FROM tabEvent)
        """, as_dict=True)
        
        deleted_count = 0
        for link in orphaned_links:
            try:
                frappe.db.delete("Event DocType Link", {"name": link.name})
                deleted_count += 1
            except Exception as e:
                frappe.log_error(str(e), f"Cleanup: Error deleting orphaned link {link.name}")
        
        frappe.db.commit()
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Cleaned up {deleted_count} orphaned Event DocType Link records"
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Cleanup: Orphaned Event Links Error")
        return {
            "success": False,
            "error": str(e)
        }







