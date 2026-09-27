"""Local production-HTML gateway for managed browser qualification only."""

import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import shlex
import subprocess
import sys
from urllib.parse import unquote, urlsplit

from appointment.tests.content_fresh_site import CHECKOUT, PRIMARY_SITE, RESTORE_SITE, RUNTIME, SESSION

STATE = RUNTIME / "production-browser-launch.json"
HOP_HEADERS = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
               "te", "trailer", "transfer-encoding", "upgrade", "content-length"}


def frontend_directory(site):
    state = RUNTIME / "code-drill/launch-state.json"
    if site != RESTORE_SITE or not state.is_file():
        return CHECKOUT / "appointment/public/frontend"
    recorded = json.loads(state.read_text())
    directory = Path(recorded.get("frontend_assets", "")).resolve()
    archive_root = (RUNTIME / "code-drill").resolve()
    if recorded.get("site") != RESTORE_SITE or archive_root not in directory.parents:
        raise RuntimeError("The rollback asset directory is outside the reserved archive")
    return directory


def start(site):
    if site not in (PRIMARY_SITE, RESTORE_SITE) or STATE.exists():
        raise RuntimeError("Choose the isolated showcase or restored site with no active production drill")
    target = SESSION + ":frontend"
    raw = subprocess.check_output(["tmux", "display-message", "-p", "-t", target,
                                   "#{pane_start_command}"], text=True).strip()
    command = shlex.split(raw)[0] if raw.startswith('"') else raw
    if site not in command or "npm run dev" not in command:
        raise RuntimeError("The isolated frontend must already target this exact site")
    directory = subprocess.check_output(["tmux", "display-message", "-p", "-t", target,
                                        "#{pane_current_path}"], text=True).strip()
    with os.fdopen(os.open(STATE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w") as stream:
        json.dump({"site": site, "command": command, "directory": directory}, stream)
    gateway = Path(__file__).resolve()
    launch = shlex.join(["env", "PYTHONPATH=" + str(CHECKOUT),
                        "FRAPPE_BENCH_ROOT=" + str(RUNTIME / "bench"),
                        str(RUNTIME / "bench/env/bin/python"), str(gateway), "serve", site])
    subprocess.run(["tmux", "respawn-pane", "-k", "-t", target, launch], check=True)
    return {"site": site, "entry": "Frappe production HTML and compiled assets", "port": 34340}


def stop():
    state = json.loads(STATE.read_text())
    if state["site"] not in (PRIMARY_SITE, RESTORE_SITE):
        raise RuntimeError("The preserved production launch state is outside this drill")
    subprocess.run(["tmux", "respawn-pane", "-k", "-c", state["directory"],
                    "-t", SESSION + ":frontend", state["command"]], check=True)
    STATE.unlink()
    return {"site": state["site"], "development_frontend_restored": True}


def serve(site):
    if site not in (PRIMARY_SITE, RESTORE_SITE):
        raise RuntimeError("This gateway is restricted to the isolated content runtime")

    class Handler(BaseHTTPRequestHandler):
        def forward(self):
            path = unquote(urlsplit(self.path).path)
            prefix = "/assets/appointment/frontend/"
            if self.command in ("GET", "HEAD") and path.startswith(prefix):
                return self.frontend_asset(path[len(prefix):])
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length) if length else None
            headers = {key: value for key, value in self.headers.items() if key.lower() not in HOP_HEADERS}
            headers["X-Frappe-Site-Name"] = site
            connection = http.client.HTTPConnection("127.0.0.1", 34341, timeout=60)
            try:
                connection.request(self.command, self.path, body=body, headers=headers)
                response = connection.getresponse()
                payload = response.read()
                self.send_response(response.status)
                for key, value in response.getheaders():
                    if key.lower() not in HOP_HEADERS:
                        self.send_header(key, value)
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(payload)
            finally:
                connection.close()

        def frontend_asset(self, relative):
            directory = frontend_directory(site).resolve()
            source = (directory / relative).resolve()
            if directory not in source.parents or not source.is_file():
                self.send_error(404)
                return
            payload = source.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", mimetypes.guess_type(source.name)[0] or "application/octet-stream")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Cache-Control", "no-cache" if source.name == "sw.js" else "public, max-age=3600")
            if source.name == "sw.js":
                self.send_header("Service-Worker-Allowed", "/")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(payload)

        do_GET = do_POST = do_HEAD = do_PUT = do_DELETE = do_OPTIONS = forward

        def log_message(self, *_args):
            # Consent and invitation tokens must not enter gateway logs.
            pass

    ThreadingHTTPServer(("127.0.0.11", 34340), Handler).serve_forever()


if __name__ == "__main__":
    if sys.argv[1] == "serve":
        serve(sys.argv[2])
    else:
        print(json.dumps(start(sys.argv[2]) if sys.argv[1] == "start" else stop()))
