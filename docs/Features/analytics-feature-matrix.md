# Analytics feature matrix

Status: planned. Created 2026-09-26.

This matrix records analytics that require larger features. It does not claim these features exist.
The user approved the proposed data additions. This document separates larger dependencies from the homepage delivery.
See the [homepage implementation plan](../implementation/homepage-analytics-plan.md).

## Feature matrix

| ID | Feature | Analytics unlocked | Required records and workflows | Dependency and acceptance |
| --- | --- | --- | --- | --- |
| LF-01 | Customer identity | Cross-email customer history, reliable retention, customer lifetime revenue | Business-owned Customer Profile, verified contact methods, controlled merge history | Preserve business isolation. A merge must retain booking history and an audit trail. |
| LF-02 | Payment ledger | Actual payment-date trends, outstanding balances, deposits paid/due, refunds, fees, payment methods, failed payments, net collections, collection rate, receivables aging | Agreed charges, payment transactions, adjustments, refunds, currency, due dates, external references | Booking price snapshots are a prerequisite. Reconcile balances and make external callbacks idempotent. |
| LF-03 | Cost and compensation | Margin, profit, provider commissions, revenue per available hour | Business costs, service costs, compensation rules and settlement records | Requires LF-02 and historical capacity for accurate revenue per available hour. |
| LF-04 | Forecasts | Demand forecast, revenue forecast | Historical observations, forecast versions, assumptions, confidence intervals | Require sufficient history. Compare forecasts against a simple baseline. Revenue depends on LF-02. |
| LF-05 | Website and booking events | Visitors, sessions, page views, service views, booking clicks, funnel conversion, abandonment, device/page/service/location conversion | Minimal event collector, session and attempt IDs, event schema, retention rules, bot filtering | Never include appointment notes or raw contact details in tracking events. Handle duplicate and missing events. |
| LF-06 | Attribution and campaign costs | Traffic sources, referral/UTM attribution, website-to-booking conversion, content-assisted bookings, acquisition cost, campaign ROI | Source capture, booking attribution, campaign spending, attribution window | Depends on LF-05. Financial ROI requires LF-02. Publish attribution rules. |
| LF-07 | Search and unmet demand | Search volume, no-results searches, slot searches without availability, unmet demand by service/time/location | Search events, filters, result counts, availability outcome | Depends on event collection. Separate no results from technical failures. |
| LF-08 | Booking attempt telemetry | Booking failure rate and failure reasons, attempt-to-booking conversion | Attempt lifecycle, validation/conflict/error outcomes, correlation IDs | Link completed attempts to bookings. Exclude duplicate retries from conversion counts. |
| LF-09 | Historical capacity snapshots | Original-schedule utilization, accurate historical free capacity, capacity-adjusted comparisons | Versioned working hours, holidays, provider assignments, offering eligibility and occupied allocations | Snapshot effective changes. Do not silently reconstruct old capacity from today's configuration. |
| LF-10 | Waitlist | Waitlist size, time waiting, offer acceptance, conversion, recovered capacity | Waitlist entries, preferences, offers, expiry and booking links | Define ordering and eligibility. Prevent duplicate offers and overbooking. |
| LF-11 | Shared scheduled capacity | Class seat occupancy, fill rate, participant attendance, seat utilization | Scheduled Offering, Capacity Claim, finite limits and customer bookings | Follow CONTEXT.md terminology. Validate concurrent claims and released capacity. |
| LF-12 | Recurring bookings | Recurrence uptake, series completion, series cancellation, recurring customer retention | Booking series, occurrence links, exceptions and cancellation scope | Distinguish calendar recurrence from customer booking recurrence. |
| LF-13 | Packages and membership entitlements | Package usage, remaining credits, expiry, membership usage and renewal | Purchases, credit ledger, entitlement validity, redemption and reversals | Requires commercial records. Distinguish these entitlements from staff Business Membership. |
| LF-14 | Resource allocations | Room/equipment utilization, resource bottlenecks and resource-only bookings | Resource, Resource Group, Allocation and capacity mode | Follow existing domain contracts. Support exclusive and pooled capacity correctly. |
| LF-15 | Feedback | Satisfaction, reviews, NPS and feedback response rate | Feedback invitations, responses, scales and visit links | Define eligibility and sample size. Preserve customer consent and business isolation. |
| LF-16 | Email delivery integration | Actual delivery, bounces, complaints and provider failures | Email provider message IDs, callbacks, delivery events and suppression | Existing newsletter delivery captures local messages. It does not prove inbox delivery. |
| LF-17 | Newsletter engagement | Clicks, approximate opens, newsletter-to-booking conversion | Link attribution and provider engagement events | Depends on LF-16 and attribution for conversions. Explain open-rate measurement limitations. |
| LF-18 | Operational telemetry | Booking/API error rate, latency, calendar sync failures and sync latency | Request timings, structured errors, sync job lifecycle and correlation IDs | Inspect existing integration logs before adding capture. Define retention and aggregation. |
| LF-19 | Notification effectiveness | Reminder delivery, failures, reminder-to-attendance association | Reminder lifecycle, delivery events, booking links and experiment assignment when needed | Delivery depends on transport events. Association alone does not establish causation. |

## Work retained in the homepage plan

The homepage plan includes calculation-only metrics and small workflow captures.
It includes booking price snapshots, booking source, status events, reschedule events, arrival and service timestamps.
It also includes confirmation and cancellation timestamps, referral fields, discounts, reception state and data freshness.
Historical capacity snapshots remain LF-09 because they require a versioned scheduling model.

## Delivery rules

- Keep each feature behind its own delivery scope and acceptance checks.
- Add unavailable metrics to the registry only after their data contract is defined.
- Do not show fabricated values or label missing records as zero.
- Expose larger-feature widgets when their data source and permission checks are ready.
- Keep raw financial, customer and operational details scoped to existing capabilities.
- Assess volume, indexes and aggregation costs before enabling event-heavy features.
- Preserve existing functionality and untracked files.
- Use the isolated runtime. Do not modify the reference runtime, push, merge or deploy.
