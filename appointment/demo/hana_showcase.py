"""Hana's notebook content, scoped to the seeder-owned independent business."""
from copy import deepcopy


def refine_sections(content, defaults):
    asset = "/assets/appointment/brand-experience/support/hana-v3/"
    for kind in ("hero", "about", "process", "booking_cta", "footer"):
        content[kind] = {**content[kind], **deepcopy(defaults[kind])}
    content["hero"]["image"] = asset + "walking-r2.webp"
    content["providers"]["items"][0]["image"] = asset + "walking-r2.webp"
    for item, role in zip(content["services"]["items"], ("walking", "podcast", "coffee", "market")):
        item["image"] = asset + role + "-r2.webp"
    return content
