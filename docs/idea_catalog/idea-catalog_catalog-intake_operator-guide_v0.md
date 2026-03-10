# Rekindle - Catalog Intake Operator Guide (v0)

**Status:** Current Studio usage guide for generated catalog title batches

**Audience:** editors, admins, operators, and developers supporting the Studio review flow

---

## 1) Purpose

This document explains how to use the new **Catalog Intake** feature in Studio.

It covers:

- how CSV title batches enter the system
- what the Studio UI does and does not do
- how to review imported batches
- what each page and button means
- how promotion hands off into the existing draft workflow

This guide is intentionally operational. It describes the current Catalog Intake surface in `rekindle_web` and the intended draft continuation workflow after promotion.

Important note:

- Catalog Intake already promotes candidates into drafts
- the draft workflow is now oriented around real publish behavior
- canonical publication is the explicit publish step into `ideas`, not the older export-only path

---

## 2) Start here

If you are an editor using Catalog Intake for the first time, use this order:

1. Confirm the batch has already been imported on the db side.
2. Open `/studio/catalog-intake`.
3. Open the batch you want to review.
4. Open a cluster from that batch.
5. Select the strongest title with `Set preferred`.
6. Mark the remaining titles as `alternate`, `needs rewrite`, or `rejected`.
7. Use `Promote to draft` on the winning candidate.
8. Continue the editorial process in `/studio/drafts/[id]`.
9. Move the draft through:
   - `draft`
   - `publishable`
   - `published`

If you need the db-side half of the flow, read:

- `/Users/mike/Code/rekindle_web/docs/idea_catalog/idea-catalog_catalog-intake_full-flow_v0.md`

---

## 3) Important boundary

The Studio app is currently a **review and promotion surface**, not a CSV uploader.

That means:

- CSV files are **not uploaded through the Studio UI**
- CSV ingestion into `catalog_import_*` is owned by the db-side workflow in `rekindle-db`
- Studio starts **after** a batch has already been imported into:
  - `catalog_import_batches`
  - `catalog_import_candidates`
  - `catalog_import_clusters`

Practical rule:

- `rekindle-db` owns import, clustering, state transitions, and promotion RPCs
- `rekindle_web` owns navigation, review pages, action forms, and draft handoff UX

If a CSV file does not yet appear in Studio, the missing step is the **db-side intake/import process**, not a Studio action.

---

## 4) Operator checklist

Use this checklist before starting review:

- you can sign in to Studio
- your Studio role is `editor` or `admin` if you need to mutate state
- the batch already exists in `/studio/catalog-intake`
- you understand that cluster review is global, not limited to one batch
- you are ready to continue the winning candidate in the drafts workflow after promotion

---

## 5) What kind of CSV files this feature expects

This feature is for internally generated catalog title batches such as:

- `GOLD-###_titles_v#_1-25.csv`
- `EXPIDEA-###_titles_v#_1-25.csv`
- `EVENT-<EVENTNAME>-###_titles_v#_1-25.csv`

These conventions come from the catalog factory workflow in `rekindle-db`.

Common fields/concepts used across the generation and intake pipeline:

- `batch`
  - example: `GOLD-025`, `EXPIDEA-001`, `EVENT-BIRTHDAY-001`
- `version`
  - example: `v1`, `v2`
- `segment`
  - example: `1-25`, `26-50`
- `title`
  - the candidate title wording being reviewed

At this stage, Catalog Intake is focused on **generated title candidates**, not full publishable idea records.

---

## 6) How CSV files enter Studio

### 4.1 Production/operator flow

The current production flow is:

1. Generate or prepare CSV title batches outside Studio.
2. Run the db-side catalog-intake import process in `rekindle-db`.
3. The import process writes rows into the `catalog_import_*` tables.
4. Clustering and duplicate analysis produce cluster-level review groups.
5. Open Studio and review the resulting batches in `Catalog Intake`.

Important:

- This repo does **not** currently contain a committed Studio-side upload/import screen.
- This repo also does **not** currently expose a committed operator-facing CSV import command in the web app.
- If you need to ingest a real batch, that must happen through the db-side tooling/process owned by `rekindle-db`.

### 4.2 Local development / fixture validation

For local development, the db submodule includes fixture seeding:

```bash
cd /Users/mike/Code/rekindle_web/db
npm run seed:catalog-intake:local
```

This loads sample batches, clusters, candidates, decisions, and a promoted draft so the Studio UI can be exercised locally.

---

## 7) Access and roles

Catalog Intake lives inside Studio and uses the normal Studio auth rules.

### 5.1 Role requirements

- `viewer`
  - can open Catalog Intake pages and inspect data
  - cannot mutate candidate state
- `editor`
  - can perform all review actions
- `admin`
  - can perform all review actions

### 5.2 If not signed in

If you open a Catalog Intake route without being authenticated, Studio redirects to:

- `/studio/login`

### 5.3 If signed in without enough role access

If you are authenticated but do not meet the required Studio role, Studio redirects to:

- `/studio/access-denied`

---

## 8) Where the feature lives in Studio

You can open Catalog Intake from either place:

- top Studio navigation: `Catalog Intake`
- Studio dashboard card: `Catalog Intake`

Primary routes:

- `/studio/catalog-intake`
- `/studio/catalog-intake/[batchId]`
- `/studio/catalog-intake/clusters/[clusterId]`

---

## 9) End-to-end operator flow

The intended operator flow is:

1. Confirm the CSV batch has been imported on the db side.
2. Open `/studio/catalog-intake`.
3. Open the batch you want to review.
4. Inspect the clusters created from that batch.
5. Open a cluster.
6. Review all candidate titles in that cluster.
7. Choose the strongest wording:
   - set preferred
   - mark alternates
   - mark weaker rows as needs rewrite
   - reject unusable rows
8. Promote the selected candidate to a draft.
9. Continue editing in `/studio/drafts/[id]`.
10. When the draft passes the gate, publish it into canonical `ideas`.

Practical editorial rule:

- For a cluster with multiple candidate variants, choose the strongest candidate first, then promote.

Post-publish edit rule:

- if a previously published draft is edited later, it should return to `publishable` until it is explicitly published again

---

## 10) Page-by-page guide

## 10.1 Batch list page

Route:

- `/studio/catalog-intake`

Purpose:

- show every imported catalog batch currently available for review
- give a quick count-based overview before opening a batch

Top summary card:

- `Total batches`
- `Total candidates`
- `Total promoted candidates`

Batch table columns:

- `Batch`
  - the batch code, such as `GOLD-025`
  - version and segment appear underneath
- `Family`
  - `gold`, `expidea`, `event`, or `event_gold`
- `Rows`
  - raw input row count for the batch
- `Clusters`
  - number of clusters linked to at least one candidate from the batch
- `Pending`
  - candidates not yet moved into a stronger editorial state
- `Ready`
  - clusters/candidates already positioned for draft promotion
- `Promoted`
  - candidates already promoted into idea drafts
- `Rejected`
  - candidates marked rejected
- `Updated`
  - last update timestamp

Button:

- `Open`
  - opens the batch detail page

When to use this page:

- find the batch you want to review
- compare batches by completion level
- spot batches that have already had promotion activity

---

## 10.2 Batch detail page

Route:

- `/studio/catalog-intake/[batchId]`

Purpose:

- review one imported batch at a summary level
- inspect all clusters touched by that batch
- jump into cluster-level review

Top actions:

- `Back to batches`
  - returns to the main batch list

### Batch summary card

This card shows:

- `Rows`
- `Candidates`
- `Clusters`
- `Pending`
- `Ready for draft`
- `Promoted`
- `Rejected`
- `Unclustered`
- `Import status`
- `Updated`

Notes:

- `Unclustered` means rows in the batch that currently do not belong to a cluster
- v1 surfaces the count only; there is no dedicated unclustered review page yet

### Source provenance card

This card shows:

- `Source path`
- `Source pool path`
- `Created`

Use this when you need to confirm where the imported batch came from.

### Cluster table

This table lists every cluster that includes at least one candidate from the current batch.

Columns:

- `Canonical title`
  - cluster-level working concept title
- `Status`
  - cluster review status
- `Preferred`
  - preferred title if one has been selected
- `Batch count`
  - number of candidates from this batch in the cluster
- `Total count`
  - total number of candidates in the cluster across all batches
- `Draft`
  - whether a draft is already linked
- `Updated`

Button:

- `Open`
  - opens the global cluster detail page
  - passes the current batch in the URL so the cluster page can provide a `Back to batch` link

Important behavior:

- cluster review is **global**, not batch-scoped
- when you open a cluster, you may see candidate titles from multiple batches

---

## 10.3 Cluster detail page

Route:

- `/studio/catalog-intake/clusters/[clusterId]`

Purpose:

- make editorial decisions on all wording variants belonging to a single concept cluster
- promote the winning candidate into the main drafts workflow

Top actions:

- `Back to batch`
  - appears when you opened the cluster from a batch detail page
- `Back to batches`
  - appears when no source batch context was provided

Feedback banners:

- green banner after a successful save
- red banner after an error

### Cluster summary card

Shows:

- `Family`
- `Preferred title`
- `Event anchor`
- `Anchor family`
- `Concept key`
- `Created`
- `Updated`

Optional:

- `Editorial note`

### Links card

Shows:

- `Preferred candidate ID`
- `Promoted draft`
- `Seen in batches`

Buttons/links:

- batch chips such as `GOLD-025` or `EVENT-BIRTHDAY-001`
  - jump back to a batch that contributes candidates to the cluster
- `Open draft`
  - appears when the cluster already has a promoted linked draft

### Candidate cards

Each candidate card represents a single raw title candidate.

Candidate metadata shown:

- title
- batch code
- source row number
- editor state
- machine duplicate state
- machine score
- specificity
- event anchor
- anchor family
- duplicate candidate id
- duplicate idea id
- created/updated timestamps
- optional editor note

Badges:

- `preferred`
  - this candidate is the cluster’s selected preferred option
- `draft linked`
  - this candidate already has an associated `idea_draft`

Navigation links on each card:

- `Open batch`
  - returns to the source batch for that candidate
- `Open linked draft`
  - appears if the candidate has already been promoted
- `Back to source batch`
  - appears when the candidate came from a different batch than the one you opened from

---

## 11) Candidate actions and exact button behavior

Only `editor` and `admin` users can perform these actions.

If you are a `viewer`, the page displays a read-only notice instead of the forms.

## 9.1 `Set preferred`

Button label:

- `Set preferred`

Where:

- candidate card, quick actions area

What it does:

- marks the selected candidate as the preferred candidate for the cluster
- updates the cluster-level preferred candidate id
- keeps the cluster review flow centered around one winning candidate

When to use it:

- this is the strongest wording in the cluster
- this is the candidate you want other variants compared against

Practical effect in the UI:

- the candidate gets a `preferred` badge
- the cluster summary shows the preferred title
- only the preferred candidate should be promoted once a preference has been set

---

## 9.2 `Set alternate`

Button label:

- `Set alternate`

Where:

- candidate card, quick actions area

What it means:

- keep this candidate as a valid secondary wording variant
- it is not the preferred version

When to use it:

- the title is usable but not the strongest choice
- you want to preserve it for comparison or possible later reference

What it does not mean:

- it does not create a draft
- it does not reject the candidate

---

## 9.3 `Promote to draft`

Button label:

- `Promote to draft`

Where:

- candidate card, quick actions area

What it does:

- calls the db-side promotion RPC
- creates or reuses an `idea_draft`
- links that draft to `idea_drafts.catalog_import_candidate_id`
- routes you into the existing Studio drafts workflow

After success:

- Studio redirects to:
  - `/studio/drafts/[draftId]`

When this button appears:

- the candidate is not rejected
- the candidate is not already linked to a draft
- and either:
  - no cluster preferred candidate has been set yet
  - or this candidate is the current preferred candidate

Recommended editorial practice:

- in a multi-candidate cluster, set a preferred candidate before promoting

---

## 9.4 `Mark needs rewrite`

Section title:

- `Mark needs rewrite`

Button label:

- `Save needs rewrite`

Field:

- `Optional rewrite guidance`

What it means:

- the concept may still be worth keeping
- the current wording is not ready to promote as-is

When to use it:

- the wording is awkward
- the title is too vague or clunky
- the core idea is usable but should be rewritten later

Best practice:

- leave a short concrete note explaining what should change

---

## 9.5 `Reject candidate`

Section title:

- `Reject candidate`

Button label:

- `Reject`

Fields:

- `Reason`
- `Note`

Reason is required. Note is optional.

Current reject reason options:

- `Duplicate candidate`
- `Duplicate draft`
- `Duplicate published idea`
- `Weaker variant`
- `Too specific`
- `Unclear wording`
- `Awkward wording`
- `Low value`
- `Off method`

When to use it:

- the candidate should leave the active editorial queue
- the wording is weak enough that rewrite is not worth it
- the candidate is duplicative or outside the intended catalog method

Practical rule:

- use `needs rewrite` when the concept still has editorial value
- use `reject` when the candidate should not move forward

---

## 12) Understanding statuses

## 10.1 Batch-level status

Source:

- `catalog_import_batches.import_status`

Common values:

- `imported`
- `clustered`
- `in_review`
- `completed`
- `archived`

Interpretation:

- these describe the batch’s lifecycle in the intake pipeline
- they are not the same thing as per-candidate editorial decisions

## 10.2 Cluster-level status

Source:

- `catalog_import_clusters.review_status`

Common values:

- `pending`
- `reviewing`
- `ready_for_draft`
- `promoted`
- `discarded`

Interpretation:

- this is the editorial status of the concept cluster as a whole

## 10.3 Candidate-level editor state

Source:

- `catalog_import_candidates.editor_state`

Values:

- `pending`
- `preferred`
- `alternate`
- `needs_rewrite`
- `rejected`
- `promoted`

Interpretation:

- this is the editorial state of one specific title candidate

## 10.4 Machine duplicate state

Source:

- `catalog_import_candidates.machine_duplicate_state`

Common values:

- `unreviewed`
- `exact_candidate_match`
- `exact_published_match`
- `near_duplicate`
- `none`

Interpretation:

- this is machine-generated duplicate context
- it is a review aid, not the final editorial decision

---

## 13) Recommended review practices

Use this sequence for cleaner decisions:

1. Read all titles in the cluster before mutating anything.
2. Pick the strongest wording first.
3. Set that title as preferred.
4. Mark clearly useful secondary variants as alternate.
5. Mark salvageable but awkward variants as needs rewrite.
6. Reject only the rows that should truly leave the queue.
7. Promote only when you are confident the preferred title should move into draft authoring.

Avoid:

- promoting before you understand the cluster
- using rejection when a rewrite note would be more accurate
- treating machine duplicate scoring as the final answer

---

## 14) What happens after promotion

Promotion is intentionally thin.

After a successful promotion:

- a draft is created or reused
- the draft is linked back to the catalog-intake candidate
- Studio redirects into the existing draft editor

From that point forward, you continue normal draft work in:

- `/studio/drafts`
- `/studio/drafts/[id]`

Catalog Intake is the **front door** for generated title review.
Drafts remain the **main editorial workspace** for building a publishable idea.

---

## 15) Known limitations in v1

These are current feature boundaries, not bugs:

- no CSV upload screen in Studio
- no Studio-managed batch import action
- no dedicated unclustered-candidate review page
- no decision-log UI
- no search/filter controls on the Catalog Intake pages yet
- no bulk actions yet

If operators expect one of those capabilities, it must be treated as a follow-up feature, not a hidden UI path.

---

## 16) Quick troubleshooting

## 14.1 The CSV batch is not visible in Studio

Likely cause:

- it has not been imported into `catalog_import_*` on the db side yet

Check:

- db-side import process
- local/staging environment alignment
- whether the batch exists in `catalog_import_batches`

## 14.2 I can view the page but cannot edit

Likely cause:

- your Studio role is `viewer`

Check:

- `studio_users.role`

## 14.3 Promotion does not happen

Check:

- whether the candidate is rejected
- whether the candidate already has a linked draft
- whether a different preferred candidate is already set for the cluster

## 14.4 I expected to upload a CSV from Studio

Current behavior:

- Studio does not provide that workflow yet
- CSV intake must happen through the db-side process

---

## 17) Related docs

- `docs/idea_catalog/idea-catalog_catalog-intake_implementation-plan_v0.md`
- `docs/idea_catalog/idea-catalog_catalog-intake_and_ingestion-decoupling_gap-audit_v0.md`
- `docs/idea_catalog/idea-catalog_catalog-intake_full-flow_v0.md`
- `db/docs/studio_catalog_intake_contract.md`
- `db/docs/codex_app_playbook_for_rekindle_catalog_factory.md`
