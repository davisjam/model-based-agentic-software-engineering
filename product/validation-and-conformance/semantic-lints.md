# The Audit-to-Lint mechanism (blocking semantic lints)

**Intent** — A fleet of blocking semantic lints over the tool's *own source* (banned APIs, silent-catch
bans, `Console.WriteLine`-in-prod, typed-seam violations) that fail the build on domain-invariant
violations the compiler and review can't catch.

| | |
|---|---|
| Summary | The blocking semantic-lint fleet over the tool's own source. |
| Target | Product · **Validation & conformance** |
| Form | `validation` |
| Move | `sensor` — detects the error after the fact |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — each BLOCKING lint fails the build; escape is a scoped `noqa` with a reason |

> **This entry represents the fleet, not each lint.** Per the README scope note, the ~500+ individual
> custom lints are a *magnitude reported in prose*; this is the one entry for the pattern.

*Its place in the environment — the **canonical mechanism** for **CONSTRAIN · Constrain where and how agents act**.*

## Motivation — the failure it kills

The codebase carries hundreds of structural invariants: no silent `catch`, no banned API in prod, every
cross-boundary call through its seam. Code review cannot hold hundreds of invariants in a reviewer's
head, and the compiler enforces none of them (a silent catch, a banned API, a raw `Console.WriteLine`
all compile fine). The failure is *structural drift that quietly reintroduces a defect class*, and it
recurs continuously as code is written.

One of these lints once turned on its author. A regex meant to scan source for a
banned pattern backtracked catastrophically on a real input and hung the deploy
gate — the checker that guards the fleet became the thing that stalled it. The
sting was personal: the author's doctoral research was on this precise failure,
regular-expression denial of service, the class where a crafted string drives an
innocent-looking pattern into exponential work. Knowing the failure cold did not
stop shipping it. That is the lesson the entry carries. The cure was not a better
regex or a lint that flags the bad one; it was to delete the surface — reach for
the parser, and let the whole class go. The mechanism is the fix; this instance is
why the fix reads the way it does.

## Why it's not just "code review" (or "rely on the compiler")

The compiler checks *types*, not *domain invariants*: a `catch {}` that swallows an error, a
`Console.WriteLine` in prod, a banned API call all type-check. Review misses them because they look
normal. What is left to enforce the domain rule the type system can't express? A semantic lint. It
**encodes the invariant** and fails the build, doing mechanically what review does by attention and
the compiler doesn't do at all. This is the "move audits to lints" and "enforce structure with analysis
when available" discipline made concrete.

## Mechanism

The lint fleet runs at commit and deploy. Each lint declares, in a self-describing header, which
components it scopes to, its severity, and a verb-of-checking docstring (the lint-declaration
discipline); BLOCKING ones fail the build, AUDIT-ONLY ones surface. A legitimate exception escapes
through a scoped, reason-bearing suppression comment on the offending line. The fleet sits atop a
maxed-out commodity floor (Roslyn analysis, pyright strict, ruff) rather than replacing it.

**Adopt it, a concrete, runnable [governance-lint example](../../downloads/governance-lint-example.py)**:
the *real* "regex-against-structured-formats" lint (an AST scan that flags a regex parsing HTML/YAML/JSON
where a parser belongs), made self-contained. It shows the whole shape: the self-describing declaration
block, `find_violations` → emit → exit-code, the `noqa` escape, and the AUDIT-ONLY→BLOCKING migration. Its
header carries the field-note story (a regex-based lint that hung the deploy gate with catastrophic
backtracking; the fix was *eliminate the surface*, not lint the bug class). Copy the shape; change the check.

## Prerequisites

- **A lint framework** with per-lint scope + severity declaration.
- **The invariants made mechanically detectable** — a rule you can't express as a check can't join.
- **A runner wired into the gates**, and a scoped escape hatch for legitimate exceptions.

## Consequences & costs

- **A large maintenance surface.** Hundreds of lints are hundreds of things to keep current: the
  "500+ lints" magnitude the support-apparatus ratio counts.
- **False positives need escapes.** A too-strict lint blocks legitimate code until a `noqa` is added,
  a small, audited hole.
- **Floor vs fleet.** The custom fleet only earns its keep atop the commodity analysis floor; without
  that floor the grade rests on the wrong thing.

## Known uses

- `lint-banned-apis`, `no-silent-catch`, `console-singleton-mutation`, the typed-seam ban-lints.
- The lint-declaration discipline (each lint declares its scope, severity, and a verb-of-checking
  docstring); the scoped `noqa` escape convention.

## Related mechanisms

- *See also (sibling)* — [coherence-lints](coherence-lints.md): relational lints across sources;
  [content-validator](content-validator.md) / [standards-rule-engine](standards-rule-engine.md): the
  other artifact validators.
- **Counterpart** — the ban-lints in [canonical-models-and-seams](../canonical-models-and-seams/pdf-model.md)
  are members of this fleet doing the "hold a construction seam in place" job.
