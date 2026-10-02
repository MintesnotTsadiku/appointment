"""Generate the Taste v1 public-template manifests.

Run from the repository root: python3 qa/manifests/taste-v1/generate.py
Each manifest covers one color scheme and one locale, because the runner sets
the color scheme per manifest. Pages: landing, /book handoff and scheduler.
"""

from pathlib import Path

import yaml

TEMPLATES = {
    "selam": "selam-movement",
    "meron": "meron-atelier",
    "bloom": "bloom-hair",
    "tena": "tena-clinic",
    "abugida": "abugida-language",
}
VIEWPORTS = {"desktop": (1440, 900), "phone": (390, 844)}
# The v2 face files each landing page must actually request (Latin, then Ethiopic for am).
FONTS = {
    "tena": ("fonts/tena/atkinson-hyperlegible-next", "fonts/tena/noto-sans-ethiopic"),
    "selam": ("fonts/selam/figtree", "fonts/selam/menbere-"),
    "bloom": ("fonts/bloom/anton", "fonts/bloom/noto-sans-ethiopic"),
    "meron": ("fonts/meron/eb-garamond", "fonts/meron/noto-serif-ethiopic"),
    "abugida": ("fonts/abugida/alegreya", "fonts/abugida/abyssinica-sil"),
}
HERE = Path(__file__).parent


def page_path(key, page, locale):
    if page == "scheduler":
        return f"{{demo_{key}_scheduler}}"
    if page == "book":
        suffix = "/book" if locale == "en" else f"/book?locale={locale}"
    else:
        suffix = f"/{locale}" if locale != "en" else ""
    return f"{{demo_{key}}}{suffix}"


def ready_selector(key, page):
    if page == "scheduler":
        return f'[data-booking-branded="true"][data-pe-recipe="{TEMPLATES[key]}"]'
    marker = "data-pe-booking" if page == "book" else "data-pe-root"
    return f'[{marker}][data-pe-recipe="{TEMPLATES[key]}"]'


def scenario(key, page, viewport, scheme, locale, check_fonts=False):
    width, height = VIEWPORTS[viewport]
    name = f"{key}-{page}-{viewport}-{scheme}-{locale}"
    assertions = [
        {"type": "network_idle"},
        {"type": "no_blank_page"},
        {"type": "visible_selector", "value": ready_selector(key, page)},
    ]
    if check_fonts and page == "landing":
        latin, ethiopic = FONTS[key]
        assertions.append({"type": "network_request", "url_contains": latin, "min_count": 1})
        if locale == "am":
            assertions.append({"type": "network_request", "url_contains": ethiopic, "min_count": 1})
    return {
        "id": name.replace("-", "_"),
        "title": name.replace("-", " "),
        "viewport": {"width": width, "height": height},
        "checks": [],
        "routes": [{
            "path": page_path(key, page, locale),
            "assertions": assertions,
        }],
        "actions": [
            {"action": "screenshot", "name": f"{name}-first-view.png", "full_page": False},
            {"action": "screenshot", "name": f"{name}.png", "full_page": True},
            # A zero scroll reports scrollWidth against innerWidth: the horizontal-overflow check.
            {"action": "scroll", "delta_y": 0},
            {"action": "get_console_errors"},
            {"action": "get_network_errors"},
        ],
    }


def manifest(name, scheme, locale, keys, pages, check_fonts=False):
    return {
        "app": "appointment",
        "base_url": "http://127.0.0.84:44430",
        "default_role": "Guest",
        "auth": {"type": "none"},
        "artifact_root": f"/tmp/agent_browser_qa/appointment-taste-v1-{name}",
        "capture_trace": False,
        "capture_video": False,
        "capture_instruction_timeline": False,
        "timeout_ms": 180000,
        "options": {"ignore_baseline_drift": True, "color_scheme": scheme, "reduced_motion": "reduce", "show_action_labels": False, "show_cursor": False, "show_zoom_spotlight": False},
        "fixtures": {"provider": "appointment.demo.showcase.browser_values"},
        "scenarios": [
            scenario(key, page, viewport, scheme, locale, check_fonts)
            for key in keys for page in pages for viewport in VIEWPORTS
        ],
    }


def write(name, **kwargs):
    (HERE / f"{name}.yaml").write_text(yaml.safe_dump(manifest(name, **kwargs), sort_keys=False, allow_unicode=True))


STAFF_PAGES = ["/home", "/calendar", "/reception", "/analytics", "/settings", "/settings/team", "/settings/public-experience"]


def staff_manifest(scheme):
    """Staff pre-flight: the priority pages plus the design gallery, as the Bloom owner persona."""
    scenarios = []
    for path in STAFF_PAGES:
        slug = path.strip("/").replace("/", "-")
        for viewport, (width, height) in VIEWPORTS.items():
            name = f"staff-{slug}-{viewport}-{scheme}"
            scenarios.append({
                "id": name.replace("-", "_"),
                "title": name.replace("-", " "),
                "viewport": {"width": width, "height": height},
                "checks": [],
                "routes": [{"path": path, "assertions": [
                    {"type": "network_idle"},
                    {"type": "no_blank_page"},
                    {"type": "visible_selector", "value": "h1"},
                ]}],
                "actions": [
                    {"action": "screenshot", "name": f"{name}-first-view.png", "full_page": False},
                    {"action": "screenshot", "name": f"{name}.png", "full_page": True},
                    {"action": "scroll", "delta_y": 0},
                    {"action": "get_console_errors"},
                    {"action": "get_network_errors"},
                ],
            })
    return {
        "app": "appointment",
        "base_url": "http://127.0.0.84:44430",
        "default_role": "Staff",
        "auth": {"type": "frappe_session", "username": "bloom.owner@example.test", "verify_path": "/api/method/frappe.auth.get_logged_user"},
        "artifact_root": f"/tmp/agent_browser_qa/appointment-taste-v1-staff-{scheme}",
        "capture_trace": False,
        "capture_video": False,
        "capture_instruction_timeline": False,
        "timeout_ms": 180000,
        "options": {"ignore_baseline_drift": True, "color_scheme": scheme, "reduced_motion": "reduce", "show_action_labels": False, "show_cursor": False, "show_zoom_spotlight": False},
        "fixtures": {"provider": "appointment.demo.showcase.browser_values"},
        "scenarios": scenarios,
    }


if __name__ == "__main__":
    for scheme in ("light", "dark"):
        (HERE / f"staff-{scheme}.yaml").write_text(yaml.safe_dump(staff_manifest(scheme), sort_keys=False, allow_unicode=True))
    for scheme in ("light", "dark"):
        # Step 1: content ownership on the releases that are live today (English only).
        write(f"step1-{scheme}", scheme=scheme, locale="en", keys=list(TEMPLATES), pages=("landing", "book"))
        for locale in ("en", "am"):
            for key in TEMPLATES:
                write(f"{key}-{scheme}-{locale}", scheme=scheme, locale=locale, keys=[key], pages=("landing", "book", "scheduler"), check_fonts=True)
