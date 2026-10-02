---
tags: [plan, appointment, notifications]
created: 2026-10-02
status: draft, waiting for decisions
---

# Customer notifications plan

## Problem

A booking is confirmed at once, but the customer gets no message. `booking.book()` and `booking.change()` return `notification_status: "not_sent"`. The only scheduled emails go to staff: the Google Calendar authorization reminder and the unregistered `send_event_digest()`.

This plan adds email to the customer of an Appointment. SMS waits for a decision (see "Decisions").

## What exists now

| Area | Code | Fact |
|---|---|---|
| Public booking | `booking.book()` (L264), reached from `personal_meet.book_time_slot` | Guest, POST, `rate_limit(60/60s)`, idempotent through `request_key`. Creates a Confirmed Appointment. |
| Owned change | `booking.change()` (L419) | `action` is `cancel` or `reschedule`. Calls `require_access`. Used by `OwnedBookingActions.tsx`. |
| Desk paths | `desk.create_desk_appointment`, `update_appointment`, `reschedule_appointment`, `assign_walk_in_to_slot` | Each commits. `update_appointment` can set any status, including Cancelled. |
| Offline sync | `api/offline.py` `_handle_cancel_action` | Sets Cancelled. |
| Controller | `doctype/appointment/appointment.py` | `validate`, `after_insert` (version history), `on_trash`. No messages. |
| Appointment fields | `appointment.json` | `client_name`, `client_email` (required), `client_phone`, `starts_at`/`ends_at` (UTC), `booking_timezone`, `organization`, `location`, `provider`, `service`. No language, no reminder flag, no manage token. |
| Organization fields | `organization.json` | `organization_name`, `slug`, `email`, `phone`, `timezone`, `language` (`en`/`am`), `logo`. No notification settings. |
| Email helper | `helpers/email.py` `send_email_template_mail` | Legacy Booking Event helper. Not reused: its templates hardcode "IST" and a sender address. |
| Customer links | public routes | `/:slug/book` and `/schedule/org/:orgSlug`. No token page for a customer to view, cancel or reschedule a booking. |
| Translations | `scheduler/translation.py`, Translation records | English source text is the key. Patches import `am.json`. |
| Access | `booking_access.can_access`, `require_access`, `membership.manager_organizations` | Every desk path checks access. |
| Muted email | Frappe `EmailAccount.find_default_outgoing()` | With `mute_emails=1`, Frappe uses a dummy outgoing account. `frappe.sendmail` still creates an `Email Queue` row. No Email Account record is needed on this site. |

## Events

| Event | When | Source paths |
|---|---|---|
| Confirmation | A Confirmed Appointment is inserted | `book()`, `create_desk_appointment` |
| Reschedule | `starts_at` changes on a Pending or Confirmed Appointment | `change(reschedule)`, `reschedule_appointment`, `update_appointment` |
| Cancellation | `status` changes to Cancelled | `change(cancel)`, `update_appointment`, offline cancel |
| Reminder | The scheduler job finds a Confirmed Appointment inside the lead time | `notifications.send_due_reminders` |

These do not send a message:

- A walk-in placed with `assign_walk_in_to_slot`, because the customer is present.
- Completed and No Show status changes.
- Records that the demo seeder inserts. The seeder books through `book()`, so it sets the request-wide `frappe.flags.skip_customer_notification`.

Today every reschedule and cancel comes from staff, because customers have no manage page. The message text says "the business changed your booking".

## Design

### One trigger point

Add `on_update` to the Appointment controller and extend `after_insert`. Both call `notifications.on_appointment_change(doc)`. This catches every write path, including the desk APIs and offline sync, without changes in each one. The function:

1. Returns if `frappe.flags.skip_customer_notification` is set.
2. Finds the event: insert with Confirmed, `has_value_changed("starts_at")`, or a status change to Cancelled.
3. Calls `queue_notification(doc, event)`.
4. Stores the result in `doc.flags.notification_status`.

`book()` and `change()` return `doc.flags.notification_status` instead of `"not_sent"`. The desk APIs add the same key to their responses. The key is additive.

### Delivery

`queue_notification` does this:

1. Reads the business settings. If the event is off, it records `disabled`.
2. Checks the opt-out and the abuse limits.
3. Inserts an `Appointment Notification` row with status Queued.
4. Calls `frappe.enqueue(send_notification, enqueue_after_commit=True, queue="short")`.

The booking request does not render or send email. If the booking transaction rolls back, no job runs.

The job `send_notification(notification)` does this:

1. Loads the row and the Appointment again.
2. Skips the send if the Appointment changed since the row was queued, for example a cancel right after a reschedule.
3. Renders the template.
4. Calls `frappe.sendmail(..., reference_doctype="Appointment", reference_name=..., now=False)`.
5. Stores the returned `Email Queue` name on the row.

Frappe's `flush` job sends the queue. On this site `pause_scheduler=1` and `mute_emails=1`, so rows stay "Not Sent". That is the proof the tests and the browser QA use.

### New DocType: `Appointment Notification`

One row for each message the system decides to send or not send.

| Field | Type | Note |
|---|---|---|
| `appointment` | Link Appointment | Indexed |
| `organization` | Link Organization | Indexed, copied from the Appointment |
| `event` | Select | Confirmation, Reschedule, Cancellation, Reminder |
| `channel` | Select | Email (SMS later) |
| `recipient` | Data | Customer email |
| `language` | Select | `en`, `am` |
| `status` | Select | Queued, Sent, Failed, Skipped |
| `skip_reason` | Select | disabled, opted_out, rate_limited, no_recipient, stale |
| `email_queue` | Link Email Queue | Set by the job |
| `dedupe_key` | Data, unique | `{appointment}:{event}:{starts_at}` |
| `error` | Small Text | Job failure text, no stack trace |

Permissions: System Manager only. Staff read rows through `notifications.for_appointment`, which calls `require_access` on the Appointment.

The unique `dedupe_key` blocks a second confirmation if a request repeats. It also blocks a second reminder if two scheduler runs overlap. A reschedule changes `starts_at`, so the next reminder gets a new key.

### Real `notification_status` values

The API returns one of these values:

- `queued`: a row was inserted and the job was enqueued.
- `disabled`: the business turned the event off.
- `opted_out`: the customer opted out (only if opt-out is allowed, see "Decisions").
- `rate_limited`: an abuse limit stopped the message.
- `no_recipient`: the Appointment has no valid email.
- `not_applicable`: the change has no customer event, for example a notes edit or a walk-in.

The delivery status (Sent or Failed) is known later. It comes from the row, which the job updates from `Email Queue.status`.

### Per-business settings

New DocType `Customer Notification Settings`, named by `organization` (one per business):

| Field | Default |
|---|---|
| `send_confirmation` | On |
| `send_reschedule` | On |
| `send_cancellation` | On |
| `send_reminder` | On |
| `reminder_lead_hours` | Decision (24 is proposed) |
| `allow_opt_out` | Decision |

If a business has no record, code defaults apply. Nothing is seeded.

Whitelisted methods in `appointment/scheduler/notifications.py`:

- `get_settings(organization)`: GET. The user must be in `membership.manager_organizations`.
- `save_settings(organization, **values)`: POST, with the same check. It accepts only the fields above and validates `reminder_lead_hours` between 1 and 72.

### Reminder job

Register `appointment.scheduler.notifications.send_due_reminders` in `hooks.py` under `scheduler_events["cron"]["*/15 * * * *"]`.

The job does this:

1. Selects Confirmed Appointments where `starts_at` is after now and no later than now plus the business lead time.
2. Leaves out Appointments created less than one lead time before their start. These customers just got a confirmation.
3. Handles at most 500 Appointments in one run, oldest start first.
4. Calls `queue_notification(doc, "Reminder")` for each one. The unique `dedupe_key` makes the job idempotent. A repeat run inserts nothing.

If the scheduler stops for a while, the next run still sends every reminder whose appointment has not started.

### Templates

Four Jinja files in `appointment/templates/emails/`: `customer_confirmation.html`, `customer_reschedule.html`, `customer_cancellation.html` and `customer_reminder.html`. They share one base layout.

The content has these parts:

- Business identity: `organization_name`, and `logo` only if it is a public file on this site.
- Booking facts: service name, provider name, location name, and date and time in `booking_timezone`. Times use the existing formatters in `helpers/utils.py`, including Ethiopian time for Amharic.
- Contact: business phone and email as text. The business email is also the `reply_to`.
- One link: the business booking page, `get_url(f"/{slug}/book")`. The plan does not invent a manage link, because none exists.

Rules for the content:

- Escape every value with `frappe.utils.escape_html`, because `frappe.render_template` does not autoescape.
- Do not include customer `notes` or internal fields.
- Cut `client_name` to 80 characters.
- Use no remote images and no tracking pixels.

Language: add `customer_language` (Select `en`/`am`) to Appointment. `book_time_slot` gets an optional `language` argument from the public page locale. If the field is empty, the job uses `Organization.language`, then `en`. Subjects and body strings use `_(text, lang=...)`. Amharic strings come in a patch like `import_landing_world_translations.py`.

### Where staff see delivery status

1. Reception appointment dialog (`OwnedBookingActions.tsx`): a "Customer messages" list below `BookingHistory`. Each line shows the event, the time and the status (Queued, Sent, Failed, Skipped with reason). It reads from `notifications.for_appointment(booking_id)`.
2. After a staff reschedule or cancel, the success toast says whether the customer message was queued, turned off or skipped.
3. New page `/settings/notifications` in the Business group of the settings nav, for managers only. It holds the settings form and the last 20 rows for the business.

### Opt-out

If opt-out is allowed, each reminder email contains a signed link to the guest method `notifications.unsubscribe`. Frappe `get_signed_params` and `verify_request` sign and check the link. The link adds a `Customer Notification Opt Out` row (organization, email). The opt-out stops messages from that business only. Confirmation, reschedule and cancellation emails are transactional. The proposal is that the opt-out stops reminders only (see "Decisions").

### Tenant isolation

- Settings, rows and the status list check management or `require_access` for the Appointment's own organization.
- The job reads the settings of the Appointment's organization only. Templates read only that organization, its location, provider and service.
- `Appointment Notification` has no role permission except System Manager, so the REST list API exposes nothing.

### Abuse limits

A guest can type any email address in a public booking. Without limits, the confirmation could be used to send mail to a stranger.

- The existing `rate_limit` on `book()` stays: 60 requests per IP per minute.
- At most 5 customer emails to one address per business per day, and 20 to one address across all businesses per day. A message over a limit is recorded as `rate_limited` and is not sent.
- At most 500 customer emails per business per hour.
- The email contains no text that the guest typed, except the escaped and cut name.

### Tests

Backend, in `appointment/tests/test_customer_notifications.py`, using demo data and cleaning up only what the tests create:

1. `book()` creates one Appointment Notification and one `Email Queue` row with `reference_name` set to the Appointment. It returns `notification_status: "queued"`.
2. A repeated `book()` with the same `request_id` creates no second row.
3. `change(reschedule)` and `change(cancel)` queue one message each. A notes-only `update_appointment` queues nothing.
4. A disabled event returns `disabled` and creates no `Email Queue` row.
5. `send_due_reminders()` run twice creates one reminder. After a reschedule, a new reminder is allowed.
6. Templates render in English and Amharic, escape `<script>` in the name, and contain only the booking page link.
7. The rate limit and the opt-out each stop a message with the right reason.
8. A manager of another business is refused by `get_settings`, `save_settings` and `for_appointment`.

Frontend: typecheck, lint and `test:dom` for the settings page and the status list.

Browser QA through Agent Plane, `qa/manifests/customer-notifications/`, at 1440×900 and 390×844, in English and Amharic:

- A guest booking on `/bloom-studio/book`, then a check of the queued row.
- A reschedule and a cancel as `bloom.manager@`, with the status list.
- The settings page.

## Decisions

1. **SMS provider.** Options: email only for now, or a named provider (for example Africa's Talking or Twilio). Email only keeps this slice small. The `channel` field leaves room for SMS.
2. **Default reminder lead time.** Proposal: 24 hours. Businesses can change it from 1 to 72 hours.
3. **Customer opt-out per business.** Options: (a) no opt-out, (b) opt-out per business that stops reminders only, (c) opt-out per business that stops all customer email. Proposal: (b).

## Risks

- Schema changes (two new DocTypes, one Appointment field) need a migrate. Take `bench --site <site> backup --with-files` first.
- The Agent Plane legacy fixture scope can fail with `QueueOverloaded`. This plan uses demo personas only.
- `pause_scheduler=1` stops the reminder cron on this site. Tests and QA call `send_due_reminders()` directly.
- A reseed of the rich demo must set `frappe.flags.skip_customer_notification` (`showcase.py` books through `book()`, L937). Otherwise it would queue about 1,430 confirmations.

## Out of scope

SMS delivery (until decided), a customer manage page, customer profiles, group or shared capacity, and resources.

## Run record

Filled in after the build.
