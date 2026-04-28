# 08 Documentation Gap Audit

## Purpose

Audit the current checkpoint and related implementation docs from the perspective of a third person coming in cold.

The goal is to identify what is still missing, ambiguous, or likely to cause implementation drift.

## Closure status

This audit was addressed in the same spec pack by tightening the authoritative contracts in:

- `02_checkpoint_package_and_restore_contract.md`
- `03_studio_workflow_and_operations.md`
- `04_implementation_plan.md`
- `06_draft_publish_model.md`
- `07_rekindle-db_context_dump.md`

Treat the findings below as the baseline audit that drove the closure pass, not as the final state of the spec pack.

## Overall assessment

The current doc set is directionally strong.

It now clearly states:

- the checkpoint system is the recommended durability solution
- named checkpoints should be committed to Git
- restore is manual
- the target draft lifecycle is:
  - `draft`
  - `publishable`
  - `published`

The remaining gaps are mostly not about strategy. They are about turning the strategy into a precise, unambiguous implementation contract.

## Findings

## 1) The docs do not yet define the exact scope of `published ideas`

This is the biggest implementation gap.

The spec pack says checkpoints must include:

- `ideas`
- `idea_traits`

But it does not yet say exactly **which** ideas are in scope.

A third-party implementer would immediately ask:

- all ideas in the database
- only ideas created from Studio drafts
- only ideas linked to checkpoint-managed drafts
- only ideas created after a certain point

Without a clear scope rule, export/import can accidentally become:

- too broad and dangerous
- too narrow and incomplete

Recommended fix:

- explicitly define the checkpoint inclusion rule for `ideas`
- ideally via durable draft-to-idea linkage, not heuristic filtering

## 2) The docs do not yet lock the exact draft-to-idea linkage contract

The docs recommend:

- `idea_drafts.idea_id`

But this is still framed as a recommendation rather than a locked requirement.

That is too soft for implementation planning, because the linkage shape affects:

- publish idempotency
- checkpoint export package shape
- checkpoint restore order
- Studio draft UI
- DB migration design

Recommended fix:

- either lock `idea_drafts.idea_id` now
- or explicitly state that checkpoint implementation is blocked until the linkage decision is made

## 3) The docs do not yet define the exact publish contract

The spec pack says there should be a DB-owned publish step, but it does not yet lock:

- the publish RPC name
- required arguments
- return shape
- failure conditions
- whether publish is create-only or create-or-update

A third person could still implement several incompatible versions.

Recommended fix:

- add one focused doc section or contract doc that defines the exact publish operation shape

## 4) The docs do not yet resolve the current-state vs target-state split cleanly

Right now the repo contains both:

- older draft/export docs that describe `review` / `exported`
- newer checkpoint docs that describe `draft` / `publishable` / `published`

This is understandable historically, but a third person may not know which documents are:

- archival
- current-state
- future-state authoritative

Recommended fix:

- mark the older export-only draft docs as historical or superseded for upcoming work
- or add one note in the checkpoint README naming the authoritative docs for the new direction

## 5) The docs do not yet define checkpoint file placement and naming convention precisely

The docs say:

- named checkpoints should be Git-trackable
- rolling `latest` may be separate

But they do not lock:

- exact directory
- file naming format
- whether rolling `latest` is committed or ignored
- whether named checkpoints are JSON only
- whether there is one file per checkpoint or multiple files plus manifest

This matters more than it looks, because Git workflow and operator behavior depend on it.

Recommended fix:

- define the exact checkpoint directory and filename convention in the spec

## 6) The docs do not yet define permissions and roles for checkpoint actions

The Studio checkpoint docs describe the UI but not the authorization model.

Missing decisions:

- who can create checkpoints
- who can restore checkpoints
- whether restore is admin-only
- whether checkpoint visibility is editor/admin only

Recommended fix:

- lock checkpoint action permissions explicitly

## 7) The docs do not yet define corruption/atomicity expectations for checkpoint writes

Because the goal is reliability, a third person would want to know:

- should writes be atomic
- should files be written via temp file and rename
- should checksums or hashes be stored
- what happens if a checkpoint write is interrupted

These details are not implementation trivia here. They directly affect the trustworthiness of the feature.

Recommended fix:

- add a small reliability section for checkpoint file writing and validation

## 8) The docs do not yet define the dry-run report shape precisely

The docs say dry-run validation should exist, but do not define what the user actually sees.

Missing details:

- counts by section
- missing trait slugs
- missing linked references
- non-empty target-table blockers
- package version mismatch
- partial restore risk markers

Recommended fix:

- define a minimal dry-run summary contract

## 9) The docs do not yet define whether checkpointing depends on the new publish workflow

The implementation plan currently places publish-model locking before checkpoint implementation.

That is reasonable, but still ambiguous in practice.

A third person would ask:

- can v1 checkpoint ship for catalog intake + drafts first
- or is the project intentionally blocked until published ideas are also included

Recommended fix:

- explicitly state whether published ideas are:
  - required for first shippable checkpoint release
  - or a mandatory follow-on phase

## 10) The docs do not yet define which idea-adjacent child data is intentionally excluded

The current package scope mentions:

- `ideas`
- `idea_traits`

But does not say whether other possible related data is:

- out of scope by design
- just not discovered yet

Even if the answer is “none right now,” it should be said explicitly.

Recommended fix:

- add one exclusion note for idea-side child tables not currently required in v1

## Most important missing decisions

If only a few issues are resolved next, they should be:

1. exact scope rule for `ideas` included in checkpoints
2. exact draft-to-idea linkage contract
3. exact publish operation contract
4. exact checkpoint file location and naming convention
5. explicit role/permission model for checkpoint create and restore

## Recommendation

The docs are now good enough to support another planning pass, but not yet good enough to start implementation without risk of interpretive drift.

The next documentation step should be:

- close the five high-priority gaps above
- then freeze the checkpoint spec pack as the authoritative implementation source
