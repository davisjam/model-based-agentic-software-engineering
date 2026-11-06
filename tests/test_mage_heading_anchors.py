"""Authored native anchors must survive into the web and EPUB renderer."""
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / 'tools'), str(ROOT / 'book')]
import mage_latex
import build_book


@unittest.skipUnless(shutil.which('pandoc'), 'Pandoc required')
class HeadingAnchorTests(unittest.TestCase):
    def project(self, native):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            source, output = root / 'chapter.tex', root / 'chapter.md'
            source.write_text(native)
            source.with_suffix('.assets.json').write_text('[]\n')
            with patch.object(mage_latex, 'ROOT', root):
                mage_latex.compatibility(source, output)
            return output.read_text()

    def test_explicit_natural_slug_resolves_in_rendered_heading(self):
        text = self.project(r'''\chapter{Fixture}
\section{Exploring Alternative Reasoning Engines}\label{exploring-alternative-reasoning-engines}
See \hyperref[exploring-alternative-reasoning-engines]{this section}.
''')
        heading = next(line for line in text.splitlines() if line.startswith('## '))
        html = build_book._render_heading(heading)
        self.assertIn('id="exploring-alternative-reasoning-engines"', html)
        self.assertIn('](#exploring-alternative-reasoning-engines)', text)

    def test_automatic_and_unlabeled_headings_do_not_gain_authored_ids(self):
        text = self.project(r'''% mage-auto-heading: automatic-heading
\chapter{Fixture}
\section{Automatic Heading}\label{heading:automatic-heading}
\section{Unlabeled Heading}
\section{Custom Heading}\label{stable-custom-anchor}
''')
        self.assertIn('## Automatic Heading\n', text)
        self.assertIn('## Unlabeled Heading\n', text)
        self.assertIn('## Custom Heading {#stable-custom-anchor}', text)
        self.assertNotIn('{#fixture}', text)

    def test_explicit_natural_slug_survives_inside_an_inset(self):
        text = self.project(r'''\chapter{Fixture}
\begin{bookbox}{inset}{A case}\label{case}
\subsection{Details}\label{details}
Read \hyperref[details]{the details}.
\end{bookbox}
''')
        self.assertIn('Details {#details}', text)
        self.assertIn('](#details)', text)


if __name__ == '__main__':
    unittest.main()
