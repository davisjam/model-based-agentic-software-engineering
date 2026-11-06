#!/usr/bin/env python3
"""One pruning file-walk, shared by the book emitters and the gate checks.

Both reach the filesystem the same way and used to reach it the expensive way: `glob.glob(...,
recursive=True)` expands a whole subtree BEFORE any filter runs, and the caller then discards
`node_modules` / `_design` / `web` ON THE RESULTS. Under `book/` that is waste by construction —
`book/node_modules` alone holds 35,536 entries across 2,218 directories, 76% of every `book/**`
traversal, and nothing here reads a byte of it.

PRUNE INSTEAD OF FILTER, AND THE PRUNE IS EXACTLY THE FILTER. A discard predicate here must be
MONOTONE UNDER PATH EXTENSION: reject a directory and it rejects every descendant. Skipping the
directory then removes exactly the set the caller's own per-file filter would have removed, so the
output cannot move. Both predicates below are monotone — substring containment survives appending a
segment, and a path's segment set only grows — and `walk_files` keeps the per-file check as well, so
a FILE whose own name the predicate rejects is still dropped. A hardcoded second list of
prune-directories could drift from the filter it stands in for; one predicate cannot.

TWO PREDICATE KINDS, because the call sites' own filters are not all one kind, and reusing the wrong
one is a silent corpus change rather than an error. Measured 261106 across this tree's 4,771
directories:

  - `contains("mermaid")` matches `book/_print/mermaid-cache` and `book/node_modules/@mermaid-js/…`;
    `named("mermaid")` matches none of those 34 directories. A caller whose own filter reads
    `"mermaid" in path` needs `contains`, or the prune quietly stops pruning.
  - `named("web")` leaves `book/web-assets` alone; `contains("web")` prunes it. A caller whose filter
    tests path SEGMENTS needs `named`, or the prune drops authored files the filter keeps — the
    dangerous direction, since a gate then reports on a corpus nobody chose. Eight directories under
    `book/` and 160 repo-wide disagree this way.

A GLOB IS WORSE THAN IT LOOKS, which is why estimates of this cost ran low: for a `recursive=True`
pattern whose last component is not `**`, CPython scans every directory TWICE — once to recurse
through `**`, once to match the trailing `*.ext`. Measured: `glob('book/**/*.md', recursive=True)`
opens 5,788 directories where `os.walk('book/')` opens 2,914.

Stdlib-only, and it imports nothing from this repo. `book/build_visual_aids.py` runs standalone on a
bare checkout, so this module may not reach for `catalog` — which is why it does not live in
`tests/common.py`, whose first act is `import catalog`. `tools/` is a flat script directory; import
this the way both trees already import `tools/latex_reuse.py`:

    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import pruned_walk
"""
from __future__ import annotations

import os
from typing import Callable

#: A discard predicate. `walk_files` hands it each candidate path RELATIVE to the walk root, never an
#: absolute one — an absolute path carries the checkout's own ancestry, so a repo living under `~/web/`
#: would otherwise prune itself. MUST be monotone under path extension (see the module docstring).
Discard = Callable[[str], bool]


def nothing(_path: str) -> bool:
    """Discard no directory. For a walk whose caller genuinely has no exclusions — named rather than
    spelled as a lambda at each call site, so `grep` finds every unpruned walk in one query."""
    return False


def contains(*tokens: str) -> Discard:
    """Discard any path carrying one of `tokens` as a SUBSTRING.

    For a caller whose own filter reads `any(t in path for t in tokens)`. Wider than `named`: a token
    also matches inside a longer segment (`"mermaid"` matches `mermaid-cache`), which is right when
    that is what the filter does and wrong when it is not."""
    def discard(path: str) -> bool:
        return any(t in path for t in tokens)
    return discard


def named(*names: str) -> Discard:
    """Discard any path carrying one of `names` as a whole path SEGMENT.

    For a caller whose own filter tests `path.split(os.sep)` membership — the narrower rule, and
    usually the intended one, since what a caller means by "skip `web`" is a directory called `web`
    and not every path with those three letters in it."""
    wanted = frozenset(names)

    def discard(path: str) -> bool:
        return not wanted.isdisjoint(path.split(os.sep))
    return discard


def walk_files(top: str, exts: tuple[str, ...], *, discard: Discard, skip_hidden: bool) -> list[str]:
    """Absolute paths under `top` ending in one of `exts`, never descending into a directory `discard`
    rejects.

    Returns in `os.walk` top-down order. That order is LOAD-BEARING wherever the consumer collapses
    duplicate keys — the gallery's chapter-figure map keys on a file stem and lets the LAST writer win
    (eight trees share some stems), its draft-SVG map keys on a basename and lets the FIRST win (~140
    drafts share one), and the page-fit gate's caption map keys on an asset basename. A consumer that
    accumulates into a set is order-free; one that overwrites a key is not. Verify equivalence per
    site rather than assuming it: this walk groups by DIRECTORY, where a series of per-extension globs
    grouped by EXTENSION, so the two are set-equal without being list-equal whenever `exts` has more
    than one member.

    `skip_hidden` reproduces the reader the call site previously used, and is not a preference: `glob`
    never matches a leading dot, so a site converted from a glob passes True; a site that already used
    `os.walk` descended into dotted directories, so it passes False. Get it wrong and the output
    moves.
    """
    assert isinstance(exts, tuple), f"exts must be a tuple, got {type(exts).__name__}: {exts!r}"
    top = os.path.normpath(top)
    cut = len(top) + 1  # os.walk yields dirpath prefixed by `top` exactly, so a slice gives the rel dir
    found: list[str] = []
    for dirpath, dirnames, filenames in os.walk(top):
        rel_dir = dirpath[cut:]
        dirnames[:] = [d for d in dirnames
                       if not (skip_hidden and d.startswith("."))
                       and not discard(os.path.join(rel_dir, d) if rel_dir else d)]
        for f in filenames:
            if skip_hidden and f.startswith("."):
                continue
            if not f.endswith(exts):
                continue
            if discard(os.path.join(rel_dir, f) if rel_dir else f):
                continue
            found.append(os.path.join(dirpath, f))
    return found
