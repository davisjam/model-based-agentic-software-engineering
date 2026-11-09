"""Focused regression tests for Chapter 6's four-proposition migration."""
from __future__ import annotations
import copy
import json
from pathlib import Path
import sys
import tempfile
ROOT = Path(__file__).resolve().parents[1]
sys.path = [entry for entry in sys.path if Path(entry or ".").resolve() != ROOT / "tests"]
import unittest
from unittest.mock import patch
sys.path.insert(0, str(ROOT / "book-models"))
import theory_of_mage_model as theory
import theory_model_check as schema
import research_agenda_model as agenda
import industry_cases_model as cases
import substantiation

class FourPropositions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raw = json.loads((ROOT / "book-models/theory_of_mage_declared.json").read_text())

    def test_live_model_and_exact_projection(self):
        self.assertEqual(theory.all_findings(), [])
        self.assertEqual(tuple(p.id for p in theory.derive_propositions()), theory.EXPECTED_IDS)
        self.assertEqual(agenda.count_guard_findings(), [])
        self.assertEqual(agenda.structural_findings(), [])
        self.assertEqual(agenda.parity_findings(), [])

    def test_missing_and_duplicate_propositions_fail(self):
        missing = copy.deepcopy(self.raw)
        missing["propositions"].pop()
        self.assertTrue(theory.count_guard_findings(theory.derive_model(missing)))
        duplicate = copy.deepcopy(self.raw)
        duplicate["propositions"][-1] = copy.deepcopy(duplicate["propositions"][0])
        self.assertTrue(theory.count_guard_findings(theory.derive_model(duplicate)))
        self.assertTrue(any("duplicate" in f.message for f in schema.check(duplicate)))

    def test_body_and_unknown_loop_are_not_accepted(self):
        changed = copy.deepcopy(self.raw)
        changed["propositions"][0]["mechanism"] = ""
        changed["propositions"][0]["loops"] = ["missing-loop"]
        findings = schema.check(changed)
        self.assertTrue(any("mechanism" in f.message for f in findings))
        self.assertTrue(any("missing-loop" in f.message for f in findings))

    def test_active_joins_reject_unknown_targets(self):
        research = agenda.derive_model()
        research.items[0].related_propositions.append("P5-unknown")
        self.assertTrue(any("P5-unknown" in f for f in agenda.structural_findings(research)))
        industry = cases.derive_model()
        industry.authored()[0].propositions.append("P5-unknown")
        self.assertTrue(any("P5-unknown" in f for f in cases.structural_findings(industry)))

    def test_archive_crosswalk_is_not_active_claims(self):
        self.assertEqual(self.raw["legacy_id_crosswalk"]["H4-representation-leverage"], "P1-representation-leverage")
        self.assertEqual(self.raw["legacy_id_crosswalk"]["H1-failure-class-exposure"], "P2-representation-enabled-enforcement")
        self.assertEqual({c["id"] for c in substantiation._theory_claims()}, set(theory.EXPECTED_IDS))
        changed = copy.deepcopy(self.raw)
        changed["legacy_id_crosswalk"]["H-old"] = "P5-unknown"
        self.assertTrue(any(f.code == "TM7" for f in schema.check(changed)))

    def test_projection_drift_and_missing_table_fail(self):
        original = (ROOT / "book" / theory._PAGE_REL).read_text()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            page = root / theory._PAGE_REL
            page.parent.mkdir(parents=True)
            with patch.object(theory, "_BOOK", str(root)):
                page.write_text(original)
                self.assertEqual(theory.parity_findings(), [])
                page.write_text(original.replace("Task-relevant structure reduces reconstruction", "unreviewed change"))
                self.assertTrue(theory.parity_findings())
                page.write_text("# No table\n")
                self.assertTrue(theory.parity_findings())

    def test_generated_notice_is_not_an_opening_and_real_edits_still_count(self):
        import book_ir
        import chapter_shape_model as shape
        def chapter(opening):
            return book_ir.Chapter("test", 6, "Test", [
                book_ir.Block(book_ir.BlockKind.PARA, "<!-- GENERATED from book/latex/sources/test.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->", 0),
                book_ir.Block(book_ir.BlockKind.HEADING, "# Test", 1, heading_level=1),
                book_ir.Block(book_ir.BlockKind.PARA, opening, 2),
                book_ir.Block(book_ir.BlockKind.HEADING, "## Next", 3, heading_level=2),
                book_ir.Block(book_ir.BlockKind.PARA, "The ending remains unchanged.", 4),
            ])
        first = shape.chapter_prose_anchors(chapter("Engineers retain responsibility for the system."))
        changed = shape.chapter_prose_anchors(chapter("Representation changes the cost of answering engineering questions."))
        self.assertTrue(first[0].startswith("Engineers retain responsibility"))
        self.assertNotIn("GENERATED", first[0])
        self.assertNotEqual(first[0], changed[0])
        self.assertEqual(first[1], changed[1])

    def test_case_links_preserve_component_scope(self):
        raw = json.loads((ROOT / "book-models/industry_cases_declared.json").read_text())
        for case in raw["industry_cases"]:
            targets = [item["proposition"] for item in case.get("theory_component_scope", [])]
            self.assertEqual(case.get("propositions", []), list(dict.fromkeys(targets)))
            self.assertTrue(all(target in theory.EXPECTED_IDS for target in targets))

if __name__ == "__main__":
    unittest.main()
