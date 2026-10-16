"""Phase FMEA: the deck's new ending — predict, then grade the prediction. 28 -> 30 slides.

Order of the ending (the reorder IS the point — the incident must not be reachable
before the exercise):
  26 NEW  "Could we have anticipated this failure?"  — FMEA worked on CrowdStrike
  27 NEW  "Apply FMEA to an unfamiliar system"       — Cloudflare ARCHITECTURE ONLY + blank worksheet
  28 MOVED old-26 incident slide, reframed as the reveal
  29 old-27 "Diagnose the Cloudflare outage" + one closing question
  30 old-28 closing slide, unchanged

Timing: FMEA costs 6 minutes (3+3); recovered from slides 21-25 (11 -> 5). Sum stays 75.
Facts: VERIFIED-FACTS-261015.md §A/§B/§C. FMEA references (speaker notes only):
IEC 60812:2018; AIAG & VDA FMEA Handbook, 1st ed. (2019).
"""
from __future__ import annotations

import re
import sys

sys.path.insert(0, "book/_design/2-4-redux-build/scripts")
from pptx.util import Pt

from buildlib import (
    clone_into, delete_shape, dup_slide, fix_ids, load, one, place, retext,
    save_and_verify, set_notes, shapes_named, slide_by_title, slide_title,
)


def set_size(sh, pt):
    for para in sh.text_frame.paragraphs:
        for r in para.runs:
            r.font.size = Pt(pt)


def notes_text(slide) -> str:
    return slide.notes_slide.notes_text_frame.text


def edit_notes_lines(slide, replacements: dict[str, str]) -> None:
    """Replace whole note lines by unique prefix. Asserts each prefix matches exactly once."""
    lines = notes_text(slide).split("\n")
    for prefix, new in replacements.items():
        hits = [i for i, ln in enumerate(lines) if ln.startswith(prefix)]
        assert len(hits) == 1, f"{slide_title(slide)!r}: prefix {prefix!r} -> {len(hits)} hits"
        lines[hits[0]] = new
    set_notes(slide, "\n".join(lines))


# ============ LOCATE AND ASSERT EVERYTHING ============
prs = load()
assert len(prs.slides._sldIdLst) == 28, "expected 28 slides at phase start"

s1 = prs.slides[0]
s21 = slide_by_title(prs, "A postmortem is an argument")
s22 = slide_by_title(prs, "Reflection changes the engineer")
s23 = slide_by_title(prs, "Where will the next engineer encounter the lesson?")
s24 = slide_by_title(prs, "Different lessons require different authorities")
s25 = slide_by_title(prs, "How would we know the system is safer?")
old26 = slide_by_title(prs, "July 2, 2019: Cloudflare’s WAF outage")
old27 = slide_by_title(prs, "Diagnose the Cloudflare outage")
old28 = slide_by_title(prs, "Failure should change future engineering")

# prototypes
proto_ch = one(s24, "ColumnHeading")          # 14pt heading
proto_card = one(s24, "Card")                  # 20/10pt card
proto_intro = one(s21, "Label", 1)             # the 13pt intro label at y=1.00
assert proto_intro.text_frame.text.startswith("We can now explain"), "wrong intro-label proto"
proto_footer1 = one(s21, "FooterBand")         # single-line footer, y 6.40 h 0.62
arch_blocks = [b for b in shapes_named(old26, "Block") if b.text_frame.text.strip()]
assert len(arch_blocks) == 4, "old26 labeled Blocks"
proto_arch_block = arch_blocks[0]              # 12pt dark label block
proto_rowcap = one(old26, "RowCaption")        # 20pt caption

# sanity on current timings of the slides we re-budget (brief premise check)
for s, t in [(s21, 2), (s22, 2), (s23, 3), (s24, 2), (s25, 2)]:
    m = re.search(r"TIMING:\s*(\d+)", notes_text(s))
    assert m and int(m.group(1)) == t, f"{slide_title(s)!r}: TIMING != {t}"

# ============ MUTATE ============

# ---- Slides 21-25: recover 6 minutes (11 -> 5); protect the arguments, compress delivery ----
edit_notes_lines(s21, {"TIMING:":
    "TIMING: 1 minutes. OPENS MOVEMENT 4 — what should change? DELIVER EFFICIENTLY (author pacing note): "
    "present the ladder and pose the footer question rhetorically — this movement's active-learning weight "
    "now lives in the FMEA exercise (slide 27) and the diagnosis exercise (slide 29)."})
edit_notes_lines(s22, {"TIMING:":
    "TIMING: 1 minutes. PRESERVED FROM THE ORIGINAL LECTURE — Schön's contribution. Deliver as exposition; "
    "fold the footer question into the transition rather than opening a discussion."})
edit_notes_lines(s23, {
    "TIMING:":
        "TIMING: 1 minutes. GOVERNANCE CONVERSION — the lesson changes the ENVIRONMENT.",
    "ANIMATION-IN-SPEECH:":
        "PACING (author): the cover-the-right-column reveal is CUT for time — walk the rows directly and "
        "state the slide-9 contrast yourself; the FMEA exercise two slides ahead carries this movement's "
        "active learning.",
})
edit_notes_lines(s24, {"TIMING:":
    "TIMING: 1 minutes. THE LOCAL AND SYSTEMIC ANALYSES MEET. Pose the footer question, take ONE answer, "
    "state the recognition yourself."})
edit_notes_lines(s25, {
    "TIMING:":
        "TIMING: 1 minutes. CLOSES THE CROWDSTRIKE INVESTIGATION. Walk the rows briskly — the next slide "
        "re-invokes this slide's lesson (a control's existence is not evidence of its effectiveness) inside "
        "the FMEA's staged-rollout row.",
    "TRANSITION:":
        "TRANSITION: everything so far reasons BACKWARD from a failure that already happened. Can the "
        "discipline run FORWARD — before any failure occurs? Next: a structured method for searching for "
        "failures in advance, tried first on the incident we now know thoroughly.",
})
edit_notes_lines(s1, {"BUDGET:":
    "BUDGET: the TIMING lines across the deck now sum to 75 minutes, with the slide-6 commitment discussion, "
    "the slide-27 FMEA transfer exercise, and the slide-29 diagnosis exercise protected."})

# ---- NEW slide A: "Could we have anticipated this failure?" ----
sA = dup_slide(prs, s24)
retext(one(sA, "Title"), "Could we have anticipated this failure?")

intro = clone_into(sA, proto_intro)
retext(intro,
       "The three models explain a failure that has happened. FMEA — Failure Mode and Effects Analysis —",
       "searches for failures that have not happened yet: function by function, what could fail, with what effect, held by which control?")
place(intro, 0.60, 0.92, 8.80, 0.62)
set_size(intro, 12)

COLS = [(0.40, 1.80), (2.30, 2.40), (4.80, 2.00), (6.90, 2.50)]
HEADS = ["FUNCTION", "FAILURE MODE", "EFFECT", "CANDIDATE CONTROL"]
chs = sorted(shapes_named(sA, "ColumnHeading"), key=lambda c: c.left)
assert len(chs) == 2
while len(chs) < 4:
    chs.append(clone_into(sA, proto_ch))
for ch, head, (x, w) in zip(chs, HEADS, COLS):
    retext(ch, head)
    place(ch, x, 1.72, w, 0.30)
    set_size(ch, 12)

ROWS_Y = [2.10, 2.95, 3.80, 4.65]
TABLE = [
    ("Interpret security content", "invalid content causes unsafe execution",
     "endpoint failure", "contract validation"),
    ("Validate content", "a defect escapes testing",
     "defective update released", "independent compatibility tests"),
    ("Distribute content", "a defective update reaches all endpoints",
     "widespread outage", "staged rollout + demonstrated halt"),
    ("Maintain service", "endpoint failure disables critical services",
     "service disruption", "independent service paths"),
]
blocksA = sorted(shapes_named(sA, "Block"), key=lambda b: b.top)
cardsA = sorted(shapes_named(sA, "Card"), key=lambda c: c.top)
assert len(blocksA) == 4 and len(cardsA) == 4
for r, (y, row) in enumerate(zip(ROWS_Y, TABLE)):
    cells = [blocksA[r], cardsA[r]] + [clone_into(sA, proto_card), clone_into(sA, proto_card)]
    for cell, text, (x, w) in zip(cells, row, COLS):
        retext(cell, text)
        place(cell, x, y, w, 0.78)
        set_size(cell, 12 if cell is blocksA[r] else 11)

qlab = clone_into(sA, proto_intro)
retext(qlab,
       "How often will each mode occur? Occurrence stays ‘?’ — which modes warrant action even when their probabilities are unknown?")
place(qlab, 0.60, 5.58, 8.80, 0.40)
set_size(qlab, 12)

fbA = one(sA, "FooterBand")
retext(fbA, "Which of these failure modes could occur in another security product?")
place(fbA, 0.30, 6.40, 9.40, 0.62)
fix_ids(sA)
set_notes(sA, """TIMING: 3 minutes. NEW METHOD — prospective, not explanatory.
ENGINEERING POINT: the three models EXPLAIN a failure that has happened. FMEA — Failure Mode and Effects Analysis (IEC 60812:2018) — is not a fourth explanation: it is a structured method for SEARCHING for potential failures and deciding what deserves attention, before anything fails. Nor is it component-only — by scope it can examine functions, interfaces, operational processes, or organizational activities. Do not teach 'FMEA = components, STAMP = systems.'
THE WORKED TABLE: each row: a FUNCTION of the system we know thoroughly, a failure mode, its effect, a candidate control — all met on slides 21–25.
CARE — the staged-rollout row (cross-reference slide 25): HAVING a staged-rollout mechanism is not the same as having one that reliably detects and contains the failure mode; a rollout that advances without meaningful health checks offers little protection.
RATINGS (notes only): classical FMEA multiplies severity, occurrence, and detection into a Risk Priority Number — but multiplying ordinal ratings does not make an RPN of 120 twice the risk of 60; the AIAG & VDA FMEA Handbook (1st ed., 2019) replaces RPN with Action Priority. Occurrence stays '?' deliberately: the method's value is exposing uncertainty, not manufacturing numerical certainty.
ASK (the footer): which of these failure modes could occur in another security product? Expected: the validate / distribute / maintain rows do not depend on the content-interpreter defect at all.
INSTRUCTOR REFERENCES (no student reading assigned): IEC 60812:2018; AIAG & VDA FMEA Handbook, 1st ed., 2019.
TRANSITION: if those rows transfer, the method should work on a system we know nothing about. Next: exactly that.""")

# ---- NEW slide B: "Apply FMEA to an unfamiliar system" ----
sB = dup_slide(prs, old26)
retext(one(sB, "Title"), "Apply FMEA to an unfamiliar system")
for lab in list(shapes_named(sB, "Label")):
    delete_shape(lab)
for con in list(shapes_named(sB, "Connector")):
    delete_shape(con)
for b in [b for b in shapes_named(sB, "Block") if not b.text_frame.text.strip()]:
    delete_shape(b)

ARCH = [
    ("CLOUDFLARE", "operates a Web Application Firewall (WAF): it inspects incoming web requests for attacks"),
    ("RULE CHANGES", "new detection rules deploy without a software release — and propagate globally within seconds"),
    ("RULE FORM", "some detection rules are written as regular expressions"),
]
bsB = sorted([b for b in shapes_named(sB, "Block") if b.text_frame.text.strip()], key=lambda b: b.top)
capsB = sorted(shapes_named(sB, "RowCaption"), key=lambda c: c.top)
assert len(bsB) == 4 and len(capsB) == 4
ARCH_Y = [1.10, 1.82, 2.54]
for (b, cap), (bt, ct), y in zip(zip(bsB, capsB), ARCH, ARCH_Y):
    retext(b, bt)
    place(b, 0.60, y, 2.80, 0.62)
    retext(cap, ct)
    place(cap, 3.70, y, 5.70, 0.62)
    set_size(cap, 16)
# The 4th architecture row (the accent-styled "27 MINUTES" copy) goes away entirely —
# reusing its Block as a worksheet label would inherit the accent fill.
delete_shape(capsB[3])
delete_shape(bsB[3])

WCOLS = [(0.40, 1.80), (2.30, 2.40), (4.80, 2.20), (7.10, 2.30)]
WHEADS = ["FUNCTION", "POSSIBLE FAILURE MODE", "POTENTIAL EFFECT", "PROPOSED CONTROL"]
for head, (x, w) in zip(WHEADS, WCOLS):
    ch = clone_into(sB, proto_ch)
    retext(ch, head)
    place(ch, x, 3.36, w, 0.28)
    set_size(ch, 12)

WROWS_Y = [3.72, 4.44, 5.16]
WLABELS = ["Evaluate WAF rule", "Validate new rule", "Distribute rule"]
for text, y in zip(WLABELS, WROWS_Y):
    lab = clone_into(sB, bsB[0])
    retext(lab, text)
    place(lab, WCOLS[0][0], y, WCOLS[0][1], 0.66)
    set_size(lab, 12)
for y in WROWS_Y:
    for (x, w) in WCOLS[1:]:
        cell = clone_into(sB, proto_card)
        retext(cell, "")
        place(cell, x, y, w, 0.66)

retext(one(sB, "FooterBand"),
       "YOUR TASK (2–3 minutes, with a partner): at least one failure mode per function.",
       "Leave likelihood as ‘?’ — decide which modes warrant a control anyway.")
fix_ids(sB)
set_notes(sB, """TIMING: 3 minutes — present the architecture in under one minute; PROTECT 2–3 minutes for the worksheet discussion (author pacing note).
ENGINEERING POINT: transfer of the METHOD, not recall of an incident. Students get only the architecture — four facts — and must search it for failure modes under genuinely incomplete information, the condition engineers actually work in. DO NOT reveal what happened in 2019; if a student already knows the incident, ask them to hold it.
FACTUAL BACKGROUND (architecture only; source: Cloudflare post-mortem, 'Details of the Cloudflare outage on July 2, 2019'): Cloudflare operates a Web Application Firewall that inspects incoming web requests; engineers can deploy new detection rules without releasing new software; some rules use regular expressions; rule changes can propagate globally within seconds.
RUN IT: pairs, at least one failure mode per function row; leave occurrence '?' and ask which modes warrant a control anyway.
EXPECTED ANSWERS — all legitimate WITHOUT knowing the incident: a rule that consumes excessive CPU or memory; a rule that false-positives and blocks legitimate traffic; a malformed rule that breaks evaluation; a defective rule reaching every server before anyone can detect or halt it. Students do NOT need to anticipate catastrophic regex backtracking: the general failure mode is the method's product; the precise defect is hindsight's.
MISCONCEPTION: a guessing game about 'the real outage.' Grade on search discipline, not prophecy.
TRANSITION: let's see what actually happened — and compare it against your table.""")

# ---- old 26 -> the reveal (slide 28) ----
retext(one(old26, "Title"), "What actually happened? July 2, 2019")
retext(one(old26, "FooterBand"),
       "Which failure modes did we anticipate — and which did we miss?",
       "Configuration shipped through a faster, less-gated path than code — again.")
set_notes(old26, """TIMING: 3 minutes — the reveal. Grade the class's FMEA predictions against the incident.
ENGINEERING POINT: compare prediction with reality, and name the gap honestly. Most groups will have proposed a resource-exhaustion or bad-rule failure mode, a service-disruption effect, and controls such as pre-deployment resource limits or a staged rollout — without knowing anything about 2019. Nobody should be expected to have named catastrophic regex backtracking: FMEA surfaces the GENERAL failure mode; it does not predict the specific defect. In hindsight every failure looks foreseeable; in practice engineers work under incomplete information.
EXPOSITION ORDER (author): the class met only the architecture on the previous slide, so establish the rest of the system briefly, then the failure — MECHANISM before measurements: some regular expressions require disproportionately more matching work as the input grows, because a backtracking engine re-tries overlapping ways to match. The 23-vs-555 bars at the bottom ILLUSTRATE that mechanism; they do not replace the explanation.
FACTS (Cloudflare post-mortem, 'Details of the Cloudflare outage on July 2, 2019'): a WAF Managed Rule targeting XSS deployed globally at 13:42 UTC — in seconds, with no staged rollout, while software releases went DOG → PIG → Canary; the sub-pattern .*(?:.*=.*) caused catastrophic backtracking (their worked numbers: 'x=x' took 23 steps; 'x=' plus twenty 'x's took 555); PCRE 'has no mechanism to protect against a runaway expression'; WAF identified 14:00, killed globally 14:07, traffic normal 14:09, re-enabled 14:52 — 27 minutes of impact. A CPU-usage protection had been accidentally removed weeks earlier.
ASK (the footer's first line): which failure modes did we anticipate — and which did we miss? Typically anticipated: a defective rule, global distribution, nothing to halt it. Typically missed: the removed CPU protection, and a test suite that measured runtime rather than CPU — defenses that existed and failed, which the diagnosis exercise next can surface.
DEEP STRUCTURE (the footer's second line — let students state it before you do): in both incidents, a security configuration update is distributed globally without adequate opportunities to detect and contain defective updates; and in both, a validator ran and passed while checking the wrong property — arity against the wrong contract at CrowdStrike, runtime instead of CPU at Cloudflare. An engineer could identify that characteristic prospectively in either system — which is what the previous two slides had students do.
CARE: regex matching cost depends on expression, engine, AND input — do not imply all engines behave this way (re2 and Rust's engine carry runtime guarantees). Do not conflate with Cloudflare's November 2025 outage — different mechanism.
TRANSITION: your turn — diagnose it with the three models.""")

# ---- old 27 -> slide 29: the diagnosis, plus one closing question ----
retext(one(old27, "FooterBand"),
       "YOUR TASK — choose an intervention · name the failure class it addresses ·",
       "decide where the lesson should live. What evidence would establish that it works?",
       "How should this incident change the FMEA for future WAF releases?")
old27_notes = notes_text(old27).split("\n")
ti = [i for i, ln in enumerate(old27_notes) if ln.startswith("TRANSITION:")]
assert len(ti) == 1
old27_notes.insert(ti[0],
    "CLOSING QUESTION (the footer's last line): how should this incident change the FMEA for future WAF "
    "releases? Expected: new failure-mode rows (a rule whose matching cost explodes on ordinary input); a "
    "detection column that measures CPU, not wall-clock runtime; controls promoted from candidate to required "
    "— staged rollout for rules, a regex engine with runtime guarantees, a restored and protected CPU limit. "
    "The durable point: an FMEA is a living document — each incident updates the search. That is how failure "
    "changes FUTURE engineering, which is the closing slide's claim.")
set_notes(old27, "\n".join(old27_notes))

# ---- Reorder: the two new slides move to positions 26-27, ahead of the reveal ----
lst = prs.slides._sldIdLst
els = list(lst)
assert len(els) == 30
elA, elB = els[28], els[29]
rid_attr = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
target = None
for e in els[:28]:
    if prs.part.rels[e.get(rid_attr)].target_part is old26.part:
        target = e
assert target is not None, "old26 sldId not found"
lst.remove(elA)
lst.remove(elB)
target.addprevious(elA)
target.addprevious(elB)

# ============ SAVE AND VERIFY ============
save_and_verify(prs, 30)

p2 = load()
titles = [slide_title(s) for s in p2.slides]
expected_tail = [
    "How would we know the system is safer?",
    "Could we have anticipated this failure?",
    "Apply FMEA to an unfamiliar system",
    "What actually happened? July 2, 2019",
    "Diagnose the Cloudflare outage",
    "Failure should change future engineering",
]
assert titles[24:], titles
got_tail = [t.split("\n")[0] for t in titles[24:]]
assert got_tail == expected_tail, f"running order wrong: {got_tail}"
total = 0
for i, s in enumerate(p2.slides, 1):
    n = s.notes_slide.notes_text_frame.text
    m = re.search(r"TIMING:\s*(\d+)", n)
    assert m, f"slide {i} missing TIMING"
    total += int(m.group(1))
assert total == 75, f"TIMING sum {total} != 75"
print(f"ORDER OK (30 slides); TIMING sum = {total} minutes")
