# Meseret Advisory — A Day in Addis

Approved reference: [v2-day-in-addis-desktop.png](../design-references/public-experience/meseret/v2-day-in-addis-desktop.png). The [comparison analysis](../design-references/public-experience/meseret/REFINEMENT_ANALYSIS.md) records the previous implementation and the rebuild standard.

Package `meseret-v3`, recipe `meseret-advisory@3`, showcase `/meseret-studio`. Rahel Abebe remains the independent provider. Revision 7 refreshes only the seeder-owned Meseret business.

## Reference rebuild

The page follows the reference's sequence: a bright shop-opening hero; adjoining 09:00, 12:00 and 16:00 scenes; a peach booking band; preparation checklist; four visible FAQs; online and office photo panels; a compact footer. The desktop keeps the reference's alternating proportions and thin seams. Genuine italic EB Garamond carries the English headings. Noto Serif Ethiopic keeps Amharic headings readable without artificial italics.

Seven separate generated photographs replace the square image sheet. The shopkeeper is male; the bookkeeper is female; the adviser scene includes female and male staff with a customer facing away. The phone crop preserves both advisers. These choices follow the approved scenes, rather than imposing a demographic quota. Images are illustrative showcase photographs, not claims about real people or premises.

The necessary adaptations are functional HTML, owner-editable bilingual copy, existing services and prices, the existing bookable provider, correct UTC+3 time, real office hours, live availability, language/theme controls, and working content links. The booking band uses a shadcn service selector and links to the shared scheduler for actual format, date and time choices. It does not show sample appointments as available slots. The colleague is display-only and adds no booking capacity.

On phones the scenes return to reading order, the booking band stacks, and the FAQs remain visible. Dark mode uses plum/ink paper surfaces and light text while retaining the day photographs.

## Expression choices

- `imagery: mixed`: documentary photographs, editorial typography, fine rules and paper color fields. The confirmation uses a small ledger drawing.
- `motion: calm`: kit reveals and precise hover, focus and press feedback. Reduced motion removes movement; no parallax or animated counters.
- `darkMode: tonal`: deliberate dark paper and pale plum accents. No night images are required or generated.
- `holiday: greeting`: the translated greeting appears in the hero when the owner enables it.
- `success: static`: a ledger check accompanies the scheduler's localized confirmation.
- `greeting: hero`: the time-of-day greeting sits above the hero title.

The loading state is a quiet paper ledger with three rules. The booking skin continues the serif typography, plum actions, square photographs and fine borders through scheduling, details and confirmation. The package imports no visual components from other templates.

## Content and assets

| Service | Minutes | ETB | Format |
| --- | ---: | ---: | --- |
| Bookkeeping review | 60 | 2000 | In person |
| Business setup consultation | 90 | 3500 | In person |
| Introductory conversation | 20 | 0 | Video |

Business copy comes from the bilingual starter manifest and seeder. UI labels are in both translation catalogs. The current shared independent scheduler still displays the stored English offering name on an Amharic booking page; its controls, business name, location, dates and hours are localized. This pre-existing shared behavior is outside the template-only rebuild and is recorded for review.

`asset-prompts-r2.txt` records the Codex CLI image brief. `support/meseret-v3/provenance-r2.json` records processing and checksums. Images use WebP and AVIF, with separate phone derivatives and a portrait hero crop. Font files retain their existing OFL licenses. Meseret owns the font-family declarations and loads the genuine italic asset from the licensed font library.

Refresh an existing showcase with `appointment.demo.showcase_refinement.refresh` and `{"key":"meseret"}`. Creation remains in the explicit idempotent showcase seeder. QA screenshots stay in Agent Plane; only product gallery previews are shipped.

## Verification — 2026-10-17

The frontend DOM suite passes. TypeScript stays at the baseline of 123 errors, with none in the Meseret package. Focused Frappe tests pass: Meseret content/identity preservation (1), collection manifests/checksums/AA palette pairs (5), and showcase revision contracts (2). The full app suite was not rerun.

Agent Plane covers desktop 1440 and phone 390, English and Amharic, light and dark; holiday and loading states; and the complete booking journey. The journey chooses an enabled calendar date rather than assuming tomorrow is open. Fixture cleanup removes only its own records.

| Evidence | Run | Result |
| --- | --- | --- |
| Reference comparison, light | BQA-2026-00768 | Passed |
| Reference comparison, dark | BQA-2026-00770 | Passed |
| Holiday and loading, including dark loading | BQA-2026-00767 | Passed |
| Booking through confirmation; Amharic dark scheduler | BQA-2026-00769 | Passed |

Final phone crop coverage: **BQA-2026-00771 — Passed** (English and Amharic, light and dark). Both advisers remain visible in the phone crop.

The production build passes. Phone measurements use cold caches, 390×844, DPR 2, 9 Mbps down / 3 Mbps up, 170 ms latency and 4× CPU throttling. Three runs per language give:

| Language | Median LCP | Range | Worst CLS |
| --- | ---: | --- | ---: |
| English | 1580 ms | 1432–1952 ms | 0.0005 |
| Amharic | 1660 ms | 1496–1960 ms | 0.0001 |

All six measured loads meet the 2500 ms budget. These are controlled local measurements, not field percentiles. A subsequent desktop-only type-size adjustment does not alter the measured phone layout.

Review viewer: `http://localhost:47913/comparison.html`. Persistent captures and review scripts are under `/home/minte/template-new/meseret-review/`. No QA screenshots are committed. No other template package or business definition changed.

Final desktop typography coverage: **BQA-2026-00772 — Passed** (English and Amharic, light and dark). The final English desktop is 1440×4469, approximately 1.8% taller than the reference normalized to the same width. A live browser check confirms that the shadcn selector changes the service destination, preserves Amharic and creates no horizontal overflow at 390px.
