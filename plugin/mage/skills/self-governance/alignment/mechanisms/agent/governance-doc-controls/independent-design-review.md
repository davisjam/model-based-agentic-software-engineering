# Independent pre-implementation design review

**Intent** — Before any implementation phase, a **fresh reviewer that did not author the design**
re-derives it from the code, verifies its load-bearing claims empirically, and **rules on the open design
forks** — the reviewer wins conflicts, and implementation proceeds only on the ratified design (our
instance: every founding design earns one second, independent review pass before a line of code is
written).

| | |
|---|---|
| Summary | Before code, a fresh non-author re-derives the design and rules on its open forks. |
| Target | Agent · **Governance-doc mechanisms** |
| Form | `quality-gate` |
| Move | `package` — a constraint (implementation is blocked until the design is ratified) shipped with the reviewer that ratifies it |
| Model | — |
| Enforcement | **Soft·Hard** — a required review artifact per founding design hard-gates implementation from proceeding; the review's *content* — which claims to re-test, how to rule a fork — is judgment (soft). |

*Its place in the environment — a **variant / known-use** of **Validated Dispatch**, under **ADMIT ·
Admit or reject changes**: the pre-implementation bookend to the close-time
[Epic Definition-of-Done](epic-definition-of-done.md). Preserved here for its technical texture.*

## Motivation — the failure it kills

An author cannot audit their own premises. The load-bearing assumption feels obvious *because* they wrote
it, so it never gets re-tested — and a design carries assumptions the author will not challenge on their
own:

- **An unverified load-bearing claim.** "The tool emits an empty string for the default case" — asserted
  from memory, never checked against the tool, and wrong.
- **A stronger-model over-reach.** A design that reaches for a bigger abstraction than the problem needs,
  invisible to the author who reached for it.
- **A plausible-but-wrong assumption** that shapes the whole plan and survives to implementation because
  the person best placed to catch it is the one least able to see it.

The failure is *an author's design bias sliding unchecked into the code*. It recurs at every founding
design, and it is silent: the design reads clean, the plan looks sound, and the flaw only surfaces once the
implementation has already been built on it.

## Why it's not just a Definition-of-Done (or a code review)

Two neighbours check work, and both fire *after code exists*. This one fires before it.

- **Not just a Definition-of-Done.** The close-time gate verifies *built* work against its spec — it
  re-runs the pins and lints at HEAD once the code is written. This review runs when there is no code yet,
  on the *design*, and rules on the forks the design left open. The two are bookends of one effort: ratify
  the design going in, verify the build coming out.
- **Not just a code review.** A code review reads a *diff* — a change that already exists. This reviewer
  reads the *design* and re-derives it from the code it will touch, before the diff is written, so a wrong
  premise is caught before anything is built on it rather than after.
- **Not just the design template.** A section-template guarantees the design *has* an open-questions
  section and a second-order-dynamics block; it does not supply an independent mind to re-derive the design
  and overrule the author on those questions. The template is the shape; this is the reviewer.

The distinct axes are **gate timing** (pre-implementation design vs close-time built) and **reviewer
independence** (a fresh mind with no investment who re-derives from the code, vs the work's own owner
re-running its checks). A self-review structurally cannot replicate an independent one: the author's blind
spot is the review's whole subject.

## Mechanism

- **A fresh reviewer, not the author.** The review is performed by someone who did not write the design and
  has no stake in it. Independence is the mechanism; an author reviewing their own design reproduces the
  blind spot, not a check on it.
- **Re-derive from the code, not the prose.** The reviewer reconstructs the design from the system it will
  touch, rather than reading the author's write-up back. A claim the design asserts is confirmed against
  the artifact it describes, not taken on the author's word.
- **Verify load-bearing claims empirically.** Where the design rests on a fact — a tool's output
  vocabulary, an invariant's actual shape — the reviewer *runs the thing* and reads the real value. A
  guessed constant is caught here or not at all.
- **Rule on the open forks; the reviewer wins.** The design's unresolved questions are decided by the
  reviewer, whose ruling stands over the author's preference. Implementation proceeds only on the ratified
  design; a revise verdict folds back before any code is written.

## Prerequisites

- **A design phase that precedes implementation**, with the design written down and its open questions
  named — otherwise there is nothing to review before code.
- **A second reviewer of comparable strength** who did not author the design. The independence is
  load-bearing; a rubber-stamp by an under-powered or invested reviewer buys nothing.
- **A ruling that binds.** The review's verdict on a fork must actually gate implementation, or it degrades
  to advisory prose the author overrides at will.

## Consequences & costs

- **It doubles the design cost.** A full second pass by an independent mind is deliberately heavyweight,
  spent because a wrong premise baked into implementation is far more expensive to unwind than to catch.
- **Only founding / load-bearing designs earn it.** A mechanical single-file change or an obvious fix does
  not warrant an independent design review; forcing the gate onto trivia is ceremony the author routes
  around. Scope it to the designs whose flaws would compound.
- **Independence can be faked.** A reviewer who defers to the author, or who reads the prose instead of
  re-deriving from the code, files a review that looks done and catches nothing. The defense is a reviewer
  with real standing and the mandate to overrule.

## Known uses

- **The polarity-inversion catch.** A control classified inputs against an external tool's output
  vocabulary. Its positive-membership set was about to be spelled with a guessed empty-string token for the
  "default" case — a spelling that would have **inverted the control's polarity across the whole tree**
  (silently disabling a dropped-content detector) while passing every pin the design named: no crash, no
  lint failure, exit 0. The independent pre-implementation reviewer ran the tool, read the tool's *actual*
  default token, and mandated the correct spelling plus a common-case pin. A self-review, exercising only
  the tokens the author already believed in, would have stayed green over the inverted control.
- **Every founding design.** The practice is applied as standing procedure: each founding design gets one
  independent review pass, ruling on its open forks, before implementation begins.

## Related mechanisms

- **Counterpart** — [epic-definition-of-done](epic-definition-of-done.md): the two ends of one effort. This
  ratifies the *design* before code exists; the Definition-of-Done verifies the *built work* at close. One
  admits the plan; the other admits the result. Named axis: *pre-implementation design vs close-time built*.
- **Enabler** — [epic-and-design-templates](epic-and-design-templates.md): the template makes *open
  questions* and *second-order dynamics* required sections of the design, so the forks this reviewer rules
  on are already written down and in view when the review runs.
- *See also (family)* — [self-governance](self-governance.md): both are design-time governance moves — one
  converts a *recurring failure* into a control; this catches an *author's bias* before it ships. Sibling
  disciplines of "govern the input, not only the output."
