"""Regression checks for authoritative LaTeX -> semantic Pandoc conversion."""
import json
from pathlib import Path
import tempfile
import unittest
import latex_source as L

class SourceBridgeTests(unittest.TestCase):
    def source(self, text):
        directory=tempfile.TemporaryDirectory(); self.addCleanup(directory.cleanup)
        path=Path(directory.name)/'chapter.tex'
        path.write_text(text)
        path.with_suffix('.yaml').write_text('title: Test\nid: test\n')
        return path

    def test_native_box_arguments_drive_output(self):
        path=self.source(r'''\begin{bookbox}{decision}{Edited \emph{title}} % handbook-attrs: ["decision-test", ["definition"], [["title", "Stale title"]]]
Authored prose.
\end{bookbox}
''')
        block=L.read_ast(path)['blocks'][0]
        self.assertEqual(block['c'][0][1], ['decision'])
        self.assertEqual(dict(block['c'][0][2])['title'], 'Edited *title*')
        self.assertEqual(block['c'][0][0], 'decision-test')

    def test_unknown_latex_fails_closed(self):
        path=self.source(r'Prose. \NotSupported{important content}')
        with self.assertRaisesRegex(ValueError,'Unsupported raw LaTeX'): L.read_ast(path)

    def test_citations_remain_semantic(self):
        path=self.source(r'As \citet{conway1968} explains; see \citep{bass-saip}.')
        ast=L.read_ast(path)
        citations=[n for n in ast['blocks'][0]['c'] if n['t']=='Cite']
        self.assertEqual([c['c'][0][0]['citationId'] for c in citations],['conway1968','bass-saip'])

    def test_longtable_heading_not_duplicated(self):
        md=self.source('').with_suffix('.md')
        md.write_text('---\ntitle: Test\nid: test\n---\n\n| Strategy | Example |\n|---|---|\n| Organize | Review |\n\n: Decisions {#tbl-decisions}\n')
        tex=L.write_source(md)
        plain=L.pandoc(json.dumps(L.read_ast(tex)), 'json','plain')
        self.assertEqual(plain.count('Strategy'),1)
        self.assertEqual(plain.count('Organize'),1)

if __name__=='__main__': unittest.main()
