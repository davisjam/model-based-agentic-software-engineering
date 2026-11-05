# Budget audit — the six laboratories against the complexity maxima (261105)

Where each laboratory stands against [`HOUSE-STYLE.md`](HOUSE-STYLE.md) §2, measured rather than
estimated. It sizes the per-lab redesign: the labs furthest from the maxima need the most work, and
the three that already sit near a column need none on it.

**How each number was taken** — stated so a later audit can reproduce or refute it. Headless
Chromium at a 1440px viewport, counting the rendered DOM of each shipped `index.html`:

- **Adjustable parameters** — one per `.ctl` block, `.seg` chooser or bare `<select>`. A slider and
  its paired number box count once. **Primary** means outside every `<details>`; **reference** means
  inside one.
- **Output measurements** — named reported quantities: `dl.readout` terms, `.out` cells, `.outcome`
  cards, and the rows of a visible results table.
- **Visualizations** — `<canvas>` and chart `<svg>`, excluding the model figure.
- **Preset cards** — `.preset`. These are the "competing entry points" §6 caps at two or three.
- **Background words** — prose in `<main>` before the first control, excluding `<details>`: what a
  student reads before touching anything.

## The table

| Laboratory | Params (primary / +ref) | Outputs | Visualizations | Model figures | Preset cards | Background words |
|---|---|---|---|---|---|---|
| **Budget maximum** | **4–5** | **2–3** | **1** (+1 if necessary) | **1** | **2–3** | **400–600** |
| Release Factory | **7** / +18 | 3 readout + 6-row parameter table | **4** | **2** | **11** | **1,333** |
| Storage Cost | **9** | **8** | **2** | 1 | **5** | **2,210** |
| N+1 | 5 | **7** | **2** | **2** | **5** | **1,247** |
| Architecture Workbench | **8** | 3 outcome cards + a 3-row cost table + a 12-row sweep table | 1 | **2** | 0 | **2,493** |
| Performance Knee | 4 | **28** | **3** | **2** | **6** | **1,154** |
| ReDoS | 2 | 7 readout + 9 `.out` | **2** | **2** | 0 | **2,248** |

Bold marks a column over its maximum. Every laboratory is 2× to 4× over on background words, and
every one carries a second model figure where the budget allows one.

## Distance from the budget, worst first

1. **Release Factory** — over on five of six columns. Eleven preset cards against a maximum of
   three, 25 controls in total, four visualizations. The author's §11 names the reductions.
2. **Storage Cost** — nine controls, eight outputs, 2,210 background words. Over on every column.
3. **Architecture Workbench** — 2,493 background words, the longest of the six; eight controls; its
   results spread across three tables, one of them a twelve-row parameter sweep.
4. **ReDoS** — 2,248 background words, and the inverse problem on controls: it exposes **two**,
   which is under the suggestion rather than over it. See the divergences below.
5. **Performance Knee** — **28** output measurements across five readout blocks, nine times the
   maximum and the worst single number in this audit. Its controls, though, already sit at four.
6. **N+1** — closest to the budget. Five controls, seven outputs, 1,247 words.

The ranking is about *distance*, not difficulty. Performance Knee needs one column fixed heavily;
Release Factory needs five fixed moderately.

## Where the real labs diverge from §10's suggested parameters

§10 says plainly that its table lists *"**suggested** reductions, not claims that the existing
implementations already expose exactly these parameters."* They do not, and the differences are
reported here rather than resolved — bending a lab to match the table is the wrong move.

| Laboratory | §10 suggests | What the lab actually exposes (primary) | Divergence |
|---|---|---|---|
| Release Factory | arrival rate, test depth, admission, release strategy | those four, plus deployment batch size, an exact arrival-rate number, and simulation speed | Three extra, all three named for removal or relocation in §11. The suggestion and the lab agree. |
| Storage Cost | entity count, relationships, duplication, payload size | rooms, reservations per room, room metadata size, reservation size, identifier size, representation, physical-overhead estimate, a room selector, a rename action | Nine against four. "Duplication" is not a control — it is produced by the representation choice. Three size-in-bytes controls stand where the suggestion has one payload size. |
| N+1 | parent count, loading strategy, batch size | reservations, round-trip latency, distinct rooms, access strategy, database cache | **Batch size is not exposed.** Latency and a cache toggle are, and neither appears in the suggestion. |
| Architecture Workbench | change frequency, coupling, implementation cost, validation cost | scenario, teams owning booking policy, future changes over the horizon, what those changes are, independent release, implementation cost multiplier, validation and integration cost, architecture | **Coupling is not a control.** Architecture is the choice under study rather than a parameter, and scenario/teams/change-mix have no counterpart in the suggestion. |
| Performance Knee | arrival rate, service capacity, variability | arrival rate λ, service rate μ, service-time distribution, simulation speed | **The closest match of the six.** All three suggested parameters are present and named almost identically; simulation speed is the only extra, and §11 classes it as not an engineering parameter. |
| ReDoS | input length, regex/input family, matching strategy | longest input to try, time axis | **Under the suggestion, not over it.** Only input length is an engineering parameter; the time axis is a display control. The regex/input family and the matching strategy are not primary controls today. |

Two patterns worth carrying into the redesign. **Simulation speed is a control in three labs and an
engineering parameter in none** — §11 rules on it once and the ruling generalises. And **ReDoS is
the one lab whose primary interface is too small rather than too large**: the budget is a default,
and a laboratory that makes no relationship adjustable fails §10's rule just as a nine-control one
does.

## What this audit does not cover

Section order (§1), the figure's share of the row (§4), the separation of assumptions from
limitations (§5), the six-field procedure (§6) and the prose pathologies (§9) are per-lab reading
jobs, not counts. The numbers above size the work; they do not describe all of it.
