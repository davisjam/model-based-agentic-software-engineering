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
import re
import subprocess
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
    issues = (_resolution_findings() + _source_findings() + _latex_scope_findings()
              + _projection_findings() + _shared_artifact_findings()
              + _generated_scope_findings())
    return (FAIL if issues else PASS), issues


#: The tools that render or verify a print PDF. If none of them reads a `book-models/` artifact, that
#: artifact cannot change a PDF, so excluding it from the pre-push book scope costs no render coverage.
_PDF_TOOLING = ("book/build_book.py", "tools/mage_latex.py", "tools/latex_build.py",
                "tools/check_print_toolchain.py", "book/book_ir.py")


def _generated_scope_findings() -> list[str]:
    """Hold the pre-commit/pre-push join over the FORCE-STAGED projections, three ways.

    `pre-commit` regenerates and force-stages derived `book-models/` views into whatever commit is being
    made, and `book-models/` is a `book`-scope prefix — so until 261106 a push of nothing but decks
    rendered the whole book, because the commit hook had put book-ish paths in it. `pre-push` now
    subtracts exactly `_hook_root.FORCE_STAGED_DERIVED_VIEWS` before resolving scope.

    That split is only safe while three things stay true, and all three are mechanical:
      (a) PARITY — every artifact the commit hook force-stages is declared in the tuple. A new `_regen`
          call that forgets it silently re-inflates every push's scope.
      (b) NO RENDER CONSUMER — no print-PDF tool reads any excluded artifact. The moment one does, the
          exclusion starts hiding a real book-input change.
      (c) DISCRIMINATION — the exclusion is by exact path, so the HAND-AUTHORED `*_declared.json` /
          `nav-model.json` siblings in the same directory still reach the book scope.
    """
    issues: list[str] = []
    path = os.path.join(ROOT, "hooks", "pre-commit")
    with open(path, encoding="utf-8") as fh:
        tree = ast.parse(fh.read(), filename=path)

    # (a) PARITY. Two staging routes reach `book-models/`: the `_regen(<script>, <artifact>)` helper, and
    # a direct `git add` of a literal path. Read both from the STAGING CALLS rather than from every string
    # in the file, so a path merely mentioned in a docstring is never mistaken for a force-stage.
    staged = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        if isinstance(node.func, ast.Name) and node.func.id == "_regen" and len(node.args) == 2:
            try:
                staged.add("book-models/" + ast.literal_eval(node.args[1]))
            except ValueError:
                issues.append(f"hooks/pre-commit:{node.lineno} _regen artifact is not a literal — the "
                              "force-staged set cannot be derived, so the pre-push join cannot be held")
            continue
        argv = node.args[0] if node.args else None
        if not isinstance(argv, (ast.List, ast.Tuple)):
            continue
        literals = [e.value for e in argv.elts
                    if isinstance(e, ast.Constant) and isinstance(e.value, str)]
        if "git" not in literals or "add" not in literals:
            continue
        staged.update(v for v in literals if v.startswith("book-models/"))
    declared = set(_hook_root.FORCE_STAGED_DERIVED_VIEWS)
    for missing in sorted(staged - declared):
        issues.append(f"hooks/pre-commit force-stages {missing} but _hook_root."
                      "FORCE_STAGED_DERIVED_VIEWS omits it — every commit carrying it would make "
                      "pre-push render the whole book")
    for extra in sorted(declared - staged):
        issues.append(f"_hook_root.FORCE_STAGED_DERIVED_VIEWS declares {extra} but pre-commit no longer "
                      "force-stages it — a stale exclusion can hide a real hand edit")

    # (b) NO RENDER CONSUMER.
    for artifact in sorted(declared):
        name = artifact.split("/", 1)[1]
        for tool in _PDF_TOOLING:
            tool_path = os.path.join(ROOT, tool)
            if not os.path.isfile(tool_path):
                continue
            with open(tool_path, encoding="utf-8") as fh:
                if name in fh.read():
                    issues.append(f"{tool} reads {artifact}, which pre-push excludes from the book "
                                  "scope — the exclusion would hide a genuine PDF-input change. Drop it "
                                  "from FORCE_STAGED_DERIVED_VIEWS or stop reading it in the renderer.")

    # (c) DISCRIMINATION, against the real selector rather than a restatement of it.
    pre_push = os.path.join(ROOT, "hooks", "pre-push")
    with open(pre_push, encoding="utf-8") as fh:
        pp_tree = ast.parse(fh.read(), filename=pre_push)
    selected = [n for n in pp_tree.body
                if (isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "SCOPES"
                                                      for t in n.targets))
                or (isinstance(n, ast.FunctionDef) and n.name == "_touches")]
    namespace: dict = {}
    exec(compile(ast.Module(body=selected, type_ignores=[]), pre_push, "exec"), namespace)
    scopes, touches = namespace["SCOPES"], namespace["_touches"]

    def book_fires(paths: set[str]) -> bool:
        authored, _ = _hook_root.strip_generated(paths)
        return touches(authored, scopes["book"])

    if book_fires(declared):
        issues.append("pre-push: a push of ONLY force-staged projections still triggers the book "
                      "scope — the exclusion is not reaching the selector")
    if not book_fires(declared | {"book/references.bib"}):
        issues.append("pre-push: the exclusion swallowed a real book edit pushed alongside the "
                      "projections — it must subtract paths, never short-circuit the scope")
    for authored_sibling in ("book-models/nav-model.json", "book-models/chapter_identity_declared.json",
                             "book-models/chapter_shape_declared.json"):
        if not book_fires({authored_sibling}):
            issues.append(f"pre-push: hand-authored {authored_sibling} no longer triggers the book "
                          "scope — the exclusion is matching by shape instead of exact path")
    return issues


def _shared_artifact_findings() -> list[str]:
    """Consumers of one mutable figure pool must be ordered in the executable plan."""
    env = dict(os.environ, GC_PREPUSH_PLAN="1", GC_PREPUSH_ALL="1")
    result = subprocess.run([sys.executable, os.path.join(ROOT, "hooks", "pre-push")],
                            cwd=ROOT, env=env, input="", text=True, capture_output=True)
    if result.returncode:
        return ["pre-push plan failed: " + result.stderr[-1000:]]
    graph = {}
    for name, parents in re.findall(r"^PLAN phase: ([^(\n]+?)(?: \(after: ([^)]+)\))?$",
                                   result.stdout, re.M):
        graph[name] = set(parents.split(", ")) if parents else set()

    def precedes(first, second, seen=None):
        seen = set() if seen is None else seen
        if second in seen:
            return False
        seen.add(second)
        parents = graph.get(second, set())
        return first in parents or any(precedes(first, parent, seen) for parent in parents)

    if not precedes("book static checks", "book PDF"):
        return ["pre-push figure validation and book PDF can overlap while rewriting "
                "latex/build/tikz/candidates.pdf"]
    return []


def _latex_scope_findings() -> list[str]:
    """Exercise the actual pre-push scope selector without executing a push or its gates."""
    path = os.path.join(ROOT, "hooks", "pre-push")
    with open(path, encoding="utf-8") as fh:
        tree = ast.parse(fh.read(), filename=path)
    selected = [n for n in tree.body
                if (isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "SCOPES"
                                                      for t in n.targets))
                or (isinstance(n, ast.FunctionDef) and n.name == "_touches")]
    namespace = {}
    exec(compile(ast.Module(body=selected, type_ignores=[]), path, "exec"), namespace)
    scopes, touches = namespace["SCOPES"], namespace["_touches"]
    issues = []
    cases = {
        "latex/magebook.sty": {"book", "handbook"},
        "tools/latex_build.py": {"book", "handbook"},
        "tools/pdf_structure.py": {"book", "handbook"},
        "tools/install_texlive_ci.sh": {"book", "handbook"},
        "tools/mage_latex.py": {"book"},
        "tools/mage_cover.py": {"book"},
        "tools/mage_assets.py": {"book"},
        "tools/cover_assets.py": {"book", "handbook"},
        "book/fonts/SourceSerif4/SourceSerif4-Regular.ttf": {"book", "handbook"},
        "book/references.bib": {"book", "handbook"},
        "handbook/scripts/latex_source.py": {"handbook"},
        ".github/workflows/pages.yml": {"book", "handbook"},
        "hooks/pre-push": {"book", "handbook"},
        "workbench/src/main.ts": set(),
    }
    for changed, expected in cases.items():
        actual = {gate for gate in ("book", "handbook") if touches({changed}, scopes[gate])}
        if actual != expected:
            issues.append(f"pre-push {changed}: PDF scopes {actual}, expected {expected}")
    for gate in ("book", "handbook"):
        if not touches(None, scopes[gate]):
            issues.append(f"pre-push unknown scope must run {gate}")
    return issues


def _projection_findings() -> list[str]:
    """Only source adapters implement sync; cover and PDF check tools do not."""
    expected = {"tools/mage_latex.py", "handbook/scripts/latex_source.py"}
    findings = []
    for hook in ("pre-commit", "pre-merge-commit", "pre-push"):
        path = os.path.join(ROOT, "hooks", hook)
        with open(path, encoding="utf-8") as source:
            tree = ast.parse(source.read(), filename=path)
        loops = [node for node in tree.body if isinstance(node, ast.For)
                 and isinstance(node.target, ast.Name) and node.target.id == "_source_tool"]
        actual = set(ast.literal_eval(loops[0].iter)) if len(loops) == 1 else set()
        if actual != expected:
            findings.append(f"{hook}: sync adapter set {actual}, expected {expected}")
    return findings
