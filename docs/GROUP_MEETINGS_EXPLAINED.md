# Group Meetings Explained

## 📖 Plain English Explanation

### What is a Group Meeting?
A **Group Meeting** (Appointment Group) is a meeting that requires **multiple people** to attend at the same time. Think of it like scheduling a team meeting where everyone needs to be available.

### How Does It Work?
1. **Setup Phase** (Admin/Provider):
   - An admin creates an "Appointment Group" 
   - They add multiple members (providers/users) to the group
   - Some members are marked as "mandatory" (must attend)
   - Others are optional
   - The system generates a booking URL like `/schedule/gr/team-consultation`

2. **Booking Phase** (Customer):
   - **ONE customer** visits the booking URL
   - The system shows **only time slots when ALL mandatory members are free**
   - The customer picks a time slot
   - When booked, a calendar event is created that includes **ALL group members**

### Key Point: Only ONE Person Books
- ❌ **NOT**: Multiple people booking separately
- ✅ **YES**: One customer books a meeting that includes multiple attendees

### Example Scenario:
**Team Consultation Appointment Group:**
- Members: Dr. Sarah (mandatory), Dr. John (mandatory), Nurse Mary (optional)
- Customer books: "9:00 AM on Monday"
- Result: Calendar event created with all 3 members + customer as attendees

---

## 🔧 Technical Explanation

### Database Structure

**Appointment Group** (`Appointment Group` doctype):
```python
{
  "group_name": "Team Consultation",
  "event_creator": "Google Calendar ID",  # Required
  "event_organizer": "user@example.com",  # Main organizer
  "duration_for_event": 1800,  # 30 minutes in seconds
  "members": [  # Child table
    {
      "user": "sarah@example.com",
      "is_mandatory": 1  # Must attend
    },
    {
      "user": "john@example.com", 
      "is_mandatory": 1
    },
    {
      "user": "mary@example.com",
      "is_mandatory": 0  # Optional
    }
  ]
}
```

### Availability Calculation Algorithm

**File**: `appointment/doctype/appointment_group/appointment_group.py`

1. **Get Mandatory Members**:
   ```python
   mandatory_members = [m for m in members if m.is_mandatory]
   ```

2. **Find Common Available Days**:
   ```python
   # Intersection of all members' available days
   available_days = set(ALL_DAYS)
   for member in mandatory_members:
       user_available_days = get_user_available_days(member.user)
       available_days = available_days.intersection(user_available_days)
   ```

3. **Calculate Time Slot Intersections**:
   ```python
   # For each mandatory member, get their time slots
   member_time_slots = {}
   for member in mandatory_members:
       slots = get_user_appointment_time_slots(member.user, weekday)
       member_time_slots[member.user] = slots
   
   # Find overlapping time ranges
   # Only show slots where ALL members are free
   available_slots = intersect_time_ranges(all_member_slots)
   ```

4. **Filter Out Conflicts**:
   - Check Google Calendar for existing events
   - Check for holidays/leave
   - Apply buffer times
   - Remove past slots

### Booking Flow

**File**: `appointment/overrides/event_override.py`

```python
def _create_event_for_appointment_group(...):
    # 1. Validate time slot is still available
    if not is_valid_time_slots(appointment_group, date, start_time, end_time):
        return frappe.throw("Slot not available")
    
    # 2. Create Booking Event
    event = frappe.new_doc("Event")
    event.subject = appointment_group.group_name
    event.starts_on = start_time
    event.ends_on = end_time
    
    # 3. Add ALL members as participants
    for member in appointment_group.members:
        event.append("event_participants", {
            "reference_doctype": "User Appointment Availability",
            "reference_docname": member.user,
            "email": member.user
        })
    
    # 4. Add customer as participant
    event.append("event_participants", {
        "email": customer_email,
        "full_name": customer_name
    })
    
    # 5. Create meeting link (Zoom/Google Meet/Custom)
    if appointment_group.meet_provider == "Zoom":
        meet_url = create_zoom_meeting(...)
    elif appointment_group.meet_provider == "Google Meet":
        event.add_video_conferencing = 1
    else:
        meet_url = appointment_group.meet_link
    
    # 6. Insert event (creates calendar events for all members)
    event.insert()
```

---

## 🎨 Design Comparison

### Current Group Meeting Page (`/schedule/gr/:groupId`)

**Components Used:**
- ❌ `CalendarWrapper` (old component)
  - Uses basic `DayPicker` library
  - Simple styling, no glass-morphism
  - No gradient buttons
  - Basic hover effects

- ❌ Custom time slot buttons
  - Simple button styling
  - Basic hover states
  - No staggered animations

**Visual Style:**
- ✅ Has ambient background glows
- ✅ Has glass-morphism containers
- ✅ Uses CSS variables
- ❌ Calendar looks plain (old component)
- ❌ Time slots look basic (not premium)

### Other Booking Pages (Premium Design)

**Components Used:**
- ✅ `CalendarPanel` (premium component)
  - Custom-built calendar with glass-morphism
  - Gradient selected dates
  - Smooth Framer Motion animations
  - Premium hover effects

- ✅ `TimeSlotsPanel` (premium component)
  - Glass-morphism slot cards
  - Gradient selected slots
  - Staggered animations
  - Location info cards
  - Empty state with gradient icons

**Visual Style:**
- ✅ Ambient background glows
- ✅ Glass-morphism everywhere
- ✅ Gradient buttons and selections
- ✅ Smooth animations
- ✅ Premium feel

---

## 🔄 Why the Difference?

The group meeting page was redesigned **before** we created the premium `CalendarPanel` and `TimeSlotsPanel` components. The other pages were redesigned **after** these components were built, so they got the premium treatment.

---

## ✅ Solution: Upgrade Group Meeting Page

To match the premium design, we should:

1. **Replace `CalendarWrapper`** with `CalendarPanel`
2. **Replace custom time slot buttons** with `TimeSlotsPanel` (or upgrade the existing ones)
3. **Ensure consistent styling** across all booking pages

This will make the group meeting page match the premium "100 million startup" aesthetic of the other pages.

---

## 📋 Setup Instructions for Admins

### Creating an Appointment Group

1. **Navigate to Desk**: `/app/appointment-group`
2. **Click "New"**
3. **Fill in Details**:
   - **Group Name**: "Team Consultation" (unique)
   - **Event Creator**: Select a Google Calendar (required)
   - **Event Organizer**: Select a user (usually the main provider)
   - **Duration**: 30 minutes (or desired duration)
   - **Minimum Buffer Time**: 5 minutes between meetings
   - **Meeting Provider**: Custom/Zoom/Google Meet
   - **Meeting Link**: (if Custom) URL for the meeting

4. **Add Members**:
   - Click "Add Row" in Members table
   - Select a User (provider)
   - Check "Is Mandatory" if they must attend
   - Repeat for all members

5. **Save** → System generates booking URL: `/schedule/gr/{group-name}`

### Requirements
- ✅ At least one Google Calendar must exist
- ✅ All members must have User Appointment Availability configured
- ✅ At least one member must be marked as mandatory

---

## 🧪 Testing Group Meetings

### Generate Demo Data
```bash
cd /home/minte/projects/frappe-bench && bench --site appointment.com console <<< "
import frappe
result = frappe.call('appointment.demo_data.generate_appointment_groups', count=3)
print(f'Created {result.get(\"count\")} groups')
"
```

### Test Booking Flow
1. Visit: `http://localhost:5173/schedule/gr/team-consultation`
2. Select a date (only dates where all mandatory members are free)
3. Select a time slot
4. Fill in contact form
5. Book → Creates event with all members as participants

---

## 📚 Related Files

- **Backend Logic**: `appointment/doctype/appointment_group/appointment_group.py`
- **Booking API**: `appointment/overrides/event_override.py`
- **Frontend Page**: `frontend/src/pages/group-appointment/index.tsx`
- **Premium Calendar**: `frontend/src/pages/booking-v2/components/DateTimeSelector/CalendarPanel/index.tsx`
- **Premium Time Slots**: `frontend/src/pages/booking-v2/components/DateTimeSelector/TimeSlotsPanel/index.tsx`




