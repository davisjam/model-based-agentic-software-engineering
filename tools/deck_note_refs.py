#!/usr/bin/env python3
"""deck_note_refs.py — report speaker notes whose claims about OTHER slides may be stale.

ADVISORY REPORTER, NOT A GATE — and deliberately so. When a deck's order or hidden-set
changes (a slide parked to UNUSED, a resequencing, a navigation slide inserted at the
front), speaker notes that refer to other slides by POSITION silently become false.
Nothing else in the toolchain notices: *"hold the four engineering questions for the next
slide but one"* keeps instructing the presenter to hold them for a slide that is no longer
there, and it fails out loud in front of the room. Twenty-odd such notes were repaired by
hand across five Act III decks in one day (261105), found only by reading every note.

It is a reporter because the signal is NOT deterministic. A naive detector run that day
flagged 37 notes parts on one deck for containing positional language, and nearly all of
it was legitimate presenter script — *"the next slide"* used correctly, *"two slides on"*
that still resolves. A blocking gate on that signal would cry wolf and get bypassed, which
is worse than no gate at all. So this tool RANKS: it answers *"which notes make a
positional claim, and does that claim still hold?"*, puts the deterministically-broken
ones first, and leaves a human or an agent a short list to triage rather than 100 notes to
read. Exit status reports whether the CHECK RAN, never whether the deck is clean.

Signals, strongest first (see `SIGNALS` for the per-signal verdict rules):

  hidden-mention   A presented slide's notes name a phrase that now survives only on a
                   HIDDEN slide. Deterministic, and the strongest signal there is: a
                   reference whose target is parked is almost always broken.
  relative         "the next slide", "two slides on", "the slide after next". Resolved to a
                   position; HIGH when that position is hidden or off the end, otherwise
                   only listed when --since says the span between referrer and referent
                   actually moved.
  numbered         "slide 23", "slides 25 to 27". Resolved; HIGH when the target is hidden,
                   out of range, or shifted since --since — EXCEPT when this note did not
                   cite that number at the baseline, which makes the shift repair evidence.
  successor        A forward promise (`NEXT:`, `TRANSITION:`, "the next slide") whose
                   immediate successor is a DIFFERENT slide than it was at --since. This is
                   the only signal that catches a promise about what the next slide DOES,
                   which carries no positional words at all. A successor merely DISPLACED by
                   an insertion ranks MEDIUM; a parked or removed one ranks HIGH.
  content-ordinal  "the fifth row of the next slide" — an ordinal into another slide's
                   content, which breaks when that slide gains a row and is invisible to
                   any position-based check.
  deck-total       A note asserting the deck's own TIMING total or active-slide count,
                   checked against the presented set.

--since <git-ref> is what makes the report precise rather than exhaustive: it diffs the
deck against that ref, computes which slides moved position or flipped hidden state, and
demotes every reference those specific changes cannot have touched. Measured over the five
261105 decks, that cuts the triage list from 114 notes to 41 while keeping 19 of 20 strong
findings — it drains the LOW band, not the HIGH one.

--since reads the baseline's NOTES as well as its order, because the two together say whether
a citation was re-aimed. Without that, the mode inverts on a notes REPAIR: `shifted` means only
that the cited position's occupant changed, and re-typing the number into a resequenced region
is exactly what makes it fire — 27 HIGH findings, every one false, on deck 2-4's repair commit.
A citation this slide's own note did not carry at the baseline was written against the current
order, so the shift cannot have broken it. Same shape on `successor`: an inserted section
divider DISPLACES the promised slide rather than replacing it.

Pass the last ref at which you believe the notes were CONSISTENT, not simply last night's
commit: the baseline decides the answer. One of these decks recalls 2 of its 7 known breaks
against the previous evening's commit and 5 of 7 against the start of its rework, because
three of its references were broken a day earlier than the hand sweep believed. A break
that predates the baseline is invisible to a diff against it, by construction — so when in
doubt, run with no --since at all and read the HIGH band.

Positions resolve through `ppt/presentation.xml`'s `sldIdLst`, never part filenames — a
deck that has had slides reordered or parked is scrambled, and every deck here has. Each
package asserts its own preconditions (slide parts == sldIdLst length == resolved slides;
notes parts reachable through rels) and reports a PROBE FAILURE rather than a confident
zero.

Usage:
  python3 tools/deck_note_refs.py <deck.pptx> [...]          # all positional claims, ranked
  python3 tools/deck_note_refs.py <deck.pptx> --since <ref>  # only what that ref's changes touch
  python3 tools/deck_note_refs.py --all-tracked [--since <ref>]
  python3 tools/deck_note_refs.py <deck.pptx> --output report.json
  python3 tools/deck_note_refs.py <deck.pptx> --min-rank medium
  python3 tools/deck_note_refs.py <deck.pptx> --at <ref> --since <older-ref>   # historical

Exit codes: 0 = the check ran (findings or not — this is advisory, findings do not fail);
2 = usage error; 3 = a precondition failed on at least one deck, so some report is missing.
"""
from __future__ import annotations

import argparse
import json
import os
import posixpath
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS_DIR)

_P = "{http://schemas.openxmlformats.org/presentationml/2006/main}"
_A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
_R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
_SLIDE_RE = re.compile(r"^ppt/slides/slide\d+\.xml$")

RANKS = ("high", "medium", "low")

#: What each signal checks and what makes it rank HIGH. Printed by --explain, and the
#: single place a reader should look to understand a finding's weight.
SIGNALS = {
    "hidden-mention": "notes name a phrase that now survives only on a hidden slide",
    "numbered": "an explicit slide number or range, resolved against sldIdLst",
    "relative": "next/previous/N-slides-on, resolved to a position",
    "successor": "a forward promise whose immediate successor changed identity since --since",
    "content-ordinal": "an ordinal into ANOTHER slide's content (the fifth row of ...)",
    "deck-total": "a claimed deck TIMING total or active-slide count",
}


# ------------------------------------------------------------------ package reading (stdlib)

def _paragraph_texts(el: ET.Element) -> list[str]:
    """Text of each `<a:p>` under `el`, runs JOINED.

    PowerPoint splits one sentence across arbitrarily many `<a:t>` runs and re-splits them
    on every save, so a run routinely begins mid-word. Anything that compares or matches
    run text invents references that were never written and misses real ones.
    """
    return ["".join(t.text or "" for t in p.iter(f"{_A}t")) for p in el.iter(f"{_A}p")]


def _shape_texts(slide: ET.Element) -> "list[tuple[str, int, str]]":
    """(shape name, y offset, joined text) for every text-bearing shape, in document order."""
    out: list[tuple[str, int, str]] = []
    for sp in slide.iter(f"{_P}sp"):
        name_el = sp.find(f".//{_P}cNvPr")
        off = sp.find(f".//{_A}off")
        y = int(off.get("y") or 0) if off is not None else 0
        text = " ".join(t for t in _paragraph_texts(sp) if t.strip()).strip()
        if text:
            out.append((name_el.get("name") if name_el is not None else "", y, text))
    return out


def _resolve_title(slide: ET.Element) -> str:
    """The slide's title, by three routes in order of authority.

    These decks mostly do NOT use a `title` placeholder: the title is a plain shape NAMED
    `Title` (or `SectionName` on a divider). A resolver that only reads `p:ph/@type` returns
    empty for most slides in this corpus, which would silently disable every title-matching
    signal — so fall back to the name, then to the topmost text shape.
    """
    for sp in slide.iter(f"{_P}sp"):
        ph = sp.find(f".//{_P}nvSpPr/{_P}nvPr/{_P}ph")
        if ph is not None and ph.get("type") in ("title", "ctrTitle"):
            text = " ".join(t for t in _paragraph_texts(sp) if t.strip()).strip()
            if text:
                return text
    shapes = _shape_texts(slide)
    for name, _y, text in shapes:
        if name.lower().startswith(("title", "sectionname")):
            return text
    body = [s for s in shapes if "slide number" not in s[0].lower()]
    return min(body, key=lambda s: s[1])[2] if body else ""


def _resolve_part(base_dir: str, target: str) -> str:
    """An OPC relationship target to a package part name.

    A target is either package-ROOT-absolute (`/ppt/slides/slide28.xml`) or relative to the
    source part's directory (`../notesSlides/notesSlide18.xml`). Both forms ship in this
    corpus — PowerPoint writes the absolute form on some saves — and joining an absolute
    target onto a base silently yields a path no zip entry matches.
    """
    if target.startswith("/"):
        return target.lstrip("/")
    return posixpath.normpath(posixpath.join(base_dir, target))


class PreconditionFailure(Exception):
    """A package whose own structure contradicts itself; refuse to report numbers from it."""


def load_deck(fs_path: str, display: str) -> dict:
    """Read one package into presentation-ORDER slide records, asserting its preconditions.

    Returns {display, slides: [{position, sid, part, hidden, title, texts, notes}], counts}.
    Raises PreconditionFailure rather than returning a partial read — a probe that returns a
    confident number computed over the wrong thing is worse than one that refuses.
    """
    try:
        zf = zipfile.ZipFile(fs_path)
    except (zipfile.BadZipFile, OSError) as exc:
        raise PreconditionFailure(f"{display}: cannot open package ({exc})") from exc
    with zf:
        names = zf.namelist()
        slide_parts = {n for n in names if _SLIDE_RE.match(n)}
        try:
            pres = ET.fromstring(zf.read("ppt/presentation.xml"))
            rels = ET.fromstring(zf.read("ppt/_rels/presentation.xml.rels"))
        except (KeyError, ET.ParseError, OSError) as exc:
            raise PreconditionFailure(
                f"{display}: cannot read ppt/presentation.xml or its rels ({exc})") from exc
        rmap = {r.get("Id"): r.get("Target") for r in rels}
        id_lst = pres.find(f"{_P}sldIdLst")
        if id_lst is None or len(id_lst) == 0:
            raise PreconditionFailure(f"{display}: presentation.xml declares no sldIdLst")

        slides: list[dict] = []
        notes_parts_seen: set[str] = set()
        for pos, sld_id in enumerate(id_lst, 1):
            rid = sld_id.get(f"{_R}id")
            target = rmap.get(rid)
            if not target:
                raise PreconditionFailure(
                    f"{display}: sldIdLst entry {pos} (sldId {sld_id.get('id')}) names "
                    f"relationship {rid!r}, which presentation.xml.rels does not declare")
            part = _resolve_part("ppt", target)
            try:
                slide = ET.fromstring(zf.read(part))
            except (KeyError, ET.ParseError, OSError) as exc:
                raise PreconditionFailure(
                    f"{display}: sldIdLst position {pos} -> {part} unreadable ({exc})") from exc
            notes = ""
            srels = f"ppt/slides/_rels/{posixpath.basename(part)}.rels"
            if srels in names:
                for rel in ET.fromstring(zf.read(srels)):
                    if rel.get("Type", "").endswith("/notesSlide"):
                        npart = _resolve_part("ppt/slides", rel.get("Target"))
                        notes_parts_seen.add(npart)
                        notes = "\n".join(
                            t for t in _paragraph_texts(ET.fromstring(zf.read(npart)))
                            if t.strip())
            slides.append({
                "position": pos, "sid": sld_id.get("id"), "part": part,
                "hidden": slide.get("show") == "0", "title": _resolve_title(slide),
                "texts": [t for _n, _y, t in _shape_texts(slide)], "notes": notes,
            })

        # The three preconditions. Each has drawn a confident wrong answer out of a
        # hand-rolled probe in this repo, so each is asserted rather than assumed.
        if len(slide_parts) != len(slides):
            raise PreconditionFailure(
                f"{display}: {len(slide_parts)} slide part(s) in the zip but "
                f"{len(slides)} sldIdLst entries — a part is orphaned or double-referenced")
        if len({s['part'] for s in slides}) != len(slides):
            raise PreconditionFailure(
                f"{display}: sldIdLst resolves two positions to the same slide part")
        pkg_notes = {n for n in names
                     if re.match(r"^ppt/notesSlides/notesSlide\d+\.xml$", n)}
        if pkg_notes and not notes_parts_seen:
            raise PreconditionFailure(
                f"{display}: {len(pkg_notes)} notes part(s) in the package and ZERO reachable "
                f"through slide rels — the notes extraction is broken, not the deck empty")

    return {"display": display, "slides": slides,
            "counts": {"slides": len(slides),
                       "presented": sum(1 for s in slides if not s["hidden"]),
                       "hidden": sum(1 for s in slides if s["hidden"]),
                       "notes_parts": len(notes_parts_seen)}}


# ------------------------------------------------------------------------ sentence scanning

_NUMBER_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
                 "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12}
_ORDINAL_WORDS = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6,
                  "seventh": 7, "eighth": 8, "ninth": 9, "tenth": 10}


def _count(token: str) -> "int | None":
    token = token.lower()
    return int(token) if token.isdigit() else _NUMBER_WORDS.get(token)


def sentences(notes: str) -> list[str]:
    """Notes split into claim-sized units: paragraph, then sentence.

    A reference lives in one sentence, and the sentence is the unit a triager reads, so it
    is also the unit reported.
    """
    out: list[str] = []
    for para in notes.split("\n"):
        para = re.sub(r"\s+", " ", para).strip()
        if para:
            out += [s.strip() for s in re.split(r"(?<=[.!?:])\s+(?=[A-Z(])", para) if s.strip()]
    return out


_NUM = "|".join(list(_NUMBER_WORDS) + [r"\d+"])

#: Relative-position phrasings and the offset each asserts. A `None` second element means a
#: RANGE spanning offsets 1..N (or -N..-1), which a parked slide anywhere inside breaks.
_RELATIVE = [
    (re.compile(r"\bthe (?:slide after next|next slide but one)\b", re.I), lambda m: [2]),
    (re.compile(r"\b(?:the )?(?:very )?next (?:slide|concept)\b", re.I), lambda m: [1]),
    (re.compile(r"\bthe following slide\b", re.I), lambda m: [1]),
    (re.compile(r"\bthe next is\b", re.I), lambda m: [1]),
    (re.compile(r"\bthe (?:previous|preceding|last) slide\b", re.I), lambda m: [-1]),
    (re.compile(rf"\bthe (?:next|following) ({_NUM}) slides\b", re.I),
     lambda m: list(range(1, (_count(m.group(1)) or 1) + 1))),
    (re.compile(rf"\bthe (?:last|previous|preceding) ({_NUM}) slides\b", re.I),
     lambda m: list(range(-(_count(m.group(1)) or 1), 0))),
    (re.compile(rf"\b({_NUM}) slides? (?:on|later|from now|ahead|away|forward)\b", re.I),
     lambda m: [_count(m.group(1)) or 1]),
    (re.compile(rf"\b({_NUM}) slides? (?:ago|back|earlier|before)\b", re.I),
     lambda m: [-(_count(m.group(1)) or 1)]),
]

def _relative_matches(sentence: str) -> "list[tuple[re.Match, list[int]]]":
    """Every relative-position phrase in one sentence, as (match, offsets), left to right.

    Overlapping matches collapse to the LONGEST: "the very next slide" is matched both by
    the next-slide pattern and (at a shorter span) by nothing else, but a phrase like "the
    next three slides" must not also be counted as a bare "next slide".
    """
    found: list[tuple[re.Match, list[int]]] = []
    for pattern, offsets_of in _RELATIVE:
        for m in pattern.finditer(sentence):
            found.append((m, offsets_of(m)))
    found.sort(key=lambda f: (f[0].start(), -(f[0].end() - f[0].start())))
    kept: list[tuple[re.Match, list[int]]] = []
    for m, offsets in found:
        if any(m.start() < k.end() and k.start() < m.end() for k, _o in kept):
            continue
        kept.append((m, offsets))
    return kept


_NUMBERED = re.compile(
    rf"\bslides?\s+(\d+)(?:\s*(?:to|through|and|[-–])\s*(\d+))?\b", re.I)


def _cited_literals(notes: str) -> "set[int]":
    """Every slide number a note cites, AS WRITTEN — never expanded across a range.

    The repair-evidence test below asks whether the author re-typed the number, so the unit is
    the literal on the page: *"slides 3 to 6"* cites 3 and 6, not 4 and 5. Expanding the range
    would make an unrelated neighbouring citation look like the same number carried over.
    """
    out: set[int] = set()
    for m in _NUMBERED.finditer(notes or ""):
        out |= {int(g) for g in m.groups() if g}
    return out

#: A forward promise. The house convention in these decks is an ALL-CAPS `NEXT:` line on
#: every presented slide, and those are the references that fail in front of the room.
#: CASE-SENSITIVE on purpose: a case-insensitive `\bNEXT\b` matches "the next seventy
#: minutes", which is a claim about the clock, not about a slide. Measured — that exact
#: sentence was the signal's first false positive.
_PROMISE = re.compile(r"\b(?:NEXT|TRANSITION|COMING UP|WHY THE NEXT SLIDE FOLLOWS|"
                      r"WHY THE NEXT CONCEPT IS NECESSARY)\b\s*:"
                      r"|\bthe (?:very )?(?:next|following) slide\b")

_ORDINAL_INTO = re.compile(
    rf"\b({'|'.join(_ORDINAL_WORDS)}|\d+(?:st|nd|rd|th))\s+"
    rf"(row|column|cell|bullet|item|seed|panel|box|entry|point|step|line)\b", re.I)
_ELSEWHERE = re.compile(
    r"\b(?:of|on|in|from)\s+the\s+(?:[\w'-]+\s+){0,3}"
    r"(?:slide|exercise|table|figure|diagram|matrix|tree|panel)\b", re.I)

#: The per-slide budget line, anchored to the start of a notes PARAGRAPH. Anchoring is
#: load-bearing twice over: an unanchored `TIMING[^.]*?(\d+) minutes?` also matches the
#: deck-total claim *"TIMING across the 26 active slides totals 65.5 minutes"*, which both
#: inflates the computed total by the very number being checked and suppresses the check.
#: The singular `minute` is accepted — two slides in this corpus write `TIMING: 1.0 minute.`
#: and a plural-only matcher under-reports a deck by 2 minutes and calls them untimed.
_SLIDE_TIMING = re.compile(r"^TIMING:\s*(\d+(?:\.\d+)?)\s*minutes?\b", re.M | re.I)
_TOTAL_CLAIM = re.compile(
    r"\btotals?\s+(\d+(?:\.\d+)?)\s*minutes?\b|\b(\d+)\s+active slides\b", re.I)

#: Words too common to carry a reference on their own. The hidden-mention signal already
#: requires a phrase to be absent from every presented slide, which does most of the work;
#: this only stops a bare function word from qualifying as a "distinctive" single token.
_STOP = set("""a an and are as at be but by can do does for from had has have how i if in
into is it its no not of on or so than that the their them then there these they this to
was we what when where which who why will with you your our one two three four five six
seven eight nine ten first second third next last same other both each all any more most
much many own just only also very over under after before while would could should may
might must slide slides part parts section exercise students student room deck lecture""".split())


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z][\w'-]*", text.lower())


def _norm(text: str) -> str:
    """Token-joined, space-padded text — the one form phrases are matched against.

    Title phrases are built from TOKENS (punctuation gone) and so must be matched against a
    tokenised sentence, never raw text. A title with internal punctuation otherwise cannot
    match anything: "Logs, metrics, and traces" yields the phrase `logs metrics and traces`,
    which does not occur in the sentence *"point back to the logs, metrics, and traces
    summary"* as written. Sabotage-verified — that injected reference went unreported until
    both sides were normalised. Padding gives whole-word boundaries for free.
    """
    return " " + " ".join(_tokens(text)) + " "


def _proper_nouns(slides: list[dict]) -> set[str]:
    """Tokens the deck itself treats as NAMES — title-case away from a sentence's first word.

    This is the discriminator that separates a single token worth matching from one that is
    merely the lecture's subject. "Cloudflare" appears as *"the Cloudflare incident"* mid
    sentence; "measure", "built", "judgment" and "verdict" never appear capitalised mid
    sentence anywhere, because they are vocabulary rather than names. Without this filter the
    single-token arm of the hidden-mention signal produced 19 findings on a 49-slide deck and
    one of them was real. ALL-CAPS is excluded deliberately: these notes use ALL-CAPS lead-ins
    on nearly every paragraph, so capitalisation there carries no information.
    """
    out: set[str] = set()
    for s in slides:
        for sent in sentences((s["notes"] or "") + "\n" + "\n".join(s["texts"])):
            for word in sent.split()[1:]:
                word = word.strip("\"'“”‘’()[],.;:!?")
                if re.fullmatch(r"[A-Z][a-z'’-]{2,}", word):
                    out.add(word.lower())
    return out


def hidden_phrases(slides: list[dict]) -> "dict[str, int]":
    """Phrases that survive ONLY on a hidden slide, mapped to that slide's position.

    A reference whose target is parked is almost always broken, and this is the one shape of
    *content* reference — a note naming what a slide SAYS rather than where it sits — that
    can be caught deterministically. Built from hidden slides' TITLES only; body text is
    excluded, because a parked slide restates enough of the lecture's vocabulary to match
    everywhere.

    Three filters, each one measured into existence against the 261105 corpus:

      - An n-gram needs TWO content words. One content word beside a function word ("and
        traces") matches ordinary prose about the lecture's own subject.
      - An n-gram must appear in at most two presented slides' NOTES. A pointer at a parked
        slide is rare by nature; a phrase that recurs across the notes is the lecture's
        vocabulary, and flagging vocabulary is how this signal drowns its own findings.
      - A SINGLE token passes the SAME notes-rarity filter, and absence from presented
        slide TEXT is not enough on its own: "today", "place", "choice" and "instrument"
        are all absent from the shapes of a 63-slide deck and all over its notes.
        Unfiltered, those four alone produced 95 findings on one deck — the signal's entire
        output, and none of it real. The rarity filter keeps "Cloudflare" and drops all four.
        (A first attempt required a single token to be a proper noun capitalised away from
        the title's first word. That reads as principled and silently drops every title that
        OPENS on its proper noun — *"Cloudflare, 2 July 2019: a rule they deployed
        themselves"* is exactly such a title, and it is the one this signal exists to catch.)
    """
    presented_text = _norm(" ".join(" ".join(s["texts"]) for s in slides if not s["hidden"]))
    presented_notes = [_norm(s["notes"] or "") for s in slides if not s["hidden"]]
    names = _proper_nouns(slides)

    out: dict[str, int] = {}
    for s in slides:
        if not s["hidden"] or not s["title"]:
            continue
        toks = _tokens(s["title"])
        for width in (4, 3, 2):
            for i in range(len(toks) - width + 1):
                window = toks[i:i + width]
                gram = " ".join(window)
                if sum(1 for t in window if t not in _STOP) < 2:
                    continue
                if f" {gram} " in presented_text:
                    continue
                if sum(1 for n in presented_notes if f" {gram} " in n) > 2:
                    continue
                out.setdefault(gram, s["position"])
        for tok in toks:
            if len(tok) < 5 or tok in _STOP or f" {tok} " in presented_text:
                continue
            if tok not in names and "-" not in tok:
                continue
            if sum(1 for note in presented_notes if f" {tok} " in note) <= 2:
                out.setdefault(tok, s["position"])
    return out


# ------------------------------------------------------------------------- the --since delta

def structure_delta(now: dict, before: dict) -> dict:
    """What changed between two revisions of one deck, keyed by slide id.

    Slide ids are stable across a reorder and a park; positions and part filenames are not.
    """
    old = {s["sid"]: s for s in before["slides"]}
    new = {s["sid"]: s for s in now["slides"]}
    moved: dict[int, int] = {}          # new position -> old position, where they differ
    hidden_flip: set[int] = set()       # new position, hidden state changed
    content_changed: set[int] = set()   # new position, on-slide text changed
    inserted: set[int] = set()          # new position, no counterpart at <ref>
    base_cited: dict[int, set[int]] = {}  # new position -> numbers ITS OWN note cited at <ref>
    for sid, s in new.items():
        o = old.get(sid)
        if o is None:
            inserted.add(s["position"])
            continue
        if o["position"] != s["position"]:
            moved[s["position"]] = o["position"]
        if o["hidden"] != s["hidden"]:
            hidden_flip.add(s["position"])
        if o["texts"] != s["texts"]:
            content_changed.add(s["position"])
        # Keyed by sldId, so it survives the reorder it exists to interpret. A position ABSENT
        # from this map is a slide with no counterpart at <ref> — every citation in its notes
        # was written against the current order.
        base_cited[s["position"]] = _cited_literals(o["notes"] or "")
    removed_old_positions = sorted(o["position"] for sid, o in old.items() if sid not in new)
    # Where each BASELINE position's slide sits now. This is what lets the repair-evidence test
    # ask whether a re-typed number tracked its referent, rather than merely changed.
    base_pos_now: dict[int, int] = {o["position"]: new[sid]["position"]
                                    for sid, o in old.items() if sid in new}
    # Successor identity: the slide that FOLLOWED each position at <ref> versus now. This is
    # what catches a promise about what the next slide DOES, which carries no position words.
    successor_changed: set[int] = set()
    successor_displaced: set[int] = set()
    pos_of_sid = {s["sid"]: s["position"] for s in now["slides"]}
    for s in now["slides"]:
        o = old.get(s["sid"])
        if o is None:
            continue
        old_next = next((x["sid"] for x in before["slides"] if x["position"] == o["position"] + 1),
                        None)
        new_next = next((x["sid"] for x in now["slides"] if x["position"] == s["position"] + 1),
                        None)
        if old_next == new_next:
            continue
        successor_changed.add(s["position"])
        # DISPLACED, not replaced: the slide this one promised still follows, and the only
        # thing now standing between them is material inserted in this very diff (a section
        # divider, a nav slide). A forward promise reads across an interposed new slide —
        # ranking that identically to a successor that was PARKED or REMOVED fires the
        # strongest verdict on the author's own deliberate insertion.
        tgt = pos_of_sid.get(old_next)
        if tgt is not None and tgt > s["position"] and all(
                p in inserted for p in range(s["position"] + 1, tgt)):
            successor_displaced.add(s["position"])
    return {"moved": moved, "hidden_flip": hidden_flip, "content_changed": content_changed,
            "inserted": inserted, "removed_old_positions": removed_old_positions,
            "successor_changed": successor_changed, "base_cited": base_cited,
            "base_pos_now": base_pos_now, "successor_displaced": successor_displaced,
            "structure_moved": bool(moved or hidden_flip or inserted or removed_old_positions)}


def _span_disturbed(delta: dict, lo: int, hi: int) -> bool:
    """Did anything land in, leave, or flip inside [lo, hi]? A relative reference survives a
    uniform shift (a nav slide at the front moves everything by +1 and breaks no distance);
    it breaks only on a change BETWEEN referrer and referent."""
    if delta is None:
        return True
    window = range(min(lo, hi), max(lo, hi) + 1)
    if any(p in window for p in delta["inserted"]) or any(
            p in window for p in delta["hidden_flip"]):
        return True
    if any(lo <= p <= hi for p in delta["removed_old_positions"]):
        return True
    shifts = {delta["moved"][p] - p for p in delta["moved"] if p in window}
    return len(shifts) > 1


# ----------------------------------------------------------------------------- the detectors

def scan_deck(deck: dict, delta: "dict | None") -> list[dict]:
    """Every cross-slide claim in this deck's notes, each with a rank and a resolved verdict."""
    slides = deck["slides"]
    n = len(slides)
    by_pos = {s["position"]: s for s in slides}
    phrases = hidden_phrases(slides)
    presented_timing = sum(
        float(m.group(1)) for s in slides if not s["hidden"]
        for m in _SLIDE_TIMING.finditer(s["notes"] or ""))
    presented_count = deck["counts"]["presented"]
    out: list[dict] = []

    def finding(slide, signal, rank, sentence, verdict, target=None, affected=True):
        # A claim in a PARKED slide's own notes is never read to a live room, and the house
        # convention opens such notes with `PARKED:` / `UNUSED SLIDE.` precisely so a reader
        # distrusts their transitions. These claims are genuinely stale — eight of them on
        # one deck, every one correctly resolved — and triaging them ahead of a note the
        # presenter will actually read is the wrong order. Listed, never first.
        if slide["hidden"] and rank == "high":
            rank = "medium"
            verdict += " (DEMOTED: the referrer is a parked slide, so no live room hears it)"
        out.append({"deck": deck["display"], "position": slide["position"],
                    "slide_hidden": slide["hidden"], "title": slide["title"][:70],
                    "signal": signal, "rank": rank, "target": target,
                    "verdict": verdict, "sentence": sentence, "since_affected": affected})

    for slide in slides:
        pos, notes = slide["position"], slide["notes"]
        if not notes:
            continue
        # A parked slide's own notes are not read to a live room, and the house convention
        # marks them `PARKED:` / `UNUSED SLIDE.` precisely so a reader distrusts their
        # transitions. Scan them, but never rank one HIGH on a relative reference.
        parked_referrer = slide["hidden"]

        for sent in sentences(notes):
            low = _norm(sent)

            # --- hidden-mention: the note names something only a parked slide now says.
            for phrase, target_pos in phrases.items():
                if f" {phrase} " in low and not parked_referrer:
                    finding(slide, "hidden-mention", "high", sent,
                            f"names {phrase!r}, which now survives only on hidden slide "
                            f"{target_pos} ({by_pos[target_pos]['title'][:50]!r})",
                            target=target_pos,
                            # hidden_flip ONLY, not `moved`. A note that names a slide which
                            # was ALREADY parked at the baseline is a pre-existing condition,
                            # not something the change under review broke — and shuffling a
                            # parked slide inside the unused section breaks no content
                            # reference. Including `moved` here let a 22-slide unused section
                            # put every one of its titles back into the report.
                            affected=delta is None or target_pos in delta["hidden_flip"])
                    break

            # --- numbered: an explicit position or range.
            for m in _NUMBERED.finditer(sent):
                lo = int(m.group(1))
                hi = int(m.group(2)) if m.group(2) else lo
                targets = list(range(lo, hi + 1))
                off = [t for t in targets if not 1 <= t <= n]
                hid = [t for t in targets if t in by_pos and by_pos[t]["hidden"]]
                shifted = delta is not None and any(t in delta["moved"] for t in targets)
                # REPAIR EVIDENCE, and why the test is this narrow. `shifted` says only that
                # the cited position's occupant changed since the baseline — which is true of
                # EVERY citation into a resequenced region, including one the author has just
                # re-aimed. Re-typing the number is therefore what makes the verdict fire, and
                # the mode built to be precise inverts on exactly the commits that fix the
                # defect it detects: 27 HIGH, every one false, on deck 2-4's notes repair.
                #
                # The first fix tried was "a literal this note did not carry at the baseline",
                # and it is WRONG — re-typed is not re-typed CORRECTLY. One deck in the
                # acceptance set authored a fresh `slide 3` mid-resequence and got it wrong,
                # and that loose test suppressed the real break along with the false ones
                # (recall 20/26 -> 18/26, measured).
                #
                # So the test is arithmetic, not textual: a number FOLLOWED ITS REFERENT when
                # it names where the slide its baseline counterpart cited sits NOW. That is
                # repair by construction. Only the SHIFT inference is withdrawn — the
                # off-the-end and hidden-target checks above read the CURRENT deck, so a
                # citation re-aimed wrongly still ranks HIGH there.
                literals = {lo} | ({hi} if m.group(2) else set())
                base_lits = delta["base_cited"].get(pos) if delta is not None else None
                followed = bool(base_lits) and all(
                    any(delta["base_pos_now"].get(b) == lit for b in base_lits)
                    for lit in literals)
                if off:
                    finding(slide, "numbered", "high", sent,
                            f"cites slide(s) {off} — the deck has {n} slides", targets)
                elif hid:
                    finding(slide, "numbered", "high", sent,
                            f"cites slide(s) {hid}, which are HIDDEN", targets)
                elif shifted and followed:
                    finding(slide, "numbered", "medium", sent,
                            f"cites slide(s) {targets}, whose occupants shifted — but the "
                            f"number tracked its referent: this note cited "
                            f"{sorted(base_lits)} at the baseline and those slides sit at "
                            f"{sorted(literals)} now. That is repair, not breakage; the "
                            f"arithmetic against the CURRENT deck is checked above", targets)
                elif shifted and base_lits is None:
                    # No counterpart at <ref>, so the whole note was written in this diff and
                    # there is no earlier citation to compare. Unavailable, not cleared.
                    finding(slide, "numbered", "medium", sent,
                            f"cites slide(s) {targets}, whose occupants shifted — but this "
                            f"slide did not exist at the baseline, so nothing says whether "
                            f"the number was written before or after the shift; verify the "
                            f"content", targets)
                elif shifted:
                    was = [delta["moved"].get(t, t) for t in targets]
                    fresh = ("; and this note cited "
                             f"{sorted(base_lits) or 'no slide number'} at the baseline, so "
                             f"the citation is NEW — either a repair or a fresh mistake"
                             if literals - base_lits else "")
                    finding(slide, "numbered", "high", sent,
                            f"cites slide(s) {targets}; the content that was there sits at "
                            f"{was} now — the number points at different slides{fresh}",
                            targets)
                else:
                    finding(slide, "numbered", "medium", sent,
                            f"cites slide(s) {targets} "
                            f"({'; '.join(by_pos[t]['title'][:40] for t in targets if t in by_pos)}) "
                            f"— a number is only as good as the order; verify the content",
                            targets, affected=delta is None)

            # --- relative: next / previous / N slides on.
            #
            # EVERY phrasing in the sentence, not the first one that matches. One sentence
            # routinely carries two references — *"The next three slides are students meeting
            # the consequences of their own proposals, and a proposal they have committed to
            # in public is what makes the race on the following slide land"* holds a +1..+3
            # range AND a +1. Stopping at the first match scanned the +1, found its span
            # undisturbed, and ranked the whole sentence LOW while the range reference was
            # the broken one. That is this tool committing the never-infer-from-a-fragment
            # error against its own input, and it cost four of the five decks' recall.
            for m, offsets in _relative_matches(sent):
                targets = [pos + o for o in offsets]
                off = [t for t in targets if not 1 <= t <= n]
                hid = [t for t in targets if t in by_pos and by_pos[t]["hidden"]]
                lo, hi = min(targets + [pos]), max(targets + [pos])
                if off and not parked_referrer:
                    finding(slide, "relative", "high", sent,
                            f"{m.group(0)!r} resolves to position(s) {off}, off the end of a "
                            f"{n}-slide deck", targets)
                elif hid and not parked_referrer:
                    finding(slide, "relative", "high", sent,
                            f"{m.group(0)!r} resolves to position(s) {hid}, which are HIDDEN "
                            f"— the presenter is pointed at a parked slide", targets)
                elif delta is None:
                    # No baseline: the claim resolves, and nothing available says whether the
                    # distance still means what it meant. Lowest rank by construction — this
                    # is the band the naive detector drowned in.
                    finding(slide, "relative", "low", sent,
                            f"{m.group(0)!r} resolves to {targets} "
                            f"({'; '.join(by_pos[t]['title'][:40] for t in targets if t in by_pos)})"
                            f"; no --since baseline, so whether the distance still holds is "
                            f"unknown — pass --since to decide this one mechanically", targets)
                elif _span_disturbed(delta, lo, hi):
                    rank = "medium" if not parked_referrer else "low"
                    finding(slide, "relative", rank, sent,
                            f"{m.group(0)!r} resolves to {targets} "
                            f"({'; '.join(by_pos[t]['title'][:40] for t in targets if t in by_pos)})"
                            f"; the span {lo}-{hi} changed since the baseline, so the distance "
                            f"may no longer hold", targets)
                else:
                    finding(slide, "relative", "low", sent,
                            f"{m.group(0)!r} resolves to {targets}; nothing in the span moved",
                            targets, affected=False)

            # --- successor: a forward promise over a changed successor.
            if (delta is not None and not parked_referrer and _PROMISE.search(sent)
                    and pos in delta["successor_changed"]):
                nxt = by_pos.get(pos + 1)
                where = ('position ' + str(pos + 1) + ' ' + repr(nxt["title"][:45])
                         if nxt else 'nothing')
                if pos in delta["successor_displaced"]:
                    # The promised slide still follows; only new material was interposed.
                    # Worth a glance — the transition may want to acknowledge the divider —
                    # but it is not the deterministic break the HIGH band claims.
                    finding(slide, "successor", "medium", sent,
                            f"a forward promise whose baseline successor was DISPLACED, not "
                            f"replaced: {where} was inserted in this diff and the promised "
                            f"slide still follows it. The promise reads across an interposed "
                            f"new slide, so this is a wording question, not a broken pointer",
                            pos + 1)
                else:
                    finding(slide, "successor", "high", sent,
                            "a forward promise, and the slide that followed this one at the "
                            f"baseline is no longer its successor — the successor is now {where}"
                            ". A promise about what the next slide DOES carries no positional "
                            "words, so this is the only way to see it", pos + 1)

            # --- content-ordinal: an ordinal into another slide's content.
            mo = _ORDINAL_INTO.search(sent)
            if mo and _ELSEWHERE.search(sent):
                ord_txt = mo.group(1).lower()
                ordinal = _ORDINAL_WORDS.get(ord_txt) or _count(re.sub(r"\D", "", ord_txt))
                rel = next((offs(m2) for pat, offs in _RELATIVE
                            for m2 in [pat.search(sent)] if m2), None)
                target = pos + rel[0] if rel else None
                moved_content = (delta is not None and target is not None
                                 and target in delta["content_changed"])
                tgt_slide = by_pos.get(target) if target else None
                items = max((len(t.split("\n")) for t in (tgt_slide["texts"] if tgt_slide else [])),
                            default=0)
                if moved_content:
                    finding(slide, "content-ordinal", "high", sent,
                            f"an ordinal ({mo.group(0)!r}) into the content of position "
                            f"{target}, whose on-slide text CHANGED since the baseline — an "
                            f"ordinal into a table that gained a row moves silently", target)
                else:
                    finding(slide, "content-ordinal", "medium", sent,
                            f"an ordinal ({mo.group(0)!r}) into another slide's content"
                            + (f" (position {target})" if target else "")
                            + f"; {items or 'unknown'} countable item(s) resolved there. No "
                            "position-based check can see this one break",
                            # An UNRESOLVED target means unknown, never unaffected: the
                            # baseline diff cannot clear a reference it could not resolve.
                            target, affected=delta is None or target is None)

            # --- deck-total: a claim about the deck's own size or budget.
            # finditer, not search: one sentence carries BOTH claims — "TIMING across the 26
            # active slides totals 65.5 minutes" — and the slide count matched while the
            # total did not. A single `search` returns the earlier alternative and the stale
            # number goes unexamined.
            if _SLIDE_TIMING.match(sent) is None:
                for mt in _TOTAL_CLAIM.finditer(sent):
                    if mt.group(1) and presented_timing:
                        claimed = float(mt.group(1))
                        if abs(claimed - presented_timing) > 0.05:
                            finding(slide, "deck-total", "high", sent,
                                    f"claims a {claimed:g}-minute total; the presented set "
                                    f"sums to {presented_timing:g} minutes", None)
                    if mt.group(2) and int(mt.group(2)) != presented_count:
                        finding(slide, "deck-total", "high", sent,
                                f"claims {mt.group(2)} active slides; {presented_count} are "
                                f"presented", None)
    return out


# ------------------------------------------------------------------------------- git baseline

def deck_at_ref(ref: str, repo_path: str, tmpdir: str) -> str:
    """Extract one deck blob at `ref` into `tmpdir`. Loud on an empty or missing blob."""
    out = os.path.join(tmpdir, f"{ref.replace('/', '_').replace('^', 'P')}-"
                               f"{os.path.basename(repo_path)}")
    r = subprocess.run(["git", "show", f"{ref}:{repo_path}"], cwd=ROOT, capture_output=True)
    if r.returncode != 0:
        raise PreconditionFailure(
            f"{repo_path}: cannot read it at {ref} ({r.stderr.decode('utf-8', 'replace').strip()[:160]})")
    if len(r.stdout) < 1000:
        raise PreconditionFailure(
            f"{repo_path}: the blob at {ref} is {len(r.stdout)} bytes — not a deck")
    with open(out, "wb") as fh:
        fh.write(r.stdout)
    return out


def tracked_pptx() -> list[str]:
    r = subprocess.run(["git", "ls-files", "*.pptx"], cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"deck-note-refs: git ls-files failed: {r.stderr.strip()}", file=sys.stderr)
        sys.exit(2)
    return [ln for ln in r.stdout.splitlines() if ln.strip()]


# ---------------------------------------------------------------------------------- reporting

def report(decks: list[dict], findings: list[dict], failures: list[str],
           since: "str | None", min_rank: str, out_path: "str | None") -> int:
    order = {r: i for i, r in enumerate(RANKS)}
    floor = order[min_rank]
    shown = [f for f in findings
             if order[f["rank"]] <= floor and (since is None or f["since_affected"])]
    shown.sort(key=lambda f: (order[f["rank"]], f["deck"], f["position"]))
    suppressed = len(findings) - len(shown)

    for deck in decks:
        c = deck["counts"]
        print(f"  {deck['display']}: {c['slides']} slides "
              f"({c['presented']} presented / {c['hidden']} hidden), "
              f"{c['notes_parts']} notes part(s) — preconditions OK")
    for f in failures:
        print(f"  [PROBE FAILURE] {f}")

    current_rank = None
    for f in shown:
        if f["rank"] != current_rank:
            current_rank = f["rank"]
            print(f"\n  ===== {current_rank.upper()} =====")
        where = f"pos {f['position']}" + (" (hidden)" if f["slide_hidden"] else "")
        print(f"  [{f['signal']}] {os.path.basename(f['deck'])} {where} "
              f"{f['title']!r}\n      claim:  {f['sentence']}\n      why:    {f['verdict']}")

    counts = {r: sum(1 for f in findings if f["rank"] == r) for r in RANKS}
    print(f"\ndeck-note-refs: result — {len(decks)} deck(s), "
          f"{sum(d['counts']['notes_parts'] for d in decks)} notes part(s), "
          f"{len(findings)} reference claim(s) found "
          f"({counts['high']} high / {counts['medium']} medium / {counts['low']} low), "
          f"{len(shown)} reported, {suppressed} suppressed "
          f"({'unaffected by the baseline diff or ' if since else ''}below --min-rank), "
          f"{len(failures)} probe failure(s)")
    if out_path:
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump({"since": since, "min_rank": min_rank,
                       "decks": [{"display": d["display"], "counts": d["counts"]} for d in decks],
                       "probe_failures": failures, "counts": counts,
                       "findings": shown, "all_findings": findings}, fh, indent=1)
        print(f"deck-note-refs: wrote {out_path}")
    return 3 if failures else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument("decks", nargs="*")
    ap.add_argument("--all-tracked", action="store_true")
    ap.add_argument("--since", metavar="GIT_REF")
    ap.add_argument("--at", metavar="GIT_REF",
                    help="read the deck ITSELF at this ref instead of from the working tree "
                         "— re-runs the check over a historical state (tracked decks only)")
    ap.add_argument("--min-rank", choices=RANKS, default="low")
    ap.add_argument("--output", metavar="FILE.json")
    ap.add_argument("--explain", action="store_true")
    ap.add_argument("-h", "--help", action="store_true")
    try:
        args = ap.parse_args(argv)
    except SystemExit:
        return 2
    if args.explain:  # before the deck check: --explain takes no deck
        for name, what in SIGNALS.items():
            print(f"  {name:17} {what}")
        return 0
    if args.help or (not args.decks and not args.all_tracked):
        print(__doc__)
        return 0 if args.help else 2

    if args.all_tracked:
        pairs = [(p, os.path.join(ROOT, p)) for p in tracked_pptx()]
    else:
        pairs = []
        for a in args.decks:
            absolute = os.path.abspath(a)
            display = (os.path.relpath(absolute, ROOT)
                       if absolute.startswith(ROOT + os.sep) else a)
            pairs.append((display, absolute))
    pairs = [(d, f) for d, f in pairs if not os.path.basename(d).startswith("~$")]

    print(f"deck-note-refs: plan — ADVISORY report over {len(pairs)} deck(s). Resolve "
          f"positions through sldIdLst (never part filenames); extract notes per slide; "
          f"scan for {len(SIGNALS)} reference signals ({', '.join(SIGNALS)}); rank by how "
          f"deterministically each claim is broken"
          + (f"; demote references the diff against {args.since} cannot have touched"
             if args.since else "; no --since baseline, so ALL positional claims are listed")
          + (f"; reading each deck at {args.at} rather than from the working tree"
             if args.at else ""))

    decks, findings, failures = [], [], []
    with tempfile.TemporaryDirectory(prefix="deck-note-refs-") as td:
        for display, fs_path in pairs:
            repo_path = display
            try:
                if args.at:
                    fs_path = deck_at_ref(args.at, repo_path, td)
                    display = f"{display}@{args.at}"
                deck = load_deck(fs_path, display)
                delta = None
                if args.since:
                    before = load_deck(deck_at_ref(args.since, repo_path, td),
                                       f"{repo_path}@{args.since}")
                    delta = structure_delta(deck, before)
                    if not delta["structure_moved"]:
                        print(f"  {display}: no slide moved position or changed hidden state "
                              f"since {args.since}")
                decks.append(deck)
                findings += scan_deck(deck, delta)
            except PreconditionFailure as exc:
                failures.append(str(exc))
    return report(decks, findings, failures, args.since, args.min_rank, args.output)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
