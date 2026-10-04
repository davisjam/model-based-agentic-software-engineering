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
// A THIRD axis sits at the foot of this file, and it is the same failure one level down. Both axes
// above reason about SCRIPT NAMES; a test runner takes GLOBS. So a gate can land in a file no
// pattern matches, or a pattern can match nothing at all — in both cases every name is wired and
// nothing runs. See "the axis both of the above are blind to".
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
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";

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
 * The published-site probe, which NO runner invokes — the one gate here whose coverage claim is a
 * documented manual command rather than another runner. Declared once and used on BOTH axes, because
 * its two reasons compose rather than conflict.
 *
 * It fetches the LIVE published site. That disqualifies it from the default gate, which must stay
 * hermetic and offline-runnable, and from the publishing workflow, which is the run that DEPLOYS the
 * site — probing the live site from inside it either races CDN propagation or asserts the previous
 * deploy. Neither axis has a step to point at, so the evidence is the README's gate section, the
 * place a human is told to run it. If it is later wired in as a post-deploy step, DELETE the
 * publishing-axis entry: an exemption for a gate that is reached is itself reported.
 *
 * Its hermetic half is not exempt and needs no entry. The base-URL derivation, the content-shape rule
 * and the negative control live in `test/published-pages.test.ts`, which both axes already run.
 */
const MANUAL_PUBLISHED_PROBE: Exemption = {
  evidenceIn: "workbench/README.md",
  evidence: "npm run check:published",
  reason: "It fetches the live published site, so it cannot sit in a hermetic tier — the default gate "
    + "must not go red because a DNS lookup failed — and it measures the deploy that already shipped "
    + "rather than the tree under test. The publishing workflow is the run that deploys, so probing "
    + "the live site from inside it races the Pages CDN. No runner invokes it: the evidence is the "
    + "README gate section where a human is told to, and whether it belongs in CI as a post-deploy "
    + "step is an open decision rather than an oversight.",
};

/**
 * Gates the DEFAULT gate deliberately does not reach.
 *
 * The two browser tiers need Puppeteer and a bundled Chromium resolved from `book/node_modules`,
 * which this package does not and will not depend on: `workbench/node_modules` is a symlink shared
 * across parallel agent worktrees, so an install here mutates trees this package does not own. The
 * third entry is excluded for an unrelated reason — it reads the network; see its declaration above.
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
  "check:published": MANUAL_PUBLISHED_PROBE,
};

/**
 * Gates the PUBLISHING runner does not invoke by name.
 *
 * `check` is the case a naive name-matching rule gets wrong in both directions: CI runs the typecheck
 * as `npx tsc --noEmit` rather than `npm run check`. Matching names would flag it while passing a
 * workflow that named a script whose body had been gutted, so the evidence is the command, not the
 * name. `check:published` is the other shape — a gate no runner carries at all; see its declaration.
 */
const EXEMPT_FROM_PUBLISH: Readonly<Record<string, Exemption>> = {
  "check:published": MANUAL_PUBLISHED_PROBE,
  // The Node preflight. It is reached from `all` and from an npm `pre` hook on every gate that loads
  // a .ts entry point, so the default-gate axis needs no entry — but CI has no step to point at, and
  // does not need one: the runner's Node is INSTALLED from the same `.nvmrc` this check derives its
  // pin from, so the version CI runs cannot be wrong in the way a developer's shell can. The
  // evidence is that pin, which means dropping `node-version-file` from the workflow fails this
  // check even though no script name moved. If CI is ever given a step that runs the preflight,
  // DELETE this entry: an exemption for a gate that is reached is itself reported.
  "check:node": {
    evidenceIn: PUBLISH_RUNNER,
    evidence: "node-version-file: .nvmrc",
    reason: "The preflight exists for a shell whose Node is wrong — on 261003 a Node 20 shell made "
      + "two gates die with ERR_UNKNOWN_FILE_EXTENSION, which reads like broken code and cost two "
      + "actors time. CI cannot have that problem: actions/setup-node installs the version named in "
      + "`.nvmrc`, the same file the preflight reads its pin from, so a step invoking the preflight "
      + "would assert what the setup step already guarantees. The evidence below is that pin.",
  },
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
 * A predicate, not a list, so a new `test:*` or `check:*` script joins the policed set by existing.
 * `types`, `build` and `affordances` produce artifacts instead of verdicts; `build` is reachable from
 * the root gate anyway, and `check` and `test` are named because that is what this package calls its
 * typecheck and its unit tier.
 *
 * The `check:` prefix arrived with `check:parity`, the UX-I1 gate lifted out of an inline `node
 * --eval` in the publishing workflow. A gate that is a script must be policed like one, on both
 * axes — otherwise lifting logic out of YAML into a script nobody invokes trades one costume of this
 * failure for another.
 */
const isGate = (name: string): boolean =>
  name === "check" || name === "test" || name.startsWith("test:") || name.startsWith("check:");

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

// ----------------------------------------------------------------------------------------------
// The axis the walk above cannot see: TWO runners of the SAME gate, disagreeing
// ----------------------------------------------------------------------------------------------
//
// Everything above asks whether a runner ARRIVES at a gate. It never asks whether two runners that
// both arrive are checking the same thing, and that is the hole the sixth instance walked through.
//
// UX-I1 affordance parity was asserted in two places with two thresholds. `test/capabilities.test.ts`
// compared the violation list against a recorded BASELINE, which accepted one standing violation and
// passed. The publishing workflow ran an inline `node --eval` that imported the registry and decided
// the threshold for itself. Both runners reached a gate; the gate was not the same gate. Two pushes
// failed at the stricter copy, because the local suite reported green against the weaker claim and
// the stricter claim lived in YAML where nobody runs it. Unlike the five instances before it, nothing
// here was unwired — the two gates CONTRADICTED each other.
//
// HOW FAR THIS HONESTLY GENERALISES: not far, and the narrow version is deliberate. Comparing
// thresholds across a TypeScript test and a YAML-embedded script is not something a check can do in
// general — it would have to understand both programs. So the structural property is split in two,
// and each half is checkable on its own:
//
//   - The GENERAL half lives in `tests/ci.py`: no workflow step may import a package's source. A
//     runner that imports the source is a second implementation by construction, whatever the
//     invariant, so that rule makes the second threshold impossible to WRITE in the workflow. It
//     holds for every gate, present and future.
//   - The NARROW half is below, and covers exactly one invariant: UX-I1's threshold is declared in
//     one file, no file compares a parity count against a literal, and the publishing step invokes
//     the script rather than naming the functions.
//
// What neither half covers, stated rather than implied: two npm scripts inside this package could
// still carry two thresholds for one invariant, and a runner could still re-derive a verdict in bash
// (`test "$(grep -c …)" -eq 0`) without importing anything. A control nobody can trust is worse than
// a missing one, so the claim stops where the checking does.
//
// PROSE IS NOT CODE, and this file argues about the pattern it forbids. Both scans run over
// comment-stripped text, the same lesson `test/capabilities.test.ts` learned when a naive sweep read
// `<section>` out of an HTML comment and reported three landmarks that did not exist. The fixtures in
// the negative control go further and BUILD the banned text rather than spelling it, because a string
// literal is not a comment and the audit reads this file along with every other.

/** The threshold constant, by name — so moving it without updating this goes red. */
const THRESHOLD_TOKEN = "PARITY_VIOLATION_CEILING";

/**
 * Its DECLARATION, which is what may exist once.
 *
 * A declaration rather than a mention, because a mention is what prose and this file's own fixtures
 * are made of. `const PARITY_VIOLATION_CEILING` can only be the thing itself.
 */
const THRESHOLD_DECL = new RegExp(String.raw`\b(?:const|let|var)\s+${THRESHOLD_TOKEN}\b`);

/** The one module allowed to declare it, package-relative. */
const THRESHOLD_OWNER = "src/app/capabilities.ts";

/** The exported verdict function both runners must reach through, rather than deciding for themselves. */
const VERDICT_FN = "affordanceParityGate";

/** The raw reporter. A runner naming it is a runner carrying the gate. */
const REPORTER_FN = "checkAffordanceParity";

/** The script that is the gate's only command. */
const PARITY_SCRIPT = "check:parity";

/**
 * A parity count compared against a LITERAL — the shape a re-derived threshold always takes.
 *
 * The owning module's own comparison reads `violations.length <= PARITY_VIOLATION_CEILING`, whose
 * right side is a name, so the owner does not trip its own ban. That is the rule in one line: the
 * number may appear once, under a name, in one file.
 */
const LITERAL_THRESHOLD = /\bviolations\.length\s*(?:===|!==|==|>=|<=|>|<)\s*\d/;

/** Comments out: line and block comments for TypeScript, hash comments for YAML. */
const stripComments = (text: string, kind: "ts" | "yaml"): string =>
  kind === "ts"
    ? text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ")
    : text.replace(/#.*$/gm, " ");

/** One file the audit reads: its package-relative path and its code, comments already out. */
interface SourceFile {
  readonly path: string;
  readonly code: string;
}

/**
 * The rule, over supplied files, so the negative control can drive it with the defect.
 *
 * `runnerCode` is the publishing workflow's text with comments stripped, or null when it cannot be
 * read — which is a finding, never a skip.
 */
function auditSingleThreshold(
  files: readonly SourceFile[],
  runnerCode: string | null,
  scripts: Readonly<Record<string, string>>,
): readonly string[] {
  const issues: string[] = [];

  const declaring = files.filter((f) => THRESHOLD_DECL.test(f.code)).map((f) => f.path);
  if (declaring.length === 0) {
    issues.push(`no file among the ${files.length} scanned declares \`${THRESHOLD_TOKEN}\`. Either the `
      + `threshold moved — in which case say where, here — or it dissolved back into a literal, which `
      + `is the state this check exists to leave behind.`);
  }
  for (const path of declaring) {
    if (path === THRESHOLD_OWNER) continue;
    issues.push(`\`${path}\` declares \`${THRESHOLD_TOKEN}\`, which only \`${THRESHOLD_OWNER}\` may. `
      + `A threshold with two homes IS the defect: UX-I1 had one in a test baseline and one in the `
      + `publishing workflow, they disagreed, and the copy nobody could run locally failed the push.`);
  }

  for (const file of files) {
    if (LITERAL_THRESHOLD.test(file.code)) {
      issues.push(`\`${file.path}\` compares a parity violation count against a literal. Call `
        + `\`${VERDICT_FN}()\` and read its \`passed\` field — a second number is a second definition `
        + `of passing, and two definitions drift silently because neither mentions the other.`);
    }
  }

  if (runnerCode === null) {
    issues.push(`\`${PUBLISH_RUNNER}\` cannot be read, so whether it invokes the gate or reimplements `
      + `it is unknown — and unknown must never read as a pass.`);
    return issues;
  }
  if (!runnerCode.includes(`npm run ${PARITY_SCRIPT}`)) {
    issues.push(`\`${PUBLISH_RUNNER}\` does not run \`npm run ${PARITY_SCRIPT}\`. The publishing axis `
      + `is where UX-I1 is specified to fail hard, and a gate it does not invoke does not gate the site.`);
  }
  if (runnerCode.includes(VERDICT_FN) || runnerCode.includes(REPORTER_FN)) {
    issues.push(`\`${PUBLISH_RUNNER}\` names this package's parity functions in a command. A runner `
      + `that reaches into the source carries the gate instead of invoking it, which is how the `
      + `threshold came to exist twice. Invoke \`npm run ${PARITY_SCRIPT}\`; the step keeps its title `
      + `and its isolated, named failure either way.`);
  }
  if (scripts[PARITY_SCRIPT] === undefined) {
    issues.push(`package.json declares no \`${PARITY_SCRIPT}\` script, so the one command both runners `
      + `are supposed to share does not exist.`);
  }
  return issues;
}

/** Every `.ts`/`.mjs` file under the package's source, test and script trees, comments stripped. */
const packageSources = (): readonly SourceFile[] => {
  const out: SourceFile[] = [];
  for (const dir of ["src", "test", "scripts"]) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { recursive: true, encoding: "utf8" })) {
      const path = `${dir}/${entry}`;
      if (!/\.(ts|mjs)$/.test(path) || !statSync(path).isFile()) continue;
      out.push({ path, code: stripComments(readFileSync(path, "utf8"), "ts") });
    }
  }
  return out;
};

test("the UX-I1 parity threshold is declared once, and both runners reach it through the script", () => {
  const files = packageSources();
  // A probe that finds nothing is usually the probe. This audit's force is the breadth of the scan,
  // so the breadth is asserted before the rule reads it.
  assert.ok(files.length > 20, `scanned ${files.length} source file(s) — the tree walk is wrong`);
  assert.ok(files.some((f) => f.path === "scripts/check-parity.ts"),
    "the gate's command must be in the scanned set; it is the file most likely to grow a second number");
  assert.ok(files.some((f) => f.path === THRESHOLD_OWNER), `${THRESHOLD_OWNER} must be in the scanned set`);

  const workflow = readRepoFile(PUBLISH_RUNNER);
  const issues = auditSingleThreshold(
    files, workflow === null ? null : stripComments(workflow, "yaml"), manifestScripts());
  assert.deepEqual(issues, [], `UX-I1 threshold:\n  ${issues.join("\n  ")}\n`);
});

test("the single-threshold audit fires on each way the number comes back — negative control", () => {
  // BUILT, not spelled. The audit reads every file under src/, test/ and scripts/ — this one
  // included — so a fixture containing the banned text verbatim would make this control the first
  // thing the check above reports. Comment-stripping does not help: a string literal is not a comment.
  const compare = (op: string, n: number): string => `violations.length ${op} ${n}`;
  const declare = (name: string): string => `const ${name} = 0;`;

  const owner: SourceFile = {
    path: THRESHOLD_OWNER,
    code: `${declare(THRESHOLD_TOKEN)}\nexport function ${VERDICT_FN}() {\n`
      + `  return { passed: violations.length <= ${THRESHOLD_TOKEN} };\n}\n`,
  };
  const cleanRunner = `      - name: UX-I1 affordance parity\n        run: npm run ${PARITY_SCRIPT}\n`;
  const scripts = { all: "x", [PARITY_SCRIPT]: "node scripts/check-parity.ts" };
  const pad = (n: number): readonly SourceFile[] =>
    Array.from({ length: n }, (_, i) => ({ path: `src/pad-${i}.ts`, code: "export const x = 1;\n" }));
  const base = [owner, ...pad(24)];

  // The patched shape passes. Asserted first, because everything below is a DELTA against it and a
  // control whose baseline is already red proves nothing about the deltas.
  assert.deepEqual(auditSingleThreshold(base, cleanRunner, scripts), [], "the unified shape must pass");
  // The owner's named comparison must not trip the literal ban, or the rule is unsatisfiable.
  assert.ok(!LITERAL_THRESHOLD.test(owner.code),
    "a comparison against the NAMED ceiling must be allowed; otherwise there is nowhere legal for it");

  // The sabotage this instance actually was: the runner decides for itself.
  const inlineRunner = "      - name: UX-I1\n        run: |\n          node --eval '\n"
    + `            const v = ${REPORTER_FN}();\n`
    + `            process.exit(${compare("===", 0)} ? 0 : 1);'\n`;
  const reimplemented = auditSingleThreshold(base, inlineRunner, scripts);
  assert.ok(reimplemented.some((m) => /does not run `npm run check:parity`/.test(m)),
    `a runner that skips the script must be reported: ${reimplemented.join("; ")}`);
  assert.ok(reimplemented.some((m) => /names this package's parity functions/.test(m)),
    "a runner that carries the gate must be reported");

  // A second DECLARATION inside the package — the half the workflow rule cannot see.
  const secondHome = [...base,
    { path: "test/elsewhere.test.ts", code: `${declare(THRESHOLD_TOKEN)}\n` }];
  assert.match(auditSingleThreshold(secondHome, cleanRunner, scripts)[0] ?? "", /two homes/,
    "a second file declaring the threshold must be reported");

  // And the same number WITHOUT the name, which is how it got in last time.
  const literal = [...base,
    { path: "test/elsewhere.test.ts", code: `assert.ok(${compare("===", 0)});\n` }];
  assert.match(auditSingleThreshold(literal, cleanRunner, scripts)[0] ?? "", /against a literal/,
    "a parity count compared to a literal must be reported");
  // Including a tolerant one. A ratchet is a threshold too, and two ratchets drift the same way —
  // the baseline this instance started from accepted exactly one standing violation.
  const ratchet = [...base,
    { path: "test/elsewhere.test.ts", code: `assert.ok(${compare("<=", 1)});\n` }];
  assert.match(auditSingleThreshold(ratchet, cleanRunner, scripts)[0] ?? "", /against a literal/,
    "a tolerant literal is still a second definition of passing");

  // Prose about the ban must not read as the ban. Without comment-stripping, every file that explains
  // this rule reports itself, which is how a control gets deleted for crying wolf.
  const prose = [...base, {
    path: "test/elsewhere.test.ts",
    code: stripComments(`// the old step asserted ${compare("===", 0)} inline\nexport const y = 1;\n`, "ts"),
  }];
  assert.deepEqual(auditSingleThreshold(prose, cleanRunner, scripts), [],
    "a comment quoting the banned comparison must not be reported as the comparison");

  // The threshold dissolving back into a literal, with nothing left to point at.
  const dissolved = [{ path: THRESHOLD_OWNER, code: `export const ok = () => ${compare("===", 0)};\n` },
    ...pad(24)];
  const gone = auditSingleThreshold(dissolved, cleanRunner, scripts);
  assert.ok(gone.some((m) => /no file among the \d+ scanned declares/.test(m)),
    `a vanished threshold must be reported: ${gone.join("; ")}`);

  // A missing script: the one command both runners share does not exist.
  assert.ok(auditSingleThreshold(base, cleanRunner, { all: "x" })
    .some((m) => /declares no `check:parity` script/.test(m)), "a missing gate script must be reported");

  // An unreadable runner must not read as a pass.
  assert.match(auditSingleThreshold(base, null, scripts)[0] ?? "", /cannot be read/,
    "a missing workflow must be reported, never skipped");
});

// ----------------------------------------------------------------------------------------------
// The axis both of the above are blind to: a gate in a FILE no runner's glob matches
// ----------------------------------------------------------------------------------------------
//
// Everything above reasons about SCRIPT NAMES. A test runner does not take names, it takes globs —
// `node --test "test/browser/*.test.mjs"` — and the two failures that follow are invisible to a
// name walk:
//
//   - A gate lands in a FILE no gate script's pattern matches. Nothing is unwired by name; the file
//     is simply never handed to a runner. From `scripts` alone it is indistinguishable from a file
//     that runs, which is the same indistinguishability instances 1 and 3 turned on.
//   - A pattern matches NOTHING. `node --test` over a glob that matches no file exits 0 and prints
//     "pass 0", so a renamed directory reads as a green tier that ran nothing. The harness already
//     works around the consequence with hard-asserted receipts; this catches the cause.
//
// Both directions, over patterns DERIVED from `package.json` — the same discipline the name walk
// uses, for the same reason. A literal list of globs here would be a second copy of the manifest.
//
// `**` is deliberately unsupported and ASSERTED absent rather than approximated: a matcher that
// under-approximates a recursive glob would report files as unreached that a runner does reach,
// and a false red on a wiring check is how a wiring check gets deleted.

/** Test files are these two shapes. `.mjs` for the browser tiers, `.ts` for the typed node tier. */
const TEST_FILE = /\.test\.(ts|mjs)$/;

/** Patterns a command hands to `node --test`, with the shell quoting taken off. */
const testPatterns = (command: string): readonly string[] => {
  const tail = /node\s+--test\s+(.+)$/.exec(command)?.[1];
  if (tail === undefined) return [];
  return [...tail.matchAll(/"([^"]+)"|'([^']+)'|(\S+)/g)]
    .map((m) => m[1] ?? m[2] ?? m[3] ?? "")
    .filter((token) => token.length > 0 && !token.startsWith("-"));
};

/** A glob over one path, with `*` confined to a single segment. */
const globToRegExp = (pattern: string): RegExp => {
  const body = pattern.split("/")
    .map((segment) => segment.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
    .join("/");
  return new RegExp(`^${body}$`);
};

/** Every test file under `test/`, package-relative, in the spelling a pattern would match. */
const testFiles = (dir = "test"): readonly string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { recursive: true, encoding: "utf8" })) {
    const path = `${dir}/${entry}`;
    if (TEST_FILE.test(path) && statSync(path).isFile()) out.push(path);
  }
  return out.sort();
};

/**
 * Coverage gates declared BY NAME, so deleting one is a failure rather than a quieter suite.
 *
 * The glob audit below is the general control and it cannot make this claim: a file that no longer
 * exists is matched by no pattern and reported by nothing, so a coverage gate could be removed and
 * every check in this file would stay green. These three are the repo's coverage MEASURES — the
 * operation census over `window.mage`, the CDP attach path, and the per-model verdict census — and
 * each is the sole mechanical holder of what it measures, so its existence is the claim worth
 * pinning alongside the script whose glob is supposed to reach it.
 *
 * It was `AGENT_SURFACE_GATES` while both entries were browser-tier agent gates. The third entry is
 * a node-tier model gate, so the name now says what the list is for; the `script` field already
 * carried the tier and no entry changed.
 */
const PINNED_GATE_FILES: readonly { readonly file: string; readonly script: string; readonly reason: string }[] = [
  {
    file: "test/browser/agent-coverage.test.mjs",
    script: "test:browser",
    reason: "The agent surface's coverage census: every operation `describe()` advertises is driven, "
      + "and every callable on `window.mage` is invoked. It is the agent-side counterpart of "
      + "`check:parity`, and it is a TEST rather than a script because the numbers it reports come "
      + "from a served page in a real browser.",
  },
  {
    file: "test/browser/attach.test.mjs",
    script: "test:browser",
    reason: "FR-AGENT-1's transport: two independent clients attached over CDP to a browser neither "
      + "launched. Every other suite reaches the page through `puppeteer.launch`, so attach could "
      + "break outright and the browser tier would stay green.",
  },
  {
    file: "test/model-coverage.test.ts",
    script: "test",
    reason: "The per-model verdict census: every saved query carrying `expect` in every tracked "
      + "model, evaluated through the facade. It is the ONLY CI holder of those expectations — "
      + "`validate.py` evaluates them too and is reachable from `hooks/pre-push` alone, and "
      + "`test/parity.test.ts` compares the two engines' answers to each other rather than to "
      + "`expect`. Delete this file and a model may assert one verdict while the engine answers "
      + "another, which is the state a mutation proved CI could not see.",
  },
  {
    file: "test/import-graph.test.ts",
    script: "test",
    reason: "The architecture model's correspondence with the code: every import specifier under "
      + "`src/`, parsed, resolved to the entity owning each path, and compared against the declared "
      + "`depends-on` edge set in both directions. It is the ONLY mechanical holder of that claim — "
      + "`test/model-coverage.test.ts` answers the model's queries over its own DECLARED relations, "
      + "and a real kernel-to-view import was proven by mutation to pass that, the typecheck and the "
      + "whole node tier. Delete this file and the model's `absence` clause binds a reader again and "
      + "nothing else.",
  },
];

/** One glob a gate script hands to `node --test`, and which script hands it over. */
interface TierPattern {
  readonly pattern: string;
  readonly script: string;
}

/** Both directions, over supplied inputs, so the negative control can drive each defect. */
function auditTestFileReachability(
  files: readonly string[], patterns: readonly TierPattern[],
): readonly string[] {
  const issues: string[] = [];
  for (const { pattern, script } of patterns) {
    if (!pattern.includes("**")) continue;
    issues.push(`\`${script}\` uses a recursive glob (${pattern}), which this matcher does not `
      + `model. Either teach it \`**\` or keep the patterns one segment deep — an approximated glob `
      + `reports files as unreached that the runner reaches, and a false red on a wiring check is `
      + `how a wiring check gets deleted.`);
  }
  const matchers = patterns.map((p) => ({ ...p, re: globToRegExp(p.pattern) }));
  for (const file of files) {
    if (matchers.some((m) => m.re.test(file))) continue;
    issues.push(`\`${file}\` is a test file and no gate script's glob matches it, so no runner ever `
      + `hands it to \`node --test\`. Nothing is unwired by NAME — which is why the two audits above `
      + `cannot see this, and why an unreached file and a running one look identical from \`scripts\`.`);
  }
  for (const { pattern, script, re } of matchers) {
    if (files.some((file) => re.test(file))) continue;
    issues.push(`\`${script}\` runs \`node --test ${pattern}\` and nothing matches it. \`node --test\` `
      + `over a glob that matches no file exits 0 and reports "pass 0", so this is a green tier that `
      + `measured nothing.`);
  }
  return issues;
}

/** Every glob the gate scripts hand to `node --test`, with the script that hands it over. */
const tierPatterns = (scripts: Readonly<Record<string, string>>): readonly TierPattern[] =>
  Object.keys(scripts).filter(isGate)
    .flatMap((script) => testPatterns(scripts[script] ?? "").map((pattern) => ({ pattern, script })));

test("every test file is matched by a gate script's glob, and every glob matches a file", () => {
  const patterns = tierPatterns(manifestScripts());
  const files = testFiles();
  // Both inputs asserted before the rule reads them: a probe that finds nothing is usually the
  // probe, and this audit passes trivially over an empty file list or an empty pattern list.
  assert.ok(patterns.length >= 4,
    `found ${patterns.length} test pattern(s) across the gate scripts; this package runs more tiers than that`);
  assert.ok(files.length > 40, `walked ${files.length} test file(s) — the tree walk is wrong`);
  const issues = auditTestFileReachability(files, patterns);
  assert.deepEqual(issues, [], `test-file reachability:\n  ${issues.join("\n  ")}\n`);
});

test("the glob audit fires on each defect it exists to catch — negative control", () => {
  const tiers: readonly TierPattern[] = [
    { pattern: "test/*.test.ts", script: "test" },
    { pattern: "test/browser/*.test.mjs", script: "test:browser" },
  ];
  const reached = ["test/ir.test.ts", "test/browser/workbench.test.mjs"];
  assert.deepEqual(auditTestFileReachability(reached, tiers), [],
    "the wired shape must pass, or every delta below is measured against a red baseline");

  // The failure a name walk cannot see: a gate lands one directory deeper than any pattern reaches.
  const orphaned = auditTestFileReachability([...reached, "test/browser/deep/agent.test.mjs"], tiers);
  assert.equal(orphaned.length, 1, `one finding expected, got ${orphaned.length}: ${orphaned.join("; ")}`);
  assert.match(orphaned[0] ?? "", /deep\/agent\.test\.mjs/, "the finding must name the file");
  assert.match(orphaned[0] ?? "", /no gate script's glob matches it/);

  // A `*` must not cross a segment boundary, or the matcher would call the orphan above reached.
  assert.ok(!globToRegExp("test/browser/*.test.mjs").test("test/browser/deep/agent.test.mjs"),
    "the glob matcher lets `*` cross a path separator, so it over-reports coverage");

  // The other direction: the pattern that matches nothing, which prints a green tier having run
  // nothing at all.
  const empty = auditTestFileReachability(reached,
    [...tiers, { pattern: "test/perf/*.test.mjs", script: "test:perf" }]);
  assert.ok(empty.some((m) => /matched nothing|nothing matches it/.test(m)),
    `a pattern matching no file must be reported: ${empty.join("; ")}`);

  // And the unsupported recursive glob, reported rather than approximated.
  const recursive = auditTestFileReachability(reached,
    [{ pattern: "test/**/*.test.mjs", script: "test:all" }, ...tiers]);
  assert.ok(recursive.some((m) => /recursive glob/.test(m)),
    `a recursive glob must be reported: ${recursive.join("; ")}`);
});

test("the pinned coverage gates exist, and the script declared for each one reaches it", () => {
  const scripts = manifestScripts();
  for (const gate of PINNED_GATE_FILES) {
    assert.ok(gate.reason.trim().length >= MIN_REASON,
      `${gate.file} is registered with a ${gate.reason.trim().length}-character reason; at least `
      + `${MIN_REASON} are required. Say what the gate holds, or the registration is a filename.`);
    assert.ok(existsSync(gate.file),
      `${gate.file} is registered as a gate and does not exist. ${gate.reason}`);
    assert.ok(statSync(gate.file).size > 0, `${gate.file} is empty`);
    const command = scripts[gate.script];
    assert.ok(command !== undefined,
      `${gate.file} names \`${gate.script}\` as its runner and package.json has no such script`);
    const reaches = testPatterns(command).some((pattern) => globToRegExp(pattern).test(gate.file));
    assert.ok(reaches,
      `\`${gate.script}\` is declared as the runner for ${gate.file} and its patterns `
      + `(${testPatterns(command).join(", ")}) do not match it`);
  }
});
