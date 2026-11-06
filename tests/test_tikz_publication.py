"""Publication artwork must preserve the manuscript and reject incomplete mapping."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import mage_tikz_review as figures


class PublicationFiguresTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.base = self.root / 'book/tikz'
        (self.base / 'receipts').mkdir(parents=True)
        self.policy = {'version': 1, 'web': 'color', 'pdf_default': 'paired',
                       'approved_monochrome': {}}
        self.policy_path = self.base / 'publication.json'
        self.policy_path.write_text(json.dumps(self.policy))
        self.driver = self.root / 'book.tex'
        self.driver.write_text('\\begin{document}\n\\input{chapter.tex}\n\\end{document}')
        self.chapter = self.root / 'chapter.tex'
        self.source = 'book/assets/model.svg'
        self.original = ('\\begin{figure}[htbp]\n\\centering\n'
                         '\\includegraphics[page=7,width=\\linewidth,alt={Old description}]{color.pdf}\n'
                         '\\caption{Approved caption.}\\label{model}\n\\end{figure}\n'
                         '\\includegraphics[width=2in]{portrait.jpg}\n')
        self.chapter.write_text(self.original)
        (self.root / 'color.pages.json').write_text(json.dumps({'7': self.source}))
        (self.base / 'receipts/model.json').write_text(json.dumps({'alt': 'The model and its boundary.'}))
        self.pool = self.root / 'grayscale.pdf'
        self.manifest = {self.source: {'page': 3, 'width_pt': 350, 'height_pt': 200,
                                     'links': [{'target': 'model', 'rect_bp': [5, 5, 40, 20]}]}}
        self.addCleanup(patch.stopall)
        patch.object(figures, 'ROOT', self.root).start()
        patch.object(figures, 'BASE', self.base).start()

    def test_color_then_monochrome_preserve_caption_numbering_photo_and_links(self):
        figures.publication_figures(self.driver, self.pool, self.manifest)
        text = self.chapter.read_text()
        self.assertIn('\\caption{Approved caption.}\\label{model}', text)
        self.assertIn('\\begin{figure}[htbp]', text)
        self.assertIn('\\includegraphics[width=2in]{portrait.jpg}', text)
        self.assertIn('\\includegraphics[page=3,alt={The model and its boundary.}]{grayscale.pdf}', text)
        self.assertIn('width=\\linewidth', text)
        self.assertIn(self.original.split('\\includegraphics[width=2in]')[0], text)
        self.assertEqual(text.count('\\caption{Approved caption.}'), 1)
        self.assertEqual(text.count('\\label{model}'), 1)
        self.assertIn('\\caption*{Black-and-white version of Figure~\\ref*{model}.}', text)
        self.assertLess(text.index('color.pdf'), text.index('grayscale.pdf'))
        self.assertIn('\\hyperref[model]', text)
        self.assertIn('\\magerecordfigureorigin{model}', text)
        self.assertNotIn('\\clearpage', text)
        self.assertNotRegex(text, r'\\includegraphics\[[^]]*(?:width|height)[^]]*\]\{grayscale.pdf\}')

    def test_approved_monochrome_replaces_only_artwork_and_leaves_web_color(self):
        self.policy['approved_monochrome'][self.source] = {'approved_date': '2026-11-05'}
        self.policy_path.write_text(json.dumps(self.policy))
        # The generated print chapter is distinct from the color web artifacts.
        color_source = self.root / self.source
        color_source.parent.mkdir(parents=True)
        color_source.write_text('<svg xmlns="http://www.w3.org/2000/svg"><rect fill="red"/></svg>')
        web = self.root / 'book/model.html'
        web.write_text('<figure><img src="assets/model.svg" alt="Color model"></figure>')
        original_color, original_web = color_source.read_bytes(), web.read_bytes()

        active = figures.publication_figures(self.driver, self.pool, self.manifest)
        text = self.chapter.read_text()
        self.assertEqual(active, self.manifest)
        self.assertEqual(text.count(r'\begin{figure}'), 1)
        self.assertIn(r'\begin{figure}[htbp]', text)
        self.assertEqual(text.count(r'\caption{Approved caption.}'), 1)
        self.assertEqual(text.count(r'\label{model}'), 1)
        self.assertNotIn(r'\caption*', text)
        self.assertNotIn('color.pdf', text)
        self.assertEqual(text.count('{grayscale.pdf}'), 1)
        self.assertIn(r'\includegraphics[page=3,alt={The model and its boundary.}]{grayscale.pdf}', text)
        self.assertIn(r'\hyperref[model]', text)
        self.assertIn(r'\magerecordfigureorigin{model}', text)
        self.assertIn(r'\includegraphics[width=2in]{portrait.jpg}', text)
        self.assertEqual(color_source.read_bytes(), original_color)
        self.assertEqual(web.read_bytes(), original_web)
        self.assertEqual(json.loads(self.policy_path.read_text())['web'], 'color')
        self.assertEqual(json.loads(self.policy_path.read_text())['pdf_default'], 'paired')
        ledger = json.loads((self.root / 'figure-pairings.json').read_text())
        self.assertEqual(ledger['pairs'], [])
        self.assertEqual(ledger['approved_monochrome'],
                         [{'source': self.source, 'original_label': 'model', 'candidate_page': 3}])

    def test_incomplete_pool_does_not_partially_rewrite_manuscript(self):
        with self.assertRaisesRegex(ValueError, 'Missing publication grayscale figure'):
            figures.publication_figures(self.driver, self.pool, {})
        self.assertEqual(self.chapter.read_text(), self.original)

    def test_archived_candidate_does_not_appear_in_current_book(self):
        manifest = {**self.manifest, 'book/assets/retired.svg': {'page': 4}}
        active = figures.publication_figures(self.driver, self.pool, manifest)
        self.assertEqual(active, self.manifest)
        self.assertNotIn('page=4', self.chapter.read_text())

    def test_registered_monochrome_original_must_pass_pixel_check(self):
        (self.base / 'monochrome-originals.json').write_text(json.dumps({self.source: {}}))
        with patch.object(figures, '_verify_monochrome_original', side_effect=ValueError('Visible color')):
            with self.assertRaisesRegex(ValueError, 'Visible color'):
                figures.publication_figures(self.driver, self.pool, {})
        self.assertEqual(self.chapter.read_text(), self.original)

    def test_navigation_pair_follows_original_without_duplicating_label(self):
        source = 'book/assets/nav-subway-p2.svg'
        self.chapter.write_text('\\includegraphics[width=4in]{book/assets/nav-subway-p2.svg}')
        (self.base / 'receipts/nav-subway-p2.json').write_text(json.dumps({'alt': 'Chapter 2 navigation.'}))
        active = figures.publication_figures(self.driver, self.pool, {source: {'page': 5}})
        self.assertEqual(set(active), {source})
        text = self.chapter.read_text()
        self.assertLess(text.index('nav-subway-p2.svg'), text.index('grayscale.pdf'))

    def test_repeated_original_is_not_silently_counted_as_full_coverage(self):
        self.chapter.write_text(self.original + self.original)
        with self.assertRaisesRegex(ValueError, 'duplicates=1'):
            figures.publication_figures(self.driver, self.pool, self.manifest)
        self.assertEqual(self.chapter.read_text(), self.original + self.original)


    def test_monochrome_partner_stays_inside_deferred_inset_decoration(self):
        original = self.original.split(r'\includegraphics[width=2in]')[0]
        self.chapter.write_text(r'\bookinsetfigurepagesdefer{queue-key}{inset}{A case}{' + '\n'
                                + original + '}\nFollowing prose.')
        figures.publication_figures(self.driver, self.pool, self.manifest)
        text = self.chapter.read_text()
        closing = text.index('}\nFollowing prose.')
        self.assertLess(text.index('{grayscale.pdf}'), closing)
        self.assertLess(text.index(r'\caption*{Black-and-white version'), closing)
        self.assertEqual(text.count(r'\label{model}'), 1)
        self.assertEqual(text.count(r'\bookinsetfigurepagesdefer{'), 1)
        self.assertGreater(text.index('Following prose.'), closing)


if __name__ == '__main__':
    unittest.main()
