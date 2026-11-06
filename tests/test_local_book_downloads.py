"""Local preview downloads use the same public URLs as deployment."""
import ast
from http.server import SimpleHTTPRequestHandler
import os
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class LocalBookDownloadsTests(unittest.TestCase):
    def test_published_downloads_resolve_to_current_artifacts(self):
        # Isolate the actual nested handler without starting deploy's build or server.
        tree = ast.parse((ROOT / 'catalog.py').read_text())
        handler = next(node for node in ast.walk(tree)
                       if isinstance(node, ast.ClassDef) and node.name == '_LocalHandler')
        with tempfile.TemporaryDirectory() as directory:
            namespace = {'SimpleHTTPRequestHandler': SimpleHTTPRequestHandler, 'os': os,
                         'ROOT': directory, 'book_site': os.path.join(directory, 'book/web/site'),
                         'BOOK_MANIFEST': {'pdf_filename': 'mage-book.pdf'}}
            exec(compile(ast.Module(body=[handler], type_ignores=[]), 'catalog.py', 'exec'), namespace)
            request = object.__new__(namespace['_LocalHandler'])
            request.directory = directory
            for extension in ('.pdf', '.epub'):
                name = 'mage-book' + extension
                artifact = Path(directory, 'book', name)
                artifact.parent.mkdir(exist_ok=True)
                artifact.write_bytes(b'fresh artifact')
                resolved = request.translate_path('/book/mage-book/' + name + '?download=1')
                self.assertEqual(Path(resolved).read_bytes(), b'fresh artifact')
            self.assertEqual(request.translate_path('/book/mage-book/'),
                             os.path.join(directory, 'book/web/site/index.html'))


if __name__ == '__main__':
    unittest.main()
