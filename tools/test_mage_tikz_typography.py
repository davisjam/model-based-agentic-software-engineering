#!/usr/bin/env python3
"""Regressions for lost semantic cues in otherwise valid rendered PDFs."""
import unittest
import pymupdf
from mage_tikz_typography import check_page, audit_pdf, check_body_fonts


class TypographyTests(unittest.TestCase):
    def setUp(self):
        self.document = pymupdf.open()
        self.page = self.document.new_page()

    def tearDown(self):
        self.document.close()

    def add(self, text, y=30, font="hebo"):
        self.page.insert_text((30, y), text, fontname=font)

    def test_bold_capitals_and_regular_explanation(self):
        self.add("ENGINEERING OBLIGATION")
        self.add("What must hold", 50, "helv")
        self.assertEqual(check_page(self.page, [
            {"text": "ENGINEERING OBLIGATION", "bold": True},
            {"text": "What must hold", "bold": False}]), [])

    def test_case_loss_fails_even_when_bold(self):
        self.add("Engineering obligation")
        self.assertTrue(check_page(self.page, [{"text": "ENGINEERING OBLIGATION", "bold": True}]))

    def test_weight_loss_fails_even_with_same_text(self):
        self.add("SCAFFOLDING", font="helv")
        self.assertTrue(check_page(self.page, [{"text": "SCAFFOLDING", "bold": True}]))

    def test_blanket_bold_explanation_fails(self):
        self.add("What must hold")
        self.assertTrue(check_page(self.page, [{"text": "What must hold", "bold": False}]))

    def test_partial_bold_does_not_satisfy_whole_phrase(self):
        self.add("Obligation")
        self.add("boundary", 50, "helv")
        self.assertTrue(check_page(self.page, [{"text": "Obligation boundary", "bold": True}]))

    def test_wrap_and_italic(self):
        self.add("what may", font="heit")
        self.add("happen?", 50, "heit")
        self.assertEqual(check_page(self.page, [{"text": "what may happen?", "italic": True}]), [])

    def test_word_boundary(self):
        self.add("Agentic")
        self.assertTrue(check_page(self.page, [{"text": "Agent", "bold": True}]))

    def test_missing_review_coverage(self):
        with self.assertRaisesRegex(ValueError, "every candidate"):
            audit_pdf("unused.pdf", {"a.svg": {"page": 1}}, {"figures": []})

    def test_fallback_font_is_detected_in_rendered_prose(self):
        self.add("Label", font="tiro")
        self.assertTrue(check_body_fonts(self.page, {"Helvetica"}))

    def test_body_family_preserves_semantic_weight(self):
        self.add("Heading", font="hebo")
        self.add("Annotation", 50, "helv")
        self.assertEqual(check_body_fonts(self.page, {"Helvetica", "Helvetica-Bold"}), [])

    def test_math_symbols_do_not_require_prose_font(self):
        self.add("x", font="tiit")
        self.add("1", 50, "tiro")
        self.assertEqual(check_body_fonts(self.page, {"Helvetica"}), [])


if __name__ == "__main__":
    unittest.main()
