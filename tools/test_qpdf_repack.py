#!/usr/bin/env python3
"""Pin the qpdf exit-code contract in `book/build_book.py:qpdf_repack`.

WHY THIS EXISTS, so the next person does not delete it as trivia. On 261029 the whole-book PDF
build was refused in CI for a day. LaTeX reported "zero unapproved diagnostics" and the packed file
was fine; qpdf had exited 3 — "operation succeeded with warnings" — over ~80 `dictionary has
duplicated key /Group` warnings, and the repack treated every non-zero exit as fatal.

The failure is NOT reproducible on a developer machine, and running the real build will never catch
it. CI compiles with the pinned toolchain (LaTeX kernel 2025-11-01, tagpdf 0.99y) which emits those
duplicate keys; this host's TeX is a year older (2024-11-01, tagpdf 0.99o) and emits none, so qpdf
returns 0 locally and the gate goes green. A test that shells out to qpdf would therefore pass here
and prove nothing. So the contract is pinned with an INJECTED RUNNER: no qpdf, no TeX, no network,
no CI — it runs in milliseconds wherever it is invoked, which is the point.

Exit codes are qpdf's own: 0 success, 2 error, 3 warnings-but-file-written.
"""
from __future__ import annotations

import pathlib
import sys
import types
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "book"))

import build_book  # noqa: E402


def _result(code, stderr=""):
    return types.SimpleNamespace(returncode=code, stderr=stderr, stdout="")


class _FakePacked:
    """Stands in for the packed-PDF path: records whether it was replaced or unlinked."""

    def __init__(self):
        self.replaced_with = None
        self.unlinked = False

    def replace(self, target):
        self.replaced_with = target

    def unlink(self, missing_ok=False):
        self.unlinked = True


class QpdfExitContract(unittest.TestCase):
    def test_success_replaces_the_original(self):
        packed = _FakePacked()
        build_book.qpdf_repack("book.pdf", packed, runner=lambda cmd: _result(0))
        self.assertEqual(packed.replaced_with, "book.pdf")
        self.assertFalse(packed.unlinked)

    def test_warnings_are_not_fatal_and_the_file_still_ships(self):
        """Exit 3 is the 261029 CI failure. The packed file MUST replace the original."""
        packed = _FakePacked()
        stderr = "\n".join(
            f"WARNING: book.pdf (object {n} 0): dictionary has duplicated key /Group"
            for n in range(80))
        build_book.qpdf_repack("book.pdf", packed, runner=lambda cmd: _result(3, stderr))
        self.assertEqual(packed.replaced_with, "book.pdf",
                         "exit 3 means qpdf wrote a usable file; the build must keep it")
        self.assertFalse(packed.unlinked, "a warning must not discard the packed PDF")

    def test_warnings_are_reported_not_swallowed(self):
        """Duplicate keys are a real upstream defect — the count must reach the log."""
        packed = _FakePacked()
        stderr = "WARNING: a\nWARNING: b\nWARNING: c"
        import contextlib
        import io
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            build_book.qpdf_repack("book.pdf", packed, runner=lambda cmd: _result(3, stderr))
        out = buf.getvalue()
        self.assertIn("3 warning(s)", out)
        self.assertIn("WARNING: a", out, "the first warning should be quoted for diagnosis")

    def test_real_errors_still_refuse_the_build(self):
        """Exit 2 is a genuine failure: raise, and do not leave a half-written file behind."""
        packed = _FakePacked()
        with self.assertRaises(RuntimeError) as caught:
            build_book.qpdf_repack("book.pdf", packed,
                                   runner=lambda cmd: _result(2, "ERROR: damaged file"))
        self.assertIn("exit 2", str(caught.exception))
        self.assertIn("damaged file", str(caught.exception))
        self.assertTrue(packed.unlinked, "a failed repack must not leave the packed file")
        self.assertIsNone(packed.replaced_with)

    def test_unexpected_nonzero_is_also_fatal(self):
        """Only 3 is tolerated. An unknown code is treated as an error, not assumed benign."""
        packed = _FakePacked()
        with self.assertRaises(RuntimeError):
            build_book.qpdf_repack("book.pdf", packed, runner=lambda cmd: _result(9, "odd"))
        self.assertTrue(packed.unlinked)

    def test_the_command_still_asks_for_lossless_packing(self):
        """The flags carry the requirement: object streams, compression, and tag-tree retention."""
        seen = {}

        def runner(cmd):
            seen["cmd"] = cmd
            return _result(0)

        build_book.qpdf_repack("in.pdf", _FakePacked(), runner=runner)
        self.assertEqual(seen["cmd"][0], "qpdf")
        self.assertIn("--object-streams=generate", seen["cmd"])
        self.assertIn("--stream-data=compress", seen["cmd"])
        self.assertIn("--remove-unreferenced-resources=yes", seen["cmd"])


if __name__ == "__main__":
    unittest.main(verbosity=0)
