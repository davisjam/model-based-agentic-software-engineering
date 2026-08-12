"""LINT `brick-fitness` — an Appendix-C brick whose Structure diagram won't survive thumbnailing MUST carry a
recorded fitness verdict.

The Appendix-C brick grid (§13.4) shows every mechanism's Structure diagram at thumbnail size, two print
columns wide. A diagram that is legible on its own entry page can go to an unreadable grey smear once shrunk
to a brick. The fix is the visual-fitness pass: each of the 83 diagrams scored PASS (ship it as-is),
SIMPLIFY (redraw reduced), or GLYPH (too dense — show a class glyph instead), recorded in
`book-models/brick-fitness.json`.

This sensor makes §13.4 mechanical. It re-derives each diagram's density from the diagram SOURCE (the
`### Structure` mermaid fence in the appendix fill files) using the same rubric the assessment used, then
flags any entry whose diagram EXCEEDS the PASS bounds — i.e. would score SIMPLIFY or GLYPH — but has NO
verdict recorded in the model. That is the drift the model exists to prevent: a new (or edited) dense
diagram slipping into the grid without anyone deciding whether it must be simplified or replaced.

How it scores (source-only, no render — the assessment's rubric):

  * **GLYPH** — longest node label ≥ 52 ch, OR total label text ≥ 210 ch, OR (≥ 10 nodes AND ≥ 150 ch text),
    OR (≥ 2 subgraphs AND ≥ 7 nodes).
  * **SIMPLIFY** — longest label ≥ 30 ch, OR total text ≥ 135 ch, OR ≥ 8 nodes, OR ≥ 7 edges, OR ≥ 1
    subgraph, OR ≥ 5 edge-labels.
  * **PASS** — everything below those floors.

An `erDiagram` with attribute blocks is treated as SIMPLIFY by the assessment (attribute rows go sub-legible
at thumbnail); this sensor approximates that by scoring any `erDiagram` carrying attribute braces as at least
SIMPLIFY. A diagram with no verdict but scoring PASS is fine — a legible-as-is diagram needs no curation.

SECOND SENSOR — brick-summary length cap (restructure sub-wave 5b). A grid brick that towers over its
row-neighbour with a long summary leaves a jagged row and wasted vertical space, so the renderer caps every
emitted summary at a fixed word count (`_BRICK_SUMMARY_WORD_CAP` in the builder, mirrored here as
`_SUMMARY_WORD_CAP`). This sensor resolves each entry's SOURCE summary — the curated summary in
`book-models/brick-summaries.json` when present, else the entry's `**Intent**` line — and flags any that runs
over the cap. An over-cap source is truncated at build time, so it renders even but loses its tail; the
finding says "author a curated summary for this slug so nothing is cut."

LANDING: audit-only. The diagram sensor reports zero with all 83 verdicts recorded; the summary sensor may
report a handful of long Intents awaiting a curated summary. `--strict` exits 1 on any finding from either
sensor (the blocking flip, once both models are trusted to stay full).

    python3 book-models/lint_brick_fitness.py            # print findings (audit-only, exit 0)
    python3 book-models/lint_brick_fitness.py --strict   # exit 1 on any finding
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from dataclasses import dataclass

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
_FILLS = ROOT / "book" / "appendix-fills"
_SUMMARIES = HERE / "brick-summaries.json"

# The word cap on a rendered brick summary. MUST equal `_BRICK_SUMMARY_WORD_CAP` in book/build_book.py —
# the renderer truncates at that count, this sensor flags any source summary that would be truncated.
_SUMMARY_WORD_CAP = 55
# The role zones whose entry `.md` files carry the `**Intent**` fallback summary.
_ROLE_DIRS = ("agent", "models-bridge", "product")
_INTENT_RE = re.compile(r"\*\*Intent\*\* —\s*(.+?)(?:\n\n|\n\|)", re.S)
_FITNESS = HERE / "brick-fitness.json"

# Node-shape label extractors — the bracketed text inside each mermaid node shape. Ordered longest-delimiter
# first so `{{…}}` / `([…])` / `[(…)]` win over the bare `[…]` / `{…}` / `(…)`.
_LABEL_PATTERNS = [
    re.compile(r"\{\{(.+?)\}\}"),      # hexagon
    re.compile(r"\(\[(.+?)\]\)"),      # stadium
    re.compile(r"\[\((.+?)\)\]"),      # cylinder
    re.compile(r"\(\((.+?)\)\)"),      # circle
    re.compile(r"\[/(.+?)/\]"),        # parallelogram
    re.compile(r"\[(.+?)\]"),          # rect
    re.compile(r"\{(.+?)\}"),          # rhombus
    re.compile(r"\((.+?)\)"),          # round
]
_EDGE_RE = re.compile(r"(-{2,3}>|-{3}|-\.->|={2,3}>|--x|--o|-\.-)")
_EDGE_LABEL_RE = re.compile(r"\|([^|]+)\|")
_SUBGRAPH_RE = re.compile(r"^\s*subgraph\b", re.M)


@dataclass(frozen=True)
class Metrics:
    nodes: int
    longest: int
    total: int
    edges: int
    edge_labels: int
    subgraphs: int
    is_er_attr: bool


def _mermaid_source(fill_text: str) -> str | None:
    m = re.search(r"^###\s+Structure\s*$(.*?)(?=^###\s|\Z)", fill_text, re.M | re.S)
    if not m:
        return None
    fence = re.search(r"```mermaid\s*\n(.*?)\n```", m.group(1), re.S)
    return fence.group(1).strip() if fence else None


def _measure(src: str) -> Metrics:
    """Density metrics for a mermaid Structure diagram, source-only (the assessment rubric's inputs)."""
    # Strip edge-labels before harvesting node labels so a `|caption|` never counts as a node.
    edge_labels = _EDGE_LABEL_RE.findall(src)
    body = _EDGE_LABEL_RE.sub("|", src)
    labels: list[str] = []
    consumed_spans: list[tuple[int, int]] = []
    for pat in _LABEL_PATTERNS:
        for m in pat.finditer(body):
            # Skip a match that sits inside an already-consumed (longer-delimiter) span.
            if any(a <= m.start() and m.end() <= b for a, b in consumed_spans):
                continue
            txt = m.group(1).strip().strip('"').strip()
            if txt:
                labels.append(txt)
                consumed_spans.append((m.start(), m.end()))
    lengths = [len(x) for x in labels]
    is_er = bool(re.search(r"^\s*erDiagram\b", src, re.M)) and "{" in src
    return Metrics(
        nodes=len(labels),
        longest=max(lengths, default=0),
        total=sum(lengths),
        edges=len(_EDGE_RE.findall(body)),
        edge_labels=len([e for e in edge_labels if e.strip()]),
        subgraphs=len(_SUBGRAPH_RE.findall(src)),
        is_er_attr=is_er,
    )


def _verdict(m: Metrics) -> str:
    """The rubric verdict for a diagram — PASS / SIMPLIFY / GLYPH."""
    if (m.longest >= 52 or m.total >= 210
            or (m.nodes >= 10 and m.total >= 150)
            or (m.subgraphs >= 2 and m.nodes >= 7)):
        return "GLYPH"
    if (m.longest >= 30 or m.total >= 135 or m.nodes >= 8 or m.edges >= 7
            or m.subgraphs >= 1 or m.edge_labels >= 5 or m.is_er_attr):
        return "SIMPLIFY"
    return "PASS"


@dataclass(frozen=True)
class Finding:
    slug: str
    zone: str
    scored: str
    metrics: Metrics


def _recorded_verdicts() -> dict[str, dict]:
    if not _FITNESS.is_file():
        return {}
    return json.loads(_FITNESS.read_text(encoding="utf-8")).get("verdicts", {})


def findings() -> list[Finding]:
    recorded = _recorded_verdicts()
    out: list[Finding] = []
    for fill in sorted(_FILLS.glob("*/*.md")):
        slug = fill.stem
        zone = fill.parent.name
        src = _mermaid_source(fill.read_text(encoding="utf-8"))
        if not src:
            continue                       # entry carries no Structure diagram — nothing to thumbnail
        scored = _verdict(_measure(src))
        if scored == "PASS":
            continue                       # legible as-is — a verdict is optional
        if slug not in recorded:
            out.append(Finding(slug, zone, scored, _measure(src)))
    return out


def summary_line(fs: list[Finding]) -> str:
    return (f"{len(fs)} brick(s) whose Structure diagram scores SIMPLIFY/GLYPH but carries no verdict in "
            f"brick-fitness.json")


# ── Second sensor — brick-summary length cap ─────────────────────────────────────────────────────────

@dataclass(frozen=True)
class SummaryFinding:
    slug: str
    source: str          # "curated" | "intent"
    words: int


def _curated_summaries() -> dict[str, str]:
    if not _SUMMARIES.is_file():
        return {}
    return json.loads(_SUMMARIES.read_text(encoding="utf-8")).get("summaries", {})


def _entry_intents() -> dict[str, str]:
    """`{slug: intent}` — the `**Intent**` fallback summary parsed from each role-zone entry `.md`. Whitespace
    is collapsed to match how the renderer emits the summary."""
    out: dict[str, str] = {}
    for role in _ROLE_DIRS:
        for f in sorted((ROOT / role).glob("*/*.md")):
            if f.name == "README.md":
                continue
            m = _INTENT_RE.search(f.read_text(encoding="utf-8"))
            if m:
                out[f.stem] = " ".join(m.group(1).split())
    return out


def summary_findings() -> list[SummaryFinding]:
    """Every entry whose SOURCE summary — curated override if present, else Intent — exceeds the word cap."""
    curated = _curated_summaries()
    intents = _entry_intents()
    out: list[SummaryFinding] = []
    for slug in sorted(set(curated) | set(intents)):
        if slug in curated:
            text, source = curated[slug], "curated"
        else:
            text, source = intents[slug], "intent"
        words = len(text.split())
        if words > _SUMMARY_WORD_CAP:
            out.append(SummaryFinding(slug, source, words))
    return out


def summary_summary_line(fs: list[SummaryFinding]) -> str:
    return (f"{len(fs)} brick(s) whose source summary exceeds the {_SUMMARY_WORD_CAP}-word grid cap "
            f"(truncated at build; author a curated summary to keep the tail)")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--strict", action="store_true", help="exit 1 on any finding (the blocking flip)")
    args = ap.parse_args()
    fs = findings()
    mode = "STRICT" if args.strict else "audit-only"
    print(f"== brick-fitness — dense-diagram-needs-a-verdict sensor over book/appendix-fills/ [{mode}] ==")
    print(f"   {summary_line(fs)}")
    for f in sorted(fs, key=lambda f: (f.zone, f.slug)):
        m = f.metrics
        print(f"    [{f.scored:>8}] {f.zone}/{f.slug} — nodes={m.nodes} longest={m.longest} "
              f"total={m.total} edges={m.edges} edge-labels={m.edge_labels} subgraphs={m.subgraphs}")

    sfs = summary_findings()
    print(f"== brick-summary — {_SUMMARY_WORD_CAP}-word grid cap sensor over curated summaries + Intent "
          f"fallbacks [{mode}] ==")
    print(f"   {summary_summary_line(sfs)}")
    for sf in sfs:
        print(f"    [{sf.source:>8}] {sf.slug} — {sf.words} words (cap {_SUMMARY_WORD_CAP})")

    if (fs or sfs) and args.strict:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
