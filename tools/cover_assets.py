"""Derive both landing cover thumbnails from the books' own Typst covers.

manifest -> Typst cover -> full-res PNG -> Pillow downscale -> book/assets/<name>-thumb.png
The thumbs are gitignored build artifacts (created, never committed) — same posture as
mage-book.pdf. Regenerate on demand: python3 tools/cover_assets.py regen [mage|handbook|all]
Requires: typst on PATH; Pillow (book/requirements-pdf.txt); PyYAML for the handbook cover.

C3 invariant: no validate check or test may require these thumb files to exist — they are
produced by the ePub/handbook build steps that run AFTER validate/build in CI. Keep it that way.
"""
import pathlib
import shutil
import subprocess
import sys

GC_ROOT   = pathlib.Path(__file__).resolve().parent.parent
FONT_PATH = GC_ROOT / "book" / "fonts"          # both covers use the MAGE self-hosted faces
ASSETS    = GC_ROOT / "book" / "assets"
MAGE_THUMB     = ASSETS / "cover-thumb.png"
HANDBOOK_THUMB = ASSETS / "handbook-cover-thumb.png"
COVER_PPI    = 180                               # 1530x1980 on US-letter — both ePub renders' value
THUMB_HEIGHT = 400                               # landing raster height; width follows cover aspect


def render_cover_png(typ_source: str, out_png: pathlib.Path, *, root: pathlib.Path,
                     font_path: pathlib.Path = FONT_PATH, ppi: int = COVER_PPI) -> pathlib.Path:
    """The ONE typst-cover->PNG core: write out_png's sibling .typ, then `typst compile
    --format png --ppi <ppi> --root <root> --font-path <font_path>`. Fail loud on rc!=0 or a
    missing output (mirrors book_epub.py's error text incl. the install-typst hint)."""
    typst = shutil.which("typst")
    if not typst:
        raise SystemExit("cover_assets: `typst` not found on PATH — the thumb render reuses the "
                         "print cover (install typst, as the --pdf path requires)")
    out_png.parent.mkdir(parents=True, exist_ok=True)
    cover_typ = out_png.with_suffix(".typ")
    cover_typ.write_text(typ_source, encoding="utf-8")
    r = subprocess.run(
        [typst, "compile", "--format", "png", "--ppi", str(ppi), "--root", str(root),
         "--font-path", str(font_path), str(cover_typ), str(out_png)],
        capture_output=True, text=True)
    if r.returncode != 0 or not out_png.is_file():
        raise SystemExit(f"cover_assets: cover Typst compile failed (rc={r.returncode}):\n{r.stderr}")
    return out_png


def write_thumb(cover_png: pathlib.Path, out_thumb: pathlib.Path, *,
                height: int = THUMB_HEIGHT) -> pathlib.Path:
    """Pillow downscale of a full-res cover PNG to the landing thumbnail (width follows the cover
    aspect at the requested height). Guarded Pillow import, fail-loud pointing at the PDF toolset."""
    try:
        from PIL import Image  # noqa: E402 — the --pdf toolset (book/requirements-pdf.txt)
    except ImportError:
        raise SystemExit("cover_assets: Pillow missing — install book/requirements-pdf.txt (the "
                         "cover downscale needs PIL.Image)")
    im = Image.open(cover_png).convert("RGB")
    w = round(im.width * height / im.height)
    out_thumb.parent.mkdir(parents=True, exist_ok=True)
    im.resize((w, height), Image.LANCZOS).save(out_thumb, "PNG", optimize=True)
    return out_thumb


def mage_cover_png(work_dir: pathlib.Path) -> pathlib.Path:
    """MAGE provider: render the SAME titled Typst cover the print PDF opens with to a full-res PNG."""
    book_dir = str(GC_ROOT / "book")
    if book_dir not in sys.path:
        sys.path.insert(0, book_dir)
    import book_typst  # noqa: E402 — deferred: pulls the whole print emitter; cover-only use (book_epub.py:189)
    book_typst._EmitCtx(GC_ROOT)
    typ_source = book_typst._PREAMBLE + "\n" + book_typst._cover_typst() + "\n"
    return render_cover_png(typ_source, work_dir / "epub-cover.png", root=GC_ROOT)


def handbook_cover_png(work_dir: pathlib.Path, book: "dict | None" = None) -> pathlib.Path:
    """Handbook provider: the same one-page hb-cover doc the handbook ePub build writes, rendered to
    a full-res PNG. `book` defaults to handbook/book.yaml (guarded PyYAML import)."""
    if book is None:
        try:
            import yaml  # noqa: E402 — the handbook toolset (PyYAML); guarded fail-loud below
        except ImportError:
            raise SystemExit("cover_assets: PyYAML missing — the handbook cover reads "
                             "handbook/book.yaml (pip install pyyaml)")
        with open(GC_ROOT / "handbook" / "book.yaml", encoding="utf-8") as fh:
            book = yaml.safe_load(fh)
    # Titles carry no `"` today; keep build.py's existing f-string quoting verbatim (no escaper here).
    typ_source = "\n".join([
        '#import "/handbook/typst/cover.typ": hb-cover',
        "#hb-cover(",
        f'  title: "{book["title"]}",',
        f'  subtitle: "{book["subtitle"]}",',
        f'  author: "{book["author"]}",',
        ")",
        "",
    ])
    return render_cover_png(typ_source, work_dir / "cover.png", root=GC_ROOT)


def regen_mage_thumb(work_dir: pathlib.Path = GC_ROOT / "book" / "_typst") -> pathlib.Path:
    return write_thumb(mage_cover_png(work_dir), MAGE_THUMB)


def regen_handbook_thumb(work_dir: pathlib.Path = GC_ROOT / "handbook" / "generated" / "epub",
                         book: "dict | None" = None) -> pathlib.Path:
    return write_thumb(handbook_cover_png(work_dir, book), HANDBOOK_THUMB)


def _regen(which: str) -> int:
    if which not in ("mage", "handbook", "all"):
        print("usage: python3 tools/cover_assets.py regen [mage|handbook|all]", file=sys.stderr)
        return 1
    try:
        if which in ("mage", "all"):
            p = regen_mage_thumb()
            print(f"wrote {p} ({p.stat().st_size} bytes)")
        if which in ("handbook", "all"):
            p = regen_handbook_thumb()
            print(f"wrote {p} ({p.stat().st_size} bytes)")
    except SystemExit as e:                      # fail-loud message -> nonzero exit, no traceback
        print(e, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    argv = sys.argv[1:]
    if not argv or argv[0] != "regen":
        print("usage: python3 tools/cover_assets.py regen [mage|handbook|all]", file=sys.stderr)
        sys.exit(1)
    sys.exit(_regen(argv[1] if len(argv) > 1 else "all"))
