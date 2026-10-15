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

### Wide layout (laptop and desktop)

The owner asked for this layout on 2026-10-15: at 100 % zoom on a laptop, everything important is in view without a page scroll, only the slot list scrolls, and the chosen time is at the top, next to the list.

- The page fits the window: the header, the side column and the slot panel together are as high as the window. The page does not scroll. Only the slot list scrolls, inside its panel.
- The side column holds, from the top:
  - A compact summary card: the service photo in a small frame of the skin's shape (68 × 84 px; 88 × 108 px when the window is 860 px high or more) beside the business name, the service name and one wrapped row of facts (duration, provider, place). The address is one line; its full text is in the tooltip.
  - The quantity picker, when the offering allows more than one person.
  - The month calendar. Its rows are 32 px high (28 px below 720 px, 40 px from 860 px, 44 px from 1000 px), so it uses the room that the window gives.
  - A footer row at the bottom of the column: "Booking information" and the quiet links (Powered by, or My bookings and Powered by on the provider scheduler). "Booking information" opens the notes in a popover above the button, so the column never grows.
- The slot panel holds, from the top:
  - The header: the day ("Thursday, October 15"), the number of open times and the time zone ("6 slots available · Addis Ababa time") on the left; the time format (12-hour, 24-hour, Habesha) and the buttons for the previous and the next open day on the right.
  - The provider chips ("Any provider" and one chip per provider), when the service has more than one provider. A long team scrolls sideways.
  - The "Your time" bar. Before a choice it says "Pick a time". After a choice it shows the day, the time, the provider, the service and its length, for example "Thu, Oct 15 · 3:00 PM · With Selam Bekele · Movement consultation · 45 min", and the Continue button. The bar has the same height in both states, so nothing moves when the customer chooses a time.
  - The slot list. It is the only part that scrolls. The headings "Morning", "Afternoon" and "Evening" stick to its top.
- There is no bar at the bottom of the screen on wide layouts.
- The column scrolls on its own only when the window is too short for it (below about 680 px with the quantity picker).

| Window | Side column (summary, calendar, footer) | Slot panel |
| --- | --- | --- |
| 1280 × 720 | All in view: summary 88–244 px, calendar 269–573 px, footer 645–704 px. | Header, providers, "Your time" (203–265 px with providers), list 269–703 px. |
| 1366 × 768 | All in view; the footer moves down to 752 px. | The list is 48 px longer. |
| 1440 × 900 | All in view, with the larger photo and 40 px calendar rows. | The list runs to 883 px. |
| 1920 × 1080 | All in view, 44 px calendar rows. | The list runs to 1063 px. |

The numbers are from the Bloom and Selam showcases (`booking-fit.yaml`).

### Narrow layout (phone)

- The summary (a small photo frame beside the name), the quantity picker, the time format control, the time zone and "Booking information" are at the top. They scroll away.
- A strip sticks under the page header. It holds the month name with "Today" and "Tomorrow", a row of the next 60 days (a dot marks an open day), the provider chips and the "Your time" row ("Your time · Pick a time", then "Fri, Oct 16 · 4:00 PM · With Selam Bekele · …").
- The month name opens the full calendar in place of the strip. The calendar closes when the customer picks a day.
- The slot list scrolls with the page. Its group headings stick under the strip.
- After a choice, a compact bar at the bottom of the screen shows the time again and a wide Continue button. The page gets space under the list, so the bar does not cover the last row.

We kept Continue at the bottom on phones, and not in the "Your time" row at the top. On a 390 × 844 phone held in one hand, the top of the screen is the hardest place for the thumb to reach, and the bottom is the easiest. The customer reads the chosen time at the top, next to the days, and confirms it at the bottom, where the thumb already is. The rule is by window width: below 900 px, Continue is at the bottom. The manage page on a laptop keeps Continue in the "Your time" row.

### The first day

The picker opens on today. When today has no open time left (late in the day, a closed day, or everything is taken), it opens on the next open day and says so above the slot list: "No times left today — showing Fri, Oct 16". When the page opens on another day that has no open time (for example the day chosen before for another service), the note is "No open times on Tue, Oct 20 — showing Wed, Oct 21". With Habesha time the days in the note are Ethiopian dates ("ዛሬ የቀረ ክፍት ሰዓት የለም — ዓርብ፣ ጥቅምት 6 ይታያል").

- It applies to every picker: the organization scheduler, the provider and independent scheduler and the reschedule panel. The independent scheduler and the reschedule panel used to open on "Pick a date"; they now open on a day too.
- The picker steps one open day at a time by the calendar rules (open weekdays, the booking window), up to 31 steps, and stops at the first day whose list (with the chosen provider filter) has an open time. If it finds none, it stays on the first day and shows its empty state.
- It decides that a day is empty only after the page has given it that day's list, so it never moves on a list that is still loading. While it steps, the slot list shows its loading state.
- Any day the customer chooses (calendar, strip, Today, Tomorrow, previous and next day, "Show the next open day") ends it and removes the note.
- Code: `DateTimeSelector/openingDay.ts` (`useOpeningDay`). The note is a polite status (`role="status"`, `data-qa="booking-next-open-note"`).

Because of this, the booking journey manifests do not depend on the time of day: on the time picker, the first open time is on the day the picker opens on.

### Coming back to the picker

When the customer comes back from the details ("Back" on the organization scheduler, "Change time" on the provider scheduler), the chosen time stays selected and comes into view: in the middle of the slot list on wide layouts, in the middle of the screen on phones.

### Habesha time and the Ethiopian calendar

The time format control has 12-hour, 24-hour and Habesha time. On Amharic pages the picker starts with Habesha time on every scheduler (organization, provider and reschedule), through `usePickerTimeFormat()`. The customer's choice in the control wins, stays when the language changes and is kept for the tab's session (`sessionStorage`, `booking-time-format`).

Habesha time switches the whole picker to the Ethiopian calendar (owner, 2026-10-15), not only the clock:

- The month calendar becomes an Ethiopian month grid (`DateTimeSelector/EthiopianCalendar`): Ethiopian month names (መስከረም … ጳጉሜ on Amharic pages, Meskerem … Pagume on English pages), Ethiopian day numbers and navigation by Ethiopian month. There are 13 months; Pagume has 5 days, 6 in a leap year. The weekday headers follow the page language. 12-hour and 24-hour keep the Gregorian calendar.
- Every cell is the same Gregorian day underneath. Open days (the dot), today, past and closed days and the chosen day are exactly those of the Gregorian calendar. The page, the address and the API keep Gregorian dates.
- Both grids are one component (`MonthGrid`): the same look and keys. Arrow keys move between days, Home and End go to the start and end of the week, Page Up and Page Down change the month. Each day's accessible name is the full date of its calendar ("ሐሙስ፣ ጥቅምት 5 ቀን 2019", "Thursday, Tikimt 5, 2019").
- The day title, the phone's strip of days (Ethiopian day numbers, the Ethiopian month next to "Today"), the "Your time" bar, the details summary and the confirmation show the Ethiopian date with Habesha time, for example "ሐሙስ፣ ጥቅምት 5 ቀን 2019 · ሰዓት 3:00 ጠዋት".
- The conversion is in `frontend/src/lib/ethiopian-calendar.ts`, the twin of `appointment/growth/ethiopian_calendar.py` and `public/js/tools/ethiopian-calendar.js`, with the month names (the same as the twins; month 13 is spelled ጳጉሜ everywhere, also where the browser's own Ethiopic calendar writes ጳጉሜን), month lengths, the month grid and the dates in words. The template kit re-exports the conversion (`templates/kit/core/holidays.ts`), so template packages still import only the kit. `tests/ethiopian-calendar.test.mjs` checks it against the shared vectors (`appointment/growth/vectors/ethiopian_calendar.json`), for example 15 October 2026 = Tikimt 5, 2019, and Pagume of 2018 (5 days) and 2019 (6 days).
- The details form and the confirmation now use the picker's clock. Before, they always showed Habesha time on Amharic pages, even when the customer chose 12-hour.

### Unselecting a time

Choosing the chosen time again unselects it: the slot is no longer pressed (`aria-pressed="false"`), and the "Your time" bar goes back to "Pick a time" at the same height, so nothing moves. Enter and Space do the same on a focused slot. The bar text is a polite live region, so a screen reader hears "Pick a time". Pages opt in with `onSlotClear`; the organization, provider and reschedule pages do.

### Next step

Choosing a slot does not leave the picker. The "Your time" bar shows the time. The customer can change the time and then select Continue.

- Organization scheduler: Continue opens the details form.
- Independent scheduler: Continue opens the details step. "Change time" returns to the picker with the same slot selected.
- Reschedule: the button is "Move my booking". It saves the new time.

Pages that do not pass an `action` keep the older behavior: `onSlotSelect` moves on at once. The individual meeting page (`/schedule/in/<id>`) uses this.

### Taken times

Taken times stay in their place, so the day keeps its rhythm. They have no frame, no line-through and no provider name, and their opacity is 42 %. Their accessible name still says "already booked", and the button is disabled. We kept them, and did not hide them, because a customer then sees that the day exists and is busy. The screenshots of the journey runs show a calmer list than before.

### Behavior that stays

- The best slot shows a "Best" badge.
- Branded pages use the published template tokens (`useBookingBrand`, `platform.css`, `data-booking-branded`).
- Online offerings show "Online video · <platform>". Offices show the name and the address.
- The quantity picker and the referral code from a friend's link work as before.

### Accessibility

- Each slot, day and filter is a button with `aria-pressed`.
- The calendar uses `grid`, `row` and `gridcell` roles. The buttons are inside the cells.
- The "Your time" text is a polite live region.
- The focus order is: side column, slot panel header, provider chips, "Your time" (Continue), slot list. On phones Continue is last.
- "Booking information" is a popover button (`aria-expanded`); Escape closes it.
- With reduced motion, the shimmer and the transitions stop.

## The service chooser (organization)

- The business summary is at the top: logo, name, description, number of services and the provider. The logo is the business logo. When the business has no logo, the page uses the compact logo of the published website. The first letter of the name shows only when neither exists.
- Under the page header, a sticky bar shows the category tabs and the number of services. After the summary scrolls away, the bar also shows the business logo and name.
- Category tabs show only when the services have more than one type.
- With more than one provider, the providers are a row that scrolls sideways. The first chip is "Any provider". Select a provider to show only their services.
- The page shows one card per service, not one card per offering. An offering is one service with one provider at one place (`EventType`). Bloom has three services and three stylists, so the page shows three cards, not nine.
- Each card shows the service photo, the name, the price, two lines of description, a group of the provider portraits, "Any provider" (or "With Hanna" when a provider chip is on, or when one provider gives the service), the duration and "Choose a time".
- When the offerings have different prices, the card shows the lowest price as "from ETB 850".
- The whole card is one button. Select it to open the time picker for the service with any provider: `/schedule/org/<slug>/<offering>?type=<offering>&with=any`. When a provider chip is on, the card opens the offering of that provider with `with=<provider>`.

### Service photos and names

- The service photo is the photo that the published website shows for the service (the `services` section item with the same `id` as the `Service`).
- When the website item has no photo, the template skin gives a photo by the item's place in the section. Bloom uses `menu1.bloom`, `menu2.bloom` and `menu3.bloom`, the same photos as the landing page.
- Without a published website, the card has no photo. The layout closes the gap.
- The card uses the website's name and summary of the service in the page language. Without them, it uses the `Service` name and description.
- `appointment.public_experience.service_media.for_organization` reads these facts from the active release. It returns only local image paths (`/assets/appointment/…` or `/files/…`). `get_organization_services` and `get_organization_meeting_windows` return `image`, `photo_index`, `local_name` and `local_description`.

## One service, several providers

- `appointment.scheduler.booking.sibling_offerings` finds the public offerings of the same business service: the anchor offering first, then the other providers' offerings (at most 24). The offerings can be at different places. An independent provider gets the anchor only.
- `get_organization_meeting_windows` returns `offerings`: each offering with its provider, duration, price and place.
- `appointment.scheduler.booking.service_slots(offering_id, date, organization_id, quantity)` returns the times of all these offerings for one day. Each row has its `offering_id`. It is a guest method with the same limit as `slots` (120 requests in 60 seconds) and the same rules (`offering(public=True)` and `open_slots`). It is in the edge allow list.
- The time picker shows the filter "Any provider" and one chip per provider. The filter starts from `with`: `with=any` starts with any provider, `with=<provider>` starts with that provider, and a link without `with` (an older offering link) starts with the provider of that offering. A change of the filter writes `with` into the address.
- With "Any provider", the list shows one time per start. The time goes to one of the providers who are free then, in turn by the time of day, so that the bookings spread over the team. A time is taken only when all providers are taken.
- The booking, the payment quote, the details form and the confirmation use the offering of the chosen time: its provider, place, duration and price.
- The summary shows the place of the chosen time, else the place of the selected provider, else "2 places" with the names.

## The booking handoff

- Every certified template links each service on its `/book` page to that service's time picker with any provider. The snapshot API returns these paths in `bookingPaths` (service id to path) for organizations as well as for independent providers.
- Bloom v3 shows each service as a row with the photo, the name, the duration, the price, the next free time and a round marigold arrow. The whole row is one link. A plain click moves inside the app, so the scheduler opens without a full reload.
- The v2 templates (Bloom, Selam, Tena, Abugida, Meron) link the service name. Ergata already linked each session.
- On an Amharic website, the paths get `lang=am`. The scheduler then continues in Amharic.
- The website and the booking pages share one light or dark choice. Each saves the choice in both `pe-display-mode` and `vite-ui-theme`.

## The details form

- Each field has its own icon (person, phone, envelope, message) in the muted text colour. The icon takes the accent colour while the field has focus. Before, a 20 % opaque box hid the icon, so the field showed an empty dark square.
- The summary rows have icons in a light accent tile. The service row shows the service photo in the skin's frame.
- The time zone row says "Addis Ababa time" ("የአዲስ አበባ ሰዓት"), the same label as the confirmation. The time uses the picker's clock (Habesha time on Amharic pages). The price is formatted ("ETB 850").
- The form has no entrance animation. The confirm button is the booking action of the skin.

## Booking skins

The booking pages are conversion pages: speed and clarity first. They must feel like the same place as the landing page, but they get no parallax, no marquee, no count-up and no large moving image.

One shared flow (`pages/organization-appointment`, `booking-v2` components) keeps one interaction model. Each template package can give a small skin. The contract is in `docs/design/TEMPLATE_V3_KIT.md`, "Booking skins". The shared parts are in `frontend/src/pages/booking-v2/components/skin/`:

| Part | What it does |
| --- | --- |
| `useBookingSkin(config, brandStyle, mode)` | The skin of the published design (`templates/booking-skin.ts`), else the default skin. It adds the skin tokens to the brand variables and gives `data-bk-skin` and `data-bk-frame`. |
| `BookingSteps` | "Service → Time → Details → Done" in the page header. On screens below 900 px it is a thin progress line along the bottom edge of the header. The current step is announced. The skin can draw each mark. |
| `BookingBackdrop` | The faint page background: the smallest file of the skin's backdrop photo (the night photo in dark mode), blurred, behind the page. It covers the whole viewport, so it is never the largest paint. |
| `ServicePhoto` | The service photo in the skin's frame, with the AVIF and width files of a packaged photo. Always lazy. |
| `skin.css` | Shared defaults and the tokens: `--bk-action-*`, `--bk-header-*`, `--bk-frame-line`, `--bk-backdrop-*`. |

Each template's `booking.css` is its own file. The skin gives it as `style: () => import("./booking.css")`, and `useBookingSkin` loads it (once) when the page knows the published design. Before, the five skins were one shared file of 17.1 KB (3.3 KB compressed) that every booking page loaded; now a page loads only its template's file, 0.9 to 1.4 KB compressed (Bloom 0.9, Abugida 0.9, Ergata 1.0, Selam 1.0, Meron 1.2, Tena 1.4). A page without a skin loads none. `tests/booking-skin.test.mjs` fails when a skin imports its CSS statically.

Motion on the booking pages is limited to: the view transition from the landing "Book" action into the handoff (kit `bookingTransition`), a short scale on the chosen time and the chosen service card (220 ms, off with reduced motion) with `haptic("select")`, and the template's success moment. The details form, the time picker and the service grid have no entrance animation.

Templates without a skin (v1, v2 and Ergata until phase 3) get the default skin: the brand colours and type, rounded frames, the shared grid pattern and no backdrop. Their pages look as before, with the fixes above.

### Bloom v3

| Page | Bloom's skin |
| --- | --- |
| Handoff (`/bloom-studio/book`) | The template's own page: the booking band as the stage, the glass panel, the service rows as links with photo, price, next free time and a marigold arrow. |
| Header (all steps) | Deep plum in light and dark, like the landing bar, with the marigold, rose and rose-gold line of the handoff. The steps use small round-top mirrors: marigold for the current step, rose gold with a tick for a done step. |
| Page background | A faint, blurred echo of the booking band (`band-w640`, 11 KB AVIF; `band-night-w640` in dark mode). No grid pattern. |
| Service chooser | Anton headings (Noto Sans Ethiopic Condensed 900 in Amharic). The brand logo. Service photos in round-top mirror frames with a rose-gold line. Oval stylist portraits. |
| Time picker | The service photo in a small mirror frame beside the service name. Pill-shaped times, mirror-topped days. The chosen time is plum, never marigold. The Continue button is marigold with Bloom's offset shadow (a soft glow in dark mode). |
| Details | The service photo in the summary. The marigold confirm button. |
| Confirmation | The petals (`BloomMoment`). |

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
| `qa/manifests/growth/booking-fit.yaml` | The picker fits the window: Bloom, Selam, Tena, Abugida, Meron and Rahel (default skin, provider scheduler) at 1280 × 720, 1366 × 768, 1440 × 900 and 390 × 844; every site in en and am, light and dark. Summary, calendar, time format, zone, footer and "Your time" inside the window with no page scroll; the last open time of a day chosen; "Your time" and Continue in view; Continue opens the details. |
| `qa/manifests/growth/booking-ethiopian.yaml` | Habesha time and the Ethiopian calendar (fixture `appointment.tests.booking_ethiopian_qa_fixtures`, values only): today's Ethiopian day and month checked against the Python twin, a day and a time, unselect and choose again, the Ethiopian date in the details, Pagume by month navigation (Selam en desktop, Bloom am desktop dark, Tena en phone, Rahel am phone dark). |

These manifests need no fixture and book nothing. Existing booking manifests now select Continue (`[data-qa="booking-continue"]`) after they choose a slot.

`qa/manifests/growth/booking-journey-bloom.yaml` (fixture `appointment.tests.template_bloom_v3_qa_fixtures`, setup before, cleanup after) follows one customer through Bloom: the landing page, the `/book` handoff (select a service row), the time picker with any stylist, back to the service chooser (three cards, the stylist filter), the time picker, the details (phone first) and the confirmation with the petals. It runs in English on a desktop in light mode, and in Amharic on a phone in dark mode with the Hanna filter. The fixture cleanup also finds the QA client's bookings by the exact phone number and name, because a phone-first booking has no email.

Manifests that chose a provider's card (`e2e/1-guest`, `resources/guest`, `pools/guest`) now choose the provider chip first, or choose the room in the time picker's filter. Their Amharic scenarios find the card by the website's Amharic service name.

### Fit check

The runner has no bounding-box assertion. In development builds, `?qa-fit=1` (kept for the tab's session) makes the picker write `data-qa-fit` on `[data-qa="booking-picker"]` with the parts that are fully inside the window: `summary`, `calendar`, `format`, `zone`, `footer`, `bar`, `go`, `chosen`, and `no-page-scroll` when the page does not scroll (`DateTimeSelector/fitProbe.ts`). `booking-fit.yaml` waits for selectors such as `[data-qa-fit~="calendar"][data-qa-fit~="no-page-scroll"]`. Production builds never run the probe.

### Runs (phase 3 consolidation, 2026-10-15, evening)

57 manifests on `http://localhost:47800` after the last open time of the day, BQA-2026-00559 to BQA-2026-00615, all passed on the first attempt: the v3 template sets, Ergata 2 and Ergata, the six booking journeys (without the next-day copies: the picker opens on the next open day), booking-fit, booking-ethiopian, booking-layout (3), holiday-moments, amharic-names (2), template-gallery, provider-page (6), touchpoints-guest (2), phone-first (3), controls-independent-booking (2), online-location (3), website-editor (2, restored), marketing-landing (2) and `self-service/customer.yaml`. The same evening the full Frappe suite ran 794 tests with the known `test_data_preservation` failure only.

### Runs (phase 3, 2026-10-15)

| Run | Manifest | Result |
| --- | --- | --- |
| BQA-2026-00481 | `booking-fit.yaml` (24 scenarios) | Passed. (BQA-2026-00430 had 22 of 24: two blank pages from a Vite reload while other agents saved files; it also ran every scenario in light mode, so the manifest now sets `color_scheme` per scenario.) |
| BQA-2026-00425, 00488 | `booking-ethiopian.yaml` | Passed. (BQA-2026-00424 failed on a manifest selector that matched several slots.) |
| BQA-2026-00434, 00435, 00436 | `booking-layout.yaml`, `-am-dark`, `-states` | Passed. The phone scenario now waits for `[data-qa="booking-phone-continue"]`. |
| BQA-2026-00437, 00441 | `booking-journey-bloom.yaml`, `-abugida` | Passed. |
| BQA-2026-00439, 00440, 00444 | `booking-journey-selam.yaml`, `-tena`, `-meron` | Failed in the evening run: the manifests wait for an open time today, and the day had none left ("Next free time: Tomorrow" on the landing page). Copies that first choose the next open day passed: BQA-2026-00492, 00494, 00496. |
| BQA-2026-00447, 00448 | `controls-independent-booking.yaml`, `-am-dark` | Passed. |
| BQA-2026-00450, 00453, 00455, 00457, 00458, 00460 | `provider-page.yaml`, `-am-dark`, `-grow`, `-legacy`, `-short-link`, `-branded` | Passed. |
| BQA-2026-00467, 00470, 00474 | `phone-first.yaml`, `-am-dark`, `-walkin` | Passed. |
| BQA-2026-00477 | `self-service/customer.yaml` (reschedule on the manage page) | Passed. |
| BQA-2026-00461, 00464, 00498 | `touchpoints-guest.yaml`, `-dark` | The booking scenarios passed. The "returning customer" scenario failed: its My bookings link answered "This link no longer works" (the token from the fixture, not the time picker). |

### Runs (2026-10-15, before phase 3)

| Run | Manifest | Result |
| --- | --- | --- |
| BQA-2026-00301, BQA-2026-00332 | `booking-journey-bloom.yaml` | Passed, 0 console, 0 network errors. 00332 runs after the confirmation got the skin (Anton heading, brand colours instead of the blue notice). (BQA-2026-00300 failed on a manifest selector that matched three cards.) |
| BQA-2026-00302, 00303, 00304 | `booking-layout.yaml`, `-am-dark`, `-states` | Passed. Console: the known reduced-motion notice; network: the unknown addresses that the states manifest opens on purpose. |
| BQA-2026-00326, 00327 | `controls-independent-booking.yaml`, `-am-dark` | Passed. (BQA-2026-00305 and 00306 opened `/schedule/individual/` with no offering: the fixture's cached state lagged after setup; a second run passed.) |
| BQA-2026-00307 to 00312 | `provider-page.yaml`, `-am-dark`, `-grow`, `-legacy`, `-short-link`, `-branded` | Passed. Known notices only. |
| BQA-2026-00313, 00314, 00315 | `template-ergata.yaml`, `-dark`, `-chooser` | Passed. |
| BQA-2026-00324, 00325 | `touchpoints-guest.yaml`, `-dark` | Passed. Console: the reduced-motion notice. |
| BQA-2026-00318, 00319, 00320 | `phone-first.yaml`, `-am-dark`, `-walkin` | Passed. |
| BQA-2026-00321, 00322, 00323 | `template-bloom-v3.yaml`, `-dark`, `-states` | Passed. |
| BQA-2026-00330, 00329, 00331 | `resources/guest.yaml`, `pools/guest.yaml`, `e2e/1-guest.yaml` (changed for one card per service) | Passed. |

## Performance

Measured on the production build (`npm run build`, the stack's web port) with a Playwright script: phone 390 px, 9 Mbps, 170 ms, CPU 4x, cache off. The script waits for the first card or the first time, then reads LCP and CLS. The build of `develop` (5dc0de1) and the new build ran in turn, three rounds, on the same machine.

| Page | Before (median LCP, CLS, images) | After (median LCP, CLS, images) |
| --- | --- | --- |
| Service chooser `/schedule/org/bloom-studio` | 4.38 s, 0.005, 447 KB | 4.42 s, 0.006, 515 KB |
| Time picker, offering link | 5.03 s, 0.004, 94 KB | 4.93 s, 0.007, 122 KB |
| Time picker, `with=any` (after: three stylists) | 5.44 s, 0.004, 94 KB | 4.52 s, 0.005, 123 KB |

The LCP element of the chooser is still the business description. On the phone, the service photos are small frames (88 × 108 px, `-w480` AVIF, about 20 KB each) and the summary photo is 56 × 68 px, so a photo is never the largest paint. The page background is one 11 KB AVIF file. Photos load only after the published design is known, so the browser never fetches the large WebP file. The first measurement found these problems and they are fixed: a full-size WebP next to the AVIF file (React sets `src` before `<picture>` takes the `<img>`), 180 KB of new stylist portraits in the time picker filter (removed), and a business card that wrapped the name until the brand font arrived (CLS 0.04).

### Phase 3: the fitted picker, the Ethiopian calendar and the skin CSS split

Same method (production build, phone 390 px, 9 Mbps, 170 ms, CPU 4x, cache off; desktop 1440 × 900 without throttling). `develop` 72c22ea and a build of 72c22ea with only this workstream's changes ran in turn, seven rounds, on the same machine. The machine was shared with three other agents (load average about 10), so single runs vary by ±0.6 s; the table gives the median and the range.

| Page | 72c22ea (median LCP, range, CLS) | Phase 3 A (median LCP, range, CLS) |
| --- | --- | --- |
| Service chooser `/schedule/org/bloom-studio` (phone) | 4.52 s (4.32–4.97), 0.009 | 4.81 s (4.52–4.92), 0.009 |
| Time picker, Bloom `with=any` (phone) | 5.10 s (4.65–6.07), 0.008 | 5.30 s (4.36–5.98), 0.009 |
| Time picker, Selam (phone) | 5.24 s (4.82–5.78), 0.004 | 5.18 s (4.75–6.27), 0.004 |
| Time picker, Selam (desktop) | 1.63 s (1.24–2.08), 0.012 | 1.78 s (1.62–3.21), 0.002 |

An earlier series of six rounds gave the opposite direction for the chooser (5.06 s before, 4.55 s after) and the same order for the others, so the differences are inside the noise of this machine. Image bytes are the same (188 KB, 124 KB, 86 KB). CLS on the desktop picker went down from 0.012 to 0.002: the summary photo is a small fixed frame, and the "Your time" bar keeps its height. The LCP element is the same text as before (the business description, the summary heading or the address).

What changed in the bytes: the shared booking CSS (`layout.css`) grew from 2.9 KB to 3.3 KB compressed; the five skins' 3.3 KB compressed file is gone, and a booking page loads only its own skin, 0.9 to 1.4 KB compressed. The skin file comes after the published design (about 0.6 s later on the throttled phone, a few milliseconds on a desktop), so on a direct link a slow phone can show the brand colours a moment before the skin's header and frames. The `/book` handoff fetches the template's skin file when the browser is idle, so the usual path (landing page, `/book`, scheduler) has it ready.

## Screenshots

Before (dark, desktop and phone): `/tmp/agent_browser_qa/booking-layout-before/`.

After: the artifact folders of the manifests above, under `/tmp/agent_browser_qa/appointment-growth-booking-layout/`, `/tmp/agent_browser_qa/appointment-growth-booking-layout-am-dark/` and `/tmp/agent_browser_qa/appointment-growth-booking-states/`.

Booking journey (Bloom, en desktop light and am phone dark): the artifact folders under `/tmp/agent_browser_qa/appointment-growth-booking-journey-bloom/`.

Phase 3 (fitted picker, Ethiopian calendar): `/tmp/agent_browser_qa/appointment-growth-booking-fit/` and `/tmp/agent_browser_qa/appointment-growth-booking-ethiopian/`.
