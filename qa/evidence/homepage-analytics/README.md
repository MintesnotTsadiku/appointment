# Homepage and analytics acceptance evidence

Implemented and verified in the isolated worktree runtime on 26 September 2026. No push, merge or deployment was performed.

Open [the comparison viewer](comparison.html) to compare real browser output with the approved reference and themed composite.
The interface keeps the application theme and uses the reference for hierarchy: workspace header, agenda first, quick actions, then metric cards.
Desktop uses the right action column. Mobile uses one column without horizontal overflow.
The composite is an acceptance layout target, not a runtime image or a source of metric values.
Pink screenshot bars mask freshness timestamps only.

## Reference correction and seeded data

The user's reported screenshot exposed a mismatch in the initial generic card layout. The corrected default Home uses the agenda timeline, seven-day preview, right action/services column, combined summary/chart and indicator strip. Custom dashboard configurations are preserved.

The explicit analytics seed phase authors scenarios for 1,387 original fictional bookings, adds 40 older cohort visits, and supplies 30 walk-ins across all ten providers. Imported original prices remain unknown. Fifteen first-use role-scoped Insights dashboards use longer local ranges where retention requires them. Existing saved dashboards are preserved. Seed upgrades were rerun and returned `changed: false`.

See [the seed coverage contract](../../../docs/implementation/homepage-demo-data.md). Closed days are intentionally empty; Selam's Sunday and Monday closures explain its empty Sunday agenda.

## Workspace upgrade — 27 September 2026

Live Home assessment against `docs/design-references/homepage/light-workspace.png` found reporting chrome ahead of the day, a buried attention link, week days without occupancy, compact definition noise, and manager quick actions limited to two items.

The default Home now uses a time-aware greeting, a visible attention banner, occupancy dots, next-up highlighting with durations and status tokens, role-gated Reception/Settings actions, quieter compact metrics, and separate indicator cards. Closed shared filters no longer keep their fields in the tab order.

A follow-up pass tightened the greeting to two lines and replaced native selects, checkboxes, search fields and toolbar buttons with the designed workspace controls. Period sits in Business summary. Mobile width stayed at 390px.

Comparison captures: `homepage-before-desktop-light.png`, `homepage-after-desktop-light.png`, `homepage-after-desktop-dark.png`, `homepage-after-mobile-light.png`. Mobile width stayed at 390px with no horizontal overflow. Metrics, branding tokens, Home/Insights separation and role gates are unchanged. No push, merge or deployment.

## Browser checks

- `BQA-2026-00212`: Passed. Revised composition and controls. Organization desktop and mobile, light and dark, top navigation, expanded and collapsed sidebar, accessible drawer, all industry presets and All, populated/empty/partial/unavailable widgets, chart tooltips and data alternatives, filters, matching records, CSV exports, customization and reload persistence, reception stages/state, reception role permissions, separate Home/Insights, workspace switching, settings and publishing navigation.
- `BQA-2026-00214`: Passed after the composition correction. Independent provider normal signup, setup, public guest booking, Home and Insights, light/dark desktop/mobile. Disposable account cleanup completed.
- `BQA-2026-00204`: Passed. Existing complete website setup and booking/content/gallery/newsletter/invitation/reception/workbook regression journey.

Screenshots and redacted summaries are saved here. Authentication storage and browser traces are not exported.
Real-browser role coverage is owner, receptionist and independent provider. Backend checks additionally cover manager, provider and multiple workspace roles.

- `BQA-2026-00213`: Passed. Normal demo-owner logins for all five businesses, light/dark desktop/mobile Home plus populated Insights; 25 screenshots. Publication inventory unchanged and navigation preferences restored.

## Focused checks

- Future seed upgrade: rollback-only test preserved a user-entered recorded amount even without a new lifecycle event.
- Every demo provider: ten passed, with nonzero booking/agreed-value/timed-visit data, mature 90-day retention and unique chronological synthetic workflow events.
- Analytics contracts: 176 metrics; owner 123 bookings, scoped provider 41, reconciled calculations and financial restrictions.
- Capture checks: immutable agreed snapshots, eight committed workflow events, retry uniqueness, legacy booking hash compatibility and failed-write rollback.
- Analytics math: nine checks passed, including timezone boundaries, buffers, overlaps, no-show separation, missing historical intervals and CSV formula escaping.
- Independent booking: five checks passed; ownership, foreign access, guest retries and shared capacity.
- Existing analytics verification: owner, manager, provider, reception and multiple-role scopes passed.
- Frontend DOM checks, focused ESLint and Vite production build passed. Build output is under `/tmp`, without replacing runtime assets.
- Full frontend TypeScript check remains blocked by 271 pre-existing errors in unrelated modules. Changed analytics/navigation files have no reported errors.
- `git diff --check` passed.

## Retained data limits

Historical prices, booking sources and lifecycle timestamps are not inferred. Unknown coverage remains partial or unavailable.
Current catalog estimates, agreed booking values and recorded amounts remain distinct.
Customer identity is provisional same-business email; current schedule utilization is an estimate without historical snapshots.
Payment ledgers, website visitor tracking, campaign attribution, historical capacity, newsletter delivery/engagement, and persisted publishing/import failure lifecycles remain separate scopes.
See the implementation plan and feature matrix for dependency identifiers and precise definitions.
