#!/usr/bin/env python3
"""Compile print sources; final logs fail closed except underfull box diagnostics.

Intermediate rerun warnings are expected; only the converged final log is judged.
Overfull boxes, missing glyphs, undefined references and font substitutions fail.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ALLOWLIST = (re.compile(r"^Underfull \\[hv]box\b"),)
DIAGNOSTIC = re.compile(
    r"^(?:!|(?:LaTeX(?: Font)?|Package \S+|Class \S+|Module \S+).*\bWarning\b|"
    r".*\bwarning:|Overfull \\[hv]box|Underfull \\[hv]box|Missing character:|LaTeX Error:)",
    re.IGNORECASE,
)


def diagnostics(log: str) -> tuple[list[str], list[str]]:
    """Return rejected and explicitly allowed diagnostics, retaining line numbers."""
    rejected, allowed = [], []
    for line_number, line in enumerate(log.splitlines(), 1):
        if not DIAGNOSTIC.search(line):
            continue
        entry = f"{line_number}: {line}"
        (allowed if any(p.search(line) for p in ALLOWLIST) else rejected).append(entry)
    return rejected, allowed


def single_page_tables(latex: str, labels: set[str], *, placement: str = "p",
                       start_on_new_page: bool = False) -> str:
    """Float selected compact comparisons together; default to a dedicated table page.

    Keep the first header and final rule exactly once. This is an explicit print
    layout choice: ordinary longtables retain their multipage behavior.
    A new page can keep a closing comparison ahead of the next section.
    """
    def convert(match):
        block = match[0]
        if not any(r'\label{' + label + '}' in block for label in labels):
            return block
        preamble, content = block.split(r'\caption', 1)
        caption, content = content.split(r'\tabularnewline', 1)
        header, content = content.split(r'\endfirsthead', 1)
        _, content = content.split(r'\endhead', 1)
        footer, body = content.split(r'\endlastfoot', 1)
        body = body.removesuffix(r'\end{longtable}')
        tabular = re.sub(r'\\begin\{longtable\}(?:\[[^]]*\])?', lambda _: r'\begin{tabular}', preamble, count=1)
        prefix = '\\clearpage\n' if start_on_new_page else ''
        return (prefix + r'\begin{table}[' + placement + ']' + '\n' + r'\centering\footnotesize\booktablecaptionstyle' + '\n' + r'\caption' + caption + '\n'
                + tabular + header + body + footer + r'\end{tabular}' + '\n' + r'\end{table}')
    return re.sub(r'\\begin\{longtable\}.*?\\end\{longtable\}', convert, latex, flags=re.S)


def plain_table_bodies(latex: str) -> str:
    """Reserve bold type for column headings in native longtable bodies."""
    def table(match):
        head, marker, body = match[0].partition(r'\endhead')
        if not marker:
            raise ValueError('Table has no explicit header/body boundary')
        while (start := body.find(r'\textbf{')) >= 0:
            opening = start + len(r'\textbf')
            end = opening + 1
            depth = 1
            while end < len(body) and depth:
                if body[end] in '{}' and body[end-1] != '\\':
                    depth += 1 if body[end] == '{' else -1
                end += 1
            if depth:
                raise ValueError('Unbalanced bold table cell')
            body = body[:start] + body[opening+1:end-1] + body[end:]
        body = re.sub(r'\\bfseries\b\s*', '', body)
        return head + marker + body
    return re.sub(r'\\begin\{longtable\}.*?\\end\{longtable\}', table, latex, flags=re.S)


def keep_tables_together(latex: str, *, in_place_labels: frozenset[str] = frozenset()) -> str:
    """Keep each caption and table together, using native floats outside insets.

    Preserve reading order, column geometry, row content and the first header.
    Oversize blocks must be redesigned; the strict overfull-box gate rejects them.
    This also works inside a breakable inset, where a table float would be lost.
    Selected tables stay in reading order when following prose depends on them.
    """
    def table(match):
        header, marker, remainder = match[0].partition(r'\endhead')
        if not marker:
            raise ValueError('Table has no explicit header/body boundary')
        header = header.split(r'\endfirsthead', 1)[0]
        footer, boundary, body = remainder.partition(r'\endlastfoot')
        if not boundary:
            footer, body = '', remainder
        body = body.removesuffix(r'\end{longtable}')
        caption = ''
        cap = re.search(r'\\caption(?:\[[^]]*\])?\{', header)
        if cap:
            end = cap.end()
            depth = 1
            while end < len(header) and depth:
                if header[end] in '{}' and header[end-1] != '\\':
                    depth += 1 if header[end] == '{' else -1
                end += 1
            if depth:
                raise ValueError('Unbalanced table caption')
            suffix = re.match(r'\s*(?:\\label\{[^}]+\})?\s*(?:\\tabularnewline|\\\\)', header[end:])
            if not suffix:
                raise ValueError('Table caption lacks row terminator')
            cap_end = end + suffix.end()
            caption = header[cap.start():cap_end]
            caption = re.sub(r'(?:\\tabularnewline|\\\\)$', '', caption)
            caption = caption.replace(r'\caption', r'\captionof{table}', 1)
            header = header[:cap.start()] + header[cap_end:]
        header = re.sub(r'\\begin\{longtable\}(?:\[[^]]*\])?',
                        lambda _: r'\begin{tabular}', header, count=1)
        # Ordinary tables use LaTeX's native float placement. Insets cannot
        # contain floats, so keep their tables in a nonfloating minipage.
        before = latex[:match.start()]
        inset = any(before.count(r'\begin{' + env + '}') > before.count(r'\end{' + env + '}')
                    for env in ('quote', 'bookbox', 'bookinset', 'tcolorbox', 'minipage'))
        content = caption + '\n' + header + body + footer + r'\end{tabular}'
        in_place = any(r'\label{' + label + '}' in match[0] for label in in_place_labels)
        if inset or in_place:
            return ('\\par\\addvspace{\\baselineskip}\\noindent\n'
                    '\\begin{minipage}{\\linewidth}\\centering\n'
                    '\\booktablecaptionstyle\\captionsetup{hypcap=false}\n' + content +
                    '\n\\end{minipage}\\par\n\\addvspace{\\baselineskip}')
        return ('\\begin{table}[!htbp]\n\\centering\\footnotesize\\booktablecaptionstyle\n' +
                content.replace(r'\captionof{table}', r'\caption', 1) + '\n\\end{table}')
    return re.sub(r'\\begin\{longtable\}.*?\\end\{longtable\}', table, latex, flags=re.S)


def layout_selected_table(latex: str, label: str, proportions: tuple[float, ...],
                          *, row_gap_bp: float = 4, row_stretch: float = 1.2) -> str:
    """Give a reviewed table content-appropriate columns and readable row spacing.

    Projection through Markdown loses native column proportions. Restore this
    local print choice without touching other tables or changing cell content.
    """
    if (not proportions or any(not 0 < p < 1 for p in proportions)
            or abs(sum(proportions) - 1) > .0001
            or not 0 <= row_gap_bp <= 12 or not 1 <= row_stretch <= 2):
        raise ValueError('Invalid reviewed table geometry')
    def table(match):
        block = match[0]
        if r'\label{' + label + '}' not in block:
            return block
        preamble, caption, remainder = block.partition(r'\caption')
        cells = list(re.finditer(r'\\real\{[0-9.]+\}', preamble))
        if not caption or len(cells) != len(proportions):
            raise ValueError('Column count changed for ' + label)
        for cell, width in reversed(list(zip(cells, proportions))):
            preamble = preamble[:cell.start()] + r'\real{' + f'{width:.4f}' + '}' + preamble[cell.end():]
        header, footer, body = remainder.partition(r'\endlastfoot')
        if not footer:
            raise ValueError('Expected table body boundary for ' + label)
        body = re.sub(r'\\\\(?=\s*\n)', lambda _: r'\\[' + str(row_gap_bp) + 'bp]', body)
        return ('{\\renewcommand{\\arraystretch}{' + str(row_stretch) + '}\n' +
                preamble + caption + header + footer + body + '\n}')
    return re.sub(r'\\begin\{longtable\}.*?\\end\{longtable\}', table, latex, flags=re.S)


def bold_table_headers(latex: str) -> str:
    """Style Pandoc longtable header cells, including repeated page headers.

    Header minipages provide a local font scope; captions and body cells remain
    unchanged. Apply after conversion so generated tables use the same policy.
    """
    def table(match):
        header, separator, body = match[0].partition(r"\endhead")
        if not separator:
            return match[0]
        header = re.sub(
            r"(\\begin\{minipage\}\[b\]\{\\linewidth\}\\(?:raggedright|centering|raggedleft))(?!\\bfseries)",
            lambda cell: cell[0] + r"\bfseries", header)
        def compact_head(rule):
            content = rule[2]
            if r"\begin{minipage}" in content:
                return rule[0]
            # Compact Pandoc tables use ordinary cells rather than minipages.
            def row(match):
                cells = re.split(r"(?<!\\)&", match[1])
                cells = [cell.strip() if cell.strip().startswith(r"{\bfseries ") else
                         r"{\bfseries " + cell.strip() + "}" for cell in cells]
                return " & ".join(cells) + r" \\" + "\n"
            content = re.sub(r"(.*?)\\\\\s*", row, content, flags=re.S)
            return rule[1] + content + rule[3]
        header = re.sub(
            r"(\\(?:toprule|hline)(?:\\noalign\{\})?\s*)(.*?)(\\(?:midrule|hline))",
            compact_head, header, flags=re.S)
        return header + separator + body
    return re.sub(r"\\begin\{longtable\}.*?\\end\{longtable\}", table, latex, flags=re.S)


def namespace_heading_links(latex: str, slug: str) -> str:
    """Keep same-chapter links attached when repeated heading IDs are qualified."""
    pattern = r'(\\(?:sub)*section\*?\{[^\n]+\}\\label\{)([^}]+)(\})'
    destinations = {}
    def heading(match):
        old = match[2]
        target = slug + ':' + old
        destinations[old] = target
        # Pandoc links use the Markdown heading ID, without our TeX prefix.
        destinations[old.removeprefix('heading:')] = target
        return match[1] + target + match[3]
    latex = re.sub(pattern, heading, latex)
    return re.sub(r'(\\hyperref\[)([^\]]+)(\])',
                  lambda m: m[1] + destinations.get(m[2], m[2]) + m[3], latex)


def restore_chapter_heading_links(latex: str, destinations: dict[str, str]) -> str:
    """Restore internal PDF destinations from the web projection's chapter URLs.

    Only authored heading IDs harvested from the assembled records are eligible.
    Other links, including figure URLs, external sites and unknown anchors, retain
    their existing meaning. The content argument is left untouched.
    """
    def restore(match):
        url = match[1].replace(r'\#', '#')
        target = destinations.get(url)
        return r'\hyperref[' + target + ']' if target else match[0]
    return re.sub(r'\\href\{([^{}]+)\}', restore, latex)


def compile_tex(source: Path, output_dir: Path | None = None, *,
                texmf_cache: Path | str | None = None) -> Path:
    source = Path(source).resolve()
    output_dir = Path(output_dir).resolve() if output_dir else source.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    engine = shutil.which("lualatex")
    if not engine:
        raise RuntimeError("LuaLaTeX is required (TeX Live 2025 or newer).")
    env = os.environ.copy()
    env["TEXINPUTS"] = str(ROOT / "latex") + os.pathsep + env.get("TEXINPUTS", "")
    # Reuse one local cache across whole books, excerpts and covers. Rebuilding the
    # system font database in every output directory dominates cold compile time.
    #
    # `texmf_cache` overrides it for ONE call, which is what makes concurrent compilation safe: two
    # LuaLaTeX processes sharing one luaotfload database can corrupt it, so a caller that runs several
    # compiles at once hands each worker its own cache. The env var stays the default for every serial
    # caller, and an explicit argument beats it because the parallel caller cannot set per-thread environ.
    cache = Path(texmf_cache or env.get("MAGE_TEXMF_CACHE",
                                        str(ROOT / "latex" / "build" / ".texmf-var")))
    cache.mkdir(parents=True, exist_ok=True)
    env["TEXMFVAR"] = str(cache)
    env["TEXMFCACHE"] = str(cache)
    cmd = [engine, "-interaction=nonstopmode", "-halt-on-error", "-file-line-error",
           "-no-shell-escape", "-recorder", f"-output-directory={output_dir}", str(source)]
    # An explicitly fresh all-edition build must not read partial auxiliary or
    # MathML files left by an interrupted run. Keep the previous PDF available.
    if env.get("MAGE_PDF_SPLIT_FORCE"):
        for suffix in (".aux", ".bbl", ".blg", ".toc", ".out", ".lof", ".lot",
                       "-luamml-mathml.html"):
            (output_dir / f"{source.stem}{suffix}").unlink(missing_ok=True)
    previous = None
    bibliography_state = None
    # A cold full-book build can need more than five passes for bibliography,
    # page references, and tagged MathML associations to settle.
    max_passes = 8
    for attempt in range(1, max_passes + 1):
        result = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True)
        (output_dir / f"{source.stem}.console.txt").write_text(result.stdout + result.stderr)
        if result.returncode:
            raise RuntimeError(f"LuaLaTeX failed: {source}\n" + result.stdout[-6000:] + result.stderr[-2000:])
        aux_path = output_dir / f"{source.stem}.aux"
        aux = aux_path.read_text() if aux_path.exists() else ""
        bib_lines = "\n".join(line for line in aux.splitlines()
                              if line.startswith((r"\citation", r"\bibdata", r"\bibstyle")))
        if r"\bibdata" in aux and bibliography_state != bib_lines:
            bibtex = shutil.which("bibtex")
            if not bibtex:
                raise RuntimeError("BibTeX is required for this manuscript.")
            bib_env = env.copy()
            bib_env["BIBINPUTS"] = str(ROOT) + os.pathsep + str(ROOT / "book") + os.pathsep
            bib_env["BSTINPUTS"] = str(ROOT) + os.pathsep + env.get("BSTINPUTS", "")
            bib = subprocess.run([bibtex, source.stem], cwd=output_dir, env=bib_env,
                                 capture_output=True, text=True)
            if bib.returncode or re.search(r"Warning--|I couldn't|error message", bib.stdout + bib.stderr):
                raise RuntimeError("BibTeX diagnostics:\n" + bib.stdout + bib.stderr)
            bibliography_state = bib_lines
            previous = None
            continue
        # The auxiliary state must stabilize, including TOC and bookmark destinations.
        state = tuple((output_dir / f"{source.stem}.{suffix}").read_bytes()
                      if (output_dir / f"{source.stem}.{suffix}").exists() else b""
                      for suffix in ("aux", "toc", "out", "lof", "lot"))
        # LuaMML generates associations for the next pass; the final PDF must
        # embed math from the current source rather than a prior partial run.
        mathml = output_dir / f"{source.stem}-luamml-mathml.html"
        state += (mathml.read_bytes() if mathml.exists() else b"",)
        if state == previous:
            break
        previous = state
    else:
        raise RuntimeError(f"LaTeX auxiliary state did not converge after {max_passes} passes: {source}")
    log_path = output_dir / f"{source.stem}.log"
    rejected, allowed = diagnostics(log_path.read_text(errors="replace"))
    if rejected:
        raise RuntimeError(f"Unapproved LaTeX diagnostics in {log_path}:\n" + "\n".join(rejected))
    pdf = output_dir / f"{source.stem}.pdf"
    if not pdf.is_file() or pdf.stat().st_size == 0:
        raise RuntimeError(f"LaTeX produced no PDF: {pdf}")
    print(f"LaTeX: {pdf} ({attempt} passes; {len(allowed)} allowed underfull boxes; zero unapproved diagnostics)")
    return pdf


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()
    compile_tex(args.source, args.output_dir)
