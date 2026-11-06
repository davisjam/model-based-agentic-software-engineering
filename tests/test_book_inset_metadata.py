"""Inset metadata must participate in the page's index and figure order."""
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode=True
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'book'))
import build_book as bb

class InsetMetadataTests(unittest.TestCase):
    def page(self,body,slug='chapter'):
        return {'slug':slug,'part':2,'chapter':2,'title':'Fixture','body_md':body}

    def harvest(self,pages):
        with patch.object(bb,'_load_concept_registry',return_value={'model-drift':'Model drift'}):
            return bb._harvest_concept_tags(pages)

    def test_inset_definition_resolves_later_chapter_example(self):
        defining=self.page('''<!-- box-family: inset -->
> #### Worked case {#worked}
>
> <!-- index-def: model-drift -->
>
> The model disagrees with the implementation.
''')
        example=self.page('<!-- index-example: model-drift -->\n\nA later example.','later')
        registry,maps=self.harvest([defining,example])
        self.assertEqual(registry['model-drift']['def'][0]['slug'],'chapter')
        body=bb.md_to_html(defining['body_md'],anchor_map=maps['chapter'])
        self.assertIn('<p id="idx-def-model-drift">The model',body)
        self.assertLess(body.index('<blockquote'),body.index('id="idx-def-model-drift"'))
        self.assertLess(body.index('id="idx-def-model-drift"'),body.index('</blockquote>'))
        self.assertIn('id="idx-ex-model-drift-1"',bb.md_to_html(example['body_md'],anchor_map=maps['later']))

    def test_example_occurrences_share_reading_order_across_nested_insets(self):
        page=self.page('''<!-- index-def: model-drift -->

Definition.

<!-- index-example: model-drift -->

First outside.

> #### First inset
>
> <!-- index-example: model-drift -->
>
> Second inside.
>
> > #### Nested inset
> >
> > <!-- index-example: model-drift -->
> >
> > Third nested.

> #### Sibling inset
>
> <!-- index-example: model-drift -->
>
> Fourth sibling.

<!-- index-example: model-drift -->

Fifth outside.
''')
        _,maps=self.harvest([page]);body=bb.md_to_html(page['body_md'],anchor_map=maps['chapter'])
        phrases=['First outside.','Second inside.','Third nested.','Fourth sibling.','Fifth outside.']
        for n,phrase in enumerate(phrases,1):
            self.assertIn(f'<p id="idx-ex-model-drift-{n}">{phrase}</p>',body)
            self.assertEqual(body.count(f'id="idx-ex-model-drift-{n}"'),1)
        # A second render is a fresh page, not a continuation of prior state.
        self.assertEqual(body,bb.md_to_html(page['body_md'],anchor_map=maps['chapter']))

    def test_duplicate_definition_inside_inset_is_still_rejected(self):
        page=self.page('<!-- index-def: model-drift -->\n\nDefinition.\n\n> <!-- index-def: model-drift -->\n>\n> Duplicate.')
        with self.assertRaisesRegex(SystemExit,'duplicate index-def'):
            self.harvest([page])

    def test_quoted_code_is_not_an_index_declaration(self):
        page=self.page('''> #### Syntax example
>
> ```markdown
> <!-- index-def: literal-unregistered-tag -->
> ```
''')
        registry,_=self.harvest([page]);self.assertEqual(registry,{})

    def test_inset_figure_labels_captions_numbering_and_gallery_refs(self):
        with tempfile.TemporaryDirectory(prefix='mage-inset-web-',dir='/private/tmp') as directory:
            root=Path(directory);(root/'assets').mkdir()
            for name in ['before','inside','after']:
                (root/'assets'/f'{name}.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>Fixture</title><rect width="10" height="10"/></svg>')
            page=self.page('''<!-- label: before -->
<!-- figure: assets/before.svg | Before caption. -->

> #### Worked figure
>
> <!-- label: inside -->
> <!-- figure: assets/inside.svg | Inside caption. [short: Inside view] -->
>
> See [ref:inside].

<!-- label: after -->
<!-- figure: assets/after.svg | After caption. -->

See [ref:inside].
''')
            with patch.object(bb,'HERE',root):
                entries,refs=bb._collect_floats([page],{})
                body=bb.md_to_html(page['body_md'])
            self.assertEqual([x['num'] for x in entries],['2.2-1','2.2-2','2.2-3'])
            self.assertEqual(refs['inside'],{'kind':'fig','num':'2.2-2','slug':'chapter'})
            self.assertEqual(entries[1]['short'],'Inside view')
            self.assertIn('id="fig-2-2-2"',entries[1]['html'])
            self.assertIn('Inside caption.',entries[1]['html'])
            numbered,fig_n,tbl_n=bb._number_floats(body,'2.2',1,1)
            self.assertEqual(fig_n,4)
            self.assertLess(numbered.index('<blockquote'),numbered.index('id="fig-2-2-2"'))
            self.assertLess(numbered.index('id="fig-2-2-2"'),numbered.index('</blockquote>'))
            resolved=bb._resolve_xrefs(numbered,refs,False)
            self.assertEqual(resolved.count('href="chapter.html#fig-2-2-2"'),2)

if __name__=='__main__':unittest.main(verbosity=2)
