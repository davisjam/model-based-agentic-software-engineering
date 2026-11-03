<!-- GENERATED from book/latex/sources/appendix-field-guide/spotify.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

### Spotify

*Audio streaming · fleet-scale autonomous migration*

#### Verso — Evidence

**What the public record shows.** Spotify's Honk system moves large-scale code migration from distributed manual implementation toward centrally scoped, fleet-executed work. A migration that could previously involve hundreds of teams over weeks can instead be scoped by one engineer over a few days; tooling identifies and schedules targets, agents execute changes concurrently, and the engineer supervises the fleet and handles exceptions.[cite: spotify2026honk]

Spotify’s Backstage catalog makes component ownership and documentation available to engineers and agents.[cite: spotify2026constraint] In one documented dataset migration, engineers used its endpoint-lineage and code-search tools to identify target repositories, then used Fleetshift to coordinate Honk’s changes.[cite: edwardsjoseph2026migrations][^sp-estate]

**Boundary of the evidence.** Reported activity increases — including the 76% PR-frequency figure[^sp-prfreq] — measure implementation activity, not durable throughput. The stronger evidence is how the work changes: agents implement while human judgment moves upstream to scoping and supervision.

**Portable lesson.** Scale implementation; concentrate human judgment on what to change and where.

#### Recto — Connection to MAGE

<!-- label: field-guide-spotify -->
<!-- figure: assets/field-guide-spotify.svg | *Spotify’s connection to MAGE.* In the documented dataset migration, engineers used Backstage to identify affected repositories and Fleetshift to coordinate Honk’s changes. Checks and human review determined whether the changes could proceed. -->

**Connection to MAGE.** Spotify illustrates Modeling when engineers use recorded dependencies to identify where a migration belongs. Honk’s verification tools and human review illustrate Alignment by checking whether its changes may proceed. Fleet execution lets one engineer’s decisions guide changes across many repositories.

**What the evidence establishes.** The dataset-migration account connects Backstage, Fleetshift, and Honk in one workflow. It does not establish that every migration uses the same representations or checks. Spotify distinguishes agent-authored changes that receive human review from deterministic fleet changes that can merge automatically.[cite: edwardsjoseph2026migrations; brown2023fleet; curtis2026spotifyqcon]

[^sp-estate]: Spotify describes Backstage’s component catalog and access for agents in its developer-experience account.[cite: spotify2026constraint] Honk Part 4 describes engineers using endpoint lineage and Codesearch to identify migration targets before Honk changes the code.[cite: edwardsjoseph2026migrations]

[^sp-prfreq]: 76% PR-frequency figure as reported in the Honk account; cited here strictly as an activity measure, not as evidence of durable throughput.
