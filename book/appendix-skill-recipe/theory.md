<!-- point: a-good-mastery-skill-turns-on-one-base-model | A good mastery-skill turns on one base model, layered and tied. | terms: mastery-skill, skill-soft-control -->
A good mastery-skill has a recognizable structure. This chapter gives a three-step method for building one
and the failure modes to test before shipping.

## Anatomy

<!-- point: progressive-disclosure-is-the-authoring-ladder | Progressive disclosure is the authoring ladder for a skill. | terms: context-window -->
A skill is a directory with one required file and optional bundled resources. **`SKILL.md`** carries YAML
frontmatter containing a name and a description, followed by the instructions the agent loads when the skill
triggers. **Bundled resources** hold references, examples, scripts, and other material that the agent reads
only when needed.

This structure supports progressive disclosure: the name and description make the skill discoverable,
`SKILL.md` carries its governing structure, and bundled resources supply detail on demand. Put
triggering information in the description, the governing model in `SKILL.md`, and bulk reference material in
resources.

> **Implementation note (August 2026).** Anthropic's current skill-authoring guidance recommends keeping
> loaded context concise, putting triggering information in the description, keeping `SKILL.md` under
> roughly 500 lines, moving invocation-specific detail into linked reference files, matching instruction
> specificity to task fragility, and evaluating skills on representative tasks. These mechanics will change;
> consult current platform documentation when implementing a skill. This appendix focuses on what knowledge
> the skill should contain and how to structure it.
> *(Source: Anthropic, "Skill authoring best practices.")*

<!-- point: the-recipe-targets-mastery-skills-not-tool-skills | The recipe targets the mastery-skill, not the tool-skill. | terms: mastery-skill, skill-soft-control -->
A **tool-skill** packages a capability the agent *invokes*; a **mastery-skill** packages judgment the agent
reasons *through*. Tool-skills need little beyond reliable invocation — scope each to one capability, make
its triggering conditions concrete, specify fragile operations precisely, and prefer deterministic scripts
where generated procedures would drift. When a mastery-skill needs a tool interface,
factor that interface into its own tool-skill and reference it.

## From Domain Knowledge to Model

<!-- point: build-a-mastery-skill-in-three-layers-top-idea-first | Build a mastery-skill in three layers, top idea first. | terms: mastery-skill, orthogonal-models -->
Build a mastery-skill in three steps.

- **Step 1 — Find the domain's fundamental model.** Name the model that makes the rest of the domain
  intelligible: the frame you would teach first to someone learning it. Do this before writing the
  resources. If you cannot state the fundamental model clearly, you are likely to produce a collection of
  tips rather than a coherent way of reasoning.
- **Step 2 — Layer orthogonal models onto it.** Decompose the domain into independent facets and represent
  each separately. Two facets that substantially overlap probably belong together; an important
  concern that fits nowhere indicates a gap in the decomposition. This separation also supports progressive
  disclosure — the agent can load a facet only when the task requires it.
- **Step 3 — Write the governing principle in `SKILL.md`.** The top-level file should not merely enumerate the
  resources. It should explain how the facets fit together and when to use each one. `SKILL.md`
  should provide enough structure to reason with the skill; the resources supply the detail required for
  particular tasks.

<!-- point: a-recipe-built-skill-composes-and-adopts-in-layers | A recipe-built skill composes and adopts in layers. | terms: self-communicate, self-governance, self-operate -->
The structure supports composition and incremental adoption. Another skill can refer to the underlying
model rather than duplicate it, and the fundamental model can be useful before every facet exists.

Orthogonal skills can also compose. Give each skill one reason to change, then use explicit interfaces to let one consume models, mechanisms, or observations another produces.

## Failure Modes

A mastery-skill can fail in several predictable ways.

- **The description is vague.** The skill exists but does not trigger when needed. Put concrete task cues,
  formats, tools, or other recognizable triggers in the description.
- **`SKILL.md` becomes a manual.** Exhaustive reference material consumes context and obscures the governing
  model. Keep the top-level file focused and move detail into resources.
- **There is no fundamental model.** The skill becomes a collection of locally useful tips with no coherent
  way to reason across them. Return to Step 1.
- **The facets overlap.** Multiple resources partially encode the same concern, forcing the agent to
  reconcile them. Merge them or redraw the boundary along an independent axis.
- **Soft guidance is presented as hard enforcement.** A skill can guide an agent toward a behavior; it
  cannot guarantee that behavior. If a rule must hold independently of agent cooperation, implement a hard
  mechanism such as a lint, gate, type, or architectural constraint. The skill can explain and invoke that
  mechanism, but it should not claim to replace it.
- **The skill costs more to maintain than it saves.** Skills and hooks themselves require maintenance. Add
  skills and hooks only when recurrence or consequence justifies their upkeep.

<!-- point: a-passive-skill-fires-only-when-a-hook-fires-it | A passive skill fires only when a hook fires it. | terms: skill-soft-control, reflection-hook -->
A skill that never loads has no effect. Where a recurring event should reliably invoke it, pair the skill
with an appropriate trigger or hook.
The hook makes invocation more reliable; the skill still supplies guidance rather than enforcement.

Before shipping:

- [ ] The skill has been classified as a tool-skill or a mastery-skill.
- [ ] Its description names concrete triggering conditions and follows the platform's current discovery requirements.
- [ ] The top-level file contains the governing structure rather than bulk reference material.
- [ ] Detailed resources are loaded progressively.
- [ ] Instruction specificity matches task fragility.
- [ ] Deterministic, repeated operations are implemented deterministically where practical.
- [ ] For a mastery-skill, the fundamental model, orthogonal facets, and governing principle are explicit.
- [ ] Recurring invocation is supported by a trigger or hook where appropriate.
- [ ] Nothing is described as enforced when the skill can only guide.
- [ ] The skill has been evaluated on representative past tasks and on the models on which it will run.
