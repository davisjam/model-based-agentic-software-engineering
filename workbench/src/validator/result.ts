/**
 * What `validate(model)` returns, and who decided it.
 *
 * `DECISIONS-RULED-model-query-261002.md` Extension 2 obliges three operations per model type, of
 * which this is the first: *is this model well formed according to its model type?* The ruling also
 * fixes what the answer must carry — "the violated rule, the affected model elements, severity, and
 * supporting evidence sufficient for either a human or an agent to inspect and repair the problem"
 * — so a verdict alone fails it. Every field below is a field an agent can act on:
 *
 *  - `rule` is the identifier SEMANTICS.md, `rules.ts`, `validate.py` and the message a person reads
 *    all cite, so it joins the finding to the specification rather than describing it again.
 *  - `severity` comes from a table this module closes over the emitted rule ids, so a reader decides
 *    whether a finding blocks without reading its sentence.
 *  - `subjects` are the model ids the finding is ABOUT, written by the rung that fired. An agent
 *    selects by id — `transact` on exactly those objects — rather than recovering names from prose.
 *    A dangling reference contributes the name AS WRITTEN alongside the object that makes it: the
 *    unresolved name is the thing to repair, so omitting it would leave the one id a reader needs
 *    reachable only through the sentence.
 *  - `spec` is the section of SEMANTICS.md that states the rule, so "what does this rule mean" is a
 *    lookup rather than a search.
 *
 * `where` stays what it was: the dotted address of the SITE to edit. `subjects` and `where` answer
 * different questions — V5 is reported at the claiming entity and is about the child it claims — and
 * collapsing them would send an agent to repair the wrong object.
 */
import type { Finding } from "../ir/types.ts";

/**
 * Every rule id the validator emits. Closed, and the compiler holds it closed: `Collector.add`
 * accepts only these, so the two tables below are total by construction rather than by a test.
 *
 * Deliberately NOT every id that can appear in a `Finding`. `SCHEMA`, `SYNTAX`, `TRANSACTION` and
 * `HYPOTHESIS` are emitted by the loader, the transaction engine and the facade; they are not
 * model-well-formedness rules and `validate(model)` does not raise them.
 */
export type ValidationRule =
  | "V1" | "V3" | "V4" | "V5" | "V6" | "V8" | "V9" | "V10" | "V11" | "V12" | "V13" | "V14"
  | "V17" | "V19" | "V24" | "V25" | "V26"
  | "V27" | "V28" | "V29" | "V30" | "V31" | "V35" | "V36" | "V37" | "V38" | "V39"
  | "ANNOTATION";

export type Severity = "error" | "warning";

/**
 * Rule → severity. A mapped type over the union, so adding a rule to `ValidationRule` without a
 * severity is a compile error — MQ-I9's totality held by the compiler rather than by a corpus sweep.
 * The corpus sweep stays as the net under a cast (`test/validate-operation.test.ts`).
 *
 * Every rule is `error` today, and the vocabulary exists anyway for the reason §G4 gives: the ruling
 * names severity as a required element of the result, and adding the field on the first advisory
 * rule would be a wire change to a published shape. `ANNOTATION` is the one that invites a `warning`
 * — A1 holds annotation outside semantics — and it stays `error` because the finding reports TEXT
 * THAT WAS LOST: the note the author wrote is not the note the file holds, which is the same class
 * as V25 and not an advisory note about style.
 */
export const SEVERITY: { readonly [R in ValidationRule]: Severity } = {
  V1: "error", V3: "error", V4: "error", V5: "error", V6: "error", V8: "error", V9: "error",
  V10: "error", V11: "error", V12: "error", V13: "error", V14: "error", V17: "error",
  V19: "error", V24: "error", V25: "error", V26: "error",
  V27: "error", V28: "error", V29: "error", V30: "error", V31: "error", V35: "error",
  V36: "error", V37: "error", V38: "error", V39: "error",
  ANNOTATION: "error",
};

/**
 * Rule → the SEMANTICS.md section that states it. Total by the same mapped type.
 *
 * The strings are headings, verbatim, and `test/validate-operation.test.ts` reads SEMANTICS.md and
 * holds them to it: the section must exist as a heading, and the rule must be mentioned under that
 * heading (or in a line citing it by number, which is how the `ANNOTATION` id is introduced). So a
 * renamed heading or a rule filed under the wrong subject turns the gate red. What the test does NOT
 * claim is that the mention is the rule's NORMATIVE statement — it is a join by identifier, which is
 * the same control that makes the Python/TypeScript parity test meaningful.
 */
export const SPEC_SECTION: { readonly [R in ValidationRule]: string } = {
  V1: "## 1. The governing principle: complexity is opt-in",
  V3: "## 2. Identity",
  V4: "## 2. Identity",
  V5: "## 2. Identity",
  V6: "## 2. Identity",
  V8: "### 3.1 Path composition is declared, not assumed",
  V9: "## 4. State machines",
  V10: "## 4. State machines",
  V11: "### 4.1 Guards",
  V12: "### 4.3 T3 — declared synchronized events",
  V13: "### 4.3 T3 — declared synchronized events",
  V14: "### 4.4 T4 — multiplicity, and what it deliberately does not give you",
  V17: "## 5. State: three categories with a hard boundary",
  V19: "## 5. State: three categories with a hard boundary",
  V24: "## 8. Purpose: what a model represents, and what it declines to",
  V25: "### 10.1 YAML implicit typing is a correctness hazard, not a style issue",
  V26: "### 4.1 Guards",
  V27: "### 5.2 Quantities annotate the model; they are not part of it",
  V28: "### 5.2 Quantities annotate the model; they are not part of it",
  V29: "### 5.2 Quantities annotate the model; they are not part of it",
  V30: "### 5.2 Quantities annotate the model; they are not part of it",
  V31: "### 5.2 Quantities annotate the model; they are not part of it",
  V35: "### 5.3 The accounting model is declared, and MAGE refuses to guess",
  V36: "### 5.3 The accounting model is declared, and MAGE refuses to guess",
  V37: "### 5.3 The accounting model is declared, and MAGE refuses to guess",
  V38: "### 5.3 The accounting model is declared, and MAGE refuses to guess",
  V39: "### 5.3 The accounting model is declared, and MAGE refuses to guess",
  ANNOTATION: "### 5.1 Annotation is carried, not interpreted",
};

/**
 * A finding as the rungs write it: the wire three fields, plus the ids the rung was looking at.
 *
 * `subjects` is REQUIRED, and that is the decision rather than an inconvenience. An optional field
 * would let a rung that never considered its subjects look exactly like one that considered them and
 * found none — the distinction M1 learned to force with a total classification (§12(3)). An empty
 * array is now a statement: this finding is about a site, not about named objects.
 */
export interface SubjectedFinding extends Finding {
  readonly rule: ValidationRule;
  readonly subjects: readonly string[];
}

/** One violated rule, with everything needed to repair it. */
export interface ValidationFinding extends SubjectedFinding {
  readonly severity: Severity;
  /** The SEMANTICS.md section that states this rule. Derived from `rule`, never authored per site. */
  readonly spec: string;
}

/**
 * Which implementation decided a result, carried BY the result.
 *
 * The ruling: *"A `validate(model)` operation must say which implementation is authoritative for its
 * result, or the parity discipline silently acquires a third party."* It says so here, in the value
 * an agent is handed, rather than in a document the agent cannot read — and this constant is the ONE
 * place the answer is written, so moving authority is one edit and not a sweep of call sites.
 *
 * **PROVISIONAL.** `DESIGN-model-query-261002.md` §G3 recommends this split and the author has not
 * ruled it. `ratified: false` says so in the value; it flips when §G3 is ruled.
 */
export interface ValidationAuthority {
  /** The implementation whose answer this result IS. */
  readonly implementation: string;
  /** The independent second implementation, and the control that holds the two together. */
  readonly crossCheckedBy: string;
  /** Fields this implementation emits that the cross-check does not yet compare. */
  readonly outsideCrossCheck: readonly string[];
  /** False while §G3 is unratified. A reader can tell a recommendation from a ruling. */
  readonly ratified: boolean;
  readonly declaredBy: string;
}

export const VALIDATION_AUTHORITY: ValidationAuthority = {
  implementation: "src/validator/rules.ts",
  crossCheckedBy: "workbench/validate.py, held to it by test/parity.test.ts (PARITY / ASYMMETRIC)",
  // §6.3's rule for keeping parity TWO-party: an enrichment enters the compared surface when
  // validate.py implements it too. Until then it is named here rather than quietly uncompared.
  outsideCrossCheck: ["severity", "subjects", "spec"],
  ratified: false,
  declaredBy: "DESIGN-model-query-261002.md §G3 — recommended, not ruled",
};

/**
 * The operation's answer.
 *
 * `hash` is the revision the answer describes, the same contract `QueryResult.systemHash` carries: a
 * caller must never present a verdict for revision N as though it described N+1.
 */
export interface ValidationResult {
  /** No error-severity finding. Derived from `findings`, never stored. */
  readonly ok: boolean;
  readonly hash: string;
  readonly authority: ValidationAuthority;
  readonly findings: readonly ValidationFinding[];
}

/** Rule id → the enriched finding. The derivation, in one place, for every rung. */
export const enrich = (f: SubjectedFinding): ValidationFinding => ({
  ...f, severity: SEVERITY[f.rule], spec: SPEC_SECTION[f.rule],
});

/** `ok`, derived. A warning is a finding and not a failure. */
export const wellFormed = (findings: readonly ValidationFinding[]): boolean =>
  findings.every((f) => f.severity !== "error");
