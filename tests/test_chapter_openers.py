"""The chapter-opening gate follows the approved question/Key Ideas design."""
from pathlib import Path
import re
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'book'))
import build_book as bb


class ChapterOpenerTests(unittest.TestCase):
    def inspect(self, pages, titles):
        with patch.object(bb, '_pdf_per_page_text', return_value=pages):
            return bb._pdf_part_opener_spread(
                Path('unused.pdf'), titles, lambda s: re.sub(r'\s+', ' ', s).strip(), False)

    def test_all_seven_chapters_without_vocabulary_bands(self):
        titles = {n: f'Topic {n}' for n in range(1, 8)}
        pages = ['Contents ' + ' '.join(f'Chapter {n}: {t}' for n, t in titles.items())]
        pages += [f'Chapter {n}: {t}\nQUESTION THIS CHAPTER ANSWERS\nQuestion?\nKEY IDEAS\nArgument.'
                  for n, t in titles.items()]
        # A body page separates successive opening apparatus in an actual book.
        interleaved = [pages[0]]
        for page in pages[1:]:
            interleaved.extend([page, 'The chapter develops its argument.'])
        results = self.inspect(interleaved, titles)
        self.assertEqual(len(results), 7)
        self.assertTrue(all(row['ok'] for row in results))
        self.assertEqual([r['opener'] for r in results], [2, 4, 6, 8, 10, 12, 14])

    def test_key_ideas_spill_is_rejected(self):
        result = self.inspect(['Chapter 1: Topic\nQUESTION THIS CHAPTER ANSWERS\nQuestion?',
                               'KEY IDEAS\nArgument.'], {1: 'Topic'})[0]
        self.assertFalse(result['ok'])
        self.assertFalse(result['fits_one_page'])

    def test_old_vocabulary_band_does_not_stand_in_for_key_ideas(self):
        result = self.inspect(['Chapter 1: Topic\nQUESTION THIS CHAPTER ANSWERS\nNEW HERE\nTerms.'],
                              {1: 'Topic'})[0]
        self.assertFalse(result['carries_nav'])
        self.assertFalse(result['ok'])


if __name__ == '__main__':
    unittest.main()
