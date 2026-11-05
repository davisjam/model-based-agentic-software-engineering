---
title: Compute Environments & Deployment
readings:
  groups:
    - heading: Pipelines as admission gates
      items:
        - cite: winters2020
          locator: 'Chapters 23–24'
          annotation: 'Winters, Manshreck, and Wright, *Software Engineering at Google*, Chapters 23–24: ["Continuous Integration"](https://abseil.io/resources/swe-book/html/ch23.html) and ["Continuous Delivery"](https://abseil.io/resources/swe-book/html/ch24.html) (2020). Read these two chapters as one assignment. They explain how continuous integration and delivery pipelines help teams build, test, and release software while controlling the risks of change. Focus on the relationship between automated checks, reproducible builds, and release confidence. The details of Google''s internal infrastructure are less important than the engineering problems its practices address.'
    - heading: Deploying where you cannot reach the machine
      items:
        - cite: memfault2023ota
          annotation: 'Memfault, ["OTA Updates for Embedded Linux Devices"](https://interrupt.memfault.com/blog/ota-updates-for-embedded-linux-devices). Embedded devices may be deployed in locations where engineers cannot physically access them. Updating their software therefore requires a mechanism that can tolerate interrupted downloads, failed installations, and unexpected restarts. Focus on how an update is packaged, installed, verified, and recovered or rolled back. Compare these constraints with deploying a web service, where the operator generally controls the server environment.'
    - heading: When the platform owns the last mile
      items:
        - cite: android2026appbundle
          annotation: 'Android Developers, ["Android App Bundle Overview"](https://developer.android.com/guide/app-bundle). Mobile applications are distributed through a platform that manages packaging and delivery to heterogeneous devices. Read for the distinction between the artifact developers produce (an Android App Bundle) and the APKs installed on devices. Focus on how this arrangement handles device-specific configurations and what control the developer retains over distribution. The implementation details of individual bundle modules are less important.'
    - heading: Earlier reading revisited
      items:
        - cite: dora-metrics
          annotation: 'DORA, ["Software Delivery Metrics: The Four Keys"](https://dora.dev/guides/dora-metrics/), previously assigned in Unit 03, Teamwork. First read for how an organization measures software delivery performance; reread it against the release machinery of this unit: deployment frequency and lead time for changes describe the pipeline you have just built, while change failure rate and time to restore service describe what a release strategy is for. Those last two return in the Operations unit, where the subject is keeping a deployed system healthy rather than getting a change into it. *Which of the four would a canary release improve, and which could it make worse?*'
      note: 'If you skipped this reading in Teamwork, read it now.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Lecture slides — Compute Environments & Deployment"
    src: 3-1-Compute-Environments-and-Deployment.pptx
labs:
  - title: The Release Factory
    slug: release-factory
    about: >
      The release decision, run as a pipeline you parameterize. You set the build and test lanes, the
      release slots, the defect and flaky-test rates, and the monitoring quality, then choose a canary
      share and soak time or a blue-green verification, and read back all four delivery metrics:
      deployment frequency, lead time, change failure rate, and time to restore. The engine is seeded,
      so each run reproduces and a change in the numbers is a change you caused. Turn the monitoring
      quality down and watch the canary stop reporting. The exposure control still works; nothing comes
      back to act on. That is the fourth step failing while the third still looks healthy.
---

**Premise.** *Software executes in compute environments with different capabilities and constraints. Engineering requires understanding those constraints, representing how software components are assigned to computing resources, and controlling the process by which an implementation becomes a running system.*

A room reservation service runs successfully on a developer's laptop. Its HTTP endpoints respond correctly, and its tests pass. Now students across campus must use it. The application needs a reachable address, sufficient computing resources, a predictable runtime, and a way to install updates. The source code need not change for the engineering problem to change. The implementation depended on an environment all along; deployment makes those dependencies consequential.

The word *deployment* sometimes means only copying software into production. Here it covers selecting an execution environment, describing the intended arrangement, preparing a deployable artifact, and controlling its release. The activities are related but distinct: a suitable environment does not guarantee a correct installation, and a correct installation does not establish that the system will behave acceptably in production.

## Structure of this unit

We first compare the environments in which software executes, then build a deployment model for the reservation service and use it to weigh design alternatives. The second half turns to build and runtime environments, continuous integration and delivery, and the release strategies that limit what a defective change can cost.

## Modeling an execution environment

An execution environment supplies the resources and services on which a program depends. An environment model sets what the application requires against what a candidate environment provides.

| Application requirement | Environment capability |
|---|---|
| Compatible runtime | Installed runtime and dependencies |
| Sufficient memory | Available RAM |
| Network reachability | Addressable endpoint and routing |
| Persistent data | Suitable storage service |
| Availability target | Operational capacity and recovery mechanisms |

A row matches only when the capability *satisfies* the requirement. Similarly named is not the same as sufficient: a machine with RAM installed may have none free, and an addressable endpoint behind a closed firewall routes nothing. Check the version, the quantity, and the reachability rather than the label.

A deployment model then represents the software components, the nodes on which they execute, the communication paths between them, and the environmental assumptions that matter to the decision. A resource model adds quantitative requirements, such as a memory ceiling or an expected concurrent workload.

These models are purposeful reductions. A diagram of browser, application server, and database may settle a question about network communication and say nothing about whether a controller meets a real-time deadline. Identify the property to be decided, then choose a representation that exposes it.

The familiar execution categories describe different dimensions. *Embedded*, *mobile*, *desktop*, and *server* name settings with characteristic constraints; *cloud* names a way of obtaining and operating computing services. Processes, containers, and virtual machines are execution mechanisms rather than settings. No label settles a deployment by itself: a mobile application may use a cloud backend, and a cloud application may run inside containers.

> **Note.** A container isolates processes while sharing the host kernel; a virtual machine runs a guest operating system of its own. The lecture does not develop the distinction further.

For the reservation service, several arrangements satisfy different requirements, and they differ in where the interface, the business logic, and the persistent state execute. A local installation keeps all three on one machine. A client-server arrangement puts the interface on each user's device and gives a shared server both the logic and the reservation state. A web application separates all three: a browser, an application server carrying no reservation state of its own, and a database service holding that state.

![Three panels compare where the parts of one reservation service execute, and every box is labeled by tier: interface, business logic, or persistent state. The LOCAL panel holds a single machine carrying all three tiers stacked together. The CLIENT-SERVER panel splits them: a user device holds only the interface, and an arrow labeled "network" leads down to a shared server holding both the business logic and the persistent state. The WEB APPLICATION panel splits them again into three: a browser holds the interface, an arrow labeled "network" leads to an application server holding the business logic and annotated "holds no reservation state", and an arrow labeled "data access" leads on to a separate database service holding the persistent state. A legend names the three tiers. A closing note reads: the same tier may sit on a different machine in each arrangement, so the split, not the number of boxes, is the decision.](figures/deployment-topology.svg)

Each split buys something and costs something. The local installation suits a receptionist working without a network, and nobody else sees the reservations. The client-server arrangement gives every user one shared view and makes the network a dependency of ordinary work. Separating the application server from the database lets the operator add or replace application servers without touching reservation data, and makes the database the one component whose failure stops the service. Availability, access, cost, privacy, and maintenance decide among these, not a preference for a platform.

## From a deployment model to a running system

A deployment model describes an intended arrangement; the deployment process produces and installs an implementation of it. Four steps carry source code to a running system:

1. Declare inputs and dependencies.
2. Build an artifact in a controlled environment.
3. Deploy with declared configuration.
4. Verify behavior in the target environment.

Verification earns its own step because the build environment and the runtime environment differ in dependencies, configuration, credentials, and reachable services. A program can compile and still fail to start, because its runtime lacks a library or cannot reach a service it needs. Declared configuration, pinned dependencies, reproducible builds, and infrastructure as code make those assumptions inspectable. They reduce variation; they do not eliminate it.

Continuous integration (CI) integrates proposed changes and runs automated checks. Continuous delivery keeps an accepted artifact ready for release; continuous deployment ships artifacts that satisfy the configured criteria without waiting for a person. A pipeline encodes part of the engineering process as an executable model: the stages a change passes through, and the checks that must succeed. Required checks serve as admission gates, and they provide evidence about selected properties rather than proof that every operational condition is safe.

![A proposed change flows into a continuous integration band with three steps: integrate the change, build an artifact, run automated checks. The checks branch: when they fail, the change is revised and resubmitted; when they pass, it becomes an accepted artifact. From the accepted artifact the flow forks into two sibling practices. Continuous delivery keeps every accepted artifact ready to release, and a dashed edge labeled "release is a decision" leads to production, because a person or policy still chooses when. Continuous deployment ships artifacts that meet the configured criteria automatically, and a solid edge labeled "release is automatic" leads to the same production node. A closing note repeats that the required checks are an admission gate: evidence about selected properties, not proof that every operational condition is safe.](figures/ci-cd-pipeline.svg)

Release management addresses a further decision: when and to whom should an accepted change become available? Each strategy controls a different dimension of exposure, and each pays for the control it buys.

| Strategy | Controls | Principal limitation |
|---|---|---|
| Blue-green | Which environment receives traffic | Shared state complicates rollback |
| Canary | Fraction of users or requests exposed | Limited exposure may not reveal rare defects |
| Feature flags | Which functionality is enabled | Flag combinations increase testing complexity |

The strategies differ; the release decision does not:

1. Collect evidence.
2. Apply admission policy.
3. Select exposure strategy.
4. Monitor and accept or roll back.

The fourth step is what makes the third worth doing. A canary nobody watches exposes a fraction of users to a defect and reports nothing back.

To practice this, see {lab:release-factory}.

## Evidence and control

The deployment problem follows the Act III engineering method. We identify environmental requirements, represent them in deployment and resource models, compare alternatives, and obtain evidence from builds, tests, deployment checks, and runtime observations. Alignment then connects an obligation to a control: a configuration validator rejects missing settings, a pipeline gate blocks an untested artifact, a release policy requires staged exposure. Observations after deployment may still reveal an assumption the model omitted.

The reservation service can now run somewhere other than the developer's laptop. The topology figure named a database service without saying what it guarantees, and that gap is the next unit's subject: what happens to reservations when a process stops, and what happens when several users change shared state at once. Answering either requires a model of stored information and of the guarantees the system managing it provides.
