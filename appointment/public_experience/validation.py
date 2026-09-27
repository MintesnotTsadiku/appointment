"""Shared issue/report types for typed public content validation."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ValidationIssue:
    field: str
    rule: str
    observed: object
    requirement: str
    remediation: str

    def as_dict(self) -> dict:
        return {
            "field": self.field,
            "rule": self.rule,
            "observed": self.observed,
            "requirement": self.requirement,
            "remediation": self.remediation,
        }


@dataclass(frozen=True)
class ValidationReport:
    issues: tuple[ValidationIssue, ...] = ()

    @property
    def ok(self) -> bool:
        return not self.issues

    def as_dicts(self) -> list[dict]:
        return [issue.as_dict() for issue in self.issues]

    def raise_if_invalid(self) -> None:
        if self.issues:
            first = self.issues[0]
            raise ValueError(f"validation failed for {first.field}: {first.requirement}")
