# Selam Homes — Living Gallery

Approved reference: [03-living-gallery.png](../design-references/public-experience/selam-homes/03-living-gallery.png).

Package `selam-homes-v3`, recipe `selam-homes@3`, showcase `/selam-homes`. Selam Tesfaye is the independent provider.

## Design and expression

A panoramic home photograph and an asymmetric property gallery lead the page. Warm white, plum and burnt orange support open space and measured typography.

The recipe declares `imagery: mixed`. Photographs introduce people and places. Type, rules, color fields and spacing carry the remaining sections.

`motion: calm` uses focus, hover, press and disclosure feedback. Reduced motion removes movement. This keeps the page readable in both languages.

`darkMode: tonal` uses dark ink surfaces, pale text and a lighter accent. Day photographs remain day photographs. No night variant is declared.

`holiday: greeting` and `greeting: header` place short translated lines in the running header. Holiday greetings follow the owner setting.

`success: static`: A house outline confirms the appointment. It acknowledges a conversation or viewing, rather than implying a property purchase.

The property mosaic becomes a single column. The home photograph keeps a wide crop, while viewing and consultation cards stack.

## Package and content

The package owns its landing page, content pages, booking handoff, booking skin, loading state and confirmation mark. It shares only headless contracts and behavior.

The scheduler retains the shared interaction model. Its typography, colors, borders, service imagery and confirmation match this package.

English and Amharic content comes from the starter manifest, showcase definition and UI catalogs. Availability follows the owner setting. Hours support international and Habesha time.

Images are generated source photographs, separate from the approved concept board. AVIF, WebP and phone crops have checksums in the imagery manifest. `support/selam-homes-v3/provenance.json` records the source and processing. The collection font manifest records licenses and subsets.

The idempotent `appointment.demo.showcase.seed` command creates and refreshes this business. Gallery previews use the standard capture script and catalog checksums. QA evidence stays in Agent Plane.

## Authored services

| Service | Minutes | ETB | Format |
| --- | ---: | ---: | --- |
| Buyer consultation | 30 | 0 | Video |
| Property viewing | 60 | 0 | In person |
| Online property discussion | 45 | 0 | Video |
| Seller consultation | 60 | 0 | In person |

The gallery is editable showcase content. It is not an inventory, ownership verification or property transaction system. Viewings and consultations use ordinary appointments.

## Verification — 2026-10-16

The light and dark runs cover 1440px desktop and 390px phone in English and Amharic. State runs cover holidays, theme changes and loading. Booking runs capture landing, handoff, scheduler, details and confirmation. They also check the Amharic dark handoff and scheduler.

| Agent Plane run | ID | Result |
| --- | --- | --- |
| Light | BQA-2026-00703 | Passed |
| Dark | BQA-2026-00704 | Passed |
| Holiday and loading states | BQA-2026-00719 | Passed |
| Booking journey | BQA-2026-00716 | Passed |
| Final collection visual review | BQA-2026-00721 | Passed |

Phone measurements use the production build, cache disabled, 390×844, DPR 2, 9 Mbps down, 3 Mbps up, 170 ms latency and 4× CPU throttling. Values are three-load medians. The budget is median LCP ≤ 2500 ms.

| Language | Median LCP (ms) | Range (ms) | Worst CLS |
| --- | ---: | --- | ---: |
| English | 1472 | 1432–1480 | 0.0000 |
| Amharic | 1732 | 1700–1920 | 0.0002 |

Frontend gates: 123 TypeScript errors, unchanged from baseline. The DOM suite and production build pass. Focused Frappe tests cover collection manifests, section schemas, checksums, AA color pairs, shell boot and gallery contracts. The known full-suite `test_data_preservation` failure is outside this change. The full app suite was not rerun.
