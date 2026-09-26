"""Explicit seedless acceptance provisioning within the existing isolated bench.

Run this file with the Bench Python. It never clones or removes a site.
"""

import json
import os
from pathlib import Path
import secrets
import re
import shlex
import subprocess
import sys

RUNTIME = Path("/home/minte/.local/state/frappe-worktree-stack/feat-content-publishing-galler-5839d4")
CHECKOUT = Path("/home/minte/projects/training-apps/.worktrees/frappe-appointment-beta")
SITES = ("meet-beta-content-fresh-a.localhost", "meet-beta-content-fresh-b.localhost")
RESTORE_SITE = "meet-beta-content-restore.localhost"
APPS = ("blog", "newsletter", "appointment", "agent_harness", "agent_plane")
PRIMARY_SITE = "meet-beta-feat-content-publishing-galler-5839d4.localhost"
SESSION = "fw-meet-beta-feat-content-publishing-galler-5839d4"


def switch(site):
    """Switch the isolated server and proxy together after browser jobs finish."""
    if site not in (PRIMARY_SITE, *SITES, RESTORE_SITE) or not (RUNTIME / "bench/sites" / site / "site_config.json").exists():
        raise RuntimeError("Choose a provisioned acceptance site in this isolated bench.")
    for window in ("frontend", "backend"):
        target = SESSION + ":" + window
        raw = subprocess.check_output(["tmux", "display-message", "-p", "-t", target, "#{pane_start_command}"], text=True).strip()
        command = shlex.split(raw)[0] if raw.startswith('"') else raw
        if window == "frontend":
            for key in ("FRAPPE_WORKTREE_SITE", "VITE_SITE_NAME"):
                command, count = re.subn(r"\b" + key + r"=[^\s]+", key + "=" + site, command)
                if count != 1:
                    raise RuntimeError("The isolated frontend launch contract changed.")
        else:
            command, count = re.subn(r"--site\s+[^\s]+\s+serve", "--site " + site + " serve", command)
            if count != 1:
                raise RuntimeError("The isolated backend launch contract changed.")
            command = re.sub(r"\bFRAPPE_SITE=[^\s]+", "FRAPPE_SITE=" + site, command)
        subprocess.run(["tmux", "respawn-pane", "-k", "-t", target, command], check=True)
    subprocess.run(["tmux", "respawn-pane", "-k", "-t", SESSION + ":browser-qa"], check=True)
    return {"target_site": site, "existing_sites_preserved": True}


def provision(site):
    if site not in (*SITES, RESTORE_SITE):
        raise RuntimeError("Choose an explicitly reserved seedless acceptance site.")
    bench_root = RUNTIME / "bench"
    target = bench_root / "sites" / site
    if target.exists():
        raise RuntimeError("The site already exists. Preserve it and inspect its provisioning log.")
    credentials = RUNTIME / f"{site}-credentials.json"
    _private_json(credentials, {"site": site, "username": "Administrator", "password": secrets.token_urlsafe(32)}, exclusive=True)
    log_path = RUNTIME / f"{site}-provision.log"
    environment = {**os.environ, "PYTHONPATH": str(CHECKOUT), "FRAPPE_BENCH_ROOT": str(bench_root)}
    common_path = bench_root / "sites/common_site_config.json"
    original = common_path.read_bytes()
    common = json.loads(original)
    source = json.loads(Path("/home/minte/projects/training-apps/sites/common_site_config.json").read_text())
    if not source.get("root_password"):
        raise RuntimeError("Source Bench database provisioning credentials are unavailable.")
    with os.fdopen(os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w") as log:
        def run(*arguments):
            subprocess.run(["bench", *arguments], cwd=bench_root, env=environment, stdout=log, stderr=log, check=True)

        try:
            common.update(root_password=source["root_password"], admin_password=json.loads(credentials.read_text())["password"])
            _private_json(common_path, common)
            run("new-site", site)
        finally:
            common_path.write_bytes(original)
            common_path.chmod(0o600)
        config_path = target / "site_config.json"
        config = json.loads(config_path.read_text())
        config.update(developer_mode=1, worktree_development=1, mute_emails=1, pause_scheduler=1,
                      rich_demo_enabled=0, brand_public_experience_platform_hosts=[site, "127.0.0.11"])
        _private_json(config_path, config)
        for app in APPS:
            run("--site", site, "install-app", app)
        run("--site", site, "migrate")
        run("--site", site, "execute", "appointment.tests.content_fresh_site.inventory")
    return {"site": site, "seeded": False, "log": str(log_path), "credentials": "Private runtime file only"}


def inventory():
    import frappe

    if frappe.local.site not in (*SITES, RESTORE_SITE) or not frappe.conf.get("worktree_development"):
        raise RuntimeError("Not an isolated seedless acceptance site.")
    counts = {doctype: frappe.db.count(doctype) for doctype in (
        "Organization", "Provider", "Public Site", "Blog Post", "Gallery Collection",
        "Published Content Release", "Newsletter Audience Member", "Business Newsletter Campaign")}
    if any(counts.values()):
        raise RuntimeError("Fresh acceptance must begin without business or content records.")
    return {"site": frappe.local.site, "business_record_counts": counts, "installed_apps": frappe.get_installed_apps()}


def restore(prefix):
    """Restore only into the reserved recovery target, retaining private keys locally."""
    if not re.fullmatch(r"[0-9]{8}_[0-9]{6}", prefix):
        raise RuntimeError("Choose the recorded backup timestamp.")
    bench_root = RUNTIME / "bench"
    target = bench_root / "sites" / RESTORE_SITE
    source = bench_root / "sites" / PRIMARY_SITE / "private/backups"
    stem = prefix + "-" + PRIMARY_SITE.replace(".", "_")
    paths = [source / (stem + suffix) for suffix in (
        "-database.sql.gz", "-files.tar", "-private-files.tar", "-site_config_backup.json")]
    if not target.exists() or not all(path.is_file() for path in paths):
        raise RuntimeError("The provisioned recovery target or exact backup is missing.")
    config_path = target / "site_config.json"
    config = json.loads(config_path.read_text())
    backup_config = json.loads(paths[3].read_text())
    if not backup_config.get("encryption_key"):
        raise RuntimeError("The backup's encrypted credential key is missing.")
    config.update(encryption_key=backup_config["encryption_key"], mute_emails=1, pause_scheduler=1,
                  developer_mode=1, worktree_development=1, rich_demo_enabled=0)
    _private_json(config_path, config)
    common_path = bench_root / "sites/common_site_config.json"
    original = common_path.read_bytes()
    common = json.loads(original)
    database = json.loads(Path("/home/minte/projects/training-apps/sites/common_site_config.json").read_text())
    environment = {**os.environ, "PYTHONPATH": str(CHECKOUT), "FRAPPE_BENCH_ROOT": str(bench_root)}
    log_path = RUNTIME / f"{RESTORE_SITE}-restore-{prefix}.log"
    with os.fdopen(os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w") as log:
        try:
            common["root_password"] = database["root_password"]
            _private_json(common_path, common)
            subprocess.run(["bench", "--site", RESTORE_SITE, "restore", str(paths[0]),
                            "--with-public-files", str(paths[1]), "--with-private-files", str(paths[2]),
                            "--non-interactive"], cwd=bench_root, env=environment,
                           stdout=log, stderr=log, check=True)
        finally:
            common_path.write_bytes(original)
            common_path.chmod(0o600)
        subprocess.run(["bench", "--site", RESTORE_SITE, "migrate"], cwd=bench_root, env=environment,
                       stdout=log, stderr=log, check=True)
    return {"target": RESTORE_SITE, "backup": prefix, "source_site_preserved": True, "log": str(log_path)}


def bootstrap():
    """Provision only the first normal user and isolated managed-browser identities."""
    import frappe
    from frappe.model.naming import NamingSeries
    from appointment.tests import content_browser_bootstrap

    before = inventory()
    label = content_browser_bootstrap.account_label(frappe.local.site)
    offset = 1000 if frappe.local.site == SITES[0] else 2000
    existing = frappe.db.get_value("Browser Account", {"account_label": label}, "name")
    if existing and int(existing.rsplit("-", 1)[1]) < offset:
        account = frappe.get_doc("Browser Account", existing)
        account.account_label = label + " (unused provisioning profile)"
        account.save(ignore_permissions=True)
    if not frappe.db.exists("Browser Account", {"account_label": content_browser_bootstrap.account_label(frappe.local.site)}):
        # Harness storage and artifact roots are shared by this bench. Reserve
        # disjoint counters before creating profiles to avoid cross-site cookies.
        # Frappe's format naming parses each braced hash independently. These
        # six harness DocTypes therefore share the empty-prefix counter.
        NamingSeries("#####").update_counter(offset)
        frappe.db.commit()
    return {"before": before, "browser": content_browser_bootstrap.run()}


def minimize_first_owner():
    """Remove the unnecessary global manager role before seedless acceptance."""
    import frappe
    from appointment.tests.content_browser_bootstrap import USER

    if frappe.local.site != SITES[1]:
        raise RuntimeError("This role qualification is restricted to the second fresh site.")
    inventory()
    doc = frappe.get_doc("User", USER)
    doc.set("roles", [row for row in doc.roles if row.role != "Organization Manager"])
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"user": USER, "roles": sorted(frappe.get_roles(USER)), "business_records_created": 0}


def bootstrap_recovery():
    """Reserve distinct managed profile and artifact identities on the restored site."""
    import frappe
    from frappe.model.naming import NamingSeries
    from appointment.tests import content_browser_bootstrap

    if frappe.local.site != RESTORE_SITE or not frappe.conf.get("worktree_development"):
        raise RuntimeError("Recovery browser bootstrap requires the reserved restored site")
    label = content_browser_bootstrap.account_label(RESTORE_SITE)
    if not frappe.db.exists("Browser Account", {"account_label": label}):
        NamingSeries("#####").update_counter(3000)
        frappe.db.commit()
    return content_browser_bootstrap.run()


def _private_json(path, value, exclusive=False):
    flags = os.O_WRONLY | os.O_CREAT | (os.O_EXCL if exclusive else os.O_TRUNC)
    with os.fdopen(os.open(path, flags, 0o600), "w") as stream:
        json.dump(value, stream)
    path.chmod(0o600)


if __name__ == "__main__":
    action = sys.argv[1]
    result = switch(sys.argv[2]) if action == "switch" else restore(sys.argv[2]) if action == "restore" else provision(action)
    print(json.dumps(result))
