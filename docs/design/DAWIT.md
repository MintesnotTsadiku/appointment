# Dr. Dawit Tesfaye — Medical Journal V2

Approved reference: [01-medical-journal-v2.png](../design-references/public-experience/dawit/01-medical-journal-v2.png).

Package `dawit-v3`, recipe `dawit-specialist@3`, showcase `/dr-dawit`. Dawit Tesfaye is the independent provider.

## Design and expression

A serif masthead, centered monochrome portrait and red rules form a medical journal. The hierarchy gives the doctor and consultation scope room to speak.

The recipe declares `imagery: mixed`. Photographs introduce people and places. Type, rules, color fields and spacing carry the remaining sections.

`motion: calm` uses focus, hover, press and disclosure feedback. Reduced motion removes movement. This keeps the page readable in both languages.

`darkMode: tonal` uses dark ink surfaces, pale text and a lighter accent. Day photographs remain day photographs. No night variant is declared.

`holiday: greeting` and `greeting: header` place short translated lines in the running header. Holiday greetings follow the owner setting.

`success: static`: A journal seal acknowledges the booking. It stays static and leaves the medical appointment details prominent.

The three-column journal becomes a linear introduction, portrait and booking invitation. The masthead scales for Amharic.

## Package and content

The package owns its landing page, content pages, booking handoff, booking skin, loading state and confirmation mark. It shares only headless contracts and behavior.

The scheduler retains the shared interaction model. Its typography, colors, borders, service imagery and confirmation match this package.

English and Amharic content comes from the starter manifest, showcase definition and UI catalogs. Availability follows the owner setting. Hours support international and Habesha time.

Images are generated source photographs, separate from the approved concept board. AVIF, WebP and phone crops have checksums in the imagery manifest. `support/dawit-v3/provenance.json` records the source and processing. The collection font manifest records licenses and subsets.

The idempotent `appointment.demo.showcase.seed` command creates and refreshes this business. Gallery previews use the standard capture script and catalog checksums. QA evidence stays in Agent Plane.

## Authored services

| Service | Minutes | ETB | Format |
| --- | ---: | ---: | --- |
| Video follow-up | 20 | 1500 | Video |
| Medical results review | 40 | 2500 | Video |
| Patient and family consultation | 45 | 3000 | Video |
| In-person consultation | 60 | 5000 | In person |

Only independent consultation hours are offered: Tuesday, Thursday and Saturday, 17:00–19:00 in person and 19:00–21:00 online. Hospital schedules are not imported. Home visits require a separate arrangement. The site does not claim verified credentials or emergency care.

## Verification — 2026-10-16

The light and dark runs cover 1440px desktop and 390px phone in English and Amharic. State runs cover holidays, theme changes and loading. Booking runs capture landing, handoff, scheduler, details and confirmation. They also check the Amharic dark handoff and scheduler.

| Agent Plane run | ID | Result |
| --- | --- | --- |
| Light | BQA-2026-00726 | Passed |
| Dark | BQA-2026-00702 | Passed |
| Holiday and loading states | BQA-2026-00718 | Passed |
| Booking journey | BQA-2026-00725 | Passed |
| Final collection visual review | BQA-2026-00721 | Passed |

Phone measurements use the production build, cache disabled, 390×844, DPR 2, 9 Mbps down, 3 Mbps up, 170 ms latency and 4× CPU throttling. Values are three-load medians. The budget is median LCP ≤ 2500 ms.

| Language | Median LCP (ms) | Range (ms) | Worst CLS |
| --- | ---: | --- | ---: |
| English | 1580 | 1532–1696 | 0.0000 |
| Amharic | 1760 | 1592–1780 | 0.0019 |

Frontend gates: 123 TypeScript errors, unchanged from baseline. The DOM suite and production build pass. Focused Frappe tests cover collection manifests, section schemas, checksums, AA color pairs, shell boot and gallery contracts. The known full-suite `test_data_preservation` failure is outside this change. The full app suite was not rerun.

Run BQA-2026-00715 timed out with a booking request pending. The fixture was reset, and BQA-2026-00720 completed the booking.
