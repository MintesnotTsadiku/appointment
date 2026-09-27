"""Reversible application-code drill against the reserved restored site."""

import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import tarfile

from appointment.tests.content_fresh_site import CHECKOUT, RESTORE_SITE, RUNTIME, SESSION

ROLLBACK_REF = "1ae60d3"
DIRECTORY = RUNTIME / "code-drill"
STATE = DIRECTORY / "launch-state.json"


def _command(window):
    raw = subprocess.check_output(["tmux", "display-message", "-p", "-t", SESSION + ":" + window,
                                   "#{pane_start_command}"], text=True).strip()
    return shlex.split(raw)[0] if raw.startswith('"') else raw


def prepare():
    """Archive committed code; leave the working checkout and data untouched."""
    DIRECTORY.mkdir(mode=0o700, exist_ok=True)
    archive = DIRECTORY / (ROLLBACK_REF + ".tar")
    tree = DIRECTORY / ROLLBACK_REF
    revision = subprocess.check_output(["git", "rev-parse", ROLLBACK_REF], cwd=CHECKOUT, text=True).strip()
    if not tree.exists():
        subprocess.run(["git", "archive", "--format=tar", "--output=" + str(archive), revision], cwd=CHECKOUT, check=True)
        tree.mkdir(mode=0o700)
        with tarfile.open(archive) as source:
            source.extractall(tree, filter="data")
        (tree / "frontend/node_modules").symlink_to(CHECKOUT / "frontend/node_modules", target_is_directory=True)
    if not archive.is_file() or not (tree / "appointment/content/releases.py").is_file():
        raise RuntimeError("The exact committed rollback archive is incomplete")
    _build_archive(tree, revision)
    return {"rollback_revision": revision, "archive_sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
            "retains_database_schema": True, "working_checkout_preserved": True, "production_assets_built": True}


def _build_archive(tree, revision):
    marker = tree / "production-build.json"
    entry = tree / "appointment/public/frontend/index.html"
    if marker.exists():
        recorded = json.loads(marker.read_text())
        if recorded.get("revision") != revision or not entry.is_file() or recorded.get("entry_sha256") != hashlib.sha256(entry.read_bytes()).hexdigest():
            raise RuntimeError("The archived production entry differs from its recorded build")
        return
    node = Path("/home/minte/.nvm/versions/node/v24.12.0/bin/node")
    environment = {**os.environ, "VITE_SITE_NAME": RESTORE_SITE, "VITE_BASE_URL": ""}
    log_path = tree / "production-build.log"
    with os.fdopen(os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w") as log:
        subprocess.run([str(node), str(tree / "frontend/node_modules/vite/bin/vite.js"),
                        "build", "--base=/assets/appointment/frontend/"],
                       cwd=tree / "frontend", env=environment, stdout=log, stderr=log, check=True)
    with os.fdopen(os.open(marker, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w") as stream:
        json.dump({"revision": revision, "entry_sha256": hashlib.sha256(entry.read_bytes()).hexdigest()}, stream)


def rollback():
    if STATE.exists():
        raise RuntimeError("A code drill is already active. Restore its recorded launch state first.")
    prepare()
    commands = {window: _command(window) for window in ("frontend", "backend")}
    if any(RESTORE_SITE not in command for command in commands.values()):
        raise RuntimeError("Switch only the reserved restored site before the code drill")
    if str(CHECKOUT) not in commands["backend"]:
        raise RuntimeError("The candidate backend import contract changed")
    state = {"site": RESTORE_SITE, "commands": commands,
             "frontend_assets": str(DIRECTORY / ROLLBACK_REF / "appointment/public/frontend"),
             "frontend_directory": subprocess.check_output(["tmux", "display-message", "-p", "-t", SESSION + ":frontend", "#{pane_current_path}"], text=True).strip()}
    descriptor = os.open(STATE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as stream:
        json.dump(state, stream)
    archived = DIRECTORY / ROLLBACK_REF
    _clear_site_cache(archived)
    subprocess.run(["tmux", "respawn-pane", "-k", "-t", SESSION + ":backend",
                    commands["backend"].replace(str(CHECKOUT), str(archived))], check=True)
    if "content_production_gateway.py" not in commands["frontend"]:
        subprocess.run(["tmux", "respawn-pane", "-k", "-c", str(archived / "frontend"), "-t", SESSION + ":frontend", commands["frontend"]], check=True)
    return {"site": RESTORE_SITE, "code": ROLLBACK_REF, "schema_unchanged": True,
            "production_html": "content_production_gateway.py" in commands["frontend"]}


def upgrade():
    if not STATE.is_file():
        raise RuntimeError("No recorded rollback launch state exists")
    state = json.loads(STATE.read_text())
    if state.get("site") != RESTORE_SITE or state.get("frontend_directory") != str(CHECKOUT / "frontend"):
        raise RuntimeError("The preserved candidate launch state differs from the isolated contract")
    _clear_site_cache(CHECKOUT)
    for window in ("backend", "frontend"):
        subprocess.run(["tmux", "respawn-pane", "-k", "-c", state["frontend_directory"] if window == "frontend" else str(RUNTIME / "bench"),
                        "-t", SESSION + ":" + window, state["commands"][window]], check=True)
    STATE.unlink()
    return {"site": RESTORE_SITE, "candidate_restored": True, "schema_unchanged": True}


def _clear_site_cache(checkout):
    environment = {**os.environ, "PYTHONPATH": str(checkout), "FRAPPE_BENCH_ROOT": str(RUNTIME / "bench")}
    subprocess.run(["bench", "--site", RESTORE_SITE, "clear-cache"],
                   cwd=RUNTIME / "bench", env=environment, check=True)
