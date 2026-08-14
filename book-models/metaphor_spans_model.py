"""The METAPHOR + SLOGAN registry — a typed model of every sustained METAPHOR the book runs AND every
registered SLOGAN, so three house rules become MEASURABLE: (1) never introduce a second metaphor until the
first has paid off; (2) one canonical slogan per idea; (3) ration polished slogans. A metaphor and a slogan
are the same KIND of thing — a writing TECHNIQUE that elaborates an existing idea — so they share one
registry (`book-models/metaphor-spans.json`), discriminated by `kind` (metaphor | slogan). This module
projects the inventory and the STRUCTURAL + overlap checks, wired into `catalog.py validate`; the sibling
`metaphor_slogan_index_model.py` derives every OCCURRENCE from the built HTML and `lint_slogan_density.py`
reads both for the density worklist.

THE ELABORATES JOIN (load-bearing).  Every entry carries `elaborates: {model, id}` — a NAMESPACED link to
the declared idea it expands (big-ideas / argument-spine / claims / argues-claims / definitions). The join
is what makes 'one idea, several competing slogans' mechanical: group the slogans by `elaborates` and flag
any idea carrying more than one canonical (scope invoke-by-name) landing. A metaphor or a used-once /
commandment slogan sharing an idea does NOT compete — only two invoke-by-name slogans on one idea do. A
dangling `elaborates` (an id that resolves in no declared model) is itself a finding.

TWO AXES, DELIBERATELY ORTHOGONAL.  `kind` (metaphor | slogan) is the technique discriminator. `recurrence`
(core | local) is the OVERLAP axis on metaphor entries — `core` vocabulary is always live (exempt), a
`local` metaphor must pay off before the next local starts. (The field was named `kind` before slogans
joined; it moved to `recurrence` so the two axes do not collide.)

STABLE ANCHORS, NOT LINE NUMBERS.  Each metaphor span keys on a chapter `page_slug` plus a
heading/index-def/point `anchor` slug, so the model survives prose edits that shift line numbers. A slogan's
`home` uses the same resolution.

THREE KINDS OF FINDING.
  * `structural_findings()` — the schema + resolution invariants for BOTH kinds, plus the two born-blocking
    density classes: exactly-one-invoke-by-name-canonical-per-idea (class a) and elaborates-resolves
    (class f). BLOCKING in `catalog.py validate` (the model must be well-formed; green by construction).
  * `overlap_findings()` + `vehicle_collision_findings()` — the metaphor overlap metric + a softer secondary
    check. AUDIT-ONLY-first.
  * The remaining density classes (competitor-at-full-strength, over-use, used-once, tag consistency) live
    in `lint_slogan_density.py`, AUDIT-ONLY-first (the Part-1 prose is over-sloganed).

Run `python3 book-models/metaphor_spans_model.py verify` to drift-check; `... table` to print the metaphor
inventory; `... show` to list every entry; `... anchors <page_slug>` to dump a chapter's resolvable anchors.
"""
from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, field

from _book_pages import book_page_slugs, chapter_md_path  # shared page-slug resolver (extract-on-2nd-site)

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)  # the governance-catalog repo root (book-models/ is one level down)
_DECLARED = os.path.join(_HERE, "metaphor-spans.json")

#: The ratified split — encode the author's set so a silent add/reclassify reddens.
EXPECT_CORE = 9
EXPECT_LOCAL = 6
EXPECT_OVERLAPS = 0
#: The ratified slogan split (by scope): invoke-by-name canonicals / commandments / used-once lines.
#: 7 after the one-model-class-per-chapter reconstruction retired the 'one-trunk-five-views' (4+1) slogan,
#: which the six-class working ontology supersedes.
EXPECT_SLOGANS = 7
EXPECT_COMMANDMENTS = 0
EXPECT_USED_ONCE = 1

_METAPHOR_REQUIRED = ("kind", "name", "slug", "recurrence", "vehicle", "elaborates", "introduced_at",
                      "payoff", "overlap_ok", "overlap_rationale", "notes")
_SLOGAN_REQUIRED = ("kind", "name", "slug", "canonical", "elaborates", "scope", "ration_budget", "home",
                    "competitors", "notes")
_RECURRENCE = ("core", "local")
_SCOPES = ("invoke-by-name", "used-once", "commandment")
#: The five declared-idea namespaces an `elaborates.model` may name (ratified decision B added definitions).
_ELAB_MODELS = ("big-ideas", "argument-spine", "claims", "argues-claims", "definitions")

#: The projected inventory table header (CLI `table`).
_TABLE_HEADER = "| Metaphor | Recurrence | Introduced | Pays off | Payoff |"
_TABLE_RULE = "|---|---|---|---|---|"

#: Tokens dropped from the vehicle-collision comparison (articles / connectives / generic figure words).
_STOP_TOKENS = frozenset({
    "the", "a", "an", "and", "or", "of", "is", "not", "as", "to", "for", "on", "in", "at", "by",
    "two", "one", "into", "over", "with", "from", "you", "your", "it", "its", "that", "this",
})


# ---- typed model ------------------------------------------------------------------------------------

@dataclass
class Metaphor:
    """One sustained metaphor the book runs. `recurrence` drives the overlap exemption: `core` vocabulary is
    always live (no `pays_off_at`); a `local` metaphor carries a `pays_off_at` and is the only kind the
    overlap metric ranges over. `elaborates` is the {model, id} link to the declared idea it expands.
    `overlap_ok` + `overlap_rationale` record a DELIBERATE overlap (a ratified exception)."""
    name: str
    slug: str
    recurrence: str
    vehicle: str
    elaborates: dict
    introduced_at: dict
    payoff: str
    overlap_ok: bool
    overlap_rationale: str
    notes: str
    pays_off_at: "dict | None" = None
    stretch: str = ""
    used_once: bool = False   # a vivid image that must appear exactly once (density class d, audit-only)
    kind: str = "metaphor"

    def stretch_key(self) -> str:
        """The collision unit — the explicit `stretch`, else the intro chapter page_slug."""
        return self.stretch or (self.introduced_at or {}).get("label", "")


@dataclass
class Slogan:
    """One registered slogan — a polished formulation of a declared idea. `canonical` is the ONE full
    phrasing; `scope` governs how often it may recur (invoke-by-name = canonical + blunt referential
    invocations, capped by `ration_budget`; used-once = exactly one appearance; commandment = an unbudgeted
    refrain). `elaborates` is the {model, id} join; `home` is where the canonical lands; `competitors` is
    the closed list of phrasings the fix-wave blunts to referential invocations."""
    name: str
    slug: str
    canonical: str
    elaborates: dict
    scope: str
    ration_budget: int
    home: dict
    competitors: "list[str]"
    notes: str
    kind: str = "slogan"


@dataclass
class MetaphorModel:
    overlap_rule: str
    ration_rule: str
    ratified_counts: dict
    metaphors: "list[Metaphor]"
    slogans: "list[Slogan]" = field(default_factory=list)

    def core(self) -> "list[Metaphor]":
        return [m for m in self.metaphors if m.recurrence == "core"]

    def local(self) -> "list[Metaphor]":
        return [m for m in self.metaphors if m.recurrence == "local"]

    def invoke_by_name(self) -> "list[Slogan]":
        return [s for s in self.slogans if s.scope == "invoke-by-name"]

    def commandments(self) -> "list[Slogan]":
        return [s for s in self.slogans if s.scope == "commandment"]

    def used_once(self) -> "list[Slogan]":
        return [s for s in self.slogans if s.scope == "used-once"]

    def entries(self) -> "list":
        """Every registry entry (metaphors + slogans) — the merged list the density iteration walks."""
        return [*self.metaphors, *self.slogans]


# ---- load + build -----------------------------------------------------------------------------------

def _load_declared() -> dict:
    with open(_DECLARED, encoding="utf-8") as fh:
        return json.load(fh)


def derive_model() -> MetaphorModel:
    """Build the typed model from the hand-authored declarations — the single derivation the projection and
    the checks share."""
    raw = _load_declared()
    metaphors = [
        Metaphor(
            name=m["name"], slug=m["slug"], recurrence=m.get("recurrence", ""), vehicle=m["vehicle"],
            elaborates=m.get("elaborates", {}) or {},
            introduced_at=m["introduced_at"], payoff=m["payoff"],
            overlap_ok=bool(m.get("overlap_ok", False)), overlap_rationale=m.get("overlap_rationale", ""),
            notes=m.get("notes", ""), pays_off_at=m.get("pays_off_at"), stretch=m.get("stretch", ""),
            used_once=bool(m.get("used_once", False)), kind=m.get("kind", "metaphor"),
        )
        for m in raw.get("metaphors", [])
    ]
    slogans = [
        Slogan(
            name=s["name"], slug=s["slug"], canonical=s.get("canonical", ""),
            elaborates=s.get("elaborates", {}) or {}, scope=s.get("scope", ""),
            ration_budget=int(s.get("ration_budget", 0)), home=s.get("home", {}) or {},
            competitors=list(s.get("competitors", [])), notes=s.get("notes", ""),
            kind=s.get("kind", "slogan"),
        )
        for s in raw.get("slogans", [])
    ]
    return MetaphorModel(
        overlap_rule=raw.get("overlap_rule", ""),
        ration_rule=raw.get("ration_rule", ""),
        ratified_counts=raw.get("ratified_counts", {}),
        metaphors=metaphors,
        slogans=slogans,
    )


# ---- declared-idea namespaces (the elaborates resolve targets, read at check time) ------------------

def declared_idea_sets() -> "dict[str, set[str]]":
    """The id set each `elaborates.model` namespace resolves against — read live from the five sibling
    declared sources (a single source of truth, no snapshot). A namespace whose source is absent resolves to
    the empty set, so any link under it reddens (class f)."""
    def _load(path: str) -> dict:
        return json.load(open(path, encoding="utf-8")) if os.path.isfile(path) else {}

    big = _load(os.path.join(_HERE, "landing-big-ideas.json"))
    big_ids = set(big.get("_order", [])) or {k for k in big if not k.startswith("_")}
    spine = _load(os.path.join(_HERE, "argument_spine_declared.json"))
    spine_ids = {s["id"] for s in spine.get("spine", []) if s.get("id")}
    claims = _load(os.path.join(_HERE, "claims_declared.json"))
    claim_ids = {c["id"] for c in claims.get("claims", []) if c.get("id")}
    argues = _load(os.path.join(_HERE, "argues_claims_declared.json"))
    argues_ids = set(argues.get("_order", [])) or {k for k in argues if not k.startswith("_")}
    defs = _load(os.path.join(_ROOT, "book", "data", "definitions.json"))
    def_ids = {k for k in defs.get("_order", []) if not k.startswith("_")}
    return {
        "big-ideas": big_ids,
        "argument-spine": spine_ids,
        "claims": claim_ids,
        "argues-claims": argues_ids,
        "definitions": def_ids,
    }


def _elaborates_findings(kind: str, slug: str, elaborates: dict, sets: "dict[str, set[str]]") -> "list[str]":
    """Class f (dangling elaboration) + the well-formedness of the {model, id} link. A link whose model is
    outside the five namespaces, or whose id resolves in no declared model, reddens."""
    findings: "list[str]" = []
    if not isinstance(elaborates, dict) or not elaborates.get("model") or not elaborates.get("id"):
        findings.append(f"{kind} {slug!r} elaborates is not a {{model, id}} pair")
        return findings
    model, idv = elaborates["model"], elaborates["id"]
    if model not in _ELAB_MODELS:
        findings.append(f"{kind} {slug!r} elaborates.model {model!r} is not one of {_ELAB_MODELS}")
    elif idv not in sets.get(model, set()):
        findings.append(f"class-f DANGLING: {kind} {slug!r} elaborates {model}/{idv!r} — resolves to no "
                        f"declared idea in the {model} model")
    return findings


# ---- anchor resolution ------------------------------------------------------------------------------

_ANCHOR_HEADING_RE = re.compile(r"\{#([A-Za-z0-9_-]+)\}")
_ANCHOR_INDEXDEF_RE = re.compile(r"<!--\s*index-def:\s*([A-Za-z0-9_-]+)")
_ANCHOR_POINT_RE = re.compile(r"<!--\s*point:\s*([A-Za-z0-9_-]+)")


def chapter_anchors(page_slug: str) -> "list[str]":
    """Every resolvable anchor slug in a chapter, in document order — the union of `{#slug}` heading anchors,
    `<!-- index-def: slug -->` markers, and `<!-- point: slug -->` drain decorators. These are exactly the
    ids the book build emits, so 'the anchor resolves to a real heading in the built book' is checkable, and
    the overlap metric can turn an anchor into a linear position (its index in this list)."""
    path = chapter_md_path(page_slug)
    if path is None:
        return []
    anchors: "list[str]" = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            for rx in (_ANCHOR_HEADING_RE, _ANCHOR_INDEXDEF_RE, _ANCHOR_POINT_RE):
                m = rx.search(line)
                if m:
                    anchors.append(m.group(1))
    return anchors


def _anchor_position(page_slug: str, anchor: str) -> "int | None":
    """The linear position of an anchor within its chapter (its index in `chapter_anchors`), or None if the
    anchor is empty or does not resolve."""
    if not anchor:
        return None
    order = chapter_anchors(page_slug)
    try:
        return order.index(anchor)
    except ValueError:
        return None


# ---- one-canonical-per-idea (class a) ---------------------------------------------------------------

def one_canonical_per_idea_findings(model: "MetaphorModel | None" = None) -> "list[str]":
    """Class a (competing-canonical): group the invoke-by-name slogans by their `elaborates` idea; an idea
    carrying more than one canonical landing is the Part-1 over-slogan problem. used-once, commandment, and
    metaphor entries are SANCTIONED co-elaborations and never count. Registry-internal, so BLOCKING from
    birth (green once the seed carries exactly one invoke-by-name per idea)."""
    if model is None:
        model = derive_model()
    by_idea: "dict[tuple[str, str], list[str]]" = {}
    for s in model.invoke_by_name():
        el = s.elaborates or {}
        if el.get("model") and el.get("id"):
            by_idea.setdefault((el["model"], el["id"]), []).append(s.slug)
    findings: "list[str]" = []
    for (mdl, idv), slugs in sorted(by_idea.items()):
        if len(slugs) > 1:
            findings.append(f"class-a COMPETING-CANONICAL: idea {mdl}/{idv!r} carries {len(slugs)} "
                            f"invoke-by-name slogans {sorted(slugs)} — keep one canonical, blunt the rest")
    return findings


# ---- invariants (the STRUCTURAL checks catalog.py validate walks — BLOCKING) ------------------------

def structural_findings(model: "MetaphorModel | None" = None) -> "list[str]":
    """The STRUCTURAL / SCHEMA invariants for BOTH kinds, plus the two born-blocking density classes.

    METAPHORS
    M1 — required fields present + non-empty; introduced_at/pays_off_at are dicts with chapter + page_slug.
    M2 — slug kebab-case + unique ACROSS metaphors and slogans; recurrence in {core, local}; kind=='metaphor';
         overlap_ok a real JSON bool.
    M3 — every page_slug (intro + pays-off) resolves to a real book chapter page; every non-empty anchor
         resolves to a real heading/index-def/point in its chapter.
    M4 — a `local` metaphor MUST carry pays_off_at; a `core` metaphor must NOT.
    SLOGANS
    S1 — required fields present + non-empty (canonical, scope, home); kind=='slogan'.
    S2 — slug kebab-case + unique across both kinds; scope in {invoke-by-name, used-once, commandment};
         ration_budget a non-negative int (used-once ⇒ 1); competitors a list.
    S3 — home is a dict with chapter + page_slug; page_slug resolves; a non-empty home anchor resolves.
    SHARED
    E — every entry's `elaborates` is a well-formed {model, id} that resolves (class f, dangling).
    A — exactly one invoke-by-name canonical per idea (class a, competing-canonical).
    C — the ratified_counts split matches reality (core, local, overlaps, slogans, commandments, used_once).
    """
    if model is None:
        model = derive_model()
    findings: "list[str]" = []
    page_slugs = book_page_slugs()
    idea_sets = declared_idea_sets()
    seen: "set[str]" = set()

    if not model.overlap_rule.strip():
        findings.append("the model carries no overlap_rule")
    if not model.ration_rule.strip():
        findings.append("the model carries no ration_rule")

    # ---- metaphors --------------------------------------------------------------------------------
    raw_metaphors = _load_declared().get("metaphors", [])
    for m, rawm in zip(model.metaphors, raw_metaphors):
        # M1 — required fields present + non-empty.
        for f in _METAPHOR_REQUIRED:
            if f not in rawm:
                findings.append(f"M1 metaphor {m.slug!r} is missing field {f!r}")
            elif f not in ("overlap_ok", "introduced_at", "overlap_rationale", "notes", "elaborates") \
                    and not str(rawm[f]).strip():
                findings.append(f"M1 metaphor {m.slug!r} has empty field {f!r}")
        if not isinstance(m.introduced_at, dict) or not m.introduced_at.get("label"):
            findings.append(f"M1 metaphor {m.slug!r} introduced_at lacks a label")
        if m.pays_off_at is not None and (not isinstance(m.pays_off_at, dict) or not m.pays_off_at.get("label")):
            findings.append(f"M1 metaphor {m.slug!r} pays_off_at lacks a label")

        # M2 — slug + recurrence + kind + bool.
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", m.slug):
            findings.append(f"M2 metaphor {m.slug!r} slug is not kebab-case")
        if m.slug in seen:
            findings.append(f"M2 duplicate entry slug {m.slug!r}")
        seen.add(m.slug)
        if m.recurrence not in _RECURRENCE:
            findings.append(f"M2 metaphor {m.slug!r} recurrence {m.recurrence!r} is not one of {_RECURRENCE}")
        if m.kind != "metaphor":
            findings.append(f"M2 metaphor {m.slug!r} kind {m.kind!r} is not 'metaphor'")
        if not isinstance(rawm.get("overlap_ok"), bool):
            findings.append(f"M2 metaphor {m.slug!r} overlap_ok is not a JSON bool")

        # M3 — page + anchor resolution.
        for where, site in (("introduced_at", m.introduced_at), ("pays_off_at", m.pays_off_at)):
            if not isinstance(site, dict):
                continue
            page, anchor = site.get("label", ""), site.get("anchor", "")
            if page and page not in page_slugs:
                findings.append(f"M3 metaphor {m.slug!r} {where} page {page!r} resolves to no book chapter")
            if anchor and page in page_slugs and _anchor_position(page, anchor) is None:
                findings.append(f"M3 metaphor {m.slug!r} {where} anchor {anchor!r} resolves to no "
                                f"heading/index-def/point in {page!r}")

        # M4 — local has pays_off_at; core does not.
        if m.recurrence == "local" and not m.pays_off_at:
            findings.append(f"M4 local metaphor {m.slug!r} is missing pays_off_at (a local must pay off)")
        if m.recurrence == "core" and m.pays_off_at:
            findings.append(f"M4 core metaphor {m.slug!r} carries pays_off_at (core vocabulary never ends)")

        # E — elaborates resolves (class f).
        findings.extend(_elaborates_findings("metaphor", m.slug, m.elaborates, idea_sets))

    # ---- slogans ----------------------------------------------------------------------------------
    raw_slogans = _load_declared().get("slogans", [])
    for s, raws in zip(model.slogans, raw_slogans):
        # S1 — required fields.
        for f in _SLOGAN_REQUIRED:
            if f not in raws:
                findings.append(f"S1 slogan {s.slug!r} is missing field {f!r}")
        for f in ("canonical", "scope"):
            if not str(raws.get(f, "")).strip():
                findings.append(f"S1 slogan {s.slug!r} has empty field {f!r}")
        if s.kind != "slogan":
            findings.append(f"S1 slogan {s.slug!r} kind {s.kind!r} is not 'slogan'")

        # S2 — slug + scope + ration_budget + competitors.
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", s.slug):
            findings.append(f"S2 slogan {s.slug!r} slug is not kebab-case")
        if s.slug in seen:
            findings.append(f"S2 duplicate entry slug {s.slug!r}")
        seen.add(s.slug)
        if s.scope not in _SCOPES:
            findings.append(f"S2 slogan {s.slug!r} scope {s.scope!r} is not one of {_SCOPES}")
        if not isinstance(raws.get("ration_budget"), int) or s.ration_budget < 0:
            findings.append(f"S2 slogan {s.slug!r} ration_budget must be a non-negative int")
        elif s.scope == "used-once" and s.ration_budget != 1:
            findings.append(f"S2 used-once slogan {s.slug!r} ration_budget must be 1 (appears exactly once)")
        if not isinstance(s.competitors, list):
            findings.append(f"S2 slogan {s.slug!r} competitors is not a list")

        # S3 — home resolution.
        if not isinstance(s.home, dict) or not s.home.get("label"):
            findings.append(f"S3 slogan {s.slug!r} home lacks a label")
        else:
            page, anchor = s.home.get("label", ""), s.home.get("anchor", "")
            if page and page not in page_slugs:
                findings.append(f"S3 slogan {s.slug!r} home page {page!r} resolves to no book chapter")
            if anchor and page in page_slugs and _anchor_position(page, anchor) is None:
                findings.append(f"S3 slogan {s.slug!r} home anchor {anchor!r} resolves to no "
                                f"heading/index-def/point in {page!r}")

        # E — elaborates resolves (class f).
        findings.extend(_elaborates_findings("slogan", s.slug, s.elaborates, idea_sets))

    # A — exactly one invoke-by-name canonical per idea (class a).
    findings.extend(one_canonical_per_idea_findings(model))

    # C — the ratified counts split.
    nc, nl = len(model.core()), len(model.local())
    ns, ncmd, nuo = len(model.invoke_by_name()), len(model.commandments()), len(model.used_once())
    if nc != EXPECT_CORE:
        findings.append(f"C {nc} core metaphors, expected {EXPECT_CORE} (a metaphor was added or reclassified)")
    if nl != EXPECT_LOCAL:
        findings.append(f"C {nl} local metaphors, expected {EXPECT_LOCAL} (a metaphor was added or reclassified)")
    if ns != EXPECT_SLOGANS:
        findings.append(f"C {ns} invoke-by-name slogans, expected {EXPECT_SLOGANS}")
    if ncmd != EXPECT_COMMANDMENTS:
        findings.append(f"C {ncmd} commandment slogans, expected {EXPECT_COMMANDMENTS}")
    if nuo != EXPECT_USED_ONCE:
        findings.append(f"C {nuo} used-once slogans, expected {EXPECT_USED_ONCE}")
    rc = model.ratified_counts or {}
    want = {"core": EXPECT_CORE, "local": EXPECT_LOCAL, "overlaps": EXPECT_OVERLAPS,
            "slogans": EXPECT_SLOGANS, "commandments": EXPECT_COMMANDMENTS, "used_once": EXPECT_USED_ONCE}
    if any(rc.get(k) != v for k, v in want.items()):
        findings.append(f"C ratified_counts {rc} disagrees with the ratified set {want}")

    return findings


# ---- the overlap metric (AUDIT-ONLY) ----------------------------------------------------------------

def overlap_findings(model: "MetaphorModel | None" = None) -> "list[str]":
    """The editorial metric: two LOCAL metaphors live simultaneously within one stretch. Group locals by
    stretch; within a stretch, order by intro position; a collision is any pair (A, B) where B is introduced
    at or before A's pays_off_at (their spans intersect). CORE is exempt. A ratified overlap (overlap_ok on
    either party) is excluded — so 'exceptional' is a recorded decision, not an unaudited pass."""
    if model is None:
        model = derive_model()
    findings: "list[str]" = []

    by_stretch: "dict[str, list[Metaphor]]" = {}
    for m in model.local():
        by_stretch.setdefault(m.stretch_key(), []).append(m)

    for stretch, locals_ in sorted(by_stretch.items()):
        def intro_pos(mm: Metaphor) -> int:
            p = _anchor_position(mm.introduced_at.get("label", ""), mm.introduced_at.get("anchor", ""))
            return p if p is not None else 1 << 30
        ordered = sorted(locals_, key=intro_pos)
        for i, a in enumerate(ordered):
            a_payoff = _anchor_position((a.pays_off_at or {}).get("label", ""), (a.pays_off_at or {}).get("anchor", ""))
            for b in ordered[i + 1:]:
                b_intro = intro_pos(b)
                if a_payoff is not None and b_intro <= a_payoff:
                    if not (a.overlap_ok or b.overlap_ok):
                        findings.append(
                            f"OVERLAP in stretch {stretch!r}: {b.slug!r} (intro @{b.introduced_at.get('anchor','')}) "
                            f"opens before {a.slug!r} pays off (@{(a.pays_off_at or {}).get('anchor','')}). "
                            f"Fix: DEFER {b.slug!r} past {a.slug!r}'s payoff, PAY OFF {a.slug!r} first, or DELETE the weaker image."
                        )
    return findings


def compute_overlap_count(model: "MetaphorModel | None" = None) -> int:
    return len(overlap_findings(model))


# ---- the secondary vehicle-collision check (AUDIT-ONLY) ---------------------------------------------

def _image_tokens(m: Metaphor) -> "set[str]":
    """The distinctive image words of a metaphor — tokens of its name + slug, minus articles/connectives and
    tokens under four characters. The identifying image (e.g. 'staircase') lives here, so a shared token
    across different stretches is a diluted vehicle."""
    words = re.split(r"[^a-z0-9]+", f"{m.name} {m.slug}".lower())
    return {w for w in words if len(w) >= 4 and w not in _STOP_TOKENS}


def vehicle_collision_findings(model: "MetaphorModel | None" = None) -> "list[str]":
    """A softer, secondary finding, distinct from overlap: two metaphors in DIFFERENT stretches sharing an
    image word (e.g. 'staircase'). Legal under the overlap rule — non-simultaneous — but a reader meets the
    same vehicle twice meaning two things. Surfaced so the author can rename one or accept the echo."""
    if model is None:
        model = derive_model()
    tokens: "dict[str, list[Metaphor]]" = {}
    for m in model.metaphors:
        for t in _image_tokens(m):
            tokens.setdefault(t, []).append(m)

    findings: "list[str]" = []
    for token, group in sorted(tokens.items()):
        stretches = {g.stretch_key() for g in group}
        if len(group) >= 2 and len(stretches) >= 2:
            names = ", ".join(f"{g.slug!r} ({g.stretch_key()})" for g in group)
            findings.append(f"VEHICLE-COLLISION: the image word {token!r} carries {len(group)} metaphors across "
                            f"different stretches — {names}. Rename one or accept the echo.")
    return findings


# ---- coverage note (the audit-only one-liner catalog.py prints) -------------------------------------

def coverage_note(model: "MetaphorModel | None" = None) -> str:
    if model is None:
        model = derive_model()
    return (f"metaphor + slogan registry: {len(model.core())} core + {len(model.local())} local metaphors, "
            f"{len(model.invoke_by_name())} invoke-by-name + {len(model.commandments())} commandment + "
            f"{len(model.used_once())} used-once slogans; {compute_overlap_count(model)} overlap(s), "
            f"{len(vehicle_collision_findings(model))} vehicle-collision(s) "
            f"(overlap non-gating until a clean session promotes it)")


# ---- projection: the inventory table ----------------------------------------------------------------

def _site_cell(site: "dict | None") -> str:
    import chapter_identity_model as chapter_identity  # noqa: E402 — sibling book-model
    if not isinstance(site, dict):
        return "—"
    label, anchor = site.get("label", ""), site.get("anchor", "")
    if not label:
        return "—"
    # DERIVE the displayed chapter number + the href stem from the identity label (neither is stored).
    chapter = chapter_identity.number(label) if label in chapter_identity.labels() else label
    stem = os.path.basename(chapter_identity.html_href(label))[:-5] if label in chapter_identity.labels() else label
    href = f"{stem}.html#{anchor}" if anchor else f"{stem}.html"
    return f"[{chapter}]({href})"


def render_table_rows(model: "MetaphorModel | None" = None) -> "list[str]":
    if model is None:
        model = derive_model()
    rows: "list[str]" = []
    for m in model.metaphors:
        rows.append(
            f"| **{m.name}** | {m.recurrence} | {_site_cell(m.introduced_at)} | "
            f"{_site_cell(m.pays_off_at) if m.recurrence == 'local' else '*always live*'} | {m.payoff} |"
        )
    return rows


def render_table_md(model: "MetaphorModel | None" = None) -> str:
    """The full markdown inventory table (header + rule + one row per metaphor)."""
    return "\n".join([_TABLE_HEADER, _TABLE_RULE, *render_table_rows(model)])


# ---- CLI --------------------------------------------------------------------------------------------

def _cmd_table() -> int:
    print(render_table_md())
    return 0


def _cmd_show() -> int:
    model = derive_model()
    print(f"overlap rule:\n  {model.overlap_rule}\n")
    print(f"ration rule:\n  {model.ration_rule}\n")
    for m in model.metaphors:
        intro = m.introduced_at
        span = f"intro {intro.get('chapter','?')}#{intro.get('anchor','') or '(page)'}"
        if m.recurrence == "local" and m.pays_off_at:
            span += f" -> pays off {m.pays_off_at.get('chapter','?')}#{m.pays_off_at.get('anchor','') or '(page)'}"
        else:
            span += " -> always live"
        el = m.elaborates or {}
        print(f"[metaphor/{m.recurrence:5}] {m.name}  ({span})  ⟶ {el.get('model','?')}/{el.get('id','?')}")
    for s in model.slogans:
        el = s.elaborates or {}
        print(f"[slogan/{s.scope:13}] {s.name!r}: {s.canonical!r}  ⟶ {el.get('model','?')}/{el.get('id','?')}")
    print(f"\n{len(model.core())} core · {len(model.local())} local metaphors · "
          f"{len(model.invoke_by_name())} + {len(model.commandments())} + {len(model.used_once())} slogans · "
          f"{compute_overlap_count(model)} overlap(s) · {len(vehicle_collision_findings(model))} vehicle-collision(s)")
    return 0


def _cmd_anchors(argv: "list[str]") -> int:
    if len(argv) < 3:
        print(f"usage: {argv[0]} anchors <page_slug>")
        return 2
    page = argv[2]
    order = chapter_anchors(page)
    if not order:
        print(f"no anchors (or no such chapter): {page!r}")
        return 1
    for i, a in enumerate(order):
        print(f"{i:3}  {a}")
    return 0


def _cmd_verify() -> int:
    model = derive_model()
    structural = structural_findings(model)
    overlaps = overlap_findings(model)
    collisions = vehicle_collision_findings(model)
    if structural:
        print(f"metaphor+slogan: {len(structural)} STRUCTURAL finding(s) (blocking):")
        for f in structural:
            print(f"  {f}")
    else:
        print(f"metaphor+slogan structural checks pass ({len(model.core())} core, {len(model.local())} local, "
              f"{len(model.slogans)} slogans).")
    print(f"metaphor overlaps: {len(overlaps)} (audit-only; ratified {EXPECT_OVERLAPS})")
    for f in overlaps:
        print(f"  {f}")
    print(f"vehicle-collisions: {len(collisions)} (audit-only, secondary)")
    for f in collisions:
        print(f"  {f}")
    return 1 if (structural or len(overlaps) != EXPECT_OVERLAPS) else 0


def main(argv: "list[str]") -> int:
    cmd = argv[1] if len(argv) > 1 else "verify"
    if cmd == "verify":
        return _cmd_verify()
    if cmd == "table":
        return _cmd_table()
    if cmd == "show":
        return _cmd_show()
    if cmd == "anchors":
        return _cmd_anchors(argv)
    print(f"usage: {argv[0]} [verify|table|show|anchors <page_slug>]")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
