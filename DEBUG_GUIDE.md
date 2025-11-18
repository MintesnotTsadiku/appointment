# Debugging Guide - Time Slots Not Appearing

## Overview
This guide helps you debug why time slots are not appearing on the booking page. We've added comprehensive debugging to both frontend and backend to track the entire flow.

## What Was Added

### Backend Debugging
- Added `debug_messages` array to `get_time_slots` API
- Added `debug_messages` array to `_get_time_slots_for_day` function
- Tracks all critical steps:
  - API call parameters
  - Appointment Slot Duration lookup
  - User Appointment Availability lookup
  - Appointment Group creation
  - Member processing
  - Time slot querying
  - `get_max_min_time_slot` function execution
  - `starttime` and `endtime` calculation
  - Final slot generation

### Frontend Debugging
- Added console logging for API call parameters
- Added console logging for API responses
- Added console logging for backend debug messages
- Added error logging

## Step-by-Step Debugging Process

### Step 1: Restart the Bench
```bash
cd /home/minte/projects/frappe-bench
bench restart
```

**Why**: The backend code changes need to be loaded. The debug messages won't appear until the bench is restarted.

### Step 2: Clear Browser Cache
- Open your browser's Developer Tools (F12)
- Right-click the refresh button
- Select "Empty Cache and Hard Reload"
- Or use: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

**Why**: Ensures the frontend code changes are loaded.

### Step 3: Open Browser Console
1. Open Developer Tools (F12)
2. Go to the "Console" tab
3. Keep it open while testing

### Step 4: Navigate to Booking Page
1. Go to: `http://localhost:5173/schedule/in/General%20Consultation?type=<duration-id>`
2. Replace `<duration-id>` with the actual duration ID from the API response
3. Or click "Schedule Meeting" on the duration selection page

### Step 5: Check Frontend Console Logs
Look for these log messages:

#### A. API Call Parameters
```
[FRONTEND DEBUG] API Call Parameters: {
  endpoint: "frappe_appointment.api.personal_meet.get_time_slots",
  params: { duration_id: "...", date: "...", user_timezone_offset: "..." },
  ...
}
```

**What to check**:
- ✅ Is `duration_id` a valid ID (not "default")?
- ✅ Is `date` in correct format (YYYY-MM-DD)?
- ✅ Is `user_timezone_offset` a number?

#### B. API Response
```
[FRONTEND DEBUG] API Response (data): {
  total_slots: ...,
  starttime: ...,
  endtime: ...,
  available_days: [...],
  debug_messages: [...]
}
```

**What to check**:
- ✅ Is `total_slots` > 0?
- ✅ Are `starttime` and `endtime` not null?
- ✅ Are `available_days` populated?

#### C. Backend Debug Messages
```
[FRONTEND DEBUG] Backend Debug Messages:
  [1] API called with duration_id=..., date=..., user_timezone_offset=...
  [2] Found Appointment Slot Duration: name=..., title=..., duration=...s, parent=...
  [3] Found User Appointment Availability: name=..., user=..., meeting_provider=...
  ...
```

**What to check**:
- ✅ Does it find the Appointment Slot Duration?
- ✅ Does it find the User Appointment Availability?
- ✅ Does it find appointment_time_slots for the weekday?
- ✅ What are the values of `max_start_time` and `min_end_time` before and after `get_max_min_time_slot`?
- ✅ What are the calculated `starttime` and `endtime`?

### Step 6: Check Network Tab
1. Go to "Network" tab in Developer Tools
2. Find the request: `frappe_appointment.api.personal_meet.get_time_slots`
3. Click on it
4. Go to "Response" tab
5. Look for `debug_messages` array in the response

**What to check**:
- ✅ Are all steps executed?
- ✅ Where does it fail (if it does)?
- ✅ What are the values at each step?

### Step 7: Analyze the Debug Messages

#### Expected Flow:
1. `[1]` API called with correct parameters
2. `[2]` Found Appointment Slot Duration
3. `[3]` Found User Appointment Availability
4. `[4]` Created appointment_group_obj
5. `[5]` Created Appointment Group doc with members
6. `[6]` Calling _get_time_slots_for_day
7. `[6.1]` Processing members for weekday
8. `[6.2]` Initial max_start_time and min_end_time
9. `[6.4]` Processing mandatory member
10. `[6.5]` Found appointment_time_slots
11. `[6.6]` Before get_max_min_time_slot
12. `[6.6.1]` Slot details (check types!)
13. `[6.7]` After get_max_min_time_slot (should be updated!)
14. `[6.9]` Final max_start_time and min_end_time
15. `[6.10]` Calculated starttime and endtime
16. `[6.11]` Generated available time slots
17. `[FINAL]` Returning data

#### Common Issues to Look For:

**Issue 1: duration_id is "default"**
- **Location**: `[1]` or `[ERROR]` message
- **Fix**: Frontend should auto-select first duration from `get_meeting_windows` response

**Issue 2: No Appointment Slot Duration found**
- **Location**: `[ERROR] Failed to get Appointment Slot Duration`
- **Fix**: Check if onboarding completed successfully. Verify `Appointment Slot Duration` record exists.

**Issue 3: No User Appointment Availability found**
- **Location**: `[ERROR] No User Appointment Availability found`
- **Fix**: Check if onboarding completed. Verify `User Appointment Availability` record exists.

**Issue 4: No appointment_time_slots found**
- **Location**: `[6.8] No appointment_time_slots found`
- **Fix**: Check if `Appointment Time Slot` child records exist in `User Appointment Availability`. Verify weekday matches.

**Issue 5: get_max_min_time_slot not updating values**
- **Location**: `[6.7] After get_max_min_time_slot` shows same values as `[6.6]`
- **Fix**: Check slot types in `[6.6.1]`. Should be `timedelta` objects. If they're strings, there's a type conversion issue.

**Issue 6: starttime/endtime are None**
- **Location**: `[6.10] Calculated starttime=None, endtime=None`
- **Fix**: Check if `max_start_time` and `min_end_time` are still default values ("00:00:00", "23:59:59"). This means `get_max_min_time_slot` didn't work.

### Step 8: Test with Console (Backend)
If you want to test the backend directly:

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from frappe_appointment.api.personal_meet import get_time_slots

frappe.set_user('Administrator')

# Get the actual duration ID
duration = frappe.get_all('Appointment Slot Duration',
    fields=['name', 'title'],
    limit=1
)[0]

print(f'Testing with duration_id: {duration[\"name\"]}')

# Test the API
result = get_time_slots(
    duration_id=duration['name'],
    date='2025-11-17',
    user_timezone_offset=180
)

print(f'\\nResult:')
print(f'  total_slots: {result.get(\"total_slots_for_day\", 0)}')
print(f'  starttime: {result.get(\"starttime\")}')
print(f'  endtime: {result.get(\"endtime\")}')

# Print debug messages
if result.get('debug_messages'):
    print(f'\\nDebug Messages:')
    for msg in result['debug_messages']:
        print(f'  {msg}')
"
```

### Step 9: Check Database Records
Verify the data exists:

```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
from frappe_appointment.constants import APPOINTMENT_TIME_SLOT

frappe.set_user('Administrator')

# Check User Appointment Availability
ua_list = frappe.get_all('User Appointment Availability', fields=['name', 'user'])
print(f'User Appointment Availability records: {len(ua_list)}')
for ua in ua_list:
    print(f'  - {ua.name} (user: {ua.user})')

# Check Appointment Slot Duration
duration_list = frappe.get_all('Appointment Slot Duration', fields=['name', 'parent', 'title', 'duration'])
print(f'\\nAppointment Slot Duration records: {len(duration_list)}')
for d in duration_list:
    print(f'  - {d.name} (parent: {d.parent}, title: {d.title}, duration: {d.duration}s)')

# Check Appointment Time Slots
if ua_list:
    ua_name = ua_list[0]['name']
    slots = frappe.get_all(
        APPOINTMENT_TIME_SLOT,
        filters={'parent': ua_name},
        fields=['day', 'start_time', 'end_time']
    )
    print(f'\\nAppointment Time Slots for {ua_name}: {len(slots)}')
    for slot in slots:
        print(f'  - {slot[\"day\"]}: {slot[\"start_time\"]} to {slot[\"end_time\"]}')
"
```

## What to Report

When reporting issues, include:

1. **Frontend Console Logs**: Copy all `[FRONTEND DEBUG]` messages
2. **Backend Debug Messages**: Copy all messages from `debug_messages` array
3. **Network Response**: The full API response from Network tab
4. **Database Check Results**: Output from Step 9
5. **Screenshot**: Of the booking page showing "No open-time slots"

## Next Steps After Debugging

Once you identify the issue:

1. **If it's a data issue**: Fix the onboarding flow or create missing records
2. **If it's a code issue**: The debug messages will show exactly where it fails
3. **If it's a type conversion issue**: Check the `get_max_min_time_slot` function
4. **If it's a frontend issue**: Check the API call parameters and response handling

## Quick Fixes

### Fix 1: Restart Bench
```bash
bench restart
```

### Fix 2: Clear Cache
```bash
bench --site appointment.com clear-cache
```

### Fix 3: Re-run Onboarding
If data is missing, complete the onboarding flow again.

### Fix 4: Check Appointment Time Slots
Ensure `Appointment Time Slot` child records exist in `User Appointment Availability` for the correct weekdays.

---

**Last Updated**: 2025-11-17
**Status**: Active debugging enabled



