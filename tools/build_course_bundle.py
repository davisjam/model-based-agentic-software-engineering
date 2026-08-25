#!/usr/bin/env python3
"""Build a distributable Teach-with-MAGE course bundle (e.g. mage-course-fall-2026.zip).

The bundle packages the AUTHORITATIVE Markdown sources under course/ (syllabus, schedule, lectures,
exercises, assessments, project materials, rubrics, instructor guidance) plus the content LICENSE and a
manifest. There is no duplication: the repository's course/ is the single source, and this bundles it.

Stdlib-only (matches catalog.py). Emits a PLAN before + a RESULT summary after (durations, counts, the
output path), so a caller can mechanically confirm what shipped.

Usage:
    python3 tools/build_course_bundle.py [--term fall-2026] [--out dist/] [--dry-run]
"""
from __future__ import annotations
import argparse, pathlib, sys, zipfile, hashlib, json

REPO = pathlib.Path(__file__).resolve().parent.parent
COURSE = REPO / "course"

# What ships in the bundle: the whole course/ tree (authoritative), minus site-internal nav files.
_EXCLUDE_NAMES = {".DS_Store"}
_EXCLUDE_SUFFIXES = {".pyc"}


def _members() -> list[pathlib.Path]:
    out: list[pathlib.Path] = []
    for p in sorted(COURSE.rglob("*")):
        if p.is_dir():
            continue
        if p.name in _EXCLUDE_NAMES or p.suffix in _EXCLUDE_SUFFIXES:
            continue
        if "__pycache__" in p.parts:
            continue
        out.append(p)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Build the Teach-with-MAGE course bundle.")
    ap.add_argument("--term", default="fall-2026", help="semester tag in the archive name (default: fall-2026)")
    ap.add_argument("--out", default="dist", help="output directory (default: dist/, gitignored)")
    ap.add_argument("--dry-run", action="store_true", help="print the plan; do not write the archive")
    args = ap.parse_args()

    if not COURSE.is_dir():
        print("ERROR: course/ not found — run from the repository root.", file=sys.stderr)
        return 1

    members = _members()
    outdir = (REPO / args.out)
    archive = outdir / f"mage-course-{args.term}.zip"

    # ── PLAN ──
    print("== Course bundle — PLAN ==")
    print(f"  term:     {args.term}")
    print(f"  source:   {COURSE.relative_to(REPO)}/ ({len(members)} files)")
    print(f"  archive:  {archive.relative_to(REPO)}")
    placeholders = sum(1 for p in members if p.suffix == ".md" and "status: placeholder" in p.read_text()[:400])
    print(f"  NOTE:     {placeholders} page(s) are still placeholders (status: placeholder) — bundle ships them as-is.")
    if args.dry_run:
        print("  --dry-run: no archive written.")
        return 0

    # ── BUILD ──
    outdir.mkdir(parents=True, exist_ok=True)
    manifest = {"term": args.term, "files": [], "placeholder_pages": placeholders}
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
        for p in members:
            arc = pathlib.Path(f"mage-course-{args.term}") / p.relative_to(COURSE)
            z.write(p, arc.as_posix())
            manifest["files"].append(arc.as_posix())
        z.writestr(f"mage-course-{args.term}/BUNDLE-MANIFEST.json", json.dumps(manifest, indent=2))

    sha = hashlib.sha256(archive.read_bytes()).hexdigest()[:16]
    size_kb = archive.stat().st_size // 1024

    # ── RESULT ──
    print("\n== Course bundle — RESULT ==")
    print(f"  wrote:    {archive.relative_to(REPO)}  ({size_kb} KiB, {len(members)+1} entries)")
    print(f"  sha256:   {sha}…")
    print(f"  attach this to a tagged release (see course/README.md § Publishing a release).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
