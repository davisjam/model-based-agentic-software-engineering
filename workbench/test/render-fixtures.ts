/**
 * Shared fixtures for the renderer tests. Not a test file — `npm test` globs `test/*.test.ts`.
 *
 * The engine (Phase C) is landing in parallel, so these build `Evidence` by hand against the
 * kernel's published shape. ONE assumption is encoded here and should be confirmed when Phase C
 * lands: for a lasso, `cycle` is the repeating SUFFIX of `steps`, not a separate list appended
 * after them. `Evidence.cycle`'s doc comment in `src/ir/types.ts` says "the repeating suffix",
 * which is what `describeEvidence` relies on to compute where the cycle begins.
 */
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import type { CanonicalSystem, Coverage, Evidence, EvidenceStep, StepConfiguration } from "../src/ir/types.ts";

export const docableSystem = (): CanonicalSystem =>
  canonicalize(parse(readFileSync("examples/docable.mage.yaml", "utf8")));

export const cfg = (document: string, worker: string, retry: number): StepConfiguration => ({
  control: { document, worker },
  values: { "document.retry_count": retry },
});

export const step = (
  from: StepConfiguration,
  to: StepConfiguration,
  instances: readonly string[],
  sync: string | null,
  label: string | null,
): EvidenceStep => ({ instances, sync, label, from, to });

export const EXHAUSTIVE: Coverage = { kind: "exhaustive", statesExplored: 24, reason: null };
export const BOUNDED: Coverage = { kind: "bounded", statesExplored: 1000, reason: "state-limit" };

/** waiting -> processing (synchronized `acquire`) -> reviewed -> published. */
export function publishTrace(): Evidence {
  const a = cfg("waiting", "idle", 0);
  const b = cfg("processing", "held", 0);
  const c = cfg("reviewed", "held", 0);
  const d = cfg("published", "held", 0);
  return {
    shape: "trace",
    role: "witness",
    steps: [
      step(a, b, ["document", "worker"], "acquire", null),
      step(b, c, ["document"], null, "review"),
      step(c, d, ["document"], null, "publish"),
    ],
    cycle: null,
    nodes: null,
  };
}

/** A prefix into `failed`, then the repeating retry cycle back through `waiting`. */
export function retryLasso(): Evidence {
  const a = cfg("waiting", "idle", 0);
  const b = cfg("processing", "held", 0);
  const c = cfg("failed", "held", 0);
  const d = cfg("waiting", "held", 1);
  const cycleStep = step(c, d, ["document"], null, "retry");
  return {
    shape: "lasso",
    role: "witness",
    steps: [step(a, b, ["document", "worker"], "acquire", null), step(b, c, ["document"], null, "fail"), cycleStep],
    cycle: [cycleStep],
    nodes: null,
  };
}

/** A counterexample on the entity graph: restricted content reaching a public-only service. */
export function flowCounterexample(): Evidence {
  return {
    shape: "path",
    role: "counterexample",
    steps: [],
    cycle: null,
    nodes: ["api", "remediation", "gateway"],
  };
}
