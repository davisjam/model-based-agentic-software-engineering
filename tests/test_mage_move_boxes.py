"""Reusable MAGE moves preserve semantic identity and stay grouped in print."""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / 'tools'), str(ROOT / 'book')]
import mage_latex
import build_book
import book_typst

MOVE = r'''% <!-- box-family: move -->
% mage-box-prefix: MAGE Move —
\begin{bookbox}{move}{Audit → Drain → Promote}
\label{heading:audit-drain-promote-move}
\textbf{Audit.} Record the violations detected.

\textbf{Drain.} Repair existing violations.

\textbf{Promote.} Reject new violations detected by the check.
\end{bookbox}
'''


class MoveProjectionTests(unittest.TestCase):
    def test_native_roundtrip_preserves_family_label_and_local_heading(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            native, markdown, reparsed = [root / name for name in ('native.tex', 'projected.md', 'reparsed.tex')]
            native.write_text(MOVE)
            native.with_suffix('.assets.json').write_text('[]')
            with patch.object(mage_latex, 'ROOT', root):
                mage_latex.compatibility(native, markdown)
                mage_latex.migrate(markdown, reparsed, driver_enabled=False)
            projected = markdown.read_text()
            self.assertIn('<!-- box-family: move -->', projected)
            self.assertIn('MAGE Move — Audit → Drain → Promote', projected)
            html = build_book.md_to_html(projected)
            self.assertIn('<blockquote class="box-move">', html)
            self.assertIn('class="inset-title"', html)
            self.assertIn('id="audit-drain-promote-move"', html)
            self.assertNotRegex(html, r'<h[1-6]')
            self.assertNotIn('box-inset', html)
            self.assertIn(r'\begin{bookbox}{move}{Audit → Drain → Promote}', reparsed.read_text())
            # Projection normalizes the native heading namespace to a web anchor.
            self.assertIn(r'\label{audit-drain-promote-move}', reparsed.read_text())
            self.assertIn('Reject new violations detected by the check.', reparsed.read_text())

    def test_typst_move_is_labeled_and_grouped_without_a_heading(self):
        rendered = book_typst._render_blockquote(
            '> #### MAGE Move — Governance conversion {#governance-conversion}\n>\n'
            '> Convert recurring judgment into a mechanism.', box_family='move')
        self.assertIn('dt.box-thesis-fill', rendered)
        self.assertIn('breakable: false', rendered)
        self.assertIn('MAGE Move', rendered)
        self.assertIn('Convert recurring judgment', rendered)
        self.assertNotIn('= MAGE Move', rendered)

    @unittest.skipUnless(shutil.which('lualatex'), 'requires PDF toolchain')
    def test_short_move_moves_intact_to_next_page(self):
        from pypdf import PdfReader
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            source = out / 'move-proof.tex'
            source.write_text(r'''\DocumentMetadata{lang=en-US,pdfversion=2.0,testphase={phase-III,table,math}}
\documentclass[11pt,openany]{book}
\usepackage[mage]{house}
\begin{document}
\noindent\rule{0pt}{0.9\textheight}Before the move.\par
''' + MOVE + '\n' + r'\end{document}')
            env = os.environ.copy()
            env['TEXINPUTS'] = str(ROOT / 'latex') + os.pathsep + env.get('TEXINPUTS', '')
            cache = out / 'tex-cache'
            cache.mkdir()
            env['TEXMFCACHE'] = env['TEXMFVAR'] = str(cache)
            result = subprocess.run(['lualatex', '-interaction=nonstopmode', '-halt-on-error',
                                     '-no-shell-escape', '-output-directory=' + str(out), str(source)],
                                    cwd=ROOT, env=env, text=True, stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT)
            self.assertEqual(result.returncode, 0, result.stdout[-6000:])
            reader = PdfReader(source.with_suffix('.pdf'))
            pages = [page.extract_text() for page in reader.pages]
            move_pages = [i for i, text in enumerate(pages) if 'MAGE MOVE' in text]
            self.assertEqual(len(move_pages), 1)
            index = move_pages[0]
            self.assertGreater(index, 0)
            for marker in ('Audit.', 'Drain.', 'Promote.', 'Reject new violations'):
                self.assertIn(marker, pages[index])
            self.assertNotRegex(source.with_suffix('.log').read_text(), r'Overfull|Float\(s\) lost')


if __name__ == '__main__':
    unittest.main()
