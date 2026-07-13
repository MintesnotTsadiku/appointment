# Dynamic Brand Colors (Landing Page)

Guide for how the landing page brand/theme colors are stored in Frappe, exposed by API, and applied as CSS variables in the frontend. Use this as a template to replicate the same dynamic color system in another Frappe app.

---

## Backend (Landing Page Settings Doctype)

- **Fields** (singleton): brand colors (`brand_primary_color`, `brand_secondary_color`, `brand_accent_gold`, `brand_accent_teal`) plus full theme fields for dark/light backgrounds, text, borders/glows (rgba), status chips, gradients, etc. Colors use `Color` fieldtype when hex is enough; rgba strings use `Data`. Logos use `Attach Image`.
- **Definition**: `frappe_appointment/scheduler/doctype/landing_page_settings/landing_page_settings.json`
- **Defaults**: `setup_theme_colors.setup_default_colors()` writes a canonical palette (hex + rgba + shadows) into the singleton.
- **Presets**: `COLOR_PRESETS` in `landing_page_settings.py` and `apply_color_preset` let admins one-click apply curated palettes.

## Backend API

- Public endpoint: `/api/method/frappe_appointment.scheduler.api.theme.get_theme_colors` (`allow_guest=True`).
- Returns structured colors with safe fallbacks:
  - `dark` / `light`: background, text, border, glow (dark), shadow (light)
  - `accent`: primary, secondary, success, warning (default/hover/light)
  - `status`: per-status text + background (rgba)
  - `gradient`: primary/secondary/success from/to
  - `brand`: primary/secondary/gold/teal
- Defaults mirror the setup script; if the singleton is missing/empty, the API still returns a complete palette.

## Frontend consumption

- **Fetch**: `useThemeColors` calls the API once on load; falls back to `defaultThemeColors` so the UI never breaks.
- **Apply**: `applyThemeColors(colors, mode)` writes the structured palette into CSS custom properties on `document.documentElement`:
  - Backgrounds, text, borders, accents, status chips, gradients, brand colors
  - Mode-specific extras: glows for dark, shadows for light
- **Provider**: `ThemeProvider` resolves user/system theme, then calls `applyThemeColors` whenever theme or colors change.
- **Landing page brand overrides**: `useApplyBrandColors` (in `landingPageSettings.ts`) runs inside `LandingPageSettingsProvider` to set high-level brand vars and generate variants from the selected primary/secondary:
  - `--brand-primary`, `--brand-primary-dark` (15% darker), `--brand-primary-light` (20% lighter)
  - Hero/feature gradients derived from the primary
  - `--brand-secondary` and darker hover variant; gold/teal passed through
- **CSS vars used globally**: `src/global.css` defines light-mode defaults; JS overwrites them post-fetch so all components update without rebuild.

## Color code formats

- Hex (`#rrggbb`) for most brand/background/accent values.
- RGBA strings for borders/glows/status backgrounds to control opacity.
- Shadows kept as CSS box-shadow strings.

## Lifecycle when an admin changes a color

1) Admin updates a `Color`/`Data` field on `Landing Page Settings`.  
2) Singleton saves the value (presets/defaults can also be applied).  
3) Frontend loads and calls the theme API; latest values are returned.  
4) `ThemeProvider` + `useApplyBrandColors` write CSS variables on `:root`.  
5) Components that rely on the CSS vars reflect the change instantly (hero gradients, buttons, badges, backgrounds, etc.).

## How to replicate in another Frappe app

1) Create a singleton Doctype with `Color` fields for brand + theme; use `Data` for rgba strings; add `Attach Image` for logos.  
2) Ship a setup script to populate defaults; optionally provide curated presets and an `apply_color_preset` method.  
3) Expose a whitelisted API that returns a structured palette with fallbacks.  
4) Frontend: fetch once on startup; keep a default palette as safety.  
5) Apply colors to `document.documentElement` as CSS custom properties; add mode-specific extras (glow/shadow).  
6) (Optional) Derive hover/light/dark variants in JS (`lightenColor`/`darkenColor`) instead of storing extra fields.  
7) Style components using only the CSS vars—never hard-code brand hex—so updates propagate automatically.

## Key code references

- Backend fields: `frappe_appointment/scheduler/doctype/landing_page_settings/landing_page_settings.json`
- Presets: `frappe_appointment/scheduler/doctype/landing_page_settings/landing_page_settings.py`
- Defaults script: `frappe_appointment/scheduler/setup_theme_colors.py`
- Theme API: `frappe_appointment/scheduler/api/theme.py`
- Frontend theme fetch/apply: `frontend/src/components/theme-provider/useThemeColors.ts`, `frontend/src/components/theme-provider/index.tsx`
- Landing page brand variants: `frontend/src/lib/landingPageSettings.ts` (`useApplyBrandColors`)
- CSS var consumers: `frontend/src/global.css`


