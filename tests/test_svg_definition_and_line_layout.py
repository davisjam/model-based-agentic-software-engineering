"""SVG definitions are not paint, and positioned tspans are not one long label."""
from pathlib import Path
import sys,tempfile,unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'book-models'))
import lint_figure_overflow as overflow
import lint_figure_text_occlusion as occlusion

class SvgDefinitionAndLineLayout(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.faces=overflow.load_faces()

    def svg(self,body):
        directory=tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        path=Path(directory.name)/'fixture.svg'
        path.write_text('<svg xmlns="http://www.w3.org/2000/svg">'+body+'</svg>')
        return path

    def overs(self,path):
        return [f for f in overflow.analyze(path,self.faces) if f.verdict=='OVERFLOW']

    def test_positioned_tspan_lines_fit_separately(self):
        path=self.svg('<rect x="0" y="0" width="100" height="65"/>'
                      '<text x="50" y="20" style="font-size:16px;text-anchor:middle">'
                      '<tspan x="50" dy="0">first line</tspan>'
                      '<tspan x="50" dy="20">second line</tspan></text>')
        lines,_=overflow.parse_svg(path)
        self.assertEqual([t.text for t in lines],['first line','second line'])
        self.assertEqual([t.y for t in lines],[20,40])
        self.assertEqual(self.overs(path),[])

    def test_true_overflow_on_second_tspan_still_fails(self):
        path=self.svg('<rect x="0" y="0" width="100" height="65"/>'
                      '<text x="50" y="20" font-size="16">'
                      '<tspan x="50" dy="0">fits</tspan>'
                      '<tspan x="50" dy="20">This second line is much too wide for the box</tspan></text>')
        self.assertEqual(len(self.overs(path)),1)
        self.assertIn('second line',self.overs(path)[0].text)

    def test_inline_tspan_is_part_of_same_visual_line(self):
        path=self.svg('<rect x="0" y="0" width="100" height="65"/>'
                      '<text x="50" y="20" font-size="16">This is <tspan>one long</tspan> line of text</text>')
        self.assertEqual(len(self.overs(path)),1)

    def test_inline_css_overrides_presentation_font_size(self):
        path=self.svg('<rect x="0" y="0" width="100" height="65"/>'
                      '<text x="50" y="25" font-size="4" style="font-size:24px">MMMMMMMM</text>')
        lines,_=overflow.parse_svg(path)
        self.assertEqual(lines[0].font_size,24)
        self.assertEqual(len(self.overs(path)),1)

    def test_mask_definition_is_not_a_container_or_occluder(self):
        path=self.svg('<rect x="0" y="0" width="200" height="65"/>'
                      '<text x="50" y="25" font-size="16">Visible label</text>'
                      '<mask id="cutout"><rect x="0" y="0" width="60" height="65" fill="white"/></mask>')
        self.assertEqual(self.overs(path),[])
        self.assertEqual(occlusion.analyze(path,self.faces),[])

    def test_clip_and_nested_defs_are_not_occluders(self):
        path=self.svg('<text x="10" y="25" font-size="16">Visible label</text>'
                      '<defs><mask id="a"><rect width="200" height="65" fill="white"/></mask></defs>'
                      '<clipPath id="b"><rect width="200" height="65" fill="black"/></clipPath>')
        self.assertEqual(occlusion.analyze(path,self.faces),[])

    def test_real_rectangle_after_mask_still_occludes(self):
        path=self.svg('<text x="10" y="25" font-size="16">Hidden label</text>'
                      '<mask id="a"><rect width="200" height="65" fill="white"/></mask>'
                      '<rect x="0" y="0" width="200" height="65" style="fill:white"/>')
        self.assertEqual(len(occlusion.analyze(path,self.faces)),1)

    def test_inline_opacity_prevents_false_opaque_paint(self):
        path=self.svg('<text x="10" y="25" font-size="16">Visible label</text>'
                      '<rect width="200" height="65" style="fill:white;opacity:0"/>')
        self.assertEqual(occlusion.analyze(path,self.faces),[])

if __name__=='__main__':unittest.main()
