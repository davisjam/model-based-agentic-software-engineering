"""A synthesis without subheadings must retain its authored claim anchors."""
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'book-models'))
import outline_model as outline
import book_symbols as symbols
import chapter_shape_model as shape


class HeadinglessPointTests(unittest.TestCase):
    def test_headingless_points_keep_book_order_and_claim_identity(self):
        chapters = [SimpleNamespace(slug=slug, part=1) for slug in ['before', 'headed', 'after']]
        points = {slug: [symbols.PointRow(slug+'-claim', 'A consequential claim.', 0)]
                  for slug in ['before', 'after']}
        heading = symbols.HeadingRow('headed', 1, 2, 'A heading', 'a-heading',
                                     'explicit', 'A topic sentence.', 0)
        with patch.object(symbols, 'heading_rows', return_value=[heading]), \
                patch.object(symbols, 'chapter_preamble_points', return_value=points), \
                patch.object(symbols.book_ir, 'parse_book', return_value=SimpleNamespace(chapters=chapters)):
            model = outline.derive_outline()
        self.assertEqual([c.slug for c in model.chapters], ['before', 'headed', 'after'])
        self.assertEqual(model.chapters[0].preamble_points[0].slug, 'before-claim')
        self.assertEqual(model.chapters[2].preamble_points[0].slug, 'after-claim')
        self.assertEqual(model.chapters[1].sections[0].section_id, 'a-heading')
        self.assertFalse(model.chapters[0].sections)
        self.assertFalse(outline.invariant_findings(model))

    def test_no_unrelated_empty_units_are_invented(self):
        with patch.object(symbols, 'heading_rows', return_value=[]), \
                patch.object(symbols, 'chapter_preamble_points', return_value={}):
            self.assertEqual(outline.derive_outline().chapters, [])


class ChapterClosingTests(unittest.TestCase):
    def test_collected_footnotes_do_not_replace_the_authored_closing(self):
        chapter = symbols.book_ir.parse_records([{
            'slug': 'example', 'part': 5,
            'body_md': ('Opening paragraph.\n\nThe engineering judgment remains with the author.\n\n'
                        '[^cost]: A long accounting qualification belongs in a footnote.')}]).chapters[0]
        opening, closing = shape.chapter_prose_anchors(chapter)
        self.assertTrue(opening.startswith('Opening paragraph.'))
        self.assertEqual(closing, 'The engineering judgment remains with the author.')

    def test_inline_footnote_reference_remains_part_of_the_closing(self):
        chapter = symbols.book_ir.parse_records([{
            'slug': 'example', 'part': 5,
            'body_md': 'A consequential closing with evidence[^cost].'}]).chapters[0]
        self.assertEqual(shape.chapter_prose_anchors(chapter)[1],
                         'A consequential closing with evidence[^cost].')
