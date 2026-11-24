"""Negative controls for meaningful tagging, including PDF 2 namespace aliases."""
import unittest
from pdf_structure import inspect_catalog, numbered_sections, inspect_numbered_bookmarks


class BookmarkTests(unittest.TestCase):
    def test_legacy_coda_flag_cannot_hide_a_missing_number(self):
        records = [dict(slug='closing', part=7, chapter=5,
                        chapter_title='Closing', is_coda=True)]
        numbers = numbered_sections(records)
        self.assertEqual(numbers, ['7.5'])
        outline = [{'/Title': 'The Profession'}, [{'/Title': 'Closing'}]]
        self.assertTrue(inspect_numbered_bookmarks(outline, numbers))
        outline[1][0]['/Title'] = '7.5 Closing'
        self.assertEqual(inspect_numbered_bookmarks(outline, numbers), [])

    def test_appendix_sections_must_nest_under_appendix(self):
        outline = [{'/Title': 'Appendix A'}, {'/Title': 'A.1 Blueprint'}]
        self.assertTrue(inspect_numbered_bookmarks(outline, ['A.1']))
        self.assertEqual(inspect_numbered_bookmarks([outline[0], [outline[1]]], ['A.1']), [])

    def test_excerpt_excludes_other_chapters_and_front_matter(self):
        records = [dict(slug='front', part=0, chapter=1, chapter_title='Preface', is_matter=True),
                   dict(slug='intro', part=7, chapter=0, chapter_title='Profession', is_part_page=True),
                   dict(slug='closing', part=7, chapter=5, chapter_title='Closing'),
                   dict(slug='blueprint', part=10, chapter=1, chapter_title='A.1 Blueprint')]
        self.assertEqual(numbered_sections(records), ['7.5', 'A.1'])
        self.assertEqual(numbered_sections(records, {'closing'}), ['7.5'])


def element(role, kids=0, **extra):
    return {"/S": "/" + role, "/K": kids, **extra}


class StructureTests(unittest.TestCase):
    def setUp(self):
        self.catalog = {"/StructTreeRoot": {"/RoleMap": {"/chapter": "/H1"}, "/K": [
            element('chapter'), element('H2'), element('P'),
            element('Table', [element('TR', [element('TH'), element('TD')])]),
            element('Figure', **{'/Alt': 'Data flow between parser and renderer'})]}}
        self.expected = dict(headings=1, sections=1, tables=1, figures=1)

    def test_table_page_boundary(self):
        first, second = {}, {}
        table = self.catalog['/StructTreeRoot']['/K'][3]
        table['/K'] = [element('TR', [element('TD', **{'/Pg': first}),
                                    element('TD', **{'/Pg': second})])]
        self.assertTrue(any('spans multiple pages' in f for f in
            inspect_catalog(self.catalog, single_page_tables=True)[1]))
        table['/K'][0]['/K'][1]['/Pg'] = first
        self.assertFalse(inspect_catalog(self.catalog, single_page_tables=True)[1])

    def test_all_semantics_present(self):
        self.assertEqual(inspect_catalog(self.catalog, **self.expected)[1], [])

    def test_empty_tree_is_not_tagged_content(self):
        self.assertTrue(inspect_catalog({'/StructTreeRoot': {'/K': []}})[1])
        self.assertTrue(inspect_catalog({})[1])

    def test_figure_alt_required(self):
        del self.catalog['/StructTreeRoot']['/K'][-1]['/Alt']
        self.assertIn('Figure structure lacks nonempty alternative text',
                      inspect_catalog(self.catalog, **self.expected)[1])

    def test_empty_spacing_paragraph_does_not_replace_real_prose(self):
        self.catalog['/StructTreeRoot']['/K'].append(element('P', []))
        self.assertEqual(inspect_catalog(self.catalog, **self.expected)[1], [])
        self.catalog['/StructTreeRoot']['/K'][2]['/K'] = []
        self.assertIn('PDF has no paragraph with marked content', inspect_catalog(self.catalog)[1])

    def test_empty_heading_fails(self):
        self.catalog['/StructTreeRoot']['/K'][0]['/K'] = []
        self.assertIn('H1 structure has no marked content', inspect_catalog(self.catalog)[1])

    def test_expected_tables_cannot_disappear(self):
        del self.catalog['/StructTreeRoot']['/K'][3]
        self.assertTrue(any('Table' in item for item in inspect_catalog(self.catalog, **self.expected)[1]))

    def test_pdf2_namespace_role_mapping(self):
        self.catalog['/StructTreeRoot']['/K'][0] = element('custom-heading', **{
            '/NS': {'/RoleMapNS': {'/custom-heading': ['/H1', {}]}}})
        self.assertEqual(inspect_catalog(self.catalog, **self.expected)[1], [])

    def test_role_mapping_cycle_rejected(self):
        self.catalog['/StructTreeRoot']['/RoleMap'] = {'/chapter': '/other', '/other': '/chapter'}
        self.assertTrue(any('cyclic role' in item for item in inspect_catalog(self.catalog)[1]))

    def test_document_rejects_direct_content_but_accepts_paragraphs(self):
        for content in [0, {'/Type': '/MCR', '/MCID': 0}]:
            with self.subTest(content=content):
                catalog = {'/StructTreeRoot': {'/K': element('Document', [element('P'), content])}}
                self.assertIn('Document has direct marked content instead of a structure element',
                              inspect_catalog(catalog, headings=0)[1])
        catalog = {'/StructTreeRoot': {'/K': element('Document', [element('P')])}}
        self.assertEqual(inspect_catalog(catalog, headings=0)[1], [])


if __name__ == '__main__': unittest.main()
