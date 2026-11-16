<!--
Sync Impact Report
- Version change: uninitialized template → 1.0.0 (initial project constitution)
- Modified principles: template placeholders → five ChangeFlow governance principles
- Added sections: Product and Technical Boundaries; Development and Evidence Workflow
- Removed sections: none
- Follow-up TODOs: confirm the original ratification date; resolve product ambiguities during Specify/Clarify
-->

# ChangeFlow Constitution

## Core Principles

### I. Simple, Layered Business Logic
The architecture MUST remain simple, maintainable, and incrementally extensible. Business rules
MUST live in the Domain or Application layer. Controllers and endpoints MUST receive requests,
invoke application behavior, and map results to HTTP responses; they MUST NOT implement business
rules. Add layers and abstractions only when a demonstrated need justifies their cost.

### II. Secure Decisions and Valid State Transitions
Every sensitive operation MUST verify the caller's identity, current authorization, relevant
ownership, and the request's current state. Self-approval MUST be rejected even when the requester
also has the Reviewer role. An Approved request MUST NOT be editable. Authorization MUST reflect
current permissions at the time of the operation.

### III. Verified Business Invariants
Automated tests MUST cover all six minimum scenarios in Assignment.md: successful Draft creation,
valid submission to PendingReview, rejection of self-approval including dual-role users,
successful independent authorized review, rejection of edits to Approved requests, and prevention
of silent overwrites from stale versions. Sensitive tests MUST inspect persisted state as well as
the HTTP response. Passing tests alone does not establish architectural compliance or human
acceptance.

### IV. Explicit Decisions and Traceability
Product behavior not specified or approved by the product owner MUST NOT be silently decided by an
agent. Record unresolved matters for Specify/Clarify; label assumptions explicitly and keep them
separate from approved decisions so they can be reviewed. Preserve traceability from requirements
through design decisions and tasks to implementation and tests. Requirement coverage by tasks does
not by itself prove readiness to implement.

### V. Evidence-Based Delivery and Incremental Scope
Build, Test, and Validation reports MUST reflect commands actually run and observed results. State
unrun steps, failures, and limitations explicitly; never fabricate test results or human acceptance.
Use the HTTP API as the sufficient product interface; a frontend is not required. AI, RAG, MCP,
and Multi-Agent capabilities are out of scope. Prefer the smallest design that meets approved
requirements and supports expected incremental growth.

## Product and Technical Boundaries

The ChangeFlow workflow and invariants defined as definitive product rules in Assignment.md are
binding. In particular, valid state transitions and authorization are enforced by application
behavior, and approved content cannot be changed without a valid review of that content.

Do not finalize the technology stack, persistence choice, or authentication/authorization
mechanism in this constitution. Compare and document those choices during Plan/Research. Likewise,
compare concurrency-control options during Plan/Research; this constitution requires protection
against silent overwrites and inconsistent state but does not prescribe a mechanism.

Behavior left open by Assignment.md, including deletion of drafts, visibility of other users'
requests, permission revocation behavior, and duplicate request handling, requires a product-owner
decision in Specify/Clarify or an explicitly reviewable assumption. Do not treat an assumption as
approval.

## Development and Evidence Workflow

Analyze is a read-only consistency review of the specification, plan, and tasks. Converge assesses
gaps between the current implementation and documented intent; it MUST NOT directly modify code.
Convert remaining work found during Converge into traceable tasks. Build, Test, Validation, and
Acceptance are distinct claims; report only the stages actually performed and do not claim human
acceptance without that evaluation.

## Governance

This constitution governs project decisions and agent work. When a proposed change conflicts with
it, record the conflict and resolve it through an explicit constitution amendment or an approved
product decision before proceeding. Review architecture, security, test evidence, traceability, and
scope compliance during relevant reviews; test success alone is not a substitute for these checks.

Amendments MUST update this file and its version/date metadata. Use semantic versioning: increment
MAJOR for incompatible governance changes, MINOR for added principles or materially expanded
requirements, and PATCH for clarifications or non-semantic edits. Record unresolved facts as
explicit TODOs instead of inventing them.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date is unknown | **Last Amended**: 2026-11-16
