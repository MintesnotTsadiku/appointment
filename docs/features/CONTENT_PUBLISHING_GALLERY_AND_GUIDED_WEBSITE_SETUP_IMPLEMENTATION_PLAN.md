# Content Publishing, Gallery, and Guided Website Setup — Implementation Plan

**Status:** Proposed
**Date:** 2026-09-25
**Primary app:** `appointment`
**Required Frappe apps:** `blog`, `newsletter`
**Related plans:** Curated Brand Recipes v1, Tenant Websites and Custom Domains, Public Booking Recipe Adoption

## 1. Outcome

The product will let each business run one branded public site with:

- a landing page and booking journey;
- a blog index and article pages;
- gallery indexes and gallery collection pages;
- optional newsletter subscription and sending;
- a guided website setup flow;
- a safe organization workbook import;
- plan-aware feature access that can support paid plans later.

Each certified template will own its visible blog and gallery designs. The templates will share content, security, publishing, and entitlement contracts. They will not share visual page components.

The work is complete only after a new, non-administrator business owner finishes setup on a clean site through the visible product interface.

## 2. Decisions

### 2.1 Use the official Blog and Newsletter apps

Frappe version 16 moved Blog and Newsletter out of the framework. Use the official `frappe/blog` and `frappe/newsletter` apps instead of rebuilding their authoring and delivery features.

The appointment app will declare both through `required_apps`. The production bench, container, and deployment manifest must also fetch and pin compatible versions. `required_apps` can install an app already present on the bench. It cannot fetch a missing Git repository.

The dependency lock must record:

- repository URL;
- pinned branch, tag, or commit;
- compatible Frappe version;
- license;
- tested appointment version;
- upgrade and rollback procedure.

The Blog app is the article authoring system. Do not add a second `Article` DocType unless a later requirement differs from a blog post in lifecycle or permissions.

The Newsletter app provides campaign composition and delivery. Installation does not grant a business permission to send. Sending also requires a verified sender, an approved audience, working unsubscribe behavior, configured outbound email, rate limits, and an active entitlement.

### 2.2 Keep business ownership in the appointment app

The upstream apps do not define this product's `Business`, `Public Site`, membership, plan, or published-release boundaries. Add an appointment-owned integration layer.

Every tenant-owned blog record must resolve to exactly one business and one public site. Categories, authors, audiences, newsletters, and published articles must never become site-global content by accident.

Use server-side permission query conditions and document permission checks. A global Frappe role alone must never grant access to another business.

### 2.3 Separate authoring from public delivery

The official apps will own editable authoring records. Public traffic will not read mutable authoring records directly.

Publishing will create an immutable, sanitized content release. The public renderer will read that release with the active `Experience Release`. This keeps previews private and makes rollback, caching, audit, and safe rendering predictable.

A content change does not need to republish the whole website. Each article or gallery collection can publish a new content release against a compatible site and template version.

### 2.4 Build Gallery in the appointment app

No selected dependency supplies the required business-scoped gallery model. Add a native gallery module with explicit ownership, media safety, consent, ordering, and publishing rules.

The first version will support:

- image uploads;
- approved hosted-video links;
- optional managed video uploads when storage and processing limits are ready;
- collections grouped by topic, service, project, event, or date;
- title, summary, caption, alt text, credit, date, tags, and cover media;
- manual ordering and date ordering;
- draft, scheduled, published, archived, and withdrawn states.

Do not accept arbitrary iframe HTML. Hosted video will use typed providers and normalized video identifiers from an allowlist.

### 2.5 Add entitlements before paid plans

Feature access and payment are separate concerns. Build a small entitlement boundary now and connect a payment gateway later.

The first capability keys will include:

- `public_site`;
- `custom_domain`;
- `blog`;
- `gallery`;
- `newsletter`;
- `managed_video`;
- `advanced_brand_service`.

Each capability may also carry limits, such as published articles, gallery storage, audience size, or monthly sends.

The server must enforce every capability and limit. Hidden navigation is not access control. Expired access must stop new writes or sends without deleting existing content. Public-content behavior after expiry must follow a written product policy.

### 2.6 Keep website setup separate from core account setup

A new owner must first create the operational business. Public website setup is an optional guided flow called **Website Setup**.

The main onboarding may offer Website Setup, but a user may skip it. Appointment operations must not depend on choosing a template or writing marketing content.

### 2.7 Use live template previews

Do not make users choose from screenshots alone. Use screenshots as fast catalog thumbnails, then open a live preview with safe sample content or the user's draft content.

The preview must support:

- desktop and mobile widths;
- light and dark modes when the template supports them;
- landing, blog, article, gallery, and booking surfaces;
- temporary palette, font, density, and imagery choices;
- no public publication or search indexing.

Preview data must remain server-authorized. The preview route must use signed or session-bound identifiers and must not expose another business's draft.

### 2.8 Recommend templates instead of presenting a large grid

Add structured catalog metadata to each certified template:

- supported industries;
- business model: solo or organization;
- mood attributes;
- audience attributes;
- content density;
- imagery intensity;
- supported public surfaces;
- required asset roles;
- light and dark support;
- supported scripts and locales;
- accessibility certification version.

Website Setup will ask a few questions about industry, audience, and desired feeling. It will then show a short ranked list. Users can still view all certified templates.

The ranking rules must be deterministic and explainable. Do not use personal or sensitive data for ranking.

## 3. Domain model

### 3.1 Dependency integration

Add appointment-owned links or mapping records for upstream content. Do not fork upstream DocTypes unless qualification proves that extension hooks cannot provide safe tenancy.

Required ownership fields:

- business;
- public site;
- status;
- created by membership;
- last publication;
- entitlement capability;
- locale when localized content is enabled.

The integration layer must fail closed when ownership is absent or ambiguous.

### 3.2 Published Content Release

Create a published-content record with:

- content type: article or gallery collection;
- source DocType and source name;
- business and public site;
- route and locale;
- sanitized content projection;
- media projection;
- template compatibility version;
- source modification timestamp;
- canonical content hash;
- published by and published at;
- superseded release;
- withdrawn state and reason.

Only one active release may own a route for one public site and locale.

### 3.3 Gallery Collection

Create a parent record for a curated group of media:

- business and public site;
- title, slug, summary, and cover;
- grouping type and optional grouping value;
- event or display date;
- tags;
- visibility and publication state;
- ordering mode;
- SEO title and description;
- consent review status when people appear in media.

### 3.4 Gallery Item

Create an ordered child or owned record with:

- typed media source;
- local file or approved video reference;
- thumbnail and poster image;
- caption, alt text, credit, and date;
- focal point and aspect-ratio hints;
- sort order;
- checksum and media metadata;
- consent status and evidence reference when required.

Use a separate owned record if one media item may appear in several collections. Use a child table if reuse is not required. Decide this during the gallery tracer implementation, not through speculative abstraction.

### 3.5 Business Entitlement

Create one server-owned entitlement projection per business and capability:

- capability key;
- state: active, trial, grace, suspended, or expired;
- effective dates;
- numeric limits;
- source: default, administrator, plan, contract, or payment;
- source reference;
- last reconciliation timestamp.

Business owners may read their effective entitlements. Only trusted server workflows may change them.

### 3.6 Newsletter audience

Do not let a business send to arbitrary platform users or another business's customers.

The audience model must record:

- business;
- normalized email;
- consent status and source;
- consent and confirmation timestamps;
- locale;
- unsubscribe state and timestamp;
- suppression reason;
- source form or import batch;
- audit history.

Use opaque, revocable unsubscribe tokens. Do not place personal data in unsubscribe URLs.

## 4. Public page contract

Each independent template package must add these surfaces:

1. Blog index.
2. Article detail.
3. Gallery index.
4. Gallery collection detail.
5. Empty and unavailable states.
6. Newsletter signup treatment where the template supports it.

Each package owns its JSX, CSS, responsive structure, pagination treatment, cards, media composition, and transitions. It must extend the same visual language as its landing and booking surfaces.

Packages may share only headless contracts:

- route data types;
- safe rich-text output;
- pagination state;
- SEO metadata;
- media URL policy;
- typed actions;
- consent and availability states;
- analytics event names;
- entitlement outcomes.

Do not import a blog card, gallery grid, article layout, or navigation component from another template package.

## 5. Safe content rules

### 5.1 Rich text

Sanitize rich text on write and publication. Public projections must reject scripts, event attributes, unsafe URLs, arbitrary styles, and unknown embeds.

Define an allowlist for headings, paragraphs, lists, links, quotes, code, tables, and approved media blocks. Render from structured blocks when the upstream editor supports a stable structure.

### 5.2 Media

Validate MIME type from file content, not file extension. Enforce size, dimensions, duration, and storage limits.

Generate safe derivatives for public images. Strip unsafe metadata where practical. Keep originals private when they may contain sensitive information.

Medical and wellness media must support an explicit consent review. Seed data must never imply real patient consent or use real patient records.

### 5.3 Newsletter

Require a verified sender identity. Process sends through background jobs with idempotency keys, per-business quotas, global throttles, retry limits, and delivery logs.

Honor unsubscribe and suppression before queueing each recipient. Do not treat a booking email address as marketing consent.

Escape or sanitize newsletter content before delivery. Block arbitrary recipient queries and arbitrary server-side templates.

## 6. Guided Website Setup

### Step 1: Confirm the business

Show the active business, owner role, operational readiness, and existing public-site status. Refuse setup when the user lacks an active owner or manager membership with website permission.

### Step 2: Define the audience

Ask for industry, business type, primary audience, desired feeling, preferred content density, and main action. Keep this step short and skippable.

### Step 3: Choose a template

Show three to five ranked choices with catalog thumbnails. Open any choice as a live, full-surface preview.

### Step 4: Add brand identity

Collect the name, logo, favicon, approved palette choice, font pairing, light and dark preference, and imagery. Offer only recipe-declared adjustments.

### Step 5: Review imported business content

Prefill services, providers, locations, hours, contact information, and booking actions from operational records. Let the owner add marketing text without duplicating operational facts.

### Step 6: Select content features

Let the owner enable Blog, Gallery, and Newsletter when entitled. Explain setup work and sending requirements before enabling Newsletter.

### Step 7: Check readiness

Validate required content, assets, contrast, routes, booking targets, alt text, consent, permissions, and domain status. Show specific fixes.

### Step 8: Publish

Publish first to the platform subdomain. Handle custom-domain verification and HTTPS as a separate flow.

### Step 9: Maintain

Send the owner to a website workspace with drafts, previews, releases, content, media, audience, and publication history.

## 7. Organization workbook import

Provide a versioned spreadsheet workbook for organizations. It will reduce repetitive data entry without bypassing validation.

The workbook will contain these sheets:

1. `Read Me` with instructions and data rules.
2. `Organization` with one organization row.
3. `Locations` with stable import keys.
4. `Team` with email, display name, membership role, provider link, and location scope.
5. `Providers` with professional details and media references.
6. `Services` with duration, location, provider, capacity, and public visibility.
7. `Availability` with time zone and weekly hours.
8. `Website Content` with approved starter fields.
9. `Examples` with clearly marked sample rows that are never imported.

The import flow will:

- download the current template version;
- upload and parse without writing;
- show row and cell errors in plain language;
- show a proposed create/update summary;
- require confirmation;
- write in one controlled transaction or resumable batch;
- keep an import audit record;
- support safe retry through stable import keys;
- never accept plaintext passwords;
- send invitations only after explicit confirmation.

The importer must use the same service and permission layer as manual setup. It must not insert records with `ignore_permissions` from a user-facing request.

Solo providers will use the guided forms. Do not make the workbook the default solo experience.

## 8. Seeded showcases

Expand each showcase business with content that fits its industry and template:

- three to six published articles;
- article categories and authors;
- two to four gallery collections;
- varied image and video examples;
- newsletter signup copy;
- one draft newsletter and one safe preview campaign;
- realistic dates, captions, alt text, and SEO metadata.

Seed through the same application services used by the product where practical. Record ownership in the seeder manifest. Keep all shipped assets local, versioned, checksummed, licensed, and reproducible.

Do not send seeded newsletters. Do not create real subscribers. Use reserved example domains and clearly synthetic consent records when a UI needs subscriber states.

Seeded showcases prove design quality and deployment reproduction. They do not count as onboarding acceptance.

## 9. Clean-site browser acceptance

Create a new isolated site with only:

- Frappe;
- Blog;
- Newsletter;
- Appointment;
- Agent Harness and Agent Plane for managed browser validation.

Do not install showcase data on this site.

An administrator may provision the first test user because public signup is out of scope. After that point, run the product journey as normal users through the managed browser.

### 9.1 Individual owner journey

1. Sign in as a new owner.
2. Finish operational onboarding.
3. Skip Website Setup and verify that scheduling still works.
4. Start Website Setup from settings.
5. Select industry and attributes.
6. Compare live templates.
7. Add identity, content, colors, fonts, and assets.
8. Enable Blog and Gallery.
9. Preview every public surface.
10. Publish the platform URL.
11. Create and publish an article and gallery collection.
12. Complete a guest booking.
13. Edit a draft, preview it, publish it, and roll it back.

### 9.2 Organization owner journey

1. Sign in as a new organization owner.
2. Download the workbook.
3. Import locations, team members, providers, services, and availability.
4. Correct a deliberately invalid row through the visible error report.
5. Confirm the import.
6. Verify team roles and scopes with separate browser sessions.
7. Finish Website Setup and publish.
8. Create business-scoped content.
9. Verify that a provider or receptionist cannot publish without permission.

### 9.3 Isolation and entitlement journey

1. Create a second business and owner.
2. Try direct URLs, API calls, preview identifiers, files, routes, and exports across businesses.
3. Verify denial without data leakage.
4. Disable Blog, Gallery, and Newsletter entitlements one at a time.
5. Verify server-side create, publish, send, and limit enforcement.
6. Restore access and verify that content remains intact.

### 9.4 Newsletter journey

Use a local email sink. Do not send external email.

1. Enable Newsletter for one business.
2. Verify sender setup and consent requirements.
3. Subscribe, confirm, unsubscribe, and suppress a synthetic address.
4. Send a preview and a controlled local campaign.
5. Verify that another business cannot access the audience or campaign.
6. Verify quota, retry, idempotency, and unsubscribe enforcement.

### 9.5 Browser evidence

Capture desktop and mobile evidence for:

- Website Setup;
- template comparison;
- landing and booking;
- blog index and article;
- gallery index and collection;
- light and dark modes;
- organization import validation;
- normal-user permissions;
- entitlement-denied states.

Compare every new public surface with its approved design reference. Code review alone cannot approve visual work.

## 10. Implementation phases

### Phase 0: Dependency qualification

- Pin compatible Blog and Newsletter commits.
- Install both on a disposable Frappe site.
- inspect DocTypes, routes, permissions, hooks, background jobs, unsubscribe behavior, and upgrade support;
- record licenses and deployment requirements;
- prove clean install, migrate, backup, restore, and uninstall behavior;
- decide whether hooks and custom fields can enforce business ownership without a fork.

**Exit:** A written compatibility record and a reproducible dependency lock exist. No product code depends on unpinned branches.

### Phase 1: Entitlements and tenant boundary

- Add capability keys and business entitlement projection.
- Add one server authorization service.
- Add limits and audit events.
- Extend upstream content with business ownership.
- Add permission query conditions and document checks.
- Add two-business isolation tests.

**Exit:** The server blocks every unauthorized content operation, even through direct API calls.

### Phase 2: Content publication bridge

- Add immutable published content releases.
- Add sanitizer, canonical hash, route uniqueness, preview, publish, withdraw, and rollback.
- Add guest-safe article index and article APIs.
- Add cache invalidation and audit events.

**Exit:** Public article traffic never reads a mutable authoring record.

### Phase 3: Gallery

- Add gallery collection and item models.
- Add media validation, derivatives, captions, alt text, ordering, consent, and video allowlist.
- Add preview, publication, withdrawal, and rollback.
- Add storage and item limits through entitlements.

**Exit:** A business owner can publish a safe gallery without administrator help.

### Phase 4: Independent template surfaces

- Design and approve blog and gallery references for each certified template.
- Build independent page implementations inside each template package.
- Extend booking and navigation without cross-template visual components.
- Validate accessibility, responsive layout, empty states, and performance.

**Exit:** Side-by-side evidence shows that each implementation matches its own approved reference.

### Phase 5: Guided Website Setup

- Add catalog metadata and deterministic recommendations.
- Add catalog thumbnails and live previews.
- Add brand, content, feature, readiness, and publication steps.
- Add resumable progress and safe defaults.
- Add the website management workspace.

**Exit:** A new owner can publish without editing Desk DocTypes or asking an administrator.

### Phase 6: Organization workbook import

- Define and version the workbook schema.
- Generate the example workbook.
- Add dry-run parsing and validation.
- Add preview, confirmation, transaction, audit, retry, and invitation controls.
- Test large and malformed files.

**Exit:** An owner can create a valid multi-location organization from the workbook and correct errors without developer help.

### Phase 7: Newsletter product integration

- Add business-scoped audience and consent records.
- Add sender verification and entitlement checks.
- Connect approved audiences to the Newsletter app.
- Add local preview, scheduling, quota, suppression, unsubscribe, delivery status, and audit handling.
- Add a theme-native signup treatment for each supported template.

**Exit:** A business can send only to its consented audience, and every unsubscribe works before the next send.

### Phase 8: Showcase expansion

- Add realistic blog, gallery, and newsletter content to each seeded business.
- Add local media assets and provenance.
- Rebuild seeded releases through supported application services.
- Capture every template and surface.

**Exit:** A clean server can recreate every showcase from repository data and assets.

### Phase 9: Clean-site normal-user validation

- Provision a fresh site without showcase data.
- Run individual, organization, isolation, entitlement, and newsletter journeys through Agent Plane.
- Fix every gap that requires hidden setup, direct database writes, or Administrator access.
- Repeat from a new site after fixes.

**Exit:** All journeys pass from a clean installation with retained browser evidence.

### Phase 10: Release readiness

- Test upgrade and rollback with pinned dependencies.
- Run backup and restore drills with media and content releases.
- Add monitoring for publication, media processing, import, queues, sends, bounces, and unsubscribe failures.
- Add operations runbooks and support diagnostics.
- Run security, accessibility, performance, and disaster-recovery gates.

**Exit:** The release candidate can be staged without manual data repair or undocumented setup.

## 11. Tests

### Backend

- dependency installation and migration;
- business isolation for lists, documents, files, previews, and public routes;
- role and membership permissions;
- entitlement and limit enforcement;
- sanitizer and unsafe URL rejection;
- route uniqueness and canonical hash stability;
- publish, withdraw, rollback, and concurrent publication;
- gallery file and video validation;
- import validation, idempotency, rollback, and audit;
- consent, confirmation, unsubscribe, suppression, quota, and retry;
- backup and restore of content and media.

### Frontend

- Website Setup resume and skip behavior;
- template filtering and recommendation explanations;
- live preview isolation;
- readiness errors and recovery;
- content authoring and publication states;
- workbook dry-run and error navigation;
- entitlement and limit messages;
- keyboard, screen-reader, contrast, reduced-motion, and focus behavior.

### Public surfaces

- route ownership and locale behavior;
- SEO metadata, canonical links, sitemap, and structured data;
- pagination and empty states;
- image sizing, video fallback, and lazy loading;
- desktop, tablet, and mobile layout;
- light and dark mode continuity;
- landing-to-article-to-booking continuity;
- cache invalidation after publish and withdrawal.

## 12. Security gates

The release must block:

- cross-business reads and writes;
- cross-business preview access;
- global Blog or Newsletter roles without business membership;
- arbitrary HTML, CSS, JavaScript, iframe, and remote asset injection;
- executable spreadsheet formulas and unsafe spreadsheet links;
- spreadsheet entity expansion or archive bombs;
- arbitrary recipient queries;
- newsletter sending without consent or entitlement;
- direct public reads from drafts;
- route takeover through slug collisions;
- unrestricted upload size or MIME spoofing;
- public exposure of private originals;
- guessed unsubscribe tokens;
- publication without an audit actor;
- payment-webhook control over permissions without verified signatures and idempotency.

## 13. Operations

Monitor:

- dependency and migration versions;
- failed content publications;
- stale previews and cache invalidations;
- media processing failures;
- import failures and partial batches;
- newsletter queue age, retries, bounces, complaints, and unsubscribe failures;
- entitlement reconciliation failures;
- public route errors by template and content type;
- storage and sending limit usage.

Backups must include upstream authoring records, appointment integration records, published content releases, public and private media, subscriber consent, and delivery audit records.

Restore drills must prove that public routes, files, release hashes, audiences, and unsubscribe state survive recovery.

## 14. Deferred scope

Do not include these items in this implementation:

- a generic drag-and-drop page builder;
- arbitrary custom HTML, CSS, or JavaScript;
- self-service layout composition;
- a separate Article application;
- automatic template generation;
- cross-business content sharing;
- public signup redesign;
- a payment gateway;
- automated advanced bespoke design controls;
- unrestricted video hosting or live streaming.

The entitlement boundary prepares for future billing without making billing a dependency of content delivery.

## 15. Completion criteria

The feature is complete when:

1. Blog and Newsletter install from pinned dependencies on a clean bench.
2. Appointment installation installs the present required apps on a new site.
3. Every editable content record belongs to one business and one public site.
4. Public routes read immutable safe releases.
5. Gallery supports approved images and videos with consent and accessibility data.
6. Every certified template has its own blog and gallery page implementations.
7. A new owner can compare live templates and publish a site without administrator help.
8. An organization owner can import team and setup data through a validated workbook.
9. Feature entitlements work without a payment gateway and enforce access server-side.
10. Newsletter audiences remain business-scoped and consented.
11. Seeded showcases reproduce from repository-owned code and assets.
12. Clean-site Agent Plane journeys pass as normal users without seeded business records.
13. Browser evidence covers all templates, public surfaces, modes, and responsive widths.
14. Backup, restore, rollback, monitoring, security, and accessibility gates pass.
