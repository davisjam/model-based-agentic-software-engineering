// The Node preflight's decisions, and that it REFUSES the Node the gates cannot run on.
//
// NO SECOND RUNTIME. The obvious test spawns Node 20 and asserts the message; it would need a second
// Node installed on every machine and in CI, which turns a 30ms check into an infrastructure
// dependency and makes the suite SKIP where that install is missing — a skip being the failure mode
// this whole wave is about. So the decision is a pure function over `{running, floor, pin}` and the
// cases below hand it the versions directly. The only thing a real Node 20 adds is confidence that
// the file LOADS there, which is a property of its extension rather than of its logic: it is `.mjs`
// for exactly that reason, and a `.ts` preflight is unloadable on the Node it exists to diagnose.
// (Verified by hand on 261003 against Node 20.17.0: the message below is what prints, and
// `npm run check:parity` exits 1 from the `precheck:parity` hook without ever reaching the .ts file.)
//
// WHY THIS FILE IS .mjs. It tests a `.mjs` module, and `tsc` cannot import one without `allowJs`,
// which would pull every `.mjs` in the package into the type program. `npm test` globs
// `test/*.test.mjs` alongside the `.ts` tier so the node tier still reaches it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { assessNode, locateNvmrc, parseFloor, parsePin, parseRunning } from "../scripts/node-version.mjs";

/** The real declarations, so a case can be written against the shape the repo actually has. */
const FLOOR_SPEC = ">=22";

/** `assessNode` takes all six fields; this spells only the ones a case is about. */
const facts = (over) => ({
  running: "24.21.0",
  floor: 22,
  floorSpec: FLOOR_SPEC,
  pin: 24,
  pinSpec: "24",
  pinFrom: "../.nvmrc",
  ...over,
});

// ----------------------------------------------------------------------------------------------
// Reading the two declarations -- each from its own file, neither copied
// ----------------------------------------------------------------------------------------------

test("an engines range yields its floor, in every spelling this package might use", () => {
  for (const spec of [">=22", ">= 22", ">=22.0.0", "^22", "^22.1.3", "22.x", ">=22 <25"]) {
    assert.equal(parseFloor(spec), 22, `\`${spec}\` must read as a floor of 22`);
  }
});

test("an unreadable engines range yields null rather than a default", () => {
  // A default would be a THIRD copy of the number, invented at the moment the declaration broke —
  // which is the direction of error that hides the breakage instead of reporting it.
  for (const spec of ["", "*", "latest", undefined, null, 22]) {
    assert.equal(parseFloor(spec), null, `${JSON.stringify(spec)} is not a readable floor`);
  }
});

test("a .nvmrc yields its major, in nvm's spellings", () => {
  for (const text of ["24", "24\n", " 24 \n", "v24", "v24.21.0", "24.21.0"]) {
    assert.equal(parsePin(text), 24, `\`${JSON.stringify(text)}\` must read as a pin of 24`);
  }
});

test("an nvm ALIAS yields null, because it names no version to compare against", () => {
  // `lts/*` resolves to whatever is current, which this file cannot see. Reporting that beats
  // guessing, and beats silently treating the alias as "no requirement".
  for (const text of ["lts/*", "lts/iron", "node", "system", "", "\n"]) {
    assert.equal(parsePin(text), null, `\`${JSON.stringify(text)}\` is not a major version`);
  }
});

test("the running version parses the same way the pin does", () => {
  assert.equal(parseRunning("24.21.0"), 24);
  assert.equal(parseRunning("20.17.0"), 20);
  assert.equal(parseRunning("not a version"), null);
});

test("the .nvmrc search takes the nearest hit and reports none rather than guessing", () => {
  const exists = (path) => path === "../../.nvmrc";
  assert.equal(locateNvmrc(["../.nvmrc", "../../.nvmrc"], exists), "../../.nvmrc",
    "the search must find a pin that is not in the first candidate directory");
  assert.equal(locateNvmrc(["../.nvmrc", "../../.nvmrc"], () => true), "../.nvmrc",
    "a nearer pin wins, so a future package-local .nvmrc overrides the repo's without an edit here");
  assert.equal(locateNvmrc(["../.nvmrc"], () => false), null,
    "no pin anywhere must be reported, not substituted");
});

// ----------------------------------------------------------------------------------------------
// The decision -- and the refusal this file exists for
// ----------------------------------------------------------------------------------------------

test("NEGATIVE CONTROL: Node 20 is REFUSED, and the message names problem, versions and fix", () => {
  // The exact failure of 261003. Everything a reader needs must be in this one message, because the
  // alternative they reached for last time was reading the gate's source for a defect that was not there.
  const verdict = assessNode(facts({ running: "20.17.0" }));
  assert.equal(verdict.level, "too-old", "Node 20 must be rejected, not warned about");
  assert.equal(verdict.ok, false, "and the gates must not proceed");
  assert.match(verdict.message, /20\.17\.0/, "the message must name the version in use");
  assert.match(verdict.message, />=22/, "and the required floor");
  assert.match(verdict.message, /\b24\b/, "and the pinned version");
  assert.match(verdict.message, /\.nvmrc/, "and where the pin came from");
  assert.match(verdict.message, /nvm use/, "and the fix");
  assert.match(verdict.message, /ERR_UNKNOWN_FILE_EXTENSION/,
    "and the error it is standing in for, so the next person who sees that error recognises it");
});

test("every Node below the floor is refused, not just the one that cost us time", () => {
  for (const running of ["21.7.3", "20.17.0", "18.20.4", "16.20.2"]) {
    const verdict = assessNode(facts({ running }));
    assert.equal(verdict.level, "too-old", `Node ${running} is under the floor and must be refused`);
  }
});

test("the pinned Node passes, with nothing to say", () => {
  const verdict = assessNode(facts({ running: "24.21.0" }));
  assert.equal(verdict.level, "ok");
  assert.equal(verdict.ok, true);
});

test("a Node over the floor but off the pin WARNS and continues", () => {
  // Refusing here would be the other failure: 26 runs these gates fine, and a preflight that blocks
  // a working runtime gets removed rather than obeyed. CI installs the pin, so the difference is
  // worth a line on stderr -- it is the "works locally, fails in CI" surface.
  for (const running of ["22.11.0", "26.0.0"]) {
    const verdict = assessNode(facts({ running }));
    assert.equal(verdict.level, "off-pin", `Node ${running} satisfies the floor`);
    assert.equal(verdict.ok, true, `Node ${running} must not be blocked`);
    assert.match(verdict.message, /pins 24/, "the warning must say what the pin is");
  }
});

test("NEGATIVE CONTROL: an unreadable declaration is reported, never defaulted past", () => {
  const noFloor = assessNode(facts({ floor: null, floorSpec: "(absent)" }));
  assert.equal(noFloor.ok, false, "a package that no longer says which Node it needs must not pass");
  assert.match(noFloor.message, /engines\.node/, "and the message must name the field");

  const noPin = assessNode(facts({ pin: null, pinSpec: "lts/*" }));
  assert.equal(noPin.ok, false, "an unresolvable pin must not pass");
  assert.match(noPin.message, /lts\/\*/, "the message must quote what it read");
  assert.match(noPin.message, /second copy/,
    "and must steer away from the obvious wrong fix, which is to hardcode the number here");

  const noVersion = assessNode(facts({ running: "???" }));
  assert.equal(noVersion.ok, false, "an unreadable running version must not pass");
});

test("NEGATIVE CONTROL: a pin below the floor is reported as the contradiction it is", () => {
  // The join between the two declarations. Each is single-source on its own; nothing but this would
  // notice them disagreeing, and a disagreement makes every verdict derived from them worthless.
  const verdict = assessNode(facts({ running: "22.11.0", pin: 20, pinSpec: "20" }));
  assert.equal(verdict.level, "contradiction");
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /does not satisfy/, "the message must say which way the conflict runs");
});

test("a broken declaration outranks a wrong runtime", () => {
  // Order matters: with no readable floor, "too old" would be a guess, and this wave is about
  // guesses reported as verdicts.
  const verdict = assessNode(facts({ running: "20.17.0", floor: null, floorSpec: "(absent)" }));
  assert.equal(verdict.level, "undeclared",
    "with no floor to compare against, the finding is the missing floor");
});

// ----------------------------------------------------------------------------------------------
// The real files -- the one place this reads the repo instead of a fixture
// ----------------------------------------------------------------------------------------------

test("the repo's own .nvmrc and engines.node both parse, and the pin satisfies the floor", () => {
  // The live join. Tests run with workbench/ as the cwd.
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  const floorSpec = manifest.engines?.node;
  const floor = parseFloor(floorSpec);
  assert.notEqual(floor, null,
    `package.json engines.node is ${JSON.stringify(floorSpec)}, which the preflight cannot read`);

  const pinPath = ["../.nvmrc", "../../.nvmrc"].find((p) => existsSync(p));
  assert.notEqual(pinPath, undefined,
    "no .nvmrc above this package — the preflight derives the pin from it and has no fallback");
  const pinSpec = readFileSync(pinPath, "utf8");
  const pin = parsePin(pinSpec);
  assert.notEqual(pin, null, `${pinPath} reads ${JSON.stringify(pinSpec)}, which is not a major version`);

  assert.ok(pin >= floor,
    `${pinPath} pins Node ${pin} and package.json requires ${floorSpec}; the two declarations disagree`);
});

test("the Node running this suite passes its own preflight", () => {
  // Trivially true while the suite runs at all -- and that is the point. It pins the function to
  // reality, so a refactor that made `assessNode` reject every version would fail here rather than
  // only in a stranger's shell.
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  const pinPath = ["../.nvmrc", "../../.nvmrc"].find((p) => existsSync(p));
  const verdict = assessNode({
    running: process.versions.node,
    floor: parseFloor(manifest.engines?.node),
    floorSpec: manifest.engines?.node,
    pin: parsePin(readFileSync(pinPath, "utf8")),
    pinSpec: readFileSync(pinPath, "utf8").trim(),
    pinFrom: pinPath,
  });
  assert.equal(verdict.ok, true,
    `the Node running this suite (${process.versions.node}) fails the preflight: ${verdict.message}`);
});

// ----------------------------------------------------------------------------------------------
// The wiring -- a preflight nobody reaches is the failure class one level up
// ----------------------------------------------------------------------------------------------

test("every gate that loads a .ts entry point carries a pre hook that runs the preflight", () => {
  // npm runs `pre<name>` automatically, which is what makes this wiring independent of anyone
  // remembering it. DERIVED from the script bodies rather than listed: a new gate that invokes
  // `node something.ts` joins the policed set by existing, which is the lesson
  // test/gate-reachability.test.ts was written for.
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  const PREFLIGHT = "check:node";
  assert.equal(typeof scripts[PREFLIGHT], "string", `there must be a \`${PREFLIGHT}\` script to hook`);

  // `node <something>.ts`, not merely "a .ts is mentioned". `types` writes .ts files with json2ts and
  // runs on any Node; requiring a hook there would be a false positive, and a check with those gets
  // switched off. The `node` must be a command word, so `npm run check:node` does not match.
  const loadsTypeScript = (body) => /(?:^|\s)node\s/.test(body) && /\.ts\b/.test(body);
  const needsHook = Object.entries(scripts)
    .filter(([name, body]) => !name.startsWith("pre") && name !== PREFLIGHT && loadsTypeScript(body))
    .map(([name]) => name);
  assert.ok(needsHook.length >= 3,
    `only ${needsHook.length} script(s) were seen to load a .ts entry point — the scan is wrong`);

  const unhooked = needsHook.filter((name) => {
    const hook = scripts[`pre${name}`];
    return hook === undefined || !hook.includes(PREFLIGHT);
  });
  assert.deepEqual(unhooked, [],
    `these gates load a .ts entry point with no \`pre\` hook running \`${PREFLIGHT}\`, so under a Node `
    + `below the floor they die with ERR_UNKNOWN_FILE_EXTENSION instead of saying which Node is wrong: `
    + `${unhooked.join(", ")}`);
});

test("the .mjs entry points that IMPORT a .ts module are hooked too", () => {
  // The scan above reads script BODIES, and `node build.mjs` names no .ts file. The requirement is
  // real anyway: both of these reach a .ts module through an import, so they need the same floor as
  // the gates that name one outright. The import is ASSERTED rather than assumed, so if the shared
  // hash module moves the premise of the hook moves visibly with it.
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  const importers = [
    { file: "build.mjs", hooks: ["prebuild"] },
    { file: "test/browser/harness.mjs", hooks: ["pretest:smoke", "pretest:browser", "pretest:a11y"] },
  ];
  for (const { file, hooks } of importers) {
    assert.match(readFileSync(file, "utf8"), /build-manifest\.ts"/,
      `${file} must import the shared hash; if that moved, this test's premise moved with it`);
    for (const hook of hooks) {
      assert.match(scripts[hook] ?? "", /check:node/,
        `\`${hook}\` must run the preflight — ${file} cannot load its own import under a Node below the floor`);
    }
  }
});

test("the default gate reaches the preflight first", () => {
  // A pre hook covers each gate run on its own. `all` names it explicitly so the FIRST thing a
  // developer or an agent sees on the wrong Node is the Node message, before 10s of anything else.
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  assert.match(scripts.all ?? "", /^npm run check:node\b/,
    `\`all\` must start with the preflight; it is \`${scripts.all}\``);
});
