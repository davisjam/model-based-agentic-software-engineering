"""Catalogue source checks must not enter unrelated repository trees."""
import glob
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import catalog


class CatalogueSourceWalkTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.addCleanup(patch.stopall)
        patch.object(catalog, 'ROOT', str(self.root)).start()
        self.paths = ['README.md', 'guide.md', 'CLAUDE.md', 'AGENTS.md', 'HANDOFF-review.md',
                      'BOOK-PROPOSAL-new.md', 'notes.local.md', '.hidden.md',
                      'agent/family/entry.md', 'agent/family/deeper/entry.md',
                      'agent/.hidden/hidden.md', 'agent/family/AGENTS.md',
                      'models-bridge/family/model.md', 'product/family/product.md',
                      'book/part2/chapter.md', 'node_modules/vendor/README.md',
                      'plugin/mirror/entry.md', 'unrelated/nested/README.md']
        for path in self.paths:
            target = self.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text('A source document.\n')

    def test_matches_previous_scope_and_all_filename_exclusions(self):
        expected = set()
        for path in glob.glob(str(self.root / '**/*.md'), recursive=True):
            relative = os.path.relpath(path, self.root)
            if os.sep in relative and relative.split(os.sep)[0] not in catalog.ROLE_DIRS:
                continue
            name = os.path.basename(path)
            if name in catalog.NOSERVE or name.startswith(('HANDOFF', 'BOOK-PROPOSAL')) or '.local.' in name:
                continue
            expected.add(path)
        actual = set(catalog.catalogue_md_files())
        self.assertEqual(actual, expected)
        self.assertEqual({str(Path(path).relative_to(self.root)) for path in actual},
                         {'README.md', 'guide.md', 'agent/family/entry.md',
                          'agent/family/deeper/entry.md', 'models-bridge/family/model.md',
                          'product/family/product.md'})

    def test_non_catalogue_tree_is_never_opened(self):
        scandir = os.scandir
        opened = []
        def guarded(path):
            relative = os.path.relpath(path, self.root)
            if relative != '.' and relative.split(os.sep)[0] not in catalog.ROLE_DIRS:
                self.fail('Attempted to scan excluded tree: ' + relative)
            opened.append(relative)
            return scandir(path)
        with patch('os.scandir', side_effect=guarded):
            self.assertEqual(len(catalog.catalogue_md_files()), 6)
        self.assertIn('.', opened)
        self.assertTrue(any(path.startswith('agent/') for path in opened))

    def test_link_scheme_check_still_covers_deep_catalogue_sources(self):
        (self.root / 'agent/family/deeper/entry.md').write_text('[Unsafe](javascript:alert)\n')
        (self.root / 'book/part2/chapter.md').write_text('[Outside this checker](javascript:alert)\n')
        issues = catalog.check_link_schemes()
        self.assertEqual(len(issues), 1)
        self.assertIn('agent/family/deeper/entry.md:1', issues[0])


if __name__ == '__main__':
    unittest.main()
