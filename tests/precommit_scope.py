"""Pin the pre-commit force-stage to the paths it produced, and the receipt to the three sweeps.

Three distinct incidents on 261106 all ended with a commit containing work its author never named,
and none of them was visible to any standing defence. `hooks/_stage_scope.py` is the response; this
walks it against synthetic repositories, because the failure is a property of how `git commit`,
`GIT_INDEX_FILE` and the hook's `git add` compose, and no amount of reading the hook shows that.

Each incident is reconstructed as a scenario and paired with a control — a negative control that
reintroduces the defect and must go red, or a positive one that must stay quiet — so a check that
has stopped checking is distinguishable from a check that is passing.

  - **S1 swept IN.** A force-stage candidate dirty before the hook ran and never rewritten by it is
    somebody's work. Enforcing, it is withheld; auditing, it is staged and NAMED.
  - **S2 the boundary must not over-reach.** A candidate dirty on entry that the regeneration DID
    rewrite is generator output and must still be staged — otherwise a sibling who ran the build by
    hand leaves the committed HTML stale and reddens the regen-drift gate at the next push. This is
    the arm that makes the ownership test a WRITE test rather than a content test.
  - **S3 swept OUT.** `git commit -- <paths>` commits each named path's WORKING-TREE content and
    discards a partial `git add -p` of that same path. Plain git, no hook involved; the receipt is
    the only thing that says so before it lands.
  - **S4 travelled AHEAD.** A derived artifact regenerated from a source that is dirty and not in
    the commit lands before its source. The boundary does NOT prevent this and is not claimed to —
    the artifact is clean on entry and the hook genuinely wrote it — so what is pinned is that the
    receipt names it.

Every git call goes through `tools/git_env.py`, and the whole run stands inside the decoy gitdir
from `tests.hooks`. Reusing that object rather than copying it is deliberate: the 261106 damage came
from a second harness re-deriving containment and getting it wrong, so there is one implementation.
"""
from __future__ import annotations

import os
import sys
import tempfile

from tests.common import FAIL, PASS, ROOT
from tests.hooks import _AmbientGitdir  # noqa: PLC2701 — one containment implementation, not two

sys.path.insert(0, os.path.join(ROOT, "tools"))
import git_env  # noqa: E402 — resolved against ROOT, known only at import time

_HOOKS_DIR = os.path.join(ROOT, "hooks")

#: The synthetic repo's pre-commit hook. It imports the REAL `_stage_scope`, so a scenario exercises
#: the shipped module rather than a restatement of it. `REWRITE` is what the "generator" produces,
#: `CANDIDATES` is the force-stage pathspec, `ENFORCE` picks the audit-only or binding boundary, and
#: `BYPASS` is the sabotage switch that restores the unconditional `git add`.
_HOOK_TEMPLATE = '''#!/usr/bin/env python3
import os, subprocess, sys
sys.path.insert(0, {hooks_dir!r})
from _stage_scope import StageScope

ROOT = os.getcwd()
SCOPE = StageScope(ROOT)
SCOPE.snapshot()

for rel, body in {rewrite!r}:
    full = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(full) or ROOT, exist_ok=True)
    with open(full, "w", encoding="utf-8") as fh:
        fh.write(body.replace("@SRC@", open(os.path.join(ROOT, "src.tex"), encoding="utf-8").read().strip()
                              if os.path.exists(os.path.join(ROOT, "src.tex")) else ""))

CANDIDATES = {candidates!r}
if CANDIDATES:
    keep = CANDIDATES if {bypass!r} else SCOPE.owned(CANDIDATES, enforce={enforce!r})
    if keep:
        subprocess.run(["git", "add", "--", *keep], cwd=ROOT)

for line in SCOPE.report(enforce={enforce!r}):
    print(line)
'''


class _Repo:
    """A throwaway repository with a configurable pre-commit hook, driven through the scrubbed seam."""

    def __init__(self, tmp: str, name: str, *, rewrite=(), candidates=(),
                 enforce: bool = True, bypass: bool = False) -> None:
        self.path = os.path.join(tmp, name)
        self.hooks = os.path.join(tmp, name + "-hooks")
        self.nohooks = os.path.join(tmp, name + "-nohooks")
        os.makedirs(self.path)
        os.makedirs(self.hooks)
        os.makedirs(self.nohooks)
        self.issues: list[str] = []
        self.receipt = ""
        # Seed with the hook DISARMED. A scenario's base commit must establish a known HEAD, and a
        # base commit that ran the scenario's own regenerator would bake the regenerated content
        # into HEAD — which silently turned the S2 arm into a no-change commit and made a correct
        # boundary look like an over-reaching one. `arm()` installs the hook once the base exists.
        self.git("init", "-q")
        self._configure(self.nohooks)
        hook = os.path.join(self.hooks, "pre-commit")
        with open(hook, "w", encoding="utf-8") as fh:
            fh.write(_HOOK_TEMPLATE.format(hooks_dir=_HOOKS_DIR, rewrite=list(rewrite),
                                           candidates=list(candidates), enforce=enforce,
                                           bypass=bypass))
        os.chmod(hook, 0o755)

    def _configure(self, hooks_path: str) -> None:
        """Write the whole local config in one file write rather than four `git config` processes.

        Four scenarios times three arms is a lot of git startups on a loaded machine, and this is a
        repository nothing else will ever read. `hermetic=True` on every call already cuts global
        and system config out of reach, so the four settings below are the entire configuration.
        """
        with open(os.path.join(self.path, ".git", "config"), "a", encoding="utf-8") as fh:
            fh.write(f"[user]\n\temail = scope@example.invalid\n\tname = scope\n"
                     f"[commit]\n\tgpgsign = false\n[core]\n\thooksPath = {hooks_path}\n")

    def arm(self) -> None:
        self._configure(self.hooks)

    def git(self, *args: str):
        done = git_env.git(list(args), repo=self.path, hermetic=True, timeout=120)
        if done.returncode and args[0] not in ("diff",):
            self.issues.append(f"synthetic repo: git {' '.join(args)} -> {done.returncode}: "
                               f"{done.stderr.strip()[:200]}")
        return done

    def write(self, rel: str, body: str) -> None:
        full = os.path.join(self.path, rel)
        os.makedirs(os.path.dirname(full) or self.path, exist_ok=True)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(body)

    def commit(self, message: str, *pathspec: str):
        done = self.git("commit", "-q", "-m", message, *(("--", *pathspec) if pathspec else ()))
        self.receipt = done.stdout + done.stderr
        return done

    def head_files(self) -> set[str]:
        return {p for p in self.git("show", "--name-only", "--format=", "HEAD").stdout.split("\n") if p}

    def blob(self, rel: str) -> str:
        return self.git("show", f"HEAD:{rel}").stdout


def _seed(repo: _Repo) -> None:
    repo.write("CLAUDE.md", "doc v1\n")
    repo.write("gen/page.html", "GENERATED v1\n")
    repo.write("derived.json", "derived-from:BASE\n")
    repo.write("src.tex", "BASE\n")
    repo.write("src.py", "line1\n")
    repo.git("add", "-A")
    repo.git("commit", "-q", "-m", "base")
    repo.arm()


def _want(issues: list[str], label: str, condition: bool, detail: str) -> None:
    if not condition:
        issues.append(f"{label}: {detail}")


def _s1_swept_in(tmp: str) -> list[str]:
    """A candidate dirty on entry that the run never rewrote: withheld, named, and the control fires."""
    issues: list[str] = []
    for enforce, bypass, expect_staged, expect_phrase in (
            (True, False, False, "WITHHELD from"),
            (False, False, True, "WOULD BE WITHHELD"),
            (True, True, True, ""),          # sabotage: the unconditional `git add` is back
    ):
        name = f"s1-{'enforce' if enforce else 'audit'}{'-sabotage' if bypass else ''}"
        repo = _Repo(tmp, name, rewrite=(), candidates=("gen/page.html",),
                     enforce=enforce, bypass=bypass)
        _seed(repo)
        repo.write("gen/page.html", "A SIBLING'S IN-FLIGHT HAND EDIT\n")
        repo.write("CLAUDE.md", "doc v2\n")
        repo.commit("pathspec: CLAUDE.md only", "CLAUDE.md")
        issues.extend(repo.issues)
        staged = "gen/page.html" in repo.head_files()
        _want(issues, f"S1 {name}", staged == expect_staged,
              f"gen/page.html {'landed' if staged else 'did not land'} in a commit that named only "
              f"CLAUDE.md; expected {'landed' if expect_staged else 'withheld'}. "
              f"HEAD={sorted(repo.head_files())}")
        if expect_phrase:
            _want(issues, f"S1 {name}", expect_phrase in repo.receipt,
                  f"the receipt never said {expect_phrase!r}:\n{repo.receipt[-600:]}")
    return issues


def _s2_boundary_does_not_overreach(tmp: str) -> list[str]:
    """Dirty on entry AND rewritten by the run is generator output — it must still be staged."""
    issues: list[str] = []
    repo = _Repo(tmp, "s2", rewrite=(("gen/page.html", "GENERATED v2\n"),),
                 candidates=("gen/page.html",), enforce=True)
    _seed(repo)
    repo.write("gen/page.html", "GENERATED v2\n")   # a sibling ran the build by hand: dirty but correct
    repo.write("CLAUDE.md", "doc v2\n")
    repo.commit("pathspec: CLAUDE.md only", "CLAUDE.md")
    issues.extend(repo.issues)
    _want(issues, "S2", "gen/page.html" in repo.head_files(),
          "a regenerated page that was dirty on entry was WITHHELD — the boundary is testing content "
          "instead of authorship, which leaves the committed site stale after any hand-run build. "
          f"HEAD={sorted(repo.head_files())}")
    _want(issues, "S2", repo.blob("gen/page.html") == "GENERATED v2\n",
          f"the staged content is not the regeneration's: {repo.blob('gen/page.html')!r}")
    _want(issues, "S2", "WITHHELD" not in repo.receipt,
          f"the receipt reported a withholding that did not happen:\n{repo.receipt[-600:]}")
    return issues


def _s3_swept_out(tmp: str) -> list[str]:
    """A pathspec commit takes the WORKING-TREE content of a named path over the author's staged hunk."""
    issues: list[str] = []
    repo = _Repo(tmp, "s3", rewrite=(), candidates=(), enforce=True)
    _seed(repo)
    repo.write("src.py", "line1\nMY HUNK\n")
    repo.git("add", "src.py")                                   # the author stages ONE hunk
    repo.write("src.py", "line1\nMY HUNK\nA SIBLING'S IN-FLIGHT HUNK\n")
    repo.commit("pathspec: src.py", "src.py")
    issues.extend(repo.issues)
    _want(issues, "S3", "A SIBLING'S IN-FLIGHT HUNK" in repo.blob("src.py"),
          "git no longer commits the working-tree content of a named path — the scenario has stopped "
          f"reproducing the incident: {repo.blob('src.py')!r}")
    _want(issues, "S3", "did NOT stage" in repo.receipt and "src.py" in repo.receipt,
          f"the receipt did not flag the unstaged version it committed:\n{repo.receipt[-800:]}")

    # Positive control: an ordinary index commit cannot disagree with itself, so the receipt is quiet.
    quiet = _Repo(tmp, "s3-control", rewrite=(), candidates=(), enforce=True)
    _seed(quiet)
    quiet.write("src.py", "line1\nMY HUNK\n")
    quiet.git("add", "src.py")
    quiet.commit("index commit")
    issues.extend(quiet.issues)
    _want(issues, "S3 control", "did NOT stage" not in quiet.receipt,
          f"an ordinary index commit raised the unstaged-version finding:\n{quiet.receipt[-600:]}")
    return issues


def _s4_travelled_ahead(tmp: str) -> list[str]:
    """A projection of a dirty, uncommitted source lands early. The boundary cannot see it; the receipt can."""
    issues: list[str] = []
    repo = _Repo(tmp, "s4", rewrite=(("derived.json", "derived-from:@SRC@\n"),),
                 candidates=("derived.json",), enforce=True)
    _seed(repo)
    repo.write("src.tex", "AN UNCOMMITTED SOURCE EDIT\n")       # a sibling's in-flight source
    repo.write("CLAUDE.md", "doc v2\n")
    repo.commit("pathspec: CLAUDE.md only", "CLAUDE.md")
    issues.extend(repo.issues)
    _want(issues, "S4", "derived.json" in repo.head_files(),
          "the scenario stopped reproducing: the projection did not land at all, so nothing pins the "
          f"receipt. HEAD={sorted(repo.head_files())}")
    _want(issues, "S4", "AN UNCOMMITTED SOURCE EDIT" in repo.blob("derived.json")
          and "src.tex" not in repo.head_files(),
          "the projection did not travel ahead of its source, so this is no longer incident 3")
    _want(issues, "S4", "STAGED BY THIS HOOK" in repo.receipt and "derived.json" in repo.receipt,
          f"the receipt did not name the path the hook added:\n{repo.receipt[-800:]}")

    # Positive control: nothing added beyond the pathspec means no such block.
    quiet = _Repo(tmp, "s4-control", rewrite=(), candidates=(), enforce=True)
    _seed(quiet)
    quiet.write("CLAUDE.md", "doc v2\n")
    quiet.commit("pathspec: CLAUDE.md only", "CLAUDE.md")
    issues.extend(quiet.issues)
    _want(issues, "S4 control", "STAGED BY THIS HOOK" not in quiet.receipt,
          f"a hook that staged nothing still claimed it had:\n{quiet.receipt[-600:]}")
    return issues


def _declaration_findings() -> list[str]:
    """The hook must route every force-stage through the boundary, and declare which mode it is in."""
    import ast
    path = os.path.join(ROOT, "hooks", "pre-commit")
    with open(path, encoding="utf-8") as fh:
        source = fh.read()
    tree = ast.parse(source, filename=path)
    issues: list[str] = []

    enforce = [n for n in tree.body if isinstance(n, ast.Assign)
               and any(isinstance(t, ast.Name) and t.id == "ENFORCE_STAGE_SCOPE" for t in n.targets)]
    if not enforce:
        issues.append("hooks/pre-commit declares no ENFORCE_STAGE_SCOPE — the force-stage boundary's "
                      "mode must be stated at module scope, not buried at a call site")

    # Every `git add` the hook issues must be governed by `SCOPE.owned(...)`, in either of the two
    # shapes the hook uses: the add sits inside an `if`/`for` whose condition IS the owned() call, or
    # its argv references a name that owned() produced. Both are checked against the parse rather
    # than against a naming convention, so a new force-stage site cannot opt out by looking tidy.
    def _calls_owned(node: ast.AST) -> bool:
        return any(isinstance(c, ast.Call) and isinstance(c.func, ast.Attribute)
                   and c.func.attr == "owned" for c in ast.walk(node))

    guarded_lines: set[int] = set()
    owned_names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.If) and _calls_owned(node.test):
            guarded_lines.update(range(node.lineno, (node.end_lineno or node.lineno) + 1))
        elif isinstance(node, ast.For) and _calls_owned(node.iter):
            guarded_lines.update(range(node.lineno, (node.end_lineno or node.lineno) + 1))
            owned_names.update(n.id for n in ast.walk(node.target) if isinstance(n, ast.Name))
        elif isinstance(node, ast.Assign) and _calls_owned(node.value):
            owned_names.update(n.id for t in node.targets for n in ast.walk(t)
                               if isinstance(n, ast.Name))

    for node in ast.walk(tree):
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr == "run" and node.args):
            continue
        argv = node.args[0]
        elts = getattr(argv.left if isinstance(argv, ast.BinOp) else argv, "elts", None)
        if not elts:
            continue
        if [e.value for e in elts[:2] if isinstance(e, ast.Constant)] != ["git", "add"]:
            continue
        refers = {n.id for n in ast.walk(argv) if isinstance(n, ast.Name)} & owned_names
        if node.lineno not in guarded_lines and not refers:
            issues.append(f"hooks/pre-commit:{node.lineno} force-stages without passing the pathspec "
                          "through SCOPE.owned() — a path the regeneration never wrote would be swept "
                          "out of whoever's working tree it belongs to")
    return issues


def check_force_stage_scope_and_receipt():
    """The force-stage stays inside what this run produced, and the commit's staged set is reported."""
    issues = _declaration_findings()
    decoy = _AmbientGitdir()
    try:
        with decoy:
            with tempfile.TemporaryDirectory(prefix="gc-stage-scope-") as tmp:
                for scenario in (_s1_swept_in, _s2_boundary_does_not_overreach,
                                 _s3_swept_out, _s4_travelled_ahead):
                    try:
                        issues.extend(scenario(tmp))
                    except Exception as exc:  # noqa: BLE001 — a crash must not suppress the gitdir verdict
                        issues.append(f"{scenario.__name__} raised {type(exc).__name__}: {exc}")
        issues.extend(decoy.findings())
    finally:
        decoy.cleanup()
    return (FAIL if issues else PASS), issues
