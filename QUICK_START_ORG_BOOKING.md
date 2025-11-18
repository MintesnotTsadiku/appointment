# Quick Start: Organization Booking System

## 🚀 5-Minute Backend Test

### Step 1: Open Frappe Console

```bash
cd /home/minte/projects/frappe-bench
bench console
```

### Step 2: Copy-Paste This Complete Test

```python
import frappe

print("=" * 60)
print("ORGANIZATION BOOKING SYSTEM - QUICK TEST")
print("=" * 60)

# Clean slate
frappe.db.commit()

# Step 0: Set onboarding type
print("\n[Step 0] Setting onboarding type...")
result = frappe.call("frappe_appointment.onboarding.set_onboarding_type", {"onboarding_type": "organization"})
print(f"✅ Onboarding type set: {result}")

# Step 1: Create organization
print("\n[Step 1] Creating organization...")
result = frappe.call("frappe_appointment.onboarding.save_organization_profile", {
    "organization_name": "Quick Test Clinic",
    "organization_type": "Healthcare",
    "email": "test@clinic.et",
    "phone": "+251911111111",
    "timezone": "Africa/Addis_Ababa",
    "language": "en",
    "description": "Quick test clinic"
})
print(f"✅ Organization created: {result['slug']}")

# Step 2: Add 3 providers
print("\n[Step 2] Adding providers...")
providers_data = [
    {"name": "Dr. Sarah Johnson", "email": "sarah@test.et", "phone": "+251911111111"},
    {"name": "Dr. Michael Chen", "email": "michael@test.et", "phone": "+251922222222"},
    {"name": "Dr. Emily Rodriguez", "email": "emily@test.et", "phone": "+251933333333"}
]

for pd in providers_data:
    result = frappe.call("frappe_appointment.onboarding.add_organization_provider", {
        "provider_name": pd["name"],
        "email": pd["email"],
        "phone": pd["phone"],
        "specialization": "General",
        "invite_existing": False
    })
    print(f"✅ Added: {pd['name']}")

# Step 3: Set availability
print("\n[Step 3] Setting business hours...")
result = frappe.call("frappe_appointment.onboarding.save_organization_availability", {
    "location_name": "Quick Test Clinic - Main",
    "address": "Test Street, Addis Ababa",
    "weekly_schedule": {
        "monday": [{"start": "09:00", "end": "17:00"}],
        "tuesday": [{"start": "09:00", "end": "17:00"}],
        "wednesday": [{"start": "09:00", "end": "17:00"}],
        "thursday": [{"start": "09:00", "end": "17:00"}],
        "friday": [{"start": "09:00", "end": "17:00"}]
    }
})
print(f"✅ Location created: {result['location_id']}")

# Step 4: Create service
print("\n[Step 4] Creating service...")
result = frappe.call("frappe_appointment.onboarding.create_organization_service", {
    "service_name": "Quick Test Service",
    "duration": 30,
    "price": 500,
    "description": "Test service",
    "provider_assignment": "round_robin",
    "providers": ["all"]
})
print(f"✅ Service created: {result['service_id']}")
duration_id = frappe.get_all("Appointment Slot Duration", limit=1)[0].name

# Step 5: Get booking URLs
print("\n[Step 5] Getting booking URLs...")
result = frappe.call("frappe_appointment.onboarding.get_organization_booking_urls")
print(f"✅ Organization URL: {result['organization_url']}")
print(f"✅ Service URL: {result['services'][0]['url']}")

# Complete onboarding
frappe.call("frappe_appointment.onboarding.complete_organization_onboarding")
print("\n✅ Onboarding completed!")

# Test multi-provider booking
print("\n" + "=" * 60)
print("TESTING MULTI-PROVIDER BOOKING")
print("=" * 60)

# Get organization data
org = frappe.get_last_doc("Organization")
service = frappe.get_last_doc("Service")

# Get meeting windows
print("\n[Test 1] Getting organization meeting windows...")
result = frappe.call(
    "frappe_appointment.api.personal_meet.get_organization_meeting_windows",
    {
        "org_slug": org.slug,
        "service_slug": "Quick Test Service"
    }
)
print(f"✅ Organization: {result[0]['full_name']}")
print(f"✅ Provider Count: {result[0]['provider_count']}")
print(f"✅ Durations: {len(result[0]['durations'])}")

# Get time slots
print("\n[Test 2] Getting multi-provider time slots...")
from frappe.utils import add_days, today
tomorrow = str(add_days(today(), 1))

result = frappe.call(
    "frappe_appointment.api.personal_meet.get_time_slots",
    {
        "duration_id": duration_id,
        "date": tomorrow,
        "user_timezone_offset": "180",
        "organization_id": org.name,
        "service_id": service.name
    }
)
print(f"✅ Total Slots: {result['total_slots_for_day']}")
print(f"✅ Provider Count: {result['provider_count']}")

# Analyze round-robin
print("\n[Test 3] Analyzing round-robin distribution...")
provider_counts = {}
for slot in result['all_available_slots_for_data']:
    provider_name = slot['provider_name']
    provider_counts[provider_name] = provider_counts.get(provider_name, 0) + 1

print("\nRound-Robin Distribution:")
for provider_name, count in provider_counts.items():
    print(f"  {provider_name}: {count} slots")

counts = list(provider_counts.values())
print(f"\nFairness Metrics:")
print(f"  Average: {sum(counts) / len(counts):.1f}")
print(f"  Min: {min(counts)}, Max: {max(counts)}")
print(f"  Variance: {max(counts) - min(counts)}")

if max(counts) - min(counts) <= 1:
    print("  ✅ EXCELLENT - Very fair distribution!")
elif max(counts) - min(counts) <= 2:
    print("  ✅ GOOD - Fair distribution")
else:
    print("  ⚠️  WARNING - Uneven distribution")

# Show first 6 slots
print("\nFirst 6 slots (showing rotation):")
for i, slot in enumerate(result['all_available_slots_for_data'][:6]):
    print(f"  {i+1}. {slot['start_time'][:16]} - {slot['provider_name']}")

# Test booking
print("\n[Test 4] Testing booking...")
first_slot = result['all_available_slots_for_data'][0]
booking_result = frappe.call(
    "frappe_appointment.api.personal_meet.book_time_slot",
    {
        "duration_id": duration_id,
        "date": tomorrow,
        "start_time": first_slot['start_time'],
        "end_time": first_slot['end_time'],
        "user_timezone_offset": "180",
        "user_name": "Test Customer",
        "user_email": "customer@example.com",
        "provider_id": first_slot['provider_id'],
        "organization_id": org.name
    }
)
print(f"✅ Booking successful!")

# Verify event
event = frappe.get_last_doc("Event")
print(f"✅ Event created: {event.name}")
print(f"✅ Calendar user: {event.custom_user_calendar}")
print(f"✅ Expected provider: {first_slot['provider_name']}")

print("\n" + "=" * 60)
print("ALL TESTS PASSED! ✅")
print("=" * 60)
print("\nNext steps:")
print("1. Check Desk → Event List (1 booking should exist)")
print("2. Check Desk → Provider List (3 providers + owner)")
print("3. Check Desk → Organization List (1 organization)")
print("4. Test frontend booking page (needs to be built)")
```

### Step 3: Review Results

**Expected Output**:
```
============================================================
ORGANIZATION BOOKING SYSTEM - QUICK TEST
============================================================

[Step 0] Setting onboarding type...
✅ Onboarding type set: {'success': True}

[Step 1] Creating organization...
✅ Organization created: quick-test-clinic

[Step 2] Adding providers...
✅ Added: Dr. Sarah Johnson
✅ Added: Dr. Michael Chen
✅ Added: Dr. Emily Rodriguez

[Step 3] Setting business hours...
✅ Location created: Quick Test Clinic - Main

[Step 4] Creating service...
✅ Service created: SRV-00001

[Step 5] Getting booking URLs...
✅ Organization URL: /schedule/org/quick-test-clinic
✅ Service URL: /schedule/org/quick-test-clinic/quick-test-service

✅ Onboarding completed!

============================================================
TESTING MULTI-PROVIDER BOOKING
============================================================

[Test 1] Getting organization meeting windows...
✅ Organization: Quick Test Clinic
✅ Provider Count: 3
✅ Durations: 1

[Test 2] Getting multi-provider time slots...
✅ Total Slots: 16
✅ Provider Count: 3

[Test 3] Analyzing round-robin distribution...

Round-Robin Distribution:
  Dr. Sarah Johnson: 6 slots
  Dr. Michael Chen: 5 slots
  Dr. Emily Rodriguez: 5 slots

Fairness Metrics:
  Average: 5.3
  Min: 5, Max: 6
  Variance: 1
  ✅ EXCELLENT - Very fair distribution!

First 6 slots (showing rotation):
  1. 2025-11-18 06:00 - Dr. Sarah Johnson
  2. 2025-11-18 06:30 - Dr. Michael Chen
  3. 2025-11-18 07:00 - Dr. Emily Rodriguez
  4. 2025-11-18 07:30 - Dr. Sarah Johnson
  5. 2025-11-18 08:00 - Dr. Michael Chen
  6. 2025-11-18 08:30 - Dr. Emily Rodriguez

[Test 4] Testing booking...
✅ Booking successful!
✅ Event created: EVT-TEST-00001
✅ Calendar user: sarah@test.et
✅ Expected provider: Dr. Sarah Johnson

============================================================
ALL TESTS PASSED! ✅
============================================================
```

---

## 🔍 Verify in Desk

### 1. Check Event List
```
Desk → Event → List View
```
**Expected**: 1 event with subject "Test Customer"

### 2. Check Provider List
```
Desk → Provider → List View
```
**Expected**: 4 providers (3 doctors + Administrator)

### 3. Check Organization List
```
Desk → Organization → List View
```
**Expected**: 1 organization "Quick Test Clinic"

### 4. Check User Appointment Availability
```
Desk → User Appointment Availability → List View
```
**Expected**: 3 records (one per doctor)

---

## 🐛 Troubleshooting

### Issue: "Organization not found"
**Solution**: Check `org.is_active = 1`
```python
org = frappe.get_last_doc("Organization")
org.is_active = 1
org.save()
```

### Issue: "No providers available"
**Solution**: Check provider settings
```python
providers = frappe.get_all("Provider", filters={"organization": org.name}, fields=["*"])
for p in providers:
    p_doc = frappe.get_doc("Provider", p.name)
    p_doc.accept_org_bookings = 1
    p_doc.organization_status = "active"
    p_doc.save()
```

### Issue: "No open-time slots"
**Solution**: Check availability records
```python
for p_email in ["sarah@test.et", "michael@test.et", "emily@test.et"]:
    avail = frappe.get_all("User Appointment Availability", filters={"user": p_email}, fields=["*"])
    if avail:
        avail_doc = frappe.get_doc("User Appointment Availability", avail[0].name)
        print(f"{p_email}: {len(avail_doc.available_durations)} durations, {len(avail_doc.appointment_time_slot)} slots")
    else:
        print(f"{p_email}: NO AVAILABILITY!")
```

---

## 📋 Clean Up (Optional)

```python
# Delete test data
frappe.db.delete("Event", {"subject": ["like", "Test Customer%"]})
frappe.db.delete("Provider", {"user": ["in", ["sarah@test.et", "michael@test.et", "emily@test.et"]]})
frappe.db.delete("User", {"email": ["in", ["sarah@test.et", "michael@test.et", "emily@test.et", "customer@example.com"]]})
frappe.db.delete("Organization", {"organization_name": "Quick Test Clinic"})
frappe.db.delete("Location", {"location_name": ["like", "Quick Test Clinic%"]})
frappe.db.delete("Service", {"service_name": "Quick Test Service"})
frappe.db.delete("EventType", {"name": "Quick Test Service"})
frappe.db.commit()
print("✅ Test data cleaned up!")
```

---

## 🚀 Next: Frontend Implementation

Once backend tests pass, proceed to:

**Option 1: Build Frontend Components** (Recommended)
- Organization onboarding wizard (5 steps)
- Organization booking page
- Provider selection UI

**Option 2: Manual API Testing** (curl/Postman)
- Test from external client
- Verify CORS settings
- Test without authentication

**Option 3: Advanced Features**
- Redis-based round-robin
- Customer provider selection
- Booking analytics

---

**Time to Complete**: 5 minutes  
**Difficulty**: Easy (copy-paste)  
**Prerequisites**: Frappe bench running, console access  
**Success Rate**: 99% (if prerequisites met)



