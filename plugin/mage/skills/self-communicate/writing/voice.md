# voice.md — the house author's voice

This is an **agent-facing** style doc — a resource of the `self-communicate` skill, not a catalogue entry.
It is not rendered to HTML or served. It exists to give the writer a concrete
target when matching prose to the house author's actual voice — Prof. James Davis
(davisjam), whose own published writing supplies the exemplars below.

Read this alongside [`rhetoric.md`](rhetoric.md) (the device toolkit) and the
house-rules writing-style discipline. The rhetoric file says *what tools exist*;
this file says *how the author actually swings them*.

## Three registers — and when to reach for each

The catalogue draws on three registers. Two are the house author's own voice; the third is the target
register for engineer-facing documentation, drawn from best-in-class third-party docs. The exemplars
below are grouped by register.

- **Engineering / documentation** (best-in-class third-party docs — Apache projects). Orient before
  detail, lead with a one-sentence "what it is", plain present-tense active-voice system description,
  imperative how-to steps, precise term definitions, explicit "when NOT to use this" cautions. **This is
  the register to aim for in almost all repo prose** — mechanism entries, design docs, CLAUDE rules, code
  comments, runbooks. It is a *third-party* register, NOT the author's own voice; the exemplars are labeled
  as such.
- **Discursive / argumentative** (his Medium essays). First person, direct address, extended analogy, a
  claim developed by scaffolding. Reach for it *only* where you are genuinely *persuading* — a
  **Motivation** paragraph, a design-rationale aside — walking the reader from a shared start to a
  conclusion. It is the essay register; don't let it leak into reference or how-to prose.
- **Technical / academic** (his co-authored papers). Terse, third-person or "we", claim-scope-evidence in
  tight sequence, limitations stated flat. Reach for it in an **Intent** line, a metadata summary, a "Why
  it's not just X" contrast, or a **Known uses** — anywhere a claim needs a bounded, quantified statement.

**Default to the engineering/documentation register.** Most catalogue entries want it for the spine
(Intent, card, mechanism, Known uses), the technical register for a scoped claim or contrast, and a touch
of the discursive one only where a Motivation earns persuasion. The essay and academic registers are for
their own contexts — an essay, a paper — not for a runbook or a reference entry. The technical and
engineering exemplars teach a *register*, not personal idiom (the papers are multi-author; the docs are
third-party) — how a claim is framed and scoped, how a system is described, how a caution is stated.

## The voice in six characteristics

- **Scaffolded argument, not a flat list of claims.** He states a simplified model first, then complicates
  it with named distinctions. He builds a taxonomy and defends it — essential vs. accidental, engineering
  vs. conceptual novelty — rather than asserting a conclusion and stopping. The reader is walked up the
  structure, not handed the top.
- **Plain diction carrying technical weight.** Everyday words ("pickle", "elbow scratch", "silver bullet",
  "just-so story") sit next to precise technical terms (BMC, loop unwinding, StructTreeRoot) with no
  register clash and no condescension. He reaches for the common word when it will carry the idea, and
  the exact word when it won't.
- **Concrete anchor before abstract claim.** A specific number, a named event, a worked example arrives
  *before* the generalization it supports — 72 minutes, 20 lines of code, the CrowdStrike outage, the
  Ship of Theseus. The abstraction is earned by the instance, never floated on its own.
- **Direct address and rhetorical questions guide the reader's reasoning.** "Repeat after me." "What to
  do, what to do?" "Does it really matter which transcription service you use?" He asks the question the
  reader is forming and answers it, rather than lecturing past it.
- **Confidence paired with an explicit caveat — never hedging, never absolutism.** "YES, with an
  important caveat." "But Unit Proofs are not a silver bullet." He acknowledges the counterexample and the
  limit in the same breath as the claim, then moves on. He does not perform uncertainty, and he does not
  over-claim.
- **Claim → scope → evidence, in tight sequence (technical register).** The papers reveal a move the
  essays soften: a contribution is stated, immediately bounded, then backed with a number, all in a
  sentence or two. "reduces false positive rates (from 80% to 28%), at the cost of an additional 14s
  average latency." The gap being filled is named flatly first ("gaps remain: high false-positive rates…";
  "However, we lack…"), and limitations are stated without apology or hedge. This is the register for an
  Intent line and a "Why it's not just X" contrast.

His punctuation leans on the em-dash for a qualifying aside or a mid-sentence pivot, and on quotation
marks to isolate a phrase he is about to interrogate ("just engineering", "no one has published this
before"). The em-dash is a *tool he varies with*, not a reflex — note in the exemplars how often a
period, a colon, or a plain comma does the work instead. He avoids flowery flourish, passive-voice
drift, performative hedging, and abstraction untethered from an example.

## State the abstraction once. Vary the evidence.

The theory is canonical. Examples are supporting evidence. As the book progresses, readers should
encounter the same abstraction instantiated in different systems rather than repeatedly explained through
the same system. Familiarity should come from repeated concepts, not repeated anecdotes.

This captures the identity of the finished book, not just a structural convention. The manuscript is no
longer "a book about DocAble." It is a textbook whose claims are substantiated by multiple worked
examples, with DocAble as the deepest and most complete case study. That is a shift in authorial stance.
The voice and prose style are unchanged.

## Teach the curious engineer, not the specialist

Write formal material for the curious engineer, not for the specialist guarding the boundary of a field.
Introduce a formal idea at the level needed to *use* it. Begin with the engineering problem and the shape
of the property; reach for notation only when it shortens later reasoning or decides which tool applies.
The target reader is not waiting for a miniature formal-methods course — precision matters, but it is not
the price of admission.

- **Do:** state the useful simplified model; mark its limit in one sentence; point to the deeper
  literature; return to the system.
- **Don't:** lead with a taxonomy when an example will do; expand every qualification a specialist might
  demand; turn a primer into a survey of edge cases; make mathematical appetite the price of following the
  engineering move.

**A simplification is acceptable when it is explicitly scoped and does not teach a false operational rule.**
That line is the whole test. A scoped, honest simplification keeps the prose accessible; a simplification
that leaves the reader with a wrong operational rule is a correctness break, not a stylistic one. Scope it
in a clause and cite the literature that carries the full account; never trade a true rule for a shorter
sentence.

## Economy — less is more

The prose leg of the skill's governing stance (SKILL.md, §"The governing stance: less is more"): **Hemingway's
economy.** The word count is not the target; the target is that every word carries the idea. Strip the ones
that don't.

- **No fluffy adjectives.** Cut the decorative modifier that adds heat but no information — *powerful,
  seamless, robust, elegant, comprehensive, cutting-edge, sophisticated*. "A validator that checks output ⊆
  input," not "a powerful, comprehensive validator." Keep an adjective only when it is a claim the reader can
  check (*idempotent*, *at-least-once*, *148-line*) — those carry information; the fluffy ones carry mood.
  This sharpens the same edge as the "cut qualifiers" rule below, one level up: qualifiers weaken a claim,
  fluffy adjectives inflate it, and both are ornament.
- **Reserve flowery language for the contexts that earn it — and use it sparingly even there.** A blog post
  or a keynote is *persuading*, and a well-placed flourish earns its keep; that is the discursive register
  above, and the extended analogy is a tool in it. Repo prose — a reference, a runbook, a design doc — is
  not persuading; it is *informing*, and there the flourish is noise. Match the ornament to the register: a
  touch of it in a Motivation that genuinely persuades, none of it in a reference definition. Even in the
  contexts that earn it, one flourish that lands beats three that decorate.
- **The plain word beats the ornamental one when it carries the idea.** This is the "plain diction carrying
  technical weight" characteristic, stated as a rule: reach for the common word ("pickle", "silver bullet")
  when it will carry the idea, and the exact technical term only when the plain word won't. An inflated word
  doing a plain word's job is the failure this catches.
- **Economy of examples.** Prefer the smallest example that demonstrates the point. Across a chapter, vary
  the examples so the reader sees the abstraction recurring across different engineering domains rather than
  repeatedly through one implementation. This is the word-economy rule one level up: as the sentence rule
  strips the word that carries no idea, economy of examples strips the redundant instance and rotates in a
  fresh domain in its place. It is Tufte's data-ink principle for pedagogy.

- **≤50 words per sentence — prose and captions alike.** No sentence exceeds roughly fifty words. A
  caption or accessible-description sentence is not exempt: a 100-word caption is as much a wall as a
  100-word paragraph. Split the run-on into two or more sentences, each carrying one idea. The split
  is the fix the voice already wants — short declaratives land harder than a long one. A colon-led
  enumeration or a labeled taxonomy that genuinely reads as a *list* is the one exception; break it
  anyway if it reads as a comma-run rather than a list.
- **No more than ~6 paragraphs without a heading of some kind.** A long headless run of prose loses the
  reader. Break it with a sub-heading (`####`) that names the turn, so the reader always has a nearby
  signpost telling them where the argument has arrived.

The [`audit.md`](audit.md) procedure flags a fluffy adjective as a Pass-3 house-style finding.

## Engineering textbook, not conference keynote

**Write like an engineering textbook, not like a conference keynote.** A textbook states the result and
moves on; a keynote warms the room first and restates the point for effect. Lead with the definition or
the result; cut the warm-up and cut the recap.

- **Cut the warm-up.** The keynote signals that a good part is coming before delivering it — "Here is the
  interesting part…", "It turns out…", "Now for the fun bit." The textbook just states the thing. Delete
  the throat-clearing and open on the result.
- **Do not recap at the same level of abstraction; recur only to compress, connect, or advance.** The
  keynote restates its point after making it, for effect, and the textbook trusts the reader to have read
  the sentence — so a paragraph that restates the one above it is padding, and gets cut. But not every
  return to a point is a recap. Recurring to *compress* a long argument into operational handles, to
  *connect* it to a later idea, or to *advance* it a step is productive; a chapter-ending synthesis that
  turns a forty-page argument into five named commandments is compression, not padding. This is the
  self-commentary curl one level up — keep the point, drop the echo — but do not delete a synthesis that
  does new work.
- **Definition first, motivation second.** Open with the result, the definition, the claim; let a
  sentence of motivation follow only where it earns its place. This is the principle behind the glossary's
  definition-first entries and the warm-up-deletion pass across the prose.
- **Organize exposition by the engineering system, not the project timeline.** Historical incidents
  motivate the theory; they do not determine the structure of the chapter. Examples are evidence for the
  abstraction, not the spine of the exposition. When a mechanism was discovered "because this happened
  next," present it "because it logically follows." The case study *motivates* a mechanism; the exposition
  is organized around the engineered system it belongs to. A lived incident may open a section as
  motivation, but the section's spine is the architecture, and the reader should be able to follow the
  mechanism without the chronology. (As-built status notes are the sanctioned exception — mark them as
  divergence, do not let them structure the argument.)
- **Present clinically: problem, structure, trade-offs, failure modes, consequences — not exhortation.**
  Describe the mechanism and the failure it kills; do not crown it, do not tell the reader every project
  should adopt it, do not comment on the idea's own importance. Confidence paired with an explicit caveat,
  never absolutism. This governs *structure and stance*; the sanctioned lived-detail / field-note asides
  (the first-person incidents that carry the book's warmth) stay intact.

Worked examples strengthen this rule rather than relax it. When convergence across several systems shows a
mechanism matters, the section no longer needs rhetorical motivation to persuade the reader that it does.
You show Cloudflare, Docker, Siemens, and DocAble arriving at the same shape, and the evidence carries what
the warm-up used to.

## Section rhythm — the default template for Parts 2–4

Sections in the argument Parts follow one rhythm: **Theory → Design space → Tradeoffs → Worked Examples →
Takeaways → Transition.** This is house law, not advice. It is the book's pedagogy, and the default template
a section reaches for unless it has a named reason to depart. State the theory, open the space of designs it
admits, name the tradeoffs among them, ground them in worked examples, compress to takeaways, then hand off
to the next section.

### Worked Examples

Present 2–4 concise examples from different domains whenever possible. Rotate sources across the book. End
with a "Common Pattern" or "Takeaway" that names the abstraction illustrated by the examples rather than
summarizing the implementations.

## Progressive density — let the book's language do more work over time

The economy rule above works per sentence: strip the word that carries no idea. Progressive density is the
same instinct one level up, across a long work. **Make the explanations shorter, not the ideas.** Two axes
get conflated here; hold them apart.

- **Abstraction stays high.** Don't dumb the material down as the work goes on. The ideas keep their full
  altitude, so a later section reads denser, not simpler.
- **Exposition shrinks as the reader learns the vocabulary.** Spend the full space the first time a concept
  appears. Later the reader holds it, so re-deriving it from scratch is waste. Compress the re-explanation
  to a one-sentence invocation that assumes the term is internalized, and keep the freed space for the new
  argument the passage makes with it.
- **Exploit the reader's accumulated knowledge.** *Design Patterns* is the model: early on Gamma et al.
  explain what a pattern is; by the later chapters they write "use Strategy here" and move on. Lean on the
  terminology already introduced instead of re-explaining it. The discourse grows more abstract over time
  precisely because it assumes internalized concepts.
- **This is pacing, not word-cutting.** The gain is not a smaller word count. It is the language doing more
  work the further in the reader is. A first introduction earns two pages; the tenth invocation of the same
  term earns one dense sentence.
- **The four scales, made operational.** Progressive density plays out at four scales, each with its own
  rule for how much to repeat. Within a **page**: do not restate. Within a **chapter**: repeat only in
  compressed or applied form. Across **Parts**: reuse the canonical NAME, not the full explanation. At the
  **conclusion**: invoke the idea, do not re-teach it.
- **Do not repeat an example merely because it is familiar.** Once a concept has been established using
  DocAble, later invocations should preferentially rotate to another example unless the unique details of
  DocAble are essential. This is the four-scales rule applied to *evidence*: reuse the canonical name, and
  rotate the instance.
- **Progressive density applies to the mainline, not to optional primers.** The rule compresses the book's
  *own* vocabulary: the mainline should increasingly invoke an established MAGE concept without
  re-explaining it. It does not forbid a later inset from teaching an *external* concept from first
  principles when that concept is newly required — an automaton, queueing theory, traceability, a data-flow
  diagram — even though the book itself is already advanced. Do not confuse "late in the book" with "already
  known to the reader": compress the repeated MAGE concept, but teach the newly-introduced outside concept
  where it becomes useful. (The inset is the second track that carries it — see
  [`document-types.md`](document-types.md) §"Pedagogical insets".)

The failure it catches: a late chapter that reopens a *settled book* concept with a fresh
from-first-principles meditation. State the dense invocation and move on. Trusting the reader to hold the
concept is itself the more abstract move, and the right one.

## Drift tells to avoid — the discursive register's failure modes

The discursive register is the one that drifts. When machine prose imitates the author's essays it reaches
for the *shape* of his moves without the discipline that makes them land. These are the tells that
distinguish the imitation from the voice — each surfaced by comparing the book against the author speaking
live, where he never does any of them.

- **The self-commentary curl is the #1 drift.** State a point and *stop*. Do not add a trailing clause
  that *rates* the point you just made — "and that is the whole point," "worth more than the rule itself,"
  "the interesting part lives here," "worth noting/naming/stating/carrying." The author lands a point and
  moves on; the curl is the machine congratulating itself on having made one. **Budget: at most 5–10
  rating-clauses across an entire book.** A couple, placed on the load-bearing claim, are emphasis;
  reaching for one every section is the tell. When you catch a curl, delete the rating clause and keep the
  point — the example or the claim already carries the weight the curl was trying to add.
- **Ration polished slogans.** A repeated *plain* sentence is emphasis ("Graduate school is not like
  undergraduate," said twice). A repeated *polished* one — an epigram tuned for symmetry, restated in
  near-identical elevated prose across chapters — is a machine tell. Give each idea ONE full slogan
  treatment at its best landing site; everywhere else compress to the blunt spoken version. "A check that
  re-reads the code can't fall behind it; a stored copy can" is the plain thing you say four times; the
  polished epigram you earn once.
- **Concrete image BEFORE the abstraction.** The author obeys this live, religiously — the stapler, the
  town hall, the drone-climb, the out-of-date map all arrive *first*, and the name for the thing comes
  after. Never lead a dense point with the abstraction and arrive at the picture late. If a sentence opens
  with the general claim and reaches the worked example in its second half, flip it: picture first, name
  second.
- **No literary-cute.** The author's plain-word habit is *folksy*, not literary — "pickle," "janky,"
  "Rube Goldberg machine," "dumpster fire," "stringly-typed." It is not "wearing small clothes." A plain
  word doing plain work is the voice; an ornamental word reaching for a literary effect is the drift. Prefer
  the folksy image over the clever phrase — while allowing that a single well-placed flourish the author
  actively wants ("institutional alchemy," kept by author call) can earn its keep. The tell is *density*,
  not any one word. **A useful conceptual metaphor is not decorative prose** — the map and the territory,
  the printer, the model bridge do explanatory work no plain paraphrase carries, so this rule does not
  license editing them out. Keep a metaphor that earns its keep; run the metaphor → operational meaning →
  boundary sequence rather than replacing it with sterile precision ([`rhetoric.md`](rhetoric.md)
  §"Metaphor → operational meaning → boundary").
- **Break mechanical tricolons.** Three parallel imperatives on a fixed beat — "Guard the decisions, hand
  the mechanical work to the substrate, and spend the human where nothing stands in" — read as machine
  cadence precisely because the clauses match in length and rhythm. Vary the clause lengths, or break the
  three into separate sentences of different weights, so the parallelism serves the point instead of
  announcing itself.

## Exemplars — verbatim, with the rule each teaches

The exemplars split by register. The **engineering/documentation** set (best-in-class third-party docs)
teaches the target register for repo prose; the **discursive** set (Medium essays) teaches persuasion and
rhythm; the **technical** set (co-authored papers) teaches terse claim-framing and scoping. Draw from
whichever register the section you are writing calls for — and default to the engineering one.

### Engineering / documentation — the target register (third-party exemplars)

**Provenance:** these are best-in-class **third-party** engineer-facing docs (Apache Software Foundation
projects), NOT the house author's voice. They are the register to *aim for* in repo prose — mechanism
entries, design docs, CLAUDE rules, code comments, runbooks. Each is tagged with its
[Diátaxis](https://diataxis.fr/) mode (explanation · reference · how-to · tutorial), which feeds the
engineering-discourse layer.

E1. > "ZooKeeper is a distributed, open-source coordination service for distributed applications. It
    > exposes a simple set of primitives that distributed applications can build upon to implement higher
    > level services for synchronization, configuration maintenance, and groups and naming."
    > — ZooKeeper, [overview](https://zookeeper.apache.org/doc/current/zookeeperOver.html) · *explanation*

    **Rule:** Lead with a one-sentence "what it is" before any detail. The first sentence names the thing
    and its job in plain present-tense active voice; the second says what you build *with* it. A reader who
    stops after sentence one still knows what this is.

E2. > "ZooKeeper is simple. … ZooKeeper is replicated. … ZooKeeper is ordered. … ZooKeeper is fast. It is
    > especially fast in 'read-dominant' workloads."
    > — ZooKeeper, [overview](https://zookeeper.apache.org/doc/current/zookeeperOver.html) · *explanation*

    **Rule:** Describe a system as a set of plain declaratives, each a claimed property followed by its
    consequence. Active voice, present tense, one property per sentence. The parallel "X is P" openers are
    an anaphora used *deliberately* to structure a property list — the register's sanctioned repetition.

E3. > "Maven is based around the central concept of a build lifecycle. … There are three built-in build
    > lifecycles: default, clean and site. The default lifecycle handles your project deployment, the
    > clean lifecycle handles project cleaning, while the site lifecycle handles the creation of your
    > project's web site."
    > — Maven, [build lifecycle](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) · *explanation*

    **Rule:** Orient before detail: name the organizing concept, state how many parts it has, then define
    each part in one clause. The reader gets the map ("three lifecycles") before the territory, so the
    detail lands in a frame instead of arriving cold.

E4. > "An event is a statement about a change of the state of the domain modelled by the application.
    > Events can be input and/or output of a stream or batch processing application. Events are special
    > types of records."
    > — Flink, [glossary](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/glossary/) · *reference*

    **Rule:** A reference definition is one precise sentence: the term, then its genus and differentia
    ("a statement about a change of state"). Follow with how it relates to neighbouring terms ("special
    types of records"). No motivation, no example — reference prose defines, it does not persuade.

E5. > "It is not possible to prevent such attacks entirely, but you can do certain things to mitigate the
    > problems that they create."
    > — httpd, [security tips](https://httpd.apache.org/docs/current/misc/security_tips.html) · *how-to*

    **Rule:** State the honest limit before the remedy. A how-to that overpromises loses trust; naming what
    the reader *can't* do ("prevent entirely") makes the "but you can mitigate" that follows credible. Set
    the expectation, then give the steps.

E6. > "A request for /files/../../etc/passwd could potentially access files outside the intended directory.
    > Use restrictive patterns in your RewriteRule (for example, [a-zA-Z0-9_-]+ instead of .+), and rely on
    > Apache's built-in protections (Options and <Directory> restrictions) as defense in depth."
    > — httpd, [mod_rewrite intro](https://httpd.apache.org/docs/current/rewrite/intro.html) · *how-to*

    **Rule:** Carry the concept on a concrete worked example, then give the imperative fix. The dangerous
    input is shown literally (`/files/../../etc/passwd`), the fix is an imperative with a concrete
    contrast (`[a-zA-Z0-9_-]+` instead of `.+`). Show the failing case, then command the fix.

E7. > "Don't fear the filesystem! … This structure has the advantage that all operations are O(1) and reads
    > do not block writes or each other. This has obvious performance advantages since the performance is
    > completely decoupled from the data size."
    > — Kafka, [design](https://kafka.apache.org/43/design/design) · *explanation*

    **Rule:** Name the reader's likely objection, then dismantle it with a mechanism. The blunt opener
    ("Don't fear the filesystem!") surfaces the doubt; the O(1) / decoupled-from-size reasoning answers it
    on the merits. Explanation earns a claim by walking the *why*, not by asserting the *what*.

E8. > "The TimeOut directive should be lowered on sites that are subject to DoS attacks. Setting this to as
    > low as a few seconds may be appropriate. As TimeOut is currently used for several different
    > operations, setting it to a low value introduces problems with long running CGI scripts."
    > — httpd, [security tips](https://httpd.apache.org/docs/current/misc/security_tips.html) · *how-to*

    **Rule:** Give the directive, the concrete setting, and the tradeoff in one beat. A how-to step is not
    complete until it names what the change *costs* ("introduces problems with long running CGI scripts") —
    the same claim-plus-cost discipline as the technical register, in imperative form.

### Discursive / argumentative register

1. > "The novelty argument is therefore not simply 'no one has published this before,' but rather 'this
   > task was not previously achievable in a practical way.'"
   > — [*Different contributions require different novelty arguments*](https://davisjam.medium.com/different-contributions-require-different-novelty-arguments-42b2dac0eade)

   **Rule:** The "not X, but Y" figure (correctio) works when it *redefines* — it replaces a weak framing
   with a sharper one, and the two halves carry different content. Use it to correct a misconception, not
   as a cadence you fall into every third sentence.

2. > "But Unit Proofs are not a silver bullet. They do not provide complete guarantees on their own. On
   > small programs, they can find these defects almost for 'free'. On large programs, solvers struggle."
   > — [*Unit Proofing*](https://davisjam.medium.com/unit-proofing-unit-tests-for-memory-safety-a60cf73cdae7)

   **Rule:** State the limit plainly, right after the claim. Short declaratives ("They do not provide
   complete guarantees") land harder than a hedged long sentence. The parallel "On small… / On large…"
   antithesis earns its symmetry because the two cases genuinely oppose.

3. > "Here is the key difference from the earlier types that I described. For engineering research, the bar
   > is not 'Is it in the literature?' but rather 'Is it possible through a straightforward application of
   > the state-of-the-art methods?'"
   > — [*Different contributions require different novelty arguments*](https://davisjam.medium.com/different-contributions-require-different-novelty-arguments-42b2dac0eade)

   **Rule:** Signpost the pivot in a short sentence of its own ("Here is the key difference"), then deliver
   the contrast. He frames comparisons as question-versus-question, which forces the reader to feel the
   distinction rather than be told it.

4. > "If you can construct such a solution without inventing anything new, then you have a pickle—you have
   > built a new thing that did not previously exist."
   > — [*Different contributions require different novelty arguments*](https://davisjam.medium.com/different-contributions-require-different-novelty-arguments-42b2dac0eade)

   **Rule:** A plain, slightly informal word ("pickle") in a rigorous argument is a feature, not a lapse —
   it keeps the prose human. Here the em-dash introduces the *definition* of the plain word, which is
   exactly the aside the dash is for.

5. > "This is a 'just-so story' that works well to introduce the research process. But it is a
   > simplification of research reality."
   > — [*Different contributions require different novelty arguments*](https://davisjam.medium.com/different-contributions-require-different-novelty-arguments-42b2dac0eade)

   **Rule:** Concede the useful-but-incomplete model, then complicate it. The two-sentence beat — set up,
   then "But…" — is his default engine for moving an argument forward. No em-dash needed; the period does it.

6. > "Repeat after me: 'Graduate school is not like undergraduate. Graduate school is not like
   > undergraduate.'"
   > — [*Advice on applying to graduate school*](https://davisjam.medium.com/prof-daviss-advice-on-applying-to-graduate-school-in-computing-in-the-usa-160cb539ecab)

   **Rule:** Direct address ("Repeat after me") and deliberate repetition drive one point home when it
   matters. Reserve it for the load-bearing claim — repetition everywhere is noise; repetition once is
   emphasis. The colon sets up the quoted line without a dash.

### Technical / academic register

These are from multi-author papers — they teach the *register*, not the author's personal idiom: how a
claim is framed and scoped, how a contribution and its cost are stated together, how a limitation is
stated flat.

7. > "While prior work has developed defenses against package confusions in some software package
   > registries, notably NPM, PyPI, and RubyGems, gaps remain: high false-positive rates, generalization
   > to more software package ecosystems, and insights from real-world deployment."
   > — [arXiv:2502.20528](https://arxiv.org/abs/2502.20528)

   **Rule:** Name the gap flatly, as a colon-led list, right after crediting what exists. "Gaps remain: A,
   B, and C" is the terse move for a Motivation or a "Why it's not just X" — it scopes the contribution by
   naming exactly what the prior thing lacks, no throat-clearing.

8. > "Our approach significantly reduces false positive rates (from 80% to 28%), at the cost of an
   > additional 14s average latency to filter out benign packages by analyzing the package metadata."
   > — [arXiv:2502.20528](https://arxiv.org/abs/2502.20528)

   **Rule:** State the win and its cost in one breath, both quantified. The parenthetical carries the
   number; the "at the cost of" clause carries the tradeoff. This is the register for an Intent line — a
   claim is not done until its price is on the page.

9. > "Of 89 recreated defects, systematic unit proofs detected 66 (74%) and an additional 8 (9%) with
   > increased BMC bounds, while 10 remained undetected due to memory exhaustion."
   > — [arXiv:2503.13762](https://arxiv.org/abs/2503.13762)

   **Rule:** Report the negative case with the same precision as the positive one. "10 remained undetected
   due to memory exhaustion" — the failures get a count and a cause, not a hand-wave. Being precise about
   what it *doesn't* do is how a technical claim earns trust.

10. > "External Validity: Our study evaluated unit proofing on functions from embedded operating systems.
    > This raises concerns about generalizability. On what kinds of functions do our results hold?"
    > — [arXiv:2503.13762](https://arxiv.org/abs/2503.13762)

    **Rule:** State the limitation as a plain declarative, then pose the exact question it raises and go
    answer it. No apology, no defensiveness — the limitation is named, scoped, and addressed. This is the
    "confidence + explicit caveat" characteristic in its terse form.

11. > "However, we lack in-depth industry perspectives on the practices and challenges of learning from
    > failures. To address this gap, we conducted a case study through 10 in-depth interviews with research
    > software engineers at a national space research center."
    > — [arXiv:2509.06301](https://arxiv.org/abs/2509.06301)

    **Rule:** The two-beat "However, we lack X. To address this, we did Y." is the paper's engine for
    turning a gap into a contribution. Name the missing thing, then say precisely what you did about it —
    the number ("10 in-depth interviews") anchors the method before any claim rests on it.

12. > "Our findings show that (1) constraint-based fuzz driver generation reduces the number of crashes by
    > 2–8% …; (2) context-based crash validation reduces the number of reported crashes by 57.3 – 61.3% …;
    > and (3) generating fuzz drivers with OSS-Fuzz-Gen costs less than a dollar, with tool usage
    > contributing the highest proportion of costs."
    > — [arXiv:2510.02185](https://arxiv.org/abs/2510.02185)

    **Rule:** A findings summary is a numbered list where each item is claim-plus-number, not prose. When
    you have three or more results, enumerate them — the reader scans the list, and each result carries its
    own measured value. (This is the technical twin of the house rule "an enumeration of three is a list,
    not a comma-run.")


## House-style calibration — transformations from the author's own edits (260726)

The author hand-edited several chapters; these are the rules those edits encode, each with a real
before->after. A book-wide style pass applies them — but CONSERVATIVELY: preserve every fact, number,
citation, figure, and `<!-- marker -->`; never homogenize a distinctive passage; when a change is not a
clear win, leave the prose alone. The goal is the author's voice, not a uniform one.

1. **Semantic line breaks in source (authoring convention).** Write one sentence per line; a long
   sentence may break at a clause boundary with a one-space-indented continuation. The renderer
   soft-wraps single newlines, so this renders as normal flowing prose — it only improves diffs and
   editing. Do NOT insert a blank line between the sentences of one paragraph (that would split the
   paragraph); keep the blank line only between paragraphs.

2. **Cut the dramatized reveal.** Replace a suspenseful withhold-then-reveal ("X was not A. It was B.")
   with the direct statement. State the point; trust it to land.
   - *Before:* "The first crack was not a bug. It was a queue — work finished faster than I could bless it."
   - *After:*  "The first crack was thus a queue — work finished faster than I could bless it."
   - *Before:* "held his team's one-year record for defects *opened* … the badge of someone whose job was to find the bugs, not to ship them."
   - *After:*  "broke his team record for most defects opened in a year."

3. **Literal, descriptive section titles over cute ones.** The heading should say what the section does.
   - *Before:* "## This book showed how"   *After:* "## Fitting this book into the software engineering literature"
   - *Before:* "### Why the title gets to climb"   *After:* "### Why the job title climbs"

4. **Name a work or a person formally on reference.** Cite the book; use the honorific on second mention.
   - *Before:* "The Gang of Four argued…"   *After:* "In *Design Patterns*, the Gang of Four argued…"
   - Second reference to the author: "Dr. Davis"; credentials as "James C. Davis, PhD".

5. **Use the catalogue's control vocabulary precisely.** A *model* is a view; a *constraint* prevents; a
   *sensor* detects; a *control* is either. Reach for these, not loose synonyms.
   - *Before:* "Every model, every gate, every scheduler…"   *After:* "Every model, every constraint, every sensor…"

6. **Enumerations of three or more parallel items become a list** (already a house rule — apply it): a
   run of `**Bold lead:** …` clauses in a sentence becomes a numbered or bulleted list with bold lead-ins.

These SHARPEN, they do not replace, the voice already described above (direct reader address is
characteristic #4; economy and "say it once" are the standing discipline). Apply where a passage clearly
violates one; leave a passage that already reads in the author's voice.

## House-style calibration — from the 1.1 intro edit (260728)

Two more transformations from the author's own edits, same conservative posture as §260726 above.

7. **Figure captions carry implications/interpretation, not just description.** A caption that only says
   what the figure *shows* stops short; the author's captions also say what it *means* — the conclusion to
   draw, the decision it drives, the fallback to take. Hold the division of labor: the **prose** motivates
   and develops the idea, the **figure** spatializes it, and the **caption** tells the reader how to read
   the spatial relation and what follows from it. A caption may stand alone, but it must not duplicate the
   prose sentence-for-sentence.
   - *Before (caption):* "…A hard task goes to supervised autonomy, where you supply correctness conditions…"
     *(describes the branches, then stops.)*
   - *After (caption):* "…If you're not sure, try to one-shot it. But if the one-shot effort doesn't pan out,
     don't throw good tokens after bad. Just switch over to the other path." *(adds the interpretation:
     what to do, and the fallback.)*

8. **A plain, direct signpost beats an oblique one; and reach for the verb the governing metaphor implies.**
   Name the artifact and its job outright, and use the physical verb the extended metaphor already sets up.
   - *Before:* "Two modes answer it, and the choice between them runs as shown below."
     *After:* "Below is a flowchart to guide your judgment."
   - *Before:* "you press go, and a working script comes back"
     *After:* "you push the button, and a working program comes back" *(the printer has a **button**.)*

## House-style calibration — precision governs the copula rule in the formal Part (260729)

9. **In the formal Part (2 and 3), a precise relational copula beats the reflexive verb-swap.** The house
   "avoid the *X is a Y* copula, reach for the verb" rule (characteristic #2, audit Pass 3) is an
   *engineering-register* default against equative *stalls*. It YIELDS to precision in the technical/academic
   register: when "X **is a property of** Y" (or *is a function of*, *is a member of*, *is an instance of*)
   names the *exact* relation, the copula is the precise word, not a stall — swapping in an evocative verb
   trades precision for color, which the formal Part does not want. Keep the verb-swap for genuine
   stalls ("the hook *is a* gate" → "the hook *gates*"); keep the copula for a precise relational claim.
   - *Before (author revert):* "the collision **lives in** the interaction"
     *After:* "the collision **is a property of** the interaction" *(a wrong copula-swap: "property of" is
     the precise relation between a conflict and the interaction it belongs to; "lives in" is looser.)*
