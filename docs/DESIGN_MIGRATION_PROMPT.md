# Design Migration Prompt - Copy Reception Console Design

**Copy this entire prompt to another AI agent to migrate pages to the Reception Console design system.**

---

## Task: Migrate Pages to Reception Console Design System

### Context

I have a beautiful Reception Console design at `/reception` route that implements a premium "100 million startup" aesthetic with:
- Dark mode foundation with ambient background glows
- Dynamic theme colors from Landing Page Settings (via CSS variables)
- Glass-morphism effects with backdrop-blur
- Smooth Framer Motion animations
- Gradient icons and cards
- Professional typography and spacing

### Your Task

Apply this exact design system to the following pages in priority order (highest to lowest):

### Priority 1: Core User Pages (Do These First)
1. **`/home`** - Provider Dashboard (`frontend/src/pages/home/index.tsx`)
2. **`/calendar`** - Calendar View (`frontend/src/pages/calendar/index.tsx`)
3. **`/analytics`** - Analytics Dashboard (`frontend/src/pages/analytics/index.tsx`)

### Priority 2: Settings Pages (Do These Second)
4. **`/settings/team`** - Team Management (`frontend/src/pages/settings/team.tsx`)
5. **`/settings/profile`** - Profile Settings (`frontend/src/pages/settings/profile/index.tsx`)
6. **`/settings/availability`** - Availability Settings (`frontend/src/pages/settings/availability.tsx`)
7. **`/settings/services`** - Services Management (`frontend/src/pages/settings/services/index.tsx`)
8. **`/settings/location`** - Location Settings (`frontend/src/pages/settings/location/index.tsx`)
9. **`/settings/calendar`** - Calendar Settings (`frontend/src/pages/settings/calendar/index.tsx`)
10. **`/settings/manage`** - General Management (`frontend/src/pages/settings/manage/index.tsx`)

### Priority 3: Admin Pages (Do These Third)
11. **`/admin/dashboard`** - Admin Dashboard (`frontend/src/pages/admin/dashboard/index.tsx`)
12. **`/settings/services/:serviceId`** - Edit Service (`frontend/src/pages/settings/edit-service/index.tsx`)

---

## Design System Requirements

### 1. Page Structure Template

Every page must follow this structure:

```tsx
import { motion } from 'framer-motion';

const PageName = () => {
  return (
    <div 
      className="min-h-screen text-[var(--text-primary)] overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-primary)' }}
        />
        <div 
          className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-secondary)' }}
        />
        <div 
          className="absolute -bottom-40 right-1/3 w-80 h-80 rounded-full blur-[100px]"
          style={{ backgroundColor: 'var(--glow-success)' }}
        />
      </div>

      <div className="relative z-10">
        {/* Header Component */}
        {/* Main Content */}
      </div>
    </div>
  );
};
```

### 2. Header Component Pattern

Create a header component similar to `DeskHeader.tsx`:
- Sticky header with `backdrop-blur-xl`
- Left: Logo/Title with optional badge
- Center: Navigation/controls
- Right: Action buttons
- Use `var(--border-subtle)` for background, `var(--border-default)` for borders

### 3. Stats Cards Pattern

Use this pattern for metric cards:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: index * 0.1 }}
  className="relative group"
>
  <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 
                  transition-opacity duration-300 rounded-2xl blur-xl" />
  <div 
    className="relative backdrop-blur-sm rounded-2xl p-5 hover:bg-[var(--border-subtle)] 
              transition-all duration-300"
    style={{ 
      backgroundColor: 'var(--border-subtle)',
      border: '1px solid var(--border-default)'
    }}
  >
    <div className="inline-flex p-2.5 rounded-xl mb-3 bg-gradient-primary">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="text-3xl font-bold tracking-tight">{value}</div>
    <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
      {label}
    </div>
  </div>
</motion.div>
```

### 4. Color System (MANDATORY - Use CSS Variables)

**NEVER use hardcoded colors.** Always use CSS variables:

- **Backgrounds**: `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-elevated)`
- **Text**: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--text-subtle)`
- **Borders**: `var(--border-subtle)`, `var(--border-default)`, `var(--border-strong)`
- **Accents**: `var(--accent-primary)`, `var(--accent-secondary)`, `var(--accent-success)`
- **Gradients**: Use utility classes `bg-gradient-primary`, `bg-gradient-secondary`, `bg-gradient-success`

### 5. Card/Container Styles

```tsx
// Standard card
<div 
  className="rounded-xl p-5 backdrop-blur-sm"
  style={{ 
    backgroundColor: 'var(--border-subtle)',
    border: '1px solid var(--border-default)'
  }}
>

// Elevated card
<div 
  className="rounded-2xl p-6"
  style={{ 
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)'
  }}
>
```

### 6. Button Styles

```tsx
// Primary button
<button className="bg-gradient-primary px-5 py-2.5 rounded-xl font-medium text-sm text-white">
  Action
</button>

// Ghost button
<button 
  className="px-4 py-2 rounded-lg font-medium text-sm"
  style={{ 
    backgroundColor: 'var(--border-subtle)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)'
  }}
>
  Action
</button>
```

### 7. Animations

- Use Framer Motion for all page transitions
- Stagger list animations: `delay: index * 0.1`
- Hover effects: `hover:scale-[1.02]`, `hover:bg-[var(--border-subtle)]`
- Smooth transitions: `transition-all duration-300`

---

## Implementation Steps

For each page:

1. **Read the current page** to understand its functionality
2. **Read the Reception Console** (`frontend/src/pages/reception/index.tsx`) as reference
3. **Apply the design system** while preserving all existing functionality
4. **Replace hardcoded colors** with CSS variables
5. **Add animations** using Framer Motion
6. **Create header component** if page doesn't have one
7. **Update stat cards** to use gradient icons
8. **Test the page** to ensure functionality is preserved

---

## Key Files to Reference

- **Design Reference**: `frontend/src/pages/reception/index.tsx`
- **Header Component**: `frontend/src/pages/reception/components/DeskHeader.tsx`
- **Theme Utilities**: `frontend/src/pages/reception/utils/themeUtils.ts`
- **CSS Variables**: `frontend/src/global.css`
- **Theme Provider**: `frontend/src/components/theme-provider/index.tsx`

---

## Important Notes

- **DO NOT** break existing functionality
- **DO NOT** use hardcoded colors - always use CSS variables
- **DO** maintain responsive design
- **DO** add smooth animations
- **DO** use the exact same visual style as `/reception`
- **DO** test each page after migration

---

## Deliverables

For each page, provide:
1. Updated component file with new design
2. Any new component files created (e.g., header components)
3. Brief summary of changes made
4. Screenshot or description of the result

---

## Start with Priority 1

Begin with `/home` (Provider Dashboard) and work through the priority list. Complete one page fully before moving to the next.

**Reference the Reception Console design at `/reception` for exact styling, spacing, colors, and animations.**

---

**Questions?** Refer to:
- `docs/DESIGN_SYSTEM_MIGRATION.md` for detailed design system documentation
- `frontend/src/pages/reception/` for complete reference implementation






