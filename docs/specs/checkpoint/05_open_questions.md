# 05 Finalized Decisions And Future Considerations

## Locked decisions

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
- auto-save trigger scope:
  - v1.5 automatic rolling checkpoints refresh only after Studio mutations
  - no scheduled background refresh in v1 or v1.5
  - operator uses manual refresh for data that may have changed outside Studio
- publish metadata:
  - `published_at`
  - `published_by`
  - required in the draft publish model
- published-draft edit rule:
  - any normal save of a previously published draft demotes it to `publishable`
  - the draft returns to `published` only after an explicit re-publish
- headline metrics:
  - keep v1 to intake count, draft count, and published idea count
- Git workflow automation:
  - no automatic Git commits or pushes from Studio
- registry-backed idea fields in checkpoint packages:
  - serialize stable slug forms as canonical restore inputs
- export role:
  - export is not a first-class editorial outcome
  - publish into canonical `ideas` is the authoritative end-state

## Remaining future considerations

These items are intentionally deferred and do not block implementation:

1. Whether a later phase should add scheduled checkpoint refresh for data changed outside Studio.
2. Whether a later phase should expose richer workflow metrics beyond the top-line funnel.
3. Whether a later phase should add checkpoint history browsing and download/upload ergonomics.
4. Whether the package should later include any additional idea-adjacent child tables beyond `idea_traits`.
