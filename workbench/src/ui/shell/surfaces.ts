/**
 * The shell's navigable surfaces — the one table that says which regions exist and where they are.
 *
 * `DESIGN-shell-261002.md` §2.3 requires this: a navigation path declared in the capability
 * registry names a surface, and "every `NavSurface` value maps to a landmark or control id the page
 * declares (a SURFACES table exported by the shell), so a path cannot cite a surface nobody built."
 * This module is that table. The closure check that reads it belongs to the registry wave; the
 * table and the surfaces themselves are wave 0's.
 *
 * **One source of truth for region identity.** Every region module resolves its host through
 * `regionHost(...)` rather than typing an element id, so the id appears once here and once in
 * `index.html` as the attribute the browser needs — exactly the arrangement the affordance registry
 * already uses for control sites, and for the same reason: two hand-written copies of one string
 * agree only while somebody keeps them agreeing. A node-tier test asserts every built surface's
 * element is declared in the markup, which is the cheap rung that fires without a browser.
 *
 * **`NavSurface` lives here rather than in the capability registry**, which is a deviation from the
 * design's §2.2 sketch and a deliberate one. The vocabulary is a fact about the SHELL's regions —
 * this module builds them and knows when one is still unbuilt — and the registry's `NavStep` can
 * take the type by a type-only import without `src/app/` gaining a runtime dependency on `src/ui/`.
 * Declaring the union in the registry and the table here would have split one fact across two files
 * owned by two different waves.
 */

/**
 * The closed surface vocabulary. A path step naming anything else fails statically.
 *
 * Closed on purpose: an open `string` would let a navigation path cite a region that was never
 * designed, which is the unverifiable prose declaration §2.1 refuses.
 */
export type NavSurface =
  | "header" | "start" | "nav-models" | "nav-properties" | "workspace" | "inspector"
  | "askbar" | "statusbar" | "palette" | "review" | "system-browser" | "advanced-query"
  | "edit";

/**
 * What the surface is, so a generated keyboard drive knows how to arrive at it.
 *
 * A `landmark` is a named region a screen-reader user can jump to; a `control` is a single element
 * that is reached and activated. The distinction is the harness's, not the layout's.
 */
export type SurfaceKind = "landmark" | "control";

/**
 * A surface the page actually builds, and the element that carries it.
 *
 * Two members rather than one interface with an optional element, mirroring `HumanAffordance`:
 * the compiler then holds the thing a reviewer would otherwise have to check, and a surface cannot
 * claim to be built without naming where.
 */
export interface BuiltSurface {
  readonly surface: NavSurface;
  readonly status: "built";
  readonly kind: SurfaceKind;
  /** The `id` the page must present this surface as. Checked against `index.html` by the node tier. */
  readonly element: string;
}

/** A surface a later wave builds. The note says which, so the table is a work list and not a lie. */
export interface PlannedSurface {
  readonly surface: NavSurface;
  readonly status: "planned";
  /** Required, not optional: a planned surface with no reason is an aspiration. */
  readonly note: string;
}

export type Surface = BuiltSurface | PlannedSurface;

const built = (
  surface: NavSurface, element: string, kind: SurfaceKind = "landmark",
): BuiltSurface => ({ surface, status: "built", kind, element });

/**
 * The table. Every member of `NavSurface` appears exactly once — a test holds that shut, because a
 * surface missing from the table is a surface a path could cite with nothing to check it against.
 *
 * Every row is `built` since wave 2a, which landed the palette — the one surface wave 0 had to
 * declare `planned` because nothing in the page opened one. `PlannedSurface` stays in the type: the
 * honest declaration of an unbuilt region is the thing that let this row be a work list rather than
 * a lie, and the next surface a design adds needs it on day one.
 */
export const SURFACES: readonly Surface[] = [
  built("header", "header", "landmark"),
  built("start", "start"),
  built("nav-models", "nav-models"),
  // The property rail keeps `question-list`. `DESIGN-shell-261002.md` §5 pins the id — the browser
  // tier asserts against it — so the rail inherits the name rather than improving it.
  built("nav-properties", "question-list"),
  built("workspace", "workspace"),
  built("inspector", "inspector"),
  built("askbar", "askbar"),
  built("statusbar", "statusbar"),
  // The command palette, landed by wave 2a. A `control` rather than a `landmark`: it is a modal
  // `<dialog>`, so a harness does not Tab to it — it presses ⌘K or `#palette-open`, and everything
  // behind it is inert until it closes.
  built("palette", "palette", "control"),
  // The REVIEW CHANGE surface, landed by wave 2c at the id §5 pinned for it. A `control` rather
  // than a `landmark`, for the palette's reason: it is a modal `<dialog>`, so a harness does not Tab
  // to it — a change held for review opens it, and everything behind it is inert until the reviewer
  // chooses Discard or Commit.
  built("review", "hypothesis-bar", "control"),
  // The exhaustive entity/relation tables, still always visible. Wave 3 puts them behind the
  // System Browser menu entry; the region they live in is already its own.
  built("system-browser", "system-browser"),
  // The Advanced query DISCLOSURE, not one of the three fieldsets inside it.
  //
  // This row used to name `form-ask`, the query builder, which is one of the three fieldsets
  // `<details id="ask-advanced">` holds — the builder, Save as property, and Retract. Wave 1d found
  // the consequence by declaring paths against it: the save and retract sites were inside the
  // Advanced disclosure and OUTSIDE the surface meant to describe it, so their paths cited `askbar`
  // for both steps rather than a region that contains them. §9g ruled to widen and left the edit to
  // whoever owned the readers; measured again before taking it, the deferral's reason ("three gates
  // read `#form-ask`") no longer holds — the only remaining mention is this region's own
  // fieldset-disable list in `askbar.ts`, which reads the markup and not this table.
  //
  // A surface's job in a declared path is to CONTAIN the control, and the three fieldsets are one
  // disclosure to a person: one act opens all three. `control` rather than `landmark` for the
  // System Browser's reason (§9g) — a `<details>` carries no landmark role, so it is a thing the
  // keyboard reaches and activates, not a region an AT jumps to.
  built("advanced-query", "ask-advanced", "control"),
  // The ten pinned editing fieldsets. §5 gives them no region and §9a records why — correction 4
  // replaces them with the `+ Add` menu, the inspector's actions and the palette, so the finished
  // shell has nowhere to put them. The markup ships anyway, because six §19 keyboard drives reach
  // these operations by typing into fields a closed `<dialog>` would make unfocusable.
  //
  // A surface for a region a later wave DELETES, and that is the honest entry rather than the tidy
  // one. Ten wired affordance sites live here; a person loads a system and Tabs to them. The
  // vocabulary had no member for the region, so their only declarable path was the empty one —
  // which claims they are reachable on the PRISTINE page, and `#edit` is `hidden` there. A table
  // that admits a `planned` row for a region nobody built should admit a row for a region
  // everybody can walk to. Wave 3 removes the row with the markup.
  built("edit", "edit"),
];

/** Every surface the page builds, with its element. The binder and both test tiers walk this. */
export function builtSurfaces(): readonly BuiltSurface[] {
  return SURFACES.filter((s): s is BuiltSurface => s.status === "built");
}

/**
 * The element id a surface is presented as, or null while the surface is planned.
 *
 * Callers inside the shell use `regionHost` instead; this is for the checks and for a harness that
 * needs the selector without needing the element.
 */
export function surfaceElement(surface: NavSurface): string | null {
  const found = SURFACES.find((s) => s.surface === surface);
  return found !== undefined && found.status === "built" ? found.element : null;
}

/**
 * The live element for a built surface.
 *
 * Throws rather than returning null, and throws naming the surface: a region module asking for its
 * own host has no useful behaviour if the host is missing, and a blank region is a harder defect to
 * read than a boot-time failure. This is the same posture as `byId`.
 */
export function regionHost(surface: NavSurface): HTMLElement {
  const id = surfaceElement(surface);
  if (id === null) throw new Error(`surface '${surface}' is planned, not built — SURFACES has no element for it`);
  const node = document.getElementById(id);
  if (node === null) throw new Error(`index.html is missing #${id}, the host SURFACES declares for '${surface}'`);
  return node;
}
