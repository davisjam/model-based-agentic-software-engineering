/**
 * The transaction vocabulary — a typed mirror of `mage-transaction.schema.json`.
 *
 * **Ids are immutable (V2), so there is no rename op** and this union deliberately has no shape for
 * one. `set-label` changes the human-readable label; changing identity is `delete-entity` plus
 * `add-entity`, which makes the consequences — every relation and model list that referenced the
 * old id — visible in the diff instead of silently rewritten.
 *
 * Optionals are written `?: T | undefined` rather than `?: T` because `exactOptionalPropertyTypes`
 * is on: the parser builds these objects from loosely-typed input and needs to be able to assign a
 * missing field without a conditional spread at every site.
 */
import type { Finding, NoteKind, Scalar } from "../ir/types.ts";
import type { CanonicalSystem } from "../ir/types.ts";
import type { MageDocument } from "../yaml/document.ts";

/**
 * The note vocabulary as a value, so a parser and a form can both enumerate it.
 *
 * Typed `Record<NoteKind, true>` rather than an array: the compiler then refuses this file if the
 * IR's `NoteKind` union gains a member, which an array of strings would not. The union itself lives
 * beside `Note` in the IR, where it belongs; the kernel exports no value, so the closed set is
 * named here once and imported by both the transaction parser and the editing forms.
 */
export const NOTE_KINDS: Readonly<Record<NoteKind, true>> = {
  comment: true, rationale: true, assumption: true, question: true, todo: true,
};

export const isNoteKind = (v: string): v is NoteKind => v in NOTE_KINDS;

/**
 * A note an operation will write.
 *
 * Nested under the op's `note` key rather than flattened into it, because `id` at the top level
 * addresses the TARGET and a note has an id of its own. Two meanings for one key is how an agent
 * annotates the wrong object.
 */
export interface NoteDraft {
  readonly kind: NoteKind;
  readonly text: string;
  readonly id?: string | undefined;
  /** "human" | "agent" — which side wrote it. Not an identity claim. */
  readonly author?: string | undefined;
  readonly at?: string | undefined;
}

export type Operation =
  | { readonly op: "set-label"; readonly id: string; readonly value: string }
  | {
      readonly op: "set-property"; readonly id: string; readonly name: string;
      readonly value?: Scalar | undefined; readonly domain?: string | undefined;
      readonly unset?: true | undefined;
    }
  | {
      readonly op: "add-entity"; readonly id: string; readonly type?: string | undefined;
      readonly label?: string | undefined; readonly contains?: readonly string[] | undefined;
    }
  | { readonly op: "delete-entity"; readonly id: string; readonly cascade?: boolean | undefined }
  | { readonly op: "add-state"; readonly machine: string; readonly state: string; readonly label?: string | undefined }
  | {
      readonly op: "delete-state"; readonly machine: string; readonly state: string;
      readonly cascade?: boolean | undefined;
    }
  | {
      readonly op: "add-transition"; readonly machine: string; readonly from: string; readonly to: string;
      readonly label?: string | undefined; readonly sync?: string | undefined;
      readonly requires?: Readonly<Record<string, unknown>> | undefined;
      readonly effects?: Readonly<Record<string, string>> | undefined;
    }
  | {
      readonly op: "delete-transition"; readonly machine: string; readonly index?: number | undefined;
      readonly from?: string | undefined; readonly to?: string | undefined; readonly sync?: string | undefined;
    }
  | {
      readonly op: "add-relation"; readonly model: string; readonly from: string; readonly to: string;
      readonly type: string; readonly id?: string | undefined; readonly label?: string | undefined;
    }
  | {
      readonly op: "delete-relation"; readonly model: string; readonly id?: string | undefined;
      readonly from?: string | undefined; readonly to?: string | undefined; readonly type?: string | undefined;
    }
  | {
      readonly op: "set-purpose"; readonly scope: "model" | "machine"; readonly id: string;
      readonly question?: string | undefined; readonly represents?: readonly string[] | undefined;
      readonly omits?: readonly string[] | undefined;
    }
  | {
      readonly op: "add-model"; readonly id: string; readonly label?: string | undefined;
      readonly entities?: readonly string[] | undefined;
    }
  /**
   * Extend a model's membership with an entity the system already declares.
   *
   * ## The gap this closes
   *
   * A graph model's membership IS its `entities:` list, and until this op nothing extended one.
   * `add-entity` reaches the identity namespace; `add-model` writes a membership only at creation.
   * So adding a component to an existing model was unperformable through this vocabulary — and the
   * route students took instead, `add-entity` plus `add-relation`, half-landed: the engine builds
   * its adjacency from relations, so it answered using an entity the model never declared, and a
   * fresh load of the exported bytes was clean. V40 now refuses that state, which makes this op the
   * other half of one change rather than a convenience beside it.
   *
   * ## Why there is no inverse here
   *
   * Nothing in this union removes a single membership entry, and the omission is survivable rather
   * than overlooked: `delete-entity` with `cascade` drops the entry AND every relation naming the
   * entity in one pass, so no path can leave a model asserting an edge to an id it stopped
   * declaring. The missing op is narrowing a model's reduction while keeping the entity — a real
   * act, and one whose refusal condition is the interesting part, since dropping a member an edge
   * still names must be blocked rather than cascaded (the edge is a claim, as `delete-model`
   * already argues). It wants its own design rather than a mirror of this one.
   */
  | { readonly op: "add-model-entity"; readonly model: string; readonly id: string }
  /** No `cascade`: a model's relations are claims, not pointers. See `modelReferences`. */
  | { readonly op: "delete-model"; readonly id: string }
  /**
   * Non-semantic by A1, so this commits without advancing the revision. Addressing mirrors
   * `delete-relation` for scope `relation`: by the relation's id, or by its endpoints.
   */
  | {
      readonly op: "add-note"; readonly scope: "entity" | "model" | "relation";
      readonly note: NoteDraft;
      readonly id?: string | undefined; readonly model?: string | undefined;
      readonly from?: string | undefined; readonly to?: string | undefined;
      readonly type?: string | undefined;
    }
  | { readonly op: "save-query"; readonly id: string; readonly query: Readonly<Record<string, unknown>> }
  | { readonly op: "delete-query"; readonly id: string };

export type OpName = Operation["op"];

export interface Transaction {
  /** Hash of the canonical IR these ops were computed against. Never a file hash. */
  readonly base: string;
  /** `main` is authoritative; any other name is a hypothesis branch. */
  readonly target: string;
  readonly rationale: string | null;
  readonly operations: readonly Operation[];
}

// ----------------------------------------------------------------------------------------------
// Results
// ----------------------------------------------------------------------------------------------

/**
 * Why a transaction did not commit. One case per stage of the fixed pipeline, so a caller can tell
 * "your premise is stale" from "your op is impossible" from "the result would be an invalid model"
 * — three very different things for an agent to do next.
 */
export type RejectionKind =
  | "malformed"          // the transaction object itself does not conform
  | "base-mismatch"      // computed against a system that is no longer current
  | "operation-failed"   // an op could not apply (missing target, ambiguous match, blocked delete)
  | "validation-failed"; // the resulting system violates the semantic rules

export interface Rejection {
  readonly kind: RejectionKind;
  /** Human-facing sentence. Its structured twin is `kind` + `where` + `findings` (FR-A11Y-2). */
  readonly message: string;
  /** `operations[3]` / `transaction.base` / null. */
  readonly where: string | null;
  /** Rule-tagged findings, same shape and ids the validator and `validate.py` use. */
  readonly findings: readonly Finding[];
}

/** A committed state. The history is a stack of THESE, never of inverse operations. */
export interface Revision {
  readonly document: MageDocument;
  readonly system: CanonicalSystem;
  readonly hash: string;
  readonly rationale: string | null;
  /** Ops that produced this revision from its predecessor; empty for the loaded baseline. */
  readonly operations: readonly Operation[];
}

export type TransactionOutcome = "committed" | "rejected";

/**
 * There is no boolean here either. `outcome` names what happened, `rejection` carries why, and
 * `systemHash` is the hash of the system that is current NOW — which equals `baseHash` on every
 * rejection, because a rejected transaction leaves the system byte-identical.
 */
export interface TransactionResult {
  readonly outcome: TransactionOutcome;
  readonly revision: Revision | null;
  readonly rejection: Rejection | null;
  /** Hash of the system the engine held when the transaction arrived. */
  readonly baseHash: string;
  /** Hash of the system the engine holds now. Unchanged from `baseHash` iff rejected. */
  readonly systemHash: string;
}
