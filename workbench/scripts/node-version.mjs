// What Node this package needs, and whether the one running satisfies it. Pure: no fs, no process.
//
// THE FAILURE THIS EXISTS FOR, 261003. Under Node 20, `npm run check:parity` and the node test tier
// both die with:
//
//     TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" for …/check-parity.ts
//
// That is not a broken gate and not broken code — Node only strips types from `.ts` entry points
// from 22 onward — but it reads exactly like one, because it arrives as a module-load TypeError from
// inside a gate. It cost two independent actors time the day it landed: an implementing agent hit it
// and diagnosed it correctly, and the orchestrator hit it separately, briefly believed a
// freshly-landed script was broken, then mis-blamed a negative control that had "passed" by exiting
// non-zero for this unrelated reason. A module-load error wearing the costume of a detection is
// worse than a plain failure, because the plain failure does not send anyone to edit correct code.
//
// WHY THIS FILE IS .mjs AND NOT .ts — the one deliberate exception to "new code lands typed" in this
// package, and the reason is the whole point of the file. A preflight that cannot load on the broken
// Node cannot report the breakage: `node scripts/preflight-node.ts` under Node 20 fails with the
// exact error it exists to explain. So this module is plain ESM, JSDoc-annotated for a reader and an
// editor rather than for `tsc --noEmit`, which does not see it (`allowJs` is off, and turning it on
// would pull every `.mjs` in the package into the program). `test/node-preflight.test.mjs` covers the
// decisions instead, which is where the real risk is anyway.
//
// TWO NUMBERS, EACH IN ONE PLACE, AND A JOIN. The repo already distinguishes them deliberately
// (.github/workflows/pages.yml, the setup-node step):
//
//   - the FLOOR is `engines.node` in package.json — `>=22`, the oldest Node that works. 22 because
//     `.ts` entry points load from there, and because html-validate 11.x calls `fs.globSync`, added
//     in 22; on 20 it throws at startup and the HTML-validity gate SKIPS while the summary still
//     reads "0 failed".
//   - the PIN is `.nvmrc` — `24`, what `nvm use` selects and what CI installs via
//     `node-version-file: .nvmrc`.
//
// Collapsing them into one number would delete a distinction the repo uses, and hardcoding either
// one here would be a third copy — the same defect class as every other finding in this wave. Both
// are read from their own file, and `assessNode` asserts the JOIN between them: a pin below the floor
// is a contradiction between two declarations, and it is reported rather than silently preferred.

/**
 * The major version out of an `engines.node` range.
 *
 * The first integer in the spec, which is the floor for every spelling this package would plausibly
 * use — `>=22`, `>= 22`, `>=22.0.0`, `^22`, `22.x`, `>=22 <25`. Returns null for a spec with no
 * integer at all (`*`, `latest`, an empty string), because a floor that cannot be read is a finding
 * rather than a licence to proceed.
 *
 * @param {unknown} spec
 * @returns {number|null}
 */
export function parseFloor(spec) {
  if (typeof spec !== "string") return null;
  const match = /\d+/.exec(spec);
  if (match === null) return null;
  const major = Number.parseInt(match[0], 10);
  return Number.isFinite(major) && major > 0 ? major : null;
}

/**
 * The major version out of a `.nvmrc`'s contents.
 *
 * `nvm` accepts `24`, `v24`, `24.21.0` and aliases like `lts/*` or `node`. An alias returns null: it
 * names whatever is current rather than a version, so there is nothing for a preflight to compare
 * against, and reporting that is better than resolving an alias this file cannot see.
 *
 * @param {unknown} text
 * @returns {number|null}
 */
export function parsePin(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim().replace(/^v/, "");
  const match = /^(\d+)/.exec(trimmed);
  if (match === null) return null;
  const major = Number.parseInt(match[1], 10);
  return Number.isFinite(major) && major > 0 ? major : null;
}

/**
 * The major version out of a `process.versions.node` string.
 *
 * @param {unknown} version
 * @returns {number|null}
 */
export function parseRunning(version) {
  return parsePin(version);
}

/**
 * The first existing path among the candidates, or null.
 *
 * `exists` is injected so the search is testable without a filesystem, and so the CLI can report
 * WHICH file it read — "derived from .nvmrc" is only a true claim if the report names the `.nvmrc`
 * it actually found. The candidate list is ordered nearest-first, so a package-local `.nvmrc` would
 * win over the repo's, which is how a future workbench-specific pin would work without editing this.
 *
 * @param {readonly string[]} candidates
 * @param {(path: string) => boolean} exists
 * @returns {string|null}
 */
export function locateNvmrc(candidates, exists) {
  for (const candidate of candidates) {
    if (exists(candidate)) return candidate;
  }
  return null;
}

/**
 * @typedef {object} NodeFacts
 * @property {string} running   `process.versions.node`, e.g. "24.21.0".
 * @property {number|null} floor   Major from `engines.node`, or null when unreadable.
 * @property {string} floorSpec    The raw spec, for the message.
 * @property {number|null} pin     Major from `.nvmrc`, or null when unreadable.
 * @property {string} pinSpec      The raw contents, trimmed, for the message.
 * @property {string|null} pinFrom The path the pin was read from, or null when none was found.
 */

/**
 * `ok` — on the pin, nothing to say.
 * `off-pin` — satisfies the floor, different major from the pin. A warning, not a refusal.
 * `too-old` — below the floor. THE case this file exists for.
 * `contradiction` — the pin is below the floor; two declarations disagree.
 * `undeclared` — a declaration could not be read, so the requirement is unknown.
 *
 * @typedef {"ok"|"off-pin"|"too-old"|"contradiction"|"undeclared"} NodeLevel
 */

/**
 * @typedef {object} NodeVerdict
 * @property {NodeLevel} level
 * @property {boolean} ok     false means refuse to run the gates.
 * @property {string} message One or more lines, already shaped for a terminal.
 */

/** The fix, spelled once. `nvm use` with no argument reads `.nvmrc`, so no version is typed. */
const FIX = 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use';

/**
 * Whether the running Node can run this package's gates, and what to say about it.
 *
 * Ordered so the most actionable finding wins. A broken DECLARATION outranks a wrong runtime: if the
 * floor or the pin cannot be read, the verdict about the runtime would be guesswork, and guesswork
 * reported as a verdict is this whole wave's subject.
 *
 * @param {NodeFacts} facts
 * @returns {NodeVerdict}
 */
export function assessNode(facts) {
  const running = parseRunning(facts.running);
  const where = facts.pinFrom === null ? ".nvmrc" : facts.pinFrom;

  if (running === null) {
    return {
      level: "undeclared",
      ok: false,
      message: `cannot read the running Node version from \`${facts.running}\`, so whether it can run `
        + `these gates is unknown — and unknown must not read as a pass.`,
    };
  }
  if (facts.floor === null) {
    return {
      level: "undeclared",
      ok: false,
      message: "package.json declares no readable `engines.node`, so this package no longer states "
        + "which Node it needs. Restore the floor (`\">=22\"`) — it is what CI, npm and this preflight "
        + "all read, and the preflight deliberately has no default to fall back on.",
    };
  }
  if (facts.pin === null) {
    return {
      level: "undeclared",
      ok: false,
      message: `${where} reads \`${facts.pinSpec}\`, which is not a major version. The pin is DERIVED `
        + `from that file rather than written here, so an alias (\`lts/*\`, \`node\`) leaves this `
        + `preflight nothing to compare against. Put a major in it, or teach this check to resolve `
        + `aliases — do not add a second copy of the number.`,
    };
  }
  if (facts.pin < facts.floor) {
    return {
      level: "contradiction",
      ok: false,
      message: `${where} pins Node ${facts.pin} and package.json requires \`${facts.floorSpec}\`, so `
        + `the pinned version does not satisfy the declared floor. Two declarations about one fact `
        + `disagree; fix the declarations before trusting any verdict from them.`,
    };
  }
  if (running < facts.floor) {
    return {
      level: "too-old",
      ok: false,
      message: [
        `WRONG NODE — Node ${facts.running} cannot run this package's gates.`,
        "",
        `  required:  Node ${facts.floorSpec} (package.json engines.node), pinned at ${facts.pin} (${where})`,
        `  running:   Node ${facts.running}`,
        `  fix:       ${FIX}`,
        "",
        "  WHY, so the next failure is recognised: the gates load TypeScript entry points directly",
        "  (`node scripts/check-parity.ts`, `node --test \"test/*.test.ts\"`, and build.mjs imports a",
        "  .ts module). Node strips types from .ts only from 22 onward; below that it rejects the",
        "  extension with ERR_UNKNOWN_FILE_EXTENSION. That arrives as a module-load TypeError from",
        "  inside a gate, which reads like broken code and is not. It has already cost two people",
        "  time once, including one who went looking for a defect in a freshly-landed script.",
        "",
        "  `nvm use` takes no argument on purpose: it reads the pin from the file named above, so",
        "  there is no version to type and nothing to drift.",
      ].join("\n"),
    };
  }
  if (running !== facts.pin) {
    return {
      level: "off-pin",
      ok: true,
      message: `Node ${facts.running} satisfies the floor (${facts.floorSpec}) but ${where} pins `
        + `${facts.pin}, which is what CI installs. Differences here show up as "works locally, fails `
        + `in CI". \`${FIX}\` switches. Continuing.`,
    };
  }
  return {
    level: "ok",
    ok: true,
    message: `Node ${facts.running} — on the pin (${where}: ${facts.pin}), floor ${facts.floorSpec}.`,
  };
}
