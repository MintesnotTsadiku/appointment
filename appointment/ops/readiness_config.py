"""Readiness checks for site config, the outgoing email account and the build."""

import shutil
from pathlib import Path
from urllib.parse import urlparse

import frappe

from appointment.ops.checks import FAIL, PASS, WARN, check, is_on

# Flags that must be off on a live site, and why.
FLAGS_OFF = {
    "developer_mode": "Developer mode shows tracebacks and allows DocType edits.",
    "mute_emails": "Muted email sends no booking confirmations.",
    "mute_sms": "Muted SMS sends no customer text messages.",
    "pause_scheduler": "A paused scheduler sends no reminders and expires no holds.",
    "maintenance_mode": "Maintenance mode blocks every visitor.",
}
# Keys that only local worktree and test sites use.
DEV_ONLY_KEYS = ("rich_demo_enabled", "isolated_test_suites", "allow_tests", "worktree_development")
# Hosts that mark an Email Account as a local or test placeholder.
PLACEHOLDER_DOMAINS = ("example.com", "example.org", "example.net", "test.com", "localhost", ".invalid", ".local", ".test")


class SiteConfig:
    area = "Site config"

    def run(self):
        conf = frappe.conf
        rows = [self.flag_off(key, conf.get(key)) for key in FLAGS_OFF]
        rows += [self.absent(key, key in conf) for key in DEV_ONLY_KEYS]
        rows += [self.host_name(conf.get("host_name")), self.encryption_key(bool(conf.get("encryption_key")))]
        rows += self.public_hosts(conf)
        return rows

    def flag_off(self, key, value):
        if not is_on(value):
            return check(self.area, key, PASS, f"{key} is off.")
        return check(self.area, key, FAIL, f"{key} is on. {FLAGS_OFF[key]}",
                     f"bench --site <site> set-config -p {key} 0")

    def absent(self, key, present):
        if not present:
            return check(self.area, key, PASS, f"{key} is absent.")
        return check(self.area, key, FAIL, f"{key} is present. It is for development sites only.",
                     f"Remove {key} from site_config.json and common_site_config.json.")

    def host_name(self, value):
        parsed = urlparse(value or "")
        if parsed.scheme == "https" and parsed.hostname:
            return check(self.area, "host_name", PASS, f"host_name is {value}.")
        detail = f"host_name is {value}." if value else "host_name is not set."
        return check(self.area, "host_name", FAIL, detail + " Emailed links need the public HTTPS address.",
                     "bench --site <site> set-config host_name https://<platform hostname>")

    def encryption_key(self, present):
        if present:
            return check(self.area, "encryption_key", PASS, "encryption_key is set.")
        return check(self.area, "encryption_key", FAIL, "encryption_key is not set. Password fields cannot be read.",
                     "Restore the encryption_key from the site's backup. Never generate a new one for a live site.")

    def public_hosts(self, conf):
        host = conf.get("brand_public_experience_platform_host")
        hosts = conf.get("brand_public_experience_platform_hosts")
        rows = [
            self.required("brand_public_experience_platform_host", host,
                          "The edge config and DNS instructions use it as the target hostname."),
            self.required("brand_public_experience_platform_hosts", hosts,
                          "The resolver accepts only these hosts as platform hosts."),
        ]
        if is_on(conf.get("brand_public_experience_edge_tls")):
            rows.append(check(self.area, "brand_public_experience_edge_tls", PASS, "Edge TLS is on."))
        else:
            rows.append(check(self.area, "brand_public_experience_edge_tls", WARN,
                              "Edge TLS is off. The rendered Nginx config listens on HTTP only.",
                              "bench --site <site> set-config -p brand_public_experience_edge_tls 1"))
        if conf.get("brand_public_experience_edge_staging_dir"):
            rows.append(check(self.area, "brand_public_experience_edge_staging_dir", PASS, "The edge staging directory is set."))
        else:
            rows.append(check(self.area, "brand_public_experience_edge_staging_dir", WARN,
                              "The edge staging directory is not set. Custom-domain Nginx config is not written.",
                              "Set it before the first custom domain goes live."))
        return rows

    def required(self, key, value, reason):
        if value:
            return check(self.area, key, PASS, f"{key} is {value}.")
        return check(self.area, key, FAIL, f"{key} is not set. {reason}",
                     f"bench --site <site> set-config {key} <platform hostname>")


class Email:
    area = "Email"
    key = "outgoing_email_account"

    def run(self):
        rows = frappe.get_all(
            "Email Account",
            filters={"default_outgoing": 1},
            fields=["name", "enable_outgoing", "email_id", "smtp_server"],
        )
        if not rows:
            return [check(self.area, self.key, FAIL, "No default outgoing Email Account exists.",
                          "Create an Email Account with Enable Outgoing and Default Outgoing on.")]
        account = rows[0]
        if not account.enable_outgoing:
            return [check(self.area, self.key, FAIL, f"Email Account {account.name} has outgoing email off.",
                          "Turn on Enable Outgoing.")]
        if self.is_placeholder(account):
            return [check(self.area, self.key, FAIL, f"Email Account {account.name} uses a placeholder address or server.",
                          "Use the real sender address and SMTP server.")]
        return [check(self.area, self.key, PASS, f"Email Account {account.name} sends as {account.email_id}.")]

    def is_placeholder(self, account):
        values = [(account.email_id or "").lower(), (account.smtp_server or "").lower()]
        if account.name.startswith("_Test") or not all(values):
            return True
        return any(value.endswith(domain) for value in values for domain in PLACEHOLDER_DOMAINS)


class Build:
    area = "Build"

    def run(self):
        return [self.frontend(), self.wkhtmltopdf()]

    def frontend(self):
        index = Path(frappe.get_app_path("appointment", "public", "frontend", "index.html"))
        if index.is_file():
            return check(self.area, "frontend_build", PASS, "appointment/public/frontend/index.html exists.")
        return check(self.area, "frontend_build", FAIL, "The frontend build is missing.",
                     "bench build --app appointment")

    def wkhtmltopdf(self):
        if shutil.which("wkhtmltopdf"):
            return check(self.area, "wkhtmltopdf", PASS, "wkhtmltopdf is on the PATH.")
        return check(self.area, "wkhtmltopdf", FAIL, "wkhtmltopdf is not on the PATH. Receipts and statements cannot render.",
                     "Install the wkhtmltopdf build with patched Qt for the server's OS.")
