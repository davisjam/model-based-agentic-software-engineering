# engineering.md — the engineering-discourse register (Diátaxis)

This is an **agent-facing** style doc — a resource of the `self-communicate` skill, not a catalogue entry.
It is not rendered to HTML or served.

It gives a way to choose a section's *shape* from the reader's purpose, using
[Diátaxis](https://diataxis.fr/). [`voice.md`](voice.md) supplies the register; engineering books and
sustained explanations also use [`textbook.md`](textbook.md).

Match the structure to the reader's work. A reader hunting one fact may need a list or table; a reader
learning an argument may need connected paragraphs, examples, and transitions. Plain language serves
both. Neither fast lookup nor minimum length is the universal objective.

## Adopt Diátaxis — one framework, four modes

Before inventing a house doc taxonomy, adopt the best-in-class one. [Diátaxis](https://diataxis.fr/) is the
canonical framework for technical documentation. It splits every doc into one of four modes by the reader's
need, and each mode has a distinct purpose and method:

- **Tutorial** — a lesson. Takes a beginner through a first success by the hand. Study-oriented, practical.
- **How-to guide** — a recipe. Gets a competent reader through one real task. Work-oriented, practical.
- **Reference** — a map. Describes the machinery precisely for lookup. Work-oriented, theoretical.
- **Explanation** — a discussion. Illuminates the *why* behind a design. Study-oriented, theoretical.

Diátaxis organizes the four on two axes: **acquisition vs. application** (am I studying, or working?) and
**action vs. cognition** (am I doing, or understanding?). Tutorial and how-to are both practical (doing);
reference and explanation are both theoretical (understanding). The failure mode Diátaxis prevents is the
**mixed-mode doc** — a reference that keeps pausing to motivate, a tutorial that detours into theory. Each
mode serves its reader best when it does *one* job. Pick the mode first, then write.

## The repo's doc kinds mapped to modes

Each doc kind in this repo lands in one or two modes. Write it to the method of its mode, and use the
characteristic moves that mode sanctions.

| Doc kind | Mode(s) | Method | Characteristic moves |
|---|---|---|---|
| **Mechanism entry** (`<role>/<family>/*.md`) | Reference + Explanation | Define the pattern precisely (the card, the Intent), then walk the *why* (Motivation, "Why it's not just X") | Reference: term · genus · differentia, no motivation. Explanation: earn the claim by walking the failure it kills, not by asserting it. |
| **Design doc** (`docs/design/*`) | Explanation | Walk the reader from the problem to the chosen shape; name the alternatives you rejected and why | State the design tension first; give the second-order dynamics; concede the tradeoff in the same breath as the choice. |
| **Engineering-book mainline** | Explanation | Develop the reasoning a technically capable engineer needs to understand and apply the argument | Use mechanisms, examples, and transitions; preserve useful intuition and repetition; increase density as vocabulary becomes familiar. See [`textbook.md`](textbook.md). |
| **A governing project rule** (a CLAUDE-style rule) | Reference (imperative) | State the invariant as a command, then its enforcement and its escape hatch | Imperative mood ("Route all PDF I/O through the typed model"); one rule per line; name the lint that enforces it; give the bypass. |
| **A code comment** | Explanation (in miniature) | Explain *why*, never *what* — the code already says what | A `WHY:` note on a non-obvious invariant or a footgun. If it restates the line below it, delete it. |
| **A runbook** (`docs/*-playbook.md`, ops recovery) | How-to | Numbered imperative steps against a real goal, in order | Name the cost of each step; state the honest limit before the remedy; show the failing symptom, then command the fix. |
| **The quick-start** (`quick-start.md`) | Tutorial | Take a first-time reader to one concrete success; explain each line as it arrives | "In this guide, we'll…"; a worked example up front; reassure ("don't worry if this looks complex"); a visible win at the end. |

A mechanism entry separates its reference card from its explanation so each supports its reader's
task. A textbook mainline can introduce a definition or work through an example within an explanation
when that step advances the reasoning. Use separate reference sections or optional insets when readers
need lookup material or a deeper background treatment.

## Each mode, grounded in a live Apache example

The engineering register is drawn from best-in-class third-party docs — Apache Software Foundation
projects. Each mode has an exemplar below (project · Diátaxis mode), so the abstraction is grounded in a
real doc a reader can open. These are *third-party* docs, not the house author's voice — they teach the
register, not personal idiom. [`voice.md`](voice.md) carries the fuller verbatim set with the
rule each teaches.

- **Reference** — Flink · *glossary*. A definition is one precise sentence: the term, then its genus and
  differentia. *"An event is a statement about a change of the state of the domain modelled by the
  application."* No motivation, no example — reference prose defines, it does not persuade.
- **Explanation** — Kafka · *design*. Name the reader's likely objection, then dismantle it with a
  mechanism. *"Don't fear the filesystem!"* surfaces the doubt; the O(1)/decoupled-from-size reasoning
  answers it on the merits. Explanation earns a claim by walking the *why*.
- **How-to** — httpd · *security tips*. Give the directive, the concrete setting, and the tradeoff in one
  beat. *"The `TimeOut` directive should be lowered on sites subject to DoS attacks … [but] setting it to a
  low value introduces problems with long running CGI scripts."* A how-to step is not done until it names
  what the change *costs*.
- **Tutorial** — Airflow · *fundamentals tutorial* (and Kafka · *quickstart*, Maven · *getting started*).
  Welcome the reader, promise one concrete outcome, then walk a worked example line by line. *"In this
  tutorial, we'll guide you through the essential concepts … Don't worry if this sounds a bit complex;
  we'll break it down step by step."* The reassurance and the running example are the tutorial's engine.

## How this register composes with the rest of the style kit

- **[`voice.md`](voice.md)** — the target voice. This file gives the doc's *shape* (mode);
  VOICE gives its *sensibility* (plain diction, concrete anchor before abstract claim, claim paired with
  caveat). Write in the mode's shape, in the house voice.
- **[`rhetoric.md`](rhetoric.md)** — the device toolkit. Each mode favors different figures:
  reference leans on precise definition and parallelism; explanation on hypophora and procatalepsis (raise
  the objection, answer it); how-to on plain imperatives; tutorial on direct address. Reach for the figure
  that fits the mode, and vary it.
- **[`lexicon.md`](lexicon.md)** — the house vocabulary. Diátaxis fixes the *shape* of a doc but
  says nothing about *which term* to prefer. The lexicon does: name the established pattern ("strangler
  fig", not "gradual replacement"), so a reader can look it up. This register serves the lexicon and the
  lexicon serves this register.
- **[`../drawing/diagrams.md`](../drawing/diagrams.md)** — the visualization leg. A diagram type suits a mode: a
  reference wants a component or class diagram; an explanation wants a sequence or state diagram that walks
  the dynamics; a how-to wants a flowchart of the procedure; a tutorial wants the simplest possible picture.
  Pick the diagram to match the mode, per that file.

## Running the register

1. **Name the mode first.** Ask the reader's need — learning, doing, looking up, or understanding — and
   pick the one mode that serves it. If a doc seems to need two, it is probably two docs, or a two-section
   doc with the modes kept apart.
2. **Write to the mode's method.** Reference defines; explanation walks the why; how-to commands the steps
   and names their cost; tutorial takes one beginner to one success.
3. **Voice it in the house register.** Apply [`voice.md`](voice.md) and vary devices per
   [`rhetoric.md`](rhetoric.md). Then audit against [`audit.md`](audit.md).
