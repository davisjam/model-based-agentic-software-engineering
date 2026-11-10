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

    def assemble(self, text, **kwargs):
        self.chapter.write_text(text)
        (self.base / 'publication.json').write_text(json.dumps(self.policy))
        active = review.publication_figures(self.driver, self.pool, self.manifest, **kwargs)
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

    def test_excerpt_uses_approved_artwork_without_requiring_other_chapters(self):
        selected = self.candidate('selected', approved=True)
        self.candidate('another-chapter', approved=True)
        text, active, report = self.assemble(self.figure(selected, 'selected'), excerpt=True)
        self.assertNotIn('{book/assets/selected.svg}', text)
        self.assertEqual(text.count(r'\begin{figure}'), 1)
        self.assertEqual(set(active), {selected})
        self.assertEqual([entry['source'] for entry in report['approved_monochrome']], [selected])

    def test_excerpt_still_rejects_a_missing_approved_candidate(self):
        selected = self.candidate('selected', approved=True)
        orphan = self.candidate('missing-pool-entry', approved=True)
        del self.manifest[orphan]
        original = self.figure(selected, 'selected')
        with self.assertRaisesRegex(ValueError, 'no replaceable monochrome candidate'):
            self.assemble(original, excerpt=True)
        self.assertEqual(self.chapter.read_text(), original)

    def test_excerpt_links_and_verification_cover_only_present_destinations(self):
        source = self.candidate('selected', approved=True)
        internal = {'target': 'part:2', 'rect_bp': [1, 2, 30, 12]}
        external = {'target': 'part:7', 'rect_bp': [1, 20, 30, 30]}
        self.manifest[source]['links'] = [internal, external]
        original = self.figure(source, 'selected')
        text, active, _ = self.assemble(original, excerpt=True)
        self.assertIn(r'\hyperref[part:2]', text)
        self.assertNotIn(r'\hyperref[part:7]', text)
        self.assertEqual(active[source]['links'], [internal])
        self.assertEqual(self.manifest[source]['links'], [internal, external],
                         'one excerpt must not alter the shared manifest for later excerpts')
        with self.assertRaisesRegex(ValueError, 'Missing TikZ book-reference destination: part:7'):
            self.assemble(original)

    def test_pdf_cannot_silently_fall_back_to_color(self):
        self.policy['pdf_default'] = 'color'
        with self.assertRaisesRegex(ValueError, 'publication policy'):
            self.assemble('Unchanged chapter')


if __name__ == '__main__':
    unittest.main()
