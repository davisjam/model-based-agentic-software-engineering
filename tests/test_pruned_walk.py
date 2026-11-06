"""The pruning walk: the prune must equal the filter, and the two predicate kinds must not be swapped.

Every test builds its own fake tree under `tempfile.mkdtemp` and tears it down, so none of these can
read or write a sibling's files, and none depends on the repo's own layout. The properties under test
are the ones a migration can silently break:

  - **The prune equals the filter.** For a monotone predicate, pruning the descent must return exactly
    what walking everything and filtering the results returns. That equivalence is the entire licence
    for the change; a test that only checked "node_modules is absent" would pass a predicate that also
    dropped authored files.
  - **The two predicate kinds are not interchangeable.** `contains` matches inside a segment, `named`
    does not. Swapping them is a silent corpus change at a call site, not an error, so each kind is
    pinned against the case that distinguishes them.
  - **`skip_hidden` reproduces a specific prior reader** — `glob` (True) or a bare `os.walk` (False).
    Getting it wrong moves the output, so both values are pinned.
  - **Walk order survives the prune**, because two consumers of this walker collapse duplicate keys and
    let the first (or last) writer win.
"""
from __future__ import annotations

import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from pruned_walk import contains, named, nothing, walk_files


def _unpruned_then_filtered(top: str, exts: tuple[str, ...], discard, skip_hidden: bool) -> list[str]:
    """The reader this change replaces: walk everything, then discard on the RESULTS."""
    out = []
    for dirpath, dirnames, filenames in os.walk(top):
        if skip_hidden:
            dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for f in filenames:
            if skip_hidden and f.startswith("."):
                continue
            if not f.endswith(exts):
                continue
            path = os.path.join(dirpath, f)
            if discard(os.path.relpath(path, top)):
                continue
            out.append(path)
    return out


class PrunedWalkTests(unittest.TestCase):
    def tree(self, *relpaths: str) -> str:
        """A fake tree holding exactly `relpaths` as files. Returns its root; removed on cleanup."""
        root = tempfile.mkdtemp(prefix="pruned-walk-")
        self.addCleanup(shutil.rmtree, root, True)
        for r in relpaths:
            p = os.path.join(root, r)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "w", encoding="utf-8") as fh:
                fh.write(r)
        return root

    def rels(self, root: str, paths: list[str]) -> list[str]:
        return [os.path.relpath(p, root) for p in paths]

    # ── the prune equals the filter ──────────────────────────────────────────────────────────────────
    def test_prune_returns_exactly_what_walk_then_filter_returns(self):
        root = self.tree("part1/ch1.md", "part1/ch2.md",
                         "node_modules/pkg/README.md", "node_modules/pkg/deep/nested/x.md",
                         "web/projected.md", "web/sub/also.md",
                         "assets/notes.md", "keep/plain.md")
        for discard in (named("node_modules"), named("node_modules", "web", "assets"),
                        contains("node_modules"), nothing):
            pruned = walk_files(root, (".md",), discard=discard, skip_hidden=True)
            filtered = _unpruned_then_filtered(root, (".md",), discard, True)
            self.assertEqual(sorted(pruned), sorted(filtered))
            self.assertEqual(pruned, filtered, "prune must preserve os.walk order, not merely the set")

    def test_prune_removes_the_whole_subtree_not_just_its_top_level(self):
        root = self.tree("node_modules/a.md", "node_modules/p/b.md", "node_modules/p/q/c.md",
                         "keep.md")
        self.assertEqual(self.rels(root, walk_files(root, (".md",),
                                                    discard=named("node_modules"), skip_hidden=True)),
                         ["keep.md"])

    def test_a_file_whose_own_name_the_predicate_rejects_is_still_dropped(self):
        # The per-file check is retained: pruning directories alone would keep this one.
        root = self.tree("part1/node_modules", "part1/ch1.md")
        os.rename(os.path.join(root, "part1", "node_modules"),
                  os.path.join(root, "part1", "node_modules.md"))
        got = self.rels(root, walk_files(root, (".md",), discard=contains("node_modules"),
                                         skip_hidden=True))
        self.assertEqual(got, [os.path.join("part1", "ch1.md")])

    def test_nothing_discards_nothing(self):
        root = self.tree("a.md", "node_modules/b.md", "_design/c.md")
        self.assertEqual(len(walk_files(root, (".md",), discard=nothing, skip_hidden=True)), 3)

    # ── the two predicate kinds are not interchangeable ──────────────────────────────────────────────
    def test_named_keeps_a_longer_segment_that_contains_would_prune(self):
        """`book/web-assets` is the live instance: the citations corpus keeps it, `contains("web")`
        would drop it. Swapping the kinds here narrows a gate's corpus silently."""
        root = self.tree("web/projected.md", "web-assets/authored.md", "part1/ch1.md")
        by_named = self.rels(root, walk_files(root, (".md",), discard=named("web"), skip_hidden=True))
        by_contains = self.rels(root, walk_files(root, (".md",), discard=contains("web"),
                                                 skip_hidden=True))
        self.assertIn(os.path.join("web-assets", "authored.md"), by_named)
        self.assertNotIn(os.path.join("web-assets", "authored.md"), by_contains)
        self.assertNotIn(os.path.join("web", "projected.md"), by_named)
        self.assertNotIn(os.path.join("web", "projected.md"), by_contains)

    def test_contains_prunes_a_longer_segment_that_named_would_walk(self):
        """The mirror case, and the gallery's live one: the draft-SVG walk must skip
        `_print/mermaid-cache`, which `named("mermaid")` descends into."""
        root = self.tree("mermaid-cache/rendered.svg", "mermaid/also.svg", "drafts/real.svg")
        by_contains = self.rels(root, walk_files(root, (".svg",), discard=contains("mermaid"),
                                                 skip_hidden=True))
        by_named = self.rels(root, walk_files(root, (".svg",), discard=named("mermaid"),
                                              skip_hidden=True))
        self.assertEqual(by_contains, [os.path.join("drafts", "real.svg")])
        self.assertIn(os.path.join("mermaid-cache", "rendered.svg"), by_named)

    def test_predicate_sees_a_relative_path_so_the_checkout_location_cannot_prune_the_repo(self):
        """An absolute path carries the checkout's ancestry: a repo under `~/web/` must not prune
        itself. The predicate is handed the path relative to the walk root."""
        outer = tempfile.mkdtemp(prefix="web")  # an ANCESTOR directory carrying the token
        self.addCleanup(shutil.rmtree, outer, True)
        inner = os.path.join(outer, "repo", "book")
        os.makedirs(os.path.join(inner, "part1"))
        with open(os.path.join(inner, "part1", "ch1.md"), "w", encoding="utf-8") as fh:
            fh.write("x")
        self.assertIn("web", os.path.basename(outer), "the fixture must carry the token to be a test")
        self.assertEqual(len(walk_files(inner, (".md",), discard=named("web"), skip_hidden=True)), 1)
        self.assertEqual(len(walk_files(inner, (".md",), discard=contains("web"), skip_hidden=True)), 1)

    def test_a_token_matching_the_walk_root_itself_does_not_empty_the_walk(self):
        root = self.tree("ch1.md")
        renamed = os.path.join(os.path.dirname(root), "web")
        os.rename(root, renamed)
        self.addCleanup(shutil.rmtree, renamed, True)
        self.assertEqual(len(walk_files(renamed, (".md",), discard=named("web"), skip_hidden=True)), 1)

    # ── skip_hidden reproduces a named prior reader ──────────────────────────────────────────────────
    def test_skip_hidden_true_reproduces_glob_which_never_matches_a_leading_dot(self):
        root = self.tree(".cache/x.md", "part1/.hidden.md", "part1/ch1.md")
        self.assertEqual(self.rels(root, walk_files(root, (".md",), discard=nothing, skip_hidden=True)),
                         [os.path.join("part1", "ch1.md")])

    def test_skip_hidden_false_reproduces_os_walk_which_descends_into_dotted_dirs(self):
        root = self.tree(".cache/x.md", "part1/.hidden.md", "part1/ch1.md")
        got = sorted(self.rels(root, walk_files(root, (".md",), discard=nothing, skip_hidden=False)))
        self.assertEqual(got, [os.path.join(".cache", "x.md"),
                               os.path.join("part1", ".hidden.md"),
                               os.path.join("part1", "ch1.md")])

    # ── extensions and order ─────────────────────────────────────────────────────────────────────────
    def test_only_the_named_extensions_come_back(self):
        root = self.tree("a.md", "b.svg", "c.png", "d.txt", "e")
        got = sorted(os.path.basename(p) for p in
                     walk_files(root, (".svg", ".png"), discard=nothing, skip_hidden=True))
        self.assertEqual(got, ["b.svg", "c.png"])

    def test_a_str_exts_fails_loudly_rather_than_matching_by_accident(self):
        """`"".endswith(str)` is legal and matches a DIFFERENT set than a 1-tuple of the same token
        would at a multi-extension call site. A probe that returns a plausible wrong answer is worse
        than one that raises."""
        root = self.tree("a.md")
        with self.assertRaises(AssertionError):
            walk_files(root, ".md", discard=nothing, skip_hidden=True)  # type: ignore[arg-type]

    def test_order_within_a_directory_and_prune_do_not_interact(self):
        """A consumer that collapses duplicate keys depends on which file is seen first. Removing
        entries from `dirnames` must not reorder the siblings that survive.

        Both assertions compare against `_unpruned_then_filtered`, which reaches `os.walk` directly.
        Comparing one `walk_files` call to another cannot catch a lost order at all — a mutation that
        reorders the result reorders both arms — and comparing the winner to `pruned[0]` is
        tautological. Only an independent reader is a reference."""
        root = self.tree("a/one.md", "b/one.md", "drop/one.md", "c/one.md")
        reference = _unpruned_then_filtered(root, (".md",), named("drop"), True)
        pruned = walk_files(root, (".md",), discard=named("drop"), skip_hidden=True)
        self.assertEqual(pruned, reference)

        def first_wins(paths: list[str]) -> dict[str, str]:
            out: dict[str, str] = {}
            for p in paths:
                out.setdefault(os.path.basename(p), p)
            return out

        self.assertEqual(len(first_wins(pruned)), 1, "the fixture must collide on a basename")
        self.assertEqual(first_wins(pruned), first_wins(reference))

    def test_a_trailing_separator_on_the_root_does_not_shift_the_relative_path(self):
        root = self.tree("node_modules/x.md", "part1/ch1.md")
        self.assertEqual(walk_files(root, (".md",), discard=named("node_modules"), skip_hidden=True),
                         walk_files(root + os.sep, (".md",), discard=named("node_modules"),
                                    skip_hidden=True))

    def test_an_empty_tree_returns_an_empty_list_rather_than_raising(self):
        root = tempfile.mkdtemp(prefix="pruned-walk-empty-")
        self.addCleanup(shutil.rmtree, root, True)
        self.assertEqual(walk_files(root, (".md",), discard=nothing, skip_hidden=True), [])


class MigratedCallSiteTests(unittest.TestCase):
    """The call sites' own predicates, pinned against the fake tree each one's filter was written for.

    These are the assertions that would have caught a swapped predicate kind during the migration —
    the failure the module's docstring warns about, in the shape each site would have taken it."""

    def tree(self, *relpaths: str) -> str:
        root = tempfile.mkdtemp(prefix="pruned-walk-site-")
        self.addCleanup(shutil.rmtree, root, True)
        for r in relpaths:
            p = os.path.join(root, r)
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "w", encoding="utf-8") as fh:
                fh.write(r)
        return root

    def test_citations_corpus_predicate_keeps_authored_prose_and_drops_the_vendored_tree(self):
        from tests.citations import _NON_SOURCE_DIRS
        self.assertIn("node_modules", _NON_SOURCE_DIRS,
                      "the CITE-PLACEMENT corpus must exclude the vendored npm tree")
        root = self.tree("part1/ch1.md", "web/projected.md", "web-assets/authored.md",
                         "node_modules/pkg/README.md", "latex/build/appendix.md", "assets/x.md")
        got = sorted(os.path.relpath(p, root) for p in
                     walk_files(root, (".md",), discard=named(*_NON_SOURCE_DIRS), skip_hidden=True))
        self.assertEqual(got, [os.path.join("part1", "ch1.md"),
                               os.path.join("web-assets", "authored.md")])

    def test_logo_predicate_prunes_only_what_the_checks_own_filter_rejects(self):
        """`site/` stays walkable: the filter's `/site/` needs both slashes, so a top-level
        `site/…/logo.svg` is a finding the check must keep reporting."""
        root = self.tree("site/pkg/logo.svg", "node_modules/fa/brand-logo-full.svg",
                         "book/assets/figure.svg", "vendored-logo.png")
        got = sorted(os.path.relpath(p, root) for p in
                     walk_files(root, (".svg", ".png"), discard=contains("node_modules", ".venv"),
                                skip_hidden=True)
                     if "logo" in os.path.basename(p))
        self.assertEqual(got, [os.path.join("site", "pkg", "logo.svg"), "vendored-logo.png"])


if __name__ == "__main__":
    unittest.main()
