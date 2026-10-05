/**
 * The shipped examples' REQUIREMENTS and MODIFICATIONS, read strictly from their own fixtures.
 *
 * ## Why this is a derivation source and not a second copy of one
 *
 * `src/app/examples.ts:12-29` already settled the question this module reopens: `title`, `summary`
 * and the `suggested` flag are read out of `examples/<id>/expected-results.yaml` rather than
 * restated in TypeScript, because *"every one of those facts already exists in the shipped example.
 * Writing them again here would create a blurb free to drift from the thing it describes."* The same
 * file carries two more blocks, and the Learn page needs exactly them:
 *
 *   - **`requirements:`** — `statement`, `expressed_as`, `satisfied_when`, `status`. This is the
 *     polarity discipline the guidance's §11 teaches: the breach query is positive and existential,
 *     the requirement expresses the prohibition and is satisfied when that query is refuted. Both
 *     polarities ship — `satisfied_when: refuted` for a breach query, `satisfied_when: holds` for a
 *     safety one — so the page can show the RULE rather than one instance of it.
 *   - **`modifications:`** — a transaction and a `changes: [{query, from, to}]` list. This is §10's
 *     before/after: the model changed, the query did not.
 *
 * **Both blocks are CI-verified, which is what makes reading them honest.**
 * `test/examples.test.ts` drives every modification through the real hypothesis seam and asserts
 * each change's `from` AND `to` against the live engine, then asserts the discard restores both the
 * hash and the bytes. The requirements block carries its own join assertion. So a figure read here
 * is a figure a gate re-derives, which is the property `readPresentation` relies on too.
 *
 * ## What is NOT read here
 *
 * The `queries:` block's per-query `expected` outcomes. The Learn page computes those by running the
 * question, which is strictly stronger than quoting them — a page that quoted an expected outcome
 * would go on saying `holds` after the engine stopped producing it, and the whole point of §10 is
 * that a verdict is recomputed rather than stored (`src/app/properties.ts:28-34`). What the page
 * reads from a fixture is only what it cannot compute: the author's requirement STATEMENT, and the
 * outcome a modification would produce under a what-if branch this page does not open.
 *
 * ## Strict, for the reason `readPresentation` is strict
 *
 * A defaulted field renders a section that asserts nothing and still looks finished. Every read
 * below throws `ExampleMetadataError` naming the file and the path, so a malformed fixture is a
 * loud failure at derivation time rather than an empty table.
 */
import { parse } from "yaml";
import { ExampleMetadataError, type ShippedExampleId } from "../app/examples.ts";

/** One requirement, as its fixture states it. Field names are the fixture's, camel-cased. */
export interface FixtureRequirement {
  readonly id: string;
  /** The prohibition or obligation in the author's words — normative, never interrogative. */
  readonly statement: string;
  /**
   * The saved query that decides it, or null when no saved query states the question.
   *
   * CORRECTED 261005. This used to read *"null for a quantitative requirement … because the question
   * is composed from the ceiling rather than saved in the system"*, and a quantitative requirement is
   * exactly where that fails: `embedded-sensor-node`'s `firmware-fits-physical-sram` names
   * `expressed_as: sram-fits-budget`, a saved `kind: quantity` question whose `within:` cites the
   * declared budget. `document-processing`'s `successful-processing-within-two-seconds` does the same.
   *
   * So the null does not track the requirement's KIND. It tracks whether a saved question states the
   * question, and two `document-processing` rows are null only because none was written for them —
   * the author's own note calls that a choice about the example's scope, not a missing construct.
   */
  readonly expressedAs: string | null;
  /** The `model:`-targeted quantity declaring the ceiling, for a quantitative requirement. */
  readonly declaredAs: string | null;
  /** The analysis that decides a quantitative requirement, by the fixture's own name for it. */
  readonly decidedBy: string | null;
  /** The query outcome that would mean SATISFIED. Null on a quantitative requirement. */
  readonly satisfiedWhen: string | null;
  /** What the shipped system actually does: `satisfied` or `violated`, as the fixture records it. */
  readonly status: string;
}

/** One answer a modification changes — the fixture's claim, which `test/examples.test.ts` verifies. */
export interface FixtureChange {
  readonly query: string;
  readonly from: string;
  readonly to: string;
}

export interface FixtureModification {
  readonly id: string;
  readonly label: string;
  readonly changes: readonly FixtureChange[];
}

export interface ExampleFixture {
  readonly example: ShippedExampleId;
  readonly requirements: readonly FixtureRequirement[];
  readonly modifications: readonly FixtureModification[];
}

/** Every shipped example's fixture, keyed by id. The page loads these beside the systems. */
export type LoadedFixtures = ReadonlyMap<ShippedExampleId, ExampleFixture>;

export const fixturePathFor = (id: string): string => `examples/${id}/expected-results.yaml`;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function text(v: unknown, where: string): string {
  if (typeof v !== "string" || v.trim() === "") {
    throw new ExampleMetadataError(`${where}: expected a non-empty string`);
  }
  return v.trim();
}

/** An optional string field. Absent and empty are the same thing; a non-string is a broken fixture. */
function optional(v: unknown, where: string): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") throw new ExampleMetadataError(`${where}: expected a string or nothing`);
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

function sequence(v: unknown, where: string): readonly unknown[] {
  if (!Array.isArray(v)) throw new ExampleMetadataError(`${where}: expected a sequence`);
  return v;
}

function readRequirement(raw: unknown, where: string): FixtureRequirement {
  if (!isObject(raw)) throw new ExampleMetadataError(`${where}: expected a mapping`);
  const expressedAs = optional(raw["expressed_as"], `${where}.expressed_as`);
  const declaredAs = optional(raw["declared_as"], `${where}.declared_as`);
  if (expressedAs === null && declaredAs === null) {
    throw new ExampleMetadataError(
      `${where}: names neither 'expressed_as' nor 'declared_as', so nothing decides it`);
  }
  return {
    id: text(raw["id"], `${where}.id`),
    statement: text(raw["statement"], `${where}.statement`),
    expressedAs,
    declaredAs,
    decidedBy: optional(raw["decided_by"], `${where}.decided_by`),
    satisfiedWhen: optional(raw["satisfied_when"], `${where}.satisfied_when`),
    status: text(raw["status"], `${where}.status`),
  };
}

function readModification(raw: unknown, where: string): FixtureModification {
  if (!isObject(raw)) throw new ExampleMetadataError(`${where}: expected a mapping`);
  const changes = sequence(raw["changes"], `${where}.changes`).map((c, i): FixtureChange => {
    const at = `${where}.changes[${i}]`;
    if (!isObject(c)) throw new ExampleMetadataError(`${at}: expected a mapping`);
    return {
      query: text(c["query"], `${at}.query`),
      from: text(c["from"], `${at}.from`),
      to: text(c["to"], `${at}.to`),
    };
  });
  if (changes.length === 0) {
    throw new ExampleMetadataError(`${where}.changes: empty, so the modification demonstrates nothing`);
  }
  return { id: text(raw["id"], `${where}.id`), label: text(raw["label"], `${where}.label`), changes };
}

/**
 * One example's requirements and modifications.
 *
 * Both blocks are required and both must be non-empty, which is not this module being fussy:
 * `test/examples.test.ts:399` already asserts every example declares a useful modification, and
 * `expected-results.yaml`'s own comment cites "section 2: at least one requirement". Accepting an
 * empty block here would let a Learn section render blank against fixtures a gate calls complete.
 */
export function readFixture(example: ShippedExampleId, source: string): ExampleFixture {
  const where = fixturePathFor(example);
  const doc: unknown = parse(source);
  if (!isObject(doc)) throw new ExampleMetadataError(`${where}: expected a mapping`);
  const requirements = sequence(doc["requirements"], `${where}.requirements`)
    .map((r, i) => readRequirement(r, `${where}.requirements[${i}]`));
  const modifications = sequence(doc["modifications"], `${where}.modifications`)
    .map((m, i) => readModification(m, `${where}.modifications[${i}]`));
  if (requirements.length === 0) {
    throw new ExampleMetadataError(`${where}.requirements: empty — section 2 asks for at least one`);
  }
  if (modifications.length === 0) {
    throw new ExampleMetadataError(`${where}.modifications: empty — section 2 asks for a useful one`);
  }
  return { example, requirements, modifications };
}
