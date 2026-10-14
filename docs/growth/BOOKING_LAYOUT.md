# Booking layout and states

This document describes the layout of the customer booking pages and the shared loading, empty, unavailable, error and offline states.

## Scope

The layout applies to these pages:

- The organization scheduler: `/schedule/org/<slug>` (services) and `/schedule/org/<slug>/<service>?type=<offering>` (time).
- The provider page: `/schedule/p/<slug>`.
- The independent scheduler: `/schedule/p/<slug>/<offering>` and `/schedule/individual/<offering>`.
- The reschedule panel on the manage page: `/<slug>/booking/<token>` and `/schedule/individual/booking/<token>`.

The states apply to the same pages, to My bookings, to the public website shell (`/<slug>`, `/<slug>/book`) and to the route error page.

## The time picker

All schedulers use one component: `frontend/src/pages/booking-v2/components/DateTimeSelector`. The picker measures its own width. At 900 px and wider it uses the wide layout. Below 900 px it uses the narrow layout. The manage page always uses the narrow layout, because the picker is inside a narrow card.

### Wide layout (desktop)

- The side column is sticky under the page header. It holds the summary (service, duration, provider, place or online platform), the quantity picker, the month calendar, the time format control and the time zone line.
- The provider filter is in the side column when the day has more than one provider.
- The "Booking information" notes are behind a disclosure button next to the time zone. They no longer take space under the page.
- The slot panel is as high as the window. Its heading shows the day, the number of open times and buttons for the previous and next open day.
- The slot list scrolls inside the panel. The headings "Morning", "Afternoon" and "Evening" stick to the top of the list.
- When the customer chooses a slot, a bar appears under the slot panel. It shows the day, the time and the provider, for example "Thu, Oct 15 · 11:00 AM · With Selam Bekele", and the Continue button. The panel becomes shorter by the height of the bar. The side column keeps its full height.
- Quiet links (My bookings, Powered by) are at the foot of the side column. The page does not scroll below the picker.

### Narrow layout (phone)

- The summary, the quantity picker and the time format control are at the top.
- A strip of days sticks under the page header. It shows the next 60 days. Each day shows a dot when it is open. "Today" and "Tomorrow" are next to the month name.
- The month name opens the full calendar in place of the strip. The calendar closes when the customer picks a day.
- The provider filter is a row in the strip.
- The slot list scrolls with the page. Its group headings stick under the strip.
- When the customer chooses a slot, a bar appears at the bottom of the screen with the chosen time and Continue. The page gets space under the list, so the bar does not cover the last row.

### Next step

Choosing a slot does not leave the picker. The bar shows the time. The customer can change the time and then select Continue.

- Organization scheduler: Continue opens the details form.
- Independent scheduler: Continue opens the details step. "Change time" returns to the picker with the same slot selected.
- Reschedule: the bar button is "Move my booking". It saves the new time.

Pages that do not pass an `action` keep the older behavior: `onSlotSelect` moves on at once. The individual meeting page (`/schedule/in/<id>`) uses this.

### Behavior that stays

- The best slot shows a "Best" badge.
- The time format control has 12-hour, 24-hour and Habesha time. Independent schedulers in Amharic start with Habesha time.
- Branded pages use the published template tokens (`useBookingBrand`, `platform.css`, `data-booking-branded`).
- Online offerings show "Online video · <platform>". Offices show the name and the address.
- The quantity picker and the referral code from a friend's link work as before.

### Accessibility

- Each slot, day and filter is a button with `aria-pressed`.
- The calendar uses `grid`, `row` and `gridcell` roles. The buttons are inside the cells.
- The bar text is a polite live region.
- The focus order is: side column, slot list, bar.
- With reduced motion, the shimmer and the transitions stop.

## The service chooser (organization)

- The business summary is at the top: logo, name, description, number of services and the provider.
- Under the page header, a sticky bar shows the category tabs and the number of services. After the summary scrolls away, the bar also shows the business logo and name.
- Category tabs show only when the services have more than one type.
- With more than one provider, the providers are a row that scrolls sideways. Select a provider to show only their services.
- The services are a grid of cards: name, price, provider, two lines of description, duration and "Book appointment".

## The provider page

- On desktop, the profile and the places are a sticky column. The services scroll on the right.
- With four services or more in both formats, chips filter the list: All, Online sessions, In-person sessions.

## Shared states

All states are in `frontend/src/components/booking-states`. They use the booking tokens of the page, so they follow the brand and the light or dark mode. The public website shell uses `frontend/src/public-experience/PublicStates.tsx`, which maps the published design to the same tokens.

| State | Component | Where |
| --- | --- | --- |
| Loading a business | `ServicesSkeleton` | Organization services |
| Loading a scheduler | `TimePickerSkeleton` | Organization and independent schedulers |
| Loading times of one day | `SlotListSkeleton` | Slot panel |
| Loading a provider page | `ProviderPageSkeleton` | Provider page |
| Loading a booking | `BookingCardSkeleton` | Manage booking, My bookings |
| Loading a website | `SitePageSkeleton` | Public website and booking handoff |
| Loading a journal or gallery | `PublicContentLoading` | Template content pages |
| Unknown or unpublished page | `BookingState` (`not-found`, `unavailable`) | All schedulers, provider page, website |
| Server or network error | `BookingState` (`error`) with Try again | All schedulers, provider page, website, route errors |
| No open times on a day | `BookingState` (`empty`) with "Show the next open day" | Slot panel |
| Expired link | `BookingState` (`unavailable`) | Manage booking, My bookings |
| Offline | `BookingOfflineNotice` | All public pages |

`BookingState` shows a drawing of two calendar cards with a badge for the state, a title, a reason and one or two actions. A 403 or 404 answer shows the unavailable state at once, with no retry. A server or network error shows Try again.

Offline, public pages keep their content and the customer's choices. A notice at the top says that open times update after the connection comes back. Staff pages keep the full-screen offline message.

### Preview of states

Local servers answer fast, so a skeleton shows for a moment only. In development builds, the address parameter `?preview-state=` holds a page in one state: `loading`, `error`, `unavailable`, `empty` or `offline`. Production builds ignore the parameter.

## Browser QA

| Manifest | Covers |
| --- | --- |
| `qa/manifests/growth/booking-layout.yaml` | Selam, Bloom and Yared on desktop, Selam and Rahel on a phone (en, light) |
| `qa/manifests/growth/booking-layout-am-dark.yaml` | Selam and Rahel on desktop, Bloom and Yared on a phone, states (am, dark) |
| `qa/manifests/growth/booking-layout-states.yaml` | Unknown addresses, expired links, skeletons, error, no times, offline (en, light) |

These manifests need no fixture and book nothing. Existing booking manifests now select Continue (`[data-qa="booking-continue"]`) after they choose a slot.

## Screenshots

Before (dark, desktop and phone): `/tmp/agent_browser_qa/booking-layout-before/`.

After: the artifact folders of the manifests above, under `/tmp/agent_browser_qa/appointment-growth-booking-layout/`, `/tmp/agent_browser_qa/appointment-growth-booking-layout-am-dark/` and `/tmp/agent_browser_qa/appointment-growth-booking-states/`.
