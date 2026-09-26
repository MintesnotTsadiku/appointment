"""Edge / routing desired state and the self-managed Nginx adapter.

Custom domains are application-level tenants inside one Frappe site, so the
edge routes every verified host to the canonical Frappe site and tells Frappe
which site to serve with ``X-Frappe-Site-Name``. All active ``Public Site
Domain`` records are the desired state; the adapter renders (and optionally
stages) the Nginx configuration.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import frappe

ADAPTER_CONFIG_KEY = "brand_public_experience_edge_staging_dir"


@dataclass(frozen=True)
class DomainRoute:
    hostname: str
    domain_type: str
    is_primary: bool


@dataclass(frozen=True)
class EdgeOptions:
    frappe_site: str
    web_port: int = 8000
    socketio_port: int = 9000
    target_host: str = "appointment.example.com"
    assets_root: str = "/home/frappe/frappe-bench/sites/assets"
    files_root: str = "/home/frappe/frappe-bench/sites"
    acme_root: str = "/var/www/certbot"
    tls: bool = False
    include_platform: bool = True


def _server_block(server_name: str, options: EdgeOptions, *, public_only: bool = False) -> str:
    listen = (
        "listen 443 ssl http2;\n    listen [::]:443 ssl http2;" if options.tls else "listen 80;\n    listen [::]:80;"
    )
    tls_lines = ""
    if options.tls:
        cert = f"/etc/letsencrypt/live/{server_name}/fullchain.pem"
        key = f"/etc/letsencrypt/live/{server_name}/privkey.pem"
        tls_lines = (
            f"\n    ssl_certificate {cert};\n"
            f"    ssl_certificate_key {key};\n"
            '    add_header Strict-Transport-Security "max-age=31536000" always;'
        )
    socket_location = (
        """location /socket.io/ {
        return 404;
    }"""
        if public_only
        else f"""location /socket.io/ {{
        proxy_pass http://127.0.0.1:{options.socketio_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Frappe-Site-Name $frappe_site;
    }}"""
    )
    public_api = ""
    if public_only:
        methods = (
            "appointment.public_experience.api.get_public_ui_config",
            "appointment.public_experience.api.get_public_experience_snapshot",
            "appointment.content.public_api.get_article_index",
            "appointment.content.public_api.get_article_detail",
            "appointment.content.public_api.get_gallery_index",
            "appointment.content.public_api.get_gallery_detail",
            "appointment.content.newsletter.public_api.signup_status",
            "appointment.content.newsletter.public_api.subscribe",
            "appointment.content.newsletter.public_api.confirm",
            "appointment.content.newsletter.public_api.unsubscribe",
            "appointment.content.newsletter.public_api.verify_sender",
            "appointment.scheduler.independent.public_offering",
            "appointment.scheduler.booking.slots",
            "appointment.scheduler.booking.book",
            "appointment.api.personal_meet.get_organization_services",
            "appointment.api.personal_meet.get_organization_meeting_windows",
            "appointment.api.personal_meet.get_time_slots",
            "appointment.api.personal_meet.book_time_slot",
        )
        public_api = "\n    # Exact guest publication, consent, and booking APIs only.\n"
        for method in methods:
            public_api += f"""    location = /api/method/{method} {{
        proxy_set_header X-Frappe-Site-Name $frappe_site;
        proxy_set_header Host $host;
        proxy_pass http://127.0.0.1:{options.web_port};
    }}
"""
        public_api += "    location ~ ^/(app|login|logout|api|private|desk)(/|$) { return 404; }\n"
    return f"""server {{
    {listen}
    server_name {server_name};{tls_lines}

    # Route this host to the canonical Frappe site.
    set $frappe_site "{options.frappe_site}";

    location /.well-known/acme-challenge/ {{
        root {options.acme_root};
    }}

    {socket_location}

    location = /assets/appointment/frontend/sw.js {{
        alias {options.assets_root}/appointment/frontend/sw.js;
        add_header Cache-Control "no-cache";
        add_header Service-Worker-Allowed "/";
    }}

    location /assets/ {{
        alias {options.assets_root}/;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }}

    location /files/ {{
        proxy_set_header X-Frappe-Site-Name $frappe_site;
        proxy_set_header Host $host;
        proxy_pass http://127.0.0.1:{options.web_port};
    }}
    {public_api}

    location / {{
        proxy_set_header X-Frappe-Site-Name $frappe_site;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_pass http://127.0.0.1:{options.web_port};
    }}
}}"""


def render_config(routes: list[DomainRoute], options: EdgeOptions) -> str:
    """Render the managed Nginx configuration for the active domains."""

    header = (
        "# Managed by appointment.public_experience.edge - do not edit by hand.\n"
        "# Generated from Public Site Domain desired state.\n\n"
        "map $http_upgrade $connection_upgrade {\n    default upgrade;\n    '' close;\n}\n"
    )
    blocks = [_server_block(options.target_host, options)] if options.include_platform else []
    seen = {options.target_host}
    for route in routes:
        if route.hostname in seen:
            continue
        seen.add(route.hostname)
        blocks.append(_server_block(route.hostname, options, public_only=True))
    return header + "\n\n" + "\n\n".join(blocks) + "\n"


class EdgeAdapter:
    """Interface: replaceable for a managed CDN or a self-managed proxy."""

    def active_routes(self) -> list[DomainRoute]:
        raise NotImplementedError

    def reconcile(self) -> dict:
        raise NotImplementedError


class NginxSelfManagedAdapter(EdgeAdapter):
    def active_routes(self) -> list[DomainRoute]:
        rows = frappe.get_all(
            "Public Site Domain",
            filters={"lifecycle_status": "Active"},
            fields=["hostname_ascii", "domain_type", "is_primary"],
            order_by="hostname_ascii asc",
        )
        return [DomainRoute(row.hostname_ascii, row.domain_type, bool(row.is_primary)) for row in rows]

    def reconcile(self) -> dict:
        options = self.options()
        routes = self.active_routes()
        config = render_config(routes, options)
        written = None
        staging = frappe.conf.get(ADAPTER_CONFIG_KEY)
        if staging:
            target = Path(staging) / "public-experience.conf"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(config, encoding="utf-8")
            written = str(target)
        return {"domains": [route.hostname for route in routes], "written": written}

    def options(self) -> EdgeOptions:
        return EdgeOptions(
            frappe_site=frappe.local.site,
            web_port=int(frappe.conf.get("webserver_port") or 8000),
            socketio_port=int(frappe.conf.get("socketio_port") or 9000),
            target_host=frappe.conf.get("brand_public_experience_platform_host") or frappe.local.site,
            tls=bool(frappe.conf.get("brand_public_experience_edge_tls")),
        )


class FakeEdgeAdapter(EdgeAdapter):
    """In-memory adapter for tests and dry runs."""

    def __init__(self, routes: list[DomainRoute] | None = None, options: EdgeOptions | None = None):
        self._routes = routes or []
        self._options = options or EdgeOptions(frappe_site="test.localhost")

    def active_routes(self) -> list[DomainRoute]:
        return list(self._routes)

    def reconcile(self) -> dict:
        return {
            "domains": [route.hostname for route in self._routes],
            "config": render_config(self._routes, self._options),
        }


def reconcile_edge(adapter: EdgeAdapter | None = None) -> dict:
    return (adapter or NginxSelfManagedAdapter()).reconcile()
