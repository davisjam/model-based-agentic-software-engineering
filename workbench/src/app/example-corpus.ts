/**
 * The tracked example corpus: the shipped library plus the test-fixture corpus, and the ONE
 * resolver that says where an example's files live.
 *
 * ## Two populations, one ruling
 *
 * The author's 261006 ruling — "You can keep test cases but not expose them to students" — split
 * what used to be one directory into two populations:
 *
 *   - the SHIPPED LIBRARY (`SHIPPED_EXAMPLES` in `examples.ts`): exactly three, under
 *     `examples/`, the only ids any student-facing surface offers or loads;
 *   - the FIXTURE CORPUS (below): the seven former examples, byte-identical under
 *     `test/fixtures/examples/`, keeping every behavioural pin the suite holds against them.
 *
 * ## Why this module exists, and why it is browser-safe
 *
 * The suite's corpus seam (`scripts/gen-example-coverage.ts`) and the Learn page both need the
 * fixture list and the path resolver — the suite to keep loading the fixtures without ceremony,
 * Learn because its walkthrough still TEACHES with the fixture corpus (a declared transitional
 * state: the walkthrough's groundings — budgets, modifications, quantity traces — live in the rich
 * former examples, and retargeting those lessons onto the new library is its own authored work).
 * Learn runs in the browser, so the shared declaration can import nothing node-only; it lives here,
 * beside the shipped declaration, with no `node:` imports.
 *
 * `ExampleCatalog` deliberately does NOT consult this module: the app's loadable set is the
 * shipped library and nothing else.
 */
import { SHIPPED_EXAMPLE_IDS } from "./examples.ts";
import type { ShippedExampleId } from "./examples.ts";

export const FIXTURE_EXAMPLE_IDS = [
  "message-bus",
  "transaction-workspace",
  "document-processing",
  "worker-queue",
  "embedded-sensor-node",
  "autonomous-delivery",
  "calibration-loop",
] as const;

export type FixtureExampleId = (typeof FIXTURE_EXAMPLE_IDS)[number];

export type ExampleId = ShippedExampleId | FixtureExampleId;

/** The tracked corpus the suite sweeps: shipped first (so derived exemplars prefer the library). */
export const EXAMPLE_IDS: readonly ExampleId[] = [...SHIPPED_EXAMPLE_IDS, ...FIXTURE_EXAMPLE_IDS];

/**
 * Where an example's files live: shipped ids under the student-facing `examples/` tree, fixture
 * ids under the suite's `test/fixtures/examples/` tree. Loud on an unknown id — a silent fallback
 * path would read the wrong population and report its absence as a finding about the example.
 */
export function exampleDir(id: string): string {
  if ((SHIPPED_EXAMPLE_IDS as readonly string[]).includes(id)) return `examples/${id}`;
  if ((FIXTURE_EXAMPLE_IDS as readonly string[]).includes(id)) return `test/fixtures/examples/${id}`;
  throw new Error(
    `'${id}' is neither a shipped example nor a test fixture; the corpus is ${EXAMPLE_IDS.join(", ")}`);
}
