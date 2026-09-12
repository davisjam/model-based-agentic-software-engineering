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

import shutil
import subprocess
import sys

import _common as C
import lint as linter

PDF_OUT = C.DIST / "software-engineering-handbook.pdf"
SITE_OUT = C.DIST / "site"
GEN_TYPST = C.GENERATED / "typst"
GEN_WEB = C.GENERATED / "web"

# The filter pipeline. crossrefs runs BEFORE citeproc (it claims @fig/@sec cites); citeproc resolves
# the real citations; the remaining filters run after, over the resolved AST.
COMMON_PRE = ["-L", str(C.FILTERS / "crossrefs.lua")]


def _bib_args(book: dict) -> list[str]:
    bib = C.BIB_DIR / C.pathlib.Path(book["bibliography"]["file"]).name
    csl = C.BIB_DIR / C.pathlib.Path(book["bibliography"]["csl"]).name
    return ["--citeproc", "--bibliography", str(bib), "--csl", str(csl),
            "-M", "reference-section-title=References"]


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


def _gate() -> None:
    if linter.main() != 0:
        C.die("manuscript failed lint; build aborted")


def build_pdf(book: dict) -> None:
    _gate()
    GEN_TYPST.mkdir(parents=True, exist_ok=True)
    C.DIST.mkdir(parents=True, exist_ok=True)

    chdir_args = _chapter_directory_args(book)
    chapter_typst = []
    for ch in C.chapter_files(book):
        meta = _chapter_meta(ch)
        stem = ch.stem
        cmd = (["pandoc", str(ch), "-f", C.PANDOC_FROM, "-t", "typst"]
               + chdir_args + COMMON_PRE + _bib_args(book)
               + ["-L", str(C.FILTERS / "figures.lua"),
                  "-L", str(C.FILTERS / "handbook-components.lua"),
                  "-L", str(C.FILTERS / "typst.lua")])
        body = _run(cmd)
        # Per-chapter references should sit UNDER the chapter, not open a new chapter.
        body = body.replace("#heading(level: 1, numbering: none)[References]",
                            "#heading(level: 2, numbering: none)[References]")
        title = meta.get("title", stem)
        chap = f"= {title}\n<chap-{meta.get('id', stem)}>\n\n{body}"
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
        f'  year: "{book["year"]}",',
        ")",
        "",
        "\n\n".join(chapter_typst),
        "",
    ])
    (GEN_TYPST / "book.typ").write_text(book_typ, encoding="utf-8")

    _run(["typst", "compile", str(GEN_TYPST / "book.typ"), str(PDF_OUT),
          "--root", str(C.HANDBOOK), "--font-path", str(C.FONT_PATH)])
    print(f"PDF → {PDF_OUT.relative_to(C.HANDBOOK)}")


def build_web(book: dict) -> None:
    _gate()
    if GEN_WEB.exists():
        shutil.rmtree(GEN_WEB)
    GEN_WEB.mkdir(parents=True, exist_ok=True)

    chdir_args = _chapter_directory_args(book)
    nav_entries = []
    for ch in C.chapter_files(book):
        meta = _chapter_meta(ch)
        stem = ch.stem
        cmd = (["pandoc", str(ch), "-f", C.PANDOC_FROM, "-t", "gfm"]
               + chdir_args + COMMON_PRE + _bib_args(book)
               + ["-L", str(C.FILTERS / "figures.lua"),
                  "-L", str(C.FILTERS / "handbook-components.lua"),
                  "-L", str(C.FILTERS / "web.lua")])
        body = _run(cmd)
        body = body.replace("\n# References\n", "\n## References\n")
        title = meta.get("title", stem)
        page = f"# {title}\n\n{body}\n"
        (GEN_WEB / f"{stem}.md").write_text(page, encoding="utf-8")
        nav_entries.append((title, f"{stem}.md"))
        print(f"  web    ← {ch.name}")

    # Assets the generated Markdown references, copied under the MkDocs docs_dir.
    shutil.copytree(C.FIGURES, GEN_WEB / "figures")
    shutil.copytree(C.WEB_SRC / "css", GEN_WEB / "css")

    # Landing page.
    lines = [f"# {book['title']}", "", f"*{book['subtitle']}*", "",
             f"{book['author']} · Edition {book['edition']} · {book['year']}", "",
             "A vertical-slice prototype: one semantic manuscript, rendered to both a typeset PDF and "
             "this responsive web edition.", "", "## Chapters", ""]
    for title, href in nav_entries:
        lines.append(f"- [{title}]({href})")
    (GEN_WEB / "index.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    mkdocs = C.GC_ROOT / "site" / ".venv" / "bin" / "mkdocs"
    _run([str(mkdocs), "build", "-f", str(C.WEB_SRC / "mkdocs.yml"),
          "-d", str(SITE_OUT), "--strict"])
    print(f"WEB → {SITE_OUT.relative_to(C.HANDBOOK)}/")


def main(argv: list[str]) -> int:
    target = argv[0] if argv else "all"
    book = C.load_book()
    if target in ("pdf", "book"):
        build_pdf(book)
    elif target == "web":
        build_web(book)
    elif target == "all":
        build_pdf(book)
        build_web(book)
    else:
        C.die(f"unknown target '{target}' (use: pdf | web | all)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
