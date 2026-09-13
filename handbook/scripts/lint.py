#!/usr/bin/env python3
"""lint.py — validate the Handbook manuscript's structure.

If something matters to the structure of the book, it is encoded structurally and validated here.
The linter parses each chapter to its Pandoc AST (the typed IR) and checks the invariants of the
semantic model. It FAILS (exit 1) on any violation; the build must not silently produce degraded
output from a broken manuscript.

Checks (spec §8):
  * missing / invalid chapter metadata, invalid chapter ordering
  * unknown or malformed semantic blocks
  * figures without alt text or without a caption
  * duplicate IDs
  * unresolved cross-references
  * citation keys absent from the bibliography
  * broken image paths
  * hard-coded figure/table/section/chapter numbers in prose
  * raw HTML / raw Typst used for presentation (outside a marked escape hatch)
  * malformed heading hierarchy
  * chapter-ending convention: `## Summary` + exactly one `read_further` block ends every
    substantive chapter; no bare References/Bibliography heading (non-`chapter` kinds exempt)

Usage: python3 scripts/lint.py
"""
from __future__ import annotations

import pathlib
import re
import sys

import _common as C

HARDCODED_NUM = re.compile(r"\b(Figure|Fig\.|Table|Section|Sect\.|Chapter)\s+\d+", re.IGNORECASE)


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []

    def err(self, chapter: str, msg: str) -> None:
        self.errors.append(f"{chapter}: {msg}")


def crossref_prefix(cid: str) -> str | None:
    m = re.match(r"^([A-Za-z]+)-", cid)
    return m.group(1) if m else None


def is_crossref(cid: str) -> bool:
    p = crossref_prefix(cid)
    return p is not None and p in C.CROSSREF_PREFIXES


class ChapterScan:
    """Collects everything the checks need in one recursive pass over a chapter's block list."""

    def __init__(self) -> None:
        self.ids: list[tuple[str, str]] = []          # (id, element-kind)
        self.crossref_uses: list[str] = []            # cross-reference ids referenced in prose
        self.citations: list[str] = []                # real bibliographic keys
        self.images: list[str] = []                   # image src targets
        self.headings: list[int] = []                 # heading levels, in order
        self.div_problems: list[str] = []             # malformed / unknown semantic blocks
        self.raw_presentation: list[str] = []         # raw html/typst outside an escape hatch
        self.hardcoded: list[str] = []                # hard-coded numbers in prose

    # -- helpers ----------------------------------------------------------------
    def _note_id(self, attr, kind: str) -> None:
        ident = attr[0]
        if ident:
            self.ids.append((ident, kind))

    def scan_blocks(self, blocks, in_escape: bool = False) -> None:
        for b in blocks:
            self.scan_block(b, in_escape)

    def scan_block(self, node: dict, in_escape: bool) -> None:
        t = node.get("t")
        c = node.get("c")
        if t == "Header":
            level, attr, inlines = c
            self._note_id(attr, "header")
            self.headings.append(level)
            self.scan_inlines(inlines, in_escape)
        elif t == "Div":
            attr, inner = c
            self._note_id(attr, "div")
            classes = attr[1]
            self._check_div(attr, classes, inner)
            escape = in_escape or any(cl in C.ESCAPE_BLOCKS for cl in classes)
            self.scan_blocks(inner, escape)
        elif t == "Table":
            self._note_id(c[0], "table")
            self.scan_any(c, in_escape)
        elif t in ("Para", "Plain"):
            self.hardcoded_scan(node)
            self.scan_inlines(c, in_escape)
        elif t == "RawBlock":
            fmt, _text = c
            if fmt in ("html", "typst", "tex", "latex") and not in_escape:
                self.raw_presentation.append(f"raw {fmt} block")
        elif t == "CodeBlock":
            self._note_id(c[0], "codeblock")
        elif isinstance(c, list):
            self.scan_any(c, in_escape)

    def scan_any(self, node, in_escape: bool) -> None:
        if isinstance(node, list):
            for x in node:
                self.scan_any(x, in_escape)
        elif isinstance(node, dict):
            if "t" in node and node["t"] in (
                "Header", "Div", "Table", "Para", "Plain", "RawBlock", "CodeBlock",
            ):
                self.scan_block(node, in_escape)
            elif "t" in node and node["t"] in ("Cite", "Image", "Link", "Span", "RawInline", "Str"):
                self.scan_inline(node, in_escape)
            elif "c" in node:
                self.scan_any(node["c"], in_escape)

    def scan_inlines(self, inlines, in_escape: bool) -> None:
        for i in inlines:
            self.scan_inline(i, in_escape)

    def scan_inline(self, node: dict, in_escape: bool) -> None:
        if not isinstance(node, dict):
            return
        t = node.get("t")
        c = node.get("c")
        if t == "Cite":
            citations, inlines = c
            for cit in citations:
                cid = cit["citationId"]
                if is_crossref(cid):
                    self.crossref_uses.append(cid)
                else:
                    self.citations.append(cid)
            self.scan_inlines(inlines, in_escape)
        elif t == "Image":
            attr, caption, target = c
            self._note_id(attr, "image")
            self.images.append(target[0])
            self.scan_inlines(caption, in_escape)
        elif t in ("Span",):
            self._note_id(c[0], "span")
            self.scan_inlines(c[1], in_escape)
        elif t == "Link":
            self._note_id(c[0], "link")
            self.scan_inlines(c[1], in_escape)
        elif t == "RawInline":
            fmt, _text = c
            if fmt in ("html", "typst", "tex", "latex") and not in_escape:
                self.raw_presentation.append(f"raw {fmt} inline")
        elif isinstance(c, list):
            self.scan_inlines(c, in_escape)

    def hardcoded_scan(self, node: dict) -> None:
        text = C._stringify(node.get("c"))
        for m in HARDCODED_NUM.finditer(text):
            self.hardcoded.append(m.group(0))

    def _check_div(self, attr, classes, inner) -> None:
        known = [cl for cl in classes if cl in C.KNOWN_BLOCKS]
        if not known:
            label = ",".join(classes) if classes else "(no class)"
            self.div_problems.append(f"unknown/malformed semantic block {{.{label}}}")
            return
        kind = known[0]
        if kind == "figure":
            self._check_figure(attr, inner)
        elif kind in C.CALLOUT_BLOCKS:
            if not inner:
                self.div_problems.append(f"empty {kind} block")

    def _check_figure(self, attr, inner) -> None:
        ident = attr[0]
        kv = C.attrs_to_dict(attr[2])
        has_image = False
        caption_blocks = 0
        for b in inner:
            imgs = _find_images(b)
            if imgs and not has_image:
                has_image = True
            elif b.get("t") in ("Para", "Plain") and imgs:
                pass
            else:
                caption_blocks += 1
        if not ident:
            self.div_problems.append("figure without a stable id")
        if not has_image:
            self.div_problems.append(f"figure {ident or '(no id)'} has no image")
        if not kv.get("alt", "").strip():
            self.div_problems.append(f"figure {ident or '(no id)'} has no alt text")
        if caption_blocks == 0:
            self.div_problems.append(f"figure {ident or '(no id)'} has no caption")


def _find_images(node) -> list:
    found = []

    def walk(n):
        if isinstance(n, list):
            for x in n:
                walk(x)
        elif isinstance(n, dict):
            if n.get("t") == "Image":
                found.append(n)
            elif isinstance(n.get("c"), list):
                walk(n["c"])
    walk(node)
    return found


# ── Chapter-ending convention (drift lint) ─────────────────────────────────────────────────────
# FATAL: contributes to the exit code like every other check (promoted from audit-only once all
# chapters complied). The convention: a substantive chapter ends with a `## Summary` (H2) section
# whose prose is immediately followed by exactly one `read_further` block, and it carries no dumped
# `References`/`Bibliography` heading. Front matter, interludes, back matter (the Conclusion), and
# appendices are EXEMPT — flagged by a `kind:` metadata value other than `chapter` (or by being
# absent from book.yaml `chapters:`).
_END_SECTION_HEADINGS = {"references", "bibliography"}


def _heading_text(header_node: dict) -> str:
    return C._stringify(header_node["c"][2])


def _is_read_further(block: dict) -> bool:
    if not isinstance(block, dict) or block.get("t") != "Div":
        return False
    classes = block["c"][0][1]
    return any(cl in C.READ_FURTHER_BLOCKS for cl in classes)


def check_chapter_ending(name: str, blocks: list, meta: dict) -> list[str]:
    """Return findings for one chapter's ending convention (empty list == compliant)."""
    kind = (meta.get("kind") or "chapter")
    if kind != "chapter":
        return []  # front-matter / interlude / appendix are exempt from the convention

    findings: list[str] = []

    # No bare References/Bibliography section — the reader-facing end matter is the READ FURTHER box.
    for b in blocks:
        if isinstance(b, dict) and b.get("t") == "Header":
            if _heading_text(b).strip().lower() in _END_SECTION_HEADINGS:
                findings.append(
                    f"contains a bare '{_heading_text(b)}' heading — remove it; the curated READ "
                    "FURTHER box is the end matter, not a dumped reference list"
                )

    rf_idx = [i for i, b in enumerate(blocks) if _is_read_further(b)]
    if not rf_idx:
        findings.append("does not end with a `read_further` block")
        return findings
    if len(rf_idx) > 1:
        findings.append(f"has {len(rf_idx)} `read_further` blocks (expected exactly one)")
    idx = rf_idx[-1]
    if idx != len(blocks) - 1:
        findings.append("the `read_further` block is not the last block in the chapter")

    # The section immediately before READ FURTHER must be `## Summary` (H2).
    preceding = None
    for b in reversed(blocks[:idx]):
        if isinstance(b, dict) and b.get("t") == "Header":
            preceding = b
            break
    if preceding is None:
        findings.append("no `## Summary` heading precedes the `read_further` block")
    else:
        level = preceding["c"][0]
        text = _heading_text(preceding).strip()
        if level != 2 or text.lower() != "summary":
            findings.append(
                f"the section before READ FURTHER is '{text}' (level {level}); "
                "expected a `## Summary` (H2)"
            )
    return findings


def main() -> int:
    book = C.load_book()
    rep = Report()

    bib = C.BIB_DIR / pathlib.Path(book["bibliography"]["file"]).name
    known_keys = C.bib_keys(bib) if bib.exists() else set()
    if not bib.exists():
        rep.err("book.yaml", f"bibliography file not found: {bib}")

    chapters = C.chapter_files(book)
    all_ids: dict[str, list[str]] = {}   # id -> [chapter names]
    all_defined_ids: set[str] = set()
    chapter_ids: set[str] = set()        # raw chapter `id:` values, for the parts cross-check
    orders: list[tuple[int, str]] = []

    scans: list[tuple[str, ChapterScan, dict, list]] = []
    for ch in chapters:
        name = ch.name
        if not ch.exists():
            rep.err(name, "chapter file listed in book.yaml does not exist")
            continue
        ast = C.pandoc_ast(ch)
        meta = C.meta_to_py(ast.get("meta", {}))

        # metadata
        missing = C.REQUIRED_META - set(meta)
        if missing:
            rep.err(name, f"missing chapter metadata: {', '.join(sorted(missing))}")
        status = meta.get("status")
        if status and status not in C.ALLOWED_STATUS:
            rep.err(name, f"invalid status '{status}' (allowed: {', '.join(sorted(C.ALLOWED_STATUS))})")
        order_val = meta.get("order")
        try:
            orders.append((int(order_val), name))
        except (TypeError, ValueError):
            rep.err(name, f"chapter 'order' must be an integer, got {order_val!r}")

        blocks = ast.get("blocks", [])
        scan = ChapterScan()
        scan.scan_blocks(blocks)
        scans.append((name, scan, meta, blocks))

        # Each chapter is itself a cross-reference target: `@ch-<id>` resolves to the chapter opening.
        chap_id = meta.get("id")
        if chap_id:
            all_defined_ids.add(f"ch-{chap_id}")
            chapter_ids.add(chap_id)

        for ident, _kind in scan.ids:
            all_ids.setdefault(ident, []).append(name)
            all_defined_ids.add(ident)

    # Front matter (Preface, etc.) — validated with a front-matter-appropriate metadata rule (no
    # chapter `order:`, no `short_title:`), then run through the same structural scans as chapters so
    # a broken image, unknown semantic block, or raw-presentation escape is caught here too. Front
    # matter is exempt from the chapter-ending convention (see check_chapter_ending, keyed on `kind`).
    fm_scans: list[tuple[str, ChapterScan, dict, list]] = []
    for fm in C.frontmatter_files(book):
        name = f"frontmatter/{fm.name}"
        if not fm.exists():
            rep.err(name, "front-matter file listed in book.yaml does not exist")
            continue
        ast = C.pandoc_ast(fm)
        meta = C.meta_to_py(ast.get("meta", {}))
        missing = C.REQUIRED_FRONTMATTER_META - set(meta)
        if missing:
            rep.err(name, f"missing front-matter metadata: {', '.join(sorted(missing))}")
        status = meta.get("status")
        if status and status not in C.ALLOWED_STATUS:
            rep.err(name, f"invalid status '{status}' (allowed: {', '.join(sorted(C.ALLOWED_STATUS))})")
        blocks = ast.get("blocks", [])
        scan = ChapterScan()
        scan.scan_blocks(blocks)
        fm_scans.append((name, scan, meta, blocks))
        for ident, _kind in scan.ids:
            all_ids.setdefault(ident, []).append(name)
            all_defined_ids.add(ident)

    # Part structure — validate the book.yaml `parts:` list against the chapters it groups, so a typo
    # cannot silently drop a divider or mis-file a chapter. Each Part needs a numeral, a title, and an
    # opener file that exists; every listed chapter id must be a real chapter, assigned to exactly one
    # Part. Empty `chapters:` is allowed (a forthcoming Part renders as a placeholder divider).
    seen_part_chapters: dict[str, str] = {}
    for i, part in enumerate(book.get("parts", [])):
        where = f"book.yaml parts[{i}]"
        for field in ("numeral", "title", "opener"):
            if not part.get(field):
                rep.err(where, f"part missing required field '{field}'")
        opener = part.get("opener")
        if opener and not (C.HANDBOOK / opener).exists():
            rep.err(where, f"part opener file does not exist: {opener}")
        for cid in (part.get("chapters") or []):
            if cid not in chapter_ids:
                rep.err(where, f"part references unknown chapter id '{cid}'")
            elif cid in seen_part_chapters:
                rep.err(where, f"chapter '{cid}' already assigned to {seen_part_chapters[cid]}")
            else:
                seen_part_chapters[cid] = where

    # chapter ordering: strictly increasing in book.yaml sequence
    seq_orders = [o for o, _ in orders]
    if seq_orders != sorted(seq_orders) or len(set(seq_orders)) != len(seq_orders):
        rep.err("book.yaml", f"chapter 'order' values must be strictly increasing in build order; got {seq_orders}")

    # duplicate ids (book-wide). The chapter-ending convention mandates a `## Summary` H2 in every
    # chapter, and pandoc auto-assigns that heading the id `summary`; the repeat is sanctioned, not a
    # collision. It is never a cross-reference target — cross-refs resolve through the `sec-`/`ch-`
    # prefixes — so exempt it here, mirroring the special-case in check_chapter_ending.
    for ident, where in all_ids.items():
        if ident in C.REPEATED_HEADING_IDS:
            continue
        if len(where) > 1:
            rep.err("book", f"duplicate id '{ident}' defined in: {', '.join(where)}")

    # per-file checks (chapters + front matter share the structural invariants)
    for name, scan, _meta, _blocks in scans + fm_scans:
        for cid in scan.crossref_uses:
            if cid not in all_defined_ids:
                rep.err(name, f"unresolved cross-reference @{cid}")
        for key in scan.citations:
            if key not in known_keys:
                rep.err(name, f"citation key '{key}' not in bibliography")
        for problem in scan.div_problems:
            rep.err(name, problem)
        for raw in scan.raw_presentation:
            rep.err(name, f"{raw} used for presentation (wrap a sanctioned escape hatch in a .raw-typst/.raw-html div)")
        for hc in scan.hardcoded:
            rep.err(name, f"hard-coded reference number in prose: '{hc}' (use an @id cross-reference)")
        # heading hierarchy: never jump deeper by more than one level
        prev = None
        for lvl in scan.headings:
            if prev is not None and lvl > prev + 1:
                rep.err(name, f"heading hierarchy skips from level {prev} to {lvl}")
            prev = lvl
        # broken image paths
        chdir = (C.CHAPTERS)
        for src in scan.images:
            if src.startswith(("http://", "https://", "data:")):
                continue
            resolved = (chdir / src).resolve()
            if not resolved.exists():
                rep.err(name, f"broken image path: {src}")

    # Chapter-ending convention — FATAL (see check_chapter_ending; exempt kinds return no findings).
    for name, _scan, meta, blocks in scans:
        for f in check_chapter_ending(name, blocks, meta):
            rep.err(name, f"chapter-ending convention: {f}")

    if rep.errors:
        sys.stderr.write(f"lint FAILED — {len(rep.errors)} issue(s):\n")
        for e in rep.errors:
            sys.stderr.write(f"  [x] {e}\n")
        return 1

    n = len(scans)
    fm = len(fm_scans)
    fm_note = f" + {fm} front-matter file(s)" if fm else ""
    print(f"lint OK — {n} chapter(s){fm_note} validated, 0 issues")
    return 0


if __name__ == "__main__":
    sys.exit(main())
