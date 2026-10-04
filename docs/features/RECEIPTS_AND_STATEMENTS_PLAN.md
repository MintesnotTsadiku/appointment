---
tags: [plan, appointment, payments]
created: 2026-10-04
status: built and verified 2026-10-04
---

# Payment receipts and monthly statements plan

## Problem

A customer who pays for a booking gets a confirmation, but no receipt. A business cannot see, per month, what it collected, what it refunded, what it owes the platform and what the platform owes it. The ledger page exists only for the platform administrator. This slice adds receipts and a monthly statement, which completes the wallet from [the booking payments plan](BOOKING_PAYMENTS_PLAN.md).

## Decisions (2026-10-04)

1. **Receipt:** a PDF. It is emailed when a payment is confirmed and when a refund is recorded. The customer downloads it from the manage page, and staff download it from reception.
2. **Numbering:** whoever collected the money issues the receipt. Numbers are a yearly sequence per issuer, with no gaps and no reuse, for example `BOLE-2026-00001`. When the platform collects, the platform's sequence is used.
3. **Tax:** not a tax invoice. The receipt shows the issuer's name and its TIN when one is entered, and says "Payment receipt — not a tax invoice". VAT invoicing is out of scope.
4. **Statement:** a page under Settings › Payments with each month's payments, refunds, platform fees, payouts and balance, downloadable as PDF and CSV. The owner gets it by email on the 1st. The platform administrator sees every business.

## Design

### Records

**`Payment Receipt`** (new). Its data is a snapshot, so a receipt never changes after it is issued. The PDF is rendered from the record on demand.

| Field | Purpose |
|---|---|
| `receipt_number` | Unique. `<PREFIX>-<YEAR>-<5 digits>` from the issuer's series |
| `kind` | Payment / Refund |
| `status` | Issued / Void (a corrected refund voids the earlier refund receipt) |
| `issuer` | Business / Platform |
| `organization`, `booking_payment`, `appointment` | Links |
| `issuer_name`, `issuer_tin`, `issuer_email`, `issuer_phone` | Snapshot |
| `customer_name`, `customer_email` | Snapshot |
| `service_name`, `booking_reference`, `booking_start` (local text) | Snapshot |
| `method`, `reference`, `amount`, `currency`, `balance_due` | Snapshot |
| `issued_at`, `language` | When and in which language |

**Settings fields:**
- `Business Payment Settings`: `receipt_prefix` (from the business name by default) and `tin`, set by owners and managers on Settings › Payments.
- `Payment Settings`: `receipt_prefix` (default `PLT`), `legal_name` and `tin`, set by the administrator on Admin › Payments.

**Notifications:** new events "Payment receipt" and "Refund receipt" on `Appointment Notification`, plus a `receipt` link. They are email only and always sent (the confirmation toggle does not apply), never stale, and deduplicated per receipt.

### Flow

- `payments.mark_paid` issues the payment receipt and queues its email. `payments.record_refund` issues a refund receipt; recording a refund again voids the earlier one and issues a new one.
- Numbers come from Frappe's series counter (`getseries`), inside the same transaction, so a rollback leaves no gap.
- The email carries the receipt PDF as an attachment. The PDF embeds Noto Sans Ethiopic, so Amharic renders.
- Downloads:
  - Guest: `receipts.download(token, receipt)`, through the manage link.
  - Staff: `receipts.download_staff(receipt)`, with booking access.
  - Administrator: allowed for any receipt.

### Statement (`appointment/scheduler/statements.py`)

`statement(organization, month)` uses the business's time zone (its first location's), for the month's local start and end:

- Payments received: paid in the month, with date, receipt, booking, customer, method, collector and amount.
- Refunds: recorded in the month.
- Platform fees: ledger "Platform fee" entries created in the month, with status (Due, Waived, Settled).
- Payouts: ledger "Payout due" entries created in the month.
- Totals:
  - collected by the business, collected by the platform, refunded;
  - fees due, waived and settled; payouts due and settled;
  - **net to the business** = collected by the business + payouts − fees − refunds of payments the business collected.

Downloads: PDF and CSV. A monthly job on the 1st (06:00) emails last month's statement to the owner of every business that had activity, with both files attached.

### UI

- **Settings › Payments:** a "Receipts" section with the prefix and TIN, and a "Monthly statements" section with a month picker, the totals, and PDF and CSV downloads.
- **Manage page:** "Download receipt" when paid, and "Download refund receipt" when refunded.
- **Reception payment section:** receipt numbers with download links.
- **Admin › Payments:** platform receipt details (legal name, TIN, prefix) in Platform settings, and a "Statement" action per business with month downloads.

### Tests

- Numbering: sequential per issuer and year, platform-collected payments use the platform series, and a rollback leaves no gap.
- Receipt: issued once on paid, a refund receipt on refund, a corrected refund voids the earlier one, and the receipt email has a PDF attachment.
- Access: guest download through a valid manage link only, staff of another business refused, administrator allowed.
- Statement: totals for a month with a business-collected payment, a platform-collected payment, a refund, fees and payouts; month boundaries in the business time zone; CSV columns.
- Monthly job: emails the owner once per month for businesses with activity, and skips businesses without.
- Browser QA through Agent Plane: manage-page receipt download, reception receipt, the statements section, and admin receipt settings, in English and Amharic, at desktop and mobile.

## Out of scope

VAT or tax invoices, credit notes beyond refund receipts, statements spanning several months, payout transfers.

## Run record

### What was built

- DocType `Payment Receipt`. New fields: `receipt_prefix` and `tin` on `Business Payment Settings`; `legal_name`, `receipt_prefix` and `tin` on `Payment Settings`; the events "Payment receipt" and "Refund receipt" and a `receipt` link on `Appointment Notification`. Backup `20261004_130233` was taken before the migrate.
- `receipts.py`:
  - Issues receipts from `payments.mark_paid` (once per payment) and `payments.record_refund` (a corrected refund voids the earlier refund receipt).
  - Numbers come from `getseries` per issuer and the business's local year. Receipts store a snapshot of the payment, render the PDF on demand, and have guest and staff downloads.
- Receipt emails go through the notification pipeline: email only, always sent, never stale, deduplicated per receipt, with the PDF attached. A payment receipt carries the manage link; a refund receipt does not.
- `statements.py`:
  - Monthly data in the business's time zone (`Organization.timezone`, else its first location's), with CSV and PDF output.
  - Downloads for owners, managers and administrators.
  - `send_monthly_statements` runs on cron `0 6 1 * *`, once per business per month (tracked in a default value).
- UI:
  - Settings › Payments: "Receipts" (prefix and TIN) and "Monthly statements" (month, totals, PDF and CSV).
  - The manage page links each receipt once the booking is paid or refunded.
  - The reception payment section links each receipt.
  - Admin › Payments: a per-business statement for a chosen month, and the platform legal name, prefix and TIN.
- Patch `import_receipt_translations` imports the Amharic copy, including the PDF labels and the email copy.

### Found and fixed during the build

- The bundled Noto Sans Ethiopic is a variable font. wkhtmltopdf's QtWebKit cannot render variable fonts, so Amharic came out as boxes. A static Regular instance (`appointment/public/fonts/pdf/noto-sans-ethiopic-regular.ttf`, made with fontTools from the bundled font, with its OFL licence beside it, sha256 `1d2a49a0…a1df`) is inlined as a data URI. Frappe's `get_pdf` turns off local file access, so a `file://` font would not load.
- `now_datetime()` is system time (Asia/Kolkata on this site). Receipts store `issued_at` in UTC and show it in the business's time zone.
- The manage page shows its payment panel only while a payment is open, so receipt links are shown with the paid or refunded line instead.
- Download links use `download`, so the browser does not turn a navigation into an aborted request.
- The template test for notification events now treats "Refund receipt" like "Cancellation": no manage link.

### Tests

| Suite | Result |
|---|---|
| `appointment.tests.test_receipts` | 11 passed: numbering, platform series, no gap after a rollback, the refund and void receipts, the PDF attachment, downloads and access, prefix and TIN, statement totals for business and platform collection, statement access, the monthly email sent once |
| Payments, Chapa, payments admin, notifications, SMS, self-service | passed |
| `npm run -s test:dom` | passed |

The Amharic receipt and statement PDFs were checked visually: Ethiopic text renders, and every label is translated.

### Agent Plane runs

`appointment.tests.receipts_qa_fixtures.setup` turns on payment for Bloom, sets the QA prefix `QARC` and a TIN, and books two paid bookings, refunding the second. `cleanup` removes the bookings, receipts and settings, and the `QARC` series, so no business sequence has a gap.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00455 | `receipts/guest.yaml` | Passed, 4 of 4 (1440×900 and 390×844, English and Amharic). The manage page lists `QARC-2026-00002` and refund receipt `QARC-2026-00003`; the download saved `QARC-2026-00002.pdf`. |
| BQA-2026-00456 | `receipts/owner.yaml` (bloom.owner) | Passed, 4 of 4. Settings show the prefix, the TIN and October's totals (510.00 collected, 100.00 refunded, 410.00 net). The PDF and CSV statements and a reception receipt downloaded. The CSV lines and totals match. |
| BQA-2026-00457 | `receipts/admin.yaml` (Administrator) | Passed, 2 of 2. The per-business statement PDF downloaded, and the platform receipt fields show. |

All runs had 0 console and 0 network errors. Earlier runs 00449–00454 found the hidden manage-page links, the download aborts, and a manifest selector that matched the hidden mobile card. All of them are fixed.

### Left open

- The monthly email is covered by a test. It has not run on this site, because the scheduler is paused and email is muted.
- VAT invoices and payouts through an API are out of scope.
