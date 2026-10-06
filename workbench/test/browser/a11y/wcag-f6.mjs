// The three WCAG properties `BASELINE-a11y-261002.md` §6 F-6 named and declined to measure.
//
// F-6 is a list of stated unknowns: visible focus indication (2.4.7), contrast (1.4.3) outside what
// axe will judge, and reflow plus 2-D focus divergence (1.4.10, D-2). The baseline was right to
// name them rather than hide them, and right about why: proving a focus ring RENDERS needs pixels,
// and axe returns `color-contrast` as INCOMPLETE for SVG text, which looks identical to a pass in a
// summary line. This module turns each into a number.
//
// Four decisions bound what the numbers mean.
//
//   - **Pixels, not stylesheets, for 2.4.7.** `:focus-visible { outline: 3px solid var(--focus) }`
//     is authored on both pages. An authored rule proves nothing: a later `outline: none`, an
//     ancestor `overflow: hidden` that clips the ring, a `--focus` token resolving to the ground
//     colour, or a control painted over the ring all leave the rule in the file and the ring off the
//     screen. `focusRingDiff` screenshots the control unfocused, Tabs to it, screenshots the same
//     clip, and counts changed pixels -- separately inside the control and in the BAND outside it,
//     because only the band can hold an outline.
//
//   - **Both themes, always.** The one 1.4.3 defect this project has actually shipped was
//     dark-theme-only (the diagram's fixed light ink on a `var(--panel)` ground, 1.1:1). A probe
//     that ran light alone would have measured the page and missed the defect. Every probe here
//     takes the theme as a parameter and the callers run both.
//
//   - **Measured elements are COUNTED.** A contrast walk that matched nothing reports no failures,
//     which reads exactly like a clean page. Every probe returns how many things it examined, and
//     its caller asserts that count against something derived from the page.
//
//   - **WCAG's own large-text thresholds, not the looser approximation.** 1.4.3 drops the floor to
//     3:1 at 18pt (24px), or 14pt (18.66px) when bold. `axe.mjs`'s SVG probe uses `>= 18px`, or
//     `>= 14px` bold, which exempts a 20px label that WCAG still holds to 4.5:1. `requiredRatio`
//     below is the literal rule, and `contrastWalk` reports the looser verdict alongside so the
//     gap between the two is visible rather than assumed away.
import { pressTab, releaseFocus, reachBySelector } from "./keyboard.mjs";

/** WCAG 1.4.3's large-text thresholds, in CSS px: 18pt, or 14pt bold. */
export const requiredRatio = (sizePx, weight) =>
  (sizePx >= 24 || (sizePx >= 18.66 && Number(weight) >= 700) ? 3 : 4.5);

/**
 * Stamp a theme and tell the page's media query the same thing.
 *
 * Both signals, because both pages honour both: `@media (prefers-color-scheme: dark)` and
 * `:root[data-theme="dark"]`. A probe that set only one would measure a half-applied palette.
 */
export async function applyTheme(page, theme) {
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  // The palette is pure custom properties on :root -- no matchMedia listener, no JS re-render on
  // either page -- so the next getComputedStyle already reads the new values.
}

/**
 * Render the page the way a CI runner does: without the one declared font this machine has.
 *
 * `WB_F6_SIMULATE_CI_FONTS=1 npm run test:a11y` runs the whole tier under it. The point is to make
 * "it passes on my machine" a falsifiable claim rather than a venue.
 *
 * `assets/mage-tokens.css` asks for `--mage-font-body: "Source Sans 3", -apple-system,
 * BlinkMacSystemFont, "Segoe UI", sans-serif`. A GitHub Ubuntu runner has NONE of those four
 * families and `.github/workflows/pages.yml` installs no font, so it resolves the generic tail. This
 * machine has Source Sans 3 installed, so it resolves the first entry. That one difference moved
 * four of the six numbers the D-2 pin used to assert, and a gate green only under the fonts its
 * author happened to have is a gate that measures the author.
 *
 * Only the BODY font is substituted. The mono stack (`"IBM Plex Mono", "SF Mono", Menlo, Consolas,
 * monospace`) names nothing this machine has either [measured: `fc-list` returns 0 for the first
 * three], so it already falls back here exactly as it does there and substituting it would simulate
 * a divergence that does not exist.
 *
 * `addStyleTag` rather than a launch flag: `--disable-remote-fonts` governs `@font-face`, and these
 * families are LOCAL. Suppressing a locally-installed family through Chromium's own font config is
 * not reachable from Puppeteer on macOS, and overriding the token reproduces the thing that
 * actually differs -- which family the body text resolves to.
 */
export const SIMULATE_CI_FONTS = process.env.WB_F6_SIMULATE_CI_FONTS === "1";

/** The declared body stack minus the one family a runner would miss. */
const RUNNER_BODY_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export async function applyRunnerFonts(page) {
  if (!SIMULATE_CI_FONTS) return null;
  await page.addStyleTag({ content: `:root { --mage-font-body: ${RUNNER_BODY_STACK} !important; }` });
  // The witness. A substitution that silently failed to apply would make every verdict below read
  // "CI-equivalent" while measuring this machine -- the exact failure this whole suite's record is
  // a list of. The caller asserts the family changed.
  return page.evaluate(() => getComputedStyle(document.body).fontFamily);
}

// ------------------------------------------------------------------------------------------------
// 2.4.7 -- the focus ring, in pixels
// ------------------------------------------------------------------------------------------------

/**
 * Decode two PNGs in the page and count where they differ.
 *
 * In-page rather than with an image library: `OffscreenCanvas` + `createImageBitmap` are already
 * there, and adding a PNG decoder would mean installing into `workbench/node_modules` -- a symlink
 * shared with every parallel agent worktree.
 *
 * `inset` is the band this measurement cares about. The clip is the control's box grown by `inset`
 * on all four sides, so a pixel closer than `inset` to the clip edge lies OUTSIDE the control: that
 * is where an outline can be and a hover repaint cannot.
 */
async function countChangedPixels(page, beforeB64, afterB64, inset) {
  return page.evaluate(async (a, b, band) => {
    const decode = async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      return { data: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data, w: bitmap.width, h: bitmap.height };
    };
    const [x, y] = [await decode(a), await decode(b)];
    if (x.w !== y.w || x.h !== y.h) {
      return { error: `clip changed size between shots: ${x.w}x${x.h} vs ${y.w}x${y.h}` };
    }
    let changed = 0; let bandChanged = 0; let bandTotal = 0; let maxDelta = 0;
    for (let py = 0; py < x.h; py += 1) {
      for (let px = 0; px < x.w; px += 1) {
        const inBand = px < band || py < band || px >= x.w - band || py >= x.h - band;
        if (inBand) bandTotal += 1;
        const i = (py * x.w + px) * 4;
        // Per-channel, so a hue-only change at equal luminance still registers.
        const d = Math.max(
          Math.abs(x.data[i] - y.data[i]),
          Math.abs(x.data[i + 1] - y.data[i + 1]),
          Math.abs(x.data[i + 2] - y.data[i + 2]),
        );
        if (d > maxDelta) maxDelta = d;
        // 8/255 is above PNG-identical noise and far below a 3px solid ring, which lands at the
        // full channel distance between the token and the ground.
        if (d >= 8) { changed += 1; if (inBand) bandChanged += 1; }
      }
    }
    return { pixels: x.w * x.h, changed, bandChanged, bandTotal, maxDelta };
  }, beforeB64, afterB64, inset);
}

/**
 * Does focusing this control change the pixels around it?
 *
 * The control is reached by pressing Tab, never `.focus()`: `:focus-visible` is exactly the
 * selector that distinguishes the two, and a programmatic focus can leave it unmatched.
 *
 * The clip is taken from the control's FOCUSED position, which is why the walk runs twice: focus,
 * measure the geometry, release, shoot the ground, focus again, shoot. A clip from the unfocused
 * position would be the wrong region for the one control that moves when focused -- the skip link
 * sits at `left: -9999px` until `:focus` pulls it on screen -- and that control is also the one
 * whose indication most needs proving.
 *
 * The ANCESTOR SCROLL STATE is recorded with the geometry and restored before every shot and every
 * rect read, because the clip's page coordinates say nothing about a scrolled container's inside.
 * The control that forced this: the first measured `summary` sits in the nav rail, `overflow: auto`
 * over ~3400px of content in an 800px box. Reaching it by Tab scrolls the RAIL, not the page; this
 * probe's own release-and-reach between its two shots scrolls it again, differently (Chromium's
 * minimal reveal, against this function's explicit centering); and a clip pinned to page
 * coordinates then samples pixels the control is no longer under. Measured, same commit, same
 * element, ring painted and `:focus-visible` matched throughout: 1804 of 4704 band pixels when the
 * scroll is held still, 0 of 4704 through the unrestored dance here, 155 of 4704 on the CI runner's
 * fonts -- a verdict that followed the scroll state, where `focusOrderAt`'s correction below
 * follows it for positions. Restoring the recorded state before both shots makes the two
 * screenshots a measurement of focus, which is the only thing that may differ between them.
 */
export async function focusRingDiff(page, selector, { inset = 8, label = selector } = {}) {
  if (await page.evaluate((sel) => document.querySelector(sel) === null, selector)) {
    return { label, selector, present: false };
  }
  const presses = await reachBySelector(page, selector);
  const focused = await page.evaluate((pad) => {
    const el = document.activeElement;
    el.scrollIntoView({ block: "center", inline: "center" });
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      matchesFocusVisible: el.matches(":focus-visible"),
      outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
      outlineOffset: cs.outlineOffset,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      // Integers, clamped inside the viewport. A clip that runs past the viewport edge, or carries
      // a fractional width, is rejected by CDP with a deserialisation error rather than a useful
      // one -- so the clamp is here, where the geometry is known.
      // Two spellings this probe got wrong on its first two runs, both reported by the protocol as
      // errors that describe the PAGE rather than the probe:
      //
      //   - the keys are `width`/`height`, not `w`/`h` ("Failed to deserialize params.clip.width").
      //   - the coordinates are PAGE coordinates, not viewport ones. `getBoundingClientRect` is
      //     viewport-relative, and a clip with no scroll offset intersects the visible region
      //     empty once the control is below the fold -- which CDP reports as "Cannot take
      //     screenshot with 0 height". Both controls that hit it had scrolled into view first.
      clip: (() => {
        const x = Math.max(0, Math.floor(r.x + window.scrollX - pad));
        const y = Math.max(0, Math.floor(r.y + window.scrollY - pad));
        return {
          x, y,
          width: Math.ceil(Math.min(r.width + pad * 2, window.innerWidth)),
          height: Math.ceil(Math.min(r.height + pad * 2, window.innerHeight)),
        };
      })(),
      // Every ancestor's scroll position at the moment the clip was computed, by depth. The clip's
      // page coordinates are only meaningful under THIS state -- see the scrolled-rail note above.
      // The document scroller is excluded (the window scroll is restored separately, from the
      // clip), the same split `focusOrderAt` uses.
      ancestorScroll: (() => {
        const out = [];
        for (let n = el.parentElement; n !== null && n !== document.documentElement
          && n !== document.body; n = n.parentElement) {
          out.push([n.scrollTop, n.scrollLeft]);
        }
        return out;
      })(),
    };
  }, inset);
  if (!Number.isFinite(focused.clip.width) || !Number.isFinite(focused.clip.height)
      || focused.clip.width < 2 || focused.clip.height < 2) {
    return {
      label, selector, present: true, presses,
      error: `control has no clippable box: ${JSON.stringify(focused.clip)} from rect `
        + JSON.stringify(focused.rect),
    };
  }

  /**
   * Put every scroller back where the clip was computed, then capture the region.
   *
   * The restore is explicit and identical before both shots: the recorded ancestor scrolls by
   * depth, then the window. Without the ancestor half, Tab's own minimal-reveal scrolling between
   * the shots moves a control inside a scrolled rail out from under its page-coordinate clip.
   * `captureBeyondViewport` is left off -- it emulates a taller viewport, which is a layout change
   * in the middle of a pixel comparison -- so the region must genuinely be on screen.
   */
  const restoreScroll = () => page.evaluate((sel, scrolls, y) => {
    let depth = 0;
    for (let n = document.querySelector(sel).parentElement; n !== null
      && n !== document.documentElement && n !== document.body; n = n.parentElement) {
      const s = scrolls[depth];
      if (s !== undefined) { n.scrollTop = s[0]; n.scrollLeft = s[1]; }
      depth += 1;
    }
    window.scrollTo(0, Math.max(0, y - 100));
  }, selector, focused.ancestorScroll, focused.clip.y);
  const shot = async () => {
    await restoreScroll();
    return page.screenshot({ clip: focused.clip, encoding: "base64", captureBeyondViewport: false });
  };
  await releaseFocus(page);
  const before = await shot();
  // Read under the SAME restored scroll the focused rect below is read under, so `moved` compares
  // two positions in one coordinate state rather than measuring wherever the walk left the page.
  const unfocused = await page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { rect: { x: r.x, y: r.y }, outlineStyle: getComputedStyle(document.querySelector(sel)).outlineStyle };
  }, selector);
  await reachBySelector(page, selector);
  const after = await shot();
  const focusedNow = await page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { x: r.x, y: r.y };
  }, selector);
  const moved = Math.abs(unfocused.rect.x - focusedNow.x) > 1
    || Math.abs(unfocused.rect.y - focusedNow.y) > 1;
  const diff = await countChangedPixels(page, before, after, inset);
  return {
    label, selector, present: true, presses, moved, inset,
    outlineWhenUnfocused: unfocused.outlineStyle,
    ...focused, ...diff,
  };
}

/**
 * The verdict for one control: focus changed the pixels AROUND it, or it did not.
 *
 * The band outside the control's own box is the only place an `outline` with a positive offset can
 * land, so requiring changed pixels THERE rejects a control that merely restyled its own interior
 * on focus. The threshold is a fraction of the band rather than a pixel count, so it holds for a
 * 20px select and a 400px card alike.
 *
 * A `moved` control still counts, and the report says so separately. The skip link is the case: it
 * travels from `left: -9999px` onto the page, so focus is indicated by the control appearing. That
 * satisfies 2.4.7 and this measurement cannot isolate an outline within it -- both facts belong in
 * the record rather than one of them in a verdict.
 */
export const ringRendered = (m) =>
  m.present === true && m.error === undefined
  && m.bandChanged / Math.max(1, m.bandTotal) >= 0.05 && m.maxDelta >= 8;

// ------------------------------------------------------------------------------------------------
// 1.4.3 -- contrast, including what axe declines to judge
// ------------------------------------------------------------------------------------------------

/**
 * Every HTML text run on the page, measured against the paint actually behind it.
 *
 * This walks computed styles rather than trusting axe, for two reasons the baseline named. axe
 * returns `incomplete` where it cannot resolve a ground, and an incomplete rule and a passing one
 * are the same summary line; and axe's own thresholds exempt text WCAG does not (see
 * `requiredRatio`). So the walk reports a ratio for every text run and lets the caller compare the
 * two verdicts.
 *
 * The ground comes from the ANCESTOR CHAIN, taking the first opaque background. Alpha is composited
 * rather than ignored: a translucent panel over the page ground is neither of its two colours, and
 * taking either would be a wrong number rather than a missing one.
 */
export const CONTRAST_WALK = `(() => {
  const srgb = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const parse = (value) => {
    const m = String(value).match(/[\\d.]+/g);
    if (m === null || m.length < 3) return null;
    return [Number(m[0]), Number(m[1]), Number(m[2]), m.length > 3 ? Number(m[3]) : 1];
  };
  const luminance = (c) => 0.2126 * srgb(c[0]) + 0.7152 * srgb(c[1]) + 0.0722 * srgb(c[2]);
  const ratio = (a, b) => {
    const la = luminance(a); const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat([1]);

  const path = (el) => {
    const bits = [];
    for (let n = el; n !== null && n !== document.documentElement; n = n.parentElement) {
      bits.unshift(n.id !== "" ? "#" + n.id : n.tagName.toLowerCase()
        + (n.classList.length > 0 ? "." + [...n.classList].join(".") : ""));
      if (n.id !== "") break;
    }
    return bits.join(" > ");
  };

  // The ground: composite every translucent background down the ancestor chain onto the first
  // opaque one, ending at the canvas colour if nothing opaque intervenes.
  const groundOf = (el) => {
    const layers = [];
    for (let n = el; n !== null; n = n.parentElement) {
      const bg = parse(getComputedStyle(n).backgroundColor);
      if (bg === null || bg[3] === 0) continue;
      layers.push(bg);
      if (bg[3] >= 1) break;
    }
    if (layers.length === 0) layers.push([255, 255, 255, 1]);
    let out = layers[layers.length - 1];
    for (let i = layers.length - 2; i >= 0; i -= 1) out = over(layers[i], out);
    return out;
  };

  const SR_ONLY = (el) => {
    const cs = getComputedStyle(el);
    // Visually hidden text has no contrast requirement -- it is never painted. Matched by the
    // shape the pages actually use (1px clipped box), not by class name.
    return cs.clip === "rect(0px, 0px, 0px, 0px)" || (el.offsetWidth <= 1 && el.offsetHeight <= 1);
  };

  // Not rendered as text by any engine. \`<style>\` and \`<script>\` carry source, and an SVG
  // \`<title>\`/\`<desc>\` carries an accessible name -- it is spoken, never painted. The first run of
  // this walk reported all three as 1.23:1 failures on both pages, in the dark theme, because they
  // inherit the page's ink and sit inside a figure with a fixed white ground. Eight of them, each
  // naming a real element, and every one a fact about the probe.
  const UNPAINTED = new Set(["STYLE", "SCRIPT", "TITLE", "DESC", "METADATA", "TEMPLATE", "NOSCRIPT"]);

  const out = [];
  let examined = 0;
  let skippedInvisible = 0;
  let skippedSvg = 0;
  for (const el of document.querySelectorAll("body *")) {
    if (UNPAINTED.has(el.tagName.toUpperCase())) { skippedInvisible += 1; continue; }
    // SVG text is measured by \`svgTextContrast\` next door, and MUST NOT be measured here: the ink
    // of an SVG glyph is its \`fill\`, not its \`color\`. Reading \`color\` on \`<text>\` returns the
    // page's inherited ink, which in the dark theme is a near-white the renderer never paints --
    // 23 fabricated failures on the workspace page's first run, all of them the same mistake.
    if (el instanceof SVGElement) { skippedSvg += 1; continue; }
    // Only elements with their OWN text. An ancestor's measurement would attribute a child's
    // colour to the wrong element and double-count every nesting level.
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (own === "") continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0
        || el.closest("[hidden]") !== null || SR_ONLY(el)) { skippedInvisible += 1; continue; }
    const color = parse(cs.color);
    if (color === null) continue;
    const ground = groundOf(el);
    // Text alpha composites too: the pages dim a disabled fieldset with opacity, and the ink a
    // reader sees there is the blend, not the token.
    const ink = color[3] < 1 ? over(color, ground) : color;
    const size = parseFloat(cs.fontSize);
    examined += 1;
    out.push({
      path: path(el), tag: el.tagName.toLowerCase(), text: own.slice(0, 48),
      color: cs.color, ground: "rgb(" + ground.slice(0, 3).map((v) => Math.round(v)).join(", ") + ")",
      ratio: Number(ratio(ink, ground).toFixed(2)),
      size, weight: cs.fontWeight,
      // The inherited opacity of an ancestor (a disabled fieldset) is reported rather than folded
      // in, because it changes the ink for every descendant at once.
      ancestorOpacity: (() => {
        let o = 1;
        for (let n = el; n !== null; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
        return Number(o.toFixed(3));
      })(),
    });
  }
  return { examined, skippedInvisible, skippedSvg, texts: out };
})`;

/**
 * `page.evaluate` handed a STRING evaluates it as an expression, so the call has to be in the
 * string -- the same shape `svgTextContrast` uses next door. Passing the bare function text returns
 * the function and every later check reads an undefined field.
 */
export const contrastWalk = (page) => page.evaluate(`(${CONTRAST_WALK})()`);

/**
 * The failures, deduplicated by cause.
 *
 * `strictness` selects the threshold rule: `"wcag"` is 1.4.3 as written, `"axe-approx"` is the
 * looser `>= 18px` / `>= 14px` bold the SVG probe uses. Reporting both is how the gap between the
 * two becomes a measured number instead of an argument.
 */
export function contrastFailuresHtml(walk, strictness = "wcag") {
  const required = (t) => (strictness === "wcag"
    ? requiredRatio(t.size, t.weight)
    : (t.size >= 18 || (t.size >= 14 && Number(t.weight) >= 700) ? 3 : 4.5));
  const seen = new Set();
  const out = [];
  for (const t of walk.texts) {
    const need = required(t);
    if (t.ratio >= need) continue;
    const key = `${t.path}|${t.color}|${t.ground}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`${t.path} "${t.text}" ${t.color} on ${t.ground} = ${t.ratio}:1, needs ${need}:1 `
      + `(${t.size}px/${t.weight})`);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// 1.4.10 reflow, and D-2's 2-D focus divergence
// ------------------------------------------------------------------------------------------------

/**
 * The widths a page's own CSS makes interesting, read from the served stylesheets.
 *
 * Guessing breakpoints measures a page nobody wrote. Two kinds appear in these pages and both
 * matter here:
 *
 *   - an explicit `@media (max-width: N)`, which is where the shell collapses from three columns to
 *     one. Probed at N and N+1px, the two sides of the switch.
 *   - `repeat(auto-fit, minmax(N, 1fr))`, which has NO `@media` and reflows anyway: the column
 *     count is a function of the container width. This is the one D-2 is about -- the Edit
 *     section's eleven forms lay out in columns whose number nobody declared. Probed at widths that
 *     produce roughly one, two and three columns.
 *
 * Returned sorted and deduplicated, each with the rule it came from, so a report can say which
 * line of CSS put a number in the list.
 */
export function cssReflowWidths(cssText, { rootFontPx = 16, floor = 320 } = {}) {
  const widths = new Map();
  const add = (px, why) => {
    const w = Math.round(px);
    if (w < floor || w > 2400) return;
    if (!widths.has(w)) widths.set(w, why);
  };
  add(floor, "WCAG 1.4.10's 320 CSS px floor");

  const toPx = (value, unit) => (unit === "rem" || unit === "em" ? Number(value) * rootFontPx : Number(value));
  for (const m of cssText.matchAll(/@media[^{]*?max-width:\s*([\d.]+)(rem|em|px)/g)) {
    const px = toPx(m[1], m[2]);
    add(px, `@media (max-width: ${m[1]}${m[2]}) -- at the breakpoint`);
    add(px + 1, `@media (max-width: ${m[1]}${m[2]}) -- one px above it`);
  }
  for (const m of cssText.matchAll(/repeat\(\s*auto-fit\s*,\s*minmax\(\s*([\d.]+)(rem|em|px)/g)) {
    const track = toPx(m[1], m[2]);
    // Gaps and page padding are not modelled: the aim is a width that lands in each column-count
    // regime, not the exact pixel where the count flips.
    for (const columns of [1, 2, 3]) {
      add(track * columns + 64, `auto-fit minmax(${m[1]}${m[2]}) -- about ${columns} column(s)`);
    }
  }
  return [...widths].sort((a, b) => a[0] - b[0]).map(([width, why]) => ({ width, why }));
}

/**
 * 1.4.10: does the page need to be scrolled sideways to read it?
 *
 * The document's own `scrollWidth` is the verdict. The offender list is what makes a failure
 * actionable: every element extending past the viewport that is NOT inside a scroll container of
 * its own. Both pages put wide tables inside `.scroll { overflow-x: auto }` deliberately -- 1.4.10
 * permits that, and counting them would report the fix as the defect.
 *
 * The attribution threshold is SUB-PIXEL, and it was not always. This probe first skipped any
 * element within `viewport + 1`, a whole-pixel slack, and then met a page whose `scrollWidth` was
 * 321 on a 320 viewport: a real 1.4.10 failure, verdict red, offender list EMPTY -- it told the
 * next reader a page was broken without saying where. Chromium reports a rounded `scrollWidth`,
 * and the rounding was measured rather than assumed: the document's scrollWidth moves at an
 * overhang of exactly +0.75px (swept in 1/32px steps; the same boundary at 320, 576 and 1025), so
 * a 1px document overflow is caused by a border box crossing the edge by as little as
 * three-quarters of a pixel, which a 1px slack silently forgives. The slack is now 0.4px: enough to drop
 * float-noise at the boundary, small enough that any edge capable of moving `scrollWidth` is named,
 * with its measured right edge kept to two decimals so sub-pixel causes read as what they are.
 *
 * And element boxes are not the only thing that scrolls a document. The offender this probe could
 * not name was TEXT INK: an unbreakable token (`window.mage.debug.sparql`, in a plain list item)
 * wider than its line box juts past the viewport while every element's own border box -- including
 * its parent's -- ends at or before the edge. `getBoundingClientRect` on elements cannot see it;
 * `Range.getClientRects` on the text nodes can. The ink pass runs only when the document actually
 * overflows, so a green page pays nothing for it.
 *
 * Finally the probe asserts its own attribution rather than trusting the walks: a measured
 * overflow with an empty offender list is reported as the probe defect it is. When both passes
 * find nothing, the widest uncontained edges are returned in their place, marked `nearest` --
 * a fallback that says where the content edge actually is -- and `attributed: false` says plainly
 * that the model missed. The caller can then fail on the probe rather than reading an empty list
 * as a page with nothing to report.
 */
export async function reflowAt(page, width, height = 512) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  return page.evaluate(() => {
    const doc = document.scrollingElement;
    const viewport = doc.clientWidth;
    // Measured on the pinned Chromium: an edge cannot move the rounded scrollWidth until its
    // overhang reaches +0.75px, where the flip is exact and viewport-independent. 0.4 keeps a
    // margin under that smallest attributable cause, so every edge capable of moving the verdict
    // is inside the net -- at the cost of also naming some edges that cannot, which only ever
    // surfaces when the document genuinely overflows, since a green page's list is never read.
    const SUBPIXEL_SLACK = 0.4;
    // Identity the next reader can act on: up to the nearest ancestor with an id, the same shape
    // the contrast walk reports. A bare `li` names nothing on a page full of them.
    const path = (el) => {
      const bits = [];
      for (let n = el; n !== null && n !== document.documentElement; n = n.parentElement) {
        bits.unshift(n.id !== "" ? `#${n.id}` : n.tagName.toLowerCase()
          + (n.classList.length > 0 ? `.${[...n.classList].join(".")}` : ""));
        if (n.id !== "") break;
      }
      return bits.join(" > ");
    };
    const offenders = [];
    const uncontained = [];
    let inspected = 0;
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || el.closest("[hidden]") !== null) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      inspected += 1;
      // A scrollable ancestor means the overflow is contained, which is what 1.4.10 asks for.
      let contained = false;
      for (let n = el.parentElement; n !== null; n = n.parentElement) {
        const ocs = getComputedStyle(n);
        if (ocs.overflowX === "auto" || ocs.overflowX === "scroll") { contained = true; break; }
      }
      if (contained) continue;
      uncontained.push({ el, right: r.right });
      if (r.right > viewport + SUBPIXEL_SLACK) {
        offenders.push({
          kind: "element", path: path(el),
          right: Number(r.right.toFixed(2)), width: Number(r.width.toFixed(2)),
        });
      }
    }
    const horizontalOverflowPx = Math.max(0, doc.scrollWidth - doc.clientWidth);
    // The ink pass: text runs crossing the boundary inside uncontained elements. Only when the
    // document overflows -- which is also the only time its answer is needed.
    if (horizontalOverflowPx > 0) {
      for (const { el } of uncontained) {
        for (const node of el.childNodes) {
          if (node.nodeType !== Node.TEXT_NODE || node.textContent.trim() === "") continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          let worst = null;
          for (const tr of range.getClientRects()) {
            if (tr.right > viewport + SUBPIXEL_SLACK && (worst === null || tr.right > worst.right)) worst = tr;
          }
          if (worst !== null) {
            offenders.push({
              kind: "text", path: path(el),
              text: node.textContent.trim().replace(/\s+/g, " ").slice(0, 64),
              right: Number(worst.right.toFixed(2)), width: Number(worst.width.toFixed(2)),
            });
          }
        }
      }
    }
    // Worst first: whatever reaches furthest past the edge is the thing to read about.
    offenders.sort((a, b) => b.right - a.right);
    // The precondition, asserted here where both walks' results are known: an overflow this probe
    // cannot attribute is a finding about the PROBE. The nearest edges are the best substitute for
    // the name the walks failed to produce -- never an empty list wearing a clean bill of health.
    const attributed = horizontalOverflowPx === 0 || offenders.length > 0;
    if (!attributed) {
      uncontained.sort((a, b) => b.right - a.right);
      for (const u of uncontained.slice(0, 3)) {
        offenders.push({ kind: "nearest", path: path(u.el), right: Number(u.right.toFixed(2)) });
      }
    }
    return {
      viewport, inspected, attributed,
      scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth,
      horizontalOverflowPx,
      offenders: offenders.slice(0, 12),
    };
  });
}

/**
 * Do any two landmark regions occupy the same pixels?
 *
 * The precondition the comparison below rests on, promoted to its own measurement. `focusOrderAt`
 * derives reading order from where controls SIT, which is only meaningful if the regions holding
 * them are laid out one after another. When two are not, every number it returns is a report about
 * a broken page in the vocabulary of the keyboard.
 *
 * It happened: `#edit` and `#system-browser` both carried `grid-area: extra` against a single
 * `"extra extra extra"` row, under a comment claiming they would "stack inside their own area".
 * Two grid items assigned to ONE named area do not stack -- they share the cell. The Edit forms
 * were painted over the System Browser's tables in every loaded state at every width, and what the
 * probe reported was "40 focus-order inversions at 320px", which is both true and the least useful
 * sentence available about it.
 *
 * Direct geometry rather than an inference from the walk: a sibling check that looked for
 * cross-region inversions on a one-column page needs the page to BE one column, and this one never
 * quite is -- two header buttons share a row at 320px. Comparing region boxes needs no such luck,
 * and reads the same at every width.
 */
export async function overlappingRegionsAt(page, width, height = 900) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  return page.evaluate(() => {
    const boxes = [];
    for (const el of document.querySelectorAll("header, nav, main, aside, footer, section")) {
      // Only SIBLING regions: a region nested inside another is contained by construction, and
      // flagging that would report every well-formed document as broken.
      if (el.closest("[hidden]") !== null) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      boxes.push({
        path: el.id !== "" ? `#${el.id}` : el.tagName.toLowerCase(),
        parent: el.parentElement, el,
        top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, left: r.left, right: r.right,
      });
    }
    const overlaps = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const [a, b] = [boxes[i], boxes[j]];
        if (a.parent !== b.parent) continue;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        const dx = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        // A one-pixel touch is a rounded border, not an overlap.
        if (dy > 1 && dx > 1) {
          overlaps.push(`${a.path} and ${b.path} share ${Math.round(dx)}x${Math.round(dy)}px`);
        }
      }
    }
    return { regions: boxes.length, overlaps };
  });
}

/**
 * Focus stops grouped into visual ROWS, top to bottom, each read left to right.
 *
 * Two stops share a row when their boxes overlap vertically by more than half the shorter one.
 * Extracted from `focusOrderAt` so the identical rule groups the whole page AND each region on its
 * own: a region's column count has to be computed from that region's own stops, because a control
 * in the column beside it can bridge two of its rows and make a one-column region read as two.
 */
function groupRows(stops) {
  const rows = [];
  for (const s of stops) {
    const row = rows.find((r) => r.some((o) => {
      const overlap = Math.min(o.top + o.h, s.top + s.h) - Math.max(o.top, s.top);
      return overlap > Math.min(o.h, s.h) / 2;
    }));
    if (row === undefined) rows.push([s]); else row.push(s);
  }
  rows.sort((a, b) => Math.min(...a.map((s) => s.top)) - Math.min(...b.map((s) => s.top)));
  return rows.map((row) => [...row].sort((a, b) => a.left - b.left));
}

/**
 * The SHAPE of each region's divergence, which is the part of D-2 that is a property of the page.
 *
 * The count of inverted pairs is not. It is a function of how many columns an `auto-fit` grid
 * happened to pack, which is a function of text metrics, which is a function of which font
 * resolved -- and the font that resolved differs between this machine and a CI runner [measured:
 * `scripts/measure-f6-font-sensitivity.mjs`, 672/976/1024/1025 move 30/77/75/75 to 29/81/81/81
 * when `"Source Sans 3"` is dropped from the stack, and 976 moves to 30 under a 15px classic
 * scrollbar]. So this returns, per region: whether it is laid out in more than one column, and
 * whether its reading order and its tab order disagree at all. Both are invariant to metrics; the
 * number of disagreements is not.
 *
 * Reading order is derived from the region's OWN rows, not from the page's: within one region that
 * is what "read across" means, and it is the only grouping a change to that region's markup is
 * responsible for.
 */
function regionShapes(controls, tabIndexOf) {
  const byRegion = new Map();
  for (const s of controls) {
    if (!byRegion.has(s.region)) byRegion.set(s.region, []);
    byRegion.get(s.region).push(s);
  }
  const out = {};
  for (const [name, list] of byRegion) {
    const rows = groupRows(list);
    const reading = rows.flat();
    const pairs = [];
    for (let i = 0; i < reading.length; i += 1) {
      for (let j = i + 1; j < reading.length; j += 1) {
        if (tabIndexOf.get(reading[i].key) > tabIndexOf.get(reading[j].key)) {
          pairs.push(`${reading[i].label} is read before ${reading[j].label} but tabbed after it`);
        }
      }
    }
    out[name] = {
      controls: list.length,
      visualRows: rows.length,
      widestRow: Math.max(0, ...rows.map((r) => r.length)),
      // The invariant-bearing pair. A region in one column cannot diverge -- every row holds one
      // stop and the two orders are identical by construction -- so `multiColumn === false` with
      // `diverges === true` is a defect in the page or in this probe, and never a font.
      multiColumn: rows.some((r) => r.length > 1),
      diverges: pairs.length > 0,
      // Reported for the receipt and for a human reading a red gate. NOT asserted: see above.
      divergentPairs: pairs.length,
      examples: pairs.slice(0, 3),
    };
  }
  return out;
}

/**
 * D-2: the tab order against the order a sighted reader's eye takes, at one viewport.
 *
 * Reading order is derived from geometry, not assumed: the stops are grouped into ROWS by vertical
 * overlap -- two controls share a row when their boxes overlap vertically by more than half the
 * shorter one -- and each row is read left to right. On a one-column layout every row holds one
 * stop and the two orders are identical by construction, which is the right answer and is why this
 * has to be measured per viewport rather than once.
 *
 * An INVERSION is a pair the two orders disagree about: Tab reaches B after A while the eye reaches
 * B before A. The count is reported with the first few pairs named, because one inversion in a grid
 * of eleven forms is a different finding from a page-wide mismatch.
 *
 * The walk presses Tab. It does not call `.focus()`, for the reason the baseline's instrument notes
 * give: programmatic focus skips the sequence this measurement is about.
 */
export async function focusOrderAt(page, width, height = 900, { max = 200 } = {}) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  // Shift-Tab out of the document so the walk starts at the top. Chromium keeps a sequential-focus
  // starting point that a blur alone does not rewind -- the instrument defect the baseline records.
  await releaseFocus(page);
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.down("Shift"); await page.keyboard.press("Tab"); await page.keyboard.up("Shift");
    const out = await page.evaluate(() => document.activeElement === null
      || document.activeElement === document.body);
    if (out) break;
  }

  const stops = [];
  for (let i = 0; i < max; i += 1) {
    await pressTab(page);
    const here = await page.evaluate(() => {
      const e = document.activeElement;
      if (e === null || e === document.body) return null;
      e.scrollIntoView({ block: "nearest" });
      const r = e.getBoundingClientRect();
      // Every scroll offset between this element and the document, so a position does not depend on
      // where the walk happened to have scrolled when it arrived.
      //
      // `window.scrollY` alone is NOT enough, and the gap is not academic: the shell's `#nav` rail
      // is `max-height: 80vh; overflow-y: auto` over 1571px of content, and focusing a link inside
      // it scrolls the RAIL, not the page. `getBoundingClientRect` then reports where that link sits
      // in the rail's VIEWPORT, which moves under the walk -- the seventeen rail stops came back
      // with tops 217, 345, 473, 601, 693, 805, then 460, 548, 612, 724, 759, then 472 ... a column
      // of links in one straight line, measured as a zig-zag [measured, 1025px]. Reading order
      // derived from those is derived from the walk's own scrolling. Adding each ancestor's
      // `scrollTop` back recovers the position in the unscrolled layout, which is what a reader
      // scrolling that rail actually sees: 217, 345, 473, 601, 693, 805, 870, 958, 1022, 1134 ...
      // monotonic, one column, zero inversions among themselves.
      //
      // The document scroller is excluded from the sum because `window.scrollY` already carries it;
      // adding `documentElement.scrollTop` too would double it.
      let scrollUp = 0; let scrollLeft = 0; let insideScrolled = false;
      for (let n = e.parentElement; n !== null && n !== document.documentElement && n !== document.body;
        n = n.parentElement) {
        if (n.scrollTop !== 0 || n.scrollLeft !== 0) insideScrolled = true;
        scrollUp += n.scrollTop; scrollLeft += n.scrollLeft;
      }
      return {
        id: e.id, tag: e.tagName.toLowerCase(),
        // A name for an element with no id. `a#` and `summary#` identify nothing, and the walk is
        // full of both -- the rails render id-less links. An inversion naming two of them is a
        // finding nobody can act on, and reads exactly like probe defect #4 (a selector that matched
        // the wrong element) to the next person who meets it.
        label: e.id !== "" ? `${e.tagName.toLowerCase()}#${e.id}`
          : `${e.tagName.toLowerCase()}[${(e.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 32)
          || e.getAttribute("aria-label") || e.getAttribute("href") || "?"}]`,
        insideScrolled,
        // The landmark this control lives in. A multi-column shell lays its regions out side by
        // side and tabs through them one WHOLE region at a time, so a row-by-row eye scan
        // interleaves three columns that the keyboard visits in series. Those pairs are a property
        // of the column layout; a pair INSIDE one region is a property of that region's own
        // source order, which is what D-2 is about. Counting them together produces one number that
        // answers neither question -- see `inversionsWithinRegion` below.
        // LANDMARKS only -- not `form` or `fieldset`. The grouping has to be coarse enough that
        // D-2's own finding stays INSIDE one region: the Edit section's eleven forms are eleven
        // `<fieldset>`s in one `auto-fit` grid, and their divergence is a pair taken from two
        // different cells. Group by fieldset and every D-2 inversion is "cross-region" and the
        // split measures nothing [measured: within-region went to 0 at every width].
        region: (() => {
          const host = e.closest("header, nav, main, aside, footer, section");
          if (host === null) return "-";
          return host.id !== "" ? `#${host.id}` : host.tagName.toLowerCase();
        })(),
        // Page coordinates, so a stop's position does not depend on where the walk scrolled to.
        top: Math.round(r.top + window.scrollY + scrollUp),
        left: Math.round(r.left + window.scrollX + scrollLeft),
        h: Math.round(r.height), w: Math.round(r.width),
        // Chromium puts a keyboard-scrollable container in the tab order when it holds no focusable
        // child, so a tab walk contains stops that are not controls: a table's `overflow-x` wrapper,
        // a pane with its own `max-height`. They belong in the walk and NOT in a reading-order
        // comparison -- a 1600px-tall container's box spans a dozen visual rows, which made the
        // first run report 40 inversions at 320px on a page laid out in one column. Classified
        // rather than dropped: whether each is reachable is its own question, and 2.1.1's, not
        // 2.4.3's.
        container: !e.matches("a[href], button, input, select, textarea, summary, [role=button]"),
        scrollable: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1,
      };
    });
    if (here === null) break;
    const key = `${here.label}@${here.top},${here.left}`;
    if (stops.length > 0 && key === stops[0].key) break;          // wrapped
    stops.push({ ...here, key });
  }

  // Rows by vertical overlap, over the CONTROL stops only.
  const controls = stops.filter((s) => s.container === false);
  const rows = groupRows(controls);
  const reading = rows.flat();

  const tabIndexOf = new Map(controls.map((s, i) => [s.key, i]));
  const inversions = [];
  const withinRegion = [];
  for (let i = 0; i < reading.length; i += 1) {
    for (let j = i + 1; j < reading.length; j += 1) {
      if (tabIndexOf.get(reading[i].key) > tabIndexOf.get(reading[j].key)) {
        const pair = `${reading[i].label} is read before ${reading[j].label} but tabbed after it`;
        inversions.push(pair);
        if (reading[i].region === reading[j].region) withinRegion.push(`${reading[i].region}: ${pair}`);
      }
    }
  }
  return {
    width, stops: stops.length, controlStops: controls.length,
    // Reported, not filtered away: a scrollable container in the tab order is how a keyboard user
    // scrolls a pane, and one that is scrollable WITHOUT a tab stop is a 2.1.1 defect. Both
    // numbers belong in the record.
    containerStops: stops.filter((s) => s.container)
      .map((s) => `${s.label}${s.scrollable ? " (scrollable)" : ""}`),
    // How many stops the scroll correction above applied to. A zero here means the correction did
    // nothing at this width, so a reader of the numbers knows whether it is load-bearing -- it is
    // at 1025px, where the rail scrolls, and is not at 320px, where nothing has a `max-height`.
    stopsInsideScrolledContainer: stops.filter((s) => s.insideScrolled).length,
    multiStopRows: rows.filter((r) => r.length > 1).length,
    widestRow: Math.max(0, ...rows.map((r) => r.length)),
    inversions: inversions.length,
    // Per region: is it laid out in 2-D, and do its two orders disagree. The ASSERTED shape of
    // D-2 -- see `regionShapes` for why the pair count beside it is reported and not pinned.
    regions: regionShapes(controls, tabIndexOf),
    // The share of the divergence that is one region's own source order against its own layout --
    // the question 2.4.3 asks of a region whose controls form one operable sequence. The remainder
    // is cross-region, which on this shell means "the keyboard walks column 1 entirely before
    // column 2, and an eye scanning rows does not". Both are reported; only this one is pinned,
    // because only this one moves when a region's markup changes.
    inversionsWithinRegion: withinRegion.length,
    examples: inversions.slice(0, 6),
    withinRegionExamples: withinRegion.slice(0, 6),
    order: stops.map((s) => s.label),
  };
}
