"""
Script to clean up orphaned records in the database
Run with: bench --site [sitename] execute frappe_appointment.scripts.cleanup_orphans.cleanup
"""

import frappe

def cleanup():
    """Clean up orphaned records that reference non-existent documents"""
    
    print("Starting cleanup of orphaned records...")
    
    # 1. Clean up Provider Organization entries with non-existent providers
    try:
        result = frappe.db.sql("""
            DELETE FROM `tabProvider Organization` 
            WHERE parent NOT IN (SELECT name FROM `tabProvider`)
        """)
        print(f"Cleaned up orphaned Provider Organization entries")
    except Exception as e:
        print(f"Error cleaning Provider Organization: {e}")
    
    # 2. Clean up Service Provider entries with non-existent providers or services
    try:
        frappe.db.sql("""
            DELETE FROM `tabService Provider` 
            WHERE provider NOT IN (SELECT name FROM `tabProvider`)
            OR parent NOT IN (SELECT name FROM `tabService`)
        """)
        print(f"Cleaned up orphaned Service Provider entries")
    except Exception as e:
        print(f"Error cleaning Service Provider: {e}")
    
    # 3. Delete EventTypes with invalid references
    try:
        event_types = frappe.get_all("EventType", fields=["name", "provider", "service", "location"])
        deleted = 0
        for et in event_types:
            provider_exists = frappe.db.exists("Provider", et.get("provider")) if et.get("provider") else False
            service_exists = frappe.db.exists("Service", et.get("service")) if et.get("service") else False
            location_exists = frappe.db.exists("Location", et.get("location")) if et.get("location") else False
            
            if not (provider_exists and service_exists and location_exists):
                try:
                    frappe.delete_doc("EventType", et["name"], ignore_permissions=True, force=1)
                    deleted += 1
                except Exception as e:
                    print(f"Error deleting EventType {et['name']}: {e}")
        
        print(f"Deleted {deleted} orphaned EventTypes")
    except Exception as e:
        print(f"Error cleaning EventTypes: {e}")
    
    # 4. Clean up orphaned Event DocType Link records
    try:
        frappe.db.sql("""
            DELETE FROM `tabEvent DocType Link` 
            WHERE parent NOT IN (SELECT name FROM tabEvent)
        """)
        print(f"Cleaned up orphaned Event DocType Link entries")
    except Exception as e:
        print(f"Error cleaning Event DocType Link: {e}")
    
    frappe.db.commit()
    print("Cleanup complete!")






