#!/usr/bin/env python3
"""Render every reference in `book/references.bib` to Chicago strings ONCE, through Typst's own
bibliography engine (Hayagriva), and write `book/data/citations.json`.

WHY ONE ENGINE.  The bib is the single source of truth; the residual risk is *formatting drift* across
the two surfaces (HTML web book + Typst PDF). If each surface ran its own CSL processor, the same data +
same style name could render two different strings. So Chicago is rendered exactly once here — through
Typst — and BOTH surfaces consume the one artifact this writes (the HTML build reads it with stdlib
`json`; the PDF build renders the same `.bib` natively, whose output equals these strings). See
`book/_design/bibliography-subsystem-260801.md` §2-§3.

ROUTE (Phase-1 verdict, 2026-08-01).  `typst compile --features html` of a per-key bibliography-only
document. The Hayagriva CLI (the design's primary candidate) ships no prebuilt binary — installing it
would add a Rust toolchain to CI — whereas this route reuses the Typst binary already pinned in the Pages
workflow, so the clone-and-run / no-new-dependency promise holds. Typst flags HTML export experimental,
but the input is a tiny author-controlled reference list and the output is byte-checked into the two
surfaces by the CITE-PARITY gate.

CLONE-AND-RUN.  This is a dev/CI-time tool, NOT on `catalog.py`'s path. It needs the Typst binary (a
download, like the mermaid CLI), never a pip package. `catalog.py` only ever reads the committed JSON.

Exit codes (subprocess convention): 0 = success, 1 = runtime error, 2 = missing dependency (Typst).
"""
from __future__ import annotations

import datetime
import hashlib
import json
import pathlib
import re
import html as _html
import shutil
import subprocess
import sys
import tempfile
from html.parser import HTMLParser

HERE = pathlib.Path(__file__).resolve().parent
BIB_PATH = HERE / "references.bib"
OUT_PATH = HERE / "data" / "citations.json"
STYLE = "chicago-notes"


# ─────────────────────────── BibTeX parsing (stdlib) ───────────────────────────

_ENTRY_RE = re.compile(r"@(\w+)\s*\{\s*([^,\s]+)\s*,(.*?)\n\}", re.S)
_FIELD_RE = re.compile(r"(\w+)\s*=\s*", re.S)


def _strip_braces(v: str) -> str:
    v = v.strip().rstrip(",").strip()
    # Peel one layer of {…} or "…" wrappers, then any inner protective braces used for names/accents.
    while len(v) >= 2 and ((v[0] == "{" and v[-1] == "}") or (v[0] == '"' and v[-1] == '"')):
        v = v[1:-1].strip()
    return v.replace("{", "").replace("}", "").replace("\\&", "&").strip()


def _parse_fields(body: str) -> dict[str, str]:
    """Parse a `key = {value},` field body into a dict. Values may be brace- or quote-delimited and may
    contain commas/newlines; we scan by tracking brace depth from each `key =` to its balanced close."""
    fields: dict[str, str] = {}
    i = 0
    for m in _FIELD_RE.finditer(body):
        if m.start() < i:
            continue
        key = m.group(1).lower()
        j = m.end()
        while j < len(body) and body[j] in " \t\n":
            j += 1
        if j >= len(body):
            break
        if body[j] == "{":
            depth = 0
            k = j
            while k < len(body):
                if body[k] == "{":
                    depth += 1
                elif body[k] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                k += 1
            raw = body[j:k + 1]
            i = k + 1
        elif body[j] == '"':
            k = body.index('"', j + 1)
            raw = body[j:k + 1]
            i = k + 1
        else:  # bare token up to the next comma
            k = body.find(",", j)
            if k == -1:
                k = len(body)
            raw = body[j:k]
            i = k
        fields[key] = _strip_braces(raw)
    return fields


def _split_authors(raw: str) -> list[dict[str, str]]:
    """`Winters, Titus and Manshreck, Tom` / `Erich Gamma and Richard Helm` → [{family, given}, …].
    A `{Wikipedia}`-style single-token corporate author becomes {family: name, given: ""}."""
    out: list[dict[str, str]] = []
    for name in re.split(r"\s+and\s+", raw.strip()):
        name = name.strip()
        if not name:
            continue
        if "," in name:
            family, given = (p.strip() for p in name.split(",", 1))
        elif " " in name:
            parts = name.rsplit(" ", 1)
            given, family = parts[0].strip(), parts[1].strip()
        else:
            family, given = name, ""
        out.append({"family": family, "given": given})
    return out


def parse_bib(text: str) -> list[dict]:
    """Parse references.bib → an ordered list of {key, type, fields, csl}. Order is file order (stable)."""
    entries: list[dict] = []
    for m in _ENTRY_RE.finditer(text):
        etype, key, body = m.group(1).lower(), m.group(2).strip(), m.group(3)
        fields = _parse_fields(body)
        authors = _split_authors(fields.get("author", ""))
        # The csl record feeds the Highwire `citation_reference` meta tags (build_book._highwire_reference),
        # so the container must fall through the fields each entry type actually carries — @misc uses
        # `howpublished`, @techreport `institution`, @online `organization`, @phdthesis `school`. `note` is
        # deliberately excluded: it is commentary, not a container/venue.
        container = (fields.get("journal") or fields.get("publisher") or fields.get("booktitle")
                     or fields.get("howpublished") or fields.get("institution")
                     or fields.get("organization") or fields.get("school") or "")
        csl = {
            "type": etype,
            "title": fields.get("title", ""),
            "author": authors,
            "year": fields.get("year", ""),
            "container": container,
            "url": fields.get("url", ""),
            "doi": fields.get("doi", ""),
        }
        entries.append({"key": key, "type": etype, "fields": fields, "csl": csl})
    return entries


# ─────────────────────────── HTML fragment normalization ───────────────────────────

class _FragmentCleaner(HTMLParser):
    """Normalize a Typst-emitted reference fragment: drop the leading `<sup role="doc-backlink">…</sup>`
    (the endnote's back-arrow), and UNWRAP every internal anchor (`href="#loc-N"` — a Typst-doc-local link
    meaningless outside that doc), keeping any EXTERNAL anchor (`href="http…"`) intact. Everything else
    (text, <em>) passes through. So the note/bib body renders identically on both surfaces."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip_depth = 0          # inside a doc-backlink <sup> subtree → drop
        self._sup_depth = 0
        # Per-anchor emit stack: each <a> pushes True (external, kept → emit </a>) or False (internal,
        # unwrapped → emit nothing on close) so start/end tags balance regardless of nesting.
        self._anchor_stack: list[bool] = []

    def handle_starttag(self, tag: str, attrs: list) -> None:
        a = dict(attrs)
        if tag == "sup" and a.get("role") == "doc-backlink":
            self._skip_depth += 1
            self._sup_depth = 1
            return
        if self._skip_depth:
            self._sup_depth += 1
            return
        if tag == "a":
            href = a.get("href", "")
            if href.startswith("#"):     # internal loc-anchor → unwrap (emit nothing)
                self._anchor_stack.append(False)
                return
            self._anchor_stack.append(True)
            self.parts.append(f'<a href="{_html.escape(href, quote=True)}">')
            return
        # keep phrasing tags (em, i, b, strong, span, sub, sup non-backlink)
        self.parts.append(f"<{tag}>")

    def handle_endtag(self, tag: str) -> None:
        if self._skip_depth:
            self._sup_depth -= 1
            if self._sup_depth <= 0:
                self._skip_depth -= 1
            return
        if tag == "a":
            if self._anchor_stack and self._anchor_stack.pop():
                self.parts.append("</a>")
            return
        self.parts.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        # Text nodes are emitted into HTML raw (both surfaces inject these strings without re-escaping), so
        # encode `& < >` here — a publisher like "Morgan & Claypool" or a URL query in text would otherwise
        # ship a bare `&` (an html-validate no-raw-characters error). Typographic quotes stay as unicode.
        self.parts.append(_html.escape(data, quote=False))


def _clean_fragment(frag: str) -> str:
    p = _FragmentCleaner()
    p.feed(frag)
    return re.sub(r"\s+", " ", "".join(p.parts)).strip()


# ─────────────────────────── Typst render ───────────────────────────

def _render_one(key: str, workdir: pathlib.Path) -> tuple[str, str]:
    """Render one key → (note_html, bib_html). Cites the key once and lays out a chicago-notes
    bibliography; harvests the endnote body (note form) and the bibliography-entry body (works-cited /
    bibliography form) from the two `role=` sections Typst emits."""
    typ = workdir / "one.typ"
    out = workdir / "one.html"
    typ.write_text(
        "#set page(width: auto, height: auto)\n"
        f"X #cite(<{key}>).\n"
        f'#bibliography("references.bib", style: "{STYLE}")\n',
        encoding="utf-8",
    )
    r = subprocess.run(
        ["typst", "compile", "--features", "html", str(typ), str(out)],
        capture_output=True, text=True, cwd=str(workdir),
    )
    if r.returncode != 0 or not out.exists():
        raise RuntimeError(f"typst failed for key {key!r} (rc={r.returncode}):\n{r.stderr}")
    html = out.read_text(encoding="utf-8")
    bib_m = re.search(r'role="doc-bibliography".*?<li[^>]*>(.*?)</li>', html, re.S)
    note_m = re.search(r'role="doc-endnotes".*?<li[^>]*>(.*?)</li>', html, re.S)
    if not bib_m or not note_m:
        raise RuntimeError(f"could not extract Chicago strings for key {key!r} — Typst output shape changed")
    return _clean_fragment(note_m.group(1)), _clean_fragment(bib_m.group(1))


# ─────────────────────────── Freshness stamp ───────────────────────────

def bib_hash(text: str) -> str:
    """The freshness key: sha256 of references.bib. The rendered Chicago strings depend only on the .bib,
    so this hash is exactly what determines whether citations.json is stale. The CITE-FRESH gate compares
    this stored hash against the current file (the mermaid-cache / tracked-HTML freshness discipline). The
    set of `[cite:]` markers is validated separately by CITE-RESOLVE — it does not change the strings, so
    it is not part of the freshness key (a marker edit never forces a spurious re-render)."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_stamp() -> str | None:
    if not OUT_PATH.is_file():
        return None
    try:
        return json.loads(OUT_PATH.read_text(encoding="utf-8")).get("_stamp", {}).get("bib_sha256")
    except (json.JSONDecodeError, OSError):
        return None


def _load_existing_payload() -> dict | None:
    """Parsed contents of OUT_PATH, or None if absent/unreadable — used for the idempotency check."""
    if not OUT_PATH.is_file():
        return None
    try:
        return json.loads(OUT_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


# ─────────────────────────── main ───────────────────────────

def main() -> int:
    if not BIB_PATH.is_file():
        print(f"ERROR: {BIB_PATH} not found", file=sys.stderr)
        return 1
    if shutil.which("typst") is None:
        print("ERROR: typst not found on PATH — the citation renderer needs the pinned Typst binary "
              "(a download, like the mermaid CLI). Install Typst 0.15.1 and re-run.", file=sys.stderr)
        return 2

    bib_text = BIB_PATH.read_text(encoding="utf-8")
    entries = parse_bib(bib_text)
    new_hash = bib_hash(bib_text)

    # Planned-actions preamble (tool-reporting discipline: say what will run before running it).
    print("== render_citations.py — plan ==")
    print(f"  bib:     {BIB_PATH.relative_to(HERE.parent)}  ({len(entries)} entries)")
    print(f"  engine:  Typst {STYLE} via `typst compile --features html` (per-key)")
    print(f"  out:     {OUT_PATH.relative_to(HERE.parent)}")
    print(f"  bib_sha: {new_hash[:16]}…  (stored: {(load_stamp() or 'none')[:16]}…)")

    citations: dict[str, dict] = {}
    with tempfile.TemporaryDirectory() as td:
        wd = pathlib.Path(td)
        shutil.copy2(BIB_PATH, wd / "references.bib")
        for e in entries:
            key = e["key"]
            note_html, bib_html = _render_one(key, wd)
            # NEVER-EMPTY GUARANTEE. Hayagriva's chicago-notes style treats a source with no locator —
            # in this bib, every @misc carrying neither `url` nor `doi` — as notes-only and emits an
            # EMPTY bibliography <li> (the note form stays complete). Our Works Cited is a NUMBERED list
            # mirrored to the superscripts (BIB-4), so an entry cannot be omitted or blank: fall back to
            # the engine's own note-form string, which for a notes-only source IS the full Chicago
            # citation. Still one engine — no second CSL processor. Both forms empty = a real data
            # defect; fail loud.
            if not bib_html:
                if not note_html:
                    raise RuntimeError(f"entry {key!r} rendered EMPTY in both note and bibliography "
                                       f"form — references.bib entry lacks renderable fields")
                bib_html = note_html
            citations[key] = {
                "note_html": note_html,
                "works_cited_html": bib_html,   # numbered end-of-chapter entry body (order applied at assembly)
                "bib_html": bib_html,           # alphabetical end-of-book entry body (same string; only order differs)
                "csl": e["csl"],
            }

    stamp = {
        "bib_sha256": new_hash,
        "engine": f"typst-{STYLE}-html-export",
        "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "note": "GENERATED by book/render_citations.py from book/references.bib — DO NOT EDIT BY HAND. "
                "Re-run `python3 book/render_citations.py` after editing references.bib.",
    }
    payload = {"_stamp": stamp, "citations": citations}

    # IDEMPOTENCY: if the existing file's citations + stamp (minus the timestamp) are already
    # identical to what we just rendered, skip the rewrite — a same-content re-render must not
    # dirty the tree with a timestamp-only diff (forcing a manual `git checkout`).
    existing = _load_existing_payload()
    if existing is not None:
        existing_stamp = existing.get("_stamp", {})
        unchanged = (
            existing.get("citations") == citations
            and existing_stamp.get("bib_sha256") == stamp["bib_sha256"]
            and existing_stamp.get("engine") == stamp["engine"]
            and existing_stamp.get("note") == stamp["note"]
        )
        if unchanged:
            print("== render_citations.py — result ==")
            print(f"  up-to-date: {OUT_PATH.relative_to(HERE.parent)} content unchanged — left untouched "
                  f"(generated timestamp preserved: {existing_stamp.get('generated')})")
            print(f"  rendered={len(citations)} entries  bib_sha256={new_hash}")
            print(f"  keys={','.join(sorted(citations))}")
            return 0

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Machine-parseable result summary (tool-reporting discipline: measurable results after execution).
    print("== render_citations.py — result ==")
    print(f"  rendered={len(citations)} entries  bytes={OUT_PATH.stat().st_size}  "
          f"bib_sha256={new_hash}")
    print(f"  keys={','.join(sorted(citations))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
