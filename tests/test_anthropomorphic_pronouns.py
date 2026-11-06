"""The `anthropomorphic-pronoun` check: a narrow pattern earns its keep only if the narrowness holds.

THE FAILURE CLASS this file guards is not the one the check guards. The check stops an agent or model
noun taking *who* / *whom*. These tests stop the check from GROWING TEETH IT MUST NOT HAVE. The 261106
audit (`.scratch/pronoun-audit-261106.md`) found 197 raw pronoun hits in the manuscript triaging to
exactly ONE finding; the other 196 are correct English in three classes, and a check that flagged any of
them would be bypassed within a day — which is worse than no check, because the policy would then look
enforced. So every class is pinned here as a NEGATIVE control, next to the positive one.

`whose` is the sharpest of the three: 91 occurrences, every one inanimate, and the policy's ban list
deliberately omits it while its audit paragraph asks for it to be inspected. The exclusion is structural
(`\bwhom?\b` cannot reach inside *whose*), and `test_whose_is_structurally_unreachable` pins that
structure rather than trusting the prose that records it.

Everything below builds a FAKE source tree in a temp directory and points `--root` at it, so nothing
here can edit a file a live sibling is reading and nothing can reach the real manuscript. The two
exceptions read the real tree and never write to it: the author named two legitimate `who` sites to
protect, and a pin that only ever saw synthetic text would not notice if either left scope.
"""
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
import check_anthropomorphic_pronouns as checker

REAL_ROOT = Path(__file__).resolve().parents[1]


class FakeTree(unittest.TestCase):
    """A manifest-declared source tree with nothing in it but what a test puts there."""

    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix='pronoun-check-'))
        self.addCleanup(shutil.rmtree, self.root, True)
        (self.root / 'book/latex/sources/part1').mkdir(parents=True)
        (self.root / 'book/tikz/figures').mkdir(parents=True)
        self.source = 'book/latex/sources/part1/1.1-chapter.tex'
        self.write(self.source, 'A paragraph that personifies nothing.\n')
        self.declare([self.source])

    def write(self, rel, text):
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')
        return path

    def declare(self, sources):
        """Write the native-source manifest the check derives its `.tex` scope from."""
        rows = [{'source': rel, 'projection': rel.replace('latex/sources/', '') .replace('.tex', '.md'),
                 'source_hash': 'x', 'projection_hash': 'y'} for rel in sources]
        self.write('book/latex/native-sources.json', json.dumps({'sources': rows}))

    def findings(self):
        return checker.findings(str(self.root))

    def run_main(self):
        return checker.main(['--root', str(self.root)])

    def scope(self):
        return checker.authored_files(str(self.root))


class TheOneRealFinding(FakeTree):
    """The positive control: the shape the audit actually found, and the nouns around it."""

    def test_the_audit_finding_is_reported_with_its_file_and_line(self):
        """Verbatim from `frontmatter/0.5-preface.tex:75` before its repair — the whole reason to check."""
        self.write(self.source, 'First line.\nSecond line.\n'
                                'It was just me and Claude, who produces software far faster than I '
                                'can inspect.\n')
        found = self.findings()
        self.assertEqual(len(found), 1, found)
        self.assertTrue(found[0].startswith(f'{self.source}:3 '), found[0])
        self.assertIn("'Claude, who'", found[0])
        self.assertIn('lexicon', found[0], 'a finding must name the policy that justifies it')

    def test_every_system_noun_and_both_pronouns_fire(self):
        for phrase in ('the agent who selects the next step',
                       'the agents who share a worktree',
                       'the foundation model who answers',
                       'the foundation models whom we evaluate',
                       'the model who proposes a patch',
                       'the models whom we rank',
                       'Claude, whom the engineer supervises',
                       'the AGENT WHO decides'):
            with self.subTest(phrase=phrase):
                self.write(self.source, phrase + '\n')
                self.assertEqual(len(self.findings()), 1, phrase)

    def test_an_attached_pronoun_survives_a_single_line_wrap(self):
        """Forward-policing only — today's sources are one paragraph per line. A hard-wrapped
        paragraph must not open a blind spot, so the gap admits ONE newline."""
        self.write(self.source, 'we hand the work to the agent,\nwho then reports what it changed\n')
        self.assertEqual(len(self.findings()), 1)


class TheThreeFalsePositiveClasses(FakeTree):
    """196 of the audit's 197 hits. Each must stay green, or the check gets bypassed."""

    def green(self, text):
        self.write(self.source, text)
        self.assertEqual(self.findings(), [], f'false positive on: {text!r}')

    def test_interrogative_who_is_not_a_finding(self):
        """46 occurrences. The book's ownership vocabulary is built on this question, and it asks
        about PEOPLE — `who owns this job`, `Who supplies the production system?`."""
        for text in ('Who owns this job?',
                     'Engineers must also decide who chooses the reference value.',
                     '\\section{Who supplies the production system?}',
                     '\\textbf{Authority.} Who is entitled to exercise engineering judgment.',
                     'The model answers one question. Who owns the result?',
                     'An agent acts. Who had authority to establish those terms?'):
            with self.subTest(text=text):
                self.green(text)

    def test_human_referent_relative_who_is_not_a_finding(self):
        """36 occurrences. Correct and required: the people in the book are people."""
        for text in ('the engineers who own the affected code hold merge authority',
                     'institutions from whom an account can be demanded',
                     'asks almost nothing of a reader who already shares its context',
                     'the engineer who supplied the original judgment',
                     'they leave when the person who learned them does'):
            with self.subTest(text=text):
                self.green(text)

    def test_whose_with_an_inanimate_antecedent_is_not_a_finding(self):
        """91 occurrences, every one inanimate. The policy's ban list omits `whose` on purpose; a
        check that flagged it would commission 91 spurious edits in one pass."""
        for text in ('a model whose inputs are marked',
                     'a control whose purpose has disappeared',
                     'an agent whose lease has expired',
                     'selects a model whose capability and cost are appropriate',
                     'a requirement whose satisfaction depends on agentic inference'):
            with self.subTest(text=text):
                self.green(text)

    def test_whose_is_structurally_unreachable(self):
        """Pins the MECHANISM, not the sample: the trailing `s` denies `\\bwhom?\\b` its word
        boundary, so no `whose` can ever be matched however the noun set grows."""
        for noun in ('agent', 'agents', 'foundation model', 'model', 'Claude'):
            with self.subTest(noun=noun):
                self.assertIsNone(checker._PATTERN.search(f'a {noun} whose inputs are marked'))
                self.assertIsNotNone(checker._PATTERN.search(f'a {noun} who marks its inputs'))

    def test_a_paragraph_break_is_not_an_attachment(self):
        """A blank line IS the paragraph break in LaTeX. Gluing one paragraph's last noun to the
        next paragraph's opening interrogative would manufacture the commonest false positive of
        all — the end of a sentence about a model followed by `Who owns this?`."""
        self.green('we delegate the work to the agent\n\nWho owns the result?\n')
        self.green('we delegate the work to the agent\n\n\nWhom do we ask?\n')

    def test_a_sentence_boundary_is_not_an_attachment(self):
        self.green('That is the job of the agent. Who reviews it is a separate question.')


class WhatIsScanned(FakeTree):
    """Scope. A confident zero over the wrong files is worse than no check."""

    def test_the_tex_scope_is_the_manifest_not_a_glob(self):
        """So a chapter added or renamed enters scope with no edit to the check."""
        second = 'book/latex/sources/part2/2.1-chapter.tex'
        self.write(second, 'the agent who decides\n')
        self.assertEqual(self.findings(), [], 'an undeclared file was scanned')
        self.declare([self.source, second])
        self.assertEqual(len(self.findings()), 1, 'a declared file went unscanned')

    def test_the_generated_markdown_projection_is_out_of_scope(self):
        """The lesson of `9acaead5a`: police the authored LaTeX, not the projection. A finding in
        `book/part1/*.md` names a line the next `mage_latex.py sync` overwrites, and double-reports
        the real one in its source."""
        self.write('book/part1/1.1-chapter.md', 'the agent who decides\n')
        self.assertEqual(self.findings(), [])
        self.assertNotIn('book/part1/1.1-chapter.md', self.scope())

    def test_hand_authored_figure_labels_are_scanned(self):
        """A figure LABEL is prose a reader sees, and the policy names figure labels explicitly."""
        self.write('book/tikz/figures/model-classes.tex',
                   '\\node (n) {\\textbf{OWNERSHIP}\\\\the agent who controls it};\n')
        found = self.findings()
        self.assertEqual(len(found), 1, found)
        self.assertIn('book/tikz/figures/model-classes.tex:1', found[0])

    def test_a_generated_figure_is_excluded_by_its_banner_not_by_name(self):
        """So a NEW generated figure drops out of scope with no edit here — the same reason the
        `.tex` set is derived from the manifest rather than listed."""
        self.write('book/tikz/figures/f1-chart.tex',
                   '% GENERATED by tools/mage_tikz_charts.py — do not hand-edit\n'
                   '\\node {the agent who plots};\n')
        self.assertEqual(self.findings(), [])
        self.assertNotIn('book/tikz/figures/f1-chart.tex', self.scope())

    def test_the_authored_non_latex_surfaces_are_scanned_when_present(self):
        for rel in checker._AUTHORED_EXTRAS:
            with self.subTest(surface=rel):
                self.write(rel, 'Claude, who answers.\n')
                found = [row for row in self.findings() if row.startswith(rel)]
                self.assertEqual(len(found), 1, f'{rel} went unscanned')
                os.remove(self.root / rel)

    def test_every_declared_authored_extra_exists_in_the_real_tree(self):
        """Guards the silent-drop direction the test above cannot see: a file renamed in the repo
        leaves its entry here matching nothing, and the surface stops being checked with no error."""
        missing = [rel for rel in checker._AUTHORED_EXTRAS if not (REAL_ROOT / rel).is_file()]
        self.assertEqual(missing, [], 'declared authored surfaces that no longer exist')


class WhatIsNotProse(FakeTree):
    """Text a reader never sees, and text that only LOOKS like prose."""

    def test_a_plain_latex_comment_is_not_scanned(self):
        self.write(self.source, '% the agent who decides is a note to self\nReal prose.\n')
        self.assertEqual(self.findings(), [])

    def test_a_structured_decorator_comment_is_scanned(self):
        """`% <!-- point: … -->` text RENDERS — a `point:` gloss becomes a margin note, a `gloss:`
        an entry in the book's language section — and the policy covers captions and glossary
        entries. So these comments are prose and the metadata ones are not."""
        self.write(self.source, '% <!-- point: slug | the agent who decides | terms: x -->\n')
        self.assertEqual(len(self.findings()), 1)

    def test_a_listing_interior_shows_text_as_an_example(self):
        self.write(self.source, '\\begin{verbatim}\nthe agent who decides\n\\end{verbatim}\n')
        self.assertEqual(self.findings(), [])

    def test_a_fenced_markdown_block_is_not_prose(self):
        self.write('book/index-terms.md', '```\nClaude, who answers\n```\n')
        self.assertEqual(self.findings(), [])

    def test_blanking_preserves_line_numbers(self):
        """Comments and listings are BLANKED, not removed, so a finding cites the line the author
        must open. Dropping them would shift every line below and send the author to the wrong one."""
        self.write(self.source, '% a comment\n'
                                '\\begin{verbatim}\nsample\n\\end{verbatim}\n'
                                'and then the agent who decides\n')
        found = self.findings()
        self.assertEqual(len(found), 1, found)
        self.assertIn(f'{self.source}:5 ', found[0])


class PreconditionsFailLoud(FakeTree):
    """A scan narrower than it claims to be must refuse, not report clean."""

    def test_an_empty_manifest_refuses(self):
        self.declare([])
        with self.assertRaises(checker.PreconditionFailure):
            self.findings()
        self.assertEqual(self.run_main(), 1)

    def test_a_declared_source_missing_from_disk_refuses(self):
        self.declare([self.source, 'book/latex/sources/part9/9.9-absent.tex'])
        with self.assertRaises(checker.PreconditionFailure):
            self.findings()
        self.assertEqual(self.run_main(), 1)

    def test_an_unreadable_manifest_refuses(self):
        self.write('book/latex/native-sources.json', '{not json')
        with self.assertRaises(checker.PreconditionFailure):
            self.findings()
        self.assertEqual(self.run_main(), 1)


class ExitCodes(FakeTree):
    """The gate contract: 0 clean, 1 on any finding. A check nobody has watched fail is not a check."""

    def test_clean_tree_exits_zero(self):
        self.assertEqual(self.run_main(), 0)

    def test_one_finding_exits_one(self):
        self.write(self.source, 'Claude, who produces software faster than I can inspect.\n')
        self.assertEqual(self.run_main(), 1)

    def test_list_scope_exits_zero_even_with_a_finding(self):
        """`--list-scope` answers *what is checked*, which is not a verdict on the tree."""
        self.write(self.source, 'Claude, who produces.\n')
        self.assertEqual(checker.main(['--root', str(self.root), '--list-scope']), 0)


class TheAuthorsProtectedSites(unittest.TestCase):
    """READ-ONLY against the real tree. The author named two legitimate `who` sites by hand —
    *"Who is entitled to exercise engineering judgment"* and a figure's *"OWNERSHIP / Who
    controls?"* — and said he would not mechanically replace every occurrence of `who` because that
    would damage legitimate discussions of human authority. Both are IN SCOPE and both are GREEN;
    this pins the pair, so a later widening of the pattern that reached them fails here by name."""

    SITES = (
        ('book/latex/sources/frontmatter/0.4-the-books-language.tex',
         'Who is entitled to exercise engineering judgment'),
        ('book/tikz/figures/model-classes.tex', 'Who controls?'),
    )

    def test_both_sites_are_in_scope_and_produce_no_finding(self):
        scope = checker.authored_files(str(REAL_ROOT))
        for rel, phrase in self.SITES:
            with self.subTest(site=rel):
                self.assertIn(rel, scope, 'the site left scope, so its greenness proves nothing')
                text = checker.scannable_text(rel, str(REAL_ROOT))
                self.assertIn(phrase, text, 'the protected phrase is gone or no longer renders')
                self.assertIsNone(checker._PATTERN.search(text),
                                  f'{rel} now reports a finding; the author protected this file')


if __name__ == '__main__':
    unittest.main()
