// Source hygiene.
//
// This exists because of a defect that passed EVERY other gate. A NUL byte sat inside a template
// literal in src/render/layout.ts: tsc compiled it (legal there), all 69 tests passed (the value's
// only job was uniqueness, which NUL satisfies), the editor rendered nothing visible, and
// validate.py was unaffected. The sole symptom was git classifying the file as binary — noticed by
// a human reading `git show --stat`, not by any check.
//
// A habit of reading diff stats is not a control. This is.
//
// Note: this file constructs its test bytes numerically. Embedding a literal control character in
// source would make the file fail its own check — and, discovered while writing it, would also be
// rejected by the agent harness, which screens commands for exactly these bytes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const NUL = 0x00;
const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;

/**
 * True for a byte no source file in this project has a reason to contain.
 *
 * Tab, LF and CR are permitted; everything else below 0x20 is not. This is the predicate the Phase E
 * agent proposed, which is a better home for the rule than a habit.
 */
const isControlByte = (b: number): boolean => b < 0x20 && b !== TAB && b !== LF && b !== CR;

/** Tracked text files under workbench/, as git sees them. */
const trackedSources = (): readonly string[] =>
  execFileSync("git", ["ls-files", "--", "*.ts", "*.json", "*.html", "*.md", "*.yaml", "*.mjs"],
    { encoding: "utf8", cwd: ".." })
    .split("\n")
    .filter((p) => p.startsWith("workbench/"))
    // Generated types are gitignored; this is belt-and-braces if one is ever tracked by mistake.
    .filter((p) => !p.includes("/schema-"));

test("no tracked workbench source contains a control byte", () => {
  const offenders: string[] = [];
  const files = trackedSources();
  assert.ok(files.length > 10, `expected to find tracked sources, got ${files.length} — the glob is wrong`);
  for (const rel of files) {
    const data = readFileSync(`../${rel}`);
    const at = data.findIndex(isControlByte);
    if (at !== -1) {
      const byte = data[at] ?? 0;
      offenders.push(`${rel}: byte 0x${byte.toString(16).padStart(2, "0")} at offset ${at}`);
    }
  }
  assert.deepEqual(offenders, [], `control bytes found:\n  ${offenders.join("\n  ")}`);
});

test("the predicate actually fires — negative control", () => {
  // A check that can only pass is not a check. Build the exact shape that slipped through: a NUL
  // inside a template literal, which is legal TypeScript and compiles clean.
  const sneaky = Buffer.from([0x60, 0x61, NUL, 0x62, 0x60]); // `a<NUL>b`
  assert.ok([...sneaky].some(isControlByte), "a NUL inside a template literal must be flagged");

  // And the permitted whitespace must NOT trip it, or the check fails every file and gets deleted.
  const ordinary = Buffer.from([0x61, TAB, 0x62, CR, LF, 0x63]);
  assert.ok(![...ordinary].every((b) => !isControlByte(b)) === false,
    "tab, CR and LF must all be permitted");
});
