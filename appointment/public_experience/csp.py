"""Content-Security-Policy and security headers for public responses.

A per-response nonce can be embedded in the CSP and handed to the renderer for
any inline `<style>`/`<script>` it emits. Responses are `noindex`/`no-store`
only for previews.
"""

from __future__ import annotations

import secrets

API_PREFIXES = (
    "/api/method/appointment.public_experience.api.",
    "/api/method/appointment.content.public_api.",
    "/api/method/appointment.content.api.",
    "/api/method/appointment.content.newsletter.",
    "/api/method/appointment.content.staff_invitations.",
)


def generate_nonce() -> str:
    return secrets.token_urlsafe(16)


def build_csp(nonce: str | None = None) -> str:
    script = "script-src 'self'" + (f" 'nonce-{nonce}'" if nonce else "")
    return (
        "default-src 'self'; "
        "img-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; "
        f"{script}; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )


def security_headers(nonce: str | None = None, preview: bool = False) -> dict:
    headers = {
        "Content-Security-Policy": build_csp(nonce),
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
    }
    if nonce:
        headers["X-Public-Experience-Nonce"] = nonce
    if preview:
        headers["Cache-Control"] = "no-store"
        headers["X-Robots-Tag"] = "noindex, nofollow"
    return headers


def after_request(response=None, request=None):
    """Attach security headers to public-experience API responses."""

    if response is None or request is None:
        return response
    path = getattr(request, "path", "") or ""
    token_page = path.startswith(("/newsletter/", "/team/invitation/"))
    if not token_page and not path.startswith(API_PREFIXES):
        return response
    private = token_page or path.endswith(".get_content_preview") or not path.startswith((
        "/api/method/appointment.public_experience.api.get_public",
        "/api/method/appointment.content.public_api.",
    ))
    headers = security_headers(generate_nonce(), preview=private)
    if token_page:
        # The application shell owns its script policy; token pages add privacy.
        headers.pop("Content-Security-Policy")
        headers.pop("X-Public-Experience-Nonce")
        headers["Referrer-Policy"] = "no-referrer"
    for key, value in headers.items():
        response.headers[key] = value
    return response
