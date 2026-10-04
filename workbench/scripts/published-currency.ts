// Does the live site serve what this commit says, and if not, which files and for how long?
//
// THE FAILURE THIS EXISTS FOR, 261003. `npm run check:published` reported `6/6 declared pages live`
// while every page served was the PREVIOUS build — `max-width: 84rem` still in the shell, one
// `href="learn.html"` where the ruling had put two — because the deploy had not finished. The check
// was correct and useless. A 200 with the declared content shape in it proves a server answered with
// a page of the right identity; it says nothing about which REVISION of that page arrived, and the
// content shapes are deliberately stable literals (a title, a landmark id) precisely so a copy edit
// does not fail them. Liveness and currency are different questions and the report must answer both
// separately, or the green line on one reads as an answer to the other.
//
// THE ORACLE, AND WHY NOT THE OBVIOUS ONE. `dist/build-manifest.json` ships with the bundle and is
// served at `workbench/dist/build-manifest.json`. It carries `builtAt` and `inputs`. `builtAt` is
// the tempting signal and the wrong one: it dates a BUILD, not a SOURCE, so it cannot separate "the
// deploy is stale" from "the tree was rebuilt unchanged" — an old timestamp over a current tree is
// fine and a fresh timestamp over the wrong commit is not, and a timestamp comparison calls both the
// same. `inputs` is a content hash per source file, so comparing it against the sources at HEAD both
// detects the drift and NAMES it: "3 inputs behind" with the paths, not "stale".
//
// THREE STATES, NOT TWO, and this is the part that decides whether anyone keeps reading the gate. A
// push lands, CI runs the Typst book, the MkDocs course, the workbench bundle and three browser
// tiers, and Pages propagates. For those minutes the live site is LEGITIMATELY behind HEAD. If that
// window screams the same hard failure as a deploy that never ran, the gate cries wolf several times
// a day and gets ignored — which is how 261003 happened in the first place, one level up. So the
// drift is DATED: the discriminator is the age of the newest commit behind it. Minutes old means a
// deploy is in flight (`lagging`). Hours old means nothing is coming (`stale`). The distinction is
// a fact about the repository, not a guess.
//
// AGAINST HEAD, NOT THE WORKING TREE. A dirty checkout must never read as a stale deploy: the site
// cannot possibly serve a file nobody has committed, so comparing uncommitted bytes would report
// permanent drift to anyone mid-edit — every agent in this repo, all day. The hashes come from
// `git show HEAD:<path>`, and the caller reports uncommitted inputs as a NOTE beside the verdict
// rather than as part of it.
//
// Everything here is pure: no network, no filesystem, no `git`. `check-published.ts` gathers those
// facts and injects them, which is what lets `test/published-currency.test.ts` drive this logic
// through all three states — including the two that must FAIL — with no deploy and no clock.
import type { BuildManifest } from "./build-manifest.ts";

/**
 * How long a deploy is allowed to be in flight before `lagging` becomes `stale`.
 *
 * Chosen from what the publishing workflow actually does, not from taste: `npm ci` three times, the
 * workbench gates, the esbuild bundle, the browser and a11y tiers in headless Chromium, a Typst book
 * PDF + ePub, a second Typst handbook render, a MkDocs course build, the catalogue render, then the
 * Pages upload and CDN propagation. Generous enough that an ordinary deploy never reports `stale`,
 * because a gate that cries wolf is a gate that gets ignored; tight enough that a deploy which
 * failed or was never triggered is named within the half hour.
 */
export const DEPLOY_GRACE_SECONDS = 20 * 60;

/** The live site's relationship to HEAD. `unknown` is a failure, never a shrug. */
export type Currency = "current" | "lagging" | "stale" | "unknown";

/** One thing the live site does not yet reflect, named so the reader can open it. */
export interface Drift {
  /** Repo-root-relative, so it can be pasted into an editor from the report. */
  readonly path: string;
  /** `bundle-input` comes from the manifest; `served-file` from a page served verbatim. */
  readonly kind: "bundle-input" | "served-file";
  /** One line: what differs, in the direction it differs. */
  readonly problem: string;
}

/**
 * A page the deploy serves BYTE-FOR-BYTE from a committed file, with both hashes.
 *
 * The manifest covers the bundle's 83 inputs and nothing else — esbuild never reads `index.html`,
 * so a manifest-only check reports `current` over a stale app SHELL. That is not hypothetical: the
 * 261003 staleness was first SEEN in the shell (`max-width: 84rem`, one `href="learn.html"`), in a
 * file no bundle input covers. The two hand-authored shells are rsynced into the artifact unchanged,
 * so for them the served bytes and the committed bytes are comparable directly.
 */
export interface ServedFile {
  readonly url: string;
  /** Repo-root-relative path of the committed file the URL is served from. */
  readonly source: string;
  /** `hashInput` of the body the site returned, or null when the page did not arrive at all. */
  readonly servedHash: string | null;
  /** `hashInput` of that file's bytes at HEAD, or null when HEAD does not have it. */
  readonly headHash: string | null;
}

/** Everything the verdict is computed from, gathered impurely by the caller. */
export interface CurrencyFacts {
  /** The manifest the live site served, or null when it could not be read. */
  readonly manifest: BuildManifest | null;
  /** Why it could not be read. Ignored when `manifest` is non-null. */
  readonly manifestProblem: string;
  /**
   * Package-relative input path -> its hash at HEAD; null when HEAD does not have the file.
   *
   * A path the manifest names and this map omits is a gathering failure, reported as such — a
   * missing measurement must not silently narrow the comparison.
   */
  readonly atHead: ReadonlyMap<string, string | null>;
  readonly served: readonly ServedFile[];
  /**
   * Seconds since the newest commit touching any of these repo-root-relative paths, or null when
   * that cannot be determined.
   *
   * Injected rather than read, so the tests can place the same drift inside and outside the grace
   * window without a clock, a deploy, or a fabricated commit.
   */
  readonly commitAge: (paths: readonly string[]) => number | null;
  readonly graceSeconds: number;
  /** Repo-root-relative prefix of this package (`workbench/`), so drift paths are openable. */
  readonly packagePrefix: string;
}

export interface CurrencyVerdict {
  readonly state: Currency;
  /** Every drifted path, bundle inputs first, in the manifest's own order. */
  readonly drift: readonly Drift[];
  /** One line, suitable as the last line of the report. */
  readonly headline: string;
  /** The detail under the headline: the named paths, the dating, and what to do. */
  readonly lines: readonly string[];
  /** Age of the newest commit behind the drift, or null when there is none or it is unknown. */
  readonly ageSeconds: number | null;
}

/** "1h 12m", "4m", "38s" — a duration a reader can judge against a deploy's length. */
export function humanAge(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * The drift the manifest shows against HEAD, in the manifest's own key order.
 *
 * Three findings, not one, because they point in different directions and the reader's next move
 * differs for each. A CHANGED input is the ordinary stale deploy. An input ABSENT at HEAD means the
 * live site was built from a source this commit does not have — the local checkout is behind the
 * published branch, and chasing a deploy would be the wrong move. An UNMEASURED input means the
 * gatherer failed, which must not pass as agreement.
 *
 * A source file ADDED since the published build needs no rule of its own: nothing imports a module
 * that nothing imports, so a new input arrives with a change to whatever imports it, and that
 * importer is in the published map and reports as changed. The transitive catch is why this compares
 * over the PUBLISHED key set rather than needing a local manifest to diff against.
 */
function manifestDrift(manifest: BuildManifest, facts: CurrencyFacts): readonly Drift[] {
  const drift: Drift[] = [];
  for (const [path, published] of Object.entries(manifest.inputs)) {
    const repoPath = `${facts.packagePrefix}${path}`;
    if (!facts.atHead.has(path)) {
      drift.push({
        path: repoPath,
        kind: "bundle-input",
        problem: "its hash at HEAD was not measured, so this input was not compared at all",
      });
      continue;
    }
    const head = facts.atHead.get(path) ?? null;
    if (head === null) {
      drift.push({
        path: repoPath,
        kind: "bundle-input",
        problem: "the published build read this file and HEAD does not have it — this checkout is "
          + "probably behind the branch the site deploys from, rather than the site being stale",
      });
      continue;
    }
    if (head !== published) {
      drift.push({
        path: repoPath,
        kind: "bundle-input",
        problem: `live ${published}, HEAD ${head}`,
      });
    }
  }
  return drift;
}

/** The drift the verbatim-served pages show against HEAD. */
function servedDrift(facts: CurrencyFacts): readonly Drift[] {
  const drift: Drift[] = [];
  for (const file of facts.served) {
    // A page that never arrived is the LIVENESS report's finding. Repeating it here would double-count
    // one failure as two, and the currency verdict would blame a deploy for a DNS error.
    if (file.servedHash === null) continue;
    if (file.headHash === null) {
      drift.push({
        path: file.source,
        kind: "served-file",
        problem: `${file.url} is served from this path and HEAD does not have it`,
      });
      continue;
    }
    if (file.servedHash !== file.headHash) {
      drift.push({
        path: file.source,
        kind: "served-file",
        problem: `${file.url} serves ${file.servedHash}, HEAD has ${file.headHash}`,
      });
    }
  }
  return drift;
}

/** How many paths the report names before it stops and gives a count. */
const NAMED_LIMIT = 8;

/**
 * The live site's currency against HEAD.
 *
 * `unknown` first and unconditionally: a manifest that cannot be read is a finding about the deploy
 * — the build did not run, or `dist/` never shipped — and must not be reported as agreement. This is
 * the one branch where silence would be most comfortable and most wrong.
 */
export function assessCurrency(facts: CurrencyFacts): CurrencyVerdict {
  if (facts.manifest === null) {
    return {
      state: "unknown",
      drift: [],
      ageSeconds: null,
      headline: "CURRENCY UNKNOWN — the live site's build manifest could not be read",
      lines: [
        `the manifest is ${facts.manifestProblem}`,
        "A deployed site always carries one: `npm run build` writes it beside the bundle and the "
          + "publishing workflow rsyncs `workbench/dist/` into the artifact. Not being able to read "
          + "it means the build did not run, the bundle did not ship, or something other than this "
          + "site answered — all of which are findings, so this is reported rather than skipped.",
      ],
    };
  }

  const drift = [...manifestDrift(facts.manifest, facts), ...servedDrift(facts)];
  const inputCount = Object.keys(facts.manifest.inputs).length;
  if (drift.length === 0) {
    return {
      state: "current",
      drift,
      ageSeconds: null,
      headline: `CURRENT — the live site reflects HEAD across ${inputCount} bundle inputs`
        + `${facts.served.length > 0 ? ` and ${facts.served.length} verbatim-served page(s)` : ""}`,
      lines: [`live build ran ${facts.manifest.builtAt} (diagnostic only; the verdict is over content hashes)`],
    };
  }

  const age = facts.commitAge(drift.map((d) => d.path));
  const named = drift.slice(0, NAMED_LIMIT).map((d) => `${d.path} — ${d.problem}`);
  const overflow = drift.length - named.length;
  const detail = [
    `live build ran ${facts.manifest.builtAt} (diagnostic only; the verdict is over content hashes)`,
    ...named,
    ...(overflow > 0 ? [`… and ${overflow} more`] : []),
  ];

  // An undateable drift is reported as `stale`, deliberately. The grace window is the ONLY thing
  // standing between this gate and a hard failure, and granting it on a measurement that failed
  // would hand the benefit of the doubt to the case nobody measured.
  if (age === null) {
    return {
      state: "stale",
      drift,
      ageSeconds: null,
      headline: `STALE — the live site is ${drift.length} file(s) behind HEAD, and the drift could not be dated`,
      lines: [...detail,
        "`git log` returned no date for these paths, so whether a deploy is in flight is unknown. "
          + "Unknown is reported as stale rather than transient: the grace window exists for a "
          + "measured wait, not an unmeasured one.",
      ],
    };
  }

  if (age <= facts.graceSeconds) {
    return {
      state: "lagging",
      drift,
      ageSeconds: age,
      headline: `LAGGING — the live site is ${drift.length} file(s) behind HEAD, newest change ${humanAge(age)} ago`,
      lines: [...detail,
        `That is inside the ${humanAge(facts.graceSeconds)} deploy window, so a build is most likely `
          + `still running. Re-run to watch it land; pass --strict to make this window a failure `
          + `(which is what a post-deploy wait wants).`,
      ],
    };
  }

  return {
    state: "stale",
    drift,
    ageSeconds: age,
    headline: `STALE — the live site is ${drift.length} file(s) behind HEAD, newest change ${humanAge(age)} ago`,
    lines: [...detail,
      `That is past the ${humanAge(facts.graceSeconds)} deploy window, so this is not a build in `
        + `flight: either the publishing workflow failed, it never ran for these commits, or the `
        + `commits are not on the branch the site deploys from. Check the workflow run before `
        + `changing anything here.`,
    ],
  };
}
