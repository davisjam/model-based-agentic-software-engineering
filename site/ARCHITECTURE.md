# Teach with MAGE — what's built and how it works

A description of the course-companion site scaffold, for review. Nothing here is published yet; it all
builds and passes locally.

## 1. The one-paragraph model

Your teaching materials stay **in this repository as their own authoritative source**. A small static-site
generator (**MkDocs Material**) reads the Markdown under `course/` and produces a website at the **`/teach/`
corner** of your existing GitHub Pages site — the book and catalogue keep the root; the course companion
sits beside them under one deployment. Nothing is duplicated: the site is generated *from* the repo files.
The actual lecture/handout **files** (PowerPoint, Typst, …) are linked, not re-rendered — each unit's page
is a hub that points at its materials.

## 2. Where everything lives

| Path | What it is | Committed? |
|---|---|---|
| `course/` | **Authoritative teaching content** — Markdown pages + `materials/` files. Edit here. | yes |
| `course/LICENSE` | CC BY 4.0 (teaching content), attributed to Davis + France. | yes |
| `course/README.md` | Authoring guide: preview, adding materials, metadata, bundle, release. | yes |
| `site/mkdocs.yml` | The site configuration (theme, nav, hooks, base path). | yes |
| `site/hooks/` | Two build hooks (schedule table; materials section). | yes |
| `site/requirements.txt` | Pinned site toolchain (mkdocs, material, awesome-pages). | yes |
| `tools/build_course_bundle.py` | Builds the distributable course `.zip`. | yes |
| `.github/workflows/pages.yml` | Existing Pages workflow, **extended** to also build `/teach`. | yes (modified) |
| `dist/`, `site/.venv/`, `site/site/` | Build outputs / local venv. | no (gitignored) |

The `course/` Markdown is the **single source**. `site/` holds config only. `catalog.py` (your book +
catalogue generator) is untouched and stays stdlib-only; the teaching site is a *separate, pinned*
toolchain so it never contaminates the catalogue build.

## 3. The six views (and how they map to `course/`)

The site is organized to match how instructors actually use it. Top-level nav:

1. **Teach with MAGE** (home) — one-idea framing + pointers into the two ways in. → `course/index.md`
2. **Reference Course** — the full 16-week course. → `course/reference-course/` (`index.md` = at-a-glance,
   `syllabus.md`, `lectures/week-NN.md`, `exercises.md`, `assessments.md`)
3. **Semester Project** — the pod-based regulatory-engineering arc. → `course/project/` (`index.md` overview,
   `phase-0…6.md`, `candidate-projects.md`, `pod-cross-testing.md`)
4. **Modules** — the same content re-cut **by MAGE concept** for partial adoption. → `course/modules/`
   (modeling, requirements/specification, alignment, validation, assurance, governance-conversion,
   agentic-engineering) — these *link* the relevant lectures, they don't copy them.
5. **Instructor Resources** — teaching notes, rubrics, oral-exam, adaptation. → `course/instructor/`
6. **Downloads** — course bundle, editable sources, tagged releases. → `course/downloads/`

Nav follows the directory tree (the `awesome-pages` plugin), so **adding a file adds a page** — you never
edit site config for routine additions. A directory's `.pages` file sets its nav title/order.

## 4. Metadata (YAML front matter)

Every teaching page carries front matter: `title`, `week`, `mage_readings`, `objectives`,
`instructor_materials`, `student_materials`, `assignments`, `instructor_notes`, `status`, and `materials`.
Aggregated views are **generated** from it — so the metadata is the single source, never re-typed:

- **The 16-week at-a-glance table** (Reference Course home) is built by `site/hooks/schedule.py` from each
  `week-NN.md`'s `week` + `title` + `mage_readings`. Add a week → the table updates itself.

## 5. Mixed-format materials (pptx / Typst / Markdown)

Because the real materials are a **mix of formats**, the site never renders a deck into a page. Instead a
unit page declares its materials in front matter:

```yaml
materials:
  - title: Lecture slides
    src: materials/week-03.pptx      # editable source — offered as a download
  - title: In-class handout
    src: materials/week-03-handout.typ
```

`site/hooks/materials.py` renders a **Materials** section from that list. Rules:

- **PowerPoint stays PowerPoint** (your current decision) — the deck is linked as an editable-source
  download. No conversion.
- An optional `pdf:` field is supported for later, if you ever want a rendered view/download (Typst →
  PDF reuses the book's `typst compile`; PowerPoint → PDF would be a LibreOffice step). Not wired now.
- A referenced file that isn't committed yet shows **"(coming soon)"** — it never breaks the build, and
  the link appears automatically once you drop the file into `materials/`.

So your workflow is: write the unit page's front matter + prose, drop the `.pptx`/`.typ` into `materials/`,
done — no site edits.

## 6. Deployment (one Pages site, `/teach` subpath)

The existing `pages.yml` builds the catalogue + book at the root as before. Two additions:

- A step installs the pinned site toolchain and runs `mkdocs build --strict` into `_site/teach`.
  `--strict` **fails the deploy on any broken internal link** in the course site (the link-integrity gate).
- The artifact-assembly step now **excludes the raw `course/` and `site/` sources** (only the rendered
  `/teach/` ships) and keeps the pre-built `_site/teach`.

Base path: `https://davisjam.github.io/model-based-agentic-software-engineering/teach/`. Links are
directory-relative, so they resolve locally and under that hosted base.

## 7. The landing button

The site landing's "ways in" now includes a **Teach with MAGE** button → `teach/index.html`
("learning materials — a course companion for instructors"). That's the only landing change for now; the
broader tone-down is deferred to you.

## 8. Licensing

- **Teaching content** (`course/`) → **CC BY 4.0**, attributed to *James C. Davis and Steve France*
  (`course/LICENSE`). Credit required, use/modify freely, don't remove the credit — exactly your intent.
  The attribution names carry a `REVIEW` marker pending your confirmation.
- **Software** (catalogue tooling, book build) → unchanged **MIT** (top-level `LICENSE`).

## 9. Course bundle + releases

`python3 tools/build_course_bundle.py --term fall-2026` → `dist/mage-course-fall-2026.zip` (the whole
`course/` tree + content license + manifest; prints a plan and a result summary). `dist/` is gitignored;
the archive is created on demand and attached to a tagged release — release automation is *documented*, not
fired (no release is published automatically).

## 10. Verification status (local)

- `mkdocs build --strict` → **0 errors** (all six views render; schedule table generated; materials section
  renders; placeholders don't break links).
- `catalog.py validate` → **0 issues**; `catalog.py build` → clean (the new dirs + the landing button do not
  affect the catalogue/book build or its reachability gate).

## 11. What's placeholder / recommended next content

Everything under `course/` is a **placeholder** with the right shape and metadata. To populate, highest-value
first:

1. **Semester project** — the ECE 30861 kickoff deck + project handout (the flagship; the arc is scaffolded
   and waiting).
2. **Syllabus + schedule** — real weekly topics and MAGE readings (these light up the at-a-glance table).
3. **Lecture decks** — drop `.pptx` into `reference-course/lectures/materials/` and reference them.
4. **Rubrics + oral-exam guidance** — the assessment model is described; the rubrics are stubs.
5. **Module mappings** — point each concept module at the weeks/exercises that teach it.

## 12. Open items for you

- **Landing tone-down** (deferred — button added for now).
- **Attribution names** on the CC BY license (confirm "James C. Davis and Steve France").
- **Commit/publish timing** — nothing is committed yet; review locally first via
  `site/.venv/bin/mkdocs serve -f site/mkdocs.yml`.
