"""Run with a candidate mage_latex.py path; all output stays in a temporary root."""
import importlib.util
import json
from pathlib import Path
import re
import sys
import tempfile
import unittest

REPO=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(REPO/'tools'),str(REPO/'book')]
CANDIDATE=REPO/'tools/mage_latex.py'
spec=importlib.util.spec_from_file_location('mage_latex_under_test',CANDIDATE)
mage=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mage)

SOURCE='''# Roundtrip fixture

<!-- label: outside -->
<!-- figure: assets/example.svg | Outside figure. -->

<!-- box-family: inset -->

> #### Inset — A **worked** case {#worked-case}
>
> <!-- point: nested-point | Preserve the editorial claim. | terms: model -->
>
> Before the figure, see [ref:inside-first].
>
> <!-- index-def: nested-term -->
>
> <!-- label: inside-first -->
> <!-- figure: assets/example.svg | *First caption* with [ref:outside]. [short: First view] -->
>
> Between the figures.
>
> <!-- label: inside-second -->
> <!-- figure: assets/example.svg | Second caption with {{quantity}}. -->
>
> After the figure.

Outside again.
'''

class InsetRoundtrip(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix='mage-inset-roundtrip-',dir='/private/tmp')
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.previous_root=mage.ROOT
        mage.ROOT=self.root
        self.addCleanup(setattr,mage,'ROOT',self.previous_root)
        (self.root/'book/assets').mkdir(parents=True)
        (self.root/'book/assets/example.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50"><rect width="100" height="50" fill="white"/><text x="5" y="30">Example</text></svg>')
        self.source=self.root/'chapter.md'
        self.source.write_text(SOURCE)
        self.native=self.root/'chapter.tex'
        self.projected=self.root/'projection.md'

    def migrate(self):
        mage.migrate(self.source,self.native,driver_enabled=False)
        return self.native.read_text()

    def test_migration_preserves_inset_figures_and_editorial_comments(self):
        native=self.migrate()
        box=re.search(r'\\begin\{bookbox\}.*?\\end\{bookbox\}',native,re.S)[0]
        self.assertEqual(native.count(r'\begin{figure}'),3)
        self.assertEqual(box.count(r'\begin{figure}'),2)
        self.assertIn(r'\label{inside-first}',box)
        self.assertIn(r'\label{inside-second}',box)
        self.assertIn('% <!-- point: nested-point | Preserve the editorial claim. | terms: model -->',box)
        self.assertIn('% <!-- index-def: nested-term -->',box)
        self.assertEqual(len(json.loads(self.native.with_suffix('.assets.json').read_text())),3)
        self.assertIn(r'\caption[First view]',box)

    def test_native_compatibility_prefixes_all_restored_figure_lines(self):
        # Exercise projection independently of migration, so each original bug
        # has its own failing regression even when migration drops the image.
        self.native.write_text(r'''% mage-box-prefix: Inset —
\chapter{Projection fixture}
\begin{bookbox}{inset}{A \textbf{worked} case}
\label{worked-case}
% <!-- point: nested-point | Preserve the editorial claim. | terms: model -->
Before.
\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/example.pdf}
\caption[First view]{\emph{First caption} with \autoref{outside}.}
\label{inside-first}
\end{figure}
After.
\end{bookbox}
Outside again.
''')
        self.native.with_suffix('.assets.json').write_text(json.dumps([{'pdf':'book/example.pdf','source':'book/assets/example.svg'}]))
        mage.compatibility(self.native,self.projected)
        projected=self.projected.read_text()
        self.assertIn('> #### Inset — A **worked** case {#worked-case}',projected)
        self.assertIn('> <!-- label: inside-first -->\n> <!-- figure:',projected)
        self.assertIn('> <!-- point: nested-point',projected)
        self.assertIn('[ref:outside]',projected)
        self.assertIn('[short: First view]',projected)
        self.assertNotIn('MAGETOKEN',projected)
        self.assertNotRegex(projected,r'(?m)^<!-- (?:figure|label|point):')

    def test_plain_title_projection_keeps_figure_directive_in_quote(self):
        self.native.write_text(r"""\chapter{Projection fixture}
\begin{bookbox}{inset}{Plain title}
\label{worked-case}
\begin{figure}[htbp]
\centering
\includegraphics[width=\linewidth]{book/example.pdf}
\caption{Inside caption.}
\label{inside-first}
\end{figure}
\end{bookbox}
""")
        self.native.with_suffix('.assets.json').write_text(json.dumps([{'pdf':'book/example.pdf','source':'book/assets/example.svg'}]))
        mage.compatibility(self.native,self.projected)
        projected=self.projected.read_text()
        self.assertIn('> <!-- label: inside-first -->\n> <!-- figure:',projected)
        self.assertNotRegex(projected,r'(?m)^<!-- figure:')

    def test_two_roundtrips_keep_figure_identity_scope_and_editorial_directives(self):
        first=self.migrate()
        mage.compatibility(self.native,self.projected)
        projection=self.projected.read_text()
        second=self.root/'second.tex'
        mage.migrate(self.projected,second,driver_enabled=False)
        second_projection=self.root/'second.md'
        mage.compatibility(second,second_projection)
        regenerated=second.read_text()
        for label in ('outside','worked-case','inside-first','inside-second'):
            self.assertEqual(regenerated.count(r'\label{'+label+'}'),1)
        self.assertEqual(regenerated.count(r'\begin{figure}'),3)
        self.assertEqual(regenerated.count('% <!-- point: nested-point'),1)
        self.assertEqual(regenerated.count('% <!-- index-def: nested-term'),1)
        def directives(text):
            return [line for line in text.splitlines() if re.match(r'^(?:> )?<!-- (?:figure|label|point|index-def):',line)]
        self.assertEqual(directives(projection),directives(second_projection.read_text()))
        for marker in ('inside-first','inside-second'):
            self.assertIn('> <!-- label: '+marker+' -->',projection)
        self.assertIn('<!-- label: outside -->',projection)
        self.assertIn('{{quantity}}',projection)

    def test_missing_inset_asset_fails_instead_of_disappearing(self):
        self.source.write_text(SOURCE.replace('> <!-- figure: assets/example.svg','> <!-- figure: assets/missing.svg',1))
        with self.assertRaises(FileNotFoundError):
            self.migrate()


    def test_captioned_inset_table_keeps_label_caption_and_reference_on_roundtrip(self):
        self.native.write_text(r"""\chapter{Projection fixture}
\begin{bookbox}{inset}{A table case}
\label{worked-case}
Before the table, see \autoref{inside-table}.
\begin{longtable}[]{ll}
\caption[Brief table title]{\emph{Inside table.} Compare the cases.}\label{inside-table}\tabularnewline
\toprule
Input & Outcome \\
\midrule
\endhead
One & Pass \\
\bottomrule
\end{longtable}
After the table.
\end{bookbox}
""")
        self.native.with_suffix('.assets.json').write_text('[]')
        mage.compatibility(self.native,self.projected)
        projected=self.projected.read_text()
        self.assertIn('> <!-- label: inside-table -->\n> <!-- table: *Inside table.* Compare the cases. [short: Brief table title] -->',projected)
        self.assertLess(projected.index('[ref:inside-table]'),projected.index('<!-- label: inside-table -->'))
        self.assertNotRegex(projected,r'(?m)^<!-- (?:label|table):')
        self.assertNotIn('> : *Inside table.',projected)
        second=self.root/'second.tex'
        mage.migrate(self.projected,second,driver_enabled=False)
        regenerated=second.read_text()
        self.assertEqual(regenerated.count(r'\label{inside-table}'),1)
        self.assertIn(r'\caption[Brief table title]',regenerated)
        second_projection=self.root/'second.md'
        mage.compatibility(second,second_projection)
        self.assertIn('> <!-- label: inside-table -->\n> <!-- table: *Inside table.* Compare the cases. [short: Brief table title] -->',second_projection.read_text())

    def test_uncaptioned_inset_table_keeps_existing_projection(self):
        self.native.write_text(r"""\chapter{Projection fixture}
\begin{bookbox}{inset}{A table case}
\label{worked-case}
\begin{longtable}[]{ll}
Input & Outcome \\
\endhead
One & Pass \\
\end{longtable}
\end{bookbox}
""")
        self.native.with_suffix('.assets.json').write_text('[]')
        mage.compatibility(self.native,self.projected)
        projected=self.projected.read_text()
        self.assertIn('> | Input | Outcome |',projected)
        self.assertNotIn('<!-- table:',projected)
        self.assertNotIn('<!-- label:',projected)

    def test_supported_font_wrapper_does_not_hide_unsupported_latex(self):
        self.native.write_text(r"""\chapter{Projection fixture}
\begin{bookbox}{inset}{Unsupported command}
\label{worked-case}
{\footnotesize
\unknownprojectioncommand{This must not disappear.}
}
\end{bookbox}
""")
        self.native.with_suffix('.assets.json').write_text('[]')
        with self.assertRaisesRegex(ValueError, 'Unsupported LaTeX'):
            mage.compatibility(self.native,self.projected)

if __name__=='__main__':
    unittest.main(verbosity=2)
