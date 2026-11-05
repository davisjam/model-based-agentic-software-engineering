"""MkDocs build hook — render a unit's "Labs" section and nest each lab under that unit in the nav.

The course ships in-browser teaching instruments under `course/interactive/<slug>/index.html`, served
verbatim at `/teach/interactive/<slug>/`. Reaching one used to require finding the sentence in a lander
that mentioned it, and nothing in the sidebar said it existed. This hook makes a unit's labs a declared
property of the unit, rendered twice from one manifest: as a **Labs** section on the page, and as nav
children indented under the unit.

The section leads the page's appended tail sections — Labs, then Exercises, then Materials, then Readings.
That order is the hook REGISTRATION order in `site/mkdocs.yml`, since all four append; this hook is listed
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
is `check_course_unit_manifests` in `tests/course.py`, which runs where this toolchain does not. (That
twin arrived with the EXERCISES hook; the name recorded here when the section landed named a check that
did not exist, which is why the manifest shipped unpinned for its first two hours.)
"""
from __future__ import annotations
import logging
import os
import re

from mkdocs.structure.nav import Link

from _common import front_matter, manifest, nest_under_units

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
    """The `labs:` manifest as a validated list of `{title, slug, about}` mappings; [] when absent."""
    return manifest(meta, "labs", ("title", "slug", "about"), where,
                    f"a lab declares its title, its course/{INTERACTIVE_DIR}/<slug>/ directory, and "
                    f"what the student does and what it shows")


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


def _nest(index, section, docs_dir: str) -> int:
    """Append one nav Link per declared lab to this unit's section, so the labs render indented under the
    unit and expand with it. Links are added AFTER mkdocs wired parents, so set the parent explicitly.

    The href is site-root-relative: the `url` filter rewrites it per rendered page, which is what makes
    one authored value correct in a sidebar that appears on every page of the site."""
    labs = labs_of(front_matter(index.file.abs_src_path), index.file.src_uri)
    for n, lab in enumerate(labs, start=1):
        _require_instrument(docs_dir, lab["slug"], index.file.src_uri)
        link = Link(f"Lab {n} — {lab['title']}", f"{INTERACTIVE_DIR}/{lab['slug']}/")
        link.parent = section
        section.children.append(link)
    return len(labs)


def on_nav(nav, *, config, files):
    docs_dir = config["docs_dir"]
    nested = nest_under_units(nav, lambda index, section: _nest(index, section, docs_dir))
    log.info("labs: nested %d lab link(s) under their lecture units in the nav", nested)
    return nav
