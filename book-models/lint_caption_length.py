"""LINT `caption-length` — every figure/table caption is sized to its argumentative TIER, not one flat cap.

A caption's length should match the job the figure does. An anchor figure that introduces or summarizes a
major idea earns a rich caption a reader can learn the idea from; a reference visual earns one identifying
sentence. GUARD (A-tier redundancy): an A-tier anchor earns its length by telling the reader how to read the
figure and what follows from it — NOT by re-teaching the adjacent prose. The standalone-teaching allowance
must not create local sentence-for-sentence redundancy with the paragraph above the figure; length spent
echoing prose the reader just read is padding, not an anchor caption doing its job. The retired uniform cap (<=3 sentences AND <=50 words for every caption) squeezed the book's
central method diagram and its author photo to the same budget. This check replaces that one ceiling with
**per-tier bands**, read from the declared registry `book-models/figure-caption-tiers.json`:

  * **A — Anchor**     4-8 sentences / 60-120 words. Carries a FLOOR: an under-written anchor is a finding.
  * **B — Supporting** 2-4 sentences / 25-70 words.
  * **C — Reference**  1-2 sentences / <=30 words.

Band semantics (symmetric with the retired cap's AND-ceiling):
  * CEILING violated when words > max OR sentences > max  (a caption must be under BOTH maxima).
  * FLOOR violated when words < min AND sentences < min  (a caption must meet at least ONE minimum) —
    so a 4-sentence-but-terse caption still satisfies an A/B floor. C has no meaningful floor.

HARD, no dispensation. Like the retired cap, this lint has **no `noqa` escape** — an off-band caption is a
finding, always, by author instruction. The remedy is to resize the caption to its band, never to suppress.
A caption whose id is absent from the registry is itself a finding (drift defense — a new figure/table must
declare its tier, mirroring brick-fitness's "dense diagram with no verdict").

REVERSE-ORPHAN GUARD (audit-only). The forward join above catches a live directive with no registry row
(UNTIERED). `orphan_rows()` catches the reverse — a registry `tiers` key that matches NO live directive,
the stale row a renamed or typo'd asset leaves behind. Both directions share one caption-id derivation
(`_iter_captions`), so the two checks cannot key an id two different ways. A stale row is drift, not a
broken build, so the orphan finding is surfaced audit-only and never flips the exit code.

Scope — the captions an author writes in a chapter source `.md`:
  * `<!-- figure: <path> | <caption> -->`   — keyed on the asset path (`<path>`).
  * `<!-- table: <caption> [short: <short>] -->` — keyed on `<chapter-file>::<short>` (the `[short: ...]`
    print-index name; the display caption is counted, the `[short: ...]` tail stripped before counting).
Generated appendix/catalogue captions are rendered elsewhere and are out of scope here.

Counting (after stripping markdown emphasis and reducing `[text](url)` links to their text):
  * **words** — whitespace-separated tokens.
  * **sentences** — runs terminated by `.`/`!`/`?` followed by whitespace or end-of-string, so a decimal
    inside a number (`7.89%`) or a mid-token dot does not split. A bold lead-in title (`*The Net.*`) counts
    as one sentence, which is the intent.

    python3 book-models/lint_caption_length.py            # print findings, exit 1 if any

LANDING: BLOCKING (rule #55 audit->drain->promote). This landed AUDIT-ONLY while the tree carried every
caption at the retired <=3/<=50 cap; the Phase-3 caption-rewrite wave drained the off-band findings to zero
(A-tier anchors rewritten up into their 60-120-word floor, terse data captions expanded, over-ceiling
captions trimmed), and a follow-up flipped it blocking in `catalog.py validate`. The forward band check
gates; the reverse-orphan guard remains audit-only (a stale row is drift, not a broken build). See
book/_design/drafts/caption-tier-model-260806.md.
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
from collections.abc import Iterator
from dataclasses import dataclass

HERE = pathlib.Path(__file__).resolve().parent
BOOK = HERE.parent / "book"
REGISTRY = HERE / "figure-caption-tiers.json"
_IDENTITY = HERE / "chapter_identity_declared.json"

_FILE_TO_LABEL: "dict[str, str] | None" = None


def _label_for_src(rel_to_book: str) -> str:
    """Map a chapter file path (relative to book/, e.g. 'part6/6.1-toward-a-theory-of-mage.md') to its
    number-free identity label. Table caption ids are keyed on the label now (chapter_identity model) so a
    chapter that moves keeps its caption rows valid. Read from the declared identity table directly (stdlib
    only, invocation-path-independent); falls back to the path for a file with no row (should not happen)."""
    global _FILE_TO_LABEL
    if _FILE_TO_LABEL is None:
        decl = json.loads(_IDENTITY.read_text(encoding="utf-8"))
        _FILE_TO_LABEL = {c["filename"]: c["label"] for c in decl.get("chapters", [])}
    return _FILE_TO_LABEL.get(rel_to_book, rel_to_book)

# Chapter source dirs — front/back matter + the five parts. Appendix fills / README / manifests are not
# authored-caption chapters, matching the book suite's own chapter-source scope.
CHAPTER_DIRS = ("frontmatter", "part1", "part2", "part3", "part4", "part5", "part6", "part7",
                # The Field Guide appendix is the one appendix whose figures carry declared caption-tier rows
                # (tier C team-card art), so its card `.md` sources are scanned to band-check those captions and
                # to keep the rows live (not orphan). The other hand-authored appendices ship no tier rows.
                "appendix-field-guide")

#: Per-tier band as (min_sentences, max_sentences, min_words, max_words). §2.1 of the caption-tier design.
#: Floor uses the minima (satisfied by meeting EITHER dimension); ceiling uses the maxima (must be under
#: BOTH). C's minima are 1/0 — a non-empty caption always clears them, so C is effectively ceiling-only.
BANDS: dict[str, tuple[int, int, int, int]] = {
    "A": (4, 8, 60, 120),
    "B": (2, 4, 25, 70),
    "C": (1, 2, 0, 30),
}

_FIGURE_RE = re.compile(r"<!--\s*figure:\s*(.*?)\s*-->", re.S)
_TABLE_RE = re.compile(r"<!--\s*table:\s*(.*?)\s*-->", re.S)
_SHORT_VALUE_RE = re.compile(r"\[short:\s*(.*?)\s*\]", re.I | re.S)
_SHORT_STRIP_RE = re.compile(r"\s*\[short:.*?\]\s*$", re.I | re.S)
_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_EMPH_RE = re.compile(r"[*_`]")
_SENTENCE_SPLIT = re.compile(r"[.!?]+(?:\s|$)")


@dataclass(frozen=True)
class Finding:
    file: str
    kind: str          # "figure" | "table"
    ref: str           # the figure asset, or the table short name
    tier: str          # "A" | "B" | "C" | "?" (untiered)
    reason: str        # "OVER" | "UNDER" | "UNTIERED"
    words: int
    sentences: int
    caption: str


def _plain(caption: str) -> str:
    """Strip markdown emphasis and reduce links to their visible text — the countable prose."""
    return _EMPH_RE.sub("", _LINK_RE.sub(r"\1", caption)).strip()


def count_words(caption: str) -> int:
    return len([w for w in re.split(r"\s+", _plain(caption)) if w])


def count_sentences(caption: str) -> int:
    return len([s for s in _SENTENCE_SPLIT.split(_plain(caption)) if s.strip()])


def _load_tiers() -> dict[str, str]:
    """Return the caption-id -> tier map from the declared registry (the stable-lint-reads-the-SSOT
    discipline; the builder and this lint share the one file, no hardcoded list)."""
    data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    return {key: row["tier"] for key, row in data["tiers"].items()}


def _src_files() -> list[pathlib.Path]:
    out: list[pathlib.Path] = []
    for d in CHAPTER_DIRS:
        dp = BOOK / d
        if dp.is_dir():
            out.extend(sorted(dp.glob("*.md")))
    return out


def _band_finding(f: pathlib.Path, kind: str, ref: str, cap_id: str, caption: str,
                  tiers: dict[str, str]) -> Finding | None:
    """One caption vs its tier band. Untiered id -> UNTIERED finding; else OVER (ceiling) / UNDER (floor)."""
    caption = caption.strip()
    if not caption:
        return None
    rel = os.path.relpath(f, BOOK.parent)
    tier = tiers.get(cap_id)
    w, s = count_words(caption), count_sentences(caption)
    if tier is None:
        return Finding(rel, kind, ref, "?", "UNTIERED", w, s, caption)
    min_s, max_s, min_w, max_w = BANDS[tier]
    if w > max_w or s > max_s:
        return Finding(rel, kind, ref, tier, "OVER", w, s, caption)
    if w < min_w and s < min_s:
        return Finding(rel, kind, ref, tier, "UNDER", w, s, caption)
    return None


def _iter_captions() -> "Iterator[tuple[pathlib.Path, str, str, str, str]]":
    """Yield `(src_file, kind, ref, cap_id, caption)` for every figure/table caption directive in the
    chapter sources. This is the ONE place the caption-id keying lives — the band check (`findings`) and
    the reverse-orphan check (`orphan_rows`) both consume it, so an id cannot be derived two ways."""
    for f in _src_files():
        rel_to_book = os.path.relpath(f, BOOK)
        txt = f.read_text(encoding="utf-8")
        for m in _FIGURE_RE.finditer(txt):
            src, _sep, caption = m.group(1).partition("|")
            asset = src.strip()
            yield f, "figure", asset, asset, caption
        for m in _TABLE_RE.finditer(txt):
            body = m.group(1)
            sm = _SHORT_VALUE_RE.search(body)
            short = sm.group(1).strip() if sm else ""
            caption = _SHORT_STRIP_RE.sub("", body)
            cap_id = f"{_label_for_src(rel_to_book)}::{short}" if short else ""
            yield f, "table", short, cap_id, caption


def findings() -> list[Finding]:
    tiers = _load_tiers()
    out: list[Finding] = []
    for f, kind, ref, cap_id, caption in _iter_captions():
        fnd = _band_finding(f, kind, ref, cap_id, caption, tiers)
        if fnd:
            out.append(fnd)
    return out


def orphan_rows() -> list[str]:
    """Every registry `tiers` key that matches NO live caption directive — the reverse of the UNTIERED
    forward join. A renamed or typo'd asset leaves a stale row the forward check never sees; this closes
    the join symmetry. Audit-only: a stale row is drift, not a broken build."""
    live = {cap_id for _f, _kind, _ref, cap_id, _cap in _iter_captions() if cap_id}
    return sorted(key for key in _load_tiers() if key not in live)


def summary_line(fs: list[Finding]) -> str:
    over = sum(1 for f in fs if f.reason == "OVER")
    under = sum(1 for f in fs if f.reason == "UNDER")
    untiered = sum(1 for f in fs if f.reason == "UNTIERED")
    return (f"{len(fs)} caption(s) off their tier band "
            f"({over} over-ceiling, {under} under-floor, {untiered} untiered; "
            f"A 4-8s/60-120w · B 2-4s/25-70w · C 1-2s/<=30w; hard, no dispensation)")


def main(argv: list[str] | None = None) -> int:
    argparse.ArgumentParser(description=__doc__,
                            formatter_class=argparse.RawDescriptionHelpFormatter).parse_args(argv)
    fs = findings()
    orphans = orphan_rows()
    print("== caption-length — every figure/table caption sized to its tier band "
          "(A anchor / B supporting / C reference; HARD, no noqa) ==")
    if orphans:
        print(f"  AUDIT-ONLY: {len(orphans)} orphan registry row(s) — a declared tier whose caption id no "
              f"live directive uses (stale/renamed asset; does not gate):")
        for key in orphans:
            print(f"    [orphan] {key}")
    if not fs:
        print("  clean — every caption sits within its tier band")
        return 0
    print(f"  {summary_line(fs)}:")
    for f in sorted(fs, key=lambda x: (x.tier, x.reason, -x.words)):
        tag = f"{f.kind} {f.ref}".strip()
        print(f"    [{f.tier} {f.reason:8s} {f.words:3d}w {f.sentences}s] {f.file} — {tag}")
        print(f"        {f.caption[:110]}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
