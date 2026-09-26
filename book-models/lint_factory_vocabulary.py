"""LINT `factory-vocab` — hold the DETERMINISTIC part of Chapter 5's factory vocabulary.

The vocabulary was REDUCED to a four-term core — fabricator, model, tool, control — inside the factory, and
taught by one formulation: `Fabricators build the product from models, using tools, subject to controls.`
Two words LEFT the chapter with that reduction: `engineering apparatus` (which did almost the same work as
`factory`, with fuzzier boundaries) and `engineering capital` (which asks the reader to reinterpret the
factory economically just where the chapter is making it concrete). This lint holds the part of that decision
a machine can settle, and REFUSES to pretend about the rest.

THE POLARITY IS INVERTED FROM THE EARLIER VERSION.  The old denylist pushed prose TOWARD `engineering
apparatus` (`engineering machinery` -> apparatus, `richer machinery` -> apparatus, a heterogeneous-list
terminal -> apparatus). Under the reduced vocabulary that guidance is wrong in both directions: the target
term no longer exists, and `machinery` is ordinary factory prose rather than a policed category, so a
`machinery` collocation is a style call. The deterministic check now runs the other way — it FINDS the
retired terms. The heterogeneous-list check is retired with them: a list that names its members needs no
collective noun at the end of it, so there is nothing left to reassign the terminal to.

WHAT IS NOT MECHANIZABLE — stated up front, because a lint that overreaches gets ignored.
  * The role tests are NOT checkable. "Does the fabricator use this to work on the product?" needs the
    referent read in context. So the lint never flags a bare `model`, `tool`, or `control` and asks a human
    to adjudicate — that report would be hundreds of lines of noise, and noise gets skipped.
  * TOOL versus CONTROL at a site is the subtle judgment the whole vocabulary turns on: the same test is a
    tool when an agent runs it and reasons about the result, and participates in a control when the result
    carries a consequence the agent cannot simply reason away. Deciding which a sentence is about is the
    author's call, not a pattern match.
  * `machinery` and `tooling` are no longer policed at all. They are ordinary prose now, and the lint that
    used to adjudicate them was becoming ontology for ontology's sake.
  * Whether a manufacturing example PREFIGURES its software counterpart is judgment. The lint checks only
    the mechanical half — is the vehicle word present at all — under its own heading.

WHAT IS MECHANIZABLE, and is checked:
  1. RETIRED TERMS INSIDE THEIR BANNED SCOPE — `engineering apparatus` (plus the bare `apparatus` it hides
     behind, minus the `support apparatus` measurement licence) and `engineering capital`, each scoped to
     the globs the model declares. The scope is the load-bearing field: `engineering capital` is banned in
     Chapter 5 ONLY. It is live and DEFINED elsewhere in the book — 52 uses across parts 3, 4, 6, 7 and the
     conclusion — a known and accepted asymmetry the author ruled a later problem. Bare `capital` is NOT
     banned anywhere: ordinary economic prose stays, the defined term goes.
  2. THE FORMULATION IS PRESENT — a POSITIVE check, unusual for a lint and the reason it earns its keep
     here. The four terms only cohere because one sentence ties them together, and a passage edited later
     can silently lose it. Checked wrap-tolerantly against the file the model scopes it to.
  3. `stock` OUTSIDE ITS NARROW LICENCE — `stock` with no accumulation word nearby. A prior pass drove
     `stock` from 14 to 0 in the DocAble section; the vocabulary model re-admits it ONLY where accumulation
     over time is the measured phenomenon, and this check defends that result.

AUTHOR-DEFENDED PHRASES ARE NEVER FINDINGS.  `production machinery` is correct where DocAble genuinely has
orchestration, merge, and execution machinery and the contrast is the argument — the author defends it twice.
It carries `confidence: author-defended` in the model, `findings()` excludes that tier by construction, and
the report lists its sites under a DO-NOT-CHANGE heading so a later prose pass does not "fix" them into a
term. A lint that raises a pre-rejected finding has spent its credibility.

SINGLE SOURCE OF TRUTH.  Every banned phrase, exemption, scope glob, accumulation word, and replacement
instruction lives in `factory_vocabulary_declared.json` (via `factory_vocabulary_model.py`). The regexes and
the report are DERIVED from it, so a future vocabulary shift is one edited row in the model — this file does
not change.

WRAP-TOLERANT MATCHING.  The book's markdown is hard-wrapped; most prose lines in the DocAble section
continue onto the next, and a multi-word phrase is routinely written across a line break (the failure
`book/findprose.py` exists to prevent). This lint therefore joins each hard-wrapped block, matches on the
joined text, and maps the hit back to the line where the phrase starts.

SCOPE — the numbered Chapter 5 files (`book/part5/*.md`). Deliberately excluded, each for a reason:
  * The software-factory section's HISTORICAL-MANUFACTURING PREAMBLE (everything before that file's first
    `##` heading) — literal physical machinery is the CORRECT word there (Wilkinson's boring machinery,
    mechanization, machine tools). The author: "Leave all of this alone." Scoped STRUCTURALLY (before the
    first `##`) rather than by line number so it survives a reflow.
  * The rest of the book — the retired terms' `banned_in` globs decide, and today they name Chapter 5 only.
    Widening them is a separate editorial decision, taken in the model rather than in code.
  * Figure SVGs under `book/assets/` — hand-authored node labels with their own established vocabulary,
    governed by the figure lints; a label change is a figure edit.
  * Fenced code blocks — literal transcripts and command text, not authored prose.

ESCAPE.  A genuine exception (a quotation, a deliberate contrast) suppresses with a same-line comment
`<!-- noqa: factory-vocab — <reason> -->`. A reason token after the em-dash or a whitespace-flanked hyphen
is REQUIRED; a bare `noqa: factory-vocab` does not suppress. Suppressing any line a multi-line phrase spans
suppresses the finding.

LANDS AUDIT-ONLY.  It PRINTS findings and exits 0, per the repo's audit-only-first landing discipline: an
inverted check lands non-gating, a drain pass takes it to zero, and a follow-up promotes it to blocking. The
FORESHADOWING-COVERAGE block is reported separately and is NOT part of the promotable finding set: it records
which manufacturing vehicles the chapter has not yet placed, and whether a given pair is worth landing stays
an editorial call.

    python3 book-models/lint_factory_vocabulary.py             # print findings + census (exit 0)
    python3 book-models/lint_factory_vocabulary.py --list      # print the derived phrase/pattern tables
    python3 book-models/lint_factory_vocabulary.py --worklist   # emit the prose worklist markdown
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

#: The scanned scope — the numbered Chapter 5 files. The retired terms' `banned_in` globs narrow it further.
_SCAN_GLOBS = ("part5/*.md",)

#: Files whose HISTORICAL-MANUFACTURING PREAMBLE (everything before the first `## ` heading) is excluded:
#: literal machinery is correct there. Structural, so a reflow cannot shift the boundary.
_PREAMBLE_EXCLUDED = ("5.1-software-factory.md",)

#: How far from a `stock` occurrence an accumulation word may sit and still license it — roughly a
#: sentence of joined text on either side. Matching mechanics, not vocabulary: the accumulation WORDS are
#: declared in the model.
_LICENCE_WINDOW = 140

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
    wanted for a singular target (`stock` -> `stocks`), wrong for a word declared plural already."""
    body = r"\s+".join(re.escape(w) for w in phrase.split())
    tail = "s?" if plural else ""
    return re.compile(rf"\b{body}{tail}\b", re.IGNORECASE)


def _defended_matchers(model: "fvm.FactoryVocabularyModel") -> "list[tuple[fvm.Misuse, re.Pattern[str]]]":
    return [(m, _phrase_re(m.phrase)) for m in model.defended_collocations()]


def _banned_scope(term: "fvm.RetiredTerm") -> "list[pathlib.Path]":
    """The files a retired term's ban covers — its own `banned_in` globs, intersected with the scanned
    chapter so a widened glob still cannot reach an unscanned tree by accident."""
    scanned = set(_chapter_files())
    return sorted({p for g in term.banned_in for p in BOOK.glob(g)} & scanned)


# ---- the checks --------------------------------------------------------------------------------------

def _retired_findings(model: "fvm.FactoryVocabularyModel") -> "list[str]":
    """CHECK 1 — a RETIRED term inside its banned scope. The inverted check: the model declares the words
    that left the chapter, and this finds them. A hit falling inside one of the term's
    `exempt_collocations` (the `support apparatus` measurement label) is not a finding."""
    out: "list[str]" = []
    for term in model.retired_terms:
        probes = [_phrase_re(term.phrase)] + [_phrase_re(w) for w in term.banned_words]
        exempts = [_phrase_re(e) for e in term.exempt_collocations]
        for path in _banned_scope(term):
            skip = path.name in _PREAMBLE_EXCLUDED
            for block in _iter_blocks(path, skip_preamble=skip):
                covered = [(m.start(), m.end()) for e in exempts for m in e.finditer(block.text)]
                seen: "set[tuple[int, int]]" = set()
                for pat in probes:
                    for hit in pat.finditer(block.text):
                        span = (hit.start(), hit.end())
                        if span in seen:
                            continue
                        seen.add(span)
                        if any(lo <= hit.start() and hit.end() <= hi for lo, hi in covered):
                            continue
                        if block.suppressed(hit.start(), hit.end()):
                            continue
                        out.append(f"{_rel(path)}:{block.line_at(hit.start())}: RETIRED TERM "
                                   f"{hit.group(0).strip()!r} — `{term.phrase}` left this chapter. "
                                   f"{term.say_instead}")
    return out


def _formulation_findings(model: "fvm.FactoryVocabularyModel") -> "list[str]":
    """CHECK 2 — the FORMULATION is present. A positive check: the four terms cohere only because one
    sentence ties them together, and a later edit to the passage can silently drop it. Matched
    wrap-tolerantly (the sentence is written across a line break) against every file in
    `formulation_scope`."""
    out: "list[str]" = []
    if not model.formulation.strip():
        return out
    pat = _phrase_re(model.formulation.rstrip("."), plural=False)
    for name in model.formulation_scope:
        path = BOOK / "part5" / name
        if not path.is_file():
            out.append(f"book/part5/{name}: FORMULATION SCOPE names a file that does not exist")
            continue
        joined = " ".join(b.text for b in _iter_blocks(path, skip_preamble=False))
        if not pat.search(joined):
            out.append(f"{_rel(path)}: FORMULATION ABSENT — the sentence that teaches the four-term core "
                       f"is not in this file: {model.formulation!r}")
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
    return _retired_findings(model) + _formulation_findings(model) + _licence_findings(model)


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
                       f"should prefigure {f.software!r} (term `{f.kind}`) is not placed")
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


def _residual_re(model: "fvm.FactoryVocabularyModel") -> "re.Pattern[str]":
    """The word the gap report counts per named section — the residual a human still has to read. Derived
    from the retired terms rather than hardcoded: the earlier version counted `machinery`, which is no
    longer policed, so counting it would report judgment work nobody owes."""
    words = sorted({w for t in model.retired_terms for w in ([t.phrase] + t.banned_words)}, key=len)
    return re.compile("|".join(re.escape(w) for w in words) or r"(?!x)x", re.IGNORECASE)


def gap_report(model: "fvm.FactoryVocabularyModel | None" = None) -> "tuple[list[str], list[str]]":
    """The TWO-WAY GAP between the author's site-by-site pass and what this lint can mechanically find.
    Both directions are reported; neither is dropped.

    Returned as `(author_named_without_findings, findings_outside_named_sections)`:
      * A named section with ZERO findings is either a lint gap or a site needing the role test the lint
        cannot supply. The row carries the section's raw retired-word occurrence count, so the reader can
        tell "nothing to fix here" (count 0) from "residual uses a human must read" (count > 0).
      * A finding in a section the author did NOT name is a candidate he may not have seen.
    """
    if model is None:
        model = fvm.derive_model()
    fs = findings(model)
    hit = re.compile(r"^book/part5/([^:]+):(\d+):")
    placed = [(m.group(1), int(m.group(2))) for m in (hit.match(f) for f in fs) if m]

    named_rows: "list[str]" = []
    covered: "set[tuple[str, int]]" = set()
    word = _residual_re(model)
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
            named_rows.append(f"{s.id} ({s.file}:{lo}-{hi}) — 0 lint findings, {occ} residual "
                              f"retired-word occurrence(s). " + ("Nothing for the lint OR a human to do."
                                                                 if occ == 0 else
                                                                 "Each is either a licensed measurement "
                                                                 "label or a site a reader must judge."))
    outside = [f for f, (fl, ln) in zip(fs, placed) if (fl, ln) not in covered] if len(placed) == len(fs) \
        else [f for f in fs]
    return named_rows, outside


#: The rest of the narrative body, scanned ONLY for the out-of-scope report below — never for findings.
_OUT_OF_SCOPE_GLOBS = ("part1/*.md", "part2/*.md", "part3/*.md", "part4/*.md", "part6/*.md",
                       "part7/*.md", "conclusion/*.md")


def out_of_scope_candidates(model: "fvm.FactoryVocabularyModel | None" = None) -> "list[str]":
    """Retired-term COMPOUNDS outside the banned scope, counted per file. Reported, never findings: the
    reduction is Chapter 5's decision, and `engineering capital` is DEFINED outside it — the author ruled
    the other chapters a later problem, to be settled after Chapter 5's metaphor is constrained. This is the
    other half of the two-way gap, on the SCOPE axis rather than the site axis, and it is the accounting a
    decision to widen `banned_in` would need."""
    if model is None:
        model = fvm.derive_model()
    out: "list[str]" = []
    for term in model.retired_terms:
        pat = _phrase_re(term.phrase)
        per_file: "list[tuple[str, int]]" = []
        for path in sorted(p for g in _OUT_OF_SCOPE_GLOBS for p in BOOK.glob(g)):
            joined = " ".join(b.text for b in _iter_blocks(path, skip_preamble=False))
            n = len(pat.findall(joined))
            if n:
                per_file.append((_rel(path), n))
        total = sum(n for _, n in per_file)
        if total:
            out.append(f"`{term.phrase}` — {total} use(s) in {len(per_file)} file(s) outside the banned "
                       f"scope ({', '.join(term.banned_in)}); NOT findings, a later decision")
            out.extend(f"    {f}: {n}" for f, n in per_file)
    return out


def census(model: "fvm.FactoryVocabularyModel | None" = None) -> "list[str]":
    """A per-file COUNT of the watched words, printed as context rather than findings. The retired terms
    should read 0 inside the banned scope; `machinery` and `tooling` are shown because they were once
    policed and the counts document that de-policing rather than hiding it."""
    if model is None:
        model = fvm.derive_model()
    watched = ["engineering apparatus", "support apparatus", "apparatus", "engineering capital",
               "machinery", "tooling", "model", "tool", "control", "stock"]
    pats = {w: _phrase_re(w) for w in watched}
    rows: "list[str]" = []
    for path in _chapter_files():
        joined = " ".join(b.text for b in _iter_blocks(path, skip_preamble=False))
        counts = {w: len(pats[w].findall(joined)) for w in watched}
        rows.append(f"{_rel(path)}: " + "  ".join(f"{w}={counts[w]}" for w in watched))
    return rows


# ---- the prose worklist projection ------------------------------------------------------------------

def render_worklist(model: "fvm.FactoryVocabularyModel | None" = None) -> str:
    """Project the findings into the prose worklist a later pass consumes: the model's structure, the per
    term questions and negative rules, the retired terms and their replacement instructions, every finding,
    the author-defended sites to leave alone, the foreshadowing gaps, and the census. Regenerating this file
    re-derives it from the model, so it cannot drift from the lint."""
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
        "Four terms, each answering a DIFFERENT question, inside the factory. `control` is a ROLE, not a "
        "fourth part: the same test is a tool by what it is, and participates in a control when its result "
        "carries a consequence the agent cannot simply reason away. A reading that sorts the terms into "
        "mutually exclusive bins has the model wrong.",
        "",
        "## Role tests and negative rules",
        "",
        "| term | question | role test | negative rule |",
        "|---|---|---|---|",
    ]
    for n in model.nodes:
        lines.append(f"| `{n.id}` | {n.question} | {n.role_test} | {n.negative_rule} |")
    for u in model.usage_licences:
        lines.append(f"| `{u.id}` ({u.disposition}) | (usage licence) | {u.licence} | {u.negative_rule} |")
    lines += [
        "",
        "## Retired terms — the inverted half of the decision",
        "",
        "These words LEFT Chapter 5. The lint's polarity now runs this way: it finds them, where an earlier "
        "version steered prose toward one of them.",
        "",
        fvm.render_retired_md(model),
        "",
        f"## Findings ({len(fs)})",
        "",
        "Each line is `file:line`, the matched phrase, and what the model says to write instead. The "
        "phrase is matched on WRAP-JOINED text, so a `file:line` is where the phrase STARTS — it may "
        "continue onto the next line.",
        "",
    ]
    lines += [f"- {f}" for f in fs] or ["- (none)"]
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
        "A zero here is not a clean bill. Where the residual count is above zero, each occurrence is "
        "either a licensed measurement label or a site a reader must judge — work the lint declines to "
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
        "- (none) — every finding falls inside a section the author already named.",
    ]
    lines += [
        "",
        f"### Outside the banned scope ({len(oos)} line(s)) — the scope axis of the same gap",
        "",
        "The retired terms elsewhere in the book. NOT findings, and the asymmetry is DELIBERATE: "
        "`engineering capital` is defined in the governance-conversion section and carried by the theory "
        "and practice chapters, so it is live on both sides of a Chapter 5 that no longer uses it. The "
        "author ruled the other chapters a later problem, to be settled once Chapter 5's metaphor is "
        "constrained. Listed so widening `banned_in` is a deliberate call with the cost visible.",
        "",
    ]
    lines += [f"- {o}" for o in oos] or ["- (none)"]
    lines += [
        "",
        "## Census — context, not findings",
        "",
        "Per-file counts of the watched words. The retired terms should read 0 inside the banned scope; "
        "`machinery` and `tooling` are shown because they were once policed categories and are now ordinary "
        "prose, so the counts document the de-policing rather than hiding it.",
        "",
        "```",
    ]
    lines += census(model)
    lines += [
        "```",
        "",
        "## What this lint will never catch",
        "",
        "- **The role tests.** Whether a referent describes the product (model), is worked with (tool), or "
        "bounds what may be done (control) needs the referent read in context.",
        "- **`tool` versus `control` at a site.** The subtle judgment the whole vocabulary turns on: the "
        "same test is a tool when an agent runs it and reasons about the result, and participates in a "
        "control when the result carries a consequence the agent cannot simply reason away. Which one a "
        "sentence is about is the author's call.",
        "- **Whether a `machinery` or `tooling` use reads well.** Neither is policed any more; both are "
        "ordinary factory prose, and adjudicating them was becoming ontology for ontology's sake.",
        "- **Whether a vehicle prefigures.** Presence is mechanical; prefiguration is not.",
        "",
    ]
    return "\n".join(lines)


# ---- CLI --------------------------------------------------------------------------------------------

def _print_list(model: "fvm.FactoryVocabularyModel") -> int:
    print("== factory-vocab — the derived tables (single source of truth: "
          "factory_vocabulary_declared.json) ==")
    print(f"  FORMULATION (must be present in {', '.join(model.formulation_scope)}):")
    print(f"    {model.formulation}")
    print("  RETIRED TERMS -> banned scope:")
    for t in model.retired_terms:
        extra = f" + bare {t.banned_words}" if t.banned_words else ""
        exempt = f"; exempt {t.exempt_collocations}" if t.exempt_collocations else ""
        print(f"    {t.phrase!r}{extra} in {t.banned_in}{exempt}")
    print("  AUTHOR-DEFENDED (never a finding):")
    for m in model.defended_collocations():
        print(f"    {m.phrase!r}")
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
        print(f"  clean — {len(model.retired_terms)} retired term(s) absent from their banned scope, the "
              f"formulation present, and {len(model.usage_licences)} usage licence(s) respected")
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
              f"residual count there is a licensed label or JUDGMENT work, not a lint gap):")
        for g in named_gap:
            print(f"    {g}")
    if outside:
        print(f"  GAP — the lint found it outside any author-named section ({len(outside)}):")
        for o in outside:
            print(f"    {o}")
    oos = out_of_scope_candidates(model)
    if oos:
        print(f"  OUTSIDE THE BANNED SCOPE ({len(oos)} line(s); the retired terms elsewhere in the book — "
              f"NOT findings, a deliberate later decision):")
        for o in oos:
            print(f"    {o}")
    print("  CENSUS (context, not findings):")
    for row in census(model):
        print(f"    {row}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
