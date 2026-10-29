"""Negative controls for meaningful tagging, including PDF 2 namespace aliases."""
import unittest
from pdf_structure import inspect_catalog


def element(role, kids=0, **extra):
    return {"/S": "/" + role, "/K": kids, **extra}


class StructureTests(unittest.TestCase):
    def setUp(self):
        self.catalog = {"/StructTreeRoot": {"/RoleMap": {"/chapter": "/H1"}, "/K": [
            element('chapter'), element('H2'), element('P'),
            element('Table', [element('TR', [element('TH'), element('TD')])]),
            element('Figure', **{'/Alt': 'Data flow between parser and renderer'})]}}
        self.expected = dict(headings=1, sections=1, tables=1, figures=1)

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
