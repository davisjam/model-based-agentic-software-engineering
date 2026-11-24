"""An episode lesson must survive native projection as a complete paragraph."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import mage_latex


class EngineeringLessons(unittest.TestCase):
    def test_lessons_preserve_nested_content_and_surrounding_prose(self):
        with tempfile.TemporaryDirectory(dir=mage_latex.ROOT) as directory:
            source = Path(directory) / 'episode.tex'
            target = Path(directory) / 'episode.md'
            source.write_text(r'''\chapter{Episode}
Before.

\engineeringlesson{Check the \texttt{input} before accepting the result.}

Between.

\engineeringlesson{Models can guide the next experiment.}

After.
''')
            source.with_suffix('.assets.json').write_text('[]')
            mage_latex.compatibility(source, target)
            html = mage_latex.bb.md_to_html(target.read_text())
        self.assertIn('<em>Lesson: Check the <code>input</code> before accepting the result.</em>', html)
        self.assertIn('<em>Lesson: Models can guide the next experiment.</em>', html)
        self.assertEqual(html.count('Lesson:'), 2)
        for paragraph in ('Before.', 'Between.', 'After.'):
            self.assertIn('<p>' + paragraph + '</p>', html)
        self.assertNotIn('engineeringlesson', html)


if __name__ == '__main__':
    unittest.main()
