"""Tests for the disposable-site QA bootstrap tooling.

Run with::

    bench --site <site> run-tests --module appointment.tests.test_qa_bootstrap \
        --skip-before-tests

The tests are fast unit tests around ``appointment.qa_bootstrap``. They replace
Frappe's app installer so no real site changes happen.
"""

import types
import unittest
from unittest.mock import patch

import frappe

from appointment import qa_bootstrap


def _callable_original(label):
    def original():
        return label

    original.__name__ = label
    return original


class FakeInstaller:
    """Stateful stand-in for ``frappe.installer.install_app``."""

    def __init__(self, installed, behaviors=None):
        self.apps = list(installed)
        self.behaviors = behaviors or {}
        self.calls = []

    def install_app(self, app, verbose=False):
        self.calls.append(app)
        behavior = self.behaviors.get(app, "ok")
        if isinstance(behavior, Exception):
            raise behavior
        if behavior == "silent":
            return
        if app not in self.apps:
            self.apps.append(app)

    def get_installed_apps(self):
        return list(self.apps)


def _seed_patch_module():
    module = types.SimpleNamespace()
    originals = {}
    for name in qa_bootstrap._SEED_PATCH_TARGETS:
        original = _callable_original(name)
        originals[name] = original
        setattr(module, name, original)
    return module, originals


class TestNormalizeRequested(unittest.TestCase):
    def test_default_order(self):
        self.assertEqual(qa_bootstrap._normalize_requested(None), ["agent_harness", "agent_plane"])

    def test_rejects_unknown_app(self):
        with self.assertRaises(frappe.ValidationError):
            qa_bootstrap._normalize_requested("agent_plane,frappe")

    def test_deduplicates_preserving_order(self):
        self.assertEqual(
            qa_bootstrap._normalize_requested("agent_plane,agent_harness,agent_plane"),
            ["agent_plane", "agent_harness"],
        )


class TestRunInstall(unittest.TestCase):
    def setUp(self):
        self.seed_module, self.seed_originals = _seed_patch_module()
        self.seed_patch = {"module": self.seed_module, "originals": self.seed_originals}

    def _fake_seed_install(self):
        for name in qa_bootstrap._SEED_PATCH_TARGETS:
            setattr(self.seed_module, name, qa_bootstrap._noop)
        return self.seed_patch

    def _run(self, installed, behaviors=None, requested=None):
        fake = FakeInstaller(installed, behaviors)
        with (
            patch.object(qa_bootstrap.installer, "install_app", side_effect=fake.install_app),
            patch.object(qa_bootstrap.frappe, "get_installed_apps", side_effect=fake.get_installed_apps),
            patch.object(qa_bootstrap.frappe, "clear_cache"),
            patch.object(qa_bootstrap, "_install_seed_patch", side_effect=self._fake_seed_install),
        ):
            result = qa_bootstrap._run_install(requested if requested is not None else list(qa_bootstrap.DEFAULT_APPS))
        return result, fake

    def test_both_already_installed(self):
        result, fake = self._run(["frappe", "agent_harness", "agent_plane"])
        self.assertTrue(result["ok"])
        self.assertEqual(result["already_installed"], ["agent_harness", "agent_plane"])
        self.assertEqual(result["installed"], [])
        self.assertEqual(result["failed"], [])
        self.assertEqual(fake.calls, [])

    def test_successful_installation(self):
        result, _fake = self._run(["frappe"])
        self.assertTrue(result["ok"])
        self.assertEqual(result["installed"], ["agent_harness", "agent_plane"])
        self.assertEqual(result["already_installed"], [])
        self.assertEqual(result["failed"], [])
        self.assertEqual(result["errors"], [])
        self.assertIn("agent_plane", result["installed_apps"])

    def test_first_dependency_failure_stops_second(self):
        result, fake = self._run(["frappe"], {"agent_harness": RuntimeError("boom")})
        self.assertFalse(result["ok"])
        self.assertEqual(result["failed"], ["agent_harness"])
        self.assertEqual(result["installed"], [])
        self.assertEqual(fake.calls, ["agent_harness"])
        self.assertEqual(len(result["errors"]), 1)

    def test_second_dependency_failure_reports_partial(self):
        result, fake = self._run(["frappe"], {"agent_plane": RuntimeError("boom")})
        self.assertFalse(result["ok"])
        self.assertEqual(result["installed"], ["agent_harness"])
        self.assertEqual(result["failed"], ["agent_plane"])
        self.assertEqual(fake.calls, ["agent_harness", "agent_plane"])

    def test_silent_registration_failure_is_reported(self):
        result, _fake = self._run(["frappe"], {"agent_plane": "silent"})
        self.assertFalse(result["ok"])
        self.assertEqual(result["installed"], ["agent_harness"])
        self.assertEqual(result["failed"], ["agent_plane"])

    def test_seed_helpers_restored_after_failure(self):
        original_init_singles = qa_bootstrap.installer.init_singles
        result, _fake = self._run(["frappe"], {"agent_plane": RuntimeError("boom")})
        self.assertFalse(result["ok"])
        self.assertIs(qa_bootstrap.installer.init_singles, original_init_singles)
        for name, original in self.seed_originals.items():
            self.assertIs(getattr(self.seed_module, name), original)

    def test_patches_restored_when_an_unexpected_exception_escapes(self):
        class Boom(BaseException):
            pass

        original_init_singles = qa_bootstrap.installer.init_singles

        def explode(app, verbose=False):
            raise Boom("unexpected")

        with self.assertRaises(Boom):
            with (
                patch.object(qa_bootstrap.installer, "install_app", side_effect=explode),
                patch.object(qa_bootstrap.frappe, "get_installed_apps", return_value=["frappe"]),
                patch.object(qa_bootstrap, "_install_seed_patch", side_effect=self._fake_seed_install),
            ):
                qa_bootstrap._run_install(list(qa_bootstrap.DEFAULT_APPS))
        self.assertIs(qa_bootstrap.installer.init_singles, original_init_singles)
        for name, original in self.seed_originals.items():
            self.assertIs(getattr(self.seed_module, name), original)

    def test_missing_agent_plane_private_helper_fails_closed(self):
        import agent_plane.setup.seed as real_seed

        with patch.object(real_seed, "_sync_workspace_sidebars", None):
            with self.assertRaises(RuntimeError):
                qa_bootstrap._install_seed_patch()
        # Validate-before-patch: the other helper must not be left patched.
        self.assertIsNot(real_seed._sync_desktop_icon, qa_bootstrap._noop)


class TestInstallCommand(unittest.TestCase):
    def test_install_raises_on_failure_for_automation(self):
        with (
            patch.object(qa_bootstrap.frappe, "set_user"),
            patch.object(qa_bootstrap, "_run_install", return_value={"ok": False, "failed": ["agent_plane"]}),
            patch.object(qa_bootstrap.frappe, "log_error"),
            patch.object(qa_bootstrap, "_normalize_requested", return_value=["agent_plane"]),
        ):
            with self.assertRaises(frappe.ValidationError):
                qa_bootstrap.install()

    def test_install_returns_report_on_success(self):
        report = {
            "ok": True,
            "requested": ["agent_plane"],
            "already_installed": [],
            "installed": ["agent_plane"],
            "failed": [],
            "errors": [],
            "installed_apps": ["frappe", "agent_plane"],
        }
        with (
            patch.object(qa_bootstrap.frappe, "set_user"),
            patch.object(qa_bootstrap, "_run_install", return_value=report),
            patch.object(qa_bootstrap, "_normalize_requested", return_value=["agent_plane"]),
        ):
            self.assertEqual(qa_bootstrap.install(), report)
