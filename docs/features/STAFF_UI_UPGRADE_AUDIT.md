# Staff UI upgrade audit

This audit covers the signed-in staff, owner and administrator pages of the Appointment React app. It records the problems found before the upgrade, a component inventory, the plan, and the result per page.

## Scope and method

Routes: `/home`, `/workspaces`, `/onboarding`, `/no-access`, `/calendar`, `/reception`, `/analytics`, `/settings` with every sub-route, and `/admin/dashboard`.

Personas (synthetic demo data, anchor date 2026-09-23):

| Persona | User | Role in session |
|---|---|---|
| Owner | `bloom.owner@example.test` | Owner, Bole Bloom Hair Studio |
| Manager | `bloom.manager@example.test` | Manager |
| Provider | `bloom.provider1@example.test` | Provider |
| Receptionist | `bloom.reception@example.test` | Receptionist |
| Multi-business | `multi.manager@example.test` | Receptionist at Bloom, Manager at Tena Family Clinic |
| Solo owner | `selam.owner@example.test` | Owner |
| System administrator | `Administrator` | Administrator state |

The persona `demo.unassigned@example.test` is disabled on this site, so `/no-access` was checked in code only. We did not enable the user.

Every page ran through the Agent Plane runner at 1440×900 and 390×844, in the light and dark color schemes. The manifests are in `qa/manifests/staff-ui/`. The screenshots are in `qa/evidence/staff-ui-v1/before/` and `qa/evidence/staff-ui-v1/after/`.

We measured horizontal overflow from the width of each full-page mobile screenshot. A width above 390 px means the page scrolls sideways.

## UX problems before the upgrade

### Navigation

- There was no shared app frame. `/home`, `/analytics`, `/reception`, `/calendar`, `/settings/business` and `/settings/team` used `AppTopNav`. The other settings pages, `/admin/dashboard` and `/workspaces` had their own headers with a back button and no way to reach other areas.
- On mobile, the top navigation was a horizontal strip. The Settings link was cut off at 390 px.
- A second theme toggle floated in the corner on pages without `AppTopNav`, and `/reception` and `/calendar` had a third one in their page headers.
- The settings hub showed "Business booking setup" and "Team Management" to providers. The route guard then sent them away.
- Providers had no navigation link to their own availability and profile pages.
- There was no search, no breadcrumb, and no user menu. Sign out was an unlabeled icon.

### Information hierarchy

- `/home` opened with four generic link tiles, then the full analytics report. It did not show the day's appointments or setup progress.
- The analytics report used nine equal KPI cards in three rows. The financial cards and the rate cards had the same weight as the daily counts.
- `/settings/business` put the "Create a business" form above the existing booking pages, so established owners saw a blank form first.
- `/reception` stacked four header bands (insight brief, scope line, desk header, stat tiles, filters) before the calendar started.

### Empty, loading and error states

- Most pages showed a centered spinner or the text "Loading…". There were no skeletons.
- Error handling varied: some pages had a retry, some showed "Access Denied" for every error, and some showed nothing.
- The reception day view showed "No appointments scheduled" over the grid without a link to the next booking day in the same place.

### Forms

- The availability page mixed three scope levels, templates and a seven-day editor in one 1,196-line component, with two Save buttons.
- Settings forms had no sticky save bar and no unsaved-change state.
- Several pages used `window.confirm()` and `alert()` for destructive actions and errors.

### Mobile layout

Pages that scrolled sideways at 390 px:

| Page | Width at 390 px |
|---|---|
| `/reception` (all roles) | 576 px |
| `/settings/manage` | 530 px |
| `/settings/availability` (owner) | 519 px |
| `/calendar` | 481 px |
| `/settings/profile` (provider) | 459 px |
| `/settings/profile` (owner) | 431 px |
| `/settings/availability` (provider) | 395 px |

The month grid on `/calendar` squeezed event chips into unreadable one-letter boxes on a phone.

### Accessibility

- Custom dropdowns on `/reception` were `div` menus with no keyboard support and hard-coded dark colors.
- Hand-rolled modals had no focus trap, no Escape handling in some cases, and no dialog role.
- Icon-only buttons often had no accessible name.
- Several filters and selects had no visible or programmatic label.
- Status was often shown by color alone.

### Consistency

- About 128 legacy CSS variables (`--bg-primary`, `--text-primary`, …) lived beside the shadcn tokens. Pages mixed inline `style={{ color: 'var(--…)' }}`, Tailwind palette classes (`gray-*`, `violet-*`) and shadcn tokens.
- Buttons came in many styles: gradients, glows, `motion.button` scale effects, and the shadcn `Button`.
- Headings, card radii and spacing differed from page to page. Some pages used ambient glow blobs behind the content.

## Component inventory

Counts are for the in-scope staff paths: `pages/{home,workspaces,onboarding,no-access,calendar,reception,analytics,settings,admin}`, `components/{layout,workspace,analytics}`, and the new shell and state components. "Before" is `HEAD`. "After" is the working tree after the upgrade.

Live code excludes the unreachable legacy onboarding wizard (`pages/home/components`, `pages/home/sections`, `CreateAppointmentGroupModal`, `ShareLinkModal`). No route renders these files.

| Pattern (occurrences, live code) | Before | After | What remains |
|---|---|---|---|
| `fixed inset-0` hand-rolled overlay | 23 | 1 | Public assistant landing menu (`components/layout/Navigation.tsx`) |
| raw `<select>` | 37 | 0 | |
| raw `<input>` | 31 | 2 | Native checkboxes that QA reads with `:checked` (team location scope, business operating days) |
| raw `<button>` | 33 | 9 | Composite calendar cells (event rows, day cells, "+N more"), the top-bar search trigger, and the public landing menu |
| raw `<textarea>` | 11 | 0 | |
| `motion.button` | 178 | 0 | |
| inline `var(--bg/text/border/accent-*)` colors | 1,356 | 70 | Public assistant landing `Navigation` and `Footer` only |
| `bg-gradient-*` | 112 | 0 | |
| pages using `AppTopNav` | 6 | 0 | `AppTopNav` is deleted |


| Raw element | shadcn equivalent now used |
|---|---|
| `fixed inset-0` overlay | `Dialog`, `AlertDialog`, `Sheet` |
| `<select>` | Radix `Select`. `NativeSelect` where a QA manifest drives a real select or the platform picker is better. |
| `<input>` / `<textarea>` | `Input`, `Textarea`. Native checkboxes stay where QA reads `:checked`. |
| `<button>`, `motion.button` | `Button`, `ToggleGroup`, `DropdownMenu` items |
| custom dropdown menus | `DropdownMenu`, `Select`, `Command` |
| inline `var(--…)` colors, gradients | semantic Tailwind tokens (`bg-card`, `text-muted-foreground`, `bg-primary`, …) |
| spinners | `PageSkeleton`, `ListSkeleton`, `Bone` |

New primitives in `frontend/src/components/<name>/index.tsx`: `alert`, `alert-dialog`, `badge`, `breadcrumb`, `dropdown-menu`, `hover-card`, `native-select`, `progress`, `scroll-area`, `separator`, `sheet`, `sidebar`, `table`, `tabs`, `toggle`, `toggle-group`.

New app components: `staff-shell` (frame, sidebar, workspace switcher, command palette, user menu, page header), `settings-layout` (settings page, section, sticky save bar, field hint), `states` (empty, error, skeletons), `status-badge`.

## Plan

| Priority | Item | Status |
|---|---|---|
| P0 | One token system for light and dark, scoped to staff pages | Done |
| P0 | One staff shell with role-aware navigation, switcher, search, user menu | Done |
| P0 | Remove horizontal scroll at 390 px | Done, see results |
| P0 | Replace hand-rolled modals with Dialog, AlertDialog, Sheet | Done |
| P1 | `/home` as a "today" view | Done |
| P1 | Reception desk: one toolbar, accessible filters, split calendar | Done |
| P1 | Calendar readability on desktop and phone | Done |
| P1 | Analytics layout and chart consistency | Done |
| P1 | Settings grouped, sticky save bars, validation messages | Done |
| P1 | Team roles and scope, revoke confirmation | Done |
| P2 | Delete the unreachable legacy onboarding wizard in `pages/home/{components,sections}` | Not done, out of scope |
| P2 | Amharic date formats (date-fns locale) | Not done |
| P2 | Keyboard drag for reception appointments | Not done |

## Design decisions

- The staff token set is active only when `html[data-surface="staff"]` is present. `StaffShell` sets it. The landing page, auth pages and tenant sites keep their palettes, and Radix portals inherit the staff tokens.
- `ThemeProvider` still writes the legacy variables inline on `<html>`. The staff aliases for those names are on `body`, so they win for all rendered content.
- Navigation visibility follows the old `AppTopNav` rules. One addition: Settings appears for providers, because the route guard already lets them open their profile, availability and calendar pages. Settings pages that need business authority (public website, structure overview) stay hidden from staff without manager authority.
- The theme button keeps `data-qa="topnav-theme"` and the light → dark → system cycle that existing manifests use.

## Result per page

| Page | Before | After |
|---|---|---|
| Shell (all pages) | Per-page headers, a horizontal link strip, up to three theme toggles, icon-only sign out | One sidebar with role-aware items, a workspace switcher for multi-business users, a ⌘K command palette, a user menu with theme and sign out, breadcrumbs on settings pages, a mobile navigation sheet, and a skip link |
| `/home` | Four generic link tiles above the full analytics report | Greeting, role and date, today's appointments with the next booking day, setup progress (4 steps from existing endpoints), quick actions filtered by access, then the analytics summary |
| `/reception` | Five stacked header bands, `div` dropdowns, 576 px wide on a phone | One toolbar card: date navigation, `ToggleGroup` for view and slot size, accessible `Select` filters, inline counters and the scope line. Calendar split into layout, drag and column modules. Dialogs for create, edit, walk-in and overflow. 390 px on a phone. |
| `/calendar` | 1,035-line page, own header, month chips unreadable on a phone, 481 px wide | Split into 17 modules. Calm month grid, a phone month with dots and an agenda for the selected day, a shared week/day time grid, a list view, and a detail dialog |
| `/analytics` | Nine equal KPI cards, gradient bars, native period select | Page header with export and period, eight compact KPI tiles in two rows, rate cards with meters, one-hue columns with a hover readout and a table view, ranked bars, and a heatmap with a legend |
| `/settings` | Every category for every role, including manager-only pages for providers | Grouped by Business, People and Personal, filtered by the route guard and manager authority |
| `/settings/business` | Create form first, then near-identical booking rows | Booking pages first, grouped by business with status badges and actions. The create form follows in its own section. |
| `/settings/team` | Revoke without confirmation | Member list with avatars, role badges and scope. Revoke asks for confirmation in an `AlertDialog`. The assign form explains roles and scope. |
| `/settings/availability` | 1,196-line page, two Save buttons, 519 px wide on a phone | Split into hooks, lib and sections. Scope tabs, collapsible templates, stacked day rows, one sticky Save bar, and inline "outside parent hours" hints |
| `/settings/services`, `services/:id` | Card list, `confirm()` delete | Table on desktop and cards on mobile, a row action menu, `AlertDialog` delete, and an edit page with breadcrumbs, sections and a sticky Save bar |
| `/settings/location`, `profile`, `calendar` | Own headers, `alert()`/`confirm()`, profile 431–459 px on a phone | Settings frame, dialogs for create and delete, a profile form with a sticky Save bar, and calendar provider cards |
| `/settings/manage` | 530 px wide on a phone, `confirm()` delete | Tabs for the two tree views, search, disclosure buttons with `aria-expanded`, and dialogs for create, edit and delete |
| `/settings/public-experience` | Own frame | Settings frame only. The embedded editor in `src/public-experience/**` is unchanged. |
| `/admin/dashboard` | Own header, no navigation | KPI tiles, tabs for overview, recent activity and Desk links, and a table in its own scroll container |
| `/workspaces`, `/onboarding`, `/no-access` | Bare pages with a floating theme toggle | Shell frame, business cards with one "Open" button each, a sectioned onboarding form, and a clear no-access state |

## Verification

Static checks, run from `frontend/`:

- `npx tsc -p tsconfig.app.json --noEmit`: 181 errors in the app, down from 271. None are in the 203 changed or added files. No file has more errors than before.
- `npx eslint` on every changed file: 0 errors, 8 `react-refresh/only-export-components` warnings in shadcn-style files.
- `npm run -s test:dom`: passes.

Browser checks through the Agent Plane runner. Runs from BQA-2026-00162 on use `fixture_scope="rich_demo"` (see "Known limitations"). "Final" runs happened after the last fixes, and the stored after screenshots come from the newest run of each scenario.

| Manifest | Before run | After run | After result |
|---|---|---|---|
| `staff-ui/admin-light` | BQA-2026-00149 | BQA-2026-00158, final BQA-2026-00162 | Passed |
| `staff-ui/admin-dark` | BQA-2026-00150 | BQA-2026-00157, final BQA-2026-00192 | Passed |
| `staff-ui/manager-light` | BQA-2026-00139 | BQA-2026-00163, final BQA-2026-00193 | Passed |
| `staff-ui/manager-dark` | BQA-2026-00140 | BQA-2026-00164, final BQA-2026-00194 | Passed |
| `staff-ui/multi-light` | BQA-2026-00145 | BQA-2026-00165 | Passed |
| `staff-ui/multi-dark` | BQA-2026-00146 | BQA-2026-00166 | Passed |
| `staff-ui/owner-light` | BQA-2026-00137 | BQA-2026-00167, re-run BQA-2026-00189 | First run: `/settings/business` timed out while Vite re-optimized dependencies. The re-run of business, availability, structure and team passed. |
| `staff-ui/owner-dark` | BQA-2026-00138 | BQA-2026-00168, re-run BQA-2026-00190 | Passed |
| `staff-ui/provider-light` | BQA-2026-00141 | BQA-2026-00169, re-run BQA-2026-00191 | Passed |
| `staff-ui/provider-dark` | BQA-2026-00142 | BQA-2026-00170, final BQA-2026-00195 | Passed |
| `staff-ui/reception-light` | BQA-2026-00143 | BQA-2026-00171 | Passed |
| `staff-ui/reception-dark` | BQA-2026-00144 | BQA-2026-00172 | Passed |
| `staff-ui/solo-light` | BQA-2026-00147 | BQA-2026-00173 | Passed |
| `staff-ui/solo-dark` | BQA-2026-00148 | BQA-2026-00174 | Passed |
| `staff-ui/shell-interactions` | — | BQA-2026-00175 | Passed |
| `staff-ui/dialogs` | — | BQA-2026-00176 | Passed |

Regression runs of the existing role manifests, after the upgrade: rich-demo `owner` BQA-2026-00177, `manager` 00178, `provider` 00179, `reception` 00180, `multi` 00181, `multi-switch` 00182, `solo` 00183, `clinic` 00184. analytics-operations `multi` 00185, `owner` 00186, `provider` 00187, `reception` 00188. All 12 passed.

Console and network errors:

- Staff-ui after runs: 0 application console errors. The only non-warning entries are 4 `400 Bad Request` responses from `/socket.io/?EIO=4&transport=polling` in `owner-light`. The before run `owner-light` had the same 4. Regression run 00188 had 1 of these. The realtime code did not change.
- Staff-ui after runs log a framer-motion warning, "You have Reduced Motion enabled on your device", because the manifests emulate `prefers-reduced-motion` and the shell now respects it. It is a development-build warning, not an error.
- Network errors other than the socket.io polling responses: 0.

Mobile width at 390 px: all 66 after screenshots are 390 px wide. Seven pages were wider before (see "Mobile layout").

## Behavior changes

API method names, request payloads, permissions, routes, realtime behavior and all existing `data-qa` values are unchanged. These interface changes are intentional:

- Destructive actions ask first. Revoking team access, deleting a service, location, policy or structure item, removing or unlinking a provider, and signing out from the profile page now use an `AlertDialog`. Before, some of these ran at once and others used `window.confirm()`. The API call after confirmation is the same.
- `alert()` messages are now `sonner` toasts with the same text. Some successful actions also show a success toast.
- Settings appears in the navigation for providers. The route guard already allowed their settings pages.
- The profile form is always editable, with a sticky Save bar that tracks unsaved changes. The old separate edit mode is gone.
- The edit-service page now needs a name and a duration of at least 5 minutes before it saves. The create dialog already had these rules. Before, the edit page could send `NaN`.
- In the structure overview, the "edit location" form now sends the address fields the user typed. Before, the form wrote to a field that was never sent, so address edits were lost. The payload keys are the same.
- The provider calendar lost two buttons that did nothing ("New Booking" had no handler and "Filters" toggled unused state).
- The availability page shows server times such as `9:00:00` as `09:00`. Saving still sends `HH:MM:SS`.
- Stray `0` characters no longer render beside provider names when `is_primary` is `0`.

## Known limitations

- The Agent Plane runner's default `legacy` fixture scope failed during this work. It enqueues background jobs into the Redis queue `rq:queue:home-minte-projects-training-apps:default`, but the stack's worker listens on a queue named after the state bench path. The 550 orphaned jobs (`delete_dynamic_links`, `create_contact`) exceed Frappe's queue limit, so new enqueues raise `QueueOverloaded`. One aborted legacy run left the fixture set `QA-BROWSER-2c2b8b` (a user and an organization). `qa_fixtures._cleanup_stale()` removes it on the next successful legacy run. Nothing was deleted by hand.
- `demo.unassigned@example.test` is disabled, so `/no-access` has no browser evidence.
- The business page shows one row per offering. The `workspace.overview` API returns no location name, so rows for the same service at different locations look the same.
- Updating an existing policy may fail: the page sends the display name as `policy_name`, and the backend loads the document by that value. The payload was kept as it was.
- Dates use English month and weekday names. There is no Amharic date-fns locale.
- Reception appointments can be dragged with a pointer only, as before.
- The shared `Button` still hard-codes a blue focus ring for public pages. Staff pages map it to the ring token in `global.css`. The shared native `Checkbox` keeps its gray and indigo defaults, and staff pages override them with classes.
- The legacy onboarding wizard in `pages/home/{components,sections}` and two modals is unreachable and was not restyled. Deleting it is a separate change.
- In the Vite dev server, moving a page from `page.tsx` to `page/index.tsx` needs a touch of `src/route.tsx`, because Vite caches the old resolved path. A production build is not affected.

## Evidence

- `qa/evidence/staff-ui-v1/before/`: 132 screenshots, one per role, route, viewport and theme.
- `qa/evidence/staff-ui-v1/after/`: the same 132 names after the upgrade.
- `qa/evidence/staff-ui-v1/interactions/`: workspace switcher, command palette, dark theme, mobile navigation sheet, and the new-appointment, walk-in, new-service and revoke dialogs.


## Round 2: business identity, configurable dashboards, tighter headers

### Business identity in the sidebar

The sidebar no longer shows the app name. Its header is the business switcher: the business logo, the business name and the user's role. Long names end with an ellipsis, and the full name shows on hover. When a business has no logo, the header shows its initials.

The logo comes from a new `logo` field on each workspace in `appointment.scheduler.membership.context`. `workspace_logo()` returns `Organization.logo` when it is set. Otherwise it returns the compact (or primary) logo of the active Brand Profile of the business, then of the user's provider. The field is additive, so existing callers are unchanged. `appointment/tests/test_workspace_logo.py` covers the three cases.

### Configurable Overview and Insights

Overview (`/home`) and Insights (`/analytics`) are now widget dashboards built from one catalog of 30 widgets:

| Category | Widgets |
|---|---|
| Today | Today's appointments, confirmed today, next seven days, active bookings |
| Booking volume | All bookings, completed, cancelled, no-show count, customers, booking activity, cancellations and no-shows, booking outcomes, most booked services |
| Performance | Booked time, returning customer share, bookings per day, no-show rate, provider utilization, cancellation rate, this period vs previous, busiest weekdays, busiest hours, popular appointment times, how rates are calculated |
| Revenue (owners and managers) | Booking value at catalog prices, payments recorded |
| Team and locations | Provider activity, location activity |
| Setup and shortcuts | Setup progress (owners and managers), quick actions |

Every widget uses data that the existing endpoints already return (`analytics.overview`, `desk.get_desk_appointments`, `workspace.overview`, `membership.members`). No endpoint was added for widgets.

How it works:

1. Select **Customize**. Each card shows a drag handle, a resize corner and a menu.
2. Drag a card to move it, or use the menu to move it earlier or later.
3. Drag the bottom-right corner to resize, or pick a width from the menu.
4. Select **Add widget** to open the catalog. It is grouped by category, searchable, and lists only widgets the role may see.
5. Select **Save layout**. **Reset to default** and **Cancel** are also available.

Each card has an ⓘ button with a plain-language explanation. The **Guide** button opens a panel that explains the page, the customize steps and every card on it.

Layouts save to the user's account per business and page through Frappe's `frappe.model.utils.user_settings.save`/`get`. Each layout is one top-level key (`"<organization>:<page>"`), so saves never overwrite each other. A layout equal to the default saves as "use the default", so later default improvements still reach the user. The reporting period is remembered the same way.

On screens narrower than 768 px, cards stack in reading order. Small headline cards pair up two per row. Dragging is off on phones, and the card menu moves, resizes and removes cards.

The grid uses `react-grid-layout` 2.2.4 (MIT), the only new dependency in this round. It gives real drag-to-move and drag-to-resize with a 12-column grid. Its placeholder and handles use the staff tokens in both themes.

Existing QA contracts are kept on the new widgets: `workspace-analytics` (grid container), `analytics-trend` (booking activity), `analytics-no-show`, `analytics-utilization`, `analytics-period` (native select) and `analytics-export`. The texts "Weekly bookings", "No Show ÷", "Booking value at catalog prices" and "Reception insights" still render. `tests/analytics-dashboard.test.mjs` now reads the dashboard frame, the metric widgets and the registry, with the same assertions.

### Tighter page tops

- The top bar is 48 px instead of 56 px.
- Page padding above the title is 16–20 px instead of 24–32 px.
- Page titles are 20–24 px instead of 24–28 px, with less space between the eyebrow, title and description.
- Header actions sit on the title row from 1024 px up.
- The reception toolbar card is more compact.

On Overview at 1440×900, the four headline numbers, today's appointments and quick actions show without scrolling.

### Round 2 verification

- Frappe: `bench --site <site> run-tests --module appointment.tests.test_workspace_logo`, with 3 tests passing.
- Frontend: `tsc` shows no errors in changed files, `eslint` 0 errors, and `npm run -s test:dom` passes.
- Translations: 1,032 staff strings in both catalogs, synced to the site with the translation importer.
- Browser (`fixture_scope="rich_demo"`): all passed. Dashboard interactions BQA-2026-00198 (explain, guide, customize, add, save, reload shows the added widget, reset, save) and 00199 (dark). Role sweep 00200–00213, shell 00214, dialogs 00215.
- Regressions: rich-demo 00216–00223 and analytics-operations 00224–00227 all passed.
- Console: 0 application errors. The only other entries are the same socket.io polling `400` responses in `owner-light` and the framer-motion reduced-motion warning.
- Mobile: all 69 phone screenshots are 390 px wide.

Evidence is in `qa/evidence/staff-ui-v2/`: `pages/` (the 132 route screenshots after round 2), `dashboard/` (overview, insights, info popover, guide, customize, add panel, after-reload, phone and dark views) and `interactions/`.

### Round 2 limitations

- In this development stack the scheduler is paused, so saved layouts stay in the Redis user-settings cache and reach the `__UserSettings` table when `sync_user_settings` next runs. A cache flush before that loses unsynced layouts. Production runs the scheduler.
- Dragging and drag-to-resize need a pointer. Keyboard and touch users move and resize cards with the card menu, which offers preset widths instead of free resizing.
- None of the demo businesses have an `Organization.logo`, so their logos come from Brand Profiles.

## Round 3: design templates, recipes and branding review

### Where designs live

- Public website designs: **Settings › Public website** (`/settings/public-experience`). There are five certified recipes. Each recipe is paired with its own template package in `frontend/src/public-experience/templates/<name>/`: Selam Movement, Bloom Hair, Meron Atelier, Abugida Language and Tena Clinic. Each recipe has a live showcase site: `/selam-studio`, `/bloom-studio`, `/meron-studio`, `/abugida-studio` and `/tena-studio`, each with a `/book` page.
- Staff app branding: there are no templates or recipes. Commit `18f301e` removed per-business theming from the staff app on purpose, so the staff app uses the platform palette. The only business identity in the staff app is the logo and name in the sidebar (Round 2).

### Problems found

| Problem | Fix |
|---|---|
| The design panel always said "Quiet Trust · Warm editorial … designed for clinics", whatever recipe was selected | Replaced with a panel for the selected recipe: preview image, mood, audience, languages and required sections |
| No way to see a design before choosing it. Recipes were a dropdown only. | Added a design gallery: a preview image for each recipe, a "Current" marker, "Use this design" and "View live example" (opens the showcase site). It is a grid on wide screens and a swipe strip on phones. |
| Recipe descriptions are the same boilerplate for every recipe | Cards lead with the recipe's audience ("Natural hair studios and beauty practices"). The manifest text is unchanged because it is part of the recipe contract. |
| Internal words: "Compile design", "Publish brand revision", "Experience release", "immutable release", revision hashes | Plain steps: 1 Choose a design, 2 Adjust it to your brand, 3 Save and check ("Check design", "Publish brand"), 4 Publish your website. Revision hashes are hidden. |
| Readiness showed raw keys, such as `brand_published: not ready` | A checklist with a label and status per item. The custom domain is marked optional. |
| No link to the business's own live site or booking page | "Open your live website" and "Open booking page" appear once the site is published |
| Imagery choices showed role keys | Readable names |
| Bloom (phone): the "Expert care. A warmer you." caption overlapped the services heading | The caption flows under the heading below 800 px |
| Tena and Abugida (phone): the landing page scrolled sideways by 6 px and 1 px | The hero grid column is `minmax(0,1fr)`, and the heading scales with the viewport below 800 px |

`appointment.public_experience.api.list_curated_recipes` now adds a `showcase` object to each recipe (`heroAsset`, `logoAsset`, `title`, `path`). The data comes from the versioned showcase catalog through `showcase_catalog.recipe_showcases()`. `path` is set only when that showcase site is published. The gallery shows only platform-owned showcase sites, never other tenants' sites. `appointment/tests/test_showcase_catalog.py` covers the helper.

The editor keeps every existing `data-qa` and the `section`/`select` order that `qa/validate-public-experience.cjs` expects.

Tena also had a primary-button problem on its landing and booking pages: "Choose a consultation time" rendered as plain text, but the design reference (`docs/design-references/public-experience/v1/quiet-trust/full-page-01.webp`) shows a filled button. Only the nav button had the fill. `.tena-button` is now filled in both themes, and the secondary "Meet your care team" link is underlined as in the reference. On phones, the "People / conversations / better days" caption now flows under the buttons instead of overlapping them.

The template fixes are CSS-only and live in each template's own stylesheet (`bloom.css`, `tena.css`, `abugida.css`), so the packages stay independent. The phone fixes apply below 800 px only.

### Round 3 verification

- Frappe: `test_showcase_catalog` (3 tests) and `test_public_experience_contracts` (7 tests) pass.
- Frontend: no `tsc` errors and no `eslint` errors in changed files. `npm run -s test:dom` passes, including "five independent, fail-closed public template packages".
- The dev stack was restarted with `frappe-worktree stop` and `frappe-worktree up --no-seed` to load the new API code. The site and database were kept.
- Browser, design gallery: BQA-2026-00234 (gallery, switch to Tena, readiness checklist) and 00235 (dark), both passed with 0 errors.
- Browser, public sites after the fixes: `final-visual` BQA-2026-00242 and `final-scheduler` 00243 (landing, `/book` and scheduler for all five businesses at 1440 and 390 px), and Tena light and dark 00240 and 00241. All passed with 0 console and 0 network errors. Every phone capture is 390 px wide. Before the fixes, Tena was 396 px and Abugida 391 px.
- `rich-demo/public-dark.yaml` fails (BQA-2026-00237) because it waits for `[data-qa="booking-service"]` on landing pages. No template renders that attribute, including at `HEAD`, and the manifest predates the template rewrite. The failure predates this work, and the manifest needs an update.

Evidence: `qa/evidence/staff-ui-v2/design-gallery/` and `qa/evidence/staff-ui-v2/public-sites/`.

### Round 3 limitations

- The draft preview API (`preview_experience`) creates a signed token, but no public route consumes it. Owners cannot preview unpublished design changes on their own content. Wiring it touches the public renderer and needs its own acceptance pass.
- Choosing a design and saving does not change the live site until the owner selects **Publish brand** and then **Publish website**. The steps now say this.
