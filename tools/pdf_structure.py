#!/usr/bin/env python3
"""Inspect meaningful PDF tags, beyond the presence of an empty StructTreeRoot.

This is a structural smoke gate, not a PDF/UA or reading-order certification.
PDF producers pass expected feature counts from their actual emitted source.
"""
from __future__ import annotations

import argparse
from collections import Counter
import json
import re
from pathlib import Path


def numbered_sections(records, slugs=None):
    """Expected publication numbers, independent of legacy coda suppression flags."""
    numbers = []
    for record in records:
        if slugs is not None and record['slug'] not in slugs:
            continue
        if record.get('is_part_page') or record.get('is_matter'):
            continue
        if 1 <= record['part'] <= 7:
            numbers.append(f"{record['part']}.{record['chapter']}")
        else:
            appendix = re.match(r'^([A-Z]\.\d+)\s', record['chapter_title'])
            if appendix:
                numbers.append(appendix[1])
    return numbers


def inspect_numbered_bookmarks(outline, numbers):
    """Check pypdf's nested outline for numbered sections at section depth."""
    entries = []
    def walk(items, level=1):
        for item in items:
            if isinstance(item, list):
                walk(item, level + 1)
            else:
                entries.append((level, str(item.get('/Title', ''))))
    walk(outline)
    findings = []
    for number in numbers:
        matches = [(level, title) for level, title in entries
                   if re.match(re.escape(number) + r'\s', title)]
        if len(matches) != 1:
            findings.append(f"section {number}: expected one numbered bookmark, found {len(matches)}")
        elif matches[0][0] != 2:
            findings.append(f"section {number}: bookmark must be nested under its chapter or appendix (level 2)")
    return findings


def check_numbered_bookmarks(path, records, slugs=None):
    from pypdf import PdfReader
    numbers = numbered_sections(records, slugs)
    findings = inspect_numbered_bookmarks(PdfReader(path).outline, numbers)
    if findings:
        raise RuntimeError(f"PDF bookmark gate failed for {path}:\n" + '\n'.join(findings))
    print(f"PDF bookmarks: {len(numbers)} numbered sections verified in {Path(path).name}")


def _object(value):
    return value.get_object() if hasattr(value, "get_object") else value


def inspect_catalog(catalog, *, headings=1, sections=0, tables=0, figures=0, single_page_tables=False):
    """Return role counts and findings; usable with pypdf dictionaries or test fixtures."""
    catalog = _object(catalog)
    tree = _object(catalog.get("/StructTreeRoot"))
    if not isinstance(tree, dict):
        return {}, ["PDF has no structure tree"]
    roles = _object(tree.get("/RoleMap", {}))
    counts, findings = Counter(), []
    content_paragraphs = 0

    def role(node):
        name = str(node.get("/S", ""))
        namespace = _object(node.get("/NS", {}))
        seen = set()
        while name:
            identity = (name, id(namespace))
            if identity in seen:
                findings.append(f"cyclic role mapping for {name}")
                break
            seen.add(identity)
            mapping = _object(namespace.get("/RoleMapNS", {})) if isinstance(namespace, dict) else {}
            value = _object(mapping.get(name, roles.get(name)))
            if value is None:
                break
            if isinstance(value, list):
                name, namespace = str(value[0]), _object(value[1])
            else:
                name = str(value)
                namespace = None
        return name.lstrip("/")

    def content(node):
        """A tag must reach marked content, not merely exist in the tree."""
        pending, seen = [_object(node).get("/K")], set()
        while pending:
            item = _object(pending.pop())
            if isinstance(item, int) and not isinstance(item, bool) and item >= 0:
                return True
            if isinstance(item, list):
                pending.extend(item)
            elif isinstance(item, dict) and id(item) not in seen:
                seen.add(id(item))
                if isinstance(item.get("/MCID"), int) and item["/MCID"] >= 0:
                    return True
                pending.append(item.get("/K"))
        return False

    def content_pages(node):
        pages = set()
        pending = [(node, None)]
        seen = set()
        while pending:
            value, inherited = pending.pop()
            value = _object(value)
            if isinstance(value, list):
                pending.extend((child, inherited) for child in value)
            elif isinstance(value, dict) and id(value) not in seen:
                seen.add(id(value))
                page = value.get('/Pg', inherited)
                if '/MCID' in value and page is not None:
                    pages.add(page.idnum if hasattr(page, 'idnum') else id(_object(page)))
                pending.append((value.get('/K'), page))
            elif isinstance(value, int) and value >= 0 and inherited is not None:
                pages.add(inherited.idnum if hasattr(inherited, 'idnum') else id(_object(inherited)))
        return pages

    pending, seen = [tree.get("/K")], set()
    while pending:
        node = _object(pending.pop())
        if isinstance(node, list):
            pending.extend(reversed(node))
            continue
        if not isinstance(node, dict) or "/S" not in node:
            continue
        if id(node) in seen:
            findings.append("structure tree contains a repeated/cyclic element")
            continue
        seen.add(id(node))
        kind = role(node)
        counts[kind] += 1
        if kind == "Table" and single_page_tables and len(content_pages(node)) > 1:
            findings.append(f"Table {counts[kind]} spans multiple pages")
        if kind == "Document":
            kids = _object(node.get("/K"))
            for child in kids if isinstance(kids, list) else [kids]:
                child = _object(child)
                if ((isinstance(child, int) and not isinstance(child, bool)) or
                        (isinstance(child, dict) and "/MCID" in child)):
                    findings.append("Document has direct marked content instead of a structure element")
        if kind == "P" and content(node):
            content_paragraphs += 1
        if kind in {"H1", "H2", "H3", "Table", "Figure"} and not content(node):
            findings.append(f"{kind} structure has no marked content")
        if kind == "Figure" and not str(node.get("/Alt", "")).strip():
            findings.append("Figure structure lacks nonempty alternative text")
        pending.append(node.get("/K"))

    for kind, minimum in (("H1", headings), ("H2", sections), ("Table", tables), ("Figure", figures), ("P", 1)):
        if counts[kind] < minimum:
            findings.append(f"expected at least {minimum} {kind} structure(s), found {counts[kind]}")
    if not content_paragraphs:
        findings.append("PDF has no paragraph with marked content")
    if tables and (not counts["TR"] or not (counts["TH"] or counts["TD"])):
        findings.append("table structures lack row/cell semantics")
    return dict(counts), findings


def inspect_pdf(path: Path, **expected):
    try:
        from pypdf import PdfReader
    except ImportError as error:
        raise RuntimeError("Install book/requirements-pdf.txt in the build Python environment (pypdf missing)") from error
    reader = PdfReader(path, strict=True)
    return inspect_catalog(reader.trailer["/Root"], **expected)


def check_pdf(path: Path, **expected):
    counts, findings = inspect_pdf(path, **expected)
    if findings:
        raise RuntimeError(f"PDF structure gate failed for {path}:\n" + "\n".join(findings))
    print(f"PDF structure: {path} — {json.dumps(counts, sort_keys=True)}")
    return counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    for feature, default in (("headings", 1), ("sections", 0), ("tables", 0), ("figures", 0)):
        parser.add_argument(f"--{feature}", type=int, default=default)
    parser.add_argument("--single-page-tables", action="store_true")
    args = vars(parser.parse_args())
    check_pdf(args.pop("pdf"), **args)
