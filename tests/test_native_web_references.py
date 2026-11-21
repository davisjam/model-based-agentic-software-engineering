"""Native symbolic section references must resolve in web/EPUB, not leak as text."""
import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'book'))
import build_book as bb

class NativeWebReferenceTests(unittest.TestCase):
    def records(self):
        return [dict(slug='appendix-a-start',part=10,chapter=1,is_appendix=True,
                     chapter_title='A.1 Start',body_md='[ref:chapter:appendix-a-end] [ref:6.1-theory:heading:costs] [ref:6.1-theory:heading:example]'),
                dict(slug='appendix-a-end',part=10,chapter=8,is_appendix=True,
                     chapter_title='A.8 Design',body_md='Body.'),
                dict(slug='6.1-theory',part=6,chapter=1,chapter_title='Theory',
                     body_md='## Context\n\nBody.\n\n## Costs\n\n### Example {#example}\n\nBody.')]
    def test_numbered_appendix_and_heading_references(self):
        records=self.records();refs=bb._collect_section_refs(records)
        result=bb._resolve_xrefs(records[0]['body_md'],refs,False)
        self.assertIn('appendix-a-end.html">Section A.8</a>',result)
        self.assertIn('6.1-theory.html#costs">Section 6.1.2</a>',result)
        self.assertIn('6.1-theory.html#example">Example</a>',result)
        self.assertNotIn('[ref:',result)
        self.assertIn('## Costs {#costs}',records[2]['body_md'])
    def test_unknown_qualified_reference_fails(self):
        with self.assertRaises(SystemExit):
            bb._resolve_xrefs('[ref:chapter:missing]',{},False)
    def test_existing_float_reference_unchanged(self):
        result=bb._resolve_xrefs('[ref:example]',{'example':dict(kind='fig',num='2.1-1',slug='model')},False)
        self.assertIn('Figure&nbsp;2.1-1',result)

if __name__=='__main__':unittest.main()
