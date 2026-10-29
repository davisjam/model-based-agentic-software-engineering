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


def compile_tex(source: Path, output_dir: Path | None = None) -> Path:
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
    cache = Path(env.get("MAGE_TEXMF_CACHE", str(ROOT / "latex" / "build" / ".texmf-var")))
    cache.mkdir(parents=True, exist_ok=True)
    env["TEXMFVAR"] = str(cache)
    env["TEXMFCACHE"] = str(cache)
    cmd = [engine, "-interaction=nonstopmode", "-halt-on-error", "-file-line-error",
           "-no-shell-escape", "-recorder", f"-output-directory={output_dir}", str(source)]
    previous = None
    bibliography_state = None
    for attempt in range(1, 6):
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
        raise RuntimeError(f"LaTeX auxiliary state did not converge after 5 passes: {source}")
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
