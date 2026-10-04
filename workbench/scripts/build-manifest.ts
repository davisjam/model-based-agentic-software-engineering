// The build's input manifest: the hash, the shape, and how to read one back.
//
// WHY THIS FILE EXISTS AT ALL. `build.mjs` records what esbuild read, as `path -> content hash`, so
// a consumer can ask "was this bundle built from this tree?" without trusting an mtime or a
// timestamp. Three places now ask it:
//
//   1. `build.mjs` WRITES the manifest.
//   2. `test/browser/harness.mjs` refuses to serve a bundle whose inputs have moved, because that
//      tier compares a page against registries it imported from source and reports the gap as a
//      product defect (see that function's note; it cost a false RED naming two element ids).
//   3. `scripts/check-published.ts` compares the manifest the LIVE SITE serves against the sources
//      at HEAD, which is how "6/6 pages live" stops being compatible with "every page is the old
//      build" — the 261003 near-miss this file's third consumer answers.
//
// Before this file there were TWO hand-written copies of the hash — one in `build.mjs`, one in
// `harness.mjs` — and the third consumer would have made a third. Two hash implementations that
// must agree is a parity hazard of exactly the kind the comparison exists to be free of: a producer
// that slices 16 hex characters and a consumer that slices 12 report drift in every file forever,
// and the message would blame the tree. One definition, three importers, and the compiler holds it.
// `test/published-currency.test.ts` asserts structurally that no consumer grows its own copy back.
import { createHash } from "node:crypto";

/**
 * Hex characters kept from each sha256 digest.
 *
 * 16 hex characters is 64 bits. This is a drift detector, not a security boundary — nobody is
 * choosing inputs to collide — and the manifest is read by humans in a diff, where 83 full digests
 * is noise. It is part of the manifest's WIRE FORMAT: changing it invalidates every manifest already
 * published, so `test/published-currency.test.ts` pins it against a known digest.
 */
export const HASH_LENGTH = 16;

/**
 * The manifest's hash of one input's bytes.
 *
 * CONTENT, never mtime. `git worktree add`, a branch switch and a checkout all rewrite source mtimes
 * without changing a byte, so an mtime comparison manufactures drift that is not there — and this
 * repo runs a dozen parallel agent worktrees, where that is the normal case rather than the edge.
 */
export const hashInput = (bytes: Uint8Array | string): string =>
  createHash("sha256").update(bytes).digest("hex").slice(0, HASH_LENGTH);

/** What `build.mjs` writes and every consumer reads. */
export interface BuildManifest {
  /**
   * When the build ran, ISO-8601.
   *
   * DIAGNOSTIC ONLY — never a freshness signal. A timestamp says a build happened, not what went
   * into it, so a stale deploy and a rebuilt-but-unchanged tree carry indistinguishable `builtAt`
   * values in opposite directions: an old one can be perfectly current, and a fresh one can be a
   * rebuild of the wrong commit. `inputs` is the signal; this is for the report's first line.
   */
  readonly builtAt: string;
  /** Package-relative source path -> `hashInput` of its bytes at build time. */
  readonly inputs: Readonly<Record<string, string>>;
}

/** Where `build.mjs` writes it, package-relative. The site serves it at `workbench/dist/`. */
export const MANIFEST_PATH = "dist/build-manifest.json";

/** A manifest, or why the text was not one. There is no third branch: unreadable is never "fine". */
export type ManifestRead =
  | { readonly ok: true; readonly manifest: BuildManifest }
  | { readonly ok: false; readonly problem: string };

/**
 * Parse a manifest's text, naming what arrived instead when it is not one.
 *
 * The caller may be reading a FETCHED body, so every malformed shape is reachable in production:
 * a Pages 404 page is HTML, a half-written file is truncated JSON, and a deploy that shipped
 * `dist/` without running the build serves nothing at all. Each must produce a sentence the reader
 * can act on rather than a `TypeError` from a property access on `undefined`.
 */
export function readManifest(text: string): ManifestRead {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const head = text.trim().slice(0, 60).replace(/\s+/g, " ");
    return {
      ok: false,
      problem: `not JSON (${error instanceof Error ? error.message : String(error)}); it begins `
        + `\`${head}\`. A Pages 404 page is HTML, which is the usual cause.`,
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, problem: `JSON, but a ${Array.isArray(parsed) ? "array" : typeof parsed}, not an object` };
  }
  const record = parsed as Record<string, unknown>;
  const { builtAt, inputs } = record;
  if (typeof inputs !== "object" || inputs === null || Array.isArray(inputs)) {
    return { ok: false, problem: "a JSON object with no `inputs` map, so there is nothing to compare against" };
  }
  const entries: Record<string, string> = {};
  for (const [path, hash] of Object.entries(inputs)) {
    if (typeof hash !== "string") {
      return { ok: false, problem: `\`inputs["${path}"]\` is a ${typeof hash}, not a hash string` };
    }
    entries[path] = hash;
  }
  if (Object.keys(entries).length === 0) {
    return { ok: false, problem: "an `inputs` map with no entries — a manifest that claims nothing cannot show drift" };
  }
  return {
    ok: true,
    manifest: { builtAt: typeof builtAt === "string" ? builtAt : "(absent)", inputs: entries },
  };
}
