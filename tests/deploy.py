"""Deploy-staging manifest gates — pins `catalog._is_publishable`, the predicate `deploy github` uses to
decide which NEW untracked files a rebuild-site commit may auto-stage.

The load-bearing regression: a `_design/` working draft must NEVER auto-stage, at ANY extension. The
extension exclusion alone kept `.md` drafts out but let a `.svg` under `book/_design/drafts/` slip into a
publish commit (deploy #3 leaked `book/_design/drafts/brownfield-260805/figure-wiki-linkage.svg`). This
check walks the guard from both sides: every `_design/` path is rejected regardless of extension, and a
legit figure OUTSIDE `_design/` still publishes.
"""
from __future__ import annotations

import catalog

from tests.common import FAIL, PASS


def check_deploy_publishable():
    """`_is_publishable` rejects ANY `_design/` path (draft prose AND draft figures/data), and still
    accepts a real derived build output under a content root outside `_design/`."""
    # (path, expected) — reject-under-_design cases span multiple extensions and depths.
    cases = [
        # The exact deploy-#3 leak, plus siblings at other exts/depths under _design/.
        ("book/_design/drafts/brownfield-260805/figure-wiki-linkage.svg", False),
        ("book/_design/x.html", False),
        ("book/_design/harvest/y.svg", False),
        ("book/_design/drafts/appendix-c-glyphs/graph.svg", False),
        ("book/_design/foo.json", False),
        ("book/_design/note.md", False),  # already rejected pre-fix (md), still rejected
        # Legit derived build outputs OUTSIDE _design/ must STILL publish.
        ("book/assets/real-figure.svg", True),
        # The retired hand-rolled flat book page (C3): gitignored AND rejected — the web book is the
        # emitted book/web/ tree (never committed), so a stray flat page must not auto-stage.
        ("book/foo.html", False),
        ("product/some-family/mechanism.html", True),
        # Non-derived source / unexpected scratch outside _design/ stays unpublishable.
        ("book/chapter.md", False),          # hand-authored source (.md)
        ("book/helper.mjs", False),          # unexpected ext
        ("README.md", False),                # not under a content root
    ]
    issues = []
    for path, want in cases:
        got = catalog._is_publishable(path)
        if got != want:
            issues.append(f"_is_publishable({path!r}) == {got}, expected {want}")
    return (FAIL if issues else PASS), issues
