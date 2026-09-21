# Marketing promises — delivery requirements

The product owner intends to retain aspirational capability copy during prelaunch
development. This document records what must be implemented or demonstrated; it
is not an instruction to change the homepage or a claim that everything is absent.

Before actual customers are invited, each promise offered to that audience must
have working behavior and evidence. The owner must explicitly decide staged
availability rather than silently treating an advertised capability as out of scope.

| Promise | Gap / uncertainty | Acceptance evidence needed | Timing |
|---|---|---|---|
| Payments: TeleBirr, Chapa, M-PESA, Stripe, PayPal as advertised | No reviewed collection integration; amount_paid and Policy math are insufficient | Each offered gateway: authorized payment, failure/cancel, duplicate callback, reconciliation, receipt and applicable refund flow; sandbox evidence and launch configuration review | Before offering that payment method to customers |
| SMS, USSD and WhatsApp booking | Non-web intake not evidenced; sharing links is different | Real supported channel intake creates the correct scoped booking, uses authoritative capacity, avoids duplicates and communicates failures | Before offering that channel |
| Customer profiles/history/follow-ups | Contact snapshots exist; complete customer-management behavior unverified | Returning-customer recognition appropriate to the business, scoped history, contact correction and supported follow-up; evaluate model need after workflow definition | Before promising customer management |
| Analytics and reporting | Static analytics page; some real dashboard calculations | Reconcile displayed metrics with synthetic bookings, cancellations and payments; verify organization scope and empty states | Before promising usable analytics |
| Teams and multiple locations | Models exist; invitations/settings incomplete or unverified | Invite/disable staff; role-appropriate access; setup survives reload; location/provider selection and handoffs complete | Before organizational customer launch |
| Calendar and meeting integrations | Helpers exist; connection UI and full lifecycle unverified | Connect/revoke, create/reschedule/cancel, timezone correctness, external failure/retry and duplicate handling | Before offering each integration |
| Scheduling, confirmation and reminders | Core paths exist; Phase 1 did not complete them | Complete public and staff lifecycle with exceptions, buffers, confirmation, promised reminders, cancellation and no-show behavior | Before customer launch |
| Bilingual and local-time experience | Resources/controls exist; journey coverage unverified | Main offered journeys in English/Amharic with consistent timezone/time format and mobile behavior | Before advertising those journeys as supported |

The assessments in Phases 2–6 should refine evidence and readiness. Implementations
belong in separate authorized work, not assessment branches. No delivery date,
provider contract or implementation completion is implied by this list.

## Factual marketing claims

Homepage counts, transaction totals, uptime percentages and partner names are
not future feature promises. Verify their factual basis before public customer
launch; feature implementation alone cannot substantiate them. The landing page
contains demonstration partner names (`frontend/src/pages/landing/sections/LogoCloud.tsx`).
No marketing source files are changed by this assessment.
