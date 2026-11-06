"""Float introduction checks must see inset contents in reading order."""
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / 'book')]
import book_ir
from tests import book as audit


def quote(text):
    return '\n'.join('> ' + line if line else '>' for line in text.splitlines())


def figure(caption='A diagram.'):
    return '<!-- label: diagram -->\n<!-- figure: assets/example.svg | ' + caption + ' -->'


class FloatReferenceTests(unittest.TestCase):
    def inspect(self, body):
        doc = book_ir.parse_records([{'slug': 'fixture', 'part': 2,
                                     'chapter_title': 'Fixture', 'body_md': body}])
        with patch.object(book_ir, 'parse_book', return_value=doc), \
                patch.object(audit, '_chapter_src_files', return_value=[]):
            findings, stats = audit.check_float_ref()
        return [finding.msg for finding in findings], stats

    def test_inset_intro_and_figure_resolve(self):
        findings, stats = self.inspect(quote('#### Worked case\n\nSee [ref:diagram].\n\n' + figure()))
        self.assertEqual(findings, [])
        self.assertEqual(stats['floats'], 1)
        self.assertEqual(stats['labelled'], 1)

    def test_ref_after_inset_figure_is_not_an_introduction(self):
        findings, _ = self.inspect(quote(figure() + '\n\nSee [ref:diagram].'))
        self.assertEqual(len(findings), 1)
        self.assertIn('at/after the float', findings[0])

    def test_reference_only_in_own_caption_is_not_an_introduction(self):
        findings, _ = self.inspect(quote(figure('See [ref:diagram].')))
        self.assertEqual(len(findings), 1)
        self.assertIn('never introduced', findings[0])

    def test_mainline_reference_can_introduce_nested_figure(self):
        findings, _ = self.inspect('See [ref:diagram].\n\n' + quote(quote(figure())))
        self.assertEqual(findings, [])

    def test_inset_reference_after_mainline_figure_is_still_late(self):
        findings, _ = self.inspect(figure() + '\n\n' + quote('See [ref:diagram].'))
        self.assertEqual(len(findings), 1)
        self.assertIn('at/after the float', findings[0])

    def test_dangling_ref_inside_nested_inset_is_reported_once(self):
        findings, _ = self.inspect(quote(quote('See [ref:missing].')))
        self.assertEqual(len(findings), 1)
        self.assertIn('resolves to no', findings[0])

    def test_labelled_inset_table_is_checked(self):
        table = ('See [ref:cases].\n\n<!-- label: cases -->\n<!-- table: Decision cases. -->\n'
                 '| Case | Decision |\n| --- | --- |\n| Finite | Charge |')
        findings, stats = self.inspect(quote(table))
        self.assertEqual(findings, [])
        self.assertEqual(stats['floats'], 1)
        findings, _ = self.inspect(quote(table.replace('See [ref:cases].\n\n', '')))
        self.assertIn('never introduced', findings[0])

    def test_unlabelled_mainline_float_stays_a_failure(self):
        findings, _ = self.inspect('<!-- figure: assets/example.svg | No label. -->')
        self.assertEqual(len(findings), 1)
        self.assertIn('is not introduced', findings[0])


if __name__ == '__main__':
    unittest.main()
