// `npm run check:node` — refuse, loudly and by name, when the Node running the gates is too old.
//
// The impure half of `node-version.mjs`: it reads `engines.node`, finds and reads `.nvmrc`, and
// prints. Every decision is there; see that file's header for the failure this answers and for why
// this pair is `.mjs` rather than `.ts` (a preflight that cannot load on the broken Node cannot
// report the breakage).
//
// WIRED SO IT CANNOT BE MISSED. It is the first link of `npm run all`, AND it is an npm `pre` hook
// on every script that loads a `.ts` entry point — `pretest`, `precheck:parity`, `prebuild`,
// `precheck:published`, `preaffordances` — so npm runs it whether or not anyone remembered to. The
// gate the 261003 failures walked past was the one you have to remember; a check that depends on
// being remembered is the thing this replaces.
//
// Paths resolve against this MODULE, not the cwd. npm sets the cwd to the package directory, but a
// bare `node workbench/scripts/preflight-node.mjs` from the repo root must behave identically — a
// preflight that reads a different package.json depending on where it was invoked would report about
// the wrong package, which is the shape of the sibling finding in this same wave.
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { assessNode, locateNvmrc, parseFloor, parsePin } from "./node-version.mjs";

const read = (url) => readFileSync(url, "utf8");

const manifestUrl = new URL("../package.json", import.meta.url);
/** @type {{ engines?: { node?: unknown } }} */
const manifest = JSON.parse(read(manifestUrl));
const floorSpec = typeof manifest.engines?.node === "string" ? manifest.engines.node : "";

/**
 * `.nvmrc`, searched nearest-first from the package directory upward.
 *
 * SEARCHED rather than named, for two reasons. The file lives at the REPO ROOT today — one level
 * above this package — and a path spelled `../../.nvmrc` is a brittle fact about where the package
 * sits in the tree. And a package-local pin should win if one is ever added, without editing this.
 * The report names the file it found, because "derived from .nvmrc" is only an honest claim if the
 * reader can see which `.nvmrc` that was.
 */
const CANDIDATES = ["../.nvmrc", "../../.nvmrc", "../../../.nvmrc"];
const pinUrl = locateNvmrc(CANDIDATES, (rel) => existsSync(new URL(rel, import.meta.url)));
const pinSpec = pinUrl === null ? "" : read(new URL(pinUrl, import.meta.url)).trim();
const pinFrom = pinUrl === null
  ? null
  : relative(process.cwd(), fileURLToPath(new URL(pinUrl, import.meta.url)));

const verdict = assessNode({
  running: process.versions.node,
  floor: parseFloor(floorSpec),
  floorSpec: floorSpec.length > 0 ? floorSpec : "(absent)",
  pin: parsePin(pinSpec),
  pinSpec: pinSpec.length > 0 ? pinSpec : "(no .nvmrc found above this package)",
  pinFrom,
});

if (verdict.ok) {
  // `off-pin` goes to stderr while `ok` goes to stdout: a warning that scrolls past in a green run
  // is noise, and a warning interleaved into a gate's own output is worse.
  (verdict.level === "ok" ? console.log : console.error)(verdict.message);
} else {
  console.error(verdict.message);
}
process.exitCode = verdict.ok ? 0 : 1;
