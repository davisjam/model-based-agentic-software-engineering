// The UX-I1 affordance-parity gate, as a command: `npm run check:parity`.
//
// WHY A SCRIPT AND NOT A STEP. This gate used to exist twice — once in `test/capabilities.test.ts`
// against a recorded baseline, once as an inline `node --eval` in the publishing workflow asserting
// zero. The two thresholds disagreed, and the one nobody could run locally is the one that failed the
// push. A named script is the join: the workflow invokes it, the default gate invokes it, and the
// threshold sits in `src/app/capabilities.ts` where the compiler holds it.
//
// It stays a SEPARATE command rather than folding into `npm test` for the reason the workflow step
// gave when it was still a `node --eval`: the unit suite asserts this among seven hundred other
// things, and a failure here names the invariant in the step title and prints the one-sided
// capabilities. That benefit was never the second threshold — it was the isolation, and isolation
// survives the unification.
import { affordanceParityGate } from "../src/app/capabilities.ts";

const verdict = affordanceParityGate();
console.log(verdict.headline);
for (const v of verdict.violations) console.error(`  ${v.capability}: ${v.problem}`);
if (!verdict.passed) {
  console.error(
    "A one-sided capability means an agent can change the model in a way no person can see or "
    + "reverse (requirements-human-ux section 22). Wire the missing affordance, or declare the gap "
    + "in the registry and say what it is waiting on.",
  );
}
process.exitCode = verdict.passed ? 0 : 1;
