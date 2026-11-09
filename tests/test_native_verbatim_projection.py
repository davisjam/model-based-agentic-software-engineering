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

    def test_print_migration_preserves_work_order_lines_inside_and_outside_inset(self):
        code = '\n'.join([
            '<!-- target-files:', '  src/example.cs -->',
            '<!-- new-files-to-create:', '  tools/check.py -->',
            '<!-- compute-class: lint-all-on-commit -->',
            '<!-- brief-genre: lint -->',
            '<!-- eq: a +', ' b -->',
        ])
        fence = '``` text\n' + code + '\n```'
        inset = '> #### Inset — Work order {#work-order}\n>\n' + '\n'.join(
            '> ' + line for line in fence.splitlines())
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'example.md'
            destination = Path(directory) / 'example.tex'
            source.write_text('# Example\n\n' + fence + '\n\n' + inset +
                              '\n\nReal equation.\n<!-- eq: x +\n y -->\n')
            ml.migrate(source, destination, driver_enabled=False)
            text = destination.read_text()
        examples = re.findall(r'\\begin\{verbatim\}\n(.*?)\n\\end\{verbatim\}', text, re.S)
        self.assertEqual(examples, [code, code])
        self.assertIn('\\[\nx +  y\n\\]', text)


if __name__ == '__main__':
    unittest.main()
