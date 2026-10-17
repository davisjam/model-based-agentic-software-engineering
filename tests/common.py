"""Shared helpers + constants for the test suite. Imported by every test-kind module.

`resolve` semantics (used across the checks): a relative target file must exist; a `#anchor` matches a
heading-slug (markdown) or an `id`/`name` (html) in the target; `http(s)`/`mailto`/`data:` links are out
of scope (the suite does no network).
"""
from __future__ import annotations

import os
import re
import socket
import subprocess

import catalog  # the catalogue's shared model (ROOT, all_entries, catalogue_md_files, ...)

ROOT = catalog.ROOT
SKILL = os.path.join(ROOT, "plugin", "mage")  # the umbrella plugin dir
# Every skill the plugin ships: (name, skill_dir, has_reference_mirror). The skill checks iterate this;
# a skill with no catalogue mirror (has_reference=False) ships its reference in its authored SKILL.md.
SKILLS = (
    ("self-governance", os.path.join(SKILL, "skills", "self-governance"), True),
    ("self-operations", os.path.join(SKILL, "skills", "self-operations"), False),
    ("self-communicate", os.path.join(SKILL, "skills", "self-communicate"), False),
)
# The subset that `bundle_skill.py` GENERATES from catalogue sources (drift-checked). An authored skill
# (self-communicate) is not generated — it is a plain skill dir hand-written under `plugin/`, so it neither
# perturbs bundle freshness nor ships a bundler-emitted `principles.md`.
BUNDLED_SKILLS = frozenset({"self-governance", "self-operations"})
SKILLDIR = SKILLS[0][1]  # back-compat alias: the flagship (self-governance) skill dir
SKILLREF = os.path.join(SKILLDIR, "reference")

PASS, FAIL, SKIP = "PASS", "FAIL", "SKIP"


def rel(p: str) -> str:
    return os.path.relpath(p, ROOT)


def slug(heading: str) -> str:
    """GitHub-style heading slug: lowercase, drop punctuation (keep word chars + hyphen), spaces->hyphens."""
    s = heading.strip().lower()
    s = re.sub(r"[^\w\s-]", "", s)
    return re.sub(r"\s+", "-", s)


def run(cmd: list[str], timeout: int | None = None,
        env: dict[str, str] | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=timeout, env=env)


def pinned_node_env() -> dict[str, str] | None:
    """An env whose PATH leads with the node major `.nvmrc` pins, or None if that node is absent.

    WHY: a node-backed check invoked through a bare `npx` runs on whatever node is first on PATH, so
    it reports the ENVIRONMENT's age as a verdict about the repo. Measured 261013: PATH held v20.17
    against a pinned v24, `fs.globSync` does not exist before v22, and html-validate therefore died
    with `TypeError: fs.globSync is not a function`. The check reads that as "tool could not run"
    and returns SKIP — so the HTML validator had quietly stopped validating, locally, while CI
    (which installs the pinned node) kept passing. A gate that skips is indistinguishable from a
    gate that passes in a summary line, which is what made it survive.

    Returning None rather than raising keeps the caller's SKIP posture intact for a machine that
    genuinely lacks the pinned node; the point is to stop MISREPORTING a resolvable mismatch as an
    absent tool. `tools/land.py` resolves the same pin for the same reason and deliberately keeps
    its own copy: the lander has to work when this package is broken, so it stays stdlib-only and
    repo-import-free.
    """
    nvmrc = os.path.join(ROOT, ".nvmrc")
    if not os.path.isfile(nvmrc):
        return None
    with open(nvmrc) as fh:
        want = fh.read().strip().lstrip("v")
    if not want:
        return None
    nvm_dir = os.environ.get("NVM_DIR") or os.path.join(os.path.expanduser("~"), ".nvm")
    base = os.path.join(nvm_dir, "versions", "node")
    if not os.path.isdir(base):
        return None
    major = want.split(".")[0]
    cands = sorted(d for d in os.listdir(base) if d.lstrip("v").split(".")[0] == major)
    if not cands:
        return None
    bin_dir = os.path.join(base, cands[-1], "bin")
    if not os.path.isfile(os.path.join(bin_dir, "node")):
        return None
    env = dict(os.environ)
    env["PATH"] = bin_dir + os.pathsep + env.get("PATH", "")
    return env


def changed_vs_origin() -> frozenset[str] | None:
    """Repo-relative paths that differ from `origin/main` — committed-but-unpushed + uncommitted +
    new-untracked — used to skip a check whose declared inputs didn't change (see `needs_run`).

    Returns None when no baseline is available (missing `origin/main` ref, or not a git tree); callers
    then run every check. This is fail-SAFE, never fail-open: a stale baseline over-includes (runs more
    checks), and a missing one runs all — neither can skip a check whose input really changed.
    """
    if run(["git", "rev-parse", "--verify", "--quiet", "origin/main"]).returncode != 0:
        return None
    diff = run(["git", "diff", "--name-only", "origin/main"])
    if diff.returncode != 0:
        return None
    names = set(diff.stdout.splitlines())
    untracked = run(["git", "ls-files", "--others", "--exclude-standard"])  # new files absent from origin
    if untracked.returncode == 0:
        names |= set(untracked.stdout.splitlines())
    return frozenset(n for n in names if n)


# Path segments that hold .html but are NOT part of the served site: the plugin bundle (markdown, not a
# site), node_modules (dev-only axe tree), the serve dirs, and any gitignored scratch tree (`_drafts/`).
# `catalog.site_prune_dirs()` is the single source of truth — one definition of "the site" shared by the
# a11y (axe), validity (html-validate), and orphan scanners, so a local run matches CI (which never checks
# out the gitignored dirs). Kept here as a name for callers that reference it by segment.
_NON_SITE_DIRS = catalog.NON_SITE_DIRS


def html_files() -> list[str]:
    """Every built page that is part of the served site: prune the non-site + gitignored dirs (the plugin
    bundle, node_modules, serve dirs, `_drafts/`) so axe + html-validate scan exactly what CI deploys."""
    prune = catalog.site_prune_dirs()
    out: list[str] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in prune
                        and not catalog.is_native_build_path(os.path.join(dirpath, d))]
        out.extend(os.path.join(dirpath, fn) for fn in filenames if fn.endswith(".html"))
    return out


def book_body_files() -> list[str]:
    """Every emitted MAGE-book page body: `book/web/docs/<slug>.md`, each a raw-HTML body fragment
    (plus interleaved markdown heading lines) that ships verbatim inside the Material shell. Since
    the C3 publish swap the book has no flat tracked `.html` — the deterministic Tier-1 body checks
    (notation leak, one-<h1>, dup-ids, link resolution, …) scan THESE, which is exactly the markup
    the book contributes to the published DOM (Material's own chrome is upstream-owned; the built
    site needs the pinned venv and is gated by `mkdocs build --strict` in CI). Empty when the web
    build has not emitted yet — callers that require a built book should treat that as a failure,
    mirroring the 'no built HTML found' posture."""
    docs = os.path.join(ROOT, "book", "web", "docs")
    if not os.path.isdir(docs):
        return []
    return sorted(os.path.join(docs, f) for f in os.listdir(docs) if f.endswith(".md"))


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]
