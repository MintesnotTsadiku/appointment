# Sprint 2 Demo Data Guide - Policies

This guide shows you how to create demo data for testing Sprint 2 features (Policies, Slot Engine, etc.).

## Quick Start

### Option 1: Run Script (Recommended)

```bash
cd /home/minte/projects/frappe-bench
bench --site appointment.com console < apps/frappe_appointment/scripts/create_policy_demo_data.py
```

This will:
- Check for existing Services, Locations, and Providers
- Create policies linked to existing data
- Create additional standalone policies
- Test the Policy Engine

### Option 2: Use API Functions

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from frappe_appointment.demo_data_policies import generate_policies_for_existing_data

# Generate policies linked to existing Services, Locations, Providers
result = generate_policies_for_existing_data()
print(result['message'])
"
```

### Option 3: Create Policies Manually via Desk UI

1. Navigate to: `http://localhost:8000/app/policy`
2. Click "New"
3. Fill in policy details
4. Save

## What Gets Created

The demo data script creates:

1. **Standard Deposit Policy** (All Services)
   - 50% deposit
   - 24-hour cancellation window
   - Full refund policy

2. **Service-Specific Policies** (for each service)
   - 75% deposit
   - 48-hour cancellation window
   - Partial refund policy

3. **Location-Specific Policies** (for each location)
   - Fixed 500 ETB deposit
   - 12-hour cancellation window
   - Full refund policy

4. **Provider-Specific Policies** (for each provider)
   - 30% deposit
   - 6-hour cancellation window
   - Full refund policy

5. **Additional Standalone Policies**
   - Various configurations for testing

## Prerequisites

Before creating policies, ensure you have:

1. **Services** - At least one Service
2. **Locations** - At least one Location  
3. **Providers** - At least one Provider

If you don't have these, create demo data first:

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
frappe.call('frappe_appointment.demo_data.generate_all_demo_data')
"
```

## Verify Policies Were Created

### Via Console

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

policies = frappe.get_all('Policy', 
    fields=['name', 'policy_name', 'applies_to', 'is_active'],
    order_by='creation desc'
)

print(f'Found {len(policies)} policies:')
for p in policies:
    print(f'  - {p[\"policy_name\"]} ({p[\"applies_to\"]})')
"
```

### Via Desk UI

1. Navigate to: `http://localhost:8000/app/policy`
2. You should see all created policies in the list

## Test Policy Engine

### Test get_applicable_policies()

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from frappe_appointment.scheduler.helpers.policy_engine import get_applicable_policies

# Get a service
services = frappe.get_all('Service', fields=['name'], limit=1)
if services:
    service_name = services[0]['name']
    policies = get_applicable_policies(service_name)
    print(f'Found {len(policies)} applicable policies for {service_name}:')
    for p in policies:
        print(f'  - {p.get(\"policy_name\")} (Priority: {p.get(\"applies_to\")})')
"
```

### Test calculate_booking_quote()

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from frappe_appointment.scheduler.helpers.policy_engine import calculate_booking_quote

# Get a service with price
services = frappe.get_all('Service', fields=['name', 'price'], limit=1)
if services:
    service_name = services[0]['name']
    service_price = float(services[0].get('price', 1000))
    
    quote = calculate_booking_quote(service_name, service_price)
    print('Booking Quote:')
    print(f'  Total: {quote[\"total_price\"]} {quote[\"currency\"]}')
    print(f'  Deposit: {quote[\"deposit_amount\"]} ({quote[\"deposit_percentage\"]}%)')
    print(f'  Remaining: {quote[\"remaining_amount\"]}')
    print(f'  Refund Policy: {quote[\"refund_policy\"]}')
"
```

## Test Quote API

After creating policies, test the Quote API:

```
http://localhost:8000/api/method/frappe_appointment.scheduler.api.quote.get_booking_quote?service_name=SVC-00001
```

Replace `SVC-00001` with an actual service name.

## Clean Up Demo Policies

To delete all demo policies:

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from frappe_appointment.demo_data_policies import clear_policies

result = clear_policies()
print(result['message'])
"
```

Or manually via Desk UI:
1. Navigate to: `http://localhost:8000/app/policy`
2. Select policies to delete
3. Click "Delete"

## Complete Demo Data Setup

For a complete setup with all Sprint 2 features:

1. **Create base demo data** (Organizations, Providers, Services, Locations):
```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
frappe.call('frappe_appointment.demo_data.generate_all_demo_data')
"
```

2. **Create policies**:
```bash
cd /home/minte/projects/frappe-bench
bench --site appointment.com console < apps/frappe_appointment/scripts/create_policy_demo_data.py
```

3. **Verify everything works**:
```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Count everything
orgs = len(frappe.get_all('Organization'))
providers = len(frappe.get_all('Provider'))
services = len(frappe.get_all('Service'))
locations = len(frappe.get_all('Location'))
policies = len(frappe.get_all('Policy'))

print(f'Demo Data Summary:')
print(f'  Organizations: {orgs}')
print(f'  Providers: {providers}')
print(f'  Services: {services}')
print(f'  Locations: {locations}')
print(f'  Policies: {policies}')
"
```

## Troubleshooting

### Issue: "Policy doctype not found"
**Solution**: Run migrations first:
```bash
bench --site appointment.com migrate
bench --site appointment.com clear-cache
```

### Issue: "No services/locations/providers found"
**Solution**: Create demo data first:
```bash
frappe.call('frappe_appointment.demo_data.generate_all_demo_data')
```

### Issue: Policies not showing in Quote API
**Solution**: 
1. Verify policies are active (`is_active = 1`)
2. Check `valid_from` and `valid_to` dates
3. Verify policy applies to the service/location/provider being queried

## Next Steps

After creating demo policies:

1. ✅ Test Quote API with different services
2. ✅ Test conflict detection by booking overlapping appointments
3. ✅ Test buffer times by setting buffer on services
4. ✅ Test working hours filtering
5. ✅ Test cancellation and reschedule validation

See `SPRINT_2_TESTING_GUIDE.md` for detailed testing instructions.




