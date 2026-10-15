"""Phase M2: build Movement 2 (The defenses) — six slides appended after slide 39.

Every fact is from book/_design/2-4-redux-build/VERIFIED-FACTS-261015.md §A.
Structure: locate-and-assert-all, then mutate, then save, then verify (39 -> 45 slides).
"""
from __future__ import annotations

import sys

sys.path.insert(0, "book/_design/2-4-redux-build/scripts")
from buildlib import (
    WIP, clone_into, delete_shape, dup_slide, fix_ids, load, one, place, retext,
    save_and_verify, set_notes, shapes_named, slide_by_title,
)

prs = load()
assert len(prs.slides._sldIdLst) == 39, "expected 39 slides at phase start"

# ---- locate every template up front (assert-all before any mutation) ----
t_levels = slide_by_title(prs, "What failed, and why didn’t we know?")      # old 24
t_cheese = slide_by_title(prs, "Swiss cheese")                              # old 14
t_rows = slide_by_title(prs, "July 19, 2024")                               # old 35
t_twocol = slide_by_title(prs, "Imagine a race condition. Diagnosis reopens the design space")  # old 29
t_fan = slide_by_title(prs, "What would you change?")                       # old 39
t_footer_src = slide_by_title(prs, "Explanation 1: A component-level failure")  # old 38
footer_proto = one(t_footer_src, "FooterBand")

# =============== Slide 7 — How did the update reach production? ===============
s = dup_slide(prs, t_levels)
retext(one(s, "Title"), "How did the update reach production?")
blocks = shapes_named(s, "Block")
assert len(blocks) == 5
for b, txt in zip(blocks, ["NEW TEMPLATE TYPE", "TEMPLATE TYPE TESTING", "CONTENT VALIDATOR",
                           "TEMPLATE INSTANCE RELEASE", "ALL FALCON SENSORS"]):
    retext(b, txt)
lqs = shapes_named(s, "LevelQuestion")
assert len(lqs) == 5
for q, txt in zip(lqs, [
    "defined 21 input fields; the invoking code supplied 20",
    "passed — every test matched the 21st field with a wildcard",
    "passed — validated against 21 fields, not the 20 provided",
    "shipped to all endpoints at once; no staged rollout for content",
    "the first non-wildcard 21st field forced an out-of-bounds read",
]):
    retext(q, txt)
gls = shapes_named(s, "GroupLabel")
assert len(gls) == 2
retext(gls[0], "BUILD AND VALIDATE")
retext(gls[1], "RELEASE")
retext(one(s, "FooterBand"),
       "Which defense should have stopped it?",
       "Every stage shown is from CrowdStrike’s RCA — not a generic CI/CD pipeline.")
fix_ids(s)
set_notes(s, """TIMING: 3 minutes. OPENS MOVEMENT 2 — why didn't we catch it?
ENGINEERING POINT: the release process is itself an engineering system. The defect's path to production ran through named stages, and each stage is a place an intervention could live.
FACTS (CrowdStrike RCA, 6 Aug 2024): the new IPC Template Type defined 21 input parameter fields while the integration code that invoked the Content Interpreter supplied only 20. The mismatch 'evaded multiple layers of build validation and testing' — testing and the initial Template Instances used wildcard matching on the 21st input, so field 21 was never read. The Content Validator accepted the instances. Template Instances deployed to all endpoints with no staged rollout. A later instance introduced a non-wildcard matching criterion for the 21st input, and the Content Interpreter read the 21st entry of a 20-entry array.
CARE: these stage labels come from the RCA. Do not embellish into a generic CI/CD pipeline, and do not yet say which defenses were ABSENT — that is slide 9's reveal.
ASK: which defense should have stopped it?
EXPECTED ANSWERS: 'the validator' (most common), 'testing'. Misconception to surface: students assume every named stage existed and merely underperformed. Hold the correction for slide 9.
TRANSITION: several defenses in sequence, and the defect passed every one. There is a classic model for exactly this shape.""")

# =============== Slide 8 — Explanation 2: Defenses can fail together ===============
s = dup_slide(prs, t_cheese)
retext(one(s, "Title"), "Explanation 2: Defenses can fail together")
labels = shapes_named(s, "Label")
defense_labels = [l for l in labels if l.text_frame.text.strip() == "DEFENSE"]
assert len(defense_labels) == 4
for l, txt in zip(defense_labels, ["VALIDATION", "TESTING", "RELEASE", "DEPLOYMENT"]):
    retext(l, txt)
fb = clone_into(s, footer_proto)
retext(fb, "Why did the defenses fail to stop the defect?")
fix_ids(s)
set_notes(s, """TIMING: 3 minutes. SECOND CAUSAL BOUNDARY.
ENGINEERING POINT: Reason's Swiss cheese model — an accident can occur when weaknesses in multiple defenses align. The model changes the engineering question from 'which component failed?' to 'what was the condition of the defenses around it?'. We reach for it NOW because slide 7 just showed a defect passing a whole sequence of defenses; the model earns its entrance from the narrative, not from a definitions section.
FACTUAL BACKGROUND: the aligned path is real, not schematic — the RCA documents a parameter-count mismatch that 'evaded multiple layers of build validation and testing' (CrowdStrike RCA, 6 Aug 2024). Each slab here is a defense layer; each hole is a weakness; the horizontal line is the trajectory that found a hole in every layer.
ATTRIBUTION: James Reason, Human Error (1990) and Managing the Risks of Organizational Accidents (1997). Latent conditions — the wildcard masking that kept field 21 unread — are Reason's term of art, sitting in the system long before the active failure.
ASK: why did the defenses fail to stop the defect?
EXPECTED ANSWERS: 'they all had holes'. Push: are a hole in a defense that RAN and a defense that was never BUILT the same kind of weakness? That distinction is the next slide.
TRANSITION: the model predicts aligned weaknesses. The postmortem tells us what the weaknesses actually were.""")

# =============== Slide 9 — The investigation identifies weaknesses ===============
s = dup_slide(prs, t_rows)
retext(one(s, "Title"), "The investigation identifies weaknesses")
rows = list(zip(shapes_named(s, "Block"), shapes_named(s, "RowCaption")))
assert len(rows) == 4
content = [
    ("COMPILE-TIME VALIDATION", "ABSENT — the Template Type’s field count was never validated"),
    ("RUNTIME BOUNDS CHECK", "ABSENT — no array-bounds check on Content Interpreter input"),
    ("CONTENT VALIDATOR", "RAN, WRONG CONTRACT — checked 21 fields; the code supplied 20"),
    ("TEMPLATE TESTING", "GAP — no test used a non-wildcard criterion for field 21"),
]
for (b, c), (bt, ct) in zip(rows, content):
    retext(b, bt)
    retext(c, ct)
retext(one(s, "FooterBand"),
       "Two defenses were missing. One ran — and checked the wrong property.",
       "Source: CrowdStrike, External Technical Root Cause Analysis, 6 Aug 2024")
fix_ids(s)
set_notes(s, """TIMING: 3 minutes. THE EVIDENCE REPLACES THE SCHEMATIC.
ENGINEERING POINT: a defense that was ABSENT is a different finding from a defense that FAILED. The RCA's findings (all quoted or paraphrased from CrowdStrike's RCA, 6 Aug 2024): (1) 'the number of fields in the IPC Template Type was not validated' at sensor compile time — absent; (2) 'a runtime array bounds check was missing for Content Interpreter input fields' — absent; (3) the Content Validator 'contained a logic error' — it ran, but validated against the Template Type's 21 fields rather than the 20 the integration code supplied: the wrong contract; (4) Template Type testing never exercised a non-wildcard matching criterion for field 21 — a coverage gap.
WHY THE DISTINCTION MATTERS: 'strengthen the validator' is the wrong fix for a check that never existed, and 'add a check' is the wrong fix for a validator holding the wrong contract. Interventions follow the diagnosis, not the slogan.
ASK: for each row — is the fix to repair, to re-point at the right contract, or to build?
EXPECTED ANSWERS: students usually say 'fix the validator' for all four. Misconception: treating all four rows as failures of the same kind.
TRANSITION: four weaknesses, four candidate interventions — but interventions do different KINDS of work. Let's name those kinds.""")

# =============== Slide 10 — What should change? ===============
s = dup_slide(prs, t_rows)
retext(one(s, "Title"), "What should change?")
rows = list(zip(shapes_named(s, "Block"), shapes_named(s, "RowCaption")))
assert len(rows) == 4
content = [
    ("PREVENT", "make invalid content unrepresentable — or reject it at the boundary"),
    ("DETECT", "test the content against its interpreter before release"),
    ("CONTAIN", "limit how many endpoints a defective update can reach"),
    ("RECOVER", "restore affected machines and services after a failure"),
]
for (b, c), (bt, ct) in zip(rows, content):
    retext(b, bt)
    retext(c, ct)
retext(one(s, "FooterBand"),
       "Which intervention addresses which failure class?",
       "Containment acts before the blast radius is set; recovery acts after.")
fix_ids(s)
set_notes(s, """TIMING: 3 minutes.
ENGINEERING POINT: interventions have distinct effects — prevent, detect, contain, recover. They are not interchangeable, and they fail differently. Prevention and detection act on the DEFECT; containment and recovery act on the CONSEQUENCES.
FACTUAL BACKGROUND: CrowdStrike's own committed mitigations span all four (RCA, 6 Aug 2024): validate the Template Type field count at compile time and add runtime bounds checks (prevent); widen Template Type test coverage and add Content Validator checks (detect); stage Template Instance deployment through canary rings with rollback, and give customers control over Rapid Response Content deployment (contain); recovery was the two weeks of manual remediation the world performed.
KEY DISTINCTION: containment versus recovery. Staged deployment reduces how much of the fleet is exposed BEFORE anyone knows the update is bad; recovery operates AFTER machines have failed. Students conflate them because both 'limit damage'.
ASK: which of these four would have changed THIS incident's outcome the most?
EXPECTED ANSWERS: most pick prevent ('just add the bounds check'). Counter: prevention closes this defect; containment bounds the NEXT defect class you haven't imagined yet.
TRANSITION: each intervention leaves a different uncertainty behind. What exactly does each piece of evidence establish?""")

# =============== Slide 11 — What does the evidence establish? ===============
s = dup_slide(prs, t_twocol)
retext(one(s, "Title"), "What does the evidence establish?")
blocks = shapes_named(s, "Block")
cards = shapes_named(s, "Card")
assert len(blocks) == 4 and len(cards) == 4
# drop the 4th row (idempotency row in the template)
delete_shape(blocks[3])
cards_by_top = sorted(cards, key=lambda c: c.top)
delete_shape(cards_by_top[3])
blocks = shapes_named(s, "Block")
cards = sorted(shapes_named(s, "Card"), key=lambda c: c.top)
for b, txt in zip(sorted(blocks, key=lambda b: b.top),
                  ["Regression test", "General invariant", "Deployment containment"]):
    retext(b, txt)
for c, txt in zip(cards, [
    "detects this observed failure, if it recurs this way",
    "constrains a whole class of invalid inputs",
    "limits the consequences of failures that escape",
]):
    retext(c, txt)
chs = shapes_named(s, "ColumnHeading")
assert len(chs) == 2
retext(chs[0], "INTERVENTION")
retext(chs[1], "WHAT THE EVIDENCE ESTABLISHES")
retext(one(s, "FooterBand"),
       "What uncertainty remains after each intervention?",
       "A regression test is not weak — its adequacy depends on",
       "the property and the failure class.")
fix_ids(s)
set_notes(s, """TIMING: 3 minutes. RECONNECTS TO THE VALIDATION UNIT.
ENGINEERING POINT: each intervention is backed by evidence that establishes something SPECIFIC, and the gap between what it establishes and what we need is residual uncertainty. A regression test pins the observed failure; a general invariant (the compile-time field-count check, the runtime bounds check) constrains a class; deployment containment accepts that some failures will escape and bounds their reach.
FACTUAL GROUNDING: map each row to slide 9's findings. CrowdStrike's added bounds check is a general invariant — it holds for every spec-allowed content instance, not just Channel File 291. Their staged-rollout commitment is containment (CrowdStrike RCA, 6 Aug 2024).
CARE: do not teach 'regression tests are weak'. Their adequacy depends on the property and the failure class — for a deterministic parser defect, a regression test is exactly right.
ASK: after adding the bounds check, what uncertainty remains?
EXPECTED ANSWERS: 'none — it's fixed.' Misconception to correct: the bounds check closes out-of-bounds READS; it says nothing about the next way content and interpreter can disagree, which is why containment still earns its keep.
TRANSITION: everything so far explains the crash and the escape. Neither explains why ONE escaped defect disrupted airlines, hospitals, and banks on the same morning.""")

# =============== Slide 12 — One defective update. Many sectors. ===============
s = dup_slide(prs, t_fan)
retext(one(s, "Title"), "One defective update. Many sectors.")
retext(one(s, "Block"), "ONE DEFECTIVE", "CONTENT UPDATE")
cards = sorted(shapes_named(s, "Card"), key=lambda c: c.top)
assert len(cards) == 3
retext(cards[0], "AIRLINE", "flights grounded")
retext(cards[1], "HOSPITAL", "clinical systems unavailable")
retext(cards[2], "BANK", "payments disrupted")
retext(one(s, "FooterBand"),
       "Why did independent organizations fail together?",
       "Correlated exposure to a common dependency.")
fix_ids(s)
set_notes(s, """TIMING: 2 minutes. TRANSITION SLIDE — closes Movement 2, opens the system question.
ENGINEERING POINT: the component model explained the crash; Swiss cheese explained the escape. Neither explains the SHAPE of the impact — organizations with no relationship to each other failing simultaneously. The observation that needs a new model: correlated failure across apparently independent systems.
FACTUAL BACKGROUND: Microsoft estimated ~8.5 million Windows devices affected — 'less than one percent of all Windows machines' (Microsoft, 20 Jul 2024). Carry the qualifier: the lesson is not how many devices failed but WHICH ones. A small, non-random slice of machines ran airlines' operations, hospitals' clinical systems, and banks' payment paths. Keep sector impacts qualitative; do not quote cancellation counts.
ASK: why did independent organizations fail together?
EXPECTED ANSWERS: 'they all used CrowdStrike' — correct, and push one level: what PROPERTY of that shared dependency turned one vendor's defect into a multi-sector outage? (Privileged position + simultaneous global distribution.) Misconception: 'the update was unusually large-scale.' Under one percent of Windows machines — scale is not the explanation; criticality and shared dependency are.
TRANSITION: to reason about this we need a model whose subject is the SYSTEM — its controls and dependencies — not the defect. We need to choose a system boundary.""")

save_and_verify(prs, 45)
print("Movement 2 built: slides 40-45 appended")
