# 04 Implementation Plan

## Goal

Deliver a pre-production checkpoint system that is reliable, simple, and safe to operate during frequent DB resets.

## Dependency decision

The first shippable checkpoint release includes:

- catalog intake state
- drafts and draft traits
- published ideas and idea traits

Because published ideas are part of required v1 scope, the checkpoint feature is not considered shippable until the draft publish contract exists in `rekindle-db`.

Work may begin earlier on export/restore scaffolding and documentation, but the release boundary is blocked on the DB-side publish model.

## Phase 1

Lock the draft publishing model and build manual named checkpoint export/import.

### Included

- status-model change planning:
  - `draft`
  - `publishable`
  - `published`
- publish-to-ideas planning handoff for `rekindle-db`
- checkpoint package builder
- checkpoint restore pipeline
- dry-run validation
- strict restore into fresh/reset DB only
- JSON checkpoint files
- coverage for:
  - catalog intake
  - drafts
  - published ideas
  - associated trait links

### Excluded

- automatic rolling checkpoints
- automatic Git commits
- merge restore into dirty DBs
- conflict resolution UI

## Phase 2

Add automatic rolling `latest` checkpoint behavior.

### Included

- mark content dirty after state-changing Studio actions
- debounce and refresh one rolling checkpoint file
- show `last auto checkpoint` in Studio

### Excluded

- checkpoint history browser
- scheduled background jobs

## Phase 3

Add operational polish if needed.

### Candidate items

- named checkpoint history list in Studio
- richer restore report
- checkpoint file download/upload ergonomics
- optional scheduled snapshotting if published ideas are still mutated outside Studio

## Implementation order

1. lock checkpoint package shape
2. lock draft status model:
   - `draft`
   - `publishable`
   - `published`
3. lock `idea_drafts.idea_id` as the draft-to-idea linkage
4. lock `rekindle-db` publish RPC contract
5. land DB migration/RPC work in `rekindle-db`
6. lock restore validation rules and permissions
7. implement export for catalog intake
8. implement export for drafts and draft traits
9. implement export for linked published ideas and idea traits
10. implement restore for all three domains
11. add Studio UI for manual checkpoint create and restore
12. validate reset -> restore end to end
13. only then add automatic rolling checkpoint refresh

## Success criteria

The system is successful when the team can:

1. create a checkpoint
2. reset the DB
3. restore the checkpoint
4. see the same catalog intake state
5. see the same drafts and draft traits
6. see the same published ideas and idea traits
7. preserve draft-to-idea linkage for published drafts

without manual SQL surgery.

The system should also have a coherent editorial lifecycle:

- `draft`
- `publishable`
- `published`
