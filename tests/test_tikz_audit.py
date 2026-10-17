"""Adversarial rendered controls: compilation success is not visual correctness."""
import sys
from pathlib import Path
import unittest
import shutil
import tempfile
import pymupdf as fitz
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from tikz_audit import audit_page, intersects_segment


class TikzAuditTests(unittest.TestCase):
    def page(self):
        doc=fitz.open();page=doc.new_page(width=250,height=150)
        self.addCleanup(doc.close)
        return page

    def codes(self,page):
        return {f['code'] for f in audit_page(page)}

    def test_separate_text_runs_overlap(self):
        p=self.page();p.insert_text((30,50),'FIRST',fontsize=10);p.insert_text((33,50),'SECOND',fontsize=10)
        self.assertIn('text-overlap',self.codes(p))

    def test_horizontal_and_vertical_strokes(self):
        for a,b in [((20,46),(120,46)),((40,20),(40,80))]:
            p=self.page();p.insert_text((30,50),'crossing label',fontsize=10)
            p.draw_line(a,b,color=(0,0,0))
            # Vertical line intersects one character per row; add second row.
            if a[0]==b[0]:p.insert_text((30,65),'crossing label',fontsize=10)
            self.assertTrue(intersects_segment(a,b,fitz.Rect(35,40,45,70)))
            self.assertIn('stroke-through-text',self.codes(p))

    def test_dash_gap_over_label_is_not_a_crossing(self):
        p=self.page();p.insert_text((30,50),'crossing label',fontsize=10)
        p.draw_line((10,46),(150,46),color=(0,0,0),dashes='[1 100] 0')
        self.assertNotIn('stroke-through-text',self.codes(p))

    def test_clipped_diagonal_points_stay_on_line(self):
        from tikz_audit import clipped_segment
        a,b=clipped_segment((0,0),(100,60),fitz.Rect(30,25,80,40))
        for x,y in (a,b):self.assertAlmostEqual(y,.6*x)

    def test_opaque_fill_after_text_is_occlusion(self):
        p=self.page();p.insert_text((30,50),'hidden label',fontsize=10)
        p.draw_rect((25,35,110,60),fill=(.85,.85,.85),color=None)
        self.assertIn('text-occlusion',self.codes(p))

    def test_gray_node_before_text_is_not_occlusion(self):
        p=self.page();p.draw_rect((20,30,120,65),fill=(.8,.8,.8),color=(0,0,0))
        p.insert_text((30,50),'visible label',fontsize=10)
        self.assertEqual(self.codes(p),set())

    def test_white_backing_hides_earlier_line(self):
        p=self.page();p.draw_line((10,46),(150,46),color=(0,0,0))
        p.draw_rect((25,35,110,60),fill=(1,1,1),color=None)
        p.insert_text((30,50),'edge label',fontsize=10)
        self.assertEqual(self.codes(p),set())

    def test_font_band_and_page_boundary(self):
        p=self.page();p.insert_text((30,50),'undersized prose',fontsize=6)
        p.insert_text((-8,80),'outside',fontsize=10)
        self.assertTrue({'font-band','page-overflow'}<=self.codes(p))

    def test_gray_fill_is_not_color_or_a_failure(self):
        p=self.page()
        for x,gray in [(10,.95),(90,.75),(170,.55)]:
            p.draw_rect((x,30,x+65,70),fill=(gray,)*3,color=(0,0,0))
            p.insert_text((x+5,50),'mode',fontsize=10)
        self.assertEqual(self.codes(p),set())


class CompiledTikzControls(unittest.TestCase):
    @unittest.skipUnless(shutil.which('lualatex'),'requires PDF build toolchain')
    def test_clean_compilation_does_not_hide_geometry_defects(self):
        import latex_build
        for name,expected in [('geometry-bad',{'text-overlap','text-occlusion','stroke-through-text'}),('geometry-good',set())]:
            with tempfile.TemporaryDirectory() as folder:
                source=Path(__file__).parent/'fixtures/tikz'/f'{name}.tex'
                pdf=latex_build.compile_tex(source,Path(folder))
                with fitz.open(pdf) as doc:
                    found={f['code'] for f in audit_page(doc[0])}
                self.assertEqual(found,expected)


if __name__=='__main__':unittest.main()
