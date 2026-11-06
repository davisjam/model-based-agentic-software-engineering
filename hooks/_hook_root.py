"""Answer the one question a git hook in a multi-worktree repo must not get wrong: which tree is committing?

`core.hooksPath` holds an absolute path into ONE checkout's `hooks/`. Every commit therefore executes that
one copy of the hook — the owning checkout's commits and every `git worktree`'s commits alike. A hook that
derives its operating root from `__file__` consequently resolves to the hooks-owning checkout no matter who
is committing.

That misresolution destroys data rather than merely reporting the wrong tree. Git exports `GIT_INDEX_FILE`
into a hook — the committing worktree's index, or the temporary index a pathspec commit builds — and
subprocesses inherit it. A `git add` issued under the wrong root therefore reads THAT tree's working-tree
content and writes it into the COMMITTING tree's index, replacing whatever the author staged. On 261002 four
commits took main's files, and one lost an agent's staged `workbench/index.html` outright: the path showed no
change, dropped out of the commit, and printed nothing.

`resolve` does no I/O so a test can walk it without building a worktree. `committing_toplevel` holds the one
impure line.
"""
from __future__ import annotations

import os
import subprocess

#: The derived view artifacts `pre-commit` REGENERATES AND FORCE-STAGES into whatever commit is being
#: made (its `_regen` calls plus the models-view render). They are projections of the book source, never
#: hand-authored, and an author who edits a deck gets them in the commit without asking.
#:
#: `pre-push` subtracts them before resolving scope, and the reason is a CORRECTNESS one before it is a
#: speed one: `book-models/` is a `book`-scope prefix (`nav-model.json` and `chapter_identity_declared.json`
#: really are PDF inputs), so a force-staged projection made every deck push look like it had touched book
#: inputs. Measured 261106 — a 23-path push of nothing but `.pptx` decks, `tools/`, and `CLAUDE.md` pulled
#: in the print toolchain, the book static checks and the full book PDF render on the strength of these five
#: alone, and spent ~24 minutes validating a book nobody had edited.
#:
#: Subtracting them loses NO coverage. None is read by `book/build_book.py`, `tools/mage_latex.py`,
#: `tools/latex_build.py` or `tools/check_print_toolchain.py` — verified by grep 261106 — so none can change
#: a PDF. Each one's drift/freshness gate lives in `catalog.py validate` (the `site build` phase) or
#: `catalog_tests.py` (`tier1`), and BOTH of those phases run UNCONDITIONALLY on every push. The checks that
#: actually police these files are untouched; only the expensive renders they could never affect go away.
FORCE_STAGED_DERIVED_VIEWS: tuple[str, ...] = (
    "book-models/chapter-shape.json",
    "book-models/chapter_identity.json",
    "book-models/metaphor-slogan-index.json",
    "book-models/models-view.html",
    "book-models/outcomes.json",
    "book-models/outline.json",
    "book-models/projection-index.json",
    "book-models/reverse_index.json",
)


def strip_generated(paths: set[str]) -> tuple[set[str], set[str]]:
    """Split a changed-path set into (paths that carry authorial intent, force-staged projections).

    Exact matches only. A glob here would be the `*.html` mistake in a new costume: `book-models/` also
    holds HAND-AUTHORED declarations (`chapter_identity_declared.json`, `nav-model.json`) whose edits MUST
    keep reaching the book scope, so the set is enumerated and nothing is matched by shape.
    """
    generated = {p for p in paths if p in set(FORCE_STAGED_DERIVED_VIEWS)}
    return paths - generated, generated


def resolve(hook_file: str, toplevel: str) -> tuple[str, bool]:
    """Return (operating root, does the committing tree own this hook?).

    The root always comes from `toplevel` — the tree being committed. The hook file's location decides
    only whether that tree is the hooks-owning checkout, and that stays a comparison. Deriving the root
    itself from `hook_file` is the 261002 defect.
    """
    owner = os.path.dirname(os.path.dirname(os.path.abspath(hook_file)))
    root = os.path.abspath(toplevel)
    # realpath on both sides: /tmp symlinks to /private/tmp on macOS, so a worktree under /tmp would
    # otherwise never compare equal to its own abspath.
    return root, os.path.realpath(root) == os.path.realpath(owner)


def committing_toplevel() -> str:
    """Return the top of the working tree being committed.

    Git runs a hook with cwd at the top of the working tree (githooks(5)), so cwd already answers this.
    Asking git directly costs one process and does not lean on that guarantee. Fall back to cwd when git
    declines to answer — a manual run, an unusual GIT_DIR — since cwd is correct in every case observed
    and a stale guess at the root is what this module exists to prevent.
    """
    try:
        out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                             capture_output=True, text=True, check=True).stdout.strip()
    except (subprocess.CalledProcessError, OSError):
        out = ""
    return out or os.getcwd()
