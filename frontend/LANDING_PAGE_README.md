# Ethiopian Scheduling Platform - Landing Page

## Overview
This is a premium landing page for the Ethiopian Scheduling Platform, built with React, TypeScript, Tailwind CSS, and Framer Motion. The page showcases the platform as a world-class scheduling solution for Ethiopian businesses.

## Phase 1 Components (Completed)

### 1. Navigation Bar
- **Location**: `src/components/layout/Navigation.tsx`
- **Features**:
  - Sticky positioning with backdrop blur on scroll
  - Responsive mobile menu with slide-in animation
  - Theme toggle (Dark/Light mode)
  - CTA buttons (Sign In, Get Started)
  - Smooth scroll behavior

### 2. Hero Section
- **Location**: `src/pages/landing/sections/Hero.tsx`
- **Features**:
  - Animated gradient background with floating orbs
  - Two-column layout (content + visual mockup)
  - Staggered entrance animations
  - Floating notification cards
  - Trust indicators (user avatars, ratings)
  - Dual CTAs (Start Free Trial, Watch Demo)

### 3. Footer
- **Location**: `src/components/layout/Footer.tsx`
- **Features**:
  - Multi-column layout (Brand, Product, Resources, Company)
  - Social media links with hover animations
  - Contact information
  - Payment method badges
  - Compliance indicators

## Design System

### Colors
- **Primary**: Indigo (#6366F1) - Trust, professionalism
- **Secondary**: Emerald (#10B981) - Growth, success
- **Accent**: Gold (#F59E0B) - Ethiopian gold

### Typography
- **Headings**: Plus Jakarta Sans
- **Body**: Inter
- **Fonts loaded via Google Fonts**

### Gradients
- `gradient-hero`: Purple to violet gradient
- `gradient-feature`: Indigo to pink spectrum
- `gradient-pricing`: Emerald gradient

### Animations
- Fade in up
- Slide in from right/left
- Floating elements
- Gradient shifts
- Stagger children

## File Structure

```
frontend/src/
├── components/
│   └── layout/
│       ├── Navigation.tsx
│       └── Footer.tsx
├── pages/
│   └── landing/
│       ├── index.tsx (main landing page)
│       └── sections/
│           └── Hero.tsx
├── lib/
│   ├── animations.ts (Framer Motion variants)
│   └── constant.ts (BASE_ROUTE configuration)
└── global.css (Tailwind + custom styles)
```

## Routing Setup

- **Root Path (`/`)**: Landing page
- **Appointment Routes**: `/schedule/in/:meetId`, `/schedule/gr/:groupId`
- **Base Route**: Changed from `/schedule` to `/` for root-level landing page

## Frappe Integration

### Web Pages
- `frappe_appointment/www/index.html` - Root route HTML
- `frappe_appointment/www/index.py` - Context provider for root route

### Hooks Configuration
Updated `hooks.py` with website route rules for both root and schedule paths.

## Development

### Run Development Server
```bash
cd frontend
npm run dev
```

### Build for Production
```bash
cd frontend
npm run build
```

This will:
1. Build the React app
2. Copy assets to `/assets/frappe_appointment/frontend/`
3. Update `www/schedule/index.html` with built assets

## Next Steps (Phase 2)

1. **Logo Cloud Section** - Trust indicators with partner logos
2. **Value Proposition Section** - 3-card layout showcasing core benefits
3. **Features Grid** - 6 features with alternating layouts
4. **Pricing Section** - 4-tier pricing cards with toggle

## Technologies Used

- React 18.3.1
- TypeScript 5.6.2
- Tailwind CSS 3.4.6
- Framer Motion 12.4.10
- Radix UI (shadcn/ui components)
- Lucide React (icons)
- Vite 6.0.5 (build tool)

## Design Inspiration

- [Calendly](https://calendly.com/) - Structure and flow
- Linear.app - Gradient usage and animations
- Stripe.com - Clean, professional design
- Premium SaaS aesthetics with $10M seed-funded startup feel

## Notes

- All components use Tailwind CSS for styling
- Animations respect `prefers-reduced-motion` (to be implemented)
- Mobile-responsive design throughout
- Dark mode fully supported
- SEO optimization (to be added in Phase 4)

