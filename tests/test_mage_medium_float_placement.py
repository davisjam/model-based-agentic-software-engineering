"""Scoped medium diagrams and native partners may use pages with prose."""
from pathlib import Path
import json
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from mage_figure_layout import apply_figure_print_layout
from test_mage_inset_publication import InsetPublicationTests


class MediumFigurePolicyTests(unittest.TestCase):
    def test_only_selected_original_changes_placement_without_resizing(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'layout.json'
            rule={'version':1,'figures':{'selected':{'width_bp':450,'placement':'centered','float_placement':'!htb'}}}
            path.write_text(json.dumps(rule))
            selected=r'\begin{figure}[htbp]\includegraphics[width=\linewidth,alt={Meaning}]{art.pdf}\caption{Caption.}\label{selected}\end{figure}'
            other=selected.replace('{selected}','{other}')
            result=apply_figure_print_layout(selected+other,path)
            self.assertEqual(result,selected.replace('[htbp]','[!htb]').replace(r'width=\linewidth','width=450bp')+other)
            rule['figures']['selected']['float_placement']='H';path.write_text(json.dumps(rule))
            with self.assertRaisesRegex(ValueError,'scoped float placement'):
                apply_figure_print_layout(selected,path)

    def test_scoped_float_policy_cannot_override_inline_inset(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'layout.json'
            path.write_text(json.dumps({'version':1,'figures':{'a':{'width_bp':270,'placement':'centered','inset_placement':'inline','float_placement':'!htb'}}}))
            with self.assertRaisesRegex(ValueError,'inset mode'):
                apply_figure_print_layout('',path)


class MediumNativePairTests(InsetPublicationTests):
    test_fullbook_pair_preserves_panel_caption_number_alt_and_native_size=None
    test_approved_native_replacement_keeps_one_numbered_panel=None
    test_mainline_pair_does_not_gain_inset_decoration=None

    def test_explicit_text_page_policy_reaches_unscaled_native_partner(self):
        self.figure=self.figure.replace(r'\begin{bookinsetfigure}{inset}{A \emph{formatted} title}','').replace(r'\end{bookinsetfigure}','').replace('[htbp]','[!htb]')
        result=self.publish()
        self.assertEqual(result.count(r'\begin{figure}[!htb]'),2)
        self.assertIn(r'\includegraphics[page=3,alt={Native diagram meaning.}]{pool.pdf}',result)
        self.assertEqual(result.count(r'\label{stable-figure}'),1)
