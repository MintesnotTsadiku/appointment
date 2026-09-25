"""DNS record expectations and verification for public site domains.

Pure decision functions: they describe the records a tenant must publish and
decide whether observed DNS answers satisfy them. Fetching the records is the
caller's job, so this never performs network I/O and is fully testable.
"""

from __future__ import annotations

from dataclasses import dataclass

VERIFICATION_PREFIX = "_appointment-verify"
VERIFICATION_VALUE_PREFIX = "appointment-site-verification="


@dataclass(frozen=True)
class DnsRecord:
    record_type: str
    host: str
    value: str
    purpose: str


def verification_value(token: str) -> str:
    return f"{VERIFICATION_VALUE_PREFIX}{token}"


def expected_records(
    hostname: str, token: str, target_host: str, domain_type: str = "Custom Subdomain"
) -> tuple[DnsRecord, ...]:
    """Records a tenant must publish for ``hostname``.

    ``target_host`` is a stable hostname (CNAME) or IP (A record for apex).
    """

    host = hostname.strip().lower().rstrip(".")
    records = [
        DnsRecord(
            record_type="TXT",
            host=f"{VERIFICATION_PREFIX}.{host}",
            value=verification_value(token),
            purpose="ownership",
        )
    ]
    if domain_type == "Custom Apex":
        records.append(DnsRecord(record_type="A", host=host, value=target_host, purpose="routing"))
    else:
        records.append(DnsRecord(record_type="CNAME", host=host, value=target_host, purpose="routing"))
    return tuple(records)


def verify(observed: dict[tuple[str, str], list[str]], expected: tuple[DnsRecord, ...]) -> dict:
    """Compare observed DNS answers against expected records.

    ``observed`` maps ``(record_type.upper(), host)`` to a list of values. A
    record matches when any observed value equals or contains the expected
    value (CNAME targets may include a trailing dot).
    """

    results: list[dict] = []
    ok = True
    for record in expected:
        values = observed.get((record.record_type.upper(), record.host), [])
        matched = any(record.value.rstrip(".") in str(value).rstrip(".") for value in values)
        ok = ok and matched
        results.append(
            {
                "type": record.record_type,
                "host": record.host,
                "purpose": record.purpose,
                "expected": record.value,
                "observed": list(values),
                "matched": matched,
            }
        )
    return {"ok": ok, "records": results}
