"""The chapter map follows canonical titles/numbers in both editions."""
import json
from pathlib import Path
import tempfile
import unittest
import mage_practice_map as m

class ChapterMapTests(unittest.TestCase):
    def test_generated_assets_current(self):
        m.generate(check=True)

    def test_retitle_and_renumber_reach_both_drawings(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            for name in ['book/data/mage-practice-map.json','book-models/chapter_identity_declared.json','book/latex/native-sources.json']:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes((m.ROOT/name).read_bytes())
            manifest=json.loads((root/'book/latex/native-sources.json').read_text())
            for record in manifest['sources']:
                source=root/record['source'];source.parent.mkdir(parents=True,exist_ok=True)
                source.write_bytes((m.ROOT/record['source']).read_bytes())
            identities=json.loads((root/'book-models/chapter_identity_declared.json').read_text())
            identity=next(r for r in identities['chapters'] if r['label']=='the-dynamics-of-mage')
            old='book/'+identity['filename'];identity['filename']=identity['filename'].replace('4.1-','4.9-')
            record=next(r for r in manifest['sources'] if r['projection']==old)
            record['projection']='book/'+identity['filename']
            source=root/record['source'];source.write_text(source.read_text().replace('The Dynamics of MAGE','Revised Dynamics'))
            (root/'book-models/chapter_identity_declared.json').write_text(json.dumps(identities))
            (root/'book/latex/native-sources.json').write_text(json.dumps(manifest))
            for output in m.render(m.panels(root)):
                self.assertIn('§4.9 Revised Dynamics', ' '.join(output.split()))
                self.assertNotIn('§4.1',output)

if __name__=='__main__':unittest.main()
