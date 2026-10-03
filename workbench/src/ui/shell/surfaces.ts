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
  | "askbar" | "statusbar" | "palette" | "review" | "system-browser" | "advanced-query";

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
 * The three planned rows are honest about wave 0's boundary. The palette does not exist; the
 * review surface and the advanced query are the flat page's hypothesis bar and query builder,
 * standing where they stood, which is why they are `built` and the palette is not.
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
  {
    surface: "palette",
    status: "planned",
    note: "the command palette is the editing wave's (DESIGN-shell-261002.md §9, wave 2a). Nothing "
      + "in the page opens one yet, so a navigation path through it would name a region that does "
      + "not exist.",
  },
  // The review surface, as the flat page built it: a banner plus the two ways out of a hypothesis.
  // Wave 2c replaces it with the REVIEW CHANGE surface at the same id.
  built("review", "hypothesis-bar"),
  // The exhaustive entity/relation tables, still always visible. Wave 3 puts them behind the
  // System Browser menu entry; the region they live in is already its own.
  built("system-browser", "system-browser"),
  // The structured query builder, still where the flat page had it. Wave 1c moves it under a
  // disclosure; the surface is the fieldset either way.
  built("advanced-query", "form-ask", "control"),
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
