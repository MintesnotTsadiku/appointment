# AI Agent Prompt: Sprint 5 - Front-Desk Console Implementation

## Context
You are implementing **Sprint 5: Front-Desk Console** for a Frappe-based appointment scheduling system. This sprint creates a visual dashboard for front-desk staff to manage appointments, handle walk-ins, and reschedule bookings with drag-and-drop functionality.

## Project Structure
- **App Path**: `/home/minte/projects/frappe-bench/apps/frappe_appointment`
- **Frontend Path**: `frontend/src/pages/desk/`
- **Backend API**: `frappe_appointment/scheduler/api/desk.py`
- **Existing Files**:
  - `frontend/src/pages/home/` - Provider dashboard (reference for styling)
  - `frontend/src/pages/appointment/` - Booking page (reference for components)
  - `frappe_appointment/api/personal_meet.py` - Booking APIs (reference)

## What Already Exists
1. ✅ **Appointment Doctype**: Stores all appointment data
2. ✅ **Provider/Location Doctypes**: For filtering
3. ✅ **Booking APIs**: `book_time_slot()`, `get_time_slots()` in `personal_meet.py`
4. ✅ **React Setup**: Vite + TypeScript + Tailwind CSS + Framer Motion
5. ✅ **Routing**: React Router configured in `frontend/src/route.tsx`
6. ✅ **API Client**: frappe-react-sdk or fetch for API calls

## What Needs to Be Built

### Task 1: Create Backend API for Front-Desk
**Location**: `frappe_appointment/scheduler/api/desk.py`

**API Endpoints to Implement**:

```python
@frappe.whitelist()
def get_desk_appointments(date: str, location_name: str = None, provider_name: str = None, view: str = "day"):
    """
    GET /api/method/frappe_appointment.scheduler.api.desk.get_desk_appointments
    
    Get appointments for front-desk view.
    
    Args:
        date: ISO date string (YYYY-MM-DD) or "today"
        location_name: Filter by location (optional)
        provider_name: Filter by provider (optional)
        view: "day" or "week"
    
    Returns:
        {
            "appointments": [
                {
                    "name": "APT-00001",
                    "client_name": "John Doe",
                    "client_phone": "+251911234567",
                    "client_email": "john@example.com",
                    "provider_name": "Dr. Smith",
                    "provider": "PROV-00001",
                    "location_name": "Main Clinic",
                    "location": "LOC-00001",
                    "service_name": "Consultation",
                    "service": "SVC-00001",
                    "start_time": "2025-01-20 14:00:00",
                    "end_time": "2025-01-20 15:00:00",
                    "status": "Scheduled",
                    "duration": 60,
                    "price": 1000.0,
                    "currency": "ETB"
                },
                ...
            ],
            "providers": [
                {"name": "PROV-00001", "full_name": "Dr. Smith"},
                ...
            ],
            "locations": [
                {"name": "LOC-00001", "location_name": "Main Clinic"},
                ...
            ],
            "date_range": {
                "start": "2025-01-20",
                "end": "2025-01-20"  # or end of week if view="week"
            }
        }
    """
    pass

@frappe.whitelist()
def create_desk_appointment(client_name: str, client_phone: str, client_email: str = None, 
                           service_name: str, provider_name: str = None, location_name: str = None,
                           start_time: str, duration: int = None, notes: str = None):
    """
    POST /api/method/frappe_appointment.scheduler.api.desk.create_desk_appointment
    
    Create appointment from front-desk (on behalf of client).
    
    Returns:
        {
            "appointment": {...},
            "success": True
        }
    """
    pass

@frappe.whitelist()
def reschedule_appointment(appointment_name: str, new_start_time: str, new_end_time: str = None):
    """
    POST /api/method/frappe_appointment.scheduler.api.desk.reschedule_appointment
    
    Reschedule appointment (drag-and-drop).
    
    Returns:
        {
            "appointment": {...},
            "success": True
        }
    Or error:
        {
            "error": "Reschedule requires 24h notice",
            "policy_violation": True
        }
    """
    pass

@frappe.whitelist()
def get_walk_ins(location_name: str = None):
    """
    GET /api/method/frappe_appointment.scheduler.api.desk.get_walk_ins
    
    Get list of walk-in clients waiting for assignment.
    
    Returns:
        {
            "walk_ins": [
                {
                    "name": "WALK-00001",
                    "client_name": "Jane Doe",
                    "client_phone": "+251922345678",
                    "service_requested": "Consultation",
                    "created_at": "2025-01-20 10:00:00",
                    "status": "waiting"
                },
                ...
            ]
        }
    """
    pass

@frappe.whitelist()
def add_walk_in(client_name: str, client_phone: str, service_requested: str, notes: str = None):
    """
    POST /api/method/frappe_appointment.scheduler.api.desk.add_walk_in
    
    Add client to walk-in queue.
    
    Returns:
        {
            "walk_in": {...},
            "success": True
        }
    """
    pass

@frappe.whitelist()
def assign_walk_in_to_slot(walk_in_name: str, provider_name: str = None, location_name: str = None, preferred_time: str = None):
    """
    POST /api/method/frappe_appointment.scheduler.api.desk.assign_walk_in_to_slot
    
    Assign walk-in to next available slot (or specific time if preferred_time provided).
    
    Returns:
        {
            "appointment": {...},
            "walk_in": {...},
            "success": True
        }
    """
    pass
```

### Task 2: Create Walk-In Doctype (if needed)
**Location**: `frappe_appointment/scheduler/doctype/walk_in/`

**Fields**:
- `client_name` (Data)
- `client_phone` (Data)
- `client_email` (Data, optional)
- `service_requested` (Link to Service)
- `location` (Link to Location, optional)
- `provider_preferred` (Link to Provider, optional)
- `status` (Select) - "waiting", "assigned", "cancelled"
- `assigned_appointment` (Link to Appointment, optional)
- `notes` (Small Text)
- `created_at` (Datetime)

### Task 3: Create Front-Desk React Page
**Location**: `frontend/src/pages/desk/index.tsx`

**Main Component Structure**:
```typescript
// Main page component
export default function DeskPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  
  // Fetch appointments on date/location/provider change
  // Handle drag-and-drop
  // Handle walk-in assignment
  
  return (
    <div className="desk-container">
      <DeskHeader 
        date={selectedDate}
        view={view}
        onDateChange={setSelectedDate}
        onViewChange={setView}
      />
      <DeskFilters
        location={selectedLocation}
        provider={selectedProvider}
        onLocationChange={setSelectedLocation}
        onProviderChange={setSelectedProvider}
      />
      <DeskCalendar
        appointments={appointments}
        view={view}
        onDragEnd={handleReschedule}
      />
      <WalkInQueue
        walkIns={walkIns}
        onAssign={handleAssignWalkIn}
        onAdd={handleAddWalkIn}
      />
    </div>
  );
}
```

### Task 4: Create Day/Week View Grid Component
**Location**: `frontend/src/pages/desk/components/DeskCalendar.tsx`

**Features**:
- **Day View**: Single day, time slots from 8 AM - 8 PM, appointments as cards
- **Week View**: 7 days, same time slots, appointments positioned by day
- **Drag-and-Drop**: Use `@dnd-kit/core` or `react-beautiful-dnd` library
- **Time Slots**: 30-minute intervals (or configurable)
- **Appointment Cards**: Show client name, service, time, status
- **Visual Indicators**: Color-coded by status (Scheduled, Confirmed, Completed, Cancelled)

**Layout**:
```
Day View:
┌─────────────────────────────────────────┐
│ 8:00 AM                                 │
│ ┌─────────────────────────────────────┐ │
│ │ Provider A                          │ │
│ │ [Appt 1] [Appt 2]                  │ │
│ └─────────────────────────────────────┘ │
│ 8:30 AM                                 │
│ ┌─────────────────────────────────────┐ │
│ │ Provider B                          │ │
│ │ [Appt 3]                            │ │
│ └─────────────────────────────────────┘ │
│ ...                                     │
└─────────────────────────────────────────┘

Week View:
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│      │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 8 AM │      │      │      │      │      │      │
│ 8:30 │      │      │      │      │      │      │
│ ...  │      │      │      │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

### Task 5: Create Appointment Modal
**Location**: `frontend/src/pages/desk/components/CreateAppointmentModal.tsx`

**Form Fields**:
- Client Name (required)
- Client Phone (required)
- Client Email (optional)
- Service (dropdown, required)
- Provider (dropdown, optional)
- Location (dropdown, optional)
- Date (date picker)
- Time (time picker or slot selector)
- Duration (auto-filled from service, editable)
- Notes (textarea)

**Functionality**:
- Validate all required fields
- Call `create_desk_appointment` API
- Show success/error toast
- Refresh appointments list on success
- Close modal on success

### Task 6: Create Walk-In Queue Component
**Location**: `frontend/src/pages/desk/components/WalkInQueue.tsx`

**Features**:
- **List View**: Shows all waiting walk-ins
- **Add Button**: Opens modal to add new walk-in
- **Assign Button**: For each walk-in, button to assign to next available slot
- **Status Badges**: "waiting", "assigned", "cancelled"
- **Auto-refresh**: Poll every 30 seconds or use real-time updates

**Layout**:
```
┌─────────────────────────────────────┐
│ Walk-In Queue              [+ Add]  │
├─────────────────────────────────────┤
│ John Doe                            │
│ +251911234567                       │
│ Consultation                        │
│ [Assign to Next Available]          │
├─────────────────────────────────────┤
│ Jane Doe                            │
│ +251922345678                       │
│ Checkup                              │
│ [Assign to Next Available]          │
└─────────────────────────────────────┘
```

### Task 7: Add Drag-and-Drop Reschedule
**Location**: `frontend/src/pages/desk/components/DeskCalendar.tsx`

**Implementation**:
- Use `@dnd-kit/core` library (recommended) or `react-beautiful-dnd`
- Make appointment cards draggable
- Make time slots droppable
- On drop, calculate new start/end time
- Call `reschedule_appointment` API
- Show loading state during API call
- Show success/error toast
- If policy violation, show error with policy details
- Revert drag if API fails

### Task 8: Add Policy Check Integration
**Location**: `frontend/src/pages/desk/components/DeskCalendar.tsx`

**When rescheduling**:
- Before calling API, optionally check policy (or let backend handle it)
- If backend returns policy violation error, show detailed message:
  - "Reschedule requires 24h notice. Current time: 2h before appointment."
  - "Late reschedule fee: 200 ETB. Proceed anyway?"

### Task 9: Add Routing
**Location**: `frontend/src/route.tsx`

**Add route**:
```typescript
{
  path: "/desk",
  element: <DeskPage />,
  // Require authentication (not guest)
}
```

## Implementation Steps

1. **Create Backend API**
   - Create `frappe_appointment/scheduler/api/desk.py`
   - Implement all 6 API endpoints
   - Test via console: `frappe.call("frappe_appointment.scheduler.api.desk.get_desk_appointments", {"date": "2025-01-20"})`

2. **Create Walk-In Doctype** (if needed)
   - Use `bench new-doctype` or create manually
   - Add all fields listed above

3. **Create React Page Structure**
   - Create `frontend/src/pages/desk/index.tsx`
   - Create component files in `frontend/src/pages/desk/components/`
   - Set up state management (useState/useReducer)

4. **Install Dependencies** (if needed)
   ```bash
   cd frontend
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   # or
   npm install react-beautiful-dnd
   ```

5. **Build Day View**
   - Create time slot grid
   - Position appointments by time
   - Add drag-and-drop handlers

6. **Build Week View**
   - Create 7-day grid
   - Position appointments by day and time
   - Add drag-and-drop handlers

7. **Build Filters**
   - Location dropdown
   - Provider dropdown
   - Date picker
   - View toggle (day/week)

8. **Build Walk-In Queue**
   - List component
   - Add walk-in modal
   - Assign to slot functionality

9. **Add Policy Integration**
   - Handle policy violation errors
   - Show policy details in error messages

10. **Add Routing**
    - Update `route.tsx`
    - Test navigation to `/desk`

## Styling Guidelines

- **Use Tailwind CSS** (already configured)
- **Follow existing design system** from `frontend/src/pages/home/`
- **Use Framer Motion** for animations (already installed)
- **Responsive design**: Mobile-first, works on tablet/desktop
- **Dark mode support**: Use CSS variables from `global.css`
- **Color scheme**: 
  - Scheduled: Blue
  - Confirmed: Green
  - Completed: Gray
  - Cancelled: Red
  - Walk-in: Orange

## Testing Checklist

### Console Tests
```python
# Test 1: Get appointments
frappe.call("frappe_appointment.scheduler.api.desk.get_desk_appointments", {
    "date": "2025-01-20",
    "view": "day"
})

# Test 2: Create desk appointment
frappe.call("frappe_appointment.scheduler.api.desk.create_desk_appointment", {
    "client_name": "Test Client",
    "client_phone": "+251911234567",
    "service_name": "SVC-00001",
    "start_time": "2025-01-20 14:00:00"
})

# Test 3: Reschedule
frappe.call("frappe_appointment.scheduler.api.desk.reschedule_appointment", {
    "appointment_name": "APT-00001",
    "new_start_time": "2025-01-20 16:00:00"
})

# Test 4: Add walk-in
frappe.call("frappe_appointment.scheduler.api.desk.add_walk_in", {
    "client_name": "Walk-in Client",
    "client_phone": "+251922345678",
    "service_requested": "SVC-00001"
})

# Test 5: Assign walk-in
frappe.call("frappe_appointment.scheduler.api.desk.assign_walk_in_to_slot", {
    "walk_in_name": "WALK-00001"
})
```

### Browser Tests
1. Navigate to `/desk`
2. See today's appointments in day view
3. Switch to week view
4. Filter by location → appointments update
5. Filter by provider → appointments update
6. Drag appointment to new time → reschedules successfully
7. Try to drag to conflicting slot → error shown
8. Add walk-in → appears in queue
9. Assign walk-in → creates appointment, removes from queue
10. Create appointment from modal → appears in calendar

## Acceptance Criteria

✅ **Backend API Complete**
- All 6 endpoints implemented and tested
- Returns correct data structure
- Handles errors gracefully
- Policy checks integrated (if Sprint 2 complete)

✅ **Day View Functional**
- Shows appointments for selected date
- Time slots from 8 AM - 8 PM
- Appointments positioned correctly by time
- Drag-and-drop works

✅ **Week View Functional**
- Shows 7 days
- Appointments positioned by day and time
- Drag-and-drop works across days

✅ **Filters Working**
- Location filter updates appointments
- Provider filter updates appointments
- Date picker changes view
- View toggle (day/week) works

✅ **Walk-In Queue Functional**
- Shows waiting walk-ins
- Add walk-in creates new entry
- Assign to slot creates appointment
- Queue updates in real-time

✅ **Drag-and-Drop Reschedule**
- Appointments can be dragged
- Drop on time slot reschedules
- Policy violations show error
- Success shows confirmation

✅ **Create Appointment Modal**
- All fields validated
- Creates appointment successfully
- Refreshes calendar on success
- Shows error on failure

## Files to Create

**Backend**:
1. `frappe_appointment/scheduler/api/desk.py`
2. `frappe_appointment/scheduler/doctype/walk_in/walk_in.json` (if needed)
3. `frappe_appointment/scheduler/doctype/walk_in/walk_in.py` (if needed)

**Frontend**:
1. `frontend/src/pages/desk/index.tsx`
2. `frontend/src/pages/desk/components/DeskHeader.tsx`
3. `frontend/src/pages/desk/components/DeskFilters.tsx`
4. `frontend/src/pages/desk/components/DeskCalendar.tsx`
5. `frontend/src/pages/desk/components/AppointmentCard.tsx`
6. `frontend/src/pages/desk/components/CreateAppointmentModal.tsx`
7. `frontend/src/pages/desk/components/WalkInQueue.tsx`
8. `frontend/src/pages/desk/components/WalkInCard.tsx`
9. `frontend/src/pages/desk/types.ts` (TypeScript interfaces)

**Modified**:
1. `frontend/src/route.tsx` - Add `/desk` route

## Notes

- **Dependencies**: If Sprint 2 (Policy Engine) is not complete, skip policy checks for now, add TODO comments
- **Real-time Updates**: Consider using Frappe's real-time events for live updates (optional)
- **Performance**: For week view with many appointments, consider virtualization
- **Accessibility**: Ensure keyboard navigation works, screen reader friendly
- **Mobile**: Day view should work on mobile, week view may need horizontal scroll
- **Timezone**: All times should respect user's timezone (Africa/Addis_Ababa default)

## Success Criteria

When complete, front-desk staff should be able to:
1. View all appointments for today/week
2. Filter by location or provider
3. Drag appointments to reschedule them
4. See policy violations when rescheduling too late
5. Add walk-in clients to queue
6. Assign walk-ins to next available slot
7. Create appointments on behalf of clients
8. See real-time updates when appointments change




