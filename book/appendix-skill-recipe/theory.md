<!-- point: different-skill-kinds-require-different-structures | Different skill kinds require different structures; two get recipes. | terms: process-skill, mastery-skill, skill-soft-control -->
Skills of different kinds require different structures. Tool-skills mostly package capability-specific
guidance. Process-skills preserve recurring ways of working. Mastery-skills preserve reusable models and
judgment. This chapter gives construction methods for the latter two and a common set of failure modes to
test before shipping.

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

<!-- point: three-skill-types-place-different-demands-on-structure | The three skill types place different demands on structure. | terms: tool-skill, process-skill, mastery-skill -->
The three skill types place different demands on this structure. A tool-skill teaches use of a capability:
scope it to one capability, make its triggering conditions concrete, specify fragile operations precisely,
and prefer deterministic scripts where generated procedures would drift. A process-skill needs to make the
recurring workflow, its state, and its decision points clear. A mastery-skill needs to expose the models and
distinctions through which the agent should reason. When a process- or mastery-skill depends on a
specialized tool, factor the tool-specific guidance into its own tool-skill and refer to it.

## Process-Skills: from Recurring Work to Procedure

<!-- point: a-process-skill-begins-with-a-recurring-unit-of-work | A process-skill keeps a recurring procedure from reconstruction. | terms: process-skill -->
A process-skill begins with a recurring unit of work rather than a domain model. Its purpose is to keep a
useful procedure from being reconstructed differently on every invocation.

<!-- point: build-a-process-skill-in-three-steps-state-decisions-transitions | Build a process-skill: identify state, type decisions, package transitions. | terms: process-skill, lifecycle -->
Build a process-skill in three steps.

- **Step 1 — Identify the recurring process and its state.** Define the unit of work being repeated and the
  states through which it can move. Establish what a healthy or completed state looks like before cataloging
  failures and exceptions.
- **Step 2 — Type the decisions within the process.** Some steps are mechanically determined and should be
  executed directly where practical. Others require bounded judgment that an agent can exercise given the
  right state and criteria. Still others require human judgment because responsibility, consequence, or
  missing evidence prevents delegation. Make those distinctions explicit rather than representing every step
  as undifferentiated prose.
- **Step 3 — Package the procedure and its transitions.** Give the agent enough information to determine
  where it is in the process, which procedure applies, what evidence each step produces, and what state
  follows. Use executable operations for deterministic steps where practical; reserve instructions for
  choices that actually require reasoning.

This construction mirrors the Execute / Delegate / Escalate distinction from
[Operating MAGE](4.4-operating-mage.html). A process-skill does not turn every process into automation. It
makes the process explicit enough that each part can be handled by the appropriate mechanism or reasoner.

<!-- point: the-discriminator-is-which-asset-survives-improved-judgment | The discriminator: which asset survives if individual judgments improve. | terms: process-skill, mastery-skill -->
A useful test is whether the skill's primary asset survives if the individual judgments within it improve.
If the enduring value is the sequence, state, routing, and handoffs, it is probably a process-skill. If the
enduring value is the expertise used to decide what should happen, it is probably a mastery-skill.

## Mastery-Skills: from Domain Knowledge to Model

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

Skills can fail in several predictable ways.

- **The description is vague.** The skill exists but does not trigger when needed. Put concrete task cues,
  formats, tools, or other recognizable triggers in the description.
- **`SKILL.md` becomes a manual.** Exhaustive reference material consumes context and obscures the structure
  that should guide the work. Keep the top-level file focused and move detail into resources.
- **A process-skill has no explicit process.** The skill becomes a collection of procedures and exceptions
  without a clear lifecycle, state, or routing rule. Make the recurring unit of work and its transitions
  explicit.
- **A mastery-skill has no fundamental model.** The skill becomes a collection of locally useful tips with
  no coherent way to reason across them. Return to the fundamental model.
- **The decomposition overlaps.** Multiple resources partially encode the same concern, forcing the agent to
  reconcile them. For a process-skill, redraw the lifecycle or responsibility boundaries; for a
  mastery-skill, merge overlapping facets or redraw them along independent axes.
- **Soft guidance is presented as enforcement.** A skill can guide an agent toward a behavior; it
  cannot guarantee that behavior. If a rule must hold independently of agent cooperation, implement a
  mechanism such as a lint, gate, type, or architectural constraint. The skill can explain or invoke that
  mechanism, but it does not replace it.
- **The skill costs more to maintain than it saves.** Skills require maintenance like other engineering
  assets. Add one when recurrence or consequence justifies its upkeep.

<!-- point: a-passive-skill-fires-only-when-a-hook-fires-it | A passive skill fires only when a hook fires it. | terms: skill-soft-control, reflection-hook -->
A skill that never loads has no effect. Where a recurring event should reliably invoke it, pair the skill
with an appropriate trigger or hook.
The hook makes invocation more reliable; the skill still supplies guidance rather than enforcement.

Before shipping:

- [ ] The skill has been classified by its primary role: tool, process, or mastery.
- [ ] Its description names concrete triggering conditions and follows the platform's current discovery requirements.
- [ ] The top-level file contains the governing structure rather than bulk reference material.
- [ ] Detailed resources are loaded progressively.
- [ ] Instruction specificity matches task fragility.
- [ ] Deterministic repeated operations are implemented deterministically where practical.
- [ ] For a process-skill, the recurring process, relevant state, transitions, and decision points are explicit.
- [ ] For a mastery-skill, the fundamental model, orthogonal facets, and governing principle are explicit.
- [ ] Recurring invocation is supported by a trigger or hook where appropriate.
- [ ] Nothing is described as enforced when the skill can only guide.
- [ ] The skill has been evaluated on representative past tasks and on the models on which it will run.
