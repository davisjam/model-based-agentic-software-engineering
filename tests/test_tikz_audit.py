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


class TikzPoolReuseTests(unittest.TestCase):
    """The shared figure pool's reuse key and stamp guard.

    `compile_candidates()` runs twice per book push — the candidate gate and the book PDF build — so
    the second consumer reuses the first's artifact. These tests cover the channels an end-to-end run
    cannot reach safely: they build a FAKE input tree in a temp dir and never compile, so nothing here
    can edit a file a live sibling's build is reading, and nothing can reach `latex/build/tikz/`.
    """

    SHARED_SENTINEL='% pool shared input\n'

    def setUp(self):
        import mage_tikz_review
        self.pool=mage_tikz_review
        self.root=Path(tempfile.mkdtemp(prefix='pool-key-'));self.addCleanup(shutil.rmtree,self.root,True)
        self.base=self.root/'book/tikz'
        (self.base/'figures').mkdir(parents=True);(self.base/'receipts').mkdir(parents=True)
        self.figure=self.base/'figures/fig-one.tex'
        self.figure.write_text(r'\begin{tikzpicture}\draw (0,0)--(1,1);\end{tikzpicture}')
        self.receipt=self.base/'receipts/fig-one.json'
        self.receipt.write_text('{"alt": "a line"}')
        for name in ('inventory.json','layout-review.json','typography-review.json'):
            (self.base/name).write_text('{"figures": []}')
        for relative in self.pool._POOL_SHARED_INPUTS:
            target=self.root/relative;target.parent.mkdir(parents=True,exist_ok=True)
            target.write_text(self.SHARED_SENTINEL)
        self.build=self.root/'build';self.build.mkdir()
        self._swap(ROOT=self.root,BASE=self.base,BUILD=self.build,
                   STAMP=self.build/'candidates-pool-stamp.json',
                   _engine_banner=lambda:'LuaHBTeX pinned-for-test')

    def _swap(self,**values):
        for name,value in values.items():
            original=getattr(self.pool,name)
            setattr(self.pool,name,value)
            self.addCleanup(setattr,self.pool,name,original)

    def key(self,driver='DRIVER',font='FONT'):
        return self.pool._pool_cache_key([self.figure],driver,font)

    # ── The key must move when any input the artifact derives from moves ──

    def test_key_is_stable_when_nothing_changes(self):
        self.assertEqual(self.key(),self.key())

    def test_key_changes_on_figure_source_edit(self):
        before=self.key()
        self.figure.write_text(self.figure.read_text()+r'\relax')
        self.assertNotEqual(before,self.key())

    def test_key_changes_on_receipt_edit(self):
        before=self.key()
        self.receipt.write_text('{"alt": "a different description"}')
        self.assertNotEqual(before,self.key())

    def test_key_changes_on_each_review_contract(self):
        """The geometry and typography audits read these; a contract edit must re-run them."""
        for name in ('inventory.json','layout-review.json','typography-review.json'):
            with self.subTest(contract=name):
                before=self.key()
                (self.base/name).write_text('{"figures": [], "edited": "%s"}'%name)
                self.assertNotEqual(before,self.key(),f'{name} is outside the key')

    def test_key_changes_on_every_declared_shared_input(self):
        """Each declared shared input must actually reach the digest — a typo'd path would
        otherwise sit in the tuple contributing a constant `<absent>` forever."""
        for relative in self.pool._POOL_SHARED_INPUTS:
            with self.subTest(shared=relative):
                before=self.key()
                (self.root/relative).write_text(self.SHARED_SENTINEL+f'% {relative}\n')
                self.assertNotEqual(before,self.key(),f'{relative} is outside the key')
                (self.root/relative).write_text(self.SHARED_SENTINEL)

    def test_every_declared_shared_input_exists_in_the_real_tree(self):
        """Guards the silent-drop direction the test above cannot see: a file renamed in the repo
        keeps digesting as `<absent>`, so the key stops tracking it without any error."""
        real=Path(__file__).resolve().parents[1]
        missing=[r for r in self.pool._POOL_SHARED_INPUTS if not (real/r).is_file()]
        self.assertEqual(missing,[],'declared pool inputs that no longer exist')

    def test_key_changes_on_driver_font_driver_and_print_envelope(self):
        import mage_latex
        base=self.key()
        self.assertNotEqual(base,self.key(driver='DRIVER2'),'driver text outside the key')
        self.assertNotEqual(base,self.key(font='FONT2'),'font-reference driver outside the key')
        original=mage_latex.FIGURE_WIDTH_BP
        try:
            mage_latex.FIGURE_WIDTH_BP=original+1
            self.assertNotEqual(base,self.key(),'print envelope outside the key')
        finally:
            mage_latex.FIGURE_WIDTH_BP=original

    # ── The guard must require key AND artifact, and fail OPEN in every other direction ──

    def stamped(self):
        """A complete, verifying pool: all artifacts present and a stamp written over them."""
        (self.build/'candidates.pdf').write_bytes(b'%PDF-1.7 pool\n')
        (self.build/'pages.json').write_text('{"book/a.svg": {"page": 1}}')
        for name in ('geometry-audit.json','typography-audit.json'):
            (self.build/name).write_text('{"findings": []}')
        key=self.key();self.pool._pool_stamp_write(key)
        return key

    def test_reuse_hits_only_on_a_matching_key(self):
        key=self.stamped()
        self.assertIsNotNone(self.pool._pool_reuse(key))
        self.assertIsNone(self.pool._pool_reuse('a-different-key'))

    def test_reuse_returns_the_recorded_manifest(self):
        key=self.stamped()
        pdf,manifest=self.pool._pool_reuse(key)
        self.assertEqual(pdf,self.build/'candidates.pdf')
        self.assertEqual(manifest,{'book/a.svg':{'page':1}})

    def test_reuse_refuses_a_tampered_or_truncated_artifact(self):
        key=self.stamped()
        (self.build/'candidates.pdf').write_bytes(b'truncated')
        self.assertIsNone(self.pool._pool_reuse(key),'reuse trusted the stamp over the artifact')

    def test_reuse_refuses_a_tampered_manifest(self):
        key=self.stamped()
        (self.build/'pages.json').write_text('{"book/a.svg": {"page": 99}}')
        self.assertIsNone(self.pool._pool_reuse(key))

    def test_reuse_refuses_when_an_audit_output_is_missing(self):
        for name in self.pool._POOL_ARTIFACTS:
            with self.subTest(artifact=name):
                key=self.stamped()
                (self.build/name).unlink()
                self.assertIsNone(self.pool._pool_reuse(key),f'{name} absent and reuse still fired')

    def test_reuse_fails_open_on_a_missing_or_corrupt_stamp(self):
        key=self.stamped()
        self.pool.STAMP.unlink()
        self.assertIsNone(self.pool._pool_reuse(key))
        self.pool.STAMP.write_text('{not json')
        self.assertIsNone(self.pool._pool_reuse(key))

    def test_a_partial_run_neither_reuses_nor_stamps(self):
        """`--partial` compiles a SUBSET. It must not inherit a full pool, and a later full consumer
        must not inherit its incomplete one — so the key is None and BOTH directions close at once."""
        self.assertIsNone(self.pool._pool_key_for(True,[self.figure],'DRIVER','FONT'),
                          'a partial run computed a key, so it can reuse or stamp a subset')
        self.assertIsNotNone(self.pool._pool_key_for(False,[self.figure],'DRIVER','FONT'),
                             'a full run must still be keyed')

    def test_force_env_var_ignores_a_valid_stamp(self):
        import os
        key=self.stamped()
        self.assertIsNotNone(self.pool._pool_reuse(key))
        os.environ['MAGE_TIKZ_POOL_FORCE']='1'
        self.addCleanup(os.environ.pop,'MAGE_TIKZ_POOL_FORCE',None)
        self.assertIsNone(self.pool._pool_reuse(key))


if __name__=='__main__':unittest.main()
