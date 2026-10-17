#!/usr/bin/env python3
"""Regression checks for references surviving cropped-PDF figure inclusion."""
import tempfile
import unittest
from pathlib import Path
from pypdf import PdfWriter, PdfReader
from pypdf.generic import ArrayObject, DictionaryObject, FloatObject, NameObject, TextStringObject
import mage_tikz_links as links


def annotation(target, rect, uri=False):
    result = DictionaryObject({NameObject('/Type'): NameObject('/Annot'),
        NameObject('/Subtype'): NameObject('/Link'),
        NameObject('/Rect'): ArrayObject([FloatObject(v) for v in rect])})
    if uri:
        result[NameObject('/A')] = DictionaryObject({NameObject('/S'): NameObject('/URI'),
            NameObject('/URI'): TextStringObject(target)})
    else: result[NameObject('/Dest')] = TextStringObject(target)
    return result


class FigureReferenceTests(unittest.TestCase):
    def test_explicit_references_require_links(self):
        for text in ['Chapter 2', 'Figure~1.6', 'Table 1.1', 'SECTION 3.4', 'Appendix Part II',
                     r'Figure~\textbf{1.6}', 'CHAPTER {5}', r'Section\ 3.4']:
            with self.subTest(text=text), self.assertRaisesRegex(ValueError, 'Unlinked'):
                links.check_source(text)

    def test_formatted_references_comments_and_ordinary_labels(self):
        links.check_source(r'\magebookref{fig:test}{Figure~\textbf{1.6}} Evidence; stable 2; Job')
        links.check_source('% Chapter 2 is a source comment\nModel')

    def test_malformed_reference_rejected(self):
        with self.assertRaises(ValueError): links.check_source(r'\magebookref{fig:test}{Figure 2')

    def test_nested_references_rejected(self):
        with self.assertRaisesRegex(ValueError,'Nested'):
            links.check_source(r'\magebookref{appendix:2}{\magebookref{appendix:1}{Appendix I}I}')

    def test_pool_regions_and_non_book_urls(self):
        writer = PdfWriter(); page = writer.add_blank_page(200, 100)
        page.mediabox.lower_left = (10, 20); page.mediabox.upper_right = (210, 120)
        page[NameObject('/Annots')] = ArrayObject([
            annotation('magebook:fig:example', [30,40,80,52], True),
            annotation('https://example.org', [50,60,90,72], True)])
        self.assertEqual(links.page_links(page), [{'target':'fig:example','rect_bp':[20,20,70,32]}])

    def test_unsafe_and_outside_pool_regions_rejected(self):
        for target,rect in [('magebook:bad}label',[3,3,20,20]),('magebook:part:1',[-1,3,20,20])]:
            writer=PdfWriter(); page=writer.add_blank_page(100,100)
            page[NameObject('/Annots')]=ArrayObject([annotation(target,rect,True)])
            with self.assertRaises(ValueError): links.page_links(page)

    def test_unknown_destination_cannot_silently_drop(self):
        with self.assertRaisesRegex(ValueError, 'Missing'):
            links.overlay([{'target':'fig:missing','rect_bp':[10,10,50,20]}], {'part:1'})

    def test_link_margin_is_not_counted_twice(self):
        text=links.overlay([{'target':'table:one','rect_bp':[10,20,50,30]}], {'table:one'})
        self.assertIn(r'\hspace{10.9963bp}', text)
        self.assertIn(r'\hyperref[table:one]', text)
        self.assertNotIn('picture',text)  # Avoid an untagged picture environment.

    def test_aux_parsing_with_formatted_titles(self):
        self.assertEqual(links.aux_destinations(r'\newlabel{fig:one}{{1.1}{3}{A \textbf{title}}{figure.1.1}{}}'),
                         {'fig:one':'figure.1.1'})

    def test_final_pdf_destinations_and_rectangles(self):
        with tempfile.TemporaryDirectory() as d:
            d=Path(d); writer=PdfWriter()
            page=writer.add_blank_page(600,800); writer.add_blank_page(600,800)
            writer.add_named_destination('tikz-candidate:fixture',0)
            writer.add_named_destination('figure.1.6',1)
            writer.add_named_destination('table.1.1',1)
            expected=[{'target':'fig:one','rect_bp':[10,20,60,30]},
                      {'target':'table:one','rect_bp':[80,20,130,30]}]
            manifest={'book/assets/fixture.svg':{'links':expected}}
            aux=d/'book.aux'; aux.write_text(r'\newlabel{fig:one}{{1.6}{2}{}{figure.1.6}{}}'+'\n'+
                                           r'\newlabel{table:one}{{1.1}{2}{}{table.1.1}{}}'+'\n'+
                                           r'\magefigureorigin{fixture}{6578176}{13156352}')
            entries=[annotation('figure.1.6',[110,220,160,230]),
                     annotation('table.1.1',[180,220,230,230])]
            page[NameObject('/Annots')]=ArrayObject(entries)
            path=d/'book.pdf'; writer.write(path)
            self.assertEqual(links.verify_book(path,aux,manifest),2)
            # Still clickable but pointing to the wrong target must fail.
            entries[1][NameObject('/Dest')]=TextStringObject('figure.1.6'); writer.write(path)
            with self.assertRaisesRegex(ValueError,'misdirected'): links.verify_book(path,aux,manifest)
            entries[1][NameObject('/Dest')]=TextStringObject('table.1.1')
            entries[1][NameObject('/Rect')]=ArrayObject([FloatObject(x) for x in [180,221,230,231]])
            writer.write(path)
            with self.assertRaisesRegex(ValueError,'misplaced'): links.verify_book(path,aux,manifest)
            # Shifting all links together used to pass by inferring origin from them.
            for annot,rect in zip(entries, ([1010,2020,1060,2030],[1080,2020,1130,2030])):
                annot[NameObject('/Rect')]=ArrayObject([FloatObject(x) for x in rect])
            writer.write(path)
            with self.assertRaisesRegex(ValueError,'misplaced'): links.verify_book(path,aux,manifest)
            manifest['book/assets/fixture.svg']['links']=expected[:1]
            with self.assertRaisesRegex(ValueError,'misplaced'): links.verify_book(path,aux,manifest)


if __name__ == '__main__': unittest.main()
