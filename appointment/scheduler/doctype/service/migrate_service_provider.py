"""
Migration script to migrate existing service.provider to service_providers child table

Run this via Frappe console:
    bench --site appointment.com console < appointment/scheduler/doctype/service/migrate_service_provider.py

Or execute directly:
    cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
    exec(open('apps/appointment/appointment/scheduler/doctype/service/migrate_service_provider.py').read())
    "
"""

import frappe


def migrate_service_providers():
    """
    Migrate existing service.provider field to service_providers child table
    """
    print("Starting Service Provider migration...")
    
    # Find all Services with provider field set
    services = frappe.get_all(
        "Service",
        filters={"provider": ["!=", ""]},
        fields=["name", "provider"]
    )
    
    print(f"Found {len(services)} services with provider field set")
    
    migrated = 0
    skipped = 0
    errors = 0
    
    for svc in services:
        try:
            doc = frappe.get_doc("Service", svc.name)
            
            # Check if child table already has providers
            if hasattr(doc, 'service_providers') and doc.service_providers:
                print(f"  ⏭️  Skipping {svc.name}: Already has providers in child table")
                skipped += 1
                continue
            
            # Check if provider still exists
            if not frappe.db.exists("Provider", svc.provider):
                print(f"  ⚠️  Warning: {svc.name} has invalid provider '{svc.provider}', skipping")
                skipped += 1
                continue
            
            # Add provider to child table
            doc.append("service_providers", {
                "provider": svc.provider,
                "status": "Active",
                "is_primary": True  # Mark as primary since it was the only provider
            })
            
            # Save document
            doc.save(ignore_permissions=True)
            print(f"  ✅ Migrated {svc.name}: Added provider {svc.provider}")
            migrated += 1
            
            # Commit every 10 records
            if migrated % 10 == 0:
                frappe.db.commit()
                
        except Exception as e:
            print(f"  ❌ Error migrating {svc.name}: {str(e)}")
            errors += 1
            frappe.db.rollback()
    
    # Final commit
    frappe.db.commit()
    
    print(f"\n✅ Migration complete!")
    print(f"   Migrated: {migrated}")
    print(f"   Skipped: {skipped}")
    print(f"   Errors: {errors}")
    
    # Note: The old provider field is kept for now but can be removed after verification
    print(f"\n⚠️  Note: Old 'provider' field still exists in Service doctype.")
    print(f"   After verifying migration, you can remove it from service.json")


if __name__ == "__main__":
    migrate_service_providers()

