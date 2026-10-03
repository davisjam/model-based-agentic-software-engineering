/**
 * Stamp the capability registry's human affordance sites onto the elements that carry them.
 *
 * UX-I1's human half used to be unfalsifiable. The registry declared 29 logical sites
 * (`header.export`, `edit-section.add-entity`) and nothing in the product mapped one to an element,
 * so `checkRegistryClosure` — written to catch drift in both directions — only ever saw literals a
 * unit test handed it. A control could be renamed, removed or buried and the gate stayed green
 * (`BASELINE-a11y-261002.md` §6, F-3).
 *
 * This module is the binding, and it runs in the SHIPPED page rather than in a reader's notes. Each
 * declared site becomes a `data-affordance` attribute on its element, which gives the browser tier a
 * real set to compare against the registry in both directions: a declared site with no element, and
 * an element claiming a site nobody declared.
 *
 * **Why the registry drives the attribute instead of the markup carrying it.** The obvious cheap
 * version is `data-affordance="header.export"` typed into `index.html`. That is the registry's own
 * failure class one layer down: two hand-written copies of one string, agreeing only while someone
 * keeps them agreeing, and the gate reading one copy against the other would pass on a page whose
 * button had moved. So the attribute has exactly one author — this function, reading the registry —
 * and `test/view-model.test.ts` asserts `index.html` contains no literal `data-affordance` at all.
 * The cost is that the stamp is a runtime fact, invisible to anyone reading the markup; the
 * compensation is that the element IDS are checked against `index.html` by the node tier, so a
 * rename fails at commit time without a browser.
 *
 * Three rungs, cheapest first:
 *   1. the compiler — `BoundAffordance` makes a wired human site without an element unrepresentable;
 *   2. the node tier — every declared element id appears as an `id=` in `index.html`;
 *   3. the browser tier — the served page's stamped set equals the registry's declared set.
 */
import { boundHumanAffordances } from "../app/capabilities.ts";

/** The attribute. One name, exported, so no reader has to guess the spelling. */
export const AFFORDANCE_ATTRIBUTE = "data-affordance";

/**
 * Stamp every declared site, and report the ones whose HOST element is not in the page.
 *
 * A `within` site is bound when its host is present: the evidence list inside the question list is
 * absent whenever no answered question carries a witness, which is an ordinary state of a correct
 * page and not a missing control. The browser tier pins the selector against a fixture that does
 * render one.
 */
export function bindAffordances(root: Document): readonly string[] {
  const unbound: string[] = [];
  for (const affordance of boundHumanAffordances()) {
    const host = root.getElementById(affordance.element.id);
    if (host === null) {
      unbound.push(`${affordance.at} (expected #${affordance.element.id})`);
      continue;
    }
    const within = affordance.element.within;
    const targets = within === undefined ? [host] : [...host.querySelectorAll(within)];
    for (const target of targets) target.setAttribute(AFFORDANCE_ATTRIBUTE, affordance.at);
  }
  return unbound;
}
