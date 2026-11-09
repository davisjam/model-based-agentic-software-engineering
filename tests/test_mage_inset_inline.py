"""Inline inset layout keeps source ordering and explicit publication approval."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from mage_inset_print import isolate_inset_figures, _environments
from mage_figure_layout import apply_figure_print_layout, inset_inline_labels
from test_mage_inset_print import FIGURE, inset
from test_mage_inset_publication import InsetPublicationTests


class InlineInsetTests(unittest.TestCase):
    def test_keeps_one_box_with_intervening_prose_and_all_semantics(self):
        second = FIGURE.replace('drawing}', 'second}')
        source = inset(r'\label{case} Intro.' + FIGURE + '\nBridge.\n' + second + '\nInterpretation.')
        result = isolate_inset_figures(source, inline_labels={'drawing', 'second'})
        self.assertEqual(result.count(r'\begin{bookbox}'), 1)
        self.assertEqual(result.count(r'\begin{bookinlinefigure}'), 2)
        self.assertNotIn('continued', result)
        self.assertNotIn('pagesdefer', result)
        self.assertEqual(result.count('Bridge.'), 1)
        self.assertEqual(result.count(r'\caption[Short]{A caption with \emph{formatting}.}'), 2)
        self.assertEqual(result.count('alt={diagram}'), 2)
        self.assertLess(result.index(r'\label{drawing}'), result.index('Bridge.'))
        self.assertLess(result.index('Bridge.'), result.index(r'\label{second}'))
        self.assertEqual(result, isolate_inset_figures(result, inline_labels={'drawing', 'second'}))
        for env in _environments(result):
            if env.name == 'bookinlinefigure':
                self.assertEqual(env.parent.name, 'bookbox')

    def test_partial_and_overlapping_modes_fail_before_counter_reordering(self):
        source = inset(FIGURE + FIGURE.replace('drawing}', 'second}'))
        with self.assertRaisesRegex(ValueError, 'every figure'):
            isolate_inset_figures(source, inline_labels={'drawing'})
        with self.assertRaisesRegex(ValueError, 'both flow and inline'):
            isolate_inset_figures(source, inline_labels={'drawing'}, flow_labels={'drawing'})
        with self.assertRaisesRegex(ValueError, 'direct child'):
            isolate_inset_figures(inset(r'\begin{quote}' + FIGURE + r'\end{quote}'), inline_labels={'drawing'})

    def test_unselected_mainline_and_insets_keep_current_policy(self):
        source = FIGURE + inset(FIGURE)
        self.assertEqual(isolate_inset_figures(source), isolate_inset_figures(source, inline_labels={'unrelated'}))

    def test_registry_selects_inline_and_rejects_forced_break(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'layout.json'
            data = {'version':1,'figures':{'drawing':{'placement':'centered','width_bp':250,'inset_placement':'inline'}}}
            path.write_text(json.dumps(data))
            self.assertEqual(inset_inline_labels(path), {'drawing'})
            self.assertIn('width=250bp', apply_figure_print_layout(FIGURE, path))
            data['figures']['drawing']['flush_after'] = True
            path.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, 'cannot force'):
                apply_figure_print_layout(FIGURE, path)


class InlinePublicationTests(InsetPublicationTests):
    # Reuse the isolated publication fixture, not the flow-only tests.
    test_fullbook_pair_preserves_panel_caption_number_alt_and_native_size = None
    test_approved_native_replacement_keeps_one_numbered_panel = None
    test_mainline_pair_does_not_gain_inset_decoration = None

    def setUp(self):
        super().setUp()
        figure = self.figure.replace(r'\begin{bookinsetfigure}{inset}{A \emph{formatted} title}', '').replace(r'\end{bookinsetfigure}', '')
        self.figure = inset('Introduction.\n' + figure + '\nFollowing interpretation.', title='Worked example')
        self.figure = isolate_inset_figures(self.figure, inline_labels={'stable-figure'})

    def test_unapproved_native_stays_inline_and_unscaled_inside_same_box(self):
        result = self.publish()
        self.assertEqual(result.count(r'\begin{bookbox}'), 1)
        self.assertEqual(result.count(r'\begin{bookinlinefigure}'), 2)
        self.assertNotIn(r'\begin{figure}', result)
        self.assertLess(result.index('Black-and-white version'), result.index('Following interpretation.'))
        self.assertIn(r'\includegraphics[page=3,alt={Native diagram meaning.}]{pool.pdf}', result)
        self.assertEqual(result.count(r'\label{stable-figure}'), 1)
        self.assertEqual(result.count(r'\caption[Short]'), 1)

    def test_approved_replacement_keeps_one_inline_caption(self):
        self.policy['approved_monochrome'] = {self.source:{'approved_date':'2026-11-09'}}
        result = self.publish()
        self.assertEqual(result.count(r'\begin{bookinlinefigure}'), 1)
        self.assertNotIn('Black-and-white version', result)
        self.assertNotIn('width=270bp', result)
        self.assertEqual(result.count(r'\caption[Short]'), 1)

    def test_inline_mode_does_not_waive_missing_approval_date(self):
        self.policy['approved_monochrome'] = {self.source:{}}
        with self.assertRaisesRegex(ValueError, 'approval date'):
            self.publish()




class InlineFigureAccountingTests(unittest.TestCase):
    def test_excerpt_offsets_count_numbered_originals_not_native_partners(self):
        from mage_inset_print import count_print_figures
        original = FIGURE.replace(r'\caption[Short]', r'\caption[First]')
        inline = isolate_inset_figures(inset(FIGURE.replace('drawing}', 'second}')), inline_labels={'second'})
        partner = r'\begin{bookinlinefigure}{Native}\caption*{Black-and-white version.}\end{bookinlinefigure}'
        following = FIGURE.replace('drawing}', 'third}')
        full = original + inline + partner + following
        self.assertEqual(count_print_figures(full), 4)
        self.assertEqual(count_print_figures(full, numbered_only=True), 3)
        # The next excerpt starts at the same count before or after pairing.
        self.assertEqual(count_print_figures(original + inline, numbered_only=True),
                         count_print_figures(original + inline + partner, numbered_only=True))

    def test_native_figure_list_keeps_inline_original_and_skips_starred_partner(self):
        from unittest.mock import patch
        import mage_latex
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            first = FIGURE.replace(r'\caption[Short]', r'\caption[Mainline title]')
            inline = isolate_inset_figures(inset(FIGURE.replace('drawing}', 'second}').replace(r'\caption[Short]', r'\caption[Inline title]')), inline_labels={'second'})
            partner = r'\begin{bookinlinefigure}{Native}\caption*{Black-and-white version.}\end{bookinlinefigure}'
            p = root/'chapter.tex';p.write_text(first+inline+partner)
            with patch.object(mage_latex, 'ROOT', root):
                listing = mage_latex.native_float_lists(['chapter.tex'])
            self.assertIn(r'\ref*{drawing}\quad Mainline title', listing)
            self.assertIn(r'\ref*{second}\quad Inline title', listing)
            self.assertNotIn('Black-and-white version', listing)
            self.assertNotIn('mage-list-figure', p.read_text())


class InlineInsetTaggingTests(unittest.TestCase):
    def test_nonfloating_pair_keeps_tags_numbering_and_prose(self):
        import os
        import re
        import shutil
        import subprocess
        from pypdf import PdfReader, PdfWriter
        if not shutil.which('lualatex'):
            self.skipTest('requires PDF build toolchain')
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp)
            writer = PdfWriter()
            writer.add_blank_page(width=180, height=110)
            writer.write(out/'diagram.pdf')
            source = out/'inline.tex'
            source.write_text(r'''\DocumentMetadata{lang=en-US,pdfversion=2.0,testphase={phase-III,table,math}}
\documentclass[12pt,openany]{book}
\usepackage[mage]{house}
\begin{document}
\begin{bookbox}{inset}{A continuous worked example}
The introduction belongs to this worked example.
\begin{bookinlinefigure}{Original diagram meaning.}\centering
\includegraphics[alt={Original diagram meaning.}]{DIAGRAM}\par
\caption{The original caption.}\label{case}
\end{bookinlinefigure}
\begin{bookinlinefigure}{Native diagram meaning.}\centering
\includegraphics[alt={Native diagram meaning.}]{DIAGRAM}\par
\caption*{Black-and-white version of Figure~\ref*{case}.}
\end{bookinlinefigure}
The interpretation remains in the same worked example.
\end{bookbox}
\typeout{INLINE-FIGURE-COUNT=\arabic{figure}}
\end{document}
'''.replace('DIAGRAM', str(out/'diagram.pdf')))
            env = os.environ.copy()
            env['TEXINPUTS'] = str(root/'latex')+os.pathsep+env.get('TEXINPUTS','')
            cache = Path(env.get('MAGE_TEXMF_CACHE', str(out/'tex-cache')))
            cache.mkdir(parents=True, exist_ok=True)
            env['TEXMFCACHE'] = env['TEXMFVAR'] = str(cache)
            command = [shutil.which('lualatex'), '-interaction=nonstopmode', '-halt-on-error',
                       '-no-shell-escape', '-output-directory='+str(out), str(source)]
            for _ in range(3):
                result = subprocess.run(command, cwd=root, env=env, text=True,
                                        stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                self.assertEqual(result.returncode, 0, result.stdout[-5000:])
            log = source.with_suffix('.log').read_text()
            self.assertEqual(re.findall(r'Package tagpdf Warning|Overfull|Float\(s\) lost', log), [])
            self.assertIn('INLINE-FIGURE-COUNT=1', log)
            pdf = PdfReader(source.with_suffix('.pdf'))
            self.assertEqual(len(pdf.pages), 1)
            text = pdf.pages[0].extract_text()
            self.assertEqual(text.count('The original caption.'), 1)
            self.assertIn('Black-and-white version of Figure 1.', text)
            self.assertIn('The interpretation remains', text)
            figures, captions = [], []
            def walk(node):
                node = node.get_object() if hasattr(node, 'get_object') else node
                if isinstance(node, list):
                    for child in node: walk(child)
                elif isinstance(node, dict):
                    if node.get('/S') == '/Figure' and '/Alt' in node:
                        figures.append(str(node['/Alt']))
                    if node.get('/S') == '/Caption': captions.append(node)
                    walk(node.get('/K', []))
            walk(pdf.trailer['/Root']['/StructTreeRoot'])
            self.assertEqual(figures, ['Original diagram meaning.', 'Original diagram meaning.',
                                      'Native diagram meaning.', 'Native diagram meaning.'])
            from pdf_structure import inspect_pdf
            self.assertEqual(inspect_pdf(source.with_suffix('.pdf'), headings=0, figures=2)[1], [])
            self.assertEqual(len(captions), 2)


if __name__ == '__main__':
    unittest.main()
