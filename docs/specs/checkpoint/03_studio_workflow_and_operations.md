# 03 Studio Workflow And Operations

## Purpose

This document defines how checkpointing should feel operationally inside Studio.

## User Model

Operators should think about checkpointing in two actions:

- create/update checkpoint
- restore checkpoint

They should not need to think in terms of backing up arbitrary tables.

## Recommended UI Shape

Add a dedicated Studio section for checkpointing rather than burying it inside publish/export CSV flows.

Suggested surface:

- `Studio > Checkpoint`

Core UI elements:

- last checkpoint timestamp
- checkpoint contents summary
- dirty/clean status
- `Refresh latest checkpoint now`
- `Create named checkpoint`
- `Restore checkpoint`

This should coexist with a separate draft publishing workflow.

Checkpointing is for durability.
Publishing is for moving a publishable draft into canonical `ideas`.

## Authorization model

Checkpoint actions should follow the existing Studio role model.

Recommended permissions:

- `viewer`
  - may see checkpoint status metadata if the section is visible
  - may not create, refresh, dry-run restore, or restore checkpoints
- `editor`
  - may create named checkpoints
  - may refresh the rolling `latest` checkpoint
  - may run restore dry-run validation
  - may not execute restore
- `admin`
  - may do everything above
  - is the only role allowed to execute restore

Restore is intentionally admin-only because it is destructive at the scoped-table level even when the DB has already been reset.

## Save behavior

### V1

Manual named checkpoint creation.

Behavior:

- operator clicks a button
- Studio exports the current content state to a JSON checkpoint file
- Studio shows success, timestamp, and contents summary
- operator commits the checkpoint file to Git

V1 assumes that named checkpoints are the primary reliable rollback point before DB resets.

### V1.5

Add automatic rolling checkpoint behavior.

Behavior:

- any state-changing Studio action marks content as dirty
- after a debounce window, Studio refreshes one rolling `latest` checkpoint file
- manual named checkpoint still exists for explicit milestones
- no scheduled background refresh runs in v1.5
- if data may have changed outside Studio, the operator must use:
  - `Refresh latest checkpoint now`
  - or `Create named checkpoint`

Reasons to keep both:

- automatic rolling save reduces operator error
- named checkpoint creates a deliberate restore milestone suitable for Git commit

## Restore behavior

Restore should remain manual in all versions.

Recommended flow:

1. operator resets DB
2. operator opens Studio checkpoint restore
3. operator selects a checkpoint file
4. Studio runs dry-run validation
5. operator confirms restore
6. Studio imports the checkpoint package
7. Studio reports restored counts

The restore UI should make the restored editorial funnel visible:

- intake count
- draft count
- published idea count

Restore execution rules:

- restore remains manual even if checkpoint creation later becomes automatic
- admin must explicitly confirm the restore after dry-run
- V1 restore targets a fresh/reset DB only
- V1 does not support merge restore into a dirty DB

## Git workflow

### Important principle

Checkpoint generation and Git commit are separate actions.

V1 should not try to perform Git commits automatically.

Reasons:

- Git credentials and branch hygiene vary by environment
- automatic commit behavior is harder to trust
- accidental commit churn would be noisy

### Recommended operator pattern

1. create named checkpoint
2. review file diff if needed
3. commit checkpoint file to Git
4. reset DB only after checkpoint exists

## Storage model

Checkpoint files must live outside the resettable DB.

Locked v1/v1.5 pattern:

- Git-tracked named checkpoints:
  - `checkpoints/studio/named/YYYY-MM-DDTHH-mm-ssZ--<label>.checkpoint.json`
- local rolling checkpoint:
  - `var/studio-checkpoints/latest.checkpoint.json`

Rules:

- named checkpoints are the durable operator-facing artifacts and are intended to be committed to Git
- the rolling `latest` file is operational and should remain untracked
- checkpoint packages are single JSON files, not file bundles plus manifest
- timestamps should be written in UTC using filesystem-safe formatting:
  - `YYYY-MM-DDTHH-mm-ssZ`

This keeps Git history deliberate while still allowing future automatic rolling checkpoint behavior without commit churn.

## Write reliability

Checkpoint writes must be crash-safe enough to trust operationally.

Required behavior:

- serialize the full package before replacing the target file
- write to a temporary file in the same target directory
- validate that the temporary file is parseable JSON
- compute and store a SHA-256 checksum in package metadata before finalization
- rename the temporary file into place only after the package is complete

Additional rules:

- named checkpoints must never be overwritten
- refreshing `latest` must replace the prior file atomically
- if a write is interrupted, the previously valid `latest` file should remain usable
- restore should verify checksum before attempting import

## Relationship to publish workflow

Checkpointing does not replace publish.

The intended content lifecycle is:

1. catalog intake candidate promoted to draft
2. draft edited until publishable
3. publish action writes to `ideas` and `idea_traits`
4. checkpoint persists all of the above
