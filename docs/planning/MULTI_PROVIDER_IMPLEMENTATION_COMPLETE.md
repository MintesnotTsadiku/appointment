# Multi-Provider Booking Logic - Implementation Complete

## Status: Backend Logic ✅ Complete

**Date Completed**: 2025-11-17  
**Location**: `/frappe_appointment/api/personal_meet.py`

---

## ✅ What Was Implemented

### 1. New API Endpoint: `get_organization_meeting_windows`

**Purpose**: Get meeting windows for organization booking URLs

**URL Pattern**: `/schedule/org/{org_slug}/{service_slug}`

**Features**:
- Fetches Organization by slug
- Fetches Service/EventType by service slug
- Gets all active providers for the organization
- Returns organization info and available durations
- Returns provider count

**Response**:
```json
{
  "full_name": "Mahlet Clinic",
  "profile_pic": "...",
  "company": "Mahlet Clinic",
  "meeting_provider": "builtin",
  "durations": [
    {"id": "7rdb483q9a", "label": "General Consultation", "duration": 30}
  ],
  "is_organization": true,
  "organization_id": "ORG-001",
  "service_id": "SRV-001",
  "provider_count": 3
}
```

---

### 2. Modified: `get_time_slots`

**Added Parameters**:
- `organization_id` (optional)
- `service_id` (optional)

**Logic**:
- If both `organization_id` and `service_id` are provided, calls `get_multi_provider_time_slots()`
- Otherwise, uses existing individual provider logic

---

### 3. New Function: `get_multi_provider_time_slots`

**Purpose**: Get time slots from multiple providers with round-robin assignment

**Features**:
- Fetches all active providers for the service
- Collects available slots from each provider
- Merges slots using round-robin algorithm
- Returns slots with assigned provider info

**Response**:
```json
{
  "all_available_slots_for_data": [
    {
      "start_time": "2025-11-17 09:00:00+00:00",
      "end_time": "2025-11-17 09:30:00+00:00",
      "provider_id": "PRV-001",
      "provider_name": "Dr. Sarah Johnson"
    },
    {
      "start_time": "2025-11-17 09:30:00+00:00",
      "end_time": "2025-11-17 10:00:00+00:00",
      "provider_id": "PRV-002",
      "provider_name": "Dr. Michael Chen"
    },
    ...
  ],
  "is_organization": true,
  "provider_count": 3,
  ...
}
```

---

### 4. New Function: `merge_slots_round_robin`

**Purpose**: Implement true round-robin provider assignment

**Algorithm**:
1. Create time slot buckets (which providers are available for each slot)
2. Start from last assigned provider (for session continuity)
3. For each time slot:
   - Find next provider in round-robin order who is available
   - Assign slot to that provider
   - Move to next provider for next slot
4. Update last assigned provider

**Example**:
```
Providers: A, B, C
Slots: 9:00, 9:30, 10:00, 10:30, 11:00, 11:30

Assignment:
9:00  → Provider A
9:30  → Provider B
10:00 → Provider C
10:30 → Provider A
11:00 → Provider B
11:30 → Provider C
```

---

### 5. Modified: `book_time_slot`

**Added Parameters**:
- `provider_id` (optional)
- `organization_id` (optional)

**Logic**:
- If both `organization_id` and `provider_id` are provided:
  - Verifies provider belongs to organization
  - Gets provider's user and availability
  - Books with that specific provider
- Otherwise, uses existing individual provider logic

---

### 6. Helper Functions

#### `get_service_providers(service_name)`
- Returns all active providers for a service's organization
- Filters:
  - `accept_org_bookings = 1`
  - `organization_status = "active"`

#### `get_last_assigned_provider(service_name)`
- Returns last assigned provider for round-robin
- Uses in-memory cache `_last_assigned_provider`

#### `update_last_assigned_provider(service_name, provider_name)`
- Updates last assigned provider for session continuity

---

## 🔍 How Round-Robin Works

### Scenario: 3 Providers, 16 Slots Available

```python
# Day 1, 9:00 AM - 5:00 PM, 30-min slots (16 total)
Providers: Dr. A, Dr. B, Dr. C

# All providers available for all slots
# Round-robin assignment:

09:00-09:30 → Dr. A
09:30-10:00 → Dr. B
10:00-10:30 → Dr. C
10:30-11:00 → Dr. A
11:00-11:30 → Dr. B
11:30-12:00 → Dr. C
12:00-12:30 → Dr. A
12:30-13:00 → Dr. B
13:00-13:30 → Dr. C
13:30-14:00 → Dr. A
14:00-14:30 → Dr. B
14:30-15:00 → Dr. C
15:00-15:30 → Dr. A
15:30-16:00 → Dr. B
16:00-16:30 → Dr. C
16:30-17:00 → Dr. A

# Each provider gets ~5-6 slots
# Fair distribution!
```

### Scenario: Provider Has Conflict

```python
# Dr. B has appointment at 10:00-10:30

Available for 10:00-10:30 slot:
- Dr. A: Available
- Dr. B: CONFLICT (skip)
- Dr. C: Available

# Round-robin says "Dr. B's turn"
# But Dr. B has conflict
# So algorithm tries next: Dr. C
# Dr. C is available → assigned

10:00-10:30 → Dr. C (instead of Dr. B)
10:30-11:00 → Dr. A (next in rotation)
```

---

## 📊 API Flow Comparison

### Individual Provider Booking (Current)

```
1. GET /api/method/frappe_appointment.api.personal_meet.get_meeting_windows?slug=dr-sarah
   Response: { full_name: "Dr. Sarah", durations: [...] }

2. GET /api/method/frappe_appointment.api.personal_meet.get_time_slots?duration_id=xxx&date=2025-11-17
   Response: { all_available_slots_for_data: [...] }

3. POST /api/method/frappe_appointment.api.personal_meet.book_time_slot
   Body: { duration_id, date, start_time, end_time, ... }
   Response: { success: true }
```

### Organization Booking (NEW)

```
1. GET /api/method/frappe_appointment.api.personal_meet.get_organization_meeting_windows?org_slug=mahlet-clinic&service_slug=general-consultation
   Response: {
     full_name: "Mahlet Clinic",
     organization_id: "ORG-001",
     service_id: "SRV-001",
     provider_count: 3,
     durations: [...]
   }

2. GET /api/method/frappe_appointment.api.personal_meet.get_time_slots?duration_id=xxx&date=2025-11-17&organization_id=ORG-001&service_id=SRV-001
   Response: {
     all_available_slots_for_data: [
       { start_time: "...", provider_id: "PRV-001", provider_name: "Dr. Sarah" },
       { start_time: "...", provider_id: "PRV-002", provider_name: "Dr. Michael" },
       ...
     ],
     is_organization: true,
     provider_count: 3
   }

3. POST /api/method/frappe_appointment.api.personal_meet.book_time_slot
   Body: {
     duration_id, date, start_time, end_time,
     provider_id: "PRV-001",  // From selected slot
     organization_id: "ORG-001",
     ...
   }
   Response: { success: true }
```

---

## 🧪 Testing Plan

### Backend Testing (Console)

```python
# Step 1: Complete organization onboarding (from previous steps)
# ... (organization, providers, services all set up)

# Step 2: Test Organization Meeting Windows
result = frappe.call(
    "frappe_appointment.api.personal_meet.get_organization_meeting_windows",
    {
        "org_slug": "mahlet-clinic",
        "service_slug": "General Consultation"
    }
)
print(result)
# Expected: organization info, provider_count > 1, durations

# Step 3: Test Multi-Provider Time Slots
result = frappe.call(
    "frappe_appointment.api.personal_meet.get_time_slots",
    {
        "duration_id": "7rdb483q9a",
        "date": "2025-11-18",
        "user_timezone_offset": "180",
        "organization_id": "ORG-001",
        "service_id": "SRV-001"
    }
)
print(len(result["all_available_slots_for_data"]))
# Expected: Slots with provider_id and provider_name

# Verify round-robin distribution
providers = {}
for slot in result["all_available_slots_for_data"]:
    provider_id = slot["provider_id"]
    providers[provider_id] = providers.get(provider_id, 0) + 1

print(providers)
# Expected: Roughly equal distribution (e.g., {PRV-001: 5, PRV-002: 6, PRV-003: 5})

# Step 4: Test Booking with Specific Provider
result = frappe.call(
    "frappe_appointment.api.personal_meet.book_time_slot",
    {
        "duration_id": "7rdb483q9a",
        "date": "2025-11-18",
        "start_time": "2025-11-18 09:00:00",
        "end_time": "2025-11-18 09:30:00",
        "user_timezone_offset": "180",
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "provider_id": "PRV-001",
        "organization_id": "ORG-001"
    }
)
print(result)
# Expected: { success: true, event_id: "EVT-..." }

# Verify event was created with correct provider
event = frappe.get_last_doc("Event")
print(event.custom_user_calendar)  # Should be provider's user
```

### Manual API Testing (curl)

```bash
# Test organization meeting windows
curl "http://localhost:8000/api/method/frappe_appointment.api.personal_meet.get_organization_meeting_windows?org_slug=mahlet-clinic&service_slug=general-consultation"

# Test multi-provider time slots
curl "http://localhost:8000/api/method/frappe_appointment.api.personal_meet.get_time_slots?duration_id=7rdb483q9a&date=2025-11-18&user_timezone_offset=180&organization_id=ORG-001&service_id=SRV-001"

# Test booking (POST)
curl -X POST "http://localhost:8000/api/method/frappe_appointment.api.personal_meet.book_time_slot" \
  -H "Content-Type: application/json" \
  -d '{
    "duration_id": "7rdb483q9a",
    "date": "2025-11-18",
    "start_time": "2025-11-18 09:00:00",
    "end_time": "2025-11-18 09:30:00",
    "user_timezone_offset": "180",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "provider_id": "PRV-001",
    "organization_id": "ORG-001"
  }'
```

---

## 📝 Files Modified

- ✅ `/frappe_appointment/api/personal_meet.py` - Added 310 lines
  - New: `get_organization_meeting_windows` (whitelist API)
  - New: `get_multi_provider_time_slots` (internal)
  - New: `merge_slots_round_robin` (internal)
  - New: `get_service_providers` (helper)
  - New: `get_last_assigned_provider` (helper)
  - New: `update_last_assigned_provider` (helper)
  - Modified: `get_time_slots` (added organization support)
  - Modified: `book_time_slot` (added provider assignment)

---

## ⚠️ Known Limitations & Future Enhancements

### Current Limitations:
1. **In-Memory Cache**: Last assigned provider stored in `_last_assigned_provider` dict
   - Lost on server restart
   - Not shared across multiple workers
   - **Solution**: Store in Redis cache or database

2. **No Customer Preference**: Round-robin only, customers can't choose specific provider
   - **Solution**: Add "choose provider" mode in frontend

3. **No Conflict Detection**: Doesn't check provider's existing appointments or Google Calendar
   - Relies on time slot generation already filtering conflicts
   - **Solution**: Add explicit conflict check in `merge_slots_round_robin`

### Future Enhancements:
1. **Provider Preference Weighting**:
   - Assign more slots to experienced providers
   - Respect provider seniority

2. **Load Balancing**:
   - Track actual booking counts (not just assignments)
   - Balance based on completed appointments

3. **Provider Capacity**:
   - Allow setting different capacities per provider
   - Respect daily/weekly limits

4. **Customer Loyalty**:
   - Allow customers to book with "last provider"
   - Track customer-provider relationships

---

## 🎯 Next Steps

### Option 1: Frontend Components (Recommended)
- Build organization onboarding UI (5 steps)
- Add organization booking page support
- Display provider names in booking UI

### Option 2: Advanced Features
- Add customer provider selection
- Implement persistent round-robin (Redis)
- Add booking analytics dashboard

### Option 3: Testing & Documentation
- Test end-to-end with manual API calls
- Create video demo
- Update user documentation

---

**Status**: Multi-provider booking logic complete ✅  
**Test Status**: Backend APIs ready for testing ⏳  
**Frontend Status**: Needs implementation ⏳  

**Estimated Testing Time**: 1-2 hours  
**Estimated Frontend Time**: 6-8 hours (organization onboarding + booking pages)



