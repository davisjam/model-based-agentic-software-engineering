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
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Lecture slides — Compute Environments & Deployment"
    src: 3-1-Compute-Environments-and-Deployment.pptx
---

**Premise.** *The appropriate execution environment follows from what a system must do and the conditions under which it must do it. Deployment engineering represents those conditions, selects an environment that satisfies them, and controls the transition from a tested implementation to running software.*

A room reservation service runs successfully on a developer's laptop. Its HTTP endpoints respond correctly, and its tests pass. Now the service must be used by students across campus. The application needs a reachable address, sufficient computing resources, a predictable runtime, and a way to install updates. The source code has not necessarily changed, but the engineering problem has. The implementation depended on an environment all along; deployment makes those dependencies consequential.

The word *deployment* sometimes refers narrowly to copying software into production. Here it includes selecting an execution environment, describing the intended arrangement, preparing a deployable artifact, and controlling its release. These activities are related but distinct. A suitable environment does not guarantee a correct installation, and a successful installation does not establish that the system will behave acceptably under production conditions.

## One lecture: Compute Environments & Deployment

We begin by comparing the environments in which software executes, including embedded devices, mobile and desktop computers, servers, and cloud platforms. We then develop a deployment model for the reservation service and use it to compare design alternatives. The second half of the lecture examines build and runtime environments, continuous integration and delivery, and release strategies that limit the consequences of a defective change.

## Modeling an execution environment

An execution environment supplies the resources and services on which a program depends. The relevant properties may include processor architecture, memory, operating-system interfaces, storage, network access, connected devices, and timing constraints. A deployment model represents the software components, the nodes on which they execute, the communication paths between them, and the environmental assumptions that matter to the decision. A resource model can add quantitative requirements, such as a memory ceiling or expected concurrent workload.

These models are purposeful reductions. A diagram showing a browser, application server, and database may suffice to reason about network communication. It will not answer whether a controller meets a real-time deadline or whether a mobile application can operate offline. The engineer must first identify the property to be decided, then choose a representation that exposes it.

The common execution categories also describe different dimensions. *Embedded*, *mobile*, *desktop*, and *server* describe settings with characteristic constraints; *cloud* describes a way of obtaining and operating computing services. Processes, containers, and virtual machines are execution mechanisms. A container typically isolates processes while sharing the host kernel; a virtual machine ordinarily runs a guest operating system. None of these distinctions determines the right deployment by itself. A mobile application may use a cloud backend, and a cloud application may run inside containers or virtual machines.

For the reservation service, a local installation may be suitable for a single receptionist operating without network connectivity. A centrally hosted service better supports students accessing the same reservation state from many devices, but introduces network dependence and operational responsibility. The choice follows from availability, access, cost, privacy, and maintenance requirements rather than from a preference for a particular platform.

## From a deployment model to a running system

A deployment model describes an intended arrangement. The deployment process produces and installs an implementation of that arrangement. It must account for differences between the build environment and the runtime environment, including dependencies, configuration, credentials, and external services. A program can compile successfully yet fail to start because its runtime lacks a library or cannot reach a required service. Declared configuration, pinned dependencies, reproducible build procedures, and infrastructure as code help make those assumptions inspectable. They reduce sources of variation but do not eliminate them.

Continuous integration (CI) integrates proposed changes and runs automated checks. Continuous delivery keeps an accepted artifact ready for release; continuous deployment automatically deploys artifacts that satisfy the configured criteria. A pipeline is an executable model of part of the engineering process: it specifies the stages through which a change proceeds and the checks that must succeed. Required checks can serve as admission gates. They provide evidence about selected properties, not proof that every operational condition is safe.

Release management addresses a further decision: when and to whom should an accepted change become available? Blue-green deployment switches production traffic between prepared environments. A canary release initially exposes a new version to a limited population or fraction of traffic. Feature flags control which behavior is active without necessarily requiring another deployment. These strategies control different dimensions of exposure. Each has costs: duplicate environments consume resources, canaries require meaningful observations, and feature flags add states that must themselves be tested. Shared databases can also complicate rollback even when application traffic is easy to redirect.

## Evidence and control

The deployment problem follows the Act III engineering method. We identify environmental requirements, represent them in deployment and resource models, compare alternatives, and obtain evidence through builds, integration tests, deployment checks, and runtime observations. Alignment connects selected obligations to controls: a configuration validator can reject missing settings, a pipeline gate can block an untested artifact, and a release policy can require staged exposure. Observations after deployment may reveal that the original model omitted an important assumption.

The reservation service can now run somewhere other than the developer's laptop. That does not yet settle what happens to reservations when its process stops or when several users change shared state concurrently. Those questions require a model of stored information and the guarantees of the system that manages it.
