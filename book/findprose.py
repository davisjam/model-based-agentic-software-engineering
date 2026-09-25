#!/usr/bin/env python3
"""findprose.py — search the book's prose for a phrase regardless of line wrapping.

THE PROBLEM IT SOLVES.  The book's markdown is hard-wrapped. In `part5/5.2-inside-docables-software-
factory.md`, 576 of 884 prose lines — 65% — continue onto the next line. So `grep -F "several words in
a row"` returns NOTHING whenever the phrase happens to cross a wrap, and that zero reads as *"the text
is missing."* It is not missing; the newline is in the middle of it. That mistake was made 22+ times in
a single session, and it is the reason several present sentences were nearly reported as deletions.

USE THIS INSTEAD OF `grep -F` for any multi-word prose phrase. It flattens every run of whitespace —
including the newline at a wrap — to a single space before matching, then maps the hit back to the real
`file:line` where it starts. Single words are fine with grep; phrases are not.

THE CANONICAL USE is a preservation checklist: "are these 15 sentences all still present?" Pass the
phrases as arguments or `--from-file`, get a per-phrase ✓/✗ and a summary count, and exit 0 only when
every one was found — so it drops straight into a `&&` chain.

DEFAULT CORPUS.  The book's prose markdown, under `book/`: `frontmatter/`, `part1/`…`part7/`,
`conclusion/`, `backmatter/`, every `appendix-*/` directory, and the `appendix-part-*.md` divider pages.
Not the drafts in `_design/`, not the transcripts, not generated trees. `--list-corpus` prints the exact
file set; a positional `--in PATH` narrows the search to one file or directory.

DEFAULTS, STATED.  Case SENSITIVE, like `grep -F` (`-i` relaxes it). HTML comments INCLUDED, because a
`<!-- point: … -->` claim is a legitimate search target when checking a summary against its prose
(`--no-comments` drops them). Typographic quotes and apostrophes are FOLDED to ASCII on both sides, so a
phrase typed `don't "like this"` still finds the book's `don't "like this"`.

Self-test: `python3 book/findprose.py --selftest` (the line mapping is the part worth distrusting).
"""

from __future__ import annotations

import argparse
import bisect
import json
import os
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent      # book/
ROOT = HERE.parent                                   # the repo root

# The book's prose, by directory. Globs, so a new `part8/` or `appendix-whatever/` is picked up without
# editing this list. `--list-corpus` resolves it to the actual files.
CORPUS_DIR_GLOBS = ("frontmatter", "part*", "conclusion", "backmatter", "appendix-*")
# Prose pages that live at `book/` root rather than in a directory (the appendix divider pages).
CORPUS_FILE_GLOBS = ("appendix-part-*.md",)
# Never walk into these, whatever the glob matched: drafts, generated trees, vendored code.
SKIP_DIR_NAMES = {"node_modules", "dist", "site", "web", "epub", "__pycache__", "figures", "assets", "fonts"}

# Typographic → ASCII, one character for one character so every offset stays put. Quotes and
# apostrophes only: a phrase is far more often mistyped with a straight quote than with the wrong dash,
# and folding dashes would be lopsided (an unspaced `word—word` would fold to `word-word`, which a
# human typing `word - word` still misses).
_FOLD = str.maketrans({
    "‘": "'", "’": "'", "‚": "'", "‛": "'", "′": "'",
    "“": '"', "”": '"', "„": '"', "‟": '"', "″": '"',
    "«": '"', "»": '"',
})

_TOKEN_RE = re.compile(r"\S+")
_CONTEXT_PAD = 46


def _safe_lower(s: str) -> str:
    """Lowercase without changing the string's length.

    `str.lower()` is not length-preserving for every character (Turkish dotted capital I expands to two),
    and this tool's whole correctness argument rests on a 1:1 offset mapping. Take the fast path when it
    happens to preserve length — it nearly always does — and fall back per character when it does not."""
    low = s.lower()
    if len(low) == len(s):
        return low
    out = []
    for ch in s:
        c = ch.lower()
        out.append(c if len(c) == 1 else ch)
    return "".join(out)


_COMMENT_MASK = "\x00"
_MASK_RUN_RE = re.compile(_COMMENT_MASK + "+")


def _mask_html_comments(text: str) -> str:
    """Overwrite the contents of every `<!-- … -->` with a sentinel, keeping newlines and total length.

    Two properties matter. Masking rather than deleting keeps every source offset — and therefore every
    line number — exactly where it was, so `--no-comments` cannot shift a reported location. And the
    sentinel is a non-whitespace character, not a space, so the masked span still reads as a token: prose
    above a dropped comment never splices onto prose below it and invents a phrase that is not there."""
    if "<!--" not in text:
        return text
    out = list(text)
    i = 0
    while True:
        start = text.find("<!--", i)
        if start < 0:
            break
        end = text.find("-->", start + 4)
        end = len(text) if end < 0 else end + 3
        for j in range(start, end):
            if out[j] not in "\n\r":
                out[j] = _COMMENT_MASK
        i = end
    return "".join(out)


class Match:
    """One hit: where it starts, where it ends, and the flattened text around it."""

    __slots__ = ("path", "line", "end_line", "col", "context")

    def __init__(self, path: str, line: int, end_line: int, col: int, context: str) -> None:
        self.path, self.line, self.end_line, self.col, self.context = path, line, end_line, col, context

    def location(self) -> str:
        """`path:line` — clickable in an editor, greppable in a log."""
        return f"{self.path}:{self.line}"

    def as_dict(self) -> dict:
        return {"path": self.path, "line": self.line, "end_line": self.end_line,
                "col": self.col, "wraps": self.end_line > self.line, "context": self.context}


class Doc:
    """One source file (or string), flattened for matching, with the map back to `file:line`.

    THE MAPPING, which is the part worth being careful about. The text is cut into whitespace-free tokens
    by `\\S+`; the flattened haystack is those tokens joined by exactly one space. For each token we keep
    its offset in the flattened string and its offset in the source. A match offset therefore lands inside
    (or immediately after) exactly one token — binary search finds which — and the source offset is that
    token's source start plus the distance into it. A second binary search over the source's line-start
    offsets turns that into a 1-based line and column. No offset is ever estimated: every flattened
    character has a named source character behind it, which is what keeps the reported line honest.
    `--selftest` checks the result against an independent oracle (`source[:offset].count("\\n") + 1`)."""

    def __init__(self, text: str, path: str = "<string>", keep_comments: bool = True) -> None:
        self.path = path
        self.raw = text
        src = text.translate(_FOLD)
        if not keep_comments:
            src = _mask_html_comments(src)

        tok_flat_starts: list[int] = []
        tok_src_starts: list[int] = []
        tok_lens: list[int] = []
        pieces: list[str] = []
        cursor = 0
        for m in _TOKEN_RE.finditer(src):
            tok_flat_starts.append(cursor)
            tok_src_starts.append(m.start())
            tok_lens.append(m.end() - m.start())
            pieces.append(m.group())
            cursor += (m.end() - m.start()) + 1      # +1 for the single joining space
        self.flat = " ".join(pieces)
        self._tok_flat = tok_flat_starts
        self._tok_src = tok_src_starts
        self._tok_len = tok_lens

        self._line_starts = [0]
        for i, ch in enumerate(text):
            if ch == "\n":
                self._line_starts.append(i + 1)

        self._low: str | None = None

    def lowered(self) -> str:
        if self._low is None:
            self._low = _safe_lower(self.flat)
        return self._low

    def source_offset(self, flat_off: int) -> int:
        """Flattened-string offset → source-string offset."""
        i = bisect.bisect_right(self._tok_flat, flat_off) - 1
        if i < 0:
            return 0
        into = flat_off - self._tok_flat[i]
        if into >= self._tok_len[i]:
            # A joining space. It stands for the whitespace run that follows this token, so point at the
            # first character of that run. Phrases are stripped, so a match never STARTS here.
            return self._tok_src[i] + self._tok_len[i]
        return self._tok_src[i] + into

    def line_col(self, source_off: int) -> tuple[int, int]:
        """Source offset → 1-based (line, column)."""
        line = bisect.bisect_right(self._line_starts, source_off)
        if line < 1:
            line = 1
        return line, source_off - self._line_starts[line - 1] + 1

    def context(self, flat_off: int, length: int) -> str:
        lo = max(0, flat_off - _CONTEXT_PAD)
        hi = min(len(self.flat), flat_off + length + _CONTEXT_PAD)
        snippet = _MASK_RUN_RE.sub("⟨comment⟩", self.flat[lo:hi])
        return ("…" if lo > 0 else "") + snippet + ("…" if hi < len(self.flat) else "")

    def find_all(self, needle: str, ignore_case: bool = False) -> list[Match]:
        """Every non-overlapping occurrence of an already-normalised needle, in reading order."""
        if not needle:
            return []
        hay = self.lowered() if ignore_case else self.flat
        pin = _safe_lower(needle) if ignore_case else needle
        out: list[Match] = []
        at = hay.find(pin)
        while at >= 0:
            start_src = self.source_offset(at)
            end_src = self.source_offset(at + len(pin) - 1)
            line, col = self.line_col(start_src)
            end_line, _ = self.line_col(end_src)
            out.append(Match(self.path, line, end_line, col, self.context(at, len(pin))))
            at = hay.find(pin, at + len(pin))
        return out


def normalize_phrase(phrase: str) -> str:
    """Put a user's phrase through exactly the transformation the haystack went through.

    Fold the typographic quotes to ASCII, collapse every whitespace run to one space, strip the ends. A
    phrase pasted out of a wrapped paragraph — newlines and all — normalises to the same string as the
    prose it came from, which is the whole trick."""
    return " ".join(phrase.translate(_FOLD).split())


def collect_corpus(paths: list[str] | None) -> list[pathlib.Path]:
    """The markdown files to search: the book's prose by default, or whatever `--in` narrowed it to."""
    roots: list[pathlib.Path] = []
    if paths:
        for p in paths:
            rp = pathlib.Path(p)
            if not rp.exists():
                raise SystemExit(f"findprose: no such path: {p}")
            roots.append(rp.resolve())
    else:
        for glob in CORPUS_DIR_GLOBS:
            roots.extend(sorted(d for d in HERE.glob(glob) if d.is_dir()))
        for glob in CORPUS_FILE_GLOBS:
            roots.extend(sorted(f for f in HERE.glob(glob) if f.is_file()))

    files: list[pathlib.Path] = []
    seen: set[pathlib.Path] = set()
    for root in roots:
        if root.is_file():
            candidates = [root]
        else:
            candidates = sorted(root.rglob("*.md"))
        for f in candidates:
            if any(part in SKIP_DIR_NAMES or part.startswith("_") for part in f.parts[:-1]):
                continue
            if f not in seen:
                seen.add(f)
                files.append(f)
    return files


def display_path(p: pathlib.Path) -> str:
    """Relative to the shell's cwd when that is shorter, so the printed location is clickable."""
    try:
        rel = os.path.relpath(p, pathlib.Path.cwd())
    except ValueError:
        return str(p)
    return rel if not rel.startswith("..") else str(p)


def load_docs(files: list[pathlib.Path], keep_comments: bool) -> list[Doc]:
    docs = []
    for f in files:
        docs.append(Doc(f.read_text(encoding="utf-8", errors="replace"), display_path(f), keep_comments))
    return docs


def search(docs: list[Doc], phrase: str, ignore_case: bool) -> list[Match]:
    needle = normalize_phrase(phrase)
    hits: list[Match] = []
    for d in docs:
        hits.extend(d.find_all(needle, ignore_case))
    return hits


# ─────────────────────────────────────────────────────────────────────────────
# Reporting
# ─────────────────────────────────────────────────────────────────────────────

def read_phrase_file(path: str) -> list[str]:
    """One phrase per line. Blank lines and `#` comments are skipped; a leading `- ` or `* ` bullet is
    stripped, so a checklist pasted straight out of a brief works unedited."""
    out = []
    for raw in pathlib.Path(path).read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line[:2] in ("- ", "* "):
            line = line[2:].strip()
        if line:
            out.append(line)
    return out


def report_single(matches: list[Match], phrase: str, out) -> None:
    if not matches:
        print(f"not found: {phrase!r}", file=sys.stderr)
        return
    for m in matches:
        tail = f"   (wraps to line {m.end_line})" if m.end_line > m.line else ""
        print(f"{m.location()}: {m.context}{tail}", file=out)


def report_checklist(results: list[tuple[str, list[Match]]], verbose: bool, out) -> None:
    for phrase, matches in results:
        mark = "✓" if matches else "✗"
        print(f"{mark}  {phrase!r}", file=out)
        if not matches:
            continue
        plural = "match" if len(matches) == 1 else "matches"
        first = matches[0]
        wrap = " (wrapped)" if first.end_line > first.line else ""
        print(f"     {len(matches)} {plural} — {first.location()}{wrap}", file=out)
        if verbose:
            for m in matches[1:]:
                print(f"                    {m.location()}", file=out)
    found = sum(1 for _, m in results if m)
    missing = len(results) - found
    tail = f"  ({missing} MISSING)" if missing else ""
    print(f"\n{len(results)} phrases: {found} found, {missing} missing.{tail}", file=out)


def as_json(results: list[tuple[str, list[Match]]], files: list[pathlib.Path],
            ignore_case: bool, keep_comments: bool) -> dict:
    found = sum(1 for _, m in results if m)
    return {
        "corpus_files": len(files),
        "case_sensitive": not ignore_case,
        "html_comments": "included" if keep_comments else "excluded",
        "phrases": [{"phrase": p, "normalized": normalize_phrase(p), "found": bool(ms),
                     "count": len(ms), "matches": [m.as_dict() for m in ms]} for p, ms in results],
        "found": found,
        "missing": len(results) - found,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Self-test — the line mapping is the claim; this is the evidence
# ─────────────────────────────────────────────────────────────────────────────

def _oracle_line(text: str, source_off: int) -> int:
    """Independent definition of a line number: count the newlines before the offset. Deliberately the
    slow, obvious rule, so it cannot share a bug with the binary search it checks."""
    return text[:source_off].count("\n") + 1


def _selftest() -> int:  # noqa: C901 — a flat list of cases reads better than a dispatch table
    failures: list[str] = []

    def check(name: str, got, want) -> None:
        if got != want:
            failures.append(f"{name}: got {got!r}, want {want!r}")

    # ── The off-by-one battery. Every case names the line the match must be reported on.
    text = (
        "alpha beta gamma\n"          # line 1
        "delta epsilon zeta\n"        # line 2
        "\n"                          # line 3 (blank)
        "eta theta iota kappa\n"      # line 4
        "lambda mu\n"                 # line 5
    )
    d = Doc(text, "t.md")

    check("first char of file → line 1", d.find_all("alpha")[0].line, 1)
    check("first char of file → col 1", d.find_all("alpha")[0].col, 1)
    check("mid line 1", d.find_all("gamma")[0].line, 1)
    check("last token of line 1 → col", d.find_all("gamma")[0].col, 12)
    check("first token of line 2 → line 2", d.find_all("delta")[0].line, 2)
    check("first token of line 2 → col 1", d.find_all("delta")[0].col, 1)
    check("token after a blank line", d.find_all("eta theta")[0].line, 4)
    check("last line", d.find_all("lambda")[0].line, 5)

    # ── Wrapped phrases: the whole reason this tool exists. Reported line is where the match STARTS.
    m = d.find_all("gamma delta")[0]
    check("wrap 1→2 start line", m.line, 1)
    check("wrap 1→2 end line", m.end_line, 2)
    check("wrap 1→2 start col", m.col, 12)
    m = d.find_all("zeta eta theta")[0]
    check("wrap across a blank line, start", m.line, 2)
    check("wrap across a blank line, end", m.end_line, 4)
    m = d.find_all("beta gamma delta epsilon zeta eta")[0]
    check("wrap spanning 3 source lines, start", m.line, 1)
    check("wrap spanning 3 source lines, end", m.end_line, 4)

    # The raw phrase must NOT be findable by a plain substring search — otherwise the case proves nothing.
    for spanning in ("gamma delta", "zeta eta theta"):
        if spanning in text:
            failures.append(f"bad fixture: {spanning!r} does not actually span a wrap")

    # ── Leading blank lines must not shift anything.
    d2 = Doc("\n\n\nfirst real line\n", "t2.md")
    check("leading blank lines", d2.find_all("first")[0].line, 4)
    check("leading blank lines → col", d2.find_all("first")[0].col, 1)

    # ── CRLF endings.
    d3 = Doc("one two\r\nthree four\r\n", "t3.md")
    check("crlf line 2", d3.find_all("three")[0].line, 2)
    check("crlf line 2 col", d3.find_all("three")[0].col, 1)
    check("crlf wrap", d3.find_all("two three")[0].end_line, 2)

    # ── Indented continuation, tabs, and runs of spaces all collapse to one space.
    d4 = Doc("a sentence that\n\t  continues   here\n", "t4.md")
    check("tabs and space runs collapse", len(d4.find_all("that continues here")), 1)
    check("tab continuation start line", d4.find_all("that continues here")[0].line, 1)
    check("tab continuation end line", d4.find_all("that continues here")[0].end_line, 2)

    # ── The oracle cross-check: every match on a synthetic document, against the slow definition.
    body = "\n".join(f"word{i} filler filler filler" for i in range(200)) + "\n"
    d5 = Doc(body, "t5.md")
    for i in range(200):
        hit = d5.find_all(f"word{i} filler")[0]
        src = d5.source_offset(d5.flat.find(f"word{i} filler"))
        if hit.line != _oracle_line(body, src):
            failures.append(f"oracle disagrees on word{i}: {hit.line} vs {_oracle_line(body, src)}")
            break
    # And the independent invariant: the reported source line really does contain the first word.
    for i in (0, 1, 99, 199):
        hit = d5.find_all(f"word{i} ")[0]
        if f"word{i}" not in body.splitlines()[hit.line - 1]:
            failures.append(f"reported line {hit.line} does not contain word{i}")

    # ── Quote and apostrophe folding, both directions.
    d6 = Doc("It was the engineer’s call, and “not a small one” at that.\n", "t6.md")
    check("curly apostrophe found by ascii", len(d6.find_all(normalize_phrase("engineer's call"))), 1)
    check("curly quotes found by ascii", len(d6.find_all(normalize_phrase('"not a small one"'))), 1)
    check("curly query on curly source", len(d6.find_all(normalize_phrase("engineer’s call"))), 1)

    # ── Case sensitivity.
    d7 = Doc("The Gate Rejects the change.\n", "t7.md")
    check("case sensitive misses", len(d7.find_all("the gate rejects")), 0)
    check("ignore-case finds", len(d7.find_all("the gate rejects", ignore_case=True)), 1)
    check("ignore-case keeps the line", d7.find_all("the gate rejects", ignore_case=True)[0].line, 1)

    # ── HTML comments: included by default, droppable, and dropping them must not move a line number.
    ctext = ("prose before\n"
             "<!-- point: a claim that\n"
             "spans two lines -->\n"
             "prose after\n")
    check("comment searched by default", len(Doc(ctext, "c.md").find_all("a claim that spans")), 1)
    check("comment dropped on request",
          len(Doc(ctext, "c.md", keep_comments=False).find_all("a claim that spans")), 0)
    check("line numbers survive comment masking",
          Doc(ctext, "c.md", keep_comments=False).find_all("prose after")[0].line, 4)
    check("no splice across a masked comment",
          len(Doc(ctext, "c.md", keep_comments=False).find_all("prose before prose after")), 0)
    check("line numbers unchanged by masking",
          Doc(ctext, "c.md").find_all("prose after")[0].line,
          Doc(ctext, "c.md", keep_comments=False).find_all("prose after")[0].line)

    # ── Several matches, in reading order, non-overlapping.
    d8 = Doc("aa bb\ncc aa bb\ndd aa bb\n", "t8.md")
    check("all matches found", [m.line for m in d8.find_all("aa bb")], [1, 2, 3])

    # ── The real corpus, if it is here: a phrase known to span a wrap, checked against the source line.
    corpus = collect_corpus(None)
    if corpus:
        docs = load_docs(corpus, keep_comments=True)
        probe = "developed ways to organize production and to specify"
        hits = search(docs, probe, ignore_case=False)
        if not hits:
            failures.append("corpus probe missing — the demonstration phrase moved; re-pick it")
        else:
            h = hits[0]
            if h.end_line <= h.line:
                failures.append("corpus probe no longer spans a wrap — re-pick it")
            src_lines = pathlib.Path(h.path).read_text(encoding="utf-8").splitlines()
            if "developed ways" not in src_lines[h.line - 1]:
                failures.append(f"corpus off-by-one: {h.location()} does not contain 'developed ways'")
            if normalize_phrase(probe) in src_lines[h.line - 1]:
                failures.append("corpus probe fits on one line — it proves nothing")
    else:
        print("note: book corpus not found; ran the synthetic cases only", file=sys.stderr)

    if failures:
        print(f"SELFTEST FAILED — {len(failures)} case(s):", file=sys.stderr)
        for f in failures:
            print(f"  ✗ {f}", file=sys.stderr)
        return 1
    print("selftest: all cases pass (line mapping checked against an independent oracle)")
    return 0


# ─────────────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__.splitlines()[0],
        epilog="exit 0 when every phrase was found, 1 when any was missing.")
    ap.add_argument("phrases", nargs="*", metavar="PHRASE",
                    help="one or more phrases; several give a ✓/✗ checklist and a summary count")
    ap.add_argument("-f", "--from-file", metavar="PATH",
                    help="read phrases one per line (blank lines and '#' comments skipped, a leading "
                         "'- ' bullet stripped) — the preservation-checklist mode")
    ap.add_argument("--in", dest="paths", action="append", metavar="PATH",
                    help="narrow the search to this file or directory (repeatable); default is the "
                         "book's prose")
    ap.add_argument("-i", "--ignore-case", action="store_true",
                    help="case-insensitive; the default is case SENSITIVE, matching grep -F")
    ap.add_argument("--no-comments", action="store_true",
                    help="skip HTML comments; they are SEARCHED by default (a '<!-- point: … -->' claim "
                         "is a legitimate target)")
    ap.add_argument("-v", "--verbose", action="store_true",
                    help="in checklist mode, list every match location, not just the first")
    ap.add_argument("--json", action="store_true", help="emit results as JSON")
    ap.add_argument("-q", "--quiet", action="store_true", help="print nothing; use the exit code")
    ap.add_argument("--list-corpus", action="store_true",
                    help="print the files that would be searched, then exit")
    ap.add_argument("--selftest", action="store_true",
                    help="run the line-mapping self-test (including against the real corpus)")
    args = ap.parse_args(argv)

    if args.selftest:
        return _selftest()

    files = collect_corpus(args.paths)
    if args.list_corpus:
        for f in files:
            print(display_path(f))
        print(f"\n{len(files)} files.", file=sys.stderr)
        return 0
    if not files:
        raise SystemExit("findprose: corpus is empty — check the --in path")

    phrases = list(args.phrases)
    if args.from_file:
        phrases.extend(read_phrase_file(args.from_file))
    if not phrases:
        ap.error("give at least one PHRASE, or --from-file")
    for p in phrases:
        if not normalize_phrase(p):
            ap.error("empty phrase")

    docs = load_docs(files, keep_comments=not args.no_comments)
    results = [(p, search(docs, p, args.ignore_case)) for p in phrases]

    out = sys.stdout
    if args.json:
        print(json.dumps(as_json(results, files, args.ignore_case, not args.no_comments),
                         indent=2, ensure_ascii=False), file=out)
    elif args.quiet:
        pass
    elif len(results) == 1:
        report_single(results[0][1], results[0][0], out)
    else:
        report_checklist(results, args.verbose, out)

    return 0 if all(ms for _, ms in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
