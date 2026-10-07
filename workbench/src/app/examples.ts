/**
 * The shipped examples, and the one way to load one.
 *
 * ## The library is three examples, by the author's 261006 specification
 *
 * The worked-example library is exactly Simple – Worker Queue, Medium – Document Processing, and
 * Complex – Transaction Workspace. The progression is one model → two models → three models;
 * complexity comes from richer engineering questions and composition, not from more entities. The
 * specification supersedes the earlier seven-example set and its §21 flagship progression, the
 * case envelope (scenario / investigate / "Try asking"), and the flagship/built-in status
 * machinery — all of which this file used to declare.
 *
 * ## The former examples are TEST FIXTURES now, not deletions
 *
 * The author's ruling, verbatim: "You can keep test cases but not expose them to students." The
 * previous example documents — message-bus, embedded-sensor-node, autonomous-delivery,
 * calibration-loop, and the prior versions of worker-queue, document-processing and
 * transaction-workspace — survive byte-identical under `test/fixtures/examples/`, where the suite
 * loads them through `scripts/gen-example-coverage.ts`'s corpus seam and every behavioural pin
 * they carry keeps running. Nothing student-facing can reach them: this file is the SOLE
 * declaration of what ships, the menu and the agent catalogue enumerate it, and `#assertShipped`
 * refuses any other id.
 *
 * ## EX-I1 is a constraint on this file
 *
 * "Loading creates an ordinary editable workspace. There is no special example execution mode."
 * `load()` therefore fetches bytes and hands them to `Workspace.load` — the same call the file
 * picker and `window.mage.load` make. Nothing here preprocesses, patches or marks a system, and the
 * workspace cannot tell an example from a file a user wrote.
 *
 * ## Why a description is read rather than written
 *
 * The start page shows a short stored description of the chosen example — its title, its summary,
 * its models with their kinds. Every one of those facts already exists in the shipped files:
 *
 *   title, summary          <- `examples/<id>/expected-results.yaml`
 *   models and their kinds  <- `examples/<id>/system.mage.yaml`, through `canonicalize`
 *
 * Writing them again here would create a blurb free to drift from the thing it describes. The
 * per-model Description / Includes / Omits are authored MODEL content (the model's `description`
 * and `purpose`), displayed by the viewer after loading — never synthesized, never duplicated here.
 */
import { parse } from "yaml";
import type { Finding } from "../ir/types.ts";
import { Workspace } from "./services.ts";

/** The spec's progression: one model, two models, three models. */
export type ExampleTier = "simple" | "medium" | "complex";

export interface ShippedExample {
  readonly id: string;
  readonly tier: ExampleTier;
}

/**
 * What ships, in menu order — the SOLE declaration of that set, and the order IS the pedagogy:
 * the spec presents the library as a progression, so the menu lists it in progression order.
 *
 * `as const satisfies` rather than a plain annotation: `satisfies` checks every row, and
 * `as const` keeps the ids literal so `ShippedExampleId` stays a union of exactly these strings.
 */
export const SHIPPED_EXAMPLES = [
  { id: "simple-worker-queue", tier: "simple" },
  { id: "medium-document-processing", tier: "medium" },
  { id: "complex-transaction-workspace", tier: "complex" },
] as const satisfies readonly ShippedExample[];

export type ShippedExampleId = (typeof SHIPPED_EXAMPLES)[number]["id"];

/**
 * The shipped ids, derived from the declaration above — derived rather than listed a second time,
 * because two lists of the same set disagreed within the hour the last time one existed.
 */
export const SHIPPED_EXAMPLE_IDS: readonly ShippedExampleId[] =
  SHIPPED_EXAMPLES.map((e) => e.id);

/** One of an example's purposeful models, as the start card lists them. */
export interface ExampleModelBlurb {
  readonly id: string;
  readonly label: string;
  /** A graph model or a state machine. Both carry a purpose; both count. */
  readonly kind: "graph" | "machine";
}

export interface ExampleDescription {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly models: readonly ExampleModelBlurb[];
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
} {
  const where = fixturePath(id);
  const doc: unknown = parse(source);
  if (!isObject(doc)) throw new ExampleMetadataError(`${where}: expected a mapping`);
  return {
    title: text(doc["title"], `${where}.title`),
    summary: text(doc["summary"], `${where}.summary`),
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
  /**
   * The example the workspace's current import came from, pinned to the import that installed it.
   *
   * The pin is {id, loadNonce-at-load}: any later load — a file, a new system, another example, a
   * Reset — advances the workspace's nonce and the pin silently expires, so no surface can
   * describe a document that did not come from its example. Edits, undo and hypotheses do not
   * advance the nonce, and that is the requirement: a shipped example stays an ordinary editable
   * workspace after loading (EX-I1).
   */
  #pinned: { readonly id: ShippedExampleId; readonly nonce: number } | null = null;

  constructor(workspace: Workspace, read: AssetReader) {
    this.#workspace = workspace;
    this.#read = read;
  }

  /** The shipped example the current import came from, or null when it came from anywhere else. */
  currentCase(): ShippedExampleId | null {
    if (this.#pinned === null) return null;
    return this.#pinned.nonce === this.#workspace.loadNonce ? this.#pinned.id : null;
  }

  /**
   * Re-pin onto the CURRENT import — the session-restore seam. A restored session's text went
   * through the ordinary `Workspace.load`, so the catalogue never saw it; this tells the catalogue
   * which example that session began from. Refuses an unshipped id rather than pinning to a
   * document it cannot describe.
   */
  adoptCase(id: string): void {
    this.#assertShipped(id);
    this.#pinned = { id, nonce: this.#workspace.loadNonce };
  }

  /** What the menu may offer. Closed, and short for a stated reason. */
  ids(): readonly ShippedExampleId[] {
    return SHIPPED_EXAMPLE_IDS;
  }

  async describe(id: string): Promise<ExampleDescription> {
    this.#assertShipped(id);
    const [source, fixture] = await Promise.all([this.#source(id), this.#read(fixturePath(id))]);
    // `canonicalizeOnly` rather than a second parser: the models a description lists must be the
    // models the loaded system will report, and only the canonical form guarantees that.
    const system = Workspace.canonicalizeOnly(parse(source));
    const models: ExampleModelBlurb[] = [
      ...[...system.models.values()].map((m) => ({
        id: m.id, label: m.label, kind: "graph" as const,
      })),
      // Machines carry a purpose exactly as a graph model does. A description that listed only
      // `system.models` would under-count every example with a behavioural model.
      ...[...system.machines.values()].map((m) => ({
        id: m.id, label: m.label, kind: "machine" as const,
      })),
    ];
    const { title, summary } = readPresentation(id, fixture);
    return { id, title, summary, models };
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
    const result = this.#workspace.load(await this.#source(id));
    // Pin AFTER the load, against the nonce that load minted, and only when it took: a refused
    // import leaves the previous document — and the previous document's pin — in place.
    if (result.ok) this.#pinned = { id, nonce: this.#workspace.loadNonce };
    return result;
  }

  #assertShipped(id: string): asserts id is ShippedExampleId {
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
