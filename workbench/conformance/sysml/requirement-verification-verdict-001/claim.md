# sysml/requirement-verification-verdict-001

**MAGE construct** — the authored `requirements:` key (a map keyed by id, each value declaring
`statement` / `expressed_as` / `satisfied_when`) and the verification derived from it
(`src/engine/verification.ts`, reached through `verifySystemRequirements`).

**Registry row** — §35.4's `requirement, verification` row. `requirements:` is a top-level property
of `mage-model.schema.json`; the verification vocabulary is `VerificationStatus` in
`src/engine/verification.ts`.

**Standard concept** — a RequirementDefinition's required constraint, and the VerificationCase that
discharges it by returning a VerdictKind.

## Both halves, and why only one of them is authored

The row names two things and they are not symmetric, which is the 261004 ruling this fixture is
built on top of:

- **The requirement half is authored.** `requirements:` landed as a schema key, and a student
  writes one.
- **The verification half never will be.** A status is derived per read and stored nowhere (V18).
  A `verification:` key would record the answer and so change the system the answer was about.

The standard agrees on the shape, and says so in declared material rather than in prose:
`VerificationCase` declares `return verdict : VerdictKind :>> result`, so a verdict REDEFINES a
case's return value. It is the result of performing a verification, not an attribute of the thing
verified. There is nowhere in SysML v2 to store a verdict on a requirement either.

## The specification, quoted

SysML v2.0, OMG Document Number **formal/26-03-02** (March 2026), clause **8.3.21.8
RequirementDefinition** (page 357), Description:

> A `RequirementDefinition` is a `ConstraintDefinition` that defines a requirement used in the
> context of a specification as a constraint that a valid solution must satisfy.

Clause **8.3.24.3 VerificationCaseDefinition** (page 375), Description:

> A `VerificationCaseDefinition` is a `CaseDefinition` for the purpose of verification of the
> subject of the case against its requirements.

The decisive material is declared, not quoted prose. Systems Library, `Requirements.sysml` line 41 —
satisfaction as a computed return value:

> `return result = allTrue(assumptions()) implies allTrue(constraints())`

`VerificationCases.sysml` line 22 and lines 58-68 — the verdict's shape and its closed vocabulary:

> `return verdict : VerdictKind :>> result;`
>
> `enum def VerdictKind { pass; fail; inconclusive; error; }`

And lines 70-79, which is why the four values are not two:

> `return attribute verdict : VerdictKind = if isPassing? VerdictKind::pass else VerdictKind::fail;`

A Boolean maps onto `pass` or `fail` and onto nothing else, so `inconclusive` and `error` are
reachable only by something other than a two-valued check. `source.sysml` Part A quotes all of these
with their locations, together with the `SysML.xmi` constraints that tie the metaclasses to these
library elements.

## The ONE interpretation this fixture pins

> **A requirement declares an obligation and carries no verdict; the verdict is computed when
> someone asks, from the deciding query's answer and the declared discharging value. So the polarity
> lives in `satisfied_when` and nowhere else, the status moves when the system under design moves
> with no edit to the requirement or the query, and a question the models cannot settle is not a
> breach.**

Operationally, in `model.mage.yaml`: no subscription carries more than its subscriber permits, so
the positive breach query is `refuted` and the requirement verifies `satisfied`.

| state | breach query | verification | why |
|---|---|---|---|
| as shipped | `refuted` | `satisfied` | the breach was looked for and is not there |
| `satisfied_when` flipped to `holds` | `refuted` | `violated` | the polarity is the declaration's, so the same answer discharges or breaches |
| `analytics.permits` lowered to `public` | `holds` | `violated` | *the model changed, the query did not* |
| breach query asked in the `reachability` form | `unlicensed` | `inconclusive` | the models decline; a decline is not an accusation |
| `expressed_as` pointed at nothing | `refuted` | `error` | a statement about the declaration, never about the system |

The positive control is the second query: it asks the same `direct` form over the same relation and
the same two properties, in the direction that *is* satisfied, and answers `holds`. Without it the
`refuted` above is consistent with the comparison never being evaluated — an empty edge set, or a
property that failed to resolve, answers `refuted` and demonstrates nothing.

**What would be false if the construct meant something else.** Read the verification as a stored
field and the third row is impossible: the status could not move without someone rewriting it. Read
`satisfied_when` as documentation and the second row is impossible. Read the comparison as
two-valued — `outcome === satisfied_when ? satisfied : violated`, which is the defect
`src/engine/verification.ts` was written to prevent — and rows four and five both read `violated`,
reporting a breach when what happened is that the models declined or the declaration was unreadable.
The five rows are not jointly satisfiable by any of those readings. The conformance test drives all
five and asserts each lands where the table says.

## What this fixture does NOT establish

- **It does not establish the word-level mapping.** `VerdictKind` declares `pass`, `fail`,
  `inconclusive`, `error`; MAGE's `VerificationStatus` is `satisfied`, `violated`, `inconclusive`,
  `error`. Two spellings are identical and two differ, and **nothing normative says `satisfied`
  means `pass`.** What the artifacts decide is the SHAPE — four values, closed; the verdict a case's
  return rather than stored state; and `inconclusive` distinct from `fail`. The correspondence of
  the first two words is this project's spelling choice, recorded in `verification.ts` and not
  claimed here.
- **It does not establish the assumption half.** `RequirementConstraintCheck` declares
  `assumptions` beside `constraints`, and satisfaction is an implication over both. MAGE's
  requirement has three keys and none is an assumption, so a MAGE obligation is the degenerate case
  where `allTrue(assumptions())` is vacuously true. The fixture pins the degenerate case only.
- **It does not establish subrequirements, concerns, actors or stakeholders**, each a declared
  feature of `RequirementCheck` with no MAGE counterpart, nor `reqId`, nor the derived `text`.
- **It does not establish a verification CASE.** SysML's verdict is the return of a performance with
  a subject, an objective and a method; MAGE's verification is a function of a declaration and a
  query result. `source.sysml` Part B writes the case because the standard's shape requires one, and
  that case has no counterpart in `model.mage.yaml`.
- **It does not exercise `inconclusive`'s third cause.** `InconclusiveCause` has three arms —
  `bounded`, `unlicensed`, `not-evaluated`. The table's fourth row exercises `unlicensed`. The other
  two are held by `test/verification.test.ts` and are not claimed here.
- **It says nothing about the next construct, and nothing about completeness.** Per
  `DESIGN-v02-semantics-261004.md` §35.6: no count of passing fixtures establishes that the
  Workbench implements a SysML v2 subset.
