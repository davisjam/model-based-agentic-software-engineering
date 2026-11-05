#!/usr/bin/env python3
"""Inline the shared instrument stylesheet into every interactive exercise's shipped HTML.

    python3 course/interactive/_shared/sync_css.py            # propagate, report what changed
    python3 course/interactive/_shared/sync_css.py --check     # report drift, write nothing

`instrument-core.css` holds the styling the six exercises share. Each shipped `index.html` carries
two `<style>` elements: this file's text, inlined into a marker-delimited region, and then the
exercise's own hand-authored block. The core comes first so a local rule wins a tie against a core
rule at equal specificity.

The inlining exists because each page must stay ONE file: a student opens it from a `file://` URL
and the Download HTML control hands over the same bytes. A `<link rel=stylesheet>` would break both,
and each exercise's packaging suite asserts no such link and no `@import` exists. So the duplication
is removed at the source and re-introduced at build time.

Stdlib only, no third-party imports: this repo is clone-and-run, and the sync must work on a fresh
checkout with nothing installed.

Run it by hand after editing the core, the way the repo's other source-to-view syncs are run. It is
deliberately NOT wired into the `pre-commit` hook: that hook already force-stages `*.html` at any
depth, and a hook that also REWROTE hand-authored exercise HTML during an unrelated commit would
widen exactly the sweep hazard documented in CLAUDE.md.

The gate that carries the discipline is a parity assertion in each exercise's
`tests/test-packaging.mjs`, which holds the inlined copy byte-equal to the core and runs as a leg of
the publishing workflow's `interactive-exercises` matrix. Edit a generated block in a shipped page
and that exercise's suite goes red naming this command.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
CORE = HERE / "instrument-core.css"
INTERACTIVE = HERE.parent

#: The exercises, in the order the publishing workflow's matrix lists them.
EXERCISES = (
    "performance-knee",
    "n-plus-one",
    "redos",
    "release-factory",
    "storage-cost",
    "architecture-workbench",
)

BEGIN = (
    "/* ===== GENERATED from course/interactive/_shared/instrument-core.css by sync_css.py — "
    "do not edit\n"
    "   here; edit the source and re-run the sync. A parity test in tests/test-packaging.mjs holds\n"
    "   this copy byte-equal to the source. ===== */"
)
END = "/* ===== end generated core ===== */"


class SyncError(RuntimeError):
    """A shipped page cannot be synced, and the run must stop rather than guess."""


def region(core_text: str) -> str:
    """The exact bytes the marker-delimited region must contain, markers included.

    Pinning the shape here — rather than letting each caller assemble it — is what lets the parity
    test state its assertion as one equality against this file's text.
    """
    return f"{BEGIN}\n{core_text.rstrip(chr(10))}\n{END}"


def replace_region(html: str, core_text: str, label: str) -> str:
    """Return `html` with its generated region replaced by the current core.

    Fails loudly on anything it cannot do exactly once: a missing marker, a duplicated marker, or
    markers in the wrong order. A sync that silently skipped a page would leave that page stale with
    nothing in the output to say so — which is the failure this tool exists to prevent.
    """
    for marker, name in ((BEGIN, "begin"), (END, "end")):
        count = html.count(marker)
        if count == 0:
            raise SyncError(
                f"{label}: no {name} marker. The generated region is created by the extraction, "
                f"not by this tool; add the two markers around a copy of instrument-core.css in "
                f"the page's first <style> element, then re-run."
            )
        if count > 1:
            raise SyncError(f"{label}: {count} {name} markers — there must be exactly one.")

    start = html.index(BEGIN)
    stop = html.index(END) + len(END)
    if stop <= start:
        raise SyncError(f"{label}: the end marker precedes the begin marker.")

    local_style = html.rfind("<style>")
    if local_style <= stop:
        raise SyncError(
            f"{label}: the generated region is not followed by a second <style> element. The core "
            f"must come FIRST and the exercise's own block second, or a local rule loses its tie "
            f"against a core rule."
        )
    return html[:start] + region(core_text) + html[stop:]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--check",
        action="store_true",
        help="report pages whose generated region is stale; write nothing; exit 1 on any drift",
    )
    args = parser.parse_args(argv)

    if not CORE.is_file():
        sys.stderr.write(f"ERROR: the shared core is missing: {CORE}\n")
        return 1
    core_text = CORE.read_text(encoding="utf-8")

    # Planned actions first, so a reader can see what the run intends before it does anything.
    verb = "CHECK" if args.check else "SYNC"
    print(f"{verb} plan — source: {CORE.relative_to(INTERACTIVE.parent.parent)} "
          f"({len(core_text)} bytes, {len(core_text.splitlines())} lines)")
    for name in EXERCISES:
        print(f"  {verb.lower():5s} course/interactive/{name}/index.html")
    print()

    started = time.monotonic()
    changed: list[str] = []
    stale: list[str] = []
    failed: list[str] = []

    for name in EXERCISES:
        path = INTERACTIVE / name / "index.html"
        if not path.is_file():
            failed.append(f"{name}: no index.html at {path}")
            continue
        html = path.read_text(encoding="utf-8")
        try:
            updated = replace_region(html, core_text, name)
        except SyncError as exc:
            failed.append(str(exc))
            continue
        if updated == html:
            print(f"  {name:24s} up to date")
            continue
        stale.append(name)
        if args.check:
            print(f"  {name:24s} STALE — generated region differs from the core")
            continue
        path.write_text(updated, encoding="utf-8")
        changed.append(name)
        print(f"  {name:24s} rewritten ({len(updated) - len(html):+d} bytes)")

    seconds = time.monotonic() - started
    print(f"\n{verb} result: {len(EXERCISES) - len(failed) - len(stale)} up to date, "
          f"{len(changed)} rewritten, {len(stale) - len(changed)} stale, {len(failed)} failed "
          f"in {seconds:.2f}s")

    for message in failed:
        sys.stderr.write(f"ERROR: {message}\n")
    if failed:
        return 1
    if args.check and stale:
        sys.stderr.write(
            f"ERROR: {len(stale)} page(s) carry a stale core. Run "
            f"`python3 course/interactive/_shared/sync_css.py` and commit the result.\n"
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
