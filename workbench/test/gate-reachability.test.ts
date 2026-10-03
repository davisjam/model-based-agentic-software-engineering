// Every gate script is reached by the runner that should run it, or its exclusion is declared.
//
// THE FAILURE CLASS: a gate exists and the path that is supposed to run it does not reach it. The
// gate is fine; the wiring is not. It fails silently, which is what makes it expensive — the runner
// exits 0, the agent reports green, and nothing checked the thing.
//
// Three instances in one session, each patched at the instance:
//   1. `npm run all` was `check && test && build`, reaching neither the browser tier nor the a11y
//      tier. A wave restructured the UI, broke four a11y assertions, ran the default gate, saw
//      green, and reported "tsc and build clean" — true of the node tier and of nothing else. A
//      duplicate-landmark defect reached main. Patched by appending `test:smoke` to `all`.
//   2. CI ran this suite before installing the Python it shells out to. `test/parity.test.ts` holds
//      the TypeScript rule set against `validate.py` by invoking it, and `validate.py` exits 2 when
//      PyYAML is absent. The published build failed. Patched by moving the install into the step
//      that needs it, and held by the sibling check in the repo's own suite — `tests/ci.py`, whose
//      subject is the workflow rather than this package.
//   3. The smoke tier was added to `all` when it landed and not to the publishing workflow. It is
//      the only gate that loads `learn.html` as a page, so a Learn gallery rendering an empty card
//      list would have passed everything else in the pipeline. Patched by adding the CI step.
//
// Instances 1 and 3 are the same defect against two different runners, which is why this check
// walks TWO AXES rather than one:
//   - the DEFAULT GATE axis — `npm run all`, what a developer or agent runs before reporting;
//   - the PUBLISHING axis — the Pages workflow, what runs before anything ships.
// A gate missing from the first lets an agent report green over an unrun check. A gate missing from
// the second lets a defect reach the published site. Neither axis implies the other, and holding
// only one would have missed one of the two instances.
//
// DECLARED EXCLUSIONS, not mandatory coverage. The browser and a11y tiers are out of `all` for a
// measured reason: 10.5s and 36.3s against 9.9s for the whole node tier, and both need a Chromium
// resolved from `book/node_modules` that this package deliberately does not depend on. A fresh
// worktree has no such tree — measured 261003, where the smoke tier failed on a missing module
// until that directory was linked. So the default gate would break for everyone who had not
// installed it, which teaches people to stop running the default gate. A reason is not the problem.
// An UNDECLARED reason is: from `scripts` alone, the two excluded tiers and the one forgotten tier
// looked identical.
//
// WHY IT IS SHAPED THIS WAY:
//   - The gate set is DERIVED from `scripts`, never listed. A literal list here would be a second
//     copy of `package.json` — the sibling failure `test/derived-values.test.ts` polices — and it
//     would go stale in exactly the way that lets a new `test:*` script escape. Adding `test:perf`
//     and wiring it nowhere fails this check by construction.
//   - Reachability follows the `npm run X` chain instead of matching `all`'s text, so `all` is free
//     to grow an intermediate script; what matters is that the walk arrives.
//   - An exemption carries EVIDENCE — a literal command the named file must contain — so it reads as
//     a cross-file assertion rather than a comment. `check` is exempt on the publishing axis because
//     CI runs `npx tsc --noEmit` directly: the same work under a different spelling, which a
//     name-matching rule would have called a violation. Its evidence is that command, so deleting
//     the typecheck from CI fails here even though no script name changed.
//   - A stale exemption is a violation too. An entry for a gate that is now reached, or for a script
//     that no longer exists, claims a decision was made about something nobody looked at.
//
// WHAT IT DOES NOT COVER, stated so nobody rediscovers it as a surprise. It checks INVOCATION, not
// RUNNABILITY — instance 2 was a gate the runner reached and could not execute, and no part of this
// file would have caught it (`tests/ci.py` does). And it reads the default gate and the publishing
// workflow, not every runner: `hooks/pre-push` re-enumerates `check`, `test` and `build` by hand and
// therefore does not reach `test:smoke` today, the same class one level up. Adding pre-push as a
// third axis would go red at HEAD, and the repo's rule is drain-then-promote, so it is reported to
// that hook's owner instead of asserted here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

/** The script the default gate hangs from. `npm run <this>` is what an agent is told to run. */
const ROOT_GATE = "all";

/** The publishing runner: nothing reaches the site without passing through it. */
const PUBLISH_RUNNER = ".github/workflows/pages.yml";

/**
 * A declared exclusion from one axis: why that runner does not reach this gate, and the literal
 * command proving something still does.
 */
interface Exemption {
  /** Repo-root-relative path of the file that carries the evidence. */
  readonly evidenceIn: string;
  /** A command that file must contain. Checked, so the claim cannot rot into a comment. */
  readonly evidence: string;
  readonly reason: string;
}

/**
 * Gates the DEFAULT gate deliberately does not reach.
 *
 * Both need Puppeteer and a bundled Chromium resolved from `book/node_modules`, which this package
 * does not and will not depend on: `workbench/node_modules` is a symlink shared across parallel
 * agent worktrees, so an install here mutates trees this package does not own.
 */
const EXEMPT_FROM_ALL: Readonly<Record<string, Exemption>> = {
  "test:browser": {
    evidenceIn: PUBLISH_RUNNER,
    evidence: "npm run test:browser",
    reason: "10.5s measured 261003, and needs Puppeteer + Chromium resolved from book/node_modules, "
      + "which this package deliberately does not depend on and a fresh worktree does not have. Runs "
      + "unconditionally in CI, which installs that tree and hard-asserts a receipt, so a glob "
      + "matching no file cannot pass for the wrong reason.",
  },
  "test:a11y": {
    evidenceIn: PUBLISH_RUNNER,
    evidence: "npm run test:a11y",
    reason: "36.3s measured 261003 — four axe passes plus thirteen keyboard operations — and needs "
      + "both the book/ Chromium and axe-core from the repo-root node_modules. Runs unconditionally "
      + "in CI with receipt assertions on both suites.",
  },
};

/**
 * Gates the PUBLISHING runner does not invoke by name.
 *
 * One entry, and it is the case a naive name-matching rule gets wrong in both directions: CI runs
 * the typecheck as `npx tsc --noEmit` rather than `npm run check`. Matching names would flag it
 * while passing a workflow that named a script whose body had been gutted, so the evidence is the
 * command, not the name.
 */
const EXEMPT_FROM_PUBLISH: Readonly<Record<string, Exemption>> = {
  check: {
    evidenceIn: PUBLISH_RUNNER,
    evidence: "npx tsc --noEmit",
    reason: "CI runs the typecheck directly rather than through the script — the same work under a "
      + "different spelling, ordered deliberately before the bundle build so a type error reports "
      + "ahead of a bundler error. The evidence below is that command, so dropping the typecheck from "
      + "CI fails this check even though no script name moved.",
  },
};

/**
 * A reason floor, for the cause stated in `test/derived-values.test.ts`: an unjustified declaration
 * is how a control becomes decoration. "too slow" is a note; a cost, a dependency or a constraint is
 * a decision someone else can review.
 */
const MIN_REASON = 40;

/**
 * True for a script that produces a VERDICT — the ones a green report is implicitly a claim about.
 *
 * A predicate, not a list, so a new `test:*` script joins the policed set by existing. `types`,
 * `build` and `affordances` produce artifacts instead of verdicts; `build` is reachable from the
 * root gate anyway, and `check` and `test` are named because that is what this package calls its
 * typecheck and its unit tier.
 */
const isGate = (name: string): boolean =>
  name === "check" || name === "test" || name.startsWith("test:");

/**
 * Script names a command invokes.
 *
 * `npm run X`, `npm run-script X`, and the `npm test` shorthand that CI and `hooks/pre-push` both
 * use. Flags trailing the name are ignored; `--silent` is not a script.
 */
const invokedBy = (command: string): readonly string[] => {
  const names = [...command.matchAll(/\bnpm\s+run(?:-script)?\s+([A-Za-z0-9:_@.-]+)/g)]
    .map((m) => m[1] ?? "");
  if (/\bnpm\s+test\b/.test(command)) names.push("test");
  return names.filter((n) => n.length > 0);
};

/** Every script the root gate arrives at, following the chain. */
const reachableFrom = (scripts: Readonly<Record<string, string>>, root: string): ReadonlySet<string> => {
  const seen = new Set<string>();
  const queue = [root];
  while (queue.length > 0) {
    const name = queue.pop();
    if (name === undefined || seen.has(name)) continue;
    seen.add(name);
    for (const next of invokedBy(scripts[name] ?? "")) queue.push(next);
  }
  seen.delete(root);
  return seen;
};

/** One axis of the audit: a runner, the gates it reaches, and the exemptions declared against it. */
interface Axis {
  /** How the message names the runner. */
  readonly runner: string;
  readonly reached: ReadonlySet<string>;
  readonly exemptions: Readonly<Record<string, Exemption>>;
  /** What to do about an unreached, undeclared gate. */
  readonly remedy: string;
}

function auditAxis(
  gates: readonly string[],
  axis: Axis,
  readFile: (path: string) => string | null,
): readonly string[] {
  const issues: string[] = [];
  for (const name of gates) {
    const exemption = axis.exemptions[name];
    if (axis.reached.has(name)) {
      if (exemption !== undefined) {
        issues.push(`\`${name}\` is exempted from ${axis.runner}, which reaches it. Delete the `
          + `exemption — a declaration that something is excluded, when it is not, misdescribes the gate.`);
      }
      continue;
    }
    if (exemption === undefined) {
      issues.push(`\`${name}\` is a gate and ${axis.runner} does not reach it. ${axis.remedy} An `
        + `excluded gate and a forgotten gate are indistinguishable from \`scripts\` alone, which is how `
        + `the a11y tier sat unrun while a wave reported a clean gate, and how the smoke tier shipped `
        + `pages the day it landed.`);
      continue;
    }
    if (exemption.reason.trim().length < MIN_REASON) {
      issues.push(`\`${name}\` is exempted from ${axis.runner} with a `
        + `${exemption.reason.trim().length}-character reason; at least ${MIN_REASON} are required. State `
        + `the cost, the dependency, or the constraint.`);
    }
    const text = readFile(exemption.evidenceIn);
    if (text === null) {
      issues.push(`\`${name}\` is exempted from ${axis.runner} on the evidence of `
        + `\`${exemption.evidenceIn}\`, which does not exist. The exemption's whole claim is that `
        + `something else covers the gate.`);
      continue;
    }
    if (!text.includes(exemption.evidence)) {
      issues.push(`\`${name}\` is exempted from ${axis.runner} on the evidence that `
        + `\`${exemption.evidenceIn}\` runs \`${exemption.evidence}\`, and it does not. Either that file `
        + `dropped the step or the exemption names the wrong command; either way nothing covers this gate.`);
    }
  }
  for (const name of Object.keys(axis.exemptions).sort()) {
    if (!gates.includes(name)) {
      issues.push(`the ${axis.runner} exemptions name \`${name}\`, which is not a gate in `
        + `package.json. A declaration about a script that does not exist outlives its subject.`);
    }
  }
  return issues;
}

/**
 * Both axes, over supplied inputs rather than the real ones, so the negative control can drive it
 * with a package that has the defect. `readFile` returns a repo file's text, or null when the path
 * does not exist.
 */
function audit(
  scripts: Readonly<Record<string, string>>,
  exemptFromAll: Readonly<Record<string, Exemption>>,
  exemptFromPublish: Readonly<Record<string, Exemption>>,
  readFile: (path: string) => string | null,
): readonly string[] {
  if (scripts[ROOT_GATE] === undefined) {
    return [`package.json declares no \`${ROOT_GATE}\` script — the default gate is the root of this `
      + `walk, so there is nothing to be reached from`];
  }
  const gates = Object.keys(scripts).filter(isGate).sort();
  const issues: string[] = [];
  if (gates.length === 0) issues.push("no script matches the gate predicate — `isGate` has gone stale");

  const workflow = readFile(PUBLISH_RUNNER);
  if (workflow === null) {
    issues.push(`\`${PUBLISH_RUNNER}\` is missing — the publishing axis cannot be checked, and an `
      + `unreadable runner must never read as a pass`);
  }

  issues.push(...auditAxis(gates, {
    runner: `\`npm run ${ROOT_GATE}\``,
    reached: reachableFrom(scripts, ROOT_GATE),
    exemptions: exemptFromAll,
    remedy: `Wire it into \`${ROOT_GATE}\`, or declare it with the runner that does run it and why this `
      + `one does not.`,
  }, readFile));

  if (workflow !== null) {
    issues.push(...auditAxis(gates, {
      runner: `\`${PUBLISH_RUNNER}\``,
      reached: new Set(invokedBy(workflow)),
      exemptions: exemptFromPublish,
      remedy: "Add a step that runs it, or declare what CI does instead and the command that proves it.",
    }, readFile));
  }
  return issues;
}

interface PackageManifest {
  readonly scripts?: Readonly<Record<string, string>>;
}

/** The real manifest. Tests run with `workbench/` as the cwd. */
const manifestScripts = (): Readonly<Record<string, string>> => {
  const parsed = JSON.parse(readFileSync("package.json", "utf8")) as PackageManifest;
  return parsed.scripts ?? {};
};

/** Repo-root-relative, because a runner is a repo artifact and this package sits one level down. */
const readRepoFile = (path: string): string | null =>
  existsSync(`../${path}`) ? readFileSync(`../${path}`, "utf8") : null;

test("every gate is reached by the default gate and by CI, or its exclusion is declared", () => {
  const scripts = manifestScripts();
  assert.ok(Object.keys(scripts).length > 3,
    `read ${Object.keys(scripts).length} scripts from package.json — the manifest is not being read`);
  const issues = audit(scripts, EXEMPT_FROM_ALL, EXEMPT_FROM_PUBLISH, readRepoFile);
  assert.deepEqual(issues, [], `gate wiring:\n  ${issues.join("\n  ")}\n`);
});

test("the gate predicate still matches this package's gates", () => {
  // The predicate is the whole coverage claim. If a rename moved the typecheck out from under it,
  // the check above would pass by policing nothing.
  const gates = Object.keys(manifestScripts()).filter(isGate);
  assert.ok(gates.includes("check"), "the typecheck is not in the policed set");
  assert.ok(gates.includes("test"), "the unit tier is not in the policed set");
  assert.ok(gates.length >= 3, `only ${gates.length} gate(s) matched; this package has more than that`);
});

test("the check fires on each defect it exists to catch — negative control", () => {
  // A control nobody has watched fail is a control nobody knows works, and this file exists because
  // three gates were wired wrong in one day without anything going red.
  const WF = ".github/workflows/pages.yml";
  const ciRunsEverything = "steps:\n  - run: |\n      npx tsc --noEmit\n      npm test\n"
    + "      npm run test:a11y\n";
  const repo = (text: string) => (path: string): string | null => (path === WF ? text : null);
  const full = repo(ciRunsEverything);
  const tscOnly: Readonly<Record<string, Exemption>> = {
    check: { evidenceIn: WF, evidence: "npx tsc --noEmit", reason: "x".repeat(MIN_REASON) + " direct" },
  };

  // Instance 1, as it actually was: the tier exists, the default gate stops short of it.
  const unwired = {
    check: "tsc --noEmit",
    test: "node --test",
    "test:a11y": "node --test a11y",
    all: "npm run check && npm run test",
  };
  const found = audit(unwired, {}, tscOnly, full);
  assert.equal(found.length, 1, `an unwired gate must be reported, got ${found.length}: ${found.join("; ")}`);
  assert.match(found[0] ?? "", /test:a11y/, "the report must name the script");
  assert.match(found[0] ?? "", /does not reach it/, "the report must say what is wrong");

  // Declaring it is the sanctioned answer, and it clears the check.
  const declared: Readonly<Record<string, Exemption>> = {
    "test:a11y": { evidenceIn: WF, evidence: "npm run test:a11y", reason: "x".repeat(MIN_REASON) + " cost" },
  };
  assert.deepEqual(audit(unwired, declared, tscOnly, full), [],
    "a declared exclusion whose evidence holds must pass");

  // Instance 3: the gate is wired into `all` and the publishing workflow never runs it.
  const wired = { ...unwired, all: "npm run check && npm run test && npm run test:a11y" };
  const ciMissesIt = repo("steps:\n  - run: |\n      npx tsc --noEmit\n      npm test\n");
  const missed = audit(wired, {}, tscOnly, ciMissesIt);
  assert.equal(missed.length, 1, `a gate CI does not run must be reported, got ${missed.length}`);
  assert.match(missed[0] ?? "", /pages\.yml` does not reach it/, "the report must name the publishing runner");

  // Instance 3's own cost, in one sentence: the default gate being green says nothing about the
  // publishing path, so the two axes must be independent.
  assert.deepEqual(audit(unwired, declared, tscOnly, full), [], "the axes are independent");

  // The spelling case: CI runs the typecheck directly. Matching names would flag it...
  assert.match(audit(wired, {}, {}, full)[0] ?? "", /`check` is a gate/,
    "a gate CI runs under another spelling is reported when undeclared");
  // ...and the declaration clears it only while that command is still there.
  const ciWithoutTsc = repo("steps:\n  - run: |\n      npm test\n      npm run test:a11y\n");
  assert.match(audit(wired, {}, tscOnly, ciWithoutTsc)[0] ?? "", /and it does not/,
    "a gutted equivalent must be reported — the evidence is the command, not the name");

  // A declaration whose evidence file does not exist claims coverage that cannot be read.
  const nowhere: Readonly<Record<string, Exemption>> = {
    "test:a11y": { evidenceIn: "gone.yml", evidence: "npm run test:a11y", reason: "x".repeat(MIN_REASON) + " cost" },
  };
  assert.match(audit(unwired, nowhere, tscOnly, full)[0] ?? "", /does not exist/,
    "an evidence path that does not exist must be reported");

  // A thin reason is how an exemption map turns into a list of excuses.
  const terse: Readonly<Record<string, Exemption>> = {
    "test:a11y": { evidenceIn: WF, evidence: "npm run test:a11y", reason: "too slow" },
  };
  assert.match(audit(unwired, terse, tscOnly, full)[0] ?? "", /at least \d+ are required/,
    "a reason under the floor must be reported");

  // A stale declaration, left behind after the gate was wired in properly.
  assert.match(audit(wired, declared, tscOnly, full)[0] ?? "", /is exempted from/,
    "an exemption over a reached gate must be reported");

  // An exemption for a script nobody has: the entry outlived its subject.
  const ghost: Readonly<Record<string, Exemption>> = {
    "test:gone": { evidenceIn: WF, evidence: "npm test", reason: "x".repeat(MIN_REASON) + " gone" },
  };
  assert.match(audit(wired, ghost, tscOnly, full)[0] ?? "", /not a gate in/,
    "an exemption naming no script must be reported");

  // An unreadable publishing runner must not read as a pass.
  assert.match(audit(wired, {}, tscOnly, () => null)[0] ?? "", /cannot be checked/,
    "a missing workflow must be reported, never skipped");

  // The chain must be followed, not pattern-matched on `all`'s text: a gate reached through an
  // intermediate script is wired, and must not be reported.
  const indirect = {
    check: "tsc --noEmit",
    test: "node --test",
    browser: "npm run test:a11y",
    "test:a11y": "node --test a11y",
    all: "npm run check && npm run test && npm run browser",
  };
  assert.deepEqual(audit(indirect, {}, tscOnly, full), [],
    "a gate reached through an intermediate script is wired");

  // And the shorthand, which both CI and hooks/pre-push use.
  const shorthand = { check: "tsc --noEmit", test: "node --test", all: "npm run check && npm test" };
  assert.deepEqual(audit(shorthand, {}, tscOnly, full), [], "`npm test` reaches the `test` script");
});
