# Rekindle - Studio Checkpoint Runbook (v0)

**Status:** current operator runbook for preserving and restoring Studio editorial state

**Audience:** editors, admins, operators, and developers resetting local or pre-production databases

---

## 1) Purpose

This document explains how to preserve and restore Studio work across database resets.

It covers:

- what a checkpoint contains
- how to create a named checkpoint in Studio
- what to commit to Git
- how to reset the DB safely
- which seed layer to run before restore
- how to dry-run and execute restore in Studio

This is the operator runbook. The deeper design contract remains in:

- `/Users/mike/Code/rekindle_web/docs/specs/checkpoint/README.md`

---

## 2) Start here

Use this order whenever you need to preserve Studio work before a reset:

1. Open `/studio/checkpoint`.
2. Create a named checkpoint.
3. Commit the checkpoint JSON file to Git.
4. Reset the local database.
5. Run the foundation seed layers only.
6. Open `/studio/checkpoint` again.
7. Run `Dry run restore`.
8. If the dry run says `can restore`, execute `Restore checkpoint`.
9. Verify catalog intake, drafts, and published ideas.

Practical rule:

- do not reset first and hope the latest state can be reconstructed later
- create and commit the checkpoint before the reset

---

## 3) What a checkpoint preserves

The current checkpoint system preserves Studio/editorial content:

- `catalog_import_batches`
- `catalog_import_clusters`
- `catalog_import_candidates`
- `catalog_import_decisions`
- `idea_drafts`
- `idea_draft_traits`
- published `ideas` linked from checkpoint-managed drafts
- `idea_traits` for those linked ideas

It does not attempt to back up the entire application database.

---

## 4) Where checkpoints live

Named checkpoints are written to:

- `checkpoints/studio/named/`

Each checkpoint is a single JSON file with a UTC timestamp and label:

- `YYYY-MM-DDTHH-mm-ssZ--<label>.checkpoint.json`

Example:

- `checkpoints/studio/named/2026-03-10T17-59-57Z--before-local-reset.checkpoint.json`

These named checkpoint files are intended to be committed to Git.

---

## 5) Roles

Checkpoint permissions follow Studio roles:

- `viewer`
  - may inspect checkpoint-related status if visible
  - may not create checkpoints
  - may not run dry-run restore
  - may not restore
- `editor`
  - may create named checkpoints
  - may run dry-run restore
  - may not execute restore
- `admin`
  - may create named checkpoints
  - may run dry-run restore
  - may execute restore

---

## 6) Create a named checkpoint

### 6.1 In Studio

Open:

- `/studio/checkpoint`

Then:

1. enter a label such as `before-local-reset`
2. click `Create named checkpoint`
3. confirm the success message appears
4. confirm the file appears in the named checkpoint list

### 6.2 In Git

After creating the checkpoint:

1. confirm the new file exists under `checkpoints/studio/named/`
2. review the diff if needed
3. commit it to Git before resetting the DB

Practical rule:

- a checkpoint file is not durable until it is committed

---

## 7) Reset and seed the DB

After the named checkpoint is created and committed, reset the local DB.

From the db submodule:

```bash
cd /Users/mike/Code/rekindle_web/db
npm run supabase:reset
```

Then run the foundation seed layers only:

```bash
npm run seed:foundation:local
npm run seed:users:local
```

Or use the combined helper:

```bash
npm run seed:foundation-users:local
```

Important:

- do not run `seed:content-demo:local` before checkpoint restore
- do not run `seed:full-demo:local` before checkpoint restore
- those demo content layers populate checkpoint-owned content tables and will block restore

Use demo content seeds only when you are intentionally running a demo-content environment instead of a checkpoint-restore workflow.

---

## 8) Restore from Studio

### 8.1 Dry run

Open:

- `/studio/checkpoint`

Then:

1. find the named checkpoint in the table
2. click `Dry run restore`
3. inspect:
   - blockers
   - warnings
   - final decision

If the final decision is `blocked`, do not continue until the blockers are resolved.

### 8.2 Execute restore

If you are an admin and the dry run says `can restore`:

1. click `Restore checkpoint`
2. wait for the success banner
3. verify the restored counts

The current restore path is DB-owned and transactional. Studio calls the restore RPC; it does not replay tables one by one in the web app.

---

## 9) Validation checklist after restore

After a restore completes, verify:

- `/studio/catalog-intake` shows the expected batches and candidate counts
- `/studio/drafts` shows the expected draft count
- previously published drafts still link to their published ideas
- published ideas and idea traits appear consistent with the checkpoint state

If you are testing the full editorial path, also verify:

- opening a restored cluster still works
- opening a restored draft still works
- publishing a restored `publishable` draft still works

---

## 10) Supported operating modes

### 10.1 Studio checkpoint mode

Use this when Studio/editorial state is the source of truth you want to preserve.

Workflow:

1. create checkpoint
2. commit checkpoint
3. reset DB
4. run foundation seed
5. restore checkpoint

### 10.2 Demo content mode

Use this when you want a sample/demo environment rather than your saved Studio state.

Workflow:

1. reset DB
2. run:
   - `npm run seed:foundation-users-content-demo:local`
   - or `npm run seed:full-demo:local`

Do not mix demo content seeding with checkpoint restore in the same reset cycle unless you intentionally reset again between them.

---

## 11) Common mistakes

### Mistake: resetting before creating a checkpoint

Result:

- the current Studio state is lost unless an older checkpoint already exists

### Mistake: creating a checkpoint but not committing it

Result:

- the file exists locally, but it is still easy to lose during cleanup or branch changes

### Mistake: running demo content seed before restore

Result:

- dry-run restore will block because checkpoint-owned tables are no longer empty

### Mistake: expecting Studio to upload CSVs

Result:

- nothing happens, because CSV import is still db-side

---

## 12) Quick command summary

Checkpoint workflow:

```bash
cd /Users/mike/Code/rekindle_web/db
npm run supabase:reset
npm run seed:foundation-users:local
```

Optional demo workflows:

```bash
npm run seed:foundation-users-content-demo:local
npm run seed:full-demo:local
```

Catalog-intake fixture workflow:

```bash
npm run seed:catalog-intake:local
```

Important note on catalog-intake fixtures:

- this fixture fills checkpoint-owned Studio tables
- use it for fixture testing only
- do not combine it with checkpoint restore without another reset first
