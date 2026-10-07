// The opening is a conceptual contract with authored constraints, and this file is where they
// hold once the author moves on:
//
//   (1) The whole orientation — shell intro plus every declared opening string — stays inside its
//       500–700-word budget. The expansion must not turn the top of Learn into a textbook chapter.
//   (2) "licensed" is the word for what a model permits: the same word the ask bar and the review
//       surface already use, so Learn and the application speak one vocabulary.
//   (3) The established modeling languages are named exactly once, in the graduate-to paragraph.
//       No comparison table, no construct-by-construct mapping: the Workbench is a teaching tool,
//       and a mapping would invite the semantic-equivalence questions the author declines.
//   (4) The natural-language callout keeps the boundary: language is the interface, the
//       structured model is the semantics.
//
// Probe discipline: every measurement here asserts its own preconditions first. A budget computed
// over an empty corpus, or an intro regex that silently matched nothing, would report a confident
// wrong verdict — so each check fails loudly when it cannot find what it meant to measure.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OPENING, openingProse } from "../src/learn/opening.ts";

const words = (s: string): number => {
  const found = s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
  return found.length;
};

/** The shell's intro paragraph, which is part of the orientation a student reads first. */
const shellIntro = (): string => {
  const html = readFileSync("learn.html", "utf8");
  const m = /<p class="intro">([\s\S]*?)<\/p>/.exec(html);
  // Precondition: the probe found the paragraph it measures. A null match means the shell
  // changed shape, not that the intro has zero words.
  assert.ok(m?.[1] !== undefined, "learn.html no longer carries a <p class=\"intro\"> — "
    + "the word-budget probe cannot find the orientation's first paragraph");
  const text = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  assert.ok(text.length > 0, "the shell intro matched but is empty — nothing to measure");
  return text;
};

test("the orientation keeps its 500–700-word budget, shell intro included", () => {
  const prose = openingProse();
  // Preconditions: the corpus is the opening, not a refactoring accident.
  assert.ok(prose.length >= 15, `openingProse() returned ${prose.length} strings — the opening `
    + "has lost sections, so a word count over it would measure the wrong thing");
  for (const s of prose) assert.ok(words(s) > 0, `opening carries an empty string: ${JSON.stringify(s)}`);
  const total = words(shellIntro()) + prose.reduce((n, s) => n + words(s), 0);
  assert.ok(total >= 500 && total <= 700,
    `the orientation is ${total} words; the author's budget is 500–700`);
});

test("models license questions — the ask section closes on the application's own word", () => {
  assert.match(OPENING.canAsk.closing, /licensed/,
    "the ask section's closing must say what the modeled structure *licenses* — the word the "
      + "ask bar and review surfaces already use");
});

test("SysML/KerML and Clafer appear exactly once, in the graduate-to paragraph", () => {
  const corpus = [...openingProse(), shellIntro()];
  assert.ok(corpus.length > 1, "empty corpus — nothing to scan");
  const hits = corpus.filter((s) => /SysML|KerML|Clafer/.test(s));
  const graduate = OPENING.what.paragraphs.find((p) => p.startsWith("For real engineering work"));
  assert.ok(graduate !== undefined,
    "the graduate-to paragraph is gone — the one sanctioned mention has no home");
  assert.deepEqual(hits, [graduate],
    "the established languages are named once, in the graduate-to paragraph — anywhere else "
      + "drifts toward the comparison the author prohibits");
  for (const banned of [/implements/i, /is based on/i, /subset of/i]) {
    assert.ok(!banned.test(graduate),
      `the graduate-to paragraph must not claim the Workbench ${String(banned)} those languages`);
  }
});

test("the talk callout keeps the boundary: language is the interface, the model the semantics", () => {
  assert.match(OPENING.talk.after, /Natural language is the interface/,
    "the callout must state the boundary explicitly, or it teaches that the agent "
      + "understanding prose is what makes it a model");
  assert.match(OPENING.talk.after, /the model remains the source of semantics/);
  assert.match(OPENING.modelIt.maxim, /not the same as modeling it/,
    "the companion maxim states the same boundary from the authoring side");
});
