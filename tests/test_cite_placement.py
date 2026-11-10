"""Regression cases for the manuscript's approved citation punctuation and publication scope."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tests.citations import check_cite_placement, cite_placement_lines
from tests.common import FAIL, PASS
import mage_latex
from tests.citations import bb


class CitePlacementTests(unittest.TestCase):
    def test_citations_before_terminal_punctuation(self):
        self.assertEqual(cite_placement_lines(
            'Evidence[cite:a]. Evidence [cite:b][cite:c]! "A quotation"[cite:d]?'), [])

    def test_citations_after_terminal_punctuation(self):
        self.assertEqual(cite_placement_lines(
            'Evidence.[cite:a]\nEvidence! [cite:b]\nEvidence?[cite:c]'), [1, 2, 3])

    def test_quoted_terminal_punctuation_and_citation_group(self):
        self.assertEqual(cite_placement_lines('“A quotation.”[cite:a][cite:b]'), [1])

    def test_internal_punctuation_is_not_a_sentence_boundary(self):
        self.assertEqual(cite_placement_lines(
            'Examples:[cite:a] one;[cite:b] two,[cite:c] and three.'), [])

    def test_author_abbreviation_keeps_its_period(self):
        self.assertEqual(cite_placement_lines('Butler et al.[cite:a]. Their result.[cite:b]'), [1])

    def test_code_fence_is_exempt_without_losing_line_numbers(self):
        self.assertEqual(cite_placement_lines(
            '```text\nExample.[cite:a]\n```\nEvidence.[cite:b]'), [4])

    def test_only_active_publication_sources_are_checked(self):
        with tempfile.TemporaryDirectory() as directory:
            active = Path(directory) / 'appendix.md'
            archived = Path(directory) / 'cutting-room-floor.md'
            active.write_text('Evidence[cite:a].')
            archived.write_text('Historical punctuation.[cite:a]')
            with patch.object(mage_latex, 'author_sources', return_value=[active]):
                self.assertEqual(check_cite_placement(), (PASS, []))
                active.write_text('Evidence.[cite:a]')
                status, issues = check_cite_placement()
                self.assertEqual(status, FAIL)
                self.assertEqual(len(issues), 1)
                self.assertIn('appendix.md:1:', issues[0])

    def test_web_punctuation_and_group_stay_before_note_cards(self):
        source = 'Evidence[cite:first][cite:second]. Another claim[cite:first].'
        with patch.dict(bb._CITATIONS, {
            'first': {'note_html': 'First reference'},
            'second': {'note_html': 'Second reference'},
        }, clear=True), patch.dict(bb._CITE_STATE, {}, clear=True):
            bb._number_citations('test', source)
            result = bb.inline(source)
        first_card = result.index('<span class="cite-note">')
        self.assertEqual(result[:first_card].count('<sup class="cite-ref">'), 2)
        self.assertTrue(result[:first_card].endswith('</sup>.'))
        self.assertEqual(result.count('<span class="cite-note">'), 2)
        self.assertEqual(result.count('<sup class="cite-ref">'), 3)
        self.assertTrue(result.endswith('</sup>.'))


if __name__ == '__main__':
    unittest.main()
