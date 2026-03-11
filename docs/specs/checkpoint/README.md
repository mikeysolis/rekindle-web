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
- keep restore execution DB-owned through `rekindle-db` RPCs rather than web-owned multi-step inserts

## Authoritative Note

For the current checkpoint and draft-publish system, the authoritative docs are:

- `02_checkpoint_package_and_restore_contract.md`
- `03_studio_workflow_and_operations.md`
- `04_implementation_plan.md`
- `06_draft_publish_model.md`
- `07_rekindle-db_context_dump.md`

Older repo docs that still mention:

- `review`
- `exported`
- export-only MVP flows

describe current or superseded behavior and should not be used as the implementation source for the new work.

## Implemented Status

The following is now implemented in `rekindle_web`:

- manual named checkpoint creation
- named checkpoint files written under `checkpoints/studio/named/`
- Studio dry-run restore UI
- Studio restore execution UI
- DB-owned restore contract via `rekindle-db` RPCs

The main remaining planned work is:

- automatic rolling `latest` checkpoints
- docs/runbook polish
- final seed-layer split in `rekindle-db`

## Document Map

1. `01_scope_and_recommendation.md`
2. `02_checkpoint_package_and_restore_contract.md`
3. `03_studio_workflow_and_operations.md`
4. `04_implementation_plan.md`
5. `05_open_questions.md`
6. `06_draft_publish_model.md`
7. `07_rekindle-db_context_dump.md`
8. `08_documentation_gap_audit.md`
9. `09_rekindle-db_publish_migration_draft.sql`

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
