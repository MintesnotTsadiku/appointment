# Homepage demo data and layout correction

The reported Home screenshot used separate generic report cards. It did not reproduce the approved workspace composition closely enough. More data alone could not fix that structure.

The default general Home now has a customer agenda timeline, a selectable seven-day preview, a right column for quick actions and popular services, a combined business summary and booking chart, and a compact indicator strip. Definitions and data remain accessible through expandable controls. Custom dashboards retain their saved widget configuration. Application colors and typography remain authoritative.

## Explicit seed phases

The normal `appointment.demo.showcase.seed` command now includes these phases:

- `appointment.demo.analytics_world`: versioned fictional booking history and reception scenarios.
- `appointment.demo.dashboard_world`: first-use Insights layouts with suitable metric date ranges.

Existing isolated demo installations can run each module's `upgrade` command. Run these only with the existing isolated Bench and site, as described in the runtime instructions. These modules are not HTTP endpoints or migration hooks.

The guards require an explicitly enabled local development site, muted email, a paused scheduler and the existing private ownership journal. Booking updates also require the exact original synthetic request digest and an `example.test` contact. Browser-created bookings and mixed workflow histories are preserved. Upgrades are idempotent. Existing saved dashboards are never replaced.

## Data coverage

| Dashboard need | Authored fictional scenario |
| --- | --- |
| Booking totals, outcomes and comparisons | Existing 90-day showcase history for all 10 providers, with separate cancellation and no-show outcomes |
| Sources and referrals | Online, staff, walk-in and imported booking sources; direct, recommendation and directory references |
| Booking creation and lead time | Varied creation dates before scheduled starts, stored in the correct system timezone |
| Original agreed value | Captured fictional agreements for ordinary bookings; imported bookings deliberately retain unknown original prices |
| Payments | Some completed visits have recorded amounts. Missing zero entries remain ambiguous; this is not a ledger |
| Reception timing | Arrival, check-in, start and end events for completed visits, with early/late arrivals and varied waits/overruns |
| Changes and outcomes | Authored confirmation, cancellation, reschedule, completion and no-show events with distinct event dates |
| Mature retention | Four older completed visits per provider: 40 additional bookings across roughly 100–180 days of history |
| Walk-in dashboards | 30 journal-owned waiting, assigned and cancelled walk-in scenarios across providers |
| Reception state | Explicit Open state for owned demo locations |
| Saved Insights examples | 15 first-use role-scoped dashboards; retention widgets use an explicit 200-day cohort range |

Every provider is checked through the installed analytics API. A short reporting range cannot provide mature 90-day first-visit cohorts; the demo retention widgets therefore use a declared longer local range.

The seed dates are fixed by the showcase anchor. Current operational cards use the actual business-local date. Closed days remain empty. Selam Movement Practice is closed on Sunday and Monday, so its Sunday agenda is correctly empty even though its future preview and historical charts contain data.

## Preserved dependencies

Customer email remains provisional identity. Historical capacity uses current schedules and stays partial. Website visitors, campaign attribution, payment ledgers, newsletter engagement and persisted publishing/import failure lifecycles remain separate scopes. The seeder does not populate invented values for those dependencies.

Real-browser screenshots and before/reference/after comparison are saved under `qa/evidence/homepage-analytics/`. Authentication storage, credentials and traces are not exported.
