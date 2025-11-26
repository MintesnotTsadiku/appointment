# Appointment Booking Page - Complete UX/UI Redesign Specification
## World-Class User Experience Design

**Version:** 1.0  
**Date:** November 18, 2025  
**Status:** Implementation Ready

---

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [User Research Insights](#user-research-insights)
3. [Information Architecture](#information-architecture)
4. [Component Architecture](#component-architecture)
5. [Visual Design System](#visual-design-system)
6. [Interaction Patterns](#interaction-patterns)
7. [Responsive Design](#responsive-design)
8. [Accessibility](#accessibility)
9. [Performance Optimization](#performance-optimization)
10. [Implementation Roadmap](#implementation-roadmap)

---

## 1. Design Philosophy

### Core Principles

**1.1 Progressive Disclosure**
- Show only what's needed at each step
- Reduce cognitive load through staged information
- Allow power users to access advanced options without overwhelming novices

**1.2 Mobile-First Design**
- Design for small screens first, enhance for larger screens
- Touch-friendly interactions (minimum 44x44px targets)
- One-handed use optimization for mobile

**1.3 Confidence Through Clarity**
- Clear visual feedback for every interaction
- Prevent errors before they happen
- Clear affordances - users always know what's clickable

**1.4 Delight Without Distraction**
- Smooth micro-interactions that feel natural
- Purposeful animations that guide attention
- Fast performance that feels instant

**1.5 Inclusive by Default**
- WCAG 2.1 AA compliance minimum
- Support for Ethiopian time format feels native
- Dark mode as a first-class citizen

---

## 2. User Research Insights

### Key User Personas

**2.1 The Rushed Professional** (40% of users)
- Mobile-first, often booking during commute
- Wants fastest path to booking
- Values: Speed, clarity, confidence
- Pain points: Too many clicks, unclear availability

**2.2 The Careful Planner** (35% of users)
- Desktop user, comparing multiple time slots
- Wants to see full week/month availability
- Values: Comprehensive view, flexibility
- Pain points: Limited visibility, difficulty comparing options

**2.3 The International User** (15% of users)
- Timezone-sensitive bookings
- May use Ethiopian time format
- Values: Clear timezone indicators, familiar patterns
- Pain points: Timezone confusion, format switching difficulty

**2.4 The Accessibility User** (10% of users)
- Screen reader users, keyboard navigation
- Motor impairment considerations
- Values: Keyboard accessibility, clear announcements
- Pain points: Hidden interactions, unclear focus states

---

## 3. Information Architecture

### Three-Phase Flow Model

```
Phase 1: DISCOVER          Phase 2: SELECT           Phase 3: CONFIRM
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Organization  │  →    │   Date & Time   │  →    │ Contact Details │
│   & Service     │       │   Selection     │       │   & Booking     │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Phase 1: DISCOVER (Organization Bookings)
**Goal:** User understands what they're booking

**Desktop Layout:**
```
┌─────────────────────────────────────────────────────┐
│  [Back]                            [Dark Mode] [Lang]│
├─────────────────────────────────────────────────────┤
│                                                     │
│         ╔═══════════════════════════════════╗       │
│         ║   Organization Profile Card      ║       │
│         ║   ┌───────┐                      ║       │
│         ║   │ Logo  │  Clinic Name         ║       │
│         ║   └───────┘  2 providers         ║       │
│         ║              available            ║       │
│         ╚═══════════════════════════════════╝       │
│                                                     │
│     Select a Service or Provider                   │
│                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌────────┐  │
│   │ General      │  │ Specialist   │  │ Group  │  │
│   │ Consultation │  │ Consultation │  │ Session│  │
│   │              │  │              │  │        │  │
│   │ 30 min       │  │ 60 min       │  │ 90 min │  │
│   │ Dr. Smith    │  │ Dr. Johnson  │  │        │  │
│   └──────────────┘  └──────────────┘  └────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Mobile Layout (320px+):**
```
┌───────────────────┐
│ [☰]    [🌙]  [EN] │
├───────────────────┤
│                   │
│  ┌─────────────┐  │
│  │   ◯ Logo   │  │
│  └─────────────┘  │
│                   │
│   Mahlet Clinic   │
│   2 providers     │
│                   │
├───────────────────┤
│                   │
│ Select Service ▼  │
│                   │
│ ┌───────────────┐ │
│ │ General       │ │
│ │ Consultation  │ │
│ │ 30 min        │ │
│ │ → Book Now    │ │
│ └───────────────┘ │
│                   │
│ ┌───────────────┐ │
│ │ Specialist    │ │
│ │ Consultation  │ │
│ │ 60 min        │ │
│ │ → Book Now    │ │
│ └───────────────┘ │
│                   │
└───────────────────┘
```

### Phase 2: SELECT (Unified Booking Interface)
**Goal:** Quick, confident date and time selection

**KEY INSIGHT:** Combine calendar and time slots into ONE view
- No separate "expand" needed
- Calendar on left, times on right (desktop)
- Stacked vertically on mobile with smart scrolling

**Desktop Layout (1024px+):**
```
┌─────────────────────────────────────────────────────────────┐
│ [← Back to Services]                  [Dr. Smith] [30 min]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Select Your Appointment Time                              │
│                                                             │
│  ┌────────────────────┬─────────────────────────────────┐  │
│  │   November 2025    │    Wed, November 19              │  │
│  │  ← Su Mo Tu We Th →│                                  │  │
│  │                    │    Morning                       │  │
│  │     1  2  3  4  5  │    ○ 08:00 AM                   │  │
│  │  6  7  8  9 10 11  │    ○ 08:30 AM                   │  │
│  │ 13 14 15 16 17 18  │    ○ 09:00 AM ← Recommended     │  │
│  │ 20 21 22 23 24 25  │    ○ 09:30 AM                   │  │
│  │ 27 28 29 30        │                                  │  │
│  │                    │    Afternoon                     │  │
│  │ ┌────────────────┐ │    ○ 02:00 PM                   │  │
│  │ │ Quick Jump:    │ │    ○ 02:30 PM                   │  │
│  │ │ [Today] [+1w]  │ │    ○ 03:00 PM                   │  │
│  │ └────────────────┘ │                                  │  │
│  │                    │    Evening                       │  │
│  │ Time Format:       │    ○ 05:00 PM                   │  │
│  │ [12H][24H][ሰዓት]   │    ○ 05:30 PM                   │  │
│  │                    │                                  │  │
│  │ Timezone:          │    [No available slots]          │  │
│  │ Africa/Addis_Ababa │                                  │  │
│  └────────────────────┴─────────────────────────────────┘  │
│                                                             │
│  ℹ All times shown in your local timezone                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Mobile Layout - Smart Single Column (320px+):**
```
┌─────────────────────┐
│ [←] Dr. Smith - 30m │
├─────────────────────┤
│                     │
│  Pick a Date        │
│                     │
│  Nov 2025  [<] [>]  │
│                     │
│  Su Mo Tu We Th Fr  │
│      1  2  3  4  5  │
│   6  7  8  9 10 11  │
│  13 14 15 16 17 18  │
│  20 21 22 23 24 25  │
│  27 28 29 30        │
│                     │
│  [Today] [Tomorrow] │
│                     │
├─────────────────────┤
│ Selected: Wed, Nov 19│
├─────────────────────┤
│                     │
│ Available Times ▼   │
│                     │
│ Morning             │
│ ┌─────────────────┐ │
│ │   08:00 AM     →│ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │   08:30 AM     →│ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │   09:00 AM     →│ │
│ │ ⭐ Recommended   │ │
│ └─────────────────┘ │
│                     │
│ Afternoon           │
│ ┌─────────────────┐ │
│ │   02:00 PM     →│ │
│ └─────────────────┘ │
│                     │
├─────────────────────┤
│ [12H] [24H] [ሰዓት]   │
│ Timezone: Add...▼   │
└─────────────────────┘
```

### Phase 3: CONFIRM
**Goal:** Quick form completion, immediate confirmation

---

## 4. Component Architecture

### New Component Structure

```
src/
├── pages/
│   └── booking-v2/                    # New redesigned booking flow
│       ├── index.tsx                  # Main booking orchestrator
│       ├── hooks/
│       │   ├── useBookingState.ts     # Centralized state management
│       │   ├── useTimeSlots.ts        # Time slot data fetching
│       │   └── useBookingFlow.ts      # Multi-step flow management
│       ├── components/
│       │   ├── BookingHeader/         # Persistent header with context
│       │   ├── ServiceSelector/       # Phase 1: Service selection
│       │   ├── DateTimeSelector/      # Phase 2: Unified date/time picker
│       │   │   ├── CalendarPanel/     # Modern calendar component
│       │   │   ├── TimeSlotsPanel/    # Grouped time slot display
│       │   │   └── QuickActions/      # Today, Tomorrow, Next Week
│       │   ├── BookingForm/           # Phase 3: Contact details
│       │   ├── ConfirmationModal/     # Success state
│       │   └── shared/
│       │       ├── TimeFormatToggle/  # 12H/24H/Ethiopian switcher
│       │       ├── TimezoneSelector/  # Enhanced timezone picker
│       │       └── LoadingStates/     # Skeleton screens
│       └── utils/
│           ├── dateHelpers.ts         # Date manipulation utilities
│           └── ethiopianTime.ts       # Ethiopian time conversion
└── components/
    ├── ui-v2/                         # New design system components
    │   ├── Button/                    # Enhanced button with states
    │   ├── Card/                      # Modern card variants
    │   ├── Input/                     # Improved form inputs
    │   └── Badge/                     # Status badges
    └── animations/                    # Reusable animation components
        ├── FadeIn/
        ├── SlideTransition/
        └── Shimmer/
```

### Key Component Specifications

#### 4.1 DateTimeSelector (The Heart of the Redesign)

**Props Interface:**
```typescript
interface DateTimeSelectorProps {
  availableDates: Date[];
  availableSlots: TimeSlot[];
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
  onDateSelect: (date: Date) => void;
  onSlotSelect: (slot: TimeSlot) => void;
  timeFormat: '12h' | '24h' | 'ethiopian';
  timezone: string;
  loading: boolean;
  providerInfo?: ProviderInfo;
  serviceInfo: ServiceInfo;
}
```

**Features:**
- ✅ Unified calendar + time slots view
- ✅ Smart scroll behavior (mobile: smooth snap to times when date selected)
- ✅ Quick jump buttons (Today, Tomorrow, Next Week)
- ✅ Visual indicators for availability density
- ✅ Skeleton loading states
- ✅ Empty states with helpful messaging
- ✅ Keyboard navigation support

#### 4.2 CalendarPanel (Modern Calendar Component)

**Key Improvements Over Current:**

1. **Visual Design:**
   - Larger touch targets (48x48px minimum on mobile)
   - Clear day name headers
   - Today badge with accent color
   - Selected date with primary color fill
   - Availability indicators:
     * High availability: Green dot
     * Limited availability: Yellow dot
     * Fully booked: No indicator, greyed out
     * Unavailable: Strikethrough, disabled state

2. **Interactions:**
   - Haptic feedback on mobile (if supported)
   - Smooth month transitions
   - Swipe gestures for month navigation (mobile)
   - Keyboard arrows for date navigation
   - Clear disabled states with tooltips

3. **Ethiopian Calendar Support:**
   - Toggle to show Ethiopian dates
   - Dual display mode (Gregorian + Ethiopian)
   - Native Ethiopian month names

**Visual States:**
```
Available Date:    Selected Date:     Today:           Disabled:
┌────────┐         ┌────────┐         ┌────────┐       ┌────────┐
│   15   │         │▓▓▓15▓▓▓│         │  [15]  │       │   15   │
│    •   │ green   │▓▓▓▓•▓▓▓│         │    •   │       │   /    │
└────────┘         └────────┘         └────────┘       └────────┘
```

#### 4.3 TimeSlotsPanel (Grouped Time Display)

**Key Features:**

1. **Grouping by Time of Day:**
   ```
   Morning (6:00 AM - 11:59 AM)
   ○ 08:00 AM    ○ 09:00 AM    ○ 10:00 AM
   ○ 08:30 AM    ○ 09:30 AM    ○ 10:30 AM

   Afternoon (12:00 PM - 5:00 PM)
   ○ 02:00 PM    ○ 03:00 PM    ○ 04:00 PM
   ○ 02:30 PM    ○ 03:30 PM    ○ 04:30 PM

   Evening (5:00 PM - 9:00 PM)
   ○ 05:00 PM    ○ 06:00 PM    ○ 07:00 PM
   ```

2. **Responsive Layout:**
   - Desktop: Multi-column grid (2-3 columns)
   - Tablet: 2 columns
   - Mobile: Single column, full-width buttons

3. **Visual Enhancements:**
   - "Recommended" badge for optimal slots
   - Provider assignment shown (for org bookings)
   - Past times automatically disabled and styled differently
   - Smooth hover/active states

4. **Performance:**
   - Virtual scrolling for 100+ time slots
   - Lazy loading of off-screen slots

#### 4.4 TimeFormatToggle (Enhanced Format Switcher)

**Current Problems:**
- Hidden in settings-like position
- Not discoverable
- No context for Ethiopian time

**New Design:**
```
Mobile (Compact):
┌──────────────────────┐
│ Time: [12H][24H][ሰዓት]│
└──────────────────────┘

Desktop (Expanded):
┌────────────────────────────────┐
│ Time Format:                   │
│ ┌─────┐ ┌─────┐ ┌──────────┐  │
│ │12-Hr│ │24-Hr│ │Local Time│  │
│ │AM/PM│ │ 15:00│ │ ሰዓት 7:00  │  │
│ └─────┘ └─────┘ └──────────┘  │
└────────────────────────────────┘
```

**Features:**
- Example time shown in each format
- Smooth transition animation when switching
- Persistent selection (localStorage)
- Accessible via keyboard

---

## 5. Visual Design System

### 5.1 Color Palette

**Primary Colors:**
```css
/* Light Mode */
--primary-50:  #EFF6FF;   /* Backgrounds */
--primary-100: #DBEAFE;   /* Hover states */
--primary-500: #3B82F6;   /* Primary actions */
--primary-600: #2563EB;   /* Primary hover */
--primary-700: #1D4ED8;   /* Primary active */

/* Dark Mode */
--primary-dark-400: #60A5FA;
--primary-dark-500: #3B82F6;
--primary-dark-600: #2563EB;
```

**Semantic Colors:**
```css
/* Success (Available) */
--success-500: #10B981;
--success-100: #D1FAE5;

/* Warning (Limited) */
--warning-500: #F59E0B;
--warning-100: #FEF3C7;

/* Danger (Unavailable/Error) */
--danger-500: #EF4444;
--danger-100: #FEE2E2;

/* Neutral */
--gray-50:  #F9FAFB;
--gray-100: #F3F4F6;
--gray-500: #6B7280;
--gray-900: #111827;
```

**Ethiopian Culture Colors:**
```css
--ethiopia-green: #009639;
--ethiopia-yellow: #FBDE4A;
--ethiopia-red: #DA121A;
```

### 5.2 Typography

**Font Stack:**
```css
/* Primary: Modern, Legible */
--font-sans: 'Inter', 'Noto Sans Ethiopic', system-ui, -apple-system, sans-serif;

/* Heading: Bold, Distinctive */
--font-heading: 'Plus Jakarta Sans', 'Inter', sans-serif;

/* Mono: Times, Numbers */
--font-mono: 'JetBrains Mono', 'SF Mono', monospace;
```

**Type Scale:**
```css
/* Mobile-first sizes */
--text-xs:   0.75rem;  /* 12px - Captions */
--text-sm:   0.875rem; /* 14px - Body small */
--text-base: 1rem;     /* 16px - Body */
--text-lg:   1.125rem; /* 18px - Emphasized */
--text-xl:   1.25rem;  /* 20px - Subheadings */
--text-2xl:  1.5rem;   /* 24px - Headings */
--text-3xl:  1.875rem; /* 30px - Page titles */
--text-4xl:  2.25rem;  /* 36px - Hero (desktop) */
```

### 5.3 Spacing System

**Based on 4px grid:**
```css
--space-1:  0.25rem;  /* 4px */
--space-2:  0.5rem;   /* 8px */
--space-3:  0.75rem;  /* 12px */
--space-4:  1rem;     /* 16px */
--space-6:  1.5rem;   /* 24px */
--space-8:  2rem;     /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### 5.4 Elevation & Shadows

**Subtle depth for components:**
```css
/* Light Mode */
--shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md:  0 4px 6px rgba(0, 0, 0, 0.07);
--shadow-lg:  0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl:  0 20px 25px rgba(0, 0, 0, 0.15);

/* Dark Mode */
--shadow-dark-md: 0 4px 6px rgba(0, 0, 0, 0.3);
--shadow-dark-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
```

### 5.5 Border Radius

**Consistent rounded corners:**
```css
--radius-sm:  0.375rem;  /* 6px - Small elements */
--radius-md:  0.5rem;    /* 8px - Buttons, inputs */
--radius-lg:  0.75rem;   /* 12px - Cards */
--radius-xl:  1rem;      /* 16px - Modals */
--radius-2xl: 1.5rem;    /* 24px - Hero elements */
--radius-full: 9999px;   /* Pills, avatars */
```

---

## 6. Interaction Patterns

### 6.1 Micro-interactions

**Button Press:**
```css
/* Tap/Click feedback */
.button {
  transition: all 0.15s ease;
}
.button:active {
  transform: scale(0.98);
}
```

**Time Slot Selection:**
```
Idle → Hover → Active → Selected
○     ○       ⊙        ●
```

**Animation Timing:**
- Micro: 150ms (button press)
- UI Response: 250ms (modal open)
- Page Transition: 350ms (route change)
- Loading: 500ms+ (skeleton fade)

### 6.2 Loading States

**Progressive Loading:**
1. **Skeleton Screen** (0-500ms)
   - Placeholder shapes
   - Shimmer animation
   - Maintains layout

2. **Partial Content** (500ms-2s)
   - Critical content first
   - Progressive enhancement
   - Loading indicators for secondary content

3. **Complete State** (2s+)
   - All content loaded
   - Smooth fade-in

**Example Time Slots Loading:**
```
┌─────────────┐
│ ▭▭▭▭▭▭     │ ← Shimmer
│ ▭▭▭▭▭▭     │
│ ▭▭▭▭▭▭     │
└─────────────┘
     ↓
┌─────────────┐
│ 08:00 AM    │ ← Fade in
│ 08:30 AM    │
│ 09:00 AM    │
└─────────────┘
```

### 6.3 Error States

**Error Hierarchy:**

1. **Inline Errors** (Field-level)
   - Icon + Message below field
   - Red border on input
   - Shake animation on submit

2. **Toast Notifications** (Non-blocking)
   - Auto-dismiss in 5s
   - Can be manually dismissed
   - Bottom of screen (mobile), top-right (desktop)

3. **Modal Dialogs** (Blocking)
   - Critical errors only
   - Clear action buttons
   - Prevents further interaction

### 6.4 Empty States

**No Available Slots:**
```
┌─────────────────────────────┐
│         ┌───┐               │
│         │ 📅 │              │
│         └───┘               │
│                             │
│  No available time slots    │
│  for this date              │
│                             │
│  Try these alternatives:    │
│  • [Select another date]    │
│  • [View next available]    │
│  • [Contact us directly]    │
└─────────────────────────────┘
```

---

## 7. Responsive Design

### 7.1 Breakpoints

```css
/* Mobile First Approach */
--breakpoint-sm:  640px;   /* Large phones */
--breakpoint-md:  768px;   /* Tablets */
--breakpoint-lg:  1024px;  /* Laptops */
--breakpoint-xl:  1280px;  /* Desktops */
--breakpoint-2xl: 1536px;  /* Large displays */
```

### 7.2 Layout Transformations

**Mobile (320px - 768px):**
- Single column layout
- Stack calendar above time slots
- Full-width touch targets
- Bottom navigation/actions
- Collapsible sections

**Tablet (768px - 1024px):**
- Two-column where possible
- Side-by-side calendar + times (landscape)
- Larger touch targets maintained
- Floating action buttons

**Desktop (1024px+):**
- Multi-column layouts
- Persistent sidebar
- Hover states
- Keyboard shortcuts
- Dense information display

### 7.3 Touch Considerations

**Minimum Touch Targets:**
```
Mobile:  44x44px (iOS HIG)
Tablet:  40x40px
Desktop: 32x32px (with hover)
```

**Gesture Support:**
- Swipe calendar months (mobile)
- Pull-to-refresh (if needed)
- Long-press for additional options
- Pinch to zoom (accessibility)

---

## 8. Accessibility

### 8.1 WCAG 2.1 AA Compliance

**Checklist:**

✅ **Perceivable:**
- [ ] Color contrast ratio ≥ 4.5:1 for normal text
- [ ] Color contrast ratio ≥ 3:1 for large text
- [ ] Color is not the only indicator
- [ ] Text resize up to 200% without loss of content
- [ ] Images have alt text

✅ **Operable:**
- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Focus indicators visible
- [ ] Adequate time to complete forms
- [ ] Skip links provided

✅ **Understandable:**
- [ ] Language attribute set
- [ ] Clear error messages
- [ ] Consistent navigation
- [ ] Input assistance provided

✅ **Robust:**
- [ ] Valid HTML
- [ ] ARIA landmarks used correctly
- [ ] Compatible with assistive technologies

### 8.2 Keyboard Navigation

**Key Mappings:**
```
Arrow Keys:  Navigate calendar dates
Tab:         Move between interactive elements
Enter:       Select date/time slot
Escape:      Close modals/cancel actions
Space:       Toggle checkboxes/radio buttons
Home/End:    Jump to first/last day of month
Page Up/Dn:  Previous/Next month
```

### 8.3 Screen Reader Support

**ARIA Labels:**
```html
<!-- Calendar -->
<div role="grid" aria-label="Calendar for November 2025">
  <button 
    role="gridcell" 
    aria-label="November 19, 2025, Wednesday. 5 time slots available."
    aria-selected="true">
    19
  </button>
</div>

<!-- Time Slot -->
<button 
  role="button" 
  aria-label="8:00 AM, Morning slot with Dr. Smith">
  08:00 AM
</button>
```

**Live Regions:**
```html
<!-- Announce loading states -->
<div aria-live="polite" aria-atomic="true">
  Loading available time slots for November 19...
</div>

<!-- Announce errors -->
<div role="alert" aria-live="assertive">
  This time slot is no longer available. Please select another.
</div>
```

### 8.4 Ethiopian Time Accessibility

**Screen Reader Announcement:**
- "8:00 AM (2 o'clock Ethiopian time)"
- Use both formats for clarity
- Allow toggling via keyboard shortcut

---

## 9. Performance Optimization

### 9.1 Loading Performance

**Metrics:**
- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Time to Interactive (TTI):** < 3.5s
- **Cumulative Layout Shift (CLS):** < 0.1

**Strategies:**
1. Code splitting by route
2. Lazy load below-the-fold content
3. Prefetch next step data
4. Image optimization (WebP, lazy loading)
5. Service Worker for offline support

### 9.2 Runtime Performance

**Optimizations:**
1. **Virtualization:** Use for 100+ time slots
2. **Memoization:** React.memo for expensive components
3. **Debouncing:** Search/filter inputs
4. **Web Workers:** Date calculations, timezone conversions

### 9.3 Bundle Size

**Target:**
- Initial JS: < 150KB gzipped
- Total JS: < 300KB gzipped
- CSS: < 50KB gzipped

**Techniques:**
- Tree-shaking
- Dynamic imports
- Vendor splitting
- Compression (Brotli/Gzip)

### 9.4 Network Optimization

**Strategies:**
1. **Caching:**
   - Cache available dates for 5 minutes
   - Cache user preferences locally
   - Service Worker cache for offline

2. **Prefetching:**
   - Prefetch next week's availability
   - Prefetch form component when date selected

3. **Optimistic UI:**
   - Immediately show selection
   - Rollback on error

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up new component structure
- [ ] Create design system tokens
- [ ] Build base UI components (Button, Card, Input)
- [ ] Implement responsive grid system

### Phase 2: Core Components (Week 2)
- [ ] Build CalendarPanel component
- [ ] Build TimeSlotsPanel component
- [ ] Integrate with existing API
- [ ] Add loading states

### Phase 3: Enhancement (Week 3)
- [ ] Add micro-interactions
- [ ] Implement animations
- [ ] Add keyboard navigation
- [ ] Enhance Ethiopian time format

### Phase 4: Polish & Accessibility (Week 4)
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Mobile device testing

### Phase 5: Launch (Week 5)
- [ ] A/B testing setup
- [ ] Gradual rollout
- [ ] Monitor analytics
- [ ] Collect user feedback

---

## Success Metrics

### Quantitative
1. **Conversion Rate:** Increase by 25%
2. **Time to Book:** Reduce by 40%
3. **Mobile Bookings:** Increase by 50%
4. **Drop-off Rate:** Reduce by 30%
5. **Page Load Time:** < 2 seconds

### Qualitative
1. **User Satisfaction:** 4.5+ / 5.0
2. **Ease of Use:** "Very Easy" > 80%
3. **Would Recommend:** > 75%
4. **Design Appeal:** "Modern/Professional" > 85%

---

## Appendix A: Component Props Reference

### DateTimeSelector
```typescript
interface DateTimeSelectorProps {
  // Data
  availableDates: Date[];
  availableSlots: TimeSlot[];
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
  
  // Callbacks
  onDateSelect: (date: Date) => void;
  onSlotSelect: (slot: TimeSlot) => void;
  
  // Configuration
  timeFormat: '12h' | '24h' | 'ethiopian';
  timezone: string;
  locale: string;
  
  // State
  loading: boolean;
  error: Error | null;
  
  // Context
  providerInfo?: ProviderInfo;
  serviceInfo: ServiceInfo;
  
  // Accessibility
  ariaLabel?: string;
  id?: string;
}

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  provider?: {
    id: string;
    name: string;
    avatar?: string;
  };
  recommended?: boolean;
  available: boolean;
}
```

---

## Appendix B: Animation Specifications

```css
/* Timing Functions */
--ease-in-out-smooth: cubic-bezier(0.4, 0.0, 0.2, 1);
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
--ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);

/* Duration Tokens */
--duration-instant: 100ms;
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 350ms;
--duration-slower: 500ms;

/* Common Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}
```

---

**END OF SPECIFICATION**

---

*This specification is a living document and will be updated as we gather user feedback and iterate on the design.*

