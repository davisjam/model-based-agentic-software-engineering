---
id: introduction
title: Introduction
kind: introduction
status: draft
description: >
  The map of the book: software engineering presents two complementary kinds of problems — the
  activities that turn a purpose into a system, and the properties that must hold across them. Part I
  follows the activities; Part II follows the properties.
---

Software engineering can be understood from two complementary directions. Some concern the work
required to turn a purpose into a software system: deciding what should be built, determining what must
be true of
it, organizing the system, designing its parts, and gathering evidence that the result is acceptable.
Others concern properties that must hold across all of that work. A system may need to be secure,
reliable, performant, observable, maintainable, or satisfy other obligations that cannot be assigned
neatly to one engineering activity. This book approaches software engineering from both directions.

Part I, From Purpose to System, takes the first view. It begins with software engineering itself and
with the processes and teamwork through which engineering work is organized. It then follows the
decisions that connect purposes in the world to requirements, specifications, architecture, design,
implementation, and validation. The progression is conceptual rather than procedural. Real projects
arrange these activities differently, perform many of them concurrently, and revisit earlier decisions
as they learn. Separating the problems nevertheless helps us understand the different judgments they
require and the information those judgments depend on.

Part II, Making Properties Hold, turns the view ninety degrees. Consider security. Security is not
something that happens at a single stage of development. A security concern can become a requirement,
constrain which realizations are acceptable, determine architectural boundaries, shape detailed design
and implementation, require particular forms of evidence, and continue into deployment and operation.
Reliability, performance, observability, maintainability, and other consequential properties behave
similarly. They cut across the engineering activities of Part I, and decisions made in one place can
determine whether a property holds somewhere else.

These two views belong together. Engineering activities organize the decisions we make; consequential
properties give many of those decisions their purpose. Requirements establish what must be true of the
resulting system. Architecture and design make choices that can make those properties easier or harder
to achieve, while validation supplies evidence for claims that they hold. The aim of this book is
therefore not to memorize a sequence of activities or a list of desirable properties. It is to
understand how engineering decisions connect the purposes we begin with to the properties of the systems
we ultimately build.
