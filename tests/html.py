"""HTML checks over the built site: link and in-page anchor resolution (stdlib `html.parser`, no browser).
Full HTML validity is NOT hand-rolled here — it's delegated to the canonical `html-validate` (Tier-2,
`tests/external.py`), configured by `.htmlvalidate.json`."""
from __future__ import annotations

import os
import re
import sys as _sys
from html.parser import HTMLParser

import catalog  # the site-projection SSOT — home of the shared model→site projection_drift helper (rule #11)
from tests.common import FAIL, PASS, ROOT, html_files, rel


class _Refs(HTMLParser):
    """Collects local href/src references and the id/anchor targets a page defines."""

    def __init__(self):
        super().__init__()
        self.refs: list[str] = []
        self.ids: set[str] = set()

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        for a in ("href", "src"):
            if d.get(a):
                self.refs.append(d[a])
        if d.get("id"):
            self.ids.add(d["id"])
        if tag == "a" and d.get("name"):  # legacy <a name>; NOT meta/input name=
            self.ids.add(d["name"])


# Artifacts built by the Pages CI (gitignored locally, present on the deployed site) — a link to one
# is valid on the live site, but its target does not exist at check-time, so don't flag it as missing.
_CI_BUILT_ARTIFACTS = ("mage-book.pdf",)
#: Path PREFIXES for subtrees built by a SEPARATE CI step and assembled into the deployed site, absent from
#: the stdlib `catalog.py build` on disk. `teach/` is the MkDocs-rendered Teach-with-MAGE course companion
#: (built into `_site/teach` by the Pages workflow's mkdocs step). A link into such a subtree is live on the
#: deployed site but has no on-disk target during this build, so the link gate skips it by prefix.
_CI_BUILT_PREFIXES = ("teach/",)


def check_html_links():
    """Every local href/src resolves to a file; #anchors resolve where the target page uses ids."""
    files = html_files()
    if not files:
        return FAIL, ["no built HTML found — run `catalog.py build` first"]
    parsed: dict[str, _Refs] = {}
    for f in files:
        p = _Refs()
        p.feed(open(f, encoding="utf-8").read())
        parsed[os.path.abspath(f)] = p
    issues = []
    for f in files:
        base, ap = os.path.dirname(f), os.path.abspath(f)
        for ref in parsed[ap].refs:
            if ref.startswith(("http://", "https://", "mailto:", "data:", "//")):
                continue
            tgt_rel, _, anchor = ref.partition("#")
            if tgt_rel and os.path.basename(tgt_rel) in _CI_BUILT_ARTIFACTS:
                continue  # CI-built download artifact — present on the deployed site, not on disk here
            if tgt_rel and tgt_rel.lstrip("./").startswith(_CI_BUILT_PREFIXES):
                continue  # CI-built subtree (e.g. MkDocs /teach) — live on the deployed site, absent here
            if not tgt_rel:  # in-page anchor
                if anchor and anchor not in parsed[ap].ids:
                    issues.append(f"{rel(f)} -> #{anchor} (no such id in page)")
                continue
            tgt = os.path.abspath(os.path.join(base, tgt_rel))
            if not os.path.exists(tgt):
                issues.append(f"{rel(f)} -> {ref} (missing target)")
            elif anchor and tgt in parsed and parsed[tgt].ids and anchor not in parsed[tgt].ids:
                # only assert the anchor when the target page uses ids at all (avoids false positives
                # on pages that don't emit heading ids)
                issues.append(f"{rel(f)} -> {ref} (no such anchor in target)")
    return (FAIL if issues else PASS), issues


def check_book_html_tracking():
    """Every tracked book/*.html is a page the current build produces (no stale orphans), present and
    non-empty. Blocks the renumber-orphan class (a chapter renumber leaves the old-numbered HTML tracked
    with no source) AND the generated-page-orphan class (a page the build writes outside chapter discovery,
    like the list of floats): the expected set is `build_book.expected_page_slugs()` — the build's OWN
    single source of truth for every page it writes — so it can't drift from what the build produces."""
    import subprocess
    import sys as _sys
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    book_dir = os.path.join(root, "book")
    if book_dir not in _sys.path:
        _sys.path.insert(0, book_dir)
    import build_book as bb  # noqa: E402 — path set above; build's discovery is the source of truth
    # `expected_page_slugs()` is the build's OWN single source of truth for every page it writes — chapter
    # + appendix discovery, generated front-matter (the list of floats), the index pages, and the figure
    # copy. Consuming it (not re-deriving here) is what keeps this test from missing a build-generated page.
    real = {s + ".html" for s in bb.expected_page_slugs()}
    tracked_paths = subprocess.run(
        ["git", "ls-files", "book/*.html"], cwd=root, capture_output=True, text=True
    ).stdout.split()
    tracked = {os.path.basename(p) for p in tracked_paths}
    issues = []
    for o in sorted(tracked - real):
        issues.append(f"book/{o}: tracked but the build does not produce it (stale orphan — git rm it)")
    for m in sorted(real - tracked):
        issues.append(f"book/{m}: a build output but not tracked (run `catalog.py build` and commit it)")
    for p in tracked_paths:
        ap = os.path.join(root, p)
        if not os.path.exists(ap):
            issues.append(f"{p}: tracked but missing on disk")
        elif os.path.getsize(ap) == 0:
            issues.append(f"{p}: tracked but empty")
    return (FAIL if issues else PASS), issues


#: The MAGE companion blog post (Medium). It is a deliberate LANDING/site link (the front-page learning
#: materials organize the ways in), but the HTML BOOK must not send an in-book reader back out to it — the
#: book is the authoritative long form. This host substring is the join key the gate below forbids inside
#: any book/*.html page.
_BLOG_HOST_IN_BOOK_FORBIDDEN = "davisjam.medium.com"


def check_book_no_blogpost_link():
    """No page of the HTML book links to the companion blog post. The book is the authoritative long form;
    once a reader is inside it, a call-to-action back to the Medium post is confusing (the front-page
    learning-materials section owns that hand-off now). Scans every built book/*.html for the blog host —
    a cheap, deterministic substring gate that keeps the link from creeping back into a book template or a
    chapter. The blog link elsewhere on the site (the landing 'Learn' section) is intentionally NOT in
    scope here — this gate is book-only."""
    import glob
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    book_glob = os.path.join(root, "book", "*.html")
    issues = []
    for f in sorted(glob.glob(book_glob)):
        try:
            text = open(f, encoding="utf-8").read()
        except OSError:
            continue
        if _BLOG_HOST_IN_BOOK_FORBIDDEN in text:
            issues.append(
                f"book/{os.path.basename(f)}: links to the blog post ({_BLOG_HOST_IN_BOOK_FORBIDDEN}) — "
                f"the HTML book must not send readers to it (fix the source in book/build_book.py, not the "
                f"generated HTML)")
    return (FAIL if issues else PASS), issues


class _IdCollector(HTMLParser):
    """Collects every element id (WITH repeats) so within-page duplicates can be found."""

    def __init__(self):
        super().__init__()
        self.ids: list[str] = []

    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if k == "id" and v:
                self.ids.append(v)


def check_no_duplicate_ids():
    """No built HTML page repeats an element id. Duplicate ids break in-page anchors, getElementById, and
    accessibility, and fail html-validate's `no-dup-id`. The usual source is inlined SVGs (mermaid or
    hand-authored) that carry a fixed id, so two figures on one page collide. This is the stdlib (Tier-1)
    twin of that CI-only Tier-2 check: it catches a collision LOCALLY, keeping every figure's ids a clean
    unique namespace."""
    from collections import Counter
    files = html_files()
    if not files:
        return FAIL, ["no built HTML found — run `catalog.py build` first"]
    issues = []
    for f in files:
        c = _IdCollector()
        c.feed(open(f, encoding="utf-8").read())
        counts = Counter(c.ids)
        for dup in sorted(i for i, n in counts.items() if n > 1):
            issues.append(f"{rel(f)}: duplicate element id {dup!r} ({counts[dup]}x)")
    return (FAIL if issues else PASS), issues


class _EmptyThFinder(HTMLParser):
    """Counts <th> elements whose text content is empty/whitespace-only (nested inline tags' text still
    counts). A comparison table's empty top-left corner cell is the usual source."""

    def __init__(self):
        super().__init__()
        self._depth = 0          # >0 while inside a <th> (th never nests, but inline children may)
        self._text: list[str] = []
        self.empty = 0

    def handle_starttag(self, tag, attrs):
        if tag == "th":
            self._depth += 1
            self._text = []

    def handle_data(self, data):
        if self._depth > 0:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag == "th" and self._depth > 0:
            self._depth -= 1
            if not "".join(self._text).strip():
                self.empty += 1


def check_no_empty_table_header():
    """No built page has an empty <th> (a header cell with no text). The stdlib (Tier-1) twin of axe's
    Tier-2 `empty-table-header`: a comparison table's empty top-left corner cell makes the header row
    unreadable to a screen reader. Deterministic and at EVERY push, where the sampled Tier-2 axe pass would
    catch it only when it happens to sample that page."""
    files = html_files()
    if not files:
        return FAIL, ["no built HTML found — run `catalog.py build` first"]
    issues = []
    for f in files:
        p = _EmptyThFinder()
        p.feed(open(f, encoding="utf-8").read())
        if p.empty:
            issues.append(f"{rel(f)}: {p.empty} empty <th> — label the header cell "
                          "(e.g. a comparison table's corner cell)")
    return (FAIL if issues else PASS), issues


def _book_md_files() -> list[str]:
    """Every book chapter-source markdown file. The `[data:]` markers and the `{#anchor}` heading ids live
    in the SOURCE markdown, not the rendered HTML, so the data-claims lint reads the source of truth
    directly. Globs all chapter dirs — frontmatter (Part 0), part6 (Reflections), and part7 (Back Matter
    apparatus, e.g. the colophon) hold real chapter files, not just part1-5; a part1-5-only glob would miss
    a data-claim living there."""
    import glob
    files: list[str] = []
    for sub in ("frontmatter", "part1", "part2", "part3", "part4", "part5", "part6", "part7"):
        files.extend(glob.glob(os.path.join(ROOT, "book", sub, "*.md")))
    return sorted(files)


_NUM_WORDS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}
_NUM_SCALES = {"hundred": 100, "thousand": 1000, "million": 1_000_000, "billion": 1_000_000_000}


def _words_to_int(phrase: str) -> int | None:
    """Convert a spelled-out English cardinal ("fifty-eight", "five thousand") to an int, so the loose
    `holds` match treats "58"/"fifty-eight" as the SAME number (a spelling change is fine) while a real
    number change still fails. Returns None when the phrase is not a number phrase."""
    tokens = re.split(r"[\s-]+", phrase.strip().lower())
    if not tokens or not all(t in _NUM_WORDS or t in _NUM_SCALES for t in tokens):
        return None
    total = 0
    current = 0
    for t in tokens:
        if t in _NUM_WORDS:
            current += _NUM_WORDS[t]
        elif t == "hundred":
            current = (current or 1) * 100
        else:  # thousand / million / billion
            total += (current or 1) * _NUM_SCALES[t]
            current = 0
    return total + current


_DATA_MARKER_RE = re.compile(r"\[data:\s*([a-z0-9-]+)\s*\]")
_HEADING_ANCHOR_RE = re.compile(r"^#{1,6}\s+.*\{#([A-Za-z0-9_-]+)\}\s*$", re.M)
# A run of digits (with optional thousands separators / decimal) followed by an optional unit word — the
# LOOSE token the holds-still-present check compares on. "58 files" and "fifty-eight files" differ in
# spelling (fine), but "58 files" -> "40 files" differs in the digit run (a real number change → fail).
_NUM_UNIT_RE = re.compile(r"[-−+]?\d[\d,\.]*\s*%?\s*[A-Za-z]*")


def _norm_num_unit(s: str) -> str:
    """Normalize a `holds` string to its comparable core: digits + a trailing unit word, lowercased,
    thousands-separators and whitespace stripped, and the unicode minus folded to ASCII. So "5,000 lines"
    and "5000 lines" match, "-20%"/"−20%" match, but "58 files"/"40 files" do NOT."""
    s = s.strip().lower().replace("−", "-").replace(",", "")
    m = re.match(r"([-+]?\d[\d\.]*\s*%?)\s*([a-z]*)", s)
    if not m:
        return re.sub(r"\s+", "", s)
    num = re.sub(r"\s+", "", m.group(1))
    unit = m.group(2)
    return num + unit


def check_data_claims():
    """AUDIT-ONLY governed data-cross-reference lint, keyed off `book/data/data-claims.json` (the SSOT).
    The DL4 cross-reference half (unchanged):
      (a) every `[data: <slug>]` marker in a book chapter resolves to a manifest entry;
      (b) each entry's `source` chapter file exists AND still contains a heading carrying `{#<anchor>}`;
      (c) each `holds` string still appears in the source chapter under a LOOSE digit+unit match (a
          number change fails; a digit->word spelling change does not);
      (d) a manifest entry that nothing cites is WARNed (wiring may be partial — not a hard fail).
    The W-LEDGER argumentative-chain half (DL1-DL3, delegated to the substantiation aggregator so the spine
    join lives in one place):
      DL1 — every datum's `spine_claim`/`spine_claims` resolves to a real argument-spine claim;
      DL2 — every datum carries a non-empty observable + data_source + limitation;
      DL3 — UNDERQUANTIFIED report: each quantifiable spine claim with zero bound data-claims (informational
            — the author's future-collection worklist; prefixed 'DL3 report', not a defect).
    Modelled on the book's `{{token}}`->metrics.json fail-loud mechanism; the build already fails loud on an
    unknown slug, so (a) is a belt-and-suspenders backstop. Non-gating during wiring (rule #55 audit-first)."""
    import json
    _bm = os.path.join(ROOT, "book-models")
    if _bm not in _sys.path:
        _sys.path.insert(0, _bm)
    manifest_path = os.path.join(ROOT, "book", "data", "data-claims.json")
    if not os.path.isfile(manifest_path):
        return PASS, ["no book/data/data-claims.json — nothing to check"]
    raw = json.load(open(manifest_path, encoding="utf-8"))
    claims = {k: v for k, v in raw.items() if not k.startswith("_")}
    md_files = _book_md_files()
    # Map source-slug -> its markdown text + the anchor ids it defines.
    by_slug: dict[str, tuple[str, set[str]]] = {}
    cited: set[str] = set()
    issues: list[str] = []
    for f in md_files:
        text = open(f, encoding="utf-8").read()
        stem = os.path.splitext(os.path.basename(f))[0]
        by_slug[stem] = (text, set(_HEADING_ANCHOR_RE.findall(text)))
        for m in _DATA_MARKER_RE.finditer(text):  # (a) every marker resolves
            slug = m.group(1)
            cited.add(slug)
            if slug not in claims:
                issues.append(f"{rel(f)}: [data: {slug}] has no entry in data-claims.json")
    for slug, entry in claims.items():
        src = entry.get("source", "")
        anchor = entry.get("anchor", "")
        if src not in by_slug:  # (b) source chapter exists
            issues.append(f"data-claims: {slug!r} source {src!r} is not a book chapter file")
            continue
        text, anchors = by_slug[src]
        if anchor and anchor not in anchors:  # (b) source still carries the anchor heading
            issues.append(f"data-claims: {slug!r} anchor {{#{anchor}}} not found as a heading id in {src}")
        norm_text = _norm_num_unit_haystack(text)
        for hold in entry.get("holds", []):  # (c) each holds string still present (loose)
            if _norm_num_unit(hold) not in norm_text:
                issues.append(f"data-claims: {slug!r} holds {hold!r} no longer appears in {src} "
                              f"(number may have changed — re-check the source)")
    for slug in sorted(set(claims) - cited):  # (d) uncited entry → warn (not a hard fail)
        issues.append(f"data-claims: WARN {slug!r} is in the manifest but nothing cites [data: {slug}] yet")
    # DL1 + DL2 — the argumentative chain (spine join + four-fields), delegated to the aggregator.
    import substantiation as _sub  # noqa: E402 — book-model aggregator; spine join lives in one place
    issues.extend(_sub.dl_findings())
    # DL3 — UNDERQUANTIFIED report (informational; the author's future-collection worklist, not a defect).
    for r in _sub.underquantified():
        issues.append(f"DL3 report: quantifiable claim {r.id!r} is UNDERQUANTIFIED (no data-claim bound yet)")
    return (FAIL if issues else PASS), issues


_WORD_NUM_UNIT_RE = re.compile(
    r"\b((?:(?:" + "|".join(list(_NUM_WORDS) + list(_NUM_SCALES)) + r")[\s-]*)+)([a-z]*)",
    re.I,
)


def _norm_num_unit_haystack(text: str) -> set[str]:
    """The set of normalized number+unit tokens present in a chapter's text — the haystack (c) searches.
    Captures BOTH digit-form ("5,000 lines" -> "5000lines") AND spelled-out-form ("fifty-eight files" ->
    "58files"), so a digit-form `holds` string matches spelled-out prose (spelling-agnostic) while a real
    number change still fails. Built once per source so each `holds` check is a set membership."""
    hay: set[str] = {_norm_num_unit(m.group(0)) for m in _NUM_UNIT_RE.finditer(text)}
    for m in _WORD_NUM_UNIT_RE.finditer(text):
        n = _words_to_int(m.group(1))
        if n is not None:
            unit = m.group(2).lower()
            hay.add(f"{n}{unit}")
    return hay


def _marker_keywords() -> tuple[str, ...]:
    """The build-time notation vocabulary — READ from its single source of truth in the build script
    (`build_book.MARKER_KEYWORDS`) so this gate can never drift from what the build defines. A new
    notation added there auto-extends this gate; there is NO second hand-maintained copy (CLAUDE.md rule
    #33: a stable check that reads the SSOT beats N hand-rolled lints)."""
    book_dir = os.path.join(ROOT, "book")
    if book_dir not in _sys.path:
        _sys.path.insert(0, book_dir)
    import build_book as bb  # noqa: E402 — path set above; the build owns the vocabulary
    return tuple(bb.MARKER_KEYWORDS)


def check_no_notation_leak():
    """WHOLE-VOCABULARY backstop: no build-time notation may survive into ANY served HTML page. The build
    consumes each notation and renders it to real HTML; if a marker is mis-placed (e.g. a `<!-- gloss-only …
    -->` glued to a prose paragraph with no blank line — the twice-shipped bug this gate closes), the
    markdown pass escapes it and it ships as visible `&lt;!-- … --&gt;` text. This gate fails on that class,
    keyed off the build's OWN vocabulary SSOT so it covers every marker, not just the one that leaked.

    Composes with (does NOT duplicate) `tests/book.py` rule 11 `check_no_raw_mermaid` — that guards
    un-rendered ```mermaid FENCES; this guards the marker-comment + `{{token}}` + `[+…+]` vocabulary.

    Three precise, keyword-scoped discriminators (NOT a blunt `<!--` / `{{` / `[+` scan — legitimate SVG
    structure comments, `<!-- noqa … -->`, the `GENERATED by catalog.py` banner, and any prose showing
    template syntax must NOT false-positive):
      (a) a marker-comment for a KNOWN vocabulary keyword, escaped (`&lt;!-- gloss …`) OR raw
          (`<!-- figure: …`). The keyword+boundary anchor is what excludes the banner and noqa comments.
      (b) an unresolved metric token `{{name}}` / macro `{{part:N}}` — the build fails loud on an unknown
          token, so any survivor means a token slipped a fence and shipped literally.
      (c) a leaked intra-word-emphasis span `[+X+]` — the build converts these to <em>; a survivor is a raw
          notation the reader sees.
    """
    files = html_files()
    if not files:
        return FAIL, ["no built HTML found — run `catalog.py build` first"]
    kws = _marker_keywords()
    if not kws:
        return FAIL, ["build_book.MARKER_KEYWORDS is empty — the vocabulary SSOT vanished"]
    kw_alt = "|".join(re.escape(k) for k in kws)
    # A marker comment for a known keyword, in EITHER shipped form: escaped (markdown-escaped visible text)
    # or raw (an un-consumed HTML comment). The trailing boundary (`:` arg-marker, or `-->`/whitespace for
    # the arg-less `glossary-auto`) keeps the match tight to the vocabulary and off same-prefixed prose.
    esc = rf"&lt;!--\s*(?:{kw_alt})(?:\s*:|\s+|&gt;|--&gt;)"
    raw = rf"<!--\s*(?:{kw_alt})(?:\s*:|\s+|-->)"
    marker_re = re.compile(f"(?:{esc})|(?:{raw})")
    token_re = re.compile(r"\{\{\s*(?:part:\d+|[a-z_][a-z0-9_]*)\s*\}\}")
    emph_re = re.compile(r"\[\+[^\]]+\+\]")
    issues = []
    for f in files:
        text = open(f, encoding="utf-8").read()
        # Strip inlined SVG first: figure SVGs carry legitimate structure comments (e.g.
        # `<!-- takeaway strip -->`, `<!-- takeaway -->` labelling a figure's takeaway band) that collide
        # with marker-vocabulary keywords once the vocabulary grows. Those are figure-authoring artifacts,
        # NOT un-rendered PROSE notation — the class this gate guards. (Mirrors the SVG strip in
        # check_summary_no_flow_content; safe because prose-notation leaks never live inside <svg>.)
        text = re.sub(r"<svg\b.*?</svg>", "", text, flags=re.S | re.I)
        for m in marker_re.finditer(text):
            issues.append(f"{rel(f)}: leaked notation marker {text[m.start():m.start()+60]!r}")
        for m in token_re.finditer(text):
            issues.append(f"{rel(f)}: unresolved metric token {m.group(0)!r}")
        for m in emph_re.finditer(text):
            issues.append(f"{rel(f)}: leaked intra-word emphasis {m.group(0)!r}")
    return (FAIL if issues else PASS), issues


def check_summary_no_flow_content():
    """No flow-content element (<div>, <p>, <section>, <ul>, <ol>, <figure>, <table>, ...) inside a
    <summary>: the <summary> content model is phrasing content (or a single heading), so a <div> under
    <summary> is invalid HTML — html-validate's `element-permitted-content` (a T2, CI-only rule). This is
    the stdlib (Tier-1) twin of that rule: it runs locally with no Node, so the class is caught before a
    push. The clickable-card landing shipped `<summary><span…` only after CI flagged `<summary><div…`;
    this closes that gap at Tier 1 (peer of `check_no_duplicate_ids`, the T1 twin of no-dup-id)."""
    files = html_files()
    if not files:
        return FAIL, ["no built HTML found — run `catalog.py build` first"]
    flow = ("div", "p", "section", "article", "aside", "header", "footer", "nav",
            "ul", "ol", "dl", "figure", "table", "form", "main", "blockquote")
    summary_re = re.compile(r"<summary\b[^>]*>(.*?)</summary>", re.S | re.I)
    issues = []
    for f in files:
        text = open(f, encoding="utf-8").read()
        # Scan only real body markup. Strip, first: <style>/<script> blocks (a CSS/JS doc-comment may
        # MENTION `<summary>`, derailing the non-greedy match), HTML comments (same reason), and inlined
        # SVG (a <foreignObject> may legitimately hold a <div> — foreign content, valid; html-validate
        # ignores it too). What's left is real flow content directly under a summary.
        text = re.sub(r"<(style|script)\b.*?</\1>", "", text, flags=re.S | re.I)
        text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
        text = re.sub(r"<svg\b.*?</svg>", "", text, flags=re.S | re.I)
        for m in summary_re.finditer(text):
            inner = m.group(1)
            for tag in flow:
                if re.search(rf"<{tag}\b", inner, re.I):
                    issues.append(f"{rel(f)}: <{tag}> inside <summary> — summary permits phrasing content only")
                    break
    return (FAIL if issues else PASS), issues


# ─────────────────────────── Concept model (concepts.json) — book↔site drift lints ──────────────
# A typed model of the book's core CONCEPTS and their realizations in the book (an `index-def` anchor)
# and on the site (a `card-<slug>` on the landing). Keyed by the SAME slug as the `- concept:` registry
# in index-terms.md — one join key, three surfaces. `book_home` and `name` are DERIVED (never stored):
# book_home from `_harvest_concept_tags`, name from `_load_concept_registry`, so neither can drift. The
# sidecar holds ONLY kind + site realization + status. Four checks join on slug and assert the surfaces
# resolve AND agree. Modelled verbatim on `check_data_claims` (the manifest+check precedent above); land
# AUDIT-ONLY (rule #55) — the seeding is SUPPOSED to surface gaps, which become the Phase-2 worklist.

_CONCEPT_KINDS = frozenset({"thesis", "axis", "family", "mechanism-class", "caveat", "core-construct"})
_CONCEPT_STATUSES = frozenset({"both", "book-only", "site-only", "book-expands-site-missing", "planned"})
# `kind`s whose site card is EXPECTED (L3 drift catch applies). A `caveat` legitimately has no card, and a
# `mechanism-class` may be book-deep/site-thin — both exempt from L3.
_SITE_ELIGIBLE_KINDS = frozenset({"thesis", "axis", "family"})
# `status` values that imply a book home (an `index-def` must exist) — L1's gate.
_BOOK_HOME_STATUSES = frozenset({"both", "book-only", "book-expands-site-missing"})
_CARD_ID_RE = re.compile(r'id="(card-[a-z0-9-]+)"')


def _concepts_path() -> str:
    return os.path.join(ROOT, "book", "data", "concepts.json")


def _load_concepts() -> tuple[dict, list[str], list[str]]:
    """Read `book/data/concepts.json` → `(records, site_only_cards, schema_issues)`.

    `records` = the {slug: record} entries (underscore-prefixed meta keys like `_note` /
    `_site_only_cards` stripped). `site_only_cards` = the L4 allowlist from the `_site_only_cards` meta
    key (navigation / adoption cards that legitimately back no concept). `schema_issues` folds the §6-R4
    enum PRE-CHECK: every record's `kind` ∈ _CONCEPT_KINDS and `status` ∈ _CONCEPT_STATUSES (the book's
    "typed enum over stringly-typed state" concept, dogfooded on the model itself). A stringly-typed
    drift here is a finding surfaced by L1's loader, before the join logic runs on a malformed record."""
    import json
    path = _concepts_path()
    if not os.path.isfile(path):
        return {}, [], []
    raw = json.load(open(path, encoding="utf-8"))
    site_only = list(raw.get("_site_only_cards", []))
    records = {k: v for k, v in raw.items() if not k.startswith("_")}
    schema_issues: list[str] = []
    for slug, rec in records.items():
        kind = rec.get("kind")
        status = rec.get("status")
        if kind not in _CONCEPT_KINDS:
            schema_issues.append(
                f"concepts: {slug!r} kind {kind!r} not in {sorted(_CONCEPT_KINDS)} (enum pre-check)")
        if status not in _CONCEPT_STATUSES:
            schema_issues.append(
                f"concepts: {slug!r} status {status!r} not in {sorted(_CONCEPT_STATUSES)} (enum pre-check)")
    return records, site_only, schema_issues


def _harvested_book_homes() -> dict[str, tuple[str, str]]:
    """{slug: (page_slug, anchor_id)} for every concept the book actually TAGGED with `<!-- index-def:
    slug -->`, derived from the build's own `_harvest_concept_tags` over its OWN chapter discovery
    (`_load_metrics` + `_discover_chapters` + `build_appendix_chapters` — the same call sequence build()
    uses). This is `book_home` — computed, never stored in concepts.json, so it cannot drift from prose."""
    book_dir = os.path.join(ROOT, "book")
    if book_dir not in _sys.path:
        _sys.path.insert(0, book_dir)
    import build_book as bb  # noqa: E402 — path set above; the build owns concept harvesting
    metrics = bb._load_metrics()
    chapters = bb._discover_chapters(metrics)
    if chapters:
        max_part = max(c["part"] for c in chapters)
        chapters = chapters + bb.build_appendix_chapters(next_part=max_part + 1)
    reg, _page_maps = bb._harvest_concept_tags(chapters)
    homes: dict[str, tuple[str, str]] = {}
    for slug, slot in reg.items():
        d = slot.get("def")
        if d is not None:
            pg, anchor = d
            page_slug = pg["slug"] if isinstance(pg, dict) else str(pg)
            homes[slug] = (page_slug, anchor)
    return homes


def _landing_card_ids() -> set[str]:
    """Every `id="card-…"` on the built landing page (index.html) — the site realizations the concept
    model joins against. Reuses the shipped HTML rather than re-deriving; L2/L4 both read this set."""
    idx = os.path.join(ROOT, "index.html")
    if not os.path.isfile(idx):
        return set()
    return set(_CARD_ID_RE.findall(open(idx, encoding="utf-8").read()))


def check_concepts_book_home():
    """L1 — book-home presence + §6-R4 enum pre-check. Keyed off `book/data/concepts.json`. For every
    concept whose `status` implies a book home ({both, book-only, book-expands-site-missing}), the derived
    `book_home` (from `_harvest_concept_tags`) MUST resolve — the concept's defining paragraph is actually
    tagged `<!-- index-def: slug -->`. FAILS when a concept claims a book home but no index-def exists
    ("registered + in the model, but never tagged in prose" — the reverse the build's own fail-loud can't
    catch). Folds the enum pre-check (kind/status membership) so a malformed record surfaces here too.
    AUDIT-ONLY (rule #55) — seeding surfaces real gaps that become the Phase-2 drain worklist."""
    records, _site_only, schema_issues = _load_concepts()
    if not records:
        return PASS, ["no book/data/concepts.json — nothing to check"]
    homes = _harvested_book_homes()
    issues = list(schema_issues)
    for slug, rec in records.items():
        if rec.get("status") in _BOOK_HOME_STATUSES and slug not in homes:
            issues.append(
                f"concepts: {slug!r} status {rec.get('status')!r} implies a book home but no "
                f"`<!-- index-def: {slug} -->` is tagged in any chapter (derived book_home unresolved)")
    return (FAIL if issues else PASS), issues


def check_concepts_site_home():
    """L2 — site-home presence. Every concept whose `site_home` is a `card-<slug>` value resolves to an
    `id="card-<slug>"` on the built landing (index.html). FAILS when a declared card is absent (a card
    renamed/removed out from under a concept). `N/A` / `MISSING` site_home values are NOT cards and are
    skipped here (they are L3's concern). Reuses the landing id-scan. AUDIT-ONLY (rule #55)."""
    records, _site_only, _schema = _load_concepts()
    if not records:
        return PASS, ["no book/data/concepts.json — nothing to check"]
    cards = _landing_card_ids()
    issues: list[str] = []
    for slug, rec in records.items():
        site = rec.get("site_home", "")
        if site.startswith("card-") and site not in cards:
            issues.append(
                f"concepts: {slug!r} site_home {site!r} does not resolve to an id on the landing "
                f"(index.html) — card renamed or removed")
    return (FAIL if issues else PASS), issues


def check_concepts_drift():
    """L3 — the DRIFT catch (the headline lint). For every concept whose `kind` is site-eligible
    ({thesis, axis, family} — NOT caveat, NOT mechanism-class) and whose `status` is `both`, its
    `site_home` MUST be a real `card-<slug>` that resolves on the landing. A concept whose book treatment
    exists but whose `site_home` is `MISSING`/`N/A` while `status: both` claims a site presence FAILS —
    this is the "book expands it, the site has no card" catch (the generative-validation / 2.2-caveat
    class turned into a control). `status` ∈ {book-only, book-expands-site-missing} DECLARE the gap and
    PASS (the model records the asymmetry deliberately). AUDIT-ONLY (rule #55) — the drift exemplars in
    the seed are meant to report here."""
    records, _site_only, _schema = _load_concepts()
    if not records:
        return PASS, ["no book/data/concepts.json — nothing to check"]
    cards = _landing_card_ids()
    issues: list[str] = []
    for slug, rec in records.items():
        if rec.get("kind") not in _SITE_ELIGIBLE_KINDS:
            continue
        if rec.get("status") != "both":
            continue  # book-only / book-expands-site-missing DECLARE the gap → pass
        site = rec.get("site_home", "")
        if not (site.startswith("card-") and site in cards):
            issues.append(
                f"concepts: DRIFT {slug!r} (kind={rec.get('kind')}, status=both) claims a site presence "
                f"but site_home {site!r} is not a resolvable card — either add the card (close the drift) "
                f"or re-declare status book-only / book-expands-site-missing (declare it deliberate)")
    return (FAIL if issues else PASS), issues


def check_concepts_reverse_coverage():
    """L4 — reverse coverage (WARN, stays a warn). Every `id="card-<slug>"` on the landing has a backing
    concept in `concepts.json` (join by the `card-` suffix). WARNs on a site card with no concept — a
    site framing that owes a model entry. Kept a warn because navigation / adoption cards (quick-start,
    references, template-download) legitimately have no concept; the `_site_only_cards` allowlist in the
    sidecar suppresses those. AUDIT-ONLY — never gates."""
    records, site_only, _schema = _load_concepts()
    cards = _landing_card_ids()
    if not cards:
        return PASS, ["no landing index.html — nothing to check"]
    allow = set(site_only)
    modeled = {rec.get("site_home") for rec in records.values()}
    # A card is backed if its exact id is a declared site_home, OR its `card-<slug>` suffix matches a
    # modeled slug (the naming-convention join), OR it is an allowlisted navigation/adoption card.
    modeled_slugs = set(records)
    issues: list[str] = []
    for card in sorted(cards):
        slug = card[len("card-"):]
        if card in allow or card in modeled or slug in modeled_slugs:
            continue
        issues.append(
            f"concepts: WARN landing card {card!r} has no backing concept in concepts.json "
            f"(add a record, or allowlist it in _site_only_cards if it is a navigation/adoption card)")
    # L4 is a warn: report findings but never FAIL.
    return PASS, issues


def check_concepts_hierarchy():
    """L5 — the concept HIERARCHY's cross-refs resolve (audit-only). The `_hierarchy` meta block in
    concepts.json is the SSOT for the book's conceptual structure (the core-concepts capstone): six
    ordered levels, each naming construct slugs and the argument-spine claim ids it reconciles with, plus
    the two theses as relations. This check joins it against its two substrates and asserts:
      (a) every `constructs` / `relations` / `joins` / `core_constructs` slug resolves to a concept
          record (or, for the thesis relations, a record of kind `thesis`);
      (b) every `spine_claims` id resolves to a spine claim in book-models/argument-spine.json;
      (c) the levels' `order` runs exactly 1..N.
    A dangling slug means the hierarchy and its substrate models have drifted apart — the same failure
    class AS3 catches for the spine's own links. AUDIT-ONLY (rule #55 landing discipline)."""
    import json as _json
    path = _concepts_path()
    if not os.path.isfile(path):
        return PASS, ["no book/data/concepts.json — nothing to check"]
    raw = _json.load(open(path, encoding="utf-8"))
    hierarchy = raw.get("_hierarchy")
    if not hierarchy:
        return PASS, ["no _hierarchy block — nothing to check"]
    records = {k for k in raw if not k.startswith("_")}
    spine_path = os.path.join(ROOT, "book-models", "argument-spine.json")
    spine_ids: set[str] = set()
    if os.path.isfile(spine_path):
        spine = _json.load(open(spine_path, encoding="utf-8"))
        spine_ids = {s.get("id") for s in spine.get("spine", [])}
    issues: list[str] = []
    orders: list[int] = []
    for lvl in hierarchy.get("levels", []):
        name = lvl.get("level", "?")
        orders.append(lvl.get("order", 0))
        for slug in list(lvl.get("constructs", [])) + list(lvl.get("relations", [])):
            if slug not in records:
                issues.append(f"concepts: L5 hierarchy level {name!r} names {slug!r} — no concept record")
        for sid in lvl.get("spine_claims", []):
            if spine_ids and sid not in spine_ids:
                issues.append(f"concepts: L5 hierarchy level {name!r} cites spine claim {sid!r} — no such spine id")
    for slug in (hierarchy.get("core_constructs") or {}):
        if not slug.startswith("_") and slug not in records:
            issues.append(f"concepts: L5 core_constructs names {slug!r} — no concept record")
    for rel in hierarchy.get("relations", []):
        for slug in [rel.get("thesis")] + list(rel.get("joins", [])):
            if slug and slug not in records:
                issues.append(f"concepts: L5 relation names {slug!r} — no concept record")
    if orders != list(range(1, len(orders) + 1)):
        issues.append("concepts: L5 hierarchy levels' `order` is not exactly 1..N contiguous")
    # (d) the substrate derivation (directive 260802 Task 6): properties → consequences → theses/GEE.
    #     Same join discipline as (a)-(c): every id resolves against its substrate, so the derivation
    #     cannot silently drift from the records or the spine it reconciles with.
    sub = hierarchy.get("substrate_derivation") or {}
    prop_ids: list[str] = []
    for prop in sub.get("properties", []):
        pid = prop.get("id", "?")
        prop_ids.append(pid)
        if prop.get("group") not in ("foundation-model", "harness"):
            issues.append(f"concepts: L5 substrate property {pid!r} group {prop.get('group')!r} "
                          "not in (foundation-model, harness)")
    if len(prop_ids) != len(set(prop_ids)):
        issues.append("concepts: L5 substrate property ids are not unique")
    prop_set = set(prop_ids)
    for row in list(sub.get("consequences", [])) + list(sub.get("derives", [])):
        label = row.get("id") or row.get("target") or "?"
        for pid in list(row.get("from", [])) + list(row.get("from_properties", [])):
            if pid not in prop_set:
                issues.append(f"concepts: L5 substrate row {label!r} cites {pid!r} — no such substrate property")
        for slug in [row.get("target")] + list(row.get("combines", [])):
            if slug and slug not in records:
                issues.append(f"concepts: L5 substrate row {label!r} names {slug!r} — no concept record")
        for sid in row.get("spine_claims", []):
            if spine_ids and sid not in spine_ids:
                issues.append(f"concepts: L5 substrate row {label!r} cites spine claim {sid!r} — no such spine id")
    return (FAIL if issues else PASS), issues


# ─────────────────── Site-as-projection: definitions + outcomes drift lints ──────────────────────
# The site is a DERIVED VIEW of the book's typed models. Two model surfaces are projected onto the
# landing and owe a drift check that they stay a FAITHFUL projection — the concept-model L1–L4 shape
# (book/data/concepts.json ↔ the concept cards) extended to the DEFINITIONS and the OUTCOMES view:
#   - definitions: book/data/definitions.json  ↔  the landing's `id="def-<slug>"` cards.
#   - outcomes:    book-models/outcomes.json (filtered by book/data/outcomes-site.json's selection)
#                  ↔  the landing's `id="outcome-<...>"` rows inside `id="outcomes-view"`.
# Each check joins SITE↔MODEL and asserts both directions: every site element traces to a model element,
# and every model element the site claims to project actually renders. Lands AUDIT-ONLY-first (the repo's
# blocking-lint landing discipline) — the definitions' book home is still OWED, so these seed real gaps.
# Design: book-models/SITE-VIEW.md §"the drift check". Precedent: check_concepts_* above.

def _definitions_path() -> str:
    return os.path.join(ROOT, "book", "data", "definitions.json")


def _outcomes_site_path() -> str:
    return os.path.join(ROOT, "book", "data", "outcomes-site.json")


def _outcomes_model_path() -> str:
    return os.path.join(ROOT, "book-models", "outcomes.json")


def _landing_all_ids() -> set[str]:
    """Every `id="…"` on the built landing (index.html) — the site realizations the projection lints
    join against. Reuses the shipped HTML rather than re-deriving. Unlike `_landing_card_ids` (which is
    scoped to `card-…`), this returns ALL ids, because definition cards use `def-…` and outcome rows use
    `outcome-…`."""
    idx = os.path.join(ROOT, "index.html")
    if not os.path.isfile(idx):
        return set()
    return set(re.findall(r'\bid="([a-z0-9][a-z0-9-]*)"', open(idx, encoding="utf-8").read()))


def _load_json(path: str):
    import json
    if not os.path.isfile(path):
        return None
    return json.load(open(path, encoding="utf-8"))


def check_definitions_site():
    """The DEFINITIONS projection drift catch. book/data/definitions.json is the model; the landing's
    `id="def-<slug>"` cards are the projection. Asserts BOTH directions:
      (a) MODEL→SITE — every definition record's `site_home` (default `def-<slug>`) resolves to a real
          id on the built landing (index.html). A definition in the model that the site does not render
          is a finding.
      (b) SITE→MODEL — every `id="def-<slug>"` on the landing has a backing record in the model. A site
          definition with no model element is a finding (the reverse — an unbacked site framing).
    The OWED book home is NOT gated here (the Part-2 Definitions section is drafted, not landed —
    `book_home_owed.status: owed`); this check only pins the site↔model projection. AUDIT-ONLY-first."""
    raw = _load_json(_definitions_path())
    if not raw:
        return PASS, ["no book/data/definitions.json — nothing to check"]
    records = {k: v for k, v in raw.items() if not k.startswith("_")}
    # BOOK-ONLY definitions (site_home "N/A" — the core-construct insets) declare no site presence, so
    # the model→site direction skips them; their book home is held by the concepts model's L1 instead.
    records = {k: v for k, v in records.items() if v.get("site_home") != "N/A"}
    ids = _landing_all_ids()
    issues: list[str] = []

    def _def_home(slug, rec):
        return rec.get("site_home", f"def-{slug}")

    modeled_homes = {_def_home(s, r) for s, r in records.items()}
    # (a) MODEL→SITE — the shared projection-drift core (rule #11 DRY; same helper check_big_ideas calls).
    for slug, site in catalog.projection_drift(records, ids, _def_home):
        issues.append(
            f"definitions: {slug!r} site_home {site!r} does not resolve to an id on the landing "
            f"(index.html) — the definition is modeled but not projected (rebuild, or fix site_home)")
    # (b) SITE→MODEL
    for site_id in sorted(i for i in ids if i.startswith("def-")):
        if site_id not in modeled_homes:
            issues.append(
                f"definitions: landing has id {site_id!r} with no backing record in definitions.json "
                f"(add a record, or remove the unbacked site definition)")
    return (FAIL if issues else PASS), issues


def check_outcomes_site():
    """The OUTCOMES projection drift catch. The site's learning-outcomes view is a projection of
    book-models/outcomes.json, selected by book/data/outcomes-site.json. Asserts:
      (a) SELECTION VALID — every `outcome_id` in the selection's `projected` list resolves to a real
          outcome in outcomes.json (no dangling selection — an id the drain renamed/removed).
      (b) POLICY HONEST — every book/Part outcome in outcomes.json that the `_selection_policy` WOULD
          select (granularity ∈ {book, part}, provenance ∉ {gap-recommended}) is either projected OR
          listed in `_excluded`. A core outcome silently dropped from the site is a finding — the
          projection must be COMPLETE over its declared policy, not a hand-picked subset.
      (c) SITE→MODEL — every selected+resolvable outcome renders as an `id="outcome-<...>"` row on the
          landing (index.html), so the projection actually reached the page.
    AUDIT-ONLY-first. This dogfoods the outcomes model's own coverage discipline onto the site slice."""
    site = _load_json(_outcomes_site_path())
    model = _load_json(_outcomes_model_path())
    if not site or not model:
        return PASS, ["no outcomes-site.json / outcomes.json — nothing to check"]
    by_id = {o["outcome_id"]: o for o in model.get("outcomes", []) if o.get("outcome_id")}
    projected = list(site.get("projected", []))
    excluded = set(site.get("_excluded", []))
    policy = site.get("_selection_policy", {})
    gran_in = set(policy.get("granularity_in", []))
    prov_out = set(policy.get("provenance_not_in", []))
    ids = _landing_all_ids()
    issues: list[str] = []
    # (a) SELECTION VALID
    for oid in projected:
        if oid not in by_id:
            issues.append(
                f"outcomes-site: projected {oid!r} does not resolve to an outcome in outcomes.json "
                f"(the outcomes drain renamed/removed it — re-select or drop it)")
    # (b) POLICY HONEST — every policy-eligible book/part outcome is projected or explicitly excluded.
    projected_set = set(projected)
    for oid, o in by_id.items():
        if o.get("granularity") in gran_in and o.get("provenance") not in prov_out:
            if oid not in projected_set and oid not in excluded:
                issues.append(
                    f"outcomes-site: {oid!r} (granularity={o.get('granularity')}, "
                    f"provenance={o.get('provenance')}) matches the selection policy but is neither "
                    f"projected nor listed in _excluded — a core outcome silently dropped from the site")
    # (c) SITE→MODEL — each resolvable selected outcome renders a row on the landing.
    for oid in projected:
        if oid not in by_id:
            continue  # already reported in (a)
        row_id = "outcome-" + re.sub(r"[^a-z0-9]+", "-", oid.lower()).strip("-")
        if row_id not in ids:
            issues.append(
                f"outcomes-site: projected {oid!r} has no rendered row (expected id {row_id!r}) on the "
                f"landing (index.html) — rebuild, or the projection dropped it")
    return (FAIL if issues else PASS), issues


def _models_view_path() -> str:
    return os.path.join(ROOT, "book-models", "models-view.html")


# DPUB-ARIA reference roles whose superclass in the spec is `link` — they are meaningful only on a real
# navigable link (`<a href>`). axe's `aria-allowed-role` rejects any of them on a generic element (the
# ~88s browser pass that once blocked a publish when the note-marker renderer put `doc-noteref` on a bare
# `<sup>`). This deterministic stdlib twin catches the whole class at Tier-1 speed, so a regression cannot
# reach the axe pass. Closed set — extend only if the DPUB-ARIA spec adds another link-derived role.
_LINK_ONLY_DPUB_ROLES = frozenset({"doc-backlink", "doc-biblioref", "doc-glossref", "doc-noteref"})


class _DpubRoleRefs(HTMLParser):
    """Collects (tag, role, line) for every element carrying a link-only DPUB-ARIA role."""

    def __init__(self):
        super().__init__()
        self.hits: list[tuple[str, str, int]] = []

    def handle_starttag(self, tag, attrs):
        role = dict(attrs).get("role")
        if role in _LINK_ONLY_DPUB_ROLES:
            self.hits.append((tag, role, self.getpos()[0]))


def check_no_link_dpub_role_on_nonanchor():
    """No link-derived DPUB-ARIA role (`doc-noteref`, `doc-biblioref`, `doc-glossref`, `doc-backlink`) sits
    on a non-`<a>` element. Those roles' spec superclass is `link`, so axe's `aria-allowed-role` rejects
    them anywhere but a navigable link — a deterministic Tier-1 twin of that ~88s browser check, guarding
    the note/citation-marker renderers against regressing the class that once blocked a publish."""
    files = html_files()
    if not files:
        return FAIL, ["no built HTML found — run `catalog.py build` first"]
    issues: list[str] = []
    for f in files:
        p = _DpubRoleRefs()
        p.feed(open(f, encoding="utf-8").read())
        for tag, role, line in p.hits:
            if tag != "a":
                issues.append(f"{rel(f)}:{line} -> role=\"{role}\" on <{tag}> "
                              f"(link-only DPUB role belongs on <a>, not <{tag}>)")
    return (FAIL if issues else PASS), issues


class _H1Collector(HTMLParser):
    """Collects the line number of every `<h1>` on a page, so the check can report both the count and
    where each one sits."""

    def __init__(self):
        super().__init__()
        self.lines: list[int] = []

    def handle_starttag(self, tag, attrs):
        if tag == "h1":
            self.lines.append(self.getpos()[0])


def check_exactly_one_h1_per_page():
    """BLOCKING: every built content HTML page carries EXACTLY ONE `<h1>`. The stdlib (Tier-1) twin of
    axe's Tier-2 `page-has-heading-one` — a `page-has-heading-one` failure (a page shipped with no `<h1>`)
    broke CI twice; this catches the class deterministically at every push, before the slow browser pass
    samples it.

    `exactly one` (not merely `at least one`) also catches a sibling defect axe's rule alone misses: a
    page that emits a SECOND `<h1>` — a duplicated chapter-title heading, or a section heading pitched one
    level too high — still satisfies `page-has-heading-one` but breaks the page's outline for
    screen-reader heading navigation.

    Landed AUDIT-ONLY-first (rule #55): the pre-existing offenders (a book chapter's auto-emitted
    `<h1>{title}</h1>` header followed by a duplicate hand-authored `# <title>`, or a hand-authored page
    whose section headings were pitched at h1 instead of h2) were drained to 0 by a fix-wave, so this is
    now promoted to BLOCKING and every built page must clear it."""
    files = html_files()
    if not files:
        return FAIL, ["no built HTML found — run `catalog.py build` first"]
    issues: list[str] = []
    for f in files:
        issue = _h1_issue(open(f, encoding="utf-8").read(), rel(f))
        if issue:
            issues.append(issue)
    return (FAIL if issues else PASS), issues


def _h1_issue(html_text: str, name: str) -> str | None:
    """Pure per-page `<h1>`-arity decision — the unit-testable seam of `check_exactly_one_h1_per_page`.
    Returns the issue string when `name` does not carry EXACTLY ONE `<h1>` (zero, or two-or-more), else
    None. Extracting the decision lets a failure-injection self-test exercise the real code on synthetic
    input without a built tree on disk."""
    p = _H1Collector()
    p.feed(html_text)
    if not p.lines:
        return f"{name}: no <h1> — every content page needs exactly one top-level heading"
    if len(p.lines) > 1:
        at = ", ".join(f"line {n}" for n in p.lines)
        return f"{name}: {len(p.lines)} <h1> elements ({at}) — expected exactly one"
    return None


def check_exactly_one_h1_selftest():
    """Failure-injection self-test for the BLOCKING one-`<h1>`-per-page check's decision seam (`_h1_issue`).
    A promoted BLOCKING check that silently degrades to a no-op (e.g. a future refactor stops feeding the
    parser) would go green forever; this injects the exact defects the check exists to catch and asserts it
    still flags them: a page with a SECOND `<h1>` and a page with NONE both raise, while a well-formed
    single-`<h1>` page passes clean."""
    problems: list[str] = []
    one = _h1_issue("<html><body><h1>Title</h1><h2>Section</h2><p>body</p></body></html>", "single.html")
    if one is not None:
        problems.append(f"single-<h1> page was flagged (check over-fires): {one!r}")
    two = _h1_issue("<html><body><h1>Title</h1><p>body</p><h1>Second title</h1></body></html>", "double.html")
    if two is None:
        problems.append("two-<h1> page was NOT flagged — the BLOCKING check has degraded to a no-op")
    elif "2 <h1> elements" not in two:
        problems.append(f"two-<h1> page flagged with an unexpected message: {two!r}")
    if _h1_issue("<html><body><h2>Section</h2><p>body</p></body></html>", "none.html") is None:
        problems.append("zero-<h1> page was NOT flagged — the BLOCKING check has degraded to a no-op")
    return (FAIL if problems else PASS), problems


def check_one_h1_per_served_source():
    """BLOCKING source-side twin of check_exactly_one_h1_per_page, immune to the
    case-collision blind spot. The rendered-file check reads built `.html` via `os.walk`,
    which on a case-INSENSITIVE filesystem (macOS) coalesces a `X.html`/`x.html` pair into
    one dirent — so a page whose built HTML was SHADOWED (INDEX.md -> INDEX.html landing on
    the same inode as index.html) is never read, and a multi-`<h1>` regression there goes
    green locally while breaking case-sensitive CI. This renders each served markdown and
    counts its `<h1>`s from the SOURCE (never shadowed), reusing the real render path, so
    every served page's h1 arity is checked on either filesystem. `_page()` injects no
    title `<h1>`, so a source `# ` maps 1:1 to a rendered `<h1>`."""
    issues: list[str] = []
    for src in catalog.catalogue_md_files():
        issue = _h1_issue(catalog.render_md(open(src, encoding="utf-8").read()), rel(src))
        if issue:
            issues.append(issue)
    return (FAIL if issues else PASS), issues


def check_one_h1_per_served_source_selftest():
    """Failure-injection self-test for the source-side twin: a served markdown that renders
    a SECOND `<h1>` — the exact class os.walk shadows on macOS — must still be flagged, so a
    future refactor cannot silently degrade the twin to a green no-op."""
    problems: list[str] = []
    two = _h1_issue(catalog.render_md("# Census\n\n## Family\n\n# Oops second h1\n"), "INDEX.md")
    if two is None:
        problems.append("2-<h1> served source was NOT flagged — the source-side twin degraded to a no-op")
    elif "2 <h1> elements" not in two:
        problems.append(f"2-<h1> source flagged with an unexpected message: {two!r}")
    one = _h1_issue(catalog.render_md("# Census\n\n## Family\n\npara\n"), "INDEX.md")
    if one is not None:
        problems.append(f"single-<h1> source was flagged (twin over-fires): {one!r}")
    return (FAIL if problems else PASS), problems


def check_models_view_site():
    """The MODELS-VIEW projection drift catch. book-models/models-view.html is a browsable HTML rendering
    of the book models (outline + outcomes), regenerated by book-models/render_models_view.py. Like the
    site landing, the page is a PROJECTION — re-running the renderer must reproduce it byte-for-byte.
    Asserts:
      (a) FRESHNESS — the committed models-view.html equals a fresh render from the CURRENT models
          (outline.json + outcomes.json). A stale page (model regenerated, view not) is a finding. This
          also subsumes structural drift: the renderer reads the artifacts, so a rendered section/chapter
          cannot reference a node the models do not contain.
      (b) COMPLETENESS — the render is non-trivial (has the outcome + section markup), so a silently
          emptied model or a broken render reddens rather than passing green.
    AUDIT-ONLY-first (surfaced by `catalog.py views-audit`), mirroring the definitions/outcomes checks."""
    bm = os.path.join(ROOT, "book-models")
    if bm not in _sys.path:
        _sys.path.insert(0, bm)
    path = _models_view_path()
    if not os.path.isfile(path):
        return FAIL, ["models-view: book-models/models-view.html missing — run "
                      "`python3 book-models/render_models_view.py regenerate`"]
    try:
        import render_models_view as rmv  # noqa: E402 — audit-time only
    except Exception as exc:  # pragma: no cover — import failure is itself the finding
        return FAIL, [f"models-view: could not import render_models_view ({exc})"]
    issues: list[str] = []
    try:
        fresh = rmv.render_html()
    except SystemExit as exc:
        # A missing/mid-regeneration model artifact — report, do not crash the audit.
        return PASS, [f"models-view: model artifacts not ready to render ({exc}) — skipped"]
    stored = open(path, encoding="utf-8").read()
    if fresh != stored:
        issues.append("models-view: models-view.html is STALE — the book models changed but the view was "
                      "not regenerated (run `python3 book-models/render_models_view.py regenerate`)")
    # (b) COMPLETENESS — a real render carries section + outcome markup.
    if 'class="section' not in fresh or 'class="outcomes"' not in fresh:
        issues.append("models-view: render produced no sections/outcomes — the source models look empty "
                      "or the renderer is broken")
    return (FAIL if issues else PASS), issues
