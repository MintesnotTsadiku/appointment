# Sprint 2 Testing Guide - Slot Engine & Policies

This guide provides step-by-step instructions to test and verify all Sprint 2 features using both the UI and console.

## Prerequisites

1. Ensure bench is running: `bench start`
2. Enable developer mode: `bench --site appointment.com set-config developer_mode 1`
3. Clear cache: `bench --site appointment.com clear-cache`

## Step 1: Migrate Database (Create Policy Doctype)

First, run migrations to create the Policy doctype:

```bash
cd /home/minte/projects/frappe-bench
bench --site appointment.com migrate
```

**Verification**: Check that Policy doctype exists:
```bash
bench --site appointment.com console <<< "
import frappe
meta = frappe.get_meta('Policy')
print(f'Policy doctype exists: {meta.name}')
print(f'Fields: {len(meta.fields)}')
"
```

## Step 2: Create Test Data

### 2.1 Create a Policy via Console

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from frappe.utils import today, add_days

# Create a test policy
policy = frappe.new_doc('Policy')
policy.policy_name = 'Standard Deposit Policy'
policy.description = 'Standard 50% deposit policy for all services'
policy.is_active = 1
policy.applies_to = 'All Services'
policy.deposit_percentage = 50
policy.cancellation_window_hours = 24
policy.reschedule_window_hours = 24
policy.late_cancellation_fee_percentage = 20
policy.no_show_fee_percentage = 100
policy.refund_policy = 'Full Refund'
policy.valid_from = today()

policy.insert()
print(f'Created Policy: {policy.name}')
"
```

### 2.2 Create Service-Specific Policy

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

# Get first service
services = frappe.get_all('Service', fields=['name'], limit=1)
if services:
    service_name = services[0]['name']
    
    # Create service-specific policy
    policy = frappe.new_doc('Policy')
    policy.policy_name = 'Premium Service Policy'
    policy.description = 'Premium policy for specific service'
    policy.is_active = 1
    policy.applies_to = 'Specific Service'
    policy.service = service_name
    policy.deposit_percentage = 75
    policy.cancellation_window_hours = 48
    policy.reschedule_window_hours = 48
    policy.late_cancellation_fee_percentage = 30
    policy.no_show_fee_percentage = 100
    policy.refund_policy = 'Partial Refund'
    policy.valid_from = frappe.utils.today()
    
    policy.insert()
    print(f'Created Service Policy: {policy.name} for Service: {service_name}')
else:
    print('No services found. Please create a service first.')
"
```

## Step 3: Test Policy Engine Functions

### 3.1 Test get_applicable_policies()

```bash
cd /home/minte/projects/appointment && bench --site appointment.com console <<< "
import frappe
from appointment.scheduler.helpers.policy_engine import get_applicable_policies

# Get services, locations, providers
services = frappe.get_all('Service', fields=['name'], limit=1)
locations = frappe.get_all('Location', fields=['name'], limit=1)
providers = frappe.get_all('Provider', fields=['name'], limit=1)

if services and locations and providers:
    service_name = services[0]['name']
    location_name = locations[0]['name']
    provider_name = providers[0]['name']
    
    # Get applicable policies
    policies = get_applicable_policies(service_name, location_name, provider_name)
    
    print(f'Found {len(policies)} applicable policies:')
    for p in policies:
        print(f'  - {p.get(\"policy_name\")} (Priority: {p.get(\"applies_to\")})')
else:
    print('Missing test data. Please create Service, Location, and Provider first.')
"
```

### 3.2 Test calculate_booking_quote()

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from appointment.scheduler.helpers.policy_engine import calculate_booking_quote
from datetime import datetime, timedelta

# Get test data
services = frappe.get_all('Service', fields=['name', 'price'], limit=1)
locations = frappe.get_all('Location', fields=['name'], limit=1)
providers = frappe.get_all('Provider', fields=['name'], limit=1)

if services and locations and providers:
    service_name = services[0]['name']
    service_price = float(services[0].get('price', 1000))
    location_name = locations[0]['name']
    provider_name = providers[0]['name']
    
    # Calculate quote for appointment tomorrow
    appointment_date = datetime.now() + timedelta(days=1)
    
    quote = calculate_booking_quote(
        service_name=service_name,
        service_price=service_price,
        location_name=location_name,
        provider_name=provider_name,
        appointment_date=appointment_date
    )
    
    print('Booking Quote:')
    print(f'  Total Price: {quote[\"total_price\"]} {quote[\"currency\"]}')
    print(f'  Deposit: {quote[\"deposit_amount\"]} ({quote[\"deposit_percentage\"]}%)')
    print(f'  Remaining: {quote[\"remaining_amount\"]}')
    print(f'  Cancellation Deadline: {quote.get(\"cancellation_deadline\", \"N/A\")}')
    print(f'  Reschedule Deadline: {quote.get(\"reschedule_deadline\", \"N/A\")}')
    print(f'  Late Cancellation Fee: {quote[\"late_cancellation_fee\"]}')
    print(f'  No Show Fee: {quote[\"no_show_fee\"]}')
    print(f'  Refund Policy: {quote[\"refund_policy\"]}')
else:
    print('Missing test data.')
"
```

## Step 4: Test Slot Engine Functions

### 4.1 Test check_conflicts()

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from appointment.scheduler.helpers.slot_engine import check_conflicts
from datetime import datetime, timedelta

# Get test data
providers = frappe.get_all('Provider', fields=['name'], limit=1)
locations = frappe.get_all('Location', fields=['name'], limit=1)

if providers and locations:
    provider_name = providers[0]['name']
    location_name = locations[0]['name']
    
    # Check for conflicts tomorrow at 2 PM
    tomorrow = datetime.now() + timedelta(days=1)
    start_time = tomorrow.replace(hour=14, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(hours=1)
    
    conflicts = check_conflicts(
        provider_name=provider_name,
        location_name=location_name,
        start_time=start_time,
        end_time=end_time
    )
    
    if conflicts:
        print(f'Found {len(conflicts)} conflicts:')
        for c in conflicts:
            print(f'  - {c[\"appointment_id\"]} ({c[\"start_time\"]} - {c[\"end_time\"]})')
    else:
        print('No conflicts found for this time slot.')
else:
    print('Missing test data.')
"
```

## Step 5: Test Quote API via Browser

### 5.1 Test Quote API Endpoint

Open your browser and navigate to:

```
http://localhost:8000/api/method/appointment.scheduler.api.quote.get_booking_quote?service_name=SVC-00001
```

Replace `SVC-00001` with an actual service name from your database.

**Expected Response**:
```json
{
  "quote": {
    "total_price": 1000.0,
    "deposit_amount": 500.0,
    "deposit_percentage": 50.0,
    "remaining_amount": 500.0,
    "currency": "ETB",
    "cancellation_deadline": "2025-01-20 14:00:00",
    "reschedule_deadline": "2025-01-20 14:00:00",
    "late_cancellation_fee": 200.0,
    "no_show_fee": 1000.0,
    "refund_policy": "Full Refund",
    "policies": [...]
  }
}
```

### 5.2 Test Quote API with All Parameters

```
http://localhost:8000/api/method/appointment.scheduler.api.quote.get_booking_quote?service_name=SVC-00001&location_name=LOC-00001&provider_name=PROV-00001&appointment_date=2025-01-25
```

## Step 6: Test Conflict Detection via UI

### 6.1 Create First Appointment

1. Navigate to booking page: `http://localhost:8000/schedule/in/[slug]`
2. Select a date and time slot
3. Book the appointment
4. Note the appointment time

### 6.2 Try to Book Overlapping Appointment

1. Try to book the same time slot again (or overlapping time)
2. **Expected**: You should see an error message: "Time slot is already booked"
3. The error should include conflict details

### 6.3 Verify via Console

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from appointment.scheduler.helpers.slot_engine import check_conflicts
from datetime import datetime

# Get a recent appointment
appointments = frappe.get_all('Appointment', 
    fields=['name', 'provider', 'location', 'appointment_date', 'start_time', 'end_time'],
    order_by='creation desc',
    limit=1
)

if appointments:
    apt = appointments[0]
    print(f'Checking conflicts for appointment: {apt[\"name\"]}')
    
    # Build datetime
    apt_datetime = frappe.utils.get_datetime(f'{apt[\"appointment_date\"]} {apt[\"start_time\"]}')
    apt_end = frappe.utils.get_datetime(f'{apt[\"appointment_date\"]} {apt[\"end_time\"]}')
    
    conflicts = check_conflicts(
        provider_name=apt['provider'],
        location_name=apt['location'],
        start_time=apt_datetime,
        end_time=apt_end
    )
    
    print(f'Found {len(conflicts)} conflicts')
    for c in conflicts:
        print(f'  - {c[\"appointment_id\"]}')
else:
    print('No appointments found.')
"
```

## Step 7: Test Working Hours Filter

### 7.1 Verify Slots Respect Working Hours

1. Navigate to booking page
2. Select a date
3. **Expected**: Only slots within working hours should be shown
4. Slots outside working hours should not appear

### 7.2 Test via Console

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from appointment.scheduler.helpers.slot_engine import filter_by_working_hours

# Get test data
locations = frappe.get_all('Location', fields=['name'], limit=1)
services = frappe.get_all('Service', fields=['name'], limit=1)
providers = frappe.get_all('Provider', fields=['name'], limit=1)

if locations:
    location_name = locations[0]['name']
    service_name = services[0]['name'] if services else None
    provider_name = providers[0]['name'] if providers else None
    
    # Create sample slots (some outside working hours)
    from datetime import datetime, timedelta
    tomorrow = datetime.now() + timedelta(days=1)
    
    slots = [
        {'start_time': tomorrow.replace(hour=6, minute=0).isoformat(), 'end_time': tomorrow.replace(hour=7, minute=0).isoformat()},  # 6 AM - outside hours
        {'start_time': tomorrow.replace(hour=10, minute=0).isoformat(), 'end_time': tomorrow.replace(hour=11, minute=0).isoformat()},  # 10 AM - inside hours
        {'start_time': tomorrow.replace(hour=20, minute=0).isoformat(), 'end_time': tomorrow.replace(hour=21, minute=0).isoformat()},  # 8 PM - outside hours
    ]
    
    filtered = filter_by_working_hours(slots, location_name, service_name, provider_name)
    
    print(f'Original slots: {len(slots)}')
    print(f'Filtered slots: {len(filtered)}')
    print('Slots within working hours:')
    for s in filtered:
        print(f'  - {s[\"start_time\"]}')
else:
    print('Missing test data.')
"
```

## Step 8: Test Buffer Times

### 8.1 Set Buffer Times on Service

1. Go to Desk: `http://localhost:8000/app/service`
2. Open a service
3. Set `Buffer Before` to 15 minutes
4. Set `Buffer After` to 15 minutes
5. Save

### 8.2 Test Buffer Enforcement

1. Book an appointment at 2:00 PM
2. Try to book another appointment at 1:45 PM (15 min before) - **Should fail**
3. Try to book another appointment at 2:00 PM (same time) - **Should fail**
4. Try to book another appointment at 3:00 PM (15 min after) - **Should fail**
5. Try to book another appointment at 3:15 PM (15 min after) - **Should succeed**

### 8.3 Verify via Console

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from appointment.scheduler.helpers.slot_engine import apply_buffer_times
from datetime import datetime, timedelta

# Get an existing appointment
appointments = frappe.get_all('Appointment',
    fields=['appointment_date', 'start_time', 'end_time'],
    order_by='creation desc',
    limit=1
)

if appointments:
    apt = appointments[0]
    apt_start = f'{apt[\"appointment_date\"]} {apt[\"start_time\"]}'
    apt_end = f'{apt[\"appointment_date\"]} {apt[\"end_time\"]}'
    
    # Create test slots around the appointment
    apt_datetime = frappe.utils.get_datetime(apt_start)
    slots = [
        {'start_time': (apt_datetime - timedelta(minutes=10)).isoformat(), 'end_time': (apt_datetime - timedelta(minutes=5)).isoformat()},  # 10 min before
        {'start_time': (apt_datetime - timedelta(minutes=5)).isoformat(), 'end_time': apt_datetime.isoformat()},  # 5 min before (violates buffer)
        {'start_time': apt_datetime.isoformat(), 'end_time': (apt_datetime + timedelta(minutes=30)).isoformat()},  # Overlapping
        {'start_time': (apt_datetime + timedelta(minutes=30)).isoformat(), 'end_time': (apt_datetime + timedelta(minutes=35)).isoformat()},  # 5 min after (violates buffer)
        {'start_time': (apt_datetime + timedelta(minutes=45)).isoformat(), 'end_time': (apt_datetime + timedelta(minutes=60)).isoformat()},  # 15 min after (OK)
    ]
    
    existing = [{'start_time': apt_start, 'end_time': apt_end}]
    
    filtered = apply_buffer_times(slots, buffer_before=15, buffer_after=15, existing_appointments=existing)
    
    print(f'Original slots: {len(slots)}')
    print(f'After buffer filter: {len(filtered)}')
    print('Valid slots (respecting 15 min buffer):')
    for s in filtered:
        print(f'  - {s[\"start_time\"]}')
else:
    print('No appointments found. Create one first.')
"
```

## Step 9: Test Policy via UI

### 9.1 Create Policy via Desk UI

1. Navigate to: `http://localhost:8000/app/policy`
2. Click "New"
3. Fill in:
   - Policy Name: "Test Policy"
   - Applies To: "All Services"
   - Deposit Percentage: 50
   - Cancellation Window: 24 hours
   - Reschedule Window: 24 hours
   - Valid From: Today
4. Save

### 9.2 Verify Policy Appears in Quote

1. Use Quote API or check booking flow
2. Verify policy is included in quote response

## Step 10: Complete Integration Test

### 10.1 End-to-End Booking Flow

1. **Navigate to booking page**
2. **Select service** (if organization booking)
3. **Select date and time**
4. **Verify slots are filtered** (working hours, conflicts, buffers)
5. **Book appointment**
6. **Verify conflict detection** (try to book same slot again)
7. **Check quote** (via API or booking confirmation)

### 10.2 Verify All Features Work Together

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from appointment.scheduler.helpers.policy_engine import get_applicable_policies, calculate_booking_quote
from appointment.scheduler.helpers.slot_engine import check_conflicts
from datetime import datetime, timedelta

print('=== Sprint 2 Integration Test ===\n')

# 1. Test Policy Engine
print('1. Testing Policy Engine...')
services = frappe.get_all('Service', fields=['name', 'price'], limit=1)
if services:
    service_name = services[0]['name']
    policies = get_applicable_policies(service_name)
    print(f'   ✓ Found {len(policies)} applicable policies')
    
    quote = calculate_booking_quote(service_name, float(services[0].get('price', 1000)))
    print(f'   ✓ Quote calculated: Deposit = {quote[\"deposit_amount\"]} ETB')
else:
    print('   ✗ No services found')

# 2. Test Conflict Detection
print('\n2. Testing Conflict Detection...')
providers = frappe.get_all('Provider', fields=['name'], limit=1)
locations = frappe.get_all('Location', fields=['name'], limit=1)
if providers and locations:
    provider_name = providers[0]['name']
    location_name = locations[0]['name']
    start_time = datetime.now() + timedelta(days=1, hours=14)
    end_time = start_time + timedelta(hours=1)
    
    conflicts = check_conflicts(provider_name, location_name, start_time, end_time)
    print(f'   ✓ Conflict check completed: {len(conflicts)} conflicts found')
else:
    print('   ✗ Missing test data')

print('\n=== All Tests Complete ===')
"
```

## Troubleshooting

### Issue: Policy doctype not found
**Solution**: Run `bench --site appointment.com migrate`

### Issue: Import errors
**Solution**: 
1. Clear cache: `bench --site appointment.com clear-cache`
2. Restart bench: `bench restart`

### Issue: Conflicts not detected
**Solution**: 
1. Verify appointments have correct status (Pending/Confirmed)
2. Check provider and location match
3. Verify datetime formats are correct

### Issue: Working hours not filtering
**Solution**:
1. Verify Location has opening_hours set
2. Check Service/Provider hours if applicable
3. Verify timezone settings

## Success Criteria Checklist

- [ ] Policy doctype created and accessible via Desk UI
- [ ] Can create policies via UI and console
- [ ] `get_applicable_policies()` returns correct policies by priority
- [ ] `calculate_booking_quote()` calculates deposit and fees correctly
- [ ] Quote API returns complete pricing information
- [ ] `check_conflicts()` detects overlapping appointments
- [ ] Booking API rejects conflicting bookings with error
- [ ] Slots respect working hours (only show during open hours)
- [ ] Buffer times enforced (minimum gap between appointments)
- [ ] All filters work together in `get_time_slots()`

## Next Steps

After verification:
1. Test with real booking scenarios
2. Verify email notifications include policy information
3. Test cancellation and reschedule flows with policies
4. Performance test with large number of appointments








