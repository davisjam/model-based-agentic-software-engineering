#!/usr/bin/env python3
"""Merge a worktree branch into main and prove the MERGED tree is green.

Why this exists. The repo rule is "verify a merge on the MERGED tree, not on the branch" — two
branches can each be green against a different main and be red together. The rule was written after
a 261004 incident and restated in CLAUDE.md, and on 261006 the orchestrator merged a wave on its
branch numbers anyway and left main red: a coverage gate walked export snapshots a sibling wave had
committed, 1502/1503, invisible from either branch alone.

The failure was not ignorance of the rule. It was that merging is one command and verifying is six,
so under time pressure the six get dropped. This tool makes them one command, which is the only
version of that rule that survives a busy session.

It does NOT undo anything by itself. A failed landing prints the exact restore command and stops —
destructive git on main is the author's call, never a script's.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Each gate is (label, argv, cwd-relative-to-ROOT, seconds). Ordered cheapest-first so a broken
# tree reports in a minute rather than twenty. The browser and a11y tiers can hang at zero CPU,
# which is why every one of these carries an explicit timeout rather than trusting the runner.
GATES: tuple[tuple[str, tuple[str, ...], str, int], ...] = (
    ("build", ("npm", "run", "build"), "workbench", 300),
    ("tsc", ("npx", "tsc", "--noEmit"), "workbench", 300),
    ("node", ("npm", "test"), "workbench", 900),
    ("browser", ("npm", "run", "test:browser"), "workbench", 900),
    ("a11y", ("npm", "run", "test:a11y"), "workbench", 900),
)

# The a11y reflow and focus checks only reproduce under the runner's wider font metrics, so the
# local run must simulate them or it reports green on a tree CI will fail.
GATE_ENV: dict[str, dict[str, str]] = {"a11y": {"WB_F6_SIMULATE_CI_FONTS": "1"}}


@dataclass(frozen=True)
class GateResult:
    label: str
    ok: bool
    seconds: float
    summary: str


def _git(*args: str) -> str:
    done = subprocess.run(("git", *args), cwd=ROOT, capture_output=True, text=True)
    if done.returncode != 0:
        raise SystemExit(f"git {' '.join(args)} failed:\n{done.stderr.strip()}")
    return done.stdout.strip()


def _patch_ids(rev_range: str) -> set[str]:
    """Patch-ids for a commit range. Content identity, which is what survives a rebase."""
    out: set[str] = set()
    for sha in _git("log", "--format=%H", rev_range).splitlines():
        if not sha:
            continue
        show = subprocess.run(("git", "show", sha), cwd=ROOT, capture_output=True, text=True)
        pid = subprocess.run(
            ("git", "patch-id", "--stable"), input=show.stdout, cwd=ROOT,
            capture_output=True, text=True,
        ).stdout.split(" ")[0].strip()
        if pid:
            out.add(pid)
    return out


def _node_bin() -> str:
    """The bin directory for the node version this repo pins.

    Without this the gates run on whatever node is first on PATH — v20 on this machine, against a
    repo pinned to v24 — and `npm run build` exits 1 in about a second. That reads as a red merge.
    A control that cries wolf is worse than no control, because the next red gets waved through, so
    this resolves the pinned version and REFUSES to run rather than guessing.
    """
    import os

    nvmrc = ROOT / ".nvmrc"
    if not nvmrc.is_file():
        raise SystemExit(".nvmrc is missing — cannot establish which node the gates must run on")
    want = nvmrc.read_text().strip().lstrip("v")
    nvm_dir = Path(os.environ.get("NVM_DIR", Path.home() / ".nvm"))
    candidates = sorted((nvm_dir / "versions" / "node").glob(f"v{want}*"))
    if not candidates:
        raise SystemExit(f"node v{want} (from .nvmrc) is not installed under {nvm_dir}; run `nvm install`")
    chosen = candidates[-1] / "bin"
    probe = subprocess.run((str(chosen / "node"), "--version"), capture_output=True, text=True)
    actual = probe.stdout.strip().lstrip("v")
    if not actual.startswith(want.split(".")[0]):
        raise SystemExit(f"resolved node {actual} does not satisfy .nvmrc v{want}")
    return str(chosen)


def _run_gate(label: str, argv: tuple[str, ...], cwd: str, limit: int) -> GateResult:
    import os

    env = dict(os.environ) | GATE_ENV.get(label, {})
    env["PATH"] = _node_bin() + os.pathsep + env.get("PATH", "")
    started = time.monotonic()
    try:
        done = subprocess.run(
            argv, cwd=ROOT / cwd, capture_output=True, text=True, timeout=limit, env=env,
        )
    except subprocess.TimeoutExpired:
        return GateResult(label, False, time.monotonic() - started, f"TIMED OUT after {limit}s")
    elapsed = time.monotonic() - started
    text = done.stdout + done.stderr
    counts = [ln.strip() for ln in text.splitlines() if ln.startswith(("ℹ tests", "ℹ pass", "ℹ fail"))]
    summary = " ".join(counts) if counts else (f"exit {done.returncode}")
    # node:test exits non-zero on a TODO-marked expected failure, so the counted `fail` line is the
    # verdict where one exists; the exit code is the fallback for gates that print no counts.
    failed = next((c for c in counts if c.startswith("ℹ fail")), None)
    ok = (failed == "ℹ fail 0") if failed is not None else (done.returncode == 0)
    return GateResult(label, ok, elapsed, summary)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("branches", nargs="+", help="worktree branches to land, in order")
    ap.add_argument("--gates", default="", help="comma-separated subset (default: all)")
    ap.add_argument("--dry-run", action="store_true", help="show the plan and exit")
    args = ap.parse_args()

    wanted = [g for g in GATES if not args.gates or g[0] in args.gates.split(",")]
    if args.gates and not wanted:
        raise SystemExit(f"no gate matches {args.gates!r}; known: {', '.join(g[0] for g in GATES)}")

    if _git("rev-parse", "--abbrev-ref", "HEAD") != "main":
        raise SystemExit("land.py runs on main; check it out first")
    dirty = _git("status", "--porcelain")
    if any(not ln.startswith("??") for ln in dirty.splitlines()):
        raise SystemExit("working tree has uncommitted changes; commit or stash before landing")

    base = _git("rev-parse", "HEAD")
    print("LANDING PLAN")
    print(f"  main at      {base[:9]}")
    for b in args.branches:
        try:
            ahead = _git("rev-list", "--count", f"main..{b}")
        except SystemExit:
            raise SystemExit(f"unknown branch: {b}")
        print(f"  land         {b} (+{ahead} commit(s) over main)")
    print(f"  then verify  {', '.join(g[0] for g in wanted)} on the MERGED tree")
    print(f"  restore with git reset --hard {base[:9]}   (printed again if a gate fails)")
    if args.dry_run:
        return 0

    on_main = _patch_ids("origin/main..main") if _git("rev-parse", "--verify", "-q", "origin/main") else set()
    for b in args.branches:
        dupes = len(_patch_ids(f"main..{b}") & on_main)
        if dupes:
            print(f"\n  note: {dupes} commit(s) on {b} are already on main by content (rebase will drop them)")
        print(f"\n  merging {b} ...")
        done = subprocess.run(("git", "merge", "--no-ff", "--no-edit", b), cwd=ROOT,
                              capture_output=True, text=True)
        if done.returncode != 0:
            print(f"  MERGE FAILED for {b}:\n{done.stdout}{done.stderr}")
            print(f"  restore: git merge --abort   (then git reset --hard {base[:9]} if needed)")
            return 1

    print(f"\nVERIFYING THE MERGED TREE ({_git('rev-parse', 'HEAD')[:9]})")
    results: list[GateResult] = []
    for label, argv, cwd, limit in wanted:
        r = _run_gate(label, argv, cwd, limit)
        results.append(r)
        print(f"  {'ok  ' if r.ok else 'FAIL'}  {label:9s} {r.seconds:6.1f}s  {r.summary}")
        if not r.ok:
            break

    bad = [r for r in results if not r.ok]
    if bad:
        print(f"\nRED after landing {', '.join(args.branches)} — main is NOT safe to push.")
        print(f"  first failure: {bad[0].label} ({bad[0].summary})")
        print(f"  restore main:  git reset --hard {base[:9]}")
        print("  (each branch was green alone, or it would not have been offered; this is the")
        print("   merge interaction the tool exists to catch. Fix forward or restore — your call.)")
        return 1

    print(f"\nGREEN. main {base[:9]} -> {_git('rev-parse', 'HEAD')[:9]}, "
          f"{len(results)} gate(s) in {sum(r.seconds for r in results):.0f}s.")
    print("  push with: git push origin main")
    return 0


if __name__ == "__main__":
    sys.exit(main())
