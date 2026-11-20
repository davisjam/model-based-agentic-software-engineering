"""Appendix references must not inherit the preceding main-text counter."""
from pathlib import Path
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / 'tools'), str(ROOT / 'book')]
import mage_latex as ml


@unittest.skipUnless(shutil.which('pandoc') and shutil.which('lualatex'),
                     'Native projection and TeX required')
class AppendixReferenceTests(unittest.TestCase):
    def test_references_in_full_book_and_standalone_appendix(self):
        for preceding in ('', r'\setcounter{chapter}{7}\setcounter{section}{4}'
                              r'\setcounter{subsection}{4}\refstepcounter{subsection}'):
            with self.subTest(preceding_main_text=bool(preceding)), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                for letter, part, number in [('A', 10, 6), ('A', 10, 8), ('B', 11, 3)]:
                    slug = f'appendix-{letter.lower()}-fixture-{number}'
                    record = dict(slug=slug, body_md='A short passage.',
                                  chapter_title=f'{letter}.{number} Fixture',
                                  part_title=f'Appendix {letter} — Fixture',
                                  part=part, chapter=number, _index_anchors={},
                                  _heading_destinations={}, _build_directory='.')
                    with patch.object(ml, 'ROOT', root):
                        ml._prepare_record((0, record))
                slugs = ['appendix-a-fixture-6', 'appendix-a-fixture-8', 'appendix-b-fixture-3']
                document = (r'\documentclass{book}\usepackage{hyperref}\begin{document}'
                            + preceding + '\n'
                            + '\n'.join((root / f'{slug}.tex').read_text() for slug in slugs)
                            + '\n' + r'\end{document}')
                (root / 'test.tex').write_text(document)
                cache = ROOT / 'book/latex/build/.texmf-var'
                cache.mkdir(parents=True, exist_ok=True)
                env = dict(os.environ, TEXMFVAR=str(cache), TEXMFCACHE=str(cache))
                for _ in range(2):
                    result = subprocess.run(['lualatex', '-interaction=nonstopmode',
                                             '-halt-on-error', 'test.tex'], cwd=root,
                                            capture_output=True, text=True, env=env)
                    self.assertEqual(result.returncode, 0, result.stdout[-3000:])
                aux = (root / 'test.aux').read_text()
                for slug, number, destination in zip(
                        slugs, ['A.6', 'A.8', 'B.3'], ['10.6', '10.8', '11.3']):
                    self.assertIn(r'\newlabel{chapter:' + slug + '}{{' + number + '}', aux)
                    self.assertIn('{section.' + destination + '}', aux)


if __name__ == '__main__':
    unittest.main()
