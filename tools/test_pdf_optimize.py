"""Deduplication must retain navigation and independent page identities."""
from pathlib import Path
import sys
import tempfile
import unittest

from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject, NameObject
from pdf_optimize import deduplicate_pdf


class DeduplicationTests(unittest.TestCase):
    def test_shared_content_preserves_pages_destinations_and_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'book.pdf'
            writer = PdfWriter()
            for _ in range(2):
                page = writer.add_blank_page(200, 300)
                content = DecodedStreamObject()
                content.set_data(b'q 1 0 0 1 0 0 cm Q')
                page[NameObject('/Contents')] = writer._add_object(content)
            writer.add_named_destination('chapter:two', 1)
            writer.add_outline_item('Second chapter', 1)
            writer.add_metadata({'/Title': 'Book with paired figures'})
            writer.write(path)
            limit = sys.getrecursionlimit()
            deduplicate_pdf(path)
            self.assertEqual(sys.getrecursionlimit(), limit)
            reader = PdfReader(path, strict=True)
            self.assertEqual(len(reader.pages), 2)
            self.assertNotEqual(reader.pages[0].indirect_reference, reader.pages[1].indirect_reference)
            self.assertEqual(reader.pages[0].raw_get('/Contents'), reader.pages[1].raw_get('/Contents'))
            self.assertEqual(reader.get_destination_page_number(reader.named_destinations['chapter:two']), 1)
            self.assertEqual(reader.outline[0].title, 'Second chapter')
            self.assertEqual(reader.metadata.title, 'Book with paired figures')


if __name__ == '__main__':
    unittest.main()
