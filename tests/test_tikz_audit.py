"""Adversarial rendered controls: compilation success is not visual correctness."""
import sys
from pathlib import Path
import unittest
import shutil
import tempfile
import pymupdf as fitz
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from tikz_audit import audit_page, intersects_segment, layout_findings, terminal_approaches


class TikzAuditTests(unittest.TestCase):
    def page(self):
        doc=fitz.open();page=doc.new_page(width=250,height=150)
        self.addCleanup(doc.close)
        return page

    def codes(self,page):
        return {f['code'] for f in audit_page(page)}

    def test_branch_rail_shortens_straight_terminal_and_collinear_ops_merge(self):
        p=self.page()
        p.draw_rect((70,100,140,130),color=(0,0,0))
        p.insert_text((80,117),'Target',fontsize=10)
        shaft=p.new_shape();shaft.draw_line((105,30),(105,60));shaft.draw_line((105,60),(105,95));shaft.finish(color=(0,0,0),closePath=False);shaft.commit()
        head=p.new_shape();head.draw_polyline([(102,94),(105,99),(108,94),(102,94)]);head.finish(fill=(0,0,0),color=None,closePath=True);head.commit()
        approaches=terminal_approaches(p)
        self.assertEqual(len(approaches),1)
        self.assertGreater(approaches[0]['approach_pt'],68)
        p.draw_line((80,95),(130,95),color=(0,0,0))
        approaches=terminal_approaches(p)
        self.assertAlmostEqual(approaches[0]['approach_pt'],4*72.27/72,places=2)
        self.assertIn('terminal-clearance',{f['code'] for f in layout_findings(p)})
        invalid={'terminal_exceptions':[{'target':'Absent','direction':'down','minimum_pt':3,'reason':'No such target'}]}
        self.assertIn('layout-contract',{f['code'] for f in layout_findings(p,invalid)})

    def test_round_endpoint_marker_is_not_an_arrowhead(self):
        p=self.page()
        p.draw_rect((70,100,140,130),color=(0,0,0))
        p.insert_text((80,117),'Target',fontsize=10)
        p.draw_line((105,30),(105,96),color=(0,0,0))
        p.draw_circle((105,96),3,fill=(0,0,0),color=None)
        self.assertEqual(terminal_approaches(p),[])

    def test_container_rectangle_shortens_terminal(self):
        p=self.page()
        p.draw_rect((70,100,140,130),color=(0,0,0))
        p.insert_text((80,117),'Target',fontsize=10)
        p.draw_line((105,30),(105,95),color=(0,0,0))
        head=p.new_shape();head.draw_polyline([(102,94),(105,99),(108,94),(102,94)])
        head.finish(fill=(0,0,0),color=None,closePath=True);head.commit()
        p.draw_rect((50,96,160,140),color=(0,0,0))
        approaches=terminal_approaches(p)
        self.assertEqual(len(approaches),1)
        self.assertAlmostEqual(approaches[0]['approach_pt'],3*72.27/72,places=2)
        self.assertIn('terminal-clearance',{f['code'] for f in layout_findings(p)})

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
    def test_branch_clearance_and_reviewed_peer_contract(self):
        import latex_build
        contract={'peer_groups':[{'name':'parallel outcomes',
            'labels':['Inform design','Choose checks'],
            'align':['top','bottom'],'equal_height':True}]}
        for name in ('layout-bad','layout-latex','layout-good','layout-nonpeer'):
            with tempfile.TemporaryDirectory() as folder:
                pdf=latex_build.compile_tex(Path(__file__).parent/'fixtures/tikz'/f'{name}.tex',Path(folder))
                with fitz.open(pdf) as doc:
                    p=doc[0]
                    self.assertEqual(len(terminal_approaches(p)),2)
                    found={f['code'] for f in audit_page(p,layout_contract=contract if name!='layout-nonpeer' else None)}
                    self.assertEqual(found,{'terminal-clearance','peer-alignment'} if name in ('layout-bad','layout-latex') else set())
                    if name in ('layout-bad','layout-latex'):
                        exception={'terminal_exceptions':[{'target':'Inform design','direction':'down','minimum_pt':2,'reason':'Fixture reviewed short connector'}]}
                        observed=layout_findings(p,exception)
                        self.assertTrue(any(f['code']=='reviewed-terminal-exception' and f['reviewed'] for f in observed))
                        exception['terminal_exceptions'][0]['minimum_pt']=8
                        self.assertIn('terminal-clearance',{f['code'] for f in layout_findings(p,exception)})
                    bad={'peer_groups':[{'labels':['Absent','Choose checks'],'equal_height':True}]}
                    self.assertIn('layout-contract',{f['code'] for f in layout_findings(p,bad)})

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
