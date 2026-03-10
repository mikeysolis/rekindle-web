# 05 Open Questions

## Resolved in this spec pass

These items are now locked in the authoritative docs:

- draft-to-idea linkage:
  - `idea_drafts.idea_id`
- published-idea checkpoint inclusion rule:
  - only ideas linked from checkpoint-managed drafts
- checkpoint file placement:
  - named Git-tracked files under `checkpoints/studio/named/`
  - rolling local file under `var/studio-checkpoints/`
- checkpoint permissions:
  - restore is admin-only
- publish contract direction:
  - DB-owned publish RPC from draft to idea

## 1) Auto-save trigger scope

Question:

- should automatic rolling checkpoints be triggered only by Studio mutations
- or should there be scheduled refreshes to capture data changed outside Studio

Current recommendation:

- start with Studio-triggered auto-save only
- add scheduled refresh only if published ideas continue to change outside Studio in practice

## 2) Publish metadata shape

Question:

- should drafts also track `published_at` and `published_by`

Current recommendation:

- optional
- useful but not required to ship v1 checkpointing

## 3) Granularity of headline metrics

Question:

- should the UI show only the top-line checkpoint counts
- or should it also show richer workflow buckets

Current recommendation:

- keep v1 metrics simple:
  - catalog intake count
  - draft count
  - published idea count

## 4) Git workflow automation

Question:

- should Studio ever try to create Git commits automatically

Current recommendation:

- no, not in v1
- keep checkpoint file generation in Studio
- keep commit/push as an operator action
