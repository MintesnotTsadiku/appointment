# Testing Guide: Organization Onboarding & Multi-Provider Booking

## Prerequisites

1. Frappe bench running
2. Fresh database (or clear existing data)
3. Logged in as Administrator

---

## Part 1: Test Organization Onboarding (Backend APIs)

### Step 0: Set Onboarding Type

```python
# In Frappe console (bench console)
import frappe

# Set onboarding type to "organization"
result = frappe.call("appointment.onboarding.set_onboarding_type", {
    "onboarding_type": "organization"
})
print(result)
# Expected: {"success": True}

# Verify Provider record created
provider = frappe.get_last_doc("Provider")
print(f"Provider: {provider.name}, Type: {provider.onboarding_type}")
# Expected: onboarding_type = "organization"
```

---

### Step 1: Save Organization Profile

```python
result = frappe.call("appointment.onboarding.save_organization_profile", {
    "organization_name": "Test Clinic",
    "organization_type": "Healthcare",
    "email": "contact@testclinic.et",
    "phone": "+251911234567",
    "timezone": "Africa/Addis_Ababa",
    "language": "en",
    "description": "Full-service test clinic"
})
print(result)
# Expected: {"success": True, "organization_id": "Test Clinic", "slug": "test-clinic"}

# Verify Organization created
org = frappe.get_last_doc("Organization")
print(f"Organization: {org.name}, Slug: {org.slug}")

# Verify Provider step updated
provider = frappe.get_doc("Provider", {"user": frappe.session.user})
print(f"Current Step: {provider.onboarding_current_step}")
# Expected: 2
```

---

### Step 2: Add Providers

```python
# Add Provider 1
result = frappe.call("appointment.onboarding.add_organization_provider", {
    "provider_name": "Dr. Sarah Johnson",
    "email": "sarah@testclinic.et",
    "phone": "+251911111111",
    "specialization": "General Practitioner",
    "invite_existing": False
})
print(result)
# Expected: {"success": True, "provider_id": "Dr. Sarah Johnson", "provider_name": "Dr. Sarah Johnson"}

# Add Provider 2
result = frappe.call("appointment.onboarding.add_organization_provider", {
    "provider_name": "Dr. Michael Chen",
    "email": "michael@testclinic.et",
    "phone": "+251922222222",
    "specialization": "Pediatrician",
    "invite_existing": False
})
print(result)

# Add Provider 3
result = frappe.call("appointment.onboarding.add_organization_provider", {
    "provider_name": "Dr. Emily Rodriguez",
    "email": "emily@testclinic.et",
    "phone": "+251933333333",
    "specialization": "Dermatologist",
    "invite_existing": False
})
print(result)

# List all providers
result = frappe.call("appointment.onboarding.get_organization_providers")
print(f"Provider Count: {len(result['providers'])}")
for p in result['providers']:
    print(f"  - {p['provider_name']} ({p['user']})")
# Expected: 3 providers

# Verify onboarding step updated
provider = frappe.get_doc("Provider", {"user": frappe.session.user})
print(f"Current Step: {provider.onboarding_current_step}")
# Expected: 3
```

---

### Step 3: Save Organization Availability

```python
result = frappe.call("appointment.onboarding.save_organization_availability", {
    "location_name": "Test Clinic - Main Branch",
    "address": "123 Test Street, Addis Ababa",
    "weekly_schedule": {
        "monday": [{"start": "09:00", "end": "17:00"}],
        "tuesday": [{"start": "09:00", "end": "17:00"}],
        "wednesday": [{"start": "09:00", "end": "17:00"}],
        "thursday": [{"start": "09:00", "end": "17:00"}],
        "friday": [{"start": "09:00", "end": "17:00"}],
        "saturday": [],
        "sunday": []
    }
})
print(result)
# Expected: {"success": True, "location_id": "Test Clinic - Main Branch"}

# Verify Location created
location = frappe.get_last_doc("Location")
print(f"Location: {location.name}, Opening Hours: {len(location.opening_hours)}")
# Expected: 5 opening hours (Mon-Fri)

# Verify providers linked to location
for p_email in ["sarah@testclinic.et", "michael@testclinic.et", "emily@testclinic.et"]:
    provider = frappe.get_doc("Provider", {"user": p_email})
    print(f"{provider.provider_name}: {len(provider.locations)} locations")
    # Expected: 1 location each

# Verify onboarding step updated
owner_provider = frappe.get_doc("Provider", {"user": frappe.session.user})
print(f"Current Step: {owner_provider.onboarding_current_step}")
# Expected: 4
```

---

### Step 4: Create Organization Service

```python
result = frappe.call("appointment.onboarding.create_organization_service", {
    "service_name": "General Consultation",
    "duration": 30,
    "price": 500,
    "description": "Standard medical consultation",
    "provider_assignment": "round_robin",
    "providers": ["all"]
})
print(result)
# Expected: {"success": True, "service_id": "...", "event_type_id": "General Consultation", "slug": "general-consultation"}

# Verify Service created
service = frappe.get_last_doc("Service")
print(f"Service: {service.name}, Duration: {service.duration} min")

# Verify EventType created
event_type = frappe.get_doc("EventType", "General Consultation")
print(f"EventType: {event_type.name}, Service: {event_type.service}")

# Verify User Appointment Availability created for each provider
for p_email in ["sarah@testclinic.et", "michael@testclinic.et", "emily@testclinic.et"]:
    avail = frappe.get_all(
        "User Appointment Availability",
        filters={"user": p_email},
        fields=["name", "slug"],
        limit=1
    )
    if avail:
        avail_doc = frappe.get_doc("User Appointment Availability", avail[0].name)
        print(f"{p_email}:")
        print(f"  - Availability: {avail_doc.name}")
        print(f"  - Durations: {len(avail_doc.available_durations)}")
        print(f"  - Time Slots: {len(avail_doc.appointment_time_slot)}")
        # Expected: 1 duration, 5 time slots (Mon-Fri)
    else:
        print(f"{p_email}: NO AVAILABILITY FOUND!")

# Verify onboarding step updated
owner_provider = frappe.get_doc("Provider", {"user": frappe.session.user})
print(f"Current Step: {owner_provider.onboarding_current_step}")
# Expected: 5
```

---

### Step 5: Get Booking URLs & Complete

```python
# Get URLs
result = frappe.call("appointment.onboarding.get_organization_booking_urls")
print(result)
print(f"Organization URL: {result['organization_url']}")
print("Service URLs:")
for svc in result['services']:
    print(f"  - {svc['name']}: {svc['url']}")
# Expected: /schedule/org/test-clinic and /schedule/org/test-clinic/general-consultation

# Complete onboarding
result = frappe.call("appointment.onboarding.complete_organization_onboarding")
print(result)
# Expected: {"success": True, "onboarding_complete": True}

# Verify Organization setup complete
org = frappe.get_doc("Organization", {"owner_user": frappe.session.user})
print(f"Organization Setup Complete: {org.setup_complete}")
# Expected: 1

# Verify Provider onboarding complete
provider = frappe.get_doc("Provider", {"user": frappe.session.user})
print(f"Provider Onboarding Complete: {provider.onboarding_complete}")
# Expected: 1
```

---

## Part 2: Test Multi-Provider Booking (Backend APIs)

### Test 1: Organization Meeting Windows

```python
result = frappe.call(
    "appointment.api.personal_meet.get_organization_meeting_windows",
    {
        "org_slug": "test-clinic",
        "service_slug": "General Consultation"
    }
)
print(result)
print(f"Organization: {result[0]['full_name']}")
print(f"Provider Count: {result[0]['provider_count']}")
print(f"Durations: {len(result[0]['durations'])}")
# Expected: provider_count = 3, durations = 1

# Save duration_id for next test
duration_id = result[0]['durations'][0]['id']
print(f"Duration ID: {duration_id}")

# Save IDs for next test
org_id = result[0]['organization_id']
service_id = result[0]['service_id']
print(f"Organization ID: {org_id}, Service ID: {service_id}")
```

---

### Test 2: Multi-Provider Time Slots (Tomorrow)

```python
from frappe.utils import add_days, today

tomorrow = add_days(today(), 1)
print(f"Testing date: {tomorrow}")

result = frappe.call(
    "appointment.api.personal_meet.get_time_slots",
    {
        "duration_id": duration_id,  # From previous test
        "date": str(tomorrow),
        "user_timezone_offset": "180",
        "organization_id": org_id,  # From previous test
        "service_id": service_id     # From previous test
    }
)
print(f"Total Slots: {result['total_slots_for_day']}")
print(f"Provider Count: {result['provider_count']}")
print(f"Is Organization: {result['is_organization']}")

# Analyze round-robin distribution
provider_counts = {}
for slot in result['all_available_slots_for_data']:
    provider_id = slot['provider_id']
    provider_name = slot['provider_name']
    if provider_id not in provider_counts:
        provider_counts[provider_id] = {"name": provider_name, "count": 0}
    provider_counts[provider_id]["count"] += 1

print("\nRound-Robin Distribution:")
for provider_id, data in provider_counts.items():
    print(f"  {data['name']}: {data['count']} slots")

# Verify fair distribution (should be roughly equal)
counts = [data["count"] for data in provider_counts.values()]
avg_count = sum(counts) / len(counts)
print(f"Average slots per provider: {avg_count:.1f}")
print(f"Min: {min(counts)}, Max: {max(counts)}, Variance: {max(counts) - min(counts)}")
# Expected: Variance should be <= 1 (very fair distribution)

# Print first 5 slots to see round-robin pattern
print("\nFirst 5 slots (should show rotation):")
for slot in result['all_available_slots_for_data'][:5]:
    print(f"  {slot['start_time']} - {slot['provider_name']}")

# Save first slot for booking test
first_slot = result['all_available_slots_for_data'][0]
print(f"\nFirst slot for booking test:")
print(f"  Time: {first_slot['start_time']} - {first_slot['end_time']}")
print(f"  Provider: {first_slot['provider_name']} ({first_slot['provider_id']})")
```

---

### Test 3: Book Time Slot with Specific Provider

```python
# Using first_slot from previous test
result = frappe.call(
    "appointment.api.personal_meet.book_time_slot",
    {
        "duration_id": duration_id,
        "date": str(tomorrow),
        "start_time": first_slot['start_time'],
        "end_time": first_slot['end_time'],
        "user_timezone_offset": "180",
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "provider_id": first_slot['provider_id'],
        "organization_id": org_id
    }
)
print(result)
# Expected: {"success": True, ...}

# Verify Event created
event = frappe.get_last_doc("Event")
print(f"Event created: {event.name}")
print(f"Subject: {event.subject}")
print(f"Calendar: {event.custom_user_calendar}")

# Verify event is assigned to correct provider
provider = frappe.get_doc("Provider", first_slot['provider_id'])
print(f"Expected Provider: {provider.provider_name} ({provider.user})")
print(f"Actual Event User: {event.custom_user_calendar}")
# Expected: Should match

# Verify event participants
print(f"Participants: {len(event.event_participants)}")
for participant in event.event_participants:
    print(f"  - {participant.email}")
```

---

### Test 4: Verify Provider Can't Book Outside Organization

```python
# Try to book with a provider from a different org (should fail)
wrong_provider_id = "PRV-WRONG"

try:
    result = frappe.call(
        "appointment.api.personal_meet.book_time_slot",
        {
            "duration_id": duration_id,
            "date": str(tomorrow),
            "start_time": first_slot['start_time'],
            "end_time": first_slot['end_time'],
            "user_timezone_offset": "180",
            "user_name": "Jane Doe",
            "user_email": "jane@example.com",
            "provider_id": wrong_provider_id,
            "organization_id": org_id
        }
    )
    print("ERROR: Should have failed!")
except Exception as e:
    print(f"Expected error: {str(e)}")
    # Expected: "Invalid provider for this organization"
```

---

### Test 5: Multiple Bookings (Verify Round-Robin Continues)

```python
# Book next 3 slots to see round-robin continue
for i in range(1, 4):
    slot = result['all_available_slots_for_data'][i]
    
    try:
        booking_result = frappe.call(
            "appointment.api.personal_meet.book_time_slot",
            {
                "duration_id": duration_id,
                "date": str(tomorrow),
                "start_time": slot['start_time'],
                "end_time": slot['end_time'],
                "user_timezone_offset": "180",
                "user_name": f"Customer {i+1}",
                "user_email": f"customer{i+1}@example.com",
                "provider_id": slot['provider_id'],
                "organization_id": org_id
            }
        )
        print(f"Booking {i+1}: {slot['start_time']} with {slot['provider_name']} - SUCCESS")
    except Exception as e:
        print(f"Booking {i+1}: {slot['start_time']} with {slot['provider_name']} - FAILED: {str(e)}")

# Verify 4 total appointments created
appointments = frappe.get_all("Event", filters={"event_type": "Public"}, limit_page_length=10)
print(f"\nTotal Events Created: {len(appointments)}")
# Expected: At least 4

# Show provider distribution of bookings
provider_booking_counts = {}
for event_name in [e.name for e in appointments]:
    event = frappe.get_doc("Event", event_name)
    calendar_user = event.custom_user_calendar
    provider = frappe.get_all("Provider", filters={"user": calendar_user}, fields=["provider_name"], limit=1)
    if provider:
        provider_name = provider[0].provider_name
        provider_booking_counts[provider_name] = provider_booking_counts.get(provider_name, 0) + 1

print("\nBooking Distribution:")
for provider_name, count in provider_booking_counts.items():
    print(f"  {provider_name}: {count} bookings")
```

---

## Part 3: Manual API Testing (curl)

### Test Organization Meeting Windows

```bash
curl "http://localhost:8000/api/method/appointment.api.personal_meet.get_organization_meeting_windows?org_slug=test-clinic&service_slug=General%20Consultation"
```

### Test Multi-Provider Time Slots

```bash
# Replace with actual IDs from previous test
curl "http://localhost:8000/api/method/appointment.api.personal_meet.get_time_slots?duration_id=7rdb483q9a&date=2025-11-18&user_timezone_offset=180&organization_id=Test%20Clinic&service_id=SRV-00001"
```

### Test Booking

```bash
curl -X POST "http://localhost:8000/api/method/appointment.api.personal_meet.book_time_slot" \
  -H "Content-Type: application/json" \
  -d '{
    "duration_id": "7rdb483q9a",
    "date": "2025-11-18",
    "start_time": "2025-11-18 09:00:00",
    "end_time": "2025-11-18 09:30:00",
    "user_timezone_offset": "180",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "provider_id": "Dr. Sarah Johnson",
    "organization_id": "Test Clinic"
  }'
```

---

## Expected Results Summary

### Organization Onboarding:
- ✅ Organization created with slug
- ✅ 3 providers created and linked
- ✅ 1 location created with 5 opening hours
- ✅ 1 service created
- ✅ 1 event type created
- ✅ 3 User Appointment Availability records (one per provider)
- ✅ 3 x 1 Appointment Slot Duration (one per provider)
- ✅ 3 x 5 Appointment Time Slots (5 days x 3 providers)
- ✅ Provider onboarding step = 5, complete = True
- ✅ Organization setup_complete = True

### Multi-Provider Booking:
- ✅ Organization meeting windows API returns correct data
- ✅ Time slots show provider assignments
- ✅ Round-robin distribution is fair (variance <= 1)
- ✅ Slot pattern shows rotation (A, B, C, A, B, C, ...)
- ✅ Booking assigns to correct provider
- ✅ Multiple bookings continue round-robin pattern
- ✅ Invalid provider rejected
- ✅ Event created with correct calendar user

---

## Troubleshooting

### Issue: "Organization not found"
- Check `org.slug` matches URL slug
- Verify `org.is_active = 1`

### Issue: "No providers available"
- Check `provider.organization` is set
- Check `provider.accept_org_bookings = 1`
- Check `provider.organization_status = "active"`

### Issue: "No open-time slots"
- Check `User Appointment Availability` exists for each provider
- Check `Appointment Slot Duration` exists
- Check `Appointment Time Slot` populated from opening hours
- Check date is not weekend/holiday

### Issue: Round-robin not working
- Check all providers have same availability
- Check time slot parsing is correct
- Add debug messages to `merge_slots_round_robin`

---

**Date Created**: 2025-11-17  
**Status**: Ready for testing



