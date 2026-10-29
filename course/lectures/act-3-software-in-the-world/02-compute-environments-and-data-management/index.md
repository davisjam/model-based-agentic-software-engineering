---
title: Compute Environments & Data Management
sessions:
  - "Compute Environments & Deployment"
  - "Data Management"
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
---

*Where does software run, and how does it preserve information?*

A program that runs on a developer's laptop carries unstated assumptions about where it executes and how its information survives. This unit makes both explicit: first the execution environment and the topology that represents it, then the persistent state the service must preserve across restarts and concurrent requests.

**Lecture 1: Compute Environments & Deployment.** Software executes in an environment that supplies resources and imposes constraints. We compare local processes, containers, managed cloud services, mobile devices, and embedded systems in terms of their relevant assumptions about computation, storage, networking, isolation, and failure. A deployment topology represents where components run and communicate. Build artifacts, configuration, infrastructure as code, deployment checks, and rollback mechanisms connect that model to the running system. The opening ten minutes introduce Act III and the running reservation-service example.

**Lecture 2: Data Management.** The service must preserve reservations across restarts and concurrent requests. We introduce relational data models, schemas, keys, integrity constraints, SQL, transactions, and schema migrations. A database schema illustrates a particularly direct connection between Modeling and Alignment: the schema represents selected structural obligations, and the database enforces constraints independently of application code. We distinguish what the database can guarantee from what application logic must still establish.

## Readings

*Readings forthcoming.*
