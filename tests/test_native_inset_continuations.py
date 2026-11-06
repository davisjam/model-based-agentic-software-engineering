import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'book'))
from check_native_insets import title_findings


class ContinuationTests(unittest.TestCase):
    def test_continuations_share_one_logical_identity(self):
        self.assertEqual(title_findings(['A case', 'A case (continued)'], [
            'INSET A case\nOpening.',
            'INSET A case (continued)\nFigure.\nINSET A case (continued)\nMore prose.'
        ]), [])

    def test_two_different_insets_on_one_page_fail(self):
        findings = title_findings(['First case', 'Second case'], [
            'INSET First case\nText.\nINSET Second case\nText.'
        ])
        self.assertTrue(any('page 1 opens 2 insets' in value for value in findings))

    def test_continuation_and_one_new_opening_preserve_original_density_rule(self):
        findings = title_findings(['First case', 'Second case', 'First case (continued)'], [
            'INSET First case',
            'INSET First case (continued)\nText.\nINSET Second case'
        ])
        self.assertEqual(findings, [])

    def test_running_continuation_does_not_satisfy_missing_opening(self):
        findings = title_findings(['A case'], ['INSET A case (continued)'])
        self.assertTrue(any('expected 1 opening title(s), found 0' in value for value in findings))

    def test_duplicate_original_opening_still_fails(self):
        findings = title_findings(['A case'], ['INSET A case\nINSET A case'])
        self.assertTrue(any('page 1 opens 2 insets' in value for value in findings))
        self.assertTrue(any('expected 1 opening title(s), found 2' in value for value in findings))

    def test_prefix_titles_not_double_counted(self):
        self.assertEqual(title_findings(['A case', 'A case with context'], [
            'INSET A case', 'INSET A case with context',
            'INSET A case with context (continued)\nMore prose.'
        ]), [])

    def test_orphan_continuation_is_rejected(self):
        findings = title_findings(['A case (continued)'], ['INSET A case (continued)'])
        self.assertTrue(any('no original inset' in value for value in findings))


    def test_continuation_does_not_excuse_two_new_openings(self):
        findings = title_findings(['A case', 'Second case', 'Third case'], [
            'INSET A case',
            'INSET A case (continued)\nINSET Second case\nINSET Third case'
        ])
        self.assertTrue(any('page 2 opens 2 insets' in value for value in findings))


    def test_empty_decorated_page_from_two_deferred_system_knowledge_groups_fails(self):
        title = 'Worked example — Connecting the views of a document service'
        findings = title_findings([title], [
            'INSET ' + title + '\nOpening prose.',
            'INSET ' + title + ' (continued)\n45\n'
        ])
        self.assertTrue(any('page 2 contains only an inset continuation heading' in value
                            for value in findings))

    def test_continuation_with_figure_caption_is_not_empty(self):
        self.assertEqual(title_findings(['A case'], [
            'INSET A case\nOpening prose.',
            'INSET A case (continued)\nFigure 2.18: Attribution provenance model.\n45'
        ]), [])


if __name__ == '__main__':
    unittest.main()
