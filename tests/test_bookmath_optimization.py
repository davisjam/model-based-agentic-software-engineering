"""An optimization must retain policy symbols, constraints and row alignment."""
import sys
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'book'))
from bookmath import MathError, to_mathml, to_typst

NS = {'m': 'http://www.w3.org/1998/Math/MathML'}


class OptimizationMathTests(unittest.TestCase):
    def test_policy_objective_and_continued_constraints_are_semantic_math(self):
        formula = (r'\begin{aligned}\min_{\pi\in\Pi}&\mathbb{E}_{\pi}[C]\\'
                   r'\text{subject to}&D\ge 1,\\'
                   r'&\mathcal{A}(\pi,H)=\text{acceptable},\\'
                   r'&A\le B.\end{aligned}')
        math = ET.fromstring(to_mathml(formula, display=True))
        rows = math.findall('.//m:mtable/m:mtr', NS)
        self.assertEqual(len(rows), 4)
        self.assertTrue(all(len(row.findall('m:mtd', NS)) == 2 for row in rows))
        self.assertEqual(''.join(rows[2][0].itertext()), '')
        self.assertIsNotNone(math.find('.//m:mi[@mathvariant="double-struck"]', NS))
        identifiers = [n.text for n in math.findall('.//m:mi', NS)]
        self.assertIn('π', identifiers)
        self.assertIn('Π', identifiers)
        self.assertIn('acceptable', ''.join(math.itertext()))
        self.assertIn('bb(E)', to_typst(formula))

    def test_empty_rows_or_missing_right_expressions_still_fail(self):
        for formula in [r'\begin{aligned}&\end{aligned}',
                        r'\begin{aligned}a&\\b&=c\end{aligned}',
                        r'\begin{aligned}a&=b\\c\end{aligned}']:
            with self.subTest(formula=formula), self.assertRaises(MathError):
                to_mathml(formula)

    def test_blackboard_font_requires_one_letter(self):
        with self.assertRaises(MathError):
            to_mathml(r'\mathbb{cost}')


if __name__ == '__main__':
    unittest.main()
