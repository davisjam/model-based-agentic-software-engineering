"""The warning policy must reject damaged output, without rejecting log metadata."""
import unittest

from latex_build import diagnostics


class DiagnosticPolicy(unittest.TestCase):
    def test_missing_glyph_is_fatal(self):
        self.assertTrue(diagnostics("Missing character: There is no ∞ in font Test!")[0])

    def test_overfull_box_is_fatal(self):
        self.assertTrue(diagnostics(r"Overfull \hbox (4.0pt too wide) in paragraph at lines 2--3")[0])

    def test_underfull_boxes_are_the_only_allowlist(self):
        rejected, allowed = diagnostics(
            "Underfull \\hbox (badness 10000) in paragraph at lines 2--3\n"
            "Underfull \\vbox (badness 10000) has occurred while \\output is active")
        self.assertEqual(rejected, [])
        self.assertEqual(len(allowed), 2)

    def test_warnings_are_fatal_including_new_packages(self):
        for line in ["LaTeX Warning: There were undefined references.",
                     "LaTeX Font Warning: Font shape unavailable.",
                     "Package natbib Warning: Citation `missing' undefined.",
                     "Package unfamiliar Warning: Unknown option.",
                     "Class book Warning: Something unexpected.",
                     "warning: PDF object invalid"]:
            with self.subTest(line=line):
                self.assertTrue(diagnostics(line)[0])

    def test_info_is_not_warning(self):
        self.assertEqual(diagnostics(
            "Package: infwarerr 2019/12/03 v1.5 Providing info/warning/error messages (HO)\n"
            "Package microtype Info: Character protrusion enabled."), ([], []))


if __name__ == "__main__":
    unittest.main()
