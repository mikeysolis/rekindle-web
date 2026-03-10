# Rekindle - Catalog Intake Full Flow (v0)

**Status:** current end-to-end operator guide for generated catalog CSV title batches

**Audience:** operators, developers, editors, and admins working across `rekindle-db` and `rekindle-web`

---

## 1) Purpose

This document explains the **full flow** for generated catalog title batches:

1. generate CSV title files
2. prepare/import those files into the app database
3. review them in Studio
4. promote selected candidates into drafts

This is the companion to the Studio-side guide in:

- `docs/idea_catalog/idea-catalog_catalog-intake_operator-guide_v0.md`

This document stays in `rekindle_web` on purpose so the parent project contains the complete operational documentation for the feature.

---

## 2) Start here

If you are operating the full flow, use this order:

1. Generate or prepare a catalog title CSV batch.
2. Confirm the file follows the expected batch naming and column shape.
3. Import the file into the `catalog_import_*` tables using the db-side intake process.
4. Confirm the batch appears in `public.v_catalog_import_batches`.
5. Hand off to Studio review in `/studio/catalog-intake`.
6. Promote the winning candidate into a draft.

If you only need the Studio review half, read:

- `docs/idea_catalog/idea-catalog_catalog-intake_operator-guide_v0.md`

---

## 3) System boundary

Catalog Intake is split across two repos:

### `rekindle-db` owns

- the `catalog_import_*` schema
- the canonical DB contract
- clustering state and duplicate metadata
- review mutation RPCs
- draft promotion RPC
- local fixture seed data
- the db-side import responsibility for getting CSV rows into `catalog_import_*`

### `rekindle-web` owns

- Studio navigation
- list/detail review pages
- action forms
- auth/role gating
- handoff into `/studio/drafts/[id]`
- parent-project operational documentation for the feature

Practical rule:

- **CSV files enter the system on the db side**
- **review happens on the web side**

---

## 4) Runbook summary

Use this as the quick operator checklist:

- the CSV file exists under the generated catalog workflow
- the file includes `id,title,batch,version,segment`
- the db-side import step creates:
  - one batch row
  - candidate rows
  - cluster rows
  - any needed decision rows
- the imported batch is visible in `v_catalog_import_batches`
- the editor can then review it in Studio

---

## 5) What files this flow is for

Catalog Intake is for internally generated title batches such as:

- `GOLD-###_titles_v#_1-25.csv`
- `EXPIDEA-###_titles_v#_1-25.csv`
- `EVENT-<EVENTNAME>-###_titles_v#_1-25.csv`
- `EVENT-<EVENTNAME>-GOLD-###_titles_1-95.csv`

Examples already present in the `db` submodule:

- `db/catalog/generated/gold/GOLD-025_titles_v2_1-158.csv`
- `db/catalog/generated/expidea/EXPIDEA-001_titles_1-25.csv`
- `db/catalog/generated/event/EVENT-BIRTHDAY-001_titles_1-192.csv`

These files are **title candidate** inputs, not publishable idea exports.

---

## 6) Expected CSV shape

The generated catalog title batches currently use a simple row shape:

```csv
id,title,batch,version,segment
1,Text your partner one specific thing they handled really well today,GOLD-025,v2,1-158
2,Send a two-line thank-you message to a friend who checked in recently,GOLD-025,v2,1-158
```

Observed columns:

- `id`
  - file-local sequential identifier
- `title`
  - raw generated title candidate
- `batch`
  - batch code such as `GOLD-025` or `EVENT-BIRTHDAY-001`
- `version`
  - batch version such as `v1` or `v2`
- `segment`
  - row segment such as `1-25`, `26-50`, or `1-158`

Important:

- one row = one raw title candidate
- the `title` field is the main editorial payload

---

## 7) Full end-to-end flow

## 7.1 Generate the CSVs

The catalog factory and planning docs in the `db` submodule define how batches are created.

Relevant references:

- `db/docs/codex_app_playbook_for_rekindle_catalog_factory.md`
- `db/docs/rekindle_catalog_pipeline_docs.md`

The output of that generation work lands in:

- `db/catalog/generated/gold/`
- `db/catalog/generated/expidea/`
- `db/catalog/generated/event/`

At this point the data is still just CSV files on disk.

## 7.2 Import the CSVs into `catalog_import_*`

The Studio UI does **not** upload CSVs directly.

Instead, the db-side import process must translate each CSV into the catalog-intake tables:

- `public.catalog_import_batches`
- `public.catalog_import_clusters`
- `public.catalog_import_candidates`
- `public.catalog_import_decisions`

The stable contract for those objects lives in:

- `db/docs/studio_catalog_intake_contract.md`

### Current repository state

The db submodule contains:

- the schema and RPC contract
- fixture seed support for local development

The parent repo does **not** currently expose a committed general-purpose production CLI like:

- `npm run import:catalog-intake ...`

So the production/operator import step remains a db-owned operational process that must follow the contract below.

That distinction matters:

- the import contract is implemented
- the generic operator wrapper command is not yet standardized in `package.json`

## 7.3 Review in Studio

Once the db-side import has completed, the batch becomes visible in:

- `/studio/catalog-intake`

From there:

1. open a batch
2. open a cluster
3. review candidates
4. set preferred / alternate / needs rewrite / reject
5. promote the winning candidate to a draft

The Studio-side details are documented in:

- `docs/idea_catalog/idea-catalog_catalog-intake_operator-guide_v0.md`

## 7.4 Continue in the draft editor

Promotion links the selected candidate to:

- `idea_drafts.catalog_import_candidate_id`

After successful promotion, Studio routes the editor into:

- `/studio/drafts/[draftId]`

That is where the full draft authoring process continues.

---

## 8) What the db-side intake step must do

Even though there is not yet a committed generic CLI wrapper, the required import behavior is clear from the schema contract and fixture seed implementation.

## 8.1 Create a batch row

Each imported CSV file becomes one row in:

- `public.catalog_import_batches`

Core fields:

- `family`
- `batch_code`
- `version`
- `segment`
- `source_path`
- `source_pool_path`
- `row_count`
- `import_status`
- `tracker_snapshot`

Practical mapping:

- the CSV filename and path identify the source file
- `batch`, `version`, and `segment` come from the file contents and/or filename
- `row_count` is the number of imported rows

## 8.2 Create or resolve clusters

Each candidate title must be assigned to:

- a resolved concept cluster
- or a singleton cluster if no grouping match exists

Each cluster becomes one row in:

- `public.catalog_import_clusters`

Important:

- clusters are global, not batch-scoped
- multiple imported batches can feed the same cluster

## 8.3 Insert candidate rows

Each CSV row becomes one row in:

- `public.catalog_import_candidates`

Important candidate fields:

- `batch_id`
- `cluster_id`
- `source_row_number`
- `source_item_id`
- `title`
- `title_normalized`
- `title_hash`
- `family`
- `batch_code`
- `version`
- `segment`
- `event_anchor`
- `anchor_family`
- `specificity_level`
- `concept_key`
- `machine_duplicate_state`
- `editor_state`
- `preferred_in_cluster`
- `duplicate_of_candidate_id`
- `duplicate_of_idea_id`
- `machine_score`
- `editor_note`
- `metadata`

At initial intake, the common default state is:

- `editor_state = 'pending'`
- `preferred_in_cluster = false`

unless the import process is intentionally pre-seeding known editorial decisions.

## 8.4 Optionally create decision rows

If the import or fixture process pre-populates editorial states, it must also write matching audit rows into:

- `public.catalog_import_decisions`

Actions supported by the contract:

- `set_preferred`
- `set_alternate`
- `mark_needs_rewrite`
- `reject_candidate`
- `promote_to_draft`

## 8.5 Promotion is not a raw insert

Draft creation should not be hand-written ad hoc during review.

The intended path is the DB RPC:

- `public.catalog_import_promote_candidate_to_draft(...)`

This is the canonical way to create or reuse a draft from a catalog-intake candidate.

---

## 9) Concrete local development flow

If you want to validate the Studio review flow locally, use the fixture seed.

## 9.1 Start local Supabase

From the parent repo:

```bash
cd /Users/mike/Code/rekindle_web
npm run supabase:start
```

## 9.2 Load local catalog-intake fixtures

```bash
cd /Users/mike/Code/rekindle_web/db
npm ci
npm run seed:catalog-intake:local
```

What this seed does:

- creates sample `catalog_import_batches`
- creates sample `catalog_import_clusters`
- creates sample `catalog_import_candidates`
- creates sample `catalog_import_decisions`
- creates one linked `idea_drafts` row

This seed is defined in:

- `db/supabase/seeds/catalog-intake.ts`

## 9.3 Open Studio

From the parent repo:

```bash
cd /Users/mike/Code/rekindle_web
npm run dev
```

Then open:

- `http://localhost:3000/studio/catalog-intake`

## 9.4 Review and mutate sample data

Use the Studio UI to:

- inspect batches
- open clusters
- set preferred
- set alternate
- mark needs rewrite
- reject
- promote to draft

---

## 10) How the fixture seed maps CSV rows today

The fixture seed is not the production import command, but it is the clearest current example of the required mapping logic.

The script:

- reads generated CSV files from `db/catalog/generated/...`
- parses rows with `csv-parse`
- normalizes titles
- hashes normalized titles
- derives batch metadata
- derives event anchor from `EVENT-*` batch codes when needed
- inserts batches
- inserts clusters
- inserts candidates
- updates preferred candidates
- inserts decision rows
- inserts a sample linked draft for one promoted cluster

Implementation reference:

- `db/supabase/seeds/catalog-intake.ts`

The important ordering pattern is:

1. batches
2. clusters
3. candidates
4. cluster preferred-candidate updates
5. decisions
6. optional linked drafts

That ordering is the current practical model for any real importer as well.

---

## 11) What Studio expects to already exist

By the time Studio opens a batch, it expects the db-side intake process to have already produced:

- a batch row with a stable `batch_id`
- candidate rows linked to that batch
- cluster rows referenced by the candidates
- enough duplicate/clustering logic to make review meaningful

Studio does **not** do these things itself:

- parse uploaded CSV files
- create batch rows from disk files
- cluster candidates client-side
- infer duplicates client-side
- create draft links with raw SQL

Studio only reads from the contract and calls the review/promotion RPCs.

---

## 12) Current operator limitations

These are the current real limitations of the implemented system:

- there is no Studio CSV upload page
- there is no committed generic production import CLI in `db/package.json`
- unclustered candidates are surfaced in Studio only as a count
- there is no decision-log page in Studio yet

The system is fully usable for review **after** batches have been imported, but the generalized operator wrapper for CSV-to-DB intake is still a db-side tooling gap if you want it standardized and documented as a single command.

---

## 13) Recommended future improvement

If you want the full operator flow to be completely self-documenting, the next db-side improvement should be:

- add a committed import command in `rekindle-db`
- document it in this parent-repo guide with exact arguments

Example target shape:

```bash
npm run import:catalog-intake -- \
  --family gold \
  --source-path db/catalog/generated/gold/GOLD-025_titles_v2_1-158.csv
```

That command does not exist yet. The example above is only the shape of the missing standardization.

---

## 14) Related docs

- `docs/idea_catalog/idea-catalog_catalog-intake_operator-guide_v0.md`
- `docs/idea_catalog/idea-catalog_catalog-intake_implementation-plan_v0.md`
- `db/docs/studio_catalog_intake_contract.md`
- `db/docs/codex_app_playbook_for_rekindle_catalog_factory.md`
- `db/docs/rekindle_catalog_pipeline_docs.md`
