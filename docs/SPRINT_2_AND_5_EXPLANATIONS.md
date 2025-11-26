# Sprint 2 & Sprint 5: Explanations & Functions

## Sprint 2: Slot Engine & Policies

### What It Does
Sprint 2 implements a **smart availability and policy system** that ensures appointments are scheduled correctly with business rules enforced. It prevents double-booking, enforces buffer times, and manages cancellation/deposit policies.

### Key Functions

#### 1. **Working Hours Logic**
- **Purpose**: Respects Location opening hours when generating available time slots
- **Function**: Ensures appointments can only be booked during times when the location is open
- **Example**: If Location is open 9 AM - 5 PM, no slots will be generated outside these hours

#### 2. **Time-Off Blocking**
- **Purpose**: Blocks time slots when providers are unavailable (vacation, sick leave, etc.)
- **Function**: Prevents booking during provider's time-off periods
- **Example**: If Provider has time-off from Jan 15-20, those dates show no available slots

#### 3. **Conflict Detection**
- **Purpose**: Prevents double-booking across locations and providers
- **Function**: Checks if a time slot is already booked before allowing a new booking
- **Example**: If Provider A is booked at 2 PM, another booking at 2 PM for same provider is rejected

#### 4. **Buffer Times Enforcement**
- **Purpose**: Ensures minimum gap between appointments (e.g., 15 minutes between bookings)
- **Function**: Automatically blocks time slots that violate buffer time rules
- **Example**: If appointment ends at 2 PM and buffer is 15 min, next slot starts at 2:15 PM

#### 5. **Policy Engine**
- **Purpose**: Manages business rules for deposits, cancellations, and late fees
- **Function**: Returns applicable policies when calculating booking quotes
- **Example**: "50% deposit required, cancel 24h before for full refund, late cancel = 20% fee"

#### 6. **Booking Quote API**
- **Purpose**: Provides pricing and policy information before booking
- **Function**: Returns total price, deposit amount, cancellation rules, and fees
- **Example**: Client sees "Total: 1000 ETB, Deposit: 500 ETB (50%), Cancel by Jan 20 for full refund"

---

## Sprint 5: Front-Desk Console

### What It Does
Sprint 5 creates a **visual scheduling dashboard** for front-desk staff to manage appointments, handle walk-ins, and reschedule bookings in real-time. It's like a digital appointment book with drag-and-drop functionality.

### Key Functions

#### 1. **Day/Week View Grids**
- **Purpose**: Visual calendar showing appointments organized by provider and time
- **Function**: Displays all appointments for selected date(s) in a grid layout
- **Example**: Day view shows Provider A's appointments from 9 AM - 5 PM in time slots

#### 2. **Provider/Location Filters**
- **Purpose**: Filter appointments by specific provider or location
- **Function**: Dropdown filters to narrow down the view
- **Example**: Select "Dr. Smith" to see only their appointments, or "Main Clinic" for location-specific view

#### 3. **Create Appointment Modal**
- **Purpose**: Allow front-desk staff to book appointments on behalf of clients
- **Function**: Form to enter client details, select service, provider, and time slot
- **Example**: Walk-in client arrives, front-desk creates appointment directly from console

#### 4. **Drag-Reschedule**
- **Purpose**: Easily move appointments to different time slots by dragging
- **Function**: Drag appointment card to new time slot, backend updates automatically
- **Example**: Client calls to reschedule, front-desk drags appointment from 2 PM to 4 PM

#### 5. **Policy Check on Reschedule**
- **Purpose**: Enforces business rules when rescheduling (e.g., minimum notice period)
- **Function**: Validates reschedule against policies, shows error if rules violated
- **Example**: Try to reschedule with < 24h notice → toast error "Reschedule requires 24h notice"

#### 6. **Walk-In Queue**
- **Purpose**: List of clients waiting without appointments
- **Function**: Shows unassigned walk-ins that need to be scheduled
- **Example**: Client arrives without appointment, added to queue, front-desk assigns to next available slot

#### 7. **Assign Walk-In to Slot**
- **Purpose**: Quickly assign walk-in clients to available time slots
- **Function**: Button to assign walk-in to next free slot automatically
- **Example**: Click "Assign to Next Available" → walk-in scheduled at 3:30 PM (next free slot)

---

## Why These Are Critical Blockers

### Sprint 2 (Slot Engine & Policies)
- **Without it**: Cannot enforce deposits, cancellation rules, or prevent double-booking
- **Blocks**: Payment integration (Sprint 3) - payments need policy engine to calculate deposits
- **Impact**: Business rules cannot be enforced, leading to scheduling conflicts and revenue loss

### Sprint 5 (Front-Desk Console)
- **Without it**: Multi-location businesses cannot manage appointments efficiently
- **Blocks**: Day-to-day operations for clinics, salons, etc.
- **Impact**: Staff must use manual methods or individual booking pages, which is inefficient

---

## Dependencies

### Sprint 2 Dependencies
- ✅ Availability model (already implemented)
- ✅ Location/Service/Provider doctypes (already exist)
- ⏳ Policy doctype (needs to be created)
- ⏳ Conflict detection logic (needs to be implemented)

### Sprint 5 Dependencies
- ✅ Appointment doctype (already exists)
- ✅ Provider/Location doctypes (already exist)
- ⏳ Sprint 2 (Policy engine) - needed for policy checks on reschedule
- ⏳ Frontend routing and React components (needs to be created)

---

## Technical Stack

### Sprint 2 (Backend)
- **Language**: Python (Frappe Framework)
- **Location**: `frappe_appointment/scheduler/` module
- **Files**: 
  - `helpers/slot_engine.py` (new)
  - `helpers/policy_engine.py` (new)
  - `doctype/policy/policy.json` (new)
  - `api/quote.py` (new)

### Sprint 5 (Frontend + Backend)
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Python (Frappe Framework)
- **Location**: 
  - Frontend: `frontend/src/pages/desk/`
  - Backend: `frappe_appointment/scheduler/api/desk.py` (new)

