# Buna Bet: Field Atlas comparison

Pre-rebuild analysis, recorded 2026-10-17. The user approved this direction. The resulting implementation and verification are documented in [BUNA.md](../../../design/BUNA.md).

Approved reference: [05-Field-Atlas-Desktop.png](05-Field-Atlas-Desktop.png). Current site: `http://localhost:47800/buna-studio`.

## Finding

The current page shares the subject, red accent and a map motif with the reference. It does not reproduce its composition. Field Atlas is a continuous illustrated field guide. The current page uses separate marketing sections with large headings and repeated circular photographs.

This requires a structural rebuild inside `buna-v3`, not another layer of CSS overrides. Preserve the reference's map, sidebar, route, sequence, photograph shapes, type hierarchy and compact spacing. Change only what real business data, booking behavior, accessibility and responsive layouts require.

The reference is 740×2126. At 1440px wide it would be about 4137px tall. The current English desktop capture is 1440×5683, about 37% taller. It is longer despite omitting the bean-to-cup story. The current English phone is 390×7749. These dimensions describe the captured content, not mandatory fixed heights.

## Visual comparison

| Area | Approved Field Atlas | Current Buna | Rebuild standard |
| --- | --- | --- | --- |
| Navigation | Narrow left rail with bilingual wordmark, numbered section links, language/theme controls and a short note | Full-width top header and a separate greeting strip | Restore the slim desktop rail. Use real section anchors and a compact accessible phone navigation. |
| Hero composition | Ethiopian terrain fills most of the hero. Greeting and introduction sit over open sky on the right | Left-aligned oversized title beside a beige square map | Restore the map-led composition, open sky and right-side text placement. |
| Map | Detailed terrain, clouds, four circular location photographs, red route, place names, coordinate labels and a compass | A coarse polygon on graph paper, three numbered dots and one landscape photograph | Build an illustrated atlas with separate native labels and route graphics. Verify geography before presenting precise labels. |
| Greeting | “Good morning, Addis.” is the main hero heading. “Follow a coffee home.” is supporting copy | The greeting is tiny in the header. “Follow a coffee home.” is the main heading | Move the dynamic greeting into the hero and declare `greeting: hero`. |
| Type | Compact sans-serif headings and labels, with serif italic annotations | Heavy sans-serif headings and one largely uniform text voice | Match the reference's weight, width, scale and spacing. Add real italic annotations. Keep readable Ethiopic companions. The source image does not identify exact font families. |
| Route | Red dotted path runs from the map past numbered section stops to the footer | Each section has a straight dashed border and generic numbers | Draw one coherent visual route with stops at section headings. It must not obscure text or act as a misleading travel itinerary. |
| People | First section. Wide rectangular photograph of female and male staff, with small biography panels on both sides | Comes after four services. Arched photograph, large heading, one named provider | Put people first. Match the wide image and side captions. Preserve Selamawit's booking identity; any colleague is display-only unless separately authorized. |
| Bean-to-cup story | Four stages: cherry, green bean, roasted bean and cup. Separate pour-over photograph and a small note | Entirely missing | Restore this section using individual photographs or cutouts, native labels and concise bilingual descriptions. |
| Experiences | Three compact rectangular rows with distinct images, duration, price and short notes | Four tall rows with circular images. The first two repeat the same photograph | Restore three main experience rows. Keep the existing planning call as a secondary action, rather than calling four rows “three routes.” |
| Process | Small icon-led strip directly below experiences | Large separate preparation section with oversized heading | Integrate a compact three-step strip into the experience section. |
| Booking | Bordered planning panel, aligned controls and upcoming availability | Large generic call-to-action near the bottom | Restore the panel and service selection. Use the shared scheduler for live date/time selection unless a supported headless contract supplies those controls. |
| Visit | Studio exterior, address/directions, neighborhood map and compact hours | Text-only office and online columns with repeated weekly hours | Restore the photographed studio and location composition. Use the actual address and hours. Do not invent map pins or directions. |
| FAQs | Four visible columns after the studio section | Two generic collapsed questions before the visit section | Restore four visible, business-specific answers after the visit section. Avoid unsupported promises about groups, inclusions or dietary needs. |
| Footer | Compact bilingual identity, small links and short note | Taller generic footer after another large booking section | Match the compact footer. Only render links and contact channels that exist. |
| Color and surfaces | White/pale gray paper, dark ink, restrained red route and actions, natural terrain greens | Cream and large beige bands | Restore the lighter paper and restrained accent balance. Avoid broad beige panels absent from the reference. |

## Proposed page sequence

1. Desktop navigation rail beside the terrain-map hero and dynamic greeting.
2. `01` People: wide staff photograph and two concise captions.
3. `02` Look closer: cherry → green bean → roast → cup, plus pour-over detail.
4. `03` Three coffee experiences: compact service rows and the small process strip.
5. `04` Plan your visit: real service selection, live availability when enabled, scheduler handoff.
6. `05` Arrive curious: studio, actual address, supported directions and real hours.
7. Four visible FAQs, then the compact footer. Continue the route through the final sections without inventing extra service numbers.

The desktop rail should be close to the reference's proportion, roughly 9–10% of page width. The map should dominate the hero rather than occupy a separate card. Match major section boundaries at equal width, then refine type, image crops, rules and whitespace.

## Necessary platform adaptations

The existing business offers private appointments, not group ticket inventory. Keep these services and their IDs:

| Offering | Duration | Price | Format |
| --- | ---: | ---: | --- |
| Guided coffee tasting | 90 minutes | ETB 1200 | In person, one person |
| Private brewing lesson | 90 minutes | ETB 3000 | In person |
| Introduction to barista skills | 180 minutes | ETB 4500 | In person |
| Planning call | 20 minutes | Free | Video |

Do not copy the concept's guest-count selector, “4 seats” availability or group-social claims without real capacity support. Retain the planning panel's composition, but show truthful appointment availability. Do not add pretend date buttons. Use shadcn for any select/date controls.

Selamawit Bekele remains the bookable provider. A male colleague in the staff photograph can match the reference without adding a second calendar. Staff faces are allowed. Customers must face away or be turned away. Do not fabricate a workforce ratio or replace the existing provider to fit an image.

Keep the actual Bole address and seeded opening hours. The concept's Tuesday–Sunday hours and Atlas map pin are not authority to change business facts. Keep the online planning call available without giving it a second full studio section.

Keep English and Amharic copy, translated navigation, owner-enabled availability and holiday greetings, Habesha hours, clear focus, AA contrast and reduced motion. On phones, compact the rail, preserve the four map locations without tiny text, stack captions and keep the route clear of content.

## Motion, loading, booking and dark mode

Retain calm motion. Use kit reveals and small hover/focus/press responses on route links and controls. Do not add parallax clouds, a continuously moving route or animation merely to decorate the atlas.

A short field-guide loading state can use a route point and a small map or page outline. The booking skin should use paper surfaces, red actions, fine rules and matching type. The existing static coffee-cup acknowledgement can be refined as a small field-guide stamp beside the real confirmation.

Keep tonal dark mode: deep ink paper, pale labels and a contrast-safe coral/red route. Preserve readable terrain and photographs instead of putting a uniform dimming filter over everything. The map labels and route need a deliberate dark treatment. No separate dark concept generation is required.

The holiday greeting should be a short line in the hero or rail, not a floating decoration. These choices serve the field-guide design and must be declared in the recipe.

## Asset requirements

- A high-quality Ethiopia terrain/atlas composition, optimized for the hero. Keep text, coordinates and controls as HTML/SVG. The approved full-page board must never become a website background.
- Four distinct place crops: Addis Ababa and the three coffee-origin stops in the reference. Verify labels and avoid presenting generated scenery as documentary evidence.
- A wide staff-at-work photograph with female and male staff in the reference's composition.
- Separate cherry, green bean, roasted bean and brewed-coffee images or cutouts.
- A pour-over action photograph, espresso/barista detail and credible studio exterior.
- A location diagram only when it can represent the actual address accurately.

Do not reuse the same ceremony photograph for multiple services. Generate assets only after approval. Store processed WebP/AVIF files and checksums in Buna's own manifests and catalog entry. Keep QA screenshots in Agent Plane.

## Architecture and verification

Buna already has an independent package with its own booking skin, loading state and confirmation. Keep that architecture. Its current CSS appends map/circle overrides to the generic layout; replace the composition cleanly inside Buna rather than importing another template's components.

Rebuild only Buna. Refresh only its seeder-owned records through the scoped seeder. Preserve service/provider/location IDs and booking capacity. Compare the reference and browser output at 1440px, then inspect 390px English/Amharic and both modes. Verify the complete booking journey and the declared expression choices. Keep phone LCP at or below 2.5 seconds under the documented test profile.

No rebuild, new imagery, seed changes or template edits are part of this analysis. The next decision is approval of this interpretation before implementation.

## Evidence

Fresh Agent Plane captures: **BQA-2026-00773** (light) and **BQA-2026-00774** (dark), both passed. Each covers 1440px and 390px in English and Amharic. Passing these capture checks does not establish fidelity to the reference.

Comparison viewer: `http://localhost:47914/comparison.html`. Persistent review files and screenshot paths: `/home/minte/template-new/buna-review/`.
