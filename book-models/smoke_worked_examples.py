"""SMOKE — the Worked-Examples gallery directive renders end-to-end in BOTH projections.

This proves the renderer BEFORE any real chapter declares a gallery (Wave-0 lands the directive INERT). It
drives a minimal fixture gallery through:

  * the WEB (HTML) path — `build_book.md_to_html` (the real block-loop intercept + collect-forward);
  * the PRINT (Typst) path — `book_ir._parse_chapter` → `book_typst.render_chapter` (the real directive
    collector);
  * the PROJECTION — `industry_cases_model.worked_example_roster` (the roster is WE1-clean by construction).

and asserts the roster + Takeaway render, and that NO gallery marker leaks into either output. Stdlib-only;
run `python3 book-models/smoke_worked_examples.py` (exit 0 = pass).
"""
from __future__ import annotations

import os
import pathlib
import sys

_HERE = pathlib.Path(__file__).resolve().parent
_ROOT = _HERE.parent
for _p in (str(_ROOT / "book"), str(_HERE)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import book_ir  # noqa: E402 — the shared parser + IR
import book_typst  # noqa: E402 — the Typst projection
import build_book as bb  # noqa: E402 — the HTML projection
import industry_cases_model as icm  # noqa: E402 — the roster projection


# A minimal fixture gallery — a construct-key with three slots (industry-first, DocAble-last) + a Takeaway.
# Authored with a blank line between each head and its gloss (the ordinary markdown style); the parser also
# tolerates the glued style, exercised by _FIXTURE_GLUED below.
_TAKEAWAY = "authority placed in the environment, not the prompt"
_FIXTURE = f"""## Constraints and sensors

Some theory prose stating the abstraction once.

<!-- worked-examples: thesis-alignment -->
### Example — Docker
A typed build description became a reasoning substrate the tooling could check and cache.

### Example — Zenseact
The safety case is the model every agent step is measured against.

### Example — DocAble
The typed remediation IR plays the same role: every fix is a node the validator can walk.

<!-- takeaway -->
The common mechanism is {_TAKEAWAY}.
<!-- worked-examples-end -->

A closing transition sentence.
"""

# The glued variant — no blank lines inside the gallery (the B2 §7.2 authored sketch) — must parse the same.
_FIXTURE_GLUED = (
    "<!-- worked-examples: institutional-knowledge-capital -->\n"
    "### Example — Docker\nOne breath on Docker.\n"
    "### Example — DocAble\nOne breath on DocAble.\n"
    "<!-- takeaway -->\nThe shared abstraction is reusable capital.\n"
    "<!-- worked-examples-end -->\n"
)

_MARKERS_THAT_MUST_NOT_LEAK = ("worked-examples:", "worked-examples-end", "<!-- takeaway -->", "### Example")


def _check(cond: bool, msg: str, failures: "list[str]") -> None:
    if not cond:
        failures.append(msg)


def _html_checks(failures: "list[str]") -> None:
    out = bb.md_to_html(_FIXTURE)
    _check('<section class="worked-examples"' in out, "HTML: no .worked-examples section", failures)
    _check('data-construct="thesis-alignment"' in out, "HTML: construct-key weld missing", failures)
    for src in ("Docker", "Zenseact", "DocAble"):
        _check(f'<span class="wex-src">{src}.</span>' in out, f"HTML: source lead-in {src!r} missing", failures)
    _check('<div class="wex-takeaway">' in out, "HTML: no Takeaway block", failures)
    _check(_TAKEAWAY in out, "HTML: Takeaway sentence missing", failures)
    for m in _MARKERS_THAT_MUST_NOT_LEAK:
        _check(m not in out, f"HTML: gallery marker leaked into output: {m!r}", failures)
    # the glued variant renders the same shape
    out2 = bb.md_to_html(_FIXTURE_GLUED)
    _check('data-construct="institutional-knowledge-capital"' in out2, "HTML(glued): weld missing", failures)
    _check('<span class="wex-src">Docker.</span>' in out2, "HTML(glued): Docker lead-in missing", failures)
    _check("reusable capital" in out2 and '<div class="wex-takeaway">' in out2,
           "HTML(glued): Takeaway missing", failures)


def _typst_checks(failures: "list[str]") -> None:
    chapter = book_ir._parse_chapter({"slug": "smoke-wex", "part": 2, "chapter": 3,
                                      "chapter_title": "Smoke", "body_md": _FIXTURE})
    # confirm the IR produced the directive block (the collector's entry point)
    directives = [b.directive for b in chapter.blocks if b.kind is book_ir.BlockKind.DIRECTIVE]
    _check("worked-examples" in directives, "Typst: IR did not classify the open marker as a directive", failures)
    ctx = book_typst._EmitCtx.inert()
    out = book_typst.render_chapter(chapter, ctx)
    _check("WORKED EXAMPLES" in out, "Typst: gallery title missing", failures)
    for src in ("Docker", "Zenseact", "DocAble"):
        _check(f"#strong[{src}.]" in out, f"Typst: source lead-in {src!r} missing", failures)
    _check("#strong[Takeaway.]" in out, "Typst: Takeaway label missing", failures)
    _check(_TAKEAWAY in out, "Typst: Takeaway sentence missing", failures)
    _check("dt.accent" in out, "Typst: accent styling missing", failures)
    for m in ("worked-examples-end", "### Example", "<!-- takeaway -->"):
        _check(m not in out, f"Typst: gallery marker leaked into output: {m!r}", failures)


def _projection_checks(failures: "list[str]") -> None:
    kind, slots = icm.worked_example_roster("thesis-alignment")
    _check(kind == "construct", f"projection: thesis-alignment kind {kind!r} != construct", failures)
    ind = [s for s in slots if s.source_type == "industry-case"]
    _check(bool(ind), "projection: no industry slots for thesis-alignment", failures)
    for s in ind:
        _check(icm.worked_example_clears("thesis-alignment", s.ref),
               f"projection: {s.ref!r} does not clear WE1 (roster not WE1-clean)", failures)
    _check(slots[-1].source_type == "docable", "projection: DocAble is not the deepest (last) slot", failures)


def main() -> int:
    failures: "list[str]" = []
    _html_checks(failures)
    _typst_checks(failures)
    _projection_checks(failures)
    if failures:
        print(f"SMOKE worked-examples: {len(failures)} FAILURE(S):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("SMOKE worked-examples: PASS — gallery renders in HTML + Typst; roster projected WE1-clean; "
          "Takeaway present; no marker leak")
    return 0


if __name__ == "__main__":
    sys.exit(main())
