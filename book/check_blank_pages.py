#!/usr/bin/env python3
"""Sensor: is any body page left mostly BLANK by a pagination failure?

Two independent pagination failures produce the same symptom — a page whose bottom half (or more)
is unexpectedly empty while the following page carries content that could have filled it:
  1. a forced page break before a major numbered section (the section starts a fresh page and the
     preceding page is abandoned mid-flow), and
  2. an unbreakable downstream object (an inset/aside, a figure keep-together) dragging the whole
     following block to the next page instead of moving alone.
This sensor measures the symptom on the rendered PDF, so it is both the diagnostic (find every such
page) and the acceptance metric (before/after flagged-page counts) for fixes to either cause.

Two-stage, sibling of `check_inset_wrap.py`, so we never rasterize all pages:
  1. `pdftotext -bbox` per-page TEXT occupancy: merge body-word y-intervals (folio + margin-note
     words excluded), take the largest uncovered gap in the text region. A page whose largest text
     gap nears the threshold is a CANDIDATE — cheap, but blind to vector art (SVG diagrams carry no
     extractable text and would false-flag).
  2. Candidates are rasterized (`pdftoppm`) and the gap re-measured as consecutive INK-FREE pixel
     rows across the body column (text, diagrams, and panel tints all count as ink; the cream page
     fill does not). The rasterized blank fraction is the reported metric.

INTENTIONAL blanks are excused, not flagged:
  - front-of-book pages through the Contents, and the final page;
  - a Part-divider orientation page (detected by its "Question this Part answers" apparatus label /
    "Part N" heading) and an appendix-Part divider, which are designed with air — and any landscape
    page (its geometry differs);
  - a page whose NEXT page legitimately opens fresh: a Part/appendix divider, a chapter opener
    (an `N.1` first-section, or any unnumbered matter/coda/appendix/backmatter chapter title — the
    title list is read from the book IR, the same source the renderer walks), the Bibliography, a
    landscape page, or a page with no body text at all.
A page followed by a CONTINUING major numbered section (`N.M`, M >= 2) or by mid-paragraph prose is
NOT excused — those are exactly the two failure classes above.

Two invocations:
  - PLAIN (human diagnostic): list every flagged page. Exit 0 = none, exit 1 = at least one.
  - RATCHET (`--check`, the `--pdf` build gate): compare the flagged set against the committed
    baseline `book/blank-page-baseline.json` and fail ONLY on a REGRESSION — a flagged page whose
    FINGERPRINT is not in the baseline. The fingerprint is the flag's `next_page_starts` text, not
    its page number: page numbers drift whenever content shifts, but the text that opens the page
    after the blank identifies the same pagination seam across renders. Exit 0 = no new fingerprint
    (standing baseline flags tolerated, resolved ones reported), exit 1 = new fingerprint(s),
    exit 2 = baseline missing. `--write-baseline` records the current flagged set as the baseline.

Needs `pdftotext`, `pdftoppm`, PIL, numpy (stage 2 only).
Usage: python3 book/check_blank_pages.py <pdf> [--min-blank 0.5] [--dpi 110] [--json]
                                               [--check | --write-baseline]
"""
from __future__ import annotations

import html
import json
import pathlib
import re
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import book_ir as ir            # noqa: E402 — chapter-title SSOT (the same IR the renderer walks)
import book_typst as bt         # noqa: E402 — _is_numbered_body: which chapters legitimately open pages
import build_book as bb         # noqa: E402 — page geometry + part-opener label SSOT

# Page geometry (US-Letter portrait body; PDF points, 72/in) — shared with build_book's sensors.
_TEXT_TOP_PT = 72.0                             # 1in top margin
_SAFE_BOTTOM_PT = bb._BODY_SAFE_BOTTOM_PT       # 720 — text-region bottom (folio band below)
_BODY_RIGHT_PT = 535.0                          # body column right bound (justified edge ~531)
_BODY_LEFT_PT = 70.0                            # body column left bound (margin ~81; dividers ~57)
_NOTE_COL_X_PT = 510.0                          # Tufte margin-note words start right of this …
_NOTE_MAX_H_PT = 9.5                            # … and render small (8.5pt face); body is 12pt

_PAGE_RE = re.compile(r'<page width="([\d.]+)" height="([\d.]+)">(.*?)</page>', re.S)
_WORD_RE = re.compile(
    r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', re.S)
_FOLIO_RE = re.compile(r"^\d+$")
_CHAPTER_OPENER_RE = re.compile(r"^\d+\.1\s")   # "N.1 Title" — a part's first numbered section


def _squish(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", s.lower())


class _Page:
    """One page's parsed word boxes, split into body words vs excluded (folio / margin-note) words."""

    def __init__(self, width: float, height: float, xml: str):
        self.width = width
        self.height = height
        self.landscape = width > height
        self.body_words: list[tuple[float, float, float, float, str]] = []
        texts: list[str] = []
        for wm in _WORD_RE.finditer(xml):
            x0, y0, x1, y1 = (float(wm.group(i)) for i in (1, 2, 3, 4))
            t = html.unescape(wm.group(5)).strip()
            if not t:
                continue
            texts.append(t)
            if y0 >= _SAFE_BOTTOM_PT and _FOLIO_RE.match(t):
                continue                                     # running page number
            if x0 >= _NOTE_COL_X_PT and (y1 - y0) <= _NOTE_MAX_H_PT:
                continue                                     # Tufte margin-note word
            self.body_words.append((x0, y0, x1, y1, t))
        self.text = " ".join(texts)
        self.squish = _squish(self.text)

    def max_text_gap_frac(self) -> float:
        """Largest uncovered vertical gap in the text region, as a fraction of its height. Body-word
        y-intervals are merged; the complement's largest run (top margin → safe bottom) is the gap."""
        region_h = _SAFE_BOTTOM_PT - _TEXT_TOP_PT
        spans = sorted((max(y0, _TEXT_TOP_PT), min(y1, _SAFE_BOTTOM_PT))
                       for _, y0, _, y1, _ in self.body_words if y1 > _TEXT_TOP_PT and y0 < _SAFE_BOTTOM_PT)
        if not spans:
            return 1.0
        gap = spans[0][0] - _TEXT_TOP_PT
        cursor = spans[0][1]
        for y0, y1 in spans[1:]:
            gap = max(gap, y0 - cursor)
            cursor = max(cursor, y1)
        gap = max(gap, _SAFE_BOTTOM_PT - cursor)
        return gap / region_h


def _parse_pages(pdf: str) -> list[_Page]:
    out = subprocess.run(["pdftotext", "-bbox", pdf, "-"],
                         capture_output=True, text=True, check=True).stdout
    return [_Page(float(m.group(1)), float(m.group(2)), m.group(3)) for m in _PAGE_RE.finditer(out)]


def _opener_squishes() -> list[str]:
    """Squished titles of every chapter that legitimately OPENS a fresh page — everything except the
    continuing numbered body sections (N.M, M >= 2), which flow. Read from the book IR (the renderer's
    own source), so the excuse list cannot drift from what the renderer emits."""
    doc = ir.parse_book(include_appendices=True, for_print=True)
    return [_squish(c.title) for c in doc.chapters
            if c.title and not (bt._is_numbered_body(c) and c.chapter >= 2)
            # Part landing pages carry the bare Part title ("Modeling") — short, common words that would
            # false-match mid-prose; the Part-divider case is already covered by the "Part N" regex.
            and not bt._is_part_page(c) and not bt._is_appendix_divider(c)]


def _page_is_divider(pg: _Page, q_label_squish: str) -> bool:
    """A Part-divider orientation page (carries the DO-ladder question label) or an appendix-Part /
    back-matter divider (opens with its display title)."""
    return (q_label_squish in pg.squish
            or pg.squish.startswith("part") and re.match(r"^part\d", pg.squish) is not None
            or pg.squish.startswith("appendixpart")
            or pg.squish.startswith("backmatter"))


def _next_page_excuses(nxt: "_Page | None", opener_squishes: list[str]) -> "str | None":
    """The reason the NEXT page makes this page's trailing blank intentional, or None."""
    if nxt is None:
        return "final page"
    if nxt.landscape:
        return "next page is a landscape apparatus"
    if not nxt.body_words:
        return "next page carries no body text"
    if re.match(r"^Part \d", nxt.text) or nxt.squish.startswith("appendixpart") \
            or nxt.squish.startswith("backmatter"):
        return "next page is a Part divider"
    if _CHAPTER_OPENER_RE.match(nxt.text):
        return "next page opens a part's first section (N.1)"
    if nxt.squish.startswith("bibliography"):
        return "next page opens the Bibliography"
    nsq = nxt.squish
    for t in opener_squishes:
        if not t:
            continue
        # A divider/opener may print a short KICKER above its title ("Conclusion" over the Part-8 title),
        # so LONG titles tolerate up to ~40 squished chars of lead-in. Short titles must match at the
        # start exactly — a short title inside a window false-matches ordinary prose.
        if nsq.startswith(t) or (len(t) >= 12 and t in nsq[:len(t) + 40]):
            return "next page opens a chapter that starts fresh by design"
    return None


def _raster_blank_frac(pdf: str, page: int, dpi: int) -> "tuple[float, tuple[float, float]] | None":
    """Rasterize one page; largest ink-free row run across the body column, as a fraction of the text
    region height, plus the gap's (top, bottom) in PDF points. Vector diagrams and panel tints count
    as ink (they are content); the cream page fill does not."""
    import numpy as np
    from PIL import Image
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(["pdftoppm", "-f", str(page), "-l", str(page), "-r", str(dpi),
                        "-png", pdf, f"{td}/pg"], check=True, capture_output=True)
        import os
        pngs = [f for f in os.listdir(td) if f.endswith(".png")]
        if not pngs:
            return None
        im = np.asarray(Image.open(f"{td}/{pngs[0]}").convert("L"))
    scale = dpi / 72.0
    top, bot = int(_TEXT_TOP_PT * scale), int(_SAFE_BOTTOM_PT * scale)
    left, right = int(_BODY_LEFT_PT * scale), int(_BODY_RIGHT_PT * scale)
    band = im[top:bot, left:right]
    ink_rows = (band < 250).sum(axis=1) >= 3         # >=3 sub-paper pixels in a row = content
    best_len, best_top = 0, 0
    run_start = None
    for i, has_ink in enumerate(list(ink_rows) + [True]):    # sentinel closes a trailing run
        if not has_ink and run_start is None:
            run_start = i
        elif has_ink and run_start is not None:
            if i - run_start > best_len:
                best_len, best_top = i - run_start, run_start
            run_start = None
    frac = best_len / max(1, bot - top)
    gap_pts = (_TEXT_TOP_PT + best_top / scale, _TEXT_TOP_PT + (best_top + best_len) / scale)
    return frac, gap_pts


def check(pdf: str, min_blank: float = 0.5, dpi: int = 110) -> list[dict]:
    pages = _parse_pages(pdf)
    opener_sq = _opener_squishes()
    q_label_sq = _squish(bb._PART_OPENER_QUESTION_LABEL)
    toc_page = next((i for i, p in enumerate(pages, 1)
                     if p.squish.startswith("tableofcontents")), 0)
    flags: list[dict] = []
    for pno, pg in enumerate(pages, 1):
        if pno <= max(toc_page, 2):                  # cover / copyright / Contents front-of-book run
            continue
        if pg.landscape or not pg.body_words:
            continue
        if _page_is_divider(pg, q_label_sq):
            continue
        # Stage-1 candidate filter (text-only, blind to vector art — loose on purpose; stage 2 decides).
        if pg.max_text_gap_frac() < min_blank * 0.8:
            continue
        nxt = pages[pno] if pno < len(pages) else None
        excuse = _next_page_excuses(nxt, opener_sq)
        if excuse:
            continue
        res = _raster_blank_frac(pdf, pno, dpi)
        if res is None:
            continue
        frac, (gap_top, gap_bot) = res
        if frac >= min_blank:
            flags.append({"page": pno, "blank_frac": round(frac, 2),
                          "gap_pts": [round(gap_top), round(gap_bot)],
                          "next_page_starts": (nxt.text[:70] if nxt else "")})
    return flags


BASELINE_PATH = HERE / "blank-page-baseline.json"

#: First key of the baseline JSON — the auto-gen provenance marker (emitter + regen command), re-emitted
#: on every `--write-baseline` run so a hand-edit can never silently survive a regen.
_BASELINE_PROVENANCE = (
    "AUTO-GENERATED by book/check_blank_pages.py --write-baseline — do not hand-edit. "
    "Regen: python3 book/check_blank_pages.py book/mage-book.pdf --write-baseline"
)


def fingerprints(flags: list[dict]) -> list[str]:
    """The ratchet key for each flag: the text that opens the page after the blank. Stable across
    page-number drift; a genuinely new pagination seam mints a new fingerprint."""
    return [f["next_page_starts"] for f in flags]


def load_baseline() -> "list[str] | None":
    if not BASELINE_PATH.is_file():
        return None
    with open(BASELINE_PATH, encoding="utf-8") as fh:
        return json.load(fh)["fingerprints"]


def write_baseline(flags: list[dict], min_blank: float, dpi: int) -> None:
    data = {
        "_provenance": _BASELINE_PROVENANCE,
        "min_blank": min_blank,
        "dpi": dpi,
        "count": len(flags),
        "fingerprints": sorted(fingerprints(flags)),
    }
    with open(BASELINE_PATH, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def ratchet(pdf: str, min_blank: float = 0.5, dpi: int = 110
            ) -> "tuple[list[dict], list[str]] | None":
    """The gate-facing comparison: (new_flags, resolved_fingerprints), or None when no baseline
    exists. Multiset compare, so a duplicate fingerprint appearing MORE times than the baseline
    records still registers as a regression."""
    baseline = load_baseline()
    if baseline is None:
        return None
    flags = check(pdf, min_blank=min_blank, dpi=dpi)
    remaining = list(baseline)
    new_flags: list[dict] = []
    for f in flags:
        fp = f["next_page_starts"]
        if fp in remaining:
            remaining.remove(fp)
        else:
            new_flags.append(f)
    return new_flags, remaining


def main(argv: list[str]) -> int:
    args = [a for a in argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 2
    pdf = args[0]
    min_blank, dpi = 0.5, 110
    for a in argv:
        if a.startswith("--min-blank="):
            min_blank = float(a.split("=", 1)[1])
        if a.startswith("--dpi="):
            dpi = int(a.split("=", 1)[1])
    if "--check" in argv:
        res = ratchet(pdf, min_blank=min_blank, dpi=dpi)
        if res is None:
            print(f"BLANK-PAGE RATCHET: no baseline at {BASELINE_PATH} — record one first: "
                  f"python3 book/check_blank_pages.py {pdf} --write-baseline", file=sys.stderr)
            return 2
        new_flags, resolved = res
        for fp in resolved:
            print(f"  resolved (no longer flagged; consider re-recording the baseline): {fp!r}")
        if new_flags:
            print(f"BLANK-PAGE RATCHET: FAIL — {len(new_flags)} NEW un-excused mostly-blank page(s) "
                  f"beyond the baseline in {pdf}:")
            for f in new_flags:
                print(f"  p{f['page']} — {f['blank_frac']:.0%} blank; "
                      f"next page starts: {f['next_page_starts']!r}")
            return 1
        print(f"BLANK-PAGE RATCHET: PASS — no new mostly-blank page beyond the baseline "
              f"({len(load_baseline() or [])} standing, {len(resolved)} resolved).")
        return 0
    flags = check(pdf, min_blank=min_blank, dpi=dpi)
    if "--write-baseline" in argv:
        write_baseline(flags, min_blank, dpi)
        print(f"BLANK-PAGE RATCHET: baseline recorded — {len(flags)} fingerprint(s) → {BASELINE_PATH}")
        return 0
    if "--json" in argv:
        print(json.dumps({"flags": flags, "count": len(flags)}, indent=2))
    elif flags:
        print(f"BLANK-PAGE SENSOR: {len(flags)} un-excused mostly-blank page(s) in {pdf}:")
        for f in flags:
            print(f"  p{f['page']} — {f['blank_frac']:.0%} of the text area blank "
                  f"(gap y {f['gap_pts'][0]}-{f['gap_pts'][1]}pt); "
                  f"next page starts: {f['next_page_starts']!r}")
    else:
        print(f"BLANK-PAGE SENSOR: no un-excused mostly-blank pages in {pdf}")
    return 1 if flags else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
