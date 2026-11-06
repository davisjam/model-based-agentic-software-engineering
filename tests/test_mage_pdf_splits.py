"""A publication build must refresh partial PDFs as well as the full edition."""
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
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


if __name__ == "__main__":
    unittest.main()
