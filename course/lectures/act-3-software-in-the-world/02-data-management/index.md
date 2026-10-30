---
title: Data Management
readings:
  groups:
    - heading: Why the storage layout should not reach the application
      items:
        - cite: codd1970relational
          locator: 'introduction and §§1.2–1.3'
          annotation: 'Codd, ["A Relational Model of Data for Large Shared Data Banks"](https://doi.org/10.1145/362384.362685), *Communications of the ACM* 13(6), 1970. Read the introduction and §§1.2–1.3. Codd argues that applications should be insulated from changes to the physical organization of stored information. Focus on the problem of data independence and how the relational model separates logical relationships from storage details. The formal notation is less important than the engineering motivation. Consider how this relates to purposeful reduction and degrees of freedom in Modeling.'
    - heading: Workload assumptions drive architecture
      items:
        - cite: stonebraker2005onesize
          annotation: 'Stonebraker and Çetintemel, ["''One Size Fits All'': An Idea Whose Time Has Come and Gone"](https://www.vldb.org/conf/2005/papers/p2-stonebraker.pdf), ICDE 2005. Read the entire paper, with emphasis on its opening argument and the comparisons among database workloads. The authors challenge the assumption that one general-purpose database architecture is appropriate for every application. Focus on why transactional processing, analytical queries, and other workloads place different demands on storage organization and query execution. Pay particular attention to the relationship between workload assumptions and architectural choices. Some of the discussion concerns database products and hardware constraints from 2005; you do not need to remember those historical details. Instead, identify the general engineering argument and consider how modern relational, document, and analytical databases complicate the authors'' conclusions. The paper is an argument for workload-sensitive design, not a claim that relational databases have become obsolete.'
    - heading: What a declarative query actually costs
      items:
        - cite: winand2025index
          locator: 'indexing basics, multicolumn indexes, and joins'
          annotation: 'Winand, [*Use the Index, Luke!*](https://use-the-index-luke.com/), selected chapters. Read the introductory material on indexing and the sections on multicolumn indexes and joins. The site is an online book; do not attempt to read it in full. Start with the explanation of how a B-tree index supports data retrieval, then examine how index column order and query predicates affect which records must be examined. Finally, read the discussion of joins and how database access patterns affect query performance. Focus on the distinction between a declarative query and the physical work required to evaluate it. Two queries that produce the same result may have very different execution costs. Similarly, an ORM can generate functionally correct queries that perform poorly because of repeated database round trips or unsuitable access patterns. The SQL examples are intended to illustrate engineering choices — you do not need to memorize database-specific syntax or become proficient at tuning indexes. The important skill is recognizing when a query''s performance depends on its execution plan and knowing what evidence to inspect before changing the database design.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Lecture slides — Data Management"
    src: 3-2-Data-Management.pptx
---

**Premise.** *A database design follows from the information a system must preserve and the operations it must support. Engineers choose representations, query interfaces, and concurrency guarantees by identifying the required semantics, then obtain evidence that those guarantees hold at an acceptable cost.*

Our room reservation service initially keeps reservations in memory. This is adequate for a demonstration, but restarting the process loses the records. Moving the data to persistent storage addresses that defect. It does not by itself ensure that two simultaneous requests cannot reserve the same room for overlapping times, or that retrieving available rooms remains efficient as the reservation history grows. Persistence, correctness under concurrency, and query performance are separate engineering concerns.

A database is a system for managing stored information through defined operations and guarantees. The familiar choice between relational and NoSQL databases is only one part of the design. Engineers must also choose how the application expresses queries, what constraints the storage system enforces, how concurrent operations interact, and how the system behaves as demand increases. A database can be a local library embedded in one process or a distributed service used by many applications.

## One lecture: Data Management

We begin with an abstract database model and compare relational, document, key-value, and graph representations. We then develop a relational schema for the reservation service, examine SQL and object-relational mapping (ORM), and look beneath the query interface at execution plans, indexes, and batching. The final part addresses transactions, concurrency, and schema evolution. Throughout, the question is which obligations the database can enforce and which remain the responsibility of application code or the wider system.

## The database design space

A useful database model separates five dimensions. The **data model** defines how information is represented, such as relations, documents, key-value entries, or graphs. **Semantics** describe guarantees about stored values, constraints, durability, and observations. The **query interface** defines how applications request and modify information. **Concurrency** governs the behavior of overlapping operations. **Scalability** concerns the costs and mechanisms of handling growing data volumes and workloads, including indexing, replication, and partitioning. These dimensions interact, but none can be inferred from the label of a database product alone.

For example, a relational representation might place rooms and reservations in separate tables connected by a foreign key. A document representation might group selected reservation information with a room. The second choice can make some reads convenient but may complicate updates or queries spanning many rooms. A key-value design favors access by known keys; a graph representation favors traversing relationships. Actual systems often support more than one representation or access pattern.

Likewise, *NoSQL* does not mean that transactions or strong consistency are unavailable. Relational systems can scale across machines, and some NoSQL systems provide multi-record transactions. The useful comparison concerns the particular system's guarantees under the workload and failure conditions that matter. A reservation service that must prevent double-booking has different requirements from a telemetry service that ingests independent sensor measurements.

## Schemas and query interfaces

A relational schema represents entities, attributes, and relationships. Primary keys identify records; foreign keys constrain references; check constraints can reject invalid field values. For example, a reservation should refer to an existing room and have an end time after its start time. Normalization reduces redundant facts and the risk that separate copies disagree. Denormalization can reduce work for selected reads, but requires additional care when duplicated information changes.

SQL is a declarative query language: an application states which results it wants, and the database selects an execution strategy. An ORM offers an application-level interface that maps objects and operations to database queries. It may reduce repetitive persistence code and fit a language's type system, but it does not remove the underlying query semantics or costs. SQL and ORM therefore occupy different layers of the design space. An ORM often generates SQL; developers still need to understand what it asks the database to do.

The database engine parses and validates a query, constructs a logical representation, chooses a physical execution plan, and runs operators such as scans, index lookups, and joins. Two plans that return the same rows can have very different costs. An index may avoid scanning every reservation when searching for bookings for one room. Conversely, an ORM that fetches 100 reservations and then issues a separate query for each associated room creates an **N+1 query** pattern. A join, eager loading, or batched retrieval may reduce network round trips. Query plans and measurements provide evidence about performance that the source-level query alone cannot supply.

## Transactions and concurrent state

Suppose two students request the same available room at nearly the same time. Each request checks for conflicts, sees none, and inserts a reservation. Both operations may be locally reasonable while their interleaving violates the application's central invariant: confirmed reservations for one room must not overlap. A valid schema does not automatically prevent this race.

Transactions provide a unit for grouping database operations. The ACID properties describe atomicity, consistency, isolation, and durability, but they do not mean that a database automatically knows every application rule. Isolation determines which effects of concurrent operations are permitted. **Serializability** provides a useful reference criterion: a concurrent execution should have the same relevant effect as some serial ordering of the transactions. Weaker isolation levels may allow anomalies, and their precise guarantees depend on the database implementation.

The reservation invariant can be enforced through different mechanisms, including a database-specific exclusion constraint, an appropriately designed serializable transaction with retries, or explicit locking. These alternatives differ in portability, contention, and implementation complexity. The engineer must decide where the invariant is represented and where enforcement occurs. Tests should exercise overlapping requests, not merely successful sequential bookings. Under contention, the costs of locking, retries, and aborted transactions also become performance questions.

## Evolving the data model

Stored information outlives many versions of the application that created it. Adding recurring reservations, changing an identifier, or splitting one entity into two may require a schema migration and a plan for existing records. When old and new application versions run concurrently, compatibility becomes another obligation. A migration that succeeds on an empty test database may still fail on real data or interrupt service.

Data management thus provides a direct instance of Modeling and Alignment. Schemas and transaction models represent selected facts and permitted behavior; constraints and concurrency mechanisms can enforce some of those obligations independently of agent-generated application code. Query plans, concurrency tests, and migration rehearsals provide evidence about the resulting system. The next question is how easily the application and its dependencies can be changed as requirements continue to evolve.
