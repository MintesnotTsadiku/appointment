---
tags: [plan, appointment, payments]
created: 2026-10-03
status: built and verified 2026-10-03; Chapa waits for keys
---

# Booking payments plan

## Problem

A business's booking policy can ask for a deposit and charge late-cancellation and no-show fees. The platform cannot take any money, so these rules have no effect. `Organization.require_payment` exists, but nothing reads it.

This slice adds payment at booking time. The first launch is a manual bank transfer. Chapa is built in the same slice and turns on when its keys are configured.

## Decisions (2026-10-03)

1. **Methods:** bank transfer first. The customer sees the business's bank accounts after all booking details are complete, pays, and sends a reference and a screenshot. Staff confirm. Chapa is the second method, built now and enabled when keys are provided.
2. **Amounts:** checkout shows the service price, the booking fee due now, the balance at the visit, and the refund policy, before the customer confirms.
3. **Who collects:** one platform setting, overridable per business:
   - *Business collects* (default): money goes straight to the business's accounts. The platform records a per-booking platform fee in a ledger (the wallet). A free allowance of bookings applies first.
   - *Platform collects*: money goes to the platform's accounts. The ledger records the platform fee and the payout due to the business.
   Only a platform administrator changes the collection mode.
4. **Refunds:** manual. The business refunds and records the amount, a reference and proof (a screenshot). No refund API in this slice.
5. **Unpaid bookings:** the booking holds its slot until a deadline: 15 minutes for Chapa, 24 hours for bank transfer, and never later than 2 hours before the appointment. The customer gets a reminder before a bank-transfer deadline. If nothing is paid or submitted by the deadline, the booking is cancelled and the slot is released.

## What exists now

| Area | Code | Fact |
|---|---|---|
| Switch | `Organization.require_payment` | Check, default 0, unused. All five demo businesses have 0. |
| Booking fee | `Policy.deposit_amount`, `deposit_percentage` | Defined per policy. |
| Quote | `policy_engine.calculate_booking_quote`, `api/quote.get_booking_quote` | Price, deposit, balance, fees, refund policy. Not used by the live scheduler. |
| Holds | `booking.ACTIVE` | Pending bookings already hold provider capacity. |
| Refund record | `Appointment.amount_paid`, `refund_due`, `cancellation_fee` | From the self-service slice. |
| Prototype | `booking-v2/components/CheckoutForm` | Used only by `booking-v2/preview.tsx`. Not reused. |
| Onboarding | `onboarding.py` | A "payment" setup step pointing at `/settings/payments`, never completed. |

## Design

### Configuration (kept small)

**`Payment Settings`** (Single, platform administrator, Desk):

| Field | Default |
|---|---|
| `collection_mode` | Business collects |
| `platform_fee_type` | None / Fixed / Percent (default None) |
| `platform_fee_value` | 0 |
| `free_bookings` | Paid bookings per business before a fee applies (default 0) |
| `platform_bank_accounts` | Table: bank, account name, account number, note |
| `chapa_secret_key`, `chapa_webhook_secret` | Password fields for platform-collected Chapa payments |

**`Business Payment Settings`** (one per business):

| Field | Who edits | Default |
|---|---|---|
| `accept_bank_transfer` | Owner/manager | 1 |
| `bank_accounts` | Owner/manager | Table: bank, account name, account number, note |
| `accept_chapa` | Owner/manager | 0 |
| `chapa_secret_key`, `chapa_webhook_secret` | Owner/manager | Password fields, used when the business collects |
| `collection_override` | Platform administrator only | Platform default / Business collects / Platform collects |
| `platform_fee_override` | Platform administrator only | Empty uses the platform fee |

Payment is required when `Organization.require_payment` is on. The amount due now is the policy's booking fee (deposit). When the policy has no deposit, the full price is due now.

### Records

**`Booking Payment`**: one per payment attempt for a booking.

| Field | Purpose |
|---|---|
| `appointment`, `organization`, `customer` | Links |
| `method` | Bank transfer / Chapa |
| `collector` | Business / Platform (snapshot at checkout) |
| `amount`, `currency`, `service_price`, `balance_due` | Snapshot of the checkout amounts |
| `status` | Awaiting payment / Submitted / Paid / Rejected / Expired / Refunded |
| `hold_expires_at` | The deadline (UTC) |
| `reference`, `proof` (private file) | From the customer for a bank transfer |
| `tx_ref`, `checkout_url`, `provider_reference` | For Chapa |
| `reviewed_by`, `paid_at`, `reject_reason` | Staff review |
| `refund_amount`, `refund_reference`, `refund_proof`, `refunded_at` | Manual refund record |
| `reminder_sent` | The bank-transfer reminder went out |

**`Platform Ledger Entry`**: the wallet. Kind Platform fee / Payout due, amount, status Waived / Due / Settled. It links the business, the booking and the payment. An entry is written when a payment becomes Paid.

### Flow

1. Checkout: when payment is required, the booking form shows the amounts, the refund policy and the payment methods the business accepts.
2. `book()` creates the booking as **Pending** with a `Booking Payment` (Awaiting payment, with a deadline). The response carries the payment instructions and the manage link.
3. Bank transfer: the page shows the accounts for the collector, the amount, the booking reference to quote, and the deadline. The customer submits a reference and a screenshot. The payment becomes Submitted, and the deadline stops.
4. Chapa: the server starts a Chapa transaction and the page redirects to Chapa. Chapa returns to the manage page, and the server verifies the transaction. A webhook confirms it as well.
5. Staff review (bank transfer): reception shows the proof. "Confirm payment" marks it Paid. "Reject" returns it to Awaiting payment with a reason and a new deadline.
6. Paid: the booking becomes **Confirmed**, `amount_paid` is set, the ledger entry is written, and the customer gets the confirmation email.
7. A scheduler job runs every 5 minutes. It sends the bank-transfer reminder at half time, and expires unpaid holds: the payment becomes Expired, the booking is cancelled, and the customer gets an email.
8. The manage page shows the payment state and continues payment while it is Awaiting payment.

### Emails

- New events: **Payment request** (on a Pending booking with payment; contains the amount, the deadline and the manage link) and **Payment reminder**.
- Confirmation is sent when the booking becomes Confirmed, including Pending to Confirmed.
- A cancellation for an unpaid hold says the payment was not received.

### Staff UI

- `/settings/payments` (owner/manager): require payment, accepted methods, bank accounts, Chapa keys. It also shows who collects, read-only.
- Reception booking dialog: a payment section with the status, amounts, proof, confirm, reject, and the refund record.
- `/admin/payments` (System Managers): balances per business, the ledger, settling, the platform settings, and per-business exceptions.

### Security

- Proof files are private, at most 5 MB, images or PDF only. Guests reach them only through their manage link.
- Chapa keys are Password fields, never sent to the browser.
- The webhook checks Chapa's signature. Every status change is verified with Chapa's verify API before a booking is confirmed.
- Payment endpoints are rate limited and scoped to the manage link or to staff with access.

### Tests

- Checkout amounts (deposit, full price, no payment), the collector choice (platform default, business override), and the deadline rules.
- Bank transfer: submit, confirm (booking Confirmed, ledger entry, free allowance), reject, expiry (booking cancelled, slot freed), reminder.
- Chapa with a mocked HTTP client: initialize, verify success and failure, webhook signature.
- Refund record. Permissions: another business cannot see or confirm a payment, and a guest cannot read another payment.
- Browser QA through Agent Plane: checkout with bank transfer, proof submission, staff confirmation, the payments settings page, in English and Amharic, desktop and mobile.

## Out of scope

Automatic refunds, payouts through an API, invoices and receipts, collecting the balance online.

## Run record

### What was built

- DocTypes `Payment Settings`, `Business Payment Settings`, `Payment Bank Account`, `Booking Payment` and `Platform Ledger Entry`. Backup `20261003_193459` was taken before the migrate.
- `payments.py`: settings and collector, checkout quote, the hold, proof submission, staff confirm, reject and refund, the ledger, the hold job (every 5 minutes), the business settings API, and the staff proof download.
- `payments_chapa.py`: initialize, verify before confirm, return, callback, the HMAC-signed webhook, and cancelling the checkout when a hold expires.
- `booking.book()` takes `payment_method`. A booking that needs payment starts Pending and returns the payment instructions and the manage path. Paying (Pending to Confirmed) keeps the manage link valid.
- Emails "Payment needed" and "Payment still needed" list the bank accounts and the reference. The confirmation shows what was paid and the balance. An expired hold says the payment was not received.
- Public scheduler: a payment summary (service price, amount due now, balance, refund policy, late fee, method) before Confirm. A held booking continues on the manage page, with a full page load.
- Manage page: payment panel with bank accounts, copy buttons, the reference, the deadline, and a reference and screenshot form. Chapa uses a pay button, auto-start after booking, and a verify on return.
- Reception: a payment section (status, amounts, collector, proof, confirm, reject with reason, refund with proof).
- `/settings/payments` (owners and managers): require payment, bank transfer and accounts, Chapa and its keys. Key fields appear only while keys are set or replaced. Who collects is shown read-only.
- Onboarding: the "Add payment method" step now checks for a real method.

### Found and fixed during the build

- The per-business fee override was a Float that defaults to 0, so every business got a 0 fee. An explicit "Override Platform Fee" switch now guards it.
- Agent Plane refuses to capture screens that show secret fields. The settings page now shows the Chapa key inputs only while someone edits them.
- The long webhook URL widened the mobile settings page to 553 px. It now wraps.
- After booking, the client-side move to the manage page kept the app's own theme toggle, which overlapped the language toggle on mobile. The move is now a full page load.

### Tests

| Suite | Result |
|---|---|
| `appointment.tests.test_payments` | 16 passed |
| `appointment.tests.test_payments_chapa` | 6 passed (mocked HTTP; nothing reaches Chapa) |
| All earlier suites (self-service, notifications, SMS, profiles, policies, overview, workflows) | passed |
| `npm run -s test:dom` | passed |

### Agent Plane runs

`appointment.tests.payments_qa_fixtures.setup` turns on payment for Bloom (one QA account, a 30% booking fee policy). `cleanup` removes it and turns payment off.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00414, 00419 | `payments/guest.yaml` | Passed, 4 of 4 (1440×900 and 390×844, English and Amharic). Checkout shows ETB 500 price, ETB 150 due now, ETB 350 balance, refund policy and late fee. The manage page shows the account, and the reference is submitted. |
| BQA-2026-00415, 00420 | `payments/staff.yaml` (bloom.manager) | Passed, 2 of 2. The manager confirms, the payment is Paid, and the booking is Confirmed. |
| BQA-2026-00416, 00417 | `payments/settings.yaml` | Assertions passed. Captures were refused because the secret fields were visible (fixed above). |
| BQA-2026-00418, 00421 | `payments/settings.yaml` | Passed, 4 of 4. Mobile width 390 px after the wrap fix. |
| BQA-2026-00422 | `customer-notifications/guest.yaml`, English mobile | Passed: a business without payment still books directly. |

All runs had 0 console and 0 network errors. Database check: the two confirmed payments are Paid with their bookings Confirmed, `amount_paid` 150 and balance 350. The two submitted payments are waiting. The QA data was removed afterwards.

### Left open

- Chapa has not been called for real. It needs the keys (test keys work) and the webhook set up in the Chapa dashboard. The URL is shown on the settings page.
- Automatic refunds and payouts through the Chapa API are not built.

### Closed after the first build

- The public scheduler is translated: the service list (`serviceSelector.*`), the header step, back and theme labels (`schedulerPage.*`), and the details form with its validation messages and booking summary (`bookingForm.*`). The summary date follows the page language. Patch `import_booking_form_translations` imports the Amharic copy.
- Platform administrators have an **Administration › Payments and ledger** page (`/admin/payments`, `payments_admin.py`, System Manager only):
  - Totals and balances per business: fees due, payouts due, settled, who collects, and an "Exception" badge when a business differs from the platform default. On phones the balances and the ledger are cards.
  - The ledger, newest first (up to 200), filtered by business, status and type. Due entries can be selected and marked settled with a reference. A business's "Settle all due" does the same for all its due entries. The note records who settled and when, always in English, because it is a stored record.
  - Platform settings: who collects, the fee type and value, the free allowance, platform bank accounts, and the platform Chapa keys (inputs appear only while keys are added or replaced).
  - Per-business rules: who collects (platform default, business, or platform) and an own fee. The platform must have a bank account before it collects for a business.
  - Tests: `appointment.tests.test_payments_admin`, 5 passed, with or without QA data on the site. Patch `import_admin_payments_translations` imports the Amharic copy.
  - Verification: BQA-2026-00429 (`admin-payments/admin.yaml`, Administrator) passed 4 of 4 at 1440×900 and 390×844 in English and Amharic, with 0 console and 0 network errors. English desktop set a fixed 25 ETB fee with 2 free bookings and settled one entry from the ledger; Amharic desktop gave Bloom its own 10 ETB fee and settled the rest from the balances table. The database matched: both entries Settled with their references, the platform fee Fixed 25, and free bookings 2. Earlier runs 00426–00428 fixed manifest selectors; 00428 showed that the settle note took the page language and that the mobile table hid its actions, both fixed. `admin_payments_qa_fixtures.cleanup` removed the QA entries and reset the settings.
- Verification: BQA-2026-00425 (`booking-form/guest.yaml`) passed 4 of 4 at 1440×900 and 390×844 in English and Amharic, with 0 console and 0 network errors. Each scenario submits the empty form and sees the translated errors; nothing is booked. BQA-2026-00423 and 00424 found one hidden duplicate label in the assertion and the untranslated Back button, both fixed.
