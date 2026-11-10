"""Shared print styling and strict compiler diagnostic policy."""
import unittest
from pathlib import Path
import re
import tempfile

from latex_build import (diagnostics, bold_table_headers, single_page_tables,
                         namespace_heading_links, restore_chapter_heading_links)


class NativeMathRoundTrip(unittest.TestCase):
    def test_multiline_native_equation_reaches_web_mathml(self):
        import mage_latex
        import xml.etree.ElementTree as ET
        equation = (r'p_i=p(T_i,M,\mathcal{G}_i),' + '\n' +
                    r'\qquad \mathcal{G}_{i+1}=f(\mathcal{G}_i,a_i).')
        with tempfile.TemporaryDirectory(dir=mage_latex.ROOT) as directory:
            source, projection = [Path(directory, name) for name in
                                  ('source.tex', 'projection.md')]
            source.write_text(r'\chapter{Math regression}' + '\n\nBefore.\n\n\\[\n' +
                              equation + '\n\\]\n\nAfter.')
            source.with_suffix('.assets.json').write_text('[]')
            mage_latex.compatibility(source, projection)
            html = mage_latex.bb.md_to_html(projection.read_text())
        maths = re.findall(r'<math\b.*?</math>', html, re.S)
        self.assertEqual(len(maths), 1)
        self.assertEqual(''.join(ET.fromstring(maths[0]).itertext()),
                         'pi=p(Ti,M,Gi),Gi+1=f(Gi,ai).')
        self.assertIn('display="block"', maths[0])
        self.assertIn('Before.', html)
        self.assertIn('After.', html)

    def test_multiline_display_equations_survive_print_assembly(self):
        import mage_latex
        equations = [
            r'\rho=P(\lnot S\mid B)' + '\n' + r'=\frac{(1-s)q}{s(1-r)+(1-s)q}.',
            r'C_N=C_{\text{build}}+\sum_{i=1}^{N}(C_{\text{run},i}+C_{\text{carry},i}),' +
            '\n' + r'\qquad c_N=\frac{C_N}{D_N}.',
        ]
        with tempfile.TemporaryDirectory(dir=mage_latex.ROOT) as directory:
            source, projection, output = [Path(directory, name) for name in
                                          ('source.tex', 'projection.md', 'print.tex')]
            source.write_text(r'\chapter{Math regression}' + '\n\n' +
                              '\n\n'.join('Before.\n\n\\[\n' + eq +
                                          '\n\\]\n\nAfter.' for eq in equations))
            source.with_suffix('.assets.json').write_text('[]')
            mage_latex.compatibility(source, projection)
            mage_latex.migrate(projection, output, driver_enabled=False)
            emitted = re.findall(r'\\\[(.*?)\\\]', output.read_text(), re.S)
            self.assertEqual([' '.join(eq.split()) for eq in emitted],
                             [' '.join(eq.split()) for eq in equations])
            self.assertEqual(output.read_text().count('Before.'), 2)
            self.assertEqual(output.read_text().count('After.'), 2)


class HeadingLinks(unittest.TestCase):
    def test_repeated_headings_link_to_their_own_chapter(self):
        source = (r'\subsection{Summary}\label{heading:summary}' '\n'
                  r'\hyperref[summary]{Summary} \hyperref[heading:summary]{Again} '
                  r'\hyperref[figure-example]{Figure}')
        for slug in ('chapter-a', 'chapter-b'):
            output = namespace_heading_links(source, slug)
            self.assertIn(r'\label{' + slug + ':heading:summary}', output)
            self.assertEqual(output.count(r'\hyperref[' + slug + ':heading:summary]'), 2)
            self.assertIn(r'\hyperref[figure-example]{Figure}', output)

    def test_cross_chapter_heading_round_trip_is_internal_in_print(self):
        import mage_latex
        native = (r'\chapter{Summary}' '\n' +
                  r'Read \hyperref[chapter-a:heading:assurance]{\emph{Assurance}}.')
        with tempfile.TemporaryDirectory(dir=mage_latex.ROOT) as directory:
            source, projection, output = [Path(directory, name) for name in
                                          ('source.tex', 'projection.md', 'print.tex')]
            source.write_text(native)
            source.with_suffix('.assets.json').write_text('[]')
            mage_latex.compatibility(source, projection)
            self.assertIn('(chapter-a.html#assurance)', projection.read_text())
            mage_latex.migrate(projection, output, driver_enabled=False)
            restored = restore_chapter_heading_links(output.read_text(),
                {'chapter-a.html#assurance': 'chapter-a:heading:assurance'})
            self.assertIn(r'\hyperref[chapter-a:heading:assurance]{\emph{Assurance}}', restored)
            self.assertNotIn(r'\href{chapter-a.html', restored)

    def test_only_known_chapter_headings_become_internal_links(self):
        native = (r'\href{chapter-a.html\#assurance}{Known} '
                  r'\href{chapter-a.html\#figure-a}{Figure} '
                  r'\href{missing.html\#assurance}{Missing} '
                  r'\href{https://example.com/chapter-a.html\#assurance}{External}')
        restored = restore_chapter_heading_links(native,
            {'chapter-a.html#assurance': 'chapter-a:heading:assurance'})
        self.assertIn(r'\hyperref[chapter-a:heading:assurance]{Known}', restored)
        for target in ('chapter-a.html\\#figure-a', 'missing.html\\#assurance',
                       'https://example.com/chapter-a.html\\#assurance'):
            self.assertIn(r'\href{' + target + '}', restored)


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


class TableHeaderStyle(unittest.TestCase):
    def test_single_page_comparison_preserves_caption_rows_and_rules(self):
        source = r"""\begin{longtable}[]{ll}
\caption[Short]{Caption}\label{comparison}\tabularnewline
\hline
Kind & Meaning \\
\hline
\endfirsthead
\hline
Kind & Meaning \\
\hline
\endhead
\hline
\endlastfoot
First & Example \\
Second & Another \\
\end{longtable}"""
        for options, placement in [({}, 'p'), ({'placement': '!htbp'}, '!htbp'),
                                   ({'placement': '!htbp', 'start_on_new_page': True}, '!htbp')]:
            with self.subTest(placement=placement):
                result = single_page_tables(source, {'comparison'}, **options)
                self.assertEqual(result.count('Kind & Meaning'), 1)
                self.assertEqual(result.count(r'\hline'), 3)
                self.assertIn(r'\caption[Short]{Caption}\label{comparison}', result)
                self.assertLess(result.index(r'\caption'), result.index(r'\begin{tabular}'))
                self.assertIn(r'First & Example \\', result)
                self.assertIn(r'Second & Another \\', result)
                self.assertIn(r'\begin{table}[' + placement + ']', result)
                self.assertNotIn('longtable', result)
                self.assertEqual(result.startswith(r'\clearpage'),
                                 options.get('start_on_new_page', False))
        self.assertEqual(single_page_tables(source, {'different'}), source)

    def test_compact_headers_repeat_without_bolding_body_or_caption(self):
        source = r"""\begin{longtable}[]{ll}
\caption{A caption}\tabularnewline
\toprule\noalign{}
Kind & Meaning \\
\midrule\noalign{}
\endfirsthead
\toprule\noalign{}
Kind & Meaning \\
\midrule\noalign{}
\endhead
First & Ordinary body \\
\end{longtable}"""
        styled = bold_table_headers(source)
        self.assertEqual(styled.count(r"{\bfseries Kind}"), 2)
        self.assertEqual(styled.count(r"{\bfseries Meaning}"), 2)
        self.assertIn(r"\caption{A caption}", styled)
        self.assertIn(r"First & Ordinary body", styled)
        self.assertEqual(bold_table_headers(styled), styled)

    def test_paragraph_header_font_is_local_to_minipage(self):
        source = r"""\begin{longtable}[]{p{5cm}}
\toprule
\begin{minipage}[b]{\linewidth}\raggedright
Heading
\end{minipage} \\
\midrule
\endhead
Body \\
\end{longtable}"""
        styled = bold_table_headers(source)
        self.assertIn(r"\raggedright\bfseries", styled)
        self.assertEqual(styled.split(r"\endhead")[1], source.split(r"\endhead")[1])
        self.assertEqual(bold_table_headers(styled), styled)


class SelectedTableLayoutTests(unittest.TestCase):
    def setUp(self):
        self.table = r'''\begin{longtable}{p{\real{0.5000}}p{\real{0.5000}}}
\caption{The complete caption.}\label{obligations}\tabularnewline
Heading A & Heading B \\
\endfirsthead
Heading A & Heading B \\
\endhead
\endlastfoot
Preservation & Retain the original content. \\
Accountability & Record evidence for every change. \\
\end{longtable}'''

    def test_content_and_headers_survive_unequal_columns_and_body_row_gaps(self):
        from latex_build import layout_selected_table
        result = layout_selected_table(self.table, 'obligations', (.28, .72))
        self.assertIn(r'\real{0.2800}', result)
        self.assertIn(r'\real{0.7200}', result)
        self.assertEqual(result.count(r'\\[4bp]'), 2)
        self.assertIn('Heading A & Heading B ' + r'\\' + '\n', result)
        for content in ['The complete caption.', 'Retain the original content.',
                        'Record evidence for every change.', r'\label{obligations}']:
            self.assertEqual(result.count(content), 1)
        self.assertIn(r'\renewcommand{\arraystretch}{1.2}', result)

    def test_unselected_tables_stay_byte_identical_and_drift_is_rejected(self):
        from latex_build import layout_selected_table
        self.assertEqual(layout_selected_table(self.table, 'another', (.28, .72)), self.table)
        with self.assertRaises(ValueError):
            layout_selected_table(self.table, 'obligations', (.2, .3, .5))
        with self.assertRaises(ValueError):
            layout_selected_table(self.table, 'obligations', (.5, .7))


if __name__ == "__main__":
    unittest.main()
