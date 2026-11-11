"""The SVG page-fit sensor uses authored print widths without hiding true overflow."""
from pathlib import Path
import json
import tempfile
import unittest
from unittest.mock import patch

from tests import svg_fit


class SvgPageFit(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        (self.root / 'book/assets').mkdir(parents=True)
        (self.root / 'book/data').mkdir()
        self.addCleanup(patch.stopall)
        patch.object(svg_fit, 'ROOT', str(self.root)).start()

    def fixture(self, width_bp=None, height=397, *, label='authored-figure-label'):
        # Deliberately different names: layout keys are labels, not SVG stems.
        (self.root / 'book/assets/narrow-artwork.svg').write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 {height}"/>')
        (self.root / 'book/chapter.md').write_text(
            f'> <!-- label: {label} -->\n>\n'
            '> <!-- figure: assets/narrow-artwork.svg | ' + 'x' * 306 + ' -->\n')
        rules = {} if width_bp is None else {
            label: {'width_bp': width_bp, 'placement': 'centered'}}
        (self.root / 'book/data/figure-print-layout.json').write_text(
            json.dumps({'version': 1, 'figures': rules}))

    def test_narrow_figure_fits_using_its_authored_label(self):
        # Recovery figure geometry: the old full-width estimate falsely failed.
        self.fixture(247.5)
        self.assertEqual(svg_fit.check_svg_page_fit(), (svg_fit.PASS, []))

    def test_declared_full_width_still_rejects_oversized_image(self):
        self.fixture(450)
        status, issues = svg_fit.check_svg_page_fit()
        self.assertEqual(status, svg_fit.FAIL)
        self.assertIn('print width 6.25in', issues[1])

    def test_declared_width_can_expose_overflow_legacy_estimate_missed(self):
        self.fixture(450, height=322)
        self.assertEqual(svg_fit.check_svg_page_fit()[0], svg_fit.FAIL)
        self.fixture(None, height=322)
        self.assertEqual(svg_fit.check_svg_page_fit()[0], svg_fit.PASS)

    def test_caption_can_overflow_even_when_narrow_image_alone_fits(self):
        self.fixture(247.5, height=580)
        self.assertLess(247.5 / 72 * 580 / 230, svg_fit.PAGE_HEIGHT_IN)
        status, issues = svg_fit.check_svg_page_fit()
        self.assertEqual(status, svg_fit.FAIL)
        self.assertIn('+ caption 0.65in', issues[1])

    def test_unconfigured_figure_keeps_existing_fallback(self):
        self.fixture(None)
        status, issues = svg_fit.check_svg_page_fit()
        self.assertEqual(status, svg_fit.FAIL)
        self.assertIn('print width 5.35in', issues[1])

    def test_invalid_width_fails_instead_of_weakening_gate(self):
        self.fixture(True)
        status, issues = svg_fit.check_svg_page_fit()
        self.assertEqual(status, svg_fit.FAIL)
        self.assertIn('Invalid centered print width', issues[0])


if __name__ == '__main__':
    unittest.main()
