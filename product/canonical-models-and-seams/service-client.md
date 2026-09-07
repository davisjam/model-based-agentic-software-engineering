# ServiceClient (typed cross-service seam)

**Intent** — Route all cross-service HTTP through one typed client whose `BinaryIO` signature makes the
file-path-over-wire bug class *impossible at the type level*; direct `requests.post` against another
service is banned.

| | |
|---|---|
| Summary | A BinaryIO seam makes file-path-over-wire impossible. |
| Target | Product · **Canonical models & seams** |
| Form | `bounded-service` |
| Move | `constraint` — prevents the error by construction |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking* — the sole-seam lint bans direct cross-service `requests.post`; the `BinaryIO` type makes the bug unrepresentable |

*Its place in the environment — a **variant / known-use** of **One Door Enforced**, under **CONSTRAIN · Constrain where and how agents act**. Preserved here for its technical texture.*

## Motivation — the failure it kills

Cross-service calls that pass a **file path over the wire** (instead of the file's *bytes*) are a
recurring bug: the receiving service, in a different container, cannot open a path from the sender's
filesystem. Ad hoc `requests.post` at each call site lets this exact type-confusion recur wherever
someone reaches for the raw HTTP library.

## Why it's not just "use requests.post carefully" (or "document the convention")

The file-path-over-wire bug is a **type confusion**: a path `str` where bytes were meant. A documented
convention nearly holds — until the next caller passes a path again, and the receiver in another
container cannot open it. Making the signature refuse the path removes the convention's reliance on
memory: `ServiceClient.post_file` takes a **`BinaryIO`**, so passing a path is a **type error**, not a
runtime bug, and the entire bug class is *unrepresentable*. The IPC seam is the lint-enforced *sole*
cross-service-HTTP surface. The `BinaryIO` signature **is** the enforcement: types-reveal-architecture
applied to a service boundary.

## Mechanism

`ServiceClient.post_file(BinaryIO, …)` is the one way to make a cross-service call; the IPC module is
the sole cross-service-HTTP seam, lint-enforced; direct `requests.post` against another service URL is
banned. The signature refusing a `str` path closes the bug class.

## Prerequisites

- **A typed client whose signature encodes the invariant** (`BinaryIO`, not `str`): the type *is* the
  constraint.
- **A sole-seam lint** banning the raw HTTP call to other services.
- **Migration** of existing cross-service calls onto the client.

## Consequences & costs

- **All cross-service calls funnel through one client** — a coupling point that must cover every HTTP
  shape callers need.
- **Slightly more ceremony.** Callers must open a file handle rather than pass a path string (the
  point, but it is friction).
- **The seam is a bottleneck for evolution.** New call patterns require extending the one client.

## Known uses

- `ServiceClient.post_file(BinaryIO)`: the typed cross-service seam.
- The IPC sole-seam lint (the one cross-service-HTTP surface for the web tier).
- The file-path-over-wire bug class the `BinaryIO` signature eliminates.

## Related mechanisms

- *See also (sibling)* — [raw-redis-seam](raw-redis-seam.md): the same `bounded-service` pattern for the
  Redis boundary: one lint-enforced seam owning a whole class of dangerous raw calls.
- **Counterpart** — the sole-seam lint (hard) that bans the raw `requests.post` alternative.
