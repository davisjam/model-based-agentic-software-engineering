# Teach with MAGE — course companion

This directory is the **authoritative, version-controlled source** for the "Teach with MAGE" course
companion. The public site at `/teach/` is *generated from these files* (MkDocs Material) — there is no
parallel copy of any material. Edit here; the site follows.

- **Content license:** the teaching materials in `course/` are **CC BY 4.0** (attribution to James C. Davis
  and Steve France) — see [`LICENSE`](LICENSE). This is separate from the repository's MIT software license.
- **Site config:** `../site/mkdocs.yml` (+ `../site/hooks/`). **Deployment:** the repo's Pages workflow
  builds this into `_site/teach`.

## The organizing idea: curriculum vs. reference course

The site separates the **reusable curriculum** from **one demonstrated way to teach it**:

- **Curriculum** — the materials and their *intellectual* structure, independent of any calendar:
  `lectures/` (organized **Act → module**), `project/`, and `assessment/`. A "module" is the reusable
  instructional unit — not a "week." An adopter takes the modules they need, in whatever order and schedule
  suits their course.
- **Reference course** — `reference-course/`: the specific Purdue Fall-2026 instantiation (ECE 30861). Its
  `calendar.md` maps the curriculum onto a real 16-week semester; `syllabus.md` is the authoritative course
  document.

This is why lecture files are named by **topic** (`01-engineering-and-genai.md`), not by week — "Week 03"
means nothing to an adopter whose semester differs; the topic does.

## Layout

```
course/
  index.md                       # home — "Teach with MAGE"
  reference-course/              # the Purdue Fall-2026 instantiation
    index.md                     # Overview (+ intended audience)
    syllabus.md                  # authoritative course document
    calendar.md                  # week → topic map + the auto-generated Reading Guide
    materials/                   # reference-course decks (e.g. the syllabus slides)
  lectures/                      # the reusable curriculum
    index.md                     # curriculum overview
    act-1-foundations/
      .pages                     # nav title + module order
      01-engineering-and-genai.md
      02-software-process.md
      03-software-engineering-teamwork.md
      materials/                 # the module decks
  project/                       # Overview, phase-*.md, candidate-projects.md
  assessment/                    # project-assessment.md, oral-exams.md (Assessment section)
  stylesheets/purdue.css         # Purdue palette (extra_css)
  js/header-title-link.js        # header title → home link
  assets/wizard-hat.svg          # favicon (the wizard-hat identity)
```

The nav follows the tree (the `awesome-pages` plugin), so **adding a Markdown file adds a page** — you never
edit `mkdocs.yml` for routine additions. A directory's `.pages` file sets its nav title and (optionally) the
order of its children. Instructor Resources and Downloads are intentionally not present in this release.

## Local preview

The teaching site uses a small pinned toolchain, separate from the stdlib-only `catalog.py`:

```bash
python3 -m venv site/.venv
site/.venv/bin/pip install -r site/requirements.txt
site/.venv/bin/mkdocs serve -f site/mkdocs.yml                          # live preview
site/.venv/bin/mkdocs build --strict -f site/mkdocs.yml -d /tmp/teach   # one-off strict build
```

`--strict` fails on any broken internal link or nav reference — run it before pushing.

## Authoring a module

A module page carries YAML front matter and a short body. The build hooks (`../site/hooks/`) render the
Materials and Readings sections from front matter, so keep it filled in:

```yaml
---
title: Software Process          # nav label = the topic (no "week")
status: ready                    # placeholder | draft | ready
materials:
  - title: Lecture slides
    src: materials/1-2-SEProcessesAndMethodologies.pptx
    pdf: materials/1-2-SEProcessesAndMethodologies.pdf   # optional rendered PDF
readings:
  before:
    - "[MAGE — Part 1: The new engineering problem](https://.../book/)"
  optional:
    - "Boehm, *A Spiral Model of Software Development and Enhancement*"
---

**Concepts.** feedback · uncertainty · iteration · cost of change

A short framing of the topic goes here.
```

- **Materials** (`materials:`) — teaching materials are a **mix of formats** (PowerPoint, Typst, Markdown);
  the site never renders a deck into a page. Each entry has an editable-source `src` (offered as a download)
  and an optional rendered `pdf`. Files live in the page's `materials/` subfolder. A referenced file that
  isn't committed yet renders as *"(coming soon)"* — it never breaks the strict build, and the link appears
  once you add the file. (Rendering source → PDF is optional: Typst via the book's `typst compile`;
  PowerPoint via `soffice --convert-to pdf`.)
- **Readings** (`readings:`) — readings are a **property of the module** they support (`before` /
  `optional`), not a parallel hierarchy. The hook renders a **Readings** section on the page.
- **Concepts** — a compact `**Concepts.**` line at the top of the body.

### The Reading Guide

The Calendar carries a `<!-- READING-GUIDE -->` marker that the readings hook replaces with an
**auto-generated** `Module | Core reading | Additional reading` table, aggregated from every module's
`readings:` front matter — the "what do I assign from the book" overview for adopters. It stays in sync
automatically; you never hand-maintain it.

## Building the course bundle

```bash
python3 tools/build_course_bundle.py --term fall-2026      # → dist/mage-course-fall-2026.zip
python3 tools/build_course_bundle.py --dry-run             # print the plan only
```

The bundle packages the whole `course/` tree + the content `LICENSE` + a manifest. `dist/` is gitignored —
the archive is created on demand and attached to a release, never committed.

## Publishing / versioning a release

1. Verify content; run `mkdocs build --strict` and the repo's `catalog_tests.py` (link + a11y + validity
   gates).
2. Build the bundle: `python3 tools/build_course_bundle.py --term <term>`.
3. Tag the release (`git tag course-fall-2026 && git push --tags`) and attach the zip to the GitHub
   release. (Release automation is documented here; a release is **not** published automatically.)
