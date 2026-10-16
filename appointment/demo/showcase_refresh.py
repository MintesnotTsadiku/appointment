"""Remove showcase records safely: `refresh`, `cleanup` and `retire_businesses` share this removal.

The bookings of a seed sit around its anchor date, so they drift into the past. `refresh` removes the
showcases with the records that visitors added (only when every one of them belongs to a showcase business
of the journal) and seeds again. `cleanup` removes only the journal records, and refuses, without a change,
when other records link to them, for example bookings that visitors made.

Every removal deletes the records through their lifecycle, each after the planned records that link to it,
in one transaction, and removes files from disk only after the commit.

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
# Bookkeeping that the platform adds for journal records (the access rows of the showcase staff, the former
# page addresses of the showcase websites). The lifecycle of those records deletes them too, so cleanup removes
# them with the journal when they link to no business record outside it.
JOURNAL_DEPENDENTS = {"User Permission", "Public Site Slug Alias"}


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


def cleanup(dry_run=False):
    """Remove the journal records and the journal; refuse, without a change, when other records link to them."""
    from appointment.demo import showcase

    dry_run = frappe.utils.sbool(dry_run)
    with showcase.locked():
        if not showcase.state_path().exists():
            frappe.throw("This site has no showcase journal, so cleanup has nothing to remove. No data changed.")
        state = showcase.load_state()
        plan = JournalCleanup(state["created"])
        report = plan.report(dry_run)
        _log(report)
        if dry_run:
            return report
        if plan.blocked:
            frappe.throw(plan.refusal("Cleanup"))
        plan.remove()
        showcase.state_path().unlink()
    report["removed"] = len(plan.owned)
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


class RemovalPlan:
    """Journal records to remove, and every record outside them that links to them (directly or through others)."""

    def __init__(self, entries):
        self.owned = {tuple(entry) for entry in entries if frappe.db.exists(*entry)}
        self.gone = len({tuple(entry) for entry in entries}) - len(self.owned)
        self.found = {}  # (doctype, name) of a record outside -> the first record it links to
        self.blocks = defaultdict(set)  # record -> records that link to it
        self._discover()

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

    def _foreign(self, entry):
        """Why this record outside the journal may not be removed, or None."""
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

    def _examples(self, entries):
        """Up to three records per doctype, each with the showcase record it links to."""
        examples = defaultdict(list)
        for doctype, name in sorted(entries):
            via = self.found[(doctype, name)]
            if len(examples[doctype]) < 3:
                examples[doctype].append(f"{name} -> {via[0]} {via[1]}")
        return dict(sorted(examples.items()))


class JournalCleanup(RemovalPlan):
    """Remove journal records only. Any other record that links to them blocks the removal.

    The exception is the bookkeeping in JOURNAL_DEPENDENTS that links to no business record outside the journal:
    it goes with the journal records, as their own lifecycle would delete it.
    """

    def __init__(self, entries):
        super().__init__(entries)
        self.dependents = {entry for entry in self.found if entry[0] in JOURNAL_DEPENDENTS and not self._foreign(entry)}
        self.blockers = set(self.found) - self.dependents
        self.order = DeletionOrder(self.owned | self.dependents, self.blocks)

    @property
    def blocked(self):
        return bool(self.blockers or self.order.unbroken)

    def report(self, dry_run):
        return {
            "site": frappe.local.site,
            "dry_run": bool(dry_run),
            "journal_records": dict(sorted(Counter(dt for dt, _ in self.owned).items())),
            "journal_records_already_gone": self.gone,
            "removed_with_journal": dict(sorted(Counter(dt for dt, _ in self.dependents).items())),
            "blockers": dict(sorted(Counter(dt for dt, _ in self.blockers).items())),
            "blocker_examples": self._examples(self.blockers),
            "unbroken_cycle": [f"{dt} {name}" for dt, name in self.order.unbroken[:REPORT_LIMIT]],
            "child_rows_released": sum(len(releases) for _entry, releases in self.order.steps),
        }

    def refusal(self, action, hint=None):
        if self.blockers:
            listed = ", ".join(f"{doctype} {count}" for doctype, count in
                               sorted(Counter(dt for dt, _ in self.blockers).items()))
            hint = hint or (f"{action} removes only journal records. To remove these records too, run "
                            "appointment.demo.showcase.refresh (a dry run first); it seeds the showcases again.")
            return f"{action} refused: other records link to the records to remove ({listed}). {hint} No data changed."
        return (f"{action} refused: some journal records link to each other in a cycle that cannot be broken "
                f"({', '.join(f'{dt} {name}' for dt, name in self.order.unbroken[:5])}). No data changed.")

    def remove(self, before_commit=None):
        delete_in_order(self.order, before_commit)


class ShowcaseRefresh(RemovalPlan):
    """The removal plan: the journal records, plus the records that link to them from outside the journal."""

    def __init__(self, state):
        self.state = state
        super().__init__(state["created"])
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
            "visitor_examples": self._examples(self.found),
            "refused": self.refused[:REPORT_LIMIT],
            "refused_count": len(self.refused),
            "child_rows_released": sum(len(releases) for _entry, releases in self.order.steps),
            "kept": other,
        }

    def remove(self):
        """Delete every planned record, dependents first, in one transaction."""
        from appointment.demo import showcase

        delete_in_order(self.order)
        showcase.state_path().unlink()

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
        try:
            File._delete_file_on_disk(doc)
        except Exception:  # The records are gone already; a file left behind must not stop the caller.
            frappe.logger("appointment.showcase_refresh").warning(f"File {doc.name} not removed from disk", exc_info=True)


def delete_in_order(order, before_commit=None):
    """Delete the records of a DeletionOrder in one transaction; files leave the disk only after the commit."""
    from appointment.demo import showcase

    with files_removed_after_commit():
        try:
            for (doctype, name), releases in order.steps:
                for child_doctype, fieldname, (parent_doctype, parent) in releases:
                    frappe.db.delete(child_doctype, {"parenttype": parent_doctype, "parent": parent, fieldname: name})
                showcase._delete_entry(doctype, name)
            if before_commit:
                before_commit()
            frappe.db.commit()
        except Exception:
            frappe.db.rollback()
            raise


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
                                                       if key not in ("visitor_examples", "blocker_examples")})
