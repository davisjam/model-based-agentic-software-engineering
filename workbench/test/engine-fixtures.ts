// Shared fixtures for the engine tests. Not a test file itself -- `node --test "test/*.test.ts"`
// does not pick it up, and `tsc` covers the whole `test` directory either way.
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";

/** The worked example. Exercises T1 through T3, a guard, nondeterminism and a V7 refusal case. */
export const docable = (): CanonicalSystem =>
  canonicalize(parse(readFileSync("examples/docable.mage.yaml", "utf8")));

export const savedQuery = (system: CanonicalSystem, id: string): unknown => {
  const q = system.queries.get(id);
  if (q === undefined) throw new Error(`fixture drift: docable declares no query '${id}'`);
  return q.raw;
};

/** Build a system from a plain object, through the real canonicalizer rather than a hand-built IR. */
export const build = (doc: Record<string, unknown>): CanonicalSystem =>
  canonicalize({ mage: 1, system: { id: "t" }, ...doc });

/**
 * A two-state machine with one bounded counter and an unguarded increment.
 *
 * The increment saturates: from `n = 1` it would produce 2, outside `[0, 1]`. That makes this the
 * fixture for "the step is skipped and the fact is disclosed", and for "a loop over a strictly
 * advancing bounded variable is not a repeatable cycle".
 */
export const saturating = (): CanonicalSystem => build({
  machines: {
    m: {
      initial: "s",
      states: { s: null },
      variables: { n: { type: "integer", range: [0, 1], initial: 0 } },
      transitions: [{ from: "s", to: "s", label: "bump", effects: { n: "n + 1" } }],
    },
  },
});
