# Provider page

An independent provider is a `Provider` without an organization. Each independent provider has a public provider page at `/schedule/p/<page address>`. The page shows the provider and lists every service that a guest can book now. Each service opens its scheduler at `/schedule/p/<page address>/<offering>`.

Before this change, every shared link pointed at the first offering (`/schedule/individual/<offering>`). Those links still work. The scheduler at an old link shows "Back to all services", which opens the provider page.

## The page address

`Provider.public_slug` holds the page address. It is read-only in Desk. A document save never changes it (`provider_page.validate_provider`). Only these functions change it:

- `provider_page.ensure_slug` gives the first address. `solo_setup.create`, `independent.create` and `independent.publish` call it.
- `short_links.change` changes it when the owner picks a new address on the Grow page.
- `short_links.sync_provider_slug` (Public Site `on_update`) copies the website address to it.

The address uses the same rules as a website address: 3 to 30 characters, lowercase letters, numbers and single hyphens, and not a reserved path. The first address comes from the provider name. A name without Latin letters gets `book-` and six random letters and digits. The Grow page then asks the owner to pick an address that people can remember.

## One address space

Website slugs, organization slugs, former addresses and page addresses share one address space. `short_links.problem(slug, site, provider=...)` checks all of them. A business can use its own former address again. No other business can take it.

A provider with a website has one address. When the provider makes a website, or changes the website address on the Grow page, in the website editor or in Desk, `public_slug` follows the website slug.

## Former addresses

A changed address becomes a `Public Site Slug Alias`. The alias has one owner:

- `public_site` for a former website address.
- `provider` for a former page address of a provider without a website.

When a provider is deleted, its former page addresses are deleted too (`provider_page.delete_aliases`).

These redirects keep printed posters and old links working (`short_links.redirect_path`):

| Opened | Goes to |
| --- | --- |
| `/<former website address>/rest` | `/<website address>/rest` |
| `/schedule/p/<former address>/rest` | `/schedule/p/<address>/rest` |
| `/<page address>` or `/<former page address>` | `/schedule/p/<address>` |
| `/<page address>/am` | `/schedule/p/<address>?lang=am` |

A published website and an organization slug keep the root address. The redirect keeps the query, so `?source=` and `?ref=` still count. The server sends a 301 from the SPA shell (`www/index.py`, `www/schedule/index.py`). In development, Vite serves the shell, so the SPA asks `short_links.resolve` or replaces a former address itself.

## The guest endpoint

`provider_page.public_provider(slug)` is a guest GET with a rate limit of 120 calls a minute. It returns the name, a public photo, the bio, the spoken languages, the website slug, the services and the places.

- It lists only offerings that `booking.offering(name, public=True)` accepts. An inactive offering, service, place or provider is not listed.
- It shows a photo only from `/files/` or `/assets/`. It never shows a private file.
- It shows the format and platform of a place (`online_meeting.public_place`). It never shows a meeting link.
- An unknown address, a provider with public booking off and a provider with nothing to book give the same "not available" answer.

When the provider has a published website, the endpoint also returns words from the website in English and Amharic: the person name, the role, the service names and summaries, and the hero photo. The page then uses the website colors, fonts and logo (`useBookingBrand`).

## Which link people get

`sharing.public_path` picks the address that people share:

1. The published website: `/<website address>`.
2. The provider page: `/schedule/p/<page address>`.
3. The first offering, only for a provider without a page address.

The Grow page, the poster, the share card, the success screen after setup, customer emails, customer referral links and the directory use this rule. Book again links open the same service on the provider page. My bookings stays on the offering path (`/schedule/individual/<offering>/my-bookings`).

`business_owner` keeps `owner.slug = None` for a provider, because many callers read it as an organization slug. The page address is `owner.page_slug`.

## Search engines and link previews

- `sharing.page_meta` gives Open Graph tags for `/schedule/p/<address>` and for each scheduler under it. The canonical URL is the provider page. The language comes from `?lang=`, else from the provider language.
- `provider_page.sitemap_links` adds the page in English and Amharic to `/sitemap.xml` when the provider has no published website.

## Spoken languages

`Provider.spoken_languages` is a JSON list of codes: `am`, `en`, `om`, `ti`, `so`, `ar`, `fr`. The page shows each one as a chip in its own script. Unknown codes are removed on save.

## Data migration

`patches/v0_1/backfill_provider_page_slugs` gives a page address to each independent provider that has a service. A provider with an active website gets the website slug. The patch skips a provider that already has an address, so it is safe to run again.

## Tests

- `appointment/tests/test_provider_page.py`
- `frontend/tests/provider-page.test.mjs`
- Agent Plane: `qa/manifests/growth/provider-page*.yaml` with the fixture `appointment.tests.provider_page_qa_fixtures` (Rahel Girma Nutrition, no website). `provider-page-branded.yaml` uses the Yared Tesfaye Counselling website from `template_ergata_qa_fixtures`.
