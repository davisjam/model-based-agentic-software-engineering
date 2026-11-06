"""A publication build must refresh partial PDFs as well as the full edition."""
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "book"))
import build_book


class PublicationPartialsTests(unittest.TestCase):
    def test_partials_are_enabled_locally_and_in_ci(self):
        for environment in ({}, {"CI": "true"}, {"GITHUB_ACTIONS": "true"}):
            with self.subTest(environment=environment), patch.dict(os.environ, environment, clear=True):
                self.assertTrue(build_book._pdf_split_enabled(["--pdf"]))
                self.assertFalse(build_book._pdf_split_enabled(["--pdf", "--no-split"]))

    def assert_complete_book_build(self, commands):
        builds = [argv for argv in commands if "book/build_book.py" in argv and "--pdf" in argv]
        self.assertEqual(len(builds), 1, "expected one complete book build")
        self.assertTrue(build_book._pdf_split_enabled(builds[0]),
                        "publication must not skip chapter and appendix PDFs")

    def test_pre_push_plan_builds_partials(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "hooks" / "pre-push")], cwd=ROOT,
            env=dict(os.environ, GC_PREPUSH_PLAN="1", GC_PREPUSH_ALL="1"),
            input="", text=True, capture_output=True, check=True,
        )
        commands = [shlex.split(line.split(": ", 1)[1]) for line in result.stdout.splitlines()
                    if line.startswith("PLAN step [book PDF]: ")]
        self.assert_complete_book_build(commands)

    def test_pages_workflow_builds_partials(self):
        workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text()
        commands = [shlex.split(line) for line in workflow.splitlines()
                    if re.match(r"\s*python3 book/build_book\.py\s", line)]
        self.assert_complete_book_build(commands)


class SectionReuseKeyTests(unittest.TestCase):
    """The change-aware reuse is only sound if its key covers every input and its guard fails open.

    These exercise the key and the guard directly rather than through a LaTeX run: a compile is
    minutes, and what needs pinning is which changes DO and DO NOT invalidate a stamped PDF.
    """

    def key(self, *, driver="driver text", chapters=None, bibliography="@book{k,title={T}}",
            assets=None):
        return build_book._section_cache_key(driver, chapters or ["chapter one"], bibliography,
                                             assets or [])

    def test_identical_inputs_give_the_same_key(self):
        self.assertEqual(self.key(), self.key())

    def test_every_input_channel_changes_the_key(self):
        baseline = self.key()
        for label, changed in (
            ("driver", self.key(driver="driver text ")),
            ("chapters", self.key(chapters=["chapter one!"])),
            ("chapter count", self.key(chapters=["chapter one", "chapter two"])),
            ("bibliography", self.key(bibliography="@book{k,title={U}}")),
        ):
            with self.subTest(channel=label):
                self.assertNotEqual(baseline, changed, f"a {label} edit must invalidate the stamp")

    def test_shared_latex_inputs_are_all_real_files(self):
        """A typo in the shared-input tuple would silently stop covering that file."""
        for relative in build_book._SECTION_KEY_INPUTS:
            with self.subTest(input=relative):
                self.assertTrue((ROOT / relative).is_file(), f"{relative} is not a file")

    def test_a_shared_input_edit_changes_the_key(self):
        """A declared shared input reaches the key by CONTENT, so editing one recompiles.

        Exercised through a temporary file added to the declared tuple rather than by editing
        `latex/house.sty` in place: several agents and the author share this checkout, and a test that
        briefly rewrites a tracked file every compiler here reads would break whichever build was
        running at the time.
        """
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            probe = Path(directory) / "shared-probe.sty"
            relative = probe.relative_to(ROOT).as_posix()
            probe.write_bytes(b"% one")
            with patch.object(build_book, "_SECTION_KEY_INPUTS",
                              build_book._SECTION_KEY_INPUTS + (relative,)):
                first = self.key()
                self.assertNotEqual(BASELINE_KEY, first,
                                    "an added shared input must participate in the key")
                probe.write_bytes(b"% two")
                self.assertNotEqual(first, self.key(),
                                    "editing a shared input must invalidate the stamp")
                probe.unlink()
                self.assertNotEqual(first, self.key(),
                                    "a vanished shared input must invalidate the stamp")
            self.assertEqual(BASELINE_KEY, self.key(),
                             "the key must return to baseline once the probe is withdrawn")

    def test_an_asset_edit_changes_the_key(self):
        """The figure pool is content-addressed by NAME; the bytes are hashed too."""
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            asset = Path(directory) / "probe.pdf"
            relative = asset.relative_to(ROOT).as_posix()
            asset.write_bytes(b"one")
            first = self.key(assets=[relative])
            asset.write_bytes(b"two")
            self.assertNotEqual(first, self.key(assets=[relative]))
            asset.unlink()
            self.assertNotEqual(first, self.key(assets=[relative]),
                                "a vanished asset must invalidate the stamp, not be ignored")

    def test_guard_requires_key_digest_and_a_present_pdf(self):
        with tempfile.TemporaryDirectory() as directory:
            stamp = Path(directory) / "s.cache.json"
            pdf = Path(directory) / "s.pdf"
            pdf.write_bytes(b"%PDF-1.7 pretend")
            stamp.write_text(json.dumps({
                "key": "abc",
                "output_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest()}))
            with patch.dict(os.environ, {}, clear=True):
                self.assertTrue(build_book._section_is_current(stamp, "abc", pdf))
                self.assertFalse(build_book._section_is_current(stamp, "different", pdf),
                                 "a changed key must recompile")
                pdf.write_bytes(b"%PDF-1.7 tampered")
                self.assertFalse(build_book._section_is_current(stamp, "abc", pdf),
                                 "a PDF that no longer matches the stamp must recompile")
                pdf.unlink()
                self.assertFalse(build_book._section_is_current(stamp, "abc", pdf),
                                 "a deleted PDF must recompile")

    def test_guard_fails_open_on_a_missing_or_corrupt_stamp(self):
        with tempfile.TemporaryDirectory() as directory:
            stamp = Path(directory) / "s.cache.json"
            pdf = Path(directory) / "s.pdf"
            pdf.write_bytes(b"%PDF-1.7 pretend")
            with patch.dict(os.environ, {}, clear=True):
                self.assertFalse(build_book._section_is_current(stamp, "abc", pdf),
                                 "no stamp must mean compile")
                stamp.write_text("{not json")
                self.assertFalse(build_book._section_is_current(stamp, "abc", pdf),
                                 "an unreadable stamp must mean compile")

    def test_force_env_ignores_a_valid_stamp(self):
        with tempfile.TemporaryDirectory() as directory:
            stamp = Path(directory) / "s.cache.json"
            pdf = Path(directory) / "s.pdf"
            pdf.write_bytes(b"%PDF-1.7 pretend")
            stamp.write_text(json.dumps({
                "key": "abc",
                "output_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest()}))
            with patch.dict(os.environ, {"MAGE_PDF_SPLIT_FORCE": "1"}):
                self.assertFalse(build_book._section_is_current(stamp, "abc", pdf))


# Captured at import, before any test mutates a shared input, so the edit test compares against a
# genuinely clean baseline rather than against a key taken after a sibling subTest restored a file.
BASELINE_KEY = build_book._section_cache_key("driver text", ["chapter one"], "@book{k,title={T}}", [])


if __name__ == "__main__":
    unittest.main()
