#!/usr/bin/env python3
"""Exercise real covers with the frozen CI tagging packages before publication.

The TeX Live year does not identify its kernel/package revisions. Prefer matching
native tools; otherwise use the pinned Linux image with isolated generated files.
No host TeX packages are installed or changed. --native is fail-closed in CI.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "latex/toolchain.json"


def fingerprint():
    def tex_file(name):
        path = subprocess.check_output(["kpsewhich", name], text=True).strip()
        return Path(path).read_text()
    kernel = re.search(r"\\edef\\fmtversion\s*\{([^}]+)\}", tex_file("latex.ltx"))
    tagpdf = re.search(r"\\ProvidesExplPackage\s*\{tagpdf\}\s*\{([^}]+)\}\s*\{([^}]+)\}", tex_file("tagpdf.sty"))
    if not kernel or not tagpdf:
        raise RuntimeError("Cannot identify the LaTeX kernel and tagpdf package")
    return dict(latex_kernel=kernel[1], tagpdf_date=tagpdf[1], tagpdf_version=tagpdf[2])


def matches(actual, expected):
    return all(actual.get(key) == expected[key] for key in
               ("latex_kernel", "tagpdf_date", "tagpdf_version"))


def check_native(directory, expected):
    from latex_build import compile_tex
    actual = fingerprint()
    print("Print toolchain:", json.dumps(actual), flush=True)
    if not matches(actual, expected):
        raise RuntimeError("Print toolchain differs from latex/toolchain.json; use the pinned Linux runner")
    sources = [directory / "mage-cover.tex", directory / "handbook-cover.tex"]
    for source in sources:
        compile_tex(source)
    # A behavioral negative control: the actual old cover must still fail. This
    # catches a missing/inactive tag checker, not just a missing wrapper string.
    broken = directory / "unmarked-cover.tex"
    broken.write_text(sources[0].read_text().replace(r"\begin{bookdecorative}", "")
                      .replace(r"\end{bookdecorative}", ""))
    try:
        compile_tex(broken)
    except RuntimeError as error:
        if "Parent-Child 'pdf2:Document' --> 'MC (realcontent)'" not in str(error):
            raise
    else:
        raise RuntimeError("Negative control failed: unmarked shipout artwork was accepted")
    print("Print tagging: both real covers pass; unmarked artwork is rejected.", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--native", action="store_true", help="require the frozen native compiler (CI)")
    parser.add_argument("--prepared", type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args()
    expected = json.loads(MANIFEST.read_text())
    if args.prepared:
        check_native(args.prepared, expected)
        return
    directory = ROOT / "latex/build/ci-tagging"
    directory.mkdir(parents=True, exist_ok=True)
    from mage_cover import write_cover_source
    write_cover_source(directory)
    sys.path.insert(0, str(ROOT / "handbook/scripts"))
    from latex_pdf import write_cover_source as handbook_source
    handbook_source(directory)
    try:
        actual = fingerprint()
    except (OSError, subprocess.CalledProcessError, RuntimeError):
        actual = {}
    if args.native or matches(actual, expected):
        check_native(directory, expected)
    else:
        print("Host print toolchain differs:", json.dumps(actual), flush=True)
        print("Checking with frozen CI Linux image:", expected["linux_image"], flush=True)
        build = ROOT / "latex/build"
        command = ["docker", "run", "--rm", "--platform", "linux/amd64",
                   "--mount", f"type=bind,src={ROOT},dst={ROOT},readonly",
                   "--mount", f"type=bind,src={build},dst={build}", "-w", str(ROOT),
                   "-e", f"MAGE_TEXMF_CACHE={build / '.texmf-ci'}", expected["linux_image"],
                   "python3", "tools/check_print_toolchain.py", "--native", "--prepared", str(directory)]
        subprocess.run(command, check=True)
    # Keep title/author text semantic: the fix must not artifact the whole cover.
    from pdf_structure import check_pdf
    for name in ("mage-cover.pdf", "handbook-cover.pdf"):
        check_pdf(directory / name, headings=0)


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Print toolchain check failed: {error}", file=sys.stderr)
        sys.exit(1)
