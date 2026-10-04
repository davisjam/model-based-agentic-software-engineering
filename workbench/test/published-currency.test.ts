// The published-site currency check: that it reports CURRENT when the site matches HEAD, and that it
// reports STALE when it does not.
//
// Offline, entirely. `scripts/published-currency.ts` is pure and takes its clock, its hashes and its
// commit dating as parameters, so every case below runs with no network, no deploy and no `git`.
//
// THE NEGATIVE CONTROLS ARE THE POINT, and this file's subject is the reason. On 261003
// `check:published` reported `6/6 declared pages live` over six pages that were all the PREVIOUS
// build. The check was correct and useless: it measured liveness and was read as currency. A
// freshness check with no demonstration that it can report stale would be that failure repeated one
// level up — a green line nobody has watched go red.
//
// So the drift is synthesised in both directions. A published manifest whose hashes match HEAD must
// report CURRENT; the same manifest with one hash altered must report the drift, name the file, and
// FAIL. And the dating that separates a deploy in flight from a deploy that never happened is driven
// at both ends of its window, because a check that cries wolf during every normal push is a check
// people learn to ignore, which is the mechanism behind the original failure.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hashInput, HASH_LENGTH, MANIFEST_PATH, readManifest } from "../scripts/build-manifest.ts";
import {
  assessCurrency,
  DEPLOY_GRACE_SECONDS,
  humanAge,
  type CurrencyFacts,
  type ServedFile,
} from "../scripts/published-currency.ts";

const PREFIX = "workbench/";

/** A published manifest over three inputs, with the hashes a matching HEAD would produce. */
const PUBLISHED = {
  builtAt: "2026-10-03T12:00:00.000Z",
  inputs: {
    "src/ir/hash.ts": "ed3603c1a5eba4a5",
    "src/ui/shell/header.ts": "1111111111111111",
    "mage-model.schema.json": "2222222222222222",
  },
} as const;

/** HEAD agreeing with the published manifest on every input. */
const matchingHead = (): Map<string, string | null> => new Map(Object.entries(PUBLISHED.inputs));

/** `assessCurrency` takes nine fields; this spells only the ones a case is about. */
const facts = (over: Partial<CurrencyFacts>): CurrencyFacts => ({
  manifest: PUBLISHED,
  manifestProblem: "",
  atHead: matchingHead(),
  served: [],
  commitAge: () => 0,
  graceSeconds: DEPLOY_GRACE_SECONDS,
  packagePrefix: PREFIX,
  ...over,
});

/** Minutes, as the `commitAge` injection wants them. */
const minutesAgo = (minutes: number) => (): number => minutes * 60;

// ----------------------------------------------------------------------------------------------
// The hash -- one definition, pinned, because it is the manifest's wire format
// ----------------------------------------------------------------------------------------------

test("the hash is sha256 truncated to a fixed width, and the width is part of the wire format", () => {
  // PINNED against a known digest on purpose. Changing the algorithm or the width invalidates every
  // manifest already published: a producer slicing 16 and a consumer slicing 12 would report drift in
  // every file forever and blame the tree, which is the one failure a staleness check cannot survive.
  const digest = hashInput("mage");
  assert.equal(digest.length, HASH_LENGTH, "the width is declared, not incidental");
  assert.equal(digest, "6661473579cc99d9",
    "sha256('mage') truncated — if this moved, so did the comparison every consumer makes");
  assert.equal(hashInput(Buffer.from("mage", "utf8")), digest,
    "bytes and their utf8 string must hash alike: build.mjs passes a Buffer, the site probe a body string");
  assert.notEqual(hashInput("mage "), digest, "a one-byte change must change the hash");
});

test("no consumer carries its own copy of the hash", () => {
  // THE PARITY HAZARD, held structurally. Before scripts/build-manifest.ts there were two
  // hand-written copies of the sliced-sha256 expression — build.mjs and the browser harness — and
  // this check's own arrival would have made a third. Two implementations that must agree is exactly
  // what the comparison exists to be free of, so the ban is on the shape rather than on a comment.
  const consumers = ["build.mjs", "test/browser/harness.mjs", "scripts/published-pages.ts"];
  for (const path of consumers) {
    const code = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");
    assert.ok(!/createHash\s*\(/.test(code),
      `${path} builds its own digest. Import \`hashInput\` from scripts/build-manifest.ts — the whole `
      + `claim of this check is that producer and consumer compute the same number.`);
    assert.match(code, /build-manifest\.ts"/,
      `${path} must reach the hash through the shared module`);
  }
});

test("the manifest path is declared once, and the build writes there", () => {
  assert.match(readFileSync("build.mjs", "utf8"), /MANIFEST_PATH/,
    "build.mjs must write to the declared path rather than spelling it again");
  assert.equal(MANIFEST_PATH, "dist/build-manifest.json",
    "the site serves this path under workbench/; a move needs the publishing workflow checked");
});

// ----------------------------------------------------------------------------------------------
// Reading a fetched manifest -- every malformed shape is reachable in production
// ----------------------------------------------------------------------------------------------

test("a real manifest reads back", () => {
  const read = readManifest(JSON.stringify(PUBLISHED));
  assert.ok(read.ok, "a well-formed manifest must parse");
  assert.equal(Object.keys(read.manifest.inputs).length, Object.keys(PUBLISHED.inputs).length);
});

test("every way a fetched body is NOT a manifest is named, not thrown", () => {
  // The caller is reading an HTTP body: a Pages 404 page is HTML, a truncated file is bad JSON, and a
  // deploy that shipped dist/ without building writes nothing. Each must produce a sentence rather
  // than a TypeError from a property access on undefined.
  const cases: readonly [string, RegExp][] = [
    ["<!doctype html><title>Page not found", /not JSON/],
    ["{\"builtAt\":\"x\",\"inputs\":{", /not JSON/],
    ["[1,2,3]", /array/],
    ["\"a string\"", /string/],
    ["{\"builtAt\":\"x\"}", /no `inputs` map/],
    ["{\"inputs\":{}}", /no entries/],
    ["{\"inputs\":{\"a.ts\":42}}", /not a hash string/],
  ];
  for (const [body, expected] of cases) {
    const read = readManifest(body);
    assert.ok(!read.ok, `\`${body.slice(0, 30)}\` must not read as a manifest`);
    assert.match(read.problem, expected, `and the problem must say why, for \`${body.slice(0, 30)}\``);
  }
});

test("a 404 page's problem names the likely cause, because that is the common case", () => {
  const read = readManifest("<!doctype html>\n<html><title>404</title>");
  assert.ok(!read.ok);
  assert.match(read.problem, /HTML/, "the reader should not have to guess that they fetched a 404 page");
});

// ----------------------------------------------------------------------------------------------
// CURRENT -- the state the gate is supposed to spend its life in
// ----------------------------------------------------------------------------------------------

test("a live site whose inputs match HEAD is CURRENT, and nothing is named", () => {
  const verdict = assessCurrency(facts({}));
  assert.equal(verdict.state, "current");
  assert.deepEqual(verdict.drift, [], "a matching site must name no drift");
  assert.match(verdict.headline, /CURRENT/);
  assert.match(verdict.headline, /bundle inputs/, "the headline should say how much was compared");
});

test("CURRENT does not depend on builtAt, in either direction", () => {
  // THE TRAP THIS CHECK WAS BUILT TO AVOID. A timestamp dates a BUILD, not a SOURCE: an old
  // timestamp over a current tree is fine and a fresh one over the wrong commit is not, and a
  // timestamp comparison calls both the same. The verdict must be invariant to it.
  const ancient = assessCurrency(facts({ manifest: { builtAt: "2019-01-01T00:00:00.000Z", inputs: PUBLISHED.inputs } }));
  assert.equal(ancient.state, "current",
    "a years-old build of the current sources is CURRENT — nothing has changed since it ran");
  const fresh = assessCurrency(facts({
    manifest: { builtAt: new Date().toISOString(), inputs: { ...PUBLISHED.inputs, "src/ir/hash.ts": "deadbeefdeadbeef" } },
    commitAge: minutesAgo(600),
  }));
  assert.equal(fresh.state, "stale",
    "a build that ran seconds ago from the wrong commit is STALE — recency is not currency");
});

test("an absent builtAt is reported as absent rather than crashing the verdict", () => {
  const read = readManifest(JSON.stringify({ inputs: PUBLISHED.inputs }));
  assert.ok(read.ok, "builtAt is diagnostic, so its absence must not make the manifest unreadable");
  assert.equal(read.manifest.builtAt, "(absent)");
});

// ----------------------------------------------------------------------------------------------
// STALE -- the negative control, in the shape the near-miss actually had
// ----------------------------------------------------------------------------------------------

test("NEGATIVE CONTROL: one altered input hash makes the site STALE, and the file is NAMED", () => {
  // Synthesised exactly as the brief describes: the published manifest with one hash changed. The
  // report must say WHICH file, because "stale" alone sends the reader hunting through 83 inputs.
  const drifted = { ...PUBLISHED.inputs, "src/ui/shell/header.ts": "0000000000000000" };
  const verdict = assessCurrency(facts({
    manifest: { builtAt: PUBLISHED.builtAt, inputs: drifted },
    commitAge: minutesAgo(180),
  }));
  assert.equal(verdict.state, "stale", "a three-hour-old change the site does not have is not a deploy in flight");
  assert.equal(verdict.drift.length, 1, "exactly the altered input must be reported");
  assert.equal(verdict.drift[0]?.path, `${PREFIX}src/ui/shell/header.ts`,
    "the path must be repo-root-relative so it can be pasted into an editor");
  assert.match(verdict.drift[0]?.problem ?? "", /0000000000000000/, "the live hash must appear");
  assert.match(verdict.drift[0]?.problem ?? "", /1111111111111111/, "and the hash at HEAD");
  assert.ok(verdict.lines.some((l) => l.includes("src/ui/shell/header.ts")),
    "and the named path must reach the printed report, not only the structured drift");
});

test("the report names several drifted files and counts the rest", () => {
  // The 261003 symptom was a whole-build lag, not one file. The report must stay readable at that
  // size while still being specific — a bare count sends the reader hunting, a dump of 83 paths is
  // scrolled past.
  const many: Record<string, string> = {};
  for (let i = 0; i < 20; i += 1) many[`src/gen-${i}.ts`] = "aaaaaaaaaaaaaaaa";
  const head = new Map<string, string | null>(Object.keys(many).map((p) => [p, "bbbbbbbbbbbbbbbb"]));
  const verdict = assessCurrency(facts({
    manifest: { builtAt: PUBLISHED.builtAt, inputs: many },
    atHead: head,
    commitAge: minutesAgo(600),
  }));
  assert.equal(verdict.state, "stale");
  assert.equal(verdict.drift.length, 20, "every drifted input must be in the structured verdict");
  assert.ok(verdict.lines.some((l) => /and \d+ more/.test(l)),
    "and the printed report must say how many it did not name");
  assert.ok(verdict.lines.filter((l) => l.includes("src/gen-")).length < 20,
    "the printed report must not dump all of them");
});

test("NEGATIVE CONTROL: a stale verbatim-served PAGE is caught, which no bundle input covers", () => {
  // The gap a manifest-only check leaves, and the file the 261003 staleness was first SEEN in.
  // esbuild never reads index.html, so a manifest comparison reports CURRENT over a stale app shell
  // — `max-width: 84rem` still present, one `href="learn.html"` where the ruling had put two.
  const served: readonly ServedFile[] = [{
    url: "https://example.test/workbench/",
    source: "workbench/index.html",
    servedHash: "5555555555555555",
    headHash: "6666666666666666",
  }];
  const verdict = assessCurrency(facts({ served, commitAge: minutesAgo(240) }));
  assert.equal(verdict.state, "stale", "a stale shell is staleness even when every bundle input matches");
  assert.equal(verdict.drift.length, 1);
  assert.equal(verdict.drift[0]?.kind, "served-file", "and it must be attributed to the page, not the bundle");
  assert.equal(verdict.drift[0]?.path, "workbench/index.html");
});

test("a verbatim page that matches HEAD contributes no drift, and is counted", () => {
  const served: readonly ServedFile[] = [{
    url: "https://example.test/workbench/",
    source: "workbench/index.html",
    servedHash: "5555555555555555",
    headHash: "5555555555555555",
  }];
  const verdict = assessCurrency(facts({ served }));
  assert.equal(verdict.state, "current");
  assert.match(verdict.headline, /verbatim-served/, "the headline must say the pages were compared too");
});

test("a page that never arrived is NOT counted as currency drift", () => {
  // It is the LIVENESS report's finding. Counting it twice would blame a deploy for a DNS failure and
  // would make one broken page read as two independent problems.
  const served: readonly ServedFile[] = [{
    url: "https://example.test/workbench/",
    source: "workbench/index.html",
    servedHash: null,
    headHash: "5555555555555555",
  }];
  const verdict = assessCurrency(facts({ served }));
  assert.equal(verdict.state, "current", "a dead page is a liveness failure, reported there");
  assert.deepEqual(verdict.drift, []);
});

// ----------------------------------------------------------------------------------------------
// The mid-deploy window -- the distinction that decides whether anyone keeps reading the gate
// ----------------------------------------------------------------------------------------------

test("drift from a change made minutes ago is LAGGING, not stale", () => {
  // A push lands and CI takes minutes; during that window the live site is legitimately behind. If
  // that reported the same hard failure as a deploy that never ran, the gate would go red several
  // times a day on healthy pushes — and a gate that cries wolf is how the original failure happened.
  const verdict = assessCurrency(facts({
    manifest: { builtAt: PUBLISHED.builtAt, inputs: { ...PUBLISHED.inputs, "src/ir/hash.ts": "cccccccccccccccc" } },
    commitAge: minutesAgo(3),
  }));
  assert.equal(verdict.state, "lagging");
  assert.match(verdict.headline, /LAGGING/);
  assert.match(verdict.headline, /3m ago/, "the headline must date the drift, not just classify it");
  assert.ok(verdict.lines.some((l) => l.includes("--strict")),
    "and must point at the flag for a caller who wants this to be a failure");
  assert.equal(verdict.drift.length, 1, "lagging still names the files — it is a timing claim, not a blind spot");
});

test("the window has both edges, and they are driven", () => {
  const drifted = { ...PUBLISHED.inputs, "src/ir/hash.ts": "cccccccccccccccc" };
  const at = (seconds: number) => assessCurrency(facts({
    manifest: { builtAt: PUBLISHED.builtAt, inputs: drifted },
    commitAge: () => seconds,
  })).state;
  assert.equal(at(0), "lagging", "a commit from this second is a deploy that has not started");
  assert.equal(at(DEPLOY_GRACE_SECONDS - 1), "lagging", "just inside the window is still in flight");
  assert.equal(at(DEPLOY_GRACE_SECONDS), "lagging", "the boundary itself is inclusive");
  assert.equal(at(DEPLOY_GRACE_SECONDS + 1), "stale", "past it, nothing is coming");
});

test("undateable drift is STALE, because the grace window is for a measured wait", () => {
  // `git log` returning nothing for the drifted paths means the age is unknown, and granting the
  // benefit of the doubt to the unmeasured case is how a tolerance becomes a blind spot.
  const verdict = assessCurrency(facts({
    manifest: { builtAt: PUBLISHED.builtAt, inputs: { ...PUBLISHED.inputs, "src/ir/hash.ts": "cccccccccccccccc" } },
    commitAge: () => null,
  }));
  assert.equal(verdict.state, "stale");
  assert.equal(verdict.ageSeconds, null);
  assert.ok(verdict.lines.some((l) => /could not be dated|no date/.test(l)),
    "and the report must say the dating failed rather than implying a measurement");
});

test("an age is rendered as something a reader can judge against a deploy", () => {
  assert.equal(humanAge(0), "0s");
  assert.equal(humanAge(45), "45s");
  assert.equal(humanAge(4 * 60), "4m");
  assert.equal(humanAge(72 * 60), "1h 12m");
});

// ----------------------------------------------------------------------------------------------
// Unknown -- the state that must never read as agreement
// ----------------------------------------------------------------------------------------------

test("NEGATIVE CONTROL: an unreadable manifest is UNKNOWN and fails, never a pass", () => {
  const verdict = assessCurrency(facts({ manifest: null, manifestProblem: "HTTP 404 at /workbench/dist/build-manifest.json" }));
  assert.equal(verdict.state, "unknown");
  assert.match(verdict.headline, /UNKNOWN/);
  assert.ok(verdict.lines.some((l) => l.includes("HTTP 404")),
    "the reason must reach the report — the caller knows the URL, the reader does not");
  assert.deepEqual(verdict.drift, [], "unknown names no files: nothing was compared");
});

test("an input the published build read and HEAD does not have points AWAY from a stale deploy", () => {
  // The site may be AHEAD: a local checkout behind the published branch produces this, and chasing a
  // deploy would be the wrong move. The message must say which way the gap runs.
  const verdict = assessCurrency(facts({
    atHead: new Map<string, string | null>([...matchingHead(), ["src/ir/hash.ts", null]]),
    commitAge: minutesAgo(600),
  }));
  assert.equal(verdict.state, "stale");
  assert.match(verdict.drift[0]?.problem ?? "", /HEAD does not have it/);
  assert.match(verdict.drift[0]?.problem ?? "", /behind the branch/,
    "and must name the likelier explanation rather than leaving the reader to invert it");
});

test("an input nobody measured is reported as unmeasured, not as agreement", () => {
  // A gathering failure must not silently narrow the comparison. This is the difference between "83
  // inputs match" and "82 matched and one was never looked at".
  const partial = matchingHead();
  partial.delete("src/ir/hash.ts");
  const verdict = assessCurrency(facts({ atHead: partial, commitAge: minutesAgo(600) }));
  assert.notEqual(verdict.state, "current", "an unmeasured input must not pass as a match");
  assert.match(verdict.drift[0]?.problem ?? "", /not measured/);
});

// ----------------------------------------------------------------------------------------------
// The declaration -- every published page decides whether it is verbatim-comparable
// ----------------------------------------------------------------------------------------------

test("the grace window is long enough for this repo's publishing workflow", () => {
  // Not taste: the workflow runs `npm ci` three times, the workbench gates, the esbuild bundle, two
  // browser tiers in headless Chromium, a Typst book PDF and ePub, a second Typst handbook render, a
  // MkDocs course build and the catalogue render, then uploads and propagates. A window under ten
  // minutes would report STALE during ordinary pushes.
  assert.ok(DEPLOY_GRACE_SECONDS >= 10 * 60,
    `a ${humanAge(DEPLOY_GRACE_SECONDS)} window is shorter than this pipeline, so healthy pushes would `
    + `report STALE and the gate would be ignored`);
  assert.ok(DEPLOY_GRACE_SECONDS <= 60 * 60,
    `a ${humanAge(DEPLOY_GRACE_SECONDS)} window is long enough to hide a deploy that failed outright`);
});
