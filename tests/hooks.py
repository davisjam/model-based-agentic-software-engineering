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

Later checks here DO build a synthetic repository, and one of them committed the same defect against the
live repo. A self-test that can reach the repository it tests is not a self-test: `cwd=` loses to the `GIT_DIR` git
exports into every hook, so the commit-scope harness configured the LIVE gitdir on 261106 — `core.bare`,
a temp-dir `core.hooksPath` that silently disabled this repo's own pre-commit hook, and a synthetic author
identity. Every git call below therefore goes through `git_env`, and `_AmbientGitdir` stands a decoy where
the real gitdir was so a regression is both contained and reported.
"""
from __future__ import annotations

import ast
import os
import re
import shutil
import subprocess
import sys
import tempfile
from typing import NamedTuple

from tests.common import FAIL, PASS, ROOT

sys.path.insert(0, os.path.join(ROOT, "hooks"))
import _hook_root  # noqa: E402 — the resolver under test; lives beside the hook so it is importable before the root is known

sys.path.insert(0, os.path.join(ROOT, "tools"))
import git_env  # noqa: E402 — the scrubbed-git seam; resolved against ROOT, known only at import time

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
              + _generated_scope_findings() + _commit_scope_findings()
              + _content_tree_findings() + _ambient_git_findings())
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


#: One PLAN run, shared by every check that reasons about the executable phase graph. Two callers
#: parsing the same output with the same regex is the second site, which is where this repo extracts.
_PLAN_CACHE: "dict[str, tuple[dict[str, set[str]], str]]" = {}


def _plan_graph() -> "tuple[dict[str, set[str]], str]":
    """(phase -> its declared parents, error). `GC_PREPUSH_PLAN` executes nothing."""
    if "graph" not in _PLAN_CACHE:
        env = dict(os.environ, GC_PREPUSH_PLAN="1", GC_PREPUSH_ALL="1")
        result = subprocess.run([sys.executable, os.path.join(ROOT, "hooks", "pre-push")],
                                cwd=ROOT, env=env, input="", text=True, capture_output=True)
        if result.returncode:
            _PLAN_CACHE["graph"] = ({}, "pre-push plan failed: " + result.stderr[-1000:])
        else:
            graph = {name: (set(parents.split(", ")) if parents else set())
                     for name, parents in re.findall(
                         r"^PLAN phase: ([^(\n]+?)(?: \(after: ([^)]+)\))?$", result.stdout, re.M)}
            _PLAN_CACHE["graph"] = (graph, "")
    return _PLAN_CACHE["graph"]


def _shared_artifact_findings() -> list[str]:
    """Consumers of one mutable figure pool must be ordered in the executable plan."""
    graph, error = _plan_graph()
    if error:
        return [error]

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


class _AmbientGitdir:
    """A decoy gitdir, exported where the real one stood, fingerprinted across the harness run.

    A self-test that can reach the repository it is testing is not a self-test. The harness below
    builds a synthetic repository and drives it, and `cwd=` alone does not make that true: git
    exports `GIT_DIR`, `GIT_WORK_TREE` and `GIT_INDEX_FILE` into every hook, a subprocess inherits
    them, and the inherited value WINS. On 261106 the harness therefore ran `git init` and four
    `git config` calls against the REAL gitdir — writing `core.bare = true`, a `core.hooksPath`
    into a temp directory (an accidental `--no-verify` on a repo that bans it) and a synthetic
    identity — then failed on the config it had just written, so it could never pass.

    `git_env` is the fix. This is the control that keeps the fix honest, and it does two jobs at
    once: a decoy stands in the environment so any write the harness still aims at its ambient
    repository lands HERE, and the fingerprint reports it as a finding in the same run. Detection
    and containment from one object, which is why the harness runs inside it always rather than in
    a second check that would double the cost of the expensive part.
    """

    #: The names git exports into a hook that rebind a command to another repository. Set all
    #: three: a scrub that misses one is not visible unless something tests for that one.
    VARS = ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE")

    def __init__(self) -> None:
        self.parent: str | None = None
        self.gitdir = ""
        self.before: dict[str, str] = {}
        self.saved: dict[str, str | None] = {}
        self.error = ""

    def __enter__(self) -> _AmbientGitdir:
        self.parent = tempfile.mkdtemp(prefix="gc-ambient-decoy-")
        tree = os.path.join(self.parent, "decoy")
        os.makedirs(tree)
        # Built through the scrubbed seam itself: creating the decoy under an inherited GIT_DIR
        # would commit the very defect this object exists to catch.
        done = git_env.git(["init", "-q", "."], repo=tree, hermetic=True)
        if done.returncode:
            self.error = f"could not build the decoy gitdir: {done.stderr.strip()[:200]}"
            return self
        self.gitdir = os.path.join(tree, ".git")
        self.before = git_env.fingerprint(self.gitdir)
        for name in self.VARS:
            self.saved[name] = os.environ.get(name)
        os.environ["GIT_DIR"] = self.gitdir
        os.environ["GIT_WORK_TREE"] = tree
        os.environ["GIT_INDEX_FILE"] = os.path.join(self.gitdir, "index")
        return self

    def __exit__(self, *exc: object) -> None:
        for name, was in self.saved.items():
            if was is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = was
        self.saved = {}

    def findings(self) -> list[str]:
        """What the harness wrote into the repository it was standing in. Empty is the only pass."""
        if self.error:
            return [self.error]
        after = git_env.fingerprint(self.gitdir)
        moved = sorted({p for p in set(self.before) | set(after)
                        if self.before.get(p) != after.get(p)})
        if not moved:
            return []
        return [f"the synthetic-repo harness WROTE into its ambient gitdir: {', '.join(moved[:8])}"
                f"{' …' if len(moved) > 8 else ''}. Every git call that drives a chosen repository "
                "must go through `git_env` — `cwd=` loses to an inherited GIT_DIR, and against the "
                "real gitdir this writes core.bare/core.hooksPath/user.* into the live repo."]

    def cleanup(self) -> None:
        if self.parent is not None:
            shutil.rmtree(self.parent, ignore_errors=True)
            self.parent = None


def _commit_scope_findings() -> list[str]:
    """Run the commit-scope harness inside a decoy git environment, and grade both.

    The harness is the sabotage control documented below; `_AmbientGitdir` is the control ON the
    control, and the two run together so the expensive worktree build is paid once.
    """
    decoy = _AmbientGitdir()
    try:
        with decoy:
            try:
                issues = _commit_scope_harness()
            except Exception as exc:  # noqa: BLE001 — a crash must not suppress the ambient verdict
                # The harness raises on a missing seed or a refused worktree, and under a hostile
                # environment it raises EARLY. Reporting that as a finding keeps the gitdir verdict
                # below reachable, which is the one that says whether the live repo was written to.
                issues = [f"commit-scope harness raised {type(exc).__name__}: {exc}"]
        return issues + decoy.findings()
    finally:
        decoy.cleanup()


def _commit_scope_harness() -> list[str]:
    """The gate worktree must read the COMMIT, in every direction — the sabotage control.

    `pre-push` runs its content phases in a worktree at the pushed ref so a verdict stops being a
    function of whatever five agents happen to have on disk. A change that stops seeing siblings has
    to be shown to still go red on the PUSHER's own committed defect, or it is indistinguishable from
    a weakened gate. So this walks the mechanism on a synthetic repo — two files, two commits,
    nothing of this tree touched — and pins FOUR arms.

    Three are the directions measured 261106, now run against the PERSISTENT tree rather than a
    throwaway one, because the tree the gate actually uses is the one that has to be shown sound:

      1. the pusher's OWN committed defect still goes red;
      2. the FALSE RED: a sibling's uncommitted edit must not reach the worktree;
      3. the FALSE GREEN: a sibling's uncommitted FIX must not reach it either, so a committed defect
         stays visible. That arm is the expensive one — it is the reading that would have let a
         lander citing three keys with no bib entry past the gate and failed CI after the transfer.

    The fourth is new with persistence, and it is the failure mode persistence INTRODUCES. A reused
    tree that drifts grades something other than the pushed commit, which is arm 3's false green
    arriving through the door built to close it. Two sub-arms, because drift has two kinds:

      4a. REPAIRABLE drift — a hostile untracked leftover, a modified tracked file, a HEAD left at
          the previous push's commit. Each must be gone, and the tree equal to the ref.
      4b. UNREPAIRABLE drift — a `skip-worktree` bit, under which git reports a clean status for a
          file whose contents are wrong and `checkout` declines to rewrite it. This one must force
          a REBUILD, which is what pins the fallback path as tested rather than merely written.
    """
    sys.path.insert(0, os.path.join(ROOT, "tools"))
    import gate_worktree  # noqa: E402 — resolved against ROOT, which is only known at import time

    issues: list[str] = []
    with tempfile.TemporaryDirectory(prefix="gc-commit-scope-") as tmp:
        repo = os.path.join(tmp, "repo")
        os.makedirs(repo)
        # The persistent home lives INSIDE the temp dir, never at `default_home()`. A self-test that
        # reaches the production cache would hand the next real push a tree built from a synthetic
        # repository — the same mistake as a self-test that reaches the real gitdir, one directory
        # over. `tools/git_env.py` records what that cost when it happened.
        home = os.path.join(tmp, "home")

        def git(*args: str, at: str | None = None) -> None:
            # `git_env.git`, never a bare `subprocess.run(..., cwd=repo)`: git exports GIT_DIR into
            # every hook and the inherited value beats `cwd`, so this helper drove the REAL gitdir
            # on 261106 and configured it. `hermetic` also cuts the host's global/system config out,
            # so the synthetic repo's behaviour is a property of the four lines set below.
            done = git_env.git(list(args), repo=at or repo, hermetic=True)
            if done.returncode:
                issues.append(f"synthetic repo: git {' '.join(args)} failed: {done.stderr.strip()}")

        def write(name: str, body: str, at: str | None = None) -> None:
            with open(os.path.join(at or repo, name), "w", encoding="utf-8") as fh:
                fh.write(body)

        def read(name: str, at: str) -> str:
            try:
                with open(os.path.join(at, name), encoding="utf-8") as fh:
                    return fh.read()
            except OSError as exc:
                return f"<unreadable: {exc.strerror}>"

        git("init", "-q")
        git("config", "user.email", "gate@example.invalid")
        git("config", "user.name", "gate")
        git("config", "commit.gpgsign", "false")
        # Point the synthetic repo at an EMPTY hooks dir rather than reaching for `--no-verify`,
        # which this repo bans. The `hermetic` env above already cuts global and system config out
        # of reach, so this is local by construction; it stays written down because an absolute
        # path into a temp dir is exactly the value that broke the real repo when it leaked.
        os.makedirs(os.path.join(tmp, "nohooks"))
        git("config", "core.hooksPath", os.path.join(tmp, "nohooks"))
        # A synthetic SEED declaration, one entry per class the real one uses, so `prepare()` drives
        # the actual create/reuse/seed/sweep code rather than a path that skips seeding. The real
        # declaration cannot be used here — a two-file repository has no `node_modules` to link and
        # no MkDocs projection to emit — and a harness that skipped seeding would leave every line
        # of the incremental seed path unexercised in-gate, which is where it runs.
        shared = os.path.join(tmp, "shared-install", "pkg")
        os.makedirs(shared, exist_ok=True)
        write("f", "shared\n", at=shared)
        os.makedirs(os.path.join(repo, "assets"), exist_ok=True)
        os.makedirs(os.path.join(repo, "harness-bin"), exist_ok=True)
        write("assets/thumb.bin", "THUMB\n")
        write("harness-bin/tool", "BINARY\n")
        os.symlink(os.path.dirname(shared), os.path.join(repo, "linked"))
        os.makedirs(os.path.join(repo, "members"), exist_ok=True)
        write("members/entry-a", "CONTENT-ADDRESSED\n")
        emitter = os.path.join(tmp, "emit.py")
        with open(emitter, "w", encoding="utf-8") as fh:
            # One page per tracked `.txt`, so the emitted tree is a function of the commit — and a
            # page the PREVIOUS commit had and this one does not survives a write-over, which is the
            # stale-page drift the emitter's remove-then-emit exists to stop.
            fh.write("import os, glob\n"
                     "os.makedirs('emitted/docs', exist_ok=True)\n"
                     "for src in sorted(glob.glob('*.txt')):\n"
                     "    open(os.path.join('emitted/docs', src + '.md'), 'w').write(\n"
                     "        open(src).read())\n")
        seed_set = (
            ("linked", "symlink", "linked", False),
            # The class that fixes the 261107 finding: a real directory under a directory-only
            # ignore pattern, members linked. Declared here so the arms exercise it, and so the
            # pattern/kind pairing above is pinned by something that runs rather than by prose.
            ("members", "symlink-members", "members/", False),
            ("assets/thumb.bin", "copy", "/assets/thumb.bin", False),
            ("harness-bin", "copy-tree", "harness-bin/", False),
            ("absent-by-design", "copy", "absent-by-design", True),
        )
        seed_emitters = (((emitter,), "emitted"),)

        # The seeds must be invisible to git, exactly as the real ones are: a seed git tracks is not
        # a seed, and one git reports as untracked makes `verify()` fail on every push.
        write(".gitignore", "".join(f"{pattern}\n" for _r, _k, pattern, _o in seed_set)
              + "".join(f"{emits}/\n" for _tail, emits in seed_emitters))
        write("claim.txt", "COMMITTED-GOOD\n")
        write("defect.txt", "COMMITTED-BAD\n")
        git("add", ".gitignore", "claim.txt", "defect.txt")
        git("commit", "-q", "-m", "base")
        if issues:
            return issues
        first = git_env.git(["rev-parse", "HEAD"], repo=repo, hermetic=True).stdout.strip()
        # A SECOND commit, so the reuse path has a diff to apply, a stale HEAD to be caught at, and
        # a page in the emitted tree (`gone.txt`) that the later commit retires.
        write("gone.txt", "ONLY-IN-THE-FIRST-COMMIT\n")
        git("add", "gone.txt")
        git("commit", "-q", "-m", "a page the next commit retires")
        first = git_env.git(["rev-parse", "HEAD"], repo=repo, hermetic=True).stdout.strip()
        write("claim.txt", "COMMITTED-GOOD-2\n")
        git("rm", "-q", "gone.txt")
        git("add", "claim.txt")
        git("commit", "-q", "-m", "second")
        second = git_env.git(["rev-parse", "HEAD"], repo=repo, hermetic=True).stdout.strip()
        if issues:
            return issues

        # A sibling, mid-edit: one file broken in the working tree, one file FIXED in the working
        # tree. Neither is committed, so neither may change any verdict below.
        write("claim.txt", "WORKTREE-BROKEN\n")
        write("defect.txt", "WORKTREE-FIXED\n")

        def stand(ref: str) -> gate_worktree.GateWorktree:
            tree = gate_worktree.GateWorktree(repo, ref, label="selftest",
                                              persistent=True, home=home,
                                              seed_set=seed_set, seed_emitters=seed_emitters)
            tree.prepare()
            return tree

        # ── Arms 1-3, on a freshly CREATED persistent tree ────────────────────────────────────────
        wt = stand(first)
        try:
            if wt.reused:
                issues.append("the first prepare() REUSED a tree in a home that did not exist — "
                              "the marker/identity gate in _usable() is not holding")
            for name, want, arm in (("defect.txt", "COMMITTED-BAD\n", "1 (own committed defect)"),
                                    ("claim.txt", "COMMITTED-GOOD\n", "2 (false RED)"),
                                    ("defect.txt", "COMMITTED-BAD\n", "3 (false GREEN)")):
                got = read(name, wt.path or "")
                if got != want:
                    issues.append(f"arm {arm}: gate worktree read {got.strip()!r} for {name}, "
                                  f"expected {want.strip()!r} — that direction is open")
            kept = wt.path
        finally:
            wt.release()
        if not kept or not os.path.isdir(kept):
            issues.append("release() did not KEEP the persistent tree — every push would pay a "
                          "cold checkout, which is the whole cost this form removes")

        # ── Reuse: the same home, a different ref, rewritten by CHECKOUT not by recreation ────────
        wt = stand(second)
        try:
            if not wt.reused:
                issues.append("the second prepare() RECREATED the tree instead of checking the new "
                              "ref out into it — the reuse path is not reached")
            if wt.rebuilds:
                issues.append(f"the second prepare() reported {wt.rebuilds} rebuild(s) on an "
                              "undisturbed tree — reuse is being treated as drift")
            if read("claim.txt", wt.path or "") != "COMMITTED-GOOD-2\n":
                issues.append("the reused tree did not advance to the new ref's content")
            if wt.path != kept:
                issues.append(f"the reused tree moved from {kept} to {wt.path}")
            # The symlink class must be VERIFIED in place, not re-created: `lexists` was enough for a
            # tree that had just been born and says nothing about one handed back.
            link = os.path.join(wt.path or "", "linked")
            if not os.path.islink(link) or not os.path.isdir(link):
                issues.append("the reused tree's symlinked seed is not a live symlink after reuse")
            if not any("verified in place" in line and ", 0 verified" not in line
                       for line in wt.log):
                issues.append("no seed was verified in place on reuse — the incremental seed path "
                              "is re-creating everything, which is the cost it exists to avoid")
            # The retired page: `gone.txt` exists at `first` and not at `second`, so a re-emit that
            # wrote OVER the previous tree would leave `gone.txt.md` behind for a glob to read.
            if os.path.exists(os.path.join(wt.path or "", "emitted", "docs", "gone.txt.md")):
                issues.append("a page from the PREVIOUS commit survived the re-emit — the emitted "
                              "tree must be removed before emitting, not written over")
        finally:
            wt.release()

        # The emitter must be REUSED when nothing moved: same ref, same tree OID, same key.
        wt = stand(second)
        try:
            if not any("1 reused on an unmoved key" in line for line in wt.log):
                issues.append("the emitted tree was re-emitted at an unchanged ref — the reuse key "
                              "is not holding, so every push pays the emit")
        finally:
            wt.release()

        # ── Arm 4a: REPAIRABLE drift — leftover, modification, stale HEAD ─────────────────────────
        write("hostile.txt", "A PREVIOUS PUSH'S LEFTOVER\n", at=kept or "")
        write("claim.txt", "DRIFTED-IN-THE-GATE-TREE\n", at=kept or "")
        git("checkout", "--detach", "--force", first, at=kept or "")
        wt = stand(second)
        try:
            for finding in wt.verify():
                issues.append(f"arm 4a: prepare() handed back a tree that still fails verify(): "
                              f"{finding}")
            if os.path.exists(os.path.join(kept or "", "hostile.txt")):
                issues.append("arm 4a: a hostile untracked leftover SURVIVED prepare() — a content "
                              "check would read it, which is the stale-artifact false green")
            if read("claim.txt", wt.path or "") != "COMMITTED-GOOD-2\n":
                issues.append("arm 4a: a tracked file drifted in the gate tree was not restored to "
                              "the pushed commit's content")
        finally:
            wt.release()

        # ── Arm 4b: UNREPAIRABLE drift — the bit that makes a wrong file report clean ─────────────
        # `skip-worktree` is the one drift channel `status --porcelain` is blind to BY DESIGN, and a
        # persistent index is the only thing that can hold it open across pushes. It must force the
        # rebuild, not be graded.
        git("update-index", "--skip-worktree", "claim.txt", at=kept or "")
        write("claim.txt", "UNWATCHED-AND-WRONG\n", at=kept or "")
        before = git_env.git(["status", "--porcelain"], repo=kept or "", hermetic=True).stdout
        if before.strip():
            issues.append("arm 4b: the sabotage did not reproduce the blind spot — `status "
                          "--porcelain` reported the skip-worktree file, so this arm proves nothing")
        wt = stand(second)
        try:
            if not wt.rebuilds:
                issues.append("arm 4b: a skip-worktree drift was GRADED, not rebuilt — the tree "
                              "reports clean while holding content the commit does not have")
            for finding in wt.verify():
                issues.append(f"arm 4b: the rebuild did not clear the drift: {finding}")
            if read("claim.txt", wt.path or "") != "COMMITTED-GOOD-2\n":
                issues.append("arm 4b: the rebuilt tree does not hold the pushed commit's content")
        finally:
            wt.release()

        # ── Concurrency: the loser keeps the SCOPE and gives up the SPEED ─────────────────────────
        holder = stand(second)
        try:
            loser = gate_worktree.GateWorktree(repo, first, label="selftest",
                                               persistent=True, home=home,
                                               seed_set=seed_set, seed_emitters=seed_emitters)
            loser.prepare()
            try:
                if loser.persistent:
                    issues.append("a second concurrent prepare() took the persistent tree while a "
                                  "live holder had the lock — two pushes at two refs in one tree")
                if loser.path == holder.path:
                    issues.append("the concurrent loser was handed the SAME tree as the holder")
                for finding in loser.verify():
                    issues.append(f"the concurrent loser's fallback tree fails verify(): {finding}")
                if read("defect.txt", loser.path or "") != "COMMITTED-BAD\n":
                    issues.append("the concurrent loser lost COMMIT scope, not just the speed — "
                                  "the fallback must still grade the pushed commit")
            finally:
                loser.release()
        finally:
            holder.release()
            holder._destroy()

    for rel, kind, pattern, _optional in gate_worktree.SEED:
        if pattern not in gate_worktree.gitignore_patterns(ROOT):
            issues.append(f"gate-worktree seed declares {rel} ({kind}) against .gitignore pattern "
                          f"{pattern!r}, which is no longer in .gitignore — the seed list has "
                          "drifted from the state git refuses to reproduce")
        # A gitignore pattern ending in `/` matches a DIRECTORY, and to git a symlink is a file — so
        # a `symlink` seed under such a pattern is reported `??` and makes the gate tree dirty, which
        # is now a refused push. Measured 261107: `book/.mermaid-svg-cache` had been exactly that
        # since the worktree landed, invisible because nothing had ever asked the tree whether it was
        # clean. `symlink-members` materializes the real directory the pattern needs.
        if kind == "symlink" and pattern.endswith("/"):
            issues.append(f"gate-worktree seed {rel} is materialized as a SYMLINK under the "
                          f"directory-only ignore pattern {pattern!r}, so git reports it untracked "
                          "and verify() refuses the push — declare it `symlink-members` instead")
        if kind in ("symlink-members", "copy-tree") and not pattern.endswith("/"):
            issues.append(f"gate-worktree seed {rel} is materialized as a real DIRECTORY but its "
                          f"ignore pattern {pattern!r} does not end in `/` — harmless today, but "
                          "the pairing is the thing that keeps the seed invisible to git, so it is "
                          "held rather than left to chance")
    # Every declared seed must be in the sweep's keep set, and no ADOPTABLE may be. The first
    # direction costs a re-seed per push; the second is the one that bites — a kept
    # `book/mage-book.pdf` makes `adopt()` a no-op, because it refuses to overwrite, and the
    # caption-orphan sensor then reads the PREVIOUS push's render with nothing in the log saying so.
    for rel, kind, _pattern, _optional in gate_worktree.SEED:
        if rel not in gate_worktree.KEEP_IGNORED:
            issues.append(f"gate-worktree seed {rel} ({kind}) is not in KEEP_IGNORED, so the reuse "
                          "sweep deletes it every push")
    for rel in gate_worktree.ADOPTABLE:
        if gate_worktree.kept_by_sweep(rel):
            issues.append(f"adoptable {rel} is protected from the reuse sweep, so a stale copy "
                          "survives and adopt() — which refuses to overwrite — becomes a no-op")
    # The persistent home must be outside the repo working tree and outside the gitdir: inside the
    # tree, `git status` in the main checkout reports it; inside the gitdir, the whole-gitdir
    # fingerprint that proves a harness left the repository alone would change on every push.
    home_dir = gate_worktree.default_home(ROOT, "prepush")
    gitdir = git_env.git(["rev-parse", "--absolute-git-dir"], repo=ROOT).stdout.strip()
    for forbidden, why in ((ROOT, "the repo working tree, where `git status` would report it"),
                           (gitdir, "the gitdir, which git_env.fingerprint walks whole")):
        if forbidden and (home_dir == forbidden or home_dir.startswith(forbidden + os.sep)):
            issues.append(f"the persistent gate-worktree home {home_dir} is inside {why}")
    return issues


def _content_tree_findings() -> list[str]:
    """Every phase declared commit-scoped must read the worktree, and run after it is seeded.

    Two halves of one join, because a gate pointed at the wrong tree and a gate the plan never
    orders behind its seeding fail the same way — silently, with a verdict that looks like a verdict.
    """
    path = os.path.join(ROOT, "hooks", "pre-push")
    with open(path, encoding="utf-8") as fh:
        tree = ast.parse(fh.read(), filename=path)
    declared: set[str] = set()
    seeder = ""
    phase_of: dict[str, str] = {}
    reads_content: set[str] = set()
    for node in ast.walk(tree):
        if (isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name)
                and node.target.id == "CONTENT_SEEDER" and node.value is not None):
            seeder = ast.literal_eval(node.value)
        # An annotated assignment is an AnnAssign, not an Assign — accept both so a type annotation
        # on the declaration cannot make the join silently stop being checked.
        if (isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name)
                and node.target.id == "CONTENT_PHASES" and node.value is not None):
            declared = set(ast.literal_eval(node.value))
        if (isinstance(node, ast.Assign)
                and any(isinstance(t, ast.Name) and t.id == "CONTENT_PHASES" for t in node.targets)):
            declared = set(ast.literal_eval(node.value))
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "Phase"
                and len(node.args) >= 2 and isinstance(node.args[0], ast.Constant)
                and isinstance(node.args[1], ast.Name)):
            phase_of[node.args[1].id] = node.args[0].value
        if isinstance(node, ast.FunctionDef) and node.name.startswith("_phase_"):
            if any(isinstance(n, ast.Name) and n.id == "CONTENT" for n in ast.walk(node)):
                reads_content.add(node.name)
    issues = []
    if not declared:
        return ["pre-push declares no CONTENT_PHASES — the commit-scoped set is not stated anywhere"]
    if not seeder:
        return ["pre-push declares no CONTENT_SEEDER — nothing names the phase that stands the "
                "commit-scoped tree up"]
    actual = {phase_of[fn] for fn in reads_content if fn in phase_of} - {seeder}
    for extra in sorted(actual - declared):
        issues.append(f"pre-push phase {extra!r} reads the gate worktree but is not in "
                      "CONTENT_PHASES")
    for missing in sorted(declared - actual):
        issues.append(f"pre-push phase {missing!r} is declared commit-scoped but its body never "
                      "reads CONTENT — it still grades the working tree")

    # The THIRD half of this join — a phase that reads the right tree and still grades the main
    # checkout, because an inherited `GIT_DIR` beats `cwd` — is held by `_ambient_git_findings`
    # below, over a declared file set that includes this hook and `catalog.py`.

    deps, error = _plan_graph()
    if error:
        return issues + [error]
    for phase in sorted(declared):
        if phase not in deps:
            issues.append(f"pre-push plan omits the commit-scoped phase {phase!r}")
        elif "gate worktree" not in deps[phase]:
            issues.append(f"pre-push plan runs {phase!r} without waiting on 'gate worktree' — it "
                          "would grade an unseeded or absent tree")
    return issues


class _AmbientScope(NamedTuple):
    """How far the ambient-git arms reach into one file.

    `shapes` names the `subprocess.<attr>` launchers policed for the environment scrub; `no_bare_git`
    additionally refuses a direct `git` argv, which must go through `git_env.git` instead. Narrowing
    is declared per file and never discovered, because an undeclared exclusion and a forgotten one
    read identically from a list of checked files.
    """
    shapes: tuple[str, ...]
    no_bare_git: bool


#: The files whose git calls an inherited environment can rebind, and what is held in each. Both run
#: with `GIT_DIR` / `GIT_WORK_TREE` / `GIT_INDEX_FILE` exported into them by git, and an inherited
#: `GIT_DIR` BEATS `cwd`, so naming a repository with `cwd=` alone names nothing.
AMBIENT_GIT_SCOPE: "dict[str, _AmbientScope]" = {
    # `hooks/pre-push`: the PHASE STEPS. Measured 261107 in `.scratch/push5-261107.log` — the
    # regen-drift check SKIPped naming the four tracked files dirty in the MAIN CHECKOUT, from
    # inside a clean worktree at a detached HEAD.
    #
    # DECLARED correctly ambient, and deliberately outside the `no_bare_git` arm: this hook's own
    # `_git` helper asks one question — `git diff --name-only <remote>..<local>` for the push scope
    # — about the repository that is PUSHING, which is exactly the repository the binding git
    # exports into the hook names. Scrubbing it would buy nothing and the file is held elsewhere.
    os.path.join("hooks", "pre-push"): _AmbientScope(("Popen",), False),
    # `catalog.py`: EVERY launch shape, and no bare git. It runs from `hooks/pre-commit` and from
    # `hooks/pre-push`, so a rebinding environment is its normal case rather than a corner. Measured
    # 261107 against a decoy gitdir (`.scratch/gitdir-third-site-probe-261107.py`): all four of its
    # git readers answered about the DECOY, and `install-hooks` configured the decoy while printing
    # success. Its own git calls go through `git_env.git`, which takes `repo=` as a required
    # keyword, so the compiler holds the target; its CHILDREN — the book build, the test suite, the
    # render-digest re-entry — carry the scrub so a git call one level down cannot be rebound either.
    "catalog.py": _AmbientScope(("run", "Popen", "call", "check_call", "check_output"), True),
}


def _scrubbed_env(env: "ast.expr | None") -> bool:
    """Does this `env=` expression resolve to a scrubbed environment?

    Two accepted shapes, and no third: `git_env.clean_env(...)` itself, or a dict whose FIRST
    element unpacks it and adds only NAMED keys after it
    (`{**git_env.clean_env(), "PYTHONHASHSEED": seed}`). Both restrictions earn their place.
    `clean_env` DELETES the binding names, so a later `**os.environ` puts every one of them back —
    and a second splat anywhere after the scrub can carry them whatever it is called. Such a call
    reads as contained while being rebound, which is this failure wearing the fix's clothes.
    """
    if isinstance(env, ast.Call) and isinstance(env.func, ast.Attribute) and env.func.attr == "clean_env":
        return True
    if isinstance(env, ast.Dict) and env.keys and env.keys[0] is None:
        return _scrubbed_env(env.values[0]) and not any(k is None for k in env.keys[1:])
    return False


def _ambient_tree_findings(rel: str, scope: _AmbientScope, tree: ast.AST) -> list[str]:
    """The predicate itself, over one parsed file. Takes the tree so the sabotage arm below can
    drive the shipped code against synthetic sources instead of a restatement of it."""
    issues: list[str] = []
    launches = [n for n in ast.walk(tree)
                if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                and n.func.attr in scope.shapes]
    for node in launches:
        argv = node.args[0] if node.args else None
        head = (argv.elts[0].value if isinstance(argv, ast.List) and argv.elts
                and isinstance(argv.elts[0], ast.Constant) else None)
        if scope.no_bare_git and head == "git":
            issues.append(f"{rel}:{node.lineno} drives `git` through a bare subprocess call — "
                          "route it through `git_env.git(args, repo=...)`, which strips the "
                          "inherited binding AND passes `-C`, so the two defences fail in "
                          "different directions")
            continue
        if not _scrubbed_env(next((kw.value for kw in node.keywords if kw.arg == "env"), None)):
            issues.append(f"{rel}:{node.lineno} launches a child without passing "
                          "env=git_env.clean_env(...) — the child inherits the GIT_DIR git "
                          "exports into this hook, and an inherited GIT_DIR beats cwd, so "
                          "every git query it makes reads the WRONG REPOSITORY")
    return issues


def _ambient_git_findings() -> list[str]:
    """No declared file may launch a child that inherits a repository binding, or drive git itself.

    One check over `AMBIENT_GIT_SCOPE` rather than one check per file: the two halves of this class
    are the same predicate, and two checks over two files drift apart the moment a third file joins.
    """
    issues: list[str] = []
    for rel, scope in sorted(AMBIENT_GIT_SCOPE.items()):
        path = os.path.join(ROOT, rel)
        if not os.path.isfile(path):
            issues.append(f"{rel} is declared in AMBIENT_GIT_SCOPE but is not on disk — the "
                          "declaration names a file that moved, so nothing is being checked")
            continue
        with open(path, encoding="utf-8") as fh:
            tree = ast.parse(fh.read(), filename=path)
        # A declared file whose launches all vanished is a file this check stopped covering. Say so,
        # rather than reporting the silence as a pass. This is a claim about a REAL file, so it sits
        # here and not in the predicate, which also grades one-call synthetic sources.
        if not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                   and n.func.attr in scope.shapes for n in ast.walk(tree)):
            issues.append(f"{rel} contains no {'/'.join(scope.shapes)} call — either the launches "
                          "moved out of this file or the declared shapes are wrong, and either way "
                          "this check is now asserting nothing about it")
        issues += _ambient_tree_findings(rel, scope, tree)
    return issues + _ambient_sabotage_findings()


#: (label, source, must the predicate report it?). Each is one way the containment can be undone or
#: faked, with the shipped fix's own shape as the control. A check nobody has watched fail is not a
#: check, and a one-time manual sabotage decays the moment the predicate is edited.
_AMBIENT_SABOTAGE = (
    ("the shipped shape — git through the seam",
     'git_env.git(["status"], repo=ROOT)', False),
    ("a child with the scrub",
     'subprocess.run([sys.executable, "x.py"], cwd=ROOT, env=git_env.clean_env())', False),
    ("a child with the scrub plus a named key (the render-digest shape)",
     'subprocess.run(["x"], cwd=ROOT, env={**git_env.clean_env(), "PYTHONHASHSEED": s})', False),
    ("a child with NO env — the 261107 defect",
     'subprocess.run([sys.executable, "x.py"], cwd=ROOT)', True),
    ("a child handed the ambient environment",
     'subprocess.run(["x"], cwd=ROOT, env={**os.environ, "PYTHONHASHSEED": s})', True),
    ("the scrub undone by a later splat — contained in shape, rebound in fact",
     'subprocess.run(["x"], cwd=ROOT, env={**git_env.clean_env(), **os.environ})', True),
    ("bare git, cwd only — the losing defence",
     'subprocess.run(["git", "status"], cwd=ROOT, env=git_env.clean_env())', True),
)


def _ambient_sabotage_findings() -> list[str]:
    """Drive the predicate against each sabotage, and report when its verdict inverts."""
    scope = AMBIENT_GIT_SCOPE["catalog.py"]
    issues = []
    for label, src, want_finding in _AMBIENT_SABOTAGE:
        got = bool(_ambient_tree_findings("synthetic", scope, ast.parse(src)))
        if got != want_finding:
            verdict = "REPORTED" if got else "passed"
            issues.append(f"the ambient-git predicate {verdict} {label!r} ({src}) — it must "
                          f"{'report' if want_finding else 'pass'} it, so the check no longer "
                          "distinguishes a contained call from a rebound one")
    return issues


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
