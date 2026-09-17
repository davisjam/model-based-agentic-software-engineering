<!--
  Method language — STARTER glossary (adopt & adapt)

  The shared lexicon the governance method speaks in — lifted from the stabilized vocabulary of the
  MAGE book (Model-Based Agentic Engineering). It is the common vocabulary the three partner
  skills (govern / operate / communicate) reach for, so a term means the same thing across all three.

  Two tiers ship here:
    - Tier 1 — the core ideas: the concepts the whole argument turns on (the two theses, the conversion
      that grows the environment, the capital it accrues, the governing premise).
    - Tier 3 — the governed engineering environment: the vocabulary of the mechanisms the method builds
      (constraint, sensor, validator, gate, lint, hook, drift gate, and the surrounding terms).

  One line each. Adopt the terms as-is; add your own house terms in a companion `*.local.md` overlay
  rather than editing this file, so a refresh from upstream never clobbers your additions.
-->

# Method language — the shared lexicon

The vocabulary the governance method reasons in. Each term is one line: the crisp gloss plus what it
names. The two tiers are the *core ideas* the argument turns on and the *governed engineering
environment* the method builds.

## Tier 1 — the core ideas

- **Commodity intelligence.** *The founding condition.* Machine intelligence that has become abundant,
  cheap, and general — no longer the scarce input to engineering. When intelligence is a commodity,
  engineering reorganizes around what stays scarce: judgment, representations, evidence, and governance.
- **Governance.** *Judgment, as code.* The discipline of encoding human engineering judgment into durable
  mechanisms — models, constraints, validators, policies, workflows, skills — that shape how autonomous
  work proceeds. Not management or compliance: the engineering activity of making sound judgment durable
  so future work inherits it automatically.
- **Judgment is the scarce resource.** The method in one sentence: agents make implementation cheap, so
  the expensive part becomes judgment — what to build, what "correct" means here, which failures deserve a
  wall and which a note. Encode each such call once, so no agent has to make it again.
- **Model.** *A reasoning substrate.* A cheaper, structured approximation of a system an agent can reason
  through and an engineer can specify, analyze, and predict on. The base term the Modeling Thesis turns on.
- **Map and territory.** A model is a map, not the territory: it earns its use by dropping detail and
  never stands in for the running system itself.
- **Modeling Thesis.** Bind intent and system structure into an explicit, structured model, and the fleet
  gains a compact representation to reason through while the engineer gains a surface to specify, analyze,
  and predict on.
- **Alignment Thesis.** *Encode obligations into the environment.* A mechanism the environment enforces
  holds implementation to intent — a policy decided once then stands against every later change, so
  confidently-wrong work is made visible instead of shipped.
- **Governance Conversion.** *Convert failures into mechanisms.* Turning a recurring failure into a
  durable mechanism that permanently retires that failure class.
- **Compounding.** As recurring judgment is converted into durable mechanisms, effort accrues as
  *engineering capital* instead of being re-spent, and the environment grows more able to absorb change —
  for as long as that capital stays fit. Read it as compound interest on judgment already spent.
- **Engineering capital.** *Judgment that compounds.* The stock Compounding accrues: coherent, economical,
  quality-bearing governance that lowers the recurring cost of change. It depreciates once it outlives its
  fit, which is why mature adaptation retires and reconciles as well as adds.
- **Churn.** The dual of Compounding — velocity decay: an increasing share of effort spent rediscovering
  context, undoing recent changes, repairing regressions, or reconciling inconsistencies rather than
  advancing the system.

## Tier 3 — the governed engineering environment

- **Governed Engineering Environment.** What you get when engineering policy is encoded into the
  environment itself — models, constraints, sensors — rather than held in a person's memory. The *object*
  the method builds.
- **Support ratio.** Support-apparatus lines of code divided by production lines of code — a measure of
  how much governed environment a fleet has built around the product it governs.
- **Governance Mechanism.** A repeatable environmental structure that encodes a policy and does one of
  four things: constrains an action, detects a violation, requires evidence, or controls admission.
- **Constraint.** *Prevent the mistake.* A mechanism that scopes the action space so the mistake is
  impossible to make in the first place.
- **Sensor.** *Detect the mistake.* A mechanism that catches a violation after the fact, failing the
  iteration so the mistake cannot ship unnoticed.
- **Validator.** A mechanism of the evidence or admission class: it checks a candidate result against a
  standard before the result may advance, and refuses or flags what fails.
- **Gate.** A check placed across a pipeline step — a commit, a deploy — that refuses to let the step
  through until its condition is met.
- **Lint.** An automated check that scans for a banned pattern and fails the commit when it finds one, so
  a rule holds without a human remembering it.
- **Hook.** A mechanism the harness fires deterministically at an injection point, before or after the
  agent acts — the enforcement primitive lints and gates are built on.
- **Invariant.** A predicate over a model that must always hold — the testable claim a gate or a
  model-checker enforces.
- **Model drift.** A model and the code it describes stop agreeing — the divergence a drift gate exists to
  catch.
- **Drift Gate.** A build-time check that fails when a model and the code it describes disagree, keeping
  the model from decaying into stale documentation.
- **Structured (model).** Said of a model written in an explicit, declared shape a machine can read and
  validate — a schema, not prose — so a build can check the system against it for drift.
- **Executable source-of-truth.** An architecture that binds a model and the code that must agree with it
  tightly enough that a drift gate can block the build the moment they diverge.
- **Traceability.** The round-trip join between a model and the code it governs: every model node maps to
  the code it constrains, and back.
- **Pattern.** Following the classic design-pattern form — name, recurring problem, solution shape,
  consequences, known uses — each governance mechanism is written as a pattern, so an engineer reaches for
  a vetted answer instead of re-deriving one.

<!--
  Soft vs hard. Cross-cutting every mechanism above is one axis worth naming: a SOFT mechanism is
  probabilistic — it aims an agent but cannot block (a skill, a guidance doc); a HARD mechanism is
  deterministic — it holds the line regardless of agent cooperation (a lint, a gate, a hook). Guidance
  aims; machinery holds.
-->
