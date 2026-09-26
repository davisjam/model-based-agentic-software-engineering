"""LINT `factory-vocab` — hold the DETERMINISTIC part of Chapter 5's factory vocabulary.

`machinery` had been carrying agents, orchestration, tests, models, policies, permissions, validators,
infrastructure and controls at once. The vocabulary model splits those into a collective noun (engineering
apparatus) and five kinds that participate in it (machinery, tooling, representation, control,
infrastructure), plus a property (engineering capital) and an environment. This lint holds the part of that
decision a machine can settle, and REFUSES to pretend about the rest.

WHAT IS NOT MECHANIZABLE — stated up front, because a lint that overreaches gets ignored.
  * The role tests are NOT checkable. "Does this actively perform, route, coordinate, transform, or
    execute production work?" needs the referent read in context. So the lint never flags a bare
    `machinery`, `tooling`, or `representation` and asks a human to adjudicate — that report would be
    hundreds of lines of noise, and noise gets skipped.
  * "Is this referent DELIBERATELY HETEROGENEOUS?" — the apparatus test — is the same shape of problem a
    sibling project already assessed INFEASIBLE for a lint (deciding whether a test value is "queryable"
    from a registry): the signal is not deterministic, so enforcement there became a stated rule plus a
    review criterion. Same verdict here.
  * Whether `engineering capital` is doing PROPERTY work (the sentence turns on durable future leverage)
    or has decayed into a label is a judgment about emphasis. The lint reports a COUNT in its census so an
    editor can see density; it raises no finding.
  * Whether a manufacturing example PREFIGURES its software counterpart is judgment. The lint checks only
    the mechanical half — is the vehicle word present at all — under its own heading.

WHAT IS MECHANIZABLE, and is checked:
  1. NAMED MISUSE COLLOCATIONS — literal phrases the author identified as misuses (`tolerance machinery`,
     `context machinery`, `engineering machinery`, `richer machinery`, `machinery for process design`,
     `machinery for making it effective`). Each row carries the node the model says applies instead.
  2. THE HETEROGENEOUS-LIST PATTERN — a `machinery` TERMINAL closing an enumeration whose members span
     kinds ("tests, policies, human review, simulators, permission systems, models, or other machinery").
     Deterministic: a closed terminal set plus at least two distinct closed member words in the same
     sentence.
  3. `stock` OUTSIDE ITS NARROW LICENCE — `stock` with no accumulation word nearby. A prior pass drove
     `stock` from 14 to 0 in the DocAble section; the vocabulary model re-admits it ONLY where accumulation
     over time is the measured phenomenon, and this check defends that result without re-opening the
     general use.

AUTHOR-DEFENDED PHRASES ARE NEVER FINDINGS.  `production machinery` is correct where DocAble genuinely has
orchestration, merge, and execution machinery and the contrast is the argument — the author defends it
twice. It carries `confidence: author-defended` in the model, `findings()` excludes that tier by
construction, and the report lists its sites under a DO-NOT-CHANGE heading so a later prose pass does not
"fix" them. A lint that raises a pre-rejected finding has spent its credibility.

SINGLE SOURCE OF TRUTH.  Every phrase, member word, terminal, accumulation word, and replacement node lives
in `factory_vocabulary_declared.json` (via `factory_vocabulary_model.py`). The regexes and the report are
DERIVED from it, so a future vocabulary shift is one new row in the model — this file does not change.

WRAP-TOLERANT MATCHING.  The book's markdown is hard-wrapped; 65% of prose lines in the DocAble section
continue onto the next. `machinery for process design` is written across a line break at one of its two
real sites, so a line-by-line scan would MISS it (the failure `book/findprose.py` exists to prevent). This
lint therefore joins each hard-wrapped block, matches on the joined text, and maps the hit back to the line
where the phrase starts.

SCOPE — the numbered Chapter 5 files (`book/part5/*.md`). Deliberately excluded, each for a reason:
  * Chapter 5.1's HISTORICAL-MANUFACTURING PREAMBLE (everything before that file's first `##` heading) —
    literal physical machinery is the CORRECT word there (Wilkinson's boring machinery, mechanization,
    machine tools). The author: "Leave all of this alone." Scoped STRUCTURALLY (before the first `##`)
    rather than by line number so it survives a reflow.
  * The rest of the book (`part1/`…`part4/`, `part6/`, `part7/`, `conclusion/`) — `machinery` is used there
    in senses this model does not govern; one chapter is even titled "Agentic Machinery and Engineering
    Mechanisms", naming the productive substrate rather than factory apparatus. Widening the scope is a
    separate editorial decision; when it is taken, it is one edit to `_SCAN_GLOBS`.
  * Figure SVGs under `book/assets/` — hand-authored node labels with their own established vocabulary,
    governed by the figure lints; a label change is a figure edit.
  * Appendix fills and front/back matter — out of the scanned globs by construction; they mirror the
    catalogue lexicon rather than the chapter's factory vocabulary.
  * Fenced code blocks — literal transcripts and command text, not authored prose.

ESCAPE.  A genuine exception (a quotation, a deliberate contrast) suppresses with a same-line comment
`<!-- noqa: factory-vocab — <reason> -->`. A reason token after the em-dash or a whitespace-flanked hyphen
is REQUIRED; a bare `noqa: factory-vocab` does not suppress. Suppressing any line a multi-line phrase spans
suppresses the finding.

LANDS AUDIT-ONLY.  It PRINTS findings and exits 0. The prose sections violate it by design right now — that
is the point; the findings ARE the prose worklist. A follow-up promotes it to blocking once the worklist is
drained (the repo's audit-only-first landing discipline, the path `lint_term_tags_registered` is also on).
The FORESHADOWING-COVERAGE block is reported separately and is NOT part of the promotable finding set: it
records which manufacturing vehicles the chapter has not yet placed, and whether a given pair is worth
landing stays an editorial call.

    python3 book-models/lint_factory_vocabulary.py             # print findings + census (exit 0)
    python3 book-models/lint_factory_vocabulary.py --list      # print the derived phrase/pattern tables
    python3 book-models/lint_factory_vocabulary.py --worklist   # emit the Phase-2 worklist markdown
"""
from __future__ import annotations

import argparse
import bisect
import os
import pathlib
import re
import sys

_HERE = pathlib.Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))
import factory_vocabulary_model as fvm  # noqa: E402 — the vocabulary SSOT this lint derives every check from

BOOK = _HERE.parent / "book"

#: The scanned scope — the numbered Chapter 5 files. One edit widens it (see the module docstring).
_SCAN_GLOBS = ("part5/*.md",)

#: Files whose HISTORICAL-MANUFACTURING PREAMBLE (everything before the first `## ` heading) is excluded:
#: literal machinery is correct there. Structural, so a reflow cannot shift the boundary.
_PREAMBLE_EXCLUDED = ("5.1-software-factory.md",)

#: How far from a `stock` occurrence an accumulation word may sit and still license it — roughly a
#: sentence of joined text on either side. Matching mechanics, not vocabulary: the accumulation WORDS are
#: declared in the model.
_LICENCE_WINDOW = 140

#: Sentence boundaries used to bound an enumeration when counting heterogeneous-list members.
_SENTENCE_BREAK = re.compile(r"[.;:|]")

_NOQA_RE = re.compile(r"noqa:\s*factory-vocab\s*(?:—|\s-\s)\s*\S")

_SINGLE_COMMENT_RE = re.compile(r"^\s*<!--.*-->\s*$")


# ---- the wrap-tolerant block scanner ----------------------------------------------------------------

class Block:
    """One hard-wrapped block of a markdown file, flattened to a single line of text with a map back to
    real line numbers. `text` joins the block's lines with single spaces; `line_at(offset)` returns the
    source line the character at that offset came from."""

    def __init__(self, lines: "list[tuple[int, str]]") -> None:
        self.lines = lines
        parts: "list[str]" = []
        self._starts: "list[int]" = []
        self._linenos: "list[int]" = []
        pos = 0
        for lineno, text in lines:
            self._starts.append(pos)
            self._linenos.append(lineno)
            parts.append(text)
            pos += len(text) + 1
        self.text = " ".join(parts)

    def line_at(self, offset: int) -> int:
        i = bisect.bisect_right(self._starts, offset) - 1
        return self._linenos[max(i, 0)]

    def lines_spanned(self, start: int, end: int) -> "list[int]":
        return sorted({self.line_at(start), self.line_at(max(end - 1, start))})

    def suppressed(self, start: int, end: int) -> bool:
        """True when any source line the match spans carries a reasoned `factory-vocab` noqa."""
        spanned = set(self.lines_spanned(start, end))
        return any(_NOQA_RE.search(text) for lineno, text in self.lines if lineno in spanned)


def _iter_blocks(path: pathlib.Path, skip_preamble: bool) -> "list[Block]":
    """Split a markdown file into hard-wrapped blocks. A blank line ends a block; a line that is a complete
    single-line HTML comment (a `point` claim, a `figure` caption) is its OWN block, so no phrase can
    falsely straddle a marker boundary; fenced code is dropped."""
    raw = path.read_text(encoding="utf-8").splitlines()
    first_heading = next((i for i, ln in enumerate(raw, 1) if ln.startswith("## ")), None)
    floor = first_heading if (skip_preamble and first_heading) else 0

    blocks: "list[Block]" = []
    cur: "list[tuple[int, str]]" = []
    in_fence = False

    def flush() -> None:
        if cur:
            blocks.append(Block(list(cur)))
            cur.clear()

    for i, line in enumerate(raw, 1):
        stripped = line.strip()
        if stripped.startswith("```"):
            flush()
            in_fence = not in_fence
            continue
        if in_fence or i <= floor:
            continue
        if not stripped:
            flush()
            continue
        if _SINGLE_COMMENT_RE.match(line):
            flush()
            blocks.append(Block([(i, stripped)]))
            continue
        cur.append((i, stripped))
    flush()
    return blocks


def _chapter_files() -> "list[pathlib.Path]":
    return sorted(p for g in _SCAN_GLOBS for p in BOOK.glob(g))


def _rel(path: pathlib.Path) -> str:
    return os.path.relpath(path, BOOK.parent)


# ---- derived matchers (every pattern comes from the model) -------------------------------------------

def _phrase_re(phrase: str, plural: bool = True) -> "re.Pattern[str]":
    """A phrase matched with `\\s+` between words, so a hard wrap inside it still matches once the block is
    joined. Case-insensitive and word-bounded. `plural` adds an optional trailing `s` to the final word —
    wanted for a singular target (`stock` -> `stocks`), wrong for a word declared plural already
    (`models`), so the member-word matcher passes False."""
    body = r"\s+".join(re.escape(w) for w in phrase.split())
    tail = "s?" if plural else ""
    return re.compile(rf"\b{body}{tail}\b", re.IGNORECASE)


def _named_matchers(model: "fvm.FactoryVocabularyModel") -> "list[tuple[fvm.Misuse, re.Pattern[str]]]":
    return [(m, _phrase_re(m.phrase)) for m in model.findings_collocations()]


def _defended_matchers(model: "fvm.FactoryVocabularyModel") -> "list[tuple[fvm.Misuse, re.Pattern[str]]]":
    return [(m, _phrase_re(m.phrase)) for m in model.defended_collocations()]


# ---- the checks --------------------------------------------------------------------------------------

def _collocation_findings(model: "fvm.FactoryVocabularyModel") -> "list[str]":
    """CHECK 1 — the named misuse collocations. A literal phrase the author identified, plus the node the
    model says applies instead. Author-defended phrases are excluded by `findings_collocations()`."""
    out: "list[str]" = []
    matchers = _named_matchers(model)
    for path in _chapter_files():
        skip = path.name in _PREAMBLE_EXCLUDED
        for block in _iter_blocks(path, skip_preamble=skip):
            for misuse, pat in matchers:
                for hit in pat.finditer(block.text):
                    if block.suppressed(hit.start(), hit.end()):
                        continue
                    node = model.node(misuse.reassign_to)
                    label = node.label if node else misuse.reassign_to
                    out.append(f"{_rel(path)}:{block.line_at(hit.start())}: MISUSE "
                               f"{hit.group(0).strip()!r} — the model says `{misuse.reassign_to}` "
                               f"({label}) applies here")
    return out


def _list_findings(model: "fvm.FactoryVocabularyModel") -> "list[str]":
    """CHECK 2 — the heterogeneous-list pattern: a `machinery` terminal closing an enumeration whose
    members span kinds. Bounded to the sentence containing the terminal; requires at least
    `min_distinct_members` distinct closed member words in that span."""
    spec = model.heterogeneous_list
    terminals = [(t, _phrase_re(t)) for t in spec.get("terminal_patterns", [])]
    members = [(w, _phrase_re(w, plural=False)) for w in spec.get("member_words", [])]
    need = int(spec.get("min_distinct_members", 2))
    target = spec.get("reassign_to", "")
    out: "list[str]" = []
    for path in _chapter_files():
        skip = path.name in _PREAMBLE_EXCLUDED
        for block in _iter_blocks(path, skip_preamble=skip):
            for _terminal, pat in terminals:
                for hit in pat.finditer(block.text):
                    breaks = [m.end() for m in _SENTENCE_BREAK.finditer(block.text, 0, hit.start())]
                    span = block.text[(breaks[-1] if breaks else 0):hit.start()]
                    found = sorted({w for w, mp in members if mp.search(span)})
                    if len(found) < need:
                        continue
                    if block.suppressed(hit.start(), hit.end()):
                        continue
                    out.append(f"{_rel(path)}:{block.line_at(hit.start())}: HETEROGENEOUS LIST "
                               f"{hit.group(0).strip()!r} closes an enumeration spanning "
                               f"{len(found)} kinds ({', '.join(found)}) — a list that spans kinds wants "
                               f"the collective noun `{target}`, not one kind as a catch-all")
    return out


def _licence_findings(model: "fvm.FactoryVocabularyModel") -> "list[str]":
    """CHECK 3 — a narrow-licence word used outside its licence. Today that is `stock`: admitted only where
    an accumulation word sits nearby, so the general conceptual use stays closed."""
    out: "list[str]" = []
    licensed = [u for u in model.usage_licences if u.accumulation_words]
    if not licensed:
        return out
    for path in _chapter_files():
        skip = path.name in _PREAMBLE_EXCLUDED
        for block in _iter_blocks(path, skip_preamble=skip):
            low = block.text.lower()
            for u in licensed:
                for hit in _phrase_re(u.phrase).finditer(block.text):
                    lo = max(hit.start() - _LICENCE_WINDOW, 0)
                    window = low[lo:hit.end() + _LICENCE_WINDOW]
                    if any(w.lower() in window for w in u.accumulation_words):
                        continue
                    if block.suppressed(hit.start(), hit.end()):
                        continue
                    out.append(f"{_rel(path)}:{block.line_at(hit.start())}: OUTSIDE LICENCE "
                               f"{hit.group(0).strip()!r} — no accumulation word nearby. {u.negative_rule}")
    return out


def findings(model: "fvm.FactoryVocabularyModel | None" = None) -> "list[str]":
    """The PROMOTABLE finding set — the three deterministic checks. This is the list a follow-up flips to
    blocking once the prose pass drains it; the foreshadowing-coverage block below is deliberately NOT part
    of it (whether a pair is worth landing is editorial)."""
    if model is None:
        model = fvm.derive_model()
    return _collocation_findings(model) + _list_findings(model) + _licence_findings(model)


def defended_sites(model: "fvm.FactoryVocabularyModel | None" = None) -> "list[str]":
    """Every site of an AUTHOR-DEFENDED phrase — reported so a prose pass does not "fix" a phrase the
    author argued for. Never a finding."""
    if model is None:
        model = fvm.derive_model()
    out: "list[str]" = []
    for path in _chapter_files():
        skip = path.name in _PREAMBLE_EXCLUDED
        for block in _iter_blocks(path, skip_preamble=skip):
            for misuse, pat in _defended_matchers(model):
                for hit in pat.finditer(block.text):
                    out.append(f"{_rel(path)}:{block.line_at(hit.start())}: "
                               f"{hit.group(0).strip()!r} — DEFENDED, leave alone")
    return out


def foreshadow_findings(model: "fvm.FactoryVocabularyModel | None" = None) -> "list[str]":
    """The MECHANICAL half of the foreshadowing map: is each vehicle word present at all? The model records
    that the software-factory section's manufacturing examples should PREFIGURE the software terms the case
    sections use. Whether a present word actually prefigures is judgment; whether it is present is not.

    Reported separately from `findings()`: an absent vehicle is a prose OPPORTUNITY, not a defect, so it
    must not gate a later promotion to blocking."""
    if model is None:
        model = fvm.derive_model()
    scope = model.foreshadowing_scope

    def present(probes: "list[str]", names: "list[str]") -> bool:
        for name in names:
            path = BOOK / "part5" / name
            if not path.is_file():
                continue
            joined = " ".join(b.text for b in _iter_blocks(path, skip_preamble=False)).lower()
            if any(p.lower() in joined for p in probes):
                return True
        return False

    out: "list[str]" = []
    for f in model.foreshadowing:
        if not present(f.manufacturing_probes, scope.get("manufacturing", [])):
            out.append(f"VEHICLE ABSENT — no {' / '.join(repr(p) for p in f.manufacturing_probes)} in "
                       f"{', '.join(scope.get('manufacturing', []))}, so the manufacturing example that "
                       f"should prefigure {f.software!r} (kind `{f.kind}`) is not placed")
        if not present(f.software_probes, scope.get("software", [])):
            out.append(f"COUNTERPART ABSENT — no {' / '.join(repr(p) for p in f.software_probes)} in the "
                       f"software sections, so the pair {f.manufacturing!r} → {f.software!r} has no "
                       f"landing site to prefigure")
    return out


def _heading_span(path: pathlib.Path, heading: str) -> "tuple[int, int]":
    """The 1-based inclusive line span of a named section, derived STRUCTURALLY from the file so a reflow
    cannot shift it. `heading` empty -> the whole file; `*opening*` -> everything before the first `## `;
    otherwise the `##`/`###` whose text matches, running to the next heading at the same or higher level."""
    raw = path.read_text(encoding="utf-8").splitlines()
    if not heading:
        return 1, len(raw)
    first = next((i for i, ln in enumerate(raw, 1) if ln.startswith("## ")), len(raw) + 1)
    if heading == "*opening*":
        return 1, first - 1
    for i, ln in enumerate(raw, 1):
        m = re.match(r"^(#{2,4})\s+(.*?)(?:\s*\{#[^}]*\})?\s*$", ln)
        if not m or m.group(2).strip() != heading:
            continue
        level = len(m.group(1))
        for j in range(i + 1, len(raw) + 1):
            nxt = re.match(r"^(#{1,4})\s", raw[j - 1])
            if nxt and len(nxt.group(1)) <= level:
                return i, j - 1
        return i, len(raw)
    return 0, -1  # heading not found — reported as a gap-report finding


def gap_report(model: "fvm.FactoryVocabularyModel | None" = None) -> "tuple[list[str], list[str]]":
    """The TWO-WAY GAP between the author's site-by-site pass and what this lint can mechanically find.
    Both directions are reported; neither is dropped.

    Returned as `(author_named_without_findings, findings_outside_named_sections)`:
      * A named section with ZERO findings is either a lint gap or a site needing the role test the lint
        cannot supply. The row carries the section's raw `machinery` occurrence count, so the reader can
        tell "nothing to fix here" (count 0) from "everything here needs judgment" (count > 0).
      * A finding in a section the author did NOT name is a candidate he may not have seen.
    """
    if model is None:
        model = fvm.derive_model()
    fs = findings(model)
    hit = re.compile(r"^book/part5/([^:]+):(\d+):")
    placed = [(m.group(1), int(m.group(2))) for m in (hit.match(f) for f in fs) if m]

    named_rows: "list[str]" = []
    covered: "set[tuple[str, int]]" = set()
    word = re.compile(r"machinery", re.IGNORECASE)
    for s in model.author_named_sections:
        path = BOOK / "part5" / s.file
        lo, hi = _heading_span(path, s.heading)
        if hi < lo:
            named_rows.append(f"{s.id} ({s.file}) — heading {s.heading!r} NOT FOUND; the section was "
                              f"renamed, so this row of the model needs updating")
            continue
        n_find = [(f, ln) for f, ln in placed if f == s.file and lo <= ln <= hi]
        covered.update(n_find)
        raw = path.read_text(encoding="utf-8").splitlines()
        occ = sum(1 for i, ln in enumerate(raw, 1) if lo <= i <= hi and word.search(ln))
        if not n_find:
            named_rows.append(f"{s.id} ({s.file}:{lo}-{hi}) — 0 lint findings, {occ} raw `machinery` "
                              f"occurrence(s). " + ("Nothing for the lint OR a human to do."
                                                    if occ == 0 else
                                                    "Every one needs the role test, which the lint cannot "
                                                    "apply — this is judgment work, not a lint gap."))
    outside = [f for f, (fl, ln) in zip(fs, placed) if (fl, ln) not in covered] if len(placed) == len(fs) \
        else [f for f in fs]
    return named_rows, outside


#: The rest of the narrative body, scanned ONLY for the out-of-scope report below — never for findings.
_OUT_OF_SCOPE_GLOBS = ("part1/*.md", "part2/*.md", "part3/*.md", "part4/*.md", "part6/*.md",
                       "part7/*.md", "conclusion/*.md")


def out_of_scope_candidates(model: "fvm.FactoryVocabularyModel | None" = None) -> "list[str]":
    """Named misuse collocations OUTSIDE the scanned chapter. Reported, never a finding: the vocabulary
    decision is Chapter 5's, and `machinery` elsewhere is used in senses this model does not govern. These
    are candidates a reader of the Chapter-5 decision may not have looked for — the other half of the
    two-way gap, on the SCOPE axis rather than the site axis. Widening `_SCAN_GLOBS` is a separate call."""
    if model is None:
        model = fvm.derive_model()
    matchers = _named_matchers(model)
    out: "list[str]" = []
    for path in sorted(p for g in _OUT_OF_SCOPE_GLOBS for p in BOOK.glob(g)):
        for block in _iter_blocks(path, skip_preamble=False):
            for misuse, pat in matchers:
                for h in pat.finditer(block.text):
                    out.append(f"{_rel(path)}:{block.line_at(h.start())}: {h.group(0).strip()!r} "
                               f"(out of scope; the model would say `{misuse.reassign_to}`)")
    return out


def census(model: "fvm.FactoryVocabularyModel | None" = None) -> "list[str]":
    """A per-file COUNT of the vocabulary words, printed as context rather than findings. This is where the
    `engineering capital` density the author warns about ("do not repeatedly call everything engineering
    capital") becomes visible without the lint pretending to adjudicate any single use."""
    if model is None:
        model = fvm.derive_model()
    watched = ["machinery", "apparatus", "tooling", "representation", "control",
               "infrastructure", "engineering capital", "stock"]
    pats = {w: _phrase_re(w) for w in watched}
    rows: "list[str]" = []
    for path in _chapter_files():
        joined = " ".join(b.text for b in _iter_blocks(path, skip_preamble=False))
        counts = {w: len(pats[w].findall(joined)) for w in watched}
        rows.append(f"{_rel(path)}: " + "  ".join(f"{w}={counts[w]}" for w in watched))
    return rows


# ---- the Phase-2 worklist projection ----------------------------------------------------------------

def render_worklist(model: "fvm.FactoryVocabularyModel | None" = None) -> str:
    """Project the findings into the prose worklist a later pass consumes: the model's structure, the per
    term role tests and negative rules, every finding with its replacement node, the author-defended sites
    to leave alone, the foreshadowing gaps, and the census. Regenerating this file re-derives it from the
    model, so it cannot drift from the lint."""
    if model is None:
        model = fvm.derive_model()
    fs = findings(model)
    dfd = defended_sites(model)
    fore = foreshadow_findings(model)
    lines = [
        "<!-- GENERATED by book-models/lint_factory_vocabulary.py --worklist — do not hand-edit; "
        "regenerate with `python3 book-models/lint_factory_vocabulary.py --worklist`. The model it derives "
        "from is book-models/factory_vocabulary_declared.json. -->",
        "",
        "# Factory-vocabulary prose worklist",
        "",
        "The deterministic findings of `factory-vocab` over `book/part5/`, plus the parts of the "
        "vocabulary decision the lint cannot check. The lint is AUDIT-ONLY: these findings are the "
        "worklist, not a red gate.",
        "",
        "## The model, in one screen",
        "",
        "```",
        fvm.render_tree(model),
        "```",
        "",
        "`engineering apparatus` is the COLLECTIVE NOUN, not a fourth category beside machinery / tooling "
        "/ representation. `engineering capital` is a PROPERTY of accumulated apparatus, not a fifth "
        "category. The five kinds OVERLAP by design — `control` names what a decision DOES, so the same "
        "validator is tooling by what it is and a control by what its verdict decides.",
        "",
        "## Role tests and negative rules",
        "",
        "| term | role test | negative rule |",
        "|---|---|---|",
    ]
    for n in model.nodes:
        lines.append(f"| `{n.id}` | {n.role_test} | {n.negative_rule} |")
    for u in model.usage_licences:
        lines.append(f"| `{u.id}` ({u.disposition}) | {u.licence} | {u.negative_rule} |")
    lines += [
        "",
        f"## Findings ({len(fs)})",
        "",
        "Each line is `file:line`, the matched phrase, and the node the model says applies instead. The "
        "phrase is matched on WRAP-JOINED text, so a `file:line` is where the phrase STARTS — it may "
        "continue onto the next line.",
        "",
        "**A stated gap in this worklist.** The author's own site-by-site replacement WORDING is not "
        "reproduced below, because his vocabulary document is not in the repository — only the phrase list "
        "and the negative rules reached this model. The replacement guidance in the next table is the "
        "MODEL'S reading of each phrase, not the author's sentences. Where his document is available, "
        "prefer his wording: it is more specific than any rule can infer. Do not read a silence here as "
        "his approval.",
        "",
    ]
    lines += [f"- {f}" for f in fs] or ["- (none)"]
    lines += [
        "",
        "### Per-finding replacement guidance",
        "",
        "| phrase | applies instead | note |",
        "|---|---|---|",
    ]
    for m in model.findings_collocations():
        lines.append(f"| `{m.phrase}` | `{m.reassign_to}` | {m.note} |")
    hl = model.heterogeneous_list
    lines.append(f"| *(the heterogeneous-list terminal)* | `{hl.get('reassign_to', '')}` | "
                 f"{hl.get('note', '')} |")
    lines += [
        "",
        f"## DO NOT CHANGE — author-defended sites ({len(dfd)})",
        "",
    ]
    for m in model.defended_collocations():
        lines.append(f"**`{m.phrase}`** — {m.note}")
        lines.append("")
    lines += [f"- {d}" for d in dfd] or ["- (none)"]
    lines += [
        "",
        f"## Foreshadowing coverage ({len(fore)} gap(s)) — NOT part of the promotable finding set",
        "",
        "The software-factory section's manufacturing examples should PREFIGURE the software terms the "
        "case sections use, so the conceptual transfer is already prepared when the software term "
        "arrives. The lint checks only whether the vehicle word is PRESENT; whether it prefigures is "
        "editorial.",
        "",
        fvm.render_foreshadow_md(model),
        "",
    ]
    lines += [f"- {f}" for f in fore] or ["- (none)"]
    named_gap, outside = gap_report(model)
    oos = out_of_scope_candidates(model)
    lines += [
        "",
        "## The two-way gap against the author's site list",
        "",
        "The author's site-by-site pass covers "
        f"{len(model.author_named_sections)} sections; this lint produces findings in "
        f"{len(model.author_named_sections) - len(named_gap)} of them. Both directions of the gap are "
        "reported, because both are useful. Section ordinals are INFERRED from heading order and from the "
        "DocAble section's own \"seven movements\" sentence — the source files carry no §5.2.N numbering.",
        "",
        f"### Author named it; the lint finds nothing ({len(named_gap)})",
        "",
        "A zero here is not a clean bill. Where the raw `machinery` count is above zero, every one of "
        "those uses needs the role test applied by a reader — that is judgment work the lint declines to "
        "fake, not a lint gap to close.",
        "",
    ]
    lines += [f"- {g}" for g in named_gap] or ["- (none)"]
    lines += [
        "",
        f"### The lint found it; the author's list does not cover the site ({len(outside)})",
        "",
    ]
    lines += [f"- {o}" for o in outside] or [
        "- (none) — every finding falls inside a section the author already named. The lint's precision "
        "against his list is total; its RECALL is the four sections above.",
    ]
    lines += [
        "",
        f"### Outside the scanned chapter ({len(oos)}) — the scope axis of the same gap",
        "",
        "The same named phrases elsewhere in the book. NOT findings: the vocabulary decision is Chapter "
        "5's, and one chapter is titled \"Agentic Machinery and Engineering Mechanisms\", naming the "
        "productive substrate rather than factory apparatus. Listed so a decision to widen the scope is "
        "made deliberately and with the cost visible.",
        "",
    ]
    lines += [f"- {o}" for o in oos] or ["- (none)"]
    lines += [
        "",
        "## Census — context, not findings",
        "",
        "Per-file counts of the watched words. The `engineering capital` column is the density the model "
        "warns about; the lint raises no finding on it because deciding whether a given sentence turns on "
        "durable future leverage is judgment.",
        "",
        "```",
    ]
    lines += census(model)
    lines += [
        "```",
        "",
        "## What this lint will never catch",
        "",
        "- **The role tests.** Whether a referent performs / routes / executes (machinery) versus "
        "instruments (tooling) versus represents (representation) needs the referent read in context.",
        "- **The apparatus test.** \"Is this referent deliberately heterogeneous?\" is not deterministic — "
        "the same shape of signal a sibling project assessed infeasible to lint and replaced with a rule "
        "plus a review criterion.",
        "- **`engineering capital` overuse.** A density judgment; the census shows the counts, a human "
        "decides which uses turn on durable leverage.",
        "- **`control` versus `tooling` at a site.** Different axes that overlap by design; choosing which "
        "the sentence is about is the author's call.",
        "- **Whether a vehicle prefigures.** Presence is mechanical; prefiguration is not.",
        "",
    ]
    return "\n".join(lines)


# ---- CLI --------------------------------------------------------------------------------------------

def _print_list(model: "fvm.FactoryVocabularyModel") -> int:
    print("== factory-vocab — the derived tables (single source of truth: "
          "factory_vocabulary_declared.json) ==")
    print("  NAMED MISUSE COLLOCATIONS -> replacement node:")
    for m in model.findings_collocations():
        print(f"    {m.phrase!r} -> {m.reassign_to!r}")
    print("  AUTHOR-DEFENDED (never a finding):")
    for m in model.defended_collocations():
        print(f"    {m.phrase!r}")
    hl = model.heterogeneous_list
    print(f"  HETEROGENEOUS LIST: terminals {hl.get('terminal_patterns')} + "
          f">={hl.get('min_distinct_members')} of {hl.get('member_words')} -> {hl.get('reassign_to')!r}")
    for u in model.usage_licences:
        print(f"  USAGE LICENCE {u.phrase!r} [{u.disposition}] — accumulation words "
              f"{u.accumulation_words or '(no window test)'}")
    print(f"  SCOPE: {', '.join(_SCAN_GLOBS)}; preamble excluded in {', '.join(_PREAMBLE_EXCLUDED)}")
    return 0


def main(argv: "list[str] | None" = None) -> int:
    ap = argparse.ArgumentParser(description="the factory-vocabulary lint (AUDIT-ONLY; always exits 0)")
    ap.add_argument("--list", action="store_true", help="print the derived phrase/pattern tables and exit")
    ap.add_argument("--worklist", action="store_true", help="emit the prose worklist markdown on stdout")
    args = ap.parse_args(argv)
    model = fvm.derive_model()
    if args.list:
        return _print_list(model)
    if args.worklist:
        print(render_worklist(model))
        return 0

    fs = findings(model)
    print(f"== factory-vocab — Chapter 5 factory vocabulary over {', '.join(_SCAN_GLOBS)} [AUDIT-ONLY "
          f"(prints, exits 0)] ==")
    if not fs:
        print(f"  clean — {len(model.findings_collocations())} named collocation(s), the "
              f"heterogeneous-list pattern, and {len(model.usage_licences)} usage licence(s) watched; "
              f"none appear un-suppressed")
    else:
        print(f"  {len(fs)} finding(s):")
        for f in fs:
            print(f"    {f}")
    dfd = defended_sites(model)
    if dfd:
        print(f"  AUTHOR-DEFENDED, DO NOT CHANGE ({len(dfd)} site(s); not findings):")
        for d in dfd:
            print(f"    {d}")
    fore = foreshadow_findings(model)
    if fore:
        print(f"  FORESHADOWING COVERAGE ({len(fore)}; NOT part of the promotable finding set):")
        for f in fore:
            print(f"    {f}")
    named_gap, outside = gap_report(model)
    if named_gap:
        print(f"  GAP — author named the section, the lint finds nothing ({len(named_gap)}; a non-zero "
              f"`machinery` count there is JUDGMENT work, not a lint gap):")
        for g in named_gap:
            print(f"    {g}")
    if outside:
        print(f"  GAP — the lint found it outside any author-named section ({len(outside)}):")
        for o in outside:
            print(f"    {o}")
    oos = out_of_scope_candidates(model)
    if oos:
        print(f"  OUT OF SCOPE ({len(oos)}; the same phrases elsewhere in the book — NOT findings, listed "
              f"so widening the scope is a deliberate call):")
        for o in oos:
            print(f"    {o}")
    print("  CENSUS (context, not findings — the `engineering capital` density the model warns about):")
    for row in census(model):
        print(f"    {row}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
