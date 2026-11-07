#!/usr/bin/env python3
"""Drive a chosen git repository, and no other. `cwd=` alone does not do that.

Git exports `GIT_DIR`, `GIT_WORK_TREE` and `GIT_INDEX_FILE` into every hook it runs, and a
subprocess inherits them. Those variables BEAT `cwd=`. So
`subprocess.run(["git", "init"], cwd=tmp)` under an inherited `GIT_DIR` initialises nothing in
`tmp`: it re-binds to the repository the hook came from and writes there.

Measured 261106, twice, both from the pre-push hook. The commit-scope self-test built a synthetic
repository in a temp directory and drove it with `cwd=repo` alone. `git init -q` bound to the REAL
gitdir and the four `git config` calls after it wrote into the live repo: `core.bare = true`
(invalid beside this submodule's `core.worktree`, so every later git operation warned and worktree
operations died outright), a `core.hooksPath` pointing at a temp directory that no longer existed
(which DISABLES the repo's own pre-commit hook), and the synthetic identity
`gate <gate@example.invalid>`. The self-test then failed on the config it had just written, so it
could never pass, and it took an innocent sibling check down with it. Re-run with `GIT_DIR` alone
the same harness returned ZERO findings while still writing into the ambient repository — a green
verdict earned by driving the wrong repository, which is the worse direction of the two.

The repair is to say which repository twice, and to say it in a way an environment cannot
contradict: remove every inherited binding, and name the repository with `-C`.
"""
from __future__ import annotations

import hashlib
import os
import subprocess
from collections.abc import Mapping, Sequence

#: The `GIT_*` names a scrubbed environment keeps. Each governs HOW git runs — where its helper
#: binaries live, how it authenticates — and none of them can name a different repository, index or
#: object store. Everything else goes, so the rule is deny-by-default: a binding variable git grows
#: in some later version is already excluded, rather than waiting for someone to notice it.
KEEP: frozenset[str] = frozenset({
    "GIT_EXEC_PATH",
    "GIT_ASKPASS",
    "GIT_SSH",
    "GIT_SSH_COMMAND",
    "GIT_SSL_CAINFO",
    "GIT_SSL_NO_VERIFY",
    "GIT_TERMINAL_PROMPT",
})


def clean_env(base: Mapping[str, str] | None = None, *, hermetic: bool = False) -> dict[str, str]:
    """`base` (default the process environment) with every repository-binding `GIT_*` name removed.

    `hermetic` additionally points git's global and system config files at the null device, so a
    synthetic repository reads only the config it sets for itself. Use it for a throwaway repo,
    whose verdict must not vary with whatever the host happens to have in `~/.gitconfig`. Leave it
    off when driving a real checkout: that checkout's owner's config is part of how it behaves.
    """
    env = dict(os.environ if base is None else base)
    for name in [k for k in env if k.startswith("GIT_") and k not in KEEP]:
        del env[name]
    if hermetic:
        env["GIT_CONFIG_GLOBAL"] = os.devnull
        env["GIT_CONFIG_SYSTEM"] = os.devnull
    return env


def git(args: Sequence[str], *, repo: str, hermetic: bool = False, capture: bool = True,
        timeout: float | None = None) -> subprocess.CompletedProcess[str]:
    """Run one git command against `repo`, with no inherited binding left to contradict it.

    Belt and braces, because the two defences fail in different directions: the scrubbed
    environment stops an ambient `GIT_DIR` from winning, and `-C` keeps the target explicit on the
    command line where a reader can see it. `cwd` points at the same place so a subcommand that
    resolves a relative path resolves it against the repository, not against whatever directory the
    caller happened to be in.

    `capture=False` lets the command write straight to the caller's streams, and `stdout`/`stderr`
    come back `None`. A `commit` runs the repo's own hooks and a `push` reports its transfer: both
    are output a human reads as it happens, and swallowing it is how a seam gets bypassed by the
    next caller who needs to see it.
    """
    return subprocess.run(["git", "-C", repo, *args], cwd=repo,
                          env=clean_env(hermetic=hermetic),
                          capture_output=capture, text=True, timeout=timeout)


def run(argv: Sequence[str], *, cwd: str,
        timeout: float | None = None) -> subprocess.CompletedProcess[str]:
    """Run a NON-git command under the same scrubbed environment.

    A build script, an emitter, a test runner: anything launched inside one tree that may shell out
    to git itself. Without the scrub it inherits the caller's binding and reads a different
    repository than the directory it is standing in — the same defect one level down, and harder to
    see because the git call is somebody else's code.
    """
    return subprocess.run(list(argv), cwd=cwd, env=clean_env(),
                          capture_output=True, text=True, timeout=timeout)


def fingerprint(gitdir: str) -> dict[str, str]:
    """Map every file under a gitdir to a digest of its bytes, for comparison across a run.

    A test asserting that a harness left the ambient repository alone needs the WHOLE directory,
    not just `config`: the 261106 damage reached config, and a harness that creates a worktree can
    also write `worktrees/`, `refs/` and `index`. Symlinks record their target rather than their
    contents, so a replaced link reads as a change.
    """
    out: dict[str, str] = {}
    for dirpath, _dirnames, filenames in os.walk(gitdir):
        for name in filenames:
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, gitdir)
            if os.path.islink(full):
                out[rel] = "symlink:" + os.readlink(full)
                continue
            try:
                with open(full, "rb") as fh:
                    out[rel] = hashlib.sha256(fh.read()).hexdigest()
            except OSError as exc:
                out[rel] = f"unreadable:{exc.errno}"
    return out
