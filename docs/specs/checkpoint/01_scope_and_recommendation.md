# 01 Scope And Recommendation

## Problem

Rekindle Studio work is currently stored only in the app database.

During alpha and pre-production, the database is reset frequently. That means the team can lose:

- catalog intake review decisions
- drafts
- draft traits
- promoted/published ideas
- published idea trait assignments

The issue is not that Studio fails to track state while the DB is live.

The issue is that the current state is not durable outside the resettable environment.

## Recommended Solution

Build a **checkpoint system** rather than a new generalized workflow ledger.

The checkpoint system should:

- export the current Studio-owned content state to files
- allow manual restore into a fresh/reset database
- keep named checkpoint files committed to Git
- align to a real editorial funnel:
  - `draft`
  - `publishable`
  - `published`

This is the simplest solution that directly addresses the reset problem.

## Why A Checkpoint System

This approach is better than a richer state-tracking system for the current phase because it is:

- simpler to explain
- easier to operate
- easier to validate
- easier to restore from
- less likely to become a second product inside Studio

## Automatic Vs Manual

### Restore

Restore should always be manual.

Reasons:

- it is a high-risk operation
- it should require confirmation
- it is normally performed after a deliberate reset

### Save / checkpoint creation

The right answer is phased:

- v1: manual named checkpoints
- v1.5: automatic rolling `latest` checkpoint plus manual named checkpoints

The important distinction is:

- automatic checkpoint generation is useful
- automatic Git commits are not part of v1

Studio can create checkpoint files, but Git commits remain an operator step.

## Key v1 principle

V1 should optimize for:

- reliable restore
- small scope
- deterministic behavior

It should not optimize for:

- clever synchronization
- continuous cross-environment mirroring
- full database portability

## Editorial state decision

The recommended draft status model is:

- `draft`
- `publishable`
- `published`

The current `review` and `exported` model should be replaced.

Reason:

- `review` is not creating meaningful system behavior
- `exported` is too ambiguous for long-term checkpointing and restore
- `published` should mean the draft has actually been synchronized into canonical content tables

This decision should be treated as a prerequisite for the cleanest checkpoint implementation.
