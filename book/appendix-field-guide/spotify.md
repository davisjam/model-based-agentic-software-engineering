### Spotify

<!-- label: field-guide-spotify -->
<!-- figure: assets/field-guide-spotify.svg | *Spotify.* A fleet-first team: human judgment moves upstream — one engineer scopes a migration a fleet then executes — the Governed-Environment door. -->

**What they are.** An audio-streaming platform. Public reports describe a fleet-scale autonomous-migration program running across many teams.

**Where they enter.** Through the fleet. Spotify invests in fleet-scale verification and coordination, and lands on the **Governed Engineering Environment**.

**The MAGE reading.** A fleet-wide migration that once drew in hundreds of teams over weeks is now scoped by one engineer over a few days. The tooling targets and schedules the work, the agents implement it concurrently, and the engineer watches the fleet and handles the exceptions. Human judgment moves upstream: the engineer stops typing each change and starts deciding what, where, when, and whether. As coding velocity rises the constraint rises with it. Spotify reports a **76% jump in PR frequency**, which forces the question of where a human review still earns its cost. A pre-agent automerger already crosses the automatic-admission frontier, and agent work is wrapped in verifiers.

**What you take away.** Automate implementation and the scarce resource becomes the human decision — what, where, when, and whether — placed where the environment can amplify it.
