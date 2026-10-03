/**
 * The model-type registry — the kernel's own census of what a "model" can BE here (UX-I9).
 *
 * The kernel distinguishes three model types, and until this module it did so without ever saying
 * so: structural models live in `system.models`, state machines in `system.machines`, the
 * quantitative model in `system.quantities` + `system.accounting`, and the query dispatcher, the
 * form vocabularies and the per-type evaluators each encode the split separately. A Learn gallery
 * built on that would have to re-derive the census by hand — the "hand-maintained brochure" the
 * UX-I9 caution names. This registry is the census as one typed object, and it earns its place the
 * way `capabilities.ts` did: by being CONSULTED, not merely readable.
 *
 * **Where the kernel consults it.** `runTypedQuery` (engine/index.ts) looks the asked query's kind
 * up here and refuses — before any evaluator runs — when the system declares no substrate of that
 * type. That rung fixes a live defect: a `latency` measurement over a system declaring no
 * quantities answered `holds` with a magnitude of 0 ms, a number that looked measured and was
 * fabricated (the charge table was empty, so every trace totalled zero). The same shape held for
 * `peak_memory` (0 MB) and for behavioural questions of a machineless system (`deadend` held,
 * exhaustively, over the one empty configuration). The honest answer is the one the refusal
 * doctrine already prescribes for purposeful omission: name what is absent and what declaring it
 * would take. The prose comes from this registry, so the refusal a user reads and the Learn entry
 * they are sent to describe the same thing by construction.
 *
 * **What an entry does NOT do: restate a schema.** Each type's shape is already defined, once, in
 * code — `CanonModel` / `CanonMachine` / `CanonQuantity` in `src/ir/types.ts`, the matching
 * top-level sections of `mage-model.schema.json`, the prose in `SEMANTICS.md`. An entry CITES
 * those authorities (`schema`); it never copies a field list, because a copied shape is a second
 * source of truth one field-rename away from lying. The property families are held the same way:
 * `propertyFamilies` is the engine's own form array BY REFERENCE (`GRAPH_FORMS`,
 * `BEHAVIOR_FORMS`, `REQUIREMENT_METRICS`), so a form added to the engine appears in every Learn
 * entry without anyone remembering to.
 *
 * **Three types, not four.** The author's Learn sketch shows a fourth card, "Data / Policy Model".
 * The kernel has no such type: Message Bus's `data-policy` is an entry in `system.models` whose
 * contribution is properties over an ordered-enum domain — a structural graph used for a policy
 * purpose. Purposes are a second axis, and they live in the app layer (`src/app/learn.ts`), each
 * bound to a kernel type declared here. Ruling: `DECISIONS-RULED-model-types-261002.md`.
 */
import type { CanonicalSystem } from "../ir/types.ts";
import {
  BEHAVIOR_FORMS, GRAPH_FORMS, detail, unlicensed, type Query, type Verdict,
} from "./types.ts";
import { REQUIREMENT_METRICS } from "../quant/requirement.ts";

/** Every public model type. The list is closed; adding one is a deliberate act. */
export type ModelTypeId = "structural-graph" | "state-machine" | "quantitative-model";

/**
 * A pointer at the place a shape is actually DEFINED. The registry's job is to say where the
 * authority is, not to be one; `role` says what the cited symbol is authoritative FOR, so two
 * citations on one type cannot silently cover the same ground.
 */
export interface SchemaAuthority {
  /** Repo-relative path, from the workbench root. A test asserts it exists. */
  readonly file: string;
  /** The exported symbol, schema key, or section heading. A test asserts the file contains it. */
  readonly symbol: string;
  readonly role: string;
}

export interface ModelType {
  readonly id: ModelTypeId;
  readonly label: string;
  /** The engineering question this type answers — question first, per the Learn requirement. */
  readonly question: string;
  /** The query dialect that interrogates this substrate. One type per kind; a test pins the 1:1. */
  readonly queryKind: Query["kind"];
  /** Where the shape is defined. Pointers, never restatements. */
  readonly schema: readonly SchemaAuthority[];
  /**
   * The questions this type can establish, BY REFERENCE to the engine's own vocabulary. Identity
   * with the source array is asserted by a test — a spread copy here would be the drift this
   * registry exists to prevent.
   */
  readonly propertyFamilies: readonly string[];
  /** What this type deliberately does not tell you — the purposeful-reduction half of a Learn page. */
  readonly omits: readonly string[];
  /** The composition that licenses a richer property, by registered partner. */
  readonly combineWith: {
    readonly partner: ModelTypeId;
    /** The question the PAIR can answer that neither type answers alone. */
    readonly richerQuestion: string;
  };
  /** Does this system declare any substrate of this type? The consultation gate reads this. */
  readonly presentIn: (system: CanonicalSystem) => boolean;
  /**
   * The authoring move that introduces this type, in the author's terms. Required and concrete,
   * for the same reason `SeamRefusal.wouldLicense` is: a refusal naming a gap without the remedy
   * sends the reader back to the specification for what the tool already knows.
   */
  readonly wouldLicense: string;
}

export const MODEL_TYPES: readonly ModelType[] = [
  {
    id: "structural-graph",
    label: "structural model",
    question: "What is connected to what?",
    queryKind: "graph",
    schema: [
      { file: "src/ir/types.ts", symbol: "CanonModel", role: "the canonical shape of one purposeful model" },
      { file: "src/ir/types.ts", symbol: "CanonRelation", role: "one typed edge, carrying the model that asserts it" },
      { file: "src/ir/types.ts", symbol: "CanonRelationType", role: "the declared relation vocabulary, with absence and composition semantics" },
      { file: "mage-model.schema.json", symbol: "\"models\"", role: "the authored form, in the published wire schema" },
      { file: "SEMANTICS.md", symbol: "## 3. Graphs: entities and typed relations", role: "normative semantics" },
    ],
    propertyFamilies: GRAPH_FORMS,
    omits: [
      "what behaviour can occur over time, or in what order",
      "what an execution costs in time, memory or money",
    ],
    combineWith: {
      partner: "quantitative-model",
      richerQuestion: "Can restricted data reach a service, and what does carrying it there cost?",
    },
    presentIn: (s) => s.models.size > 0,
    wouldLicense:
      "declare a model under `models:` with its purpose and relations; the structural query forms " +
      "read the typed edges it asserts.",
  },
  {
    id: "state-machine",
    label: "state machine",
    question: "What behaviour can occur over time?",
    queryKind: "behavior",
    schema: [
      { file: "src/ir/types.ts", symbol: "CanonMachine", role: "the canonical shape of one machine" },
      { file: "src/ir/types.ts", symbol: "CanonTransition", role: "one transition, with guards, effects and synchronization" },
      { file: "mage-model.schema.json", symbol: "\"machines\"", role: "the authored form, in the published wire schema" },
      { file: "SEMANTICS.md", symbol: "## 4. State machines", role: "normative semantics" },
    ],
    propertyFamilies: BEHAVIOR_FORMS,
    omits: [
      "how long an execution takes, or what it costs",
      "which services are connected to which, outside the states it steps",
    ],
    combineWith: {
      partner: "quantitative-model",
      richerQuestion: "Can a document reach Published within the declared latency ceiling?",
    },
    presentIn: (s) => s.machines.size > 0,
    wouldLicense:
      "declare a machine under `machines:` with its states, initial state and transitions; " +
      "behavioural questions are answered over the configuration space those declarations span.",
  },
  {
    id: "quantitative-model",
    label: "quantitative model",
    question: "What does an execution cost?",
    queryKind: "quantity",
    schema: [
      { file: "src/ir/types.ts", symbol: "CanonQuantity", role: "the canonical shape of one quantitative annotation" },
      { file: "src/ir/types.ts", symbol: "CanonAccounting", role: "the declared accounting model — how a quantity reaches an analysis" },
      { file: "src/ir/types.ts", symbol: "DIMENSIONS", role: "the closed dimension table quantities normalize against" },
      { file: "mage-model.schema.json", symbol: "\"quantities\"", role: "the authored form, in the published wire schema" },
      { file: "SEMANTICS.md", symbol: "### 5.2 Quantities annotate the model; they are not part of it", role: "normative semantics" },
    ],
    propertyFamilies: REQUIREMENT_METRICS,
    omits: [
      "which executions are possible at all — that is the state machine's claim",
      "what is connected to what — that is a structural model's claim",
    ],
    combineWith: {
      partner: "state-machine",
      richerQuestion: "Which reachable execution attains the worst-case latency, and does it stay under the ceiling?",
    },
    presentIn: (s) => s.quantities.size > 0,
    wouldLicense:
      "declare quantities under `quantities:` (each with a dimension and a target) and an " +
      "`accounting:` basis for path-aggregated metrics; the quantity metrics are computed from " +
      "those declarations and from nothing else.",
  },
];

const BY_KIND: ReadonlyMap<Query["kind"], ModelType> =
  new Map(MODEL_TYPES.map((t) => [t.queryKind, t]));

/**
 * The type a query kind interrogates.
 *
 * Total over `Query["kind"]` because the registry covers every kind — a registry test holds that
 * 1:1, and the published query schema's own `kind` enum is compared against it, so a fourth kind
 * cannot land in the wire format without landing here first.
 */
export function modelTypeForQueryKind(kind: Query["kind"]): ModelType {
  const t = BY_KIND.get(kind);
  if (t === undefined) {
    // Unreachable while the registry test holds; the throw is for the day someone widens the
    // union without registering the type, when a loud failure beats a silently unguarded dispatch.
    throw new Error(`no registered model type answers query kind '${kind}'`);
  }
  return t;
}

/**
 * The substrate-absence refusal, worded from the registry.
 *
 * The sentence has the same anatomy as the purposeful-omission refusal (`src/engine/omission.ts`):
 * what is absent, why that is a decision surface rather than a tooling failure, and the authoring
 * move that would change the answer. It is the sentence the Learn requirement's NOT ANSWERABLE
 * sketch asks for — "your current models do not represent X; you may need a <type>" — and it is
 * generated here so a Learn page and the refusal can only ever describe the same capability.
 */
export function absentSubstrateProse(t: ModelType): string {
  return (
    `this system declares no ${t.label}, and a '${t.queryKind}' question is answered over one — ` +
    `it asks "${t.question}", which only a ${t.label} represents. To make it answerable, ` +
    t.wouldLicense
  );
}

/**
 * The rung itself, as a verdict: the refusal a question of this kind earns over a system declaring
 * no substrate of its type, or `null` when the substrate is there.
 *
 * Extracted on the SECOND engine consumer rather than the third. `runTypedQuery` reached the rung
 * first and `runPastTimeQuery` bypassed it entirely, and the tempting fix was four lines copied into
 * the second entry point. Those four lines carry the refusal CAUSE as well as the sentence — the
 * `missing-model-type` detail an agent reads and `src/app/learn.ts` resolves to a Learn section — so
 * a copy would put the cause in two places while the prose stayed generated from one. The seam's own
 * constructor (`absentModelType`, `src/sparql/refusal.ts`) is shaped the same way and for the same
 * reason: refusal-or-null, one per interface, each wording nothing itself.
 */
export function absentSubstrateVerdict(
  system: CanonicalSystem, kind: Query["kind"], hash: string,
): Verdict | null {
  const t = modelTypeForQueryKind(kind);
  return t.presentIn(system)
    ? null
    : unlicensed(hash, absentSubstrateProse(t), null, detail("missing-model-type", [t.label], []));
}
