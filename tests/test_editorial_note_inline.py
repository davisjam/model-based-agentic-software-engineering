"""Editorial notes retain authored formatting without leaking placeholders."""
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'book'))
import build_book as bb


class EditorialNoteInlineTests(unittest.TestCase):
    def setUp(self):
        self.state = patch.dict(bb._CITE_STATE, {
            'ns': 'test', 'numbers': {'bainbridge1983': 1},
            'order': ['bainbridge1983'], 'notes_emitted': set(), 'note_i': 0,
            'fn_defs': {}, 'fn_marks': {}, 'fn_i': 0,
        }, clear=True)
        self.state.start()
        self.addCleanup(self.state.stop)

    def test_emphasis_and_citation_inside_note(self):
        with patch.dict(bb._CITATIONS, {
            'bainbridge1983': {'note_html': '<em>Automatica</em> (1983)'},
        }, clear=True):
            result = bb.inline("Claim.[note: Bainbridge's *Ironies of Automation*."
                               "[cite: bainbridge1983] **Related evidence**.]")
        self.assertIn("Bainbridge's <em>Ironies of Automation</em>", result)
        self.assertIn('<strong>Related evidence</strong>', result)
        self.assertIn('href="#wc-test-1"', result)
        self.assertIn('<em>Automatica</em> (1983)', result)
        self.assertNotIn('*Ironies', result)
        self.assertNotIn('\x00', result)

    def test_code_escaping_and_multiple_note_targets(self):
        result = bb.inline('First.[note: ***A & B*** <limit> `*literal*`.] '
                           'Second.[note: *Another note*.]')
        self.assertIn('<strong><em>A &amp; B</em></strong> &lt;limit&gt;', result)
        self.assertIn('<code>*literal*</code>', result)
        self.assertIn('id="note-test-1"', result)
        self.assertIn('id="note-test-2"', result)
        self.assertIn('<em>Another note</em>', result)
        self.assertNotIn('\x00', result)


if __name__ == '__main__':
    unittest.main()
