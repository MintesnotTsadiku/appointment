"""
Create Policy Demo Data Script

Run this in Frappe console to create demo policies:

    bench --site appointment.com console < scripts/create_policy_demo_data.py

Or copy-paste sections into the console interactively.
"""

import frappe
from frappe.utils import today, add_days

print("\n" + "="*80)
print("📋 CREATING POLICY DEMO DATA FOR SPRINT 2")
print("="*80 + "\n")

# Import the demo data functions
from frappe_appointment.demo_data_policies import generate_policies_for_existing_data, generate_policies

# Step 1: Check existing data
print("📊 Step 1: Checking existing data...")
services = frappe.get_all("Service", fields=["name"], limit=10)
locations = frappe.get_all("Location", fields=["name"], limit=10)
providers = frappe.get_all("Provider", fields=["name"], limit=10)

print(f"  ✓ Services: {len(services)}")
print(f"  ✓ Locations: {len(locations)}")
print(f"  ✓ Providers: {len(providers)}\n")

if not services and not locations and not providers:
    print("  ⚠ No services, locations, or providers found!")
    print("  → Please create demo data first using:")
    print("     frappe.call('frappe_appointment.demo_data.generate_all_demo_data')\n")
    print("  → Or create policies manually via Desk UI\n")
else:
    # Step 2: Generate policies linked to existing data
    print("📋 Step 2: Generating policies linked to existing data...")
    try:
        result = generate_policies_for_existing_data()
        if result.get("success"):
            print(f"  ✓ {result.get('message', 'Policies created')}\n")
        else:
            print(f"  ✗ Error: {result.get('message', 'Unknown error')}\n")
    except Exception as e:
        print(f"  ✗ Error: {str(e)}\n")
        frappe.log_error(str(e), "Policy Demo Data: Generation Error")

# Step 3: Generate additional standalone policies
print("📋 Step 3: Generating additional standalone policies...")
try:
    result = generate_policies(count=3)
    if result.get("success"):
        print(f"  ✓ {result.get('message', 'Policies created')}\n")
    else:
        print(f"  ✗ Error: {result.get('message', 'Unknown error')}\n")
except Exception as e:
    print(f"  ✗ Error: {str(e)}\n")
    frappe.log_error(str(e), "Policy Demo Data: Generation Error")

# Step 4: List all created policies
print("📋 Step 4: Listing all policies...")
all_policies = frappe.get_all("Policy", 
    fields=["name", "policy_name", "applies_to", "is_active"],
    order_by="creation desc",
    limit=20
)

if all_policies:
    print(f"  ✓ Found {len(all_policies)} policies:\n")
    for policy in all_policies:
        applies_to = policy.get("applies_to", "N/A")
        status = "Active" if policy.get("is_active") else "Inactive"
        print(f"    • {policy.get('policy_name')} ({applies_to}) - {status}")
    print()
else:
    print("  ⚠ No policies found\n")

# Step 5: Test Policy Engine
print("🧪 Step 5: Testing Policy Engine...")
if services:
    service_name = services[0]["name"]
    try:
        from frappe_appointment.scheduler.helpers.policy_engine import get_applicable_policies, calculate_booking_quote
        
        # Test get_applicable_policies
        policies = get_applicable_policies(service_name)
        print(f"  ✓ Found {len(policies)} applicable policies for service: {service_name}")
        
        # Test calculate_booking_quote
        service = frappe.get_doc("Service", service_name)
        service_price = float(service.price or 1000)
        
        quote = calculate_booking_quote(
            service_name=service_name,
            service_price=service_price
        )
        
        print(f"  ✓ Quote calculated:")
        print(f"    - Total Price: {quote['total_price']} {quote['currency']}")
        print(f"    - Deposit: {quote['deposit_amount']} ({quote['deposit_percentage']}%)")
        print(f"    - Remaining: {quote['remaining_amount']}")
        print(f"    - Refund Policy: {quote['refund_policy']}\n")
    except Exception as e:
        print(f"  ✗ Error testing policy engine: {str(e)}\n")
        frappe.log_error(str(e), "Policy Demo Data: Policy Engine Test Error")

# Summary
print("="*80)
print("✅ POLICY DEMO DATA CREATION COMPLETE")
print("="*80)
print(f"\nTotal policies in system: {len(all_policies)}")
print("\nNext steps:")
print("  1. View policies in Desk: http://localhost:8000/app/policy")
print("  2. Test Quote API: /api/method/frappe_appointment.scheduler.api.quote.get_booking_quote")
print("  3. Test booking flow with policies applied")
print("  4. Verify conflict detection and buffer times")
print()
print(f"Generated at: {frappe.utils.now()}")
print()





