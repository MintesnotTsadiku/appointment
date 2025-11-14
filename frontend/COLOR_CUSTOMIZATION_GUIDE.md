# 🎨 Color Customization Guide

## Overview
All colors and gradients for the Ethiopian Scheduling Platform landing page are centralized in **ONE FILE** for easy customization.

## 📍 Where to Change Colors

### Single Source of Truth
**File**: `frontend/src/global.css` (Lines 6-30)

All brand colors, accent colors, and gradient definitions are defined as CSS variables in this file.

## 🎨 Color Variables

### Primary Brand Color (Currently: Indigo)
Used for: Primary buttons, links, accents, logo background

```css
/* Location: global.css lines 13-15 */
--brand-primary: #6366F1;        /* Main indigo color */
--brand-primary-dark: #4F46E5;   /* Darker shade for hover states */
--brand-primary-light: #818CF8;  /* Lighter shade for accents */
```

**Example Change**: Want to use blue instead?
```css
--brand-primary: #3B82F6;        /* Blue-500 */
--brand-primary-dark: #2563EB;   /* Blue-600 */
--brand-primary-light: #60A5FA;  /* Blue-400 */
```

### Secondary Brand Color (Currently: Emerald/Green)
Used for: Success states, money/revenue indicators, "growth" messaging

```css
/* Location: global.css lines 18-19 */
--brand-secondary: #10B981;      /* Emerald color */
--brand-secondary-dark: #059669; /* Darker emerald */
```

**Example Change**: Want to use teal instead?
```css
--brand-secondary: #14B8A6;      /* Teal-500 */
--brand-secondary-dark: #0D9488; /* Teal-600 */
```

### Accent Colors
Used for: Special highlights, badges, Ethiopian-specific elements

```css
/* Location: global.css lines 22-23 */
--brand-accent-gold: #F59E0B;    /* Gold/Amber - Ethiopian context */
--brand-accent-teal: #14B8A6;    /* Teal accent */
```

**Example Change**: Want different accents?
```css
--brand-accent-gold: #F97316;    /* Orange-500 */
--brand-accent-teal: #06B6D4;    /* Cyan-500 */
```

## 🌈 Gradient Customization

### Hero Section Gradient
The main gradient used in hero background and primary buttons.

```css
/* Location: global.css lines 26-27 */
--gradient-hero-start: #667eea;  /* Purple start */
--gradient-hero-end: #764ba2;    /* Violet end */
```

**Result**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

**Example Change**: Want a blue-to-purple gradient?
```css
--gradient-hero-start: #3B82F6;  /* Blue */
--gradient-hero-end: #8B5CF6;    /* Purple */
```

### Feature Section Gradient
Multi-color gradient used in feature highlights.

```css
/* Location: global.css lines 28-30 */
--gradient-feature-start: #6366F1;  /* Indigo */
--gradient-feature-mid: #8B5CF6;    /* Purple */
--gradient-feature-end: #D946EF;    /* Pink */
```

**Result**: `linear-gradient(to right, #6366F1, #8B5CF6, #D946EF)`

**Example Change**: Want a warm gradient?
```css
--gradient-feature-start: #F59E0B;  /* Amber */
--gradient-feature-mid: #F97316;    /* Orange */
--gradient-feature-end: #EF4444;    /* Red */
```

## 🔄 How Changes Propagate

When you change a CSS variable in `global.css`, it automatically updates:

1. ✅ **Navigation**
   - Logo background (uses `gradient-hero`)
   - "Get Started" button (uses `gradient-hero`)
   - Hover states (uses `brand-primary`)

2. ✅ **Hero Section**
   - Background gradient (uses `gradient-hero-start/end`)
   - Headline gradient text (uses `gradient-hero`)
   - CTA buttons (uses `gradient-hero`)
   - Trust indicator icons (uses `brand-primary`)
   - Revenue cards (uses `brand-secondary`)

3. ✅ **Footer**
   - Logo background (uses `gradient-hero`)
   - Social media hover states (uses `gradient-hero`)
   - Link hover colors (uses `brand-primary-light`)
   - Badge backgrounds (uses `brand-secondary`, `brand-accent-gold`)
   - Pulse indicator (uses `brand-secondary`)

4. ✅ **All Future Sections**
   - Any component using `bg-gradient-hero`, `text-brand-indigo`, etc.
   - All Tailwind classes referencing brand colors

## 📋 Complete Color Reference

### Where Each Color is Used

#### `--brand-primary` (Indigo)
- Navigation links hover state
- Primary text accents
- Icon colors
- Logo primary color
- Link underlines

#### `--brand-primary-dark` (Dark Indigo)
- Button hover states
- Active link states
- Strong emphasis text

#### `--brand-primary-light` (Light Indigo)
- Subtle accents in dark mode
- Footer link hovers
- Icon highlights

#### `--brand-secondary` (Emerald)
- Success indicators
- Revenue/money displays
- "Growth" badges
- Checkmark icons
- Positive metrics

#### `--brand-secondary-dark` (Dark Emerald)
- Pricing section gradients
- Hover states on success elements
- Strong call-to-action backgrounds

#### `--brand-accent-gold` (Gold)
- "We're hiring!" badges
- Premium feature indicators
- Ethiopian cultural elements
- Special announcements

#### `--brand-accent-teal` (Teal)
- Tertiary accents
- Alternative icon colors
- Decorative elements

#### `--gradient-hero-start/end`
- Hero background gradient
- Primary CTA buttons
- Logo backgrounds
- Section dividers
- Card hover effects

#### `--gradient-feature-start/mid/end`
- Feature section highlights
- Animated text gradients
- Premium tier badges
- Special card backgrounds

## 🎨 Popular Color Schemes

### Option 1: Blue & Orange (Modern SaaS)
```css
--brand-primary: #3B82F6;        /* Blue */
--brand-primary-dark: #2563EB;
--brand-primary-light: #60A5FA;
--brand-secondary: #F97316;      /* Orange */
--brand-secondary-dark: #EA580C;
--gradient-hero-start: #3B82F6;
--gradient-hero-end: #8B5CF6;
```

### Option 2: Purple & Pink (Creative)
```css
--brand-primary: #8B5CF6;        /* Purple */
--brand-primary-dark: #7C3AED;
--brand-primary-light: #A78BFA;
--brand-secondary: #EC4899;      /* Pink */
--brand-secondary-dark: #DB2777;
--gradient-hero-start: #8B5CF6;
--gradient-hero-end: #EC4899;
```

### Option 3: Teal & Cyan (Tech)
```css
--brand-primary: #14B8A6;        /* Teal */
--brand-primary-dark: #0D9488;
--brand-primary-light: #2DD4BF;
--brand-secondary: #06B6D4;      /* Cyan */
--brand-secondary-dark: #0891B2;
--gradient-hero-start: #14B8A6;
--gradient-hero-end: #06B6D4;
```

### Option 4: Red & Orange (Bold)
```css
--brand-primary: #EF4444;        /* Red */
--brand-primary-dark: #DC2626;
--brand-primary-light: #F87171;
--brand-secondary: #F97316;      /* Orange */
--brand-secondary-dark: #EA580C;
--gradient-hero-start: #EF4444;
--gradient-hero-end: #F97316;
```

### Option 5: Green & Lime (Fresh)
```css
--brand-primary: #22C55E;        /* Green */
--brand-primary-dark: #16A34A;
--brand-primary-light: #4ADE80;
--brand-secondary: #84CC16;      /* Lime */
--brand-secondary-dark: #65A30D;
--gradient-hero-start: #22C55E;
--gradient-hero-end: #84CC16;
```

## 🚀 How to Apply Changes

### Step 1: Edit global.css
Open `frontend/src/global.css` and modify the color variables (lines 6-30).

### Step 2: Rebuild
```bash
cd frontend
npm run build
```

### Step 3: Clear Cache & Restart
```bash
cd /home/minte/projects/frappe-bench
bench --site [your-site] clear-cache
bench restart
```

### Step 4: View Changes
Refresh your browser - all colors will update automatically! 🎉

## 🎯 Pro Tips

### Tip 1: Use a Color Picker
Before changing colors, use a tool like:
- [Coolors.co](https://coolors.co/) - Generate color palettes
- [ColorSpace](https://mycolor.space/) - Create gradients
- [Realtime Colors](https://realtimecolors.com/) - Preview in real-time

### Tip 2: Maintain Contrast
Ensure accessibility by checking contrast ratios:
- Text should have at least 4.5:1 contrast ratio
- Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Tip 3: Test Both Themes
Remember to test your colors in both light and dark mode!

### Tip 4: Keep it Consistent
- Use `--brand-primary` for all primary actions
- Use `--brand-secondary` for success/money indicators
- Use `--gradient-hero` for primary gradients

### Tip 5: Brand Alignment
Choose colors that reflect:
- Your brand identity
- Ethiopian cultural context (consider using gold/green/red from flag)
- Your target audience expectations

## 🐛 Troubleshooting

### Colors not updating?
1. Did you rebuild? `npm run build`
2. Did you clear cache? `bench clear-cache`
3. Did you hard refresh browser? `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)

### Gradient looks wrong?
- Check that gradient variables use hex colors (e.g., `#667eea`)
- Ensure no typos in variable names
- Verify the gradient definition in Tailwind config references correct variables

### Some elements didn't change?
- Some elements may use hardcoded colors (we'll migrate these)
- Check if the element uses a different color variable
- Submit an issue and we'll update it

## 📚 Color Naming Convention

All color variables follow this pattern:
```
--brand-[color]-[variant]
--gradient-[section]-[position]
```

Examples:
- `--brand-primary` (main color)
- `--brand-primary-dark` (darker variant)
- `--brand-primary-light` (lighter variant)
- `--gradient-hero-start` (gradient start color)
- `--gradient-hero-end` (gradient end color)

## 🎨 Ethiopian-Themed Color Suggestion

Want to emphasize Ethiopian heritage? Try these colors inspired by the Ethiopian flag:

```css
/* Ethiopian Flag Colors */
--brand-primary: #22C55E;        /* Green (fertility of the land) */
--brand-primary-dark: #16A34A;
--brand-primary-light: #4ADE80;
--brand-secondary: #FBBF24;      /* Yellow/Gold (religious freedom) */
--brand-secondary-dark: #F59E0B;
--brand-accent-gold: #FBBF24;    /* Gold accent */
--brand-accent-teal: #EF4444;    /* Red (blood of patriots) */
--gradient-hero-start: #22C55E;  /* Green to Gold gradient */
--gradient-hero-end: #FBBF24;
```

## 📞 Need Help?

If you need assistance with color customization:
1. Check this guide first
2. Test with one of the pre-made color schemes above
3. Reach out with your preferred colors and we'll help configure them

---

**Remember**: All colors change from **ONE FILE** - `frontend/src/global.css` (lines 6-30) ✨

Happy customizing! 🎨

