#!/usr/bin/env python3
"""SVG publication must honor authored weight/style using bundled static faces."""
import concurrent.futures
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import mage_assets

REPO = Path(__file__).resolve().parents[1]
TOOLS_PRESENT = all(shutil.which(x) for x in ('fc-match', 'rsvg-convert', 'pdffonts', 'pdftotext'))

@unittest.skipUnless(TOOLS_PRESENT, 'requires the SVG/PDF publication toolchain')
class SvgFontTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        shutil.copytree(REPO / 'book/fonts/SourceSans3', self.root / 'book/fonts/SourceSans3')
        self.root_patch = patch.object(mage_assets, 'ROOT', self.root)
        self.root_patch.start()
        self.source = self.root / 'weights.svg'
        self.source.write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160"
 width="400" height="160" font-family="&quot;Source Sans 3&quot;">
 <text x="12" y="32" font-size="24">Regular</text>
 <text x="12" y="68" font-size="24" font-weight="700">Bold</text>
 <text x="12" y="104" font-size="24" font-style="italic">Italic</text>
 <text x="12" y="140" font-size="24" font-weight="700" font-style="italic">Bold italic</text>
 </svg>''')

    def tearDown(self):
        self.root_patch.stop()
        self.temp.cleanup()

    def test_scoped_selection_uses_all_four_actual_font_files(self):
        ambient = dict(os.environ)
        env, _ = mage_assets.svg_render_context()
        for suffix, filename in [('', 'Regular'), (':weight=bold', 'Bold'),
                                 (':slant=italic', 'It'), (':weight=bold:slant=italic', 'BoldIt')]:
            with self.subTest(face=filename):
                actual = subprocess.check_output(['fc-match', '-f', '%{file}', 'Source Sans 3' + suffix],
                                                 text=True, env=env)
                self.assertEqual(Path(actual).resolve(),
                                 (self.root / 'book/fonts/SourceSans3' / f'SourceSans3-{filename}.ttf').resolve())
        self.assertEqual(dict(os.environ), ambient)

    def test_pdf_embeds_regular_bold_and_italic_static_faces(self):
        target = self.root / 'weights.pdf'
        mage_assets.render_svg_cached(self.source, target)
        fonts = subprocess.check_output(['pdffonts', str(target)], text=True)
        for face in ['Regular', 'Bold', 'It', 'BoldIt']:
            self.assertRegex(fonts, r'\+SourceSans3-' + face + r'\s')
        text = subprocess.check_output(['pdftotext', str(target), '-'], text=True)
        for label in ['Regular', 'Bold', 'Italic', 'Bold italic']:
            self.assertIn(label, text)

    def test_font_update_invalidates_standalone_and_viewport_caches(self):
        target = self.root / 'weights.pdf'
        normalized = self.root / 'normalized'; normalized.mkdir()
        mage_assets.render_svg_cached(self.source, target)
        first_mtime = target.stat().st_mtime_ns
        first_viewport = mage_assets.uncropped_svg(self.source, normalized)
        mage_assets.render_svg_cached(self.source, target)
        self.assertEqual(target.stat().st_mtime_ns, first_mtime)
        font = self.root / 'book/fonts/SourceSans3/SourceSans3-Bold.ttf'
        # A trailing padding byte is valid in an sfnt and leaves glyphs unchanged.
        font.write_bytes(font.read_bytes() + b'\0')
        mage_assets.render_svg_cached(self.source, target)
        self.assertNotEqual(target.stat().st_mtime_ns, first_mtime)
        self.assertNotEqual(mage_assets.uncropped_svg(self.source, normalized), first_viewport)

    def test_parallel_initialization_publishes_complete_configuration(self):
        def select(_):
            env, identity = mage_assets.svg_render_context()
            selected = subprocess.check_output(['fc-match', '-f', '%{file}', 'Source Sans 3:weight=bold'],
                                               env=env, text=True, stderr=subprocess.PIPE)
            return identity, selected
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(select, range(12)))
        self.assertEqual(len(set(results)), 1)
        self.assertTrue(results[0][1].endswith('/SourceSans3-Bold.ttf'))

if __name__ == '__main__':
    unittest.main()
