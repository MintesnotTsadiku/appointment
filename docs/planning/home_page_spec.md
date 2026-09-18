# Onboarding Dashboard & Home Page Specification

## Document Structure

Create a detailed specification document at `docs/planning/onboarding_dashboard_specification.md` that includes:

### 1. Executive Summary & Goals

- Problem statement (current pain points)
- Success metrics (90% complete in 10 min, 80% first booking in 24h)
- User personas (Dr. Amara, Yonas, Tigist)
- Constraints (Frappe permissions, slow connections, multi-user)

### 2. Page Architecture & Routing

- Frappe desk page structure (`/app/home` or `/app/onboarding`)
- State management approach (onboarding progress tracking)
- Integration points with existing doctypes (Appointment Group, User Availability, Google Calendar)
- Permission-based rendering (owner vs manager vs provider roles)

### 3. Onboarding Wizard Flow (First-Time Users)

- Complete 5-step flow with ASCII wireframes for each step:
- Step 1: Profile setup (name, business type, timezone, language)
- Step 2: Calendar connection (simplified OAuth flow)
- Step 3: Set availability (visual weekly schedule picker)
- Step 4: Create first appointment type (simplified form)
- Step 5: Get booking link (copy/share)
- Progress indicator component spec
- Navigation controls (back/next/skip)
- Data validation and error handling per step
- State persistence (resume if interrupted)

### 4. Dashboard View (Returning Users)

- ASCII wireframe of full dashboard layout
- Component specifications:
- Welcome header with personalization
- 4 quick stats cards (appointments this week, upcoming today, booking rate, revenue)
- Quick action buttons (6 primary actions)
- Recent activity feed widget
- Alerts/notifications panel
- Responsive layout considerations (mobile/tablet)

### 5. Setup Checklist Component

- 7-item checklist with progress tracking
- Per-item specifications (link targets, completion logic)
- Visual design (collapsible, always-visible until complete)
- Persistence strategy

### 6. Simplified Configuration Flows

- Calendar Connection UI flow (Google OAuth vs Manual)
- Availability Setup visual grid specifications
- Appointment Type Creation form (simplified fields)
- Preview booking page component

### 7. Component Library Specifications

Each component detailed with:

- Props/parameters
- State management
- Event handlers
- Frappe framework integration
- Accessibility attributes
- Localization hooks (Amharic/English)

### 8. API Requirements

Define endpoints needed:

- `POST /api/method/appointment.onboarding.get_progress` - Fetch user onboarding state
- `POST /api/method/appointment.onboarding.update_step` - Save step progress
- `GET /api/method/appointment.dashboard.stats` - Dashboard metrics
- `GET /api/method/appointment.dashboard.recent_activity` - Activity feed
- `POST /api/method/appointment.setup.connect_calendar` - Simplified OAuth
- `POST /api/method/appointment.setup.save_availability` - Quick availability save
- Request/response schemas for each

### 9. Data Model Extensions

- OnboardingProgress doctype specification (user, current_step, completed_steps, completed_at)
- DashboardSettings doctype (user preferences, widget visibility)
- Integration with existing doctypes

### 10. User Flows & Scenarios

- Dr. Amara's journey (not tech-savvy, clinic owner)
- Yonas's journey (tech-comfortable, salon manager)
- Tigist's journey (university admin, multi-provider)
- Error/edge case scenarios (OAuth failure, no availability set, etc.)

### 11. Localization Strategy

- Translation keys structure
- Amharic/English content for all text
- RTL considerations (if needed)
- Date/time/currency formatting (ETB, DD/MM/YYYY, Africa/Addis_Ababa)

### 12. Accessibility Requirements

- WCAG 2.1 AA compliance targets
- Keyboard navigation
- Screen reader support
- Focus management
- Color contrast ratios

### 13. Performance Requirements

- < 2 seconds per step load time
- Optimizations for slow connections (lazy loading, skeleton screens)
- Asset size budgets
- Caching strategies

### 14. Analytics & Tracking

- Onboarding funnel metrics (step completion rates)
- Time-to-completion tracking
- Abandonment points identification
- Dashboard engagement metrics

### 15. Success Metrics & KPIs

- How to measure if onboarding is effective
- A/B testing considerations
- Feedback collection mechanism

### 16. Implementation Notes

- Frappe framework integration patterns
- React component structure (if using React)
- CSS framework/styling approach
- Testing strategy (unit, integration, E2E)

### 17. Future Enhancements

- Post-MVP features
- Advanced onboarding paths
- Team onboarding flows
- Video tutorials integration

## Key Files Referenced

- Integrates with existing `Appointment Group`, `User Availability`, `Google Calendar` doctypes
- Links to `docs/planning/PROJECT_STATUS_TRACKER.md` sprint roadmap
- Coordinates with payment integration (Sprint 3) and front-desk console (Sprint 5)