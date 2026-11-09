import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from mage_inset_print import isolate_inset_figures, _environments

FIGURE = r'''\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth,height=560bp,keepaspectratio,alt={diagram}]{drawing.pdf}
\caption[Short]{A caption with \emph{formatting}.}\label{drawing}
\end{figure}'''


def inset(content, title='A title with \\emph{formatting}'):
    return r'\begin{bookbox}{inset}{' + title + '}\n' + content + '\n' + r'\end{bookbox}'


class InsetPrintTests(unittest.TestCase):
    def test_mainline_unchanged(self):
        text = 'Mainline\n' + FIGURE + '\n' + inset('No figures here.')
        self.assertEqual(text, isolate_inset_figures(text))

    def test_lifts_only_float_preserves_artwork_caption_label_and_inset_anchor(self):
        text = inset(r'\label{case} An introduction.' + '\n' + FIGURE + '\nA conclusion.')
        actual = isolate_inset_figures(text)
        self.assertIn(r'\begin{figure}[htbp]', actual)
        self.assertIn(r'\caption[Short]{A caption with \emph{formatting}.}\label{drawing}', actual)
        self.assertEqual(actual.count(r'\label{case}'), 1)
        self.assertIn(r'\begin{bookinsetfigure}{inset}{A title with \emph{formatting}}', actual)
        self.assertIn(r'\begin{bookbox}{inset}{A title with \emph{formatting} (continued)}', actual)
        for env in _environments(actual):
            if env.name == 'figure':
                self.assertIsNone(env.parent)
        self.assertEqual(actual, isolate_inset_figures(actual))

    def test_wide_fallback_artwork_uses_outer_panel_width_without_scaling(self):
        figure = FIGURE.replace(r'width=\linewidth', 'width=450bp')
        actual = isolate_inset_figures(inset(figure))
        self.assertIn(r'\makebox[\linewidth][c]{\includegraphics[width=450bp', actual)
        self.assertNotIn(r'\resizebox', actual)

    def test_adjacent_figures_do_not_create_empty_continuation(self):
        actual = isolate_inset_figures(inset('Introduction.\n' + FIGURE + '\n% annotation\n' + FIGURE))
        self.assertEqual(actual.count(r'\begin{bookinsetfigure}'), 2)
        self.assertEqual(actual.count(r'\begin{bookbox}'), 1)
        self.assertIn('% annotation', actual)

    def test_intervening_prose_gets_one_continuation(self):
        actual = isolate_inset_figures(inset('Introduction.\n' + FIGURE + '\nA comparison.\n' + FIGURE))
        self.assertEqual(actual.count(r'\begin{bookinsetfigure}'), 2)
        self.assertEqual(actual.count(r'\begin{bookbox}'), 2)
        self.assertEqual(actual.count('A comparison.'), 1)

    def test_comments_and_literal_code_are_not_figures(self):
        text = inset('% ' + FIGURE.replace('\n', '\n% ') + '\n'
                     + r'\begin{verbatim}' + '\n' + FIGURE + '\n' + r'\end{verbatim}'
                     + '\n' + r'\verb|\begin{figure}|' + '\n' + r'\% ordinary escaped percent')
        self.assertEqual(text, isolate_inset_figures(text))

    def test_closed_nested_prose_environment_is_safe(self):
        text = inset(r'\begin{quote}A model card.\end{quote}' + '\n' + FIGURE)
        actual = isolate_inset_figures(text)
        self.assertIn(r'\begin{quote}A model card.\end{quote}', actual)
        self.assertIn(r'\begin{bookinsetfigure}', actual)

    def test_nested_float_is_rejected_before_invalid_tex_is_emitted(self):
        with self.assertRaisesRegex(ValueError, 'direct child'):
            isolate_inset_figures(inset(r'\begin{quote}' + FIGURE + r'\end{quote}'))
        with self.assertRaisesRegex(ValueError, 'direct child'):
            isolate_inset_figures(inset(inset(FIGURE)))

    def test_missing_boundary_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Unclosed'):
            isolate_inset_figures(r'\begin{bookbox}{inset}{Title}' + FIGURE)


    def test_ordinary_floats_leave_following_prose_available(self):
        actual = isolate_inset_figures(inset('Introduction.\n' + FIGURE + '\nProse that fills the current page.'))
        self.assertIn(r'\begin{bookinsetfigure}', actual)
        self.assertNotIn(r'\clearpage', actual)
        self.assertEqual(actual.count('Prose that fills the current page.'), 1)
        self.assertLess(actual.index(r'\end{figure}'), actual.index('Prose that fills the current page.'))


    def test_separate_insets_keep_their_identity_without_a_page_queue(self):
        first = inset('Intro.\n' + FIGURE + '\nA short bridge.\n' + FIGURE, title='First case')
        second = inset('Another intro.\n' + FIGURE, title='Second case')
        actual = isolate_inset_figures(first + '\n' + second)
        self.assertEqual(actual.count(r'\begin{bookinsetfigure}{inset}{First case}'), 2)
        self.assertEqual(actual.count(r'\begin{bookinsetfigure}{inset}{Second case}'), 1)
        for token in (r'\clearpage', r'\newpage', r'\bookinsetfigurepagesdefer', r'\begin{figure}[p]'):
            self.assertNotIn(token, actual)




class CompactInsetPrintTests(unittest.TestCase):
    def test_reviewed_compact_figure_flows_with_fitted_inset_identity(self):
        source = inset(r'\label{inset-case} Introduction.\n' + FIGURE + '\nThe following analysis.')
        actual = isolate_inset_figures(source, flow_labels={'drawing'})
        self.assertNotIn(r'\bookinsetfigurepagesdefer', actual)
        self.assertNotIn(r'\begin{figure}[p]', actual)
        self.assertIn(r'\begin{figure}[htbp]', actual)
        self.assertIn(r'\begin{bookinsetfigure}{inset}{A title with \emph{formatting}}', actual)
        self.assertEqual(actual.count(r'\label{inset-case}'), 1)
        self.assertEqual(actual.count(r'\caption[Short]'), 1)
        self.assertIn(r'alt={diagram}', actual)
        self.assertEqual(actual.count('The following analysis.'), 1)
        self.assertEqual(actual, isolate_inset_figures(actual, flow_labels={'drawing'}))
        for environment in _environments(actual):
            if environment.name == 'figure':
                self.assertIsNone(environment.parent)

    def test_adjacent_compact_figures_each_keep_panel_without_empty_prose_box(self):
        actual = isolate_inset_figures(inset('Introduction.\n' + FIGURE + '\n' + FIGURE),
                                       flow_labels={'drawing'})
        self.assertEqual(actual.count(r'\begin{bookinsetfigure}'), 2)
        self.assertEqual(actual.count(r'\begin{bookbox}'), 1)
        self.assertEqual(actual.count(r'\caption[Short]'), 2)

    def test_unreviewed_inset_keeps_existing_placement(self):
        source = inset('Introduction.\n' + FIGURE)
        self.assertEqual(isolate_inset_figures(source),
                         isolate_inset_figures(source, flow_labels={'unrelated'}))

    def test_partial_inset_declaration_cannot_reorder_numbered_figures(self):
        other = FIGURE.replace(r'\label{drawing}', r'\label{other}')
        with self.assertRaisesRegex(ValueError, 'every figure'):
            isolate_inset_figures(inset(FIGURE + '\nA bridge.\n' + other),
                                  flow_labels={'drawing'})


if __name__ == '__main__':
    unittest.main()
