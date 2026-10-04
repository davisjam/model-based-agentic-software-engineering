// `npm run check:published` — do the pages we publish serve, and do they serve THIS commit?
//
// Two verdicts, reported separately and never merged:
//   LIVENESS  — every declared URL answers 200 with the content shape that identifies it.
//   CURRENCY  — what answered was built from the sources at HEAD.
// On 261003 the first was green while the second was false: `6/6 declared pages live` over six pages
// that were all the previous build, because the deploy had not finished. Each verdict is correct and
// neither implies the other, so a single combined line would have to lie about one of them.
//
// The logic, the URL list, and the argument for all of it live in `published-pages.ts` and
// `published-currency.ts`. This file is the impure half: it reads `origin`, reads any published
// CNAME, reads `git` for the hashes and dates, parses argv, and does the fetching. The split is what
// lets the offline tier drive the real verdict logic against a wrong-but-live site and against all
// three currency states — a probe with no negative control is exactly what produced both near-misses
// this check answers.
//
// MANUAL, and deliberately not wired into `npm run all` or the publishing workflow. It reads the
// network, so it cannot sit in a hermetic tier, and it measures the site ALREADY DEPLOYED rather than
// the tree being gated. Both exclusions are declared in `test/gate-reachability.test.ts`, because an
// excluded gate and a forgotten one are indistinguishable from a script list alone.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { hashInput, MANIFEST_PATH, readManifest, type BuildManifest } from "./build-manifest.ts";
import {
  assessCurrency,
  DEPLOY_GRACE_SECONDS,
  type CurrencyVerdict,
  type ServedFile,
} from "./published-currency.ts";
import { deriveBase, probePages, PUBLISHED_PAGES, type Fetcher } from "./published-pages.ts";

/** The repo root. npm runs a script with the package directory as cwd, which is `workbench/`. */
const REPO_ROOT = "..";

/** `git` from the repo root, trimmed, or null when it refused. */
function git(args: readonly string[]): string | null {
  try {
    return execFileSync("git", [...args], {
      encoding: "utf8",
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  } catch {
    // Converted, not swallowed: every caller below turns null into a reported finding rather than a
    // silently narrowed comparison. `git` exits non-zero for "no such remote" and "no such path at
    // this revision" alike, and both are facts this report must carry.
    return null;
  }
}

/**
 * An explicit `--base <url>`, or null to derive.
 *
 * A bare `--base`, or one followed by another flag, exits rather than falling through to derivation:
 * an override that silently does nothing is an accident surface, and this whole check exists because
 * a probe pointed somewhere unintended read as a result about the site.
 */
function overrideFromArgv(argv: readonly string[]): string | null {
  const at = argv.indexOf("--base");
  if (at === -1) return null;
  const value = argv[at + 1];
  if (value === undefined || value.startsWith("-")) {
    console.error("`--base` requires a URL. Omit it entirely to probe the derived site.");
    process.exit(2);
  }
  return value;
}

/**
 * `origin`, or null when there is none.
 *
 * `deriveBase` turns null into a refusal that names what was found, so the failure still reaches the
 * operator with its cause attached.
 */
const originRemote = (): string | null => git(["remote", "get-url", "origin"]);

/**
 * The CNAME the site publishes, or null.
 *
 * The publishing workflow assembles its artifact by rsyncing the repo ROOT into `_site/`, so a
 * `CNAME` at the root is the one that would reach Pages.
 */
const publishedCname = (): string | null =>
  existsSync(`${REPO_ROOT}/CNAME`) ? readFileSync(`${REPO_ROOT}/CNAME`, "utf8") : null;

/**
 * This package's path within the repo, with its trailing slash — `workbench/`.
 *
 * DERIVED, because it is three facts at once: the prefix that turns a manifest's package-relative
 * input path into something a reader can open, the prefix `git show HEAD:` needs, and the site-relative
 * directory the bundle publishes under. Typing it would be the same defect class as typing the base URL.
 */
function packagePrefix(): string {
  const prefix = execFileSync("git", ["rev-parse", "--show-prefix"], { encoding: "utf8" }).trim();
  if (prefix.length === 0) {
    console.error("`git rev-parse --show-prefix` is empty, so this is running from the repo root "
      + "rather than from the package. Run it as `npm run check:published` from workbench/.");
    process.exit(2);
  }
  return prefix;
}

const httpGet: Fetcher = async (url) => {
  try {
    const res = await fetch(url, { redirect: "follow" });
    return { status: res.status, body: await res.text() };
  } catch (error) {
    // Converted, not swallowed. A DNS failure or a refused connection is a verdict this report must
    // carry, and `status: 0` is how `probePages` names "the request never completed".
    return { status: 0, body: error instanceof Error ? error.message : String(error) };
  }
};

/** The manifest the LIVE SITE serves, or the reason it could not be read. */
async function fetchManifest(url: string): Promise<{ manifest: BuildManifest | null; problem: string }> {
  const res = await httpGet(url);
  if (res.status === 0) return { manifest: null, problem: `unreachable at ${url}: ${res.body}` };
  if (res.status !== 200) return { manifest: null, problem: `HTTP ${res.status} at ${url}` };
  const read = readManifest(res.body);
  return read.ok ? { manifest: read.manifest, problem: "" } : { manifest: null, problem: `${read.problem} (${url})` };
}

/**
 * Each path's content hash at HEAD; null for a path HEAD does not have.
 *
 * COMMITTED bytes, not the working tree. The site cannot serve a file nobody has pushed, so a dirty
 * checkout must not read as a stale deploy — every agent in this repo is mid-edit most of the time,
 * and a gate that is red for all of them is a gate nobody runs. Uncommitted inputs are reported as a
 * NOTE beside the verdict instead.
 *
 * One `git show` per path rather than a `cat-file --batch` stream: 83 processes cost well under a
 * second against six serial HTTP round trips, and a hand-written parser over a binary batch stream is
 * a correctness risk in the one place this check must be trusted absolutely.
 */
function hashesAtHead(paths: readonly string[], prefix: string): ReadonlyMap<string, string | null> {
  const hashes = new Map<string, string | null>();
  for (const path of paths) {
    let bytes: Buffer | null;
    try {
      bytes = execFileSync("git", ["show", `HEAD:${prefix}${path}`], {
        cwd: REPO_ROOT,
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch {
      bytes = null;
    }
    hashes.set(path, bytes === null ? null : hashInput(bytes));
  }
  return hashes;
}

/** A repo-root-relative file's hash at HEAD, or null when HEAD does not have it. */
function hashAtHead(repoPath: string): string | null {
  try {
    return hashInput(execFileSync("git", ["show", `HEAD:${repoPath}`], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    }));
  } catch {
    return null;
  }
}

/** Seconds since the newest commit touching any of these repo-root-relative paths. */
const commitAge = (paths: readonly string[]): number | null => {
  if (paths.length === 0) return null;
  const stamp = git(["log", "-1", "--format=%ct", "--", ...paths]);
  if (stamp === null || stamp.length === 0) return null;
  const seconds = Number.parseInt(stamp, 10);
  return Number.isFinite(seconds) ? Math.max(0, Date.now() / 1000 - seconds) : null;
};

/** Which of these repo-root-relative paths differ between the working tree and HEAD. */
const uncommitted = (paths: readonly string[]): readonly string[] => {
  if (paths.length === 0) return [];
  const status = git(["status", "--porcelain", "--", ...paths]);
  if (status === null || status.length === 0) return [];
  return status.split("\n").map((line) => line.slice(3).trim()).filter((p) => p.length > 0);
};

// -- the run ------------------------------------------------------------------------------------

const argv = process.argv.slice(2);
/**
 * `--strict` makes a transient lag a failure.
 *
 * The DEFAULT tolerates `lagging` because a deploy legitimately takes minutes, and a gate that goes
 * red several times a day during normal pushes is a gate people learn to ignore — which is the
 * mechanism behind the failure this check exists for, one level up. `--strict` is for the caller
 * whose intent is "the thing I just pushed must be live NOW": a post-deploy wait, or a human
 * confirming a ruling shipped. Genuinely stale and unreadable are failures either way.
 */
const strict = argv.includes("--strict");

/**
 * `--grace-minutes <n>` widens or narrows the deploy window.
 *
 * The default is measured against this repo's pipeline and tested; the flag exists because that
 * pipeline's length is not a constant of nature, and because a window nobody can vary is a window
 * nobody can watch work. A caller polling for a deploy they just pushed wants it narrow; someone
 * triaging a known-slow run wants it wide. Rejected rather than ignored when unparseable: a flag that
 * silently does nothing is the accident surface `--base` already taught this file about.
 */
function graceFromArgv(args: readonly string[]): number {
  const at = args.indexOf("--grace-minutes");
  if (at === -1) return DEPLOY_GRACE_SECONDS;
  const raw = args[at + 1];
  const minutes = raw === undefined ? Number.NaN : Number(raw);
  if (!Number.isFinite(minutes) || minutes < 0) {
    console.error(`\`--grace-minutes\` needs a non-negative number of minutes; got \`${raw ?? ""}\`. `
      + `Omit it for the default (${DEPLOY_GRACE_SECONDS / 60}).`);
    process.exit(2);
  }
  return minutes * 60;
}
const graceSeconds = graceFromArgv(argv);

const resolved = deriveBase({
  remote: originRemote(),
  cname: publishedCname(),
  override: overrideFromArgv(argv),
});

if (!resolved.ok) {
  console.error(`REFUSING to probe. ${resolved.refusal}`);
  process.exit(1);
}

if (resolved.source === "override") {
  console.error("!! BASE URL OVERRIDDEN — this run says NOTHING about the site we publish to.");
  console.error(`!! Derived base ignored; probing ${resolved.base} because --base was passed.`);
}

const prefix = packagePrefix();
const head = git(["rev-parse", "--short", "HEAD"]) ?? "(unknown)";
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]) ?? "(unknown)";
console.log(`base ${resolved.base} (${resolved.source})`);
console.log(`HEAD ${head} on ${branch}`);

// -- liveness -----------------------------------------------------------------------------------

const verdicts = await probePages(resolved.base, PUBLISHED_PAGES, httpGet);
console.log("");
console.log("LIVENESS — does each declared URL answer with the page we publish?");
for (const verdict of verdicts) {
  console.log(`  ${verdict.ok ? "ok  " : "FAIL"}  ${verdict.url}`);
  if (!verdict.ok) console.error(`        ${verdict.problem}`);
}

const failures = verdicts.filter((v) => !v.ok);
console.log(`  ${verdicts.length - failures.length}/${verdicts.length} declared pages live at ${resolved.base}`);
if (failures.length > 0) {
  console.error("  A declared page is not serving as published. Either the deploy is broken, or the "
    + "page moved and PUBLISHED_PAGES was not updated with it.");
}

// -- currency -----------------------------------------------------------------------------------
//
// The manifest is fetched from the SAME base the pages were, so a mistyped or overridden base cannot
// produce a currency verdict about one site and a liveness verdict about another.

const manifestUrl = `${resolved.base}${prefix}${MANIFEST_PATH}`;
const fetched = await fetchManifest(manifestUrl);

/** The verbatim-served pages, paired with what the site actually returned for them. */
const served: readonly ServedFile[] = PUBLISHED_PAGES.flatMap((page): readonly ServedFile[] => {
  if (page.verbatimFrom === null) return [];
  const url = `${resolved.base}${page.path}`;
  const verdict = verdicts.find((v) => v.url === url);
  return [{
    url,
    source: page.verbatimFrom,
    servedHash: verdict?.bodyHash ?? null,
    headHash: hashAtHead(page.verbatimFrom),
  }];
});

const currency: CurrencyVerdict = assessCurrency({
  manifest: fetched.manifest,
  manifestProblem: fetched.problem,
  atHead: fetched.manifest === null
    ? new Map<string, string | null>()
    : hashesAtHead(Object.keys(fetched.manifest.inputs), prefix),
  served,
  commitAge,
  graceSeconds,
  packagePrefix: prefix,
});

console.log("");
console.log("CURRENCY — was what answered built from the sources at HEAD?");
console.log(`  ${currency.headline}`);
for (const line of currency.lines) console.log(`    ${line}`);

// A dirty tree is NOT drift. Reported beside the verdict so a reader who sees their own edit named
// above knows why, rather than concluding the deploy is broken.
const dirty = uncommitted([
  ...(fetched.manifest === null ? [] : Object.keys(fetched.manifest.inputs).map((p) => `${prefix}${p}`)),
  ...served.map((s) => s.source),
]);
if (dirty.length > 0) {
  console.log(`    note: ${dirty.length} of these path(s) differ in your working tree from HEAD `
    + `(${dirty.slice(0, 4).join(", ")}${dirty.length > 4 ? ", …" : ""}). The comparison is against `
    + `HEAD, so those edits are NOT part of the verdict above.`);
}
if (branch !== "(unknown)" && currency.drift.length > 0) {
  console.log(`    note: compared against HEAD on \`${branch}\`. If that is not the branch the site `
    + `deploys from, the drift above includes work that was never published.`);
}

// -- the exit code ------------------------------------------------------------------------------

const currencyFails = currency.state === "unknown" || currency.state === "stale"
  || (strict && currency.state !== "current");
console.log("");
console.log(`liveness ${failures.length === 0 ? "ok" : "FAIL"} · currency ${currency.state}`
  + ` · deploy window ${graceSeconds / 60}m${strict ? " · --strict" : ""}`);
if (currency.state === "lagging" && !strict) {
  console.log("exiting 0: a deploy in flight is not a defect. `--strict` makes it one.");
}
process.exitCode = failures.length > 0 || currencyFails ? 1 : 0;
