/**
 * The shipped examples, and the one way to load one.
 *
 * ## EX-I1 is a constraint on this file
 *
 * "Loading creates an ordinary editable workspace. There is no special example execution mode."
 * `load()` therefore fetches bytes and hands them to `Workspace.load` — the same call the file
 * picker and `window.mage.load` make. Nothing here preprocesses, patches or marks a system, and the
 * workspace cannot tell an example from a file a user wrote. A code path only examples travel would
 * break the invariant, so there is not one.
 *
 * ## Why a description is read rather than written
 *
 * Section 3 wants a short description of an example before or as it loads: its name, its models with
 * their engineering questions, and a few questions to try. Every one of those facts already exists in
 * the shipped example. Writing them again here would create a blurb free to drift from the thing it
 * describes — the duplication this project removes on sight, and the reason the coverage model is
 * regenerated from example metadata instead of maintained by hand.
 *
 * So the description is DERIVED:
 *
 *   title, summary, "try asking"  <- `examples/<id>/expected-results.yaml`
 *   models and their questions    <- `examples/<id>/system.mage.yaml`, through `canonicalize`
 *
 * Reading the fixture for presentation metadata deserves a note. `expected-results.yaml` is the
 * example's own metadata file: it already carries `title`, `summary` and the `suggested` flag that
 * picks the three-to-five presented questions out of the larger supplied set, and the coverage
 * generator reads the same file STRICTLY, so its shape is pinned in CI. The alternative is a second
 * copy in TypeScript, which is worse.
 *
 * ## Why these methods are async
 *
 * The description comes from the shipped bytes, so there is nothing to return synchronously without
 * keeping a copy in code. An agent awaits two promises; the copy would have drifted.
 */
import { parse } from "yaml";
import type { Finding } from "../ir/types.ts";
import { Workspace } from "./services.ts";

/**
 * The examples that ship, in the conceptual order section 18 gives them — and the SOLE declaration
 * of that set.
 *
 * `scripts/gen-example-coverage.ts` re-exports this rather than keeping its own list. It briefly did
 * keep one, and the two disagreed within the hour: Document Processing was authored and added there
 * while this file still omitted it, so the menu offered two examples while three shipped. Four tests
 * caught it, which is the system working — but the defect was a duplicated list, not a missing
 * string, and adding the string would have left the duplication to drift again.
 *
 * The direction matters. The app layer owns what ships, because the menu and the agent catalogue are
 * what "shipped" MEANS; a build script consumes that fact. The reverse would make the published set
 * a property of a generator.
 *
 * Document Processing's entry was withheld while its performance model had no evaluator, on the
 * reasoning that a menu item loading an empty system teaches a new reader the workbench is broken.
 * It now loads a complete model system whose quantitative REQUIREMENTS are declared and whose
 * verdicts are still hand-derived — so the example is honest about itself and the coverage model
 * states the remaining gap where it can be queried.
 *
 * Transaction Workspace sits SECOND, and the position is the decision rather than an accident. Two
 * documents order these, and they disagree about the membership:
 * `requirements-default-examples-261002.md` §18 gives a three-example progression (relations →
 * behavior-acquires-quantities → behavior itself), while `DESIGN-v02-semantics-261004.md` §31 names
 * its own three flagships — message bus, transaction/workspace, processing pipeline — and the v0.2
 * spec supersedes the v0.1 framing where the two conflict. Index 1 satisfies both: it is §31's B
 * slot, and §18's progression survives as a subsequence. The consequence a reader should know about
 * is that `src/learn/content.ts`'s `exemplarFor` takes the FIRST shipped example instantiating a
 * type, so this order is what makes the behavior card's exemplar the transaction lifecycle rather
 * than Document Processing's document lifecycle — which is what the Learn guidance asks for ("use
 * the transaction example, not a toy traffic light"). Appending instead would have shipped the
 * example and left the card unchanged.
 *
 * What is NOT resolved here: §31 drops Worker Queue from its three while §18 keeps it, and nothing
 * in this wave adjudicated that. Five ship.
 *
 * Embedded Sensor Node sits LAST, and the position is a consequence rather than a preference.
 * `exemplarFor` takes the FIRST shipped example instantiating a type, and three examples ahead of
 * this one already declare quantities — so appending leaves every existing Learn card's exemplar
 * where it is. The quantitative card's exemplar is a separate question from the menu's order: it is
 * decided by which example has an addressable quantitative model to render, not by position.
 */
export const SHIPPED_EXAMPLE_IDS =
  ["message-bus", "transaction-workspace", "document-processing", "worker-queue",
   "embedded-sensor-node"] as const;

export type ShippedExampleId = (typeof SHIPPED_EXAMPLE_IDS)[number];

/** One of an example's purposeful models, with the question it answers. */
export interface ExampleModelBlurb {
  readonly id: string;
  readonly label: string;
  /** A graph model or a state machine. Both carry a purpose; both count. */
  readonly kind: "graph" | "machine";
  readonly question: string | null;
}

export interface ExampleDescription {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly models: readonly ExampleModelBlurb[];
  /** The presented questions, by their natural-language labels. Section 2 caps the set at 3-5. */
  readonly tryAsking: readonly string[];
}

/**
 * Reads a shipped asset by its path relative to the served page.
 *
 * A port because the two callers disagree about how to read a file and neither should win: the page
 * has `fetch`, a test has the filesystem. It fails by rejecting — a reader that returned empty text
 * on a 404 would surface as "this example declares no models", which is a lie about the example.
 */
export type AssetReader = (path: string) => Promise<string>;

export class UnknownExampleError extends Error {}
export class ExampleMetadataError extends Error {}

const systemPath = (id: string): string => `examples/${id}/system.mage.yaml`;
const fixturePath = (id: string): string => `examples/${id}/expected-results.yaml`;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function text(v: unknown, where: string): string {
  if (typeof v !== "string" || v.trim() === "") {
    throw new ExampleMetadataError(`${where}: expected a non-empty string`);
  }
  return v.trim();
}

/**
 * The presentation half of the fixture, read strictly.
 *
 * Strict because a defaulted field would render a description that asserts nothing and still looks
 * finished — the quietest way to ship an empty panel. A missing `title` is a broken example, and the
 * message says which file to open.
 */
function readPresentation(id: string, source: string): {
  readonly title: string;
  readonly summary: string;
  readonly tryAsking: readonly string[];
} {
  const where = fixturePath(id);
  const doc: unknown = parse(source);
  if (!isObject(doc)) throw new ExampleMetadataError(`${where}: expected a mapping`);
  const queries = doc["queries"];
  if (!Array.isArray(queries)) throw new ExampleMetadataError(`${where}.queries: expected a sequence`);

  const tryAsking: string[] = [];
  for (const [i, raw] of queries.entries()) {
    if (!isObject(raw)) throw new ExampleMetadataError(`${where}.queries[${i}]: expected a mapping`);
    if (raw["suggested"] !== true) continue;
    tryAsking.push(text(raw["label"], `${where}.queries[${i}].label`));
  }
  if (tryAsking.length === 0) {
    throw new ExampleMetadataError(`${where}: no query is marked suggested, so there is nothing to present`);
  }
  return {
    title: text(doc["title"], `${where}.title`),
    summary: text(doc["summary"], `${where}.summary`),
    tryAsking,
  };
}

/**
 * The example menu and the loader behind it.
 *
 * A class because it holds the fetched text: describing an example then loading it would otherwise
 * read the same file twice, and the second read is the one that would fail on a flaky network after
 * the user has already been shown a description.
 */
export class ExampleCatalog {
  readonly #workspace: Workspace;
  readonly #read: AssetReader;
  readonly #sources = new Map<string, string>();

  constructor(workspace: Workspace, read: AssetReader) {
    this.#workspace = workspace;
    this.#read = read;
  }

  /** What the menu may offer. Closed, and short for a stated reason. */
  ids(): readonly ShippedExampleId[] {
    return SHIPPED_EXAMPLE_IDS;
  }

  async describe(id: string): Promise<ExampleDescription> {
    this.#assertShipped(id);
    const [source, fixture] = await Promise.all([this.#source(id), this.#read(fixturePath(id))]);
    // `canonicalizeOnly` rather than a second parser: the questions a description shows must be the
    // questions the loaded model will report, and only the canonical form guarantees that.
    const system = Workspace.canonicalizeOnly(parse(source));
    const models: ExampleModelBlurb[] = [
      ...[...system.models.values()].map((m) => ({
        id: m.id, label: m.label, kind: "graph" as const, question: m.purpose.question,
      })),
      // Machines carry a purpose exactly as a graph model does. A description that listed only
      // `system.models` would report worker-queue as having one model and would be wrong.
      ...[...system.machines.values()].map((m) => ({
        id: m.id, label: m.id, kind: "machine" as const, question: m.purpose.question,
      })),
    ];
    const { title, summary, tryAsking } = readPresentation(id, fixture);
    return { id, title, summary, models, tryAsking };
  }

  describeAll(): Promise<readonly ExampleDescription[]> {
    return Promise.all(this.ids().map((id) => this.describe(id)));
  }

  /**
   * Load it. ONE call, and it is the import call.
   *
   * The findings come back for the same reason `Workspace.load` returns them: an example that loaded
   * with findings is a broken example, and the caller should be able to say so rather than present a
   * damaged model as a tutorial.
   */
  async load(id: string): Promise<{ readonly ok: boolean; readonly findings: readonly Finding[] }> {
    this.#assertShipped(id);
    return this.#workspace.load(await this.#source(id));
  }

  #assertShipped(id: string): void {
    if (!(SHIPPED_EXAMPLE_IDS as readonly string[]).includes(id)) {
      throw new UnknownExampleError(
        `'${id}' is not a shipped example; the workbench offers ${SHIPPED_EXAMPLE_IDS.join(", ")}.`);
    }
  }

  async #source(id: string): Promise<string> {
    const cached = this.#sources.get(id);
    if (cached !== undefined) return cached;
    const source = await this.#read(systemPath(id));
    this.#sources.set(id, source);
    return source;
  }
}
