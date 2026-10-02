"""Mermaid build-cache soundness: a hit must skip the renderer, and every render input must invalidate.

The book build renders each ```mermaid fence to inline SVG via mermaid-cli and caches the result at
`book/.mermaid-svg-cache/<key>.svg` (gitignored). The cache is what makes a rebuild cheap — a cold render
of this tree's ~130 fences costs about 80 s of headless-Chromium spawns, and a warm one costs file reads.

That makes the key the whole correctness story. A key that misses a render input serves a diagram drawn
under the OLD input forever, silently, and a stale diagram is worse than a slow build. So these checks
pin both halves of the contract against the real `render_mermaid_svg`, with a COUNTING STUB standing in
for `mmdc` — the stub keeps the checks deterministic and sub-second (no browser), while still exercising
the real cache-path, spawn, and write-back code:

  CACHE-HIT   render twice, the renderer spawns ONCE — the second call reads the cache.
  CACHE-MISS  edit the fence, the renderer spawns AGAIN and the returned SVG changes.
  CACHE-INPUT each declared renderer input (mermaid config, puppeteer launch options, the npm lockfile
              that pins mermaid-cli + Chromium, the Node pin, and an external browser path) changes the
              key when it moves. This is the check that would have caught the pre-261002 key, which
              covered only the fence body and the theme config: a mermaid-cli bump reused every SVG.
"""
from __future__ import annotations

import importlib
import os
import pathlib
import shutil
import stat
import sys
import tempfile

from tests.common import FAIL, PASS, ROOT

# `build_book` lives in book/ and imports its siblings (bookmath, book_tokens) plus book-models/ by bare
# name, exactly as it does when run as a script from book/.
for _p in (os.path.join(ROOT, "book"), os.path.join(ROOT, "book-models")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# A stand-in for `mmdc`: writes an SVG whose body embeds the input, and appends one line per spawn to
# $STUB_LOG. Embedding the input means "the SVG changed" is a real signal, not a timestamp artifact.
_STUB = """#!/usr/bin/env python3
import os, sys
args = sys.argv[1:]
src = open(args[args.index("-i") + 1], encoding="utf-8").read()
out = args[args.index("-o") + 1]
sid = args[args.index("--svgId") + 1]
with open(os.environ["STUB_LOG"], "a", encoding="utf-8") as fh:
    fh.write("spawn\\n")
open(out, "w", encoding="utf-8").write(
    '<svg id="%s" width="100" height="100"><desc>%s</desc></svg>' % (sid, src.strip()))
"""


class _Harness:
    """Point `build_book`'s renderer + cache at a sandbox, and count spawns.

    `render_mermaid_svg` resolves `_MMDC` / `_MERMAID_CACHE` / the renderer-fingerprint inputs from module
    globals, so redirecting those globals exercises the real function against sandbox paths. A fresh module
    object per harness keeps the memoized fingerprint and the real tree's globals untouched."""

    def __init__(self, tmp: pathlib.Path):
        self.tmp = tmp
        self.bb = importlib.reload(importlib.import_module("build_book"))
        self.log = tmp / "spawns.log"
        self.log.write_text("", encoding="utf-8")
        mmdc = tmp / "mmdc-stub.py"
        mmdc.write_text(_STUB, encoding="utf-8")
        mmdc.chmod(mmdc.stat().st_mode | stat.S_IXUSR)
        self.inputs = {}
        for attr, src in (("_MERMAID_CONFIG", self.bb._MERMAID_CONFIG),
                          ("_MMDC_PUPPETEER", self.bb._MMDC_PUPPETEER),
                          ("_MERMAID_LOCKFILE", self.bb._MERMAID_LOCKFILE),
                          ("_MERMAID_NODE_PIN", self.bb._MERMAID_NODE_PIN)):
            dst = tmp / pathlib.Path(src).name
            shutil.copyfile(src, dst)
            setattr(self.bb, attr, dst)
            self.inputs[attr] = dst
        self.bb._MMDC = mmdc
        self.bb._MERMAID_CACHE = tmp / "cache"
        self.bb._RENDERER_FINGERPRINT = None
        os.environ["STUB_LOG"] = str(self.log)

    def render(self, source: str) -> str:
        return self.bb.render_mermaid_svg(source)

    def spawns(self) -> int:
        return len(self.log.read_text(encoding="utf-8").split())

    def key(self, source: str) -> str:
        self.bb._RENDERER_FINGERPRINT = None
        return self.bb._mermaid_cache_key(source)


_FENCE = "flowchart TD\n  A[Start] --> B[End]\n"


def check_mermaid_cache_hit_and_edit():
    """Fail unless a repeat render reads the cache (no second spawn) AND an edited fence re-renders."""
    findings = []
    with tempfile.TemporaryDirectory() as td:
        h = _Harness(pathlib.Path(td))

        first = h.render(_FENCE)
        if h.spawns() != 1:
            findings.append(f"first render spawned the renderer {h.spawns()}x, expected 1 "
                            f"(a cold cache must render exactly once per fence)")
        if "<svg" not in first or len(first) < 40:
            findings.append(f"first render returned no usable inline SVG: {first[:120]!r}")

        second = h.render(_FENCE)
        if h.spawns() != 1:
            findings.append(f"re-rendering an UNCHANGED fence spawned the renderer again "
                            f"({h.spawns()} total) — the cache is not being read, so every build pays "
                            f"the full render cost")
        if second != first:
            findings.append("re-rendering an unchanged fence returned different SVG — the cached "
                            "entry and a fresh render disagree")

        edited = h.render(_FENCE.replace("End", "Finish"))
        if h.spawns() != 2:
            findings.append(f"editing the fence did NOT re-render ({h.spawns()} spawns, expected 2) — "
                            f"the cache is serving a STALE diagram for edited source")
        if edited == first:
            findings.append("editing the fence returned the SAME SVG — a stale diagram shipped")

    return (FAIL if findings else PASS), findings


def check_mermaid_cache_key_covers_every_render_input():
    """Fail unless each declared renderer input changes the cache key when it moves.

    Covers the fence body plus the four tracked files and the external-browser env var that
    `_mermaid_renderer_fingerprint` folds in. A gap here is a silent stale-diagram channel: the build
    would keep serving SVGs drawn by the previous toolchain or theme."""
    findings = []
    with tempfile.TemporaryDirectory() as td:
        h = _Harness(pathlib.Path(td))
        base = h.key(_FENCE)

        if h.key(_FENCE + "  B --> C\n") == base:
            findings.append("editing the FENCE SOURCE does not change the cache key")

        for attr, path in h.inputs.items():
            before = path.read_text(encoding="utf-8")
            path.write_text(before + "\n# moved\n", encoding="utf-8")
            try:
                if h.key(_FENCE) == base:
                    findings.append(
                        f"changing {attr} ({path.name}) does not change the cache key — a bump to it "
                        f"would silently reuse every diagram rendered under the old value")
            finally:
                path.write_text(before, encoding="utf-8")

        prev = os.environ.get("PUPPETEER_EXECUTABLE_PATH")
        os.environ["PUPPETEER_EXECUTABLE_PATH"] = "/nonexistent/other-chrome"
        try:
            if h.key(_FENCE) == base:
                findings.append("pointing PUPPETEER_EXECUTABLE_PATH at a different browser does not "
                                "change the cache key — mermaid measures label text in the browser, so a "
                                "different browser can change diagram geometry")
        finally:
            if prev is None:
                os.environ.pop("PUPPETEER_EXECUTABLE_PATH", None)
            else:
                os.environ["PUPPETEER_EXECUTABLE_PATH"] = prev

        if h.key(_FENCE) != base:
            findings.append("the cache key is not stable across repeated calls with identical inputs — "
                            "every build would re-render every diagram")

    return (FAIL if findings else PASS), findings


if __name__ == "__main__":
    bad = 0
    for fn in (check_mermaid_cache_hit_and_edit, check_mermaid_cache_key_covers_every_render_input):
        status, out = fn()
        for f in out:
            print(f"  {f}")
        print(f"{status}: {fn.__name__}")
        bad += status == FAIL
    sys.exit(1 if bad else 0)
