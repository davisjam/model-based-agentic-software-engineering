"""Print geometry must not discard semantic figure or pairing inputs."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from mage_figure_layout import apply_figure_print_layout


class FigurePrintLayoutTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'layout.json'
        self.rule = {'version': 1, 'figures': {
            'compact': {'placement': 'centered', 'width_bp': 300}}}
        self.figure = (r'\begin{figure}[htbp]\centering'
            r'\includegraphics[height=560bp,keepaspectratio,alt={Complete explanation},width=\linewidth]{art.pdf}'
            r'\caption{A {formatted} caption.}\label{compact}\end{figure}')

    def render(self, latex):
        self.path.write_text(json.dumps(self.rule))
        return apply_figure_print_layout(latex, self.path)

    def test_compact_width_preserves_caption_label_alt_and_float(self):
        self.assertEqual(self.render(self.figure),
                         self.figure.replace(r'width=\linewidth', 'width=300bp'))

    def test_unlisted_complex_figure_remains_full_width(self):
        figure = self.figure.replace('{compact}', '{complex}')
        self.assertEqual(self.render(figure), figure)

    def test_does_not_touch_inline_navigation_or_native_pool_graphics(self):
        native = r'\includegraphics[page=3,alt={Native}]{pool.pdf}'
        self.assertEqual(self.render(native), native)

    def test_unsafe_or_unknown_layout_fails(self):
        for width in (100, 451, True, '300bp'):
            with self.subTest(width=width):
                self.rule['figures']['compact']['width_bp'] = width
                with self.assertRaises(ValueError):
                    self.render(self.figure)

    def test_unexpected_original_width_fails_instead_of_hiding_drift(self):
        with self.assertRaises(ValueError):
            self.render(self.figure.replace(r'width=\linewidth', 'width=400bp'))



class InsetPlacementPolicyTests(unittest.TestCase):
    def test_explicit_flow_policy_keeps_width_and_label_selection_independent(self):
        from mage_figure_layout import inset_flow_labels
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'layout.json'
            data = {'version': 1, 'figures': {
                'inset-compact': {'placement':'centered','width_bp':270,'inset_placement':'flow'},
                'mainline-compact': {'placement':'centered','width_bp':270}}}
            path.write_text(json.dumps(data))
            self.assertEqual(inset_flow_labels(path), {'inset-compact'})
            data['figures']['inset-compact']['inset_placement'] = 'unknown'
            path.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, 'inset placement'):
                apply_figure_print_layout('', path)


if __name__ == '__main__':
    unittest.main()
