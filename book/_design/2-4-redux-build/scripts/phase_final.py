"""Phase FINAL: slide-1 subtitle; delete every superseded slide (positions 2-34:
all Dieselgate/VW, Instagram, and old theory slides used as templates); verify the
28-slide running order. New slides were appended in narrative order, so after the
deletion no reorder is needed.
"""
from __future__ import annotations

import copy
import sys

sys.path.insert(0, "book/_design/2-4-redux-build/scripts")
from buildlib import delete_slide, load, one, retext, save_and_verify, set_notes, slide_title

EXPECTED_ORDER = [
    "Failure-Aware Engineering",                       # 1 (title block, not Title ph)
    "July 19, 2024",                                   # 2
    "A security update triggers system crashes",       # 3
    "The content and the interpreter disagreed",       # 4
    "Explanation 1: A component-level failure",        # 5
    "What would you change?",                          # 6
    "How did the update reach production?",            # 7
    "Explanation 2: Defenses can fail together",       # 8
    "The investigation identifies weaknesses",         # 9
    "What should change?",                             # 10
    "What does the evidence establish?",               # 11
    "One defective update. Many sectors.",             # 12
    "What system are we investigating?",               # 13
    "Explanation 3: Safety depends on control",        # 14
    "Who controlled the update?",                      # 15
    "The vendor is not the whole system",              # 16
    "Many computers do not imply independent failure", # 17
    "How can critical services survive a shared failure?",  # 18
    "Who can impose a system-wide constraint?",        # 19
    "What did each model let us change?",              # 20
    "A postmortem is an argument",                     # 21
    "Reflection changes the engineer",                 # 22
    "Where will the next engineer encounter the lesson?",  # 23
    "Different lessons require different authorities", # 24
    "How would we know the system is safer?",          # 25
    "July 2, 2019: Cloudflare’s WAF outage",           # 26
    "Diagnose the Cloudflare outage",                  # 27
    "Failure should change future engineering",        # 28
]

prs = load()
assert len(prs.slides._sldIdLst) == 61, "expected 61 slides at phase start"

# ---- locate-and-assert-all before mutating ----
title_slide = prs.slides[0]
tb = one(title_slide, "TitleBlock")
assert tb.text_frame.paragraphs[0].runs[0].text == "Failure-Aware Engineering"
to_delete = list(prs.slides)[1:34]  # positions 2-34
assert len(to_delete) == 33
keep_titles = [slide_title(s) for s in list(prs.slides)[34:]]
assert keep_titles == EXPECTED_ORDER[1:], f"appended order wrong: {keep_titles}"

# ---- mutate: subtitle on slide 1 ----
tf = tb.text_frame
title_p = tf.paragraphs[0]._p
sub_p = copy.deepcopy(tf.paragraphs[1]._p)  # inherit the byline's formatting
title_p.addnext(sub_p)
sub_para = tf.paragraphs[1]
runs = sub_para.runs
runs[0].text = "What should failure teach us to change?"
runs[0].font.italic = True
for r in runs[1:]:
    r._r.getparent().remove(r._r)
set_notes(title_slide, """TIMING: 2 minutes.
ENGINEERING POINT: this unit closes Act II. Delegation asked what work and authority another actor should receive; Modeling asked what consequential knowledge to represent; Alignment asked which obligations to enforce and where. Failure-aware engineering asks what observed failure reveals about the adequacy of all those decisions — failure is the evidence stream the other three activities are tested against.
FRAMING: the subtitle is the unit's organizing question — what should failure teach us to CHANGE? Not 'whose fault was it', not 'what happened' alone. The unit is built as one investigation: a single incident, investigated until each new observation forces a broader causal model, with the theories introduced only at the moment the investigation needs them.
ASK (optional, 30 seconds): ask students for a failure they have personally debugged where the fix they shipped was NOT where the fault was. Collect one or two; they prime the component-vs-system distinction.
EXPECTED ANSWERS: most will offer local-fix stories; that is the baseline the lecture moves them off.
TRANSITION: start with consequences, not mechanism. July 19, 2024.""")

# ---- mutate: delete superseded slides (sldId AND relationship, per buildlib) ----
for s in to_delete:
    delete_slide(prs, s)

save_and_verify(prs, 28)
got = [slide_title(s) for s in load().slides]
got[0] = "Failure-Aware Engineering"  # title slide has no Title placeholder
assert got == EXPECTED_ORDER, f"final order wrong:\n{got}"
print("FINAL: 28 slides, expected running order confirmed")
