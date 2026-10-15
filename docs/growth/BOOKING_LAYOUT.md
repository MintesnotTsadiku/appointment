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

### Taken times

Taken times stay in their place, so the day keeps its rhythm. They have no frame, no line-through and no provider name, and their opacity is 42 %. Their accessible name still says "already booked", and the button is disabled. We kept them, and did not hide them, because a customer then sees that the day exists and is busy. The screenshots of the journey runs show a calmer list than before.

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

Motion on the booking pages is limited to: the view transition from the landing "Book" action into the handoff (kit `bookingTransition`), a short scale on the chosen time and the chosen service card (220 ms, off with reduced motion) with `haptic("select")`, and the template's success moment. The details form, the time picker and the service grid have no entrance animation.

Templates without a skin (v1, v2 and Ergata until phase 3) get the default skin: the brand colours and type, rounded frames, the shared grid pattern and no backdrop. Their pages look as before, with the fixes above.

### Bloom v3

| Page | Bloom's skin |
| --- | --- |
| Handoff (`/bloom-studio/book`) | The template's own page: the booking band as the stage, the glass panel, the service rows as links with photo, price, next free time and a marigold arrow. |
| Header (all steps) | Deep plum in light and dark, like the landing bar, with the marigold, rose and rose-gold line of the handoff. The steps use small round-top mirrors: marigold for the current step, rose gold with a tick for a done step. |
| Page background | A faint, blurred echo of the booking band (`band-w640`, 11 KB AVIF; `band-night-w640` in dark mode). No grid pattern. |
| Service chooser | Anton headings (Noto Sans Ethiopic Condensed 900 in Amharic). The brand logo. Service photos in round-top mirror frames with a rose-gold line. Oval stylist portraits. |
| Time picker | The service photo in a mirror frame at the top of the summary (a small frame on phones). Pill-shaped times, mirror-topped days. The chosen time is plum, never marigold. The Continue button is marigold with Bloom's offset shadow (a soft glow in dark mode). |
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

These manifests need no fixture and book nothing. Existing booking manifests now select Continue (`[data-qa="booking-continue"]`) after they choose a slot.

`qa/manifests/growth/booking-journey-bloom.yaml` (fixture `appointment.tests.template_bloom_v3_qa_fixtures`, setup before, cleanup after) follows one customer through Bloom: the landing page, the `/book` handoff (select a service row), the time picker with any stylist, back to the service chooser (three cards, the stylist filter), the time picker, the details (phone first) and the confirmation with the petals. It runs in English on a desktop in light mode, and in Amharic on a phone in dark mode with the Hanna filter. The fixture cleanup also finds the QA client's bookings by the exact phone number and name, because a phone-first booking has no email.

Manifests that chose a provider's card (`e2e/1-guest`, `resources/guest`, `pools/guest`) now choose the provider chip first, or choose the room in the time picker's filter. Their Amharic scenarios find the card by the website's Amharic service name.

### Runs (2026-10-15)

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

## Screenshots

Before (dark, desktop and phone): `/tmp/agent_browser_qa/booking-layout-before/`.

After: the artifact folders of the manifests above, under `/tmp/agent_browser_qa/appointment-growth-booking-layout/`, `/tmp/agent_browser_qa/appointment-growth-booking-layout-am-dark/` and `/tmp/agent_browser_qa/appointment-growth-booking-states/`.

Booking journey (Bloom, en desktop light and am phone dark): the artifact folders under `/tmp/agent_browser_qa/appointment-growth-booking-journey-bloom/`.
