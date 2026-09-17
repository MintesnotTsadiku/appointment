"""Temporary compatibility alias for the former ``frappe_appointment`` package.

The canonical Python package and Frappe app identifier are now ``appointment``.
This shim keeps supported legacy imports (``frappe_appointment.<module>``) and
whitelisted dotted API paths working during the announced compatibility window.
It resolves submodules from the canonical package by re-using its ``__path__``
and ``__file__``, so ``frappe.get_app_path("frappe_appointment")`` still points
at the real app directory.

Remove this package only in a separately announced release once external callers
have moved to ``appointment.*``.
"""

from appointment import __path__ as _canonical_path
from appointment import __file__ as _canonical_file
import appointment as _canonical

__path__ = list(_canonical_path)
__file__ = _canonical_file
__version__ = getattr(_canonical, "__version__", "")

for _name in dir(_canonical):
    if not _name.startswith("_"):
        globals()[_name] = getattr(_canonical, _name)

del _name
