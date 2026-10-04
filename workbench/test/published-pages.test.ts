// The published-site probe: its base-URL derivation, and that it FAILS when pointed somewhere wrong.
//
// Offline, entirely. `scripts/published-pages.ts` is pure and takes its fetcher as a parameter, so
// every case below runs with no network — `npm run test` stays hermetic. The network-touching half
// is `npm run check:published`, which has no test here by design.
//
// THE NEGATIVE CONTROL IS THE POINT. The near-miss that produced this check was a probe pointed at
// the wrong base URL; what made it survivable was that all five pages failed the same way, which
// read as a broken probe rather than a broken site. The dangerous version of that mistake is a base
// that ANSWERS — a redirect, a stale custom domain, a branch preview — so the cases below drive the
// real verdict logic with exactly that: a server returning 200 for every URL with the wrong page in
// the body. A probe that has never been seen to fail is a probe nobody has reason to believe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  deriveBase,
  probePages,
  PUBLISHED_PAGES,
  type Fetcher,
  type PublishedPage,
} from "../scripts/published-pages.ts";

/** `deriveBase` takes all three inputs; these spell only the one under test. */
const facts = (over: Partial<{ remote: string | null; cname: string | null; override: string | null }>) =>
  ({ remote: null, cname: null, override: null, ...over });

/** The derived base, or `assert.fail` — so a refusal in a success case names itself. */
function baseOf(input: Parameters<typeof deriveBase>[0]): string {
  const result = deriveBase(input);
  if (!result.ok) return assert.fail(`expected a derived base, got a refusal: ${result.refusal}`);
  return result.base;
}

/** The refusal, or `assert.fail` — so a silent guess in a refusal case names itself. */
function refusalOf(input: Parameters<typeof deriveBase>[0]): string {
  const result = deriveBase(input);
  if (result.ok) {
    return assert.fail(`expected a refusal; it derived \`${result.base}\` from \`${result.source}\``);
  }
  return result.refusal;
}

// ----------------------------------------------------------------------------------------------
// Derivation -- both remote spellings, CNAME precedence, and refusal rather than a guess
// ----------------------------------------------------------------------------------------------

test("both remote spellings derive the same Pages base", () => {
  const expected = "https://davisjam.github.io/model-based-agentic-software-engineering/";
  for (const remote of [
    "git@github.com:davisjam/model-based-agentic-software-engineering.git",
    "https://github.com/davisjam/model-based-agentic-software-engineering.git",
    "https://github.com/davisjam/model-based-agentic-software-engineering",
    // Trailing whitespace: `git remote get-url` emits a newline, and a caller may forget to trim.
    "git@github.com:davisjam/model-based-agentic-software-engineering.git\n",
  ]) {
    assert.equal(baseOf(facts({ remote })), expected,
      `\`${remote.trim()}\` must derive the Pages base, not a variant of it`);
  }
});

test("the derived base comes from the repository name, not the directory name", () => {
  // THE ACTUAL NEAR-MISS. The directory this repo is checked out into is named for the catalogue it
  // began as; the repository is not. Typing the first produced 404 on every page of a healthy site.
  const base = baseOf(facts({ remote: "git@github.com:davisjam/model-based-agentic-software-engineering.git" }));
  assert.ok(base.includes("model-based-agentic-software-engineering"),
    `the repository name must appear in the derived base, got \`${base}\``);
  assert.ok(!base.includes("governance-catalog"),
    `the derived base must not carry the checkout directory's name, got \`${base}\``);
});

test("a custom domain wins over the github.io form", () => {
  // Pages serves the site FROM the custom domain and redirects the github.io form to it, so once a
  // CNAME exists, every github.io assertion is measuring a redirect rather than the site.
  const withCname = facts({
    remote: "git@github.com:davisjam/model-based-agentic-software-engineering.git",
    cname: "mage.example.org\n",
  });
  const result = deriveBase(withCname);
  assert.ok(result.ok, "a CNAME plus a good remote must derive, not refuse");
  assert.equal(result.base, "https://mage.example.org/", "the CNAME's domain is the base, trimmed");
  assert.equal(result.source, "cname", "the report must name the custom domain as the source");
});

test("an empty or whitespace-only CNAME does not become the base", () => {
  // A CNAME file that exists and says nothing is the shape a half-finished domain migration leaves.
  // Treating it as a domain would derive `https:///`, which fails in a way that blames the network.
  const remote = "git@github.com:davisjam/model-based-agentic-software-engineering.git";
  for (const cname of ["", "   ", "\n"]) {
    assert.equal(baseOf(facts({ remote, cname })),
      "https://davisjam.github.io/model-based-agentic-software-engineering/",
      `a CNAME of ${JSON.stringify(cname)} must fall through to the github.io form`);
  }
});

test("no origin refuses, and says so", () => {
  const refusal = refusalOf(facts({ remote: null }));
  assert.match(refusal, /origin/, "the refusal must name the remote it could not read");
  assert.match(refusal, /--base/, "and must say how to probe a site explicitly");
});

test("a non-GitHub or unparseable remote refuses and names what it found", () => {
  for (const remote of [
    "git@gitlab.com:davisjam/model-based-agentic-software-engineering.git",
    "https://bitbucket.org/davisjam/repo.git",
    "/Users/davisjam/some/local/path",
    "not a url at all",
    "",
  ]) {
    const refusal = refusalOf(facts({ remote }));
    assert.match(refusal, /not a GitHub remote/,
      `\`${remote}\` must refuse rather than be coerced into a Pages URL`);
  }
});

test("a non-GitHub remote's text appears in the refusal", () => {
  // Naming what it found is the difference between a refusal someone can act on and one they retry.
  const refusal = refusalOf(facts({ remote: "git@gitlab.com:davisjam/elsewhere.git" }));
  assert.match(refusal, /gitlab\.com/, "the refusal must quote the remote it rejected");
});

test("an override derives, is marked as an override, and gains its trailing slash", () => {
  const result = deriveBase(facts({ override: "https://example.test/preview" }));
  assert.ok(result.ok, "an explicit base must be accepted");
  assert.equal(result.base, "https://example.test/preview/", "paths join onto a directory base");
  assert.equal(result.source, "override",
    "the source must be `override` so the runner can say the result is not about the real site");
});

test("an override wins over both a CNAME and a remote, and is never silently derived over", () => {
  const result = deriveBase({
    remote: "git@github.com:davisjam/model-based-agentic-software-engineering.git",
    cname: "mage.example.org",
    override: "https://example.test/",
  });
  assert.ok(result.ok && result.source === "override",
    "an explicit base must not be quietly replaced by a derived one");
});

// ----------------------------------------------------------------------------------------------
// The probe -- and the negative control it exists to survive
// ----------------------------------------------------------------------------------------------

/** A site that serves the declared shape for every declared page. */
const healthySite = (pages: readonly PublishedPage[], base: string): Fetcher => async (url) => {
  const page = pages.find((p) => `${base}${p.path}` === url);
  return page === undefined
    ? { status: 404, body: "<title>Page not found &middot; GitHub Pages</title>" }
    : { status: 200, body: `<!doctype html>${page.mustContain}<p>body</p>` };
};

const BASE = "https://davisjam.github.io/model-based-agentic-software-engineering/";

test("a healthy site passes every declared page", async () => {
  const verdicts = await probePages(BASE, PUBLISHED_PAGES, healthySite(PUBLISHED_PAGES, BASE));
  const failed = verdicts.filter((v) => !v.ok).map((v) => `${v.url}: ${v.problem}`);
  assert.deepEqual(failed, [], `a healthy site must pass:\n  ${failed.join("\n  ")}`);
  assert.ok(verdicts.length >= 5, `expected the declared pages, probed ${verdicts.length}`);
});

test("NEGATIVE CONTROL: the wrong base fails every page", async () => {
  // The literal near-miss, replayed: the directory name instead of the repository name, which Pages
  // answers with a 404 for every path under it.
  const wrong = "https://davisjam.github.io/governance-catalog/";
  const verdicts = await probePages(wrong, PUBLISHED_PAGES, healthySite(PUBLISHED_PAGES, BASE));
  assert.equal(verdicts.filter((v) => v.ok).length, 0,
    "not one page may pass against a base that serves none of them");
  assert.match(verdicts[0]?.problem ?? "", /HTTP 404/, "and the reason must be the status it got");
});

test("NEGATIVE CONTROL: a wrong-but-live base fails, which a status check alone would not", async () => {
  // The dangerous version. Every URL answers 200 — a stale custom domain, a branch preview, a 404
  // page served with 200 — and every body is the wrong page. This is the case that turns a probe
  // into a false green, and the reason each URL carries a content shape rather than just a status.
  const liveButWrong: Fetcher = async () =>
    ({ status: 200, body: "<!doctype html><title>Some other site</title><p>Index of /</p>" });
  const verdicts = await probePages(BASE, PUBLISHED_PAGES, liveButWrong);
  const passed = verdicts.filter((v) => v.ok).map((v) => v.url);
  assert.deepEqual(passed, [], `a 200 is not a page; these passed on status alone:\n  ${passed.join("\n  ")}`);
  for (const verdict of verdicts) {
    assert.match(verdict.problem, /does not contain/,
      `${verdict.url} must fail on its content shape, not be reported as a status failure`);
  }
});

test("a single wrong page fails alone, so the report attributes the breakage", async () => {
  // A uniform failure reads as a broken probe; that is what saved the near-miss and also what hides
  // one genuinely broken page. One page must be able to fail by itself.
  const target = PUBLISHED_PAGES[2];
  assert.ok(target !== undefined, "the declaration must hold enough pages to single one out");
  const oneBroken: Fetcher = async (url) =>
    url === `${BASE}${target.path}`
      ? { status: 200, body: "<title>Page not found &middot; GitHub Pages</title>" }
      : healthySite(PUBLISHED_PAGES, BASE)(url);
  const verdicts = await probePages(BASE, PUBLISHED_PAGES, oneBroken);
  const failed = verdicts.filter((v) => !v.ok);
  assert.equal(failed.length, 1, "exactly the broken page must fail");
  assert.equal(failed[0]?.url, `${BASE}${target.path}`, "and the report must name which one");
});

test("a request that never completes is a failure, not a pass", async () => {
  // `status: 0` is how the fetcher reports a DNS failure or a refused connection. An unreachable
  // site must never read as a green one — unknown is the state this check refuses to report as ok.
  const unreachable: Fetcher = async () => ({ status: 0, body: "getaddrinfo ENOTFOUND nope.invalid" });
  const verdicts = await probePages(BASE, PUBLISHED_PAGES, unreachable);
  assert.equal(verdicts.filter((v) => v.ok).length, 0, "an unreachable site passes nothing");
  assert.match(verdicts[0]?.problem ?? "", /did not complete/,
    "and the problem must distinguish a dead connection from a bad status");
});

// ----------------------------------------------------------------------------------------------
// The declaration itself
// ----------------------------------------------------------------------------------------------

test("every declared page carries a distinct path and a content shape with a stated reason", () => {
  const paths = PUBLISHED_PAGES.map((p) => p.path);
  assert.deepEqual([...new Set(paths)], paths, "a duplicated path checks one page twice and another never");
  for (const page of PUBLISHED_PAGES) {
    assert.ok(!page.path.startsWith("/"),
      `\`${page.path}\` starts with a slash; paths join onto a base that already ends with one`);
    assert.ok(page.mustContain.trim().length > 0,
      `\`${page.path}\` declares no content shape, so a 404 served with 200 would pass it`);
    assert.ok(page.why.trim().length >= 40,
      `\`${page.path}\` does not say why its content shape identifies it. An unexplained shape gets `
      + `"fixed" by whoever it fails on next.`);
  }
});

test("a verbatim-served page names a committed file that exists, and the pair is comparable", () => {
  // `verbatimFrom` is the CURRENCY half of a row: a page the deploy rsyncs unchanged can have its
  // served bytes compared against HEAD, which is the only way a stale APP SHELL is detected (no
  // bundle input covers index.html, and that is the file the 261003 staleness was first seen in). A
  // row naming a file that is not there would silently contribute no currency signal at all.
  const verbatim = PUBLISHED_PAGES.filter((p) => p.verbatimFrom !== null);
  assert.ok(verbatim.length >= 2,
    `only ${verbatim.length} page(s) are declared verbatim-served; the two workbench shells are, and `
    + `they are the pages this package owns`);
  for (const page of verbatim) {
    const source = page.verbatimFrom ?? "";
    assert.ok(!source.startsWith("/") && !source.startsWith(".."),
      `\`${source}\` must be repo-root-relative, which is how check-published resolves it`);
    assert.ok(existsSync(`../${source}`),
      `\`${page.path}\` claims to be served verbatim from \`${source}\`, which does not exist`);
  }
});

test("the shells this package owns are the ones declared verbatim", () => {
  // Pinned by ROLE rather than by count: a page built in CI (catalog.py's landing, MkDocs's course,
  // Typst's book) has no committed bytes to compare, so declaring one verbatim would compare a
  // generator's artifact and report permanent false drift.
  const sources = PUBLISHED_PAGES.map((p) => p.verbatimFrom).filter((s) => s !== null);
  for (const shell of ["workbench/index.html", "workbench/learn.html"]) {
    assert.ok(sources.includes(shell),
      `${shell} is hand-authored and rsynced unchanged, so its staleness is detectable; it must be `
      + `declared verbatim or the currency check is blind to the app shell`);
  }
});

test("a served page's body is hashed only when the right page arrived", async () => {
  // The hash feeds the currency comparison. Hashing a 404 body would compare GitHub's 404 page
  // against our shell and report drift forever, so a failed verdict carries null instead.
  const live = await probePages(BASE, PUBLISHED_PAGES, healthySite(PUBLISHED_PAGES, BASE));
  for (const verdict of live) {
    assert.notEqual(verdict.bodyHash, null, `${verdict.url} passed, so its body must be hashed`);
  }
  const wrong: Fetcher = async () => ({ status: 404, body: "<title>Page not found</title>" });
  for (const verdict of await probePages(BASE, PUBLISHED_PAGES, wrong)) {
    assert.equal(verdict.bodyHash, null,
      `${verdict.url} did not arrive, so there is nothing whose hash means anything`);
  }
});

test("the real origin derives the base this check is pinned to", () => {
  // The one test that reads the machine, and it reads `git`, not the network. This is the assertion
  // the near-miss needed: the base is a fact about the repository, checkable without leaving it.
  const remote = execFileSync("git", ["remote", "get-url", "origin"], {
    encoding: "utf8",
    cwd: "..",
  }).trim();
  assert.equal(baseOf(facts({ remote })), BASE,
    `\`origin\` is \`${remote}\`, which does not derive the base the probe tests are written against`);
});
