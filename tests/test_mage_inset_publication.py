"""Full-book pairing must retain inset identity without scaling native artwork."""
from pathlib import Path
import json
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import mage_tikz_review as publication


class InsetPublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.base = self.root / 'book/tikz'
        (self.base / 'receipts').mkdir(parents=True)
        self.source = 'book/assets/diagram.svg'
        self.policy = {'version':1, 'web':'color', 'pdf_default':'paired', 'approved_monochrome':{}}
        (self.base / 'receipts/diagram.json').write_text(json.dumps({'alt':'Native diagram meaning.'}))
        self.driver = self.root / 'driver.tex'
        self.driver.write_text(r'\begin{document}\input{chapter.tex}\end{document}')
        self.chapter = self.root / 'chapter.tex'
        self.chapter.with_suffix('.assets.json').write_text(json.dumps([{'pdf':'art.pdf','source':self.source}]))
        self.figure = (r'\begin{figure}[htbp]'
            r'\begin{bookinsetfigure}{inset}{A \emph{formatted} title}'
            r'\centering\includegraphics[width=270bp,alt={Color meaning.}]{art.pdf}'
            r'\caption[Short]{A complete numbered caption.}\label{stable-figure}'
            r'\end{bookinsetfigure}\end{figure}')

    def publish(self):
        (self.base / 'publication.json').write_text(json.dumps(self.policy))
        self.chapter.write_text(self.figure)
        with patch.object(publication, 'ROOT', self.root), patch.object(publication, 'BASE', self.base):
            publication.publication_figures(self.driver, self.root/'pool.pdf',
                {self.source:{'page':3, 'width_pt':450, 'height_pt':300, 'links':[]}})
        return self.chapter.read_text()

    def test_fullbook_pair_preserves_panel_caption_number_alt_and_native_size(self):
        actual = self.publish()
        self.assertEqual(actual.count(r'\begin{figure}'), 2)
        self.assertEqual(actual.count(r'\begin{bookinsetfigure}{inset}{A \emph{formatted} title}'), 2)
        self.assertEqual(actual.count(r'\caption[Short]{A complete numbered caption.}'), 1)
        self.assertEqual(actual.count(r'\label{stable-figure}'), 1)
        self.assertIn(r'\caption*{Black-and-white version of Figure~\ref*{stable-figure}.}', actual)
        self.assertIn(r'\includegraphics[page=3,alt={Native diagram meaning.}]{pool.pdf}', actual)
        self.assertNotIn(r'\bookinsetfigurepagesdefer', actual)

    def test_approved_native_replacement_keeps_one_numbered_panel(self):
        self.policy['approved_monochrome'] = {self.source:{'approved_date':'2026-11-09'}}
        actual = self.publish()
        self.assertEqual(actual.count(r'\begin{figure}'), 1)
        self.assertEqual(actual.count(r'\begin{bookinsetfigure}'), 1)
        self.assertEqual(actual.count(r'\label{stable-figure}'), 1)
        self.assertIn(r'\includegraphics[page=3,alt={Native diagram meaning.}]{pool.pdf}', actual)
        self.assertNotIn('width=270bp', actual)

    def test_mainline_pair_does_not_gain_inset_decoration(self):
        self.figure = self.figure.replace(r'\begin{bookinsetfigure}{inset}{A \emph{formatted} title}', '').replace(r'\end{bookinsetfigure}', '')
        actual = self.publish()
        self.assertNotIn('bookinsetfigure', actual)
        self.assertEqual(actual.count(r'\begin{figure}'), 2)


if __name__ == '__main__':
    unittest.main()
