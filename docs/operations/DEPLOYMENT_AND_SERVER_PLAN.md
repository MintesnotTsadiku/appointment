# Deployment and Server-Side Build Plan

**Status:** Target architecture and server-side task list; app-side pieces are
implemented, server provisioning is not
**Scope:** Brand and Public Experience on an AWS-hosted Frappe (bench) system
**Companions:** `docs/features/BRAND_AND_PUBLIC_EXPERIENCE_IMPLEMENTATION_PLAN.md`,
`docs/features/TENANT_WEBSITES_AND_CUSTOM_DOMAINS_IMPLEMENTATION_PLAN.md`

This document records what must exist **on the server** when the app moves from
the isolated worktree to an Amazon host, and what the app already provides.

## 1. Target topology

```
                    Route 53 (DNS)
                         |
             +-----------+-----------+
             |                       |
     platform hostname         customer domains
   (Elastic IP / A record)   (CNAME / ALIAS to platform hostname)
             |                       |
             +----------+------------+
                        |
                 Nginx (TLS, routing)
        server_name *  ->  X-Frappe-Site-Name: <canonical site>
                        |
            Frappe bench services (systemd)
   web (gunicorn) . socketio (node) . worker . scheduler . watch
                        |
        MariaDB/Postgres . Redis (cache) . Redis (queue)
```

One Frappe site serves every tenant. Customer domains are application-level
tenants; the edge routes them to the canonical site and identifies it with a
trusted `X-Frappe-Site-Name`. Never create a Frappe site per customer.

## 2. DNS strategy (recommendation)

| Address | Record | Target |
| --- | --- | --- |
| Platform hostname, e.g. `appointments.example.com` | `A` (or `AAAA`) | Elastic IP of the host |
| `*.appointments.example.com` (platform subdomains) | `CNAME` or wildcard `A` | Elastic IP |
| Customer apex, e.g. `clinic.com` | `A` to Elastic IP, or provider `ALIAS`/`ANAME` | Elastic IP, or platform hostname via ALIAS |
| Customer subdomain, e.g. `book.clinic.com` | `CNAME` to the platform hostname | `appointments.example.com` |

The user's instinct is right: pointing customers at a **stable hostname** is
better than a raw IP, because the IP can change. Two caveats:

1. A DNS apex (`clinic.com`) cannot use a plain `CNAME`. Use the registrar/Route
   53 `ALIAS`/`ANAME`/flattening record targeting the platform hostname, or an
   `A` record to an **Elastic IP** (which is stable across instance restarts).
2. For customers who cannot use ALIAS records, pin the host to an Elastic IP and
   document it. Moving IPs later requires either ALIAS/ANAME or a temporary A
   record change.

Recommendation: use an **Elastic IP**, publish a stable platform hostname, and
ask customers to use `CNAME <platform hostname>` for subdomains and
`ALIAS/ANAME <platform hostname>` (or `A <Elastic IP>`) for apexes. Verify
ownership with a per-domain TXT record.

## 3. TLS

- Terminate TLS at Nginx. Obtain certificates with **certbot's Nginx plugin**
  (HTTP-01) for each verified hostname, or **DNS-01** for a wildcard
  `*.appointments.example.com`.
- Never mark a domain `Active` before HTTPS and routing health checks pass.
- Apply HSTS only after stable activation; never enable `includeSubDomains` or
  preload automatically for customer domains.
- Keep certificate private keys out of the app (no key fields exist in
  `Public Site Domain` by design).

## 4. Nginx responsibilities

1. **Route every verified host to the canonical Frappe site** with
   `proxy_set_header X-Frappe-Site-Name <canonical site>`.
2. **Strip inbound `X-Forwarded-*` / `X-Frappe-Site-Name` from clients** and set
   only the trusted values at the edge.
3. **Reject unknown hosts** (return 421/444) rather than serving the default
   site or first virtual host.
4. Serve `/assets/` and `/files/` directly with long cache headers.
5. Proxy `/socket.io/` with the WebSocket upgrade headers to the socketio port.
6. Expose `.well-known/acme-challenge/` for certificate issuance.
7. Allow only public routes on customer domains (`/`, `/book`, `/am`,
   `/robots.txt`, `/sitemap.xml`); deny `/app`, `/login`, unrestricted `/api`,
   and administrative paths.

The app renders this configuration from desired state; see
`docs/operations/nginx/public-experience.conf.template` and
`appointment/public_experience/edge.py`.

## 5. App-provided pieces (already implemented)

| Concern | Module |
| --- | --- |
| Desired-state + Nginx rendering; self-managed adapter | `public_experience/edge.py` |
| DNS expectations, ownership/routing verification (pure) | `public_experience/dns.py` |
| Security headers + nonce CSP | `public_experience/csp.py` |
| Trusted host/path resolution, fail-closed | `public_experience/resolver.py` |
| Media decode/re-encode + quotas | `public_experience/media.py` |
| Aggregate counters | `public_experience/observability.py` |
| Outbox worker (hourly scheduler) | `public_experience/hardening.py` |
| Recovery drill | `public_experience/drills.py` |
| DNS instructions + edge preview APIs | `public_experience/api.py` |

## 6. Server-side build checklist

### Host and runtime
- [ ] Provision EC2 (Ubuntu LTS) in the target region; allocate an **Elastic IP**.
- [ ] Security group: allow 80/443 from the world; restrict 22 to known IPs;
      keep 8000/9000/6379/3306 private.
- [ ] Install prerequisites: Python, Node (bench-supported LTS), MariaDB or
      Postgres, Redis, Nginx, certbot, git, wkhtmltopdf (if printing).
- [ ] Install `frappe-bench`, create the site, `bench get-app appointment`,
      `bench --site <site> install-app appointment`, `bench build`, `bench migrate`.

### Domain and TLS
- [ ] Publish the platform hostname and wildcard; point it at the Elastic IP.
- [ ] Create the Nginx site config from the template with `X-Frappe-Site-Name`.
- [ ] Run certbot for the platform hostname and wildcard.
- [ ] Configure the domain reconcile worker to render custom-domain server
      blocks and issue certificates on activation.
- [ ] Set site config:
      `brand_public_experience_platform_host`,
      `brand_public_experience_platform_hosts`,
      `brand_public_experience_edge_tls=1`,
      `brand_public_experience_edge_staging_dir` (staging path for generated config),
      the trusted public-host allow-list and published-release readiness checks;
      no per-site public-experience mode flag is required.

### Process management
- [ ] systemd units (or supervisor) for `web`, `socketio`, `worker`, `schedule`,
      `watch`; enable and start.
- [ ] `redis` (cache + queue) reachable only privately; `socketio_port` and
      `webserver_port` set in site config.
- [ ] Scheduler enabled (`pause_scheduler=0`) so the outbox worker runs.

### Security and secrets
- [ ] Store DNS/edge/certificate credentials in AWS Secrets Manager or SSM;
      prefer not to hold DNS-provider credentials on the app host.
- [ ] Nginx sets `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
      and HSTS; the app adds CSP + nonce for public API responses.
- [ ] Confirm unknown-host rejection and forwarding-header stripping with a
      probe before onboarding tenants.

### Operations
- [ ] Backups (database + site files) to S3 with retention; document RPO/RTO.
- [ ] Monitoring: host metrics, Nginx access/error, bench error logs, queue depth,
      certificate expiry, unknown-host counts.
- [ ] Verify each published site resolves only its active immutable release;
      keep the isolated-site backup and immutable-release rollback procedure current.

### Rolls out per site
- [ ] Brand published (Brand Revision active).
- [ ] Site has required sections and a published Experience Release.
- [ ] Custom domain verified (TXT/routing) and activated; certificate issued.
- [ ] Health checks green; canonical origin configured.

## 7. Edge adapter choice

The app defines one `EdgeAdapter` seam with a self-managed Nginx
implementation. A managed CDN/SaaS custom-hostname adapter can replace it
without changing callers once the production hosting decision is final. The
initial adapter should be chosen only after confirming operational ownership of
DNS and certificates.

## 8. Open decisions

1. Hosting shape: single EC2 + Nginx, or ALB/CloudFront in front?
2. Managed CDN custom-hostname vs self-managed Nginx + ACME?
3. Certificate approach: certbot HTTP-01 vs DNS-01 wildcard.
4. Backup RPO/RTO and retention.
5. Which platform hostname and whether platform subdomains launch with v1.
