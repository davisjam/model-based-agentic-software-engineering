# 2-4 redux — verified facts and build state (261015)

Every factual claim the rebuilt lecture makes about CrowdStrike or Cloudflare must trace
to this file, and every line here was fetched from a primary source during the build.
The brief's Part II requires authoritative sourcing *before* slides are written; this is
that step, done.

**Do not restate any number or mechanism below from memory.** If a slide needs a fact
that is not here, fetch it and add it here first.

---

## A. CrowdStrike, Channel File 291, 19 July 2024

Primary source: CrowdStrike, *External Technical Root Cause Analysis — Channel File 291
Incident*, 6 August 2024.
<https://www.crowdstrike.com/wp-content/uploads/2024/08/Channel-File-291-Incident-Root-Cause-Analysis-08.06.2024.pdf>

### The mechanism, in the RCA's own words

> "A runtime array bounds check was missing for Content Interpreter input fields on
> Channel File 291."

The chain, with the documented arity:

- The new **IPC Template Type defined 21 input parameter fields**.
- The **integration code that invoked the Content Interpreter supplied only 20** input
  values to match against.
- "This parameter count mismatch evaded multiple layers of build validation and testing."
- It stayed **latent** because testing and the initial Template Instances used
  **wildcard** matching on the 21st input, so field 21 was never actually read.
- A later Template Instance introduced a **non-wildcard matching criterion for the 21st
  input**. The Content Interpreter was instructed to read the **21st entry of a 20-entry
  input array** — an out-of-bounds read — and the sensor crashed.
- The mismatch the RCA names: "the 21 inputs validated by the Content Validator versus
  the 20 provided by the IPC [template]".

Teaching value: this is a **producer/consumer specification mismatch between two
components of the same product**. Neither component's local reasoning was wrong; the
*contract* was held in two places and they differed. The wildcard masking is a latent
condition in Reason's precise sense.

### The six RCA findings, with the defense each implicates

| # | RCA finding (abbreviated) | Defense | Status |
|---|---|---|---|
| 1 | "The number of fields in the IPC Template Type was not validated" at sensor compile time | compile-time validation | **absent** |
| 2 | "A runtime array bounds check was missing for Content Interpreter input fields" | runtime bounds check | **absent** |
| 3 | "Template Type testing should cover a wider variety of matching criteria" — no test for a non-wildcard 21st field | test coverage | gap |
| 4 | "The Content Validator contained a logic error" — it validated against the Template Type's 21 fields, not the 20 the integration code supplied | content validation | ran, wrong contract |
| 5 | "Template Instance validation should expand to include testing" in the Content Interpreter | validation scope | gap |
| 6 | "Each Template Instance should be deployed in a staged rollout" | staged deployment | **absent** for content |

Mitigations the RCA commits to: validate Template Type field count at sensor compile
time; add runtime input array bounds checks (backported to Windows sensor 7.11 and
later); increase Template Type test coverage; add Content Validator checks; stage
Template Instance deployment with **canary testing promoted through deployment rings**
with rollback; and **give customers control over Rapid Response Content deployment**.

**Finding 6 is the keystone for the lecture.** Content shipped without the staged
rollout that code releases had. That is the same structural gap as Cloudflare's, five
years earlier and in a different company — which is what makes the transfer exercise an
argument rather than an analogy.

### Scale

Primary source: Microsoft, "Helping our customers through the CrowdStrike outage",
20 July 2024.

> "We currently estimate that CrowdStrike's update affected 8.5 million Windows devices,
> or less than one percent of all Windows machines."

**Always carry the qualifier.** Under 1% of Windows devices grounded airlines and
delayed clinical care. The lesson is not how many devices failed but *which* ones — a
small, non-random slice ran essential services. The raw "8.5 million" invites the wrong
inference (that scale explains the disruption); the fraction forces the right one
(criticality and shared dependency do).

Sector impacts (airlines, hospitals, financial services) are from contemporaneous
reporting and should stay **qualitative** on slides. Do not quote cancellation counts.

---

## B. Cloudflare WAF, 2 July 2019

Primary source: Cloudflare, "Details of the Cloudflare outage on July 2, 2019".
<https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/>

- A new **WAF Managed Rule** targeting XSS was deployed **globally at 13:42 UTC**.
- The offending sub-pattern was `.*(?:.*=.*)` — "match zero or more characters, then
  match zero or more characters" — causing **catastrophic backtracking**. The post's
  worked numbers: `x=x` took 23 steps; `x=` followed by twenty `x`s took 555 steps.
- The engine had no escape: PCRE "has no mechanism to protect against a runaway
  expression."
- **27 minutes** of impact: deployed 13:42, WAF identified 14:00, globally killed 14:07,
  traffic normal 14:09, WAF re-enabled 14:52.
- Controls that **existed**: pull-request approval, CI/CD via TeamCity, change-request
  tickets with rollback plans, SOPs, multiple alerting systems.
- What **failed**: the test suite measured runtime, not CPU — "no increase in test suite
  run time was observed with the rule that would ultimately cause CPU exhaustion"; a
  CPU-usage protection had been **accidentally removed weeks earlier**; and the WAF SOP
  "allowed a non-emergency rule change to go globally into production without a staged
  rollout", whereas *software* releases used DOG (employee-only PoP) → PIG (guinea pig)
  → Canary before global. Quicksilver pushed the rule globally in seconds.
- Remediation: restore the removed CPU protection; audit all **3,868** WAF rules for
  backtracking; add performance profiling to the test suite; move to a regex engine with
  **runtime guarantees** (re2 or Rust regex); require staged rollout for rules; build an
  emergency mechanism to pull the Dashboard/API off the edge; automate status updates.

Teaching value: Cloudflare is the stronger Swiss-cheese case because a defense **existed
and was removed**, and because the passing test suite was measuring the wrong property.

---

## C. The shared deep structure (the transfer argument)

Both incidents are the same failure class:

> **Content or configuration shipped through a faster, less-gated path than code.**

- CrowdStrike: Rapid Response Content updated independently of sensor-code releases;
  Template Instances had no staged rollout (RCA finding 6).
- Cloudflare: WAF rules deployed globally by Quicksilver in seconds, while code went
  through DOG → PIG → Canary (their SOP permitted it).

In both, a validator ran and passed while checking the wrong property — arity against
the wrong contract at CrowdStrike, runtime instead of CPU at Cloudflare.

This is what students should be able to state at the end, and it is the reason the
Cloudflare exercise is an application of the method rather than a second war story.

---

## D. Build state

**COMPLETE.** The rebuilt 30-slide deck (6 + 6 + 8 + 5 + 5) is installed at
`course/lectures/.../2-4-Failure-Aware-Engineering.pptx`; the working copy
`2-4-redux-WIP.pptx` is byte-identical to it. Build scripts are in `scripts/`
(`phase_m2.py`, `phase_m3.py`, `phase_m45.py`, `phase_final.py`, `phase_fixes.py`,
`phase_fmea.py`, shared `buildlib.py`); each phase ends with the package-integrity
assert set below.
All 33 superseded slides (Dieselgate/VW, Instagram, the old theory section) were
deleted in the final pass with `sldId` + relationship both dropped.

| Movement | Slides | State |
|---|---|---|
| 1 — The incident | 1–6 | **built** (subtitle added to slide 1) |
| 2 — The defenses | 7–12 | **built** |
| 3 — The system | 13–20 | **built** |
| 4 — Learning | 21–25 (merged per edit 4) | **built** |
| 5 — Transfer | 26–30 (FMEA pass: predict → reveal → diagnose) | **built** |

Every slide carries 150–270-word speaker notes with the six required elements. No
animations were authored: the author's own Movement 1 slides carry none (python-pptx
does not author timing XML), so progressive reveals are staged in the notes instead
("ANIMATION-IN-SPEECH", cover-then-reveal).

### FMEA pass (261015) — the deck's new ending

Slides 26–30 now run predict-then-grade (net +2 slides, 28 → 30): slide 26 works FMEA
on the CrowdStrike case students already know; slide 27 gives Cloudflare's
ARCHITECTURE ONLY (all four facts drawn from §B: a WAF inspects incoming web
requests; new detection rules deploy without a software release; some rules are
regular expressions; rule changes propagate globally within seconds) plus a blank
worksheet — the 2019 incident is NOT revealed there; slide 28 is the former incident
slide moved from position 26 and reframed as the reveal ("Which failure modes did we
anticipate — and which did we miss?"); slide 29 is the diagnosis exercise plus one
closing question ("How should this incident change the FMEA for future WAF
releases?"); slide 30 is the unchanged closer. TIMING re-balanced: slides 21–25
compressed 11 → 5 minutes to fund the 6 FMEA minutes; the deck still sums to 75.

**Method references (author-supplied in the FMEA brief; instructor references in
speaker notes only — no student reading assigned):** IEC 60812:2018, *Failure modes
and effects analysis*; AIAG & VDA FMEA Handbook, 1st ed. (2019), which replaces the
Risk Priority Number with Action Priority. These are method citations, not incident
facts; the pass added no new CrowdStrike or Cloudflare claims beyond this file.

### Operative instruction set

The brief's appended dialogue supersedes its own earlier spec. Mandatory: (1)
component-level terminology throughout, never "human error", and not attributed to
Reason or Leveson; (2) STAMP strengthened around a named control inadequacy, with the
safety constraint stated on slide 16 and the sequence control-inadequacy → shared
vulnerability → candidate requirement → alternatives; (5) lander finished by
**insertion**, not rewrite. Strong recommendations: (3) slide 18 compares architectures,
not vendors; (4) learning section 6 → 5 slides, merging 23+24. Corrections: slide 13
uses expanding analytical boundaries over a dependency/control graph, not nested
organizational boxes; slide 26 matches evidence to the actual intervention (progressive
deployment is evidenced by rollout limits, detection latency, telemetry and halt
capability — *not* fault injection).

### Shape grammar available for reuse

`Content` layout: `Title`, `Lead` (prose), `Block`, `Card`, `Label`, `FooterBand`,
`RowCaption`, `LevelQuestion`, `GroupLabel`, `ColumnHeading`, `Qualification`,
`Slab`/`Hole` (Swiss cheese), `Doj`/`Sources`/`DojAccount` (quotation), `Table`,
`Connector`. `Section` layout: `Title`, `SectionLabel`, `Question`, `Rule`.

### Package-integrity rule, learned the hard way

Deleting a slide must drop the `sldId` **and** the relationship
(`prs.part.drop_rel(rId)`). Dropping only the `sldId` leaves the part reachable, and a
later save emits **duplicate zip entries** — python-pptx will still open the file.
Every build phase must assert zero duplicate entries, a clean zip CRC, and the expected
slide count before reporting success.
