"""MkDocs build hook — render a "Materials" section on any page that declares `materials:` front matter.

Teaching materials are a MIX of formats (PowerPoint decks, Typst, Markdown). The site does not render
those into pages; instead each unit's Markdown page is a hub that LINKS to its materials — the editable
source (any format), optionally paired with a rendered PDF for viewing/download. This keeps the deck a
deck and avoids duplicating content into the site.

Front-matter shape (paths are relative to the page):

    materials:
      - title: Lecture slides
        src: materials/week-03.pptx      # editable source (pptx / typ / md / …)
        pdf: materials/week-03.pdf        # optional rendered view/download
      - title: Handout
        src: materials/handout-03.typ

The `src`/`pdf` files live alongside the page (e.g. a `materials/` subfolder) and are copied into the
built site by MkDocs, so the links resolve as downloads. Rendering source → PDF is a separate, optional
step (Typst via the book toolchain; PPTX via LibreOffice) — see course/README.md.
"""
from __future__ import annotations
import os

_LABEL = {
    ".pptx": "PPTX", ".ppt": "PPT", ".key": "Keynote",
    ".typ": "Typst", ".md": "Markdown", ".pdf": "PDF",
    ".docx": "DOCX", ".ipynb": "Notebook", ".zip": "ZIP",
}


def _fmt(path: str) -> str:
    for ext, label in _LABEL.items():
        if path.lower().endswith(ext):
            return label
    return "file"


def on_page_markdown(markdown: str, *, page, config, files):
    mats = (page.meta or {}).get("materials") or []
    if not mats:
        return markdown
    page_dir = os.path.dirname(page.file.abs_src_path)

    def link(rel: str, label: str) -> "str | None":
        # Only emit a real link when the file exists on disk — a placeholder reference to a not-yet-added
        # deck must not trip MkDocs' strict broken-link gate. Once the file lands, the link appears.
        return f"[{label}]({rel})" if os.path.isfile(os.path.join(page_dir, rel)) else None

    out = ["", "## Materials", ""]
    any_row = False
    for m in mats:
        if not isinstance(m, dict):
            continue
        title = str(m.get("title") or "Material")
        links = []
        if m.get("src"):
            links.append(link(str(m["src"]), f"source ({_fmt(str(m['src']))})"))
        if m.get("pdf"):
            links.append(link(str(m["pdf"]), "PDF"))
        present = [l for l in links if l]
        tail = " · ".join(present) if present else "_(coming soon)_"
        out.append(f"- **{title}** — {tail}")
        any_row = True
    return markdown + "\n".join(out) + "\n" if any_row else markdown
