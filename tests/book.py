"""AUDIT-ONLY structural checks over the embedded book (`book/`) — the mechanical arm of the
engineering-book document type (see the self-communicate skill's `writing/document-types.md`).

These are REPORT-ONLY: every function returns `(findings, stats)` and NONE of them contributes to the
suite's fail count. The book has known, deliberate gaps (draft chapters with no figure yet, placeholder
markers), so a hard gate here would wrongly red the whole suite. The driver in `catalog_tests.py` runs
these via a separate `--book-audit` path that prints findings and always exits neutral. Promote an
individual rule to blocking only once the book clears it — then move it behind a real `Check(...)`.

What each rule enforces (the engineering-book specializations `document-types.md` names). The name in
brackets is the LINT NAME an inline suppression cites (see "Suppression" below):

  1. [book-links]        intra-book link integrity — nav-pager / figure-source / index See-link targets resolve.
  2. [book-visual]       >=1 visual per chapter — every chapter page carries a <figure>/<svg>/mermaid.
  3. [book-section-cap]  section-length cap — no heading-to-heading section exceeds the word/paragraph caps.
  4. [book-principle]    principle woven — the named principles appear across >=K chapters.
  5. [book-figure]       figure hygiene — every `<!-- figure -->` source resolves AND has a non-empty caption.
  6. [book-placeholder]  placeholder tracking — count `[FILL IN]` / `[MORE CHAPTERS FOLLOW]` (report, never fail).
  7. [book-delimiters]   delimiter balance — parens / curly braces balance per section, after masking the
                         constructs that legitimately carry unbalanced delimiters (code, mermaid, build comments).
  8. [book-headings]     heading-level skips — no heading jumps more than one level deeper than the last
                         (h1->h3); the first heading is the chapter h1; exactly one h1 per page.
  9. [book-render-fidelity] un-converted markdown left in a built page's <p> body.
 10. [book-chapter-num] no hardcoded "Chapter N" in prose (chapter numbers are DERIVED at build).
 11. [book-mermaid-source] no RAW mermaid source (```mermaid fence / `flowchart`/`subgraph`/`-->` text)
                         in any built book/*.html — diagrams render to inline SVG at build time; the web
                         analogue of the PDF `verify_pdf` mermaid assert.
 12. [book-float-ref]   float introduction — every numbered float (figure / table / standalone mermaid)
                         carries a `<!-- label: <key> -->` AND a `[ref:<key>]` appears in prose before it,
                         so no float drops in cold; dangling `[ref:]` is a finding too. Walks the typed
                         book IR (`book/book_ir.py`) — the first analysis to consume it.

**Suppression.** Every rule honors an inline suppression comment, mirroring the repo's
`# noqa: <name> — <reason>` convention but expressed as an HTML comment (the book is markdown):

    <!-- noqa: <lint-name> — <reason> -->

placed in the chapter SOURCE `.md` (authors edit source, not the generated HTML). A reason token after the
em-dash or hyphen is REQUIRED — a bare `<!-- noqa: book-visual -->` does not suppress (it is reported as a
malformed suppression). A suppression silences findings of THAT lint for the file it sits in; for the
per-section rules (section-cap, delimiters) it may ALSO name the section to scope it to one section — see
`_SuppressionIndex.covers`. Suppressed findings are still surfaced, in a separate report section, so
nothing silenced disappears.

Intra-book links (rule 1) largely overlap the whole-site `check_html_links` in `tests/html.py`, which
already resolves every local href/src across the built site (book pages included). This module adds only
what that check does NOT cover: the `<!-- figure: path -->` SOURCE in the markdown (a comment, invisible to
the HTML link scanner) and the figure CAPTION.

Thresholds are module consts so they are tunable without touching logic.
"""
from __future__ import annotations

import os
import re
from typing import NamedTuple

from tests.common import FAIL, PASS, ROOT, SKIP, rel

# ---- tunable thresholds (module consts; adjust as the book settles) -------------------------------
MAX_SECTION_WORDS = 400   # a heading-to-heading section over this many words is a wall of text
MAX_SECTION_PARAS = 6     # ...or over this many paragraphs
PRINCIPLE_TERMS = ("Modeling Principle", "Alignment Principle")  # the named principles the book weaves
PRINCIPLE_MIN_CHAPTERS = 4   # each principle should recur across at least this many chapters
# Placeholder markers are matched by BRACKET+PHRASE, with an optional `: <body>` — authors write both the
# bare `[FILL IN]` and the annotated `[FILL IN: introduce the running example ...]`. Matching the exact
# string `[FILL IN]` (the old bug) missed every colon-and-body instance. The phrases only; the regex below
# adds the `[`, the optional `: body`, and the closing `]`.
PLACEHOLDER_PHRASES = ("FILL IN", "MORE CHAPTERS FOLLOW")
# `[<phrase>]` or `[<phrase>: any body up to the closing bracket]`. Scanned over SOURCE .md (never the
# built HTML, where the brackets may be escaped/rendered differently).
_PLACEHOLDER_RE = re.compile(
    r"\[(?P<phrase>" + "|".join(re.escape(p) for p in PLACEHOLDER_PHRASES) + r")(?::[^\]]*)?\]")
DELIMITER_PAIRS = (("(", ")"), ("{", "}"))  # pairs checked for balance in prose (after masking)

BOOK = os.path.join(ROOT, "book")
# Source chapters live under these dirs (part1..6, plus front/back matter); appendix + meta files excluded.
_CHAPTER_SRC_DIRS = ("part1", "part2", "part3", "part4", "part5", "part6", "frontmatter", "part7")
# Front matter (Preface, Acknowledgments), the Reflections chapters (Theory, Implications, Conclusion), and
# the Back-Matter apparatus (About the Author, Colophon) are narrative or reference prose that does not
# plausibly want a figure, so the visual-per-chapter rule EXEMPTS them by default (part6/part7 carry
# forward the exemption the single `backmatter/` dir held before the Part-6/7 split — the closing prose
# gains figures in the later content wave, not this structural move). A page that DOES want the rule can
# opt in via source dir; a body chapter that genuinely needs no figure opts out with a per-file
# `<!-- noqa: book-visual — <reason> -->`.
_VISUAL_EXEMPT_SRC_DIRS = ("frontmatter", "part6", "part7")

# ---- the finding + suppression model -------------------------------------------------------------


class Finding(NamedTuple):
    """One audit finding. `src` is the chapter SOURCE `.md` a suppression for this finding would live in
    (None for a whole-book rule like principle, which no single file can suppress). `label` scopes a
    per-section suppression (the section heading text) — empty for a whole-file finding. `msg` is the
    human-readable line printed in the report."""
    src: str | None
    label: str
    msg: str


class Suppression(NamedTuple):
    lint: str          # the lint name the comment cites, e.g. "book-visual"
    reason: str        # the required reason token(s) after the em-dash / hyphen
    scope: str         # optional section-scope text (a substring of the section heading), or ""
    raw: str           # the raw comment, for the report


# `<!-- noqa: <lint-name> [| <section-scope>] — <reason> -->`. The separator before the reason is an
# em-dash or a WHITESPACE-FLANKED hyphen (mirrors the repo's `# noqa: <name> — <reason>`); the flanking
# space matters — a bare hyphen inside a lint name like `book-visual` must NOT be read as the separator, so
# the lint name is captured non-greedily and the separator requires ` — ` / ` - ` (space before the dash).
# A reason token is REQUIRED. An optional `| <scope>` before the separator narrows a per-section rule.
_NOQA_RE = re.compile(
    r"<!--\s*noqa:\s*(?P<lint>[\w-]+?)\s*"
    r"(?:\|\s*(?P<scope>[^—|][^—]*?)\s*)?"        # optional "| <scope>"
    r"(?:\s—|\s-{1,2})\s+(?P<reason>\S.*?)\s*-->",  # separator: em-dash or hyphen, space BEFORE it
    re.S,
)
# A malformed suppression: cites a lint but gives no reason (bare `<!-- noqa: book-visual -->`). Reported
# so a typo doesn't silently fail to suppress.
_NOQA_BARE_RE = re.compile(r"<!--\s*noqa:\s*(?P<lint>[\w-]+)\s*-->")


class _SuppressionIndex:
    """Reads every chapter source's `<!-- noqa: ... -->` comments once, and answers `covers(finding)`."""

    def __init__(self) -> None:
        self.by_file: dict[str, list[Suppression]] = {}
        self.malformed: list[Finding] = []
        for f in _chapter_src_files():
            txt = open(f, encoding="utf-8").read()
            sups: list[Suppression] = []
            for m in _NOQA_RE.finditer(txt):
                sups.append(Suppression(
                    lint=m.group("lint"),
                    reason=m.group("reason").strip(),
                    scope=(m.group("scope") or "").strip(),
                    raw=m.group(0).strip(),
                ))
            self.by_file[f] = sups
            # flag bare noqa comments that matched no well-formed pattern (no reason token)
            wellformed_spans = {m.group(0) for m in _NOQA_RE.finditer(txt)}
            for bm in _NOQA_BARE_RE.finditer(txt):
                if bm.group(0) not in wellformed_spans:
                    self.malformed.append(Finding(
                        src=f, label="",
                        msg=f"{rel(f)} — malformed suppression {bm.group(0)!r}: "
                            f"missing required reason after '—' (won't suppress)"))

    def covers(self, lint: str, fnd: Finding) -> Suppression | None:
        """A suppression covers a finding when it is in the same source file, names the same lint, and —
        if it carries a `| <scope>` — that scope text appears in the finding's section label."""
        if fnd.src is None:
            return None
        for s in self.by_file.get(fnd.src, ()):
            if s.lint != lint:
                continue
            if s.scope and s.scope.lower() not in fnd.label.lower():
                continue
            return s
        return None


# ---- source + built-page discovery ---------------------------------------------------------------


def _chapter_src_files() -> list[str]:
    """Every chapter SOURCE .md (part dirs + front/back matter). Appendix fills, README, AGENTS,
    index-terms, manuscript-cleaned are NOT chapters."""
    out: list[str] = []
    for d in _CHAPTER_SRC_DIRS:
        dp = os.path.join(BOOK, d)
        if not os.path.isdir(dp):
            continue
        out.extend(os.path.join(dp, fn) for fn in sorted(os.listdir(dp)) if fn.endswith(".md"))
    return out


# A real chapter page is `book/<N>.<M>-<slug>.html` (part chapters + front/back matter number as 0.x / 6.x).
# Appendix, index, and stack pages also carry `<header class="chap">` but are NOT chapters — exclude them
# so "a visual per chapter" and the section cap grade only the narrative body, not a reference appendix.
_CHAPTER_HTML_RE = re.compile(r"^\d+\.\d+-.+\.html$")


def _chapter_html_pages() -> list[str]:
    """Every BUILT narrative chapter page: a top-level `book/<N>.<M>-<slug>.html` carrying
    `<header class="chap">`. Appendix / index / stack pages are excluded by the numbered-slug pattern."""
    out: list[str] = []
    if not os.path.isdir(BOOK):
        return out
    for fn in sorted(os.listdir(BOOK)):
        if not _CHAPTER_HTML_RE.match(fn):
            continue
        p = os.path.join(BOOK, fn)
        try:
            txt = open(p, encoding="utf-8").read()
        except OSError:
            continue
        if '<header class="chap">' in txt:
            out.append(p)
    return out


# The built page and its source share a basename (`2.2-loops-and-models.html` <- `.../2.2-loops-and-models.md`),
# so a suppression placed in the source .md governs findings raised over the built HTML.
def _src_for_html(html_path: str) -> str | None:
    """The chapter SOURCE `.md` for a built chapter page, matched by basename. None if not found (so a
    finding stays unsuppressible rather than crashing)."""
    stem = os.path.splitext(os.path.basename(html_path))[0]
    for f in _chapter_src_files():
        if os.path.splitext(os.path.basename(f))[0] == stem:
            return f
    return None


def _is_visual_exempt(src_md: str | None) -> bool:
    """True when the chapter SOURCE .md sits in a front/back-matter dir the visual-per-chapter rule
    exempts by default (Preface / Acknowledgments / Conclusion / Implications)."""
    if src_md is None:
        return False
    parent = os.path.basename(os.path.dirname(src_md))
    return parent in _VISUAL_EXEMPT_SRC_DIRS


def _main_body(html: str) -> str:
    """The <main>...</main> content of a chapter page (the chapter's own prose, minus the nav sidebar)."""
    m = re.search(r"<main\b.*?</main>", html, re.S)
    return m.group(0) if m else html


def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", " ", s)


def _words(s: str) -> int:
    return len(_strip_tags(s).split())


# ---- rule 1: intra-book link integrity (figure-source + caption + hrefs, scoped to book/) --------


def check_intra_book_links() -> tuple[list[Finding], dict]:
    """Book-scoped link integrity. The whole-site `check_html_links` already resolves nav-pager and index
    See-link hrefs; here we add the coverage IT misses — the `<!-- figure: path -->` SOURCE in the
    markdown — and re-report any book href that fails to resolve, for a single book verdict."""
    findings: list[Finding] = []
    checked = 0
    # figure sources (markdown comments — invisible to the HTML link scanner). The build emits flat pages
    # at the book root, so a figure's `assets/...` path is relative to book/, NOT to the chapter's part-dir.
    for f in _chapter_src_files():
        txt = open(f, encoding="utf-8").read()
        for src in re.findall(r"<!--\s*figure:\s*([^|>]+?)\s*(?:\||-->)", txt):
            checked += 1
            tgt = os.path.normpath(os.path.join(BOOK, src.strip()))
            if not os.path.exists(tgt):
                findings.append(Finding(f, "", f"{rel(f)} -> figure source {src.strip()} (missing asset)"))
    # built-page hrefs/srcs, scoped to book/ (dedup of the site scanner, book-focused)
    for p in _chapter_html_pages():
        base = os.path.dirname(p)
        src_md = _src_for_html(p)
        body = open(p, encoding="utf-8").read()
        for ref in re.findall(r'(?:href|src)="([^"]+)"', body):
            if ref.startswith(("http://", "https://", "mailto:", "data:", "//", "#")):
                continue
            tgt_rel = ref.split("#", 1)[0]
            if not tgt_rel:
                continue
            # The book PDF (book/mage-book.pdf) is a CI-generated, Pages-published artifact — it is NOT
            # committed and is gitignored, so it legitimately 404s on a local checkout but resolves on the
            # deployed site (same allowance the book landing's Download-PDF link relies on). Don't count
            # it as a broken link. (The book landing itself dodges this only because it isn't a numbered
            # chapter page; the preface links it too, and IS a chapter page — hence this explicit skip.)
            if os.path.basename(tgt_rel) == "mage-book.pdf":
                continue
            checked += 1
            tgt = os.path.normpath(os.path.join(base, tgt_rel))
            if not os.path.exists(tgt):
                findings.append(Finding(src_md, "", f"{rel(p)} -> {ref} (missing target)"))
    return findings, {"links_checked": checked, "broken": len(findings)}


# ---- rule 2: >=1 visual per chapter --------------------------------------------------------------


def check_visual_per_chapter() -> tuple[list[Finding], dict]:
    """Every built NARRATIVE-BODY chapter page carries at least one visual: a <figure>, a bare <svg>, or a
    mermaid block. Front/back matter (Preface, Acknowledgments, Conclusion, Implications — source dirs in
    `_VISUAL_EXEMPT_SRC_DIRS`) is EXEMPT by default. A body chapter that genuinely needs no figure suppresses
    with `<!-- noqa: book-visual — <reason> -->` in its source .md."""
    findings: list[Finding] = []
    pages = _chapter_html_pages()
    without = exempt = 0
    for p in pages:
        src_md = _src_for_html(p)
        if _is_visual_exempt(src_md):
            exempt += 1
            continue
        body = _main_body(open(p, encoding="utf-8").read())
        has_visual = bool(re.search(r"<figure\b|<svg\b|class=\"mermaid\"|pre class=\"mermaid\"", body))
        if not has_visual:
            without += 1
            findings.append(Finding(src_md, "",
                                    f"{rel(p)} — no <figure>/<svg>/mermaid in chapter body"))
    return findings, {"chapters": len(pages), "front_back_exempt": exempt, "without_visual": without}


# ---- rule 3: section-length cap ------------------------------------------------------------------


def check_section_length() -> tuple[list[Finding], dict]:
    """No heading-to-heading section (split on h1/h2/h3) exceeds MAX_SECTION_WORDS or MAX_SECTION_PARAS.
    A deliberately long section suppresses with `<!-- noqa: book-section-cap | <heading-text> — <reason> -->`
    in the source .md (scope it to the section by naming the heading)."""
    findings: list[Finding] = []
    over = 0
    total_sections = 0
    for p in _chapter_html_pages():
        src_md = _src_for_html(p)
        body = _main_body(open(p, encoding="utf-8").read())
        # split into segments at each heading; keep the heading text as the segment label
        parts = re.split(r"(<h[123]\b[^>]*>.*?</h[123]>)", body, flags=re.S)
        # parts alternates: [pre, heading, content, heading, content, ...]
        i = 1
        while i < len(parts):
            heading = _strip_tags(parts[i]).strip()
            content = parts[i + 1] if i + 1 < len(parts) else ""
            total_sections += 1
            words = _words(content)
            paras = len(re.findall(r"<p\b", content))
            if words > MAX_SECTION_WORDS or paras > MAX_SECTION_PARAS:
                over += 1
                findings.append(Finding(
                    src_md, heading,
                    f"{rel(p)} § {heading!r}: {words} words / {paras} paras "
                    f"(cap {MAX_SECTION_WORDS} words / {MAX_SECTION_PARAS} paras)"))
            i += 2
    return findings, {"sections": total_sections, "over_cap": over}


# ---- rule 4: principle woven across chapters --------------------------------------------------------


def check_principle_woven() -> tuple[list[Finding], dict]:
    """Each named principle appears across at least PRINCIPLE_MIN_CHAPTERS chapter SOURCE files. This is a
    whole-book finding (no single file owns it); suppress it in ANY chapter source with
    `<!-- noqa: book-principle | <principle-name> — <reason> -->` (the scope names the principle)."""
    findings: list[Finding] = []
    files = _chapter_src_files()
    per_principle: dict[str, int] = {}
    for term in PRINCIPLE_TERMS:
        hits = [f for f in files if term in open(f, encoding="utf-8").read()]
        per_principle[term] = len(hits)
        if len(hits) < PRINCIPLE_MIN_CHAPTERS:
            # attribute to whichever source carries a matching book-principle suppression, else whole-book.
            findings.append(Finding(
                None, term,
                f"principle {term!r} appears in {len(hits)} chapter(s) "
                f"(want >= {PRINCIPLE_MIN_CHAPTERS}): {', '.join(rel(h) for h in hits) or '(none)'}"))
    return findings, {"chapters_scanned": len(files), **{f"'{k}'_chapters": v for k, v in per_principle.items()}}


# ---- rule 5: figure hygiene (source resolves AND caption non-empty) ------------------------------


def check_figure_hygiene() -> tuple[list[Finding], dict]:
    """Every `<!-- figure: path | caption -->` resolves to an asset AND carries a non-empty caption.
    Suppress a deliberate exception with `<!-- noqa: book-figure — <reason> -->` in the source .md."""
    findings: list[Finding] = []
    figures = 0
    for f in _chapter_src_files():
        txt = open(f, encoding="utf-8").read()
        for m in re.finditer(r"<!--\s*figure:\s*(.*?)\s*-->", txt, re.S):
            figures += 1
            inner = m.group(1)
            src, sep, caption = inner.partition("|")
            src = src.strip()
            caption = caption.strip()
            # figure paths are book-root-relative (flat page emission), not chapter-dir-relative.
            tgt = os.path.normpath(os.path.join(BOOK, src)) if src else ""
            if not src or not os.path.exists(tgt):
                findings.append(Finding(f, src, f"{rel(f)} — figure source {src or '(empty)'} does not resolve"))
            if not sep or not caption:
                findings.append(Finding(f, src, f"{rel(f)} — figure {src or '(?)'} has an empty caption"))
    return findings, {"figures": figures, "issues": len(findings)}


# ---- rule 6: placeholder tracking (report only, never a finding to fix) --------------------------


def check_placeholders() -> tuple[list[Finding], dict]:
    """Count placeholder markers across chapter SOURCE .md files. Matches `[FILL IN]` / `[MORE CHAPTERS
    FOLLOW]` AND their colon-and-body forms (`[FILL IN: <text>]`) via `_PLACEHOLDER_RE`. Reported for
    visibility; suppress a deliberately retained marker with `<!-- noqa: book-placeholder — <reason> -->`
    in the source .md."""
    findings: list[Finding] = []
    counts: dict[str, int] = {p: 0 for p in PLACEHOLDER_PHRASES}
    for f in _chapter_src_files():
        txt = open(f, encoding="utf-8").read()
        per_file: dict[str, int] = {p: 0 for p in PLACEHOLDER_PHRASES}
        for m in _PLACEHOLDER_RE.finditer(txt):
            per_file[m.group("phrase")] += 1
        for phrase, n in per_file.items():
            if n:
                counts[phrase] += n
                # label is the bracketed phrase, so a per-marker suppression scope can name it.
                findings.append(Finding(f, f"[{phrase}]", f"{rel(f)} — {n}x [{phrase}]"))
    return findings, {"total": sum(counts.values()), **{f"[{k}]": v for k, v in counts.items()}}


# ---- rule 7: delimiter balance (after masking the legitimate carriers) ---------------------------


def _mask_markdown_noise(txt: str) -> str:
    """Blank out the constructs that legitimately carry unbalanced delimiters, so the balance check sees
    only prose: fenced code blocks, inline-code spans, mermaid blocks, `{#anchor}` heading ids,
    `{{token}}` metric placeholders, and `<!-- ... -->` build directives (figure/index-def/part-title/...).
    Replace each with spaces (preserving length so an approximate line locator stays meaningful)."""
    def _blank(m: re.Match) -> str:
        return re.sub(r"[^\n]", " ", m.group(0))

    # order matters: strip fenced/mermaid blocks and comments before inline spans
    txt = re.sub(r"```.*?```", _blank, txt, flags=re.S)          # fenced code (incl. ```mermaid)
    txt = re.sub(r"<!--.*?-->", _blank, txt, flags=re.S)          # build directives / HTML comments
    txt = re.sub(r"`[^`\n]*`", _blank, txt)                        # inline-code spans
    txt = re.sub(r"\{\{[^}]*\}\}", _blank, txt)                    # {{token}} metric placeholders
    txt = re.sub(r"\{#[^}]*\}", _blank, txt)                        # {#anchor} heading-id syntax
    return txt


def check_delimiter_balance() -> tuple[list[Finding], dict]:
    """Per chapter source, per heading-to-heading section, count each delimiter pair after masking the
    legitimate carriers; report any section with an unequal open/close count. Audit-only by nature — prose
    smileys and lone parens produce false positives, so this surfaces candidates for a human to eyeball.
    Suppress a deliberate imbalance with `<!-- noqa: book-delimiters | <heading-text> — <reason> -->`."""
    findings: list[Finding] = []
    imbalanced = 0
    sections_scanned = 0
    for f in _chapter_src_files():
        masked = _mask_markdown_noise(open(f, encoding="utf-8").read())
        # split into sections at markdown ATX headings; keep a label for each
        parts = re.split(r"(?m)^(#{1,6}\s+.*)$", masked)
        # parts: [pre, heading, body, heading, body, ...]; a leading pre-body counts as its own section
        segments: list[tuple[str, str]] = []
        if parts[0].strip():
            segments.append(("(preamble)", parts[0]))
        i = 1
        while i < len(parts):
            label = re.sub(r"^#{1,6}\s+", "", parts[i]).strip()
            body = parts[i + 1] if i + 1 < len(parts) else ""
            segments.append((label, body))
            i += 2
        for label, body in segments:
            sections_scanned += 1
            for op, cl in DELIMITER_PAIRS:
                no, nc = body.count(op), body.count(cl)
                if no != nc:
                    imbalanced += 1
                    # approximate location: first line in the body carrying either delimiter
                    loc = "?"
                    for ln_no, ln in enumerate(body.splitlines(), 1):
                        if op in ln or cl in ln:
                            loc = f"~body-line {ln_no}"
                            break
                    findings.append(Finding(
                        f, label,
                        f"{rel(f)} § {label!r}: {op}{cl} imbalance ({no} open / {nc} close), {loc}"))
    return findings, {"sections": sections_scanned, "imbalanced": imbalanced}


# ---- rule 8: heading-level skips (deterministic sibling of the axe heading-order check) -----------


def check_heading_levels() -> tuple[list[Finding], dict]:
    """Per chapter source, over the markdown ATX headings: flag a jump of more than one level deeper than
    the previous heading (h1->h3), a first heading that is not the chapter h1, or more than one h1. This is
    the deterministic sibling of axe's heading-order check. It runs ~0 across the book — a candidate to
    PROMOTE TO BLOCKING immediately. Suppress a deliberate structure with
    `<!-- noqa: book-headings — <reason> -->` in the source .md."""
    findings: list[Finding] = []
    files = _chapter_src_files()
    for f in files:
        masked = _mask_markdown_noise(open(f, encoding="utf-8").read())  # ignore `#` inside code fences
        levels = [(len(m.group(1)), m.group(2).strip())
                  for m in re.finditer(r"(?m)^(#{1,6})\s+(.*)$", masked)]
        if not levels:
            continue
        h1_count = sum(1 for lvl, _ in levels if lvl == 1)
        if levels[0][0] != 1:
            findings.append(Finding(
                f, levels[0][1],
                f"{rel(f)}: first heading is h{levels[0][0]} ({levels[0][1]!r}), not the chapter h1"))
        if h1_count != 1:
            findings.append(Finding(f, "", f"{rel(f)}: {h1_count} h1 headings (want exactly 1)"))
        prev = levels[0][0]
        for lvl, text in levels[1:]:
            if lvl > prev + 1:
                findings.append(Finding(
                    f, text, f"{rel(f)}: heading jumps h{prev}->h{lvl} at {text!r} (skips a level)"))
            prev = lvl
    return findings, {"chapters_scanned": len(files), "issues": len(findings)}


# ---- rule 9: render fidelity (un-converted markdown left literal in the BUILT html) ---------------

# Each pattern is a true-bug signal: markdown the book renderer failed to convert, left sitting as
# literal text inside a <p>. Every one has a known cause (a bullet/number list that wrapped across lines
# and fell through to a paragraph; a bold span the emphasis pass couldn't match; a code/link the inline
# pass missed). The book should render 0 of these — a hit means the renderer dropped a construct.
_RENDER_SMELLS: tuple[tuple[str, "re.Pattern[str]"], ...] = (
    ("literal **bold**",            re.compile(r"\*\*")),
    ("bullet swallowed into <p>",   re.compile(r"^\s*-\s")),
    ("numbered item at <p> start",  re.compile(r"^\s*\d+\.\s")),
    # user's heuristic: two ` - ` breaks (or two `N. ` markers) in one paragraph usually means a
    # `- `/`N. ` list collapsed mid-<p>. The dash and the number smell are a matched pair.
    ("multi-dash run (list?)",      re.compile(r"\s-\s\S.*\s-\s")),
    ("multi-number run (list?)",    re.compile(r"(?:^|\s)\d+\.\s.+\s\d+\.\s")),
    ("literal `code` span",         re.compile(r"`[^`]+`")),
    ("literal [text](link)",        re.compile(r"\[[^\]]+\]\([^)]+\)")),
)
_P_RE = re.compile(r"<p>(.*?)</p>", re.S)
_TAG_RE = re.compile(r"<[^>]+>")


def check_render_fidelity() -> tuple[list[Finding], dict]:
    """Scan every BUILT `book/*.html` page's <p> bodies for markdown the renderer left un-converted
    (literal `**`, a `- `/`N. ` list swallowed into a paragraph, a stray `` `code` `` or `[text](link)`).
    Reads the built HTML, so it catches a renderer regression the source-only rules can't see. Runs 0 on a
    clean build — a PROMOTE-to-BLOCKING candidate. src=None (the fix is in the renderer or the source md,
    not a suppressible authoring choice), so findings surface but carry no noqa."""
    import glob
    findings: list[Finding] = []
    pages = 0
    for f in sorted(glob.glob(os.path.join(BOOK, "*.html"))):
        pages += 1
        html = open(f, encoding="utf-8").read()
        for m in _P_RE.finditer(html):
            text = _TAG_RE.sub("", m.group(1)).replace("&amp;", "&")
            for name, pat in _RENDER_SMELLS:
                if pat.search(text):
                    findings.append(Finding(None, "", f"{rel(f)} — {name}: {text[:90].strip()!r}"))
    return findings, {"pages_scanned": pages, "issues": len(findings)}


def check_typst_emph_semicolon() -> "tuple[str, list[str]]":
    """Regression (260905): Typst swallows a ';' written immediately after a held `#call[...]` fragment —
    `#emph[x];` / `#strong[x];` render with the semicolon DROPPED in the PDF (it parses `];` as a code-mode
    terminator), while '.'/',' are unaffected. The book->Typst emitter re-emits that semicolon as a wrapped
    content literal (`#[;]`). Pin that the projector never produces a bare emphasis-then-semicolon, and that
    a trailing '.'/',' after emphasis stays literal. Imports the book Typst emitter directly."""
    import sys as _sys
    if BOOK not in _sys.path:
        _sys.path.insert(0, BOOK)
    import book_typst as _bt  # noqa: E402 — the book's markdown->Typst inline emitter
    issues: list[str] = []
    for src in ("the current *is*; next", "a **claim**; more", "an *is*; then a **b**; end"):
        out = _bt.inline_typst(src)
        if re.search(r"#(?:emph|strong)\[[^\[\]]*\];", out):
            issues.append(f"bare emphasis-then-semicolon survived (Typst would drop it): {src!r} -> {out!r}")
        if "#[;]" not in out:
            issues.append(f"semicolon not preserved after emphasis: {src!r} -> {out!r}")
    for src, tail in (("*is*. done", "]."), ("*is*, then", "],")):
        out = _bt.inline_typst(src)
        if tail not in out:
            issues.append(f"trailing {tail[-1]!r} after emphasis unexpectedly altered: {src!r} -> {out!r}")
    return (FAIL if issues else PASS), issues


# ---- rule 10: no hardcoded "Chapter N" in prose (chapter numbers are DERIVED at build) --------------

_HARDCODED_CHAPTER_RE = re.compile(r"\bChapter\s+\d+\b")


def check_hardcoded_chapter_num() -> tuple[list[Finding], dict]:
    """Chapter numbers are derived from filesystem order at build time, so a literal 'Chapter N' written
    into prose (usually a cross-reference link text, e.g. `[Chapter 8](5.1-brownfield.html)`) is a stale
    number waiting to drift the moment a chapter moves. Cross-references should use the chapter TITLE.
    Scans chapter SOURCE .md after masking code fences / inline code. Suppress a deliberate literal with
    `<!-- noqa: book-chapter-num — <reason> -->` in the source .md."""
    findings: list[Finding] = []
    files = _chapter_src_files()
    for f in files:
        masked = _mask_markdown_noise(open(f, encoding="utf-8").read())
        for m in _HARDCODED_CHAPTER_RE.finditer(masked):
            line = masked.count("\n", 0, m.start()) + 1
            findings.append(Finding(f, "", f"{rel(f)}:{line} — hardcoded {m.group(0)!r} in prose (link by title; numbers are derived)"))
    return findings, {"chapters_scanned": len(files), "issues": len(findings)}


# ---- rule 11: no RAW mermaid source in any built book/*.html (diagrams render to inline SVG) ---------

# Import the ONE marker tuple the build script + PDF assert share, so the web and PDF controls detect the
# exact same class (single source of truth). If the build module can't be imported (unexpected), fall back
# to an inline copy so the lint still runs rather than crashing the audit.
try:
    import importlib.util as _ilu
    _bspec = _ilu.spec_from_file_location("_bbh", os.path.join(BOOK, "build_book.py"))
    _bmod = _ilu.module_from_spec(_bspec)  # type: ignore[arg-type]
    _bspec.loader.exec_module(_bmod)       # type: ignore[union-attr]
    _MERMAID_SOURCE_MARKERS: tuple[str, ...] = _bmod.MERMAID_SOURCE_MARKERS
except Exception:  # noqa: BLE001 — fall back to a literal copy; the lint must not crash the audit
    _MERMAID_SOURCE_MARKERS = (
        "flowchart ", "graph TD", "graph LR", "graph TB", "graph RL",
        "subgraph ", "sequenceDiagram", "stateDiagram", " --> ",
    )

import html as _html_mod  # noqa: E402 — local to this rule


_MERMAID_PRE_RE = re.compile(r'<pre class="mermaid">(.*?)</pre>', re.S)
_CODE_BLOCK_RE = re.compile(r"<pre><code>(.*?)</code></pre>", re.S)


def check_no_raw_mermaid() -> tuple[list[Finding], dict]:
    """No un-rendered ```mermaid source may ship in ANY built `book/*.html`. Mermaid fences render to a
    static inline `<svg>` at build time (`build_book.py: render_mermaid_svg`), so a shipped diagram is
    always an `<svg>` — never `flowchart`/`subgraph`/`-->` SYNTAX text. Web analogue of the PDF
    `verify_pdf` mermaid assert (shares the `MERMAID_SOURCE_MARKERS` tuple).

    Precise, zero-false-positive discriminators (NOT a blunt visible-text scan — `-->` and `flowchart`
    appear in legitimate escaped prose / SVG `class`/`aria` attributes):
      (a) a `<pre class="mermaid">` whose body has NO `<svg>` — the definitive un-rendered signal; and
      (b) a plain `<pre><code>` code box whose (unescaped) body carries a mermaid SYNTAX marker — a fence
          that wasn't even recognized as mermaid and rendered as raw code.
    src=None: the fix is in the build / the source .md, not a suppressible authoring choice."""
    import glob
    findings: list[Finding] = []
    pages = 0
    for f in sorted(glob.glob(os.path.join(BOOK, "*.html"))):
        pages += 1
        raw = open(f, encoding="utf-8").read()
        # (a) a mermaid <pre> that never became an <svg>.
        for body in _MERMAID_PRE_RE.findall(raw):
            if "<svg" not in body:
                findings.append(Finding(
                    None, "", f"{rel(f)} — <pre class=\"mermaid\"> shipped un-rendered (no <svg>): "
                              f"{_html_mod.unescape(body).strip()[:70]!r}"))
        # (b) a raw code box that is actually mermaid source (fence not recognized as mermaid).
        for body in _CODE_BLOCK_RE.findall(raw):
            text = _html_mod.unescape(body)
            hits = [m for m in _MERMAID_SOURCE_MARKERS if m in text]
            if hits:
                findings.append(Finding(
                    None, "", f"{rel(f)} — mermaid source in a plain code box (markers: {hits}): "
                              f"{text.strip()[:70]!r}"))
    return findings, {"pages_scanned": pages, "issues": len(findings)}


# ---- rule 12: float introduction (every figure/table/mermaid has a [ref:] before it) -------------


def check_float_ref() -> "tuple[list[Finding], dict]":
    """Every numbered float — figure, table, standalone mermaid — must be INTRODUCED, not dropped in cold:
    it carries a `<!-- label: <key> -->` and a `[ref:<key>]` cross-reference appears in prose BEFORE it in
    the same chapter. Also flags a `[ref:]` that resolves to no labelled float. This is the first analysis
    to walk the typed book IR (`book/book_ir.py`) rather than re-parse the source. Suppress a deliberate
    exception with `<!-- noqa: book-float-ref — <reason> -->` in the source .md."""
    import sys as _sys  # noqa: E402 — local path bootstrap so the book/ IR module is importable
    if BOOK not in _sys.path:
        _sys.path.insert(0, BOOK)
    import book_ir as _ir  # noqa: E402 — the typed book IR lives under book/

    doc = _ir.parse_book()
    labels = doc.labels()
    src_by_slug = {os.path.splitext(os.path.basename(f))[0]: f for f in _chapter_src_files()}
    findings: list[Finding] = []
    floats = 0
    for ch in doc.chapters:
        src = src_by_slug.get(ch.slug, ch.slug)
        first_ref: dict[str, int] = {}
        for r in ch.refs():
            first_ref[r.key] = min(r.block_index, first_ref.get(r.key, r.block_index))
        for b in ch.floats():
            floats += 1
            if not b.label:
                findings.append(Finding(src, ch.slug,
                    f"{ch.slug} — {b.kind.value} (block {b.index}) is not introduced: no <!-- label: --> "
                    f"+ [ref:] before it"))
            elif b.label not in first_ref:
                findings.append(Finding(src, ch.slug,
                    f"{ch.slug} — {b.kind.value} '{b.label}' is never introduced by a [ref:{b.label}]"))
            elif first_ref[b.label] >= b.index:
                findings.append(Finding(src, ch.slug,
                    f"{ch.slug} — {b.kind.value} '{b.label}': its first [ref:] is at/after the float, "
                    f"so it does not introduce it"))
    for r in doc.refs():
        if r.key not in labels:
            findings.append(Finding(src_by_slug.get(r.chapter_slug, r.chapter_slug), r.chapter_slug,
                f"{r.chapter_slug} — [ref:{r.key}] resolves to no <!-- label: {r.key} --> float"))
    return findings, {"floats": floats, "labelled": len(labels), "issues": len(findings)}


def check_float_ref_gate() -> "tuple[str, list[str]]":
    """BLOCKING gate twin of rule 12 (`book-float-ref`): FAIL if any numbered float lacks its intro
    `[ref:]` after inline `<!-- noqa: book-float-ref — <reason> -->` suppressions are honored. Promoted from
    audit-only once the tree cleared (rule-#55 audit-only-first). The `--book-audit` path still reports the
    rule with full suppression detail; this is the enforcing twin `catalog_tests.py` wires into the gate."""
    findings, _stats = check_float_ref()
    idx = _SuppressionIndex()
    active = [f for f in findings if not idx.covers("book-float-ref", f)]
    return (FAIL if active else PASS), [f.msg for f in active]


def check_caption_orphan_gate() -> "tuple[str, list[str]]":
    """Caption-orphan gate: no table caption may sit stranded on a page while its table body flows to the
    next page (the 260805 Table 7.2-1 report — caption on p.238, body on p.239). Runs the rendered-PDF
    sensor `_pdf_orphan_caption_pages` against `book/mage-book.pdf` when it is on disk; the PDF is gitignored
    and rendered only by the `--pdf` build, so this SKIPs when no PDF has been rendered (or pdftotext is
    absent). The authoritative twin is the `--pdf` content-integrity gate, which runs the SAME sensor on
    every push; this surfaces the control in the suite whenever a PDF is present. The sticky-caption Typst
    show-rule is the architecture that keeps every caption with its body — this catches any residual."""
    import sys as _sys  # noqa: E402 — local path bootstrap so the book/ renderer module is importable
    import shutil as _shutil  # noqa: E402 — local tool probe
    if BOOK not in _sys.path:
        _sys.path.insert(0, BOOK)
    pdf = os.path.join(BOOK, "mage-book.pdf")
    if not os.path.isfile(pdf) or not _shutil.which("pdftotext"):
        return SKIP, ["book/mage-book.pdf not rendered (build with --pdf) or pdftotext absent"]
    import pathlib as _pl  # noqa: E402 — local to this rule
    import build_book as _bb  # noqa: E402 — the PDF sensors live in the book renderer
    orphans = _bb._pdf_orphan_caption_pages(_pl.Path(pdf))
    return (FAIL if orphans else PASS), [
        f"p{n} — table caption {lbl!r} sits on a page with its table body on the next" for n, lbl in orphans]


def check_no_stray_comments() -> "tuple[str, list[str]]":
    """BLOCKING gate: no book-source `<!-- … -->` may be a STRAY comment — one whose leading token is not a
    recognized notation decorator (the `stray-book-comment` lint under `book-models/`). A stray leaks into
    the web page as a raw comment and into the Typst/PDF projection as VISIBLE text; this is the source-side
    twin of the notation-leak gate (which catches a leak in the built HTML). Lands blocking green — the tree
    carries zero strays after the render-path strip + fix-up."""
    import sys as _sys  # noqa: E402 — local path bootstrap so the book-models lint module is importable
    bm = os.path.join(ROOT, "book-models")
    if bm not in _sys.path:
        _sys.path.insert(0, bm)
    import lint_stray_comments as _lint  # noqa: E402 — the stray-comment source lint lives under book-models/
    fs = _lint.findings()
    return (FAIL if fs else PASS), fs


def check_part_opener_traceability() -> "tuple[str, list[str]]":
    """BLOCKING (rule-#55 promotion): every claim a Part opener foreshadows must trace to the book's spine.
    Each `book/part<N>/00-part-intro.md` declares a `<!-- part-foreshadows: <spine-id>, … -->` decorator; for
    each id the loop must close — it resolves in the argument spine, at least one chapter WITHIN that Part
    advances it, and it reconciles to an ARGUMENT ANCHOR: a Big Idea OR a What-This-Book-Argues claim
    (`argues_claims_declared.json`). Landed audit-only with leg-(c) findings on four opener premises that
    mapped to no Big Idea; three (`abundant-implementation`, `sync-cost-reduced`, `mage-becomes-practical`)
    now reconcile to their WTBA-claim id, and the fourth (`grounded-in-one-case`, an evidence-status caveat)
    was dropped from its Part opener's foreshadows, so the loop closes for every declared id and this is
    promoted to blocking. The source lint lives under `book-models/` (the `part-opener-traceability` lint)."""
    import sys as _sys  # noqa: E402 — local path bootstrap so the book-models lint module is importable
    bm = os.path.join(ROOT, "book-models")
    if bm not in _sys.path:
        _sys.path.insert(0, bm)
    import lint_part_opener_traceability as _lint  # noqa: E402 — the opener-traceability lint under book-models/
    fs = _lint.findings()
    return (FAIL if fs else PASS), fs


def check_ir_render_fidelity() -> "tuple[str, list[str]]":
    """BLOCKING gate for the C→A migration: every render-complete IR block renders byte-identically through
    `book_ir.Block.render_html()` and through the renderer (`md_to_html` on the block's raw slice). This is
    the golden net the IR-DESIGN "Migration to A" step calls for — it pins that the IR node holds enough to
    produce its HTML (render-completeness), so the renderer's per-kind primitives and the IR's classification
    cannot silently drift. A mismatch means a render-complete kind lost information on the way into the IR, or
    the extracted `_render_*` primitive diverged from what the node reproduces."""
    import sys as _sys  # noqa: E402 — local path bootstrap so the book/ IR module is importable
    if BOOK not in _sys.path:
        _sys.path.insert(0, BOOK)
    import book_ir as _ir       # noqa: E402 — the typed book IR lives under book/
    import build_book as _bb  # noqa: E402

    doc = _ir.parse_book()
    active: list[str] = []
    for ch in doc.chapters:
        # A worked-examples gallery renders as ONE directive-managed unit (the renderer intercepts the open
        # marker and collects the bracketed span), so its inner blocks never render in isolation. Skipping the
        # whole span keeps this net from feeding the takeaway PARA — whose raw glues the `<!-- worked-examples-end -->`
        # close marker onto its tail — to `md_to_html`, where it would trip the renderer's mid-block-marker guard.
        for b in _ir.blocks_outside_worked_examples(ch.blocks):
            if not b.is_render_complete:
                continue
            # Citation rendering is chapter-scoped stateful (first-reference numbering + first-occurrence
            # gutter notes), so a block that carries `[cite:]`/`[note:]` renders differently the SECOND
            # time unless the citation context is reset. Reset it to THIS block's own numbering before each
            # render so both start from an identical state — the byte-identity the gate pins still holds.
            _bb._number_citations(ch.slug, b.raw)
            want = _bb.md_to_html(b.raw)
            _bb._number_citations(ch.slug, b.raw)
            got = b.render_html()
            if want != got:
                active.append(
                    f"{ch.slug} — {b.kind.value} (block {b.index}): render_html() diverges from md_to_html "
                    f"of the raw slice")
    return (FAIL if active else PASS), active


def check_footnote_defs_multiline() -> "tuple[str, list[str]]":
    """Unit test for `build_book.collect_footnote_defs`, the SSOT footnote-definition collector both
    projections (HTML `md_to_html`, Typst `render_chapter` via `bb.collect_footnote_defs`) share. A footnote
    definition is its own blank-separated block, so a HARD-WRAPPED body spans several physical lines; the
    collector must gather every continuation line until the block boundary (blank / next `[^…]:` / EOF) and
    NOT leak the tail into the kept body (the 260819 `[^static-graph]` leak into §3.2). Cases: (a) a
    multi-line wrapped def is collected FULLY with no continuation left in the body; (b) a one-line def is
    unchanged (the equivalence that makes the whole book behavior-identical); (c) two adjacent
    blank-separated defs collect separately; (d) a def's gather STOPS at the blank line so following prose is
    kept, not swallowed."""
    import sys as _sys  # noqa: E402 — local path bootstrap so the book/ builder is importable
    if BOOK not in _sys.path:
        _sys.path.insert(0, BOOK)
    import build_book as _bb  # noqa: E402 — the collector lives in the book builder

    issues: list[str] = []

    # (a) hard-wrapped (unindented) multi-line def: fully joined, nothing leaks into the kept body.
    md_a = "Body para.\n\n[^wrap]: first line of the note\ncontinuation two\ncontinuation three\n\nAfter."
    kept_a, defs_a = _bb.collect_footnote_defs(md_a)
    if defs_a.get("wrap") != "first line of the note continuation two continuation three":
        issues.append(f"(a) multi-line def not fully gathered: {defs_a.get('wrap')!r}")
    if "continuation" in kept_a:
        issues.append(f"(a) continuation leaked into kept body: {kept_a!r}")
    if "Body para." not in kept_a or "After." not in kept_a:
        issues.append(f"(a) surrounding body lines dropped: {kept_a!r}")

    # (b) one-line def: identical to the historical single-line behavior (label -> stripped first-line text).
    md_b = "Intro.\n\n[^solo]: the whole note on one line\n\nTail."
    kept_b, defs_b = _bb.collect_footnote_defs(md_b)
    if defs_b.get("solo") != "the whole note on one line":
        issues.append(f"(b) one-line def changed: {defs_b.get('solo')!r}")
    if "[^solo]:" in kept_b:
        issues.append(f"(b) one-line def not stripped from body: {kept_b!r}")

    # (c) two adjacent blank-separated defs: collected as two distinct entries.
    md_c = "[^one]: first note\n\n[^two]: second note\n"
    _kept_c, defs_c = _bb.collect_footnote_defs(md_c)
    if defs_c.get("one") != "first note" or defs_c.get("two") != "second note":
        issues.append(f"(c) adjacent defs not separated: {defs_c!r}")

    # (d) gather stops at the blank line: the prose after the blank is body, not swallowed into the def.
    md_d = "[^d]: note body line one\nnote body line two\n\nThis prose is body, not the note.\n"
    kept_d, defs_d = _bb.collect_footnote_defs(md_d)
    if defs_d.get("d") != "note body line one note body line two":
        issues.append(f"(d) def over/under-gathered: {defs_d.get('d')!r}")
    if "This prose is body" not in kept_d:
        issues.append(f"(d) following prose was swallowed: {kept_d!r}")
    if "note body" in kept_d:
        issues.append(f"(d) def body leaked into kept: {kept_d!r}")

    return (FAIL if issues else PASS), issues


def check_index_scan_hoist_parity() -> "tuple[str, list[str]]":
    """BLOCKING byte-identity gate for the index-scan hoist optimization. `_scan_term_refs` was made
    O(pages) instead of O(terms×pages) by precomputing each page's normalized shape — the point-decorator-
    stripped body lowercased + the lowercased heading lines — ONCE per page (`_build_page_scan_index`),
    instead of re-normalizing every page for each of the ~300 index terms. `book-index.html`'s occurrence
    index is a deterministic ALWAYS-REBUILD aggregate, so the optimized scan MUST return byte-identical
    results to the naive per-term-renormalize reference for EVERY index term over the LIVE chapters. The
    reference embedded here IS the pre-optimization algorithm, verbatim — it is the oracle, computed
    independently of the production precompute, so agreement proves the hoist changed speed, not output.
    Any divergence is a bug in the hoist. (This is the soundness net that lets the optimized build be
    trusted; a diff here means the always-run index aggregate would ship different HTML.)"""
    import sys as _sys  # noqa: E402 — local path bootstrap so the book/ builder is importable
    if BOOK not in _sys.path:
        _sys.path.insert(0, BOOK)
    import build_book as _bb  # noqa: E402 — the book builder lives under book/

    # Reconstruct the SAME page set the production index build scans: discovered chapters + the appendix
    # pages build() appends before it builds the index (see build()).
    metrics = _bb._load_metrics()
    chapters = _bb._discover_chapters(metrics)
    if not chapters:
        return FAIL, ["no chapters discovered — cannot run the index-scan parity gate"]
    max_part = max(c["part"] for c in chapters)
    chapters = chapters + _bb.build_appendix_chapters(next_part=max_part + 1)

    issues: list[str] = []

    # (A) Precompute equivalence, over the real corpus. Independently derive each page's normalized shape —
    # the exact structures the pre-optimization scan recomputed per term — and assert the production
    # precompute (`_build_page_scan_index`) reproduces it field-for-field. This pins that the hoist moved
    # the normalization WITHOUT changing what it produces (the only place a hoist bug can hide). O(pages).
    oracle: list[tuple[int, str, list[str], dict]] = []
    for order, pg in enumerate(chapters):
        md = _bb._strip_point_decorators(pg["body_md"])
        heads = [ln.strip().lower() for ln in md.splitlines() if ln.strip().startswith("#")]
        oracle.append((order, md.lower(), heads, pg))
    prod = _bb._build_page_scan_index(chapters)
    if len(prod) != len(oracle):
        issues.append(f"_build_page_scan_index yielded {len(prod)} pages, expected {len(oracle)}")
    else:
        for (po, pl, ph, ppg), (oo, ol, oh, opg) in zip(prod, oracle):
            if (po, pl, ph, ppg["slug"]) != (oo, ol, oh, opg["slug"]):
                issues.append(f"precompute diverges for page {opg['slug']!r} (order/low/heads mismatch)")

    # (B) Scan equivalence, for EVERY index term over the real corpus. The reference below is the
    # pre-optimization `_scan_term_refs` body verbatim (membership + heading-significance + score + reading-
    # order tie-break + cap), operating on the independent `oracle` normalization — so it is an oracle for
    # the production scan, not a copy of it. Any disagreement means the hoisted scan changed OUTPUT, i.e.
    # book-index.html (an always-rebuild aggregate) would ship different HTML.
    def _reference_scan(term: str) -> list:
        keys = _bb._match_keys(term)
        if not keys:
            return []
        scored = []
        for order, low, heads, pg in oracle:
            if not any(k in low for k in keys):
                continue
            in_heading = False
            for hl in heads:
                if any(k in hl for k in keys):
                    in_heading = True
                    break
            scored.append((0 if in_heading else 1, order, pg))
        scored.sort(key=lambda t: (t[0], t[1]))
        return [pg for _s, _o, pg in scored[:_bb._MAX_REFS_PER_TERM]]

    terms = _bb._load_index_terms()
    for term in terms:
        opt = [p["slug"] for p in _bb._scan_term_refs(term, prod)]
        ref = [p["slug"] for p in _reference_scan(term)]
        if opt != ref:
            issues.append(f"index-scan hoist diverges for term {term!r}: optimized={opt} != reference={ref}")

    # Self-guard against a green no-op: the gate is a soundness net only if it actually exercised the real
    # corpus (many terms × many pages). A near-empty run would pass vacuously — flag it instead.
    if len(terms) < 50 or len(chapters) < 10:
        issues.append(f"parity gate exercised too little (terms={len(terms)}, pages={len(chapters)}) — it "
                      "must scan the real corpus to be a soundness net")
    return (FAIL if issues else PASS), issues


# ---- rule 13: no only-child heading (a heading with exactly one next-level child) ----------------


class _HNode:
    """One node in the book's conceptual heading tree (DESIGN §2.2). `level` is 0=BOOK, so PART=0's
    children, then CHAPTER (the implicit H1 root, level 1), then H2/H3/H4 blocks by their heading level.
    `anchor` is the lone child's explicit `{#slug}` id (for the finding), or None. `is_matter` is True on a
    PART node standing for an UNNUMBERED matter group (front matter, the top-level Conclusion, the synthetic
    back matter) — such a group legitimately holds a single unnumbered chapter, so it is exempt from the
    part→chapter only-child rule (the Conclusion is one section standing as its own group, parallel to the
    Preface — not a wrapper heading with a promotable lone child)."""
    __slots__ = ("level", "label", "anchor", "children", "is_matter")

    def __init__(self, level: int, label: str, anchor: str | None = None, is_matter: bool = False):
        self.level = level
        self.label = label
        self.anchor = anchor
        self.children: list[_HNode] = []
        self.is_matter = is_matter


def _only_child_pairs(root: "_HNode") -> "list[tuple[_HNode, _HNode]]":
    """Walk `root`'s subtree; return `(parent, lone_child)` for every node with EXACTLY one child. This is
    the whole predicate (DESIGN §2.3): 0 children = leaf (fine), 2+ = fine, exactly 1 = a finding. Pure over
    the node tree so the self-test can inject a synthetic 0/1/2-child tree."""
    out: list[tuple[_HNode, _HNode]] = []
    stack = [root]
    while stack:
        n = stack.pop()
        if len(n.children) == 1:
            out.append((n, n.children[0]))
        stack.extend(n.children)
    return out


def _build_only_child_forest() -> "tuple[list[_HNode], list[_HNode]]":
    """Build the two heading trees the only-child rule walks (DESIGN §2.1-§2.2), from the typed book IR:

    - the VOLUME tree: a synthetic BOOK root whose children are PART nodes; each PART's children are its
      CONTENT chapters (`chapter >= 1`). The `chapter == 0` record is the part's own landing page
      (part-intro / appendix front-door / divider), not a sibling chapter, so it is not a child.
    - the WITHIN-PAGE trees: one per chapter (ALL pages, including `chapter == 0`), rooted at a synthesized
      H1 node (level 1, label = chapter title) whose descendants are the page's H2/H3/H4 heading blocks,
      attached by the standard nesting stack.

    Returns (volume_roots, page_roots) — both fed through `_only_child_pairs`."""
    import sys as _sys  # noqa: E402 — local path bootstrap so the book/ IR + book-models symbols import
    if BOOK not in _sys.path:
        _sys.path.insert(0, BOOK)
    bm = os.path.join(ROOT, "book-models")
    if bm not in _sys.path:
        _sys.path.insert(0, bm)
    import book_ir as _ir       # noqa: E402 — the typed book IR lives under book/
    import book_symbols as _sym  # noqa: E402 — heading_id_and_text peels `{#slug}` with the renderer SSOT

    doc = _ir.parse_book(include_appendices=True)

    # VOLUME tree: BOOK -> PART -> content chapters.
    book = _HNode(-1, "BOOK")
    by_part: dict[int, list] = {}
    for ch in doc.chapters:
        by_part.setdefault(ch.part, []).append(ch)
    for part in sorted(by_part):
        chs = by_part[part]
        intro = next((c for c in chs if c.chapter == 0), None)
        label = intro.title if intro is not None else f"Part {part}"
        # A matter part (front matter, the top-level Conclusion, the synthetic back matter) is an apparatus
        # group whose content chapters carry `is_matter`; its chapter count is a structural choice, so it is
        # exempt from part→chapter only-child (a single unnumbered chapter standing as its own group is fine).
        is_matter = any(c.is_matter for c in chs if c.chapter >= 1)
        part_node = _HNode(0, label, intro.slug if intro is not None else None, is_matter=is_matter)
        for c in chs:
            if c.chapter >= 1:
                part_node.children.append(_HNode(1, c.title, c.slug))
        book.children.append(part_node)

    # WITHIN-PAGE trees: per chapter, an H1 root, then H2/H3/H4 by nesting stack.
    page_roots: list[_HNode] = []
    for ch in doc.chapters:
        root = _HNode(1, ch.title, ch.slug)
        stack = [root]
        # A worked-examples gallery's `### Example` heads are directive syntax, not narrative H3 sections
        # (same treatment as the outline's `heading_rows`), so the whole span is skipped — otherwise the
        # gallery heads would enter the heading tree and could draw a spurious only-child finding.
        for b in _ir.blocks_outside_worked_examples(ch.blocks):
            if b.kind is not _ir.BlockKind.HEADING:
                continue
            anchor, text = _sym.heading_id_and_text(b)
            node = _HNode(b.heading_level, text, anchor)
            while len(stack) > 1 and stack[-1].level >= b.heading_level:
                stack.pop()
            stack[-1].children.append(node)
            stack.append(node)
        page_roots.append(root)
    return [book], page_roots


_PAIR_LABEL = {
    (0, 1): "part→chapter",
    (1, 2): "chapter→section",
    (2, 3): "section→subsection",
    (3, 4): "subsection→sub-subsection",
}


def check_only_child_headings() -> "tuple[str, list[str]]":
    """BLOCKING gate (rule-#55 audit-only-first): FAIL if any DISPLAY heading has EXACTLY ONE immediate
    child heading of the next level down — an "only child" (DESIGN §1): a part with a single content
    chapter, or a chapter (page H1) with a single section (H2). 0 children = a leaf (fine); 2+ = fine. The
    fix is to promote the lone child (drop the wrapper heading, fold its content up) or give it a sibling.
    EXEMPT: run-in children (H3+ `###` run-ins) — a section may name ONE distinct subtopic with a single
    sentence-case run-in after an unheaded intro (author-ratified 260821); run-ins are not display-heading
    subsections. Walks
    the two typed trees `_build_only_child_forest` derives from the book IR (the volume part→chapter tree and
    the per-page H1→H2→H3→H4 tree). Landed audit-only, drained to 0, then promoted."""
    volume_roots, page_roots = _build_only_child_forest()
    issues: list[str] = []
    for root in volume_roots:
        for parent, child in _only_child_pairs(root):
            if parent.is_matter:  # matter apparatus group — a single unnumbered chapter is a valid shape
                continue
            pair = _PAIR_LABEL.get((parent.level, child.level), f"L{parent.level}→L{child.level}")
            issues.append(f"[volume] Part holding only {child.label!r} ({child.anchor}) — a lone content "
                          f"chapter under {parent.label!r} ({pair})")
    for root in page_roots:
        for parent, child in _only_child_pairs(root):
            if child.level >= 3:
                # A fourth-level `###` run-in is a sentence-case inline lead-in naming ONE distinct
                # expository subtopic; a section legitimately carries a single run-in after an unheaded
                # intro (the "intro + one named turn" shape, author-ratified 260821). The only-child rule
                # governs DISPLAY heading hierarchy — part->chapter and chapter->section — not run-ins.
                continue
            pair = _PAIR_LABEL.get((parent.level, child.level), f"L{parent.level}→L{child.level}")
            anchor = f" {{#{child.anchor}}}" if child.anchor else ""
            issues.append(f"{root.anchor} — [H{parent.level}] {parent.label!r} has exactly one child: "
                          f"[H{child.level}] {child.label!r}{anchor} ({pair})")
    return (FAIL if issues else PASS), issues


def check_only_child_headings_selftest() -> "tuple[str, list[str]]":
    """Failure-injection self-test for the only-child predicate (`_only_child_pairs`). A promoted BLOCKING
    check that silently degraded to a no-op would go green forever; this asserts the predicate flags an
    injected 1-child node, passes a 0-child (leaf) and a 2-child node, and reports the offending parent."""
    problems: list[str] = []
    root = _HNode(1, "root")
    leaf = _HNode(2, "leaf")                       # 0 children — must NOT flag
    two = _HNode(2, "two-kids")                     # 2 children — must NOT flag
    two.children = [_HNode(3, "a"), _HNode(3, "b")]
    lone = _HNode(2, "lone-parent")                 # 1 child — MUST flag
    lone.children = [_HNode(3, "only")]
    root.children = [leaf, two, lone]
    pairs = _only_child_pairs(root)
    flagged = {p.label for p, _c in pairs}
    if "lone-parent" not in flagged:
        problems.append("a heading with exactly one child was NOT flagged — the predicate degraded to a no-op")
    if "leaf" in flagged:
        problems.append("a 0-child leaf was flagged (predicate over-fires on leaves)")
    if "two-kids" in flagged:
        problems.append("a 2-child heading was flagged (predicate over-fires on multi-child nodes)")
    # root itself has 3 children — must not flag.
    if "root" in flagged:
        problems.append("a 3-child root was flagged (predicate over-fires)")
    return (FAIL if problems else PASS), problems


# ---- driver: run every rule, partition suppressed vs active, print a report; ALWAYS exit-neutral --

# (label, lint-name, fn). The lint-name is what an inline `<!-- noqa: <name> — <reason> -->` cites.
_RULES = [
    ("1. intra-book link integrity", "book-links", check_intra_book_links),
    ("2. >=1 visual per chapter", "book-visual", check_visual_per_chapter),
    ("3. section-length cap", "book-section-cap", check_section_length),
    ("4. principle woven across chapters", "book-principle", check_principle_woven),
    ("5. figure hygiene (source + caption)", "book-figure", check_figure_hygiene),
    ("6. placeholder tracking", "book-placeholder", check_placeholders),
    ("7. delimiter balance (parens / braces)", "book-delimiters", check_delimiter_balance),
    ("8. heading-level skips (PROMOTE-candidate)", "book-headings", check_heading_levels),
    ("9. render fidelity (un-converted markdown)", "book-render-fidelity", check_render_fidelity),
    ("10. no hardcoded 'Chapter N' in prose", "book-chapter-num", check_hardcoded_chapter_num),
    ("11. no raw mermaid source in built HTML", "book-mermaid-source", check_no_raw_mermaid),
    ("12. float introduction (label + [ref:] before it)", "book-float-ref", check_float_ref),
]

# the lint names, exported so a suppression comment can be validated against the known set.
LINT_NAMES = frozenset(name for _, name, _ in _RULES)


def run_book_audit() -> int:
    """Run every book rule, split findings into ACTIVE and SUPPRESSED (via inline `<!-- noqa: ... -->`
    comments), and print a per-rule report with the two kept apart. AUDIT-ONLY: returns 0 regardless of
    findings, so the book's known draft gaps never red the suite. The report IS the deliverable."""
    idx = _SuppressionIndex()
    pages = _chapter_html_pages()
    srcs = _chapter_src_files()
    print(f"== Book audit (AUDIT-ONLY — never fails the gate): "
          f"{len(pages)} built chapter page(s), {len(srcs)} source chapter(s) ==")
    if not pages:
        print("  (no built chapter pages found — run `catalog.py build` first; report is empty)")

    # flag any suppression that cites an unknown lint name (typo defense).
    unknown_sups: list[str] = []
    for f, sups in idx.by_file.items():
        for s in sups:
            if s.lint not in LINT_NAMES:
                unknown_sups.append(f"{rel(f)} — suppression cites unknown lint {s.lint!r}: {s.raw}")

    active_total = suppressed_total = 0
    suppressed_report: list[str] = []
    for label, lint, fn in _RULES:
        findings, stats = fn()
        active, suppressed = [], []
        for fnd in findings:
            s = idx.covers(lint, fnd)
            (suppressed if s else active).append((fnd, s))
        active_total += len(active)
        suppressed_total += len(suppressed)
        statline = " · ".join(f"{k}={v}" for k, v in stats.items())
        print(f"  [audit] {label} [{lint}]: {len(active)} active"
              f"{f' ({len(suppressed)} suppressed)' if suppressed else ''} — {statline}")
        for fnd, _ in active:
            print(f"          {fnd.msg}")
        for fnd, s in suppressed:
            suppressed_report.append(f"[{lint}] {fnd.msg}\n            └─ suppressed: {s.reason}")

    # the SUPPRESSED section — everything silenced stays visible.
    print(f"\n== Suppressed findings ({suppressed_total}) — silenced by inline <!-- noqa --> comments ==")
    if suppressed_report:
        for line in suppressed_report:
            print(f"  {line}")
    else:
        print("  (none)")

    # malformed / unknown suppressions — a typo must not silently fail to suppress.
    problems = [m.msg for m in idx.malformed] + unknown_sups
    if problems:
        print(f"\n== Suppression problems ({len(problems)}) — these do NOT suppress anything ==")
        for pr in problems:
            print(f"  {pr}")

    print(f"\n== Book audit: {active_total} active finding(s), {suppressed_total} suppressed, "
          f"across {len(_RULES)} rules (exit-neutral) ==")
    return 0
