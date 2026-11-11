"""Regression cases for the manuscript's approved citation punctuation and publication scope."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tests.citations import (check_cite_placement, cite_placement_lines,
                             check_cite_spacing, native_cite_spacing_matches)
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

    def test_nonbreaking_space_keeps_punctuation_check_effective(self):
        self.assertEqual(cite_placement_lines('Evidence.\u00a0[cite:a]'), [1])

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


class NativeCiteSpacingTests(unittest.TestCase):
    def test_glued_ordinary_and_linebreak_separators_are_reported(self):
        text = 'Evidence\\citep{a}. Evidence \\citep{b}. Evidence\n\\citet{c}.'
        self.assertEqual(len(native_cite_spacing_matches(text)), 3)

    def test_nonbreaking_groups_and_optional_arguments(self):
        self.assertEqual(native_cite_spacing_matches(
            r'Evidence~\citep{a}~\citep[see][p. 4]{b}. Named~\citet*{c}.'), [])
        self.assertEqual(len(native_cite_spacing_matches(
            r'Evidence\citep[see][p. 4]{a}\citep{b}.')), 2)

    def test_comments_and_literal_code_are_exempt_with_offsets_preserved(self):
        text = ('% Example\\citep{ignored}\n'
                '\\begin{verbatim}\nExample\\citep{ignored}\n\\end{verbatim}\n'
                '\\verb|Example\\citep{ignored}|\nEvidence\\citep{real}.')
        matches = native_cite_spacing_matches(text)
        self.assertEqual(len(matches), 1)
        self.assertTrue(text[matches[0].start('citation'):].startswith('\\citep{real}'))
        self.assertEqual(text.count('\n', 0, matches[0].start('citation')) + 1, 6)

    def test_paragraph_initial_citation_needs_no_preceding_separator(self):
        self.assertEqual(native_cite_spacing_matches('\\citet{a} reports.\n\n\\citet{b} reports.'), [])

    def test_publication_scope_and_missing_native_mapping(self):
        import json
        with tempfile.TemporaryDirectory() as directory:
            active = Path(directory) / 'active.md'
            native = Path(directory) / 'active.tex'
            archive = Path(directory) / 'archive.tex'
            manifest = Path(directory) / 'manifest.json'
            active.write_text('Evidence [cite:a].')
            native.write_text(r'Evidence~\citep{a}.')
            archive.write_text(r'Historical\citep{a}.')
            manifest.write_text(json.dumps({'sources': [
                {'source': str(native), 'projection': str(active)}]}))
            with patch.object(mage_latex, 'MANIFEST', manifest), \
                 patch.object(mage_latex, 'author_sources', return_value=[active]):
                self.assertEqual(check_cite_spacing(), (PASS, []))
                native.write_text(r'Evidence\citep{a}.')
                status, issues = check_cite_spacing()
                self.assertEqual(status, FAIL)
                self.assertEqual(len(issues), 1)
                self.assertIn('active.tex:1:', issues[0])
                manifest.write_text('{"sources": []}')
                self.assertEqual(check_cite_spacing()[0], FAIL)
                manifest.write_text('invalid')
                self.assertEqual(check_cite_spacing()[0], FAIL)


if __name__ == '__main__':
    unittest.main()
