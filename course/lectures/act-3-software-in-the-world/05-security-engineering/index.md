---
title: Security Engineering
sessions:
  - "Security I: Threat Modeling"
  - "Security II: Controls & Assurance"
readings:
  groups:
    - heading: The method, from the people who had to run it
      items:
        - cite: shostack2008threatmodeling
          annotation: 'Shostack, ["Experiences Threat Modeling at Microsoft"](https://shostack.org/files/papers/modsec08/Shostack-ModSec08-Experiences-Threat-Modeling-At-Microsoft.pdf) (2008). Read the whole paper; it is eleven pages. This is where Lecture 1''s method comes from: the data-flow diagram as the system model, and STRIDE applied per element rather than to the system as a whole. Two things in it carry the lecture. The author owned the method across a decade of mandatory use, so the limitations are stated by the person responsible for them rather than by a critic. And the validation heuristics in section 5.1 are the part students skip: a diagram nobody checked against the implementation describes a system that may not exist. The Microsoft-specific tooling and organizational history are context rather than content.'
    - heading: Design principles that have not needed revision
      items:
        - cite: saltzer1975protection
          locator: 'the design-principles discussion in Section I'
          annotation: 'Saltzer and Schroeder, ["The Protection of Information in Computer Systems"](https://web.mit.edu/Saltzer/www/publications/protection/), *Proceedings of the IEEE* 63, no. 9 (1975). Read the design-principles discussion in Section I, a few pages. The survey of 1970s protection hardware that follows is not assigned. The six principles in this unit''s controls table are theirs, in their words, and they are worth meeting in the original because each one is an engineering question rather than a slogan. Least privilege asks what authority a component actually requires. Complete mediation asks where access is checked and whether any path avoids the check. Fail-safe defaults asks what the system does when permission is uncertain. The paper predates the web by two decades.'
    - heading: What verification a developer owes before shipping
      items:
        - cite: nistir8397
          locator: 'section 2, the eleven recommendations'
          annotation: 'Black, Guttman and Okun, [NISTIR 8397, *Guidelines on Minimum Standards for Developer Verification of Software*](https://doi.org/10.6028/NIST.IR.8397) (NIST, 2021). Read section 2, which states eleven recommended techniques and what each is for, including threat modeling, static analysis, fuzzing, hardcoded-secret review and checking included components. Section 3 is supplemental reference material to consult rather than read; section 4 goes beyond this unit. Read it as a statement of minimums rather than a recipe. The document is careful that each technique produces evidence about the property it examines and nothing else, which is the distinction behind this unit''s claim, control and evidence table.'
    - heading: One incident, four engineering questions
      items:
        - cite: grahamcumming2019cloudflare
          annotation: 'Graham-Cumming, ["Details of the Cloudflare Outage on July 2, 2019"](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/) (Cloudflare, 2019). Required. A single firewall rule carrying a regular expression with pathological backtracking saturated CPU across the network and took service down for 27 minutes. Note carefully what this is and is not. The rule was deployed internally, so the incident was not an attack. The algorithmic weakness it exposed is exploitable as a denial-of-service vulnerability all the same, which is what makes the postmortem a security reading and not only a reliability one. Four questions come out of the one incident. What property of the expression made certain inputs expensive? How could an attacker reach the same behavior deliberately? Why did the rule reach production so broadly? What test or control would have caught it beforehand? The postmortem also separates the defect from the organizational conditions that allowed it to cause an outage, which is the distinction the Reliability unit drew between a failure and the conditions that let it propagate.'
    - heading: Further depth
      note: 'The Sommerville chapter frames the unit; the other two are optional.'
      items:
        - cite: sommerville2011
          locator: 'chapter 14, sections 14.1 and 14.2'
          annotation: 'Sommerville, *Software Engineering*, 9th edition, chapter 14, "Security engineering". Textbook framing for the unit: security risk management, design for security, and system survivability. Read 14.1 and 14.2. One caution about editions. The scan distributed with this course is the 9th edition, where security engineering is chapter 14; the 10th edition renumbers the subject to chapter 13 and reorganizes its sections, so a section reference taken from one edition will not locate the same material in the other.'
        - cite: anderson2020security
          locator: 'chapter 27, Secure Systems Development'
          annotation: 'Anderson, *Security Engineering: A Guide to Building Dependable Distributed Systems*, 3rd edition, chapter 27, "Secure Systems Development" (Wiley, 2020; [the author makes the chapters freely available](https://www.cl.cam.ac.uk/~rja14/book.html)). Optional, and long at forty-nine pages. Read it for the argument that security requirements emerge from a system and its environment rather than from a checklist, and for its treatment of risk management as a judgment made under uncertainty rather than a score to compute. Anderson writes from decades of deployments that failed, so the chapter is unusually direct about which practices survive contact with a real project.'
        - cite: shacham2007geometry
          annotation: 'Shacham, ["The Geometry of Innocent Flesh on the Bone: Return-into-libc without Function Calls (on the x86)"](https://doi.org/10.1145/1315245.1315313), ACM CCS 2007. **Advanced and fabulous.** Optional, and offered as an invitation rather than as material you are expected to master. The paper shows that an attacker who controls the execution path can assemble arbitrary computation from short instruction sequences already present in executable memory, injecting no code at all. Read it against the Cloudflare postmortem. One exploits the computational complexity of an ordinary operation; the other repurposes instructions that are individually legitimate. Both make the same point about trust boundaries and authority: what matters is not whether each piece is permitted on its own, but who controls how the pieces compose.'
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

*What can an adversary do, and which security properties must the system preserve?*

**Premise.** *A system that behaves correctly under ordinary use may fail when an adversary deliberately chooses inputs and actions intended to violate its requirements. Engineers must model the system and its adversaries, identify consequential threats, select controls, and obtain evidence that those controls preserve the required security properties.*

Our campus reservation service now operates in a suitable environment, stores reservations persistently, and has been examined for architectural, performance, and reliability concerns. It authenticates students through the university identity provider and permits them to create and cancel reservations. But what happens when a student attempts to cancel someone else's reservation? What if an attacker deliberately exhausts the service's capacity, or causes a component to interpret untrusted data as an instruction?

Security engineering introduces adversarial behavior into the assumptions under which we design and evaluate software. In reliability engineering, we considered failures that might occur during operation. An adversary can deliberately select inputs, repeat operations, exploit knowledge of the system, and coordinate actions to produce an unwanted outcome. Some resulting failures resemble ordinary reliability failures, but the engineer must account for an actor actively seeking them.

Security is also an economic decision. The engineer cannot eliminate every conceivable threat at any cost. The value of the assets, the capabilities of plausible adversaries, the consequences of compromise, and the cost of protection all affect which controls are justified.

## Structure of this unit

**Lecture 1, Threat Modeling.** We construct a system model of the reservation service, identify its assets and trust boundaries, and use STRIDE to examine how an adversary might violate its security objectives. The exercise asks students to develop and review a threat model.

**Lecture 2, Controls & Assurance.** We translate selected threats into security policies and enforceable controls. We examine authorization, least privilege, complete mediation, isolation, and security testing, then consider how unexpected authority arises in conventional software and agentic systems. The exercise asks students to select controls and evidence for the reservation service.

The two lectures follow the Act III engineering method: identify the problem, construct a model, exercise judgment about the design, realize the selected controls, and obtain evidence that they satisfy the intended obligations.

## Modeling the system and adversary

Security analysis begins with two questions. What must the system protect, and what can an adversary do?

An **asset** is something whose confidentiality, integrity, or availability matters to the system's stakeholders. The reservation service manages student identities, reservation records, and administrative permissions. Different assets have different security requirements. Students may be permitted to read room availability without being permitted to read the identities of everyone using a room. They may modify their own reservations but not those belonging to others.

An **adversary model** identifies the actors and capabilities relevant to the analysis. An unauthenticated attacker can submit requests to public endpoints. An authenticated student can invoke operations available to students and supply arbitrary request parameters. An administrator possesses additional permissions, while a compromised service account may exercise whatever authority its credentials provide.

The engineer must decide which capabilities to include. Assuming that an attacker can control the operating system produces a different analysis from assuming that the attacker can only submit HTTP requests. Neither assumption is universally correct; the model must reflect the system's intended environment and the threats the engineer is responsible for addressing.

| Model element | Engineering question | Reservation-service example |
|---|---|---|
| Asset | What must be protected? | Reservation ownership |
| Security objective | What property must hold? | Only authorized users may cancel reservations |
| Adversary | Who might violate the property? | Authenticated student |
| Capability | What can the adversary control? | HTTP requests and reservation identifiers |
| Attack surface | Where can the adversary interact with the system? | Reservation API |
| Trust boundary | Where must an assumption about authority or trust be established? | Between client requests and server-side operations |

The system model complements the adversary model. A **data-flow diagram** represents the actors, processes, data stores, and information flows relevant to the analysis. **Trust boundaries** identify places where information or requests move between components operating under different trust assumptions or authorities.

![A data-flow diagram of the reservation service in standard notation. A legend along the bottom states the vocabulary: a square-cornered rectangle is an external entity outside the engineer's control, a circle is a process, a shape held between two heavy horizontal rules is a data store, a solid labeled arrow is a data flow, and a heavy dashed red line is a trust boundary. Four tinted regions hold the elements that share one authority. The CLIENT DOMAIN region at the upper left, labeled requests the attacker controls, holds two external entities, ADMINISTRATOR and STUDENT. The EXTERNAL IDENTITY DOMAIN region at the upper right, labeled an authority we rely on and do not operate, holds one external entity, IDENTITY PROVIDER. Between the student and the provider runs an authentication exchange of two flows: the student sends credentials rightward to the provider, and the provider returns a signed assertion leftward to the student. The SERVICE DOMAIN region across the middle, labeled code and credentials we operate, holds two processes drawn as circles: process one point zero, the HTTP API, which authenticates and validates, and process two point zero, the booking service, which evaluates the reservation policy. A flow labeled request plus assertion runs down from the administrator into the HTTP API, and a second such flow runs down from the student into the same process, so both client paths arrive at one entry point. A flow labeled authenticated request runs rightward from the HTTP API to the booking service, and a flow labeled result runs back. Two further flows connect the booking service to the identity provider: the service requests verification keys, and the provider returns signing keys and metadata, so the service verifies an assertion it did not create. The DATA DOMAIN region at the bottom, labeled authority the service credentials carry, holds the data store D1, Reservations, holding owner, room and time. A flow labeled read and write reservations runs down from the booking service into the store, and a flow labeled reservation records runs back up. Three dashed red boundaries are drawn and labeled. TB1 runs horizontally between the client domain and the service domain, where client-controlled requests meet server-side execution. TB2 runs vertically between the client and service domains on one side and the identity domain on the other, then turns horizontal across the right of the figure, annotated that the service verifies an assertion it did not create. TB3 runs horizontally between the service domain and the data domain, annotated that the service's credentials reach every reservation. A closing note reads that a trust boundary need not follow a machine boundary: two components on one host may hold different privileges, and two hosts may share one administrative authority, so what matters is which assumptions and permissions hold on each side.](figures/reservation-data-flow-diagram.svg)

TB1 separates client-controlled requests from server-side execution. TB2 and TB3 represent boundaries involving external identity services and database authority. The engineer must establish the actual trust assumptions and permissions at each boundary. Note what the identity exchange does and does not say: the service receives an assertion the provider signed and verifies it against the provider's keys. It does not send the provider its own claims about who the user is.

A diagram is useful only if it preserves the information needed for the security decision. The engineer should refine a process when its internal structure affects the analysis, identify omitted data flows, and record assumptions about external services. A diagram that shows a web server and database but omits the identity provider cannot adequately explain how the service establishes user identity.

A trust boundary does not necessarily correspond to a machine boundary. Two components running on the same machine may possess different privileges, while separate machines may operate under a shared administrative authority. The relevant distinction concerns which assumptions and permissions are valid on each side.

## Identifying threats

The engineer examines the system model to identify ways that an adversary could violate a security objective. The **STRIDE** framework provides six categories that help make this analysis systematic.

| STRIDE category | Reservation-service threat | Security concern |
|---|---|---|
| Spoofing | Attacker impersonates another student | Authentication |
| Tampering | Attacker modifies reservation data | Integrity |
| Repudiation | Student disputes having canceled a reservation | Accountability |
| Information disclosure | Student obtains another student's private information | Confidentiality |
| Denial of service | Attacker exhausts service capacity | Availability |
| Elevation of privilege | Student obtains administrative authority | Authorization |

STRIDE is a classification aid, not a complete threat model. Writing "elevation of privilege" does not explain how an attack occurs or what the engineer must prevent.

A useful threat statement identifies the actor, entry point, action, condition enabling the attack, and consequence. Consider:

> An authenticated student submits a cancellation request containing another student's reservation identifier. If the API checks authentication but not ownership, the student can cancel a reservation they do not control.

The statement identifies a concrete security obligation: the server must establish that the requesting principal is authorized to cancel the specified reservation.

A **threat** is a possible source or course of harmful action. A **vulnerability** is a weakness that may permit the threat to succeed. An **attack** is an attempt to exploit such a weakness. These distinctions matter because a threat may remain relevant even after a particular vulnerability has been corrected.

Denial of service is the category students most often leave abstract, so the assigned Cloudflare postmortem supplies a concrete mechanism. A regular expression whose matching cost grows explosively on certain inputs lets a small request consume a large amount of CPU, and a service that accepts such input from anyone has handed an attacker a lever. Work through the expression before reading the outcome, and predict which inputs are expensive.

To practice this, see {lab:redos}.

The engineer should also examine the paths by which an attacker can reach consequential operations. For example, the reservation API may enforce ownership correctly while a separate administrative endpoint exposes the same operation without equivalent checks. The relevant model must include both paths.

## Reviewing and prioritizing the model

A threat model is necessarily incomplete. The engineer must decide whether it is sufficiently complete for the decision at hand.

Review includes checking that the diagram matches the implementation, identifying omitted flows and dependencies, examining trust boundaries, and determining whether each important threat has been described concretely. Independent reviewers may discover assumptions that the original modeler overlooked.

Threats also differ in importance. A student obtaining another student's reservation identifier may be less consequential than a compromised administrative credential permitting modification of every reservation. The engineer considers the plausibility of exploitation, the potential impact, existing controls, and the cost of additional protection.

These judgments should be explicit. Assigning numerical risk scores does not eliminate uncertainty about attacker behavior or consequences.

## Exercise A: Threat-modeling reservation cancellation

The reservation service exposes an endpoint that cancels a reservation by identifier. Students authenticate through the university identity provider, and administrators may cancel reservations on behalf of students.

Using the system model, students should:

1. Identify the assets and trust boundaries relevant to cancellation.
2. Describe three concrete threats, including the adversary, entry point, action, and consequence.
3. Select the most consequential threat and explain what additional information would help evaluate it.

The exercise should produce a revised diagram and a short threat table, not merely a list of STRIDE categories.

## Specifying security policy

Identifying a threat does not establish how the system should prevent it. The engineer must specify the behavior the system will permit and determine where that policy will be enforced.

For the reservation service, an **authorization policy** relates principals, resources, and operations. A student may cancel their own reservation, while an administrator may cancel any reservation. **Authentication** establishes the principal's identity; **authorization** determines whether that principal may perform the requested operation.

| Principal | Own reservation | Another student's reservation | Room administration |
|---|---|---|---|
| Student | Read, cancel | Denied | Denied |
| Administrator | Read, cancel | Read, cancel | Allowed |
| Service account | Only required internal operations | Only required internal operations | Denied unless explicitly required |

This matrix is a model of permitted behavior. The phrase "own reservation" describes a *relationship* between a principal and a resource, not merely a role assigned to the principal.

We can express the cancellation policy as a predicate:

> MayCancel(u, r) = Admin(u) OR Owner(u, r)

The predicate is deliberately simple. A production policy might also consider reservation status, administrative scope, delegation, or institutional rules. Those additional conditions should be introduced because the requirements demand them, not merely because they are possible.

The engineer must determine which component evaluates this policy, how it obtains trustworthy information about the principal and resource, and whether every path to the protected operation applies the same rule.

## Selecting and enforcing controls

A **security control** is a mechanism or procedure intended to prevent, detect, or limit a security violation. The engineer selects controls according to the threat model and the properties that must be preserved.

| Principle | Engineering decision | Reservation-service application |
|---|---|---|
| Least privilege | What authority does each component require? | Booking service cannot administer identities |
| Complete mediation | Where must access be checked? | Every cancellation requires authorization |
| Fail-safe defaults | What happens when permission is uncertain? | Deny the operation |
| Separation of privilege | Which actions require multiple conditions? | Administrative operation requires appropriate role and scope |
| Economy of mechanism | How can enforcement remain understandable? | Centralize authorization policy |
| Open design | What assumptions remain valid if the design is known? | Security does not depend on hiding API behavior |

These principles guide design but do not themselves enforce anything. The engineer must choose mechanisms with the necessary authority.

![Enforcement of the reservation cancellation policy, drawn in two stacked panels. The upper panel, ENFORCEMENT PATH, reads left to right. A CANCELLATION REQUEST pill feeds an arrow into AUTHENTICATE PRINCIPAL, which establishes the requesting principal u from the verified assertion. An arrow from there crosses into a dashed region headed ONE ATOMIC STEP, which reads: evaluate and cancel under one serialized view of the state, using a transaction, a row lock, or a conditional write. Three boxes sit inside that region. The first, LOAD r AND ITS OWNER, draws the reservation and its ownership from server-side state. An arrow runs right from it to the second, EVALUATE MayCancel of u and r, which is Admin of u OR Owner of u and r. Two arrows leave that box. The arrow labeled YES runs right, still inside the region, to CANCEL RESERVATION. The arrow labeled NO runs down and out of the region to DENY, drawn in the failure color and annotated as the fail-safe default. CANCEL RESERVATION sends an arrow down to RECORD RESULT, which records the principal, the outcome and the time; DENY sends an arrow right into the same RECORD RESULT box, so both outcomes are recorded. Two notes close the panel: a client-supplied user identifier is not evidence of ownership, and a well-formed reservation identifier is not permission to use it; and the same rule must govern every path to this operation, including the administrative endpoint. The lower panel, WITHOUT COORDINATION, shows three time-stamped rows running downward. At T1, in the structure color, Request A loads reservation r and its owner, the owner is u, so MayCancel of u and r holds. At T2, in the failure color, Request B transfers r to another student and the owner becomes v. At T3, also in the failure color, Request A cancels r, acting on a decision that described the state at T1. A closing note reads that the authorization decision was true when it was evaluated and false when it was applied, and that evaluating the policy and performing the operation as one atomic step is what removes the gap.](figures/authorization-enforcement.svg)

The policy must be enforced using trustworthy server-side information. A client-provided user identifier is not sufficient evidence of ownership. Likewise, validating that a reservation identifier is syntactically well formed does not establish that the requester is authorized to use it.

The engineer must also consider concurrency. If authorization depends on mutable information, a change between checking permission and performing the operation may invalidate the decision. The implementation must provide appropriate coordination between the check and the protected action, so that both observe the same state.

**Isolation** limits the consequences of compromise by separating components and restricting their capabilities. A booking service that cannot modify identity-provider records presents a smaller opportunity for abuse than one possessing unrestricted administrative credentials.

Multiple controls can protect the same obligation. This is commonly called **defense in depth**. The controls should address distinct failure paths rather than merely duplicate the same assumption.

## When data acquires authority

Some security failures occur when a component treats information from a less-trusted source as instructions or grants it authority beyond what the engineer intended.

The **Log4j** vulnerability disclosed in December 2021 provides an example. Under affected configurations, attacker-controlled text processed by the logging framework could trigger lookup behavior with consequences beyond recording a message. The resulting vulnerability depended on the interaction among application input, logging functionality, external lookup mechanisms, and runtime configuration.

Agentic systems introduce a related engineering concern. An agent may retrieve a document containing instructions written by an untrusted party. If the agent treats those instructions as authoritative, the document may influence its subsequent use of privileged tools.

![Two columns aligned against three numbered rows named down the left edge: row one, untrusted input; row two, the component that interprets it; row three, the consequential operation. The left column is headed CONVENTIONAL SOFTWARE, a logging framework. Its row-one box, drawn in the hostile color, reads attacker-controlled text, a user-supplied field the application logs. A downward arrow reaches its row-two box, LOGGING FRAMEWORK, which interprets lookup syntax inside the message it was asked only to record. A second downward arrow reaches its row-three box, in the hostile color, EXTERNAL OPERATION, where the lookup resolves and fetches a remote resource. The right column is headed AGENTIC SOFTWARE, an agent with tool access. Its row-one box, also in the hostile color, reads attacker-controlled document, content retrieved from a source we do not control. A downward arrow reaches its row-two box, AGENT CONTEXT, which treats retrieved text as instructions. A second downward arrow reaches its row-three box, in the hostile color, PRIVILEGED TOOL CALL, where the agent acts with the permissions its tools carry. A single dashed red trust boundary runs horizontally across both columns between row two and row three, labeled the boundary to enforce, with the question beneath it: which information may influence a consequential operation, and where is that restriction applied? Below the columns, two lists of controls sit side by side. For conventional software: remove the interpretation behavior, restrict outbound connections, limit process privilege. For agentic software: restrict tool permissions, authorize consequential operations independently, separate retrieved content from governing instructions. Two closing notes read that the mechanisms differ while both ask the same question about authority across a trust boundary, and that instructions asking an agent to ignore malicious content are guidance and not enforcement at the boundary.](figures/untrusted-information-acquires-authority.svg)

The mechanisms differ, but both raise questions about authority across trust boundaries. The engineer must determine which information is permitted to influence consequential operations and where that restriction can be enforced.

For conventional software, controls may include removing dangerous interpretation behavior, restricting outbound communication, and limiting process privileges. For agentic systems, controls may include restricting tool permissions, independently authorizing consequential operations, and separating retrieved content from instructions governing the agent.

Instructions asking an agent to ignore malicious content may be useful guidance, but they are not a substitute for enforcing tool permissions at the relevant boundary.

## Obtaining security assurance

A security control is useful only if it provides the intended protection under the assumptions of the threat model. The engineer must therefore obtain evidence about both the control's implementation and its effectiveness.

| Security claim | Control | Evidence |
|---|---|---|
| Students cannot cancel others' reservations | Server-side authorization | Negative authorization tests |
| User input cannot alter SQL query structure | Parameterized queries | Code review and injection tests |
| A compromised service has limited authority | Restricted service credentials | Permission inspection and isolation tests |
| Known vulnerable dependencies are addressed | Dependency update and admission policy | Inventory and vulnerability checks |
| Untrusted documents cannot authorize privileged agent actions | Independent tool authorization | Adversarial tool-use tests |

Security assurance uses several complementary techniques. **Static analysis** examines program representations without executing the application. **Dynamic analysis** examines behavior during execution. **Fuzzing** supplies generated or mutated inputs to discover unexpected behavior. **Penetration testing** evaluates selected attack paths under an adversarial perspective.

These techniques produce evidence; they are not substitutes for the security controls they examine.

For example, fuzzing may reveal that an API accepts malformed requests, but the mitigation is a change to the implementation or its enforcement mechanisms. Similarly, a passing authorization test establishes behavior for the tested principals, resources, and operations. It does not establish that every possible authorization path has been examined.

The engineer should connect each consequential security claim to its enforcement mechanism and the evidence used to evaluate it.

## Exercise B: Securing reservation cancellation

Students return to the threat identified in Lecture 1: an authenticated student attempts to cancel another student's reservation.

The engineer must decide how to enforce the authorization policy and what evidence is sufficient to accept the implementation.

Students should develop:

1. An authorization rule identifying the principal, resource, operation, and required relationship.
2. An enforcement design showing where the rule is evaluated and what happens when authorization fails.
3. A test plan covering authorized operations, unauthorized operations, and attempts to bypass the enforcement path.

The exercise should also consider a second cancellation interface used by administrators. Does the proposed design apply the correct policy to both interfaces, or has it protected only the ordinary student endpoint?

The intended outcome is a small, explicit security model connected to enforceable behavior and corresponding evidence.

## Engineering judgment

Security engineering extends the Act III method to systems whose inputs and operating conditions may be chosen by adversaries. The engineer models the system and its adversaries, identifies threats to important assets, and specifies the security properties that must be preserved.

The threat model supports decisions about which risks require attention. The security policy specifies permitted behavior. Controls give selected obligations authority in the implementation, while security analysis and testing provide evidence about whether those controls work.

The engineer must also decide which risks remain acceptable. No finite threat model or test suite establishes that a system is secure against every possible adversary. The relevant question is whether the engineer can justify the chosen protections under explicit assumptions about the system, its environment, and its likely attackers.

The next unit examines how operators observe and maintain these properties after deployment, including how they detect, investigate, and respond when the system's behavior departs from expectations.
