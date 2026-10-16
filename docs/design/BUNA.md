# Buna Bet — Field Atlas

Approved reference: [05-Field-Atlas-Desktop.png](../design-references/public-experience/buna/05-Field-Atlas-Desktop.png).

Package `buna-v3`, recipe `buna-experiences@3`, showcase `/buna-studio`. Selamawit Bekele is the independent provider.

## Design and expression

A drawn origin map, dotted tasting route and circular photographs turn the page into a coffee field guide. Parchment surfaces and red accents support the route.

The recipe declares `imagery: mixed`. Photographs introduce people and places. Type, rules, color fields and spacing carry the remaining sections.

`motion: calm` uses focus, hover, press and disclosure feedback. Reduced motion removes movement. This keeps the page readable in both languages.

`darkMode: tonal` uses dark ink surfaces, pale text and a lighter accent. Day photographs remain day photographs. No night variant is declared.

`holiday: greeting` and `greeting: header` place short translated lines in the running header. Holiday greetings follow the owner setting.

`success: static`: A coffee cup marks the confirmed tasting. A static drawing suits the quiet invitation.

The map follows the hero text on phones. Circular service photographs keep the field-guide rhythm without horizontal scrolling.

## Package and content

The package owns its landing page, content pages, booking handoff, booking skin, loading state and confirmation mark. It shares only headless contracts and behavior.

The scheduler retains the shared interaction model. Its typography, colors, borders, service imagery and confirmation match this package.

English and Amharic content comes from the starter manifest, showcase definition and UI catalogs. Availability follows the owner setting. Hours support international and Habesha time.

Images are generated source photographs, separate from the approved concept board. AVIF, WebP and phone crops have checksums in the imagery manifest. `support/buna-v3/provenance.json` records the source and processing. The collection font manifest records licenses and subsets.

The idempotent `appointment.demo.showcase.seed` command creates and refreshes this business. Gallery previews use the standard capture script and catalog checksums. QA evidence stays in Agent Plane.

## Authored services

| Service | Minutes | ETB | Format |
| --- | ---: | ---: | --- |
| Guided coffee tasting | 90 | 1200 | In person |
| Private brewing lesson | 90 | 3000 | In person |
| Introduction to barista skills | 180 | 4500 | In person |
| Planning call | 20 | 0 | Video |

The showcase uses private appointments. It does not advertise ticket inventory or shared group capacity.

## Verification — 2026-10-16

The light and dark runs cover 1440px desktop and 390px phone in English and Amharic. State runs cover holidays, theme changes and loading. Booking runs capture landing, handoff, scheduler, details and confirmation. They also check the Amharic dark handoff and scheduler.

| Agent Plane run | ID | Result |
| --- | --- | --- |
| Light | BQA-2026-00697 | Passed |
| Dark | BQA-2026-00698 | Passed |
| Holiday and loading states | BQA-2026-00714 | Passed |
| Booking journey | BQA-2026-00712 | Passed |
| Final collection visual review | BQA-2026-00721 | Passed |

Phone measurements use the production build, cache disabled, 390×844, DPR 2, 9 Mbps down, 3 Mbps up, 170 ms latency and 4× CPU throttling. Values are three-load medians. The budget is median LCP ≤ 2500 ms.

| Language | Median LCP (ms) | Range (ms) | Worst CLS |
| --- | ---: | --- | ---: |
| English | 1460 | 1420–1540 | 0.0000 |
| Amharic | 1752 | 1692–1760 | 0.0000 |

Frontend gates: 123 TypeScript errors, unchanged from baseline. The DOM suite and production build pass. Focused Frappe tests cover collection manifests, section schemas, checksums, AA color pairs, shell boot and gallery contracts. The known full-suite `test_data_preservation` failure is outside this change. The full app suite was not rerun.
