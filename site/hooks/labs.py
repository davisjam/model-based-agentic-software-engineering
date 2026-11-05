"""MkDocs build hook — render a unit's "Labs" section and nest each lab under that unit in the nav.

The course ships in-browser teaching instruments under `course/interactive/<slug>/index.html`, served
verbatim at `/teach/interactive/<slug>/`. Reaching one used to require finding the sentence in a lander
that mentioned it, and nothing in the sidebar said it existed. This hook makes a unit's labs a declared
property of the unit, rendered twice from one manifest: as a **Labs** section on the page, and as nav
children indented under the unit.

The section leads the page's three appended tail sections — Labs, then Materials, then Readings. That
order is the hook REGISTRATION order in `site/mkdocs.yml`, since all three append; this hook is listed
first there and the comment at that site says so.

Front-matter shape (`labs:` on a lecture-unit page):

    labs:
      - title: The Cost of Storing Information
        slug: storage-cost            # the course/interactive/<slug>/ directory
        about: >
          What the student does and what it shows.

A lab's NUMBER is never authored. It is the entry's position in this list, so the section heading, the
nav label, and the inline pointer all read the same number and reordering the manifest moves all three.
The inline pointer is a `{lab:<slug>}` token — the same resolved-reference idiom the readings use for
book sections — expanding to a link to that lab's entry on the same page:

    To practice this, see {lab:storage-cost}.      ->   To practice this, see [Lab 1](#lab-storage-cost).

So a lander body carries one short sentence and the description lives once, in the manifest.

Each lab entry renders as an `###` heading with an explicit `{#lab-<slug>}` anchor. The heading earns its
level: it puts the lab in the page's table of contents (discoverability is the point of this hook), and
the authored anchor means the token resolves without reimplementing the toc extension's slugifier.

An unknown slug fails the build loud, matching the readings resolver — a rotted reference must stop the
build rather than ship as literal `{lab:…}` text or a nav link to nothing. The stdlib twin of that gate
is `check_course_labs_manifest` in `tests/course.py`, which runs where this toolchain does not.
"""
from __future__ import annotations
import logging
import os
import re

from mkdocs.structure.nav import Link

from _common import MODULE_RE, front_matter

log = logging.getLogger(f"mkdocs.hooks.{__name__}")

#: The served directory holding the instruments, relative to docs_dir. One spelling, consumed by both
#: renderings, so the published `/teach/interactive/<slug>/` URL cannot drift between them.
INTERACTIVE_DIR = "interactive"

#: `{lab:<slug>}` — an inline pointer to a lab declared on the SAME page.
_LAB_TOKEN = re.compile(r"\{lab:([a-z0-9][a-z0-9-]*)\}")


def anchor(slug: str) -> str:
    """The authored id of a lab's section heading."""
    return f"lab-{slug}"


def labs_of(meta: dict, where: str) -> "list[dict]":
    """The `labs:` manifest as a validated list of `{title, slug, about}` mappings; [] when absent.

    Malformed entries raise rather than render partially — a lab nobody can reach is the failure this
    hook exists to remove, and a silently dropped entry reintroduces it."""
    raw = (meta or {}).get("labs") or []
    if not isinstance(raw, list):
        raise ValueError(f"labs: {where}: `labs:` must be a list of mappings, got {type(raw).__name__}")
    out: list[dict] = []
    for i, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"labs: {where}: entry {i} is {item!r} — expected a "
                             f"{{title, slug, about}} mapping")
        missing = [k for k in ("title", "slug", "about") if not str(item.get(k) or "").strip()]
        if missing:
            raise ValueError(f"labs: {where}: entry {i} is missing {', '.join(missing)} — a lab declares "
                             f"its title, its course/{INTERACTIVE_DIR}/<slug>/ directory, and what the "
                             f"student does and what it shows")
        out.append({k: str(item[k]).strip() for k in ("title", "slug", "about")})
    return out


def _instrument_src(docs_dir: str, slug: str) -> str:
    return os.path.join(docs_dir, INTERACTIVE_DIR, slug, "index.html")


def _require_instrument(docs_dir: str, slug: str, where: str) -> None:
    if not os.path.isfile(_instrument_src(docs_dir, slug)):
        raise ValueError(f"labs: {where}: no instrument at {INTERACTIVE_DIR}/{slug}/index.html — fix the "
                         f"slug, or add the instrument before declaring the lab")


def _labs_section(labs: "list[dict]", page_dir: str, docs_dir: str) -> str:
    out = ["", "## Labs", ""]
    for n, lab in enumerate(labs, start=1):
        href = os.path.relpath(_instrument_src(docs_dir, lab["slug"]), page_dir)
        out += [f"### Lab {n} — {lab['title']} {{#{anchor(lab['slug'])}}}", "",
                lab["about"], "", f"[Open the lab]({href})", ""]
    return "\n".join(out)


def _resolve_tokens(markdown: str, labs: "list[dict]", where: str) -> str:
    """Expand every `{lab:<slug>}` pointer to a link to that lab's entry on this page."""
    if "{lab:" not in markdown:
        return markdown
    numbers = {lab["slug"]: n for n, lab in enumerate(labs, start=1)}

    def repl(m: "re.Match") -> str:
        slug = m.group(1)
        n = numbers.get(slug)
        if n is None:
            declared = ", ".join(numbers) or "none"
            raise ValueError(f"labs: {where}: {{lab:{slug}}} names no lab in this page's `labs:` front "
                             f"matter (declared: {declared}) — a pointer resolves within its own unit")
        return f"[Lab {n}](#{anchor(slug)})"
    return _LAB_TOKEN.sub(repl, markdown)


def on_page_markdown(markdown: str, *, page, config, files):
    where = page.file.src_uri
    docs_dir = config["docs_dir"]
    labs = labs_of(page.meta, where)
    for lab in labs:
        _require_instrument(docs_dir, lab["slug"], where)
    md = _resolve_tokens(markdown, labs, where)
    if not labs:
        return md
    return md + _labs_section(labs, os.path.dirname(page.file.abs_src_path), docs_dir)


def _unit_index(section) -> "object | None":
    """A lecture unit's own index page, read off the nav section's children; None for any other section
    (the same `NN-<topic>/index.md` shape the nav-numbering hook and the readings guide recognize)."""
    for child in section.children:
        if child.is_page and child.file is not None and MODULE_RE.match(child.file.src_uri):
            return child
    return None


def _nest(section, docs_dir: str) -> int:
    """Append one nav Link per declared lab to this unit's section, so the labs render indented under the
    unit and expand with it. Links are added AFTER mkdocs wired parents, so set the parent explicitly.

    The href is site-root-relative: the `url` filter rewrites it per rendered page, which is what makes
    one authored value correct in a sidebar that appears on every page of the site."""
    index = _unit_index(section)
    if index is None:
        return 0
    labs = labs_of(front_matter(index.file.abs_src_path), index.file.src_uri)
    for n, lab in enumerate(labs, start=1):
        _require_instrument(docs_dir, lab["slug"], index.file.src_uri)
        link = Link(f"Lab {n} — {lab['title']}", f"{INTERACTIVE_DIR}/{lab['slug']}/")
        link.parent = section
        section.children.append(link)
    return len(labs)


def _walk(section, docs_dir: str) -> int:
    # Recurse BEFORE nesting: the children added here are Links, which carry no children of their own.
    return sum(_walk(c, docs_dir) for c in section.children if c.is_section) + _nest(section, docs_dir)


def on_nav(nav, *, config, files):
    nested = sum(_walk(item, config["docs_dir"]) for item in nav.items if item.is_section)
    log.info("labs: nested %d lab link(s) under their lecture units in the nav", nested)
    return nav
