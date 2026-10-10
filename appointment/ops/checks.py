"""The row shape every readiness check returns."""

PASS, WARN, FAIL = "pass", "warn", "fail"


def check(area, key, status, detail, fix=""):
    """One report row. `detail` must never hold a secret value."""
    return {"area": area, "key": key, "status": status, "detail": detail, "fix": fix if status != PASS else ""}


def is_on(value):
    """Site config flags arrive as 1, "1", True or "true"."""
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)
