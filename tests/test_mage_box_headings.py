"""Local heading structure survives projection and retains print keep-with-next."""
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import mage_latex


class BoxHeadingTests(unittest.TestCase):
    def test_mainline_heading_and_ordinary_bold_prose_are_unchanged(self):
        source = r'\subsection{Mainline} Body. \begin{quote}\textbf{A bold claim.} Body.\end{quote}'
        self.assertEqual(mage_latex.format_box_headings(source), source)

    def test_local_heading_keeps_formatting_and_anchor_without_forced_break(self):
        source = (r'\begin{quote}\subsection{Field note --- \emph{The counterfactual}}'
                  r'\label{fieldnote} The first paragraph.\end{quote}')
        actual = mage_latex.format_box_headings(source)
        self.assertIn(r'\bookboxheading{Field note --- \emph{The counterfactual}}\label{fieldnote}', actual)
        self.assertIn('The first paragraph.', actual)
        self.assertNotIn(r'\clearpage', actual)
        self.assertNotIn(r'\newpage', actual)
        self.assertEqual(mage_latex.format_box_headings(actual), actual)

    def test_semantic_inset_subhead_survives_native_projection_roundtrip(self):
        source = r'''\chapter{Fixture}
\begin{bookbox}{inset}{Worked example}
\label{case}
\paragraph{One dependency used for execution and analysis}
DocAble's remediation subsystem illustrates how declarations support both uses.
\end{bookbox}
'''
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder).resolve()
            native, markdown, reparsed = (root/name for name in ('native.tex', 'projected.md', 'reparsed.tex'))
            native.write_text(source)
            native.with_suffix('.assets.json').write_text('[]')
            with patch.object(mage_latex, 'ROOT', root):
                mage_latex.compatibility(native, markdown)
                mage_latex.migrate(markdown, reparsed, driver_enabled=False)
            actual = mage_latex.format_box_headings(reparsed.read_text())
            self.assertIn(r'\bookboxheading{One dependency used for execution and analysis}', actual)
            self.assertIn('remediation subsystem illustrates', actual)
            self.assertIn(r'\begin{bookbox}{inset}{Worked example}', actual)


if __name__ == '__main__':
    unittest.main()
