"""
Demo Data Generation for Policies (Sprint 2)
Generates realistic policies for testing the Policy Engine
"""

import frappe
from frappe import _
from datetime import datetime, timedelta
from frappe.utils import today, add_days
import random


# =====================================================
# POLICY TEMPLATES
# =====================================================

POLICY_TEMPLATES = [
    {
        "policy_name": "Standard Deposit Policy",
        "description": "Standard 50% deposit policy for all services",
        "applies_to": "All Services",
        "deposit_percentage": 50,
        "deposit_amount": 0,
        "cancellation_window_hours": 24,
        "reschedule_window_hours": 24,
        "late_cancellation_fee_percentage": 20,
        "late_cancellation_fee_amount": 0,
        "no_show_fee_percentage": 100,
        "refund_policy": "Full Refund"
    },
    {
        "policy_name": "Premium Service Policy",
        "description": "Premium policy with higher deposit and longer cancellation window",
        "applies_to": "Specific Service",
        "deposit_percentage": 75,
        "deposit_amount": 0,
        "cancellation_window_hours": 48,
        "reschedule_window_hours": 48,
        "late_cancellation_fee_percentage": 30,
        "late_cancellation_fee_amount": 0,
        "no_show_fee_percentage": 100,
        "refund_policy": "Partial Refund"
    },
    {
        "policy_name": "Location-Based Policy",
        "description": "Policy specific to a location with fixed deposit amount",
        "applies_to": "Specific Location",
        "deposit_percentage": 0,
        "deposit_amount": 500,
        "cancellation_window_hours": 12,
        "reschedule_window_hours": 12,
        "late_cancellation_fee_percentage": 0,
        "late_cancellation_fee_amount": 200,
        "no_show_fee_percentage": 50,
        "refund_policy": "Full Refund"
    },
    {
        "policy_name": "Provider-Specific Policy",
        "description": "Policy for a specific provider with flexible terms",
        "applies_to": "Specific Provider",
        "deposit_percentage": 30,
        "deposit_amount": 0,
        "cancellation_window_hours": 6,
        "reschedule_window_hours": 6,
        "late_cancellation_fee_percentage": 10,
        "late_cancellation_fee_amount": 0,
        "no_show_fee_percentage": 75,
        "refund_policy": "Full Refund"
    },
    {
        "policy_name": "No Deposit Policy",
        "description": "Policy with no deposit required, but strict cancellation rules",
        "applies_to": "All Services",
        "deposit_percentage": 0,
        "deposit_amount": 0,
        "cancellation_window_hours": 2,
        "reschedule_window_hours": 2,
        "late_cancellation_fee_percentage": 50,
        "late_cancellation_fee_amount": 0,
        "no_show_fee_percentage": 100,
        "refund_policy": "No Refund"
    }
]


# =====================================================
# GENERATION FUNCTIONS
# =====================================================

@frappe.whitelist()
def generate_policies(count=5):
    """
    Generate demo policies with various configurations
    
    Args:
        count: Number of policies to create (default: 5)
    
    Returns:
        dict with success status and created policy names
    """
    frappe.only_for("System Manager")
    count = int(count)
    
    created = []
    
    try:
        # Get existing data to link policies
        organizations = frappe.get_all("Organization", fields=["name"], limit=10)
        services = frappe.get_all("Service", fields=["name"], limit=10)
        locations = frappe.get_all("Location", fields=["name"], limit=10)
        providers = frappe.get_all("Provider", fields=["name"], limit=10)
        
        # Check if we have organizations for "All Services" policies
        if not organizations:
            frappe.throw(_("At least one Organization is required to create 'All Services' policies. Please create Organizations first."))
        
        # Use templates or create variations
        policy_index = 0
        
        for i in range(count):
            if policy_index >= len(POLICY_TEMPLATES):
                # Create variations of existing templates
                template = random.choice(POLICY_TEMPLATES)
                policy_data = template.copy()
                policy_data["policy_name"] = f"{template['policy_name']} - Variant {i + 1}"
            else:
                policy_data = POLICY_TEMPLATES[policy_index].copy()
            
            # Determine what to link based on applies_to
            if policy_data["applies_to"] == "All Services" and organizations:
                policy_data["organization"] = organizations[i % len(organizations)]["name"]
            elif policy_data["applies_to"] == "Specific Service" and services:
                policy_data["service"] = services[i % len(services)]["name"]
            elif policy_data["applies_to"] == "Specific Location" and locations:
                policy_data["location"] = locations[i % len(locations)]["name"]
            elif policy_data["applies_to"] == "Specific Provider" and providers:
                policy_data["provider"] = providers[i % len(providers)]["name"]
            
            # Check if policy already exists
            existing = frappe.db.get_value(
                "Policy",
                {"policy_name": policy_data["policy_name"]},
                "name"
            )
            
            if existing:
                frappe.msgprint(f"Policy '{policy_data['policy_name']}' already exists, skipping", alert=True)
                policy_index += 1
                continue
            
            # Create Policy
            policy = frappe.new_doc("Policy")
            policy.policy_name = policy_data["policy_name"]
            policy.description = policy_data["description"]
            policy.is_active = 1
            policy.applies_to = policy_data["applies_to"]
            
            # Set specific links
            if policy_data["applies_to"] == "All Services" and "organization" in policy_data:
                policy.organization = policy_data["organization"]
            elif policy_data["applies_to"] == "Specific Service" and "service" in policy_data:
                policy.service = policy_data["service"]
            elif policy_data["applies_to"] == "Specific Location" and "location" in policy_data:
                policy.location = policy_data["location"]
            elif policy_data["applies_to"] == "Specific Provider" and "provider" in policy_data:
                policy.provider = policy_data["provider"]
            
            # Set deposit
            policy.deposit_percentage = policy_data["deposit_percentage"]
            policy.deposit_amount = policy_data["deposit_amount"]
            
            # Set windows
            policy.cancellation_window_hours = policy_data["cancellation_window_hours"]
            policy.reschedule_window_hours = policy_data["reschedule_window_hours"]
            
            # Set fees
            policy.late_cancellation_fee_percentage = policy_data["late_cancellation_fee_percentage"]
            policy.late_cancellation_fee_amount = policy_data["late_cancellation_fee_amount"]
            policy.no_show_fee_percentage = policy_data["no_show_fee_percentage"]
            policy.refund_policy = policy_data["refund_policy"]
            
            # Set validity
            policy.valid_from = today()
            policy.valid_to = add_days(today(), 365)  # Valid for 1 year
            
            # Mark as demo data if field exists
            if hasattr(policy, 'is_demo_data'):
                policy.is_demo_data = 1
            
            policy.insert(ignore_permissions=True)
            created.append(policy.name)
            policy_index += 1
            frappe.db.commit()
        
        message = f"✓ Created {len(created)} policies:\n" + "\n".join(f"  • {name}" for name in created)
        
        return {
            "success": True,
            "count": len(created),
            "policies": created,
            "message": message
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Policies Error")
        frappe.throw(_(f"Error generating policies: {str(e)}"))


@frappe.whitelist()
def generate_policies_for_existing_data():
    """
    Generate policies linked to existing Services, Locations, and Providers
    This creates a comprehensive set of policies for testing
    """
    frappe.only_for("System Manager")
    
    created = []
    
    try:
        # Get existing data
        organizations = frappe.get_all("Organization", fields=["name", "organization_name"], limit=5)
        services = frappe.get_all("Service", fields=["name", "service_name"], limit=5)
        locations = frappe.get_all("Location", fields=["name", "location_name"], limit=5)
        providers = frappe.get_all("Provider", fields=["name", "provider_name"], limit=5)
        
        # Check if we have organizations for "All Services" policies
        if not organizations:
            frappe.throw(_("At least one Organization is required to create 'All Services' policies. Please create Organizations first."))
        
        # 1. Create "All Services" policy for each organization (up to 2)
        for org in organizations[:min(2, len(organizations))]:
            policy_name = f"Standard Deposit Policy - {org.get('organization_name', org['name'])}"
            if not frappe.db.exists("Policy", {"policy_name": policy_name}):
                policy = frappe.new_doc("Policy")
                policy.policy_name = policy_name
                policy.description = f"Standard 50% deposit policy for all services in {org.get('organization_name', org['name'])}"
                policy.is_active = 1
                policy.applies_to = "All Services"
                policy.organization = org["name"]
                policy.deposit_percentage = 50
                policy.cancellation_window_hours = 24
                policy.reschedule_window_hours = 24
                policy.late_cancellation_fee_percentage = 20
                policy.no_show_fee_percentage = 100
                policy.refund_policy = "Full Refund"
                policy.valid_from = today()
                policy.insert(ignore_permissions=True)
                created.append(policy.name)
                frappe.db.commit()
        
        # 2. Create service-specific policies
        for service in services[:min(3, len(services))]:
            policy_name = f"Premium Policy - {service['service_name']}"
            if not frappe.db.exists("Policy", {"policy_name": policy_name}):
                policy = frappe.new_doc("Policy")
                policy.policy_name = policy_name
                policy.description = f"Premium policy for {service['service_name']}"
                policy.is_active = 1
                policy.applies_to = "Specific Service"
                policy.service = service["name"]
                policy.deposit_percentage = 75
                policy.cancellation_window_hours = 48
                policy.reschedule_window_hours = 48
                policy.late_cancellation_fee_percentage = 30
                policy.no_show_fee_percentage = 100
                policy.refund_policy = "Partial Refund"
                policy.valid_from = today()
                policy.insert(ignore_permissions=True)
                created.append(policy.name)
                frappe.db.commit()
        
        # 3. Create location-specific policies
        for location in locations[:min(2, len(locations))]:
            policy_name = f"Location Policy - {location['location_name']}"
            if not frappe.db.exists("Policy", {"policy_name": policy_name}):
                policy = frappe.new_doc("Policy")
                policy.policy_name = policy_name
                policy.description = f"Policy for {location['location_name']}"
                policy.is_active = 1
                policy.applies_to = "Specific Location"
                policy.location = location["name"]
                policy.deposit_percentage = 0
                policy.deposit_amount = 500
                policy.cancellation_window_hours = 12
                policy.reschedule_window_hours = 12
                policy.late_cancellation_fee_percentage = 0
                policy.late_cancellation_fee_amount = 200
                policy.no_show_fee_percentage = 50
                policy.refund_policy = "Full Refund"
                policy.valid_from = today()
                policy.insert(ignore_permissions=True)
                created.append(policy.name)
                frappe.db.commit()
        
        # 4. Create provider-specific policies
        for provider in providers[:min(2, len(providers))]:
            policy_name = f"Provider Policy - {provider['provider_name']}"
            if not frappe.db.exists("Policy", {"policy_name": policy_name}):
                policy = frappe.new_doc("Policy")
                policy.policy_name = policy_name
                policy.description = f"Policy for {provider['provider_name']}"
                policy.is_active = 1
                policy.applies_to = "Specific Provider"
                policy.provider = provider["name"]
                policy.deposit_percentage = 30
                policy.cancellation_window_hours = 6
                policy.reschedule_window_hours = 6
                policy.late_cancellation_fee_percentage = 10
                policy.no_show_fee_percentage = 75
                policy.refund_policy = "Full Refund"
                policy.valid_from = today()
                policy.insert(ignore_permissions=True)
                created.append(policy.name)
                frappe.db.commit()
        
        message = f"✓ Created {len(created)} policies linked to existing data:\n" + "\n".join(f"  • {name}" for name in created)
        
        return {
            "success": True,
            "count": len(created),
            "policies": created,
            "message": message
        }
    
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Generate Policies for Existing Data Error")
        frappe.throw(_(f"Error generating policies: {str(e)}"))


@frappe.whitelist()
def clear_policies():
    """Delete all demo policies"""
    frappe.only_for("System Manager")
    
    try:
        # Get all policies (or filter by is_demo_data if field exists)
        try:
            policies = frappe.get_all("Policy", filters={"is_demo_data": 1}, pluck="name")
        except Exception:
            # Field doesn't exist, get all policies (be careful!)
            policies = frappe.get_all("Policy", pluck="name", limit=100)
        
        deleted_count = 0
        
        for policy_name in policies:
            try:
                frappe.delete_doc("Policy", policy_name, ignore_permissions=True, force=1)
                deleted_count += 1
            except Exception:
                pass  # Skip if already deleted
        
        frappe.db.commit()
        return {"success": True, "message": f"Deleted {deleted_count} policies"}
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), "Demo Data: Clear Policies Error")
        frappe.throw(_(f"Error clearing policies: {str(e)}"))



