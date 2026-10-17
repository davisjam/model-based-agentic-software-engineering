#!/usr/bin/env python3
"""Render canonical references.bib to Chicago notes and bibliography through Pandoc citeproc.

The web book, course reading lists and metadata consume the same committed citations.json.
Native LaTeX PDFs use the same bibliography data with their own print citation style.
Pandoc reads the original BibTeX directly; no Hayagriva remapping participates in rendering.
The legacy derived_sources API remains for archived Typst consumers only.

The vendored official Chicago 18 CSL is licensed CC BY-SA 3.0; see latex/CSL-SOURCE.txt.
This dev/CI tool requires Pandoc; catalog.py only reads the committed JSON.
Exit codes: 0 success, 1 rendering/data error, 2 missing Pandoc.
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
STYLE = "chicago-notes-bibliography"
CSL_PATH = HERE / "latex" / f"{STYLE}.csl"


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


# ─────────────────────────── Legacy derived bibliography API (archived Typst only) ───────────────────────────
# Kept for old callers and archival tests; current Pandoc/LaTeX rendering never uses this split.
#
# Hayagriva's BibTeX reader mis-types two entry classes, and no .bib field shape avoids it (verified
# 261008 against typst 0.15.1): @inproceedings becomes an article inside a `proceedings` parent, which
# chicago-notes renders as a journal SPECIAL ISSUE with the venue both quoted and italicised; and
# @incollection becomes an `anthos` inside an `anthology` parent, which chicago-notes renders with the
# container DOUBLED (<em>Book</em>, <em>Book</em>). Alternative .bib fields fail too: `series` drops the
# "in", `journal`/`maintitle` drop the container. In Hayagriva's native YAML the type is explicit, and
# `chapter` inside a `book` parent renders both classes correctly under BOTH consuming styles
# (chicago-notes for citations.json; nature for the PDF).
#
# So BOTH surfaces compile the same derived PAIR instead of the raw .bib:
#   references-rest.bib       — references.bib minus the two mis-read classes, byte-preserved, so every
#                               entry Hayagriva reads correctly renders exactly as before;
#   references-hayagriva.yml  — the @inproceedings/@incollection entries re-typed as chapter-in-book.
# references.bib STAYS the canonical hand-edited source. The pair is derived from it at build time by
# this one function — written into each consumer's own build dir, never committed, never hand-edited —
# so it cannot go stale and the two surfaces cannot drift.

REMAPPED_TYPES = ("incollection", "inproceedings")
DERIVED_BIB_NAME = "references-rest.bib"
DERIVED_YAML_NAME = "references-hayagriva.yml"

_PROVENANCE = ("GENERATED by book/render_citations.py (derived_sources) from book/references.bib "
               "- DO NOT EDIT BY HAND; edit references.bib and rebuild.")


def _hayagriva_names(raw: str) -> list[str]:
    """BibTeX `A and B and C` name list → Hayagriva name list, one "Family, Given" string per person."""
    return [f"{p['family']}, {p['given']}" if p["given"] else p["family"]
            for p in _split_authors(raw)]


def _hayagriva_entry(e: dict) -> dict:
    """One @inproceedings/@incollection entry → a Hayagriva record: `chapter` inside a `book` parent
    (the booktitle). Verified against typst 0.15.1: chicago-notes renders
    `"Title," in <em>Booktitle</em>, vol. V, Series, ed. Editors (Publisher, Year), <doi/url>.` with the
    container exactly once; nature renders `in <em>Booktitle</em> vol. V pages (Year).`. The other parent
    types all fail: `conference` doubles the venue and stamps "preprint", `proceedings` reintroduces the
    special issue, `anthology` doubles the container. pages/address ride along as page-range/location
    (data preserved; chicago-notes renders neither for a chapter — the same treatment the correctly-read
    @incollection entries always had)."""
    f = e["fields"]

    def _num(v: str) -> "int | str":
        return int(v) if v.isdigit() else v

    ent: dict = {"type": "chapter", "title": f.get("title", "")}
    if names := _hayagriva_names(f.get("author", "")):
        ent["author"] = names
    if f.get("year"):
        ent["date"] = _num(f["year"])
    if f.get("pages"):
        ent["page-range"] = f["pages"].replace("--", "-")
    if f.get("url"):
        ent["url"] = f["url"]
    if f.get("doi"):
        ent["serial-number"] = {"doi": f["doi"]}
    parent: dict = {"type": "book", "title": f.get("booktitle", "")}
    if editors := _hayagriva_names(f.get("editor", "")):
        parent["editor"] = editors
    if f.get("publisher"):
        parent["publisher"] = f["publisher"]
    if f.get("address"):
        parent["location"] = f["address"]
    if f.get("volume"):
        parent["volume"] = _num(f["volume"])
    if f.get("number"):
        parent["issue"] = _num(f["number"])
    if f.get("series"):
        parent["parent"] = {"type": "book", "title": f["series"]}
    ent["parent"] = parent
    return ent


def derived_sources(bib_text: str) -> tuple[str, str]:
    """Split references.bib into the derived pair both surfaces compile:
    (rest-bib text, Hayagriva YAML text). The rest-bib excises the re-typed entries by their byte spans,
    so every remaining entry is byte-identical to the canonical .bib; the YAML carries the re-typed ones.
    The key sets are disjoint by construction (Typst refuses duplicate keys across bibliography paths).
    The YAML body is emitted as JSON — a strict subset of YAML — so the writer stays stdlib with no
    quoting edge cases; Hayagriva's YAML loader accepts it."""
    spans = [(m.start(), m.end()) for m in _ENTRY_RE.finditer(bib_text)
             if m.group(1).lower() in REMAPPED_TYPES]
    remapped = {e["key"]: _hayagriva_entry(e) for e in parse_bib(bib_text)
                if e["type"] in REMAPPED_TYPES}
    rest_parts: list[str] = []
    pos = 0
    for s, t in spans:
        rest_parts.append(bib_text[pos:s])
        pos = t
    rest_parts.append(bib_text[pos:])
    rest_bib = (f"% {_PROVENANCE}\n% Entries of type "
                + ", ".join("@" + t for t in REMAPPED_TYPES)
                + f" are re-typed in {DERIVED_YAML_NAME}.\n" + "".join(rest_parts))
    yaml = (f"# {_PROVENANCE}\n"
            f"# @inproceedings/@incollection re-typed as Hayagriva chapter-in-book (Hayagriva's BibTeX\n"
            f"# reader mis-types them; see derived_sources in the emitter). Body is JSON, a YAML subset.\n"
            + json.dumps(remapped, indent=2, ensure_ascii=False) + "\n")
    return rest_bib, yaml


# ─────────────────────────── HTML fragment normalization ───────────────────────────

class _FragmentCleaner(HTMLParser):
    """Keep portable phrasing markup and external links, dropping local note backlinks.

    Works with current Pandoc citeproc and legacy Typst fragments. Document wrappers
    and internal fragment links are removed because JSON values are embedded inline.
    """

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
        if a.get("role") == "doc-backlink":
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
        if tag in ("p", "div"):
            return  # projection values are phrasing-only HTML fragments
        if tag == "span" and a.get("class") == "smallcaps":
            self.parts.append('<span class="smallcaps">')
            return
        # Keep semantic emphasis, scripts and spans; document-local ids are omitted.
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
        if tag in ("p", "div"):
            self.parts.append(" ")
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


# ─────────────────────────── Pandoc citeproc render ───────────────────────────

def _protect_title_case(bib_text: str) -> str:
    """Add BibTeX case-protection to titles in ephemeral citeproc input, preserving their text.

    Pandoc's BibTeX reader sentence-cases unprotected titles before CSL formatting,
    which otherwise turns U.S. into u.s. The extra brace layer translates to CSL's
    nocase markup. Only syntax is added; canonical .bib bytes are never rewritten.
    """
    replacements = []
    for entry in _ENTRY_RE.finditer(bib_text):
        body, consumed = entry.group(3), 0
        for field in _FIELD_RE.finditer(body):
            if field.start() < consumed:
                continue
            start = field.end()
            while start < len(body) and body[start].isspace():
                start += 1
            if start == len(body):
                break
            cursor = start
            if body[start] == "{":
                depth = 0
                while cursor < len(body):
                    if body[cursor] == "\\":
                        cursor += 2
                        continue
                    if body[cursor] == "{":
                        depth += 1
                    elif body[cursor] == "}":
                        depth -= 1
                        if depth == 0:
                            cursor += 1
                            break
                    cursor += 1
                else:
                    raise ValueError(f"unbalanced BibTeX field in {entry.group(2)}")
            elif body[start] == '"':
                cursor += 1
                while cursor < len(body):
                    if body[cursor] == "\\":
                        cursor += 2
                    elif body[cursor] == '"':
                        cursor += 1
                        break
                    else:
                        cursor += 1
            else:
                cursor = body.find(",", start)
                if cursor < 0:
                    cursor = len(body)
            consumed = cursor
            if field.group(1).lower() not in {"title", "booktitle", "journal", "series"}:
                continue
            raw = body[start:cursor]
            if raw.startswith("{") or raw.startswith('"'):
                protected = "{{" + raw[1:-1] + "}}"
            else:
                # Bare BibTeX macros must retain their expansion semantics.
                raise ValueError(f"title field in {entry.group(2)} must be braced or quoted")
            replacements.append((entry.start(3) + start, entry.start(3) + cursor, protected))
    for start, end, replacement in reversed(replacements):
        bib_text = bib_text[:start] + replacement + bib_text[end:]
    return bib_text


def _extract_rendered(html: str, key: str) -> tuple[str, str]:
    """Extract the one full note and bibliography entry, preserving phrasing semantics."""
    bib_m = re.search(r'<div\b[^>]*\bid="ref-' + re.escape(_html.escape(key, quote=True))
                      + r'"[^>]*>(.*?)</div>', html, re.S)
    note_m = re.search(r'<section\b[^>]*role="doc-endnotes"[^>]*>.*?<li\b[^>]*>(.*?)</li>',
                       html, re.S)
    if not note_m:
        raise RuntimeError(f"could not extract Chicago note for key {key!r} — Pandoc output shape changed")
    # Chicago permits notes-only entries; main applies the existing non-empty fallback.
    return _clean_fragment(note_m.group(1)), _clean_fragment(bib_m.group(1)) if bib_m else ""


def _render_one(key: str, workdir: pathlib.Path) -> tuple[str, str]:
    """Render each key in isolation, ensuring a full first note rather than ibid/short notes."""
    r = subprocess.run(
        ["pandoc", "--from=markdown", "--to=html5", "--citeproc", "--wrap=none",
         "--metadata=lang:en-US", f"--bibliography={workdir / 'references.bib'}",
         f"--csl={CSL_PATH}"],
        input=f"[@{key}]\n", capture_output=True, text=True, cwd=str(workdir),
    )
    if r.returncode or "[WARNING]" in r.stderr:
        raise RuntimeError(f"Pandoc citeproc failed for key {key!r} (rc={r.returncode}):\n{r.stderr}")
    return _extract_rendered(r.stdout, key)


# ─────────────────────────── Freshness stamp ───────────────────────────

def bib_hash(text: str) -> str:
    """The freshness key: sha256 of references.bib. The CSL style is stamped separately;
    this hash checks whether the reference data behind citations.json is stale. The CITE-FRESH gate compares
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
    if shutil.which("pandoc") is None:
        print("ERROR: pandoc not found on PATH — install Pandoc 3.9.0.2 and re-run.", file=sys.stderr)
        return 2

    bib_text = BIB_PATH.read_text(encoding="utf-8")
    entries = parse_bib(bib_text)
    new_hash = bib_hash(bib_text)

    # Planned-actions preamble (tool-reporting discipline: say what will run before running it).
    print("== render_citations.py — plan ==")
    print(f"  bib:     {BIB_PATH.relative_to(HERE.parent)}  ({len(entries)} entries)")
    print(f"  engine:  Pandoc citeproc, official Chicago 18 {STYLE} (per-key)")
    print(f"  out:     {OUT_PATH.relative_to(HERE.parent)}")
    print(f"  bib_sha: {new_hash[:16]}…  (stored: {(load_stamp() or 'none')[:16]}…)")

    citations: dict[str, dict] = {}
    with tempfile.TemporaryDirectory() as td:
        wd = pathlib.Path(td)
        (wd / "references.bib").write_text(_protect_title_case(bib_text), encoding="utf-8")
        for e in entries:
            key = e["key"]
            note_html, bib_html = _render_one(key, wd)
            # Numbered works-cited entries must never be blank. Chicago notes-only sources
            # use the full note text; missing text in both forms is a data/rendering error.
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
        "engine": f"pandoc-citeproc-{STYLE}",
        "csl_sha256": hashlib.sha256(CSL_PATH.read_bytes()).hexdigest(),
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
            and existing_stamp.get("csl_sha256") == stamp["csl_sha256"]
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
