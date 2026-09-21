# Appointment product reassessment

This folder is the working area for an honest review of Appointment before a
broader beta release. The review starts from the product goal, tests the current
application as real users experience it, and then compares it with what we would
choose if we built the product fresh today.

Run each phase in a separate AI-agent chat. Give the agent this file and the
repository/environment context it already has. Do not ask one agent to execute
all phases in one pass. Each phase must leave concise, reviewable evidence in
this folder so the final phase can compare the findings without trusting claims
from earlier chats.

## Product goal to use in every phase

Appointment should provide the appointment-related capabilities advertised on
the product homepage for most customers on one shared site. It should serve:

- a person who manages one service and one schedule;
- a small business with a few providers, services, and locations;
- a larger organization with administrators, reception staff, providers,
  customers, walk-ins, and several booking channels.

The interface should reveal only the complexity each user needs. A solo user
should not have to understand organization structures or provider management.
An organization should be able to add that structure without fighting the
product. Premium enterprise customers may later receive a separate site or
subdomain when they need contractual isolation, unusual scale, data residency,
regulated hosting, or substantial customization.

The present single-site direction is an assumption to test, not a conclusion to
defend. The existing code is also not the definition of the product. Judge it
against the clearest design we would choose today.

## Current evaluation direction

Keep aspirational marketing capabilities during prelaunch development, as directed
by the product owner. Track missing implementation and required launch evidence
in `phase-01-product-and-domain/marketing-delivery-requirements.md`; do not treat
removing promises as the default remedy. Before customer launch, validate the
capabilities actually offered and the factual basis of marketing statistics and
partner claims. This direction does not certify current readiness.

Use `browser-qa-access.md` for retained synthetic identities, explicit session
authentication, the preserved runtime and fixture-cleanup constraints. The
prepared next-phase prompt is `phase-02-opencode-prompt.md`.

## Rules for every reviewer

1. Be candid. Do not protect past work and do not propose change merely to make
   the review look substantial.
2. Verify current behavior. Treat old plans, completion reports, and comments as
   claims until code, data, tests, or browser evidence supports them.
3. Separate observed facts, reasonable inferences, and open questions.
4. Compare the present application with a clean-start design. Then recommend
   the least expensive safe path from here. Recommend a rewrite only when
   evidence shows that repair would cost more or leave unacceptable risk.
5. Use plain language. Explain a technical term the first time it is necessary.
   Prefer five strong findings over twenty weak observations.
6. For every material finding, state:
   - **Finding** — one sentence;
   - **Why it matters** — one or two sentences;
   - **Evidence** — file/line, test, data observation, screenshot, or recording;
   - **Action** — keep, improve now, accept temporarily, or replace later;
   - **When** — before beta, after beta, or later.
7. Do not modify product code during assessment. Small QA manifests, disposable
   fixtures, and evidence files are allowed. Report findings before proposing an
   implementation branch.
8. Use synthetic test data. Do not include passwords, cookies, private customer
   data, database credentials, or secrets in evidence.
9. Finish the complete lifecycle named in the phase. A successful setup screen
   alone is not evidence that the workflow works.

## Evidence layout

Each phase must create its own folder under this directory:

```text
phase-01-product-and-domain/
phase-02-platform-architecture/
phase-03-solo-user-experience/
phase-04-organization-experience/
phase-05-customer-experience/
phase-06-release-operations/
phase-07-final-recommendation/
```

For phases using a browser, create this structure inside the phase folder:

```text
analysis.md
browser-manifest.yaml
evidence-index.md
screenshots/
recordings/
traces/
```

`analysis.md` contains the short findings. `evidence-index.md` maps every
finding to the user role, scenario, Browser QA Run ID, screenshot, recording,
trace, and relevant URL. Use descriptive artifact names such as
`solo-03-publish-booking-page.png`. Keep recordings focused on one journey. If
Agent Plane stores an artifact in site storage and exporting it would create an
unreasonably large repository file, record the Browser QA Run ID and exact
artifact location in `evidence-index.md`; do not pretend the recording was
copied.

## How to use Agent Plane and Agent Harness

Use Agent Plane for browser review and Agent Harness as the browser execution
layer. Do not call Playwright directly. Begin by confirming that `agent_plane`
and `agent_harness` are installed on the isolated QA site and that the certified
Agent Harness runtime passes its preflight.

Start from the existing manifests in `qa/manifests/`, but copy or create a
phase-specific manifest in the phase evidence folder. Configure it with:

```yaml
auth:
  type: frappe_session
capture_trace: true
capture_video: true
capture_instruction_timeline: true
```

Use the site's existing least-privileged Browser Account for each role when one
exists. Use Administrator only for the administrator journey. Create synthetic,
role-accurate accounts when the role does not exist, document their permissions,
and remove them during cleanup. Never place credentials in the manifest or this
folder.

Execute the manifest through the product-owned entry point:

```bash
bench --site <isolated-site> execute appointment.qa_runner.run \
  --kwargs '{"manifest_name":"<absolute-path-to-phase-manifest>","base_url":"<isolated-frontend-url>"}'
```

This calls `agent_plane.api.run_browser_qa_manifest` using `frappe_session` and
lets Agent Harness operate the browser. The agent must navigate through visible
product controls as that user would. Backend calls may prepare deterministic
fixtures or verify the final records, but they must not replace the workflow
being assessed.

Capture a screenshot at every decision point, confusing state, error, and final
outcome. Record the whole journey when possible. Inspect the screenshots at the
actual viewport rather than merely checking that they are nonblank. Review the
video, trace, console, and failed network requests. Repeat important journeys at
desktop and narrow mobile widths. Preserve failed runs because they often show
the usability problem more clearly than a later successful run.

For each role, ask while looking at the screen:

- Is the next action obvious without knowing Frappe or the data model?
- Does the page show only what this person needs now?
- Are words familiar to the user?
- Can the user recognize success, recover from a mistake, and find the record
  later?
- Can the user complete the work without an administrator or hidden backend
  operation?

Run deterministic cleanup after each scenario and report what remains. Do not
alter or delete the shared source site.

## Phase 1 prompt: product promise and domain model

```text
Act as an independent product and domain reviewer. Read
docs/product-reassessment/README.md and follow its evidence and writing rules.
Create docs/product-reassessment/phase-01-product-and-domain/analysis.md.

Determine what Appointment is actually promising on its homepage and in its
current user journeys. Inspect the real application, code, DocTypes, APIs, tests,
and current product copy. Treat historical plans as unverified.

Answer these questions:
1. Who is the product for first, and what complete job should it do for them?
2. Which appointment-related promises are implemented, partial, or absent?
3. Are the core concepts clear: organization, provider, customer, service,
   location, resource, availability, appointment, event, walk-in, payment, and
   communication channel?
4. Which concepts overlap, carry the wrong name, or exist mainly because of the
   app's history?
5. Can the same model reasonably serve a solo professional, salon, clinic,
   consultant, repair service, class, and public-service office without adding
   industry-specific exceptions everywhere?
6. What should be explicitly outside the first beta?

Draw one small diagram of the clean domain model you would choose today. Compare
it with the current model. Give at most five strengths, five weaknesses, and
five decisions needed. Do not redesign screens or modify code in this phase.
```

## Phase 2 prompt: platform architecture and shared-site safety

```text
Act as an independent application architect. Read
docs/product-reassessment/README.md and the Phase 1 evidence. Create
docs/product-reassessment/phase-02-platform-architecture/analysis.md.

Evaluate whether the current architecture can safely support most customers on
one Frappe site while keeping a practical path to separate enterprise sites.
Inspect implementation and tests rather than architecture claims.

Check:
1. Every business record has clear organization ownership, including indirect
   and child records.
2. Permissions, API queries, search, exports, files, realtime events, reports,
   background jobs, and caches cannot leak data between organizations.
3. Availability, slot calculation, booking, rescheduling, cancellation, and
   walk-in assignment use one authoritative set of rules across every UI.
4. Concurrent users cannot take the same capacity, repeat a payment, or create
   duplicate appointments.
5. Time zones, Ethiopian time presentation, daylight-saving cases elsewhere,
   exceptions, buffers, capacity, rooms, equipment, and recurring schedules
   have a coherent home.
6. Payments, SMS, email, calendars, and future channels can be added through
   stable boundaries instead of being mixed into booking logic.
7. Workers, scheduled jobs, migrations, auditing, and data growth remain
   manageable on a shared site.
8. One organization can later be exported to a dedicated site without rewriting
   the product or losing identity and history.

Use focused tests or read-only probes where evidence is missing. Name the three
most serious failure modes. State whether the shared-site approach is sound,
conditionally sound, or unsound. Provide a small current-versus-clean-start
diagram and at most five actions, ordered by risk reduction. Do not recommend
microservices or a rewrite without concrete evidence.
```

## Phase 3 prompt: solo-user experience

```text
Act as a usability reviewer seeing Appointment for the first time as a solo
professional with one service and one schedule. Read
docs/product-reassessment/README.md and follow its Agent Plane instructions.
Create the full phase-03-solo-user-experience evidence folder.

Use a fresh synthetic solo account and a clean organization state. Through the
visible UI, complete and record this entire lifecycle:
1. Sign up or receive access and understand the first screen.
2. State what service is offered, its duration and price if applicable.
3. Set normal availability and one exception.
4. Publish or find the customer booking link.
5. As a customer, book an available time.
6. As the solo provider, find and understand the new appointment.
7. Reschedule it, communicate the change, complete it, and record a no-show or
   cancellation on another appointment.
8. Change availability and confirm future booking choices respond correctly.
9. Review the day and identify the next action.

Do not explain hidden organization/provider structures to the test user. Judge
whether the product hides them naturally. Count required decisions, screens,
unexpected terms, dead ends, and administrator interventions. Repeat the key
booking and schedule views at a narrow mobile viewport.

Inspect every screenshot and the recording through the solo user's eyes. End
with: what felt effortless, what required product knowledge, the earliest point
the user may abandon setup, and the smallest changes that would make the solo
experience ready for beta. Give no more than five prioritized findings.
```

## Phase 4 prompt: organization, administrator, reception, and provider experience

```text
Act as a usability and workflow reviewer for a small organization. Read
docs/product-reassessment/README.md and follow its Agent Plane instructions.
Create the full phase-04-organization-experience evidence folder.

Use synthetic accounts for an organization administrator, reception worker, and
provider. Give each only the permissions that role should have. Capture separate
role-labelled screenshots and recordings. Complete this lifecycle through the
visible UI:
1. Administrator creates or selects the organization.
2. Administrator adds two services, two providers, two locations, schedules,
   booking rules, and staff access.
3. Administrator corrects a setup mistake and confirms saved configuration
   after reload and a new login.
4. Reception creates a booking, handles a walk-in, assigns it, reschedules a
   booking, cancels another, and closes or completes the visit.
5. A provider sees only the work relevant to them, changes their availability,
   views customer context, and completes the appointment.
6. Administrator reviews activity, staff workload, configuration, and an audit
   trail, then removes or disables staff access safely.

Test switching between organizations if supported. Attempt one action beyond
each role's authority and confirm the interface and server both refuse it
clearly. Note any workflow that can only be completed through onboarding,
Administrator, Desk, console commands, or direct API calls.

Judge whether the interface grows naturally from the solo experience or exposes
an entirely different mental model. Identify missing ownership, handoff,
permission, and recovery behavior. Report no more than five strengths, five
weaknesses, and five before-beta actions.
```

## Phase 5 prompt: customer booking experience

```text
Act as an independent customer-experience and accessibility reviewer. Read
docs/product-reassessment/README.md and follow its Agent Plane instructions.
Create the full phase-05-customer-experience evidence folder.

Test as a new customer who knows nothing about the business's internal setup.
Use public or least-privileged customer access and complete these journeys:
1. Discover the business from the public page and understand what can be booked.
2. Choose a service, provider when relevant, location, date, and time.
3. Recover from no availability, stale availability, invalid contact data, and
   a slot taken during checkout.
4. Confirm the booking and later find, reschedule, and cancel it using only the
   information a real customer receives.
5. Book again as a returning customer without creating confusing duplicates.
6. Complete the main journey in English and Amharic.
7. Complete the main journey at mobile width and using keyboard navigation.

Check clarity of time zone/time format, price, location, cancellation rules,
privacy expectations, confirmation, reminders, and error recovery. Inspect
screenshots, recording, trace, console, and network results. Do not excuse a
broken customer step because staff can repair it in Desk.

Give a plain-language verdict on trust, speed, accessibility, and likelihood of
completion. Identify the three largest abandonment risks and at most five
before-beta changes.
```

## Phase 6 prompt: release, operations, and business readiness

```text
Act as the person accountable for safely operating Appointment after beta users
arrive. Read docs/product-reassessment/README.md and the earlier phase evidence.
Create docs/product-reassessment/phase-06-release-operations/analysis.md.

Evaluate what happens after the happy-path browser demo. Verify, where practical:
1. Tenant isolation, audit history, consent, privacy, data export, correction,
   retention, and deletion.
2. Backup and restore, migrations, rollback, monitoring, alerting, logs, and
   support diagnostics.
3. Email/SMS/payment/calendar failures, retries, duplicate callbacks, delayed
   jobs, and customer-visible recovery.
4. Performance and capacity with realistic organizations, providers, schedules,
   appointments, concurrent bookings, and background work.
5. Import and onboarding of an existing business's customers, services,
   providers, and future bookings.
6. Product analytics that reveal setup abandonment, failed booking, no-shows,
   and operational bottlenecks without exposing private data.
7. Subscription limits, abuse controls, support boundaries, and the concrete
   triggers for moving an enterprise customer to a dedicated site.

Use failure injection or restoration drills only in an isolated environment.
Do not claim readiness based on the existence of a configuration screen. Produce
a short beta gate with pass, fail, owner, and evidence. Separate launch blockers
from improvements that can safely follow beta. State the minimum observability
and recovery capability required before inviting external users.
```

## Phase 7 prompt: clean-start comparison and decision

```text
Act as the final decision reviewer. Read
docs/product-reassessment/README.md and every phase folder. Check important
evidence yourself instead of averaging the earlier opinions. Create
docs/product-reassessment/phase-07-final-recommendation/analysis.md.

Answer one question: if we knew today what we now know, how would we build this
product, and what is the safest economical path from the current application to
that design?

Return only:
1. A five-sentence verdict covering product fit, architecture, user experience,
   operational readiness, and whether beta should proceed.
2. Up to five proven strengths to preserve.
3. Up to five weakest points, each with evidence and consequence.
4. A Keep / Improve now / Accept temporarily / Replace later table. Include the
   clean-start choice and the practical action for the existing app.
5. A before-beta list containing only release blockers.
6. A 90-day sequence of small, testable improvements.
7. A one-to-two-year redesign direction, only where current choices would create
   material cost or risk.
8. The explicit enterprise separation triggers.
9. The three unresolved decisions that require the product owner's judgment.

Do not repeat long phase summaries. Link each conclusion to code, test, Browser
QA Run, screenshot, recording, or operational drill. Do not recommend a rewrite
unless you compare migration cost, lost working behavior, data risk, delivery
time, and the incremental alternative. If evidence supports continuing with the
current foundation, say so directly.
```

## Expected outcome

This process should leave a compact body of evidence that answers four distinct
questions:

1. Are we solving the right appointment problem with a coherent model?
2. Can the platform safely support many customers and later separate enterprise
   customers?
3. Can each person complete their work without understanding the system's
   internal structure?
4. Can we operate, support, and recover the product when real customers use it?

The final decision should be grounded in those answers, not in attachment to the
current implementation or attraction to a cleaner rewrite.
