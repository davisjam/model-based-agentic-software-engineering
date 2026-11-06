"""EPUB output must be fresh, complete, and replace a prior edition only after validation."""
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
import xml.etree.ElementTree as ET
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'book'))
sys.path.insert(0, str(ROOT / 'tools'))
import book_epub as epub


class EpubTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.out = Path(temporary.name) / 'book.epub'
        self.records = [{'slug': 'chapter', 'page_title': 'Fixture', 'main_cls': 'wrap',
                         'main': '<h1 id="start">Fixture</h1><p><a href="#start">Start</a></p>'}]
        self.extras = [{'slug': 'index'}]
        self.addCleanup(patch.stopall)
        patch.object(epub.build_book, 'expected_page_slugs', return_value={'chapter', 'index'}).start()
        patch.object(epub, '_render_cover_jpg', return_value=b'cover fixture').start()
        nav = epub._XHTML_SHELL.format(title='Contents', body_attrs='', body=(
            '<nav epub:type="toc"><ol><li><a href="chapter.xhtml#start">'
            'Fixture</a></li></ol></nav>'))
        patch.object(epub, '_nav_xhtml', return_value=nav).start()

    def emit(self):
        return epub.emit(self.records, self.extras, self.out,
                         work_dir=self.out.parent / 'work', update_thumbnail=False)

    def rewrite_archive(self, transform):
        with zipfile.ZipFile(self.out) as archive:
            entries = [(info, archive.read(info.filename)) for info in archive.infolist()]
        with zipfile.ZipFile(self.out, 'w') as archive:
            for info, data in entries:
                data = transform(info, data)
                if data is not None:
                    archive.writestr(info, data)

    def test_emit_validates_navigation_spine_and_references(self):
        self.emit()
        report = epub.validate(self.out)
        self.assertEqual(report['spine_items'], 3)
        self.assertEqual(report['documents'], 3)
        with zipfile.ZipFile(self.out) as archive:
            self.assertEqual(archive.infolist()[0].filename, 'mimetype')
            self.assertEqual(archive.infolist()[0].compress_type, zipfile.ZIP_STORED)
            self.assertEqual(archive.read('mimetype'), b'application/epub+zip')

    def test_broken_fragment_does_not_replace_previous_edition(self):
        self.emit()
        previous = self.out.read_bytes()
        self.records[0]['main'] = '<h1>New</h1><a href="#missing">Broken</a>'
        with self.assertRaisesRegex(ValueError, 'broken fragment'):
            self.emit()
        self.assertEqual(self.out.read_bytes(), previous)

    def test_missing_manifest_asset_is_rejected(self):
        self.emit()
        self.rewrite_archive(lambda info, data: None if info.filename == 'OEBPS/cover.jpg' else data)
        with self.assertRaisesRegex(ValueError, 'manifest resource missing'):
            epub.validate(self.out)

    def test_duplicate_spine_item_is_rejected(self):
        self.emit()
        self.rewrite_archive(lambda info, data: data.replace(
            b'<itemref idref="pg-chapter"/>', b'<itemref idref="cover-page"/>')
            if info.filename == 'OEBPS/content.opf' else data)
        with self.assertRaisesRegex(ValueError, 'spine must uniquely reference'):
            epub.validate(self.out)

    def test_compressed_mimetype_is_rejected(self):
        self.emit()
        def compress_mimetype(info, data):
            if info.filename == 'mimetype':
                info.compress_type = zipfile.ZIP_DEFLATED
            return data
        self.rewrite_archive(compress_mimetype)
        with self.assertRaisesRegex(ValueError, 'mimetype must be first, uncompressed'):
            epub.validate(self.out)

    def test_stale_native_projections_stop_before_page_render(self):
        import mage_latex
        with patch.object(mage_latex, 'sync', side_effect=SystemExit('stale')) as sync, \
                patch.object(epub.build_book, 'build_pages') as pages:
            with self.assertRaisesRegex(SystemExit, 'stale'):
                epub.main(['--out', str(self.out)])
            sync.assert_called_once_with(check=True)
            pages.assert_not_called()
            self.assertFalse(self.out.exists())

    def test_check_validates_existing_archive_without_rendering(self):
        self.emit()
        with patch.object(epub.build_book, 'build_pages') as pages:
            self.assertEqual(epub.main(['--check', '--out', str(self.out)]), 0)
            pages.assert_not_called()

    def test_triple_emphasis_produces_nested_xhtml(self):
        rendered = epub.build_book.inline('Before ***NOT THAT!*** after.')
        node = ET.fromstring('<p>' + rendered + '</p>')
        self.assertEqual(node.find('strong/em').text, 'NOT THAT!')
        self.assertEqual(''.join(node.itertext()), 'Before NOT THAT! after.')


if __name__ == '__main__':
    unittest.main()
