"""Print index anchors must not split an inset or drop its later figures."""
from pathlib import Path
import re
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / 'tools'), str(ROOT / 'book')]
import mage_latex as mage


@unittest.skipUnless(shutil.which('pandoc') and shutil.which('rsvg-convert'),
                     'native projection toolchain required')
class PrintInsetIndexTests(unittest.TestCase):
    def test_nested_index_anchor_preserves_inset_scope_and_later_figure(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'build').mkdir()
            (root / 'book/assets').mkdir(parents=True)
            (root / 'book/assets/example.svg').write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50">'
                '<rect width="100" height="50" fill="white"/></svg>')
            raw = '''<!-- index-example: model-drift -->

Outside example.

> #### A worked case {#case}
>
> <!-- index-def: model-drift -->
>
> Definition before the figure.
>
> <!-- label: composition -->
> <!-- figure: assets/example.svg | A composition model. -->
>
> <!-- index-example: model-drift -->
>
> An example after the figure.
'''
            record = {'slug': 'fixture', 'chapter_title': 'Fixture', 'part': 2, 'chapter': 2,
                      'part_title': 'Modeling', '_build_directory': 'build', 'body_md': raw,
                      '_heading_destinations': {},
                      '_index_anchors': {('model-drift', 'ex', 0): 'idx-ex-model-drift-1',
                                         ('model-drift', 'def', 0): 'idx-def-model-drift',
                                         ('model-drift', 'ex', 1): 'idx-ex-model-drift-2'}}
            with patch.object(mage, 'ROOT', root):
                output = root / mage._prepare_record((0, record))
            text = output.read_text()
            self.assertEqual(text.count(r'\label{composition}'), 1)
            self.assertEqual(text.count(r'\begin{figure}'), 1)
            self.assertEqual(text.count(r'\caption[A composition model]'), 1)
            self.assertEqual(text.count(r'\begin{bookbox}'), 2)
            boxes = re.findall(r'\\begin\{bookbox\}.*?\\end\{bookbox\}', text, re.S)
            self.assertIn(r'\label{idx-def-model-drift}', boxes[0])
            self.assertIn(r'\label{idx-ex-model-drift-2}', boxes[1])
            self.assertLess(text.index(r'\label{idx-ex-model-drift-1}'), text.index(r'\begin{bookbox}'))
            self.assertNotIn(r'\begin{quote}', text)


if __name__ == '__main__':
    unittest.main()
