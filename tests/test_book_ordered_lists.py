"""Developed numbered steps remain one ordered list in web/EPUB output."""
from html.parser import HTMLParser
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'book'))
import build_book as bb


class ListStructure(HTMLParser):
    def __init__(self):
        super().__init__()
        self.lists = []
        self.in_list = False
        self.prose_in_list = False

    def handle_starttag(self, tag, attrs):
        if tag == 'ol':
            self.lists.append([dict(attrs).get('start', '1'), 0])
            self.in_list = True
        elif tag == 'li':
            self.lists[-1][1] += 1
        elif tag == 'p' and self.in_list:
            self.prose_in_list = True

    def handle_endtag(self, tag):
        if tag == 'ol':
            self.in_list = False


class OrderedListTests(unittest.TestCase):
    def parse(self, markdown):
        parsed = ListStructure()
        parsed.feed(bb.md_to_html(markdown))
        return parsed

    def test_seven_developed_steps_are_one_list(self):
        markdown = '\n\n'.join(f'{n}. **Step {n}.** A developed explanation.'
                                for n in range(1, 8))
        result = self.parse('Introduction.\n\n' + markdown + '\n\nClosing explanation.')
        self.assertEqual(result.lists, [['1', 7]])
        self.assertFalse(result.prose_in_list)

    def test_prose_separates_lists_and_preserves_restart(self):
        result = self.parse('3. Third.\n\n4. Fourth.\n\nA new procedure.\n\n1. First.')
        self.assertEqual(result.lists, [['3', 2], ['1', 1]])

    def test_existing_tight_list(self):
        self.assertEqual(self.parse('1. One.\n2. Two.').lists, [['1', 2]])


if __name__ == '__main__':
    unittest.main()
