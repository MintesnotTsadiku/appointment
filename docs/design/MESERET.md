# Meseret Advisory — A Day in Addis

Approved reference: [v2-day-in-addis-desktop.png](../design-references/public-experience/meseret/v2-day-in-addis-desktop.png).

Package `meseret-v3`, recipe `meseret-advisory@3`, showcase `/meseret-studio`. Rahel Abebe is the independent provider.

## Design and expression

A shop shutter opening over Addis anchors the page. Serif headings and alternating service photographs follow a working day, with peach and plum sections.

The recipe declares `imagery: mixed`. Photographs introduce people and places. Type, rules, color fields and spacing carry the remaining sections.

`motion: calm` uses focus, hover, press and disclosure feedback. Reduced motion removes movement. This keeps the page readable in both languages.

`darkMode: tonal` uses dark ink surfaces, pale text and a lighter accent. Day photographs remain day photographs. No night variant is declared.

`holiday: greeting` and `greeting: header` place short translated lines in the running header. Holiday greetings follow the owner setting.

`success: static`: A ledger mark confirms the appointment. It reinforces the idea of putting the next step in order.

The photo fills the phone hero. A dark overlay supports the text. Alternating service rows return to reading order on phones.

## Package and content

The package owns its landing page, content pages, booking handoff, booking skin, loading state and confirmation mark. It shares only headless contracts and behavior.

The scheduler retains the shared interaction model. Its typography, colors, borders, service imagery and confirmation match this package.

English and Amharic content comes from the starter manifest, showcase definition and UI catalogs. Availability follows the owner setting. Hours support international and Habesha time.

Images are generated source photographs, separate from the approved concept board. AVIF, WebP and phone crops have checksums in the imagery manifest. `support/meseret-v3/provenance.json` records the source and processing. The collection font manifest records licenses and subsets.

The idempotent `appointment.demo.showcase.seed` command creates and refreshes this business. Gallery previews use the standard capture script and catalog checksums. QA evidence stays in Agent Plane.

## Authored services

| Service | Minutes | ETB | Format |
| --- | ---: | ---: | --- |
| Bookkeeping review | 60 | 2000 | In person |
| Business setup consultation | 90 | 3500 | In person |
| Introductory conversation | 20 | 0 | Video |

The people, premises and prices are authored showcase content. Owners replace these facts before publishing their own business.

## Verification — 2026-10-16

The light and dark runs cover 1440px desktop and 390px phone in English and Amharic. State runs cover holidays, theme changes and loading. Booking runs capture landing, handoff, scheduler, details and confirmation. They also check the Amharic dark handoff and scheduler.

| Agent Plane run | ID | Result |
| --- | --- | --- |
| Light | BQA-2026-00723 | Passed |
| Dark | BQA-2026-00724 | Passed |
| Holiday and loading states | BQA-2026-00711 | Passed |
| Booking journey | BQA-2026-00710 | Passed |
| Final collection visual review | BQA-2026-00721 | Passed |

Phone measurements use the production build, cache disabled, 390×844, DPR 2, 9 Mbps down, 3 Mbps up, 170 ms latency and 4× CPU throttling. Values are three-load medians. The budget is median LCP ≤ 2500 ms.

| Language | Median LCP (ms) | Range (ms) | Worst CLS |
| --- | ---: | --- | ---: |
| English | 1596 | 1500–1760 | 0.0000 |
| Amharic | 2132 | 1572–2156 | 0.0002 |

Frontend gates: 123 TypeScript errors, unchanged from baseline. The DOM suite and production build pass. Focused Frappe tests cover collection manifests, section schemas, checksums, AA color pairs, shell boot and gallery contracts. The known full-suite `test_data_preservation` failure is outside this change. The full app suite was not rerun.
