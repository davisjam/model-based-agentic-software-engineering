#!/usr/bin/env python3
"""build.py — render the Handbook from its one semantic source.

    chapters/*.md  →  Pandoc AST  →  Handbook Lua filters  →  ┬─ Typst  →  PDF
                                                              └─ MkDocs Markdown  →  HTML

There is exactly one editable manuscript. Everything under generated/ and dist/ is an artifact:
never hand-edited, never committed. The generated Typst and Markdown are kept on disk so the
pipeline stays inspectable — you can read exactly what each renderer received.

Targets:
    python3 scripts/build.py pdf     # generated/typst/* + dist/software-engineering-handbook.pdf
    python3 scripts/build.py web     # generated/web/*   + dist/site/ (MkDocs)
    python3 scripts/build.py all     # both

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
STAPLE_OUT = C.DIST / "course-landers-stapled.md"
LECTURES = C.GC_ROOT / "course" / "lectures"
SITE_OUT = C.DIST / "site"
GEN_TYPST = C.GENERATED / "typst"
GEN_WEB = C.GENERATED / "web"

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

    Front matter is PDF/handbook-only: only entries whose `views:` include `handbook` are rendered,
    and the web build never reads book.yaml's `frontmatter:` list at all. Each entry becomes an
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


def build_web(book: dict) -> None:
    _gate()
    if GEN_WEB.exists():
        shutil.rmtree(GEN_WEB)
    GEN_WEB.mkdir(parents=True, exist_ok=True)

    chdir_args = _chapter_directory_args(book)

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
               + chdir_args + COMMON_PRE + _bib_args(book)
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
               + chdir_args + COMMON_PRE + _bib_args(book)
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
    # Above it, the two-link top row (PDF edition + the companion MAGE book), and around the list the
    # responsive contents+cover row: cover RIGHT of the contents on wide screens, moved to the TOP at
    # a small size on narrow (see web/css/handbook.css `.hb-home`). The row links are raw HTML so
    # MkDocs' strict link check (markdown links only) does not chase the out-of-tree targets — the PDF
    # is CI-published next to this page, and ../mage-book/ exists at the published /book/se-handbook/
    # depth; both 404 in a bare local dist/site, which is expected.
    lines = [f"# {book['title']}", "", f"*{book['subtitle']}*", "",
             f"{book['author']} · Edition {book['edition']} · {book['year']}", "",
             '<p class="hb-top-row">'
             '<a href="software-engineering-handbook.pdf">Download the PDF edition ↓</a> '
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
              "</div>"]
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


def _lander_body(index_md) -> str:
    """The lander's markdown body — the source with its leading YAML frontmatter block removed."""
    text = index_md.read_text(encoding="utf-8")
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
                _lander_body(index_md),
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
    if target in ("pdf", "book"):
        build_pdf(book)
    elif target == "web":
        build_web(book)
    elif target == "all":
        build_pdf(book)
        build_web(book)
    else:
        C.die(f"unknown target '{target}' (use: pdf | web | all | staple)")
    emit_course_landers_staple()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
