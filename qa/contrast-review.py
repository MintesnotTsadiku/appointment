"""Reproduce the rendered-color review from public Browser QA reports.

This calculation supplements axe. It does not resolve geometry, image overlap,
screen-reader behavior, or certify complete WCAG conformance.
"""

import argparse
import itertools
import json
from pathlib import Path
import re


def review(directory):
    reports = sorted(directory.rglob("*-gates.json"))
    if len(reports) != 10:
        raise ValueError("Review requires all ten public gate reports")
    nodes = []
    for path in reports:
        report = json.loads(path.read_text())
        if len(report["reports"]) != 7:
            raise ValueError("Review requires seven surfaces per report")
        for surface in report["reports"]:
            if surface["violations"]:
                raise ValueError("Resolve automated violations before color review")
            for finding in surface["incomplete"]:
                if finding["id"] != "color-contrast":
                    continue
                for node in finding["nodes"]:
                    nodes.append(review_node(path.name, surface["surface"], node))
    failures = [node for node in nodes if not node["meets_required_ratio"]]
    return {
        "method": "Composite rendered ancestor colors and sampled gradient stops from canvas to element. Interpolate stops at 25%, 50%, and 75%.",
        "scope": "Rendered colors only. Review geometry, overlap, nontext content, links, and focus in the retained browser screenshots separately.",
        "reports": len(reports),
        "surfaces": 70,
        "reviewed_nodes": len(nodes),
        "below_threshold_count": len(failures),
        "nodes": nodes,
    }


def review_node(report, surface, node):
    style = node["reviewStyles"]
    foreground = parse_color(style["color"])
    backgrounds = [(1, 1, 1, 1)]
    for ancestor in reversed(style["backgrounds"]):
        bases = [over(parse_color(ancestor["color"]), background) for background in backgrounds]
        if "url(" in ancestor["image"]:
            raise ValueError("Image backgrounds require a separate visual review")
        stops = parse_colors(ancestor["image"])
        if stops:
            choices = stops[:]
            for first, last in itertools.combinations(stops, 2):
                choices.extend(tuple(first[i] * (1 - t) + last[i] * t for i in range(4))
                               for t in (0.25, 0.5, 0.75))
            backgrounds = [over(stop, base) for stop, base in itertools.product(choices, bases)]
        else:
            backgrounds = bases
        backgrounds = list(set(backgrounds))
    size = float(style["fontSize"].removesuffix("px"))
    large = size >= 24 or (size >= 18.66 and float(style["fontWeight"]) >= 700)
    minimum = min(contrast(over(foreground, background), background) for background in backgrounds)
    return {
        "report": report, "surface": surface, "target": node["target"],
        "minimum_ratio": round(minimum, 6), "required_ratio": 3 if large else 4.5,
        "meets_required_ratio": minimum >= (3 if large else 4.5),
        "checks": [check["message"] for check in node["checks"]], "styles": style,
    }


def parse_colors(value):
    return [parse_color(match) for match in re.findall(r"color\(srgb[^)]+\)|rgba?\([^)]+\)", value)]


def parse_color(value):
    if not value.startswith(("color(srgb", "rgb(", "rgba(")):
        raise ValueError("Unsupported rendered color: " + value)
    numbers = [float(number) for number in re.findall(r"[\d.]+", value)]
    components = numbers[:3] if value.startswith("color(") else [number / 255 for number in numbers[:3]]
    return (*components, numbers[3] if len(numbers) > 3 else 1)


def over(foreground, background):
    return tuple(foreground[i] * foreground[3] + background[i] * (1 - foreground[3]) for i in range(3)) + (1,)


def contrast(first, second):
    one, two = luminance(first), luminance(second)
    return (max(one, two) + 0.05) / (min(one, two) + 0.05)


def luminance(color):
    return sum(weight * (value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4)
               for weight, value in zip((0.2126, 0.7152, 0.0722), color))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reports", type=Path)
    parser.add_argument("output", type=Path)
    arguments = parser.parse_args()
    result = review(arguments.reports)
    arguments.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: result[key] for key in ("reports", "surfaces", "reviewed_nodes", "below_threshold_count")}))
    raise SystemExit(bool(result["below_threshold_count"]))
