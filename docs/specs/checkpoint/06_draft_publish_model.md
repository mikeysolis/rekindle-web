# 06 Draft Publish Model

## Purpose

This document defines the intended editorial lifecycle that the checkpoint system must support.

## Status Model Decision

The draft status model for the upcoming implementation is:

- `draft`
- `publishable`
- `published`

The current `review` and `exported` states should be retired.

## Why change the model

### `review`

`review` is not currently producing meaningful system behavior.

It functions mostly as a queue label, not as a true workflow boundary.

### `exported`

`exported` is too ambiguous.

It could mean:

- a CSV was downloaded
- a CSV was imported somewhere else
- the idea was published

That ambiguity is bad for checkpointing and restore.

## Meaning of each state

### `draft`

The draft is incomplete or still being edited.

Properties:

- it may fail publish gate
- it does not yet correspond to a canonical published idea

### `publishable`

The draft passes the publish gate and is ready to be promoted into canonical idea tables.

Properties:

- all required content fields are present
- required trait selections are satisfied
- the draft is ready for the explicit publish action

### `published`

The draft has been synchronized into:

- `ideas`
- `idea_traits`

and is durably linked to the published idea.

Properties:

- canonical idea record exists
- canonical idea trait links exist
- draft-to-idea linkage exists

## Required publish action

The status change to `published` should not be a passive label edit.

It should be the result of a real publish operation that:

1. validates the publish gate
2. creates or updates one `ideas` row
3. synchronizes `idea_traits`
4. links the draft to the published idea
5. records publish metadata
6. sets draft status to `published`

The authoritative DB-side contract for this action is defined in:

- `07_rekindle-db_context_dump.md`

## Locked DB-side linkage

Required shape:

- `idea_drafts.idea_id`

Why:

- simpler idempotent publish behavior
- simpler restore logic
- easier UI display on the draft page

Required additional metadata:

- `published_at`
- `published_by`

These fields support auditability, checkpoint provenance, and more reliable restore inspection. They should be added as part of the `rekindle-db` publish workflow work.

## Relationship to checkpointing

Checkpointing becomes cleaner once the publish workflow is real.

The durable content system becomes:

1. catalog intake state
2. drafts and draft traits
3. published ideas and idea traits
4. draft-to-idea linkage

That makes restore deterministic and prevents redoing trait tagging after DB resets.

## Implications for UI

The draft UI should eventually support:

- editing as `draft`
- transition to `publishable` only when gate passes
- explicit `Publish to Ideas` action
- display of linked published idea once publish succeeds

## Post-publish edit rule

`published` should mean the draft is currently in sync with the linked canonical idea.

Because of that, normal editing of a published draft should not leave the row in `published`.

Required web-side behavior:

- if a published draft is edited and saved through the normal draft form, it should be demoted to `publishable`
- a separate explicit publish action is required to return it to `published`

This keeps the status truthful and avoids silent drift between `idea_drafts` and `ideas`.

## Relationship to export

The forward-looking editorial workflow is:

- `draft`
- `publishable`
- `published`

Legacy CSV export may still exist as an auxiliary tool, but it is not the canonical publication path.

The current status filter and editor status options will need to move from:

- `draft`
- `review`
- `publishable`
- `exported`

to:

- `draft`
- `publishable`
- `published`

Any older docs or code paths that still mention `review` or `exported` should be treated as current-state references, not implementation guidance for the new work.
