"""Copy Agent Plane runner captures into qa/evidence/taste-v1/<set>/.

Usage: python3 qa/collect-taste-evidence.py <artifact_root> <set-name> <run-id>

Screenshots are stored as WebP (quality 82) to keep the repository small. A
summary.json records the run ID and, per scenario, the pass state, console and
network error counts and horizontal overflow (scrollWidth minus innerWidth).
"""

import glob
import json
import os
import sys
from pathlib import Path

from PIL import Image

EVIDENCE = Path(__file__).resolve().parent / "evidence" / "taste-v1"


def collect(artifact_root: str, name: str, run_id: str) -> dict:
    target = EVIDENCE / name
    target.mkdir(parents=True, exist_ok=True)
    scenarios = []
    for report_path in sorted(glob.glob(os.path.join(artifact_root, "*", "report.json"))):
        report = json.loads(Path(report_path).read_text())
        folder = Path(report_path).parent
        scroll = next((a.get("value") for a in report["actions"] if a.get("action") == "scroll"), None) or {}
        shots = []
        for artifact in report.get("artifacts") or []:
            source = Path(artifact.get("path") or "")
            # Keep the named captures; the runner's automatic route shot duplicates them.
            if artifact.get("kind") != "screenshot" or source.parent != folder or not source.stem.startswith(report["scenario_id"].split("_")[0] + "-"):
                continue
            if not source.exists():
                continue
            out = target / (source.stem + ".webp")
            Image.open(source).convert("RGB").save(out, "WEBP", quality=82, method=6)
            shots.append(out.name)
        scenarios.append({
            "scenario": report["scenario_id"],
            "ok": report["ok"],
            "consoleErrors": len(report.get("console_errors") or []),
            "networkErrors": len(report.get("network_errors") or []),
            "horizontalOverflow": (scroll.get("scrollWidth") or 0) - (scroll.get("innerWidth") or 0),
            "screenshots": shots,
        })
    summary = {"run": run_id, "artifactRoot": artifact_root, "scenarios": scenarios}
    (target / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    return summary


if __name__ == "__main__":
    result = collect(*sys.argv[1:4])
    failing = [s["scenario"] for s in result["scenarios"] if not s["ok"] or s["consoleErrors"] or s["networkErrors"] or s["horizontalOverflow"] > 0]
    print(f"{len(result['scenarios'])} scenarios collected, {len(failing)} failing: {failing}")
