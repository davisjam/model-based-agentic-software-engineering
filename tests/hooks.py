"""Pin the pre-commit hook to the tree that is COMMITTING, not the tree that owns the hook.

`core.hooksPath` holds an absolute path into the main checkout's `hooks/`, so every commit — main's and
every `git worktree`'s — executes main's copy. The hook used to derive its operating root from `__file__`,
which therefore always named main. Git exports `GIT_INDEX_FILE` into a hook and subprocesses inherit it, so
the hook's `git add` calls read MAIN's working tree and wrote it into the COMMITTING worktree's index. On
261002 that put main's `index.html` / `workbench/index.html` / `book-models/projection-index.json` into four
commits that named none of them, and once overwrote an agent's own staged `workbench/index.html` with main's
byte-identical copy — the path then showed no change and dropped out of the commit silently. A pathspec on
the commit is no defence: git exports the temp index a pathspec commit builds.

The defect leaves no trace in the thing anyone would inspect, so the check has to walk the mechanism. Three
classes, all stdlib and instant:

  - **Resolution** — `_hook_root.resolve` returns the committing tree, and reports main-ness as a
    comparison. Fed synthetic paths, so no worktree gets constructed. Case 2 is the 261002 defect.
  - **Provenance** — the hook binds `ROOT` from `_hook_root.resolve`. A hand-rolled re-derivation is how
    the defect returns.
  - **Staging** — every `git add` the hook issues passes `cwd=ROOT`. An add under any other root
    force-stages one tree's output into another tree's commit.

A faithful end-to-end check would build a worktree, commit through the hook, and diff the result. That costs
a worktree per run and fails in interesting ways on a busy machine, so it stays out; the three classes above
cover the resolution and both call-shapes that can reintroduce the loss.
"""
from __future__ import annotations

import ast
import os
import sys

from tests.common import FAIL, PASS, ROOT

sys.path.insert(0, os.path.join(ROOT, "hooks"))
import _hook_root  # noqa: E402 — the resolver under test; lives beside the hook so it is importable before the root is known

_HOOK = os.path.join(ROOT, "hooks", "pre-commit")


def _resolution_findings() -> list[str]:
    """`resolve(hook_file, toplevel)` -> (root, owns_hook). The root is always the committing tree."""
    main = "/checkout"
    hook = "/checkout/hooks/pre-commit"
    cases = [
        # (label, toplevel, expected root, expected owns-hook)
        ("main checkout commits", main, main, True),
        ("worktree commits (the 261002 defect)", "/elsewhere/wt", "/elsewhere/wt", False),
        ("trailing slash on the toplevel git reports", main + "/", main, True),
        ("a worktree nested under the checkout is still not the checkout",
         "/checkout/wt", "/checkout/wt", False),
    ]
    issues = []
    for label, toplevel, want_root, want_owns in cases:
        got_root, got_owns = _hook_root.resolve(hook, toplevel)
        if got_root != want_root:
            issues.append(f"resolve({toplevel!r}) root = {got_root!r}, expected {want_root!r} ({label})")
        if got_owns != want_owns:
            issues.append(f"resolve({toplevel!r}) owns-hook = {got_owns}, expected {want_owns} ({label})")
    return issues


def _git_add_calls(tree: ast.AST) -> list[ast.Call]:
    """Every `subprocess.run(["git", "add", ...], ...)` in the hook."""
    calls = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
            continue
        if node.func.attr != "run" or not node.args:
            continue
        argv = node.args[0]
        if not isinstance(argv, ast.List) or len(argv.elts) < 2:
            continue
        head = [e.value for e in argv.elts[:2] if isinstance(e, ast.Constant)]
        if head == ["git", "add"]:
            calls.append(node)
    return calls


def _source_findings() -> list[str]:
    """The hook binds ROOT from the resolver, and stages only under ROOT."""
    with open(_HOOK, encoding="utf-8") as fh:
        tree = ast.parse(fh.read(), filename=_HOOK)
    issues = []

    binds = [n for n in ast.walk(tree) if isinstance(n, ast.Assign)
             and any(t.id == "ROOT" for t in ast.walk(n) if isinstance(t, ast.Name) and t.ctx.__class__ is ast.Store)]
    if not binds:
        issues.append("hooks/pre-commit binds no ROOT — the root must come from _hook_root.resolve")
    for node in binds:
        callees = {c.func.id for c in ast.walk(node.value) if isinstance(c, ast.Call) and isinstance(c.func, ast.Name)}
        callees |= {c.func.attr for c in ast.walk(node.value) if isinstance(c, ast.Call) and isinstance(c.func, ast.Attribute)}
        if "resolve" not in callees:
            issues.append(f"hooks/pre-commit:{node.lineno} derives ROOT without _hook_root.resolve — "
                          "a root re-derived from __file__ names the hooks-owning checkout, not the committer")

    adds = _git_add_calls(tree)
    if not adds:
        issues.append("hooks/pre-commit issues no `git add` — the regeneration staging went missing")
    for node in adds:
        cwd = next((kw.value for kw in node.keywords if kw.arg == "cwd"), None)
        if not (isinstance(cwd, ast.Name) and cwd.id == "ROOT"):
            issues.append(f"hooks/pre-commit:{node.lineno} runs `git add` without cwd=ROOT — it would read "
                          "one tree and write the committing tree's inherited GIT_INDEX_FILE")
    return issues


def check_hook_operates_on_committing_tree():
    """The pre-commit hook resolves its root from the committing tree and stages only under that root."""
    issues = _resolution_findings() + _source_findings()
    return (FAIL if issues else PASS), issues
