"""Drift checks for the book's typed 4+1 view-models (`book-models/`).

The book preaches (Part 3) that every view is a typed model held equal to the source by a build-time drift
check — derived, never snapshotted. This module dogfoods that on the book itself: it re-derives each
view-model from the book via `book-models/` (over `book_ir`) and fails on divergence.

CURRENTLY IMPLEMENTED:

OUTLINE view (the PoC; DESIGN §2.1):
  - O1 (drift): the materialized `book-models/outline.json` equals a fresh derivation from the book. A
    heading added / removed / renumbered / re-anchored without regenerating the artifact is a finding.
  - O2/O3/O4 (invariants): every section has a topic sentence; section ids are unique per chapter; heading
    nesting is well-formed. Walked by `outline_model.invariant_findings`.

OUTCOMES view (DESIGN §2.6):
  - drift: `book-models/outcomes.json` equals a fresh derivation (declared outcomes + derived candidates).
  - U1–U7 (coverage / honesty): each outcome has a PRIMARY unit (chiefly teaches it — drives coverage) plus
    elaborative SECONDARY units (reinforce it — do NOT drive coverage). Primary drives coverage: every
    chapter / Part / the book must be the PRIMARY of ≥1 outcome (an elaborative-only unit is still a GAP);
    every primary/secondary unit resolves; every verb is in the taxonomy; every provenance tag (derived |
    declared | gap-recommended) cites its grounding. Walked by `outcomes_model.coverage_findings`. The
    no-primary-section list (`section_gap_findings`) is the author's fill worklist — informational, not gated.

REVERSE INDEX (the drift layer's substrate; DESIGN §8):
  - freshness: `book-models/reverse_index.json` equals a fresh inversion of the built views' forward refs.
  - structural: every view->md reference resolves against the current source (no dangling section id /
    chapter / part / concept / label). One walk over the inverted edges. Walked by
    `reverse_index.structural_findings`. This is the STRUCTURAL + FRESHNESS half of the two-kind drift
    split — mechanical, a lint; the SEMANTIC half is a review-gate agent audit (DESIGN §8), not here.

LANDS AUDIT-ONLY (repo rule-#55 discipline). The book carries deliberate draft gaps, and the outline seed
surfaces 2 real O2 findings today; landing this blocking-red would break the gate. So it registers
`audit_only=True` in catalog_tests.py, reports its findings, and never contributes to the fail count. A
follow-up promotes it to blocking once the O2 findings are drained (a topic sentence added to the two
sections, or the check refined to accept an epigraph/list-led section). This mirrors exactly how the
concept model's L1–L3 landed (audit-only → drain → gate).
"""
from __future__ import annotations

import json
import os
import re
import sys

from tests.common import FAIL, PASS, ROOT, rel

_BOOK_MODELS = os.path.join(ROOT, "book-models")
if _BOOK_MODELS not in sys.path:
    sys.path.insert(0, _BOOK_MODELS)


def check_outline_model():
    """The outline view's drift + invariant check (audit-only). Re-derives the outline from the book and
    reports: O1 the on-disk artifact matches a fresh derivation; O2/O3/O4 the outline's own invariants.
    Keyed off `book-models/outline.json` + the book prose (via book_ir)."""
    import outline_model as om  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []

    # O1 — drift: the stored artifact equals a fresh derivation.
    outline = om.derive_outline()
    fresh = om.to_jsonable(outline)
    stored = om.load_artifact()
    if stored is None:
        issues.append(f"{rel(om._ARTIFACT)} missing — run `python3 book-models/outline_model.py regenerate`")
    elif stored.get("chapters") != fresh["chapters"] or stored.get("_counts") != fresh["_counts"]:
        issues.append(f"O1 DRIFT: {rel(om._ARTIFACT)} disagrees with a fresh derivation from the book — "
                      f"regenerate with `python3 book-models/outline_model.py regenerate`")

    # O2/O3/O4 — the outline's structural invariants.
    issues.extend(om.invariant_findings(outline))

    # Audit-only: the caller (catalog_tests.py Check(audit_only=True)) renders these as [audt] and excludes
    # them from the fail tally, so returning FAIL-with-issues surfaces them without gating. Kept explicit
    # here so a future promotion to blocking is a one-line flip in catalog_tests.py, not a rewrite.
    return (FAIL if issues else PASS), issues


def check_outcomes_model():
    """The outcomes view's drift + coverage check (audit-only). Re-derives the outcome model from the book
    (declared outcomes + derived candidates) and reports: drift against the on-disk artifact; U1–U7 the
    coverage / honesty invariants (primary drives coverage — every chapter/Part/book is the PRIMARY of an
    outcome; every primary/secondary unit resolves; verb+bloom consistent; every provenance tag cites its
    grounding). Keyed off `book-models/outcomes.json` + `outcomes_declared.json` + the book prose (via
    book_ir)."""
    import outcomes_model as ocm  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []

    # Drift — the stored artifact equals a fresh derivation.
    model = ocm.derive_model()
    fresh = ocm.to_jsonable(model)
    stored = ocm.load_artifact()
    if stored is None:
        issues.append(f"{rel(ocm._ARTIFACT)} missing — run "
                      f"`python3 book-models/outcomes_model.py regenerate`")
    elif stored.get("outcomes") != fresh["outcomes"] or stored.get("_counts") != fresh["_counts"]:
        issues.append(f"DRIFT: {rel(ocm._ARTIFACT)} disagrees with a fresh derivation from the book — "
                      f"regenerate with `python3 book-models/outcomes_model.py regenerate`")

    # U1–U7 — coverage (primary-driven) + honesty invariants (unit resolution, verb+bloom, provenance,
    # elaborative-unit resolution).
    issues.extend(ocm.coverage_findings(model))

    # Audit-only: same non-gating contract as check_outline_model — surfaced as [audt], excluded from the
    # fail tally. The uncovered-section list is deliberately NOT included here (it is the expected PoC
    # backlog, not a defect); `python3 book-models/outcomes_model.py gaps` prints it for the author.
    return (FAIL if issues else PASS), issues


def check_claims_model():
    """The claims view's drift + structural check (audit-only). Re-derives the claim model from the
    hand-authored `claims_declared.json` and reports: C7-drift against the on-disk artifact; C1-C6 the
    structural / schema invariants (every home + asserted_at site resolves; every relates_to link resolves;
    every claim carries a contradiction predicate; kind ∈ taxonomy + a distinction names two poles; every
    claim is asserted at ≥1 site or flagged implicit; statement within the word cap). The SEMANTIC
    contradiction check is a review-gate judgment-audit, NOT walked here (DESIGN §4.2). Keyed off
    `book-models/claims.json` + `claims_declared.json` + the outline + sibling models."""
    import claims_model as clm  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []

    # C7-drift — the stored artifact equals a fresh derivation.
    fresh = clm.to_jsonable()
    stored = clm.load_artifact()
    if stored is None:
        issues.append(f"{rel(clm._ARTIFACT)} missing — run "
                      f"`python3 book-models/claims_model.py regenerate`")
    elif stored.get("claims") != fresh["claims"] or stored.get("_counts") != fresh["_counts"]:
        issues.append(f"DRIFT: {rel(clm._ARTIFACT)} disagrees with a fresh derivation — regenerate "
                      f"with `python3 book-models/claims_model.py regenerate`")

    # C1-C6 — structural / schema invariants (site + link resolution, contradiction predicate, kind + pole
    # shape, assertion coverage, word cap).
    issues.extend(clm.structural_findings())

    # Audit-only: same non-gating contract as the sibling view checks — surfaced as [audt], excluded from
    # the fail tally. A follow-up promotes C1-C6 + freshness to blocking once a clean session confirms the
    # seed drains to 0; the watch-phrase lint (C7) stays audit-only forever (DESIGN §4.2).
    return (FAIL if issues else PASS), issues


def check_chapter_identity():
    """The chapter-identity model's drift + bijection check (BLOCKING — clean at landing). Re-derives the
    identity table from the hand-authored `chapter_identity_declared.json` and reports: drift against the
    on-disk `chapter_identity.json`; CI1–CI5 the bijection invariants (unique labels; every filename on
    disk; asymmetric outline coverage — every outline chapter has a row, the 3 non-outline rows permitted;
    number derivable from the N.M- prefix; title derivable from exactly one `<!-- chapter-title: -->`). This
    is the surrogate-key model the whole book joins against — a forgotten row on ADD or a stale filename on
    rename reddens here. Keyed off `book-models/chapter_identity.json` + `_declared.json` + the outline."""
    import chapter_identity_model as cim  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []

    fresh = cim.to_jsonable()
    stored = cim.load_artifact()
    if stored is None:
        issues.append(f"{rel(cim._ARTIFACT)} missing — run "
                      f"`python3 book-models/chapter_identity_model.py regenerate`")
    elif stored.get("chapters") != fresh["chapters"] or stored.get("_counts") != fresh["_counts"]:
        issues.append(f"DRIFT: {rel(cim._ARTIFACT)} disagrees with a fresh derivation — regenerate "
                      f"with `python3 book-models/chapter_identity_model.py regenerate`")

    issues.extend(cim.structural_findings())
    return (FAIL if issues else PASS), issues


def check_chapter_identity_conformance():
    """The chapter-template conformance sensor + dangling-label backstop (AUDIT-ONLY first per the repo's
    blocking-lint landing discipline; promoted BLOCKING once the non-conformers drain). Two layers:

    - TEMPLATE (per file): every chapter file carries exactly one `<!-- chapter-title: -->`, exactly one H1
      (counted OUTSIDE fenced code so a `# ` inside a ``` block is not miscounted), and a filename prefix
      agreeing with its outline reading order. This is what makes `title()`/`number()` derivation safe.
    - BACKSTOP (cross-model): every migrated downstream model's chapter-`label` reference resolves to a real
      member of `chapter_identity.labels()` — the precision net for the number-free namespace (the field
      the design calls out, since a bare label shares the slug namespace with outline section-ids).

    The namespace note (a label that also names an outline section-id) is INFORMATIONAL only — permissive
    resolution matches today's `slug ∪ section` behavior, no regression — so it never contributes to the
    fail tally. Keyed off the chapter files + the migrated declared models + the outline."""
    import chapter_identity_model as cim  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []
    # Template legs 1+2 over all 40 chapter files, plus leg 3 (prefix ↔ outline order).
    issues.extend(cim.conformance_findings())
    issues.extend(cim._prefix_order_findings())
    # Dangling-label backstop over the migrated models (skips non-bare-label values on a half-migrated tree).
    issues.extend(_chapter_label_backstop_findings(cim))
    # The namespace note is surfaced but NOT gated — print it, exclude from the fail tally.
    for note in cim._namespace_findings():
        issues.append(note)
    gating = [i for i in issues if not i.startswith("namespace-note:")]
    return (FAIL if gating else PASS), issues


def _chapter_label_backstop_findings(cim) -> "list[str]":
    """Resolve every migrated model's chapter-`label` reference against `cim.labels()`. On a HALF-migrated
    tree a field may still hold a numbered `N.M-slug`; such values are skipped (still gated by the owning
    model's own resolver), so this backstop only reddens on a value that LOOKS like a bare label yet names
    no chapter — the dead-ref class that rotted silently before this model existed."""
    labels = cim.labels()
    out: "list[str]" = []

    def _bare_label_miss(val: str) -> bool:
        # A migrated value: no 'N.M-' prefix, no ':' namespace, not a section-anchor we can't judge here.
        return isinstance(val, str) and bool(val) and not re.match(r"^\d+\.\d+-", val) \
            and ":" not in val and not val.startswith("part-") and val != "book"

    def _load(rel_path: str):
        p = os.path.join(ROOT, rel_path)
        return json.load(open(p, encoding="utf-8")) if os.path.isfile(p) else None

    # claims: home + asserted_at chapter refs.
    d = _load("book-models/claims_declared.json")
    for c in (d or []) if isinstance(d, list) else (d or {}).get("claims", []):
        vals = [c.get("home")] + list(c.get("asserted_at", []))
        for v in vals:
            if _bare_label_miss(v) and v not in labels and v not in _section_ids_cache(cim):
                out.append(f"backstop: claims ref {v!r} resolves to no chapter label")
    return out


_SECTION_IDS: "set[str] | None" = None


def _section_ids_cache(cim) -> "set[str]":
    global _SECTION_IDS
    if _SECTION_IDS is None:
        import outline_model as om  # noqa: E402
        _SECTION_IDS = {s.section_id for _c, s in om.derive_outline().sections()}
    return _SECTION_IDS


def check_argument_spine():
    """The argument-spine view's drift + structural check (audit-only first landing). Re-derives the spine
    model from the hand-authored `argument_spine_declared.json` and reports: AS1-drift against the on-disk
    artifact; AS2–AS9 the structural / schema invariants (spine size + order + word cap; every `reconciles`
    link resolves against the claims + big-ideas siblings AND the reconciliation is complete both ways;
    chapter labeling exhaustive over the outline's chapters; every advanced id resolves; chapter exemption
    reasons in the closed enum (AS7); AS8 freshness — every claim's `reviewed_hash` equals its current
    statement hash, so a statement edited without a re-review reddens (the CS5 analogue); AS9 claim
    exemptions — reason in the closed CLAIM_EXEMPT_REASONS enum and key names a spine claim). The FLAG block
    — chapter-side focus smells (a non-exempt chapter advancing 0 or >3 claims) AND claim-side health
    sensors (a non-exempt claim advanced by 0 chapters = gap, only within Part 0/1 = front-loaded, or by
    more than OVERMAP_CAP = an overmapping-audit surface) — is the artifact's `flags` block: editorial
    worklist, deliberately NOT findings here. Keyed off `book-models/argument-spine.json` +
    `argument_spine_declared.json` + the outline + sibling models."""
    import argument_spine_model as asm  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []

    # AS1-drift — the stored artifact equals a fresh derivation.
    fresh = asm.to_jsonable()
    stored = asm.load_artifact()
    if stored is None:
        issues.append(f"{rel(asm._ARTIFACT)} missing — run "
                      f"`python3 book-models/argument_spine_model.py regenerate`")
    elif any(stored.get(k) != fresh[k] for k in ("spine", "chapters", "flags", "_counts")):
        issues.append(f"DRIFT: {rel(asm._ARTIFACT)} disagrees with a fresh derivation — regenerate "
                      f"with `python3 book-models/argument_spine_model.py regenerate`")

    # AS2–AS7 — structural / schema invariants.
    issues.extend(asm.structural_findings())

    # Audit-only: same non-gating contract as the sibling first landings — surfaced as [audt], excluded
    # from the fail tally. A follow-up promotes AS1–AS7 to blocking after a clean session (the claims
    # model's own landing path); the focus flags never gate.
    return (FAIL if issues else PASS), issues


def check_chapter_shape():
    """The chapter-shape view's drift + structural check (audit-only first landing, rule-#55 discipline).
    Re-derives the shape model from the hand-authored `chapter_shape_declared.json` (joined against the
    argument-spine's exemptions + advances and the outline's chapter tree) and reports: CS1-drift against
    the on-disk artifact; CS2–CS5 the structural / schema invariants (assessment coverage exactly the
    outline's chapters; presence / thesis-target / closing-kind enums; 'none' target coherent with an
    absent thesis link; anchor freshness — a rewritten opening/closing invalidates its assessment). The
    FLAG worklist (failing openings / failing closings / thesis-spine mismatches) is the artifact's
    `flags` block — the Phase-2c refactor worklist, deliberately NOT findings here. Keyed off
    `book-models/chapter-shape.json` + `chapter_shape_declared.json` + the spine + the book prose."""
    import chapter_shape_model as csm  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []

    # CS1-drift — the stored artifact equals a fresh derivation.
    fresh = csm.to_jsonable()
    stored = csm.load_artifact()
    if stored is None:
        issues.append(f"{rel(csm._ARTIFACT)} missing — run "
                      f"`python3 book-models/chapter_shape_model.py regenerate`")
    elif any(stored.get(k) != fresh[k] for k in ("chapters", "flags", "_counts")):
        issues.append(f"DRIFT: {rel(csm._ARTIFACT)} disagrees with a fresh derivation — regenerate "
                      f"with `python3 book-models/chapter_shape_model.py regenerate`")

    # CS2–CS5 — structural / schema invariants (coverage, enums, coherence, anchor freshness).
    issues.extend(csm.structural_findings())

    # Audit-only: same non-gating contract as the sibling first landings — surfaced as [audt], excluded
    # from the fail tally. A follow-up promotes CS1–CS5 to blocking after a clean session (the claims and
    # spine models' landing path); the flag worklist never gates.
    return (FAIL if issues else PASS), issues


def check_flagship_stack():
    """The flagship-stack view's drift + structural check (audit-only first landing, rule-#55 discipline).
    A flagship stack is a PACKAGE of catalogue entries the alternative appendix deep-dives; this model makes
    the deep-dive TEMPLATE mechanically checkable. Re-derives the model from the hand-authored
    `flagship_stack_declared.json` (joined against the catalogue entries on disk) and reports: FS-drift
    against the on-disk artifact; FS1 join integrity (every `parts[].slug` resolves to a real catalogue
    entry); FS2 page shape (non-empty goal + a GEE `capability` + an overview_figure that EXISTS + ≥ MIN_PARTS
    parts, each with all six template fields non-empty; ids unique + kebab); FS3 figure house-rules (the
    overview figure passes the overflow sensor + the design-token palette); FS5 freshness (the page source
    renders the model's part-set — the figure and every part slug appear). FS4 coverage is a DEFERRED note
    while the model carries fewer than the full seven stacks (surfaced by the model CLI, not a finding here).
    Keyed off `book-models/flagship-stack.json` + `flagship_stack_declared.json` + the catalogue entries."""
    import flagship_stack_model as fsm  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []

    # FS-drift — the stored artifact equals a fresh derivation.
    fresh = fsm.to_jsonable()
    stored = fsm.load_artifact()
    if stored is None:
        issues.append(f"{rel(fsm._ARTIFACT)} missing — run "
                      f"`python3 book-models/flagship_stack_model.py regenerate`")
    elif any(stored.get(k) != fresh[k] for k in ("stacks", "_counts")):
        issues.append(f"DRIFT: {rel(fsm._ARTIFACT)} disagrees with a fresh derivation — regenerate "
                      f"with `python3 book-models/flagship_stack_model.py regenerate`")

    # FS1–FS3 + FS5 — structural / schema invariants (join, page shape, figure house-rules, freshness).
    issues.extend(fsm.structural_findings())

    # Audit-only: same non-gating contract as the sibling first landings — surfaced as [audt], excluded
    # from the fail tally. A follow-up promotes FS1–FS5 to blocking once all seven stacks are populated and
    # a clean session confirms the drain (the claims / spine / chapter-shape models' landing path).
    return (FAIL if issues else PASS), issues


def check_lit_positioning():
    """The literature-positioning view's drift + structural check (audit-only first landing, rule-#55
    discipline). The Literature-Positioning Pass models every place the book situates itself against outside
    work as an X→Y→Z intervention whose citations nest under the argument spine. Re-derives the model from
    the hand-authored `lit_positioning_declared.json` (joined against the argument spine, references.bib, and
    the book chapters) and reports: LP-drift against the on-disk artifact; LP1 traceability + schema (every
    intervention carries non-empty X/Y/Z; ids unique + kebab; §N section; status + citation relation in the
    closed enums; every citation backs ≥1 spine claim); LP2 thesis join (every `advances_theses` id resolves
    to a real spine claim); LP3 landing integrity (for status:landed records, every citation resolves in
    references.bib AND appears in a target chapter — planned records' cites are PENDING, not a finding);
    LP4 location join (every target_location is a real chapter slug); LP6 citation join (every citation's
    `backs_claims` resolves to a real spine claim — the nest-under-the-spine integrity the substantiation
    aggregator depends on). LP5 (planned-vs-landed burndown) is a DERIVED note surfaced by the model CLI, not
    a finding here. Keyed off `book-models/lit-positioning.json` + `lit_positioning_declared.json` + the
    argument spine + references.bib + the book chapters."""
    import lit_positioning_model as lpm  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []

    # LP-drift — the stored artifact equals a fresh derivation.
    fresh = lpm.to_jsonable()
    stored = lpm.load_artifact()
    if stored is None:
        issues.append(f"{rel(lpm._ARTIFACT)} missing — run "
                      f"`python3 book-models/lit_positioning_model.py regenerate`")
    elif any(stored.get(k) != fresh[k] for k in ("interventions", "_counts")):
        issues.append(f"DRIFT: {rel(lpm._ARTIFACT)} disagrees with a fresh derivation — regenerate "
                      f"with `python3 book-models/lit_positioning_model.py regenerate`")

    # LP1–LP6 — structural / schema + join invariants (traceability, thesis join, landing integrity,
    # location join, citation join). LP3 for planned records is PENDING, not a finding.
    issues.extend(lpm.structural_findings())

    # Audit-only: same non-gating contract as the sibling first landings — surfaced as [audt], excluded from
    # the fail tally. A follow-up promotes LP1–LP6 to blocking once the LPP prose waves land and a clean
    # session confirms the drain (the spine / chapter-shape / flagship models' landing path).
    return (FAIL if issues else PASS), issues


def check_theory_model():
    """The theory-of-mage projection view's drift check (audit-only first landing, rule-#55 discipline). The
    'Toward a Theory of MAGE' chapter's Seven-Hypotheses table is a projection of the declared model
    (`theory_of_mage_declared.json`): this re-derives the model and reports the STRUCTURAL invariants
    (TM1-TM7, delegated to `theory_model_check.check()` — internal well-formedness), the PARITY check (the
    chapter's table equals `render_hypotheses_table_md()`), and the ratified COUNT guard (7 hypotheses, 2
    sub-hypotheses). Keyed off `book-models/theory_of_mage_declared.json` + the theory chapter prose."""
    import theory_of_mage_model as tmm  # noqa: E402 — path set above; the book-model package

    issues = list(tmm.all_findings())

    # Audit-only: same non-gating contract as the sibling first landings — surfaced as [audt], excluded from
    # the fail tally. A follow-up promotes the parity + count guard to blocking once a clean session confirms
    # the chapter stays byte-equal to the projection (the dashboard model's own landing path).
    return (FAIL if issues else PASS), issues


def check_industry_cases():
    """The industry-cases model's schema + join check (audit-only first landing, rule-#55 discipline). The
    book's external-evidence base (`industry_cases_declared.json`) is a queryable model: a six-site roster
    (Cloudflare authored + five pending-writeup stubs) whose authored records project a DocAble+authored
    correspondence matrix. Re-derives the model and reports the STATUS-AWARE joins — IC1 schema/traceability
    (kebab-unique id; a stub needs only the roster minimum; an authored record additionally carries in-range
    enums + correspondence/descriptive vocabs), IC2 citation join (authored citation_key resolves in
    references.bib AND citations.json), IC3 construct join (every cell resolves against the declared construct
    universe), IC4 hypothesis join (every hypotheses[] id resolves to a real theory hypothesis), IC6 roster
    guard (record id-set == roster id-set + field agreement), and audit-only IC7 scale-fact presence. IC5
    matrix parity is VACUOUS this wave — the matrix is not yet authored into a chapter page. Keyed off
    `book-models/industry_cases_declared.json` + references.bib + citations.json + theory_of_mage_declared.json."""
    import industry_cases_model as icm  # noqa: E402 — path set above; the book-model package

    issues = list(icm.all_findings())

    # Audit-only: same non-gating contract as the sibling first landings — surfaced as [audt], excluded from
    # the fail tally. A follow-up flips IC1-IC6 to blocking once a clean session confirms the drain (and the
    # prose wave wires IC5 matrix parity onto a real page).
    return (FAIL if issues else PASS), issues


def check_capability_ladder():
    """The capability-ladder model's drift + structural check (audit-only first landing, rule-#55 discipline).
    The book's ONE canonical 8-rung Representation Capability Ladder — the TEACHING abstraction projected into
    the opening figure, the new Part 2 explanatory ladder, the Part 4 adoption path, the Appendix-A stacks,
    the Appendix-E skill rung, and the Part 6 comparative. Re-derives the model from the hand-authored
    `capability_ladder_declared.json` (joined against the 12-rung modeling_ceiling_ladder in
    industry_cases_declared.json) and reports: CL0-drift against the on-disk artifact; CL1 (rung id + order
    1..N contiguous with N==8 + non-empty text + closed lean enum), CL2 (the modeling_ceiling_map is a TOTAL
    12->8 join — covers every empirical rung and every value resolves to a teaching rung, so the ladder that
    TEACHES and the matrix that MEASURES cannot diverge), CL3 (the closed anti-CMM guard is present). Keyed
    off `book-models/capability-ladder.json` + `capability_ladder_declared.json` + industry_cases_declared.json."""
    import capability_ladder_model as clm  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []

    # CL0-drift — the stored artifact equals a fresh derivation.
    fresh = clm.to_jsonable()
    stored = clm.load_artifact()
    if stored is None:
        issues.append(f"{rel(clm._ARTIFACT)} missing — run "
                      f"`python3 book-models/capability_ladder_model.py regenerate`")
    elif any(stored.get(k) != fresh[k] for k in ("guard", "gradient", "rungs", "modeling_ceiling_map", "_counts")):
        issues.append(f"DRIFT: {rel(clm._ARTIFACT)} disagrees with a fresh derivation — regenerate "
                      f"with `python3 book-models/capability_ladder_model.py regenerate`")

    # CL1–CL3 — structural / schema invariants (rung shape + total 12->8 join + anti-CMM guard).
    issues.extend(clm.structural_findings())

    # Audit-only: same non-gating contract as the sibling first landings — surfaced as [audt], excluded from
    # the fail tally. A follow-up promotes CL1–CL3 to blocking once a clean session confirms the drain.
    return (FAIL if issues else PASS), issues


def check_supporting_sources():
    """The supporting-sources model's schema + join check (audit-only first landing, rule-#55 discipline). The
    book's Tier-2 corroboration corpus (`supporting_sources_declared.json`) is a queryable SIBLING of the Tier-1
    industry-cases model: 19 records (18 engineering reports; Stripe split into two sharing one citation_key),
    each naming the single claim it reinforces, the exact manuscript anchor it sits beside, its render channel,
    and a caution. Re-derives the model and reports the joins — SS1 destination resolves (chapter label or
    appendix stem; a non-null anchor resolves inside the chapter), SS2 closed-vocab membership + SS2b citation
    join (citation_key resolves in references.bib AND citations.json), SS3 id shape/uniqueness, SS4 render-gate
    coherence (a body-known-use must be confirmed/adjusted), SS5 caution presence for vendor sources, SS6
    construct pointer resolves against the Tier-1 construct universe, SS7 encoded channel == the deterministic
    render_channel projection. On first landing every citation_key is TO-ADD (the bib batch is a separate
    single-writer pass), so SS2b reports one finding per record — expected, non-gating. Keyed off
    `book-models/supporting_sources_declared.json` + references.bib + citations.json + industry_cases_declared.json."""
    import supporting_sources_model as ssm  # noqa: E402 — path set above; the book-model package

    issues = list(ssm.all_findings())

    # Audit-only: same non-gating contract as the sibling first landings — surfaced as [audt], excluded from
    # the fail tally. A follow-up flips SS1-SS4 to blocking once a clean session confirms the drain.
    return (FAIL if issues else PASS), issues


def check_research_agenda():
    """The research-agenda model's schema + join check (audit-only first landing, rule-#55 discipline). The
    book's forward program (`research_agenda_declared.json`) is a queryable INDEX over finished prose: seven
    agenda items across four closed kinds (frontier / measurement / dynamics / generalization), each welded to
    the falsifiable hypotheses it tests and pointing at the home chapter that expands it. Re-derives the model
    and reports the joins — RA1 schema (kebab-unique id; non-empty title/one_line/source_section; kind + status
    in the declared taxonomies), RA2 hypothesis join (every related_hypotheses[] id resolves in
    theory_of_mage_declared.json — the weld to the testable substrate, IC4-style), RA3 section join (every
    source_section resolves to a real book chapter page), RA4 count guard (7 items), and RA5 parity
    (prose-parity ACTIVE once the 'Where the frontier goes next' coda is placed; figure-parity VACUOUS until
    the map SVG lands). Keyed off `book-models/research_agenda_declared.json` + theory_of_mage_declared.json +
    the book chapter pages."""
    import research_agenda_model as ram  # noqa: E402 — path set above; the book-model package

    issues = list(ram.all_findings())

    # Audit-only: same non-gating contract as the sibling first landings — surfaced as [audt], excluded from
    # the fail tally. A follow-up flips RA1-RA4 to blocking once a clean session confirms the drain (and the
    # figure wave wires RA5 figure-parity against the SVG's <desc> node enumeration).
    return (FAIL if issues else PASS), issues


def check_metaphor_spans():
    """The metaphor + slogan registry's structural + overlap check (audit-only first landing, rule-#55
    discipline). The model (`book-models/metaphor-spans.json`) records every sustained metaphor's span —
    introduced -> pays off — plus its `recurrence` (core = always live, exempt / local = must pay off before
    the next local) AND every registered slogan (its canonical phrasing, scope, and the idea it elaborates),
    so three house rules are measurable: never open a 2nd metaphor before the 1st pays off; one canonical
    slogan per idea; ration polished slogans. This re-derives the model and reports: the STRUCTURAL
    invariants for BOTH kinds (well-formedness, page + anchor resolution, local-has-payoff / core-does-not,
    scope enum, the ratified 8-core/11-local + 6/1/1-slogan split, elaborates-resolves = dangling class f,
    one-invoke-by-name-canonical-per-idea = competing class a); and that the computed OVERLAP set equals the
    ratified set (0 today). The vehicle-collision check + the audit-only density classes (b/c/d/e) are
    surfaced by the model CLI / lint_slogan_density.py, not asserted here. Keyed off
    `book-models/metaphor-spans.json` + the book chapters (for anchor resolution)."""
    import metaphor_spans_model as msm  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []

    # STRUCTURAL — schema + resolution invariants for both kinds (blocking half in catalog.py validate).
    issues.extend(msm.structural_findings())

    # The editorial metric — the computed overlap set must equal the ratified set (0 today).
    overlaps = msm.overlap_findings()
    if len(overlaps) != msm.EXPECT_OVERLAPS:
        issues.append(f"overlap count {len(overlaps)} != ratified {msm.EXPECT_OVERLAPS} — "
                      f"a new local overlaps an unpaid-off local; ratify (overlap_ok) or fix the span")
        issues.extend(overlaps)

    # Audit-only: same non-gating contract as the sibling first landings — the structural half is BLOCKING in
    # catalog.py validate, but the overlap half lands audit-only until a clean session promotes it. A follow-up
    # flips the overlap metric blocking (the spine / chapter-shape / flagship models' landing path).
    return (FAIL if issues else PASS), issues


def check_metaphor_slogan_index():
    """The slogan/metaphor OCCURRENCE-INDEX freshness check (BLOCKING in catalog.py validate). The derived
    `book-models/metaphor-slogan-index.json` inverts every registered slogan (canonical + competitor phrases)
    and every local metaphor (its distinctive image name) onto the sites + nearest anchors it appears at in
    the built book HTML — re-derived each run, so it cannot drift. A page edited / rebuilt without
    regenerating the index is the finding, mirroring `check_projection_index`'s freshness half. Keyed off
    `book-models/metaphor-slogan-index.json` + the built book-web HTML."""
    import metaphor_slogan_index_model as msi  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []
    issues.extend(msi.freshness_findings())
    return (FAIL if issues else PASS), issues


def check_slogan_density():
    """The slogan-density worklist (AUDIT-ONLY, rule-#55 first landing). Reads the registry + occurrence-index
    + the book's `<!-- slogan: id -->` tags and reports the four ration classes: (b) a competitor phrase still
    at full strength, (c) a canonical over its ration budget or two occurrences clustered within a window,
    (d) a used-once slogan/metaphor appearing more than once, (e) a tag naming no registered slogan or a
    registered slogan with no tag. The Part-1 prose is over-sloganed, so this lands audit-only-first — the
    findings are the net-subtractive fix-wave worklist, not a gate. The two born-blocking classes
    (a competing-canonical, f dangling) are asserted by `check_metaphor_spans` instead. Keyed off
    `book-models/metaphor-spans.json` + `metaphor-slogan-index.json` + the book chapters."""
    import lint_slogan_density as lsd  # noqa: E402 — path set above; the book-model package

    issues: list[str] = list(lsd.audit_findings())
    # Audit-only: surfaced as [audt], non-gating — the fix-wave drives it to 0, then a follow-up promotes.
    return (FAIL if issues else PASS), issues


def check_reverse_index():
    """The reverse index's two-kind drift check (audit-only). The reverse index inverts every built view's
    forward references into `{md symbol -> [dependent view elements]}`; it re-derives from the views each
    run, so it cannot itself drift — but its two mechanical drift kinds are checked here:

      - FRESHNESS — the materialized `book-models/reverse_index.json` equals a fresh inversion. A view
        edited without regenerating the index is the finding.
      - STRUCTURAL — every view->md reference resolves against the CURRENT source. A dangling section id /
        chapter / part a view points at (that the book no longer defines) is the finding. The reverse
        index makes this one walk over the inverted edges.

    Keyed off `book-models/reverse_index.json` + the built views + the book prose (via book_ir)."""
    import reverse_index as ri  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []

    # FRESHNESS — the stored artifact equals a fresh inversion.
    fresh = ri.to_jsonable()
    stored = ri.load_artifact()
    if stored is None:
        issues.append(f"{rel(ri._ARTIFACT)} missing — run "
                      f"`python3 book-models/reverse_index.py regenerate`")
    elif stored.get("index") != fresh["index"] or stored.get("_counts") != fresh["_counts"]:
        issues.append(f"DRIFT: {rel(ri._ARTIFACT)} disagrees with a fresh inversion from the views — "
                      f"regenerate with `python3 book-models/reverse_index.py regenerate`")

    # STRUCTURAL — every view->md reference resolves against the current source.
    issues.extend(ri.structural_findings())

    # Audit-only: same non-gating contract as the sibling view checks — surfaced as [audt].
    return (FAIL if issues else PASS), issues


def check_projection_index():
    """The PROJECTION-INDEX sync gates (audit-only first landing, rule-#55). The projection metamodel names
    the book's rendered surfaces (`projections.json`, authored) and inverts every tracked concept slug onto
    the built HTML sites it appears in (`projection-index.json`, derived). Three mechanical gates, mirroring
    the reverse-index freshness discipline:

      - FRESHNESS — the on-disk `projection-index.json` equals a fresh scan of the built HTML. A page
        rebuilt without regenerating the index is the finding. Same shape as `check_reverse_index`.
      - COMPLETENESS / JOIN — every served HTML surface is claimed by EXACTLY ONE `projections.json` record
        (no orphan surface, no double-claim), and every index site resolves to a real built file.
      - SITE-HOME RECONCILE — the stale-`site_home` catch: a definition marked book-only (`site_home:"N/A"`)
        whose concept has a dedicated website concept page (the Churn case) is a contradiction.

    Keyed off `book-models/projections.json` + `projection-index.json` + the built HTML."""
    import projections_model as pm  # noqa: E402 — path set above; the book-model package

    issues: list[str] = []
    issues.extend(pm.freshness_findings())
    issues.extend(pm.completeness_findings())
    issues.extend(pm.site_home_findings())

    # Audit-only: same non-gating contract as the sibling view checks — surfaced as [audt]. The site-home
    # reconcile surfaces 1 finding today (churn), so this lands audit-only-first (rule #55); a follow-up
    # promotes the freshness + completeness halves to blocking once a clean session confirms they stay 0.
    return (FAIL if issues else PASS), issues


def check_print_appendix_projection():
    """Guards the print/web appendix split against silent drift from catalogue-classification.json
    (audit-only first landing, rule-#55). The PRINT appendix emits a page only for the flagship subset; the
    WEB catalogue keeps all entries. This re-derives the flagship set from the classification + the print
    manifest and asserts: (1) every flagship slug names a real catalogue entry (no phantom print page);
    (2) every keep-as-L2 (canonical) entry is either emitted as a print flagship OR explicitly listed in the
    manifest's `appendix_exclude` — a canonical mechanism cannot silently vanish from print without being
    declared web-only; (3) every `print_promotion` names a NON-canonical (demoted / lifted / merged) entry,
    since promoting an already-canonical mechanism is redundant. Keyed off
    `book-models/catalogue-classification.json` + `book-models/print-appendix-manifest.json`."""
    book_dir = os.path.join(ROOT, "book")
    if book_dir not in sys.path:
        sys.path.insert(0, book_dir)
    import build_book_html as bb  # noqa: E402 — path set above; the book renderer

    issues: list[str] = []
    cls = bb._load_classification()                 # {slug: {"head", "parent"}} — also validates the manifest
    manifest = bb._load_print_manifest(cls)
    flagship = bb._flagship_slugs()
    entries = {rec["slug"] for rec in bb._appendix_entries()}
    keep_as_l2 = {s for s, r in cls.items() if r["head"] == "keep-as-L2"}
    exclude = set(manifest.get("appendix_exclude", []))
    promotions = set(manifest.get("print_promotions", []))

    # (1) flagship ⊆ real catalogue entries — no phantom print page.
    for s in sorted(flagship - entries):
        issues.append(f"flagship slug {s!r} names no catalogue entry under agent/ · models-bridge/ · "
                      f"product/ (phantom print page)")
    # (2) every keep-as-L2 is a print flagship OR a declared web-only exclude — no silent vanishing.
    for s in sorted(keep_as_l2 - flagship - exclude):
        issues.append(f"keep-as-L2 {s!r} is neither a print flagship nor in the manifest's appendix_exclude "
                      f"— a canonical mechanism left print without being declared web-only")
    # (3) a promotion must not already be canonical (keep-as-L2) — that would be a redundant promotion.
    for s in sorted(promotions & keep_as_l2):
        issues.append(f"print_promotion {s!r} is already keep-as-L2 — redundant (promotions are for "
                      f"demoted / lifted entries)")

    return (FAIL if issues else PASS), issues


def check_part_title_parity():
    """Part-title parity (rule-#33; AUDIT-ONLY-first). Two SSOTs name each Part: the reader-facing
    `build_book_html._PART_TITLES` (drives running-heads, openers, the `{{part:N}}` substitution, the
    book-map) and the pedagogy digest's `outcomes_model.PART_TITLES` (drives the Module tier + reviewable
    digest). They MUST agree on every Part number both define, or a Part is named one thing to the reader
    and another in the learning-outcomes model. This holds them in step so a future rename of one is caught
    against the other. Compares the shared keys (back matter part 7 lives only in the renderer; front matter
    part 0 in both)."""
    book_dir = os.path.join(ROOT, "book")
    if book_dir not in sys.path:
        sys.path.insert(0, book_dir)
    import build_book_html as bb  # noqa: E402 — path set above; the book renderer
    import outcomes_model as ocm  # noqa: E402 — path set above; the pedagogy-digest model

    issues: list[str] = []
    render_titles = bb._PART_TITLES
    outcome_titles = ocm.PART_TITLES
    for part in sorted(set(render_titles) & set(outcome_titles)):
        if render_titles[part] != outcome_titles[part]:
            issues.append(
                f"Part {part} title drift: build_book_html._PART_TITLES = {render_titles[part]!r} but "
                f"outcomes_model.PART_TITLES = {outcome_titles[part]!r} — rename both, or import one SSOT")

    return (FAIL if issues else PASS), issues


# The bold-lead that opens the WHOLE canon statement of a thesis in a body chapter (`**The Modeling
# Thesis.**` / `**The Alignment Thesis:**`) — the shape the Preface and 3.1 both use. Case-insensitive; the
# trailing `.`/`:` tolerates either house punctuation.
def _thesis_stated_whole(part_dir: str, thesis_name: str) -> bool:
    """True when SOME chapter file under book/<part_dir>/ states the named thesis WHOLE — a
    `**The <Name> Thesis.**` bold-lead AND an `In other words` in the same file (the canon §1.1/§1.2 shape:
    Definition + In other words). Excludes the opener file (00-part-intro.md) — the whole statement must live
    in a BODY chapter, not only the opener box."""
    lead = re.compile(rf"\*\*\s*The\s+{re.escape(thesis_name)}\s+Thesis\s*[.:]\s*\*\*", re.I)
    d = os.path.join(ROOT, "book", part_dir)
    if not os.path.isdir(d):
        return False
    for fn in os.listdir(d):
        if not fn.endswith(".md") or fn.startswith("00-"):
            continue
        text = open(os.path.join(d, fn), encoding="utf-8").read()
        if lead.search(text) and re.search(r"in other words", text, re.I):
            return True
    return False


def check_canon_pins():
    """R3 canon-fidelity guard + R5 cycle pin (rule-#33 parity; AUDIT-ONLY-first, rule #55).

    R3 — the Preface Modeling-box cut must not lose the canon. The FULL canon Modeling Thesis (Definition +
    `In other words`) currently lives ONLY in the Preface, which the restructure cuts. Part 3 states the
    Alignment Thesis whole in a body chapter (3.1); Part 2 does NOT yet state the Modeling Thesis whole. This
    guard asserts each thesis is stated whole in a BODY chapter of its Part (Modeling → Part 2, Alignment →
    Part 3), pinning the statement text to `argument_spine_declared.json` (the SSOT — Modeling/Alignment
    claims). It reports the Modeling gap AUDIT-ONLY this wave; a follow-up promotes it BLOCKING once a Part-2
    body chapter states it whole, at which point cutting the Preface box before Part 2 carries the canon fires
    the gate.

    R5 — INV-3 (one backbone, many resolutions): the ONE 3-line-method wording (`canon_cycle_declared.json`)
    must be reused VERBATIM by every surface that states the MAGE cycle (the Part-IV opener box, the Preface
    cycle paragraph, the cycle figure), each carrying the `mage-cycle` anchor. Any anchored surface whose text
    omits the pinned wording is a drift finding. Vacuous until the surfaces land in W2/W3 — registered now so
    the drafters inherit the guard."""
    import json as _json

    issues: list[str] = []

    # R3 — pin the whole-statement presence to the argument-spine SSOT (rule #33).
    spine_path = os.path.join(_BOOK_MODELS, "argument_spine_declared.json")
    spine = _json.load(open(spine_path, encoding="utf-8"))
    by_id = {c["id"]: c for c in spine.get("spine", spine.get("claims", []))}
    for thesis_id, thesis_name, part_dir in (
        ("modeling-thesis", "Modeling", "part2"),
        ("alignment-thesis", "Alignment", "part3"),
    ):
        if thesis_id not in by_id:
            issues.append(f"R3: argument_spine_declared.json carries no {thesis_id!r} claim to pin against")
            continue
        if not _thesis_stated_whole(part_dir, thesis_name):
            issues.append(
                f"R3 canon guard: the whole {thesis_name} Thesis (bold-lead + 'In other words', pinned to "
                f"argument-spine {thesis_id!r}) is not stated in any {part_dir}/ body chapter — it must be "
                f"before the Preface {thesis_name}-box is cut, or the canon statement is lost")

    # R5 — the 3-line-method cycle pin. Any `mage-cycle`-anchored surface must carry the pinned wording.
    cycle = _json.load(open(os.path.join(_BOOK_MODELS, "canon_cycle_declared.json"), encoding="utf-8"))
    pinned = cycle["three_line_method"]
    anchor = cycle.get("anchor", "mage-cycle")
    if not pinned.strip():
        issues.append("R5: canon_cycle_declared.json three_line_method is empty — the pin has no SSOT")
    anchor_re = re.compile(rf"\{{#\s*{re.escape(anchor)}\s*\}}|<!--\s*{re.escape(anchor)}\s*-->", re.I)
    book_dir = os.path.join(ROOT, "book")
    for root_, _dirs, files in os.walk(book_dir):
        for fn in files:
            if not fn.endswith(".md"):
                continue
            text = open(os.path.join(root_, fn), encoding="utf-8").read()
            if anchor_re.search(text) and pinned not in text:
                issues.append(
                    f"R5 cycle pin: {rel(os.path.join(root_, fn))} carries the {anchor!r} anchor but does "
                    f"not state the pinned 3-line method verbatim — reuse canon_cycle_declared.json wording")

    return (FAIL if issues else PASS), issues
