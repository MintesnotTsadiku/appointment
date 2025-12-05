# Group Meetings - Who Creates Them & How They Work

## 🎯 Quick Answer

**Group Meetings are created by ADMINS/PROVIDERS/ORGANIZATIONS, NOT by customers.**

- ✅ **Providers/Organizations** create Appointment Groups in the **Desk UI** (`/app/appointment-group`)
- ✅ **Customers** only **book** time slots from existing groups
- ❌ **Customers do NOT create groups** - they just book them

---

## 📋 Detailed Explanation

### Who Creates Group Meetings?

**1. Admin/Provider/Organization Staff** (in the Desk UI):
- Navigate to: `/app/appointment-group`
- Click "New" to create an Appointment Group
- Fill in details:
  - Group Name (e.g., "Team Consultation")
  - Add Members (providers/users who will attend)
  - Set Duration, Buffer Time, Meeting Provider
  - Configure availability settings
- System generates a booking URL: `/schedule/gr/{group-name}`

**2. Customers** (on the public booking page):
- Visit the booking URL (e.g., `/schedule/gr/team-consultation`)
- Select a date/time when ALL mandatory members are available
- Enter their contact details
- Book the meeting
- **They do NOT create the group - they just book it**

---

## 🔄 Complete Flow

### Step 1: Setup (Admin/Provider)
```
Admin/Provider → Desk UI → Create Appointment Group
  ├─ Add Members (Dr. Sarah, Dr. John, Nurse Mary)
  ├─ Set Duration (30 minutes)
  ├─ Configure Settings
  └─ System generates: /schedule/gr/team-consultation
```

### Step 2: Share Booking URL
```
Admin/Provider → Shares URL with customers
  └─ URL: https://yoursite.com/schedule/gr/team-consultation
```

### Step 3: Customer Books
```
Customer → Visits URL → Selects Date/Time → Enters Details → Books
  └─ Creates calendar event with ALL members + customer
```

---

## 🏢 Where Are Group Meetings Created?

### In the Desk UI (Admin/Provider Interface)

**Location**: `/app/appointment-group`

**Steps to Create**:
1. Login to Desk (`/app`)
2. Navigate to "Appointment Group" list
3. Click "New"
4. Fill in:
   - **Group Name**: "Team Consultation"
   - **Event Creator**: Select a Google Calendar (required)
   - **Event Organizer**: Select a user (main organizer)
   - **Duration**: 30 minutes
   - **Members**: Add users/providers who will attend
     - Mark some as "Mandatory" (must attend)
     - Others as optional
   - **Meeting Provider**: Custom/Zoom/Google Meet
   - **Meeting Link**: (if Custom) URL for the meeting
5. Save → System generates booking URL

**Who Can Create**:
- System Managers
- Users with permission to create Appointment Groups
- Organization owners/admins
- Providers (if they have permission)

---

## 👥 Who Are the Members?

**Members are Providers/Users** (staff, not customers):
- Doctors, consultants, team members
- People who work for the organization
- Users who have User Appointment Availability configured

**Example**:
- Dr. Sarah (mandatory) - Must attend
- Dr. John (mandatory) - Must attend  
- Nurse Mary (optional) - Can attend if available
- Customer books → All members + customer get calendar invite

---

## 🎫 Customer Experience

**What Customers See**:
1. Visit booking URL: `/schedule/gr/team-consultation`
2. See group meeting details (name, duration, members)
3. Select a date (only dates when ALL mandatory members are free)
4. Select a time slot (only slots when ALL mandatory members are free)
5. Enter contact details
6. Book → Receives calendar invite

**What Customers DON'T Do**:
- ❌ Create the group
- ❌ Add/remove members
- ❌ Change settings
- ❌ They just **book** an existing group meeting

---

## 🔍 Is There a UI for Customers to Create Groups?

**NO** - There is currently **NO public UI** for customers to create Appointment Groups.

**Current System**:
- ✅ Admin/Provider creates groups in Desk UI
- ✅ Customers book groups via public booking URL
- ❌ No customer-facing group creation UI

**If You Want Customers to Create Groups**:
This would require:
1. New public UI page (e.g., `/create-group-meeting`)
2. Form to:
   - Enter group name
   - Select members (from available providers)
   - Set duration
   - Configure settings
3. Backend API to create Appointment Group
4. Permission system (who can create groups)

**This feature does NOT exist yet** - it would be a new feature to build.

---

## 📊 Summary Table

| Action | Who Does It | Where | UI Location |
|--------|------------|-------|-------------|
| **Create Group** | Admin/Provider | Desk UI | `/app/appointment-group` |
| **Book Group** | Customer | Public Page | `/schedule/gr/{group-name}` |
| **Add Members** | Admin/Provider | Desk UI | In Appointment Group form |
| **Select Time** | Customer | Public Page | On booking page |
| **Enter Details** | Customer | Public Page | Booking form |

---

## 🛠️ Technical Details

### Where Groups Are Stored
- **Doctype**: `Appointment Group`
- **Database Table**: `tabAppointment Group`
- **Access**: Desk UI only (no public API for creation)

### Booking URL Generation
- Created automatically when Appointment Group is saved
- Format: `/schedule/gr/{group-name}`
- Managed by: `frappe_appointment/scheduler/booking_url_manager.py`

### Who Can Access
- **Create Groups**: System Managers, users with permissions
- **Book Groups**: Anyone with the URL (public)
- **View Groups in Desk**: Users with read permissions

---

## ❓ Common Questions

**Q: Can customers create their own group meetings?**
A: No, not currently. Only admins/providers can create groups in the Desk UI.

**Q: Can customers add people to a group meeting when booking?**
A: Yes! The "Additional Participants" field in the booking form lets customers add other people (by email) to the meeting. But they can't modify the group's core members (providers).

**Q: Do group meetings come from providers/organizations?**
A: Yes! Groups are created by providers/organizations. They set up the group, add their team members, and share the booking URL with customers.

**Q: Is there a UI to create groups from the home page?**
A: No, not currently. Groups are only created in the Desk UI (`/app/appointment-group`).

---

## 🚀 Future Enhancement Ideas

If you want customers to create groups, you could add:

1. **Public Group Creation Page**:
   - `/create-group-meeting`
   - Form to create Appointment Group
   - Select members from available providers
   - Set duration and settings

2. **Provider Selection UI**:
   - Show available providers
   - Let customer select who should be in the group
   - Set mandatory vs optional

3. **Quick Group Creation**:
   - "Create Group Meeting" button on home page
   - Simplified form for common use cases

**These would be new features to build.**




