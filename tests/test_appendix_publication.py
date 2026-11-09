"""Publication selection is separate from retired research/catalogue sources."""
from pathlib import Path
from types import SimpleNamespace
import json
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
for directory in ('book', 'tools', 'book-models'):
    sys.path.insert(0, str(ROOT / directory))
import build_book as bb
import mage_latex as ml
import lint_operator_card_page_span as cards


class AppendixPublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.book = self.root / 'book'
        for spec in bb._PUBLISHED_APPENDICES:
            directory = self.book / spec['directory']
            directory.mkdir(parents=True)
            for stem in ('_opening', *(stem for stem, _title in spec['pages'])):
                (directory / f'{stem}.md').write_text('A shared token: {{commits_per_week}}. {{chapter:modeling}}.\n')
        # Retired content exists, but cannot select itself for publication.
        for name in ('appendix-part-1-practice.md', 'appendix-part-2-evidence.md',
                     'appendix-stacks/_opening.md', 'appendix-operators-reference/daily-review.md',
                     'appendix-evidence-ledger/evidence-tables.md'):
            p = self.book / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text('Retired content.\n')

    def assemble(self, for_print=False):
        with patch.object(bb, 'HERE', self.book), patch.object(bb, '_load_metrics', return_value={'commits_per_week': '17'}), patch.object(bb, '_appendix_entries', side_effect=AssertionError('not a publication dependency')):
            return bb.build_appendix_chapters(10, for_print=for_print)

    def test_web_and_print_publish_exactly_two_appendices_without_dividers(self):
        web = self.assemble()
        self.assertEqual(web, self.assemble(for_print=True))
        self.assertEqual(len(web), 10)
        self.assertEqual([r['slug'] for r in web if r['chapter'] == 0],
                         ['appendix-handbook', 'appendix-practicing-mage'])
        self.assertEqual({r['part'] for r in web}, {10, 11})
        self.assertFalse(any(r.get('is_appendix_divider') for r in web))
        self.assertFalse(any('Retired' in r['body_md'] for r in web))
        self.assertTrue(all('17' in r['body_md'] and '{{' not in r['body_md'] for r in web))

    def test_missing_selected_source_fails_instead_of_renumbering_sections(self):
        (self.book / 'appendix-handbook/model-coherence.md').unlink()
        with self.assertRaisesRegex(SystemExit, 'model-coherence.md'):
            self.assemble()

    def test_symbolic_links_and_float_locators_follow_the_two_appendices(self):
        records = self.assemble()
        refs = bb._appendix_letter_map(records)
        text = bb._resolve_appendix_refs_md('[appendix: appendix-handbook] and [appendix: appendix-practicing-mage]', refs, {}, {})
        self.assertEqual(text, '[Appendix A](appendix-handbook.html) and [Appendix B](appendix-practicing-mage.html)')
        self.assertEqual([bb._chapter_id(r) for r in records],
                         ['A', 'A.1', 'A.2', 'A.3', 'A.4', 'B', 'B.1', 'B.2', 'B.3', 'B.4'])
        with self.assertRaises(SystemExit):
            bb._resolve_appendix_refs_md('[appendix: appendix-evidence-ledger]', refs, {}, {})

    def test_split_outputs_derive_only_appendix_a_and_b(self):
        records = self.assemble()
        doc = SimpleNamespace(chapters=[SimpleNamespace(**r) for r in records])
        sections = bb._pdf_split_sections(doc)
        self.assertEqual([name for name, _slugs in sections], ['Appendices', 'AppendixA', 'AppendixB'])
        self.assertEqual(sections[1][1], [r['slug'] for r in records if r['part'] == 10])

    def test_discovery_uses_publication_roster_not_retired_directories(self):
        with patch.object(ml, 'ROOT', self.root):
            paths = {str(p.relative_to(self.book)) for p in ml.author_sources()}
        expected = {f"{spec['directory']}/{stem}.md" for spec in bb._PUBLISHED_APPENDICES
                    for stem in ('_opening', *(stem for stem, _title in spec['pages']))}
        self.assertEqual(paths, expected)

    def test_migration_preserves_retired_native_rows_and_receipts(self):
        manifest = self.root / 'native-sources.json'
        old = {'source': 'book/latex/sources/appendix-operators-reference/daily-review.tex',
               'projection': 'book/appendix-operators-reference/daily-review.md',
               'source_hash': 'original-receipt', 'projection_hash': 'old-projection'}
        manifest.write_text(json.dumps({'version': 1, 'sources': [old]}))
        with patch.object(ml, 'ROOT', self.root), patch.object(ml, 'MANIFEST', manifest), patch.object(ml, 'migrate') as migrate:
            ml.migrate_all()
        rows = json.loads(manifest.read_text())['sources']
        self.assertEqual(len(rows), 11)
        self.assertEqual(migrate.call_count, 10)
        retired = next(r for r in rows if r['source'] == old['source'])
        self.assertEqual(retired['publication_status'], 'retired')
        self.assertEqual(retired['source_hash'], old['source_hash'])
        self.assertEqual(retired['projection_hash'], old['projection_hash'])
        self.assertTrue(all(r['publication_status'] == 'published' for r in rows if r is not retired))


class PublishedOperatorCardTests(unittest.TestCase):
    declared = [('daily-review', 'Daily Operator Review', 'What needs attention?'),
                ('governance-conversion', 'Governance Conversion', 'What should be inherited?')]

    def setUp(self):
        self.declaration = patch.object(cards, '_declared_cards', return_value=self.declared)
        self.declaration.start()
        self.addCleanup(self.declaration.stop)
        self.exists = patch.object(cards.os.path, 'isfile', return_value=True)
        self.exists.start()
        self.addCleanup(self.exists.stop)

    def test_declared_but_unpublished_cards_do_not_require_pdf_presence(self):
        chapters = [{'slug': 'appendix-a-governance-conversion',
                     'chapter_title': 'A.3 Governance Conversion'}]
        with patch.object(cards, '_published_chapters', return_value=chapters), patch.object(cards, '_per_page_text', side_effect=AssertionError('no published cards to inspect')):
            self.assertEqual(cards.presence_findings('proof.pdf'), [])
            self.assertEqual(cards.findings('proof.pdf'), [])
            self.assertEqual(cards.orphan_rows(), [])

    def test_published_card_missing_from_pdf_is_a_finding(self):
        chapters = [{'slug': 'appendix-b-daily-review', 'chapter_title': 'B.2 Daily Operator Review',
                     'operator_card_id': 'daily-review'}]
        with patch.object(cards, '_published_chapters', return_value=chapters), patch.object(cards, '_per_page_text', return_value=['other content']):
            findings = cards.presence_findings('proof.pdf')
        self.assertEqual(len(findings), 1)
        self.assertIn('daily-review', findings[0])
        self.assertNotIn('governance-conversion', findings[0])

    def test_published_card_is_bounded_by_next_noncard_section(self):
        chapters = [{'slug': 'appendix-b-daily-review', 'chapter_title': 'B.1 Daily Operator Review', 'operator_card_id': 'daily-review'},
                    {'slug': 'appendix-b-migration', 'chapter_title': 'B.2 Brownfield Migration'}]
        with patch.object(cards, '_published_chapters', return_value=chapters), patch.object(cards, '_per_page_text', return_value=['daily operator review what needs attention?', 'continuation', 'brownfield migration']):
            self.assertEqual(cards.presence_findings('proof.pdf'), [])
            self.assertEqual(cards.findings('proof.pdf'), [('daily-review', 1, 2)])

    def test_unknown_published_card_is_not_silently_ignored(self):
        with patch.object(cards, '_published_chapters', return_value=[{'slug': 'a', 'chapter_title': 'A.1 Something', 'operator_card_id': 'undeclared'}]):
            with self.assertRaisesRegex(ValueError, 'no declared card'):
                cards.presence_findings('proof.pdf')

    def test_strict_cli_rejects_missing_published_card(self):
        with patch.object(cards, 'findings', return_value=[]), patch.object(cards, 'orphan_rows', return_value=['missing published card']):
            self.assertEqual(cards.main(['--strict']), 1)


if __name__ == '__main__':
    unittest.main()
