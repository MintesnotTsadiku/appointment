"""Refresh the showcases around a new anchor date: remove them with what visitors added, then seed again.

The bookings of a seed sit around its anchor date, so they drift into the past. `cleanup` stops when
other records link to the showcases, for example bookings that visitors made. `refresh` removes those
visitor records too, but only when every one of them belongs to a showcase business of the journal.

Run with bench --site <site> execute appointment.demo.showcase.refresh (a dry run by default).
"""

from collections import Counter, defaultdict
from contextlib import contextmanager
from unittest.mock import patch

import frappe
from frappe.model.delete_doc import get_dynamic_linked_docs, get_linked_docs
from frappe.utils import getdate, nowdate

# Links to these doctypes tie a record to one business. A visitor record may point only at showcase records.
BUSINESS_DOCTYPES = {"Organization", "Provider", "Location", "Service", "EventType", "Public Site", "Brand Profile",
                     "Customer Profile", "Appointment", "Walk In", "Business Membership", "Directory Listing"}
# Records outside the journal of these doctypes are never removed, even when they link to a showcase.
NEVER_REMOVE = {"Organization", "User", "DocType"}
REPORT_LIMIT = 20
# Deleting these also deletes a file on disk.
DISK_DOCTYPES = {"File"}


def refresh(anchor_date=None, base_url=None, dry_run=True):
    from appointment.demo import showcase

    anchor = str(getdate(anchor_date or nowdate()))
    dry_run = frappe.utils.sbool(dry_run)
    with showcase.locked():
        if not showcase.state_path().exists():
            frappe.throw("This site has no showcase journal; refresh runs only on a site the showcase seeder seeded. "
                         "No data changed.")
        state = showcase.load_state()
        plan = ShowcaseRefresh(state)
        report = plan.report(anchor, dry_run)
        _log(report)
        if dry_run:
            return report
        if report["refused"]:
            frappe.throw("Refresh refused: some records cannot be removed safely, for example because they belong to "
                         "a business outside the showcase journal. Run the dry run and read 'refused'. No data changed.")
        base_url = base_url or state.get("base_url")
        plan.remove()
    seeded = showcase.seed(base_url=base_url, anchor_date=anchor)
    report.update(seeded=seeded["counts"], bookings_after=booking_range(showcase.load_state()))
    _log(report)
    return report


def booking_range(state):
    """Earliest and latest showcase booking dates, and how many fall before or after the anchor."""
    owned = [name for doctype, name in state["created"] if doctype == "Appointment"]
    dates = [getdate(day) for day in frappe.get_all("Appointment", filters={"name": ["in", owned or [""]]},
                                                    pluck="appointment_date")]
    anchor = getdate(state["anchor_date"])
    if not dates:
        return {"anchor_date": str(anchor), "bookings": 0}
    return {"anchor_date": str(anchor), "bookings": len(dates), "earliest": str(min(dates)), "latest": str(max(dates)),
            "before_anchor": sum(day < anchor for day in dates), "on_or_after_anchor": sum(day >= anchor for day in dates)}


class ShowcaseRefresh:
    """The removal plan: the journal records, plus the records that link to them from outside the journal."""

    def __init__(self, state):
        self.state = state
        self.owned = {tuple(entry) for entry in state["created"] if frappe.db.exists(*entry)}
        self.gone = len({tuple(entry) for entry in state["created"]}) - len(self.owned)
        self.found = {}  # (doctype, name) of a visitor record -> the first record it links to
        self.blocks = defaultdict(set)  # record -> planned records that link to it
        self._discover()
        self._discover_page_views()
        self.refused = [row for row in (self._foreign(entry) for entry in self.found) if row]
        self.order = DeletionOrder(self.owned | set(self.found), self.blocks)
        self.refused += [{"record": f"{dt} {name}", "reason": "in a link cycle that refresh cannot break"}
                         for dt, name in self.order.unbroken]

    def report(self, anchor, dry_run):
        other = self._other_businesses()
        return {
            "site": frappe.local.site,
            "dry_run": bool(dry_run),
            "new_anchor_date": anchor,
            "bookings_before": booking_range(self.state),
            "journal_records": dict(sorted(Counter(dt for dt, _ in self.owned).items())),
            "journal_records_already_gone": self.gone,
            "visitor_records": dict(sorted(Counter(dt for dt, _ in self.found).items())),
            "visitor_examples": self._examples(),
            "refused": self.refused[:REPORT_LIMIT],
            "refused_count": len(self.refused),
            "child_rows_released": sum(len(releases) for _entry, releases in self.order.steps),
            "kept": other,
        }

    def remove(self):
        """Delete every planned record, dependents first, in one transaction."""
        from appointment.demo import showcase

        with files_removed_after_commit():
            try:
                for (doctype, name), releases in self.order.steps:
                    for child_doctype, fieldname, (parent_doctype, parent) in releases:
                        frappe.db.delete(child_doctype, {"parenttype": parent_doctype, "parent": parent, fieldname: name})
                    showcase._delete_entry(doctype, name)
                frappe.db.commit()
            except Exception:
                frappe.db.rollback()
                raise
        showcase.state_path().unlink()

    def _discover(self):
        from appointment.demo.showcase import DIRECT_DELETE

        queue = list(self.owned)
        seen = set(queue)
        while queue:
            target = queue.pop()
            for linker in self._linkers(target):
                if linker == target:
                    continue
                if target[0] not in DIRECT_DELETE:  # Removed without a link check, so nothing blocks it.
                    self.blocks[target].add(linker)
                if linker in self.owned:
                    continue
                self.found.setdefault(linker, target)
                if linker not in seen:
                    seen.add(linker)
                    queue.append(linker)

    def _linkers(self, entry):
        doc = frappe._dict(doctype=entry[0], name=entry[1])
        rows = get_linked_docs(doc) + get_dynamic_linked_docs(doc)
        return {(row["reference_doctype"], row["reference_docname"]) for row in rows}

    def _discover_page_views(self):
        """Page views have no links, so they are matched by the showcase paths."""
        if not frappe.db.exists("DocType", "Web Page View"):
            return
        for path in self._public_paths():
            for variant in {path, path.lstrip("/")}:
                names = frappe.get_all("Web Page View", filters={"path": variant}, pluck="name")
                names += frappe.get_all("Web Page View", filters={"path": ["like", f"{variant}/%"]}, pluck="name")
                for name in names:
                    self.found.setdefault(("Web Page View", name), ("path", path))

    def _public_paths(self):
        paths = set()
        for business in self.state["businesses"].values():
            paths.update(filter(None, (business.get("public_experience_path"), business.get("public_path"))))
        for info in (self.state.get("independents") or {}).values():
            paths.update(filter(None, (info.get("public_path"), info.get("provider_page"))))
        return {path for path in paths if path.strip("/")}

    def _foreign(self, entry):
        """Why this visitor record may not be removed, or None."""
        doctype, name = entry
        if doctype in NEVER_REMOVE:
            return {"record": f"{doctype} {name}", "reason": f"{doctype} records outside the journal are never removed"}
        if doctype == "Web Page View":
            return None
        doc = frappe.get_doc(doctype, name)
        for row in [doc, *doc.get_all_children()]:
            for df in row.meta.get_link_fields() + row.meta.get_dynamic_link_fields():
                target = row.get(df.options) if df.fieldtype == "Dynamic Link" else df.options
                link = (target, row.get(df.fieldname))
                if target in BUSINESS_DOCTYPES and link[1] and link not in self.owned and link not in self.found:
                    return {"record": f"{doctype} {name}", "reason": f"{df.fieldname} links {target} {link[1]}, "
                            "which is not a showcase record"}
        return None

    def _examples(self):
        """Up to three records per doctype, each with the showcase record it links to."""
        examples = defaultdict(list)
        for (doctype, name), via in self.found.items():
            if len(examples[doctype]) < 3:
                examples[doctype].append(f"{name} -> {via[0]} {via[1]}")
        return dict(sorted(examples.items()))

    def _other_businesses(self):
        def outside(doctype):
            return frappe.db.count(doctype) - sum(dt == doctype for dt, _ in [*self.owned, *self.found])

        return {"reason": "Not linked to a showcase record; refresh does not touch them.",
                "organizations": outside("Organization"), "providers": outside("Provider"),
                "bookings": outside("Appointment"), "customer_profiles": outside("Customer Profile")}


class DeletionOrder:
    """Each record after every planned record that links to it; ties in the cleanup order.

    A link cycle is broken only where one side links through its own child rows (an organization's
    booking URL rows point at its services): those rows go just before the record they point at.
    Files go last.
    """

    def __init__(self, entries, blocks):
        self.steps = []  # ((doctype, name), [(child doctype, fieldname, parent entry)])
        self.unbroken = []
        remaining = set(entries)
        last = sorted(entry for entry in remaining if entry[0] in DISK_DOCTYPES)
        remaining -= set(last)
        while remaining:
            ready = sorted((entry for entry in remaining if not (blocks.get(entry, set()) & remaining)), key=_rank)
            if not ready:
                entry, releases = self._breakable(remaining, blocks)
                if entry is None:
                    self.unbroken = sorted(remaining)
                    return
                self.steps.append((entry, releases))
                remaining.discard(entry)
                continue
            self.steps += [(entry, []) for entry in ready]
            remaining -= set(ready)
        self.steps += [(entry, []) for entry in last]

    def _breakable(self, remaining, blocks):
        for entry in sorted(remaining, key=_rank):
            releases = []
            for linker in blocks.get(entry, set()) & remaining:
                rows = _child_rows(linker, entry)
                if rows is None:
                    break
                releases += rows
            else:
                return entry, releases
        return None, []


@contextmanager
def files_removed_after_commit():
    """Deleting a File removes it from disk at once, which a rollback cannot undo: wait for the commit."""
    from frappe.core.doctype.file.file import File

    pending = []
    with patch.object(File, "_delete_file_on_disk", lambda doc: pending.append(doc)):
        yield
    for doc in pending:
        File._delete_file_on_disk(doc)


def _child_rows(linker, target):
    """The child-table fields of `linker` whose rows point at `target`, or None when the record itself does."""
    meta = frappe.get_meta(linker[0])
    direct = [df.fieldname for df in meta.get_link_fields() if df.options == target[0]]
    if direct and target[1] in (frappe.db.get_value(linker[0], linker[1], direct, as_dict=True) or {}).values():
        return None
    rows = [(table.options, df.fieldname, linker) for table in meta.get_table_fields()
            for df in frappe.get_meta(table.options).get_link_fields()
            if df.options == target[0] and frappe.db.exists(
                table.options, {"parenttype": linker[0], "parent": linker[1], df.fieldname: target[1]})]
    return rows or None


def _rank(entry):
    from appointment.demo.showcase import CLEANUP_PRIORITY

    return (CLEANUP_PRIORITY.get(entry[0], 4), entry)


def _log(report):
    frappe.logger("appointment.showcase_refresh").info({key: value for key, value in report.items()
                                                       if key not in ("visitor_examples",)})
