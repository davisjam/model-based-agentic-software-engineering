// `npm run check:published` — do the pages we publish actually serve, at the site we publish to?
//
// The logic, the URL list, and the argument for both live in `published-pages.ts`. This file is the
// impure half: it reads `origin`, reads any published CNAME, parses argv, and does the fetching. The
// split is what lets the offline tier drive the real verdict logic against a wrong-but-live site —
// a probe with no negative control is exactly what produced the near-miss this check answers.
//
// MANUAL, and deliberately not wired into `npm run all` or the publishing workflow. It reads the
// network, so it cannot sit in a hermetic tier, and it measures the site ALREADY DEPLOYED rather than
// the tree being gated. Both exclusions are declared in `test/gate-reachability.test.ts`, because an
// excluded gate and a forgotten one are indistinguishable from a script list alone.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { deriveBase, probePages, PUBLISHED_PAGES, type Fetcher } from "./published-pages.ts";

/** The repo root. npm runs a script with the package directory as cwd, which is `workbench/`. */
const REPO_ROOT = "..";

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
 * `git` exits non-zero when no such remote exists, which `execFileSync` raises. Converted to null
 * rather than swallowed: `deriveBase` turns it into a refusal that names what was found, so the
 * failure still reaches the operator with its cause attached.
 */
function originRemote(): string | null {
  try {
    return execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * The CNAME the site publishes, or null.
 *
 * The publishing workflow assembles its artifact by rsyncing the repo ROOT into `_site/`, so a
 * `CNAME` at the root is the one that would reach Pages.
 */
const publishedCname = (): string | null =>
  existsSync(`${REPO_ROOT}/CNAME`) ? readFileSync(`${REPO_ROOT}/CNAME`, "utf8") : null;

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

const resolved = deriveBase({
  remote: originRemote(),
  cname: publishedCname(),
  override: overrideFromArgv(process.argv.slice(2)),
});

if (!resolved.ok) {
  console.error(`REFUSING to probe. ${resolved.refusal}`);
  process.exit(1);
}

if (resolved.source === "override") {
  console.error("!! BASE URL OVERRIDDEN — this run says NOTHING about the site we publish to.");
  console.error(`!! Derived base ignored; probing ${resolved.base} because --base was passed.`);
}
console.log(`base ${resolved.base} (${resolved.source})`);

const verdicts = await probePages(resolved.base, PUBLISHED_PAGES, httpGet);
for (const verdict of verdicts) {
  console.log(`  ${verdict.ok ? "ok  " : "FAIL"}  ${verdict.url}`);
  if (!verdict.ok) console.error(`        ${verdict.problem}`);
}

const failures = verdicts.filter((v) => !v.ok);
console.log(`${verdicts.length - failures.length}/${verdicts.length} declared pages live at ${resolved.base}`);
if (failures.length > 0) {
  console.error("A declared page is not serving as published. Either the deploy is broken, or the "
    + "page moved and PUBLISHED_PAGES was not updated with it.");
}
process.exitCode = failures.length > 0 ? 1 : 0;
