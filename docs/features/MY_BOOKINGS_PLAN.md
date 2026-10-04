---
tags: [plan, appointment, customers, self-service]
created: 2026-10-04
status: built and verified 2026-10-04
---

# My bookings plan

## Problem

A customer reaches a booking only through its own manage link, which arrives in each email. Nothing lists a customer's bookings with a business, so a returning customer has to search their inbox.

## Decisions (2026-10-04)

1. **Per business:** the page lives at `/<business>/my-bookings`, in the business's branding. It lists only that business's bookings, which matches how customer profiles are kept per business.
2. **Sign-in by emailed one-time link:** the customer enters their email and receives a link. The link works once, for 30 minutes, and opens a session on that device for 7 days. There is no password.

## Design

### Server (`appointment/scheduler/my_bookings.py`)

| Method | Who | Purpose |
|---|---|---|
| `request_link(slug, email, language)` | Guest, rate limited (5 per 10 minutes per IP) | Always answers "if this email has bookings, we sent a link". It queues the email only when the business has bookings or a customer profile for that address, and sends at most one link per address per 2 minutes. |
| `open_link(slug, token)` | Guest | Checks the one-time link (signature, expiry, not used before) and returns a session token valid for 7 days. |
| `bookings(slug, session)` | Guest | Upcoming and past bookings for the session's email at this business. |

- **Tokens:**
  - The link token is `<nonce>.<expiry>.<signature>` over the business, email, nonce and expiry, signed with the site's encryption key, as manage links are.
  - The nonce is kept in the cache until it expires; using it deletes it, which makes the link one-time.
  - The session token is signed in the same way, with its own purpose and the 7-day expiry. It is stateless.
- **Who the bookings belong to:** bookings of this business whose `client_email` matches (case-insensitive), plus bookings linked to the customer profile with that `email_key`. Merged profiles follow `merged_into`.
- **Each row:** reference, service, provider or room, start in the booking's time zone, status, quantity, and the payment status. Open bookings (Pending or Confirmed, not yet started) also carry their manage link, so changes keep using the existing self-service rules.
- **Email:** "Your bookings with {business}" with one button, in the customer's language, through Email Queue. It is not tied to one booking.

### Page (`/<business>/my-bookings`)

The page has the business's brand, English and Amharic, at desktop and mobile. It has four states:
1. An email form.
2. "Check your email".
3. Opening a link: it exchanges `?token=`, stores the session on the device and removes the token from the address bar.
4. The list: Upcoming and Past, each row opening its manage page, a "Book again" link to `/<business>/book`, and "Sign out".

An invalid or used link explains itself and offers the email form again.

### Links in

- The manage page links "All my bookings".
- Booking emails gain a "See all your bookings" link in the footer.

## Tests

- **Request:** the same answer for a known and an unknown email; email only for a known one; throttled per address.
- **Link:** works once; is refused when expired or tampered; another business's slug cannot open it.
- **Session:** lists only this business's bookings for that email, including profile-linked bookings with another stored address; past and upcoming; manage links only for open bookings.
- **Browser QA through Agent Plane:**
  - the request flow shows "check your email";
  - a fixture-made link opens the list, and a row opens its manage page;
  - a reused link is refused;
  - in English and Amharic, at desktop and mobile.

## Out of scope

A platform-wide list across businesses, passwords or social login, and editing the profile from this page.

## Run record

### What was built

- `my_bookings.py`: `request_link` (the same answer whatever the address; an email only for a known address; one link per address every 2 minutes; rate limited), `open_link` (signed, expiring, one use through a cache nonce) and `bookings` (session bound to the business and the email, with profile-linked and merged bookings included).
- The sign-in email "Your bookings with {business}" uses the customer email template and goes through Email Queue.
- Page `/<business>/my-bookings`: email form, "check your email", link exchange, upcoming and past lists with manage links, "Book again", and "Sign out". The route matcher allows `my-bookings`; route tests were added.
- The manage page links "All my bookings", and every booking email's footer links "See all your bookings".
- Patch `import_my_bookings_translations`.

### Found and fixed during QA

- The page can mount twice while translations load. The second mount asked to open the link again, found it used, and showed "This link no longer works", or failed in the background. One exchange per token is now kept for the page's lifetime, and the token leaves the address bar only after the exchange finishes.

### Tests

| Suite | Result |
|---|---|
| `appointment.tests.test_my_bookings` | 5 passed: the same answer for known and unknown addresses with email only for the known one, and the throttle; a link works once and only for its business, and a tampered or expired link is refused; the session lists this customer's bookings, including profile-linked ones; a session is bound to its email and business. |
| `appointment.tests.test_customer_notifications` | 13 passed, with the footer link counted. |

### Agent Plane run

`appointment.tests.my_bookings_qa_fixtures.setup` books two Bloom appointments for a QA customer. `browser_values` makes four one-time links per run. `cleanup` removes the bookings, the profile and the emails.

| Run | Manifest | Result |
|---|---|---|
| BQA-2026-00491 | `my-bookings/guest.yaml` | Passed, 4 of 4 (English and Amharic, desktop and mobile):<br>• the request shows "check your email";<br>• a link opens the list with both upcoming bookings, and Manage opens the booking with "All my bookings";<br>• reopening a used link shows "no longer works" (its 403 is the only network error);<br>• sign out returns to the form. |

The first attempt hit a full job queue: the scheduler had just been turned on and Agent Plane's artifact retention was catching up (see the scheduler note in the E2E check). BQA-2026-00490 found the double mount above.
