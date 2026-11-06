#!/usr/bin/env python3
"""A throwaway worktree at a pushed ref, seeded so a content gate's verdict is a property of a COMMIT.

`catalog_tests.py`'s regen-drift check already states the principle and already implements it, for
one check: *the verdict is a property of a commit, and a working tree mid-edit is not one.* Every
other content check in the pre-push gate reads the working tree, which in a fleet checkout is never
the thing being pushed. Measured 261106, five readings across four checks in one session, wrong in
BOTH directions:

  - three FALSE REDS, each naming a sibling's uncommitted edit and blocking a pusher whose own
    commits were clean (a dirty `downloads/*-starter.md` reddened the skill-bundle check; a dirty
    lander reddened READ-CITE; a dirty `references.bib` reddened CITE-FRESH and CITE-DEDUP);
  - one FALSE GREEN, which is the expensive direction: a commit landed a lander citing three keys
    and did NOT commit `book/references.bib`. The owning agent's uncommitted bib entries made
    READ-CITE pass locally, so the pre-push gate would have gone green and CI's `--full` — which
    checks out the commit — would have failed after the transfer. **A gate a sibling's uncommitted
    work can turn green is not gating the push.**

Nothing in the gate's output says which way it is wrong this time. Pointing the content phases at
the pushed ref removes the whole class, and it ASSERTS MORE than today rather than less: the
dirty-source SKIPs disappear, so regen-drift — which currently never runs on this machine, because
the tree is never clean — actually runs.

## Seeding, and why a missed class reads as a broken change

`git worktree add` reproduces only what git tracks. This repo keeps several classes of untracked
local state that the gates nonetheless require, and a worktree missing one opens on reds that NAME
AN ASSET rather than a claim — the tell CLAUDE.md already records, having misled two agents. So the
seed set is DECLARED as data below, with the `.gitignore` line that puts each path out of git's
reach, and `tests/test_gate_worktree.py` holds the declaration against that file: an ignore rule
that moves breaks a test instead of a push.

Four classes, each resolved by its own cheapest route:

  - SYMLINK a shared install. The three `node_modules` trees are hundreds of MB and identical;
    linking is instant and `npm install` in a worktree would mutate every live agent's tree at once.
  - SYMLINK a content-addressed cache. The mermaid render cache keys every entry on the hash of its
    source, so two trees sharing it cannot read each other's stale output — and a cold cache would
    re-render every diagram through `mmdc`.
  - COPY a built artifact rather than link it. The two cover thumbs have an emitter in principle, but
    it needs LuaLaTeX, Poppler and Pillow. The .NET deck-schema harness is copied for a different
    reason: its consumer rebuilds it when it reads as stale, and a symlink would route that write
    into the main checkout.
  - RUN THE EMITTER for a generated tree. `book/web/` is a 29 MB MkDocs projection and the published
    web edition; four test modules enumerate `book/web/docs/*.md`, so a worktree without it starts
    red in several places at once. Its emitter re-emits all 127 pages in a few seconds. Never copy
    it: a copy is someone else's render and goes stale the moment either tree's prose moves.

One artifact is deliberately NOT seeded from a declaration: `book/mage-book.pdf`. The rendered-PDF
caption-orphan sensor reads it, and it is produced by the book-PDF phase, which stays in the main
checkout because its reuse caches live there (578 MB of them) and because that phase is the only
station that refreshes the author's local review PDFs. `adopt()` hard-links it in after that phase
finishes, so the sensor keeps exactly the input it has today. Stated plainly rather than hidden: that
one sensor therefore keeps working-tree scope. It is unchanged, not weakened — every other check in
the phase gains commit scope.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import time

#: A seeded path, its class, and the `.gitignore` pattern that keeps git from reproducing it.
#: `optional` marks a path whose absence in the main checkout is a normal state rather than a gap
#: (a cache nobody has warmed yet, a thumb nobody has built).
#:
#: SYMLINK is only ever applied to a tree whose contents are keyed on their own inputs or are a
#: read-only install. Linking a tree the gate WRITES into would hand the worktree a channel into the
#: main checkout, which is the whole thing this helper exists to close.
SEED: tuple[tuple[str, str, str, bool], ...] = (
    ("node_modules", "symlink", "node_modules", False),
    ("book/node_modules", "symlink", "/book/node_modules", False),
    ("workbench/node_modules", "symlink", "node_modules", False),
    ("book/.mermaid-svg-cache", "symlink", "/book/.mermaid-svg-cache/", True),
    ("book/assets/cover-thumb.png", "copy", "/book/assets/cover-thumb.png", True),
    ("book/assets/handbook-cover-thumb.png", "copy", "/book/assets/handbook-cover-thumb.png", True),
    # COPIED, not symlinked, and the 8 MB is the price of that choice: the deck-schema check calls
    # `ensure_harness`, which REBUILDS the .NET harness when it reads as stale. A symlink would send
    # that write into the main checkout. Found by a full per-check parity run rather than by reading
    # `.gitignore`: without it the harness is absent, `course: committed pptx OOXML schema validity`
    # SKIPs on a missing toolchain, and the gate quietly asserts one thing less than the checkout.
    ("tools/pptx-validate-harness/bin", "copy-tree", "tools/pptx-validate-harness/bin/", True),
)

#: A copied build artifact whose consumer decides freshness by MTIME, and the sources it is compared
#: against. `git worktree add` stamps every checked-out file with the time of the checkout, so a
#: copied binary is older than its own sources the moment it lands and the consumer re-derives it.
#: Measured 261106: the deck-schema harness rebuilt on first use, 50.7s against 8.5s once current.
#:
#: Re-stamping is sound only when the worktree's sources are byte-identical to the ones the copied
#: binary was built from — so `_freshen` CHECKS that and otherwise leaves the rebuild to happen,
#: which is the correct outcome when the pushed commit changes the harness.
MTIME_FRESHENED: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("tools/pptx-validate-harness/bin/Release/net8.0/ooxml-validate.dll",
     ("tools/pptx-validate-harness/Program.cs",
      "tools/pptx-validate-harness/ooxml-validate.csproj")),
)

#: Emitters to run inside the fresh worktree, each (argv-tail, the tree it emits).
SEED_EMITTERS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("book/book_mkdocs.py",), "book/web"),
)

#: Artifacts handed over from the main checkout AFTER the phase that builds them. Not part of the
#: declared seed: each one keeps working-tree scope by construction, which is why the list is short
#: and each entry carries its reason in the module docstring.
ADOPTABLE: tuple[str, ...] = ("book/mage-book.pdf",)


class SeedGap(Exception):
    """A declared seed source is missing from the main checkout and is not optional."""


#: How long `git worktree add` may sit before the seeding gives up and says why. A worktree checkout
#: of this repo is 2,914 files and measured 6-15s on a calm host; it also CONTENDS, and a hang there
#: would hang a push with no output at all. Measured 261106 at load 113 with a sibling's `git commit`
#: 16 minutes into its own pre-commit hook: a `git worktree add` sat at **0.07s of CPU over 1m53s**
#: and counting. The mechanism was not isolated — the repo's own lock and host I/O are both live
#: candidates — so this bounds the symptom and names the discriminator rather than claiming a cause.
WORKTREE_ADD_TIMEOUT = 420.0


def _run(argv: list[str], cwd: str, timeout: float | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=timeout)


def _lock_holders(root: str) -> str:
    """Who holds the repo's index, per the sibling lock that NAMES its owner.

    `.git` is a FILE in this submodule, so the gitdir has to be resolved; and a `next-index-<PID>`
    lock beside `index.lock` is a stronger discriminator than the lock's size or age.
    """
    gitdir = _run(["git", "rev-parse", "--git-dir"], root).stdout.strip()
    if not gitdir:
        return ""
    holders = []
    try:
        for name in os.listdir(gitdir):
            if name.startswith("next-index-") and name.endswith(".lock"):
                holders.append(name[len("next-index-"):-len(".lock")])
    except OSError:
        return ""
    return ", ".join(sorted(holders))


class GateWorktree:
    """Create, seed, hand out and remove one throwaway worktree.

    Only paths this object created are ever removed, and the parent directory comes from
    `mkdtemp`, so teardown cannot reach a worktree somebody else is using.
    """

    def __init__(self, root: str, ref: str, *, label: str = "gate") -> None:
        self.root = os.path.abspath(root)
        self.ref = ref
        self.label = label
        self.parent: str | None = None
        self.path: str | None = None
        self.log: list[str] = []
        self.seconds: dict[str, float] = {}

    # ── create ────────────────────────────────────────────────────────────────────────────────────

    def create(self) -> str:
        t0 = time.monotonic()
        self.parent = tempfile.mkdtemp(prefix=f"gc-{self.label}-")
        path = os.path.join(self.parent, "wt")
        try:
            out = _run(["git", "worktree", "add", path, "--detach", self.ref], self.root,
                       timeout=WORKTREE_ADD_TIMEOUT)
        except subprocess.TimeoutExpired:
            # The killed `add` may already have registered the worktree, so unregister through git
            # before reclaiming the directory. Never `git worktree prune`: it is repo-wide and would
            # reach other agents' entries.
            _run(["git", "worktree", "remove", "--force", path], self.root, timeout=120)
            shutil.rmtree(self.parent, ignore_errors=True)
            self.parent = None
            holders = _lock_holders(self.root)
            raise SeedGap(
                f"git worktree add did not finish in {WORKTREE_ADD_TIMEOUT:.0f}s. "
                + (f"A sibling holds the repo index; the next-index lock names PID(s) {holders} — "
                   "check whether they are alive before touching anything. " if holders else "")
                + "Wait for the checkout to go quiet and push again, or run with "
                  "GC_PREPUSH_WORKTREE=0 to grade the working tree.") from None
        if out.returncode:
            shutil.rmtree(self.parent, ignore_errors=True)
            self.parent = None
            raise SeedGap(f"git worktree add failed for {self.ref}:\n{out.stdout}{out.stderr}")
        self.path = path
        self.seconds["create"] = time.monotonic() - t0
        self.log.append(f"worktree at {self.ref[:9]} -> {path} ({self.seconds['create']:.1f}s)")
        return path

    # ── seed ──────────────────────────────────────────────────────────────────────────────────────

    def seed(self) -> None:
        """Reproduce every declared class of untracked local state, then run the emitters.

        Raises `SeedGap` rather than continuing half-seeded: a gate that opens on a missing asset
        reports the asset, and somebody then reads that as a defect in the pushed change.
        """
        if self.path is None:
            raise SeedGap("seed() before create()")
        t0 = time.monotonic()
        linked = copied = 0
        for rel, kind, _pattern, optional in SEED:
            src = os.path.join(self.root, rel)
            dst = os.path.join(self.path, rel)
            if not os.path.exists(src):
                if optional:
                    self.log.append(f"seed: {rel} absent in the main checkout — optional, skipped")
                    continue
                raise SeedGap(f"seed source missing: {rel} (declared non-optional)")
            os.makedirs(os.path.dirname(dst) or self.path, exist_ok=True)
            if os.path.lexists(dst):
                continue  # tracked after all, or a repeat call
            if kind == "symlink":
                os.symlink(src, dst)
                linked += 1
            elif kind == "copy":
                shutil.copy2(src, dst)
                copied += 1
            elif kind == "copy-tree":
                shutil.copytree(src, dst)
                copied += 1
            else:
                raise SeedGap(f"unknown seed class {kind!r} for {rel}")
        self.seconds["seed_assets"] = time.monotonic() - t0
        self.log.append(f"seed: {linked} symlink(s) + {copied} copy/copies "
                        f"({self.seconds['seed_assets']:.1f}s)")

        self._freshen()

        t1 = time.monotonic()
        for tail, emits in SEED_EMITTERS:
            out = _run([sys.executable, *tail], self.path)
            if out.returncode or not os.path.isdir(os.path.join(self.path, emits)):
                raise SeedGap(f"seed emitter {' '.join(tail)} failed (expected {emits}):\n"
                              f"{out.stdout}{out.stderr}")
        self.seconds["seed_emit"] = time.monotonic() - t1
        self.log.append(f"seed: {len(SEED_EMITTERS)} emitter(s) "
                        f"({self.seconds['seed_emit']:.1f}s)")

    def _freshen(self) -> None:
        """Re-stamp a copied binary so an mtime-based consumer does not re-derive it.

        Only when the worktree's sources are byte-identical to the checkout's — otherwise the copied
        binary genuinely is not a build of this tree, and letting the consumer rebuild is right.
        """
        for artifact, sources in MTIME_FRESHENED:
            target = os.path.join(self.path or "", artifact)
            if not os.path.isfile(target):
                continue
            try:
                same = all(
                    open(os.path.join(self.root, s), "rb").read()
                    == open(os.path.join(self.path or "", s), "rb").read()
                    for s in sources)
            except OSError:
                same = False
            if not same:
                self.log.append(f"seed: {artifact} left stale — its sources differ between the "
                                "checkout and the pushed commit, so its consumer must rebuild it")
                continue
            newest = max(os.path.getmtime(os.path.join(self.path or "", s)) for s in sources)
            os.utime(target, (newest + 1, newest + 1))

    def adopt(self, rel: str) -> bool:
        """Hand over an artifact the main checkout just built. Returns whether it landed.

        Hard-link first (free, and the reader only reads); fall back to a copy across devices.
        """
        if rel not in ADOPTABLE:
            raise SeedGap(f"{rel} is not declared adoptable")
        if self.path is None:
            return False
        src, dst = os.path.join(self.root, rel), os.path.join(self.path, rel)
        if not os.path.isfile(src) or os.path.lexists(dst):
            return False
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        try:
            os.link(src, dst)
        except OSError:
            try:
                shutil.copy2(src, dst)
            except OSError:
                return False
        self.log.append(f"adopt: {rel} from the main checkout (keeps working-tree scope)")
        return True

    # ── remove ────────────────────────────────────────────────────────────────────────────────────

    def remove(self) -> None:
        """Remove only what this object created; never prune anyone else's worktree.

        Teardown has to reclaim the disk even when the unregistration cannot run — measured 261106,
        `git worktree remove` under a busy checkout left three registered-but-deleted entries behind
        because the directory went and the bookkeeping did not. So the failure is RECORDED: a stale
        entry costs a line in `git worktree list` and nothing else, while a silently retained 500 MB
        checkout per push would be the real damage. `git worktree prune` is repo-wide and is never
        called from here — it would reach every other agent's registration too.
        """
        if self.path is not None:
            try:
                done = _run(["git", "worktree", "remove", "--force", self.path], self.root,
                            timeout=120)
                if done.returncode:
                    self.log.append(f"teardown: `git worktree remove` refused {self.path} "
                                    f"({done.stderr.strip()[:200]}); directory removed, registration "
                                    "left for a later prune")
            except subprocess.TimeoutExpired:
                self.log.append(f"teardown: `git worktree remove` timed out on {self.path}; "
                                "directory removed, registration left for a later prune")
            self.path = None
        if self.parent is not None:
            shutil.rmtree(self.parent, ignore_errors=True)
            self.parent = None

    def __enter__(self) -> "GateWorktree":
        self.create()
        self.seed()
        return self

    def __exit__(self, *exc: object) -> None:
        self.remove()


def gitignore_patterns(root: str) -> set[str]:
    """Every non-comment pattern in the repo's root `.gitignore`."""
    try:
        with open(os.path.join(root, ".gitignore"), encoding="utf-8") as fh:
            lines = fh.read().splitlines()
    except OSError:
        return set()
    return {ln.strip() for ln in lines if ln.strip() and not ln.lstrip().startswith("#")}
