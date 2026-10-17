"""Native compiler files are not served pages; generated headers are exact metadata."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import catalog
from tests import common
from tests.html import _h1_issue

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('stray_comments', ROOT / 'book-models/lint_stray_comments.py')
lint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lint)


class NativeBoundaryTests(unittest.TestCase):
    def test_exact_generated_header_only(self):
        rel = 'book/part2/chapter.md'
        header = 'GENERATED from book/latex/sources/part2/chapter.tex; edit the LaTeX source, then run tools/mage_latex.py sync.'
        headers = {rel: header}
        self.assertTrue(lint._is_source_header(header, rel, 0, headers))
        for inner, path, offset in [(header, rel, 10), (header, 'book/part2/other.md', 0),
                                    ('GENERATED from elsewhere', rel, 0), ('TODO: fix', rel, 0),
                                    (header + ' extra prose', rel, 0)]:
            self.assertFalse(lint._is_source_header(inner, path, offset, headers))

    def test_list_separator_requires_verified_projection(self):
        rel = 'book/part2/chapter.md'
        header = 'GENERATED from book/latex/sources/part2/chapter.tex; edit the LaTeX source, then run tools/mage_latex.py sync.'
        headers = {rel: header}
        raw = '<!-- ' + header + ' -->\n\n1. First list\n\n<!-- -->\n\n1. Second list\n'
        self.assertTrue(lint._is_generated_list_separator('<!-- -->', raw, rel, headers))
        for comment, text, path in [('<!-- -->', raw, 'book/part2/other.md'),
                                    ('<!-- -->', '1. Unvalidated list\n<!-- -->', rel),
                                    ('<!-- -->', '\n' + raw, rel),
                                    ('<!-- TODO -->', raw, rel), ('<!--  -->', raw, rel)]:
            self.assertFalse(lint._is_generated_list_separator(comment, text, path, headers))

    def test_served_walk_keeps_real_pages(self):
        with tempfile.TemporaryDirectory() as directory:
            scratch = ['latex/build/proof.html', 'book/latex/build/book.html',
                       'book/tikz/preview.html', 'book/_latex/old.html', 'handbook/generated/epub/cover.html']
            served = ['index.html', 'product/build/page.html', 'product/generated/page.html',
                      'product/latex/page.html', 'book/latex-other/page.html']
            for name in scratch + served:
                target = Path(directory, name)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text('<html><body>missing heading</body></html>')
            with patch.object(catalog, 'ROOT', directory), patch.object(common, 'ROOT', directory):
                actual = {str(Path(p).relative_to(directory)) for p in common.html_files()}
                self.assertEqual(actual, set(served))
                self.assertEqual(set(catalog._served_html_pages()), set(common.html_files()))
                for name in served:
                    self.assertIsNotNone(_h1_issue(Path(directory, name).read_text(), name))
                for name in scratch:
                    self.assertFalse(catalog._is_publishable(name))


if __name__ == '__main__':
    unittest.main()
