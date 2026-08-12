#!/usr/bin/env python3
"""Driver for the governance-catalogue + skill test suite.

Registers the per-kind checks (see the `tests/` package: markdown / html / skill / external) and runs
them tiered:

  Tier 1 — pure stdlib, always runs, hard-fails: markdown schema + anchors, html well-formedness + link
           resolution, skill structure + bundle freshness + bundle link integrity.
  Tier 2 — external tools, run ONLY if Tier 1 is clean (fail-fast — don't pay for the ~88s browser pass
           on already-broken output): axe-core a11y, `claude plugin validate`. SKIP if the tool is absent
           (FAIL under --strict).

Adding a check = a function in the right `tests/<kind>.py` module + one `Check(...)` line in CHECKS below.
Run: `python3 catalog_tests.py [--strict]` (or `python3 catalog.py test`, which builds first).
Exit 0 = all pass; 1 = any FAIL (a Tier-2 SKIP becomes FAIL only under --strict).

**Incremental gating (`needs_run`).** A check may declare `needs_run(changed) -> bool` — a predicate over
the set of paths changed since `origin/main`. When it returns False the check SKIPs ("inputs unchanged"),
because its verdict is a pure function of those inputs. Only the expensive Tier-2 checks bother (axe's ~88s
browser pass, `claude plugin validate`); Tier-1 is sub-second, so it leaves `needs_run=None` (always run).
No baseline (missing `origin/main`) → everything runs — fail-safe.

**Book audit (`--book-audit`).** A separate AUDIT-ONLY report path over the embedded book (`tests/book.py`):
intra-book link integrity, a visual per chapter, section-length cap, thesis-woven, figure hygiene,
placeholder count. It prints findings and ALWAYS exits 0 — the book has deliberate draft gaps, so it must
never contribute to the suite's fail count. It runs disjoint from the pass/fail CHECKS above: `--book-audit`
runs only the report and returns; a normal run leaves the book untouched. Promote a book rule to blocking
only once the book clears it.
"""
from __future__ import annotations

import argparse
import sys
from typing import Callable, NamedTuple

from tests.book import (
    check_caption_orphan_gate,
    check_float_ref_gate,
    check_index_scan_hoist_parity,
    check_ir_render_fidelity,
    check_no_stray_comments,
    check_only_child_headings,
    check_only_child_headings_selftest,
    check_part_opener_traceability,
    run_book_audit,
)
from tests.book_models import (
    check_argument_spine,
    check_canon_pins,
    check_capability_ladder,
    check_chapter_identity,
    check_chapter_identity_conformance,
    check_chapter_shape,
    check_claims_model,
    check_flagship_stack,
    check_industry_cases,
    check_link_integrity,
    check_close_label_integrity,
    check_lit_positioning,
    check_supporting_sources,
    check_metaphor_slogan_index,
    check_metaphor_spans,
    check_outcomes_model,
    check_outline_model,
    check_part_title_parity,
    check_print_appendix_projection,
    check_research_agenda,
    check_projection_index,
    check_reverse_index,
    check_slogan_density,
    check_theory_model,
)
from tests.citations import (
    check_cite_fresh,
    check_cite_mirror,
    check_cite_orphans,
    check_cite_parity,
    check_cite_resolve,
    check_cite_symbology,
    check_scholar_meta,
)
from tests.common import FAIL, PASS, SKIP, changed_vs_origin
from tests.deploy import check_deploy_publishable
from tests.external import check_axe, check_axe_coverage_set, check_claude_validate, check_html_valid
from tests.html import (
    check_book_html_tracking,
    check_concepts_book_home,
    check_concepts_drift,
    check_concepts_hierarchy,
    check_concepts_reverse_coverage,
    check_concepts_site_home,
    check_data_claims,
    check_definitions_site,
    check_exactly_one_h1_per_page,
    check_exactly_one_h1_selftest,
    check_one_h1_per_served_source,
    check_one_h1_per_served_source_selftest,
    check_outcomes_site,
    check_html_links,
    check_no_duplicate_ids,
    check_no_empty_table_header,
    check_no_link_dpub_role_on_nonanchor,
    check_no_notation_leak,
    check_summary_no_flow_content,
)
from tests.markdown import check_markdown_anchors, check_markdown_schema, check_render_safety
from tests.mermaid_lint import check_mermaid_edge_labels
from tests.skill import (
    check_bundle_links,
    check_refresh_preserves_local,
    check_skill_drift,
    check_skill_local_adapter,
    check_skill_structure,
)
from tests.svg_fit import (
    check_svg_drawing_hygiene,
    check_svg_edge_label_box_collision,
    check_svg_page_fit,
    check_svg_stroke_crossthrough,
    check_svg_text_fit,
    check_svg_text_overlap,
)


class Check(NamedTuple):
    label: str
    tier: int  # 1 = stdlib always; 2 = external, fail-fast-gated
    run: Callable[[bool], tuple]  # (strict) -> (status, issues)
    needs_run: Callable[[frozenset[str]], bool] | None = None  # None => always run
    audit_only: bool = False  # True => reports candidates but never contributes to the fail count (a
    #                            heuristic still being tuned; promote to a real gate once its FP rate is
    #                            low enough). Kept out of the "N real checks" total in the plan/summary.


def _html_changed(changed: frozenset[str]) -> bool:
    """axe scans the served pages; the plugin bundle's HTML is gitignored, so a bare `.html` test only
    matches served output."""
    return any(f.endswith(".html") for f in changed)


def _plugin_changed(changed: frozenset[str]) -> bool:
    """`claude plugin validate` reads the plugin dir + its manifests."""
    return any(f.startswith("plugin/") or f.startswith(".claude-plugin/") for f in changed)


CHECKS = [
    Check("deploy: _is_publishable rejects every _design/ path (any ext); publishes real outputs", 1,
          lambda strict: check_deploy_publishable()),
    Check("markdown: schema + md-link existence", 1, lambda strict: check_markdown_schema()),
    Check("markdown: #anchor resolution", 1, lambda strict: check_markdown_anchors()),
    Check("render: XSS neutralization (escape seam + link scheme)", 1, lambda strict: check_render_safety()),
    Check("html: link + anchor resolution", 1, lambda strict: check_html_links()),
    Check("html: no duplicate element ids (stdlib twin of T2 no-dup-id)", 1, lambda strict: check_no_duplicate_ids()),
    Check("html: no flow content under <summary> (stdlib twin of T2 element-permitted-content)", 1, lambda strict: check_summary_no_flow_content()),
    Check("html: no empty <th> (stdlib twin of T2 empty-table-header)", 1, lambda strict: check_no_empty_table_header()),
    Check("html: no book notation leaks (whole-vocabulary; marker / {{token}} / [+emph+])", 1, lambda strict: check_no_notation_leak()),
    # BLOCKING (green at landing): a link-derived DPUB-ARIA role (doc-noteref / doc-biblioref / doc-glossref
    # / doc-backlink) on a non-<a> element — axe's aria-allowed-role rejects it, and it once blocked a
    # publish when the note-marker renderer put doc-noteref on a bare <sup>. A deterministic Tier-1 twin of
    # that ~88s browser pass, so the class can't regress without paying for axe. See tests/html.py.
    Check("html: no link-derived DPUB role on a non-<a> element (stdlib twin of axe aria-allowed-role)", 1,
          lambda strict: check_no_link_dpub_role_on_nonanchor()),
    # BLOCKING: the stdlib Tier-1 twin of axe's Tier-2 `page-has-heading-one` — that rule broke CI twice
    # (a page shipped with no <h1>); this catches the class deterministically at every push, before the slow
    # browser pass samples it. `exactly one` (not merely `at least one`) also catches the sibling defect axe
    # misses: a page emitting a SECOND <h1> (a duplicated chapter-title heading, or a section heading pitched
    # at h1 instead of h2) still satisfies `page-has-heading-one` but breaks the outline for screen-reader
    # heading navigation. Landed AUDIT-ONLY (rule #55 first landing); a fix-wave drained the pre-existing
    # offenders to 0, so this is now promoted to BLOCKING. See tests/html.py.
    Check("html: exactly one <h1> per page (stdlib twin of T2 page-has-heading-one)", 1,
          lambda strict: check_exactly_one_h1_per_page()),
    # Failure-injection self-test: proves the now-BLOCKING one-<h1> check still flags a 2-<h1> (and a 0-<h1>)
    # page on synthetic input, so a future refactor cannot silently degrade it to a green no-op.
    Check("html: one-<h1> check flags injected 2-<h1> / 0-<h1> pages (self-test)", 1,
          lambda strict: check_exactly_one_h1_selftest()),
    # Source-side twin of the one-<h1> check: renders each served markdown and checks its h1 arity, so a
    # page whose built .html is SHADOWED on a case-insensitive FS (INDEX.md -> INDEX.html coalesced with
    # index.html on macOS) is still checked. Closes the os.walk case-collision blind spot. See tests/html.py.
    Check("html: exactly one <h1> per served source (case-collision-immune twin)", 1,
          lambda strict: check_one_h1_per_served_source()),
    Check("html: source-side one-<h1> twin flags injected 2-<h1> source (self-test)", 1,
          lambda strict: check_one_h1_per_served_source_selftest()),
    Check("book: no stray HTML comments in source (source-side twin of notation-leak; stray-book-comment)", 1, lambda strict: check_no_stray_comments()),
    # BLOCKING (rule #55 promotion): every claim a Part opener foreshadows (its `<!-- part-foreshadows: … -->`
    # decorator) must trace to the spine — the id resolves, a chapter WITHIN that Part advances it, and it
    # reconciles to an ARGUMENT ANCHOR (a Big Idea OR a What-This-Book-Argues claim). Landed audit-only with
    # leg-(c) findings on four opener premises that mapped to no Big Idea; three now reconcile to their
    # WTBA-claim id and the fourth (grounded-in-one-case) was dropped from its Part opener's foreshadows, so
    # the loop closes for every declared id and this is promoted to blocking. See tests/book.py.
    Check("book: Part-opener foreshadow claims trace to spine + argument anchor + Part chapters (part-opener-traceability)", 1,
          lambda strict: check_part_opener_traceability()),
    Check("html: book/*.html <-> build outputs (no orphans, present + non-empty)", 1, lambda strict: check_book_html_tracking()),
    Check("book: every float introduced by a [ref:] cross-ref (book-float-ref)", 1, lambda strict: check_float_ref_gate()),
    # BLOCKING (green at landing): no table caption stranded on a page while its body flows to the next (the
    # 260805 Table 7.2-1 report). Runs the rendered-PDF caption-orphan sensor against book/mage-book.pdf when
    # present; SKIPs when no PDF is rendered (gitignored; built by --pdf). The authoritative twin is the
    # --pdf content-integrity gate on every push. The sticky-caption Typst show-rule drives it to 0. See
    # tests/book.py + build_book_html._pdf_orphan_caption_pages.
    Check("book: no orphaned table caption (caption rides with its body; PDF sensor)", 1,
          lambda strict: check_caption_orphan_gate()),
    Check("book: IR render-complete blocks render byte-identically (C->A migration net)", 1, lambda strict: check_ir_render_fidelity()),
    # BLOCKING byte-identity net for the index-scan hoist: the O(pages) precomputed `_scan_term_refs` MUST
    # agree with the naive per-term-renormalize reference (the pre-optimization algorithm, kept as the
    # oracle) for every index term over the live chapters. book-index.html is an always-rebuild aggregate,
    # so any divergence means the optimized build would ship different HTML. See tests/book.py.
    Check("book: index-scan hoist == naive reference for every term (byte-identity soundness net)", 1,
          lambda strict: check_index_scan_hoist_parity()),
    # BLOCKING (rule-#55 promotion): no only-child heading — a heading with EXACTLY one immediate next-level
    # child (a part with one content chapter, a page H1 with one H2, an H2 with one H3, an H3 with one H4).
    # Walks the two typed trees over the book IR (the volume part→chapter tree + the per-page H1→H2→H3→H4
    # tree). Landed audit-only, then the drain worklist (a redundant duplicate-title H2, a generated
    # single-family sub-heading, and the hand-authored one-child sections) was worked to 0 and this promoted
    # to blocking. See tests/book.py + book/_design/drafts/only-child-heading-sensor-DESIGN-260806.md.
    Check("book: no only-child heading (a heading with exactly one next-level child)", 1,
          lambda strict: check_only_child_headings()),
    Check("book: only-child predicate flags an injected 1-child tree (self-test)", 1,
          lambda strict: check_only_child_headings_selftest()),
    # Bibliography subsystem gates (book/_design/bibliography-subsystem-260801.md §8-§9). BLOCKING: every
    # [cite:] resolves to references.bib (BIB-2); citations.json is fresh vs the .bib (BIB-6); the
    # sidebar↔Works-Cited number mirror holds (BIB-4); citation glyphs (digits) and note glyphs (symbols)
    # are disjoint (BIB-7); every chapter <head> carries the highwire citation_* tags (BIB-8). An uncited
    # .bib entry is AUDIT-ONLY (author decision #4 — a bibliography may carry further-reading works).
    Check("book: CITE-RESOLVE — every [cite:] resolves to references.bib (BIB-2)", 1,
          lambda strict: check_cite_resolve()),
    Check("book: CITE-FRESH — citations.json in sync with references.bib (BIB-6)", 1,
          lambda strict: check_cite_fresh()),
    Check("book: CITE-MIRROR — sidebar citation N == Works-Cited entry N (BIB-4)", 1,
          lambda strict: check_cite_mirror()),
    Check("book: CITE-SYMBOLOGY — citation digits vs note symbols disjoint (BIB-7)", 1,
          lambda strict: check_cite_symbology()),
    Check("book: SCHOLAR-META — chapter <head> carries highwire citation_* tags (BIB-8)", 1,
          lambda strict: check_scholar_meta()),
    Check("book: CITE-PARITY — HTML + PDF surfaces cite the same keys from the same .bib (BIB-5)", 1,
          lambda strict: check_cite_parity()),
    Check("book: CITE-ORPHAN — a .bib entry nothing cites (audit-only; decision #4)", 1,
          lambda strict: check_cite_orphans(), audit_only=True),
    # AUDIT-ONLY (rule #55): the OUTLINE view-model drift + invariants (book-models/outline.json vs a fresh
    # derivation; O2 topic-sentence, O3 unique id, O4 nesting). The book's own "4+1 view held equal to the
    # source" discipline dogfooded on the book. Seeds 2 real O2 findings today, so it lands audit-only and
    # promotes to blocking once drained — the same landing the concept model's L1-L3 took. See tests/book_models.py.
    Check("book-models: outline view drift + invariants (outline.json)", 1,
          lambda strict: check_outline_model(), audit_only=True),
    # AUDIT-ONLY (rule #55): the OUTCOMES view-model — the book's 6th, pedagogical view (DESIGN §2.6).
    # Drift (outcomes.json vs a fresh derivation) + U1-U6 coverage/honesty (every outcome maps to a real
    # unit; every chapter/Part/book carries one; every provenance tag cites its grounding). Lands audit-only
    # as a representative PoC — chapters/Parts/book are covered; the uncovered-section list is the author's
    # fill worklist (printed by `outcomes_model.py gaps`), not a gate finding. See tests/book_models.py.
    Check("book-models: outcomes view drift + coverage (outcomes.json)", 1,
          lambda strict: check_outcomes_model(), audit_only=True),
    # AUDIT-ONLY-first (rule #55; rule-#33 parity): the two Part-title SSOTs — the reader-facing
    # `build_book_html._PART_TITLES` and the pedagogy digest's `outcomes_model.PART_TITLES` — must name each
    # shared Part identically, so a Part is never one title to the reader and another in the outcomes model.
    # Landed with the Part-2/3/4/5 rename (Modeling / Alignment / The MAGE Method / The Evidence); green at
    # landing, a follow-up promotes it to blocking after a clean session. See tests/book_models.py.
    Check("book-models: Part-title parity — _PART_TITLES == outcomes_model.PART_TITLES on shared keys", 1,
          lambda strict: check_part_title_parity(), audit_only=False),
    # AUDIT-ONLY-first (rule #55; rule-#33 parity): R3 canon-fidelity guard + R5 cycle pin. R3 asserts the
    # whole canon Modeling/Alignment Thesis is stated in a body chapter of its Part (pinned to the
    # argument-spine SSOT), so cutting the Preface Modeling-box cannot lose the canon — Alignment holds at
    # 3.1, Modeling is the transient gap a Part-2 body chapter closes in W2/W3 (1 finding today). R5 holds
    # any `mage-cycle`-anchored surface to the ONE pinned 3-line-method wording (canon_cycle_declared.json;
    # vacuous until the cycle surfaces land). Promotes BLOCKING once the Modeling gap drains. See
    # tests/book_models.py.
    Check("book-models: canon pins — R3 whole-thesis-in-Part guard + R5 3-line-method cycle pin", 1,
          lambda strict: check_canon_pins(), audit_only=False),
    # AUDIT-ONLY (rule #55): the REVERSE INDEX — a derived inversion of every built view's forward
    # references into {md symbol -> [dependent view elements]} (DESIGN §8). Two mechanical drift kinds:
    # FRESHNESS (reverse_index.json equals a fresh inversion) + STRUCTURAL (every view->md reference
    # resolves against the current source — no dangling section id / chapter / part). The drift layer's
    # substrate; also the `catalog.py views-audit` pre-commit entry point. See tests/book_models.py.
    Check("book-models: reverse-index drift — structural + freshness (reverse_index.json)", 1,
          lambda strict: check_reverse_index(), audit_only=True),
    # AUDIT-ONLY (rule #55 first landing): the PROJECTION metamodel sync gates. projections.json (authored)
    # names the book's rendered surfaces book-vs-website; projection-index.json (derived) inverts each
    # tracked concept slug onto the built HTML sites it renders in — the missing "where does concept X
    # render on BOTH surfaces" model a cross-cutting edit needs. FRESHNESS (index == a fresh scan of the
    # built HTML) + COMPLETENESS (every served surface claimed by exactly one projection; every index site
    # a real file) + SITE-HOME RECONCILE (a book-only definition whose concept has a website concept page —
    # the stale-site_home catch, 1 finding today: churn). Promote to blocking once the site-home finding is
    # reconciled and a clean session confirms freshness/completeness stay 0. See tests/book_models.py.
    Check("book-models: projection-index sync — freshness + completeness + site-home (projection-index.json)", 1,
          lambda strict: check_projection_index(), audit_only=True),
    # BLOCKING (rule #55 promotion, 260802 — drain confirmed 0 at HEAD): the CLAIMS view-model — a fifth
    # sibling model holding the book's load-bearing propositions + the contradiction predicate none of the
    # others carry (DESIGN book-claims-model-260801). C7-drift (claims.json vs a fresh derivation) + C1-C6
    # structural/schema (every home + asserted_at site resolves; every relates_to link resolves; every claim
    # carries a contradiction predicate; kind ∈ taxonomy + a distinction names two poles; asserted at ≥1
    # site; statement within the word cap). Landed audit-only, promoted to blocking once a clean session
    # confirmed the drain (rule #55). The SEMANTIC contradiction check + the watch-phrase lint stay
    # judgment-audit / audit-only forever (§4.2) — the watch-phrase lint surfaces candidates, never verdicts.
    Check("book-models: claims view drift + structure (claims.json)", 1,
          lambda strict: check_claims_model()),
    # BLOCKING (clean at landing): the CHAPTER-IDENTITY model — the surrogate-key dimension table the whole
    # book joins against (a frozen number-free `label` + the mutable `filename` per chapter; number derives
    # from the N.M- prefix, title from the <!-- chapter-title: --> comment, neither stored). Drift
    # (chapter_identity.json vs a fresh derivation) + CI1–CI5 bijection (unique labels; every filename on
    # disk; asymmetric outline coverage; number + title derivable). Clean at HEAD (40 rows, 37 outline
    # chapters covered, 3 non-outline rows permitted), so it lands blocking. See tests/book_models.py.
    Check("book-models: chapter-identity drift + bijection (chapter_identity.json)", 1,
          lambda strict: check_chapter_identity()),
    # BLOCKING (rule #55 promotion — drained): the CHAPTER-TEMPLATE CONFORMANCE sensor + dangling-label
    # backstop. TEMPLATE (per chapter file): exactly one <!-- chapter-title: -->, exactly one H1 (counted
    # outside code fences; the bare apparatus page 0.6-acknowledgments is H1-exempt by design), and a
    # filename prefix agreeing with outline reading order — the legs that make title()/number() derivation
    # safe. BACKSTOP: every migrated model's chapter-`label` ref resolves to a real labels() member (the
    # number-free-namespace precision net). The namespace note (a label that also names an outline
    # section-id) is informational, never gated — permissive resolution matches today's slug ∪ section
    # behavior. Landed audit-only with 5 non-conformers; the §4 fix-wave (0.3/3.7/4.5/5.1 H1s + 0.6
    # exemption) drained them to 0, so this is now promoted to BLOCKING. See tests/book_models.py.
    Check("book-models: chapter-template conformance + label backstop (chapter files)", 1,
          lambda strict: check_chapter_identity_conformance()),
    # BLOCKING (lands green at 0 dangling): the WHOLE-BOOK chapter-link integrity net — the primary
    # correctness mechanism for a renumber. Scans every book source for number-bearing chapter links
    # (`](N.M-slug.html)`) + `{{part:N}}` tokens and asserts each resolves to a live chapter slug / part,
    # renumber-aware (derived from the sources, not the built HTML). The one dangling class the build's
    # orphan gate (catches the reverse) and the post-build HTML scanner cannot see at the source. Appendix
    # links are build-rewritten + validated by check_html_links, so out of scope. See tests/book_models.py.
    Check("book-models: whole-book chapter-link integrity (link_integrity_check.py)", 1,
          lambda strict: check_link_integrity()),
    # BLOCKING (promoted round-8 W3 after the drain): the C5 named-reference -> current-identity check — the
    # Part-IV "portable moves" close cites destinations by NAME; this proves each named label still matches the
    # destination's CURRENT identity (chapter title / operator-card title), catching map::territory drift IN
    # the manuscript. A 2nd findings-function inside link_integrity_check.py consuming the existing resolvers
    # (§G-5). Landed AUDIT-ONLY at W1 with one finding open ('Brownfield Progress' -> the 'Brownfield Progress
    # Gauge' card); the W3 fix-wave drained it to 0, so this promotes to BLOCKING (rule #55). See tests/book_models.py.
    Check("book-models: Part-IV close named-reference integrity (link_integrity_check.py::close_label)", 1,
          lambda strict: check_close_label_integrity(), audit_only=False),
    # AUDIT-ONLY (rule #55 first landing): the ARGUMENT-SPINE view-model — the book's linear argument as an
    # ordered run of claims reconciling the author's seed statements, the claims model, and the Big Ideas,
    # plus the per-chapter labeling of which spine claims each chapter advances (editorial directive Phase 1).
    # AS1-drift (argument-spine.json vs a fresh derivation) + AS2–AS7 structural/schema (order + word cap;
    # reconciles links resolve AND cover every sibling claim/big-idea; chapter labels exhaustive over the
    # outline; exemption reasons in the closed enum). The FOCUS flags (0-claim / over-cap chapters) are the
    # artifact's `flags` block — editorial worklist, never findings. Promote to blocking after a clean
    # session, the claims model's own landing path. See tests/book_models.py.
    Check("book-models: argument-spine drift + structure (argument-spine.json)", 1,
          lambda strict: check_argument_spine(), audit_only=True),
    # AUDIT-ONLY (rule #55 first landing): the CHAPTER-SHAPE view-model — every chapter's opening/closing
    # assessed against the editorial directive's Task-2 discipline (opening: failure/question + answer +
    # thesis-link; closing: consequence | transition | synthesis, never a mere thesis re-announcement),
    # declared->generated beside the argument-spine (editorial directive Phase 2). CS1-drift
    # (chapter-shape.json vs a fresh derivation) + CS2–CS5 structural/schema (coverage exactly the
    # outline's chapters; presence/target/kind enums; 'none' iff absent; anchor freshness — a rewritten
    # opening/closing invalidates its assessment loudly, which is how the Phase-2c refactor is forced to
    # re-assess). The FLAG worklist (failing openings/closings + thesis-spine mismatches) is the
    # artifact's `flags` block — the 2c refactor worklist, never findings. Promote to blocking after a
    # clean session, the spine's own landing path. See tests/book_models.py.
    Check("book-models: chapter-shape drift + structure (chapter-shape.json)", 1,
          lambda strict: check_chapter_shape(), audit_only=True),
    # AUDIT-ONLY (rule #55 first landing): the FLAGSHIP-STACK view-model — the alternative appendix's
    # deep-dive PACKAGES (several catalogue entries that reinforce each other into one governed capability),
    # declared->generated beside the argument-spine / chapter-shape. Makes the deep-dive TEMPLATE
    # mechanically checkable: FS-drift (flagship-stack.json vs a fresh derivation) + FS1 join integrity
    # (every part slug resolves to a catalogue entry) + FS2 page shape (goal + GEE capability + an
    # overview_figure that EXISTS + ≥2 six-field parts) + FS3 figure house-rules (overflow sensor +
    # design-token palette) + FS5 freshness (the page renders the model's part-set). FS4 coverage is a
    # DEFERRED note until all seven stacks are populated. Lands audit-only with a single (Provenance +
    # fidelity) record; promote to blocking once the seven land and a clean session confirms the drain — the
    # spine / chapter-shape models' own landing path. See tests/book_models.py.
    Check("book-models: flagship-stack drift + structure (flagship-stack.json)", 1,
          lambda strict: check_flagship_stack(), audit_only=True),
    # AUDIT-ONLY (rule #55 first landing): the PRINT-APPENDIX PROJECTION guard — the print appendix emits a
    # page only for the ~29 flagship mechanisms, the web catalogue keeps all 83; this keeps that split from
    # drifting from catalogue-classification.json. Asserts flagship ⊆ real entries, every keep-as-L2 is a
    # print flagship OR a declared web-only exclude, and no promotion is already canonical. Lands audit-only
    # (0 findings today); promote to blocking after a clean session. See tests/book_models.py.
    Check("book-models: print-appendix projection split (print-appendix-manifest.json)", 1,
          lambda strict: check_print_appendix_projection(), audit_only=True),
    # AUDIT-ONLY (rule #55 first landing): the LITERATURE-POSITIONING view-model — the Literature-Positioning
    # Pass as a typed set of X→Y→Z interventions whose citations are MODELED objects {key, backs_claims,
    # relation} nested under the argument spine, declared->generated beside the argument-spine / flagship
    # models. LP-drift (lit-positioning.json vs a fresh derivation) + LP1 traceability/schema (X/Y/Z present;
    # ids + §N + status + relation enums; every cite backs ≥1 claim) + LP2 thesis join + LP3 landing
    # integrity (landed cites resolve in references.bib AND appear in a target chapter; planned cites PENDING,
    # not a finding) + LP4 location join + LP6 citation join (backs_claims resolve — the nest-under-the-spine
    # integrity the substantiation aggregator depends on). LP5 planned-vs-landed burndown is a derived note,
    # not a finding. Lands audit-only with §3 (graphify) + §4 (spec-driven dev) landed, the rest planned;
    # promote to blocking once the LPP prose waves land and a clean session confirms the drain — the spine /
    # chapter-shape / flagship models' own landing path. See tests/book_models.py.
    Check("book-models: literature-positioning drift + structure (lit-positioning.json)", 1,
          lambda strict: check_lit_positioning(), audit_only=True),
    # AUDIT-ONLY (rule #55 first landing): the METAPHOR + SLOGAN registry — every sustained metaphor's span
    # (introduced -> pays off) + recurrence (core = always live, exempt / local = must pay off before the next
    # local), AND every registered slogan (canonical phrasing, scope, and the idea it elaborates), so three
    # house rules are measurable: never open a 2nd metaphor before the 1st pays off; one canonical slogan per
    # idea; ration polished slogans. Asserts the structural invariants for both kinds (well-formedness, page +
    # anchor resolution, local-has-payoff / core-does-not, scope enum, the ratified 8-core/11-local +
    # 6/1/1-slogan split, elaborates-resolves = class f, one-canonical-per-idea = class a) AND that the
    # computed overlap set equals the ratified set (0 today). The structural half is BLOCKING in catalog.py
    # validate; this test lands audit-only while the overlap + density halves are audit-only-first — promote
    # once a clean session confirms them (the spine / chapter-shape / flagship models' landing path). See
    # tests/book_models.py.
    Check("book-models: metaphor + slogan registry structure + overlap metric (metaphor-spans.json)", 1,
          lambda strict: check_metaphor_spans(), audit_only=True),
    # BLOCKING: the slogan/metaphor OCCURRENCE-INDEX freshness gate — the derived metaphor-slogan-index.json
    # (every slogan canonical + competitor and every local metaphor image, with the site + nearest anchor it
    # renders at) must equal a fresh scan of the built book HTML, mirroring the projection index's can't-drift
    # discipline. The pre-commit hook regenerates + stages it after the build; a stale index reddens
    # catalog.py validate. See tests/book_models.py.
    Check("book-models: slogan/metaphor occurrence-index freshness (metaphor-slogan-index.json)", 1,
          lambda strict: check_metaphor_slogan_index()),
    # AUDIT-ONLY (rule #55 first landing): the SLOGAN-DENSITY worklist — the four ration classes (b competitor
    # at full strength / c over-use or clustering / d used-once violated / e tag-consistency) over the
    # registry + occurrence-index + the book's `<!-- slogan: id -->` tags. The Part-1 prose is over-sloganed,
    # so this surfaces the net-subtractive fix-wave worklist without gating; a follow-up promotes it once the
    # fix-wave drains it. The two born-blocking classes (a competing-canonical, f dangling) are asserted by
    # check_metaphor_spans. See tests/book_models.py.
    Check("book-models: slogan-density ration worklist (metaphor-spans.json + index + tags)", 1,
          lambda strict: check_slogan_density(), audit_only=True),
    # BLOCKING (rule #55 promotion — drain confirmed 0 at HEAD across a clean session): the THEORY-OF-MAGE
    # projection view-model — the 'Toward a Theory of MAGE' chapter's Seven-Hypotheses table is projected from
    # theory_of_mage_declared.json (H4 folds its H4a/H4b sub-hypotheses). Asserts the TM1-TM7 structural
    # invariants (delegated to theory_model_check), the parity check (chapter table == projection), and the
    # ratified count guard (7 hypotheses, 2 sub). Landed audit-only-first, promoted to blocking once a clean
    # session confirmed the chapter stays byte-equal to the projection (the dashboard model's own landing
    # path). A future chapter<->model drift now reddens the suite. See tests/book_models.py.
    Check("book-models: theory-of-mage hypotheses-table drift (theory_of_mage_declared.json)", 1,
          lambda strict: check_theory_model()),
    # AUDIT-ONLY (rule #55 first landing): the INDUSTRY-CASES model — the book's external-evidence base as a
    # queryable, drift-gated model. A six-site roster (Cloudflare authored + five pending-writeup stubs)
    # whose authored records project a DocAble+authored correspondence matrix against a declared, ordered
    # construct-universe column set, plus the live queries (constructs / bears-on / only-docable / coverage /
    # roster) the volume unlocks. Reports the STATUS-AWARE joins IC1 (schema/traceability — a stub needs only
    # the roster minimum) / IC2 (citation join) / IC3 (construct join) / IC4 (hypothesis join) / IC6 (roster
    # guard) + audit-only IC7; IC5 matrix parity is vacuous until the prose wave authors the matrix onto a
    # page. Lands audit-only-first (green from birth — Cloudflare authored from the projection); a follow-up
    # flips IC1-IC6 to blocking once a clean session confirms the drain. See tests/book_models.py.
    Check("book-models: industry-cases schema + joins (industry_cases_declared.json)", 1,
          lambda strict: check_industry_cases(), audit_only=True),
    # AUDIT-ONLY (rule #55 first landing): the CAPABILITY-LADDER model — the book's ONE canonical 8-rung
    # Representation Capability Ladder as a queryable, drift-gated model. The TEACHING abstraction projected
    # into the opening figure, the new Part 2 explanatory ladder, the Part 4 adoption path, the Appendix-A
    # stacks, the Appendix-E skill rung, and the Part 6 comparative. Reports CL0-drift + CL1 (rung id + order
    # 1..8 contiguous + non-empty text + closed lean enum) / CL2 (the modeling_ceiling_map is a TOTAL 12->8
    # join to the Part-6 empirical matrix — the ladder TEACHES, the matrix MEASURES, the map keeps them from
    # diverging) / CL3 (the closed anti-CMM guard is present). Lands audit-only-first (CL1-3 green from birth);
    # a follow-up flips CL1-CL3 to blocking once a clean session confirms the drain. See tests/book_models.py.
    Check("book-models: capability-ladder drift + structure (capability_ladder_declared.json)", 1,
          lambda strict: check_capability_ladder(), audit_only=True),
    # AUDIT-ONLY (rule #55 first landing): the SUPPORTING-SOURCES model — the book's Tier-2 corroboration corpus
    # as a queryable, drift-gated SIBLING of the industry-cases model. 19 records (18 engineering reports; Stripe
    # split into two sharing one citation_key), each naming the single claim it reinforces + the manuscript
    # anchor it sits beside + its render channel + a caution. Reports the joins SS1 (destination resolves) / SS2
    # (closed-vocab + citation) / SS3 (id) / SS4 (render-gate) / SS5 (caution) / SS6 (construct pointer) / SS7
    # (channel parity). On first landing every citation_key is TO-ADD (bib batch is a separate single-writer
    # pass), so SS2b reports one finding per record — expected, non-gating. A follow-up flips SS1-SS4 to
    # blocking once a clean session confirms the drain. See tests/book_models.py.
    Check("book-models: supporting-sources schema + joins (supporting_sources_declared.json)", 1,
          lambda strict: check_supporting_sources(), audit_only=True),
    # AUDIT-ONLY (rule #55 first landing): the RESEARCH-AGENDA model — the book's forward program as a
    # queryable INDEX over finished prose. Seven agenda items across four closed kinds (frontier / measurement
    # / dynamics / generalization), each welded to the falsifiable hypotheses (H1-H8) it tests and pointing at
    # the home chapter (6.5 / 6.1 / 6.2) that expands it. Reports the joins RA1 (schema — kind/status in the
    # declared taxonomies) / RA2 (hypothesis join — every related_hypotheses[] id resolves in
    # theory_of_mage_declared.json, IC4-style) / RA3 (section join — every source_section resolves to a real
    # chapter page) / RA4 (count guard, 7 items) + RA5 parity (prose-parity ACTIVE once the 'Where the frontier
    # goes next' coda is placed; figure-parity vacuous until the map SVG lands). Lands audit-only-first (green
    # from birth — the coda index is authored from the projection); a follow-up flips RA1-RA4 to blocking once a
    # clean session confirms the drain. See tests/book_models.py.
    Check("book-models: research-agenda schema + joins (research_agenda_declared.json)", 1,
          lambda strict: check_research_agenda(), audit_only=True),
    # AUDIT-ONLY (rule #55: audit-first for a new lint while wiring is partial): governed data
    # cross-references — every [data:X] resolves, each manifest source+anchor still exists, each `holds`
    # number still appears in the source (loose match), uncited entries warned. Keyed off data-claims.json.
    Check("book: data-claims manifest integrity (marker/anchor/holds/uncited)", 1,
          lambda strict: check_data_claims(), audit_only=True),
    # The concept model (book/data/concepts.json) drift lints — a typed model of the book's core concepts
    # joined book<->site by slug. L1 book-home presence + enum pre-check; L2 site-home card resolves on the
    # landing; L3 the DRIFT catch (book expands it, site has no card). Phase 2 drained the seed worklist to
    # zero, so L1/L2/L3 are now GATING (rule #55: audit-only-first → drain → promote to blocking). L4
    # (reverse coverage) stays a WARN — narrative/adoption cards legitimately back no concept; the honest
    # residual warns are informational, never gating.
    Check("concepts: L1 book-home presence + kind/status enum (concepts.json)", 1,
          lambda strict: check_concepts_book_home(), audit_only=False),
    Check("concepts: L2 site-home card resolves on landing (concepts.json)", 1,
          lambda strict: check_concepts_site_home(), audit_only=False),
    Check("concepts: L3 DRIFT catch — site-eligible+both must have a real card (concepts.json)", 1,
          lambda strict: check_concepts_drift(), audit_only=False),
    Check("concepts: L4 reverse coverage — landing card has a backing concept (warn)", 1,
          lambda strict: check_concepts_reverse_coverage(), audit_only=True),
    Check("concepts: L5 hierarchy cross-refs resolve (constructs + spine claims)", 1,
          lambda strict: check_concepts_hierarchy(), audit_only=True),
    # The SITE-AS-PROJECTION drift lints (book-models/SITE-VIEW.md) — the concept-model L1-L4 shape
    # extended to two more model surfaces the site projects: the four DEFINITIONS
    # (book/data/definitions.json ↔ the landing's `def-<slug>` cards) and the core learning-OUTCOMES view
    # (book-models/outcomes.json filtered by book/data/outcomes-site.json ↔ the landing's `outcome-<...>`
    # rows). Each asserts site↔model in both directions. AUDIT-ONLY-first (rule #55): the definitions'
    # Part-2 book home is still OWED, so these seed the drain worklist before promoting to blocking.
    Check("site-view: definitions projection drift (definitions.json ↔ landing def-* cards)", 1,
          lambda strict: check_definitions_site(), audit_only=True),
    Check("site-view: outcomes projection drift (outcomes.json/selection ↔ landing outcome-* rows)", 1,
          lambda strict: check_outcomes_site(), audit_only=True),
    Check("skill: structure + manifests", 1, lambda strict: check_skill_structure()),
    Check("skill: bundle freshness (no drift)", 1, lambda strict: check_skill_drift()),
    Check("skill: bundle link integrity", 1, lambda strict: check_bundle_links()),
    Check("skill: local-adapter plug wiring (INV-5 — declared overlays resolve, no orphan *.local.md)", 1,
          lambda strict: check_skill_local_adapter()),
    Check("skill: refresh preserves adopter overlays (INV-6 — install/refresh failure-injection)", 1,
          lambda strict: check_refresh_preserves_local()),
    # BLOCKING Tier-1 stdlib twin of the axe pass: the deterministic, model-derived a11y coverage set is
    # sound (one canonical page per template family, DERIVED not hardcoded, order-independent) — so every
    # structural page-shape sits in the every-run scan and the gate stays trustworthy between the exhaustive
    # publish scans, even on a browser-less runner where the axe pass itself SKIPs. See tests/external.py.
    Check("a11y: axe coverage set is sound (deterministic, one-per-template-family, derived)", 1,
          lambda strict: check_axe_coverage_set(strict)),
    Check("html: validity (html-validate)", 2, check_html_valid, needs_run=_html_changed),
    Check("html: axe-core accessibility", 2, check_axe, needs_run=_html_changed),
    Check("skill: claude plugin validate", 2, check_claude_validate, needs_run=_plugin_changed),
    # AUDIT-ONLY: a crude average-glyph-ratio estimate (~0.55 em) that over-reads label width by ~30-50%
    # (measured), so it over-flags. Box-overflow is owned by the accurate per-glyph gate (a model of the
    # print renderer, ~0.8% error) wired into `catalog.py validate`; this crude pass is retained only as a
    # low-harm pre-filter for the CANVAS-edge case that gate does not cover. audit_only matches the function's
    # always-PASS behavior and prevents a "promote to blocking" edit from detonating its false positives.
    Check("svg: text-fit pre-filter (canvas-edge; crude, superseded for box by the per-glyph gate)", 1,
          lambda strict: check_svg_text_fit(), audit_only=True),
    # AUDIT-ONLY: native-construct heuristic — a <marker orient=auto> arrowhead not drawn in the +x
    # convention (lands off-axis), a hand-stitched arrowhead outside a marker, or a <line> stroke running
    # through a <text> glyph box. The function hard-returns PASS (never contributes to the fail count);
    # audit_only matches that behavior and prevents a "promote to blocking" edit from detonating its
    # false positives. See tests/svg_fit.py.
    Check("svg: drawing hygiene (marker +x / stitched arrowhead / stroke-through-glyph / shaftless-arrow C5)", 1,
          lambda strict: check_svg_drawing_hygiene(), audit_only=True),
    # AUDIT-ONLY-first (rule #55): C3 intra-figure collision — a free connector label horizontally
    # overlapping a node <rect> it does not own with under a line-height of vertical clearance (the
    # asymmetric-inflate that catches the "compounds into" overhang the PAGE-level PDF sensors, treating
    # each figure as one opaque image, are blind to). Lands audit-only; promote to blocking in a follow-up
    # once a clean session confirms 0 findings across ALL assets. See tests/svg_fit.py.
    Check("svg: edge-label <-> node-box collision (C3, intra-figure)", 1,
          lambda strict: check_svg_edge_label_box_collision(), audit_only=True),
    # AUDIT-ONLY-first (rule #55): C6 text-label overlap — two <text> labels whose estimated glyph boxes
    # collide in both axes, printing on top of each other ("models stay inertno"). Neither the box-fit nor
    # the edge-label check compares two labels to EACH OTHER. Lands audit-only (3 figures flag at HEAD:
    # mage-method fixed here, plus model-coherence-stack + model-map awaiting a drain wave); promote to
    # blocking once a clean session confirms 0 across ALL assets. See tests/svg_fit.py.
    Check("svg: text-label overlap (C6, two captions on top of each other)", 1,
          lambda strict: check_svg_text_overlap(), audit_only=True),
    # AUDIT-ONLY-first (rule #55): C7 stroke cross-through — a stroked <path>/<line> (CURVES included, unlike
    # the straight-only stroke-through-glyph in drawing hygiene) running through a <text> or node <rect> it
    # neither starts nor ends at (endpoint-connection exempts the arrowhead's own target). Caught the
    # return-arc through the conversion hub + the green enrich-arc through "enrich model" here. Lands
    # audit-only (~10 figures flag at HEAD — a mix of real reroutes + likely FPs to triage in a drain wave);
    # promote to blocking once drained to 0. See tests/svg_fit.py.
    Check("svg: stroke cross-through unrelated element (C7, curved connectors)", 1,
          lambda strict: check_svg_stroke_crossthrough(), audit_only=True),
    # BLOCKING (promoted — drain confirmed 0 at HEAD): a figure whose viewBox aspect projects past the page
    # bottom at image(width:85%) and clips. Deterministic (a pure function of the viewBox), unlike the crude
    # glyph-width heuristics above, so it is a real gate; it found the messy-timeline figure at 11.6in on a
    # 9in page. check_svg_page_fit now returns FAIL on any overflow. See svg_fit.py.
    Check("svg: page-fit (figure projected height overflows the page)", 1,
          lambda strict: check_svg_page_fit()),
    # BLOCKING: a mermaid edge-label pipe (`A -->|label| B`) carrying `[`, `]`, or `~>` breaks the parser
    # at render time with a cryptic message. Lands as a real gate check — the tree is at 0 findings.
    Check("book: mermaid edge-label footguns ([ ] / ~> inside |label|)", 1,
          lambda strict: check_mermaid_edge_labels()),
]

REAL_CHECKS = [c for c in CHECKS if not c.audit_only]  # the gate — the count the summary reports


def main() -> int:
    ap = argparse.ArgumentParser(description="Governance-catalogue + skill test suite.")
    ap.add_argument("--strict", action="store_true", help="treat a Tier-2 SKIP (missing tool) as failure")
    ap.add_argument("--full", action="store_true", help="run every check regardless of needs_run — the "
                    "authoritative pass. CI MUST use this: post-push, HEAD == origin/main, so incremental "
                    "gating would skip everything. Local predeploy stays incremental and trusts CI's green.")
    ap.add_argument("--tier1", action="store_true", help="run ALL Tier-1 deterministic checks (force, not "
                    "incremental) and SKIP the slow Tier-2 external passes — the fast pre-push gate")
    ap.add_argument("--book-audit", action="store_true", help="run the AUDIT-ONLY book structural report "
                    "(visual-per-chapter, section-length, thesis-woven, figure hygiene, placeholders) and "
                    "exit 0 — never contributes to the fail count. Disjoint from the pass/fail CHECKS.")
    args = ap.parse_args()

    if args.book_audit:
        return run_book_audit()

    # --full and --tier1 both force run-everything for the checks they DO run (reusing the no-baseline
    # fail-safe). --tier1 additionally skips every Tier-2 external pass (fast deterministic pre-push gate);
    # --full runs both tiers; otherwise incremental.
    changed = None if (args.full or args.tier1) else changed_vs_origin()
    base = ("Tier-1 only (--tier1; Tier-2 external passes skipped)" if args.tier1 else
            "full scan (--full)" if args.full else
            "no origin/main baseline — running all" if changed is None else
            f"{len(changed)} path(s) changed vs origin/main")
    print(f"== Test plan: {len(REAL_CHECKS)} gate checks + {len(CHECKS) - len(REAL_CHECKS)} audit-only "
          f"(Tier 1 stdlib first; Tier 2 external — axe/claude — run only if Tier 1 is clean; "
          f"{'strict' if args.strict else 'skip-if-absent'}); {base} ==")
    failed = skipped = 0

    def _emit(c: Check):
        nonlocal failed, skipped
        if changed is not None and c.needs_run and not c.needs_run(changed):
            status, issues = SKIP, ["inputs unchanged since origin/main"]
        else:
            status, issues = c.run(args.strict)
        # An audit-only check reports candidates but never counts — render it [audit], not [ok]/[FAIL].
        mark = "audt" if c.audit_only else {PASS: "ok  ", FAIL: "FAIL", SKIP: "skip"}[status]
        print(f"  [{mark}] (T{c.tier}) {c.label}")
        for it in issues:
            for line in str(it).splitlines():
                print(f"          {line}")
        if not c.audit_only:
            failed += status == FAIL
            skipped += status == SKIP

    for c in CHECKS:  # Tier 1: cheap, stdlib
        if c.tier == 1:
            _emit(c)
    tier2 = [c for c in CHECKS if c.tier == 2]
    if args.tier1:  # fast pre-push gate: run every Tier-1 check, skip the slow external passes entirely
        for c in tier2:
            print(f"  [skip] (T{c.tier}) {c.label} — skipped: --tier1 gate (Tier-2 runs in CI's --full)")
        skipped += len(tier2)
    elif failed:  # fail-fast: skip the expensive external passes if a cheap check already failed
        for c in tier2:
            print(f"  [skip] (T{c.tier}) {c.label} — skipped: fix the failed Tier-1 check(s) first")
        skipped += len(tier2)
    else:
        for c in tier2:
            _emit(c)
    n = len(REAL_CHECKS)  # audit-only checks are reported but excluded from the pass/fail tally
    print(f"== {n} gate checks: {n - failed - skipped} passed, {failed} failed, {skipped} skipped "
          f"(+ {len(CHECKS) - n} audit-only, non-gating) ==")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
