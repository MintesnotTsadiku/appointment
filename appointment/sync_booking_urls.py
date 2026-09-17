"""
Script to sync booking URLs for all providers and organizations
Run this after generating demo data to ensure all booking URLs are created
"""

import frappe
from appointment.scheduler.booking_url_manager import (
    sync_booking_urls_for_provider,
    sync_booking_urls_for_organization
)


@frappe.whitelist()
def sync_all_booking_urls():
    """
    Sync booking URLs for all providers and organizations
    """
    frappe.only_for("System Manager")
    
    results = {
        "providers_synced": 0,
        "organizations_synced": 0,
        "providers_with_urls": 0,
        "organizations_with_urls": 0,
        "errors": []
    }
    
    try:
        # Sync all providers
        all_providers = frappe.get_all("Provider", pluck="name")
        print(f"Syncing booking URLs for {len(all_providers)} providers...")
        
        for provider_name in all_providers:
            try:
                sync_booking_urls_for_provider(provider_name)
                results["providers_synced"] += 1
                
                # Check if URLs were created
                provider = frappe.get_doc("Provider", provider_name)
                if provider.email:
                    availability = frappe.db.get_value(
                        "User Appointment Availability",
                        {"user": provider.email},
                        "name"
                    )
                    if availability:
                        avail_doc = frappe.get_doc("User Appointment Availability", availability)
                        if hasattr(avail_doc, 'booking_urls') and avail_doc.booking_urls:
                            results["providers_with_urls"] += 1
            except Exception as e:
                error_msg = f"Provider {provider_name}: {str(e)}"
                results["errors"].append(error_msg)
                frappe.log_error(str(e), f"Sync Booking URLs: Provider {provider_name}")
        
        frappe.db.commit()
        
        # Sync all organizations
        all_orgs = frappe.get_all("Organization", pluck="name")
        print(f"Syncing booking URLs for {len(all_orgs)} organizations...")
        
        for org_name in all_orgs:
            try:
                sync_booking_urls_for_organization(org_name)
                results["organizations_synced"] += 1
                
                # Check if URLs were created
                org_doc = frappe.get_doc("Organization", org_name)
                if hasattr(org_doc, 'booking_urls') and org_doc.booking_urls:
                    results["organizations_with_urls"] += 1
            except Exception as e:
                error_msg = f"Organization {org_name}: {str(e)}"
                results["errors"].append(error_msg)
                frappe.log_error(str(e), f"Sync Booking URLs: Organization {org_name}")
        
        frappe.db.commit()
        
        message = f"""✓ Booking URLs synced successfully!

Providers: {results['providers_synced']} synced ({results['providers_with_urls']} with URLs)
Organizations: {results['organizations_synced']} synced ({results['organizations_with_urls']} with URLs)"""
        
        if results["errors"]:
            message += f"\n\n⚠️ {len(results['errors'])} errors occurred (check logs for details)"
        
        return {
            "success": True,
            "message": message,
            **results
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Sync All Booking URLs Error")
        frappe.throw(f"Error syncing booking URLs: {str(e)}")












