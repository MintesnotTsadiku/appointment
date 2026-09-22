# Roles, membership, onboarding, theme and time — implementation notes

Updated 2026-09-22 on `implement/owned-booking-slice`. This increment adds the
role-aware onboarding, manager-assigned business membership, scoped reception,
a consolidated theme system and polished time/time-zone controls on top of the
owned-booking foundation. It builds on
[the foundation handoff](owned-booking-handoff.md) and
[the runtime runbook](owned-booking-runtime.md); it is not a launch or beta
approval.

## 1. Product roles and permission matrix

Global capabilities (Frappe roles) are deliberately separate from
business-specific membership. A global role alone never grants access to a
business; an Active `Business Membership` (or the legacy owner/manager/provider
links) is also required.

| Product role | Global capability granted | Business scope source | Landing surface |
|---|---|---|---|
| Business owner | `Provider`, `Organization Manager` | `Organization.owner_user` | `/home` (business overview) |
| Business manager | `Organization Manager`, `Provider` | Active `Business Membership` role `Manager`, or legacy `Organization Manager` row | `/home` |
| Provider | `Provider` | Active `Provider.user` + active `Provider Organization`, or membership role `Provider` | `/calendar` |
| Receptionist | `Front Desk` | Active `Business Membership` role `Receptionist` (+ optional location/provider scope) | `/reception` |
| Customer / Guest | none | none (public booking) | public booking pages |
| System administrator | all | global | `/home` (administration) |

Permission matrix (enforcement is in APIs and record access, not only in
navigation):

| Capability | Owner | Manager | Provider | Receptionist | Foreign staff | Customer |
|---|---|---|---|---|---|---|
| Create/publish own business | yes | no | no | no | no | no |
| Assign/revoke team members | own business | own business | no | no | no | no |
| Read scoped appointments | all in business | all in business | own provider | membership scope | no | no |
| Reschedule/cancel scoped appointments | all in business | all in business | own provider | membership scope | no | no |
| Read config (service/location/provider) | yes | scoped read | scoped read | scoped read | no | public only |
| Write config | own business | own business | no | no | no | no |
| Receptionist landing | n/a | n/a | n/a | yes | no | no |

Deterministic multi-role behaviour: when one user holds several roles in the
same business, the landing surface follows `Owner > Manager > Receptionist >
Provider`. A manager membership is also granted the `Provider` capability so
managers can use the appointment surfaces; record access is still scoped by
membership.

## 2. Business membership and receptionist scope

New DocType `Business Membership` (`appointment/scheduler/doctype/`):

- `user`, `organization`, `membership_role` (`Owner`/`Manager`/`Provider`/
  `Receptionist`), `status` (`Invited`/`Active`/`Inactive`).
- `provider` optional provider scope.
- `locations` child table (`Membership Location`): empty means every location.
- `assigned_by` / `assigned_at` audit fields; `track_changes` enabled.

Manager-facing APIs (`appointment.scheduler.membership`):

- `context()` — server-resolved role/workspace state (also safe for guests).
- `select_workspace(organization)` / `clear_workspace()` — remembered workspace,
  revalidated on every request.
- `assign_member(organization, email, membership_role, provider, locations,
  full_name, password)` — local account assignment. Existing accounts are used;
  missing accounts are created with `send_welcome_email=0` and no external
  dispatch. The response states `delivery: local_assignment` and
  `email_sent: false`. Passwords are only set when explicitly supplied.
- `revoke_member(membership)` — sets `Inactive`; access is re-evaluated at
  request time.
- `members(organization)`, `directory(organization)`, `provider_options`,
  `location_options` — the assignment UI data.

Revoked memberships and disabled users: access is derived from Active
memberships and the User `enabled` flag on every call. Revoking a membership or
disabling an account immediately removes reads and writes; disabled accounts are
reported as `state: disabled` and receive `403` from staff APIs. Historical
bookings retain their recorded ownership and are not rewritten.

Legacy `Organization.managers`, `Provider.organizations`, `Provider.user` and
`Provider.organization` remain supported and are merged into the same resolver.

## 3. Login and onboarding routing rules

`appointment.scheduler.membership.context` resolves the authorized state:

| State | Meaning | Landing |
|---|---|---|
| `customer` | Guest | `/login` |
| `disabled` | signed-in but disabled | `/login` |
| `administrator` | System administrator | `/home` |
| `workspace` | exactly one usable business | role surface (`/home`, `/reception`, `/calendar`) |
| `selection` | multiple businesses | `/workspaces` |
| `owner_setup` | new signup or mid-onboarding owner | `/onboarding` |
| `no_assignment` | staff role but no active membership | `/no-access` |

Rules:

- `/login` calls `reload()` after sign-in and navigates to the resolved
  `landing`.
- A `redirect-to` destination is restored **only** when
  `isAllowedDestination` accepts it for the resolved state and role; otherwise
  the server landing is used. Only single-slash internal paths are accepted, so
  open redirects and protocol-relative URLs are rejected.
- Remembered workspace selections (`select_workspace`) live in User defaults and
  are revalidated against the current membership set on every `context()` call.
- Access is never inferred from URL parameters; `?organization=` is a request
  hint and is validated server-side. Mutating reassignment adds a fresh
  `expected_modified` guard on booking changes.
- Existing users need no reset: owner/manager/provider links are merged into the
  resolver, and first-time setup appears only for `owner_setup`.
- Setup permission boundary: `workspace.create` accepts a System User, a user
  with a staff capability, or a prospective owner who has recorded an onboarding
  type. Customer (Website User) accounts and unstarted signups are refused, so
  the setup surface never becomes customer access. The guided setup page records
  the onboarding type before creating the business.

Visible navigation: `AppTopNav` shows the active business, a workspace switcher
when more than one business is present, role-appropriate links, a
Light/Dark/System toggle and sign-out. It is mounted on the overview, reception,
settings, business setup and team pages.

## 4. Reception

`appointment.scheduler.api.desk.get_desk_appointments` now accepts `organization`
and returns `scope` (business, authorized organizations, receptionist flag,
location/provider scope), `timezone`, `unfiltered_count` and `next_date`.
Reception therefore distinguishes:

- loading, API error (with retry), no access, no assignment,
- no bookings on the selected date, and
- bookings present but filtered out (with a reset-filters action and a jump to
  the next booking date).

The active business, selected date, time zone and active filters are shown in a
scope bar. `get_locations_list`, `get_providers_list` and `get_services_list`
accept an optional `organization` and return display names.

Investigated empty-reception causes: business creation alone does not create
bookings; the prior screen defaulted to today while the demo booking was on the
next day and had no scope/empty/error distinction. The current screen resolves
that with the scope bar, `next_date` recovery and explicit states. Wrong
date/filter, missing membership, authorization failure and API failure are now
visually distinct. A receptionist remains scoped to their assigned
locations/providers; a booking outside scope is neither listed nor readable.

## 5. Theme and time-format behaviour

Theme:

- One `ThemeProvider` owns the `dark`/`light` class and the theme palette; it
  defaults to `System`, offers Light/Dark/System, persists an explicit choice
  under `vite-ui-theme`, and resolves the first paint from the actual
  `prefers-color-scheme` to avoid a flash.
- The Sonner toaster now reads the same provider, and the global `ModeToggle`
  cycles Light → Dark → System. Public booking pages continue to render their own
  toggle against the same provider.
- Remaining known overlap: `LandingPageSettings` still injects brand tokens for
  the marketing surface. It no longer competes for the theme class.

Time:

- `frontend/src/lib/time.ts` centralises clock-format conversion. Clock format
  (12-hour, 24-hour, Ethiopian local time) is kept separate from time zone.
- Ethiopian local time counts from 06:00 (06:00 → 12:00 ጠዋት) and labels the
  period (ሌሊት/ጠዋት/ከሰዓት/ምሽት). Switching format never changes the represented
  instant; canonical storage stays in the booking time zone.
- `TimeInput` has a keyboard-friendly text field and a popover with hour, minute
  and common-minute controls. It validates the selected 12-hour, 24-hour or
  Ethiopian format strictly, shows an inline error and blocks invalid form
  submissions. `TimeZoneSelect` is searchable with Addis Ababa first;
  `ClockFormatToggle` switches the display format. All three are used in
  business setup; `TimeInput`/`ClockFormatToggle` are used in the reschedule
  dialog.
- Backend `appointment.helpers.utils.format_ethiopian_time` is the canonical
  conversion and is covered by boundary tests (noon, midnight, date changes,
  23:59, 05:59). Overnight operating hours are not supported or implied.

## 6. Retained acceptance demo and cleanup

Provisioned by `appointment.tests.acceptance_demo` (kept separate from the
automated fixtures):

- Established business **Bole Bloom Studio** (locations `Bole Studio`, `Bole
  Annex Room`; providers; services `Hair & Scalp Consultation`, `Full Styling
  Session`), published.
- Second business **Kazanchis Dental Care** for isolation checks, published.
- Accounts: new owner, established owner, provider, receptionist scoped to Bole
  Studio, second-business owner, multi-business (receptionist here / manager
  there), unassigned staff.
- Four synthetic appointments on the next two dates.

Credentials and the exact cleanup manifest live only in the private mode-600
file
`bench/sites/meet-beta-implement-owned-booking-slice-a95902.localhost/private/acceptance-demo.json`.
Passwords are never committed, screenshotted or logged. To remove the demo
exactly:

```bash
bench --site <site> execute appointment.tests.acceptance_demo.reset
```

This deletes only the demo-named organizations and `demo.*` accounts (and their
bookings/memberships). The owner's own `Minte cafe` / `CMC` / `Best Cafe` data
and the automated QA fixtures are untouched.

## 7. Runtime changes and startup

- `bench --site <site> migrate` added the two DocTypes and synced the DocPerm
  role rename (`Front-Desk` → `Front Desk`). Applied only to the isolated
  implementation site.
- Python/hook changes required a runtime restart (`frappe-worktree stop` then
  `up`). Ordinary startup does not migrate.
- Email remains muted and the scheduler paused. No real notifications, payments
  or external integrations were enabled.
- Automated fixtures: `appointment.tests.test_membership.run` (roles, scope,
  revocation, disabled accounts, multi-business switching, time conversion) and
  the existing `appointment.tests.test_owned_booking.run`. Browser QA:
  `appointment.qa_runner.run` with the `qa/manifests/owned-booking/role-*.yaml`
  manifests and `fixture_scope='acceptance_demo'`.

## 8. Tenant provisioning configuration

A single Single DocType, `Appointment Registration Settings`, turns every
provisioning modality on or off. It is the one place an administrator changes
this behaviour.

| Field | Default | Effect |
|---|---|---|
| `self_signup_mode` (Open / Verified / Disabled) | Open | Open: public self sign-up. Verified: signup is unavailable until a verification delivery and completion flow exists. Disabled: the public sign-up form and endpoint are off. |
| `allow_self_service_business_creation` | On | When off, only invited/admin-provisioned accounts start onboarding or create a business. |
| `require_admin_approval` | Off | When on, a self-signed-up account is created disabled and waits for an administrator. |
| `allow_invite_provisioning` | On | When off, only an Administrator creates or assigns accounts; managers cannot. |

Enforcement is server-side, not only in the UI: `registration.signup` refuses
when Verified or Disabled; `registration.may_start_business` gates `workspace.create` and
`onboarding.set_onboarding_type`; `registration.require_invite_provisioning`
gates `membership.assign_member`. `registration.public_settings` is the
guest-safe read used by the sign-up page. Guest booking is never affected.

Invited/admin provisioning (option B) is available by default and is not gated
behind self sign-up. Administrator approval (option C) creates a disabled
account for an administrator to enable. Verified signup is visibly unavailable
and fails closed; it must not be described as working until the application has
a verification delivery and completion flow.

## 9. Translation standardization

User-facing strings are English source texts and translations live in the
framework's `Translation` DocType:

- Backend strings use `_()`.
- The React app resolves a key to its English source string, then applies the
  active language's `Translation` records via
  `appointment.scheduler.translation.messages`.
- `appointment.scheduler.translation.languages` returns only languages the app
  ships translations for (plus `en`), so the switcher stays meaningful instead
  of listing every Frappe language.
- `appointment.scheduler.translation.set_language` persists the signed-in user's
  Frappe `language` (guests keep a local choice; the call is guest-safe).
- A one-time patch (`appointment.patches.v0_1.import_frontend_translations`)
  converted the old bundled JSON dictionary into `Translation` records for
  Amharic, which are now editable in Desk.

Adding a language means adding `Translation` records for it; there is no second
dictionary store and no code change. A human review is still required before
Amharic is advertised as supported.

## 10. Evidence and known limitations

Backend and static checks:

- [Membership/scope/time acceptance](evidence/roles/membership-acceptance.txt) —
  7/7 pass with exact cleanup.
- [Registration acceptance](evidence/roles/registration-acceptance.txt) — 6/6
  pass: sign-up modes, self-service creation gating, invite provisioning gating
  and Translation-DocType messages, restoring the registration Single.
- [Registration and translation HTTP](evidence/roles/registration-and-translation-http.txt)
  — public settings, language list `[en, am]` and 217 Amharic messages.
- [Owned-booking acceptance](evidence/roles/owned-booking-acceptance.txt) —
  17/17 pass with exact cleanup (no regression from this increment).
- [Scheduling workflows](evidence/roles/scheduling-workflows.txt) — 8/8 pass.
- [App identity](evidence/roles/app-identity.txt) — 17/18; the single failure is
  `test_business_records_preserved`, which compares against the hardcoded
  assessment clone baseline and now sees the retained demo data. It is an
  environment-specific preservation assertion, not a product regression, and no
  data was deleted to satisfy it.
- [Role landing HTTP probe](evidence/roles/role-landings.txt) — resolved state
  and landing per demo account, plus reception scope counts.
- Production Vite build passed; DOM and realtime lifecycle tests pass.

Browser (QA runner → Agent Plane → Agent Harness), all with zero console and
zero network errors — see [browser summary](evidence/roles/browser-summary.json):

- Entry pages BQA-2026-00065 (login redaction is a Harness policy).
- Role journeys: new owner (BQA-00066, re-run BQA-00081), receptionist scope
  (BQA-00067), multi-business selection (BQA-00068), unassigned (BQA-00069),
  provider schedule (BQA-00070), receptionist recovers to the booking
  (BQA-00072), manager assigns a scoped receptionist (BQA-00077).
- Themes: public dark (BQA-00078) and authenticated dark (BQA-00074).
- Owned-booking guest booking (BQA-00079) and staff reschedule/cancel lifecycle
  (BQA-00080) with stored 11:00 Cancelled and released capacity.
- Self sign-up disabled (BQA-00089) and the Amharic language switch
  (BQA-00090); self sign-up open (BQA-00091) assertions pass but the capture is
  redacted because the form has a password field.
- Screenshots `evidence/roles/*.png`, the scoped reception DOM snapshot, and the
  sanitized report JSON files.

Limitations:

- The Harness redacts login and sign-up screenshots/traces (they contain
  credential fields); those scenarios' page assertions pass but their capture
  actions report false.
- The Verified sign-up mode and administrator approval are built and gated, but
  they cannot complete locally while email delivery is muted; an administrator
  enables the account instead.
- Authenticated journeys use impersonated `frappe_session`, not a typed
  password; `/login` rendering is covered separately.
- The setup boundary denies customer (Website User) and unstarted accounts;
  `test_owned_booking.test_12` verifies the customer denial. A retained staff
  account can still create a *new* business it owns, which does not grant access
  to any other business.
- The team page no longer collects a password, so its captures are not redacted;
  new accounts are created without a password and an administrator sets one
  locally. The API still accepts a `password` for local tooling and seeding.
- The legacy QA fixture `qa_fixtures` seeds tomorrow's date so browser QA works
  in the evening; this is disposable QA tooling.
- TypeScript diagnostics remain at the repository baseline; no clean global
  typecheck is claimed. `npm run lint` still reports pre-existing warnings
  across the repository; touched files were checked individually.
- Self-signup, delegated production invitations with real delivery, overnight
  hours, and group/room capacity remain out of scope.
