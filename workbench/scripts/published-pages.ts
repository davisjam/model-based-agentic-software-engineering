// The published site's base URL, the URLs it must serve, and the probe that reads both.
//
// THE NEAR-MISS THIS EXISTS FOR, 261003. Verifying the published site meant typing a base URL and
// curling a few paths. The base typed was `https://davisjam.github.io/governance-catalog/` — this
// repository's DIRECTORY name — and all five URLs returned 404 against a site that was completely
// healthy. The real base comes from the remote, which is
// `git@github.com:davisjam/model-based-agentic-software-engineering.git`.
//
// The uniformity of the failure is what saved it. Five 404s read as "my probe is wrong" rather than
// "the site is down", so the probe was checked before an outage was reported. That is luck, not a
// control. A base that HALF resolves — a redirect, a stale custom domain, a branch preview — reports
// a green site that is not the site, or a red site that is fine, and nothing in the output says which.
//
// Two facts therefore move out of memory and into source: the base is DERIVED from `origin`, and the
// URL list is DECLARED below. A third follows from the same argument — a 200 proves a server
// answered, not that the right page arrived — so every URL carries a string the right page has and a
// wrong-but-live page does not, declared beside the URL so the pair cannot drift apart.
//
// Everything here is pure: no network, no filesystem, no `git`. The entry point `check-published.ts`
// gathers those inputs and injects them, which is what lets the negative control drive this logic
// with a wrong-but-live site in the offline test tier.
//
// LIVENESS ONLY, and that is the second lesson rather than an omission. On 261003 this probe reported
// `6/6 declared pages live` over pages that were all the PREVIOUS build. Every assertion here was
// true: a server answered, and the page that answered was the right page. Which REVISION arrived is a
// different question, and the content shapes above are deliberately stable literals so a copy edit
// cannot fail them — which is precisely what makes them blind to staleness. `published-currency.ts`
// answers currency, from the build manifest the site itself serves, and the report keeps the two
// verdicts separate so neither green line can be read as the other's answer.
import { hashInput } from "./build-manifest.ts";

/** One page the site publishes, paired with the evidence that the right page arrived. */
export interface PublishedPage {
  /** Site-relative, no leading slash. The empty string is the landing page. */
  readonly path: string;
  /** A literal the response body must contain. Cheap and stable beats clever. */
  readonly mustContain: string;
  /** Why that string identifies this page, so a later reader can tell drift from breakage. */
  readonly why: string;
  /**
   * The repo-root-relative file this URL is served BYTE-FOR-BYTE from, or null when it is not.
   *
   * This is the CURRENCY half of the row, and it is separate from `mustContain` because the two
   * answer different questions: the content shape says the right PAGE arrived, this says the right
   * REVISION of it did. `mustContain` is a stable literal on purpose — a title, a landmark id — so
   * that a copy edit does not fail the probe, which is exactly why it cannot detect staleness.
   *
   * Non-null only where the publishing workflow rsyncs a committed file into the artifact unchanged.
   * A page BUILT in CI — catalog.py regenerates the landing from its markdown, MkDocs builds the
   * course, Typst renders the book — has no committed bytes to compare against, and comparing the
   * committed artifact of a generator would assert the generator's determinism rather than the
   * deploy's currency. Required rather than optional so that a new row has to DECIDE: an absent
   * field reads as "not verbatim" and as "nobody looked" at the same time.
   */
  readonly verbatimFrom: string | null;
}

/**
 * Every URL the published site must serve.
 *
 * ADDING A PUBLISHED PAGE MEANS ADDING A ROW HERE. Before this list existed it lived in an
 * orchestrator's memory, which made it checkable by accident and forgettable by default — the second
 * half of the near-miss above, and the half that would have survived a corrected base URL.
 */
export const PUBLISHED_PAGES: readonly PublishedPage[] = [
  {
    path: "",
    mustContain: "<title>MAGE — Model-Based Agentic Engineering</title>",
    why: "the landing page's own title. Another site serving this path has a different one, and the "
      + "GitHub Pages 404 page has its own.",
    // `catalog.py build` regenerates this file from index.md in CI, so the committed copy is a build
    // artifact rather than the served bytes. Its header says DO NOT EDIT.
    verbatimFrom: null,
  },
  {
    path: "workbench/",
    mustContain: "<title>MAGE Model Workbench</title>",
    why: "the workbench shell's title, hand-authored in index.html rather than rendered, so it moves "
      + "only when someone renames the app.",
    // Hand-authored, and `workbench` is in catalog.py's NON_SITE_DIRS, so the render never touches
    // it and the rsync copies it unchanged. This is the file the 261003 staleness was first SEEN in,
    // and no bundle input covers it — esbuild never reads the shell.
    verbatimFrom: "workbench/index.html",
  },
  {
    path: "workbench/learn.html",
    mustContain: "id=\"learn-main\"",
    why: "the Learn page's main landmark. A structural element rather than prose, so a copy edit to "
      + "the gallery does not fail this check.",
    verbatimFrom: "workbench/learn.html",
  },
  {
    path: "teach/reference-course/syllabus/",
    mustContain: "<title>Syllabus - Teach with MAGE</title>",
    why: "MkDocs builds this page into the site artifact at /teach. The title proves that build ran, "
      + "not merely that the path resolves to something.",
    // MkDocs emits it into _site/teach; nothing committed holds the served bytes.
    verbatimFrom: null,
  },
  {
    path: "book/",
    mustContain: "mage-book/index.html",
    why: "this path serves a meta-refresh STUB, not the book, so its content shape is the destination "
      + "it points at. Asserting a title here would assert the stub's title and read as the book.",
    verbatimFrom: null,
  },
  {
    path: "book/mage-book/index.html",
    mustContain: "<h1>Model-Based Agentic Engineering",
    why: "the book's real front page, which /book/ only redirects to and the landing links directly. "
      + "Checking the stub alone passes with the entire book missing.",
    // The publish step copies the BUILT book/web tree into _site/book/mage-book/; the source tree is
    // excluded from the artifact.
    verbatimFrom: null,
  },
];

/** Where a base URL came from. An OVERRIDDEN base is not a derived one, and the report says so. */
export type BaseSource = "cname" | "github-pages" | "override";

/** A derived base, or a refusal. There is no third branch: a probe must never guess its own target. */
export type BaseResult =
  | { readonly ok: true; readonly base: string; readonly source: BaseSource }
  | { readonly ok: false; readonly refusal: string };

/** The inputs a base URL is derived from, gathered by the caller so this stays pure. */
export interface SiteFacts {
  /** `git remote get-url origin`, or null when there is no origin or `git` refused. */
  readonly remote: string | null;
  /** The published CNAME file's contents, or null when the site publishes none. */
  readonly cname: string | null;
  /** An explicit `--base`, or null. */
  readonly override: string | null;
}

/**
 * `owner` and `repo` out of either spelling GitHub hands out.
 *
 * The `.git` suffix is optional because the HTTPS form is commonly pasted without it. Anything else —
 * a GitLab remote, a local path, a typo — does not match, and a non-match is a refusal rather than a
 * default. A probe that silently falls back to a guess is the bug this file exists to prevent.
 */
const GITHUB_REMOTE = /^(?:git@github\.com:|https:\/\/github\.com\/)([^/\s]+)\/(\S+?)(?:\.git)?$/;

/** Pages serves directories; a base without the trailing slash would join paths wrong. */
const withSlash = (url: string): string => (url.endsWith("/") ? url : `${url}/`);

/**
 * The base URL of the published site, or a refusal naming what was found.
 *
 * Precedence: an explicit override, then a custom domain, then the `github.io` form. A CNAME wins
 * because Pages serves the site FROM that domain and redirects the `github.io` form to it — so once
 * one exists, every assertion against the derived `github.io` base is measuring a redirect. There is
 * no CNAME today; the branch is here, and tested, rather than left to be discovered by whoever adds
 * one.
 */
export function deriveBase(facts: SiteFacts): BaseResult {
  if (facts.override !== null) {
    return { ok: true, base: withSlash(facts.override.trim()), source: "override" };
  }

  const cname = (facts.cname ?? "").trim();
  if (cname.length > 0) return { ok: true, base: `https://${cname}/`, source: "cname" };

  if (facts.remote === null) {
    return {
      ok: false,
      refusal: "`git remote get-url origin` produced nothing, so there is no repository to derive a "
        + "base URL from. Pass `--base <url>` to probe a site explicitly.",
    };
  }
  const remote = facts.remote.trim();
  const match = GITHUB_REMOTE.exec(remote);
  if (match === null) {
    return {
      ok: false,
      refusal: `\`origin\` is \`${remote}\`, which is not a GitHub remote this check can turn into a `
        + `Pages URL. It handles \`git@github.com:owner/repo.git\` and `
        + `\`https://github.com/owner/repo\`. Pass \`--base <url>\` to probe a site explicitly.`,
    };
  }
  const owner = match[1] ?? "";
  const repo = match[2] ?? "";
  return { ok: true, base: `https://${owner}.github.io/${repo}/`, source: "github-pages" };
}

/** One HTTP response, reduced to what this check reads. */
export interface PageResponse {
  /** The status code, or 0 when the request never completed — a DNS failure, a refused connection. */
  readonly status: number;
  /** The body, or the error's message when `status` is 0. */
  readonly body: string;
}

/** How the probe reaches the network. Injected, so the negative control can run offline. */
export type Fetcher = (url: string) => Promise<PageResponse>;

export interface PageVerdict {
  readonly url: string;
  readonly ok: boolean;
  /** Empty when ok; otherwise what was wrong, in one line. */
  readonly problem: string;
  /**
   * `hashInput` of the body, or null when nothing arrived (status 0, or a non-200).
   *
   * Carried on the LIVENESS verdict so the CURRENCY check needs no second request: one fetch answers
   * both questions, and a second pass could see a different revision mid-deploy and compare the two
   * halves of its own report against different sites. A failed body is null rather than hashed —
   * the hash of a 404 page is a number about GitHub's 404 page.
   */
  readonly bodyHash: string | null;
}

/**
 * Every declared page, in order.
 *
 * Sequential rather than concurrent: six requests, and a serial walk keeps the output readable and
 * the failure attributable. No retries — a retry turns "the site is down" into "the site was slow",
 * which is a different question than the one this answers.
 */
export async function probePages(
  base: string,
  pages: readonly PublishedPage[],
  get: Fetcher,
): Promise<readonly PageVerdict[]> {
  const verdicts: PageVerdict[] = [];
  for (const page of pages) {
    const url = `${base}${page.path}`;
    const res = await get(url);
    if (res.status === 0) {
      verdicts.push({ url, ok: false, problem: `the request did not complete: ${res.body}`, bodyHash: null });
    } else if (res.status !== 200) {
      verdicts.push({ url, ok: false, problem: `HTTP ${res.status}`, bodyHash: null });
    } else if (!res.body.includes(page.mustContain)) {
      verdicts.push({
        url,
        ok: false,
        problem: `HTTP 200, but the body does not contain \`${page.mustContain}\` — ${page.why} A `
          + `server answered; the page we publish did not arrive.`,
        bodyHash: null,
      });
    } else {
      verdicts.push({ url, ok: true, problem: "", bodyHash: hashInput(res.body) });
    }
  }
  return verdicts;
}
