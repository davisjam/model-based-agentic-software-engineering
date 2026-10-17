#!/usr/bin/env python3
"""Package a successfully compiled print assembly and its local inputs for sharing.

The bundle contains resolved native TeX, not the catalogue/web generation toolchain.
Run from its root with LuaLaTeX; no absolute checkout paths are retained in text inputs.
"""
from __future__ import annotations
import argparse
import re
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TEXT = {'.tex', '.sty', '.bib', '.bbl', '.bst'}
INPUTS = TEXT | {'.png', '.jpg', '.jpeg', '.pdf', '.eps', '.ttf', '.otf'}


def bundle(source: Path, destination: Path) -> Path:
    source = source.resolve()
    source.relative_to(ROOT)
    recorder = source.with_suffix('.fls')
    pdf = source.with_suffix('.pdf')
    if not recorder.exists() or not pdf.exists():
        raise RuntimeError('Compile the print assembly successfully before bundling it.')
    paths = {source, ROOT / 'latex/house.sty'}
    for line in recorder.read_text().splitlines():
        if not line.startswith('INPUT '):
            continue
        candidate = Path(line[6:])
        candidate = (ROOT / candidate).resolve() if not candidate.is_absolute() else candidate.resolve()
        if candidate.is_relative_to(ROOT) and candidate.is_file() and candidate.suffix.lower() in INPUTS:
            paths.add(candidate)
    # BibTeX runs separately, so its databases and custom styles do not appear
    # in LuaLaTeX's recorder. Include the paths declared by the assembly.
    for tex in list(paths):
        if tex.suffix != '.tex':
            continue
        for command, names in re.findall(r'\\(bibliography|bibliographystyle)\{([^}]+)\}', tex.read_text()):
            suffix = '.bib' if command == 'bibliography' else '.bst'
            for name in names.split(','):
                candidate = ROOT / (name.strip() + suffix)
                if candidate.is_file():
                    paths.add(candidate.resolve())
                    notice = candidate.with_name(candidate.stem + "-SOURCE.txt")
                    if notice.is_file():
                        paths.add(notice.resolve())
    bbl = source.with_suffix('.bbl')
    if bbl.exists():
        paths.add(bbl)
    # LuaTeX may load cached font metrics without recording the original font file.
    paths.update(p for p in (ROOT / 'book/fonts').rglob('*') if p.is_file()
                 and (p.suffix.lower() in {'.ttf', '.otf', '.txt'} or 'license' in p.name.lower()))
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(paths):
            name = ('main.tex' if path == source else 'main.bbl' if path == bbl
                    else path.relative_to(ROOT).as_posix())
            data = path.read_bytes()
            if path.suffix in TEXT:
                data = data.decode().replace(str(ROOT) + '/', '').encode()
            archive.writestr(name, data)
        archive.writestr('README.txt', '''Resolved LaTeX print manuscript

Compile from this directory with TeX Live 2025 or newer:
  TEXINPUTS=./latex: lualatex -no-shell-escape -interaction=nonstopmode -halt-on-error main.tex
Repeat until references and contents converge (usually 2–4 passes).
If main.aux requests a bibliography, run bibtex main between passes.

main.tex contains the resolved manuscript; latex/house.sty controls its layout.
Fonts and figure inputs retain their relative directories and font license files.
This bundle needs no Python, Pandoc, Typst, catalogue, or web build to typeset.
It reproduces the house edition, not a publisher-specific submission template.
''')
    print(f'LaTeX source bundle: {destination}')
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    bundle(args.source, args.destination)
