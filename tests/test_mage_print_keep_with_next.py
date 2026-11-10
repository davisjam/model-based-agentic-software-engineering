import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from mage_latex import apply_print_keep_with_next


class PrintKeepWithNextTests(unittest.TestCase):
    def test_unmarked_prose_is_unchanged(self):
        source = 'An ordinary paragraph.\n\n\\begin{enumerate}\\item One.\\end{enumerate}'
        self.assertEqual(apply_print_keep_with_next(source), source)

    def test_local_marker_reserves_space_without_changing_words(self):
        source = '% <!-- print-keep-with-next: 8 -->\n\nA lead-in:\n\n\\begin{enumerate}\\item One.\\end{enumerate}'
        actual = apply_print_keep_with_next(source)
        self.assertEqual(actual, source.replace('% <!-- print-keep-with-next: 8 -->', r'\Needspace{8\baselineskip}'))
        self.assertEqual(apply_print_keep_with_next(actual), actual)

    def test_invalid_space_request_is_rejected(self):
        for value in ['0', '1', '21', '-1', 'eight', '8pt']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                apply_print_keep_with_next('% <!-- print-keep-with-next: '+value+' -->')

    def test_page_inset_accepts_projected_metadata_without_losing_prose(self):
        box = ('% mage-box-prefix: Inset —\n\n'
               '\\begin{bookbox}{inset}{Authority}\n'
               '\\label{inset-authority}\nEvidence and responsibility.\n'
               '\\end{bookbox}')
        source = 'Before.\n\n% <!-- print-keep-with-next: page -->\n\n' + box + '\n\nAfter.'
        actual = apply_print_keep_with_next(source)
        self.assertNotIn('<!-- print-keep-with-next:', actual)
        self.assertIn(box, actual)
        self.assertEqual(actual, source.replace('% <!-- print-keep-with-next: page -->',
                                                r'\Needspace{\textheight}'))
        self.assertNotIn(r'\afterpage', actual)

    def test_literal_examples_are_unchanged(self):
        for environment in ['verbatim', 'Verbatim', 'lstlisting', 'minted']:
            source = '\\begin{'+environment+'}\n% <!-- print-keep-with-next: 8 -->\n\\end{'+environment+'}'
            self.assertEqual(apply_print_keep_with_next(source), source)


if __name__ == '__main__':
    unittest.main()
