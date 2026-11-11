"""Word totals must not change when diagram labels or captions are rewritten."""
from pathlib import Path
import json
import tempfile
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'book'))
import build_book
import wordcount


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

    def test_nested_svg_and_outer_footer_are_both_excluded(self):
        rendered = '''<p>Before diagram.</p><svg><svg><text>Inner labels</text></svg>
        <text>Outer footer after the nested viewport.</text></svg>
        <svg/><p>After diagram.</p>'''
        self.assertEqual(self.count(rendered), 4)


class WordCountReport(unittest.TestCase):
    def test_build_report_and_cli_share_counts_and_method(self):
        counts = build_book.WordCounts(
            [("Chapter 1", 12), ("Chapter 2", 23)], 35,
            [("Appendix A", 4), ("Appendix B", 5)], 9, 44)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'counts.json'
            build_book._write_word_counts(counts, path)
            first = path.read_bytes()
            build_book._write_word_counts(counts, path)
            self.assertEqual(path.read_bytes(), first)
            report = json.loads(first)
        cli = wordcount.as_json(counts, 110000)
        self.assertEqual(report['counting_method'], 'mage-rendered-prose-v1')
        self.assertEqual(report['total'], 44)
        self.assertEqual(report['target_scope'], 'total_including_appendices')
        self.assertEqual(report['headroom_words'], 110000 - 44)
        self.assertEqual(report, {key: cli[key] for key in report})
    def test_target_uses_total_including_appendices(self):
        counts = build_book.WordCounts([("Body", 100000)], 100000,
                                      [("Appendix A", 12000)], 12000, 112000)
        report = wordcount.as_json(counts, 110000)
        self.assertEqual(report['headroom_words'], -2000)
        self.assertTrue(report['over_recommendation'])
        self.assertIn('2,000 OVER', wordcount.band_verdict(counts.total, 110000))


if __name__ == '__main__':
    unittest.main()
