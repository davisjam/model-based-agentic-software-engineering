"""Scope what the pre-commit hook force-stages, and report when the commit differs from the pathspec.

The commit hook regenerates the site and the derived view models and force-stages the result. That
force-stage is load-bearing — `git merge` is a commit route that never runs this hook, and after
several merge-landings the committed `index.html` was missing a card for hours — so it does not go
away. What it needs is a boundary and a receipt.

## The boundary: stage what this run produced

A path the hook's own run WROTE is derived output and belongs in the commit. A path that was merely
dirty when the hook started, and that the regeneration never touched, is somebody's work. The
discriminator is therefore ownership by authorship, not by name: `snapshot()` stats every tracked
path on entry, and `wrote()` answers whether the regeneration replaced it.

Authorship is recorded as `(mtime_ns, size, inode)` rather than a content digest, and the difference
matters in the one case that would otherwise regress. A sibling who runs `catalog.py build` by hand
leaves the generated pages dirty but CORRECT; the hook's own build rewrites them to the same bytes.
Under a content test that path reads as "unchanged by the hook" and would be withheld, which would
leave the committed HTML stale and redden the regen-drift gate at the next push. Under a write test
the generator claimed it, so it is staged. The only behaviour that changes is the case this exists
for: a path dirty on entry that the regeneration SKIPPED — a cache hit, a reuse decision, a page the
build no longer emits — which today rides into whichever commit happens next.

## The receipt: say what is actually about to land

None of the standard defences see a sweep. `git diff --stat` is empty, the staged-deletion check is
empty, and a pathspec naming one file does not stop it. The receipt closes that by printing, before
the commit lands, the three things an author cannot otherwise see:

  - the full set about to be committed, with insertion counts — the `git show --stat HEAD` that the
    discipline already prescribes, moved to before the fact instead of after it;
  - the paths THIS HOOK added, which by construction are the ones no pathspec named;
  - any path carrying content the author did not stage. `git commit -- <paths>` commits the
    WORKING-TREE content of each named path, discarding a partial `git add -p` of that same path, and
    that is plain git rather than anything the hook does. It landed half of an in-flight change to
    `book/build_book.py` on 261106 and left `main` calling an undefined name.

Every git call that must read a specific index names it explicitly. The hook inherits
`GIT_INDEX_FILE` — the committing worktree's index, or the temporary index a pathspec commit builds —
and that inheritance is the whole reason the force-stage reaches the commit at all, so it is used
deliberately here and never left to chance.
"""
from __future__ import annotations

import os
import subprocess

#: A stat triple is enough to answer "did this run write here?" and costs one syscall. Content
#: digests are deliberately not used; see the module docstring for the case that distinguishes them.
_Stamp = "tuple[int, int, int]"


def _git(root: str, *args: str, index: str | None = None) -> subprocess.CompletedProcess[str]:
    """One git command against `root`, optionally against a NAMED index rather than the inherited one."""
    env = dict(os.environ)
    if index is not None:
        env["GIT_INDEX_FILE"] = index
    return subprocess.run(["git", *args], cwd=root, env=env, capture_output=True, text=True)


def _lines(done: subprocess.CompletedProcess[str]) -> list[str]:
    return [line for line in done.stdout.split("\n") if line.strip()]


class StageScope:
    """The hook's view of what it found, what it wrote, and what the commit will therefore contain.

    State-bearing by nature — an entry snapshot, an entry landing set and a withheld list all outlive
    the call that fills them — so it is a class rather than a module of free functions.
    """

    def __init__(self, root: str) -> None:
        self.root = root
        self.entry_stamps: dict[str, tuple[int, int, int]] = {}
        self.entry_landing: set[str] = set()
        self.dirty_at_entry: set[str] = set()
        self.withheld: list[str] = []
        self.commit_index = os.environ.get("GIT_INDEX_FILE", "")
        self.real_index = ""
        self.errors: list[str] = []

    # -- entry -------------------------------------------------------------------------------

    def snapshot(self) -> None:
        """Record every tracked path's stat triple, what is already staged, and what is dirty.

        Called before the first generator runs, so "the hook wrote it" means this commit's
        regeneration and not some earlier one.
        """
        tracked = _git(self.root, "ls-files", "-z")
        if tracked.returncode:
            self.errors.append(f"ls-files failed ({tracked.returncode}): {tracked.stderr.strip()[:200]}")
            return
        for rel in tracked.stdout.split("\0"):
            if not rel:
                continue
            stamp = self._stamp(rel)
            if stamp is not None:
                self.entry_stamps[rel] = stamp
        self.entry_landing = set(self.landing())
        # `git diff` compares the inherited index — the one this commit will be built from — against
        # the working tree, so this is exactly the set whose worktree content the commit does NOT
        # carry. That is the set a force-stage can sweep.
        self.dirty_at_entry = set(_lines(_git(self.root, "diff", "--name-only")))
        gitdir = _git(self.root, "rev-parse", "--absolute-git-dir")
        if gitdir.returncode == 0:
            self.real_index = os.path.join(gitdir.stdout.strip(), "index")

    def _stamp(self, rel: str) -> tuple[int, int, int] | None:
        try:
            st = os.stat(os.path.join(self.root, rel))
        except OSError:
            return None
        return (st.st_mtime_ns, st.st_size, st.st_ino)

    # -- the boundary ------------------------------------------------------------------------

    def wrote(self, rel: str) -> bool:
        """Did this run write `rel`? An untracked path the build just created counts as written."""
        now = self._stamp(rel)
        if now is None:
            return False
        was = self.entry_stamps.get(rel)
        return was is None or was != now

    def owned(self, paths: list[str], *, enforce: bool) -> list[str]:
        """Narrow a force-stage pathspec to the paths this run produced.

        `enforce=False` is the audit-only landing: the full list comes back and the paths that WOULD
        be withheld are recorded for the receipt, so the behaviour change is observed before it is
        taken. A path that is neither dirty nor written is a no-op either way — staging it restages
        the content already in the index — so the only path this can remove is a dirty one the
        regeneration skipped.
        """
        keep, drop = [], []
        for rel in paths:
            if self.wrote(rel) or rel not in self.dirty_at_entry:
                keep.append(rel)
            else:
                drop.append(rel)
        self.withheld.extend(drop)
        return keep if enforce else paths

    # -- the receipt -------------------------------------------------------------------------

    def landing(self) -> dict[str, str]:
        """path -> "+N/-M" for everything the commit will contain, read from the commit's own index."""
        done = _git(self.root, "diff", "--cached", "--numstat")
        if done.returncode:
            return {}
        out: dict[str, str] = {}
        for line in _lines(done):
            parts = line.split("\t")
            if len(parts) == 3:
                out[parts[2]] = f"+{parts[0]}/-{parts[1]}"
        return out

    def unstaged_versions(self, landing: set[str]) -> list[str]:
        """Paths the commit carries at a version DIFFERENT from the one the author staged.

        Only reachable when git built a temporary index — a pathspec commit — because otherwise the
        commit's index IS the author's index and the two cannot disagree. The author must have staged
        something for the path (it differs from HEAD in the real index); the finding is that what
        lands is not that.
        """
        if not self.real_index or not self.commit_index:
            return []
        if os.path.realpath(self.commit_index) == os.path.realpath(self.real_index):
            return []
        staged = set(_lines(_git(self.root, "diff", "--cached", "--name-only",
                                 index=self.real_index)))
        candidates = sorted(landing & staged)
        if not candidates or len(candidates) > 200:
            return []
        real = self._oids(candidates, self.real_index)
        commit = self._oids(candidates, self.commit_index)
        return [rel for rel in candidates if real.get(rel) != commit.get(rel)]

    def _oids(self, paths: list[str], index: str) -> dict[str, str]:
        done = _git(self.root, "ls-files", "--stage", "--", *paths, index=index)
        out: dict[str, str] = {}
        for line in _lines(done):
            meta, _, rel = line.partition("\t")
            fields = meta.split()
            if len(fields) >= 2 and rel:
                out[rel] = fields[1]
        return out

    def report(self, *, enforce: bool) -> list[str]:
        """The lines to print. Returned rather than printed so a test can read them."""
        if self.errors:
            return [f"pre-commit: stage-scope unavailable — {'; '.join(self.errors)}"]
        landing = self.landing()
        out = [f"pre-commit: this commit will contain {len(landing)} path(s):"]
        for rel in sorted(landing)[:40]:
            out.append(f"    {landing[rel]:>12}  {rel}")
        if len(landing) > 40:
            out.append(f"    … and {len(landing) - 40} more")

        added = sorted(set(landing) - self.entry_landing)
        if added:
            out.append(f"  + {len(added)} path(s) STAGED BY THIS HOOK, named by no pathspec of yours:")
            for rel in added:
                out.append(f"      {rel}")
            out.append("    These are regenerated projections of the WORKING TREE. If a source they "
                       "read is edited but not committed here, the projection lands ahead of it.")

        if self.withheld:
            verb = "WITHHELD from" if enforce else "WOULD BE WITHHELD from (audit-only; still staged in)"
            out.append(f"  - {len(set(self.withheld))} path(s) {verb} the force-stage — dirty before "
                       "this hook ran and never rewritten by it, so the content is not the "
                       "regeneration's to commit:")
            for rel in sorted(set(self.withheld)):
                out.append(f"      {rel}")

        mismatched = self.unstaged_versions(set(landing))
        if mismatched:
            out.append(f"  ! {len(mismatched)} path(s) carry content you did NOT stage. "
                       "`git commit -- <paths>` takes each named path's WORKING-TREE content and "
                       "discards your partial `git add` of it:")
            for rel in mismatched:
                out.append(f"      {rel}")
            out.append("    Check these hunks before the commit lands, or commit from the index "
                       "instead of a pathspec.")
        return out
