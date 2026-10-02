# Phase D — YAML adapter + transaction engine

Branch `wb-yamltx-261002`, based on `be16daee`. `tsc --noEmit` clean; `npm test` 49/49 (11 were
already there: `ir.test.ts`, `parity.test.ts`). `validate.py --self-test` still PASS and
`examples/docable.mage.yaml` still clean. Nothing outside `src/yaml/**`, `src/transaction/**`,
`test/yaml.test.ts`, `test/transaction.test.ts` and this file was touched.

## What landed

### `src/yaml/`

| file | what |
|---|---|
| `coercion.ts` | `coercionHazard(value)` — the YAML 1.1 implicit-typing hazard a plain write would meet, as a named rule, not a boolean |
| `document.ts` | `MageDocument` — load, derive the IR, hash, typed edits, serialize |

**The write path is the CST, not `Document.toString`.** Measured on `examples/docable.mage.yaml`
(309 lines, 38 comment lines): no option set makes `Document.toString` byte-exact, because the
`Document` model does not retain where a folded scalar was folded or which column a trailing comment
sat in. `lineWidth: 0` un-wraps `description: >` blocks onto one line; the default re-wraps plain
scalars and collapses `entity: remediation          # …` to a single space. CST token passthrough is
byte-exact. So three fidelities, monotone and **reported rather than hidden**:

- `verbatim` — nothing edited. Byte-identical, always.
- `surgical` — every edit replaced an existing scalar via `CST.setScalarValue`. Byte-identical
  outside the replaced scalars. Covers `set-label` and `set-property`-over-an-existing-value, the
  two ops an agent issues most.
- `reserialized` — something structural (a key or sequence item added/removed). Comments and key
  order survive; source *layout* normalizes.

A commit re-parses its own output, so the downgrade does not compound across revisions.

### `src/transaction/`

| file | what |
|---|---|
| `types.ts` | the 13-op closed union, `Transaction`, `Rejection`, `Revision`, `TransactionResult` |
| `parse.ts` | stage 1: `unknown` → typed `Transaction`, or located `SCHEMA` findings |
| `references.ts` | who still points at an id — serves both halves of the `cascade` contract |
| `apply-op.ts` | stage 3: one op → edits on a candidate document |
| `engine.ts` | the pipeline, plus undo/redo |

Pipeline exactly as specified: **parse → verify base → apply to a candidate → validate the ENTIRE
resulting system → commit.** Atomicity is structural, not defended: stage 3 clones the live
document, every edit lands on the clone, and the clone is adopted only at stage 5 — so there is no
rollback path to get wrong. `MageDocument.seal()` makes it enforced rather than intended (a sealed
document throws on edit, and every revision in the history is sealed).

Undo/redo is a stack of `Revision`s. `undo()` restores the previous text **byte-exactly**, not
merely semantically.

## Two defects found, both fixed here

**1. The writer would have emitted values that reload as a different type.** The npm `yaml` package
implements YAML 1.2 core, so it writes the string `"off"` as bare `off` and reads it back as `"off"`
quite happily. But `workbench/validate.py` loads with `yaml.safe_load` — PyYAML, YAML **1.1** —
where `off` is boolean `false`. Measured on PyYAML 6: `off on yes NO Null ~ ""` → bool/None;
`017 0x1f 0b101 1_000 1:30` → int (octal, hex, binary, underscore, sexagesimal); `.inf .nan 1.5` →
float; `2026-10-02` → a date, which JSON cannot represent. So a workbench write of the string
`"off"` would have produced a file **this repo's own validator reads as a boolean**.
`CST.setScalarValue` is worse: it writes the string `"true"` as bare `true`, which even 1.2 re-types.
The writer now double-quotes every value a 1.1 loader would re-type, nested values included.
Pinned by `a value a YAML 1.1 loader would re-type is written quoted, and reloads as itself` (33
values) and `the coercion guard reaches values nested inside a structural write`.

**2. No V-rule checks a guard's value against the referenced machine's state set.** A guard
`requires: {worker.state: held}` names another machine's control state *by value*. V10 checks
transition endpoints; nothing checks guard values. So `delete-state worker/held` would have passed
whole-system validation and left a guard that can never hold — a model that is **wrong rather than
invalid**, which is the worse failure because nothing reports it. `stateReferences` reports that
reference and marks it `blocked`: the delete is refused even with `cascade`, because dropping the
guard and dropping the transition assert different things and only the author can say which.
Pinned by `delete-state refuses when a guard elsewhere tests it, even with cascade`.

Worth considering as a V-rule (V26?) in `SEMANTICS.md` + `rules.ts` + `validate.py` so it is caught
on load and not only on delete. Flagged, not written — those files are not mine.

## Tests

`test/yaml.test.ts` (11)

| test | pins |
|---|---|
| `a commented file round-trips byte-for-byte` | **the requirement**, plus a guard against passing vacuously on a comment-free example |
| `every comment survives a structural write` | 7 load-bearing comments at different nesting depths, and key order |
| `a scalar rewrite is byte-exact outside the one scalar it rewrote` | one-line diff |
| `fidelity downgrades monotonically and never climbs back` | a later surgical edit cannot re-claim byte-exactness |
| `a value a YAML 1.1 loader would re-type is written quoted, and reloads as itself` | 33 hazardous values, each through a full write/reload |
| `the coercion guard reaches values nested inside a structural write` | guards and effects inside an added transition |
| `coercionHazard names which rule bites, and leaves ordinary strings alone` | 8 hazards by rule + 15 real model strings NOT over-quoted |
| `a syntax error is reported as a finding, not thrown and not swallowed` | load failure is a normal outcome |
| `two documents in one file is refused` | a model system is exactly one |
| `the hash is over the IR, so a cosmetic edit does not invalidate a pending transaction` | both directions |
| `a sealed document refuses edits` | the one aliasing bug this design could have |

`test/transaction.test.ts` (27). Every rejection path goes through a helper that asserts the
document is **byte-identical** afterwards, the hash is unmoved, and the rejection carries both a
human sentence and structured findings (FR-A11Y-2).

| test | pins |
|---|---|
| `the op table and the schema's op list cannot drift apart` | reads the op names out of `mage-transaction.schema.json` and compares (rule #42 — no snapshot copy) |
| `there is no rename op, and asking for one says why` | V2, and the message routes to `set-label` / delete-plus-add |
| `malformed input is rejected with a located SCHEMA finding, never thrown` | 12 shapes incl. `semantics.atomic: false` |
| `a bare transaction body is accepted` | the envelope is clerical |
| `a base mismatch is a loud rejection, never a merge` | + `a base computed before someone else's commit is refused` |
| `the base is the IR hash, so a cosmetic edit does not invalidate a pending transaction` | the whole reason `base` is not a file hash |
| `one failing op discards the whole transaction, including the ops that worked` | atomicity |
| `later ops see earlier ops` | delete-plus-add substitutes for the rename V2 forbids |
| `add-state writes the empty-value idiom the file already uses` | `draining:`, not `draining: null` |
| `delete-transition refuses an ambiguous match and asks for an index` | nondeterminism makes duplicates legal |
| `set-property keeps a declared domain on a value-only write, and is byte-local` | V20 stays typed; one-line diff |
| `set-label refuses an id that names two namespaces rather than picking one` | see schema request below |
| `delete-entity without cascade fails and names every site` | 3 sites by path |
| `delete-entity with cascade removes every reference, and the result still validates` | and leaves siblings alone |
| `cascade drops a machine's optional entity correspondence` | optional per §2, so mechanical |
| `delete-state refuses the initial state even with cascade` | V9 |
| `delete-state refuses when a guard elsewhere tests it, even with cascade` | **defect 2** |
| `an op that breaks a reference in a DIFFERENT part of the system is refused` | whole-system validation earns its keep |
| `an id a YAML loader would coerce is refused, at whichever stage catches it first` | `off`/`yes`/`null` → V25 at stage 4; `42`/`0x1f` → `SCHEMA` at stage 1 |
| `a purpose that declares an omission the model contradicts is refused` | V24 |
| `a transaction may still be applied to a model that was already invalid` | see refinement below |
| `a commit advances the hash, keeps the comments, and records its rationale` | |
| `undo and redo walk a stack of systems and restore bytes exactly` | |
| `committing after an undo clears the redo future` | |
| `an undone revision's document is unreachable for mutation` | |
| `undo does not resurrect a stale result: the hash travels with the system` | |

## Changes needed to orchestrator-owned files

**1. `mage-transaction.schema.json` — `base` pattern contradicts the landed kernel.** The schema
says `"pattern": "^sha256:[0-9a-f]{64}$"`, but `src/ir/hash.ts` emits `fnv1a64:<16 hex>` and
documents why (SubtleCrypto is async and unavailable on insecure origins; this is a concurrency
token, not a security boundary). The kernel is landed and is what computes the base, so it wins.
Exact edit, line 18:

```json
          "pattern": "^(fnv1a64|sha256):[0-9a-f]{16,64}$"
```

and in the `description` on line 16, after "never of the file bytes.":

> The algorithm is named in the prefix so the value cannot be mistaken for a cryptographic claim;
> v0.1 emits `fnv1a64:` (see `src/ir/hash.ts`).

`parse.ts` currently accepts the general `^[a-z][a-z0-9]*:[0-9a-f]+$` shape so the two are not in
conflict today.

**2. `mage-transaction.schema.json` — `set-label` needs a `scope`.** Entities and machines are
separate namespaces (SEMANTICS §2, "machines are not entities"), so one id can legally name both
and `{"op": "set-label", "id": "thing"}` is then genuinely ambiguous. `set-purpose` already solves
this with `"scope": {"enum": ["model", "machine"]}`. Suggested edit to `$defs/opSetLabel`
properties:

```json
        "scope": {
          "description": "Which namespace 'id' addresses. Optional; required only when the id names more than one.",
          "enum": ["entity", "model", "machine"]
        }
```

Until then the engine refuses the ambiguous case with a message saying so, which is the honest
behaviour but a worse one than being able to express the intent. Low urgency —
`examples/docable.mage.yaml` has no collision.

**3. `SEMANTICS.md` + `src/validator/rules.ts` + `validate.py` — a rule for guard-value resolution**
(defect 2). A guard `ref: "<machine>.state"` whose `value` is not a declared state of that machine
should be a finding on load. Candidate text: *"V26 — a guard that tests another machine's control
state MUST name a declared state of that machine. A guard on an undeclared state can never hold,
and a model that is wrong is worse than one that is invalid."* I have the refusal at delete time;
load time is the better place and needs the three-way parity edit I cannot make.

**4. `workbench/.gitignore` — `node_modules/` does not match the symlink.** In the worktree
`workbench/node_modules` is a symlink, and the trailing-slash pattern does not match it, so it shows
up as untracked on every `git status`. Change `node_modules/` to `node_modules`.

## Where PLAN.md §D was underspecified

**"apply to a temporary IR" is not quite what has to happen, and the difference matters.** The IR is
`readonly` and `canonicalize` is one-way — there is no IR → YAML direction, by design. So ops cannot
be applied to an IR and then serialized. What the engine does instead: apply to a cloned **document**,
canonicalize *that* to get the candidate IR, validate the candidate IR, and adopt the document only
if it passes. Every guarantee §D asks for holds, and the editable artifact stays the one that carries
the comments. Suggested rewording for §3 item 2: *"apply to a cloned document → canonicalize it to a
candidate IR → validate the ENTIRE candidate system → adopt."*

**"validate the ENTIRE resulting system" needs one qualifier or a broken file becomes uneditable.**
Taken literally, a file that is already invalid on load — which is exactly when a user needs
transactions to work — rejects every transaction forever, because validation keeps reporting the
pre-existing findings. The engine therefore rejects on findings the baseline did **not** already
have. Any *new* finding anywhere still refuses, so "an op can break a reference elsewhere" is fully
preserved; what changes is only that inherited breakage does not block repair. `baselineFindings` is
public on the engine so the UI can show "3 pre-existing problems" separately from "this change would
add 1". Pinned by `a transaction may still be applied to a model that was already invalid`.

**Everything else in §D held.** Fixed order, atomicity, loud base mismatch, no rename op, cascade
semantics, and undo/redo-as-systems all landed as written, and the stack-of-systems call was the
right one — `undo()` restoring bytes exactly is a one-line assertion that would have been a
research project against inverse ops (the inverse of a cascade needs the pre-state the cascade
destroyed).

## Not done

- **No `window.mage` / services surface.** Phase F owns it. `TransactionEngine` is the object to
  hand it: one instance, `apply(unknown)` for agents and UI alike, so "no agent-specific model copy"
  stays structural.
- **No JSON serialization.** SEMANTICS §10 says JSON is an equivalent serialization; nothing here
  reads or writes it. Trivial on top of `MageDocument` (`JSON.parse` → `canonicalize`), but it has
  no comment-preservation problem to solve and nothing needs it yet.
- **No hypothesis branches.** `transaction.target` is parsed and carried but the engine holds one
  timeline; a branch is a second `TransactionEngine` over the same text, which is the cheap shape
  given revisions are whole systems. Phase F/G should confirm that is the interface they want before
  I build a branch registry nobody calls.
- **`reserialized` writes reflow long plain scalars and lose trailing-comment columns.** Comments and
  key order survive, which is what §10 requires; byte-exactness after a structural edit would need
  CST token construction for map and sequence insertion. Real work, and I would want a reason beyond
  tidiness before spending it.
