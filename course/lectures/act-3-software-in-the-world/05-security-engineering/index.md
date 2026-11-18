---
title: Security Engineering
sessions:
  - "Security I: Threat Modeling"
  - "Security II: Controls & Assurance"
readings:
  groups:
    - heading: Threat Modeling
      items:
        - cite: shostack2008threatmodeling
          annotation: 'Shostack, ["Experiences Threat Modeling at Microsoft"](https://shostack.org/files/papers/modsec08/Shostack-ModSec08-Experiences-Threat-Modeling-At-Microsoft.pdf) (2008). An account of threat modeling as a repeatable engineering practice: data-flow diagrams represent the system, STRIDE supplies prompts for examining its elements, and model validation checks whether the representation matches the implementation. Pay particular attention to the validation heuristics and ask whether your project''s diagram includes every relevant entry point and trust boundary.'
        - cite: anderson2020security
          locator: 'chapter 27, Secure Systems Development'
          annotation: 'Anderson, *Security Engineering*, 3rd edition, Chapter 27, "Secure Systems Development" (2020; [the author makes the chapters freely available](https://www.cl.cam.ac.uk/~rja14/book.html)). Security requirements emerge from a system''s operating environment, assets, and plausible adversaries rather than from a generic checklist. Sample the sections relevant to your project and consider which environmental facts must be known before a threat can be prioritized.'
        - cite: sommerville2011
          locator: 'chapter 14, sections 14.1 and 14.2'
          annotation: 'Sommerville, *Software Engineering*, 9th edition, Chapter 14, Sections 14.1 to 14.2, "Security Engineering." The chapter introduces security risk management and design for security. Compare its account with the model-join analysis: which questions can be answered from the system model, and which require information about adversaries and the operating environment? The 10th edition reorganizes this material under Chapter 13.'
    - heading: Controls & Assurance
      items:
        - cite: mitre-cwe
          locator: 'the CWE Top 25 as an entry point'
          annotation: 'MITRE, [Common Weakness Enumeration](https://cwe.mitre.org/), with the [CWE Top 25](https://cwe.mitre.org/top25/) as a way in. A CWE names a class of defect; a CVE names one disclosed vulnerability in one product. The two get used interchangeably often enough that settling the distinction early is worth the few minutes it takes. Choose three weaknesses, read their descriptions, consequences and relationships to neighboring entries, and write down what a system model would have to contain before you could decide whether each one matters to your project. Notice what the catalogue does not give you: neither an entry nor an identifier establishes that the code in front of you is exploitable under its actual configuration, which is why Lecture 2 treats a weakness class as the start of an investigation rather than its conclusion.'
        - cite: saltzer1975protection
          locator: 'the design-principles discussion in Section I'
          annotation: 'Saltzer and Schroeder, ["The Protection of Information in Computer Systems"](https://web.mit.edu/Saltzer/www/publications/protection/), *Proceedings of the IEEE* 63, no. 9 (1975). Section I''s design-principles discussion runs a few pages; the 1970s protection-hardware survey that follows is not what this unit draws on. Each principle states an engineering question rather than a slogan: least privilege asks what authority a component actually requires, complete mediation asks whether any path reaches the operation without passing the check. Both principles answer a case from Lecture 2. Decide which principle a library inherits a violation of when it is granted shell access it never needs, and which one an administrative endpoint violates when it reaches the same operation without the authorization check. Then decide which of the principles your own project satisfies by construction and which only by discipline.'
        - cite: grahamcumming2019cloudflare
          annotation: 'Graham-Cumming, ["Details of the Cloudflare Outage on July 2, 2019"](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/) (Cloudflare, 2019). A single firewall rule carrying a regular expression with pathological backtracking saturated CPU across the network and took service down for 27 minutes. No attacker was involved, because the rule was deployed internally; the algorithmic weakness it exposed is exploitable as a denial of service all the same, which is what makes this a security reading and not only a reliability one. Settle four things: what made certain inputs expensive, how an attacker reaches that behavior deliberately, why the rule reached production so broadly, and what control would have caught it.'
        - cite: amusuo2025ztdjava
          locator: 'Figure 1, and sections IV and V'
          annotation: 'Amusuo et al., ["ZTDJava: Mitigating Software Supply Chain Vulnerabilities via Zero-Trust Dependencies"](https://arxiv.org/abs/2310.14117) (ICSE 2025). Figure 1 and Sections IV to V show how a library''s access to files, networks, and shell execution can be authorized independently of the application''s broader permissions. Trace the threat model, enforcement mechanism, and stated limitations. Which attacks does the control constrain, and which assumptions must hold for its guarantee?'
        - cite: thompson1984trust
          annotation: 'Thompson, ["Reflections on Trusting Trust"](https://doi.org/10.1145/358198.358210), *Communications of the ACM* 27, no. 8 (1984). Three pages, delivered as a Turing Award lecture, and they end an argument most engineers start by assuming they have already won. A compiler can insert behavior into an executable that appears nowhere in the source being reviewed, and can hide the insertion from a reading of its own source too. The example makes the trusted computing base concrete: it is not an abstraction but a specific list of artifacts whose behavior your evidence never examined. Ask what claims about a source repository would stop being persuasive if the build toolchain were under an adversary''s control, and which of your project''s current evidence would survive that.'
        - cite: nistir8397
          locator: 'section 2, the eleven recommendations'
          annotation: 'Black, Guttman and Okun, [NISTIR 8397, *Guidelines on Minimum Standards for Developer Verification of Software*](https://doi.org/10.6028/NIST.IR.8397) (NIST, 2021). Section 2 names eleven techniques and says what each is for, among them threat modeling, static analysis, fuzzing, hardcoded-secret review and checking included components; section 4 goes beyond this unit. These are minimums rather than a recipe, and the document stays careful that each technique produces evidence about the property it examines and nothing else, the distinction behind this unit''s claim, control and evidence table. Which of the eleven could you run this week, and what would each leave unexamined?'
        - cite: shacham2007geometry
          annotation: 'Shacham, ["The Geometry of Innocent Flesh on the Bone: Return-into-libc without Function Calls (on the x86)"](https://doi.org/10.1145/1315245.1315313), ACM CCS 2007. **Advanced and fabulous**, and the x86 detail is not the point. An attacker who controls the execution path can assemble arbitrary computation from short instruction sequences already sitting in executable memory, injecting no code at all. That is the precise reason W⊕X constrains one attack strategy without establishing control-flow integrity, and the paper is the cleanest demonstration of what changes in an attacker''s strategy once a defense rules out injected instructions. Set it beside the Cloudflare postmortem: one exploits the complexity of an ordinary operation, the other repurposes individually legitimate instructions. Both land the same claim about authority, that what matters is not whether each piece is permitted alone but who controls how they compose.'
exercises:
  - title: Threat-modeling reservation cancellation
    slug: threat-model-cancellation
    about: |
      The reservation service exposes an endpoint that cancels a reservation by identifier. Students
      authenticate through the university identity provider, and administrators may cancel reservations
      for rooms they administer. The deliverable is an analysis that names the models it rests on, not a
      list of STRIDE categories. Students should:

      1. State at least one external specification obligation and at least one adversary capability,
         in the form the unit uses: who the actor is, and what that actor controls.
      2. Identify the assets and trust boundaries relevant to cancellation, and trace one path on which
         an attacker-controlled value crosses a boundary and reaches the cancellation operation.
      3. Write three concrete threat statements, each naming the actor, entry point, action, enabling
         condition, and consequence.
      4. Select the most consequential threat and state what further information about the deployment
         or the adversary would be needed to prioritize it.

      The exercise produces a revised diagram and a short threat table. A model-join table or a query
      result may stand in for part of the deliverable; writing SQL is one way to present the analysis,
      not a requirement of it.

      A second pass perturbs one assumption and asks which conclusions change. The administrative
      interface is a separate service; the identity provider is briefly unavailable; reservation
      identifiers are sequential integers; a legacy cancellation endpoint omitted from the first
      diagram is still reachable in production. The last of these is the one to dwell on, because it
      changes the set of conclusions the model can support rather than adding another row to it.
  - title: Match a threat to a software control
    slug: secure-cancellation
    about: |
      Teams select one threat and carry it through to the evidence that would justify accepting the
      control. The threat may come from one of the four worked mechanisms in Lecture 2, memory
      corruption, social engineering, ReDoS, or dependency exploitation, or from the team's own
      project. Unauthorized reservation cancellation remains available as a worked example, and the
      authorization rule developed in Lecture 1 is a reasonable starting point for a team that chooses
      it. Each team should produce:

      1. The attacker capability the threat depends on, and the property the attack violates.
      2. A software control that constrains the attack, stated as a mechanism with an enforcement
         point rather than as a principle.
      3. The assumptions the control's guarantee rests on, including what must remain true of the
         enforcement path itself.
      4. One bypass or limitation that remains within those assumptions.
      5. The evidence that would justify relying on the control, and what that evidence does not
         establish.

      For the cancellation example, item two is an authorization rule naming the principal, resource,
      operation, and required relationship, together with the component that evaluates it and what
      happens when the check fails. Item four is the question of whether the rule governs every
      interface that reaches the operation or only the ordinary student endpoint. The intended outcome
      is a small, explicit security argument whose conditions a reader can inspect.
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Lecture 1 slides — Security Engineering: Threat Modeling"
    src: 3-5-Security-Engineering-1-Threat-Modeling.pptx
  - title: "Lecture 2 slides — Security Engineering: Controls and Assurance"
    src: 3-5-Security-Engineering-2-Controls-and-Assurance.pptx
labs:
  - title: Regular Expression Denial of Service
    slug: redos
    about: >
      The instrument for the Cloudflare prediction. Four curated expressions run against generated
      inputs of increasing length in the browser's own engine, and the page reports measured execution
      time rather than a plotted complexity curve; you set the longest input to try, pick a linear or
      logarithmic time axis, and run the experiments singly or all four. They form a two by two.
      Experiments 1 and 2 run the same expression on different inputs, so the only thing that changes
      is what the adversary supplies, and experiments 2 and 4 run different expressions on
      byte-identical input, so the only thing that changes is what the engineer wrote. Watch where a
      run stops, because the page holds a wall-clock budget the matching thread cannot block and
      destroys the worker when a match overruns it: isolating the match bounds the damage, not the
      cost. The demonstration illustrates the class of algorithmic vulnerability rather than
      reproducing Cloudflare's production behavior, since regex engines differ in matching algorithm
      and optimizations.
---

*How can an adversary violate a system's obligations, and what would justify believing our defenses work?*

**Premise.** *Security engineering examines systems whose inputs, identities, dependencies, and operating conditions may be manipulated deliberately. Engineers must combine models of the system, its obligations, its environment, and its adversaries to identify threats; select software controls that constrain possible attacks; and obtain evidence for the protection those controls actually provide.*

The campus reservation service now has an architecture, a deployment, persistent data, and performance and reliability models. We have asked whether requests complete on time and how component failures could prevent the system from satisfying its obligations. Those questions remain relevant, but security introduces a participant whose objective may be to make the system fail. An authenticated student may deliberately submit another student's reservation identifier. A malicious input may consume an extraordinary amount of CPU time. A dependency that was installed to parse a document may be induced to execute a command. In each case, the attacker is looking for a behavior that the engineer did not intend to authorize.

Reliability and security therefore share much of their method. Both identify unacceptable outcomes, trace causal paths through a system, and select mechanisms to prevent, detect, contain, or recover from them. FMEA starts from components; fault trees start from system-level failures. Threat modeling adds an adversary who chooses actions and adapts to controls. The familiar distinction between safety and security is useful here: *Can the system harm the world?* versus *Can an adversary in the world harm the system?* These are not strict opposites. A security attack can cause a safety failure, and a reliability failure can create a security opportunity. Nor is reliability synonymous with safety. The distinction is a way to recognize why a familiar engineering analysis needs a different model of the environment.

![Reliability examines consequences of system failures; security examines adversarial influence on the system. Both use models, causal analysis, and controls.](figures/security-reliability-security.svg)

Security is also a problem of judgment. A finite threat model cannot enumerate every attacker strategy, and a passing test suite cannot establish protection against every possible attack. The engineer must decide which assets and obligations matter, which attacker capabilities are plausible, which controls provide useful guarantees, and what evidence justifies relying on them. The adversary is not obliged to follow the examples in our tests or the assumptions we forgot to write down.

## Structure of this unit

**Lecture 1, Threat Modeling.** We begin with an unauthorized cancellation in the reservation service and show how the security finding emerges by *joining* the specification, architecture, adversary, and environment models. We then construct data-flow diagrams and trust boundaries, use STRIDE to search for threats, and evaluate the risks under explicit assumptions. We finish by revising a model when a previously omitted endpoint is revealed. See {exercise:threat-model-cancellation}.

**Lecture 2, Controls & Assurance.** We begin with two attacker objectives, changing data and executing code, then use the Common Weakness Enumeration (CWE) to investigate the weaknesses that can make those outcomes possible. Four technical cases connect attacks to software controls: memory corruption and W⊕X, social engineering and identity management, ReDoS and linear-time matching, and vulnerable dependencies and zero-trust resource permissions. We close with fundamental limits on assurance and a claim, control and evidence exercise. See {exercise:secure-cancellation} and {lab:redos}.

# Lecture 1: Threat Modeling

## From reliability failures to adversarial threats

In the previous unit, we constructed a fault tree for the event No successful response within ten seconds. A router could drop a request, a backend could crash, or a database could become unavailable. The same outcome can also be produced deliberately: an attacker might submit inputs that exhaust CPU, overwhelm a queue, or exploit a dependency to disrupt service. The unacceptable outcome has not changed, but our model of how it can occur has expanded. Security introduces an adversary who selects actions strategically and may change tactics when a defense is introduced.

A threat model is not simply a list of things that might go wrong. It represents what we want to protect, what the system permits, where an attacker can interact with it, and what the attacker is assumed able to control. These assumptions matter as much as the diagram. An unauthenticated internet client, an authenticated student, a compromised administrator, and a malicious software dependency have different capabilities. A model that silently treats them as interchangeable will produce misleading security conclusions.

## Worked example: cancel somebody else's reservation

Suppose the specification says that a student may cancel a reservation only if they own it; an administrator may cancel a reservation only for a room they administer. The system exposes a cancellation operation that accepts a reservation identifier. An authenticated student can choose the identifier in a request. If an endpoint verifies the student's identity but fails to check the required relationship to the reservation, the endpoint can perform a forbidden cancellation. The problem is not failed authentication: the student's identity may have been established correctly. The problem is that identity alone does not authorize an operation on a particular resource.

The finding depends on information from several models. The **external specification** states which cancellations are permitted. The **architecture** identifies endpoints and the enforcement paths they use. The **adversary model** states which requests and parameters an attacker controls. The **environment model** states which endpoints are reachable in the deployed system. The data model supplies the ownership and room-administration relationships. None of these models, considered alone, establishes the complete threat.

| Model | Question it answers | Reservation-service fact |
|---|---|---|
| External specification | What behavior must be permitted or forbidden? | Students cancel only their own reservations; administrators act only within their room scope |
| Architecture / implementation | Which paths reach the protected operation, and what checks do they perform? | Student and legacy administrative cancellation endpoints |
| Data model | Which relationships determine authorization? | `Owner(user,reservation)`, `Room(reservation)`, `AdminOf(user,room)` |
| Adversary model | Which actions and inputs can the attacker choose? | Authenticated student can choose a reservation identifier |
| Environment / deployment | Which paths can that actor reach? | Legacy endpoint remains publicly reachable |

The authorization obligation can be written as a predicate:

> MayCancel(u, r) = Owner(u, r) OR AdminOf(u, Room(r))

This is already more precise than saying that "administrators can cancel reservations." It names the relevant resource relationship. A check that only asks whether the caller has an administrator role does not establish the scope required by the policy. The same predicate will return in Lecture 2, where we ask what mechanism can enforce it.

## Joining the models: an executable security analysis

Models become particularly useful when their entities have identifiers that permit their information to be combined. Consider four small relations. The `enforces_MayCancel` field records whether an endpoint's complete enforcement path implements the authorization predicate defined above. This is a verified model fact, established through architecture or implementation inspection, not inferred from passing functional tests. The simplified Boolean stands in for an analysis of the actual enforcement path.

**`Permissions(role, operation, scope)`**

| role | operation | scope |
|---|---|---|
| student | cancel | own |
| administrator | cancel | administered_room |

**`Endpoints(endpoint, operation, enforces_MayCancel)`**

| endpoint | operation | enforces_MayCancel |
|---|---|---|
| `/api/cancel` | cancel | true |
| `/legacy/cancel` | cancel | false |

**`Capabilities(actor, role, endpoint)`**

| actor | role | endpoint |
|---|---|---|
| malicious_student | student | `/api/cancel` |
| malicious_student | student | `/legacy/cancel` |

The adversary model assumes that the legacy endpoint accepts requests authenticated with ordinary student credentials. That assumption must be checked against the deployed system; if the endpoint requires a credential the student cannot obtain, the corresponding capability row is incorrect.

**`Exposure(endpoint, reachable)`**

| endpoint | reachable |
|---|---|
| `/api/cancel` | true |
| `/legacy/cancel` | true |

The following query identifies a reachable path that is modeled as omitting the check required by the student's policy:

```sql
SELECT c.actor, e.endpoint, p.operation, p.scope
FROM Permissions AS p
JOIN Capabilities AS c
  ON c.role = p.role
JOIN Endpoints AS e
  ON e.endpoint = c.endpoint
 AND e.operation = p.operation
JOIN Exposure AS x
  ON x.endpoint = e.endpoint
WHERE p.scope = 'own'
  AND x.reachable = TRUE
  AND e.enforces_MayCancel = FALSE;
```

**Result:** `malicious_student | /legacy/cancel | cancel | own`.

The query identifies a modeled path on which an authenticated student can reach a cancellation operation without enforcement of the required authorization policy. The result is a security finding about the joined models, not independent proof of an exploitable implementation. A real system may enforce the policy in a shared service or database, so the engineer must inspect the complete path before recording `enforces_MayCancel`. The simplified relation makes model composition visible without pretending that a Boolean field is a general-purpose vulnerability detector.

There is also a serious failure mode in the analysis itself. Remove `/legacy/cancel` from the architecture relation and rerun the query: it returns no rows. That does **not** establish that the service is secure. It establishes that the available models contain no matching violation. If the omitted endpoint exists in production, the analysis is incomplete. Thus a model-based security argument has at least three obligations: the models correspond to the real system; the models include the information relevant to the decision; and the query correctly expresses the intended property. The lecture's closing reveal of a legacy endpoint returns to this exact distinction.

This use of model joins is not unique to security. Performance analysis combines architecture, workload, and resource models; reliability analysis combines architecture, component-failure models, and recovery assumptions. Security adds models of adversary capabilities, exposure, and protected obligations. The engineering benefit is the same: an analysis can use information distributed across several representations, provided their entities correspond and the combined assumptions are valid.

![Four relational models are joined on shared identifiers to identify a reachable cancellation path that does not enforce the specified authorization policy.](figures/security-model-join.svg)

## Constructing system and adversary models

The small relations above were easy to query because we already knew which components and interfaces mattered. In a real project, that information must be obtained. A **data-flow diagram (DFD)** is one useful representation: it records external actors, processes, data stores, and the flows connecting them. For the reservation service, the diagram includes students and administrators, the HTTP API, the booking service, the identity provider, and the reservation store. A trust boundary marks where assumptions about identity, integrity, or authority must be reconsidered. It is not necessarily a machine boundary: two components on one host may run with different privileges, and two hosts may share one authority.

![The reservation service as a data-flow diagram, showing where authority changes hands. Requests from the Student and the Administrator cross the client/service boundary into the HTTP API, which authenticates and validates before the booking service evaluates reservation policy. A second boundary separates the service from the external Identity Provider, whose assertions it verifies but did not create; a third separates the service from the Reservations store, which its credentials reach in full.](figures/reservation-data-flow-diagram.svg)

The DFD should be selective rather than exhaustive. It must show the paths by which an attacker-controlled value reaches a consequential operation, the source of identity assertions, and the authority carried by services that access the reservation store. If the diagram omits a legacy endpoint, an administrative workflow, or a background job that can cancel reservations, it cannot support a complete analysis of cancellation authorization. Existing architecture, deployment, and data models should be reused wherever possible, rather than redrawn independently and allowed to drift.

| Security-model element | Engineering question | Example |
|---|---|---|
| Asset / protected property | What matters, and to whom? | Reservation integrity; private student data |
| Adversary | Who may seek to violate it? | Authenticated student |
| Capability | What can that actor control? | Request parameters and timing |
| Entry point | Where can the actor interact with the system? | Public cancellation API |
| Trust boundary | Where does an assumption about authority change? | Client input enters server-side execution |
| Dependency | Which outside service or component is trusted? | Identity provider and its signing keys |
| Assumption | What must be true for the analysis to hold? | All cancellation paths are represented |

## Eliciting threats and analyzing risk

Once the relevant system and adversary models exist, we can search systematically for violations. **STRIDE** supplies six prompts: spoofing, tampering, repudiation, information disclosure, denial of service, and elevation of privilege. It is most useful when applied to particular elements and flows, not as a label attached to the entire application. For example, at the client-to-API boundary we might ask whether the caller can impersonate another principal; at the API-to-database boundary we might ask whether a service account can modify records outside its intended scope.

| STRIDE prompt | Concrete reservation-service question | Property at risk |
|---|---|---|
| Spoofing | Can a request be accepted as another student? | Authentication |
| Tampering | Can a student alter somebody else's reservation? | Integrity |
| Repudiation | Can a cancellation be denied without reliable evidence? | Accountability |
| Information disclosure | Can one student retrieve another's private reservation details? | Confidentiality |
| Denial of service | Can repeated requests exhaust booking capacity? | Availability |
| Elevation of privilege | Can a student invoke an administrator-only operation? | Authorization |

A STRIDE label is not yet a threat statement. A useful statement identifies the actor, entry point, action, enabling condition, and consequence: *An authenticated student supplies another student's reservation identifier to a reachable cancellation endpoint; if the endpoint checks identity but not ownership, the student can cancel a reservation they do not control.* This can be examined against a concrete architecture, translated into a policy, and tested. "Tampering" alone cannot.

Threat identification and risk analysis are related but distinct. A threat statement describes a possible violation. Prioritization asks whether the violation matters enough to warrant a particular control, considering consequences, attack feasibility, exposure, existing protection, and cost. These judgments require further joins with stakeholder obligations, deployment information, and operating assumptions. An administrator credential compromise may have greater consequences than disclosure of one reservation identifier, but its plausibility depends on how credentials are issued, protected, and revoked. Numerical scores cannot compensate for missing facts about the environment.

| Risk consideration | Information required | Models to consult |
|---|---|---|
| Consequence | Which requirement is violated and what is affected? | Specification, data, stakeholders |
| Feasibility | Can this adversary reach and exercise the weakness? | Adversary, architecture |
| Exposure | Under which deployment conditions is the opportunity available? | Deployment, environment |
| Existing protection | What actually constrains the attack? | Controls, enforcement paths |
| Cost of response | What changes and what does it cost? | Design, operations |

A threat model should be reviewed against the actual implementation and revised as the system changes. A peer reviewer who discovers an omitted interface has done more than improve the drawing: they have changed the set of security conclusions the model can support. The closing exercise asks teams to identify such omissions and to revise their analysis, not merely add more STRIDE labels. See {exercise:threat-model-cancellation}.

# Lecture 2: Controls & Assurance

## What can an adversary make our software do?

Begin with two simple outcomes. An attacker **changes data** they are not authorized to change, such as another student's reservation. Or an attacker **causes code to execute** with authority they were not granted, such as inducing a document-processing dependency to launch a command. These are consequences, not particular weaknesses. Many different defects can produce the same consequence, and a single defect can permit several kinds of harm. The engineer needs a vocabulary for the underlying mechanisms in order to investigate them and choose appropriate controls.

The **Common Weakness Enumeration (CWE)** catalogs recurring classes of software weaknesses. A CWE identifies a kind of defect or unsafe condition; a **CVE** identifies a particular publicly disclosed vulnerability. Neither a CWE entry nor a CVE identifier by itself establishes that the software in front of us is exploitable under its actual configuration. They are starting points for investigation, not substitutes for a system model.

| Weakness | CWE | Example consequence |
|---|---|---|
| Out-of-bounds write | [CWE-787](https://cwe.mitre.org/data/definitions/787.html) | Memory corruption; possible execution redirection |
| Missing authorization | [CWE-862](https://cwe.mitre.org/data/definitions/862.html) | Unauthorized data modification |
| OS command injection | [CWE-78](https://cwe.mitre.org/data/definitions/78.html) | Unexpected command execution |
| Uncontrolled resource consumption | [CWE-400](https://cwe.mitre.org/data/definitions/400.html) | Denial of service |
| Improper restriction of operations within memory-buffer bounds | [CWE-119](https://cwe.mitre.org/data/definitions/119.html) | Memory-safety violations |

A CWE entry is useful because it explains a weakness, its consequences, relationships to other weaknesses, and candidate mitigations. The important activity is not memorizing identifiers. It is learning how to move from an observed failure or attack outcome to a plausible mechanism and then to an engineering control. The following cases demonstrate four different mechanisms. They also show why security is adversarial: once one attack path is constrained, an attacker may search for another path or exploit a different assumption.

## Memory corruption: writeable data becomes control

Consider a program that copies attacker-controlled input into a fixed-size buffer without checking its length. A sufficiently long input can overwrite adjacent memory, including state that influences control flow. The attacker is not using an authorized application interface to request a privileged operation. The attacker is corrupting the program's representation so that execution deviates from the intended control flow. In memory-unsafe code, this can turn a data input into a means of changing what the program does.

A strong first response is to avoid the weakness through memory-safe languages, bounds checking, and safer APIs. A separate defense is **W⊕X** (write xor execute): memory regions should not simultaneously be writable and executable. Operating systems can enforce this memory-permission policy so that writable input buffers are not directly executable as instructions. This makes a traditional injected-code attack harder, but does not make the program memory-safe. Corrupting control-flow state remains possible, and attackers may reuse instructions already in executable regions. **Return-oriented programming (ROP)** is a compact counterexample: W⊕X constrains one attack strategy without proving that attacker-controlled execution is impossible.

![An out-of-bounds write can corrupt control-flow state. W⊕X restricts executable memory but does not prevent code reuse.](figures/security-memory-control.svg)

The lesson is to distinguish the weakness from the control's actual guarantee. Bounds-safe code aims to prevent the memory corruption. W⊕X constrains the execution permissions of memory regions. Control-flow defenses constrain certain ways corrupted state can redirect execution. They are different protections with different assumptions, and their effects must not be conflated.

## Social engineering: legitimate authority used for the wrong purpose

A different attacker may never send malformed input. Instead, the attacker convinces a legitimate administrator to approve a fraudulent request, disclose credentials, or authorize a harmful action. Authentication may succeed, the administrator's role may be valid, and the software may execute exactly the operation requested. The failure lies in how the attacker influenced the person who exercised legitimate authority. This case matters because a system can enforce its access-control policy correctly and still allow a harmful outcome if the policy grants one deceived actor too much power.

![An attacker deceives an authorized administrator into performing a harmful action; scoped permissions and independent approval limit the consequences.](figures/security-social-engineering.svg)

The engineering response comes from identity and access management (IAM) and the older reference-monitor tradition: least privilege, scoped authority, complete mediation, revocation, and separation of duties. A sensitive release or account change might require independent approval rather than relying on one administrator's decision. The Orange Book is historically relevant to trusted-system evaluation and access-control enforcement, but it is not a social-engineering manual. Its connection is that consequential permissions should be mediated by mechanisms whose behavior does not depend solely on a user remembering the right thing to do. Strong authentication helps establish who is acting; it does not establish that the actor's intention is legitimate.

## ReDoS: correct computation at an unacceptable cost

Regular-expression denial of service (ReDoS) is a different kind of exploit. A backtracking regex engine may return the functionally correct answer while spending super-linear or exponential time on certain patterns and inputs. The attacker supplies a short, cheap request that induces much more expensive server-side computation. The attack exploits an asymmetry in resource cost, not necessarily an incorrect match result. The Cloudflare outage of July 2019 illustrates the same algorithmic weakness, although that incident was triggered by an internally deployed firewall rule, not an adversary.

One response is to select an engine whose supported pattern language and matching semantics admit a linear-time algorithm, often based on finite automata. This is a design tradeoff: some expressive constructs, such as certain backreferences, cannot be supported with the same general regular-language guarantees. Other defenses include input limits, resource budgets, isolation, and admission control, but they provide different kinds of protection. A timeout may bound the damage to a worker without changing the underlying complexity. An automata-based engine removes a class of pathological matching behavior for the features it supports. The engineer should identify which guarantee the application needs, rather than treating "uses regex" as either safe or unsafe.

![Backtracking and automata-based regex matching offer different resource guarantees; timeouts bound damage without changing matching complexity.](figures/security-redos-controls.svg)

The {lab:redos} laboratory makes the mechanism observable. It compares patterns and inputs while measuring actual matching time, and it isolates an overlong match in a worker. Students should distinguish the measured behavior of the browser engine from a general complexity guarantee about another implementation.

## Vulnerable dependencies: code inherits authority it does not need

Applications incorporate libraries that parse files, log messages, process images, and perform many other tasks. By default, a library executing inside an application may inherit the application's ability to read files, open network connections, or launch subprocesses. If an attacker exploits a vulnerable dependency, that inherited authority can make a local defect far more consequential. The problem is not simply that the library contains a bug. It is that the bug can be exercised with privileges unrelated to the library's legitimate task.

**Zero-Trust Dependencies**, illustrated by **ZTDJava**, applies zero-trust principles within the application. Dependencies receive explicit resource-access permissions; sensitive file, network, and shell operations are checked at runtime; and observed access supports policy discovery and monitoring. For example, a document parser that needs to read its input need not also have permission to launch a shell command or connect to an arbitrary remote host. A vulnerability may still be triggered, but the resulting operation can be denied by a control outside the vulnerable library's intended behavior.

![Zero-trust dependency enforcement checks a library's resource accesses against its own permissions instead of inheriting all application privileges.](figures/security-zero-trust-dependencies.svg)

This is a particularly useful example of a *software-enforced* control. The protection is not a request that the dependency behave safely; it is an independently evaluated resource-access policy. ZTDJava's paper reports blocking the reproduced exploits evaluated under its threat model, while explicitly identifying limitations involving native code, asynchronous delegation, namespace identification, and policies inferred from incomplete workloads. Those limitations matter: a sandbox is only as strong as the operations it mediates and the authority of its enforcement mechanism. An unobserved legitimate operation can also be denied by an incomplete policy, so security and availability must be judged together.

## What the cases have in common

The four attacks exploit different weaknesses, but each reveals a gap between the behavior the engineer intended to permit and what the system can actually be made to do. The corresponding controls constrain different kinds of behavior.

| Attack mechanism | Intended property | Software control | What remains to examine |
|---|---|---|---|
| Buffer overflow | Input must not corrupt unrelated memory or control flow | Memory safety, bounds checks; W⊕X as defense in depth | Code reuse and other corruption effects |
| Social engineering | Privileged operations reflect authorized, appropriately scoped decisions | Least privilege, scoped IAM, independent approval | Deception of approvers and recovery from misuse |
| ReDoS | Untrusted input must not induce unbounded work | Linear-time matching for supported constructs, resource budgets | Other expensive operations and aggregate overload |
| Vulnerable dependency | A library cannot exercise unrelated application authority | Dependency sandboxing, least-privilege resource access | Bypass paths, incomplete policy, native or asynchronous execution |

Security is a continuing contest because controls change the attacker's available strategies. W⊕X obstructs injected code but not all code reuse; authentication establishes identity but not legitimate intent; linear-time matching addresses one class of resource exhaustion; and dependency confinement constrains only the operations it mediates. A control should be evaluated by the class of behavior it excludes, not merely the exploit that motivated it.

## Fundamental limits and trusted assumptions

There are limits to what an engineer can establish about arbitrary software. **Rice's theorem** shows that nontrivial semantic properties of arbitrary programs are undecidable in general. Under a suitable formalization, there can be no algorithm that correctly decides for every arbitrary program whether it ever discloses a secret. This does not make verification useless. Restricted languages, bounded models, carefully scoped properties, and explicit assumptions can support rigorous analyses and proofs. The lesson is to state precisely what has been established and for which class of programs and environments.

A different limit concerns the tools and components on which the assurance argument depends. In *Reflections on Trusting Trust*, Ken Thompson showed how a compromised compiler can introduce malicious behavior into an executable even when the reviewed source code appears innocent. Source review alone cannot establish executable behavior when the toolchain is outside the trusted assumptions. Similarly, if an attacker can arbitrarily modify both the application and the mechanism enforcing its policy, a software control within that compromised environment cannot be relied upon against that attacker. Physical access by itself does not imply such control; the adversary model must specify whether the attacker can replace executables, alter the boot process, or tamper with enforcement.

![Rice's theorem limits general semantic analysis; Trusting Trust shows that source review depends on assumptions about the compiler.](figures/security-assurance-limits.svg)

The reference-monitor tradition gives a practical counterpart to these limitations. A security control must mediate the relevant operations, resist tampering within the assumed threat model, and be sufficiently understandable to evaluate. A control that checks one API while another reaches the same operation does not provide complete mediation. Two checks that rely on the same stale authorization value do not constitute two independent defenses. These are not reasons to abandon controls. They are reasons to identify the assumptions on which their guarantees depend.

## Obtaining security assurance

For each important security claim, the engineer should identify a control and evidence that supports the claim. A test is not itself a mitigation: fuzzing may discover a malformed request that causes a failure, but the defense is a change in the implementation or its enforcement. Likewise, a successful test of an authorized cancellation cannot establish that unauthorized cancellations are rejected. The evidence must exercise or analyze the property actually claimed.

| Security claim | Control | Supporting evidence |
|---|---|---|
| Students cannot cancel reservations outside their authority | Server-side scoped authorization with complete mediation | Negative tests, path review, enforcement inspection |
| Untrusted input cannot cause an out-of-bounds write in a selected parser | Memory-safe implementation or checked operations | Static analysis, targeted tests, code review |
| Supported regex matches have bounded asymptotic cost | Engine with stated linear-time guarantee for supported features | Engine specification, complexity tests |
| A document parser cannot launch shell commands | Dependency-level permission enforcement | Policy inspection, denied-operation tests, runtime audit |
| Sensitive operations require independent approval | Approval workflow with separated authority | Workflow inspection, bypass tests, audit events |

Static analysis, dynamic testing, fuzzing, and penetration testing provide complementary evidence about a security claim. Each examines different properties, executions, or attack paths; none establishes that every possible violation has been excluded. Runtime logs, metrics, and traces provide additional evidence about the deployed system, but detecting a forbidden operation is not the same as preventing it. The subsequent Operations unit develops these signals in greater detail.

A useful final question is not "Is the system secure?" but *Which adversaries and behaviors have we modeled, what prevents the relevant violations, and what evidence supports that claim?* A security argument is conditional on its models and assumptions. The engineer remains responsible for deciding whether those conditions match the system's intended environment and for revisiting the argument when the system or the adversary changes. See {exercise:secure-cancellation}.
