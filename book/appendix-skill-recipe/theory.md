<!-- point: a-good-mastery-skill-turns-on-one-base-model | A good mastery-skill turns on one base model, layered and tied. | terms: mastery-skill, skill-soft-control -->
This chapter states what a good mastery-skill is made of and how to build one. It is the construction
method and its quality bar, not the case for why skills matter — the [Skills chapter](4.3-the-skills.html)
carries that. Here every paragraph advances construction: the shell a skill wears, the three-step recipe
that fills it, and the ways a skill fails so you can test against them before you ship.

## Anatomy, and the two kinds of skill

<!-- point: progressive-disclosure-is-the-authoring-ladder | Progressive disclosure is the authoring ladder for a skill. | terms: context-window -->
A skill is a directory with one required file and optional bundled resources. **`SKILL.md`** carries YAML
frontmatter — `name` (lowercase letters, numbers, hyphens; a gerund reads well) and `description` (third
person, what-it-does *and* when-to-use-it, under 1,024 characters) — over a body of instructions kept under
about 500 lines, because the body competes with conversation history once loaded. **Bundled resources** —
reference files, examples, scripts the body points to — cost nothing until read; link each one level deep
from `SKILL.md` so the agent reads whole files, not fragments of a nested chain.

Progressive disclosure is the authoring ladder. The `name` and `description` are the first rung — enough
to decide the skill is relevant. `SKILL.md` is the second. The bundled files are the third, pulled only on
demand. Author for that ladder: triggering in the description, the governing shape in the body, the bulk in
resources.

> ### Foreword — the vendor's guidance
>
> Anthropic publishes a best-practices guide for skill authoring, and it is worth reading before this
> appendix. Its core moves, quoted from *Skill authoring best practices* (Claude platform documentation):
>
> - **The context window is a public good.** "Your Skill shares the context window with everything else
>   Claude needs to know." So *concise is key*: "Only add context Claude doesn't already have." The
>   default assumption is that "Claude is already very smart" — challenge every paragraph to justify its
>   token cost.
> - **Progressive disclosure.** At startup only each skill's `name` and `description` are pre-loaded;
>   Claude reads `SKILL.md` when the skill becomes relevant, and reads bundled files only as needed. "Keep
>   SKILL.md body under 500 lines"; push anything not needed on every invocation into a reference file, and
>   keep references "one level deep from SKILL.md."
> - **The description does the discovery.** It "should include both what the Skill does and when to use
>   it," must be written "in third person," and is capped at 1,024 characters. "Claude uses it to choose
>   the right Skill from potentially 100+ available Skills."
> - **Set appropriate degrees of freedom.** A fragile, must-run-in-sequence task is "a narrow bridge with
>   cliffs on both sides" — give exact steps. An open-ended one is "an open field with no hazards" — give
>   direction and trust the model.
> - **Build evaluations first.** "Create evaluations BEFORE writing extensive documentation." Test the
>   skill against real past tasks, across every model you plan to run it on.
>
> *— Anthropic, "Skill authoring best practices," retrieved 2026-08-04. Follow it for the mechanics; this
> appendix adds the shape the vendor guidance does not name.*

The vendor guidance answers one question well: how do you *package* a capability so an agent discovers it
and follows it cheaply? Its answers are procedural — a triggering description, progressive disclosure,
degrees of freedom matched to the task, evaluations built first. Follow it to the letter for the mechanics;
this appendix adds the shape it does not name.

<!-- point: the-recipe-targets-mastery-skills-not-tool-skills | The recipe targets the mastery-skill, not the tool-skill. | terms: mastery-skill, skill-soft-control -->
That shape starts with the kind of skill. A **tool-skill** packages a capability the agent *invokes* — an
interface to one tool, an MCP server, a CLI, an API; a capability the agent lacks a call for, and the
vendor checklist covers it end to end. A **mastery-skill** installs *judgment* the agent reasons *through*
— a way of working, independent of any single tool, that the agent could technically perform but performs
*inconsistently* without your standards. The recipe below builds mastery-skills; the three that ship with
this book are all of that kind.

**Writing a tool-skill is the short path** — follow the vendor guidance directly, there is little to add.
Scope it to one capability: one tool, one job, and resist bundling three tools into one skill. Write the
description for discovery — what it does and when to reach for it, in the words a user will type, since
that is what triggers it from a crowded shelf. Match degrees of freedom to fragility: exact commands where
the task is fragile and sequential, direction and a default where it is open-ended. Push the bulk into
references linked one level deep. And prefer a script to generated code for anything deterministic, fragile,
or repeated — it is more reliable, costs no context, cannot drift between runs, and handles its own errors.

**Reach for a mastery-skill on the long path** when the agent already *can* do the task but does it
inconsistently — when you catch yourself pasting the same judgment into brief after brief. A tool-skill
wins a correct call, cheap to write. A mastery-skill wins consistent quality, expensive to write, and worth
it when the task recurs and its quality matters. When a mastery-skill sprouts a tool interface, factor the
interface into its own tool-skill and let the mastery-skill cite it — one skill, one job.

## The three-step construction recipe

<!-- point: build-a-mastery-skill-in-three-layers-top-idea-first | Build a mastery-skill in three layers, top idea first. | terms: mastery-skill, orthogonal-models -->
A mastery-skill is built in three layers, top idea first, and the order binds: you cannot layer facets onto
a model you have not found, and you cannot write the tying principle before the facets exist. State the
procedure once, abstractly. The next chapter runs it three times on real skills.

- **Step 1 — Find the domain's fundamental model.** Name the one abstraction the whole skill reasons
  through — the first thing you would teach a new hire, the frame that makes every later rule land.
  **Test:** name it before you write a single resource. If you cannot name it, you do not yet understand the
  domain, and what you write will be a pile of tips rather than a way of seeing.
- **Step 2 — Layer orthogonal models on it.** Cover the domain with facets, each an independent model in
  its own resource. **Test:** two facets that overlap are one facet split badly; a facet you cannot name is
  a hole. Aim for a set that spans the domain with neither doubles nor holes. Each facet is a file the agent
  loads only when the task touches it — this is where progressive disclosure earns its keep.
- **Step 3 — Write `SKILL.md` as the tying principle.** The top page is not a table of contents of the
  resources. It is the governing principle that makes the facets cohere, plus the order to apply them.
  **Test:** a reader who absorbs the top page already knows how to *use* the skill; the resources supply the
  *how*.

<!-- point: a-recipe-built-skill-composes-and-adopts-in-layers | A recipe-built skill composes and adopts in layers. | terms: self-communicate, self-governance, self-operate -->
The recipe buys you two properties from the shape, not from any one resource. **It composes:** because each
skill turns on a clean fundamental model, another skill cites it by that model instead of copying its
content, so no copy drifts. **It adopts in layers:** take the fundamental model alone for most of the value,
add facets as the need arises. The model without its facets still teaches a way of seeing; a facet without
the tying principle still solves its slice. You do not have to swallow the skill whole to start. The shape
has a name and a figure in the [Skills chapter](4.3-the-skills.html) — the *Skill Skeleton*; this chapter
is that skeleton turned into steps.

## How a mastery-skill fails — and how it fires

The quality bar, stated as the failure modes to test against, plus the one construction step that keeps a
passive skill from going unused.

- **The description is vague, so the skill never triggers.** "Helps with documents" loses to a rival that
  names the file types and the verbs. Fix: put the concrete triggers — formats, tool names, the words a
  user types — in the description.
- **The `SKILL.md` is a manual, not a method.** Long, exhaustive, re-explaining what the model already
  knows. Fix: cut every paragraph the model does not need; push the reference bulk into bundled files.
- **A mastery-skill with no fundamental model.** A pile of tips that never cohere, because Step 1 was
  skipped. Fix: name the one abstraction first; if you cannot, you are not ready to write the skill.
- **Facets that overlap.** Two resources half-saying the same thing, so the agent reads both and gets a
  muddle. Fix: they are one facet split badly — merge them, and re-cut along a genuinely independent axis.
- **Soft dressed as hard.** Claiming a skill *enforces* something. It cannot; it aims. Fix: if the rule
  must hold regardless of agent cooperation, build the hard mechanism — a lint, a gate, a typed seam — and
  let the skill point at it.
- **The teetering tower.** Enough governance skills and hooks that tending them becomes the work. Fix: this
  is the operator's call — watch for the agent side-questing to polish a guardrail nobody asked for, and
  stop minting when the tower starts to wobble.

<!-- point: a-passive-skill-fires-only-when-a-hook-fires-it | A passive skill fires only when a hook fires it. | terms: skill-soft-control, reflection-hook -->
The failure that no wording fixes is the passive one. A skill sits until something invokes it, and an agent
heads-down in the work will not stop to invoke it. Pair it with a **hook** — a timer or event that fires
the skill without waiting for a human to notice. Guidance aims; the hook makes the aiming happen. Shipping
the hook is a construction step, not an afterthought.

**The run-before-ship checklist** merges the vendor's list with this appendix's additions.

- [ ] Chosen the kind — tool-skill or mastery-skill — before writing.
- [ ] Description is third-person, specific, and names the triggers; under 1,024 characters.
- [ ] `SKILL.md` body under ~500 lines; the bulk lives in bundled files, linked one level deep.
- [ ] Degrees of freedom match the task's fragility (exact steps where fragile, direction where open).
- [ ] Scripts solve rather than defer; no magic constants; forward-slash paths.
- [ ] (Mastery-skill) A named fundamental model, orthogonal facets with no overlaps, and a tying principle
      in `SKILL.md`.
- [ ] If the skill is passive but the reflex must not be skipped, a hook fires it.
- [ ] Nothing claimed as *enforced* that the skill can only *aim*.
- [ ] At least three evaluations from real past tasks; tested across every model you will run it on.
