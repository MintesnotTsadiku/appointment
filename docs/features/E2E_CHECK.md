---
tags: [qa, appointment, e2e]
created: 2026-10-04
status: passed 2026-10-04
---

# End-to-end check: booking, payment, rooms, receipts and the scheduled jobs

## What it covers

One journey through the slices built in October 2026, on the rich demo business Bole Bloom Hair Studio:

1. A guest books Cut and shape with Rahel (the quiet room). The service needs a styling chair, and the business requires a 30% booking fee by bank transfer. The guest sends a transfer reference.
2. A second guest books, in Amharic on a phone, and does not pay.
3. The owner opens the paid booking in reception. It shows the assigned chair; the owner confirms the payment.
4. The scheduled functions run once: reminders, the payment-hold job, and the monthly statements.
5. The first guest reopens the manage link, which shows the receipt. The second guest's link no longer works. Reception lists the customer messages by name.

The site keeps `pause_scheduler=1` and `mute_emails=1`. The jobs are the cron functions called directly (`e2e_fixtures.run_jobs`). The real background workers render and queue the emails. Email is proven through Email Queue records.

## How to run

```
bench --site <site> execute appointment.tests.e2e_fixtures.setup
appointment.qa_runner.run  qa/manifests/e2e/1-guest.yaml
appointment.qa_runner.run  qa/manifests/e2e/2-owner.yaml
bench --site <site> execute appointment.tests.e2e_fixtures.run_jobs
appointment.qa_runner.run  qa/manifests/e2e/3-after-jobs.yaml
appointment.qa_runner.run  qa/manifests/e2e/4-owner-messages.yaml
bench --site <site> execute appointment.tests.e2e_fixtures.report
bench --site <site> execute appointment.tests.e2e_fixtures.cleanup
```

`setup` sets the following, and `cleanup` restores all of it:
- the receipt prefix `QAE2E`;
- a 25 ETB platform fee with no free allowance;
- a "Styling chair (E2E)" type with one chair per room, needed by Cut and shape;
- a 72-hour reminder lead for Bloom.

## Result (2026-10-04)

| Step | Run | Result |
|---|---|---|
| 1. Guests book | BQA-2026-00464 | Passed, 2 of 2. Both bookings held the quiet chair at different times. The paid guest's reference was Submitted. |
| 2. Owner confirms | BQA-2026-00465 | Passed. Reception showed "E2E quiet chair" and the Submitted payment. Confirm changed it to Paid, and the receipt link appeared. |
| 4. Jobs | `run_jobs` | `send_due_reminders` queued 15; `process_holds` expired 1; `send_monthly_statements` sent 0 (September had no activity). |
| 3. After the jobs | BQA-2026-00466 | Passed. The paid booking's manage page showed the receipt. The expired booking's link shows "no longer works". |
| 5. Reception messages | BQA-2026-00467 | Passed, after the fix below. |

Database report:

- **Paid booking:** Confirmed, holding the quiet chair. Payment Paid, 255 ETB. Receipt `QAE2E-2026-00001`. Ledger: a 25 ETB platform fee, Due. Emails queued: Payment request, Confirmation, and Payment receipt with its PDF attached.
- **Unpaid booking:** Pending until the hold job ran, then Cancelled with its payment Expired. Emails queued: Payment request, and a Cancellation that says the payment was not received. Its chair row stays as history; a cancelled booking does not hold the chair.
- **Reminders:** all 15 belong to demo bookings across four businesses that were inside their lead time. Each was rendered by a worker into Email Queue with its opt-out link and stayed "Not Sent" (email is muted). The QA booking got none, by design: it was made inside the lead window, and it had just received its confirmation.

Every browser run had 0 console and 0 network errors. `cleanup` removed the QA records and the 15 reminder rows with their emails, and put the settings back.

## Found and fixed

- **Slot listing took row locks.** `booking.slots` checked capacity with `SELECT … FOR UPDATE`, so listing times waited on any transaction that held a provider's booking rows. In this run, the QA runner's open transaction blocked every guest's slot request, and the calendar stayed disabled. Slot listing now reads without locks (`check_capacity(..., lock=False)`); the locking checks stay on every booking write. Test: `test_resources.TestLocking`.
- **Reception customer messages showed raw keys** ("staff.notifications.event.Payment request"). Labels were added for Payment request, Payment reminder, Payment receipt and Refund receipt, in English and Amharic.
- **The E2E fixture computed slots inside the runner's transaction.** It now computes the QA day once, in `setup`.

## Not covered

- A reminder for a booking made before its lead window. That needs a booking older than the lead time, which a same-day run cannot create. The 15 demo reminders exercise the same path.
- Real delivery. Email is muted and SMS has no gateway token. Chapa needs keys.
- The statement email for a month with activity. It is covered by `test_receipts.test_rcpt_monthly_email_goes_once_to_the_owner`.
- The receipt download in step 3 was not saved, because the next step left the page before the download finished. Downloads through the manage link were verified in BQA-2026-00455.
