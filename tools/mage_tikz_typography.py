#!/usr/bin/env python3
"""Check editorially selected semantic typography in the rendered TikZ pool.

The review chooses which distinctions matter. This check preserves those choices;
it cannot infer meaning from boldface or certify fidelity to an arbitrary SVG.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import unicodedata


def page_text(page):
    """Return normalized text and a font-flags entry for each character."""
    chars, flags = [], []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line["spans"]:
                for char in unicodedata.normalize("NFKC", span["text"]):
                    if char == "\u00ad":
                        continue
                    chars.append(" " if char.isspace() else char)
                    flags.append(span["flags"])
            chars.append(" ")
            flags.append(0)
    return "".join(chars), flags


def check_page(page, checks):
    text, flags = page_text(page)
    findings = []
    for check in checks:
        phrase = unicodedata.normalize("NFKC", check["text"])
        if not phrase.strip():
            raise ValueError("Typography checks require nonempty printed text")
        pattern = r"\s+".join(re.escape(word) for word in phrase.split())
        if phrase[0].isalnum():
            pattern = r"(?<!\w)" + pattern
        if phrase[-1].isalnum():
            pattern += r"(?!\w)"
        matches = list(re.finditer(pattern, text))
        if not matches:
            findings.append({"text": phrase, "problem": "missing text or changed capitalization"})
            continue
        # A phrase can also occur in explanatory prose. A contract requires at
        # least one complete, correctly styled occurrence, never a mix of runs.
        def correct(match):
            ink = [flags[i] for i in range(*match.span()) if not text[i].isspace()]
            return all(all(bool(flag & bit) == check[key] for flag in ink)
                       for key, bit in (("bold", 16), ("italic", 2)) if key in check)
        if not any(correct(match) for match in matches):
            findings.append({"text": phrase, "problem": "font style differs from reviewed meaning",
                             "expected": {k: check[k] for k in ("bold", "italic") if k in check}})
    return findings


def audit_pdf(pdf, manifest, review, output=None):
    import pymupdf
    figures = review["figures"]
    sources = [figure["source"] for figure in figures]
    if len(sources) != len(set(sources)) or set(sources) != set(manifest):
        raise ValueError("Typography review must cover every candidate exactly once")
    findings, count = [], 0
    with pymupdf.open(pdf) as document:
        for figure in figures:
            checks = figure["checks"]
            count += len(checks)
            page = manifest[figure["source"]]["page"]
            for finding in check_page(document[page - 1], checks):
                findings.append({"source": figure["source"], "page": page, **finding})
    report = {"pdf": str(pdf), "figures": len(figures), "checks": count, "findings": findings}
    if output:
        Path(output).write_text(json.dumps(report, indent=2) + "\n")
    print(f"TikZ semantic typography: {len(figures)} figures; {count} checks; {len(findings)} findings.", flush=True)
    if findings:
        raise ValueError("Semantic typography differs from review: " + json.dumps(findings[:8]))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--review", type=Path, default=Path("book/tikz/typography-review.json"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    audit_pdf(args.pdf, json.loads(args.manifest.read_text()),
              json.loads(args.review.read_text()), args.output)
