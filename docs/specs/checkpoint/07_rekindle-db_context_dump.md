# 07 Rekindle-DB Context Dump

## Purpose

This document is the handoff context for the future `rekindle-db` work required to support:

- the new draft status model
- real publish-to-ideas behavior
- cleaner checkpoint restore

This document belongs in `rekindle_web` so the parent project retains the planning context while DB migrations continue to be implemented in `rekindle-db`.

## Locked product decisions

### 1) Draft status model

Target states:

- `draft`
- `publishable`
- `published`

Remove:

- `review`
- `exported`

### 2) Published must be real

`published` must mean:

- one canonical `ideas` row exists
- canonical `idea_traits` exist
- the draft is linked to that idea

It must not mean:

- a CSV was merely exported
- the draft is “ready someday”

### 3) Draft-to-idea linkage

Locked field:

- `idea_drafts.idea_id uuid null`

Required behavior:

- FK to `ideas.id`
- populated on first successful publish
- reused on re-publish
- used as the inclusion rule for published ideas in checkpoint export

### 4) DB migrations happen in `rekindle-db`

Any schema changes, constraints, and RPCs belong in the DB project.

The web project can:

- define the desired contract
- provide context
- optionally draft migration SQL for handoff

## Recommended DB changes

### A) Update `idea_drafts.status`

Current shape in app/docs/code:

- `draft`
- `review`
- `publishable`
- `exported`

Recommended target:

- `draft`
- `publishable`
- `published`

This will likely require:

- new migration altering the check constraint on `idea_drafts.status`
- app/web code updates after the DB contract is ready

### B) Add publish metadata

Required fields:

- `published_at timestamptz null`
- `published_by uuid null`

Reason:

- publish auditability
- checkpoint provenance
- simpler operator inspection after restore

### C) Add publish RPC or equivalent DB-owned contract

Locked recommended RPC surface:

- `public.idea_draft_publish_to_idea(p_draft_id uuid)`

Required behavior:

- validate draft exists
- validate draft is publishable
- run in one transaction
- if `idea_drafts.idea_id` is `null`:
  - create one new `ideas` row from the draft
  - set `idea_drafts.idea_id`
- if `idea_drafts.idea_id` is already populated:
  - update that exact linked `ideas` row
  - do not create a second idea
  - do not try to match a different idea heuristically by slug or title
- replace canonical `idea_traits` for the linked idea with the draft's current canonical trait selections
- set draft status to `published`
- set `published_at`
- set `published_by`
- return the linked `draft_id` and `idea_id`

Recommended return shape:

- `draft_id uuid`
- `idea_id uuid`
- `created_idea boolean`
- `draft_status text`

Recommended failure conditions:

- draft does not exist
- draft fails publishability requirements
- draft linkage is invalid
- any required write fails

Failure should roll back the full transaction. Partial publish is not acceptable.

## Recommended idempotency behavior

Publishing the same draft multiple times should not create duplicate ideas.

Recommended rule:

- if `idea_drafts.idea_id` already exists, update that idea
- otherwise create a new idea and link it

Trait sync should replace canonical trait assignments for the target idea based on the draft’s current selections.

This means published drafts remain editable and re-publishable. Re-publish updates the same linked idea rather than creating a new one.

## Checkpoint implications

These DB changes directly simplify checkpointing.

Once implemented, checkpoint restore can treat the following as first-class durable domains:

- `catalog_import_*`
- `idea_drafts`
- `idea_draft_traits`
- `ideas`
- `idea_traits`

with explicit draft-to-idea linkage preserved.

## Suggested validation scenarios for `rekindle-db`

### 1) Publish a publishable draft

Expect:

- one `ideas` row created
- expected `idea_traits` created
- `idea_drafts.idea_id` populated
- draft status becomes `published`
- returned `draft_id` and `idea_id` are correct

### 2) Re-publish an already published draft

Expect:

- same `ideas` row updated
- no duplicate idea rows
- trait assignments re-synced
- draft remains linked to the same idea

### 3) Attempt to publish a non-publishable draft

Expect:

- operation blocked
- no partial idea row created

### 4) Restore after DB reset

Expect:

- checkpoint restore can recreate:
  - drafts
  - draft traits
  - published ideas
  - idea traits
  - draft-to-idea link

## Notes for future SQL drafting

If SQL is drafted in `rekindle_web` for handoff, it should stay as documentation/context only and not be applied from this repo.

Potential future doc artifact:

- [09_rekindle-db_publish_migration_draft.sql](/Users/mike/Code/rekindle_web/docs/specs/checkpoint/09_rekindle-db_publish_migration_draft.sql) for copy/adaptation in `rekindle-db`
