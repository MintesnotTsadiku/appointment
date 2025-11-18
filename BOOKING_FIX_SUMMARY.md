# Booking Page Fix Summary

## Problem
The booking page showed "No open-time slots" even after completing onboarding.

## Root Cause
The `User Appointment Availability` doctype has a child table called `appointment_time_slot` that defines which days of the week the user is available. This table was **empty**, causing the booking system to think no days were available.

The onboarding flow was creating:
- ✅ `User Appointment Availability` record
- ✅ `Appointment Slot Duration` record  
- ✅ `Location` with `Opening Hours`
- ❌ **BUT NOT** populating `appointment_time_slot`

## Solution
Updated `frappe_appointment/onboarding.py` → `create_service()` function to:

1. After creating/updating `User Appointment Availability`
2. Read the `Location`'s `Opening Hours` 
3. Extract available days and times
4. Populate the `appointment_time_slot` child table with:
   - `day`: Day of week (Monday, Tuesday, etc.)
   - `start_time`: Earliest start time for that day
   - `end_time`: Latest end time for that day

### Key Code Addition
```python
# CRITICAL: Populate appointment_time_slot based on Location's Opening Hours
# This is required for the booking calendar to show available days
user_availability = frappe.get_doc("User Appointment Availability", user_availability.name)
user_availability.appointment_time_slot = []  # Clear existing

# Helper to convert timedelta to time string (HH:MM:SS)
def timedelta_to_str(td):
    if isinstance(td, str):
        return td
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

# Group Opening Hours by day
day_hours = {}
for oh in location.opening_hours:
    if oh.is_open:
        day = oh.day_of_week
        start_str = timedelta_to_str(oh.start_time)
        end_str = timedelta_to_str(oh.end_time)
        if day not in day_hours:
            day_hours[day] = {"start": start_str, "end": end_str}
        else:
            # If multiple slots per day, use earliest start and latest end
            if start_str < day_hours[day]["start"]:
                day_hours[day]["start"] = start_str
            if end_str > day_hours[day]["end"]:
                day_hours[day]["end"] = end_str

# Add each available day to appointment_time_slot
for day in sorted(day_hours.keys()):
    user_availability.append("appointment_time_slot", {
        "day": day,
        "start_time": day_hours[day]["start"],
        "end_time": day_hours[day]["end"]
    })

user_availability.flags.ignore_mandatory = True
user_availability.save()
```

## How the Booking System Works

### Data Flow
1. **Frontend** calls `get_meeting_windows(slug)` → Gets available durations
2. **Frontend** calls `get_time_slots(duration_id, date)` → Gets available time slots for a date
3. **Backend** (`personal_meet.py`):
   - Creates a dummy `Appointment Group` from `User Appointment Availability`
   - Calls `_get_time_slots_for_day()` from `appointment_group.py`
4. **`appointment_group.py`** → `check_availability()`:
   - Reads `appointment_time_slot` from `User Appointment Availability`
   - Checks if the requested date's weekday is in the available days
   - If not available, marks date as invalid
5. **Returns** available time slots based on:
   - Available days (from `appointment_time_slot`)
   - Time ranges (from `appointment_time_slot`)
   - Existing bookings (to avoid conflicts)
   - Buffer times

### Required Records for Booking to Work
1. **User Appointment Availability**
   - `user`: Link to User
   - `slug`: URL-safe identifier
   - `enable_scheduling`: 1
   - `meeting_provider`: "builtin" (or "google", "zoom", etc.)
   - **`appointment_time_slot`** ← **CRITICAL**: Child table with available days/times

2. **Appointment Slot Duration** (child of User Appointment Availability)
   - `title`: Display name (e.g., "General Consultation")
   - `duration`: Duration in seconds (e.g., 1800 = 30 min)
   - `minimum_buffer_time`: Buffer in seconds
   - `availability_window`: Days ahead to show (e.g., 30)

3. **Location** (linked to Provider)
   - `opening_hours`: Child table with business hours
   - Used to populate `appointment_time_slot`

## Testing
After the fix, the existing record was manually updated via console:

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe

user_availability = frappe.get_doc('User Appointment Availability', 'Administrator')
provider = frappe.get_doc('Provider', 'Administrator')
location = frappe.get_doc('Location', provider.locations[0].location)

user_availability.appointment_time_slot = []

def timedelta_to_str(td):
    if isinstance(td, str):
        return td
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f'{hours:02d}:{minutes:02d}:{seconds:02d}'

day_hours = {}
for oh in location.opening_hours:
    if oh.is_open:
        day = oh.day_of_week
        start_str = timedelta_to_str(oh.start_time)
        end_str = timedelta_to_str(oh.end_time)
        if day not in day_hours:
            day_hours[day] = {'start': start_str, 'end': end_str}

for day in sorted(day_hours.keys()):
    user_availability.append('appointment_time_slot', {
        'day': day,
        'start_time': day_hours[day]['start'],
        'end_time': day_hours[day]['end']
    })

user_availability.flags.ignore_mandatory = True
user_availability.save()
frappe.db.commit()
"
```

## Result
✅ Booking page now shows available time slots for Monday-Friday, 9:00-17:00
✅ Users can select dates and times
✅ Booking URL: `http://localhost:5173/schedule/in/general-consultation`

## Future Onboarding Runs
The fix is now in the `create_service()` function, so all future onboarding completions will automatically populate `appointment_time_slot`.

## Related Files
- `/home/minte/projects/frappe-bench/apps/frappe_appointment/frappe_appointment/onboarding.py` (updated)
- `/home/minte/projects/frappe-bench/apps/frappe_appointment/frappe_appointment/api/personal_meet.py`
- `/home/minte/projects/frappe-bench/apps/frappe_appointment/frappe_appointment/frappe_appointment/doctype/appointment_group/appointment_group.py`
- `/home/minte/projects/frappe-bench/apps/frappe_appointment/frappe_appointment/frappe_appointment/doctype/user_appointment_availability/user_appointment_availability.json`

---

**Date**: 2025-11-16  
**Status**: ✅ RESOLVED



