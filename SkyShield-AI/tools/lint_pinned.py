#!/usr/bin/env python
"""Run `genvm-lint validate` with the GenVM SDK pinned to the cached v0.2.16.

The linter otherwise resolves "latest" to a prerelease tarball that 404s. Pin
the one version that is cached locally before invoking the CLI.

Usage:
    .venv/bin/python tools/lint_pinned.py [contract.py ...]
    (defaults to contracts/sky_shield_ai.py)
"""
import sys

from genvm_linter.validate import artifacts as _art
from genvm_linter.validate import sdk_loader as _sl

_PINNED = "v0.2.16"
_art.get_latest_version = lambda: _PINNED

_orig_download = _sl.download_artifacts


def _patched_download(*args, **kwargs):
    kwargs["version"] = _PINNED
    return _orig_download(*args, **kwargs)


_sl.download_artifacts = _patched_download

from genvm_linter.cli import main  # noqa: E402  (import after monkeypatch)

targets = sys.argv[1:] or ["contracts/sky_shield_ai.py"]
sys.argv = ["genvm-lint", "validate", *targets]
main()
