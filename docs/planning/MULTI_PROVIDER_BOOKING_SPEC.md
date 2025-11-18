# Multi-Provider Booking Logic Specification

## Overview
Implement round-robin provider assignment for organization bookings with conflict detection across multiple providers.

---

## URL Patterns

### Individual Provider (Current)
```
/schedule/in/{slug}
```
- `slug` = User Appointment Availability slug OR EventType name
- Single provider booking
- **Status**: ✅ Working

### Organization Booking (New)
```
/schedule/org/{org_slug}/{service_slug}
```
- `org_slug` = Organization slug
- `service_slug` = EventType/Service slug
- Multi-provider booking with round-robin
- **Status**: ⏳ To implement

---

## Round-Robin Assignment Strategy

### Priority Order:
1. **Customer Preference** - If customer selects specific provider
2. **Round-Robin** - Rotate through available providers
3. **First Available** - Fallback if round-robin fails

### Algorithm:
```python
def get_next_provider(service, date, time_slot):
    # Get all providers for this service
    providers = get_service_providers(service)
    
    # Get last assigned provider for this service
    last_assigned = get_last_assigned_provider(service)
    
    # Rotate to next provider
    next_index = (providers.index(last_assigned) + 1) % len(providers)
    
    # Check availability starting from next provider
    for i in range(len(providers)):
        provider_index = (next_index + i) % len(providers)
        provider = providers[provider_index]
        
        if is_provider_available(provider, date, time_slot):
            return provider
    
    # No provider available
    return None
```

---

## API Changes

### 1. `get_meeting_windows(slug)` - Add Organization Support

**Current**: Handles individual provider slugs and EventType names

**Add**: Detect and handle organization URL pattern

```python
@frappe.whitelist(allow_guest=True)
@add_response_code
def get_meeting_windows(slug, org_slug=None):
    """
    If org_slug is provided, this is an organization booking
    slug = service slug
    org_slug = organization slug
    """
    if org_slug:
        # Organization booking
        return get_organization_meeting_windows(org_slug, slug)
    else:
        # Individual booking (current logic)
        # ... existing code ...
```

**New Function**:
```python
def get_organization_meeting_windows(org_slug, service_slug):
    # Get Organization
    org = frappe.get_doc("Organization", {"slug": org_slug})
    
    # Get Service/EventType
    event_type = frappe.get_doc("EventType", {"name": service_slug})
    service = frappe.get_doc("Service", event_type.service)
    
    # Get all providers for this service
    providers = get_service_providers(service)
    
    # Get durations from service
    durations = get_service_durations(service, providers)
    
    return {
        "full_name": org.organization_name,
        "profile_pic": org.logo,
        "company": org.organization_name,
        "meeting_provider": "builtin",
        "durations": durations,
        "is_organization": True,
        "organization_id": org.name,
        "service_id": service.name,
        "provider_count": len(providers)
    }
```

---

### 2. `get_time_slots(duration_id, date, ...)` - Add Round-Robin Logic

**Current**: Gets slots for single provider

**Add**: Aggregate slots from all providers, indicate which provider for each slot

```python
@frappe.whitelist(allow_guest=True)
@add_response_code
def get_time_slots(duration_id, date, user_timezone_offset, organization_id=None, service_id=None):
    """
    If organization_id is provided, use round-robin logic
    """
    if organization_id and service_id:
        # Multi-provider booking
        return get_multi_provider_time_slots(
            organization_id, service_id, duration_id, date, user_timezone_offset
        )
    else:
        # Single provider booking (current logic)
        # ... existing code ...
```

**New Function**:
```python
def get_multi_provider_time_slots(org_id, service_id, duration_id, date, user_timezone_offset):
    # Get service and providers
    service = frappe.get_doc("Service", service_id)
    providers = get_service_providers(service)
    
    # Collect all available slots from all providers
    all_provider_slots = {}
    for provider in providers:
        provider_slots = get_provider_time_slots(
            provider.user, duration_id, date, user_timezone_offset
        )
        all_provider_slots[provider.name] = {
            "provider": provider,
            "slots": provider_slots
        }
    
    # Merge slots with round-robin assignment
    merged_slots = merge_slots_round_robin(all_provider_slots, service)
    
    return {
        "all_available_slots_for_data": merged_slots,
        "date": date,
        "duration": duration,
        "starttime": earliest_slot,
        "endtime": latest_slot,
        "total_slots_for_day": len(merged_slots),
        "available_days": available_days,
        "is_organization": True,
        "provider_count": len(providers)
    }
```

**Helper Function - Merge Slots**:
```python
def merge_slots_round_robin(all_provider_slots, service):
    """
    Merge slots from multiple providers, assigning provider via round-robin
    
    Returns: [
        {
            "start_time": "2025-11-17 09:00:00+00:00",
            "end_time": "2025-11-17 09:30:00+00:00",
            "provider_id": "PRV-001",
            "provider_name": "Dr. Sarah"
        },
        ...
    ]
    """
    # Get last assigned provider for round-robin
    last_assigned = get_last_assigned_provider(service.name)
    
    # Create time slot buckets
    time_slot_map = {}  # {time_key: [provider1, provider2, ...]}
    
    # Collect all unique time slots
    for provider_name, data in all_provider_slots.items():
        provider = data["provider"]
        slots = data["slots"]
        
        for slot in slots:
            time_key = f"{slot['start_time']}_{slot['end_time']}"
            if time_key not in time_slot_map:
                time_slot_map[time_key] = []
            time_slot_map[time_key].append(provider)
    
    # Assign providers to slots using round-robin
    merged_slots = []
    providers_list = list(all_provider_slots.keys())
    current_provider_index = providers_list.index(last_assigned) if last_assigned in providers_list else 0
    
    for time_key, available_providers in sorted(time_slot_map.items()):
        # Find next available provider using round-robin
        assigned = False
        for i in range(len(providers_list)):
            provider_index = (current_provider_index + i) % len(providers_list)
            provider_name = providers_list[provider_index]
            
            if any(p.name == provider_name for p in available_providers):
                # This provider is available for this slot
                provider = next(p for p in available_providers if p.name == provider_name)
                
                start_time, end_time = time_key.split("_")
                merged_slots.append({
                    "start_time": start_time,
                    "end_time": end_time,
                    "provider_id": provider.name,
                    "provider_name": provider.provider_name
                })
                
                # Move to next provider for next slot
                current_provider_index = (provider_index + 1) % len(providers_list)
                assigned = True
                break
        
        # If no provider available (shouldn't happen), skip slot
        if not assigned:
            continue
    
    # Update last assigned provider for this service
    update_last_assigned_provider(service.name, providers_list[current_provider_index])
    
    return merged_slots
```

---

### 3. `book_time_slot(...)` - Assign to Specific Provider

**Current**: Books with single provider

**Add**: Use provider_id from slot selection

```python
@frappe.whitelist(allow_guest=True, methods=["POST"])
@add_response_code
def book_time_slot(duration_id, date, time_slot, full_name, email, guests=None, provider_id=None, organization_id=None):
    """
    If provider_id is provided, book with that specific provider
    If organization_id is provided, verify provider belongs to organization
    """
    if organization_id and provider_id:
        # Verify provider belongs to organization
        provider = frappe.get_doc("Provider", provider_id)
        if provider.organization != organization_id:
            frappe.throw(_("Invalid provider for this organization"))
        
        # Book with this specific provider
        # ... booking logic using provider_id ...
    else:
        # Single provider booking (current logic)
        # ... existing code ...
```

---

## Conflict Detection

### Check Conflicts Across All Providers

```python
def check_provider_conflicts(provider, date, start_time, end_time):
    """
    Check if provider has conflicts at this time
    Returns: True if available, False if conflict
    """
    # Check Frappe Events (existing appointments)
    events = frappe.get_all(
        "Event",
        filters={
            "custom_user_calendar": provider.user,
            "starts_on": ["between", [date + " 00:00:00", date + " 23:59:59"]]
        },
        fields=["starts_on", "ends_on"]
    )
    
    for event in events:
        if times_overlap(event.starts_on, event.ends_on, start_time, end_time):
            return False
    
    # Check Google Calendar (if synced)
    if provider.calendar_preference == "google":
        google_events = get_google_calendar_events(provider.user, date)
        for event in google_events:
            if times_overlap(event["start"], event["end"], start_time, end_time):
                return False
    
    return True
```

---

## Helper Functions

### Get Service Providers

```python
def get_service_providers(service):
    """
    Get all providers for a service
    Returns list of Provider documents
    """
    org_id = service.organization
    
    # Get all providers for this organization
    provider_names = frappe.get_all(
        "Provider",
        filters={
            "organization": org_id,
            "accept_org_bookings": 1,
            "organization_status": "active"
        },
        fields=["name"],
        order_by="name"
    )
    
    return [frappe.get_doc("Provider", p.name) for p in provider_names]
```

### Last Assigned Provider Tracking

```python
# Store in cache for current session
_last_assigned = {}

def get_last_assigned_provider(service_name):
    """Get last assigned provider for round-robin"""
    return _last_assigned.get(service_name, None)

def update_last_assigned_provider(service_name, provider_name):
    """Update last assigned provider"""
    _last_assigned[service_name] = provider_name
```

---

## Frontend Changes (Minimal)

### Booking URL Construction

**Individual**: `/schedule/in/{slug}` (no change)

**Organization**: `/schedule/org/{org_slug}/{service_slug}` (new)

### API Call Parameters

When calling `get_time_slots` for organization booking, include:
- `organization_id`
- `service_id`

When calling `book_time_slot` for organization booking, include:
- `provider_id` (from selected slot)
- `organization_id`

---

## Database Changes

### Service Doctype
Add field if not exists:
- `provider_assignment` (Select: round_robin, customer_choice, specific)

### Event Doctype
Add custom field if not exists:
- `custom_assigned_provider` (Link to Provider)

---

## Testing Plan

### 1. Organization Booking URL
```
Test URL: /schedule/org/test-clinic/general-consultation
Expected: Shows organization name, service details
```

### 2. Multi-Provider Time Slots
```
Scenario: Organization has 3 providers, 10 slots available
Expected: Slots assigned in round-robin (Provider 1, 2, 3, 1, 2, 3, ...)
```

### 3. Conflict Detection
```
Scenario: Provider 1 has booking at 10:00-10:30
Expected: That slot assigned to Provider 2 or 3
```

### 4. Booking Assignment
```
Scenario: Customer books 10:00 slot assigned to Provider 2
Expected: Event created with Provider 2 as attendee
```

---

## Implementation Order

1. ✅ Backend APIs for organization onboarding (Done)
2. 🔄 Add organization URL detection to `get_meeting_windows`
3. 🔄 Implement `get_multi_provider_time_slots`
4. 🔄 Add round-robin slot assignment logic
5. 🔄 Update `book_time_slot` for provider assignment
6. 🔄 Add conflict detection across providers
7. ⏳ Test with manual API calls
8. ⏳ Frontend components (later)

---

**Created**: 2025-11-17  
**Status**: Specification complete, ready for implementation



