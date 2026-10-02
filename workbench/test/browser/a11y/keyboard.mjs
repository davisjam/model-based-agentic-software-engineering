// A keyboard, and nothing else.
//
// FR-A11Y-1 says every workbench function is operable without a pointer. The registry's
// `affordanceGaps` cannot check that: it records that a human affordance EXISTS, which is a claim
// about wiring, not about reachability. So this module offers exactly the verbs a keyboard has --
// Tab, Shift+Tab, Enter, Space, arrows, printable characters -- and nothing that a mouse or a
// script would use.
//
// What is deliberately absent, and why:
//
//   - `element.click()` and `page.click()`. Both prove the handler runs. Neither proves anything
//     about reachability, which is the requirement.
//   - `element.focus()` / `page.focus()`. Programmatic focus skips the tab sequence, so a control
//     that is focusABLE but not tabbable -- `tabindex="-1"`, or inside a `hidden` container, or
//     after a `display:none` ancestor -- passes. `reachByTab` presses Tab until the control has
//     focus, or fails naming what it reached instead.
//   - `select.value = x` plus a synthetic `change`. That is the shortcut this file exists to avoid.
//     `chooseByKeyboard` uses Chromium's type-ahead, which is how a keyboard user picks an option.
//
// The one documented exception is the file-open control: no browser automation protocol can drive
// a native file picker from the keyboard, so `keyboard.test.mjs` reaches and activates `#file`
// with the keyboard and supplies the bytes through `uploadFile`, which dispatches the same `change`
// the picker would. That seam is named at its call site, not hidden here.
import assert from "node:assert/strict";

/**
 * Chromium's `<select>` type-ahead search buffer. Successive characters accumulate into one search
 * string and the buffer clears only after roughly a second of no typing -- so two choices made
 * back to back concatenate into a prefix that matches nothing, and the second silently does
 * nothing. Measured: without this wait, 2 of 7 choices failed; with it, 21 of 21 across three
 * rounds. This is the single most load-bearing constant in the file.
 */
const TYPEAHEAD_RESET_MS = 1200;

/** The announcement debounce in `src/ui/main.ts` is 250ms. Anything that reads `#live` waits past it. */
export const ANNOUNCE_DEBOUNCE_MS = 250;

export const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The id of whatever currently has focus, or "" for an element without one. */
export const focusedId = (page) => page.evaluate(() => document.activeElement?.id ?? "");

const focusedDescription = (page) => page.evaluate(() => {
  const e = document.activeElement;
  if (!e) return "nothing";
  return `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ""}${e.getAttribute("aria-label") ? `[${e.getAttribute("aria-label")}]` : ""}`;
});

/**
 * Hand focus back to the document so the next Tab starts a fresh walk.
 *
 * `blur()` invokes no application handler -- it is the state a user is in before touching the
 * keyboard. Note that Chromium keeps its "sequential focus navigation starting point" where it was,
 * so a walk after a blur may continue from mid-document and wrap. That is why `reachByTab` reports
 * reachability and not a press COUNT: the count is not stable, and a test that asserted one would
 * fail on an unrelated reorder. The opening tab order is pinned separately, from a fresh load.
 */
export const releaseFocus = (page) =>
  page.evaluate(() => { const e = document.activeElement; if (e instanceof HTMLElement) e.blur(); });

export const pressTab = (page) => page.keyboard.press("Tab");

export async function pressShiftTab(page) {
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
}

/** The first `count` ids the Tab key visits, from wherever focus currently is. */
export async function tabSequence(page, count) {
  const seen = [];
  for (let i = 0; i < count; i += 1) {
    await pressTab(page);
    seen.push(await page.evaluate(() => {
      const e = document.activeElement;
      return e ? `${e.tagName.toLowerCase()}#${e.id || ""}` : "none";
    }));
  }
  return seen;
}

/**
 * Press Tab until `id` has focus. Fails naming the control it could not reach and where the walk
 * ended -- which is the message that distinguishes "not in the tab order" from "disabled" from
 * "behind a `hidden` ancestor".
 *
 * The bound is generous because the walk may start mid-document and wrap; the page has roughly 60
 * focusable controls.
 */
export async function reachByTab(page, id, { max = 300 } = {}) {
  await releaseFocus(page);
  for (let i = 1; i <= max; i += 1) {
    await pressTab(page);
    if (await focusedId(page) === id) return i;
  }
  const ended = await focusedDescription(page);
  const why = await page.evaluate((target) => {
    const e = document.getElementById(target);
    if (e === null) return "no such element";
    const cs = getComputedStyle(e);
    return JSON.stringify({
      tabIndex: e.tabIndex, disabled: e.disabled ?? null,
      hiddenAncestor: e.closest("[hidden]")?.id ?? null,
      disabledFieldset: e.closest("fieldset[disabled]")?.id ?? null,
      display: cs.display, visibility: cs.visibility,
    });
  }, id);
  assert.fail(`#${id} is NOT reachable by Tab in ${max} presses -- keyboard-unreachable. `
    + `The walk ended on ${ended}. State of #${id}: ${why}`);
}

/** Replace a text field's contents by keyboard: Home, select to End, type over the selection. */
export async function typeInto(page, id, text) {
  await reachByTab(page, id);
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift");
  await page.keyboard.press("End");
  await page.keyboard.up("Shift");
  if (text !== "") await page.keyboard.type(text);
  else await page.keyboard.press("Delete");
  const got = await page.evaluate((i) => document.getElementById(i).value, id);
  assert.equal(got, text, `typing into #${id} by keyboard left "${got}"`);
}

/**
 * The shortest prefix of `wanted` that no OTHER option in the list begins with, case-insensitively
 * -- which is what Chromium's type-ahead matches on.
 *
 * Returns null when no such prefix exists, i.e. when `wanted`'s whole text is a prefix of an option
 * that precedes it. A keyboard user has the same problem with such a list, so the caller fails
 * loudly rather than reaching for `.value`.
 */
function uniquePrefix(wanted, all) {
  const others = all.filter((t) => t !== wanted);
  for (let n = 1; n <= wanted.length; n += 1) {
    const prefix = wanted.slice(0, n);
    if (!others.some((t) => t.toLowerCase().startsWith(prefix.toLowerCase()))) return prefix;
  }
  return null;
}

/**
 * Choose a `<select>` option the way a keyboard user does: Tab to the control, then type enough of
 * the option's visible TEXT to identify it. Asserts the resulting value, so a test cannot pass on a
 * type-ahead that landed somewhere else.
 */
export async function chooseByKeyboard(page, id, value) {
  const options = await page.evaluate((i) => {
    const s = document.getElementById(i);
    return [...s.options].map((o) => ({ value: o.value, text: (o.textContent ?? "").trim() }));
  }, id);
  const target = options.find((o) => o.value === value);
  assert.ok(target, `#${id} offers no option with value "${value}"; it offers `
    + `${JSON.stringify(options.map((o) => o.value))}`);
  const prefix = uniquePrefix(target.text, options.map((o) => o.text));
  assert.ok(prefix !== null, `#${id}: no prefix identifies "${target.text}" uniquely, so type-ahead `
    + "cannot reach it -- a keyboard user cannot either. The option list needs distinguishable labels.");

  await reachByTab(page, id);
  await settle(TYPEAHEAD_RESET_MS);
  await page.keyboard.type(prefix);
  await settle(150);
  const got = await page.evaluate((i) => document.getElementById(i).value, id);
  assert.equal(got, value, `type-ahead "${prefix}" on #${id} selected "${got}", not "${value}"`);
}

/** Tick or untick a checkbox with Space, and assert it moved. */
export async function toggleByKeyboard(page, id, wanted) {
  await reachByTab(page, id);
  const before = await page.evaluate((i) => document.getElementById(i).checked, id);
  if (before !== wanted) await page.keyboard.press("Space");
  const after = await page.evaluate((i) => document.getElementById(i).checked, id);
  assert.equal(after, wanted, `Space on #${id} left checked=${after}`);
}

/**
 * Move within a radio group with the arrow keys -- the native behaviour, and the only keyboard
 * route there is: a radio group exposes ONE tab stop (the checked radio), so Tab alone can never
 * reach the unchecked member.
 */
export async function chooseRadioByKeyboard(page, groupName, id) {
  const checked = await page.evaluate((name) => {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el?.id ?? null;
  }, groupName);
  assert.ok(checked, `radio group "${groupName}" has no checked member, so it has no tab stop`);
  if (checked === id) return;
  await reachByTab(page, checked);
  const members = await page.evaluate((name) =>
    [...document.querySelectorAll(`input[name="${name}"]`)].map((e) => e.id), groupName);
  for (let i = 0; i < members.length; i += 1) {
    await page.keyboard.press("ArrowDown");
    await settle(60);
    if (await page.evaluate((t) => document.getElementById(t).checked, id)) return;
  }
  assert.fail(`ArrowDown never reached #${id} in radio group "${groupName}" (members ${members.join(", ")})`);
}

/** Reach a control and activate it with Enter. */
export async function activateByKeyboard(page, id, { key = "Enter", settleMs = 400 } = {}) {
  await reachByTab(page, id);
  await page.keyboard.press(key);
  await settle(settleMs);
}

// -- the live region -----------------------------------------------------------------------------
//
// Announcements are OBSERVED, never triggered: a MutationObserver reads what the page did.
//
// One property of the instrument has to be stated, because it bounds what a count can prove.
// Assigning `textContent` a string IDENTICAL to the one already there produces NO mutation record
// in Chromium -- verified directly, with a three-write fixture that yielded one batch. So a storm
// of identical announcements is invisible here, and it is equally invisible to a screen reader,
// which is reading the same DOM. A write count therefore discriminates "debounced" from "not
// debounced" only when the messages DIFFER; where they do not, `delayMs` below is the measurement
// that does, because an undebounced write lands within a millisecond of the keystroke.

export const watchLiveRegion = (page) => page.evaluate(() => {
  window.__liveWrites = [];
  window.__liveObserver?.disconnect();
  const live = document.getElementById("live");
  const armedAt = performance.now();
  window.__liveObserver = new MutationObserver(() => {
    window.__liveWrites.push({ delayMs: Math.round(performance.now() - armedAt), text: live.textContent ?? "" });
  });
  window.__liveObserver.observe(live, { childList: true, characterData: true, subtree: true });
});

/** Every write since `watchLiveRegion`, as `{ delayMs, text }`, in order. */
export const liveWrites = (page) => page.evaluate(() => [...(window.__liveWrites ?? [])]);

export const liveText = (page) => page.evaluate(() => document.getElementById("live").textContent ?? "");
