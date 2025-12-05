# AI Agent Prompt: Sprint 2 - Slot Engine & Policies Implementation

## Context
You are implementing **Sprint 2: Slot Engine & Policies** for a Frappe-based appointment scheduling system. This sprint adds smart availability rules, conflict detection, buffer time enforcement, and a policy engine for deposits/cancellations.

## Project Structure
- **App Path**: `/home/minte/projects/frappe-bench/apps/frappe_appointment`
- **Backend Module**: `frappe_appointment/scheduler/`
- **Existing Files**:
  - `frappe_appointment/scheduler/availability.py` - Availability resolution (already exists)
  - `frappe_appointment/api/personal_meet.py` - Booking APIs (already exists)
  - `frappe_appointment/frappe_appointment/doctype/appointment_group/appointment_group.py` - Slot generation (upstream)

## What Already Exists
1. ✅ **Availability Model**: Location → Service → Provider hierarchy with opening hours
2. ✅ **Doctypes**: Location, Service, Provider, Appointment, Booking Event, EventType
3. ✅ **Basic Slot Generation**: Upstream code generates slots from opening hours
4. ✅ **Time Slot API**: `get_time_slots()` in `personal_meet.py` returns available slots

## What Needs to Be Built

### Task 1: Create Policy Doctype
**Location**: `frappe_appointment/scheduler/doctype/policy/`

**Fields Required**:
- `policy_name` (Data) - Name of policy
- `description` (Small Text) - Policy description
- `is_active` (Check) - Enable/disable policy
- `applies_to` (Select) - Options: "All Services", "Specific Service", "Specific Location", "Specific Provider"
- `service` (Link to Service) - If applies_to = "Specific Service"
- `location` (Link to Location) - If applies_to = "Specific Location"
- `provider` (Link to Provider) - If applies_to = "Specific Provider"
- `deposit_percentage` (Percent) - Required deposit % (0-100)
- `deposit_amount` (Currency) - Fixed deposit amount (alternative to percentage)
- `cancellation_window_hours` (Int) - Hours before appointment for free cancellation
- `late_cancellation_fee_percentage` (Percent) - Fee % for late cancellation
- `late_cancellation_fee_amount` (Currency) - Fixed fee amount
- `reschedule_window_hours` (Int) - Hours before appointment for free reschedule
- `no_show_fee_percentage` (Percent) - Fee % for no-show
- `refund_policy` (Select) - Options: "Full Refund", "Partial Refund", "No Refund"
- `valid_from` (Date) - Policy start date
- `valid_to` (Date) - Policy end date (optional)

**Python File**: Add validation in `policy.py`:
- Validate that deposit_percentage + deposit_amount are not both set
- Validate cancellation_window_hours >= 0
- Validate dates (valid_from <= valid_to if both set)

### Task 2: Create Policy Engine Service
**Location**: `frappe_appointment/scheduler/helpers/policy_engine.py`

**Functions to Implement**:

```python
def get_applicable_policies(service_name: str, location_name: str = None, provider_name: str = None, appointment_date: datetime = None) -> List[Dict]:
    """
    Get all applicable policies for a booking combination.
    
    Priority order:
    1. Provider-specific policies
    2. Service-specific policies
    3. Location-specific policies
    4. All Services policies
    
    Args:
        service_name: Service name (required)
        location_name: Location name (optional)
        provider_name: Provider name (optional)
        appointment_date: Appointment date (optional, for date range validation)
    
    Returns:
        List of policy dicts sorted by priority (most specific first)
    """
    pass

def calculate_booking_quote(service_name: str, service_price: float, location_name: str = None, provider_name: str = None, appointment_date: datetime = None) -> Dict:
    """
    Calculate booking quote with deposit and policy information.
    
    Returns:
        {
            "total_price": 1000.0,
            "deposit_amount": 500.0,
            "deposit_percentage": 50.0,
            "remaining_amount": 500.0,
            "cancellation_deadline": "2025-01-20 14:00:00",
            "reschedule_deadline": "2025-01-20 14:00:00",
            "late_cancellation_fee": 200.0,
            "no_show_fee": 1000.0,
            "policies": [...],
            "refund_policy": "Full Refund"
        }
    """
    pass

def validate_reschedule(appointment_name: str, new_start_time: datetime) -> Tuple[bool, str]:
    """
    Validate if reschedule is allowed based on policies.
    
    Returns:
        (is_allowed: bool, error_message: str)
    """
    pass

def validate_cancellation(appointment_name: str) -> Tuple[bool, str, Dict]:
    """
    Validate if cancellation is allowed and calculate refund.
    
    Returns:
        (is_allowed: bool, error_message: str, refund_info: Dict)
    """
    pass
```

### Task 3: Enhance Slot Engine with Conflict Detection
**Location**: `frappe_appointment/scheduler/helpers/slot_engine.py`

**Functions to Implement**:

```python
def check_conflicts(provider_name: str, location_name: str, start_time: datetime, end_time: datetime, exclude_appointment: str = None) -> List[Dict]:
    """
    Check for conflicting appointments.
    
    Args:
        provider_name: Provider name
        location_name: Location name
        start_time: Proposed start time
        end_time: Proposed end time
        exclude_appointment: Appointment name to exclude from conflict check (for rescheduling)
    
    Returns:
        List of conflicting appointments:
        [
            {
                "appointment_name": "APT-00001",
                "start_time": "2025-01-20 14:00:00",
                "end_time": "2025-01-20 15:00:00",
                "client_name": "John Doe"
            },
            ...
        ]
    """
    pass

def apply_buffer_times(slots: List[Dict], buffer_before: int, buffer_after: int, existing_appointments: List[Dict]) -> List[Dict]:
    """
    Apply buffer times to slots, removing slots that violate buffer rules.
    
    Args:
        slots: List of available slots
        buffer_before: Minutes to block before each appointment
        buffer_after: Minutes to block after each appointment
        existing_appointments: List of existing appointments
    
    Returns:
        Filtered list of slots with buffers applied
    """
    pass

def filter_by_working_hours(slots: List[Dict], location_name: str, service_name: str = None, provider_name: str = None) -> List[Dict]:
    """
    Filter slots to only include times within working hours.
    
    Uses availability.py functions to get working hours.
    """
    pass

def filter_by_time_off(slots: List[Dict], provider_name: str) -> List[Dict]:
    """
    Filter out slots during provider's time-off periods.
    
    Check Provider doctype for time-off records (if they exist) or User Appointment Availability.
    """
    pass
```

### Task 4: Create Booking Quote API
**Location**: `frappe_appointment/scheduler/api/quote.py`

**API Endpoint**:
```python
@frappe.whitelist(allow_guest=True)
def get_booking_quote(service_name: str, location_name: str = None, provider_name: str = None, appointment_date: str = None):
    """
    GET /api/method/frappe_appointment.scheduler.api.quote.get_booking_quote
    
    Returns booking quote with pricing and policies.
    
    Args (via request):
        service_name: Service name (required)
        location_name: Location name (optional)
        provider_name: Provider name (optional)
        appointment_date: ISO date string (optional)
    
    Returns:
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
                "policies": [
                    {
                        "policy_name": "Standard Deposit Policy",
                        "deposit_percentage": 50.0,
                        "cancellation_window_hours": 24
                    }
                ]
            }
        }
    """
    pass
```

### Task 5: Integrate Conflict Detection into Booking API
**Location**: `frappe_appointment/api/personal_meet.py`

**Modify `book_time_slot()` function**:
- Before creating appointment, call `check_conflicts()`
- If conflicts found, return error: `{"error": "Time slot is already booked", "conflicts": [...]}`
- Apply buffer times before checking conflicts
- Validate against working hours
- Validate against provider time-off

### Task 6: Update Time Slot Generation
**Location**: `frappe_appointment/api/personal_meet.py`

**Modify `get_time_slots()` function**:
- After getting slots from upstream code, apply:
  1. `filter_by_working_hours()`
  2. `filter_by_time_off()`
  3. `apply_buffer_times()`
  4. `check_conflicts()` (mark slots as unavailable if conflicts exist)

## Implementation Steps

1. **Create Policy Doctype**
   - Use `bench new-doctype` or create manually
   - Add all fields listed above
   - Add validation in Python file

2. **Create Policy Engine Module**
   - Create `frappe_appointment/scheduler/helpers/policy_engine.py`
   - Implement all functions listed above
   - Test with console: `frappe.get_doc("Policy", "POL-00001")`

3. **Create Slot Engine Module**
   - Create `frappe_appointment/scheduler/helpers/slot_engine.py`
   - Implement conflict detection and buffer time functions
   - Integrate with existing availability.py

4. **Create Quote API**
   - Create `frappe_appointment/scheduler/api/quote.py`
   - Implement `get_booking_quote()` endpoint
   - Test via browser: `/api/method/frappe_appointment.scheduler.api.quote.get_booking_quote?service_name=SVC-00001`

5. **Integrate into Booking Flow**
   - Modify `book_time_slot()` in `personal_meet.py`
   - Add conflict checks before creating appointment
   - Return quote information in booking response

6. **Update Time Slot Generation**
   - Modify `get_time_slots()` in `personal_meet.py`
   - Apply all filters (working hours, time-off, buffers, conflicts)

## Testing Checklist

### Console Tests
```python
# Test 1: Create Policy
policy = frappe.get_doc({
    "doctype": "Policy",
    "policy_name": "Test Policy",
    "deposit_percentage": 50,
    "cancellation_window_hours": 24,
    "is_active": 1
})
policy.insert()

# Test 2: Get Applicable Policies
from frappe_appointment.scheduler.helpers.policy_engine import get_applicable_policies
policies = get_applicable_policies("SVC-00001", "LOC-00001", "PROV-00001")

# Test 3: Calculate Quote
from frappe_appointment.scheduler.helpers.policy_engine import calculate_booking_quote
quote = calculate_booking_quote("SVC-00001", 1000.0, "LOC-00001", "PROV-00001")

# Test 4: Check Conflicts
from frappe_appointment.scheduler.helpers.slot_engine import check_conflicts
conflicts = check_conflicts("PROV-00001", "LOC-00001", datetime(2025, 1, 20, 14, 0), datetime(2025, 1, 20, 15, 0))

# Test 5: Try to book conflicting slot (should fail)
frappe.call("frappe_appointment.api.personal_meet.book_time_slot", {
    "provider_name": "PROV-00001",
    "start_time": "2025-01-20 14:00:00",
    "end_time": "2025-01-20 15:00:00"
})
# Should return error about conflicts
```

### Browser Tests
1. Visit booking page, select service
2. Check that slots respect working hours (no slots outside 9 AM - 5 PM)
3. Try to book same slot twice → second booking should fail
4. Check quote API: `/api/method/frappe_appointment.scheduler.api.quote.get_booking_quote?service_name=SVC-00001`
5. Verify buffer times are applied (15 min gap between slots)

## Acceptance Criteria

✅ **Policy Doctype Created**
- All fields present and validated
- Can create policies via desk UI
- Policies can be linked to Service/Location/Provider

✅ **Policy Engine Functional**
- `get_applicable_policies()` returns correct policies based on priority
- `calculate_booking_quote()` calculates deposit and fees correctly
- `validate_reschedule()` enforces reschedule window
- `validate_cancellation()` calculates refund correctly

✅ **Conflict Detection Working**
- `check_conflicts()` detects overlapping appointments
- Booking API rejects conflicting bookings
- Time slot API marks conflicting slots as unavailable

✅ **Buffer Times Enforced**
- Slots have minimum gap based on buffer settings
- Buffer times applied before and after appointments
- No slots generated that violate buffer rules

✅ **Working Hours Respected**
- Slots only generated during location/service/provider working hours
- Uses availability.py functions correctly

✅ **Quote API Functional**
- Returns complete quote with pricing and policies
- Handles missing parameters gracefully
- Returns ETB currency

## Files to Create/Modify

**New Files**:
1. `frappe_appointment/scheduler/doctype/policy/policy.json`
2. `frappe_appointment/scheduler/doctype/policy/policy.py`
3. `frappe_appointment/scheduler/helpers/policy_engine.py`
4. `frappe_appointment/scheduler/helpers/slot_engine.py`
5. `frappe_appointment/scheduler/api/quote.py`

**Modified Files**:
1. `frappe_appointment/api/personal_meet.py` - Add conflict checks and filters
2. `frappe_appointment/scheduler/doctype/policy/policy.json` - Add any missing fields

## Notes

- Use existing `frappe_appointment/scheduler/availability.py` for working hours
- Buffer times may already exist in upstream code - check `appointment_group.py`
- Policy engine should handle multiple policies (most specific wins)
- All datetime operations must respect timezones (Africa/Addis_Ababa default)
- Currency should be ETB (Ethiopian Birr)
- Error messages should be user-friendly and translatable

## Success Criteria

When complete, you should be able to:
1. Create a policy requiring 50% deposit
2. Book an appointment and see deposit amount in quote
3. Try to book overlapping appointment → get error
4. See slots respect working hours and buffer times
5. Reschedule appointment within policy window → success
6. Reschedule outside policy window → get error with policy details








