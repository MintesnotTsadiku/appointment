# Hana Bekele — Addis Field Notebook

Approved reference: [revision-2-01-addis-field-notebook.png](../design-references/public-experience/hana/revision-2-01-addis-field-notebook.png).

Package `hana-v3`, recipe `hana-conversations@3`, showcase `/hana-bekele`. Hana Bekele is the independent provider.

## Design and expression

A notebook grid, oversized headings, orange accents and tilted city photographs introduce a person and her conversations. The service menu distinguishes video, coffee and lunch.

The recipe declares `imagery: mixed`. Photographs introduce people and places. Type, rules, color fields and spacing carry the remaining sections.

`motion: calm` uses focus, hover, press and disclosure feedback. Reduced motion removes movement. This keeps the page readable in both languages.

`darkMode: tonal` uses dark ink surfaces, pale text and a lighter accent. Day photographs remain day photographs. No night variant is declared.

`holiday: greeting` and `greeting: header` place short translated lines in the running header. Holiday greetings follow the owner setting.

`success: static`: A small route mark closes the booking. It connects the confirmed conversation to the notebook theme.

The photo collage stacks beneath the introduction. Each paid session keeps its format, duration and price visible.

## Package and content

The package owns its landing page, content pages, booking handoff, booking skin, loading state and confirmation mark. It shares only headless contracts and behavior.

The scheduler retains the shared interaction model. Its typography, colors, borders, service imagery and confirmation match this package.

English and Amharic content comes from the starter manifest, showcase definition and UI catalogs. Availability follows the owner setting. Hours support international and Habesha time.

Images are generated source photographs, separate from the approved concept board. AVIF, WebP and phone crops have checksums in the imagery manifest. `support/hana-v3/provenance.json` records the source and processing. The collection font manifest records licenses and subsets.

The idempotent `appointment.demo.showcase.seed` command creates and refreshes this business. Gallery previews use the standard capture script and catalog checksums. QA evidence stays in Agent Plane.

## Authored services

| Service | Minutes | ETB | Format |
| --- | ---: | ---: | --- |
| Personal conversation | 20 | 1500 | Video |
| Podcast and content feedback | 45 | 4000 | Video |
| Coffee and conversation | 60 | 5000 | In person |
| Lunch conversation | 90 | 9000 | In person |

Hana is an authored persona, not a claim about a real influencer. Session prices are authored examples. Booking uses the existing appointment workflow.

## Verification — 2026-10-16

The light and dark runs cover 1440px desktop and 390px phone in English and Amharic. State runs cover holidays, theme changes and loading. Booking runs capture landing, handoff, scheduler, details and confirmation. They also check the Amharic dark handoff and scheduler.

| Agent Plane run | ID | Result |
| --- | --- | --- |
| Light | BQA-2026-00699 | Passed |
| Dark | BQA-2026-00700 | Passed |
| Holiday and loading states | BQA-2026-00717 | Passed |
| Booking journey | BQA-2026-00713 | Passed |
| Final collection visual review | BQA-2026-00721 | Passed |

Phone measurements use the production build, cache disabled, 390×844, DPR 2, 9 Mbps down, 3 Mbps up, 170 ms latency and 4× CPU throttling. Values are three-load medians. The budget is median LCP ≤ 2500 ms.

| Language | Median LCP (ms) | Range (ms) | Worst CLS |
| --- | ---: | --- | ---: |
| English | 1540 | 1512–1680 | 0.0000 |
| Amharic | 2076 | 1704–2120 | 0.0003 |

Frontend gates: 123 TypeScript errors, unchanged from baseline. The DOM suite and production build pass. Focused Frappe tests cover collection manifests, section schemas, checksums, AA color pairs, shell boot and gallery contracts. The known full-suite `test_data_preservation` failure is outside this change. The full app suite was not rerun.
