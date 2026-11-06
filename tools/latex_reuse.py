#!/usr/bin/env python3
"""Artifact scope, change-aware reuse, and bounded-parallel compilation for the native LaTeX books.

ONE implementation, two books. The MAGE book's per-section review PDFs and the Software Engineering
Handbook's per-chapter review PDFs are the same problem wearing two names: a set of mutually
independent LuaLaTeX documents, each with its own driver and its own output, that the author wants
current on disk and that nobody wants recompiled when nothing moved. The mechanism landed for the
book first (`fd05c72d5` reuse, `0c2d9a627` the measured pool); it lives here so the handbook calls it
rather than growing a second copy whose stamp semantics could drift from the first.

Three concerns, deliberately in one module because they are one decision in practice:

  SCOPE      — the `published` / `local-only` vocabulary, read from whichever manifest owns the
               artifact. Each book keeps its own manifest (`book/book-manifest.json`,
               `handbook/book.yaml`); the VOCABULARY is shared so a reader meets one distinction,
               not two. A second vocabulary would defeat the point of declaring scope at all.
  REUSE      — the content cache key, and the stamp guard that makes a reuse sound rather than
               merely fast. A stamp is written only AFTER the compile converges and the caller's
               structure check passes, so it asserts "these exact artifacts passed these exact
               checks on these exact inputs" — and a reuse re-digests the published artifacts
               instead of trusting the stamp's word for them. `is_current` takes one artifact or
               several, plus paths that must merely be PRESENT, because a third call site (the
               147-figure TikZ candidate pool, landed as `e98b58ece` with its own hand-rolled copy
               of these primitives) verifies two artifacts and requires four audit side effects.
               `stamp_payload` emits the matching record, so a migrating caller never re-derives the
               format — a second spelling of `output_sha256` would read as a permanent cache miss,
               silently.
  POOL       — the worker count, the per-worker LuaLaTeX cache that makes concurrent compilation
               safe, and an order-preserving fan-out.

Every failure direction is fail-open, TOWARD compiling.
"""
from __future__ import annotations

import concurrent.futures
import functools
import hashlib
import itertools
import json
import os
import pathlib
import shutil
import subprocess
import sys
import threading
from typing import Callable, NamedTuple, Sequence

ROOT = pathlib.Path(__file__).resolve().parents[1]

# `compile_tex` is the repo's one LuaLaTeX seam (the pass loop AND the diagnostics allow-list).
# Reached by path bootstrap rather than a package import because `tools/` is a flat script
# directory every caller already puts on `sys.path`; this module must not be the one that needs it.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from latex_build import compile_tex  # noqa: E402  (path bootstrap above is load-bearing)


# ─────────────────────────────── Artifact scope: the vocabulary ───────────────────────────────────

#: A PUBLISHED artifact is built by the Pages workflow and rides the site artifact into the deployed
#: site. A LOCAL-ONLY artifact is built for the author's own review: never built in CI, never
#: uploaded, never served. The set is CLOSED — a manifest naming any other scope is an error, not a
#: new mode, because an unrecognized scope would otherwise silently read as "not local-only" and
#: publish.
PUBLISHED = "published"
LOCAL_ONLY = "local-only"
SCOPES = (PUBLISHED, LOCAL_ONLY)


def build_artifacts(manifest: dict) -> dict[str, dict]:
    """The declared build artifacts of one manifest, keyed by id.

    `manifest` is the already-parsed manifest mapping — JSON for the MAGE book, YAML for the
    handbook. This module takes the parsed form on purpose: the format a book states its identity in
    is the book's business, and the scope vocabulary is what has to be shared.
    """
    entries = manifest.get("build_artifacts") or []
    return {entry["id"]: entry for entry in entries}


def artifact_scope(artifacts: dict, artifact_id: str) -> str:
    """The declared scope of one artifact, validated against the closed set."""
    scope = artifacts[artifact_id]["scope"]
    if scope not in SCOPES:
        raise ValueError(f"build artifact {artifact_id!r} declares unknown scope {scope!r}; "
                         f"expected one of {SCOPES}")
    return scope


def is_local_only(artifacts: dict, artifact_id: str) -> bool:
    """Whether the manifest declares this artifact review-only — never published, never served."""
    return artifact_scope(artifacts, artifact_id) == LOCAL_ONLY


def is_publication_run(env: "dict[str, str] | None" = None) -> bool:
    """Whether this build feeds the published site.

    The Pages workflow is the only publication caller, and GitHub sets GITHUB_ACTIONS in every step
    it runs. Keying on the ENVIRONMENT rather than on a flag in the workflow is the point: a flag
    would restate the scope decision at a call site, which is the thing a declaration exists to
    stop, and a future CI job that called the build without the flag would silently re-publish.
    A bare `CI=true` deliberately does NOT suppress — any local wrapper sets it, and the published
    globs are the publication-side defense anyway.
    """
    return bool((os.environ if env is None else env).get("GITHUB_ACTIONS"))


def builds_local_only(artifacts: dict, artifact_id: str, *,
                      env: "dict[str, str] | None" = None) -> bool:
    """Whether THIS run should emit a declared local-only artifact: everywhere but a publication run.

    The pre-push hook and the Pages workflow therefore run byte-identical commands and cannot
    disagree about what those commands produce — the difference is the declaration, not a flag.
    """
    return not (is_local_only(artifacts, artifact_id) and is_publication_run(env))


# ──────────────────────────────── Reuse: the key and the stamp ────────────────────────────────────


def pool_workers(variable: str, *, default: int = 4, cap: int = 6) -> int:
    """Worker count for a set of independent document compiles, clamped to 1..`cap`.

    DEFAULT 4 — measured 261106 on the MAGE book's sections, which are the same kind of document on
    the same engine and host. Eight sections compiled at each setting, the settings INTERLEAVED
    (1, 4, 2, 6, 4, 1) so a drifting box load could not masquerade as a worker effect:

        workers   wall    overlap achieved   load (median)   peak RSS
          1      378.6s        1.00x             94            762 MB
          1      237.8s        1.00x             31            848 MB
          2      210.6s        2.00x             52           1519 MB
          4      140.8s        3.94x             44           3042 MB
          4       82.4s        3.76x             41           2923 MB
          6       84.0s        4.66x             30           2695 MB

    Read the OVERLAP column, not the wall column: wall-clock on this host is confounded by the agent
    fleet (the two serial runs differ by 1.59x on load alone, 94 against 31), while overlap compares a
    run's own summed per-unit times against its own wall and so is immune to drift between runs.
    Overlap holds 94-98% of linear through 4 workers and falls to 78% at 6.

    6 is not merely less efficient, it is not faster: 84.0s at load 30 against 82.4s at load 41, so
    the wider pool lost while the box was QUIETER. The ceiling is contention for cores, not memory —
    one LuaLaTeX peaks near 760 MB and four near 3 GB on a 36 GB host. The cap stays so a typo
    cannot oversubscribe a host the push gate is trying to be cheap on.
    """
    try:
        n = int(os.environ.get(variable, str(default)))
    except ValueError:
        n = default
    return max(1, min(cap, n))


def worker_texmf_cache(name: str, worker: int) -> pathlib.Path:
    """A persistent per-worker LuaLaTeX cache, seeded by an APFS clone of the warm shared one.

    Concurrent compilers racing a single luaotfload database can corrupt it, so each worker gets its
    own. Seeding by clone means a worker does not pay the cold font-database rebuild the shared cache
    exists to avoid; correctness never depends on the seed, only warmth does. This mirrors the
    pre-push hook's per-phase caches, deliberately — one pattern for the same hazard.
    """
    base = ROOT / "latex" / "build" / ".texmf-var"
    cache = ROOT / "latex" / "build" / f".texmf-var-{name}{worker}"
    if not cache.is_dir():
        if base.is_dir():
            if subprocess.run(["cp", "-c", "-R", str(base), str(cache)],
                              capture_output=True).returncode != 0:
                shutil.rmtree(cache, ignore_errors=True)
                try:
                    shutil.copytree(base, cache)
                except OSError:
                    shutil.rmtree(cache, ignore_errors=True)
        cache.mkdir(parents=True, exist_ok=True)
    return cache


@functools.lru_cache(maxsize=1)
def engine_identity() -> str:
    """The LuaLaTeX binary and its version banner, so a TeX Live upgrade invalidates every stamp."""
    engine = shutil.which("lualatex")
    if not engine:
        return "lualatex:absent"
    try:
        result = subprocess.run([engine, "--version"], capture_output=True, text=True, timeout=120)
        banner = (result.stdout or "").splitlines()[0] if result.stdout else ""
    except (OSError, subprocess.SubprocessError, IndexError):
        banner = ""
    return f"{engine}|{banner}"


def file_digest(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cache_key(version: str, *, shared_inputs: "tuple[str, ...]",
              asset_inputs: "list[str]", texts: "list[str]") -> str:
    """Digest every input a unit's PDF is derived from — contents, never mtimes.

    An mtime key goes wrong in both directions here: both books rewrite their generated drivers on
    every run (the book's `prepare_pdf` resolves external `\\autoref`s in place; the handbook
    re-emits each chapter's standalone `.tex` from Pandoc), so mtimes always look new — and a
    restored file can look old. Content is the only honest key.

    `version` namespaces one caller's keys from another's. `shared_inputs` and `asset_inputs` are
    repo-relative paths, hashed by NAME and CONTENT so a renamed input is a change and an absent one
    is recorded as absent rather than skipped. `texts` is the unit's own already-in-memory source.
    """
    digest = hashlib.sha256(version.encode())
    digest.update(engine_identity().encode())
    for relative in shared_inputs:
        path = ROOT / relative
        digest.update(relative.encode())
        digest.update(path.read_bytes() if path.is_file() else b"<absent>")
    for asset in asset_inputs:
        path = ROOT / asset
        digest.update(asset.encode())
        digest.update(path.read_bytes() if path.is_file() else b"<absent>")
    for text in texts:
        digest.update(text.encode())
    return digest.hexdigest()


def _verified_map(verified: "pathlib.Path | Sequence[pathlib.Path]") -> "dict[str, pathlib.Path]":
    """Artifacts to re-digest, keyed by basename. Raises on a collision rather than hiding one."""
    if isinstance(verified, (str, pathlib.PurePath)):
        return {pathlib.Path(verified).name: pathlib.Path(verified)}
    paths = [pathlib.Path(p) for p in verified]
    mapping = {p.name: p for p in paths}
    if len(mapping) != len(paths):
        raise ValueError(f"verified artifacts share a basename, so a digest map cannot key them: "
                         f"{[str(p) for p in paths]}")
    return mapping


def stamp_payload(key: str, verified: "pathlib.Path | Sequence[pathlib.Path]") -> dict:
    """The record a writer must store so `is_current` can later re-assert it.

    Write it ONLY after the compile converges and every gate passes, so the stamp asserts "these
    exact artifacts passed these exact checks on these exact inputs". Emitting the record through
    this function rather than by hand is what keeps the format one format: a second caller that
    spelled `output_sha256` slightly differently would read as a permanent cache miss, silently.

    A SINGLE artifact stores `output_sha256`; several store a `digests` map keyed by basename. The
    single-artifact spelling is the original one and is kept so stamps already on disk stay valid.
    """
    mapping = _verified_map(verified)
    if len(mapping) == 1:
        return {"key": key, "output_sha256": file_digest(next(iter(mapping.values())))}
    return {"key": key, "digests": {name: file_digest(path) for name, path in mapping.items()}}


def is_current(stamp: pathlib.Path, key: str,
               verified: "pathlib.Path | Sequence[pathlib.Path]", *,
               present: "Sequence[pathlib.Path]" = (), force: bool = False) -> bool:
    """True only when THESE artifacts, byte for byte, are the ones that passed on THESE inputs.

    Conditions, all required. The key must match, so any input change recompiles. Every `verified`
    artifact must exist and still digest to what the stamp recorded, so a deleted, truncated or
    hand-swapped artifact recompiles. Every `present` path must exist — for a compile whose SIDE
    EFFECTS a later reader depends on (an audit JSON, a manifest) where re-digesting the side effect
    would say nothing useful, but its absence means the reuse is not equivalent to the compile. And
    the stamp is only ever written AFTER the caller's checks pass, which is what makes a reuse sound
    rather than merely fast: the verdict is a function of the inputs, and every input is in the key.

    Every failure direction returns False — toward compiling.

    Outside the key, and so NOT covered: the system font files LuaLaTeX resolves by name. Each
    book's unconditional whole-edition render is what would catch a change there, and it runs either
    way.
    """
    if force:
        return False
    try:
        mapping = _verified_map(verified)
    except ValueError:
        return False
    for path in list(mapping.values()) + [pathlib.Path(p) for p in present]:
        if not path.is_file():
            return False
    try:
        record = json.loads(stamp.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return False  # no stamp, or an unreadable one: compile. Fail-open is the safe direction.
    if record.get("key") != key:
        return False
    return record == {**record, **stamp_payload(key, verified)}


def force_requested(*variables: str) -> bool:
    """Whether any of the named environment variables asks for an unconditional recompile."""
    return any(os.environ.get(variable) for variable in variables)


# ───────────────────────── Pool: order-preserving, reuse-aware fan-out ────────────────────────────


def thread_cache_claimer(cache_name: str) -> "Callable[[], pathlib.Path]":
    """A per-thread LuaLaTeX cache claimer for one pool run.

    Caches are claimed PER THREAD, not per task. A `next(counter) % jobs` assignment looks
    equivalent and is not: with three workers, the fourth task to START would take cache 0 while the
    first task may still hold it, which is precisely the concurrent-luaotfload race the caches exist
    to prevent. A pool thread runs one task at a time and is reused, so thread identity is the key.
    """
    lock = threading.Lock()
    cache_of_thread: "dict[int, pathlib.Path]" = {}
    cache_ids = itertools.count()

    def claim() -> pathlib.Path:
        key = threading.get_ident()
        with lock:
            if key not in cache_of_thread:
                cache_of_thread[key] = worker_texmf_cache(cache_name, next(cache_ids))
            return cache_of_thread[key]
    return claim


class Unit(NamedTuple):
    """One independent document: its driver, where its PDF is kept, and the check it must pass."""
    name: str                                       #: for logs and failure attribution
    source: pathlib.Path                            #: the generated `.tex` driver
    destination: pathlib.Path                       #: where the kept PDF lands
    stamp: pathlib.Path                             #: the reuse record beside the driver
    key: str                                        #: `cache_key(...)` over this unit's inputs
    check: Callable[[pathlib.Path], None]           #: raises to reject the freshly compiled PDF


class Result(NamedTuple):
    name: str
    reused: bool
    destination: "pathlib.Path | None"
    error: "str | None"


def compile_units(units: "list[Unit]", *, jobs: int, cache_name: str,
                  force: bool = False) -> "list[Result]":
    """Compile (or reuse) each unit, several at a time, returning results in UNIT ORDER.

    Order is load-bearing, not cosmetic: this repo has repeatedly lost a verdict to reading the
    wrong fragment of an interleaved log, so a caller can print these in the order it declared and
    the log reads like the serial build it replaces.
    """
    my_cache = thread_cache_claimer(cache_name)

    def run(unit: Unit) -> Result:
        try:
            if is_current(unit.stamp, unit.key, unit.destination, force=force):
                return Result(unit.name, True, unit.destination, None)
            pdf = compile_tex(unit.source, texmf_cache=my_cache())
            unit.check(pdf)
            unit.destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(pdf, unit.destination)
            # Stamped only NOW — after the compile converged, the diagnostics allow-list passed, and
            # the caller's structure check passed. The stamp therefore asserts "this exact PDF passed
            # on these exact inputs", which is the claim a later reuse relies on.
            unit.stamp.write_text(
                json.dumps(stamp_payload(unit.key, unit.destination), indent=2) + "\n",
                encoding="utf-8")
            return Result(unit.name, False, unit.destination, None)
        except (RuntimeError, ValueError, OSError) as error:
            return Result(unit.name, False, None, f"ERROR: {unit.name}: {error}")

    if jobs <= 1:
        return [run(unit) for unit in units]
    with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
        return list(pool.map(run, units))
