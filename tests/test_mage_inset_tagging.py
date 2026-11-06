"""Compile the paragraph-start branch of deferred inset figure pagination."""
import os
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which('lualatex'), 'requires PDF build toolchain')
class InsetTaggingTests(unittest.TestCase):
    def test_deferred_figures_restart_indented_and_unindented_paragraphs_once(self):
        from pypdf import PdfReader, PdfWriter

        preamble = r'''\DocumentMetadata{lang=en-US,pdfversion=2.0,testphase={phase-III,table,math}}
\documentclass[12pt,openany]{book}
\usepackage[mage]{house}
\makeatletter
\newcount\testhmode
\pretocmd\AP@savetop{\ifhmode\global\advance\testhmode by1\fi}{}{}
\makeatother
\begin{document}
'''
        case = r'''\clearpage
\section*{Paragraph restart CASE}
Before the deferred figure pages.\par
\bookinsetfigurepagesdefer{CASE}{inset}{A tagged case}{
\begin{figure}[p]\centering
\includegraphics[width=120pt,height=180pt,alt={Live diagram CASE}]{DIAGRAM}
\caption{Live figure caption CASE}\end{figure}}
% Trigger output while starting the next paragraph, before its queued hooks.
\vskip\dimexpr\pagegoal-\pagetotal-1pt\relax
START The restarted paragraph CASE retains its normal text structure.\par
A following paragraph CASE remains in the section.\par
\section*{Following section CASE}
The next section CASE has the expected parent.\par
'''
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder)
            writer = PdfWriter()
            writer.add_blank_page(width=120, height=180)
            writer.write(out / 'diagram.pdf')
            body = ''.join(case.replace('CASE', str(i)).replace('START', start)
                           .replace('DIAGRAM', str(out / 'diagram.pdf'))
                           for i, start in enumerate((r'\indent', r'\noindent'), 1))
            source = out / 'proof.tex'
            source.write_text(preamble + body + r'''
\typeout{HMODE-RESTARTS=\the\testhmode}
\end{document}
''')
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
            self.assertIn('HMODE-RESTARTS=2', log)
            self.assertEqual(re.findall(r'Package tagpdf Warning|Overfull|Float\(s\) lost', log), [])
            reader = PdfReader(source.with_suffix('.pdf'))
            text = '\n'.join(page.extract_text() for page in reader.pages)
            for i in (1, 2):
                self.assertEqual(text.count(f'The restarted paragraph {i}'), 1)
                self.assertEqual(text.count(f'Live figure caption {i}'), 1)
            roles = []
            figures = []
            def walk(node):
                if isinstance(node, list):
                    for child in node:
                        walk(child)
                elif hasattr(node, 'get_object'):
                    obj = node.get_object()
                    if hasattr(obj, 'get'):
                        roles.append(obj.get('/S'))
                        if obj.get('/S') == '/Figure':
                            figures.append(str(obj.get('/Alt')))
                        walk(obj.get('/K', []))
            walk(reader.trailer['/Root']['/StructTreeRoot'])
            self.assertEqual(figures, ['Live diagram 1', 'Live diagram 2'])
            self.assertEqual(roles.count('/Caption'), 2)


if __name__ == '__main__':
    unittest.main()
