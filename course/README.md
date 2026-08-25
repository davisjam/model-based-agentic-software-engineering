# Teach with MAGE — course companion

This directory is the **authoritative, version-controlled source** for the "Teach with MAGE" course
companion. The public site at `/teach/` is *generated from these files* (MkDocs Material) — there is no
parallel copy of any schedule, assignment, or lecture. Edit here; the site follows.

- **Content license:** the teaching materials in `course/` are **CC BY 4.0** (attribution to James C. Davis
  and Steve France) — see [`LICENSE`](LICENSE). This is separate from the repository's MIT software license.
- **Site config:** `../site/mkdocs.yml` (+ `../site/hooks/`). **Deployment:** the repo's Pages workflow
  builds this into `_site/teach`.

## Local preview

The teaching site uses a small pinned toolchain, separate from the stdlib-only `catalog.py`:

```bash
python3 -m venv site/.venv
site/.venv/bin/pip install -r site/requirements.txt
site/.venv/bin/mkdocs serve -f site/mkdocs.yml      # live preview at http://127.0.0.1:8000/
site/.venv/bin/mkdocs build --strict -f site/mkdocs.yml -d /tmp/teach   # one-off strict build
```

`--strict` fails on any broken internal link or nav reference — run it before pushing.

## Adding teaching materials (no site-code changes needed)

The nav follows the directory tree (via the `awesome-pages` plugin), so **you add content by adding a
Markdown file** — you never edit `mkdocs.yml` for routine additions.

- **A new lecture/week:** drop `reference-course/lectures/week-NN.md`. It appears in the Weeks nav *and* in
  the generated 16-week at-a-glance table automatically.
- **A new module, phase, rubric, etc.:** add a `.md` in the matching directory (`modules/`, `project/`,
  `instructor/`). To set a nav title or ordering for a directory, edit its `.pages` file.

## Metadata conventions (YAML front matter)

Every teaching page carries front matter. Aggregated views (the schedule table, and future module
roll-ups) are generated from it, so keep it filled in:

```yaml
---
title: Week 3: Modeling II — the six model classes   # page + nav title
week: 3                     # integer for lecture weeks; blank otherwise
mage_readings:              # associated MAGE book chapters/sections
  - "Chapter 2 — Structural models"
objectives:                 # learning objectives
  - "Choose an appropriate model class for a given engineering question."
instructor_materials: []    # links to slides, notes (repo paths or URLs)
student_materials: []       # links to handouts, readings
assignments: []             # assignments / milestones due this unit
instructor_notes: ""        # optional, private-ish teaching notes
status: placeholder         # placeholder | draft | ready
materials:                  # attached materials of ANY format (see "Materials & formats" below)
  - title: Lecture slides
    src: materials/week-03.pptx
    pdf: materials/week-03.pdf
---
```

### Materials & formats (pptx / Typst / Markdown)

Teaching materials are a **mix of formats** — PowerPoint decks, Typst, Markdown. The site does **not**
render decks into pages. Instead, a unit's Markdown page is a hub that **links to its materials**, and the
`materials:` front matter drives an auto-generated **Materials** section on the page. Each entry:

- `src` — the **editable source** (`.pptx`, `.typ`, `.md`, …), preserved as-is and offered as a download.
- `pdf` — an **optional rendered PDF** for viewing/download.

Files live next to the page (a `materials/` subfolder is the convention). A referenced file that isn't
committed yet renders as *"(coming soon)"* — it never breaks the strict link check, and the link appears
automatically once you add the file.

**Rendering source → PDF (optional):** Typst → PDF reuses the book's `typst compile`; PowerPoint → PDF is
a LibreOffice headless conversion (`soffice --convert-to pdf`). You can either commit the rendered PDF
next to the source, or wire the conversion into the Pages workflow — **this is a pending decision** (see
the deliverables report). Until then, decks are offered as editable-source downloads.

`status:` drives the scaffolding tooling (a `placeholder` page may be overwritten by the scaffold script;
a `draft`/`ready` page is never overwritten) and lets the bundle report count what's still unpopulated.

## Building the course bundle

```bash
python3 tools/build_course_bundle.py --term fall-2026      # → dist/mage-course-fall-2026.zip
python3 tools/build_course_bundle.py --dry-run             # print the plan only
```

The bundle packages the whole `course/` tree (authoritative Markdown) + the content `LICENSE` + a manifest.
`dist/` is gitignored — the archive is created on demand and attached to a release, never committed.

## Publishing / versioning a release

1. Populate/verify content; run `mkdocs build --strict` and the repo's `catalog_tests.py` (link + a11y +
   validity gates) — see the top-level project docs.
2. Build the bundle: `python3 tools/build_course_bundle.py --term <term>`.
3. Tag the release (e.g. `git tag course-fall-2026 && git push --tags`) and attach
   `dist/mage-course-<term>.zip` to the GitHub release. (Release automation is documented here; a release
   is **not** published automatically.)

## Layout note

The `course/` tree is organized to match the six site views (Home, Reference Course, Semester Project,
Modules, Instructor Resources, Downloads). Source categories from the original brief map as: *syllabus →
`reference-course/syllabus.md`*, *schedule → `reference-course/index.md`* (generated table), *lectures →
`reference-course/lectures/`*, *exercises/assessments → `reference-course/`*, *project phases →
`project/phase-*.md`* (a phase can become a directory if it grows), *instructor → `instructor/`*. Adjust
freely — the nav follows the tree.
