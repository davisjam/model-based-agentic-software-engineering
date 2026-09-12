#!/usr/bin/env python3
"""render-books-local.py — render BOTH published books into a local preview tree.

Mirrors the published Pages layout locally: both books land under their own named
subfolders so a developer can render them and open each where the deployed site
serves it.

    _local-books/
      mage-book/mage-book.pdf                         (the MAGE book — via book/build_book.py --pdf)
      se-handbook/software-engineering-handbook.pdf   (the SE Handbook  — via make -C handbook book)

This script is STDLIB-ONLY and deliberately separate from `catalog.py` (which stays
stdlib-only + clone-and-run). It shells out to each book's OWN toolchain rather than
importing it:

  - MAGE book: `python3 book/build_book.py --pdf --no-split` (print-native Typst path;
    requires Typst + the book/requirements-pdf.txt deps its own path installs).
  - SE Handbook: `make -C handbook book` (Pandoc → AST → Typst path; requires Pandoc,
    Typst, and PyYAML — the handbook's own toolchain, documented in handbook/README.md).

Each renderer FAILS LOUD on error; this script aborts (non-zero) rather than shipping a
partial preview tree.

Usage:
    python3 scripts/render-books-local.py            # render both books
    python3 scripts/render-books-local.py --out DIR  # preview tree location (default: _local-books/)
    python3 scripts/render-books-local.py --only mage-book|se-handbook
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MAGE_PDF_SRC = ROOT / "book" / "mage-book.pdf"
HANDBOOK_PDF_SRC = ROOT / "handbook" / "dist" / "software-engineering-handbook.pdf"


def _run(cmd: list[str]) -> None:
    print(f"\n== $ {' '.join(cmd)}")
    proc = subprocess.run(cmd, cwd=ROOT)
    if proc.returncode != 0:
        sys.exit(f"ABORT: `{' '.join(cmd)}` failed (exit {proc.returncode}).")


def render_mage_book(out: Path) -> Path:
    """Render the MAGE book PDF and place it under out/mage-book/."""
    _run([sys.executable, str(ROOT / "book" / "build_book.py"), "--pdf", "--no-split"])
    if not MAGE_PDF_SRC.is_file():
        sys.exit(f"ABORT: expected {MAGE_PDF_SRC} after --pdf render; not found.")
    dest_dir = out / "mage-book"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / "mage-book.pdf"
    shutil.copy2(MAGE_PDF_SRC, dest)
    return dest


def render_se_handbook(out: Path) -> Path:
    """Render the SE Handbook PDF and place it under out/se-handbook/."""
    _run(["make", "-C", str(ROOT / "handbook"), "book"])
    if not HANDBOOK_PDF_SRC.is_file():
        sys.exit(f"ABORT: expected {HANDBOOK_PDF_SRC} after `make -C handbook book`; not found.")
    dest_dir = out / "se-handbook"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / "software-engineering-handbook.pdf"
    shutil.copy2(HANDBOOK_PDF_SRC, dest)
    return dest


def main() -> int:
    ap = argparse.ArgumentParser(description="Render both books into a local preview tree.")
    ap.add_argument("--out", default=str(ROOT / "_local-books"),
                    help="preview tree location (default: _local-books/)")
    ap.add_argument("--only", choices=["mage-book", "se-handbook"],
                    help="render just one book (default: both)")
    args = ap.parse_args()

    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)

    produced: list[Path] = []
    if args.only != "se-handbook":
        produced.append(render_mage_book(out))
    if args.only != "mage-book":
        produced.append(render_se_handbook(out))

    print("\n== Local preview tree ready:")
    for p in produced:
        size = p.stat().st_size
        print(f"   {p.relative_to(ROOT)}  ({size / 1024:.0f} KiB)")
    print(f"\nOpen them under {out.relative_to(ROOT)}/ — mage-book/ and se-handbook/ mirror the "
          "deployed /mage-book/ and /se-handbook/ paths.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
