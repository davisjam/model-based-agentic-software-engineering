"""Derive landing and ePub covers from the native LaTeX print covers.

Requires LuaLaTeX, Poppler (pdftoppm), Pillow and the manuscript dependencies.
Thumbnails remain ignored build artifacts; validation must not require them before builds.
"""
import pathlib
import shutil
import subprocess
import sys

GC_ROOT   = pathlib.Path(__file__).resolve().parent.parent
ASSETS    = GC_ROOT / "book" / "assets"
MAGE_THUMB     = ASSETS / "cover-thumb.png"
HANDBOOK_THUMB = ASSETS / "handbook-cover-thumb.png"
COVER_PPI    = 180                               # 1530x1980 on US-letter — both ePub renders' value
THUMB_HEIGHT = 400                               # landing raster height; width follows cover aspect


def render_cover_png(pdf: pathlib.Path, out_png: pathlib.Path, *,
                     ppi: int = COVER_PPI) -> pathlib.Path:
    """Rasterize the first page of a freshly compiled native cover."""
    renderer = shutil.which("pdftoppm")
    if not renderer:
        raise SystemExit("cover_assets: pdftoppm missing — install Poppler")
    out_png.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [renderer, "-f", "1", "-singlefile", "-r", str(ppi), "-png",
         str(pdf), str(out_png.with_suffix(""))], capture_output=True, text=True)
    if result.returncode or not out_png.is_file():
        raise SystemExit(f"cover_assets: PDF rasterization failed:\n{result.stderr}")
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
    """Render the same live-type cover used by the MAGE print PDF."""
    tools_dir = str(GC_ROOT / "tools")
    if tools_dir not in sys.path:
        sys.path.insert(0, tools_dir)
    from mage_cover import render_cover_pdf
    return render_cover_png(render_cover_pdf(work_dir), work_dir / "epub-cover.png")


def handbook_cover_png(work_dir: pathlib.Path, book: "dict | None" = None) -> pathlib.Path:
    """Render the Handbook's native print cover from current metadata."""
    scripts_dir = str(GC_ROOT / "handbook" / "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    from latex_pdf import render_cover_pdf
    return render_cover_png(render_cover_pdf(work_dir, book), work_dir / "cover.png")


def regen_mage_thumb(work_dir: pathlib.Path = GC_ROOT / "latex" / "build" / "covers" / "mage") -> pathlib.Path:
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
