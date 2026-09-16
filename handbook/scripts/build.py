#!/usr/bin/env python3
"""build.py — render the Handbook from its one semantic source.

    chapters/*.md  →  Pandoc AST  →  Handbook Lua filters  →  ┬─ Typst  →  PDF
                                                              ├─ Pandoc ePub3  →  EPUB
                                                              └─ MkDocs Markdown  →  HTML

There is exactly one editable manuscript. Everything under generated/ and dist/ is an artifact:
never hand-edited, never committed. The generated Typst and Markdown are kept on disk so the
pipeline stays inspectable — you can read exactly what each renderer received.

Targets:
    python3 scripts/build.py pdf     # generated/typst,epub/* + dist/software-engineering-handbook.{pdf,epub}
    python3 scripts/build.py epub    # generated/epub/*  + dist/software-engineering-handbook.epub only
    python3 scripts/build.py web     # generated/web/*   + dist/site/ (MkDocs)
    python3 scripts/build.py all     # all of the above

The ePub rides the `pdf` target (not only `all`) on purpose: the pre-push hook runs `build.py pdf`,
so the two reader-facing editions regenerate together and the local .epub never goes stale.

The build LINTS first and aborts on any manuscript error (it never degrades silently).
"""
from __future__ import annotations

import datetime
import os
import re
import shutil
import subprocess
import sys

import _common as C
import lint as linter

PDF_OUT = C.DIST / "software-engineering-handbook.pdf"
EPUB_OUT = C.DIST / "software-engineering-handbook.epub"
STAPLE_OUT = C.DIST / "course-landers-stapled.md"
LECTURES = C.GC_ROOT / "course" / "lectures"
SITE_OUT = C.DIST / "site"
GEN_TYPST = C.GENERATED / "typst"
GEN_EPUB = C.GENERATED / "epub"
GEN_WEB = C.GENERATED / "web"
EPUB_CSS = C.HANDBOOK / "epub" / "epub.css"

# The funding acknowledgment the PDF imprint page prints (typst/handbook.typ). The web landing's
# colophon and the ePub's rights line carry the same sentence so all three editions acknowledge the
# support; keep the grant list identical across those sites and the catalogue footer in catalog.py.
NSF_ACK = ("This work was supported by the U.S. National Science Foundation under grants "
           "#2541917, #2452533, and #2343596.")

# The filter pipeline. crossrefs runs BEFORE citeproc (it claims @fig/@sec cites); citeproc resolves
# the real citations; the remaining filters run after, over the resolved AST.
COMMON_PRE = ["-L", str(C.FILTERS / "crossrefs.lua")]


def _bib_args(book: dict) -> list[str]:
    # Citation policy: inline @-citations render as Chicago author-date (backed by the bib), but a
    # chapter never dumps a "References"/"Bibliography" list at its end. The reader-facing end matter
    # is the curated READ FURTHER box (see handbook-components.lua). suppress-bibliography keeps every
    # inline cite resolved while dropping citeproc's per-chapter reference section.
    bib = C.BIB_DIR / C.pathlib.Path(book["bibliography"]["file"]).name
    csl = C.BIB_DIR / C.pathlib.Path(book["bibliography"]["csl"]).name
    return ["--citeproc", "--bibliography", str(bib), "--csl", str(csl),
            "-M", "suppress-bibliography=true"]


def _chapter_meta(ch) -> dict:
    return C.meta_to_py(C.pandoc_ast(ch).get("meta", {}))


def _chapter_directory_args(book: dict) -> list[str]:
    """Write the book-level chapter directory and return the pandoc args that inject it.

    Each chapter is rendered by its own Pandoc run, so a chapter that cross-references another
    (`@ch-<id>`) needs the sibling's identity from outside its own source. This projects book.yaml's
    ordered chapter list into a metadata file — chapter id → short title (inline link text) + web
    stem (the web link target) — that crossrefs.lua reads to resolve every `@ch-` reference."""
    C.GENERATED.mkdir(parents=True, exist_ok=True)
    directory = []
    for ch in C.chapter_files(book):
        meta = _chapter_meta(ch)
        directory.append({
            "id": meta.get("id", ch.stem),
            "short": meta.get("short_title", meta.get("title", ch.stem)),
            "stem": ch.stem,
        })
    path = C.GENERATED / "chapter-map.yaml"
    path.write_text(C.yaml.safe_dump({"handbook_chapters": directory}, allow_unicode=True),
                    encoding="utf-8")
    return ["--metadata-file", str(path)]


def _numbered_float_counts(md_path) -> tuple[int, int]:
    """Count one source file's numbered floats, mirroring crossrefs.lua pass 1: a figure Div with
    an id (an `.unnumbered` figure claims no number), a table Div with an id, and a native
    captioned Table."""
    figs = tbls = 0

    def walk(node) -> None:
        nonlocal figs, tbls
        if isinstance(node, list):
            for x in node:
                walk(x)
            return
        if not isinstance(node, dict):
            return
        t, c = node.get("t"), node.get("c")
        if t == "Div":
            (ident, classes, _), blocks = c
            if "figure" in classes and ident and "unnumbered" not in classes:
                figs += 1
            elif "table" in classes and ident:
                tbls += 1
            walk(blocks)
        elif t == "Table":
            if c[0][0]:
                tbls += 1
            walk(c)
        elif isinstance(c, list):
            walk(c)

    walk(C.pandoc_ast(md_path).get("blocks", []))
    return figs, tbls


def _float_offset_args(book: dict) -> dict:
    """Per-file Pandoc `-M` args seeding crossrefs.lua's float sequences with book-global offsets.

    The Typst PDF numbers figures and tables with one book-global counter across the whole
    document. The web build renders each file in its own Pandoc run, whose float sequence would
    restart at 1 — so each run receives the cumulative numbered-float count of everything that
    precedes its file in the PDF's document order (handbook-view front matter, then chapters).
    crossrefs.lua reads the two keys and starts its sequences there, keeping caption numbers and
    body cross-references identical across the three editions. The combined ePub run covers the
    whole book in one pass and needs no offset."""
    offsets: dict = {}
    fig_total = tbl_total = 0
    handbook_fm = [C.HANDBOOK / e["file"] for e in book.get("frontmatter", [])
                   if "handbook" in (e.get("views") or [])]
    for path in handbook_fm + list(C.chapter_files(book)):
        offsets[path] = ["-M", f"handbook_fig_offset={fig_total}",
                        "-M", f"handbook_tbl_offset={tbl_total}"]
        figs, tbls = _numbered_float_counts(path)
        fig_total += figs
        tbl_total += tbls
    return offsets


def _run(cmd: list[str]) -> str:
    out = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if out.returncode != 0:
        C.die("command failed: " + " ".join(cmd) + "\n" + out.stderr)
    if out.stderr.strip():
        sys.stderr.write(out.stderr)
    return out.stdout


def _last_modified(book: dict) -> str:
    """The handbook's last content-modification date (YYYY-MM-DD) for the imprint page's "last
    modified" line. Prefers the last git commit that touched the manuscript (chapters + front
    matter — the real content change, stable across rebuilds of the same source); falls back to the
    book.yaml `first_published` date when git is unavailable (a shallow export or non-git checkout)."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cd", "--date=short", "--",
             "handbook/chapters", "handbook/frontmatter"],
            cwd=str(C.HANDBOOK.parent), capture_output=True, text=True, check=False)
    except OSError:
        out = None  # git binary absent — fall through to the manifest fallback
    if out is not None and out.returncode == 0 and out.stdout.strip():
        return out.stdout.strip()
    return str(book.get("first_published", book.get("year", datetime.date.today().isoformat())))


def _gate() -> None:
    if linter.main() != 0:
        C.die("manuscript failed lint; build aborted")


def _frontmatter_typst(book: dict, chdir_args: list[str]) -> str:
    """Render the handbook-view front matter (Preface, etc.) to a Typst content block.

    Only entries whose `views:` include `handbook` render here (build_web separately takes the
    entries whose `views:` include `web`). Each entry becomes an
    unnumbered `#hb-frontmatter(title: ...)[…]` block; the returned string is inlined as the
    template's `frontmatter:` argument (empty string → the template renders no front matter)."""
    blocks = []
    for entry in book.get("frontmatter", []):
        if "handbook" not in (entry.get("views") or []):
            continue
        fm = C.HANDBOOK / entry["file"]
        meta = _chapter_meta(fm)
        cmd = (["pandoc", str(fm), "-f", C.PANDOC_FROM, "-t", "typst"]
               + chdir_args + COMMON_PRE + _bib_args(book)
               + ["-L", str(C.FILTERS / "figures.lua"),
                  "-L", str(C.FILTERS / "handbook-components.lua"),
                  "-L", str(C.FILTERS / "typst.lua")])
        body = _run(cmd)
        title = meta.get("title", fm.stem)
        blocks.append(f'#hb-frontmatter(title: "{title}")[\n{body}\n]')
        print(f"  typst  ← {fm.name} (front matter)")
    return "\n\n".join(blocks)


def build_pdf(book: dict) -> None:
    _gate()
    GEN_TYPST.mkdir(parents=True, exist_ok=True)
    C.DIST.mkdir(parents=True, exist_ok=True)

    chdir_args = _chapter_directory_args(book)
    frontmatter_typst = _frontmatter_typst(book, chdir_args)

    chapter_typst = []
    for ch in C.chapter_files(book):
        meta = _chapter_meta(ch)
        stem = ch.stem
        chid = meta.get("id", stem)
        cmd = (["pandoc", str(ch), "-f", C.PANDOC_FROM, "-t", "typst"]
               + chdir_args + COMMON_PRE + _bib_args(book)
               + ["-L", str(C.FILTERS / "figures.lua"),
                  "-L", str(C.FILTERS / "handbook-components.lua"),
                  "-L", str(C.FILTERS / "typst.lua")])
        body = _run(cmd)
        title = meta.get("title", stem)
        chap = f"= {title}\n<chap-{chid}>\n\n{body}"
        # Back matter (kind other than `chapter`, e.g. the Conclusion): flip the template into
        # back-matter mode so the opening drops the "CHAPTER" eyebrow. Back matter sits at the end
        # of book.yaml's chapter list, so every subsequent section is back matter too.
        if (meta.get("kind") or "chapter") != "chapter":
            chap = "#hb-begin-backmatter()\n" + chap
        # Kept on disk for inspection (spec §24); book.typ inlines the same content so the
        # template's imports stay in scope for the chapter's #hb-callout / #hb-figure calls.
        (GEN_TYPST / f"{stem}.typ").write_text(chap, encoding="utf-8")
        chapter_typst.append(chap)
        print(f"  typst  ← {ch.name}")

    book_typ = "\n".join([
        '#import "/typst/handbook.typ": *',
        '#import "/typst/components.typ": *',
        "",
        "#show: handbook.with(",
        f'  title: "{book["title"]}",',
        f'  subtitle: "{book["subtitle"]}",',
        f'  author: "{book["author"]}",',
        f'  edition: "{book["edition"]}",',
        f'  year: "{book["year"]}",',
        f'  copyright-years: "{book.get("copyright_years", book["year"])}",',
        f'  first-published: "{book.get("first_published", book["year"])}",',
        # Front matter is a Typst content argument; `none` when there is no handbook-view front matter.
        ("  frontmatter: [\n" + frontmatter_typst + "\n  ],") if frontmatter_typst else "  frontmatter: none,",
        ")",
        "",
        "\n\n".join(chapter_typst),
        "",
    ])
    (GEN_TYPST / "book.typ").write_text(book_typ, encoding="utf-8")

    # The imprint page's "last modified" date: the last commit that touched the handbook content
    # (chapters + front matter), mirroring the MAGE book's `_book_last_modified`. Falls back to the
    # book.yaml `first_published` when git is unavailable (a shallow export or non-git checkout), so
    # the page always prints a date.
    _run(["typst", "compile", str(GEN_TYPST / "book.typ"), str(PDF_OUT),
          "--input", f"last_modified={_last_modified(book)}",
          "--root", str(C.HANDBOOK), "--font-path", str(C.FONT_PATH)])
    print(f"PDF → {PDF_OUT.relative_to(C.HANDBOOK)}")


def _epub_cover_png(book: dict) -> C.pathlib.Path:
    """Render the TITLED cover — the same layered Typst cover page the PDF opens with — to a PNG
    for `--epub-cover-image`, so a reader's library shelf shows the title/author lockup.

    The raw art layer (assets/cover-artwork.png) is only what the Typst cover composites the
    typography ONTO; passing it directly would ship a textless cover. A one-page Typst doc calling
    `hb-cover` reuses the real cover (artwork + live type) verbatim, so the ePub cover can never
    drift from the PDF's. 180 ppi on a US-letter page → 1530×1980 px, comfortably above e-reader
    cover-view resolution without bloating the container."""
    cover_typ = GEN_EPUB / "cover.typ"
    cover_png = GEN_EPUB / "cover.png"
    cover_typ.write_text("\n".join([
        '#import "/typst/cover.typ": hb-cover',
        "#hb-cover(",
        f'  title: "{book["title"]}",',
        f'  subtitle: "{book["subtitle"]}",',
        f'  author: "{book["author"]}",',
        ")",
        "",
    ]), encoding="utf-8")
    _run(["typst", "compile", "--format", "png", "--ppi", "180", str(cover_typ), str(cover_png),
          "--root", str(C.HANDBOOK), "--font-path", str(C.FONT_PATH)])
    print(f"  epub   ← cover.png (titled cover, {cover_png.stat().st_size // 1024} KiB)")
    return cover_png


def build_epub(book: dict) -> None:
    """Render the reflowable ePub edition from the same chapter source as the PDF.

    Pandoc's ePub writer wants the whole book in ONE run (one spine, one Dublin Core metadata
    block, cross-chapter links resolved inside the container), so this target concatenates the
    manuscript into generated/epub/book.md and renders that. Each section contributes a level-1
    heading — the `--split-level=1` chapter-split point — plus its body with the per-file YAML
    metadata stripped: left in place, the first chapter's `title:`/`description:` would merge
    into the book's metadata (Pandoc gives leftmost metadata precedence)."""
    _gate()
    if GEN_EPUB.exists():
        shutil.rmtree(GEN_EPUB)
    GEN_EPUB.mkdir(parents=True, exist_ok=True)
    C.DIST.mkdir(parents=True, exist_ok=True)

    chdir_args = _chapter_directory_args(book)

    # Front matter that renders in the print edition (`views:` includes `handbook`) belongs in the
    # ePub too — the ePub is the reflowable sibling of the PDF, not of the web site.
    sections: list[str] = []
    for entry in book.get("frontmatter", []):
        if "handbook" not in (entry.get("views") or []):
            continue
        fm = C.HANDBOOK / entry["file"]
        meta = _chapter_meta(fm)
        title = meta.get("title", fm.stem)
        sections.append(f"# {title} {{#chap-{meta.get('id', fm.stem)}}}\n\n{_source_body(fm)}")
        print(f"  epub   ← {fm.name} (front matter)")
    chapter_no = 0
    for ch in C.chapter_files(book):
        meta = _chapter_meta(ch)
        title = meta.get("title", ch.stem)
        # Chapter numbering mirrors the web edition: `kind: chapter` takes the next number; back
        # matter (the Conclusion) stays unnumbered. The heading id doubles as the `@ch-` anchor.
        if (meta.get("kind") or "chapter") == "chapter":
            chapter_no += 1
            title = f"Chapter {chapter_no}: {title}"
        sections.append(f"# {title} {{#chap-{meta.get('id', ch.stem)}}}\n\n{_source_body(ch)}")
        print(f"  epub   ← {ch.name}")
    combined = GEN_EPUB / "book.md"
    combined.write_text("\n\n".join(sections) + "\n", encoding="utf-8")

    # Same filter chain as the web build; the filters branch on an epub FORMAT where the web
    # rendering would not survive the container (figures become native Figure nodes so Pandoc
    # embeds the image files; callouts become plain semantic HTML instead of MkDocs admonitions).
    # --resource-path resolves the chapters' authored `../figures/…` image paths.
    cmd = (["pandoc", str(combined), "-f", C.PANDOC_FROM, "-t", "epub3", "-o", str(EPUB_OUT)]
           + chdir_args + COMMON_PRE + _bib_args(book)
           + ["-L", str(C.FILTERS / "figures.lua"),
              "-L", str(C.FILTERS / "handbook-components.lua"),
              "-L", str(C.FILTERS / "web.lua"),
              "--resource-path", str(C.CHAPTERS),
              "--epub-cover-image", str(_epub_cover_png(book)),
              "--css", str(EPUB_CSS),
              "--toc", "--toc-depth=2", "--split-level=1",
              "-M", f"title={book['title']}",
              "-M", f"subtitle={book['subtitle']}",
              "-M", f"author={book['author']}",
              "-M", f"date={_last_modified(book)}",
              "-M", f"lang={book.get('language', 'en-US')}",
              # The rights metadata doubles as the ePub's colophon: it renders on the generated
              # title page (and in dc:rights), so it carries the PDF imprint page's facts — the ©
              # line, the first-published date, and the NSF funding acknowledgment (grant list kept
              # identical across typst/handbook.typ, the site footer in catalog.py, and here).
              "-M", ("rights=Edition {} · © {} {} · First published {} · {}".format(
                  book["edition"], book.get("copyright_years", book["year"]), book["author"],
                  book.get("first_published", book["year"]), NSF_ACK))])
    _run(cmd)
    size_kb = EPUB_OUT.stat().st_size // 1024
    print(f"EPUB → {EPUB_OUT.relative_to(C.HANDBOOK)} ({len(sections)} sections, {size_kb} KiB)")


def build_web(book: dict) -> None:
    _gate()
    if GEN_WEB.exists():
        shutil.rmtree(GEN_WEB)
    GEN_WEB.mkdir(parents=True, exist_ok=True)

    chdir_args = _chapter_directory_args(book)
    # Book-global float numbering: each per-file Pandoc run is seeded with the numbered-float
    # count of everything before it, so web captions and cross-references match the PDF's numbers.
    float_args = _float_offset_args(book)

    # Front matter that opts into the web view (`views: [handbook, web]` in book.yaml) renders as
    # its own page through the same filter chain as a chapter. The generated stem carries a `0-`
    # prefix so the inferred navigation sorts it before the `00-`-prefixed chapters.
    fm_entries: list[tuple[str, str]] = []        # (title, href) in book.yaml order
    for entry in book.get("frontmatter", []):
        if "web" not in (entry.get("views") or []):
            continue
        fm = C.HANDBOOK / entry["file"]
        meta = _chapter_meta(fm)
        cmd = (["pandoc", str(fm), "-f", C.PANDOC_FROM, "-t", "gfm"]
               + chdir_args + float_args.get(fm, []) + COMMON_PRE + _bib_args(book)
               + ["-L", str(C.FILTERS / "figures.lua"),
                  "-L", str(C.FILTERS / "handbook-components.lua"),
                  "-L", str(C.FILTERS / "web.lua")])
        body = _run(cmd)
        title = meta.get("title", fm.stem)
        (GEN_WEB / f"0-{fm.stem}.md").write_text(f"# {title}\n\n{body}\n", encoding="utf-8")
        fm_entries.append((title, f"0-{fm.stem}.md"))
        print(f"  web    ← {fm.name} (front matter)")

    # Chapters. `kind: chapter` entries take the next chapter number ("Chapter N: Title" in the
    # page heading and navigation); back matter (the Conclusion) stays unnumbered.
    nav_entries: list[tuple[str, str]] = []       # (display title, href) in book order
    chapter_no = 0
    for ch in C.chapter_files(book):
        meta = _chapter_meta(ch)
        stem = ch.stem
        cmd = (["pandoc", str(ch), "-f", C.PANDOC_FROM, "-t", "gfm"]
               + chdir_args + float_args[ch] + COMMON_PRE + _bib_args(book)
               + ["-L", str(C.FILTERS / "figures.lua"),
                  "-L", str(C.FILTERS / "handbook-components.lua"),
                  "-L", str(C.FILTERS / "web.lua")])
        body = _run(cmd)
        title = meta.get("title", stem)
        if (meta.get("kind") or "chapter") == "chapter":
            chapter_no += 1
            title = f"Chapter {chapter_no}: {title}"
        page = f"# {title}\n\n{body}\n"
        (GEN_WEB / f"{stem}.md").write_text(page, encoding="utf-8")
        nav_entries.append((title, f"{stem}.md"))
        print(f"  web    ← {ch.name}")

    # Assets the generated Markdown references, copied under the MkDocs docs_dir.
    shutil.copytree(C.FIGURES, GEN_WEB / "figures")
    shutil.copytree(C.WEB_SRC / "css", GEN_WEB / "css")
    # The handbook's rendered COVER (title lockup + artwork — the same thumbnail the catalogue landing's
    # handbook card uses; assets/cover-artwork.png is only the art-window LAYER the Typst cover
    # composites). Copied under docs_dir so MkDocs ships it and the home page's <img> resolves as a
    # sibling at the published /book/se-handbook/ depth. Cross-repo read like FONT_PATH for the PDF faces.
    shutil.copy2(C.GC_ROOT / "book" / "assets" / "handbook-cover-thumb.png", GEN_WEB / "cover-thumb.png")

    # Landing page — one flat, numbered contents list: web front matter first (unnumbered), then
    # every chapter in book order (back matter such as the Conclusion unnumbered at the end).
    # Above it, the top row (PDF + ePub editions + the companion MAGE book), and around the list the
    # responsive contents+cover row: cover RIGHT of the contents on wide screens, moved to the TOP at
    # a small size on narrow (see web/css/handbook.css `.hb-home`). The row links are raw HTML so
    # MkDocs' strict link check (markdown links only) does not chase the out-of-tree targets — the
    # PDF and ePub are CI-published next to this page, and ../mage-book/ exists at the published
    # /book/se-handbook/ depth; all three 404 in a bare local dist/site, which is expected.
    # File-type glyphs on the download buttons: self-contained inline SVG (the glyph is INLINED into
    # the page — the published site loads nothing off-origin), all-currentColor strokes so each
    # glyph tracks its button's link color in BOTH Material schemes (light + slate). Generic marks,
    # not brand logos: a corner-fold page carrying a small "PDF" wordmark, and the universal
    # open-book for the ePub. BOTH glyphs are SHARED with the MAGE book home (`book/build_book.py`
    # `_DL_ICO_PDF` / `_DL_ICO_EPUB`) via the tracked family assets — the two homes' glyphs were
    # verbatim twins, so the asset is the single source and neither can drift.
    ico_pdf = (C.GC_ROOT / "web-theme" / "glyphs" / "pdf-file.svg").read_text(encoding="utf-8").strip()
    ico_epub = (C.GC_ROOT / "web-theme" / "glyphs" / "epub-file.svg").read_text(encoding="utf-8").strip()
    lines = [f"# {book['title']}", "", f"*{book['subtitle']}*", "",
             f"{book['author']} · Edition {book['edition']} · {book['year']}", "",
             '<p class="hb-top-row">'
             f'<a href="software-engineering-handbook.pdf">{ico_pdf}Download the PDF edition ↓</a> '
             f'<a href="software-engineering-handbook.epub">{ico_epub}Download the ePub edition ↓</a> '
             '<a href="../mage-book/index.html">Read the companion book: MAGE →</a>'
             "</p>", "",
             '<div class="hb-home" markdown="1">', "",
             '<div class="hb-home-main" markdown="1">', "",
             "## Contents", ""]
    for title, href in fm_entries + nav_entries:
        lines.append(f"- [{title}]({href})")
    # The cover rides its own raw (non-markdown) div so it stays a direct flex child of .hb-home —
    # a bare <img> line inside a markdown="1" parent gets <p>-wrapped, which would strand the flex
    # order/width rules on the img instead of the flex item.
    lines += ["", "</div>", "",
              '<div class="hb-home-side">',
              f'<img class="hb-home-cover" src="cover-thumb.png" alt="{book["title"]}">',
              "</div>", "",
              "</div>", "",
              # Colophon — the web counterpart of the PDF's imprint page (and the ePub's rights
              # line): the © line, the first-published date, and the NSF acknowledgment.
              '<p class="hb-colophon">'
              f'© {book["author"]}, {book.get("copyright_years", book["year"])} · '
              f'Edition {book["edition"]} — first published {book.get("first_published", book["year"])}.'
              f'<br>{NSF_ACK}'
              "</p>"]
    (GEN_WEB / "index.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # Nav: one root section titled with the book — the "book → chapters" left rail. index.md rides
    # first as the SECTION INDEX (`navigation.indexes`), so the rail's book-title label is itself the
    # link home; front matter + chapters sit beneath it in book.yaml order. Emitted as a generated
    # INHERIT config (MkDocs resolves the parent's relative paths against the parent file, so the
    # static web/mkdocs.yml keeps owning docs_dir/custom_dir) — the chapter list is derived, never
    # hand-maintained in web/mkdocs.yml.
    nav_cfg = {
        "INHERIT": os.path.relpath(C.WEB_SRC / "mkdocs.yml", C.GENERATED),
        "nav": [{book["title"]: ["index.md"] + [{t: h} for t, h in fm_entries + nav_entries]}],
    }
    gen_cfg = C.GENERATED / "mkdocs.yml"
    gen_cfg.write_text("# GENERATED by handbook/scripts/build.py — nav derived from book.yaml; do not edit.\n"
                       + C.yaml.safe_dump(nav_cfg, allow_unicode=True, sort_keys=False),
                       encoding="utf-8")

    # mkdocs resolution: locally the pinned toolchain lives in the site/ venv (site/requirements.txt
    # installed into site/.venv); in CI the same pinned requirements are installed into the runner's
    # Python, so fall back to the running interpreter's mkdocs module when the venv binary is absent.
    mkdocs = C.GC_ROOT / "site" / ".venv" / "bin" / "mkdocs"
    mkdocs_cmd = [str(mkdocs)] if mkdocs.is_file() else [sys.executable, "-m", "mkdocs"]
    _run(mkdocs_cmd + ["build", "-f", str(gen_cfg),
                       "-d", str(SITE_OUT), "--strict"])
    print(f"WEB → {SITE_OUT.relative_to(C.HANDBOOK)}/")


def _yaml_title(path) -> str | None:
    """The `title:` of a YAML file/document, or None. Reads a module's `.pages` whole, or an
    `index.md`'s leading `---` frontmatter block."""
    if not path.is_file():
        return None
    text = path.read_text(encoding="utf-8")
    if path.name == "index.md":
        if not text.startswith("---"):
            return None
        end = text.find("\n---", 3)
        if end < 0:
            return None
        text = text[3:end]
    data = C.yaml.safe_load(text) or {}
    title = data.get("title")
    return str(title).strip() if title else None


def _source_body(md_path) -> str:
    """A file's markdown body — the source with its leading YAML metadata block removed.

    Shared by the ePub concatenation (chapter YAML must not merge into the book metadata) and the
    landers staple (lander frontmatter is nav metadata, not review content)."""
    text = md_path.read_text(encoding="utf-8")
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end >= 0:
            text = text[end + 4:]
    return text.strip()


def emit_course_landers_staple() -> None:
    """Emit dist/course-landers-stapled.md — every course-lecture lander concatenated in course
    order (acts in directory order, modules by their NN- prefix), each under a topic header naming
    its act + title and its source path.

    A LOCAL review aid for side-by-side comparison of the short (lander) vs. long (handbook
    chapter) treatment of each topic. Gitignored (handbook/.gitignore ignores dist/ whole) and
    skipped in CI, so it can never reach the published Pages artifact. The lander set is
    enumerated at build time — never a hardcoded list."""
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):
        print("staple: skipped (CI build — local review aid only)")
        return
    C.DIST.mkdir(parents=True, exist_ok=True)
    rule = "=" * 64
    sections: list[str] = []
    acts = sorted(p for p in LECTURES.iterdir() if p.is_dir() and p.name.startswith("act-"))
    for act in acts:
        act_title = _yaml_title(act / ".pages") or act.name
        modules = sorted(m for m in act.iterdir()
                         if m.is_dir() and re.match(r"\d\d-", m.name) and (m / "index.md").is_file())
        for module in modules:
            index_md = module / "index.md"
            title = _yaml_title(module / ".pages") or _yaml_title(index_md) or module.name
            title = re.sub(r"^\d+\s+", "", title)  # ".pages" nav labels carry the NN- prefix; drop it
            source = index_md.relative_to(C.GC_ROOT)
            sections.append("\n".join([
                rule,
                f"# {act_title} · {title}",
                f"<!-- source: {source} -->",
                rule,
                "",
                _source_body(index_md),
            ]))
    preamble = "\n".join([
        "<!-- GENERATED by handbook/scripts/build.py — local review aid; do not edit. -->",
        "# Course landers — stapled review copy",
        "",
        "Every course-lecture lander (`course/lectures/<act>/<NN-topic>/index.md`) concatenated in",
        "course order, for side-by-side comparison against the handbook chapters. Emitted by the",
        "LOCAL build only: gitignored, skipped in CI, never published. Each lander's YAML",
        "frontmatter (title + readings metadata) is stripped; the header carries its source path.",
    ])
    STAPLE_OUT.write_text(preamble + "\n\n" + "\n\n\n".join(sections) + "\n", encoding="utf-8")
    print(f"staple → {STAPLE_OUT.relative_to(C.HANDBOOK)} ({len(sections)} landers)")


def main(argv: list[str]) -> int:
    target = argv[0] if argv else "all"
    if target == "staple":
        # Lightweight refresh of the local landers staple ONLY — no chapter build. The pre-push
        # hook runs this so course-landers-stapled.md stays fresh at push time, the same way
        # book/build_book.py --pdf keeps the book PDF + book staple fresh (still CI-skipped inside).
        emit_course_landers_staple()
        return 0
    book = C.load_book()
    # The ePub is FOLDED into the pdf target (not a separate default) so the two reader-facing
    # editions regenerate together — the pre-push hook's `build.py pdf` keeps both fresh.
    if target in ("pdf", "book"):
        build_pdf(book)
        build_epub(book)
    elif target == "epub":
        build_epub(book)
    elif target == "web":
        build_web(book)
    elif target == "all":
        build_pdf(book)
        build_epub(book)
        build_web(book)
    else:
        C.die(f"unknown target '{target}' (use: pdf | epub | web | all | staple)")
    emit_course_landers_staple()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
