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
          annotation: 'Stonebraker and Çetintemel, ["''One Size Fits All'': An Idea Whose Time Has Come and Gone"](https://ieeexplore.ieee.org/document/1410100/), ICDE 2005. Read the entire paper, with emphasis on its opening argument and the comparisons among database workloads. The authors challenge the assumption that one general-purpose database architecture is appropriate for every application. Focus on why transactional processing, analytical queries, and other workloads place different demands on storage organization and query execution. Pay particular attention to the relationship between workload assumptions and architectural choices. Some of the discussion concerns database products and hardware constraints from 2005; you do not need to remember those historical details. Instead, identify the general engineering argument and consider how modern relational, document, and analytical databases complicate the authors'' conclusions. The paper is an argument for workload-sensitive design, not a claim that relational databases have become obsolete.'
    - heading: What a declarative query actually costs
      items:
        - cite: winand2025index
          locator: 'indexing basics and joins; multicolumn indexes optional'
          annotation: 'Winand, [*Use the Index, Luke!*](https://use-the-index-luke.com/), selected chapters. Read the introductory material on indexing and the sections on joins; the multicolumn-index chapters are optional. The site is an online book; do not attempt to read it in full. Start with the explanation of how a B-tree index supports data retrieval, then read the discussion of joins and how database access patterns affect query performance. Focus on the distinction between a declarative query and the physical work required to evaluate it. Two queries that produce the same result may have very different execution costs. Similarly, an ORM can generate functionally correct queries that perform poorly because of repeated database round trips or unsuitable access patterns. The SQL examples are intended to illustrate engineering choices: you do not need to memorize database-specific syntax or become proficient at tuning indexes. The important skill is recognizing when a query''s performance depends on its execution plan and knowing what evidence to inspect before changing the database design.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Lecture slides — Data Management"
    src: 3-2-Data-Management.pptx
---

**Premise.** *Applications execute in processes that start, stop, and change. The information they manage may need to persist independently. Engineers must decide how that information is represented, accessed, and protected, then obtain evidence that the chosen mechanisms provide the required guarantees at an acceptable cost.*

A software application can keep information in its own memory. That is simple and often sufficient for a prototype, but the information disappears when the process stops, and separate instances cannot share coherent state. Moving data into persistent storage separates the lifetime of information from the lifetime of the code that manipulates it.

A database provides mechanisms for managing stored information through defined operations and guarantees. It need not be a separate server: an embedded database can operate within an application process while maintaining persistent data on disk. Other arrangements use database servers or distributed storage systems shared by many applications. Each arrangement changes what the application can assume about durability, concurrent access, and availability.

![Two panels. Panel (a), in-process state, shows an APPLICATION box holding business logic above in-memory state, with an arrow down to a terminal outcome: the process exits and the state disappears, so a restart loses it and separate instances cannot share it. Panel (b), persistent data, shows an APPLICATION box holding only business logic, with an arrow labeled "queries and updates" down to a separate DATABASE box holding persistent storage under defined operations and guarantees; its caption reads that information outlives the process that wrote it and is reachable by every instance. A footer note says the separation is logical: an embedded database keeps persistent data inside the process.](figures/application-and-persistent-data.svg)

The engineering problem is not simply to choose a database product. It is to decide what information must be represented, how the application needs to access it, what properties must remain true, and which mechanisms should enforce those properties.

## Structure of this unit

The lecture begins by separating application execution from persistent information and identifying five engineering decisions: representation, semantics, access, concurrency, and scale. We then examine relational, document, key-value, and graph representations, including the tradeoff between normalized and denormalized data. Next we consider how applications communicate with databases through SQL and object-relational mapping (ORM), and how query optimizers, indexes, and access patterns affect the cost of retrieving information.

The first exercise applies these concepts to our room reservation service. Students select a storage arrangement, develop a data model, and identify the properties that stored reservations must satisfy.

After the break we examine concurrent access, transactions, ACID guarantees, and serializability. A second exercise asks students to diagnose a double-booking race and choose an enforcement mechanism. We conclude with the compatibility obligations introduced when stored representations change.

Both exercises use the Act III engineering method: identify the problem, develop an appropriate model, exercise judgment about realization, and obtain evidence that the chosen solution satisfies its obligations.

## Engineering application data

Five related decisions organize data management.

| Engineering decision | Question |
|---|---|
| Representation | How should information be structured? |
| Semantics | Which guarantees must hold? |
| Access | How should applications query and update information? |
| Concurrency | What behavior is permitted when operations overlap? |
| Scale | What data volume and request rate must be supported? |

These decisions are related but distinct. A database product may support several representations and access patterns, and two products using the same representation may offer different concurrency guarantees. Engineers should therefore establish the application's requirements before selecting a database technology.

## Representing data

A relational representation organizes information into tables connected by relationships. A document representation groups related information into a single stored object. Key-value storage favors retrieving values by known keys, while graph representations make relationships and traversal central operations.

![Two panels hold the same reservation information. The relational panel shows a rooms table with columns room_id, building, and capacity, holding rows for STEW 202 and HAMP 112, above a reservations table with columns res_id, room_id, start, and end, holding three bookings; an arrow labeled "room_id references rooms" marks the foreign key connecting them. Its caption reads: each room fact is stored once; reading a room with its bookings joins the tables; a reservation change updates one row. The document panel shows one document per room: the STEW 202 document lists room_id, building, and capacity, with its two bookings nested inside a reservations list, and the HAMP 112 document likewise nests its one booking. Its caption reads: one read returns a room with its reservations; a query across rooms must visit every document; editing one reservation rewrites the whole document.](figures/representations.svg)

Neither panel is more correct. Each makes one operation convenient and another awkward, so the choice follows from the operations the application must support.

The distinction is not simply relational versus NoSQL. NoSQL describes a broad collection of database approaches, not a particular consistency model. Some nonrelational systems support transactions and strong consistency, while relational systems can support distributed storage and large workloads.

A second representation decision concerns normalization. The relational panel stores each room fact once, so renaming a room updates one record. Copying that name into every reservation can simplify selected reads, but every copy must then be kept consistent when the name changes.

## Accessing data

Applications generally access databases through defined query interfaces rather than manipulating storage files directly. In relational systems, SQL is a declarative language: the application describes the information it wants or the change it wishes to make, while the database chooses how to execute the request. An object-relational mapper (ORM) provides an application-level interface that translates operations on program objects into database operations.

![An APPLICATION node forks into two branches. The left branch is direct SQL, written by the engineer. The right branch is an ORM, drawn with a dashed outline and labeled an optional layer, leading to a generated-SQL node. Both branches rejoin into one QUERY ENGINE node, annotated parse, plan, execute, which reaches STORED DATA. A footer note reads that the ORM is optional and the SQL it generates meets the same engine.](figures/query-access-layers.svg)

An ORM can reduce repetitive persistence code. It does not remove the need to understand the queries it produces.

The engine chooses a physical execution plan for whatever query reaches it. A plan may scan stored records, use an index to locate candidates, or join information from several tables. Two plans producing the same results can have substantially different costs. Indexes reduce search work for selected queries, but require additional storage and maintenance.

Application-level access patterns matter as well, and the order of operations is what makes one of them expensive. An application that loads 200 reservations with one query, then reads each reservation's room under lazy loading, executes 201 queries rather than one or a small fixed number. This is the N+1 query problem, and a join, eager loading, or batched retrieval each reduce the round trips a different way while returning the same information.

Whether it occurs is a property of the configuration rather than of lazy loading as such. If those 200 reservations reference only ten rooms and an ORM identity map holds each one after its first access, eleven queries suffice. If every reservation references a different room, no cache helps and the 201 queries return.

[**The N+1 Trap**](../../../interactive/n-plus-one/index.html) is a five-minute instrument for observing that. The three-line loop stays fixed while you change the loading strategy, the cache, and how many distinct rooms the reservations share; the query timeline shows why two hundred individually cheap queries are expensive. Predict the count before each run.

The program may be functionally correct while its database access pattern is unnecessarily expensive, and query plans, generated SQL, and runtime measurements are the evidence that application source code alone cannot supply.

## Exercise A: Persisting the reservation service

Our reservation service initially keeps reservations in memory. Restarting the application loses its records, and running several instances creates the possibility of inconsistent state. Students need storage that preserves information independently of application execution and makes it available to every instance.

The first decision is which representation and storage arrangement to use. A relational database server is a natural candidate because the application manages users, rooms, and reservations with explicit relationships. Other arrangements are possible, and each must be evaluated against the requirements for persistence, shared access, and integrity.

The second decision is which models to build, and the exercise asks for three.

| Model | What it specifies | Reservation example |
|---|---|---|
| Data model | Facts and relationships | Users, rooms, reservations |
| Integrity model | Acceptable states | No overlapping confirmed reservations |
| Concurrency model | Permitted executions | Concurrent requests cannot both confirm conflicting bookings *(developed in Exercise B)* |

A data model describes the facts the system represents and stops there. Half-open intervals settle one question an integrity model must answer: a reservation ending at 11:00 does not conflict with another beginning at 11:00. The distinction matters because a database can hold individually valid reservation records whose combination violates the application's requirements. Students must determine which obligations can be expressed as database constraints and which require enforcement elsewhere.

## Concurrent access and guarantees

A database may serve many application requests simultaneously. Applications commonly reuse connections through a connection pool, while transactions group related operations under specified guarantees. Concurrent transactions can observe and modify shared information in overlapping periods.

The familiar ACID properties describe four aspects of transaction behavior. Atomicity concerns all-or-nothing transaction effects. Consistency concerns preservation of declared integrity constraints. Isolation governs permitted interactions between concurrent transactions. Durability concerns survival of committed changes under specified failures.

These guarantees are not universal across every operation and configuration: systems differ in the scope of atomicity they provide, in the isolation levels they offer, and in their durability policies. Weaker guarantees may reduce coordination costs, but can require the application to tolerate additional failure modes or enforce properties itself.

![Time runs down two lanes, transaction A on the left and transaction B on the right. A checks availability and sees no conflict. Next, before A has written anything, B checks availability and also sees no conflict. A inserts its reservation and commits; B then inserts its reservation and commits. Both lanes lead into one outcome banner: invalid shared state, two confirmed reservations overlapping in one room. A footer note reads that both transactions observe an available room before either commits.](figures/double-booking-history.svg)

Serializability provides a useful model for reasoning about histories like this one. A concurrent execution is serializable when its relevant effects are equivalent to some serial ordering of the transactions. This does not require transactions to execute one at a time. It constrains which outcomes are permitted.

## Exercise B: Preventing double-booking

Neither request in that history was unreasonable on its own. Their interleaving violated an invariant of the shared state, and no amount of care inside either transaction detects it. Students examine the execution and choose an enforcement mechanism.

| Mechanism | Enforcement authority | Engineering consideration |
|---|---|---|
| Exclusion constraint | Database engine | Rejects invalid writes directly; engine-specific support (PostgreSQL provides it) |
| Serializable transaction | Database isolation plus application retry | Correct transaction design and retry handling |
| Explicit locking | Application protocol plus database locks | Every writer must follow the locking protocol |

The three mechanisms place responsibility in different places, which makes this a decision about the guarantee, its enforcement authority, and its cost rather than a choice among implementation techniques. Stronger coordination can introduce waiting, contention, retries, and reduced throughput. Evidence must therefore include concurrent reservation tests, not merely sequential examples.

## Changing stored representations

Stored information often outlives the application version that created it. A relational schema change therefore proceeds in stages rather than as a single edit:

1. **Expand.** Add the new representation while retaining the old one.
2. **Migrate.** Backfill existing records and keep both representations correct for ongoing writes.
3. **Contract.** Remove the old representation once dependent application versions have retired.

Schema-flexible document databases may let old and new document shapes coexist without that sequence, but application code must then interpret both correctly. Neither approach eliminates the compatibility obligation. The engineer decides where the cost of migration and backward compatibility will be paid.

## Engineering judgment

Data management illustrates the relationship between Modeling and Alignment. Data models describe information, integrity models identify acceptable states, and concurrency models constrain permitted executions. Database constraints and transaction mechanisms can enforce selected obligations independently of application code.

The engineering work is to determine which properties matter, select mechanisms that provide the necessary guarantees, and obtain evidence that they do so at an acceptable cost. Choosing a database is therefore not merely a technology decision. It settles where important properties of the software system are represented and enforced.

The next unit examines how the resulting software structure and its dependencies affect the cost of subsequent changes.
