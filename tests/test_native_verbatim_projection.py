"""Literal code survives native manuscript projection alongside table styling."""
from pathlib import Path
import re
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import mage_latex as ml


class VerbatimProjectionTests(unittest.TestCase):
    def project(self, body):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            source = root / 'example.tex'
            target = root / 'example.md'
            source.write_text(body)
            source.with_suffix('.assets.json').write_text('[]\n')
            with patch.object(ml, 'ROOT', root):
                ml.compatibility(source, target)
            return target.read_text()

    def test_complete_class_and_nested_braces_survive_table_group_removal(self):
        code = '\n'.join([
            'public sealed class Example', '{',
            '    public string Name { get; init; } = "";',
            '    public void Run()', '    {', '    }', '}',
        ])
        body = (r'{\footnotesize' + '\n' +
                r'\begin{longtable}{ll}' + '\n' +
                'Name & Meaning \\\\ \nOne & A value \\\\ \n' +
                r'\end{longtable}' + '\n}\n\n' +
                r'\begin{verbatim}' + '\n' + code + '\n' +
                r'\end{verbatim}' + '\n')
        projected = self.project(body)
        actual = re.search(r'``` text\n(.*?)\n```', projected, re.S)[1]
        self.assertEqual(actual, code)
        self.assertIn('A value', projected)
        self.assertNotIn('footnotesize', projected)

    def test_work_order_comments_remain_literal_code(self):
        code = '<!-- target-files: src/example.cs -->\n<!-- brief-genre: lint -->'
        projected = self.project(r'\begin{verbatim}' + '\n' + code + '\n' + r'\end{verbatim}' + '\n')
        self.assertIn('``` text\n' + code + '\n```', projected)


if __name__ == '__main__':
    unittest.main()
