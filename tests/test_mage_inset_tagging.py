"""Compile default fitted floats without deferred pages or paragraph surgery."""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))


@unittest.skipUnless(shutil.which('lualatex'), 'requires PDF build toolchain')
class InsetTaggingTests(unittest.TestCase):
    def test_fitted_float_preserves_tags_and_following_paragraphs(self):
        from pypdf import PdfReader, PdfWriter
        from mage_inset_print import isolate_inset_figures

        preamble = r'''\DocumentMetadata{lang=en-US,pdfversion=2.0,testphase={phase-III,table,math}}
\documentclass[12pt,openany]{book}
\usepackage[mage]{house}
\begin{document}
\section*{Inset layout}
'''
        case = r'''\begin{bookbox}{inset}{A tagged case CASE}
A short introduction CASE.
\begin{figure}[htbp]\centering
\includegraphics[width=120pt,height=80pt,alt={Live diagram CASE}]{DIAGRAM}
\caption{Live figure caption CASE}\end{figure}
START The following paragraph CASE retains its normal text structure.\par
A second paragraph CASE remains in the inset.
\end{bookbox}
'''
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            writer = PdfWriter()
            writer.add_blank_page(width=120, height=80)
            writer.write(out / 'diagram.pdf')
            body = ''.join(case.replace('CASE', str(i)).replace('START', start)
                           .replace('DIAGRAM', str(out / 'diagram.pdf'))
                           for i, start in enumerate((r'\indent', r'\noindent'), 1))
            body = isolate_inset_figures(body)
            for token in (r'\clearpage', r'\newpage', r'\bookinsetfigurepagesdefer'):
                self.assertNotIn(token, body)
            source = out / 'proof.tex'
            source.write_text(preamble + body + r'\end{document}')
            env = os.environ.copy()
            env['TEXINPUTS'] = str(ROOT / 'latex') + os.pathsep + env.get('TEXINPUTS', '')
            cache = Path(env.get('MAGE_TEXMF_CACHE', str(out / 'tex-cache')))
            cache.mkdir(parents=True, exist_ok=True)
            env['TEXMFCACHE'] = env['TEXMFVAR'] = str(cache)
            command = [shutil.which('lualatex'), '-interaction=nonstopmode',
                       '-halt-on-error', '-no-shell-escape',
                       '-output-directory=' + str(out), str(source)]
            for _ in range(2):
                result = subprocess.run(command, cwd=ROOT, env=env, text=True,
                                        stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                self.assertEqual(result.returncode, 0, result.stdout[-8000:])
            log = source.with_suffix('.log').read_text()
            self.assertEqual(re.findall(r'Package .* Warning|Overfull|Float\(s\) lost', log), [])
            reader = PdfReader(source.with_suffix('.pdf'))
            text = '\n'.join(page.extract_text() for page in reader.pages)
            for i in (1, 2):
                self.assertEqual(text.count(f'The following paragraph {i}'), 1)
                self.assertEqual(text.count(f'Live figure caption {i}'), 1)
            roles = []
            figures = []
            def walk(node):
                if isinstance(node, list):
                    for child in node: walk(child)
                elif hasattr(node, 'get_object'):
                    obj = node.get_object()
                    if hasattr(obj, 'get'):
                        roles.append(obj.get('/S'))
                        if obj.get('/S') == '/Figure': figures.append(str(obj.get('/Alt')))
                        walk(obj.get('/K', []))
            walk(reader.trailer['/Root']['/StructTreeRoot'])
            self.assertEqual(figures, ['Live diagram 1', 'Live diagram 2'])
            self.assertEqual(roles.count('/Caption'), 2)


if __name__ == '__main__':
    unittest.main()
