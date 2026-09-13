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


def _part_typst(part: dict, chdir_args: list[str]) -> str:
    """Render a Part divider to a Typst `#hb-part(...)` call: the numeral + title come from book.yaml,
    the opener paragraph from the Part's `opener:` file (through the same Pandoc→Typst path as a
    chapter). The divider's hidden heading (drawn by hb-part) is what seats the Part in the Contents."""
    opener = C.HANDBOOK / part["opener"]
    cmd = (["pandoc", str(opener), "-f", C.PANDOC_FROM, "-t", "typst"]
           + chdir_args + COMMON_PRE
           + ["-L", str(C.FILTERS / "figures.lua"),
              "-L", str(C.FILTERS / "handbook-components.lua"),
              "-L", str(C.FILTERS / "typst.lua")])
    body = _run(cmd)
    numeral = str(part.get("numeral", "")).replace('"', '\\"')
    title = str(part.get("title", "")).replace('"', '\\"')
    print(f"  typst  ← {opener.name} (part divider)")
    return f'#hb-part(numeral: "{numeral}", title: "{title}")[\n{body}\n]'


def build_pdf(book: dict) -> None:
    _gate()
    GEN_TYPST.mkdir(parents=True, exist_ok=True)
    C.DIST.mkdir(parents=True, exist_ok=True)

    chdir_args = _chapter_directory_args(book)
    frontmatter_typst = _frontmatter_typst(book, chdir_args)

    # Part dividers interleave with chapters. A populated Part's divider prints before its first
    # chapter; an empty Part (forthcoming) prints last, as a visible placeholder for the intended
    # architecture. Map each chapter id to its Part, render every divider once, then emit each on the
    # first appearance of one of its chapters; flush any never-triggered (empty) Parts at the end.
    parts = book.get("parts", [])
    chap_to_part = {cid: i for i, p in enumerate(parts) for cid in (p.get("chapters") or [])}
    part_typst = [_part_typst(p, chdir_args) for p in parts]
    emitted_parts: set[int] = set()

    chapter_typst = []
    for ch in C.chapter_files(book):
        meta = _chapter_meta(ch)
        stem = ch.stem
        chid = meta.get("id", stem)
        pidx = chap_to_part.get(chid)
        if pidx is not None and pidx not in emitted_parts:
            chapter_typst.append(part_typst[pidx])
            emitted_parts.add(pidx)
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

    # Forthcoming Parts (no chapters yet) print last, in book order — the placeholder divider.
    for i, part in enumerate(parts):
        if i not in emitted_parts:
            chapter_typst.append(part_typst[i])
            emitted_parts.add(i)

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
    nav_by_id: dict[str, tuple[str, str]] = {}   # chapter id → (title, href)
    nav_order: list[str] = []                     # chapter ids in book order
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
        page = f"# {title}\n\n{body}\n"
        (GEN_WEB / f"{stem}.md").write_text(page, encoding="utf-8")
        cid = meta.get("id", stem)
        nav_by_id[cid] = (title, f"{stem}.md")
        nav_order.append(cid)
        print(f"  web    ← {ch.name}")

    # Assets the generated Markdown references, copied under the MkDocs docs_dir.
    shutil.copytree(C.FIGURES, GEN_WEB / "figures")
    shutil.copytree(C.WEB_SRC / "css", GEN_WEB / "css")

    # Landing page — grouped by Part so the web edition shows the same two-Part architecture as the
    # print book. Each populated Part lists its chapters; a forthcoming Part is named and marked. Any
    # chapter not assigned to a Part (the Conclusion) lists under a trailing "Closing" heading.
    lines = [f"# {book['title']}", "", f"*{book['subtitle']}*", "",
             f"{book['author']} · Edition {book['edition']} · {book['year']}", "",
             "A vertical-slice prototype: one semantic manuscript, rendered to both a typeset PDF and "
             "this responsive web edition.", ""]
    parts = book.get("parts", [])
    in_a_part = {cid for p in parts for cid in (p.get("chapters") or [])}
    for part in parts:
        lines += ["", f"## {part['numeral']} — {part['title']}", ""]
        part_chapters = [cid for cid in part.get("chapters") or [] if cid in nav_by_id]
        if part_chapters:
            for cid in part_chapters:
                title, href = nav_by_id[cid]
                lines.append(f"- [{title}]({href})")
        else:
            lines.append("*Forthcoming.*")
    trailing = [cid for cid in nav_order if cid not in in_a_part]
    if trailing:
        lines += ["", "## Closing", ""]
        for cid in trailing:
            title, href = nav_by_id[cid]
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
