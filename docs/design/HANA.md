# Hana Bekele — Addis Field Notebook

Approved reference: [revision-2-01-addis-field-notebook.png](../design-references/public-experience/hana/revision-2-01-addis-field-notebook.png).

Package `hana-v3`, recipe `hana-conversations@3`, showcase `/hana-bekele`. Hana Bekele is the independent provider.

## Design and expression

A fine notebook grid, oversized poster headings, an orange route and upright city photographs introduce a person and her conversations. The service menu distinguishes video, coffee and lunch.

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

## Addis Field Notebook rebuild — 2026-10-17

The user approved a close reconstruction of the desktop board, with only necessary platform adaptations. The user approved the rebuilt comparison on 2026-10-17 for commit and push to develop.

The page now follows the board's order: two-line poster, three-photo map collage, continuous orange route, numbered field notes, market scene, compact service table, booking panel and skyline footer. English poster text uses Anton with the reference's tall, narrow proportions. Oswald carries the lighter editorial headings. Caveat carries handwritten notes. Ethiopic text keeps a readable native font and does not use the Latin poster compression.

The desktop capture is 1440 × 3604. The source board scales to about 1440 × 3800. The four real service rows and supported booking handoff account for much of the shorter page. The concept's fifth collaboration inquiry has no configured destination and is omitted. The booking panel uses a shadcn service select, real availability and the existing scheduler. It does not show invented dates or duplicate the customer form.

The first editorial section contains three authored, bilingual field notes. Their disclosure controls reveal the full text. They replace unconfigured video links while keeping the feature-plus-two-teasers composition. No fabricated episode duration, audience count, social profile or external destination is added.

The recipe keeps its declared expression:

- **Mixed imagery:** eight separate generated assets support the city, coffee, walking, conversation, market, related notes and skyline compositions. Map lines, route, labels, text and controls remain native. The map is decorative, not geographic navigation.
- **Calm motion:** kit reveals and short hover, focus and press feedback; reduced motion removes movement. There is no continuously animated route.
- **Tonal dark mode:** dark green-black paper, pale text, restrained orange route and unchanged daytime photographs. The monochrome skyline reverses tonally.
- **Header greeting and holiday greeting:** a small translated header line preserves the poster's hierarchy. Holidays follow the owner setting.
- **Static success:** a route endpoint and check accompany the scheduler's localized confirmation. The loading state uses a notebook index and route on graph paper.

The booking skin continues the paper grid, square photos, condensed display type, black actions and orange rule. The shared scheduler retains its interaction model. Service fees, durations, formats and IDs are unchanged. Hana remains the sole provider. The provider portrait now uses the same generated persona as the page.

### Assets and seeder

The image source is Codex CLI with `gpt-6.1-sol`. [Asset prompts](../design-references/public-experience/hana/asset-prompts-r2.txt) record all eight requests. Each source is a separate generated image, not a crop from the board. Guests and supporting customers face away. The new files use the `-r2` suffix under `appointment/public/brand-experience/support/hana-v3/`. WebP quality 83 and AVIF quality 58 variants have checksums in the imagery and showcase manifests. `provenance-r2.json` records processing. Oswald and Caveat licenses, source URLs and checksums are under `appointment/public/fonts/hana/`.

The existing local-only maintenance entry point `appointment.demo.showcase_refinement.refresh(key="hana")` publishes only the seeder-owned Hana business. It is not a whitelisted HTTP method, so it runs through Bench. Revision 9 includes the content, compiled design and consistent provider avatar. The standard translation importer installs the new Amharic catalog entries. No DocType change or migration was needed. The standard gallery capture script was restricted to `hana-conversations`.

### Verification

| Agent Plane run | ID | Result |
| --- | --- | --- |
| Light, EN/AM, 1440/390 | BQA-2026-00801 | Passed |
| Dark and reduced motion, EN/AM, 1440/390 | BQA-2026-00804 | Passed |
| Loading, holiday and mode states | BQA-2026-00803 | Passed |
| Booking through confirmation; Amharic dark handoff/scheduler | BQA-2026-00802 | Passed |
| Read a note, switch Habesha hours, select another service and open its scheduler | BQA-2026-00805 | Passed |

These runs have zero console errors. The booking and interaction runs have zero network errors. Visual runs record cancelled responsive image requests (`net::ERR_ABORTED`) while the browser selects image sources; the chosen images load. The earlier journey BQA-2026-00798 chose tomorrow, a closed day. The manifest now selects an enabled calendar date. Fixture cleanup removes only its own booking records.

The DOM suite and production build pass. TypeScript remains at 123 errors, matching the starting baseline, with no Hana errors. Eight focused Frappe tests cover booking identities, typed section content, manifests, asset checksums, AA palette pairs and peer showcase revisions. The known unrelated full-suite failure is not retested.

Production phone measurements use three cold loads per language at 390 × 844, DPR 2, 9 Mbps down, 3 Mbps up, 170 ms latency and 4× CPU throttling. Both medians meet the 2500 ms budget:

| Language | Median LCP | Range | Worst CLS |
| --- | ---: | --- | ---: |
| English | 1500 ms | 1352–1700 ms | 0.0008 |
| Amharic | 1856 ms | 1852–1888 ms | 0.0024 |

An earlier measurement series was interrupted when its temporary proxy exited before the sixth load. Its completed values, including one 2504 ms Amharic load, remain in `~/template-new/hana-rebuild/performance.jsonl`. The complete final series is `performance-final.jsonl`; its proxy stays alive for the full run and then stops.

Review: `http://localhost:47915/comparison.html?review=hana-rebuilt`. It includes the reference, rebuilt and previous screenshots in both languages and themes. `experience.html` shows the handoff, scheduler, confirmation and loading states. Screenshots remain in Agent Plane evidence and `~/template-new/hana-review/`, outside Git. Main and other templates are unchanged. The user approved pushing Hana to develop; main remains unchanged.
