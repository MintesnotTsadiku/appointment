"""Publication rehearsal for the isolated rich demo.

This checks the one recipe compiler, immutable release projection and trusted
resolver after the site has been seeded. It does not switch between public
experience implementations.
"""

import json

from appointment.public_experience.resolver import resolve_public_experience
from appointment.demo import showcase as rich_demo


def setup_demo_site():
    state = rich_demo.seed()
    state = rich_demo.load_state()
    first = next(iter(state["businesses"].values()))
    return {
        "site": state["site"],
        "recipe": "tena-clinic",
        "public_site": first["public_site"],
        "release": first["experience_release"],
    }


def run_release_rehearsal():
    setup = setup_demo_site()
    state = rich_demo.load_state()
    first = next(iter(state["businesses"].values()))
    slug = first["public_experience_path"]
    host = rich_demo.frappe.local.site
    context = resolve_public_experience(host, slug)
    release = rich_demo.frappe.get_doc("Experience Release", context.release)
    snapshot = json.loads(release.normalized_json)
    ok = (
        context.public_site == first["public_site"]
        and snapshot["recipeKey"] == "tena-clinic"
        and len(snapshot["sections"]) == 13
    )
    return {"ok": ok, "setup": setup, "recipe": snapshot["recipeKey"], "section_count": len(snapshot["sections"])}


def run_cutover_rehearsal():
    """Retained command name for local tooling; runs the publication rehearsal."""
    return run_release_rehearsal()


def teardown_demo_site():
    return rich_demo.cleanup()
