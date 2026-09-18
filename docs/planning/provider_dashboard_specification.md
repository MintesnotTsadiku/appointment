# Provider Dashboard & Onboarding Specification

**Document Version**: 1.0  
**Date**: 2025-11-14  
**Status**: Pre-Sprint 1 - Blueprint for Implementation

---

## 1. Executive Summary

### Target Audience
**This dashboard is FOR**: Business owners, clinic managers, service providers (logged into the system)  
**NOT FOR**: End customers booking appointments (they use `/schedule/in/:meetId`)

### Problem Statement
Current pain points for providers:
- Must manually configure Google Calendar OAuth (technical, confusing)
- Creating appointment groups requires understanding many fields
- Setting availability is not intuitive
- No clear guidance on what to do next
- No visibility into setup progress
- Hard to find and share booking URL
- No quick view of business metrics

### Success Metrics
- **90%** of providers complete onboarding within **10 minutes**
- **80%** of providers receive first customer booking within **24 hours**
- **95%** of providers don't need support for basic setup
- **70%** of providers enable Google Calendar integration

### User Personas

**Dr. Amara (40s, Clinic Owner)**
- Not tech-savvy, needs simple step-by-step guidance
- Wants default settings (9-5 Mon-Fri)
- Shares links via WhatsApp
- **Goal**: Get booking link quickly, minimal complexity

**Yonas (20s, Salon Manager)**
- Tech-comfortable, wants fast setup
- Creates multiple services immediately
- Enables payment integration right away
- **Goal**: Complete setup in 5 minutes, customize everything

**Tigist (30s, University Admin)**
- Manages 5+ counselors
- Needs bulk/team setup (future feature)
- Requires role delegation
- **Goal**: Efficient multi-provider setup

---

## 2. Technical Architecture

### Tech Stack
- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS with CSS variables from `global.css`
- **Components**: shadcn/ui (Button, Card, Dialog, Form, etc.)
- **Animations**: framer-motion
- **API**: frappe-react-sdk (`useFrappeGetCall`, `useFrappePostCall`)
- **Routing**: React Router (add to `frontend/src/route.tsx`)

### Color System (from global.css)
- **Primary**: `var(--brand-primary)` #6366F1 (indigo)
- **Secondary**: `var(--brand-secondary)` #10B981 (emerald)
- **Gradients**: `bg-gradient-hero`, `bg-gradient-feature`
- **Dark Mode**: Supported via Tailwind dark mode classes

### Route Structure
```
/home → Provider dashboard (requires authentication)
```

### File Structure
```
frontend/src/pages/home/
├── index.tsx                          # Main page component
├── sections/
│   ├── OnboardingWizard.tsx          # 5-step setup flow
│   ├── Dashboard.tsx                  # Main dashboard for returning users
│   ├── SetupChecklist.tsx             # Progress checklist widget
│   ├── QuickStats.tsx                 # Metrics cards
│   ├── QuickActions.tsx               # Action buttons
│   └── RecentActivity.tsx             # Activity feed
└── components/
    ├── AvailabilityGrid.tsx           # Weekly schedule picker
    ├── ServiceForm.tsx                # Create service form
    └── BookingLinkCard.tsx            # Share booking link

frontend/src/context/
└── onboarding.tsx                     # Onboarding state management
```

### State Management
- **Onboarding Progress**: React Context (`OnboardingContext`)
- **Dashboard Data**: SWR caching via frappe-react-sdk
- **Form State**: React Hook Form (if complex forms)

---

## 3. Page Logic Flow

```
User logs in → Check onboarding status
    ├─ If incomplete → Show OnboardingWizard
    └─ If complete → Show Dashboard
```

### Onboarding Progress Check
```typescript
const { data: progress } = useFrappeGetCall(
  'appointment.onboarding.get_progress'
);

if (!progress?.onboarding_complete) {
  return <OnboardingWizard currentStep={progress.current_step} />;
}

return <Dashboard />;
```

---

## 4. Onboarding Wizard (5 Steps)

### Overall Layout (ASCII Wireframe)
```
┌────────────────────────────────────────────────────────────┐
│  [Logo]                              Step 2 of 5  [●●○○○]  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│                    [Step Title]                             │
│                    [Step Description]                       │
│                                                             │
│             ┌─────────────────────────────┐                │
│             │                             │                │
│             │      Step Content Area      │                │
│             │      (Form / Selector)      │                │
│             │                             │                │
│             └─────────────────────────────┘                │
│                                                             │
│    [← Back]                          [Next / Complete →]   │
│                      [Skip for now]                         │
└────────────────────────────────────────────────────────────┘
```

---

### Step 1: Business Profile

**Fields:**
- Business Name (text, required)
- Business Type (select: Clinic, Salon, University, Legal, Other)
- Timezone (select, default: Africa/Addis_Ababa)
- Language (select: English, Amharic)

**API:**
```typescript
POST /api/method/appointment.onboarding.save_profile
Request: { business_name, business_type, timezone, language }
Response: { success: true, profile_id: "..." }
```

**Validation:**
- Business name: 3-100 characters
- All fields required

---

### Step 2: Calendar Connection

**Options:**

**Option 1: Google Calendar**
```
┌──────────────────────────────────────┐
│  [Google Icon]                       │
│  Connect Google Calendar             │
│  Sync your appointments              │
│  automatically                       │
│                                      │
│  [Connect Google Calendar →]         │
└──────────────────────────────────────┘
```

**Option 2: Manual Calendar (Default)**
```
┌──────────────────────────────────────┐
│  [Calendar Icon]                     │
│  Use Built-in Calendar               │
│  No external setup required          │
│  ✓ Already Connected                 │
│                                      │
│  [Continue with Built-in →]          │
└──────────────────────────────────────┘
```

**API:**
```typescript
POST /api/method/appointment.onboarding.connect_calendar
Request: { provider: "google" | "manual" }
Response: { oauth_url?: "https://...", success: true }
```

**Logic:**
- If "Google" → Redirect to OAuth flow → Return to Step 3
- If "Manual" → Mark complete, go to Step 3
- Can change later in settings

---

### Step 3: Set Availability

**Weekly Grid (ASCII):**
```
        Mon    Tue    Wed    Thu    Fri    Sat    Sun
 8:00  [   ]  [   ]  [   ]  [   ]  [   ]  [   ]  [   ]
 9:00  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [   ]  [   ]
10:00  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [   ]  [   ]
11:00  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [   ]  [   ]
12:00  [   ]  [   ]  [   ]  [   ]  [   ]  [   ]  [   ]
13:00  [   ]  [   ]  [   ]  [   ]  [   ]  [   ]  [   ]
14:00  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [   ]  [   ]
15:00  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [   ]  [   ]
16:00  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [   ]  [   ]
17:00  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [ ✓ ]  [   ]  [   ]

Quick Templates:
[9-5 Mon-Fri] [Flexible Hours] [Weekends Only] [Custom]
```

**Interaction:**
- Click cell to toggle availability
- Drag to select multiple cells
- Quick templates auto-fill grid

**API:**
```typescript
POST /api/method/appointment.onboarding.save_availability
Request: {
  weekly_schedule: {
    monday: [{ start: "09:00", end: "17:00" }],
    tuesday: [{ start: "09:00", end: "17:00" }],
    ...
  }
}
Response: { success: true }
```

---

### Step 4: Create First Service

**Form Fields:**
- Service Name (text, required) - e.g., "General Consultation"
- Duration (select: 15, 30, 45, 60 minutes)
- Buffer Time (select: 0, 5, 10, 15 minutes) - gap before next appointment
- Price (number, optional) - Ethiopian Birr (ETB)

**Example:**
```
Service Name:  [General Consultation________]
Duration:      [● 30 min]  ○ 45 min  ○ 60 min
Buffer Time:   [● 5 min]   ○ 10 min  ○ 15 min
Price:         [500] ETB (optional)
```

**API:**
```typescript
POST /api/method/appointment.onboarding.create_service
Request: { name, duration, buffer_time, price, currency: "ETB" }
Response: {
  success: true,
  service_id: "...",
  booking_url: "/schedule/in/abc123"
}
```

**Validation:**
- Service name: 3-100 characters, unique
- Price: >= 0

---

### Step 5: Get Booking Link

**Success Screen:**
```
┌─────────────────────────────────────────────┐
│           🎉 You're All Set!                │
│                                             │
│  Your booking page is ready:                │
│  ┌───────────────────────────────────────┐ │
│  │ https://app.com/schedule/in/abc123    │ │
│  │                           [Copy] [QR]  │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  Share with your customers:                 │
│  [WhatsApp] [Telegram] [Email] [SMS]       │
│                                             │
│  Next Steps:                                │
│  • Test your booking page                   │
│  • Configure payment (optional)             │
│  • Customize notifications                  │
│                                             │
│        [Go to Dashboard →]                  │
└─────────────────────────────────────────────┘
```

**Features:**
- Copy link to clipboard
- Generate QR code (for print materials)
- Social sharing (WhatsApp, Telegram common in Ethiopia)
- Confetti animation on completion

**API:**
```typescript
POST /api/method/appointment.onboarding.complete
Response: { success: true, completed_at: "2025-11-14T..." }
```

---

## 5. Dashboard View (Returning Users)

### Full Layout (ASCII Wireframe)
```
┌──────────────────────────────────────────────────────────────────────┐
│ Welcome back, Dr. Amara!               [Profile ▾] [Help] [Logout]   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Setup Checklist (5/7 complete)                            [Hide ▾]   │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ ☑ Connect calendar  ☑ Set availability  ☑ Create service     │   │
│ │ ☑ Share booking link  ☑ Test booking                         │   │
│ │ ☐ Configure notifications  ☐ Add payment method              │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│ Quick Stats                                                           │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│ │ This Week    │ │ Today        │ │ Booking Rate │ │ Revenue      ││
│ │              │ │              │ │              │ │              ││
│ │   24 appts   │ │  3 upcoming  │ │  ↑ +12%      │ │  45,230 ETB  ││
│ │              │ │              │ │              │ │              ││
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘│
│                                                                       │
│ Quick Actions                                                         │
│ [+ New Service] [📅 My Calendar] [⏰ Edit Availability]              │
│ [🔗 Share Link] [📊 View Analytics] [👥 Manage Team]                │
│                                                                       │
│ ┌────────────────────────────────┐ ┌──────────────────────────────┐ │
│ │ Recent Activity                │ │ Alerts & Notifications       │ │
│ │                                │ │                              │ │
│ │ • John Doe booked 2:00 PM     │ │ ⚠️ Missing availability for  │ │
│ │ • Mary canceled tomorrow      │ │    Saturday                  │ │
│ │ • Peter rescheduled           │ │                              │ │
│ │ • Sarah booked 11:00 AM       │ │ ℹ️ Google Calendar sync      │ │
│ │                                │ │    paused. Reconnect?        │ │
│ │ [View All Activity →]          │ │                              │ │
│ └────────────────────────────────┘ └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Component: Setup Checklist

**7 Checklist Items:**
1. ☑ Connect calendar (Google or Manual)
2. ☑ Set availability hours
3. ☑ Create appointment type
4. ☑ Share booking link with first customer
5. ☐ Test booking (book as guest)
6. ☐ Configure notifications (SMS/email)
7. ☐ Add payment method (telebirr/Chapa)

**Behavior:**
- Collapsible (hide when complete)
- Each item links to setup page
- Progress bar (5/7 = 71%)
- Stored per user

**API:**
```typescript
GET /api/method/appointment.onboarding.get_progress
Response: {
  completed_steps: [1, 2, 3, 4, 5],
  total_steps: 7,
  onboarding_complete: false
}
```

---

### Component: Quick Stats Cards

**4 Cards:**

**Card 1: This Week**
- Count of appointments this week
- Comparison to last week (+12%)

**Card 2: Today**
- Upcoming appointments today
- Next appointment time

**Card 3: Booking Rate**
- Percentage change vs last week
- Trend indicator (up/down arrow)

**Card 4: Revenue**
- Total revenue (if payment enabled)
- Currency: ETB

**API:**
```typescript
GET /api/method/appointment.dashboard.stats?period=week
Response: {
  appointments_this_week: 24,
  upcoming_today: 3,
  booking_rate_change: 12, // percentage
  revenue: 45230 // ETB
}
```

**Design:**
- Card background: White (dark: gray-800)
- Gradient accent on hover
- Count-up animation for numbers
- Icon for each stat

---

### Component: Quick Actions

**6 Action Buttons:**
1. **+ New Service** → Open create service dialog
2. **📅 My Calendar** → Navigate to calendar view
3. **⏰ Edit Availability** → Navigate to availability settings
4. **🔗 Share Link** → Copy/share booking link dialog
5. **📊 View Analytics** → Navigate to analytics dashboard (Sprint 7)
6. **👥 Manage Team** → Navigate to team management (if multi-provider)

**Design:**
- Grid layout (3 columns on desktop, 2 on tablet, 1 on mobile)
- Gradient background on primary actions
- Outline style on secondary actions

---

### Component: Recent Activity Feed

**Activity Types:**
- New booking
- Cancellation
- Reschedule
- Payment received
- Customer no-show

**Item Format:**
```
[Icon] Customer Name [Action] Time/Date
```

**Example:**
- ✓ John Doe booked 2:00 PM today
- ✗ Mary canceled appointment tomorrow
- ↻ Peter rescheduled to next week

**API:**
```typescript
GET /api/method/appointment.dashboard.recent_activity?limit=10
Response: {
  activities: [
    {
      type: "booking",
      customer: "John Doe",
      time: "2025-11-14T14:00:00",
      appointment_id: "..."
    },
    ...
  ]
}
```

**Features:**
- Auto-refresh every 30 seconds
- Real-time updates via Frappe socket (if enabled)
- Click item to view appointment details

---

### Component: Alerts & Notifications

**Alert Types:**
- ⚠️ Warning (missing availability, OAuth expired)
- ℹ️ Info (tips, updates)
- ✓ Success (setup complete, payment received)
- ❌ Error (payment failed, sync error)

**Examples:**
- "Missing availability for this Saturday"
- "Google Calendar sync paused. Reconnect?"
- "You've received 5 bookings today! 🎉"
- "Payment setup incomplete. Enable to accept deposits."

**API:**
```typescript
GET /api/method/appointment.dashboard.alerts
Response: {
  alerts: [
    {
      type: "warning",
      message: "Missing availability for Saturday",
      action_url: "/settings/availability",
      dismissible: true
    },
    ...
  ]
}
```

**Behavior:**
- Dismissible alerts (store dismissed state)
- Priority sorting (errors first)
- Auto-dismiss success alerts after 5 seconds

---

## 6. API Endpoints Summary

### Onboarding APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `appointment.onboarding.get_progress` | GET | Fetch onboarding status |
| `appointment.onboarding.save_profile` | POST | Save business profile (Step 1) |
| `appointment.onboarding.connect_calendar` | POST | Connect Google/Manual (Step 2) |
| `appointment.onboarding.save_availability` | POST | Save weekly schedule (Step 3) |
| `appointment.onboarding.create_service` | POST | Create first service (Step 4) |
| `appointment.onboarding.complete` | POST | Mark onboarding complete (Step 5) |

### Dashboard APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `appointment.dashboard.stats` | GET | Quick stats (week/month) |
| `appointment.dashboard.recent_activity` | GET | Activity feed |
| `appointment.dashboard.alerts` | GET | Alerts/notifications |

---

## 7. Data Models (Backend)

### OnboardingProgress Doctype
```python
{
  "name": "OnboardingProgress",
  "fields": [
    {"fieldname": "user", "fieldtype": "Link", "options": "User"},
    {"fieldname": "current_step", "fieldtype": "Int", "default": 1},
    {"fieldname": "completed_steps", "fieldtype": "JSON"},
    {"fieldname": "onboarding_complete", "fieldtype": "Check"},
    {"fieldname": "completed_at", "fieldtype": "Datetime"}
  ],
  "permissions": [
    {"role": "All", "read": 1, "write": 1, "if_owner": 1}
  ]
}
```

### DashboardSettings Doctype
```python
{
  "name": "DashboardSettings",
  "fields": [
    {"fieldname": "user", "fieldtype": "Link", "options": "User"},
    {"fieldname": "language", "fieldtype": "Select", "options": "English\nAmharic"},
    {"fieldname": "show_checklist", "fieldtype": "Check", "default": 1},
    {"fieldname": "widget_order", "fieldtype": "JSON"}
  ]
}
```

---

## 8. User Journey Examples

### Dr. Amara (Not Tech-Savvy, 8 minutes)
1. **Step 1**: Fills business name "Amara Clinic", selects "Clinic", keeps default timezone
2. **Step 2**: Confused by Google OAuth → Clicks "Use Built-in Calendar"
3. **Step 3**: Clicks "9-5 Mon-Fri" template → Done
4. **Step 4**: Creates "General Consultation - 30 min - 500 ETB"
5. **Step 5**: Copies link, shares via WhatsApp to first patient

**Pain Points**: OAuth complexity (avoided), technical terms  
**Success**: Got booking link, shared immediately

---

### Yonas (Tech-Comfortable, 5 minutes)
1. **Step 1**: Quick profile setup
2. **Step 2**: Connects Google Calendar (familiar with OAuth)
3. **Step 3**: Custom availability (Tue-Sat, closed Monday)
4. **Step 4**: Creates 3 services (Haircut, Coloring, Styling)
5. **Step 5**: Enables telebirr payment immediately

**Pain Points**: Wants bulk service creation (not in MVP)  
**Success**: Full setup with payment integration

---

### Error Scenarios

**Google OAuth Failure:**
- Show error: "Unable to connect Google Calendar"
- Offer: "Use Built-in Calendar instead"
- Don't block progress

**No Availability Set:**
- Block Step 4 (can't create service without availability)
- Show inline error: "Please set your availability first"

**Slow Connection:**
- Show skeleton loaders immediately
- Auto-save progress every 30 seconds
- Resume from last saved step

---

## 9. Localization (Amharic/English)

### Key Translations

| Key | English | Amharic |
|-----|---------|---------|
| `onboarding.welcome` | Welcome! Let's set up your scheduling | እንኳን ደህና መጡ! |
| `onboarding.step1.title` | Business Profile | የንግድ መገለጫ |
| `onboarding.step2.title` | Connect Calendar | ቀን መቁጠሪያ አገናኝ |
| `onboarding.step3.title` | Set Availability | የስራ ጊዜ ያስገቡ |
| `onboarding.step4.title` | Create Service | አገልግሎት ፍጠር |
| `dashboard.welcome` | Welcome back, {name}! | እንደገና እንኳን ደህና መጡ, {name}! |
| `dashboard.stats.thisWeek` | This Week | ይህን ሳምንት |
| `dashboard.stats.revenue` | Revenue | ገቢ |

### Formatting
- **Currency**: ETB / ብር (Ethiopian Birr)
- **Date**: DD/MM/YYYY
- **Time**: 24-hour clock
- **Phone**: +251 (Ethiopia)

---

## 10. Performance & Accessibility

### Performance Targets
- Initial load: < 2 seconds (3G connection)
- Step transition: < 300ms
- API response: < 1 second
- Dashboard refresh: < 1.5 seconds

### Optimization
- Code splitting (lazy load sections)
- Skeleton loaders for perceived performance
- Cache dashboard data (5-minute TTL)
- Optimize images (WebP, lazy load)

### Accessibility (WCAG 2.1 AA)
- Color contrast ≥ 4.5:1
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader support (ARIA labels, roles)
- Focus indicators on all interactive elements

---

## 11. Success Metrics

### Primary KPIs
1. **90% complete onboarding in 10 min** (measure: median time)
2. **80% get first booking in 24h** (measure: time from onboarding to first booking)
3. **95% self-serve setup** (measure: support ticket rate)
4. **70% enable Google Calendar** (measure: OAuth completion rate)

### Tracking
- Step completion rates (funnel analysis)
- Time spent per step
- Abandonment points
- Dashboard engagement (most used actions)

---

## 12. Implementation Plan

### Phase 0: Mock Data Setup (Pre-Sprint 1)
- Create sample provider profiles
- Seed availability schedules
- Generate mock appointments (30 days)
- Mock stats for dashboard
- **Purpose**: Demo for stakeholder review

### Phase 1: Onboarding Wizard (Sprint 1)
- Setup `/home` route
- Build 5-step wizard
- Form validation and error handling
- API integration (backend stubs OK)

### Phase 2: Dashboard View (Sprint 1-2)
- Build dashboard layout
- Quick stats cards
- Quick actions
- Activity feed

### Phase 3: Polish (Sprint 2)
- Setup checklist
- Alerts panel
- Animations (framer-motion)
- Performance optimization

### Phase 4: Testing (Sprint 2)
- E2E tests (Playwright)
- Accessibility audit
- Performance testing (3G simulation)
- User testing with personas

---

## 13. Integration with Other Features

- **Public Booking Page** (`/schedule/in/:meetId`): Provider creates service → Generates public URL
- **Front-Desk Console** (Sprint 5): Staff operational view vs provider dashboard
- **Analytics Dashboard** (Sprint 7): Quick stats → Deep-dive reports
- **Payment Integration** (Sprint 3): Setup checklist → Payment config
- **Notifications** (Sprint 4): Alerts panel → Notification settings

---

## 14. Future Enhancements

- Industry-specific templates (clinic, salon, university)
- Video tutorials (Amharic voice-over)
- Team/bulk onboarding wizard
- AI assistant for setup help
- Mobile provider app
- Best practices community

---

## Files to Create/Modify

### New Files
```
frontend/src/pages/home/
├── index.tsx
├── sections/
│   ├── OnboardingWizard.tsx
│   ├── Dashboard.tsx
│   ├── SetupChecklist.tsx
│   ├── QuickStats.tsx
│   ├── QuickActions.tsx
│   └── RecentActivity.tsx
└── components/
    ├── AvailabilityGrid.tsx
    ├── ServiceForm.tsx
    └── BookingLinkCard.tsx

frontend/src/context/
└── onboarding.tsx
```

### Modified Files
```
frontend/src/route.tsx          # Add /home route
frontend/src/lib/i18n/          # Add translations
```

### Backend Files (Later Sprints)
```
appointment/scheduler/api/
├── onboarding.py
└── dashboard.py

appointment/scheduler/doctype/
├── onboarding_progress/
└── dashboard_settings/
```

---

**End of Specification**

This document serves as the blueprint for implementing the provider dashboard. Start with the onboarding wizard, then build the dashboard view. Iterate based on user feedback.

