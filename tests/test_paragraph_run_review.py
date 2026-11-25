"""An approved continuous argument does not exempt later expansion or other sections."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("paragraph_runs", Path(__file__).resolve().parents[1] / "book-models/lint_paragraph_runs.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class ReviewedRunTests(unittest.TestCase):
    def test_review_is_bounded_and_scoped(self):
        self.assertFalse(mod.blocks_run("7.4", "What Should We Teach?", 13))
        self.assertTrue(mod.blocks_run("7.4", "What Should We Teach?", 14))
        self.assertTrue(mod.blocks_run("7.4", "Another topic", 13))
        self.assertTrue(mod.blocks_run("3.2", "What Should We Teach?", 13))
        self.assertTrue(mod.blocks_run("3.2", "Another topic", 11))
        self.assertFalse(mod.blocks_run("3.2", "Another topic", 10))

    def test_routing_addition_remains_bounded(self):
        heading = "Engineering Routing {#research-optimizing-the-engineering-environment}"
        self.assertFalse(mod.blocks_run("6.4", heading, 11))
        self.assertTrue(mod.blocks_run("6.4", heading, 12))
        self.assertTrue(mod.blocks_run("6.3", heading, 11))
