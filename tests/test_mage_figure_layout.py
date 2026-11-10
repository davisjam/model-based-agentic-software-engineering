"""Print geometry must not discard semantic figure or pairing inputs."""
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from mage_figure_layout import apply_figure_print_layout


class ClaimsSpreadTests(unittest.TestCase):
    def test_separate_projected_lists_keep_every_word_in_one_list(self):
        from mage_figure_layout import claims_spread
        claims = [f'Claim {n}: a qualification worth preserving.' for n in range(1, 7)]
        lists = '\n\n'.join(r'\begin{enumerate}\tightlist\item ' + claim
                            + r'\end{enumerate}' for claim in claims)
        figure = (r'\begin{figure}[htbp]\includegraphics[page=2,alt={Description}]{pool.pdf}'
                  r'\caption{Relationships.}\label{mage-method}\end{figure}')
        text = claims_spread(r'\chapter*{What This Book Argues}' + lists
                            + '\n\nRecto transition.\n\n' + figure)
        self.assertEqual(text.count(r'\begin{bookclaims}'), 1)
        self.assertNotIn(r'\begin{enumerate}[', text)
        self.assertEqual(len(re.findall(r'\\item\b', text)), 6)
        for claim in claims:
            self.assertEqual(text.count(claim), 1)
        self.assertIn(r'\ifodd\value{page}', text)
        self.assertIn(r'\end{bookclaims}' + '\n\\clearpage\n', text)
        self.assertEqual(text.count(r'\begin{bookinlinefigure}'), 1)
        self.assertIn(r'\includegraphics[page=2,alt={Description}]{pool.pdf}', text)
        self.assertIn('Recto transition.', text)
        self.assertNotIn(r'\small', text)

    def test_refuses_to_discard_intervening_prose(self):
        from mage_figure_layout import claims_spread
        lists = '\n'.join(r'\begin{enumerate}\item Claim\end{enumerate}' for _ in range(6))
        lists = lists.replace('\n', '\nImportant intervening paragraph.\n', 1)
        figure = r'\begin{figure}\caption{A}\label{mage-method}\end{figure}'
        with self.assertRaisesRegex(ValueError, 'intervening content'):
            claims_spread(lists + figure)


class FigurePrintLayoutTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'layout.json'
        self.rule = {'version': 1, 'figures': {
            'compact': {'placement': 'centered', 'width_bp': 300}}}
        self.figure = (r'\begin{figure}[htbp]\centering'
            r'\includegraphics[height=560bp,keepaspectratio,alt={Complete explanation},width=\linewidth]{art.pdf}'
            r'\caption{A {formatted} caption.}\label{compact}\end{figure}')

    def render(self, latex):
        self.path.write_text(json.dumps(self.rule))
        return apply_figure_print_layout(latex, self.path)

    def test_compact_width_preserves_caption_label_alt_and_float(self):
        self.assertEqual(self.render(self.figure),
                         self.figure.replace(r'width=\linewidth', 'width=300bp'))

    def test_unlisted_complex_figure_remains_full_width(self):
        figure = self.figure.replace('{compact}', '{complex}')
        self.assertEqual(self.render(figure), figure)

    def test_does_not_touch_inline_navigation_or_native_pool_graphics(self):
        native = r'\includegraphics[page=3,alt={Native}]{pool.pdf}'
        self.assertEqual(self.render(native), native)

    def test_unsafe_or_unknown_layout_fails(self):
        for width in (100, 451, True, '300bp'):
            with self.subTest(width=width):
                self.rule['figures']['compact']['width_bp'] = width
                with self.assertRaises(ValueError):
                    self.render(self.figure)

    def test_unexpected_original_width_fails_instead_of_hiding_drift(self):
        with self.assertRaises(ValueError):
            self.render(self.figure.replace(r'width=\linewidth', 'width=400bp'))

    def test_legacy_forced_page_boundary_is_rejected(self):
        self.rule['figures']['compact']['flush_after'] = True
        with self.assertRaisesRegex(ValueError, 'cannot force a page boundary'):
            self.render(self.figure)

    def test_float_boundary_requires_an_explicit_boolean(self):
        self.rule['figures']['compact']['flush_after'] = 'yes'
        with self.assertRaisesRegex(ValueError, 'float boundary'):
            self.render(self.figure)



class InsetPlacementPolicyTests(unittest.TestCase):
    def test_explicit_flow_policy_keeps_width_and_label_selection_independent(self):
        from mage_figure_layout import inset_flow_labels
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'layout.json'
            data = {'version': 1, 'figures': {
                'inset-compact': {'placement':'centered','width_bp':270,'inset_placement':'flow'},
                'mainline-compact': {'placement':'centered','width_bp':270}}}
            path.write_text(json.dumps(data))
            self.assertEqual(inset_flow_labels(path), {'inset-compact'})
            data['figures']['inset-compact']['inset_placement'] = 'unknown'
            path.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, 'inset placement'):
                apply_figure_print_layout('', path)



class PrintColumnProjectionTests(unittest.TestCase):
    def test_boundaries_are_typed_inert_markers_in_web_projection(self):
        import book_ir
        import build_book
        from tests.test_native_site_boundaries import lint
        text = ('Before.\n\n<!-- print-columns-start: reasoning-horizon-fig -->\n\n'
                'Preserved body.\n\n<!-- print-columns-end: reasoning-horizon-fig -->\n\nAfter.')
        for name in ['print-columns-start', 'print-columns-end']:
            self.assertIn(name, build_book.MARKER_KEYWORDS)
            self.assertIn(name, lint.RECOGNIZED)
        chapter = book_ir.parse_records([{'slug': 'example', 'part': 1, 'body_md': text}]).chapters[0]
        self.assertEqual([b.directive for b in chapter.blocks if b.kind is book_ir.BlockKind.DIRECTIVE],
                         ['print-columns-start', 'print-columns-end'])
        html = build_book.md_to_html(text)
        self.assertNotIn('print-columns', html)
        for phrase in ['Before.', 'Preserved body.', 'After.']:
            self.assertEqual(html.count(phrase), 1)
        self.assertNotIn('print-colums-start', lint.RECOGNIZED)


class CompactHorizonColumnsTests(unittest.TestCase):
    def fixture(self):
        figure = (r'\begin{figure}[htbp]\centering'
                  r'\includegraphics[page=3,alt={The full alternative text}]{pool.pdf}'
                  r'\caption{A complete caption.}\label{reasoning-horizon-fig}\end{figure}')
        return ('Before.\n% <!-- print-columns-start: reasoning-horizon-fig -->\n'
                'External representations reduce reconstruction.\n\n' + figure +
                '\n\nThe Representation Problem is named here.\n'
                '% <!-- print-columns-end: reasoning-horizon-fig -->\nAfter.')

    def test_side_by_side_preserves_prose_caption_links_and_native_art(self):
        from mage_figure_layout import reasoning_horizon_columns
        result = reasoning_horizon_columns(self.fixture())
        for phrase in ['Before.', 'External representations reduce reconstruction.',
                       'The Representation Problem is named here.', 'After.',
                       r'\caption{A complete caption.}', r'\label{reasoning-horizon-fig}',
                       r'\includegraphics[page=3,alt={The full alternative text}]{pool.pdf}']:
            self.assertEqual(result.count(phrase), 1)
        self.assertIn(r'\begin{minipage}[t]{.48\linewidth}', result)
        self.assertIn(r'\begin{bookinlinefigure}', result)
        self.assertNotIn(r'\small', result)
        self.assertNotIn(r'\clearpage', result)
        self.assertNotIn('print-columns-start', result)

    def test_inset_heading_or_footnote_cannot_be_wrapped(self):
        from mage_figure_layout import reasoning_horizon_columns
        for inserted in (r'\begin{bookbox}{inset}{A}', r'\section{Next}', r'\footnote{Note}'):
            with self.subTest(inserted=inserted), self.assertRaises(ValueError):
                reasoning_horizon_columns(self.fixture().replace('External representations',
                                                                  inserted + ' External representations'))

    def test_missing_boundary_and_unselected_chapters_fail_or_remain_untouched(self):
        from mage_figure_layout import reasoning_horizon_columns
        self.assertEqual(reasoning_horizon_columns('Unrelated prose.'), 'Unrelated prose.')
        with self.assertRaises(ValueError):
            reasoning_horizon_columns(self.fixture().replace('print-columns-end:', 'missing-end:'))


if __name__ == '__main__':
    unittest.main()
