"""Canonical principle statements survive copyedits, but cannot disappear behind metadata."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tests import book_models


class CanonPinTests(unittest.TestCase):
    point = "the-modeling-principle-in-its-weakest-form"
    marker = f"<!-- point: {point} | The Modeling Principle. | terms: modeling-principle -->"
    statement = ("**The Modeling Principle:** externalize engineering knowledge into explicit models. "
                 "In practice, give recurring questions purposeful representations.")

    def present(self, text, path="part2/2.1-modeling.md"):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory, "book", path)
            source.parent.mkdir(parents=True)
            source.write_text(text, encoding="utf-8")
            with patch.object(book_models, "ROOT", directory):
                return book_models._principle_stated_in_body("part2", "Modeling", self.point)

    def test_copyedited_transition_and_intervening_index_metadata(self):
        for transition in ("In practice,", "In other words,", "For example,", ""):
            with self.subTest(transition=transition):
                text = self.statement.replace("In practice,", transition)
                self.assertTrue(self.present(self.marker + "\n\n<!-- index-def: modeling-principle -->\n\n" + text))

    def test_legacy_name_and_punctuation(self):
        self.assertTrue(self.present(self.marker + "\n\n" + self.statement.replace("Principle:", "Thesis.")))

    def test_missing_anchor_or_wrong_principle(self):
        self.assertFalse(self.present(self.statement))
        self.assertFalse(self.present(self.marker + "\n\n" + self.statement.replace("Modeling", "Alignment")))

    def test_metadata_alone_does_not_count(self):
        self.assertFalse(self.present(self.marker))
        self.assertFalse(self.present(self.marker + "\n\n<!-- " + self.statement + " -->"))
        self.assertFalse(self.present(self.marker + "\n\n**The Modeling Principle:** <!-- definition removed -->"))

    def test_bare_label_does_not_count(self):
        self.assertFalse(self.present(self.marker + "\n\n**The Modeling Principle:**"))

    def test_code_quotes_and_headings_do_not_count(self):
        for text in ("```text\n" + self.marker + "\n\n" + self.statement + "\n```",
                     self.marker + "\n\n```text\n" + self.statement + "\n```",
                     self.marker + "\n\n> " + self.statement,
                     self.marker + "\n\n## " + self.statement):
            with self.subTest(text=text):
                self.assertFalse(self.present(text))

    def test_does_not_borrow_statement_from_another_point_or_section(self):
        for gap in ("<!-- point: another-point | An unrelated point. -->",
                    "## Another section", "Unrelated prose."):
            with self.subTest(gap=gap):
                self.assertFalse(self.present(self.marker + "\n\n" + gap + "\n\n" + self.statement))

    def test_opener_or_wrong_part_is_insufficient(self):
        for path in ("part2/00-part-intro.md", "part3/3.1-modeling.md"):
            with self.subTest(path=path):
                self.assertFalse(self.present(self.marker + "\n\n" + self.statement, path))

    def test_gate_retains_missing_statement_detection(self):
        for missing in ("Modeling", "Alignment"):
            with self.subTest(missing=missing):
                def present(part, name, point):
                    return name != missing
                with patch.object(book_models, "_principle_stated_in_body", side_effect=present):
                    status, issues = book_models.check_canon_pins()
                self.assertEqual(status, book_models.FAIL)
                self.assertTrue(any(f"{missing} Principle statement is missing" in issue for issue in issues))


if __name__ == "__main__":
    unittest.main()
