# Tenant Websites and Custom Domains — Detailed Implementation Plan

**Status:** Approved direction; implementation not started  
**Created:** 2026-09-24  
**Scope:** Provider and organization public websites, booking integration, and optional customer-owned domains  
**Primary app:** `frappe_appointment`

> **Branding architecture update:**
> `docs/implementation/quiet-trust-warm-editorial-architecture.md` is
> authoritative for the clean-slate public-experience recipe, compiled design,
> typed content, publication, and booking handoff contracts. This document
> remains authoritative for Public Site ownership, content, trusted routing,
> domains, and broader website operations. Any older template, rollout, or
> migration language below is superseded by that implementation record.

---

## 1. Purpose

Build one layered capability:

1. Give each organization or independent provider a professionally designed public website on the platform domain.
2. Connect that website directly to the existing services, providers, locations, availability, and booking flow.
3. Optionally serve the same published website and booking experience from a verified domain owned by that organization or provider.

The website and custom-domain layers must share the same content, publishing, rendering, booking, permission, localization, SEO, caching, and operational foundations. Custom domains must not create a second website system or a Frappe site per customer.

---

## 2. Agreed Product Decisions

### 2.1 Ownership and cardinality

- One `Organization` may own at most one `Public Site` in the initial release.
- One independent `Provider` may own at most one `Public Site` in the initial release.
- A `Public Site` has exactly one owner: either an organization or an independent provider, never both.
- An organization website represents the organization and may display its active services, providers, locations, and booking options.
- An independent-provider website represents that provider's personal services, locations, availability, and booking options.
- Website ownership must remain separate from provider-organization membership. The existing ability for a provider to work with multiple organizations must not be collapsed into a one-to-one relationship.
- Multi-brand or multiple-site ownership is explicitly out of scope for v1. The data model should avoid making it impossible later, but the product and permission model will enforce one site per owner now.

### 2.2 Addressing

Every published site receives:

- One globally unique platform slug.
- One platform URL, such as `https://main-domain.example/abebe`.
- A booking URL below the site, such as `https://main-domain.example/abebe/book`.
- Optionally, one primary verified custom domain, such as `https://abebe.com`.
- The equivalent custom-domain booking URL, such as `https://abebe.com/book`.

The platform URL remains a recovery and support address. When a custom domain is active, it becomes the canonical public origin. The canonical-origin policy is explicit in the published release and domain record; search engines must see only one canonical origin.

### 2.3 Authentication boundary

- Custom domains expose only the public website, booking experience, public assets, and the narrowly required public booking endpoints.
- Login, editing, administration, domain management, analytics management, and preview management remain on the platform domain.
- Authenticated management sessions must not be shared across customer-owned domains.
- Preview may render tenant content on a platform-controlled preview origin or path, protected by authorization or a signed, expiring token.

### 2.4 Content and templates

- Templates are code-owned, reviewed, versioned template packs.
- Tenants cannot upload JavaScript, arbitrary CSS, Jinja, React components, or untrusted template code.
- Tenant content is structured, schema-validated data assembled from reusable section types.
- Templates may be genuinely different in layout, typography, hierarchy, imagery, motion, density, navigation, and booking presentation while consuming common content primitives.
- Initial target: 5–10 high-quality templates, released incrementally rather than all at once.
- Publishing creates an immutable revision. Draft edits never mutate the live revision.
- A published revision pins its template key, template version, content-schema version, locales, SEO values, and brand tokens.

### 2.5 Initial product boundary

The first release is a conversion-oriented single-page business website plus a nested booking flow. The data model may support multiple pages later, but v1 does not need a general-purpose page builder or unrestricted CMS.

### 2.6 Explicitly out of scope

- Multiple public sites or brands per owner.
- Multiple primary custom domains per site.
- Authenticated tenant management on custom domains.
- Arbitrary HTML/CSS/JavaScript or third-party scripts.
- A general blog CMS.
- A replacement CRM/customer identity model.
- Reworking customer identity to support phone-only customers, except where existing booking behavior must remain compatible.
- Resource/equipment capacity scheduling.
- Full lead-management pipelines.
- Custom email-sending domains.
- External review aggregation in the first release.

---

## 3. Existing-System Findings That Shape the Work

1. The app already supports organization and personal booking routes:
   - `/schedule/org/:orgSlug`
   - `/schedule/org/:orgSlug/:serviceSlug`
   - `/schedule/in/:meetId`
2. `Organization` already contains a unique slug, owner, managers, branding, language, public-booking toggle, booking policy, and status.
3. `Provider` supports independent providers and providers belonging to organizations, including a many-to-many organization relationship.
4. The existing `Landing Page Settings` DocType is a platform-wide singleton. It must not be reused as tenant website content.
5. The app currently routes broad website paths into one React application. Platform-site slugs therefore require a reserved-path policy and deliberate routing precedence.
6. Current organization booking APIs contain relationship drift:
   - Some reads still use deprecated single-organization provider fields.
   - Public organization lookup does not consistently enforce `enable_public_booking`.
   - Service resolution does not always prove the service belongs to the requested organization.
7. Frappe normally resolves a Frappe site from the request host. Customer domains are application-level tenants inside one Frappe site, so the reverse proxy or edge must route verified domains to the canonical Frappe site without treating every customer domain as a separate Frappe site.
8. The currently configured local site does not have `frappe_appointment` installed. Development and migration work must use an approved isolated site/runtime rather than altering an unrelated shared site.

These issues make booking-boundary hardening and host-resolution design prerequisites, not cleanup to postpone until after launch.

---

## 4. Product Experience

### 4.1 Guided website setup

The setup experience should:

1. Identify the current organization or independent provider.
2. Confirm or generate a unique platform slug.
3. Recommend templates based on organization/provider business type.
4. Prepopulate content from existing organization, provider, service, location, and booking data.
5. Ask only for missing editorial content and media.
6. Show desktop, tablet, and mobile previews.
7. Run content, SEO, accessibility, and booking-readiness checks.
8. Publish atomically.
9. Offer platform subdomain/custom-domain setup after the platform site works.

### 4.2 Reuse existing operational data

Website content should distinguish between:

- **Live operational data:** service name, active status, duration, price, active providers, locations, hours, and booking availability.
- **Editorial overrides:** marketing title, short description, featured image, ordering, visibility, and call-to-action wording.
- **Published configuration:** which live entities and sections are exposed by the site.

Avoid copying operational fields into website content unless a stable published snapshot specifically needs a display copy. Website publication must not modify booking configuration.

### 4.3 Initial reusable sections

The section registry should cover:

- Header/navigation
- Announcement banner
- Hero
- Primary booking call to action
- Services grid/list
- Featured service
- Provider/team profiles
- Locations and directions
- Business hours and “open now” status
- About/story
- Credentials and qualifications
- Trust indicators
- Testimonials
- Image/gallery section
- Process/how it works
- Frequently asked questions
- Policies/cancellation terms
- Accepted payment methods
- Contact details
- WhatsApp, phone, email, and directions actions
- Social links
- Map block using an approved integration or safe external link
- Final booking call to action
- Footer

Each section schema must define required fields, localized fields, media fields, allowed links, accessibility requirements, maximum item counts, defaults, and template compatibility.

### 4.4 Template families

Start with three production-quality templates and expand to 5–10 after the section and versioning system proves stable:

1. Clinic and healthcare
2. Salon, beauty, and wellness
3. Consultant/professional services
4. Fitness
5. Tutor/education
6. Legal services
7. Home or field services
8. General local business

Template quality requirements:

- Mobile-first and responsive.
- WCAG 2.2 AA target.
- Keyboard and screen-reader usable.
- Respect reduced-motion preferences.
- Semantic headings and landmarks.
- Sufficient contrast even after brand customization.
- Fast first render on constrained mobile networks.
- No tenant-provided executable content.
- Full English and Amharic rendering support.
- Stable rendering of older pinned template versions.

### 4.5 Booking integration

Every template must treat booking as a native capability:

- Persistent “Book now” action.
- Service-specific booking actions.
- Provider-specific booking where allowed by organization policy.
- Location-specific booking where supported.
- Selected service/provider/location carried into `/book`.
- Optional “next available appointment” summary.
- Matching branding throughout booking and confirmation.
- Back navigation that returns to the tenant website, not the platform homepage.
- Canonical booking URLs generated by one server-side URL builder.
- Consistent behavior on platform paths and custom domains.

The new website layer must call a hardened booking interface rather than directly reproducing or depending on route-specific query logic.

### 4.6 Localization

- Initial supported locales: English (`en`) and Amharic (`am`).
- Each site has a default locale and an allowed locale list.
- Localized public URLs use explicit locale paths when more than one language is enabled, for example `/abebe/am/` and `abebe.com/am/`.
- Define one consistent default-locale URL policy to prevent duplicate indexing.
- Localized fields expose translation-completeness status in the editor.
- Missing optional translations fall back to the site default locale and are flagged before publication.
- SEO metadata, image alt text, navigation labels, policies, and structured data must be localizable.

### 4.7 SEO and discovery

Provide:

- Per-locale title and meta description.
- Canonical links.
- `hreflang` links.
- Open Graph and social-sharing metadata.
- Tenant favicon and social image.
- XML sitemap.
- Tenant-aware `robots.txt` behavior.
- Structured data appropriate to business type, services, locations, hours, and professionals.
- Redirect history for changed slugs.
- Search preview and social-share preview in the editor.
- `noindex` for previews, drafts, suspended sites, and domain-verification/error pages.

Public website HTML must be server-rendered or publication-generated so useful content and metadata are present without client-side JavaScript.

### 4.8 Conversion and growth features

- Floating mobile booking button.
- Announcement and promotion banners.
- Featured services.
- QR codes for site and service booking links.
- Share links for WhatsApp, Telegram, and other approved channels.
- Campaign parameters and first-party attribution.
- Contact and directions actions.
- Content-completeness and conversion-readiness checklist.
- Optional platform attribution/powered-by treatment based on product tier.

### 4.9 Analytics

Privacy-conscious analytics should measure:

- Site visits.
- Unique anonymous visitors using a privacy-respecting method.
- Service and provider views.
- Booking-flow starts.
- Successful bookings.
- Booking conversion rate.
- Drop-off stage.
- Referral source and campaign.
- Device category and performance signals.
- Most-booked services and locations.

Do not capture form field values, health information, phone numbers, emails, free-text booking notes, or full URLs containing sensitive query data. Session replay is out of scope by default.

### 4.10 Publishing confidence

- Draft and published state.
- Explicit publish action.
- Immutable published revision.
- Version history.
- Rollback to a previous known-good revision.
- Template-switch preview before applying.
- Desktop/tablet/mobile previews.
- Preview by authenticated user or signed expiring link.
- Broken-link, missing-image, translation, accessibility, SEO, and booking-readiness checks.
- Optional scheduled publishing after the core workflow is stable.

### 4.11 Domain health center

Show:

- Required DNS records with copy actions.
- Verification token and verification status.
- Observed DNS results.
- DNS propagation guidance.
- Certificate provisioning and renewal status.
- CAA-related failures.
- Last successful health check.
- Canonical-domain status.
- Redirect status.
- Actionable remediation rather than raw infrastructure errors.
- Safe disconnect/removal instructions.

---

## 5. Target Domain Model

Use `Public Site` as the canonical domain term. “Website” remains acceptable product language, but code, permissions, logs, and documentation should consistently distinguish the public site from a Frappe site.

### 5.1 Public Site

Responsibilities:

- Own the public identity and platform slug.
- Point to exactly one organization or independent provider.
- Select template and template version.
- Hold draft brand, locale, SEO, navigation, and section configuration.
- Reference the currently published atomic Experience Release.
- Track lifecycle state.
- Define booking context.

Suggested fields:

- `site_title`
- `owner_type`: `Organization` or `Independent Provider`
- `organization`: Link, conditionally required
- `provider`: Link, conditionally required
- `slug`: unique normalized platform slug
- `status`: Draft, Published, Suspended, Archived
- `recipe_key`
- `draft_template_version`
- `content_schema_version`
- `default_locale`
- `enabled_locales`: child table
- `brand_logo`, `favicon`, `social_image`
- constrained color and typography tokens
- `current_release`: Link to `Experience Release`
- `first_published_at`, `last_published_at`, `last_published_by`
- `public_booking_enabled`
- `platform_url` as a derived value, not manually authoritative

Validation invariants:

- Exactly one owner link is populated.
- Provider owner is eligible for personal booking and is not being treated as an organization site.
- At most one non-archived site exists per owner.
- Slug is normalized, unique, and not reserved.
- Template and schema versions exist in the code registry.
- Published sites have a valid Experience Release and usable booking context.

### 5.2 Public Site Section

Child table containing:

- stable section instance ID
- section type
- enabled flag
- order/index
- schema version
- validated localized content payload
- optional references to Service, Provider, Location, and File records
- visibility/configuration flags allowed by that section type

The payload may be stored as JSON only behind a server-side schema registry. Clients must not be allowed to persist arbitrary keys and later render them unsafely.

### 5.3 Experience Release (supersedes Public Site Revision)

Immutable atomic publication record containing:

- public site
- release number and release hash
- pinned Brand Revision
- template key and version
- content-schema version
- full normalized published snapshot
- locale configuration
- canonical SEO state at publication time
- publishing user and timestamp
- source draft modification timestamp
- previous revision
- validation report summary

Releases must be append-only through the publishing module. Ordinary users cannot create, edit or delete releases. A separate Public Site Revision would duplicate the same snapshot/history and is intentionally not part of the target model. Define a retention policy before allowing administrative cleanup.

### 5.4 Public Site Domain

Responsibilities:

- Associate a normalized hostname with one public site.
- Track ownership verification, routing, TLS, health, canonical status, and lifecycle.

Suggested fields:

- `public_site`
- `hostname_ascii`
- `hostname_display`
- `domain_type`: Platform Path, Platform Subdomain, Custom Subdomain, Custom Apex
- `is_primary`
- `lifecycle_status`
- `verification_method`
- `verification_token`
- expected DNS records
- last observed DNS results
- `verified_at`, `last_checked_at`
- `certificate_status`, `certificate_expires_at`
- edge/provider reference ID
- activation/suspension/removal timestamps and actor
- last error category and safe user-facing message
- quarantine expiration

Do not store certificate private keys in this DocType.

### 5.5 Redirect record

Maintain server-controlled redirects for previous platform slugs and approved domain transitions. Redirect targets must be resolved from site/domain IDs rather than arbitrary user-entered URLs.

### 5.6 Template registry

Keep template manifests in version-controlled code. Each manifest declares:

- stable template key
- semantic template version
- compatible content-schema versions
- supported and required section types
- default section composition
- allowed brand tokens
- preview metadata/assets
- accessibility and localization support
- migration functions from supported older versions

Old renderer versions remain available while any published revision still pins them. A template release cannot silently change existing published output.

---

## 6. Deep Module Interfaces and Seams

### 6.1 Public request resolver

One interface resolves public identity:

```text
resolve_public_request(trusted_host, normalized_path)
    -> PublicRequestContext
```

The context contains:

- public-site ID
- published revision ID
- owner type and owner ID
- locale
- route kind: website, booking, asset, redirect, not found
- canonical origin and canonical URL
- template key/version
- cache policy

Callers must not independently query domains, parse tenant slugs, or infer owners.

### 6.2 Publication module

```text
validate_draft(public_site)
publish(public_site, expected_draft_version)
rollback(public_site, revision)
```

This module owns schema validation, reference authorization, snapshot generation, atomic pointer updates, cache invalidation, audit logging, and publication events.

### 6.3 Rendering module

```text
render_public_site(public_request_context)
    -> HTML response metadata and body
```

It loads only the published snapshot, selects the pinned renderer, applies safe localization and escaping, emits SEO metadata, and never performs tenant authorization decisions independently.

### 6.4 Booking facade

Expose a small tenant-aware interface for:

- list bookable services
- list eligible providers and locations
- obtain safe availability
- submit booking with transactional revalidation
- generate canonical booking links

It must validate the entire Organization → Service → Provider → Location relationship or the independent Provider → Service → Location relationship server-side.

### 6.5 Domain control plane

```text
request_domain(public_site, hostname)
verify_domain(domain)
activate_domain(domain)
suspend_domain(domain, reason)
remove_domain(domain)
refresh_domain_health(domain)
```

Provisioning, DNS checks, TLS, and edge configuration run as idempotent background operations. User requests change desired state; workers reconcile actual state.

### 6.6 Edge provider adapter

Define an adapter only because implementations may genuinely vary:

- Managed CDN/SaaS custom-hostname provider
- Self-managed reverse proxy plus ACME

The interface covers hostname registration, certificate state, routing activation, suspension, removal, and health retrieval. The initial adapter must be selected after confirming the production hosting environment and operational ownership.

---

## 7. Routing Architecture

### 7.1 Platform-domain routes

```text
/{site_slug}                  website home
/{site_slug}/am               localized home
/{site_slug}/book             booking entry
/{site_slug}/book/...         booking sub-routes if required
```

Reserve all existing and infrastructure paths, including at minimum:

- `api`, `app`, `assets`, `files`, `private`, `login`, `logout`, `signup`
- `home`, `calendar`, `analytics`, `settings`, `admin`, `reception`
- `schedule`, `preview`, `tasks`, `assistants`
- `.well-known`, `robots.txt`, `sitemap.xml`, `favicon.ico`

The complete list must be centrally maintained and tested against Frappe/framework routes.

### 7.2 Custom-domain routes

```text
/                              website home
/am                            localized home
/book                          booking entry
/book/...                      booking sub-routes if required
/robots.txt
/sitemap.xml
/.well-known/...               only controlled verification/challenge paths
```

Management and unrelated Frappe routes must not be exposed on custom domains. The edge or application router should explicitly deny `/app`, `/login`, unrestricted `/api`, and internal administrative paths while allowing only the exact assets and public endpoints required by rendering and booking.

### 7.3 Rendering choice

Recommended initial shape:

- Server-render or publication-render the public marketing website for SEO, accessibility, and fast first paint.
- Reuse or adapt the existing React booking experience under the nested `/book` route.
- Share design tokens and tenant context between server-rendered website output and the booking application.
- Avoid forcing the full current SPA boot payload onto every public landing-page request.

### 7.4 Canonical URL builder

All URLs used in HTML, email, QR codes, redirects, structured data, and booking responses must come from one trusted builder using the active `Public Site Domain` record. Do not construct security-sensitive links from raw `Host`, `X-Forwarded-Host`, client parameters, or stored free-form URLs.

---

## 8. Custom Domain Lifecycle

### 8.1 Domain states

Use an explicit state machine:

```text
Draft
  -> Awaiting DNS
  -> Verifying
  -> Verified
  -> Certificate Pending
  -> Activating
  -> Active

Any active/provisioning state
  -> Error
  -> Suspended
  -> Removing
  -> Quarantined
  -> Removed
```

Transitions must be validated and auditable. Background retries must be idempotent.

### 8.2 Verification

- Normalize and validate the hostname before saving.
- Require a random per-domain TXT proof.
- Also verify the expected routing record.
- Do not activate based only on an HTTP response controlled through an existing dangling CNAME.
- Recheck ownership immediately before edge activation and certificate issuance.
- Store observed results and timestamps.
- Provide separate instructions for subdomain CNAME and apex-domain A/AAAA/ALIAS/ANAME or provider-flattening cases.
- Detect CAA restrictions and explain required changes.

### 8.3 TLS

- Terminate TLS at the trusted edge/reverse proxy.
- Automate certificate issue and renewal.
- Keep private keys out of Frappe DocTypes and logs.
- Do not mark a domain Active until HTTPS and routing health checks pass.
- Monitor expiration and renewal failures.
- Use staging certificate authorities in development/integration tests.
- Apply HSTS only after successful stable activation.
- Never automatically enable customer-domain `includeSubDomains` or HSTS preload.

### 8.4 Removal and transfer safety

1. Stop treating the custom domain as canonical.
2. Keep a safe maintenance or platform redirect response during removal.
3. Ask the customer to remove/update DNS.
4. Observe at least the relevant DNS TTL and propagation window.
5. Remove edge routing and certificate association.
6. Quarantine the hostname mapping.
7. Require fresh ownership proof before the same domain can be attached again.

Provide emergency suspension that disables a domain without deleting the site or platform URL.

---

## 9. Security Requirements

Security controls in this section are release requirements, not optional hardening backlog.

### 9.1 Threat model

At minimum, model and test:

- Cross-tenant data disclosure or modification.
- Broken object-level authorization.
- Host-header injection and domain confusion.
- Dangling-domain takeover.
- Malicious or compromised DNS changes.
- XSS through content, rich text, URLs, SVG, styles, or template variables.
- SSRF through remote media or link previews.
- Malicious file uploads.
- Cache-key confusion and cross-tenant cache poisoning.
- CSRF and cross-origin booking submissions.
- Booking spam, slot hoarding, duplicate booking, and notification abuse.
- Enumeration of private or draft sites.
- Open redirects.
- Path traversal and normalization discrepancies.
- Certificate issuance/renewal failure.
- Abuse of preview links.
- Sensitive data leakage through analytics, URLs, logs, error reports, or referrers.
- Direct-origin bypass around edge security.
- Denial of service through expensive rendering, DNS checks, uploads, or availability queries.

### 9.2 Tenant authorization

- Deny by default.
- Enforce permission on every management read and mutation.
- Add `permission_query_conditions` and `has_permission` behavior for Public Site, domains, revisions, and any standalone content records.
- Organization access requires owner or active manager membership with the relevant capability.
- Provider access requires the linked provider user or an explicit active delegation.
- Never rely on role membership alone.
- Tenant and owner IDs are resolved server-side, not trusted from client payloads.
- Validate linked Service, Provider, Location, File, and revision ownership on every write and publication.
- System Manager actions remain logged and must not bypass integrity validation.
- Public APIs return published allowlisted fields only.

### 9.3 Host trust

- Strip inbound forwarding headers at the public edge.
- Set one trusted original-host header at the edge.
- Maintain an edge allowlist derived from Active domain mappings.
- Reject unknown hosts; never serve the default site or first virtual host.
- Normalize port, case, Unicode/IDNA, and trailing dots consistently.
- Protect direct application origins through network policy or authentication.
- Compare Origin/Referer against the trusted target origin for state-changing browser requests.
- Do not generate redirects, password links, canonical tags, or cache keys directly from raw headers.

### 9.4 Content/XSS safety

- No arbitrary script, style, iframe, template, or event-handler input.
- Contextually escape all text and attributes.
- Sanitize allowed rich text on the server with an explicit tag/attribute/protocol allowlist.
- Validate links and allow only approved schemes, normally `https`, `http`, `mailto`, and `tel` where appropriate.
- Add `rel="noopener noreferrer"` to untrusted external links opened in a new context.
- Validate color tokens, font choices, spacing values, and media references structurally.
- Use a nonce- or hash-based Content Security Policy where feasible.
- Disallow inline executable JavaScript and `eval`.
- Set `frame-ancestors 'none'` except on a future dedicated embed route.
- Consider Trusted Types for client-side rendering sinks.

### 9.5 Media/upload safety

- Allowlist formats; initially prefer JPEG, PNG, and WebP.
- Reject tenant-uploaded SVG in v1.
- Verify magic bytes and decoded image type rather than trusting extension or MIME header.
- Enforce byte-size, pixel-dimension, item-count, and tenant-storage quotas.
- Decode and re-encode images; strip unnecessary metadata.
- Generate non-user-controlled storage names.
- Ensure website media is explicitly public and owned/authorized by the site owner.
- Never expose private Frappe File URLs in published snapshots.
- Return correct content types and `X-Content-Type-Options: nosniff`.
- Add malware scanning before supporting documents or other complex file types.
- Prefer upload over server-side remote-image import.

### 9.6 SSRF safety

Do not ship arbitrary remote URL import in v1. If introduced later:

- Accept only needed hostname input rather than arbitrary URLs where possible.
- Allowlist schemes and ports.
- Reject loopback, link-local, private, metadata-service, reserved, and non-routable addresses after every DNS resolution.
- Revalidate after redirects and limit redirect count.
- Protect against DNS rebinding.
- Restrict egress at the network layer.
- Apply strict timeout and response-size limits.
- Never forward platform credentials or cookies.

### 9.7 Browser/session safety

- Keep admin authentication on the platform domain.
- Use Secure, HttpOnly, host-only session cookies.
- Use SameSite=Lax or stricter where compatible.
- Enforce CSRF tokens on state-changing requests.
- Add Fetch Metadata and Origin checks as defense in depth.
- Use an explicit minimal CORS policy; do not use wildcard credentialed CORS.
- Set Content Security Policy, `X-Content-Type-Options`, Referrer Policy, and a conservative Permissions Policy.
- Do not store secrets or sensitive booking details in browser storage.

### 9.8 Booking integrity and abuse controls

- Enforce `enable_public_booking` and all active-status gates.
- Revalidate service/provider/location ownership and eligibility server-side.
- Recheck availability inside the booking transaction.
- Add database-level or transactional protection against double booking.
- Support idempotency keys for booking submission.
- Rate limit by site, domain, IP, and endpoint category.
- Add progressive friction: honeypot first, then adaptive CAPTCHA or verification when abuse signals trigger.
- Rate limit notification sends independently.
- Avoid exposing sequential IDs or unnecessary personal/provider data.
- Return generic enumeration-resistant errors where appropriate.
- Do not put customer PII in URLs.

### 9.9 Cache isolation

Cache keys must include:

- canonical Frappe site/environment
- Public Site ID
- published revision/content hash
- normalized resolved host/domain mapping ID
- locale
- normalized route

Rules:

- Never cache draft, preview, authenticated management, customer data, booking mutations, or personalized responses in shared caches.
- Treat availability responses as short-lived and separately keyed; prefer no shared cache until correctness is demonstrated.
- Prevent an unknown Host from populating caches.
- Purge relevant keys after publish, rollback, domain activation, domain suspension, slug change, or template security update.
- Add automated tests specifically for cross-host and cross-tenant cache isolation.

### 9.10 Preview safety

- Authenticated preview is the default.
- Signed preview links are random, scoped to one site/revision, expiring, revocable, and read-only.
- Preview responses are `noindex` and `no-store`.
- Preview must not weaken draft authorization or expose management APIs.
- Preview tokens must not appear in analytics or referrer headers; set an appropriate Referrer Policy.

### 9.11 Secrets and infrastructure

- Store edge-provider, DNS, and certificate credentials in the deployment secret manager.
- Use narrowly scoped credentials.
- Do not store DNS-provider credentials on the application host when avoidable.
- Separate production and non-production accounts/credentials.
- Rotate credentials and audit use.
- Avoid logging secrets, verification internals that should be private, session IDs, or PII.

### 9.12 Auditability

Audit:

- ownership and manager changes
- draft publication and rollback
- template/version changes
- slug changes
- preview-link creation/revocation
- domain request, verification, activation, suspension, and removal
- canonical-domain changes
- security-sensitive System Manager actions
- automated state transitions and external provider failures

Audit events should include actor, timestamp, target IDs, action, result, and request/correlation ID without recording sensitive content unnecessarily.

---

## 10. Reliability and Disaster Recovery

### 10.1 Failure isolation

- Domain provisioning failure must not corrupt site content.
- Certificate failure must leave the platform URL usable.
- Draft validation failure must not affect the live revision.
- Template upgrade failure must preserve the pinned previous renderer and revision.
- Analytics failure must never block page rendering or booking.
- Website rendering failure must not mutate booking data.
- Booking failure must return a recoverable error without republishing or altering website state.

### 10.2 Backups

- Back up database records, published revisions, draft content, public media, redirect history, and domain-control metadata.
- Encrypt backups and keep an off-site copy.
- Define retention, recovery-point objective, and recovery-time objective.
- Run scheduled restoration drills and record results.
- Do not assume successful backup-job completion proves restorability.
- Edge/provider configuration must be reproducible from the database desired state plus version-controlled infrastructure configuration.

### 10.3 Rollback and kill switches

- Roll back to a prior published revision without editing it.
- Suspend one domain without suspending the Public Site.
- Suspend one Public Site without deleting content or domain history.
- Disable one template version globally if a security issue is found and move affected sites to a safe fallback or patched compatible renderer.
- Disable custom-domain routing globally while preserving platform paths during an edge incident.
- Publication readiness is verified per site and environment; no public-experience mode flag is required.

### 10.4 Observability

Metrics and alerts:

- public request volume, latency, and error rate by route kind
- rendering/cache hit rate
- publish success/failure
- booking-start and booking-completion failures
- DNS verification queue depth and age
- certificate pending duration, renewal failure, and expiry horizon
- unknown/rejected Host attempts
- domain-health failures
- rate-limit and abuse events
- cross-tenant authorization denials
- storage and media-processing failures
- background-job retries and poison jobs

Use correlation IDs across edge, web request, job, domain provider, and audit events.

### 10.5 Runbooks

Create runbooks for:

- custom domain stuck pending
- CAA prevents certificate issuance
- certificate renewal failure
- DNS points away from the platform
- suspected domain takeover
- template XSS/security issue
- accidental publication
- tenant data-isolation incident
- cache contamination
- edge provider outage
- database/media restore
- customer domain removal or transfer

---

## 11. Implementation Workstreams and Phases

Phases are ordered by dependency and risk. A later phase must not start production publication until the prior phase's exit criteria pass.

### Phase 0 — Runtime, baselines, and threat model

Deliverables:

- Select an approved isolated Frappe development site with the app installed.
- Record supported Frappe/runtime versions.
- Capture current booking route and API behavior with characterization tests.
- Document current permission behavior for Organization, Provider, Service, Location, EventType, User Appointment Availability, and Booking Event.
- Complete a lightweight threat model covering the threats in Section 9.
- Decide production edge ownership and shortlist the first domain-provider adapter.
- Establish feature flags and observability naming.

Exit criteria:

- Reproducible isolated runtime exists.
- Existing booking tests pass or known failures are baselined.
- Security and infrastructure owners approve the threat model and edge direction.

### Phase 1 — Harden the booking domain seam

Deliverables:

- Introduce tenant-aware booking facade/interface.
- Update organization public reads to require `is_active`, `enable_public_booking`, active services, and valid owner relationships.
- Replace deprecated single-organization provider queries with the current relationship model.
- Verify every EventType/Service/Provider/Location combination belongs to the requested organization or independent provider context.
- Centralize canonical booking-link creation.
- Add transactional availability revalidation and idempotent booking submission if not already guaranteed.
- Add public endpoint rate limits and abuse instrumentation.
- Preserve the established booking route contract while the release-scoped adapter is adopted surface by surface.

Exit criteria:

- Cross-tenant service/provider/location IDs are rejected.
- Disabled organizations/providers cannot be booked publicly.
- Existing legitimate personal and organization booking flows remain compatible.
- Security-focused integration tests pass.

### Phase 2 — Public Site data model and permission system

Deliverables:

- Add Public Site, Public Site Section, Public Site Locale, atomic Experience Release, and redirect metadata.
- Implement owner XOR validation and one-site-per-owner policy.
- Add reserved-slug registry and validation.
- Add permission query conditions and document-level permission hooks.
- Add audit events.
- Define section schemas and normalized snapshot format.
- Seed or create sites only through explicit onboarding/admin action; do not silently publish existing organizations.

Exit criteria:

- Owners/managers see only authorized sites.
- Cross-tenant links and media fail validation.
- Experience Releases are immutable and factory-created only.
- Reserved and duplicate slugs cannot be created, including under concurrent requests.

### Phase 3 — Template registry and rendering foundation

Deliverables:

- Implement code-owned template registry and manifest validation.
- Implement shared section registry and safe render models.
- Implement server-side/publication rendering.
- Build initial three templates.
- Implement brand-token validation, responsive image handling, CSP-compatible assets, accessibility baseline, and localization.
- Implement SEO metadata, structured data, sitemap, canonical, `hreflang`, and robots behavior.
- Implement rendering tests and visual regression snapshots.

Exit criteria:

- Three templates render the same normalized content without content-model branching.
- Useful HTML and SEO metadata exist without client JavaScript.
- Accessibility and performance budgets pass.
- Tenant content cannot inject executable markup or unsafe URLs.

### Phase 4 — Editing, preview, and publication

Deliverables:

- Guided site setup and template recommendation.
- Auto-population from organization/provider booking data.
- Section ordering, enable/disable, localized editing, brand editing, and media upload.
- Desktop/tablet/mobile previews.
- Authenticated and signed preview support.
- Readiness checks.
- Atomic publish and rollback.
- Template-switch preview and compatible-version migration flow.
- Cache invalidation and publication events.

Exit criteria:

- Draft changes never alter the live site.
- Concurrent editing/publishing detects stale drafts.
- Rollback restores a prior revision and purges caches.
- Preview is authorization-protected, `noindex`, and `no-store`.

### Phase 5 — Platform-domain routing and integrated `/book`

Deliverables:

- Implement `/{site_slug}` and locale routes with correct precedence.
- Implement `/{site_slug}/book` using the booking facade.
- Reserve and test all platform/internal paths.
- Pass site context, brand tokens, locale, canonical origin, and return URL into booking.
- Add old-booking-link compatibility and migration behavior.
- Add per-site/revision/locale/path cache strategy.
- Add QR/share-link generation from the canonical URL builder.

Exit criteria:

- Platform routes never shadow application, API, asset, file, or framework routes.
- Organization and provider sites render and book correctly.
- Cache isolation tests pass across sites, hosts, revisions, and locales.
- Existing booking URLs continue to function according to the compatibility policy.

### Phase 6 — Platform-managed subdomains

Deliverables:

- Optional `slug.platform.example` addressing.
- Wildcard DNS and TLS at the platform edge.
- Same Public Site resolver and renderer used by path and subdomain routes.
- Canonical-origin selection and redirect behavior.
- Domain-health presentation for platform subdomains.

Exit criteria:

- No separate tenant content or booking implementation exists for subdomains.
- Host allowlisting and unknown-host rejection work at the edge.
- Cookies, caches, canonical links, and booking calls remain isolated.

### Phase 7 — Customer-owned custom domains

Deliverables:

- Public Site Domain DocType and state machine.
- Domain request UI and validation.
- TXT ownership verification and routing-record checks.
- Edge-provider adapter and chosen production implementation.
- Automated certificate issuance, renewal, status synchronization, and alerts.
- Custom-host routing to the canonical Frappe site.
- Public-route allowlist on custom domains.
- Canonical URL and redirect handling.
- Removal, quarantine, re-verification, and emergency suspension.
- Domain health center.

Exit criteria:

- An unverified domain cannot be routed or receive a production certificate through this system.
- Unknown hosts fail closed.
- Custom domains expose public website/booking only.
- Certificate renewal and DNS drift are monitored.
- Full lifecycle tests pass for subdomain, apex, failure, removal, and reassignment scenarios.

### Phase 8 — Analytics and conversion enhancements

Deliverables:

- Privacy-conscious event model.
- Site visit, booking funnel, source/campaign, and conversion reporting.
- Announcement, featured service, social sharing, and promotion controls.
- Accessibility, SEO, and performance health panels.
- Retention and anonymization policies.

Exit criteria:

- Analytics contain no submitted PII or booking notes.
- Analytics failure cannot block rendering or booking.
- Event definitions and conversion calculations are documented and tested.

### Phase 9 — Expand template catalogue and optional enhancements

- Grow from three templates toward 5–10 based on real provider categories.
- Add scheduled publishing.
- Consider dedicated embed route/widget with narrow framing/CORS rules.
- Consider multi-page support without weakening the content model.
- Consider AI-assisted copy only with explicit approval and safe data handling.
- Evaluate external reviews and marketing integrations separately.

---

## 12. API and Background Job Surface

Exact method names may follow repository conventions, but responsibilities should remain separated.

### Management operations

- get or create the current owner's Public Site
- update draft identity/branding/locales/SEO
- list and update ordered sections
- validate draft/readiness
- generate preview authorization
- publish
- rollback
- switch/upgrade template in draft
- retrieve revision history and audit events
- retrieve privacy-safe analytics

### Public operations

- resolve published site context
- retrieve only data needed by booking UI
- list bookable services/providers/locations through the booking facade
- obtain availability
- submit idempotent booking
- emit allowlisted analytics events

### Domain operations

- request domain
- obtain DNS instructions
- retry verification
- set primary/canonical domain
- request removal
- suspend/reactivate where authorized
- read sanitized health state

### Jobs

- domain verification reconciliation
- edge registration reconciliation
- certificate status refresh
- periodic DNS health checks
- renewal/expiry alerts
- cache purge retry
- scheduled publication
- image derivative generation/security processing
- analytics aggregation/retention
- redirect/domain quarantine expiry

Jobs must use deterministic idempotency keys and bounded retry policies. External side effects must be recorded so retries do not duplicate provisioning actions.

---

## 13. Permissions Matrix

| Capability | System Manager | Organization Owner | Organization Manager | Independent Provider | Public Guest |
|---|---:|---:|---:|---:|---:|
| View own draft | Yes | Yes | Capability-dependent | Yes | No |
| Edit content/brand | Yes | Yes | Capability-dependent | Yes | No |
| Publish/rollback | Yes | Yes | Explicit capability | Yes | No |
| Manage custom domain | Yes | Yes | Explicit capability | Yes | No |
| View domain internals/secrets | Restricted | Sanitized only | Sanitized only | Sanitized only | No |
| View published site | Yes | Yes | Yes | Yes | Yes |
| Use public booking | Yes | Yes | Yes | Yes | When enabled |
| View another tenant's draft/domain | Administrative and audited only | No | No | No | No |

Delegated permissions should be explicit capabilities rather than inferred solely from generic roles.

---

## 14. Testing Strategy

### 14.1 Unit tests

- slug and reserved-path normalization
- Unicode/IDNA hostname normalization
- owner XOR and one-site-per-owner invariants
- section-schema validation
- unsafe URL/rich text/color rejection
- template compatibility/version resolution
- canonical URL generation
- domain state transitions
- cache-key composition
- booking ownership validation
- publication snapshot determinism

### 14.2 Permission tests

- owner, manager, provider, delegate, System Manager, and Guest matrices
- cross-organization ID substitution
- provider belonging to multiple organizations
- independent-provider versus organization-site access
- inactive/revoked manager/delegate access
- File/media ownership substitution
- revision immutability

### 14.3 Public routing tests

- platform path, platform subdomain, custom subdomain, and apex domain
- locale paths
- reserved routes
- case, port, trailing dot, percent encoding, repeated slash, and Unicode normalization
- unknown Host and forged forwarding headers
- old booking URLs and redirects
- canonical and `hreflang` correctness

### 14.4 Security tests

- stored/reflected/DOM XSS payloads in every content field
- malicious protocols and redirect targets
- SVG/polyglot/spoofed upload types
- direct private-file reference
- CSRF and cross-origin requests
- Host-header injection and cache poisoning
- preview token guessing, reuse after revocation, and expiration
- SSRF regression if any remote fetch exists
- rate limiting, spam, slot hoarding, and duplicate submission
- direct-origin bypass
- custom-domain route allowlist
- tenant isolation under warm shared caches

### 14.5 Publishing tests

- draft does not affect live output
- stale draft/conflicting publish
- atomic revision creation and pointer update
- rollback
- template upgrade and failed migration
- cache purge failure/retry
- publication during concurrent operational-data changes

### 14.6 Domain integration tests

- correct TXT and routing records
- missing/wrong/stale TXT
- CNAME chain and apex behavior
- slow propagation
- CAA failure
- certificate pending, issuance, renewal, and failure
- DNS drift after activation
- suspension/removal/quarantine/re-verification
- provider API timeout, duplicate callback, and out-of-order state

Use provider sandboxes or fakes for deterministic automated tests and run a smaller controlled real-DNS/certificate suite in a dedicated non-production zone.

### 14.7 Accessibility tests

- automated WCAG checks for every template and booking state
- keyboard-only flows
- screen-reader landmarks, headings, forms, validation, and status announcements
- focus management across booking steps
- contrast under all allowed brand-token combinations
- reduced motion
- 200% zoom/reflow
- English and Amharic layouts

### 14.8 Performance tests

- cold and warm website render
- edge/cache behavior
- image loading and responsive derivatives
- booking availability under load
- publish/cache-purge latency
- domain resolver latency with large domain tables
- background verification/renewal load

Define budgets before implementation. At minimum, public-site resolution must use indexed lookups and must not perform unbounded queries or load draft/editor data.

### 14.9 Disaster-recovery tests

- restore database and public media into an isolated environment
- rebuild edge desired state from restored records
- restore canonical site after accidental domain suspension
- recover from bad template release
- restore prior published revision
- simulate expired certificate and edge outage

---

## 15. Deployment and Rollout

1. Ship schema and management functionality behind feature flags.
2. Enable internal/test tenants on platform paths only.
3. Launch three templates to a small provider cohort.
4. Measure publishing reliability, booking conversion, performance, and support burden.
5. Enable platform subdomains.
6. Pilot custom domains with staff-assisted DNS setup.
7. Validate automated provisioning, removal, monitoring, and incident runbooks.
8. Expand self-service custom domains gradually.
9. Add templates and conversion features based on observed business categories.

Rollout safeguards:

- Per-site feature flag.
- Per-environment domain provisioning flag.
- Global custom-domain kill switch.
- Global template-version disable switch.
- Compatibility redirects for existing booking URLs.
- No forced automatic publication or custom-domain activation.
- Clear support escalation for DNS/certificate issues.

---

## 16. Data Migration and Compatibility

- Do not convert the platform-wide `Landing Page Settings` into tenant records.
- Optionally prefill new Public Site drafts from Organization/Provider data, but require review before first publication.
- Preserve current booking routes until migration metrics show they can be retired.
- Redirect old organization booking links to the new nested site booking route only after relationship and query parameters are mapped safely.
- Maintain a redirect record when platform slugs change.
- Avoid rewriting stored URLs throughout the database; derive public URLs from identity plus active canonical domain.
- Keep template/content migrations separate from Frappe schema migrations where possible.
- Never mutate immutable published revisions during draft migration.

---

## 17. Documentation and Support Deliverables

- Public Site domain glossary.
- Architecture decision records for:
  - Public Site as the website identity separate from Organization/Provider.
  - Application-level custom domains routed to one Frappe site.
  - Immutable published snapshots and pinned template versions.
  - Public-only custom-domain boundary.
  - Selected edge/domain-provider adapter.
- Template-authoring guide.
- Section-schema guide.
- Domain DNS setup guides for common configurations.
- Security and threat-model document.
- Incident and recovery runbooks.
- Support troubleshooting decision tree.
- Provider-facing custom-domain setup help.
- Privacy/analytics event catalogue.

Only create ADRs after the actual implementation alternative is selected and the decision is hard to reverse.

---

## 18. Definition of Done

The layered capability is complete when:

- An organization can create, preview, publish, update, and roll back one branded site.
- An independent provider can do the same without an Organization.
- Website content can be rendered through multiple genuinely distinct versioned templates.
- Services, providers, locations, and booking actions are correctly linked to the owner.
- The site works at its platform URL and nested `/book` route.
- English and Amharic content and metadata work according to the locale policy.
- SEO, structured data, sitemap, canonical URLs, and social previews are correct.
- Drafts and previews cannot leak publicly.
- Permission and cross-tenant isolation tests pass.
- A customer can verify and activate a subdomain or apex domain.
- TLS issuance and renewal are automated and monitored.
- Unknown, unverified, suspended, removed, or malformed hosts fail safely.
- Custom domains expose public site and booking surfaces only.
- Host, origin, cache, upload, XSS, CSRF, SSRF, and booking-abuse controls pass security tests.
- Published output can be recovered after content, template, cache, domain, or certificate failures.
- Backups have been restored successfully in a drill.
- Monitoring, alerts, audit logs, kill switches, and runbooks are operational.
- No customer PII is captured in website analytics or emitted into public URLs/logs.
- Existing supported booking links remain compatible or have tested redirects.

---

## 19. Success Metrics

Product:

- Time from site creation to first publish.
- Percentage of sites completing setup.
- Percentage connecting a platform subdomain/custom domain.
- Website-to-booking-start conversion.
- Booking-start-to-completion conversion.
- Template adoption and switching rate.
- English/Amharic publication usage.

Reliability:

- Public-site availability and latency.
- Publish success rate.
- Domain verification and certificate activation time.
- Certificate renewal success rate.
- Booking error and duplicate-booking rate.
- Cache isolation/security incident count.
- Restore-drill success and measured recovery time.

Security:

- Cross-tenant authorization regression count.
- Unknown-host rejection rate.
- Abuse prevented versus false-positive rate.
- Domain drift/takeover alerts resolved within target time.
- Critical dependency/template security remediation time.

---

## 20. Future Opportunities, Not Initial Commitments

- Multiple brands/sites per organization.
- Multiple verified aliases with one canonical domain.
- General multi-page site builder.
- Embeddable booking widget for existing third-party sites.
- External review sync.
- AI-assisted copy and image recommendations with explicit human approval.
- Custom email sending domains.
- Deeper campaigns and marketing automations.
- CRM-backed inquiry and lead forms after the customer identity model is designed.
- Resource/equipment-aware website availability after resource capacity is designed.

These should reuse the Public Site, publication, domain, and booking seams rather than bypassing them.

---

## 21. Security References

- OWASP Authorization Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html>
- OWASP Cross-Site Scripting Prevention Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html>
- OWASP CSRF Prevention Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html>
- OWASP File Upload Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>
- OWASP SSRF Prevention Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html>
- OWASP Subdomain Takeover Prevention Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Subdomain_Takeover_Prevention_Cheat_Sheet.html>
- OWASP Host Header Injection Testing: <https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/07-Injection/17-Host_Header_Injection/>
- OWASP TLS Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html>
- Let's Encrypt Challenge Types: <https://letsencrypt.org/docs/challenge-types/>
- MDN CSP `frame-ancestors`: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors>
