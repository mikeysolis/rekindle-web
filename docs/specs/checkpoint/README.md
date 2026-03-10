# Rekindle Checkpoint Specs (v1)

## Purpose

This spec pack defines the pre-production checkpoint system for Rekindle Studio.

The goal is simple:

- preserve Studio work across frequent database resets
- restore the database to the last durable checkpoint
- keep the solution reliable and operationally simple

This is not a long-term production backup platform. It is a pragmatic alpha/pre-production durability system.

## Current Recommendation

The recommended direction is:

- checkpoint the relevant Studio content domains to files outside the resettable DB
- keep restore manual
- commit named checkpoint files to Git
- phase automatic checkpoint generation in only where it materially reduces operator error

## Authoritative Note

For the upcoming checkpoint and draft-publish implementation work, the authoritative docs are:

- `02_checkpoint_package_and_restore_contract.md`
- `03_studio_workflow_and_operations.md`
- `04_implementation_plan.md`
- `06_draft_publish_model.md`
- `07_rekindle-db_context_dump.md`

Older repo docs that still mention:

- `review`
- `exported`

describe current or superseded behavior and should not be used as the implementation source for the new work.

## Document Map

1. `01_scope_and_recommendation.md`
2. `02_checkpoint_package_and_restore_contract.md`
3. `03_studio_workflow_and_operations.md`
4. `04_implementation_plan.md`
5. `05_open_questions.md`
6. `06_draft_publish_model.md`
7. `07_rekindle-db_context_dump.md`
8. `08_documentation_gap_audit.md`

## Scope Boundaries

- In scope:
  - catalog intake review state
  - drafts and draft traits
  - published ideas and idea traits
  - checkpoint export/import
  - Git-backed named checkpoints

- Out of scope for v1:
  - full database backup/restore
  - automatic Git commits from Studio
  - merge restore into arbitrary dirty DB states
  - highly granular event sourcing
  - cross-environment replication
