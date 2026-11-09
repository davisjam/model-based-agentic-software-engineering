"""Word totals must not change when diagram labels or captions are rewritten."""
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'book'))
import build_book


class ProseWordCounts(unittest.TestCase):
    def count(self, rendered):
        with patch.object(build_book, 'md_to_html', return_value=rendered):
            return build_book._prose_word_count('source')

    def test_inline_diagram_styles_labels_and_both_caption_types_are_excluded(self):
        rendered = '''<h2>Two words</h2><p>Three more words</p>
        <figure><svg><style>.label { font-size: 12px; }</style>
        <title>Diagram title</title><desc>Diagram explanation</desc>
        <text>Label with <tspan>several words</tspan></text></svg>
        <figcaption>A lengthy diagram caption.</figcaption></figure>
        <table><caption>A lengthy table caption.</caption>
        <tr><td>Retained</td></tr></table>'''
        self.assertEqual(self.count(rendered), 6)

    def test_code_blocks_comments_and_alt_text_are_excluded_but_prose_remains(self):
        rendered = '''<!-- editorial annotation --><p>Use <code>READY</code> now.</p>
        <pre><code>not counted as prose</code></pre>
        <img src="diagram.svg" alt="diagram alternate description">
        <p>Keep &amp; count.</p>'''
        self.assertEqual(self.count(rendered), 6)


if __name__ == '__main__':
    unittest.main()
