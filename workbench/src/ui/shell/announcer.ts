/**
 * FR-A11Y-3: announce consequential changes politely, DEBOUNCE them, and COMPOSE them.
 *
 * Without the debounce, re-running a dozen saved queries would queue a dozen announcements and bury
 * the user — the "announcement storm" the requirement names. One message describing the settled
 * state is what a screen-reader user can actually use.
 *
 * **Three senders, and the third is the one FR-A11Y-3 turns on.** A model change has consequences a
 * screen-reader user needs from different places:
 *
 *   - `pendingAction` — what the human control the user just pressed did. Written by the regions,
 *     through `ShellContext.announce`.
 *   - `pendingModelNews` — what changed in the AUTHORITATIVE MODEL, derived in `observe()` by
 *     diffing the system against the last paint. This is the agent channel: `window.mage.load` and
 *     `window.mage.transact` repaint without passing through any handler, so no region knows they
 *     happened.
 *   - `pendingPropertyNews` — which PROPERTY VERDICTS moved. One edit can re-evaluate every property
 *     at once, which is the worst storm in the application, and no handler knows the outcome.
 *
 * Property news used to carry the agent channel alone, and it carried one slice of it: it speaks
 * only when a verdict changes or a property is dropped, so an agent adding an entity, a relation, a
 * model or a note repainted the human surface and announced NOTHING. Measured at zero writes to
 * `#live` for both `load()` and `transact()` (`BASELINE-a11y-261002.md` §5, F-1).
 *
 * The three compose into ONE sentence rather than racing, because the timer renders what is pending
 * and then clears it. One exclusion: a pending human action SUPPRESSES the derived model news, since
 * "add-entity applied" and "entities 11 to 12" describe the same event and a user does not want it
 * twice. Property news is additive and always composes.
 *
 * **Politeness: `polite`, deliberately, including for the agent channel.** An agent mutation is
 * consequential, not an emergency. `assertive` interrupts the sentence the user is currently
 * hearing — including a sentence about the thing they are doing themselves — and a collaborator's
 * edit arriving mid-word is worse than the same edit announced a quarter-second later. There is one
 * live region and it stays `polite`; nothing here needs a second, louder one.
 *
 * ---
 *
 * **WHY THIS IS THE SHELL'S, AND NOT A REGION'S.** The shell splits the page into one module per
 * region, and the obvious home for an announcement is the region whose state moved. That would
 * break FR-A11Y-3 quietly, and this is the paragraph that says how, because the breakage would be
 * invisible: the model and property channels are DIFFS over the whole authoritative system, and a
 * region paints only its own slice of it. An agent commit against a model the human is not viewing
 * (§4's SH-I6 — semantic mutation never navigates) changes nothing in the workspace region, so a
 * workspace-owned sender would observe no change and say nothing, while the user's screen reader
 * stayed silent through someone else's edit. So the announcer belongs to the one observer of the
 * whole frame: the composition root constructs it, hands regions the human channel only, and calls
 * `observe()` once per paint with the frame every region is painting from.
 *
 * It is a class rather than four module-level variables because it is state with an owner: a timer
 * handle, three pending slots, and two memos of the previous paint. A second instance would be a
 * second voice in one live region, so the root makes exactly one.
 */
import { annotationHash } from "../../ir/hash.ts";
import type { PropertyRow } from "../view-model.ts";
import type { ShellFrame } from "./context.ts";

/**
 * What the authoritative model looked like at the last paint, for the agent-path announcement.
 *
 * A memo for an ANNOUNCEMENT and nothing else: no projection reads a value out of here, and every
 * number is derived from the frame on the same pass. The counts are the ones
 * `window.mage.context()` publishes, so the sentence a screen-reader user hears and the object an
 * agent reads describe one system.
 */
interface ModelMemo {
  readonly loaded: boolean;
  readonly systemId: string;
  readonly title: string;
  readonly hash: string;
  readonly counts: ReadonlyMap<string, number>;
  readonly findings: number;
  /**
   * The digest of every note and provenance block in the system — `annotationHash`, the complement
   * of the semantic `hash` above.
   *
   * **This was a COUNT, and the count could not see the change.** An annotation-only commit leaves
   * `hash` where it was by construction (A1), so this is the only field that can report one. The
   * first version counted provenance RECORDS and read a rise as "a note was attached", which fails
   * twice over: a provenance record exists only for an object whose source declares `provenance`
   * while `add-note` writes into `notes`, so the count never moved for any shipped note at all; and
   * a count cannot distinguish a second note on one object from no edit. Measured in the browser
   * tier: the FIRST annotation-only agent commit wrote zero times to `#live`. A digest sees the
   * change rather than a proxy for it.
   */
  readonly annotation: string;
}

/** `"3 models, 11 entities"` — the nouns whose count is not zero, so a sentence names what is there. */
const countPhrase = (counts: ReadonlyMap<string, number>): string =>
  [...counts].filter(([, n]) => n > 0).map(([noun, n]) => `${n} ${noun}`).join(", ");

export class Announcer {
  /** The one polite live region. Written only by the timer below. */
  private readonly live: HTMLElement;

  private timer = 0;
  private pendingAction = "";
  private pendingModelNews = "";
  private pendingPropertyNews = "";

  /** The status of each property at the last paint, for the change announcement. */
  private lastStatus = new Map<string, string>();
  private lastModel: ModelMemo | null = null;

  constructor(live: HTMLElement) {
    this.live = live;
  }

  /** What the control the user just pressed did. The regions' only channel. */
  action(message: string): void {
    this.pendingAction = message;
    this.flush();
  }

  /**
   * Derive the two agent-path channels from one paint.
   *
   * Called by the root after it has observed the frame and before the regions have finished
   * painting — order does not matter, because nothing here reads the DOM.
   */
  observe(frame: ShellFrame): void {
    const { state } = frame;
    const changed = this.modelNews({
      loaded: state.loaded,
      systemId: state.system.systemId,
      title: state.system.name,
      hash: state.hash,
      counts: new Map([
        ["models", state.system.models.size],
        ["entities", state.system.entities.size],
        ["relations", state.system.relations.length],
        ["machines", state.system.machines.size],
        ["machine instances", state.system.instances.length],
        ["saved properties", state.system.queries.size],
      ]),
      findings: state.findings.length,
      annotation: annotationHash(state.system),
    });
    if (changed !== "") {
      this.pendingModelNews = changed;
      this.flush();
    }
    const news = this.propertyNews(frame.vm.properties);
    if (news !== "") {
      this.pendingPropertyNews = news;
      this.flush();
    }
  }

  private flush(): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      const model = this.pendingAction === "" ? this.pendingModelNews : "";
      this.live.textContent = [this.pendingAction, model, this.pendingPropertyNews]
        .filter((s) => s !== "").join(" ");
      this.pendingAction = "";
      this.pendingModelNews = "";
      this.pendingPropertyNews = "";
    }, 250);
  }

  /** One sentence naming what moved. At most three, because a sentence listing twelve is not read. */
  private propertyNews(rows: readonly PropertyRow[]): string {
    const changed: string[] = [];
    for (const p of rows) {
      const before = this.lastStatus.get(p.id);
      if (before !== undefined && before !== p.status) changed.push(`${p.statement} is now ${p.status}`);
    }
    const dropped = [...this.lastStatus.keys()].filter((id) => !rows.some((p) => p.id === id));
    this.lastStatus = new Map(rows.map((p) => [p.id, p.status]));
    const parts: string[] = [];
    if (changed.length > 0) {
      parts.push(`${changed.length} property verdict(s) changed: `
        + `${changed.slice(0, 3).join("; ")}${changed.length > 3 ? `; and ${changed.length - 3} more` : ""}.`);
    }
    if (dropped.length > 0) parts.push(`${dropped.length} property(ies) are no longer asserted.`);
    return parts.join(" ");
  }

  /**
   * One sentence naming what changed in the model, or `""` when nothing did.
   *
   * FR-A11Y-3's first listed subject is "agent actions", and this is the channel for them. The shape
   * of the sentence follows the requirement's "without excessive announcements": it names the
   * operation's CONSEQUENCE rather than re-reading the summary, so a load says what loaded and an
   * edit says which count moved. Four outcomes, in the order a reader meets them:
   *
   *   - a different system — the whole workspace was replaced, so name it and size it;
   *   - a moved hash — a semantic edit, so name the counts that moved and the finding total;
   *   - a standing hash with a MOVED ANNOTATION DIGEST — A1 keeps notes out of the semantic
   *     projection, so this is the one commit that leaves the revision where it was, and saying so
   *     is the whole reason it is announced. `add-note` is the only operation the transaction
   *     vocabulary has that reaches annotation (there is no delete-note and no set-provenance), so
   *     a moved digest under a standing hash is an attached note and the sentence can say so
   *     without hedging. A vocabulary that gains a note-removing op has to reword this branch, and
   *     the browser-tier case that pins it names the clause it asserts;
   *   - nothing — a repaint for a view change, which is not news.
   */
  private modelNews(now: ModelMemo): string {
    const before = this.lastModel;
    this.lastModel = now;
    // The boot paint. `window.mage` is not installed yet and the ready announcement follows it, so
    // there is no change to report and nothing to report it to.
    if (before === null) return "";
    if (!now.loaded) {
      return before.loaded ? "The workspace is empty again; no model is loaded." : "";
    }
    const findings = `${now.findings} validation finding(s).`;
    if (now.systemId !== before.systemId || now.title !== before.title || !before.loaded) {
      return `Loaded ${now.title}: ${countPhrase(now.counts)}. ${findings}`;
    }
    if (now.hash === before.hash) {
      if (now.annotation !== before.annotation) {
        return "A note was attached. The model's revision is unchanged: a note is context, "
          + "not a constraint.";
      }
      return "";
    }
    const moved = [...now.counts]
      .filter(([noun, n]) => n !== before.counts.get(noun))
      .map(([noun, n]) => `${noun} ${before.counts.get(noun) ?? 0} to ${n}`);
    // A moved hash with no moved count is an edit in place — a relabel, a property value, a purpose.
    // Saying the revision advanced is still the thing the user could not otherwise tell.
    return moved.length === 0
      ? `The model changed in place; no count moved. ${findings}`
      : `The model changed: ${moved.join(", ")}. ${findings}`;
  }
}
