# Reception Console Design System - Migration Guide

**Date**: 2025-11-28  
**Status**: Ready for Implementation  
**Reference Design**: `/reception` route

---

## 🎨 Design System Overview

The Reception Console (`/reception`) implements a premium "100 million startup" aesthetic with:

### Core Design Principles

1. **Dark Mode Foundation**
   - Primary background: `var(--bg-primary)` (#0a0a0f)
   - Secondary background: `var(--bg-secondary)` (#0f0f17)
   - Elevated surfaces: `var(--bg-elevated)` (#1a1a24)

2. **Color System (Dynamic from Landing Page Settings)**
   - **Primary Accent**: Violet/Purple gradients (`var(--accent-primary)`, `var(--gradient-primary-from/to)`)
   - **Secondary Accent**: Orange/Amber for actions (`var(--accent-secondary)`)
   - **Success**: Emerald/Teal (`var(--accent-success)`)
   - **Status Colors**: Dynamic based on appointment/booking status

3. **Visual Effects**
   - Glass-morphism with `backdrop-blur`
   - Ambient background glows (purple, blue, emerald)
   - Smooth animations with Framer Motion
   - Gradient icons and cards

4. **Typography**
   - Primary text: `var(--text-primary)` (white)
   - Secondary text: `var(--text-secondary)` (gray-300)
   - Muted text: `var(--text-muted)` (gray-400)
   - Subtle text: `var(--text-subtle)` (gray-500)

5. **Borders & Spacing**
   - Subtle borders: `var(--border-subtle)` (white/5)
   - Default borders: `var(--border-default)` (white/10)
   - Strong borders: `var(--border-strong)` (white/20)
   - Consistent padding: `p-5`, `p-6`, `gap-4`, `gap-6`

---

## 📋 Pages Priority List (Highest to Lowest)

### **Priority 1: Core User Pages** (Implement First)
1. **`/home`** - Provider Dashboard
   - Main entry point after login
   - Contains QuickStats, QuickActions, RecentActivity
   - High user engagement

2. **`/calendar`** - Calendar View
   - Core appointment management
   - Daily/weekly views
   - High usage frequency

3. **`/analytics`** - Analytics Dashboard
   - Business insights
   - Revenue tracking
   - Important for decision-making

### **Priority 2: Settings Pages** (Implement Second)
4. **`/settings/team`** - Team Management
   - Manage providers and staff
   - Regular admin task

5. **`/settings/profile`** - Profile Settings
   - User profile management
   - Account settings

6. **`/settings/availability`** - Availability Settings
   - Schedule management
   - Core functionality

7. **`/settings/services`** - Services Management
   - Service CRUD operations
   - Business configuration

8. **`/settings/location`** - Location Settings
   - Location management
   - Business configuration

9. **`/settings/calendar`** - Calendar Settings
   - Calendar integration
   - Configuration

10. **`/settings/manage`** - General Management
    - Overview of all settings
    - Settings hub

### **Priority 3: Admin & Special Pages** (Implement Third)
11. **`/admin/dashboard`** - Admin Dashboard
    - System administration
    - Lower user count

12. **`/settings/services/:serviceId`** - Edit Service
    - Detail/edit page
    - Modal or separate page

---

## 🎯 Design Elements to Copy

### 1. **Page Structure**
```tsx
<div className="min-h-screen text-[var(--text-primary)] overflow-hidden"
     style={{ backgroundColor: 'var(--bg-primary)' }}>
  {/* Ambient background effects */}
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
         style={{ backgroundColor: 'var(--glow-primary)' }} />
    <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
         style={{ backgroundColor: 'var(--glow-secondary)' }} />
    <div className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px]"
         style={{ backgroundColor: 'var(--glow-success)' }} />
  </div>

  <div className="relative z-10">
    {/* Header Component */}
    {/* Main Content */}
  </div>
</div>
```

### 2. **Header Component Pattern**
- Sticky header with `backdrop-blur-xl`
- Left: Logo/Title with PRO badge
- Center: Navigation/Date controls
- Right: Action buttons + theme toggle
- Uses `var(--border-subtle)` for borders

### 3. **Stats Cards**
```tsx
<div className="relative group">
  <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 
                  transition-opacity duration-300 rounded-2xl blur-xl" />
  <div className="relative backdrop-blur-sm rounded-2xl p-5 
                  hover:bg-[var(--border-subtle)] transition-all duration-300"
       style={{ 
         backgroundColor: 'var(--border-subtle)',
         border: '1px solid var(--border-default)'
       }}>
    <div className="inline-flex p-2.5 rounded-xl mb-3 bg-gradient-primary">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="text-3xl font-bold tracking-tight">{value}</div>
    <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
      {label}
    </div>
  </div>
</div>
```

### 4. **Button Styles**
- **Primary Action**: `bg-gradient-primary` with hover effects
- **Secondary Action**: `bg-gradient-secondary`
- **Ghost Button**: `bg-[var(--border-subtle)]` with `border-[var(--border-default)]`

### 5. **Card/Container Styles**
- Background: `var(--border-subtle)` or `var(--bg-elevated)`
- Border: `1px solid var(--border-default)`
- Rounded: `rounded-xl` or `rounded-2xl`
- Padding: `p-5` or `p-6`
- Backdrop blur: `backdrop-blur-sm`

### 6. **Animations**
- Use Framer Motion for page transitions
- Stagger animations for lists: `delay: index * 0.1`
- Hover effects: `hover:scale-[1.02]`, `hover:bg-[var(--border-subtle)]`

---

## 🔧 Technical Implementation

### Required Imports
```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/theme-provider';
```

### CSS Variables Usage
All colors should use CSS variables from the theme system:
- `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-elevated)`
- `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
- `var(--border-subtle)`, `var(--border-default)`, `var(--border-strong)`
- `var(--accent-primary)`, `var(--accent-secondary)`, `var(--accent-success)`
- `var(--gradient-primary-from)`, `var(--gradient-primary-to)`

### Utility Classes (from global.css)
- `.bg-gradient-primary` - Primary gradient background
- `.bg-gradient-secondary` - Secondary gradient background
- `.bg-gradient-success` - Success gradient background
- `.bg-theme-primary`, `.text-theme-primary`, etc.

---

## 📁 File Structure Reference

The Reception Console structure:
```
frontend/src/pages/reception/
├── index.tsx                    # Main page
├── components/
│   ├── DeskHeader.tsx          # Header with navigation
│   ├── DeskFilters.tsx         # Filter controls
│   ├── DeskCalendar.tsx        # Calendar view
│   ├── AppointmentCard.tsx     # Appointment card component
│   ├── WalkInQueue.tsx         # Walk-in queue sidebar
│   ├── WalkInCard.tsx          # Walk-in card component
│   ├── CreateAppointmentModal.tsx
│   └── AddWalkInModal.tsx
├── types.ts                     # TypeScript types
└── utils/
    └── themeUtils.ts            # Theme helper functions
```

---

## ✅ Checklist for Each Page Migration

- [ ] Apply dark mode background with ambient glows
- [ ] Create/update header component with consistent styling
- [ ] Replace hardcoded colors with CSS variables
- [ ] Add Framer Motion animations
- [ ] Update stat cards to use gradient icons
- [ ] Apply glass-morphism effects to cards
- [ ] Use theme-aware borders and backgrounds
- [ ] Ensure responsive design (mobile/tablet/desktop)
- [ ] Test with theme color changes
- [ ] Verify accessibility (contrast, keyboard navigation)

---

## 🎨 Design Tokens Reference

See `frontend/src/global.css` for complete CSS variable definitions.

Key variables:
- Backgrounds: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-elevated`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-subtle`
- Borders: `--border-subtle`, `--border-default`, `--border-strong`
- Accents: `--accent-primary`, `--accent-secondary`, `--accent-success`, `--accent-warning`
- Gradients: `--gradient-primary-from/to`, `--gradient-secondary-from/to`, `--gradient-success-from/to`
- Glows: `--glow-primary`, `--glow-secondary`, `--glow-success` (dark mode only)

---

## 📝 Notes

- All colors are **dynamic** and fetched from Landing Page Settings
- Theme system automatically applies colors via CSS variables
- No hardcoded colors should remain after migration
- Maintain existing functionality - only update styling
- Test each page individually before moving to next priority

---

**Last Updated**: 2025-11-28  
**Reference Implementation**: `/reception` route

