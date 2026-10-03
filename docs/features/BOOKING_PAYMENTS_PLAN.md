---
tags: [plan, appointment, payments]
created: 2026-10-03
status: decided 2026-10-03, in build
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
- Platform settings and per-business overrides are in Desk for the administrator.

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

Filled in after the build.
