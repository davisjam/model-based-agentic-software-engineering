Fable Agent Instructions: Rebuild Failure-Aware Engineering

Target: ECE 30861, Act II, Unit 4 — Failure-Aware Engineering
Primary case: CrowdStrike Falcon outage, July 19, 2024
Secondary case: Cloudflare WAF regex outage, July 2, 2019
Deliverables: Revised PowerPoint, speaker notes, and course lander
Target length: 27–30 slides for a 75-minute lecture

This is a substantial narrative redesign, not a copyediting pass. Preserve the existing lecture’s intellectual objectives, but replace its case studies and reorganize the theories around the investigation of a single software engineering failure.

The governing idea is:

As we investigate the CrowdStrike outage, each new observation should motivate a broader causal model and expose additional opportunities for engineering intervention.

The students should experience the progression as an investigation. They begin with a defective update, discover weaknesses in the engineering defenses, and eventually recognize a systemic common-cause vulnerability affecting critical infrastructure.

The theories are introduced when the investigation needs them.

⸻

Part I. Instructional objectives

1. What students should learn

By the end of the lecture, students should be able to:

1. Construct a causal explanation of a software engineering failure, distinguishing observed facts from hypotheses.
2. Apply three models of failure: component/human error, Reason’s Swiss cheese model, and Leveson’s STAMP.
3. Select an appropriate causal boundary for an engineering decision.
4. Distinguish interventions that prevent a defect, detect it, contain its consequences, or improve recovery.
5. Explain how a local software defect can become a systemic common-cause failure.
6. Derive defensible engineering lessons from incident evidence.
7. Decide whether a lesson should change an engineer’s judgment, an engineering model, a validation mechanism, an architectural constraint, or a control imposed by another organization.

These objectives should be reflected in the slide questions, exercises, and closing synthesis.

2. Relationship to the course

The preceding Act II units established:

* Delegation: What work and authority should another actor receive?
* Modeling: What consequential knowledge should be represented?
* Alignment: Which obligations should be enforced, and where?
* Failure-Aware Engineering: What does observed failure reveal about the adequacy of those decisions?

The lecture should demonstrate that failure can expose inadequacies in any of these activities.

In particular, connect the investigation to the Act I engineering activities:

Activity	CrowdStrike question
Requirements	What reliability obligations should endpoint security software satisfy?
Specification	What must hold when content is malformed or inconsistent with its interpreter?
Architecture	Why could a content-processing failure crash an operating system?
Design	What mechanism permitted invalid content to cause an unsafe operation?
Validation	What evidence was obtained before the update was released?
Process	How was the update distributed, observed, and controlled?

Do not turn this into six additional slides. Use these connections where they naturally arise.

The lecture’s central judgment is:

What causal structure must we understand to identify an effective intervention?

The answer depends on the failure class, the evidence available, and the authority of the actor who could implement the intervention.

⸻

Part II. Research and factual requirements

Before implementing slides, collect authoritative technical sources.

3. CrowdStrike sources

Use the following as primary sources:

CrowdStrike

* Preliminary Post Incident Review, July 2024.
* Root Cause Analysis, August 2024.
* Subsequent technical explanations and remediation commitments where relevant.

Official source:  ⁠CrowdStrike

Microsoft

* Microsoft’s technical analysis of the incident.
* Microsoft’s discussion of the affected Windows ecosystem.
* Microsoft’s published estimate of approximately 8.5 million affected Windows devices.

Official source:  ⁠Microsoft

Government and infrastructure

* CISA incident advisories and recovery guidance.
* Relevant government analysis of concentration risk, common-cause failures, and resilience in critical infrastructure.

Official source:  ⁠CISA

Use the postmortems to establish the exact technical sequence.

Important distinctions:

* The defective artifact was a Rapid Response Content update, not an ordinary Windows operating-system update.
* The failure involved a mismatch between the content supplied and the assumptions made by its processing machinery.
* The resulting failure occurred in a privileged execution context and produced Windows crashes.
* The release and validation mechanisms must be described according to the actual postmortem, not a generic CI/CD pipeline.
* The reported number of affected devices is not the number of organizations or critical services affected.
* A widespread common-mode failure does not itself establish that every affected organization used CrowdStrike as its sole security vendor.

The final point matters for the STAMP discussion.

Mandatory diversity

The absence of mandatory diversity is an important candidate systemic explanation and policy question, but it must not be represented as an established root cause without evidence.

Distinguish:

1. Observed: A single vendor update produced widespread correlated failures.
2. Inferred: Shared privileged software dependencies created a common-cause vulnerability.
3. Proposed: Critical infrastructure might require greater diversity, independence, or isolation of security mechanisms.
4. Unresolved: Whether mandatory vendor diversity would have prevented this incident, and whether its benefits justify its costs.

The lecture should examine this as an engineering decision, not announce it as a proven solution.

4. Cloudflare sources

Use Cloudflare’s July 2019 postmortem.

Official source:  ⁠Cloudflare

Establish the relationship among:

* The WAF rule.
* The regular expression.
* Catastrophic backtracking.
* CPU consumption.
* Deployment and testing arrangements.
* The resulting service disruption.

Do not conflate this incident with Cloudflare’s November 2025 outage, which had a different mechanism.

5. Theory sources

Use:

James Reason

* Human Error (1990).
* Managing the Risks of Organizational Accidents (1997).

Nancy Leveson

* Engineering a Safer World: Systems Thinking Applied to Safety (2011).

The STAMP slides must represent the theory accurately.

STAMP is not merely a large dependency diagram. It models safety as a control problem involving constraints, controllers, controlled processes, feedback, and process models.

A control structure must show these relationships.

Also distinguish the STAMP accident model from STPA, the associated hazard-analysis method. We are introducing STAMP, not teaching the complete STPA procedure.

⸻

Part III. Narrative architecture

The lecture should have five movements.

Movement	Slides	Approximate time	Narrative question
1. The incident	1–6	12 min	What failed?
2. The defenses	7–12	14 min	Why didn’t we catch it?
3. The system	13–20	20 min	Why could one failure affect so many?
4. Learning	21–26	17 min	What should change?
5. Transfer	27–29	12 min	Can we apply this elsewhere?

The slide count is a target, not a requirement. Preserve instructional coherence rather than padding to 29 slides.

Avoid a separate section containing three consecutive theory definitions. The theories should emerge from the CrowdStrike narrative.

The progression should be:

OBSERVATION
    |
    v
Defective update crashes Windows
    |
    v
COMPONENT / HUMAN ERROR
    |
    | But why did the defect escape?
    v
SWISS CHEESE
    |
    | But why did one escaped defect
    | disrupt so many independent services?
    v
STAMP
    |
    | What should change, and who can change it?
    v
REFLECTION + GOVERNANCE CONVERSION

This is a progression of investigative scope, not a ranking of theoretical sophistication.

⸻

Part IV. Detailed slide specifications

Movement 1 — The incident

Slide 1 — Failure-Aware Engineering

Use the established course title-slide template.

Subtitle, if appropriate:

What should failure teach us to change?

Do not add a decorative quotation.

Speaker notes should establish that this unit closes Act II.

⸻

Slide 2 — July 19, 2024

Purpose: Establish the consequences before explaining the mechanism.

Use a photograph or restrained collage illustrating disruption to critical services.

Possible layout:

+----------------------------------------------------------+
| July 19, 2024                                            |
|                                                          |
|  [AIRPORT / DEPARTURE BOARD IMAGE]   [WINDOWS BSOD IMAGE] |
|                                                          |
|                                                          |
|        Airlines       Hospitals       Financial services |
|                                                          |
|        Millions of Windows devices affected              |
|                                                          |
|  What happened?                                          |
+----------------------------------------------------------+

Prefer authentic images from credible reporting or official sources.

Do not manufacture screenshots.

Use the Microsoft estimate of approximately 8.5 million affected Windows devices, with attribution.

Speaker notes

Begin with consequences. Ask students what kind of event could simultaneously affect organizations in unrelated sectors.

Allow several hypotheses before revealing the mechanism.

⸻

Slide 3 — The update

Purpose: Reveal the immediate triggering event.

Diagram:

+----------------------------------------------------------+
| A security update triggers system crashes                |
|                                                          |
|  CROWDSTRIKE                                             |
|  Rapid Response Content                                  |
|         |                                                |
|         | distributed                                    |
|         v                                                |
|  +----------------------+                                |
|  | Falcon sensor        |                                |
|  |                      |                                |
|  | Content processing   |                                |
|  +----------------------+                                |
|         |                                                |
|         v                                                |
|     Windows crash                                        |
|                                                          |
|  Why can security content crash an operating system?     |
+----------------------------------------------------------+

Use correct terminology from the postmortem.

Explain that Rapid Response Content could be updated independently of ordinary sensor-code releases.

Do not yet reveal every validation weakness.

⸻

Slide 4 — The technical failure

Purpose: Explain the mechanism sufficiently for software engineering students.

Use a concrete representation of the content/interpreter mismatch.

Conceptual layout:

+----------------------------------------------------------+
| The content and interpreter disagreed                    |
|                                                          |
|   CONTENT                     INTERPRETER                |
|                                                          |
|   [expected fields]           [expected input layout]    |
|          |                           |                   |
|          +------------+--------------+                   |
|                       |                                  |
|                       v                                  |
|              Invalid access                              |
|                       |                                  |
|                       v                                  |
|                System crash                              |
|                                                          |
|  Which assumption was violated?                          |
+----------------------------------------------------------+

Replace placeholders with the precise documented field counts and mechanism.

The notes should distinguish the underlying defect, the triggering content, and the resulting crash.

This is an opportunity to recall specification and design: a producer and consumer disagreeing about the structure of information crossing their interface.

⸻

Slide 5 — The first explanation

Purpose: Introduce component/human-error analysis.

+----------------------------------------------------------+
| Explanation 1: A defective component                     |
|                                                          |
|        +-------------------+                             |
|        | Defective update  |                             |
|        +-------------------+                             |
|                  |                                       |
|                  v                                       |
|        +-------------------+                             |
|        | Unsafe processing |                             |
|        +-------------------+                             |
|                  |                                       |
|                  v                                       |
|             Windows crash                                |
|                                                          |
|  Intervention: Repair the defect                         |
|                                                          |
|  Is that enough?                                         |
+----------------------------------------------------------+

Introduce the component/human-error model briefly.

Do not imply that a specific individual was negligent or that CrowdStrike’s postmortem identified one person as responsible.

A component-level account can be useful without attributing personal blame.

⸻

Slide 6 — What would you change?

Purpose: Make students commit to an initial intervention.

Show three plausible alternatives:

+----------------------------------------------------------+
| What would you change?                                   |
|                                                          |
|  A   Fix the defective content                           |
|                                                          |
|  B   Repair the content-processing implementation        |
|                                                          |
|  C   Improve engineering review and testing              |
|                                                          |
|                                                          |
|  Which prevents the next failure of this kind?           |
+----------------------------------------------------------+

Allow brief discussion.

The distinction between fixing the observed instance and preventing a failure class should emerge.

Transition:

The defect explains why a machine crashed. It does not explain why the engineering system allowed the update to reach millions of machines.

⸻

Movement 2 — The defenses

Slide 7 — The update passed through defenses

Purpose: Introduce the release process as an engineering system.

Use the actual documented sequence, simplified for teaching.

+----------------------------------------------------------+
| How did the update reach production?                     |
|                                                          |
|   Content                                               |
|      |                                                   |
|      v                                                   |
|  [Validation]                                            |
|      |                                                   |
|      v                                                   |
|  [Testing]                                               |
|      |                                                   |
|      v                                                   |
|  [Release controls]                                      |
|      |                                                   |
|      v                                                   |
|  [Deployment]                                            |
|      |                                                   |
|      v                                                   |
|  Windows endpoints                                       |
|                                                          |
|  Which defense should have stopped it?                   |
+----------------------------------------------------------+

The labels and ordering must be checked against CrowdStrike’s RCA.

Do not imply a defense existed if the postmortem says it was absent.

⸻

Slide 8 — Swiss cheese

Purpose: Introduce Reason’s model at the moment it becomes useful.

+----------------------------------------------------------+
| Explanation 2: Defenses can fail together                |
|                                                          |
|  DEFECT                                                  |
|    |                                                     |
|    v                                                     |
|  +-------------+                                         |
|  | Validation  |     O                                  |
|  +-------------+     |                                  |
|                      v                                  |
|  +-------------+                                         |
|  | Testing     |       O                                |
|  +-------------+       |                                |
|                        v                                |
|  +-------------+                                         |
|  | Release     |         O                              |
|  +-------------+         |                              |
|                          v                              |
|                      PRODUCTION                          |
|                                                          |
|  Why did the defenses fail to stop the defect?           |
+----------------------------------------------------------+

This is a schematic, not a literal depiction of Reason’s familiar cheese slices. The final slide should use a visually clear Swiss cheese diagram.

Use animation to reveal the layers one at a time, then the aligned failure path.

Speaker notes

Explain that accidents may occur when weaknesses in multiple defenses align.

The theory changes the engineering question from identifying a defective component to examining the defenses surrounding it.

⸻

Slide 9 — What the postmortem found

Purpose: Replace the generic defense model with actual evidence.

Show documented findings from CrowdStrike’s RCA.

Use no more than four findings.

For each, identify the affected defense.

Suggested structure:

+----------------------------------------------------------+
| The investigation identifies weaknesses                  |
|                                                          |
|   DEFENSE                   DOCUMENTED FINDING            |
|                                                          |
|   Content validation        [verified finding]           |
|                                                          |
|   Testing                   [verified finding]           |
|                                                          |
|   Release                   [verified finding]           |
|                                                          |
|   Deployment                [verified finding]           |
|                                                          |
|  Source: CrowdStrike RCA                                 |
+----------------------------------------------------------+

Do not treat all four rows as necessarily failed. If a mechanism was absent, say so.

Prefer a causal diagram over a dense table if the findings can be expressed clearly.

⸻

Slide 10 — Defenses address different failures

Purpose: Show that interventions have distinct effects.

+----------------------------------------------------------+
| What should change?                                      |
|                                                          |
|  PREVENT                                                 |
|  Make invalid content unrepresentable or reject it       |
|                                                          |
|  DETECT                                                  |
|  Test the content against its interpreter                |
|                                                          |
|  CONTAIN                                                 |
|  Limit how widely a defective update is deployed         |
|                                                          |
|  RECOVER                                                 |
|  Restore affected machines and services                  |
|                                                          |
|  Which intervention addresses which failure class?       |
+----------------------------------------------------------+

Use a four-row visual with clear icons or small diagrams.

The distinction between containment and recovery matters: staged deployment may reduce exposure, whereas recovery mechanisms operate after failure.

⸻

Slide 11 — A regression test is not enough

Purpose: Reconnect to the earlier Validation unit.

Use a simple contrast:

+----------------------------------------------------------+
| What does the evidence establish?                        |
|                                                          |
|  Regression test                                         |
|      |                                                   |
|      v                                                   |
|  Detects this observed failure                           |
|                                                          |
|  General invariant                                       |
|      |                                                   |
|      v                                                   |
|  Constrains a class of invalid inputs                    |
|                                                          |
|  Deployment containment                                  |
|      |                                                   |
|      v                                                   |
|  Limits consequences of failures that escape             |
|                                                          |
|  What uncertainty remains after each intervention?       |
+----------------------------------------------------------+

Do not suggest that regression tests are intrinsically weak. Their adequacy depends on the property and the failure class.

⸻

Slide 12 — Why was the impact so large?

Purpose: Transition to the system-wide explanation.

Return to the image of widespread disruption.

+----------------------------------------------------------+
| One defective update. Many sectors.                      |
|                                                          |
|                   CROWDSTRIKE                            |
|                       |                                  |
|              +--------+--------+                         |
|              |        |        |                         |
|              v        v        v                         |
|           Airline  Hospital   Bank                       |
|              |        |        |                         |
|              v        v        v                         |
|           Service  Service   Service                     |
|           failure  failure   failure                     |
|                                                          |
|  Why did independent organizations fail together?        |
+----------------------------------------------------------+

The central observation is correlated exposure to a common dependency.

Swiss cheese can be applied at broader scopes, but the investigation now needs a model that explicitly represents the control structure of the larger sociotechnical system.

⸻

Movement 3 — The system

Slide 13 — Expand the system boundary

Purpose: Make causal scope visible.

Use nested boxes.

+----------------------------------------------------------+
| What system are we investigating?                        |
|                                                          |
| +------------------------------------------------------+ |
| | Critical infrastructure ecosystem                    | |
| |                                                      | |
| |   +----------------------------------------------+   | |
| |

Slide 13 — Expand the system boundary

Purpose: Make causal scope visible. The system under investigation changes depending on the question.

Use nested boxes, progressively revealed.

+--------------------------------------------------------------+
| What system are we investigating?                            |
|                                                              |
| +----------------------------------------------------------+ |
| | CRITICAL INFRASTRUCTURE ECOSYSTEM                        | |
| |                                                          | |
| |   +--------------------------------------------------+   | |
| |   | ENTERPRISE IT AND SECURITY OPERATIONS            |   | |
| |   |                                                  |   | |
| |   |    +----------------------------------------+    |   | |
| |   |    | CROWDSTRIKE ENGINEERING SYSTEM         |    |   | |
| |   |    |                                        |    |   | |
| |   |    |    +----------------------------+      |    |   | |
| |   |    |    | CONTENT + INTERPRETER      |      |    |   | |
| |   |    |    +----------------------------+      |    |   | |
| |   |    +----------------------------------------+    |   | |
| |   +--------------------------------------------------+   | |
| +----------------------------------------------------------+ |
|                                                              |
|  Which boundary contains the intervention we need?           |
+--------------------------------------------------------------+

Animation

1. Begin with content and interpreter.
2. Reveal CrowdStrike’s engineering system.
3. Expand to enterprise deployment and operations.
4. Expand to critical infrastructure.

Each expansion should be accompanied by a question:

* What caused the crash?
* Why did the update escape?
* Why did affected organizations become unavailable?
* Why could one vendor’s failure disrupt multiple sectors?

Speaker notes

Explain that the incident can be analyzed at several scopes. These boundaries are purposeful models, not literal containment relationships: CrowdStrike’s engineering organization is not organizationally inside each customer’s IT department.

The larger boundary reveals relationships omitted by the smaller models. It also exposes decisions outside CrowdStrike’s authority.

Connect explicitly to Modeling: A model preserves the relationships needed to answer an engineering question.

⸻

Slide 14 — STAMP models safety as control

Purpose: Introduce Leveson’s STAMP accurately, with its distinctive conceptual machinery.

Do not introduce STAMP as merely a broader version of Swiss cheese.

Suggested visual

+--------------------------------------------------------------+
| Explanation 3: Safety depends on control                     |
|                                                              |
|                  +----------------------+                    |
|                  | CONTROLLER           |                    |
|                  |                      |                    |
|                  | Process model        |                    |
|                  +----------------------+                    |
|                         |          ^                         |
|           Control       |          | Feedback                |
|           actions       v          |                         |
|                  +----------------------+                    |
|                  | CONTROLLED PROCESS   |                    |
|                  +----------------------+                    |
|                             |                                |
|                             v                                |
|                     System behavior                          |
|                                                              |
|     SAFETY CONSTRAINT                                        |
|     Unacceptable behavior must be prevented or limited      |
|                                                              |
|  What must the controller know and control?                  |
+--------------------------------------------------------------+

Use the established light-blue definition-box style for a concise definition:

STAMP: Accidents can arise when a sociotechnical control structure fails to enforce adequate safety constraints.

Speaker notes

Introduce four elements:

* A controller issues control actions.
* A controlled process responds to those actions.
* Feedback informs the controller about the process.
* The controller uses a process model to determine what actions are appropriate.

The system must enforce safety constraints through these relationships.

A controller can be software, a human operator, an engineering organization, or a regulator.

An unsafe outcome does not necessarily require a defective component. Individually functioning components can interact in ways that violate a system-level safety constraint.

Distinguish STAMP from STPA. We are introducing the accident model, not teaching the complete hazard-analysis method.

Transition: What does the CrowdStrike control structure look like?

⸻

Slide 15 — CrowdStrike’s update control structure

Purpose: Apply STAMP to the vendor’s release and deployment system.

Visual

+----------------------------------------------------------------+
| Who controlled the update?                                     |
|                                                                |
|           +--------------------------------------+             |
|           | CROWDSTRIKE RELEASE ORGANIZATION     |             |
|           |                                      |             |
|           | Process model:                      |             |
|           | Is this update safe to distribute?   |             |
|           +--------------------------------------+             |
|                       |                 ^                      |
|                       | Release         | Validation results   |
|                       | authorization   | and telemetry        |
|                       v                 |                      |
|           +--------------------------------------+             |
|           | UPDATE DISTRIBUTION                  |             |
|           +--------------------------------------+             |
|                       |                 ^                      |
|                       | Content         | Endpoint health      |
|                       v                 |                      |
|           +--------------------------------------+             |
|           | FALCON SENSORS ON WINDOWS ENDPOINTS  |-------------+
|           +--------------------------------------+             |
|                       |                                        |
|                       v                                        |
|                Endpoint behavior                               |
|                                                                |
|  CONSTRAINT: A content update must not disable the endpoint.   |
+----------------------------------------------------------------+

This is a simplified instructional control structure, not a claim that every depicted feedback path existed or operated effectively during the incident.

Animation

Reveal the controller, its control action, the controlled process, and then feedback.

Finally reveal the safety constraint.

Speaker notes

Ask students:

What did the release organization need to know before distributing the update?

Possible answers:

* Whether the content satisfied the interpreter’s assumptions.
* Whether testing exercised the relevant content-processing behavior.
* Whether deployment telemetry could reveal dangerous behavior.
* Whether release could be stopped before exposure became widespread.

Distinguish pre-release validation from operational feedback. Both inform control, but at different times.

Use the CrowdStrike RCA to identify actual control weaknesses. Do not invent missing telemetry, approvals, or rollout stages.

Key point: A controller can make an unsafe decision because its process model is inaccurate, its feedback is inadequate, or its available control actions are insufficient.

⸻

Slide 16 — The vendor is not the whole system

Purpose: Expand the control structure to customer organizations and their critical services.

Visual

+----------------------------------------------------------------+
| Who controlled the consequences?                               |
|                                                                |
|      CROWDSTRIKE                  ENTERPRISE IT                |
|      Release controls             Deployment / recovery        |
|             |                            |                     |
|             | Updates                    | Policies            |
|             v                            v                     |
|       +-------------------------------------------+            |
|       | WINDOWS ENDPOINTS                         |            |
|       | Falcon sensor + operating system          |            |
|       +-------------------------------------------+            |
|                            |                                   |
|                            v                                   |
|       +-------------------------------------------+            |
|       | CRITICAL ORGANIZATIONAL SERVICES          |            |
|       | Clinical systems / aviation / finance     |            |
|       +-------------------------------------------+            |
|                            |                                   |
|                            v                                   |
|                     Service availability                       |
|                                                                |
|  Who could prevent, contain, or recover from the failure?       |
+----------------------------------------------------------------+

For the final rendering, represent feedback from endpoints and services to enterprise IT explicitly. Include enterprise operational decisions such as recovery procedures and service-continuity arrangements.

Speaker notes

CrowdStrike controls aspects of its software development and content distribution.

Customer organizations control some aspects of their deployment environments, continuity arrangements, and recovery capabilities.

Operating-system vendors control relevant platform architecture and interfaces.

These responsibilities overlap but are not interchangeable.

An enterprise cannot ordinarily repair CrowdStrike’s internal content-processing implementation. CrowdStrike cannot independently determine a hospital’s complete continuity architecture.

Discussion question

Which interventions require action by CrowdStrike, and which require action by its customers?

Allow two minutes.

⸻

Slide 17 — Common-cause failure

Purpose: Introduce the systemic engineering problem.

This is the central conceptual payoff of the third movement.

Visual

+----------------------------------------------------------------+
| Many computers do not imply independent failure               |
|                                                                |
|   HOSPITAL A       AIRLINE B       BANK C       HOSPITAL D      |
|       |                |              |              |         |
|       v                v              v              v         |
|   +--------+       +--------+     +--------+     +--------+    |
|   |Falcon  |       |Falcon  |     |Falcon  |     |Falcon  |    |
|   +--------+       +--------+     +--------+     +--------+    |
|       ^                ^              ^              ^         |
|       |                |              |              |         |
|       +----------------+--------------+--------------+         |
|                                |                               |
|                                |                               |
|                  ONE DEFECTIVE CONTENT UPDATE                  |
|                                                                |
|                    CORRELATED FAILURE                          |
|                                                                |
|  Which apparently independent systems share a failure mode?    |
+----------------------------------------------------------------+

The diagram should be visually striking.

Use one red source of failure with multiple red propagation paths. Avoid clutter.

Speaker notes

Explain common-cause failure: multiple components or systems fail because they share a dependency, condition, or mechanism.

Redundancy provides limited protection when redundant elements share the same vulnerability.

A thousand machines running the same privileged component are not a thousand independent defenses against that component’s failure.

The relevant question is not simply how many machines an organization operates. It is how independently their essential functions can continue when a shared dependency fails.

Factual safeguard

The outage establishes widespread correlated exposure to CrowdStrike’s software. It does not establish that every affected organization relied exclusively on CrowdStrike for endpoint security.

Do not equate vendor concentration, shared software dependencies, and absence of redundancy. They are related but distinct properties.

⸻

Slide 18 — Should critical infrastructure require diversity?

Purpose: Turn the systemic diagnosis into an engineering and policy decision.

Do not present mandatory vendor diversity as an established solution.

Visual

+----------------------------------------------------------------+
| Should critical infrastructure require diversity?             |
|                                                                |
|       SHARED DEPENDENCY             DIVERSE DEPENDENCIES       |
|                                                                |
|          Vendor A                   Vendor A     Vendor B      |
|             |                          |           |           |
|        +----+----+                     |           |           |
|        |    |    |                     v           v           |
|        v    v    v                  System 1    System 2        |
|        S1   S2   S3                                            |
|                                                                |
|       One common failure          Different failure modes?     |
|                                                                |
|  BENEFIT                           COST / LIMITATION           |
|  Reduced common-mode exposure      Integration complexity      |
|  Greater independence              Operational overhead        |
|  Potential service continuity      Shared failures remain      |
|                                                                |
|  What independence must the requirement actually guarantee?    |
+----------------------------------------------------------------+

Speaker notes

Introduce the candidate requirement:

Essential services should remain available despite the failure of one endpoint security product.

Then distinguish possible realizations:

* Different endpoint security products across independent operational domains.
* Independent fallback systems that do not depend on the affected endpoint configuration.
* Deployment isolation or delayed update channels.
* Architectural separation between critical service functions and endpoint security failures.
* Tested continuity and recovery arrangements.

Mandatory vendor diversity is one candidate intervention, not the only one.

Two products may still share an operating-system dependency, cloud service, configuration mechanism, or administrative control plane. Diversity of vendor names does not establish independence of failure modes.

Conversely, an organization might obtain meaningful resilience without requiring every endpoint to run a different security product.

Class discussion

What property should we require: multiple vendors, or continuity under a specified common-cause failure?

This connects directly to Requirements and Specification.

The distinction is consequential: prescribing multiple vendors constrains the solution, whereas specifying an independence or continuity property leaves engineers freedom to choose how to satisfy it.

⸻

Slide 19 — The control structure extends beyond vendors

Purpose: Introduce the question of who possesses authority to enforce systemic resilience.

Visual

+----------------------------------------------------------------+
| Who can impose a system-wide constraint?                       |
|                                                                |
|              +------------------------------+                  |
|              | REGULATORS / SECTOR AUTHORITIES|                |
|              +------------------------------+                  |
|                         |            ^                         |
|             Requirements|            | Reports / evidence      |
|                         v            |                         |
|              +------------------------------+                  |
|              | CRITICAL SERVICE OPERATORS   |                  |
|              +------------------------------+                  |
|                         |            ^                         |
|                Policies |            | Operational feedback    |
|                         v            |                         |
|              +------------------------------+                  |
|              | ENTERPRISE IT / SECURITY     |                  |
|              +------------------------------+                  |
|                         |            ^                         |
|                         v            |                         |
|              +------------------------------+                  |
|              | ENDPOINTS AND SERVICES       |                  |
|              +------------------------------+                  |
|                                                                |
|  Which controller has the authority to enforce independence?   |
+----------------------------------------------------------------+

Use a cleaner, wider layout in the actual slide. The diagram is conceptual; do not imply that every sector has a regulator empowered to mandate the proposed controls.

Speaker notes

A vendor may be able to repair its software and improve its release controls.

A critical-service operator may be able to change procurement, deployment, and continuity requirements.

A sector authority may be able to impose resilience obligations across multiple organizations, where its legal mandate permits.

The causal account may therefore extend beyond the authority of the engineer conducting the investigation.

This is not a reason to omit those causes. It is a reason to identify the responsible controller and escalate the proposed intervention.

Important distinction

A failure analysis may reveal a systemic risk without establishing that regulation is necessary, effective, or proportionate.

Those are further engineering and policy judgments requiring evidence.

⸻

Slide 20 — Three models, three intervention scopes

Purpose: Synthesize the theoretical progression.

This should be one of the strongest slides in the lecture.

Visual

+----------------------------------------------------------------+
| What did each model let us change?                             |
|                                                                |
|   MODEL              QUESTION              INTERVENTION        |
|                                                                |
|   COMPONENT          What failed?         Repair the defect    |
|   / HUMAN ERROR                                                |
|                                                                |
|   SWISS CHEESE       Why did it escape?   Improve defenses     |
|                                                                |
|   STAMP              Why was the          Change controls,     |
|                      impact so broad?     dependencies, and    |
|                                           responsibilities     |
|                                                                |
|   <------------- CAUSAL BOUNDARY --------------------------->   |
|                                                                |
|  Broader explanations require more evidence and authority.     |
+----------------------------------------------------------------+

Use a progressive animation that reveals the three rows in the order encountered.

Speaker notes

Emphasize that broader is not automatically better.

A local defect may justify a local correction. A defective release process may require stronger defenses. A systemic common-cause vulnerability may require architectural or institutional changes.

The analyst should choose a causal boundary sufficient for the decision.

Do not suggest that STAMP is necessarily the correct model for every failure.

Transition

We have identified several possible interventions. Which lessons does the evidence actually justify, and how should they affect future engineering?

⸻

Movement 4 — Learning from failure

Slide 21 — A postmortem is an argument

Purpose: Distinguish observation, causal interpretation, and recommended intervention.

Visual

+---------------------------------------------------------------+
| How do we establish a lesson?                                |
|                                                               |
|  OBSERVATION                                                  |
|  Windows systems crashed after the content update            |
|          |                                                    |
|          v                                                    |
|  CAUSAL ACCOUNT                                               |
|  Content-processing assumptions were violated                |
|          |                                                    |
|          v                                                    |
|  LESSON                                                       |
|  Validate content against the interpreter's obligations      |
|          |                                                    |
|          v                                                    |
|  INTERVENTION                                                 |
|  Add an independently evaluated compatibility constraint     |
|                                                               |
|  What evidence supports each step?                            |
+---------------------------------------------------------------+

Speaker notes

A postmortem is not merely a timeline.

It advances claims about what caused an incident and what should change.

Those claims may be mistaken, incomplete, or overgeneralized.

Distinguish documented findings from the instructor’s proposed interventions.

Ask students what evidence would support the generalization from one malformed update to a broader compatibility invariant.

⸻

Slide 22 — Reflection changes the engineer

Purpose: Preserve Schön’s contribution from the original lecture.

Visual

+---------------------------------------------------------------+
| Reflection changes future judgment                            |
|                                                               |
|     DECISION                                                  |
|        |                                                      |
|        v                                                      |
|     CONSEQUENCE                                               |
|        |                                                      |
|        v                                                      |
|     REFLECTION                                                |
|        |                                                      |
|        v                                                      |
|     REPERTOIRE                                                |
|        |                                                      |
|        v                                                      |
|     FUTURE RECOGNITION                                        |
|                                                               |
|  What will an experienced engineer notice next time?          |
+---------------------------------------------------------------+

Speaker notes

Introduce Donald Schön’s reflective practice.

Experience does not automatically produce expertise. Engineers must compare what they expected with what occurred and determine what the difference means.

Use the CrowdStrike example:

An engineer who has investigated this incident may subsequently recognize that data-only updates can change program behavior in consequential ways.

They may ask whether an apparently harmless configuration or content change is actually interpreted by privileged code.

The lesson is broader than remembering the particular field-count mismatch.

Do not present reflection as a substitute for mechanical controls.

⸻

Slide 23 — The next engineer may not remember

Purpose: Introduce the limits of personal learning.

Visual

+---------------------------------------------------------------+
| What happens when the engineer leaves?                        |
|                                                               |
|    INCIDENT                                                  |
|       |                                                       |
|       v                                                       |
|    ENGINEER LEARNS                                           |
|       |                                                       |
|       v                                                       |
|    [Time passes]                                             |
|       |                                                       |
|       v                                                       |
|    NEW ENGINEER / AGENT                                      |
|       |                                                       |
|       v                                                       |
|    NEW CONTENT UPDATE                                        |
|                                                               |
|  Where will the new engineer encounter the old lesson?        |
+---------------------------------------------------------------+

Speaker notes

Individual expertise is valuable, but engineering organizations cannot rely on every future contributor remembering every previous incident.

The problem is particularly visible when work is delegated to agents. An agent may have substantial implementation capability without knowing the organization’s incident history.

Ask:

Should this lesson live in a postmortem, a schema, a validator, or a release gate?

The answer depends on what the lesson establishes and how reliably it can be checked.

⸻
Slide 24 — Convert lessons into engineering structure

Purpose: Connect the incident to Alignment and governance conversion.

Use the existing five-part diagnostic framework, applying each category to CrowdStrike.

Visual

+----------------------------------------------------------------+
| What was missing, and where should the lesson live?            |
|                                                                |
|  WHAT WAS MISSING?            ENCODE IT AS                      |
|                                                                |
|  OBLIGATION                   Invariant                         |
|  What must hold?              Content must be safe to process   |
|                                                                |
|  REPRESENTATION               Model                             |
|  What must we express?        Content/interpreter contract      |
|                                                                |
|  EVIDENCE                     Sensor                            |
|  What must we observe?        Compatibility test results        |
|                                                                |
|  EVALUATION                   Validator                         |
|  How do we decide?            Reject incompatible content       |
|                                                                |
|  ENFORCEMENT                  Constraint or gate                |
|  What must we prevent?        Block unsafe releases            |
|                                                                |
|  Diagnose what was missing before adding another control       |
+----------------------------------------------------------------+

The final slide should not be a dense wall of text. Use five horizontal rows with consistent typography and restrained color.

Animation

Reveal the left column first. Ask students what corresponding engineering artifact or mechanism would preserve each lesson. Then reveal the right column.

Speaker notes

The five categories are diagnostic questions, not five mandatory steps.

A failure may expose an obligation nobody had articulated. It may reveal that the obligation was known but inadequately represented, that evidence was missing, that the available evidence was evaluated incorrectly, or that a correct evaluation did not prevent an unsafe action.

The response depends on the diagnosis.

For CrowdStrike, a compatibility invariant between content and interpreter is an illustrative intervention. Its precise formulation must follow the documented failure mechanism.

Connect explicitly to Alignment:

* A constraint excludes some unacceptable states or actions.
* A sensor produces evidence.
* A validator evaluates evidence against an obligation.
* A gate controls admission across an engineering boundary.

The same mechanism may perform several roles.

Important: Do not claim CrowdStrike lacked all five categories. Some controls existed but proved inadequate. The examples in the right column are proposed engineering responses, not necessarily descriptions of CrowdStrike’s actual remediation.

⸻

Slide 25 — Where should the lesson live?

Purpose: Show that different lessons require different forms of engineering knowledge and different authorities.

This is the point at which the local and systemic analyses come together.

Visual

+----------------------------------------------------------------+
| Where should the lesson live?                                  |
|                                                                |
|  LESSON                          ENGINEERING STRUCTURE         |
|                                                                |
|  Content must match its           Schema and compatibility     |
|  interpreter's assumptions        validator                    |
|                                                                |
|  A defective update should        Progressive deployment      |
|  not reach every endpoint         and release controls         |
|                                                                |
|  Critical services must           Isolation and continuity    |
|  tolerate endpoint failure        architecture                |
|                                                                |
|  Shared dependencies can          Resilience requirements     |
|  produce correlated failures      and sector oversight        |
|                                                                |
|                    WHO HAS AUTHORITY?                          |
|                                                                |
|       Vendor       Enterprise       Sector authority           |
+----------------------------------------------------------------+

Use an additional visual encoding for responsibility. For example, a small label beside each row:

* Vendor
* Vendor / enterprise
* Enterprise
* Enterprise / sector authority

Do not suggest that every sector authority currently has the legal power to impose such requirements.

Speaker notes

The same incident can justify interventions at several levels.

A vendor can improve its content-processing contracts, validators, and release controls.

An enterprise can invest in isolation, staged deployment where supported, and continuity arrangements.

A sector authority may be able to establish resilience obligations across organizations.

These interventions address different failure classes.

The lesson’s destination follows from the property it is intended to preserve and the authority required to enforce it.

Ask:

If a hospital must continue delivering essential services when its endpoint security software fails, whose requirement is that?

Students should recognize that the answer is not simply “CrowdStrike’s.”

The hospital or health system bears responsibility for its service continuity, while vendors, platform providers, and potentially regulators control parts of the environment on which that continuity depends.

This returns to the Requirements and Specification units: responsibilities must be allocated across the machine and its environment.

⸻

Slide 26 — How do we know the intervention worked?

Purpose: Prevent the lecture from ending with the assumption that proposing a control establishes its effectiveness.

Connect to Validation and Measurement.

Visual

+----------------------------------------------------------------+
| How would we know the system is safer?                         |
|                                                                |
|  INTERVENTION                  EVIDENCE                         |
|                                                                |
|  Compatibility validator       Mutation / negative tests       |
|                                                                |
|  Progressive deployment        Fault-injection exercise        |
|                                                                |
|  Endpoint failure isolation    Service-continuity test         |
|                                                                |
|  Independent critical paths    Common-cause analysis          |
|                                                                |
|                                                                |
|       Intervention                                              |
|            |                                                    |
|            v                                                    |
|       Predicted property                                        |
|            |                                                    |
|            v                                                    |
|       Evidence under stated conditions                          |
|            |                                                    |
|            v                                                    |
|       Engineering judgment                                      |
|                                                                |
|  What uncertainty remains?                                      |
+----------------------------------------------------------------+

Speaker notes

A corrective action is a hypothesis about how the system will behave differently.

The engineer should identify the property the intervention is expected to establish and the evidence that would support it.

For example:

A compatibility validator should reject malformed content that violates the interpreter’s contract. Tests should establish its behavior over the relevant input classes, including invalid and boundary cases.

Progressive deployment should limit the number of endpoints exposed before a failure can be detected and further distribution halted. The relevant evidence includes detection latency, rollout progression, and whether the control can actually stop distribution.

Service-continuity arrangements should be exercised under realistic endpoint failures.

Diversity requirements should be evaluated against the actual dependencies and failure modes of the proposed alternatives.

Do not equate the existence of a control with evidence of its effectiveness.

An untested recovery plan is not evidence that recovery will succeed.

This slide closes the CrowdStrike investigation.

Transition:

We have developed a method for investigating failure and converting justified lessons into engineering structure. Can we apply it to a different software incident?

⸻

Movement 5 — Transfer to Cloudflare

Slide 27 — July 2, 2019: Cloudflare goes down

Purpose: Introduce a second incident without repeating the entire investigation.

Use Cloudflare’s July 2019 WAF outage as a compact technical case.

Visual

+----------------------------------------------------------------+
| July 2, 2019: Cloudflare's WAF outage                          |
|                                                                |
|                                                                |
|   WAF RULE                                                    |
|      |                                                         |
|      v                                                         |
|   REGULAR EXPRESSION                                          |
|      |                                                         |
|      v                                                         |
|   CATASTROPHIC BACKTRACKING                                   |
|      |                                                         |
|      v                                                         |
|   EXCESSIVE CPU CONSUMPTION                                   |
|      |                                                         |
|      v                                                         |
|   SERVICE DISRUPTION                                          |
|                                                                |
|                                                                |
|  How could one regular expression disrupt a global service?    |
+----------------------------------------------------------------+

The final slide should contain a small, authentic excerpt of the problematic regular expression, taken from Cloudflare’s postmortem, if it can be made legible.

Do not use a fabricated regex.

A small diagram of backtracking behavior may be more useful than reproducing the entire expression.

Speaker notes

Explain that Cloudflare deployed a WAF rule containing a regular expression whose matching behavior could require excessive computation.

The resulting CPU consumption disrupted Cloudflare services.

The important technical property is that regular-expression matching time can depend dramatically on the structure of the expression, the matching algorithm, and the input.

Do not imply that all regular-expression engines exhibit the same behavior.

Connect to Design: choosing a matching mechanism affects performance guarantees.

Connect to Validation: testing representative inputs is not necessarily sufficient to establish acceptable worst-case behavior.

Keep the narrative to approximately two minutes. This is a transfer exercise, not a second full case study.

Source: Cloudflare’s official July 2019 postmortem, Details of the Cloudflare outage on July 2, 2019.

⸻

Slide 28 — Diagnose Cloudflare

Purpose: Test whether students can apply the three causal models without being led through the answers.

Visual

+----------------------------------------------------------------+
| Diagnose the Cloudflare outage                                |
|                                                                |
|  MODEL                  QUESTION                               |
|                                                                |
|  COMPONENT              What failed locally?                   |
|                                                                |
|  SWISS CHEESE           Why did the defect escape?             |
|                                                                |
|  STAMP                  What controls and feedback              |
|                         permitted the consequences?             |
|                                                                |
|                                                                |
|  YOUR TASK                                                     |
|                                                                |
|  1. Choose an intervention                                    |
|  2. Identify the failure class it addresses                   |
|  3. Decide where the lesson should live                       |
|                                                                |
|                                                                |
|  What evidence would establish that your intervention works?   |
+----------------------------------------------------------------+

Classroom activity: 5–6 minutes

Students work in pairs or small groups.

Ask them to choose one causal model and propose an intervention supported by the incident evidence.

They must explain:

1. What the model preserves.
2. What failure mechanism it explains.
3. What intervention follows.
4. What evidence would support the intervention.
5. Who has authority to implement it.

Do not require every group to use STAMP. A component-level or defense-in-depth intervention may be entirely appropriate.

Speaker notes: Possible answers

Component-level:

The regex exhibited pathological performance under the matching mechanism. An intervention might be to reject expressions with dangerous complexity, use a matching algorithm with suitable complexity guarantees, or impose resource bounds.

Defense-in-depth:

The deployment and validation process failed to prevent the problematic rule from affecting production. Students might propose performance testing, complexity analysis, staged deployment, resource isolation, or deployment controls.

STAMP:

The investigation might examine how WAF rule authors, validation systems, deployment controllers, operational monitoring, and service operators interacted.

A possible safety constraint is that a WAF rule update must not consume enough resources to compromise the availability of unrelated traffic.

The corresponding control structure would need to show how that constraint is enforced and what feedback reaches the relevant controllers.

Do not reward students simply for selecting the broadest model. Reward them for identifying an intervention justified by the model and the evidence.

Instructor debrief

The strongest response is not necessarily the one proposing the most controls.

It identifies a consequential failure class and chooses an intervention that addresses that class at acceptable cost.

⸻

Slide 29 — Failure should change future engineering

Purpose: Close the lecture and Act II.

The slide should synthesize the unit without introducing another framework.

Visual

+----------------------------------------------------------------+
| Failure should change future engineering                      |
|                                                                |
|                                                                |
|       OBSERVE                                                  |
|          |                                                     |
|          v                                                     |
|       EXPLAIN                                                  |
|          |                                                     |
|          v                                                     |
|       LEARN                                                    |
|          |                                                     |
|          +--------------------+                                |
|          |                    |                                |
|          v                    v                                |
|       REFLECTION          ENGINEERING STRUCTURE                |
|          |                    |                                |
|          v                    v                                |
|       Future judgment     Future constraints                   |
|                                                                |
|                                                                |
|  What will be different when the next engineer or agent acts?   |
+----------------------------------------------------------------+

Use two visually distinct branches for the two outcomes.

Speaker notes

Return to the premise of the unit.

Engineering operates under incomplete knowledge. Failures expose discrepancies between what engineers believed and what the system actually did.

A causal explanation determines what lessons the evidence supports.

Some lessons change the engineer. Reflection develops recognition and judgment that can be applied to future situations.

Other lessons should change the engineering environment. A consequential invariant, architectural constraint, validator, or release gate can preserve knowledge for future work.

The engineer must decide which lessons deserve durable representation and which interventions are justified.

Connect to Act II:

Delegation determines what work and authority to grant.

Modeling makes consequential knowledge explicit.

Alignment connects obligations to mechanisms that govern work.

Failure-Aware Engineering uses observed consequences to test and revise those decisions.

Closing question:

What will be different when the next engineer or agent acts?

Do not add a second aphorism beneath the question.

⸻

Part V — Slide implementation requirements

6. Visual style

Follow the established MAGE presentation style guide.

In particular:

* Use bold titles without terminal periods.
* Avoid decorative em dashes in slide titles.
* Prefer right-angle connectors in technical diagrams.
* Use consistent typography and generous spacing.
* Use the established light-blue treatment for definitions.
* Reserve strong colors for meaningful distinctions.
* Avoid small explanatory prose at the bottom of slides.
* Do not add generic motivational aphorisms.
* Keep questions visually distinct from factual claims.
* Use diagrams to expose engineering relationships, not merely decorate the slide.

The ASCII diagrams above are conceptual layouts, not instructions to reproduce monospace text as slide graphics.

Reconstruct them using native PowerPoint shapes and connectors wherever practical.

All diagrams should remain editable.

Consistent visual vocabulary

Use the same visual treatment for recurring concepts.

Concept	Visual treatment
Observed fact	Neutral dark text
Hypothesis or proposed intervention	Clearly marked as proposed
Unsafe behavior or failure propagation	Red
Effective control or constraint	Green
Engineering model	Light-blue panel
Student question	Consistent question treatment
Causal boundary	Bounded region or nested outline
Control action	Downward or directed arrow
Feedback	Distinct returning arrow

Do not use red and green as the sole means of distinguishing information.

7. Animation

Animations should reveal causal structure progressively.

Use animation for:

* Revealing the shared dependency in the initial incident.
* Building the technical failure sequence.
* Introducing Swiss cheese defenses one at a time.
* Expanding the causal boundary on Slide 13.
* Building STAMP’s control and feedback relationships.
* Showing common-cause propagation on Slide 17.
* Revealing intervention alternatives after students have proposed their own.
* Building the reflection/governance-conversion distinction.

Avoid animation merely to make text appear.

A useful rule:

Animate changes in the audience’s model, not changes in the slide’s decoration.

8. Speaker notes

Every substantive slide should contain speaker notes.

The notes should provide:

1. The engineering point of the slide.
2. The relevant factual background.
3. The question to ask students.
4. Expected answers or misconceptions.
5. The transition to the next slide.
6. Source attribution for consequential factual claims.

The notes should distinguish documented findings from the instructor’s interpretation and proposed interventions.

Do not turn the notes into a verbatim lecture script.

9. Source discipline

Use primary sources wherever available.

For CrowdStrike, use the July 2024 Preliminary Post Incident Review and August 2024 Root Cause Analysis.

For the broader impact, use Microsoft’s published analysis and estimates.

For Cloudflare, use the July 2019 postmortem.

For the theories, use Reason and Leveson.

Specific safeguards:

* Do not invent details of CrowdStrike’s validation or deployment pipeline.
* Do not conflate the triggering content update with the underlying implementation defect.
* Do not imply that all Windows systems were affected.
* Do not treat mandatory vendor diversity as an established remedy.
* Do not portray STAMP as merely a dependency graph.
* Do not suggest that Swiss cheese can explain only local failures.
* Do not claim that a postmortem’s proposed corrective action has been empirically demonstrated effective merely because it was adopted.

The lecture should distinguish:

Observed → Inferred → Proposed → Validated

These are epistemic categories, not stages that every claim necessarily passes through.

⸻

Part VI — Course lander update

10. Scope of the change

Update:

course/lectures/act-2-delegation-and-control/04-failure-aware-engineering/index.md

Do not edit the generated stapled review copy.

The existing lander is conceptually strong. It already explains causal models, the limits of failure analysis, reflection, governance conversion, and the closing of the modeling loop. The revision should preserve those ideas while giving the CrowdStrike investigation a substantial role in the exposition.

The lander should not become a transcript of the slides.

It should explain why the case was chosen, what engineering questions it raises, and how the causal models support the unit’s central judgment.

Specific editorial changes

Retain:

* The existing premise.
* The distinction between failure observation and causal explanation.
* The principle that broader causal models are not automatically better.
* The relationship to Act I engineering activities.
* The question Why didn’t we know?
* Schön’s reflective practice.
* Governance conversion.
* The modeling-loop conclusion.

Change:

* Reduce four causal-model categories to three.
* Integrate CrowdStrike as the running case.
* Explain common-cause failure and systemic resilience.
* Make authority and locus of control concrete.
* Add Cloudflare as the transfer exercise.
* Ensure the lander distinguishes documented findings from candidate interventions.

The existing lander already states that a useful failure model should extend at least to the locus of control and that broader models require purposeful reduction. Preserve that argument, but make clear that causes outside the analyst’s authority may still need to be represented and escalated. course-landers-stapled.md

⸻

Part VII — Proposed replacement lander

The following is proposed full copy for the body of the Failure-Aware Engineering lander.

Preserve the existing frontmatter and reading metadata unless the references require updating.

Failure-Aware Engineering

Premise. Failure is a predictable engineering outcome. Engineering judgment develops when engineers connect decisions to their consequences and allow experience to change future decisions.

Engineering is practiced with incomplete knowledge, imperfect models, fallible people, and finite evidence. Failure therefore produces new evidence: something engineers expected to hold did not. But a failure is only an observation. It does not tell us why the expectation was wrong or what should change.

Between observation and corrective action stands a chain of engineering judgment. Engineers construct a causal account of what happened, derive lessons from that account, and decide what to change. Each step can be wrong. A bad failure analysis can preserve the wrong lesson just as effectively as a good one can preserve the right lesson.

This unit develops that reasoning through the July 2024 CrowdStrike Falcon outage. A defective security-content update caused Windows systems to crash, disrupting organizations across multiple sectors. The immediate technical failure is understandable as a software defect. Explaining why it escaped the engineering process, and why its consequences extended so widely, requires us to examine progressively more of the system.

The case introduces three models of failure: component and human error, defense in depth, and systems-theoretic accident analysis. Each preserves different causal relationships and

===

(is this proposal changing from human error to component-level? I think it's appropriate, and groundable in STAMP thinking rather than Reason-thinking, but that's OK)

==

Yes. The proposal has shifted from human error to component-level failure, and I think that’s an improvement, both pedagogically and theoretically.

The distinction matters because human error already suggests a particular causal explanation: someone made a mistake. Component-level failure describes the boundary of the initial analysis without prejudging why the component failed.

For CrowdStrike, the immediate explanation is a mismatch between content and the assumptions of its interpreter, resulting in an unsafe memory access. We can establish that mechanism without attributing negligence to an individual engineer.

This also gives us a cleaner theoretical progression:

Model	Causal focus	CrowdStrike question
Component-level	Individual components, defects, and causal chains	What mechanism caused Windows to crash?
Swiss cheese (Reason)	Multiple defenses and their weaknesses	Why did validation and release controls fail to prevent deployment?
STAMP (Leveson)	Safety constraints, control actions, feedback, and interactions	Why could this failure propagate across organizations and critical services?

One theoretical qualification: component-level causal analysis is not uniquely attributable to STAMP. Leveson discusses traditional chain-of-events and component-failure models partly to explain their limitations and motivate systems-theoretic analysis. That makes her treatment a useful foundation for introducing the first model, but we should not present it as a component-failure theory she advocates.

I’d therefore make three small changes to the Fable instructions:

1. Replace “component/human-error model” with “component-level causal model” throughout the lecture and lander.
2. Retain human error as a possible explanation within component-level analysis, not as the defining explanation. A defective component can result from incorrect assumptions, design defects, implementation errors, or other causes.
3. Present the three models as different causal boundaries, while acknowledging that Swiss cheese and STAMP can also be applied at multiple scales.

The slide 5 title should become:

Explanation 1: A component-level failure

And the central diagram remains:

  Defective content
         |
         v
  Unsafe processing
         |
         v
    Windows crash

The accompanying question becomes:

What caused the component to fail, and what would repair it?

The transition to Swiss cheese then works naturally:

We have explained how the endpoint crashed. But we have not explained why an update capable of causing that crash reached production.

This is also consistent with the lander’s existing argument that failure analysis should preserve the minimum causal structure needed for the engineering decision.

One further benefit: Removing human error from the first model avoids making the lecture appear to progress from blaming people to discovering systems. That’s a familiar safety-engineering narrative, but it isn’t quite the intellectual objective here. We want students to learn how to choose the causal boundary appropriate to the intervention, not simply that blaming individuals is inadequate.

===

Here's the whole proposal. Any edit suggestions before we build?

===

The lecture plan is strong enough to build, but I would make five substantive edits first. The most important concern is that the STAMP section risks becoming an argument for vendor diversity rather than an investigation of system safety. The other major issue is that the proposed replacement lander is incomplete.

1. Fix the component-level terminology throughout

Priority: Must fix

We already agreed to replace human error with component-level causal analysis, but the change has not propagated through the proposal.

It remains in the instructional objectives, narrative diagram, slide specifications, synthesis, Cloudflare exercise, and proposed lander.

Use these three names consistently:

Model	Question
Component-level causal analysis	What mechanism produced the failure?
Swiss cheese (Reason)	Why did the defenses permit it?
STAMP (Leveson)	What control structure permitted the hazardous outcome?

On slide 5, replace:

Explanation 1: A defective component

with:

Explanation 1: A component-level failure

This is more precise. The immediate failure involves an interaction between content and its interpreter, rather than necessarily one independently defective component.

Also, don’t attribute component-level analysis to Reason or Leveson as though either originated it.

The three approaches are complementary analytical perspectives, not three equally formal theories.

2. Strengthen the STAMP section by identifying an actual control inadequacy

Priority: Must fix

Slides 13–20 are the most intellectually ambitious part of the lecture.

The proposed control structures are good, but the narrative moves rather quickly from explaining STAMP to discussing mandatory vendor diversity.

That risks obscuring STAMP’s distinctive contribution.

STAMP asks whether the control structure adequately enforces safety constraints. In particular, controllers may issue unsafe control actions because their process models are inadequate, feedback is insufficient, or the available control actions cannot maintain safety.

I would make slide 16 explicitly identify the system-level safety constraint.

Current title:

The vendor is not the whole system

Keep that title, but add:

Safety constraint: Failure of an endpoint security product must not disable essential organizational services.

Then ask:

Which controller can enforce this constraint?

The answer is not CrowdStrike alone.

This is where STAMP becomes useful. The analysis has identified a constraint that cannot be satisfied entirely within the vendor’s engineering system.

The diagram should make that relationship visible:

        CROWDSTRIKE
        Release controls
              |
              | Updates
              v
      +------------------+
      | Windows endpoint |
      +------------------+
              |
              | Supports
              v
      +------------------+
      | Critical service |
      +------------------+
              ^
              |
       Continuity controls
              |
       ENTERPRISE OPERATOR

Show feedback from endpoints and services to the enterprise operator.

Then slide 17 introduces common-cause failure, and slide 18 asks whether diversity is an appropriate intervention.

That sequence is stronger:

Control inadequacy → Shared vulnerability → Candidate requirement → Alternative interventions.

One qualification: the proposed safety constraint is a candidate requirement for critical-service operators, not a documented universal obligation that existed before the outage.

3. Revise slide 18 to compare architectures, not merely vendors

Priority: Strong recommendation

The current slide contrasts a shared vendor with diverse vendors.

That’s reasonable, but it risks teaching that the solution to common-cause failure is multiple vendors.

The more interesting engineering question is whether critical functions possess independent failure paths.

I would change the diagram:

+----------------------------------------------------------+
| How can critical services survive a shared failure?      |
|                                                          |
|   SHARED FAILURE PATH        INDEPENDENT FAILURE PATHS    |
|                                                          |
|      Vendor A                   Vendor A                  |
|         |                          |                      |
|    +----+----+                     v                      |
|    |         |                 Primary service            |
|    v         v                      |                      |
|  System 1  System 2                 X  Failure             |
|                                    |                      |
|                              Backup service              |
|                                    ^                      |
|                                    |                      |
|                            Independent dependency        |
|                                                          |
|  What independence does the architecture actually need?  |
+----------------------------------------------------------+

In the notes, compare vendor diversity, deployment isolation, independently operable fallback services, and recovery capabilities.

This is a direct connection to the Architecture unit: choosing boundaries and dependencies to support a system property.

It also provides an excellent Requirements/Specification distinction.

Requirement: Essential services remain available under specified endpoint failures.

Candidate architectural mechanism: Independent fallback infrastructure.

Candidate procurement mechanism: Vendor diversity.

The latter two are possible ways to satisfy the first, not requirements that necessarily follow from the incident.

4. Avoid turning the learning section into a second Alignment lecture

Priority: Strong recommendation

Slides 21–26 are individually sensible, but six consecutive slides on learning and controls may feel repetitive after the detailed intervention discussion in slides 10–11 and 18–20.

In particular:

* Slide 21 explains how to establish a lesson.
* Slide 22 introduces reflection.
* Slide 23 asks how the next engineer learns.
* Slide 24 introduces governance conversion.
* Slide 25 asks where lessons should live.
* Slide 26 asks how interventions should be validated.

The progression is coherent, but slides 23–25 substantially overlap.

I would combine slides 23 and 24.

Use the question:

Where will the next engineer encounter the lesson?

Then present the five governance-conversion diagnoses and their corresponding engineering structures.

The next slide can focus on the important new distinction: different lessons require different authorities.

That gives:

Slide	Purpose
21	What evidence supports the causal lesson?
22	Reflection changes the engineer
23	Governance conversion changes the environment
24	Different lessons require different authorities
25	How do we know the intervention worked?

This recovers a slide and reduces repetition without sacrificing an intellectual objective.

I would retain the Cloudflare exercise at the end. It is important that students apply the ideas rather than merely hear about them.

5. Finish the course lander before building

Priority: Must fix

The uploaded proposal’s replacement lander stops midway through its opening discussion of the three models, after which the document contains our earlier conversation about component-level analysis. It is not yet a complete replacement. 2-4-redux.md

I would not rewrite the existing lander from scratch. Its current organization is already good:

1. Models of failure
2. Why didn’t we know?
3. What should change?
4. Failure closes the modeling loop
5. Failure as part of engineering

The existing discussion of causal boundaries, validation evidence, Schön, and governance conversion is worth preserving. course-landers-stapled.md

Instead, add a substantial case-study section after the introduction and update the model descriptions.

Proposed new section: Investigating the CrowdStrike outage

I would insert the following after the opening three paragraphs.

Investigating the CrowdStrike outage

On July 19, 2024, a defective CrowdStrike Falcon content update caused widespread crashes of Windows systems. The consequences extended beyond individual computers: airlines, hospitals, financial institutions, and other organizations experienced substantial disruption. Microsoft estimated that approximately 8.5 million Windows devices were affected.

The immediate technical explanation concerns the interaction between the content update and the software responsible for interpreting it. A mismatch between their assumptions resulted in an unsafe memory access and a system crash. At this scope, the engineering question is relatively narrow: What mechanism failed, and how could we correct it?

But correcting the mechanism does not explain why the update reached production. CrowdStrike’s subsequent investigation identified weaknesses in the validation and release arrangements surrounding the content. Reason’s Swiss cheese model offers a useful representation: failures can pass through several defenses when their weaknesses align. The engineering question becomes which defenses should have detected or contained the failure, and why did they not?

The incident raises a third question. Why could one vendor’s defective update disrupt essential services across many otherwise independent organizations? The affected systems shared a consequential software dependency. This is a common-cause failure: components or organizations that appear independent can fail together because they depend on the same underlying mechanism.

Leveson’s STAMP provides a way to investigate the larger system. It treats safety as a control problem involving constraints, controllers, controlled processes, and feedback. CrowdStrike controlled aspects of its software and update distribution; customer organizations controlled aspects of their operating environments and continuity arrangements; platform vendors and sector authorities possessed other forms of influence and authority. No single actor necessarily controlled the entire system.

This broader analysis exposes additional candidate interventions. Critical services might require independent fallback systems, stronger isolation from endpoint failures, more controlled update deployment, or diversity among security products. These alternatives have different costs and address different failure classes. The outage demonstrates widespread common-cause exposure; it does not establish that mandatory vendor diversity is the uniquely appropriate remedy.

The case illustrates the central judgment of failure analysis: What causal structure must we preserve to identify an effective intervention? A local defect may justify a local correction. A failure of engineering defenses may justify changes to validation or deployment. A systemic vulnerability may require changes to architecture, organizational responsibilities, or requirements imposed by another authority. Broader analysis is useful when the engineering decision requires it, not merely because it is broader.

Then retain and revise the existing Models of failure section, reducing it to the three models.

The rest of the lander should remain substantially intact, with concrete CrowdStrike examples replacing the hypothetical examples where appropriate.

Finally, add a brief Applying the method section near the end:

Applying the method

The lecture concludes with Cloudflare’s July 2019 outage, in which a Web Application Firewall rule containing a regular expression caused excessive CPU consumption and disrupted services. Students apply the same causal models to identify the immediate mechanism, investigate the defenses that permitted deployment, and consider what control structures could have limited the consequences.

The exercise asks students to select an intervention, identify the failure class it addresses, and explain what evidence would establish its effectiveness. The objective is not to choose the broadest causal model, but to choose one adequate for the engineering decision.

This would give the lander a concrete instructional narrative without turning it into a slide transcript.

⸻

Two smaller corrections

Slide 13: The nested boxes are conceptually misleading.

The proposed diagram places CrowdStrike’s engineering organization inside enterprise IT operations. The notes correctly acknowledge that this is not a literal organizational containment relationship.

But if the diagram requires that qualification, I would change it.

Use progressively expanding analytical boundaries around a dependency/control graph instead of nested organizational boxes. CrowdStrike and enterprise IT should appear as separate actors within the larger sociotechnical system.

Slide 26: Match evidence to the actual intervention.

The current table proposes a fault-injection exercise as evidence for progressive deployment.

That is insufficiently specific. Progressive deployment should be evaluated through rollout limits, detection latency, telemetry, and the ability to halt further distribution. Fault injection may be part of that evaluation, but it is not the property being established.

Similarly, common-cause analysis provides evidence about dependency structure; it does not by itself demonstrate that independent critical paths will maintain service availability.

These are good opportunities to reinforce the Validation unit’s distinction between a property, the evidence mechanism, and the judgment supported by that evidence.

⸻

Final assessment

I would approve the redesign with these changes.

The strongest aspect is the investigative progression. Students encounter the immediate technical defect, then discover why local repair is insufficient, then examine the system-level conditions that made the consequences widespread.

The STAMP material has the potential to be especially effective because it shows that the relevant engineering system may extend beyond the organization that produced the defect. That is a substantial conceptual step for undergraduates.

My main concern is overemphasizing mandatory diversity. It is a provocative and worthwhile engineering question, but the central lesson should be about identifying safety constraints, common-cause dependencies, and the controllers capable of enforcing those constraints.

I’d make edits 1, 2, and 5 mandatory before Fable builds. Edits 3 and 4 are strong recommendations. The rest of the proposal is ready.

===

The official Crowdstrike postmortem should be added as a reading. Give that as well including the URL.

===

Add CrowdStrike’s official Root Cause Analysis (August 6, 2024) as a required reading for the Failure-Aware Engineering unit.

Reading: CrowdStrike, External Technical Root Cause Analysis — Channel File 291 Incident (2024).

⁠CrowdStrike — External Technical Root Cause Analysis (PDF)

Instructions for Fable

Add this to the course lander’s reading metadata, retaining the existing readings.

CrowdStrike (2024), External Technical Root Cause Analysis. Required. The official technical postmortem for the July 19, 2024 Falcon outage. As you read, distinguish the technical cause from the weaknesses in the engineering process, and consider which questions require examining the larger system.
