#!/usr/bin/env python3
"""Check progressive PDF figure approval without losing captions or references."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import mage_tikz_review as review


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.base = self.root / 'book/tikz'
        (self.base / 'receipts').mkdir(parents=True)
        self.build = self.root / 'book/build'
        self.build.mkdir(parents=True)
        self.driver = self.build / 'book.tex'
        self.chapter = self.build / 'chapter.tex'
        self.driver.write_text('\\begin{document}\n\\label{part:2}\n'
                               '\\input{book/build/chapter.tex}\n\\end{document}')
        self.pool = self.build / 'candidates.pdf'
        self.manifest = {}
        self.policy = {'version': 1, 'web': 'color', 'pdf_default': 'paired',
                       'approved_monochrome': {}}
        for name, value in [('ROOT', self.root), ('BASE', self.base)]:
            p = patch.object(review, name, value)
            p.start()
            self.addCleanup(p.stop)

    def candidate(self, stem, approved=False):
        source = f'book/assets/{stem}.svg'
        self.manifest[source] = {'page': len(self.manifest) + 1, 'links': []}
        (self.base / 'receipts' / f'{stem}.json').write_text(json.dumps({'alt': stem + ' description'}))
        if approved:
            self.policy['approved_monochrome'][source] = {'approved_date': '2026-11-05'}
        return source

    def figure(self, source, label):
        return ('\\begin{figure}[tbp]\n\\centering\n'
                f'\\includegraphics[width=8cm]{{{source}}}\n'
                f'\\caption{{Caption for {label}.}}\\label{{{label}}}\n\\end{{figure}}\n')

    def assemble(self, text):
        self.chapter.write_text(text)
        (self.base / 'publication.json').write_text(json.dumps(self.policy))
        active = review.publication_figures(self.driver, self.pool, self.manifest)
        return (self.chapter.read_text(), active,
                json.loads((self.build / 'figure-pairings.json').read_text()))

    def test_mixed_approval_keeps_numbering_captions_alt_and_links(self):
        first = self.candidate('first', approved=True)
        second = self.candidate('second')
        self.manifest[first]['links'] = [{'target': 'part:2', 'rect_bp': [1, 2, 30, 12]}]
        text, active, report = self.assemble(self.figure(first, 'fig:first') + self.figure(second, 'fig:second'))
        self.assertNotIn('{book/assets/first.svg}', text)
        self.assertIn('{book/assets/second.svg}', text)
        self.assertEqual(text.count(r'\begin{figure}'), 3)
        for name in ['first', 'second']:
            self.assertEqual(text.count(f'\\caption{{Caption for fig:{name}.}}'), 1)
            self.assertEqual(text.count(f'\\label{{fig:{name}}}'), 1)
        self.assertNotIn(r'Black-and-white version of Figure~\ref*{fig:first}', text)
        self.assertIn(r'Black-and-white version of Figure~\ref*{fig:second}', text)
        self.assertIn('alt={first description}', text)
        self.assertIn(r'\hyperref[part:2]', text)
        self.assertEqual(set(active), {first, second})
        self.assertEqual([r['source'] for r in report['pairs']], [second])
        self.assertEqual([r['source'] for r in report['approved_monochrome']], [first])

    def test_navigation_approval_replaces_instead_of_pairing(self):
        for approved in [False, True]:
            with self.subTest(approved=approved):
                source = self.candidate('nav-subway-p2', approved=approved)
                text, _, report = self.assemble('\\chapter{Modeling}\n'
                    f'\\includegraphics[width=8cm]{{{source}}}\n% mage-orientation-end\nBody')
                self.assertEqual(text.count(r'\includegraphics'), 1 if approved else 2)
                self.assertEqual('Black-and-white navigation map.' in text, not approved)
                self.assertEqual(r'\setlength{\parskip}{3pt}' in text, not approved)
                self.assertEqual(len(report['approved_monochrome']), int(approved))

    def test_missing_or_unused_approval_fails_before_chapter_mutation(self):
        source = self.candidate('orphan', approved=True)
        for missing in [False, True]:
            with self.subTest(missing=missing):
                if missing:
                    del self.manifest[source]
                with self.assertRaises(ValueError):
                    self.assemble('Unchanged chapter')
                self.assertEqual(self.chapter.read_text(), 'Unchanged chapter')
                self.assertFalse((self.build / 'figure-pairings.json').exists())

    def test_existing_monochrome_and_photo_are_retained(self):
        source = 'book/assets/original.svg'
        (self.base / 'monochrome-originals.json').write_text(json.dumps({source: 'already monochrome'}))
        original = self.figure(source, 'original') + self.figure('book/assets/photo.jpg', 'photo')
        with patch.object(review, '_verify_monochrome_original') as verify:
            text, active, report = self.assemble(original)
        verify.assert_called_once()
        self.assertEqual(text, original)
        self.assertEqual(active, {})
        self.assertEqual(report['monochrome_originals'], [source])

    def test_pdf_cannot_silently_fall_back_to_color(self):
        self.policy['pdf_default'] = 'color'
        with self.assertRaisesRegex(ValueError, 'publication policy'):
            self.assemble('Unchanged chapter')


if __name__ == '__main__':
    unittest.main()
