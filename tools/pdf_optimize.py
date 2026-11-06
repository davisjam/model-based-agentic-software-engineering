"""Lossless deduplication for the book's repeated vector resources."""
from pathlib import Path
import sys
import tempfile


def deduplicate_pdf(path):
    """Merge identical PDF objects while retaining the complete catalog.

    The long tagged book needs a deeper clone stack than Python's default.
    Production structure and link checks run after this transformation.
    """
    from pypdf import PdfWriter

    path = Path(path)
    limit = sys.getrecursionlimit()
    try:
        sys.setrecursionlimit(max(limit, 10000))
        with tempfile.TemporaryDirectory(prefix='mage-pdf-', dir=path.parent) as directory:
            target = Path(directory) / 'deduplicated.pdf'
            writer = PdfWriter(clone_from=path)
            try:
                writer.compress_identical_objects()
                writer.write(target)
            finally:
                writer.close()
            target.replace(path)
    finally:
        sys.setrecursionlimit(limit)
