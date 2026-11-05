"""MkDocs build hook — render a unit's "Exercises" section and nest each exercise under that unit in the nav.

A unit runs its exercises in class, from the lecture deck. The unit page described them INLINE, mid-body,
where each one interrupted the conceptual spine it sat between and the sidebar still said nothing about
them. This hook makes a unit's exercises a declared property of the unit, rendered twice from one manifest:
an **Exercises** section on the page, and nav children indented under the unit, so selecting a unit expands
its exercises beneath it.

The section sits SECOND among the page's appended tail sections — Labs, Exercises, Materials, Readings. That
order is the hook REGISTRATION order in `site/mkdocs.yml`, since all four append; this hook is listed second
there and the comment at that site says so.

Front-matter shape (`exercises:` on a lecture-unit page):

    exercises:
      - title: Threat-model reservation cancellation
        slug: threat-model-cancellation
        about: |
          What the student is given, what they produce, and what the exercise is for.

An exercise's NUMBER is never authored. It is the entry's position in this list, so the section heading, the
nav label, and the inline pointer all read the same number, and reordering the manifest moves all three. The
inline pointer is an `{exercise:<slug>}` token — the same resolved-reference idiom the labs and the readings
use — expanding to a link to that exercise's entry on the same page:

    To practice this, see {exercise:threat-model-cancellation}.
      ->  To practice this, see [Exercise 1](#exercise-threat-model-cancellation).

So the body prose carries one short sentence and the description lives once, in the manifest.

A unit with NO `exercises:` key renders no section at all — not an empty heading. Decks settle at different
times, so an absent manifest is the ordinary state for a unit whose exercises are still moving, and it must
cost nothing on the page; such a unit is populated later by adding front matter, with no change here.

Unlike a lab, an exercise has no served artifact of its own: it is run from the deck, which the unit already
declares under Materials. So this section IS the destination — its `### Exercise N` anchor is what both the
nav link and the inline pointer resolve to. That is the one place the shape departs from the labs hook,
which links each entry out to its instrument.

An unknown slug fails the build loud, matching the labs and readings resolvers — a rotted reference must stop
the build rather than ship as literal `{exercise:…}` text. The stdlib twins of these gates are
`check_course_unit_manifests` and `check_course_exercises_hook_invariants` in `tests/course.py`, which run
where this toolchain does not.
"""
from __future__ import annotations
import logging
import re

from mkdocs.structure.nav import Link

from _common import front_matter, manifest, nest_under_units

log = logging.getLogger(f"mkdocs.hooks.{__name__}")

#: `{exercise:<slug>}` — an inline pointer to an exercise declared on the SAME page.
_EXERCISE_TOKEN = re.compile(r"\{exercise:([a-z0-9][a-z0-9-]*)\}")

#: The manifest's fields. The number is absent on purpose: position carries it.
FIELDS = ("title", "slug", "about")


def anchor(slug: str) -> str:
    """The authored id of an exercise's section heading."""
    return f"exercise-{slug}"


def exercises_of(meta: dict, where: str) -> "list[dict]":
    """The `exercises:` manifest as a validated list of `{title, slug, about}` mappings; [] when absent."""
    return manifest(meta, "exercises", FIELDS, where,
                    "an exercise declares its title, a slug that names its anchor, and what the student "
                    "is given, produces, and is meant to learn")


def _exercises_section(exercises: "list[dict]") -> str:
    """The appended markdown. An empty manifest yields the empty string — no heading, no blank section.

    The level earns itself: an `###` puts each exercise in the page's table of contents, which is half of
    what this hook exists for, and the authored `{#exercise-<slug>}` anchor means the inline token resolves
    without reimplementing the toc extension's slugifier."""
    if not exercises:
        return ""
    out = ["", "## Exercises", ""]
    for n, ex in enumerate(exercises, start=1):
        out += [f"### Exercise {n} — {ex['title']} {{#{anchor(ex['slug'])}}}", "", ex["about"], ""]
    return "\n".join(out)


def _resolve_tokens(markdown: str, exercises: "list[dict]", where: str) -> str:
    """Expand every `{exercise:<slug>}` pointer to a link to that exercise's entry on this page."""
    if "{exercise:" not in markdown:
        return markdown
    numbers = {ex["slug"]: n for n, ex in enumerate(exercises, start=1)}

    def repl(m: "re.Match") -> str:
        slug = m.group(1)
        n = numbers.get(slug)
        if n is None:
            declared = ", ".join(numbers) or "none"
            raise ValueError(f"exercises: {where}: {{exercise:{slug}}} names no exercise in this page's "
                             f"`exercises:` front matter (declared: {declared}) — a pointer resolves "
                             f"within its own unit")
        return f"[Exercise {n}](#{anchor(slug)})"
    return _EXERCISE_TOKEN.sub(repl, markdown)


def on_page_markdown(markdown: str, *, page, config, files):
    where = page.file.src_uri
    exercises = exercises_of(page.meta, where)
    return _resolve_tokens(markdown, exercises, where) + _exercises_section(exercises)


def _nest(index, section) -> int:
    """Append one nav Link per declared exercise to this unit's section, so they render indented under the
    unit and expand with it. Links are added AFTER mkdocs wired parents, so set the parent explicitly.

    The href is the unit page's own site-root-relative url plus the exercise's anchor: the `url` filter
    rewrites it per rendered page, which is what makes one authored value correct in a sidebar that appears
    on every page of the site."""
    exercises = exercises_of(front_matter(index.file.abs_src_path), index.file.src_uri)
    for n, ex in enumerate(exercises, start=1):
        link = Link(f"Exercise {n} — {ex['title']}", f"{index.file.url}#{anchor(ex['slug'])}")
        link.parent = section
        section.children.append(link)
    return len(exercises)


def on_nav(nav, *, config, files):
    nested = nest_under_units(nav, _nest)
    log.info("exercises: nested %d exercise link(s) under their lecture units in the nav", nested)
    return nav
