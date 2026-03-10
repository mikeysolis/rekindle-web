# 02 Checkpoint Package And Restore Contract

## Purpose

This document defines what a checkpoint package must contain and how restore should behave.

## Checkpoint Domains

The checkpoint package should include three content domains.

### 1) Catalog intake

Tables in scope:

- `catalog_import_batches`
- `catalog_import_clusters`
- `catalog_import_candidates`
- `catalog_import_decisions`

Purpose:

- preserve batch review state
- preserve preferred/alternate/rewrite/reject decisions
- preserve draft linkage from catalog intake

### 2) Drafts

Tables in scope:

- `idea_drafts`
- `idea_draft_traits`

Purpose:

- preserve in-progress editorial work
- preserve draft trait selections

### 3) Published ideas

Tables in scope:

- `ideas`
- `idea_traits`

Purpose:

- preserve already-promoted content
- avoid redoing trait tagging after DB reset

Inclusion rule:

- include only `ideas` rows that are explicitly linked from checkpoint-managed drafts via `idea_drafts.idea_id`
- include the corresponding `idea_traits` rows for those linked ideas
- exclude unrelated `ideas` rows that are not linked from checkpoint-managed drafts

This keeps checkpoint export narrowly scoped to Studio-managed editorial content and prevents the feature from turning into a general-purpose app-data backup.

Important note:

The target editorial model for the upcoming work is:

- `draft`
- `publishable`
- `published`

`published` must mean:

- one canonical `ideas` row exists
- the corresponding `idea_traits` rows exist
- the draft is linked to that published idea

So `ideas` and `idea_traits` are no longer optional thought-experiments for checkpointing. They are part of the required durable scope.

## Explicit v1 exclusions

The checkpoint package does not include:

- user-state tables
- analytics or telemetry data
- search indexes or materialized views
- denormalized caches
- presentation-only derived data
- unrelated idea-adjacent tables that are not required to reconstruct `ideas` plus `idea_traits`

If another idea-side child table later becomes necessary to faithfully reconstruct published editorial content, it must be added explicitly in a future revision of this contract.

## Identity Strategy

### Content entities

For restore into a fresh/reset DB, preserve the existing internal IDs for:

- catalog intake entities
- drafts
- ideas

Drafts should also preserve their link to the published idea once that linkage exists.

This keeps restore simpler and preserves existing cross-table linkages.

### Trait assignments

For draft traits and idea traits, use trait slugs as the canonical restore reference:

- `trait_type_slug`
- `trait_option_slug`

Do not rely solely on raw trait UUIDs for portability.

The restore process should resolve trait IDs from the seeded registry.

## Checkpoint Package Structure

The package should be JSON-based.

Top-level sections:

- `metadata`
- `catalog_intake`
- `drafts`
- `published_ideas`

### `metadata`

Recommended fields:

- package identifier
- checkpoint format version
- app/schema compatibility version
- created timestamp
- source environment label
- optional source git commit
- SHA-256 checksum of the package payload excluding the checksum field itself
- counts summary

### `catalog_intake`

Contains:

- batches
- clusters
- candidates
- decisions

### `drafts`

Contains:

- draft rows
- draft trait selections

Draft rows should preserve these publish-linked fields once the publish workflow exists:

- linked `idea_id`
- `published_at`
- `published_by`

### `published_ideas`

Contains:

- idea rows
- idea trait selections

The `published_ideas` section should preserve:

- all non-derived columns from `ideas` required to reconstruct the canonical row
  - current explicit set:
    - `id`
    - `slug`
    - `title`
    - `description`
    - `reason_snippet`
    - `min_minutes`
    - `max_minutes`
    - `effort_id`
    - `default_cadence_tag_id`
    - `image_url`
    - `is_global`
    - `is_deleted`
    - `created_at`
    - `created_by_user_id`
- the linked `idea_traits` selections expressed canonically by trait slugs

Generated or derived fields such as `search_tsv` are excluded and should be rebuilt by the database.

If a published-idea field points at seeded registry data whose raw ID may vary across resets, the checkpoint format should serialize a stable slug form and resolve the target ID on restore.

The implementation should not infer published ideas from draft slugs or other heuristics during restore. It should restore the exact exported linked idea set.

## Restore Rules

Restore should be intentionally strict.

### Preconditions

- target DB must be fresh/reset for the scoped content tables
- registry seed data must already exist
- required trait slugs must resolve

### Validation before write

The system should dry-run and validate:

- package format version
- required sections present
- duplicate IDs in package
- duplicate draft-to-idea links in package
- duplicate published idea slugs in package
- missing trait slugs
- missing linked references
- non-empty target tables if restore mode requires emptiness

### Restore order

Recommended order:

1. catalog intake base rows
2. drafts
3. draft traits
4. published ideas
5. idea traits

Because draft-to-idea linkage is part of the target contract, restore should ensure that:

- the linked idea row exists before finalizing the draft linkage

The exact implementation may group catalog intake base rows internally as:

- batches
- clusters
- candidates
- decisions

## Dry-run report contract

Before restore writes anything, the system should produce a structured dry-run report with:

- package metadata summary
- per-section counts:
  - batches
  - clusters
  - candidates
  - decisions
  - drafts
  - draft traits
  - ideas
  - idea traits
- blocker list:
  - format/version mismatch
  - missing required sections
  - duplicate IDs
  - duplicate slugs where uniqueness matters
  - missing trait slugs
  - missing linked references
  - non-empty target tables
- warning list:
  - optional metadata missing
  - deprecated package fields present
- final decision:
  - `can_restore = true|false`

V1 restore should be blocked by any blocker. Warnings may be shown without blocking restore.

## Counts

Top-line progress counts should be derived from checkpoint contents, not manually stored as a second truth system.

Recommended summary counts:

- catalog intake item count
- draft count
- published idea count

If a richer funnel is later needed, it can be derived from the stored state.
