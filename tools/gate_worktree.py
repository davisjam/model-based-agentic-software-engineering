#!/usr/bin/env python3
"""A worktree at a pushed ref, seeded so a content gate's verdict is a property of a COMMIT.

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
reach, and the commit-scope check in `tests/hooks.py` holds the declaration against that file: an
ignore rule that moves breaks a test instead of a push. (That check, not the
`tests/test_gate_worktree.py` this paragraph named until 261106 — no such module was ever written,
and a citation to a file nobody can open is how a reader concludes the guard does not exist.)

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

## PERSISTENT, and why the tree is PROVED equal to the ref before anything grades it

The tree is reused across pushes, and `git -C <wt> checkout --detach <sha>` rewrites only the files
that differ. That is the whole optimization: on this machine Microsoft Defender charges for file
CREATION, so a fresh 2,914-file checkout per push pays a scan bill that reuse amortizes to the size
of the diff. Measured 261106 on the throwaway form, same gate, same work, two host loads: 20.1s /
0.3s / 11.5s (create / assets / emit) at load 113 against 2.0s / 0.1s / 3.4s at load 12 — a 6× swing
on identical work, and the variance is as much the point as the mean.

**A persistent tree that DRIFTS produces exactly the false green the control was built to prevent,
and does it silently.** A leftover page from a previous push, a half-applied checkout, an artifact a
check wrote during a failed run: each makes the gate grade something other than the pushed commit
while every surface looks healthy. So reuse is not trusted, it is CHECKED, and the check is the
cheapest possible pair:

  - `git -C <wt> rev-parse HEAD` equals the pushed sha, and
  - `git -C <wt> status --porcelain` is EMPTY.

`prepare()` runs that pair after standing the tree up and before handing it to a single check. A
mismatch does not degrade and does not continue — it DESTROYS the tree and rebuilds from scratch,
then re-checks. Only a second failure refuses the push. A slow correct run beats a fast wrong one,
and the rebuild path is exercised by its own arm in `tests/hooks.py` rather than merely written.

Untracked leftovers are treated as HOSTILE, not harmless, because a content check reads them. The
sweep is enumerated and declared rather than delegated: `git clean -ffdx` would have to be told to
spare the seeds, and one mis-anchored `-e` pattern there removes a symlink into every live agent's
`node_modules`. So `_sweep()` reads `git status --porcelain --ignored=matching`, keeps exactly the
declared seed paths (and anything beneath them), and removes the rest itself — `os.unlink` on a
symlink, never a traversal through it. The adoptables are deliberately NOT in the keep set: a stale
`book/mage-book.pdf` would make `adopt()` a no-op and hand the caption-orphan sensor a previous
push's render.

## Concurrency: one tree, so the second push gives up the SPEED and keeps the SCOPE

One persistent tree and two simultaneous pushes at different shas is corruption, and the author
backgrounds his pushes, so overlap is plausible rather than theoretical. The lock is an `O_EXCL` file
naming the holder's PID and ref, after this repo's own `next-index-<PID>.lock` precedent — a PID is a
stronger discriminator than a lock's size or age, and the recovery that reads a live lock as stale is
one keystroke from destroying a live operation.

On contention the loser does NOT block and does NOT refuse. It falls back to a THROWAWAY tree and
says so. Blocking would hold a push behind a twenty-minute gate; refusing would spend a correctness
gate's credibility on a performance optimization. The fallback keeps the property the control exists
for — the verdict is still a statement about the pushed commit — and gives up only the amortization.
A lock whose PID is dead is reclaimed, and reclaiming always REBUILDS: a holder that died mid-prepare
is the most likely source of a half-applied tree there is.
"""
from __future__ import annotations

import errno
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import tempfile
import time

import git_env

#: A seeded path, its class, and the `.gitignore` pattern that keeps git from reproducing it.
#: `optional` marks a path whose absence in the main checkout is a normal state rather than a gap
#: (a cache nobody has warmed yet, a thumb nobody has built).
#:
#: SYMLINK is only ever applied to a tree whose contents are keyed on their own inputs or are a
#: read-only install. Linking a tree the gate WRITES into would hand the worktree a channel into the
#: main checkout, which is the whole thing this helper exists to close.
#:
#: SYMLINK vs SYMLINK-MEMBERS is not a style choice, it is what git's ignore syntax allows. A pattern
#: ending in `/` matches a DIRECTORY only, and to git a symlink is a file — so `/book/.mermaid-svg-cache/`
#: does not match a symlink at that path, and git reports the seed as `?? book/.mermaid-svg-cache`.
#: Found 261107 by the persistent form's own `verify()`, which refused to prepare a tree whose
#: `git status --porcelain` was not empty. The throwaway form had carried that dirty entry since
#: `1b50fee39` and nothing looked, because nothing ever asked the worktree whether it was clean.
#: `symlink-members` creates the real directory the pattern needs and links each member into it, so
#: the seed stays shared and git stays silent. `tests/hooks.py` holds the rule mechanically.
SEED: tuple[tuple[str, str, str, bool], ...] = (
    ("node_modules", "symlink", "node_modules", False),
    ("book/node_modules", "symlink", "/book/node_modules", False),
    ("workbench/node_modules", "symlink", "node_modules", False),
    ("book/.mermaid-svg-cache", "symlink-members", "/book/.mermaid-svg-cache/", True),
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
#:
#: They are also deliberately absent from `KEEP_IGNORED`, so every run SWEEPS them. A persistent tree
#: that kept last push's `book/mage-book.pdf` would make `adopt()` return False — it refuses to
#: overwrite — and the caption-orphan sensor would read a previous commit's render while the phase log
#: said nothing at all.
ADOPTABLE: tuple[str, ...] = ("book/mage-book.pdf",)

#: The untracked paths a reused tree KEEPS. Everything else untracked is removed before the tree is
#: handed over, whether git calls it untracked (`??`) or ignored (`!!`).
#:
#: DERIVED from the two declarations above it rather than written a third time: a seed the sweep then
#: deleted would be re-seeded every push (cost), and a seed the sweep deleted AFTER seeding would be
#: a missing asset mid-gate (a red naming an asset — the tell this repo already records). Keeping the
#: derivation here means adding a seed cannot forget to tell the sweep about it.
def keep_set(seed: "tuple[tuple[str, str, str, bool], ...]" = (),
             emitters: "tuple[tuple[tuple[str, ...], str], ...]" = ()) -> frozenset[str]:
    """The untracked paths a sweep keeps, derived from the two declarations it must agree with."""
    return frozenset([rel for rel, _kind, _pattern, _optional in seed]
                     + [emits for _tail, emits in emitters])


KEEP_IGNORED: frozenset[str] = keep_set(SEED, SEED_EMITTERS)

#: Scheme marker for the emitted-tree reuse key. Bump it when the key's SHAPE changes, so every
#: record written under the old shape reads as a miss rather than as a match. Same convention as the
#: mermaid render cache's `idscheme-v2`.
EMIT_KEY_SCHEME = "gate-seed-emit-v1"

#: Where a persistent tree lives when nothing overrides it. Requirements, in the order they bind:
#: it must survive a reboot (so NOT `/var/folders`, which is purged); it must sit outside the repo
#: WORKING TREE so no `git status` in the main checkout ever reports it; and it must not sit inside
#: the gitdir either, because `git_env.fingerprint` walks the whole gitdir to prove a harness left it
#: alone, and half a gigabyte of worktree in there would both swamp that walk and make its verdict
#: change on every push.
#:
#: `~/Library/Caches` is the macOS answer to "large, machine-local, regenerable" and is where a
#: reader would look for it; `$XDG_CACHE_HOME` is honoured first for a host that sets it. The
#: per-repo digest segment keeps one checkout's tree from being handed to another's push — the home
#: is keyed on the ABSOLUTE GITDIR, which is what actually identifies the repository a worktree can
#: belong to.
HOME_ENV = "GC_GATE_WORKTREE_HOME"

#: Written into the home directory the first time this module creates one, and REQUIRED before
#: anything there is removed. A tool that deletes only what it stamped cannot delete what it did not
#: create — which is the half of the destructive-op rule that gets skipped when a path looks obvious.
MARKER = ".gc-gate-worktree"


def kept_by_sweep(rel: str, keep: "frozenset[str]" = KEEP_IGNORED) -> bool:
    """Whether `rel` is a declared seed, lies under one, or CONTAINS one.

    The third clause is the one that matters and the one an obvious implementation misses: if git
    reports a directory that holds a seed, removing the directory removes the seed. Skipping it costs
    a stale sibling inside that directory; removing it costs a symlink every live agent resolves
    packages through. Skip.

    Module-level rather than a method so the check in `tests/hooks.py` can assert the other half —
    that no ADOPTABLE is protected — against the same predicate the sweep actually runs.
    """
    for declared in keep:
        if rel == declared or rel.startswith(declared + "/") or declared.startswith(rel + "/"):
            return True
    return False


class SeedGap(Exception):
    """A declared seed source is missing, or the prepared tree is not the pushed commit."""


#: How long `git worktree add` may sit before the seeding gives up and says why. A worktree checkout
#: of this repo is 2,914 files and measured 6-15s on a calm host; it also CONTENDS, and a hang there
#: would hang a push with no output at all. Measured 261106 at load 113 with a sibling's `git commit`
#: 16 minutes into its own pre-commit hook: a `git worktree add` sat at **0.07s of CPU over 1m53s**
#: and counting. The mechanism was not isolated — the repo's own lock and host I/O are both live
#: candidates — so this bounds the symptom and names the discriminator rather than claiming a cause.
WORKTREE_ADD_TIMEOUT = 420.0


def _git(args: list[str], repo: str, timeout: float | None = None) -> subprocess.CompletedProcess[str]:
    """Every git call this module makes, bound to `repo` and to nothing the environment says.

    `cwd=` loses to an inherited `GIT_DIR`, which git exports into every hook — and this module is
    driven FROM a hook. In the pre-push run that binding happens to name the same repository, so the
    exposure stays invisible there; in the self-test it names a different one, and a `git worktree
    add` aimed at a synthetic repo then registers a worktree of the real one. `GIT_INDEX_FILE` is
    the sharper half: a pathspec commit exports a temporary index, and `git worktree add` inheriting
    it would write the new worktree's index over the committing one. `git_env.git` removes both.
    """
    return git_env.git(args, repo=repo, timeout=timeout)


def _lock_holders(root: str) -> str:
    """Who holds the repo's index, per the sibling lock that NAMES its owner.

    `.git` is a FILE in this submodule, so the gitdir has to be resolved; and a `next-index-<PID>`
    lock beside `index.lock` is a stronger discriminator than the lock's size or age.

    `--absolute-git-dir`, not `--git-dir`: the latter answers relative to the repository, and the
    listing below runs in whatever directory the hook's python is standing in.
    """
    gitdir = _git(["rev-parse", "--absolute-git-dir"], root).stdout.strip()
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


def cache_home() -> str:
    """The base directory persistent trees live under. See `HOME_ENV` for why it is this one."""
    override = os.environ.get(HOME_ENV)
    if override:
        return os.path.abspath(override)
    xdg = os.environ.get("XDG_CACHE_HOME")
    base = xdg if xdg else os.path.join(os.path.expanduser("~"), "Library", "Caches")
    return os.path.join(base, "gc-gate-worktree")


def default_home(root: str, label: str) -> str:
    """This repository's home for `label`, keyed on the gitdir that identifies the repository.

    Keyed on the ABSOLUTE GITDIR rather than the working-tree path: a worktree can only belong to
    one object store, and two checkouts sharing a gitdir may share a tree while two gitdirs may
    never. A short digest keeps the path readable; a collision would hand one repository another's
    tree, and the identity check in `_usable()` catches that regardless of the digest's width.
    """
    gitdir = _git(["rev-parse", "--absolute-git-dir"], root).stdout.strip() or os.path.abspath(root)
    return os.path.join(cache_home(), hashlib.sha256(gitdir.encode()).hexdigest()[:12], label)


def count_births(path: str, since: float) -> int:
    """How many files under `path` were CREATED at or after `since`, per APFS birth time.

    The cache-independent number, and the one that reflects what an on-access scanner charges for.
    Wall clock on this host swings 6× with load on identical work, so it cannot settle whether a
    change did less I/O or merely ran on a quieter box; a creation count can. Symlinked trees are
    not traversed (`os.walk` does not follow them), which is what keeps a linked `node_modules` out
    of the figure instead of dominating it.
    """
    total = 0
    for dirpath, _dirnames, filenames in os.walk(path):
        for name in filenames:
            try:
                stat = os.lstat(os.path.join(dirpath, name))
            except OSError:
                continue
            if getattr(stat, "st_birthtime", stat.st_ctime) >= since:
                total += 1
    return total


class _Lock:
    """One holder of the persistent tree, named by PID so a reader can check it is alive.

    `O_EXCL` is the whole mechanism: the create either wins or reports who holds it. A live holder
    means the caller takes the throwaway path; a dead one means the lock is stale and the tree it
    was half-preparing is suspect, so reclaiming it always rebuilds.
    """

    def __init__(self, path: str) -> None:
        self.path = path
        self.held = False
        self.stale_holder = 0

    @staticmethod
    def _alive(pid: int) -> bool:
        if pid <= 0:
            return False
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return False
        except PermissionError:
            return True  # somebody else's process, so it exists
        return True

    def _holder(self) -> tuple[int, str]:
        try:
            with open(self.path, encoding="utf-8") as fh:
                record = json.load(fh)
            return int(record.get("pid", 0)), str(record.get("ref", "?"))
        except (OSError, ValueError, TypeError):
            return 0, "?"

    def acquire(self, ref: str) -> bool:
        """True when this process now holds the lock. False means a LIVE holder has it."""
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        for _attempt in (1, 2):
            try:
                fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
            except OSError as exc:
                if exc.errno != errno.EEXIST:
                    return False
                pid, _was = self._holder()
                if self._alive(pid):
                    return False
                # Stale. Remove and retry ONCE: a second EEXIST means another process reclaimed it
                # between the read and the unlink, and losing that race is the same as losing the
                # lock. Never loop — a retry loop here is how two pushes take turns deleting each
                # other's lock.
                self.stale_holder = pid
                try:
                    os.unlink(self.path)
                except OSError:
                    return False
                continue
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                json.dump({"pid": os.getpid(), "ref": ref, "at": time.time()}, fh)
            self.held = True
            return True
        return False

    def describe_holder(self) -> str:
        pid, ref = self._holder()
        return f"PID {pid} pushing {ref[:9]}" if pid else "an unreadable lock record"

    def release(self) -> None:
        if not self.held:
            return
        self.held = False
        pid, _ref = self._holder()
        if pid != os.getpid():
            return  # not ours any more; leave it for its owner
        try:
            os.unlink(self.path)
        except OSError:
            pass


class GateWorktree:
    """Create or reuse, seed, prove, hand out and release one worktree at a ref.

    Only paths this object's own home holds are ever removed, and a removal additionally requires
    this module's marker file to be present — so teardown cannot reach a tree it did not create,
    whoever points `GC_GATE_WORKTREE_HOME` where.
    """

    def __init__(self, root: str, ref: str, *, label: str = "gate",
                 persistent: bool = True, home: str | None = None,
                 seed_set: "tuple[tuple[str, str, str, bool], ...] | None" = None,
                 seed_emitters: "tuple[tuple[tuple[str, ...], str], ...] | None" = None) -> None:
        self.root = os.path.abspath(root)
        self.ref = ref
        self.label = label
        self.persistent = persistent
        # The declarations are INJECTABLE, defaulting to this module's, so the sabotage harness in
        # `tests/hooks.py` can drive the real create/reuse/seed/sweep code against a synthetic
        # declaration on a two-file repository. The alternative was a harness that skipped seeding,
        # which would have left every line of the incremental seed path untested in-gate.
        self.seed_set = SEED if seed_set is None else seed_set
        self.seed_emitters = SEED_EMITTERS if seed_emitters is None else seed_emitters
        self.keep = keep_set(self.seed_set, self.seed_emitters)
        self.home = (home if home is not None else default_home(self.root, label)) \
            if persistent else None
        self.parent: str | None = None
        self.path: str | None = None
        self.log: list[str] = []
        self.seconds: dict[str, float] = {}
        self.reused = False
        self.rebuilds = 0
        self.lock = _Lock(os.path.join(self.home, "gate.lock")) if self.home else None

    # ── prepare: stand the tree up, then PROVE it is the pushed commit ────────────────────────────

    def prepare(self) -> str:
        """Hand back a tree proved equal to `self.ref`, or raise. The only entry point a gate uses.

        Two attempts, and the second is a full rebuild rather than a repair. A drifted tree has an
        unknown provenance by definition — that is what drift means — so patching it would leave the
        gate grading a tree nobody can describe. Rebuilding costs a cold checkout once; grading a
        tree that is not the commit costs the whole reason the control exists.
        """
        last: list[str] = []
        for attempt, rebuild in ((1, False), (2, True)):
            self._stand_up(rebuild=rebuild)
            last = self.verify()
            if not last:
                self.seed()
                last = self.verify()
            if not last:
                return self.path or ""
            self.rebuilds += 1
            for finding in last:
                self.log.append(f"DRIFT: {finding}")
            if attempt == 1:
                self.log.append("DRIFT detected — destroying this tree and rebuilding from "
                                "scratch rather than grading it")
                continue
        raise SeedGap(
            "the prepared tree is NOT the pushed commit, and a rebuild from scratch did not fix "
            "it:\n  " + "\n  ".join(last) + "\n"
            "Grading it would be the false green this gate exists to prevent, so the push is "
            "refused. Inspect the tree, or run with GC_PREPUSH_WORKTREE=0 to grade the working "
            "tree (weaker: a sibling's uncommitted edit then decides this push's verdict).")

    def verify(self) -> list[str]:
        """Why this tree is not the pushed commit. EMPTY is the only pass.

        Three predicates, all cheap. The HEAD the tree is checked out at, and whether anything
        differs from it, are the obvious two: `status --porcelain` does not list ignored paths, so
        the declared seeds — every one of which is gitignored, which is why they need seeding at all
        — are silent here by construction, while a leftover render or a half-applied checkout is not.

        The third exists because the first two have a blind spot a PERSISTENT index can hold open.
        `skip-worktree` and `assume-unchanged` tell git to stop comparing a path, so a file edited
        under either bit reports CLEAN and `checkout` declines to rewrite it: `status --porcelain`
        empty, HEAD correct, contents wrong, for as long as the index survives. A throwaway tree
        could never carry that, because its index was born with it; a reused one can. `ls-files -v`
        is the only reader that sees those bits: `H` is an ordinary cached entry, `S` is
        skip-worktree, and a LOWERCASE tag is assume-unchanged. A fully checked-out tree is all `H`,
        so anything else is a finding. (`S` is also how sparse-checkout marks an excluded path —
        legitimate elsewhere, never here, because this tree is checked out whole.)
        """
        if self.path is None or not os.path.isdir(self.path):
            return ["no worktree was stood up"]
        want = _git(["rev-parse", f"{self.ref}^{{commit}}"], self.root).stdout.strip()
        if not want:
            return [f"the pushed ref {self.ref!r} does not resolve to a commit in {self.root}"]
        head = _git(["rev-parse", "HEAD"], self.path).stdout.strip()
        if head != want:
            return [f"worktree HEAD is {head[:9] or '<none>'}, the pushed commit is {want[:9]}"]
        status = _git(["status", "--porcelain"], self.path)
        if status.returncode:
            return [f"`git status` failed in the worktree: {status.stderr.strip()[:200]}"]
        dirty = [ln for ln in status.stdout.splitlines() if ln.strip()]
        if dirty:
            return [f"worktree differs from {want[:9]} in {len(dirty)} path(s): "
                    + ", ".join(ln[3:] for ln in dirty[:6])
                    + (" …" if len(dirty) > 6 else "")]
        listed = _git(["ls-files", "-v"], self.path)
        if listed.returncode:
            return [f"`git ls-files -v` failed in the worktree: {listed.stderr.strip()[:200]}"]
        unwatched = [ln for ln in listed.stdout.splitlines() if ln and ln[:1] != "H"]
        if unwatched:
            return [f"{len(unwatched)} index entr(ies) are not plain cached entries, so git has "
                    "stopped comparing them and a clean `status` says nothing about their "
                    "contents: " + ", ".join(unwatched[:6]) + (" …" if len(unwatched) > 6 else "")]
        return []

    def _stand_up(self, *, rebuild: bool) -> None:
        """Reuse the persistent tree by checkout, or create one. Never both halves in one path."""
        if not self.persistent:
            self.create()
            return
        assert self.home is not None and self.lock is not None
        if rebuild:
            self._destroy()
        elif not self.lock.held and not self.lock.acquire(self.ref):
            held = self.lock.describe_holder()
            self.log.append(f"persistent tree is held by {held} — this push falls back to a "
                            "THROWAWAY tree. Still commit-scoped; it just pays a cold checkout.")
            self.persistent = False
            self.create()
            return
        if self.lock.stale_holder:
            self.log.append(f"reclaimed a stale lock from PID {self.lock.stale_holder}; rebuilding, "
                            "because a holder that died mid-prepare is the likeliest source of a "
                            "half-applied tree")
            self.lock.stale_holder = 0
            self._destroy()
        if self._usable():
            if self._checkout():
                return
            self.log.append("checkout into the persistent tree failed — rebuilding from scratch")
            self._destroy()
        self.create()

    def _wt_path(self) -> str:
        return os.path.join(self.home or "", f"gc-{self.label}")

    def _usable(self) -> bool:
        """Whether the home holds a tree of THIS repository that this module created.

        Three conditions, each closing a different way a reused path can be the wrong one: the
        marker proves authorship, `--is-inside-work-tree` proves it is a worktree at all, and the
        gitdir prefix proves it is a worktree of this repository rather than a same-named tree left
        by another checkout that happened to digest into the same home.
        """
        path = self._wt_path()
        if not os.path.isdir(path) or not os.path.isfile(os.path.join(self.home or "", MARKER)):
            return False
        if _git(["rev-parse", "--is-inside-work-tree"], path).stdout.strip() != "true":
            return False
        mine = _git(["rev-parse", "--absolute-git-dir"], self.root).stdout.strip()
        theirs = _git(["rev-parse", "--absolute-git-dir"], path).stdout.strip()
        return bool(mine) and theirs.startswith(mine)

    def _checkout(self) -> bool:
        """Point the reused tree at the ref, then sweep. Returns whether both succeeded.

        `--force` is what makes this a checkout rather than a merge: a tracked file a previous run
        modified is discarded, not carried. Without it `git checkout` refuses on a conflict and the
        tree keeps the previous commit, which is the drifted state wearing a success exit code.
        """
        path, t0 = self._wt_path(), time.monotonic()
        done = _git(["checkout", "--detach", "--force", self.ref], path,
                    timeout=WORKTREE_ADD_TIMEOUT)
        if done.returncode:
            self.log.append(f"checkout refused {self.ref[:9]}: {done.stderr.strip()[:200]}")
            return False
        self.path = path
        self.reused = True
        swept = self._sweep()
        self.seconds["create"] = time.monotonic() - t0
        self.log.append(f"worktree REUSED at {self.ref[:9]} -> {path} "
                        f"({self.seconds['create']:.1f}s"
                        + (f", {swept} stale path(s) swept" if swept else "") + ")")
        return True

    def _sweep(self) -> int:
        """Remove every untracked path the keep set does not declare. Returns how many went.

        Enumerated here rather than handed to `git clean -ffdx -e …` on purpose. The seeds include
        three symlinks into the main checkout's `node_modules`; one mis-anchored exclude pattern
        there and clean removes a link every live agent resolves packages through. Doing the removal
        in Python keeps the symlink rule explicit — `os.unlink` the LINK, never walk through it.
        """
        path = self.path or ""
        listing = _git(["status", "--porcelain", "--ignored=matching", "-z"], path)
        if listing.returncode:
            return 0
        removed = 0
        for record in listing.stdout.split("\0"):
            if len(record) < 4 or record[:2] not in ("??", "!!"):
                continue
            rel = record[3:].rstrip("/")
            if kept_by_sweep(rel, self.keep):
                continue
            target = os.path.join(path, rel)
            try:
                if os.path.islink(target):
                    os.unlink(target)
                elif os.path.isdir(target):
                    shutil.rmtree(target)
                else:
                    os.remove(target)
            except OSError as exc:
                self.log.append(f"sweep: could not remove stale {rel} ({exc.strerror})")
                continue
            removed += 1
        for rel in ADOPTABLE:
            # Swept unconditionally, and not via the listing: an adoptable is a hard link the main
            # checkout's copy may since have replaced, and `adopt()` refuses to overwrite.
            target = os.path.join(path, rel)
            if os.path.lexists(target):
                try:
                    os.remove(target)
                    removed += 1
                except OSError:
                    pass
        return removed

    def _destroy(self) -> None:
        """Unregister and delete the persistent tree, and invalidate everything keyed to it.

        Refuses on a home this module did not stamp. `git worktree prune` is never called: it is
        repo-wide and would reach every other agent's registration.
        """
        if self.home is None:
            return
        path = self._wt_path()
        if not os.path.isfile(os.path.join(self.home, MARKER)):
            if os.path.exists(path):
                self.log.append(f"refusing to remove {path}: no {MARKER} marker, so this module "
                                "did not create it")
            return
        if os.path.exists(path):
            _git(["worktree", "remove", "--force", path], self.root, timeout=120)
            shutil.rmtree(path, ignore_errors=True)
        for keyed in (os.path.join(self.home, "emit.json"),):
            try:
                os.remove(keyed)
            except OSError:
                pass
        if self.path == path:
            self.path = None

    # ── create ────────────────────────────────────────────────────────────────────────────────────

    def create(self) -> str:
        t0 = time.monotonic()
        if self.persistent and self.home is not None:
            os.makedirs(self.home, exist_ok=True)
            with open(os.path.join(self.home, MARKER), "w", encoding="utf-8") as fh:
                fh.write("Created by tools/gate_worktree.py. Removable; it is rebuilt on demand.\n")
            path = self._wt_path()
            # Unregister BEFORE adding: `git worktree add` refuses a path git still has on its books,
            # and a deleted directory with a live registration is exactly what a killed run leaves.
            _git(["worktree", "remove", "--force", path], self.root, timeout=120)
            shutil.rmtree(path, ignore_errors=True)
        else:
            self.parent = tempfile.mkdtemp(prefix=f"gc-{self.label}-")
            path = os.path.join(self.parent, "wt")

        def reclaim() -> None:
            _git(["worktree", "remove", "--force", path], self.root, timeout=120)
            shutil.rmtree(self.parent if self.parent else path, ignore_errors=True)
            self.parent = None

        try:
            out = _git(["worktree", "add", path, "--detach", self.ref], self.root,
                       timeout=WORKTREE_ADD_TIMEOUT)
        except subprocess.TimeoutExpired:
            # The killed `add` may already have registered the worktree, so unregister through git
            # before reclaiming the directory. Never `git worktree prune`: it is repo-wide and would
            # reach other agents' entries.
            reclaim()
            holders = _lock_holders(self.root)
            raise SeedGap(
                f"git worktree add did not finish in {WORKTREE_ADD_TIMEOUT:.0f}s. "
                + (f"A sibling holds the repo index; the next-index lock names PID(s) {holders} — "
                   "check whether they are alive before touching anything. " if holders else "")
                + "Wait for the checkout to go quiet and push again, or run with "
                  "GC_PREPUSH_WORKTREE=0 to grade the working tree.") from None
        if out.returncode:
            reclaim()
            raise SeedGap(f"git worktree add failed for {self.ref}:\n{out.stdout}{out.stderr}")
        self.path = path
        self.reused = False
        self.seconds["create"] = time.monotonic() - t0
        self.log.append(f"worktree CREATED at {self.ref[:9]} -> {path} "
                        f"({self.seconds['create']:.1f}s)")
        return path

    # ── seed ──────────────────────────────────────────────────────────────────────────────────────

    def seed(self) -> None:
        """Reproduce every declared class of untracked local state, then run the emitters.

        INCREMENTAL, which on a reused tree is most of the win: a symlink and a copy that survived
        the checkout are VERIFIED rather than re-created, and the emitter runs only when its key
        moved. Verification is the operative word — `os.path.lexists` was enough for a tree that had
        just been created and is not enough for one that has been handed back, because a symlink
        retargeted at a deleted directory and a truncated thumb both exist.

        Raises `SeedGap` rather than continuing half-seeded: a gate that opens on a missing asset
        reports the asset, and somebody then reads that as a defect in the pushed change.
        """
        if self.path is None:
            raise SeedGap("seed() before create()")
        t0 = time.monotonic()
        made = kept = 0
        for rel, kind, _pattern, optional in self.seed_set:
            src = os.path.join(self.root, rel)
            dst = os.path.join(self.path, rel)
            if not os.path.exists(src):
                if optional:
                    self.log.append(f"seed: {rel} absent in the main checkout — optional, skipped")
                    continue
                raise SeedGap(f"seed source missing: {rel} (declared non-optional)")
            if self._seed_is_current(kind, src, dst):
                kept += 1
                continue
            os.makedirs(os.path.dirname(dst) or self.path, exist_ok=True)
            if os.path.lexists(dst):
                # Present but WRONG — a dangling link, a short copy. Replace it; leaving it is how a
                # seeded tree reports an asset instead of a claim.
                if os.path.islink(dst) or os.path.isfile(dst):
                    os.unlink(dst)
                else:
                    shutil.rmtree(dst, ignore_errors=True)
            if kind == "symlink":
                os.symlink(src, dst)
            elif kind == "symlink-members":
                os.makedirs(dst, exist_ok=True)
                for member in os.listdir(src):
                    link = os.path.join(dst, member)
                    if not os.path.lexists(link):
                        os.symlink(os.path.join(src, member), link)
            elif kind == "copy":
                shutil.copy2(src, dst)
            elif kind == "copy-tree":
                shutil.copytree(src, dst)
            else:
                raise SeedGap(f"unknown seed class {kind!r} for {rel}")
            made += 1
        self.seconds["seed_assets"] = time.monotonic() - t0
        self.log.append(f"seed: {made} created, {kept} verified in place "
                        f"({self.seconds['seed_assets']:.1f}s)")

        self._freshen()

        t1 = time.monotonic()
        emitted = reused = 0
        for tail, emits in self.seed_emitters:
            key = self._emit_key(tail, emits)
            if self._emit_is_current(emits, key):
                reused += 1
                continue
            target = os.path.join(self.path, emits)
            # Removed before re-emitting, not written over. An emitter adds and overwrites pages; a
            # page the PREVIOUS commit had and this one does not would otherwise survive, and four
            # test modules enumerate that directory with a glob. That is the stale-page false green
            # in its cheapest form.
            shutil.rmtree(target, ignore_errors=True)
            # Scrubbed too: an emitter runs INSIDE the worktree and may shell out to git itself,
            # and an inherited GIT_DIR would point it back at the checkout it was seeded from.
            out = git_env.run([sys.executable, *tail], cwd=self.path)
            if out.returncode or not os.path.isdir(target):
                raise SeedGap(f"seed emitter {' '.join(tail)} failed (expected {emits}):\n"
                              f"{out.stdout}{out.stderr}")
            self._record_emit(emits, key)
            emitted += 1
        self.seconds["seed_emit"] = time.monotonic() - t1
        self.log.append(f"seed: {emitted} emitter(s) run, {reused} reused on an unmoved key "
                        f"({self.seconds['seed_emit']:.1f}s)")

    @staticmethod
    def _seed_is_current(kind: str, src: str, dst: str) -> bool:
        """Whether the seed already in place IS the declared one. Every failure direction re-seeds."""
        if kind == "symlink":
            return (os.path.islink(dst) and os.path.realpath(os.readlink(dst))
                    == os.path.realpath(src) and os.path.exists(dst))
        if kind == "copy":
            # Size plus mtime, not a digest: these are the two cover thumbs, the emitter that would
            # rebuild them needs LuaLaTeX + Poppler + Pillow, and `copy2` preserves mtime — so an
            # equal (size, mtime) pair is exactly the pair a correct copy leaves behind.
            try:
                want, got = os.stat(src), os.stat(dst)
            except OSError:
                return False
            return (want.st_size == got.st_size
                    and abs(want.st_mtime - got.st_mtime) < 1.0
                    and not os.path.islink(dst))
        if kind == "symlink-members":
            # The directory must be real (a symlink there is the defect this class exists to fix)
            # and every member of the source must have a live link. Members only ever accumulate in
            # a content-addressed cache, so a missing one means the source gained an entry since the
            # last push — which is the case where re-linking is the whole point.
            if not os.path.isdir(dst) or os.path.islink(dst):
                return False
            try:
                return all(os.path.exists(os.path.join(dst, member))
                           for member in os.listdir(src))
            except OSError:
                return False
        if kind == "copy-tree":
            # Presence only, deliberately. The consumer of this tree REBUILDS it when it reads as
            # stale — that is why it is copied rather than linked — so the consumer, not this check,
            # owns its freshness, and `_freshen` owns the mtime that decides.
            return os.path.isdir(dst) and not os.path.islink(dst)
        return False

    def _emit_stamp(self) -> str | None:
        return os.path.join(self.home, "emit.json") if self.home else None

    def _emit_key(self, tail: tuple[str, ...], emits: str) -> str:
        """What the emitted tree is a function of: the COMMIT's tree, the emitter, the interpreter.

        Git already maintains a content-addressed key over every tracked file — the commit's tree
        OID — so this reaches for that rather than adding a fourth hand-rolled digest of file bytes
        beside the LaTeX reuse key, the mermaid render key and the section stamp. The shape follows
        the mermaid key's convention: content, plus a fingerprint of the producer, plus a scheme
        marker so a change to the key's own shape invalidates every record written under the old one.

        WHOLE-tree, not a declared input subset. A narrower key would hit more often, and an input
        left out of the declaration would hand a check a tree rendered from a different commit —
        which is this control's own failure mode, arriving through the door built to close it. The
        conservative key is wrong only in the direction that costs an emit.
        """
        head = _git(["rev-parse", "HEAD^{tree}"], self.path or self.root).stdout.strip()
        digest = hashlib.sha256(EMIT_KEY_SCHEME.encode())
        digest.update(b"\0" + head.encode())
        digest.update(b"\0" + " ".join(tail).encode())
        digest.update(b"\0" + emits.encode())
        digest.update(b"\0" + platform.python_version().encode())
        return digest.hexdigest()

    def _emit_shape(self, emits: str) -> dict[str, int]:
        """File count and total bytes of the emitted tree's page surface.

        Not a digest of 29 MB: a count and a size catch the failure a reuse has to catch — a tree
        half-removed, truncated, or never finished — at the cost of one walk. `docs/` rather than
        the whole emitted tree, because the site build writes its own `site/` output in there later
        and a shape that moves under a consumer's feet would read as a permanent miss.
        """
        base = os.path.join(self.path or "", emits, "docs")
        if not os.path.isdir(base):
            base = os.path.join(self.path or "", emits)
        files = total = 0
        for dirpath, _dirnames, filenames in os.walk(base):
            for name in filenames:
                try:
                    total += os.lstat(os.path.join(dirpath, name)).st_size
                except OSError:
                    continue
                files += 1
        return {"files": files, "bytes": total}

    def _emit_is_current(self, emits: str, key: str) -> bool:
        stamp = self._emit_stamp()
        if stamp is None or not os.path.isdir(os.path.join(self.path or "", emits)):
            return False
        try:
            with open(stamp, encoding="utf-8") as fh:
                record = json.load(fh)[emits]
        except (OSError, ValueError, KeyError, TypeError):
            return False  # no record, or an unreadable one: emit. Fail-open is toward correctness.
        return record.get("key") == key and record.get("shape") == self._emit_shape(emits)

    def _record_emit(self, emits: str, key: str) -> None:
        stamp = self._emit_stamp()
        if stamp is None:
            return
        try:
            with open(stamp, encoding="utf-8") as fh:
                record = json.load(fh)
        except (OSError, ValueError):
            record = {}
        if not isinstance(record, dict):
            record = {}
        record[emits] = {"key": key, "shape": self._emit_shape(emits)}
        with open(stamp, "w", encoding="utf-8") as fh:
            json.dump(record, fh, indent=1, sort_keys=True)

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

    # ── release / remove ──────────────────────────────────────────────────────────────────────────

    def release(self) -> None:
        """Teardown for the persistent form: drop the lock, KEEP the tree. The throwaway form removes.

        Keeping it is the point — the next push's checkout rewrites only the diff. What a run must
        not keep is the lock, so a crash does not wedge every later push into the throwaway path;
        the PID in the lock record is what makes a crashed holder recoverable rather than permanent.
        """
        if self.persistent and self.path is not None:
            self.log.append(f"teardown: persistent tree KEPT at {self.path} for the next push")
            self.path = None
        else:
            self.remove()
        if self.lock is not None:
            self.lock.release()

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
                done = _git(["worktree", "remove", "--force", self.path], self.root,
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
        if self.lock is not None:
            self.lock.release()

    def __enter__(self) -> "GateWorktree":
        self.prepare()
        return self

    def __exit__(self, *exc: object) -> None:
        self.release()


def gitignore_patterns(root: str) -> set[str]:
    """Every non-comment pattern in the repo's root `.gitignore`."""
    try:
        with open(os.path.join(root, ".gitignore"), encoding="utf-8") as fh:
            lines = fh.read().splitlines()
    except OSError:
        return set()
    return {ln.strip() for ln in lines if ln.strip() and not ln.lstrip().startswith("#")}
