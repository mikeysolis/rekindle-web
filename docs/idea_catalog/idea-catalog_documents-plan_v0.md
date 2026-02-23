# Idea Catalog Documentation Plan v0

> **Goal:** A planned, step-by-step approach to writing documentation that supports (1) the initial bulk Idea generation effort **without Studio**, and (2) the long-term Studio + submissions operations system.  
> **Doc type:** living plan (update as we learn)  
> **Primary audience:** internal devs + catalog ops (editorial)

---

## 1) How we write docs in this project

### 1.1 Just-in-time, slice-by-slice
We write detailed implementation docs only when:
1) We are about to build the thing.
2) The decision is stable enough not to churn immediately.
3) The doc will be used to execute consistently (or prevent regressions).

### 1.2 “Docs are products”
Every doc should answer:
- **What problem does this solve?**
- **What is the intended outcome / acceptance criteria?**
- **What is in-scope vs out-of-scope?**
- **What is the exact interface/contract?** (inputs/outputs, invariants)

### 1.3 Keep docs aligned with the repo dev loop
Data work must be verifiable locally:
- Update bulk data
- Run validation/lint
- Seed local Supabase
- Test in the app

(See the project dev loop; data work uses `npm run seed:local`.)

### 1.4 Naming + location conventions
Recommended repo location:
- `docs/idea-catalog/`

File naming:
- `idea-catalog_<topic>_v0.md` for new docs
- bump minor versions when semantics change (v0 → v1 when stable and used in prod)

---

## 2) Documentation inventory and status

### 2.1 High-level docs (already created)
- ✅ `idea-catalog_program-blueprint_v0.md`
- ✅ `idea-catalog_research-discovery-playbook_v0.md`
- ✅ `idea-catalog_coverage-dashboard_v0.md`
- ✅ `idea-catalog_bulk-authoring-and-import_v0.md`
- ✅ `idea-catalog_studio-vision_v0.md`
- ✅ `ai-idea-research_context-pack_v0.md`
- ✅ `idea-catalog_title-tone-style-guide_v0.md`
- ✅ `idea-catalog_milestones-roadmap_v0.md`
- ✅ `idea-catalog_facet-slug-reference-pack_v0.md`
- ✅ `idea-catalog_README_v0.md`

### 2.2 Implementation docs (pre‑Studio data factory)
- ✅ **COMPLETED** `idea-catalog_linter-and-validator_spec_v0.md`
- ✅ **COMPLETED** `idea-catalog_bulk-import-mapping_spec_v0.md`

---

## 3) Planned documentation phases

This section defines what we write next and why, in the order that unlocks the most progress with the least churn.

---

## Phase A — Pre‑Studio “Data Factory” (next execution layer)

### A1) Seed integration doc (how lint + import plugs into the repo)
**Doc to create**
- ⏳ `idea-catalog_seed-integration_plan_v0.md`

**Purpose**
- Define how the linter + importer are executed in the repo:
  - scripts (`npm run ideas:lint`, `npm run ideas:import` etc.)
  - where artifacts go (`.artifacts/…`)
  - how it ties into `npm run seed:local`

**Acceptance criteria**
- Any contributor can:
  1) run lint
  2) import/seed locally
  3) open the app and verify new ideas are searchable

**Dependencies**
- Completed: linter spec + import mapping spec.

---

### A2) Dedupe + synonym backlog doc (pre‑Studio operational plan)
**Doc to create**
- ⏳ `idea-catalog_dedupe-and-synonyms_v0.md`

**Purpose**
- Define how we handle:
  - exact duplicates (same intent)
  - near duplicates (phrasing variations)
  - “search failure” signals (wish text that should match existing idea)
- Define the early, pre‑Studio workflow for synonyms/keywords (even if stored as editorial notes or a separate list initially)

**Acceptance criteria**
- We can process a batch and produce:
  - “merge candidates list”
  - “search gap fixes list”

---

### A3) AI batch prompt protocol (operational procedure)
**Doc to create**
- ⏳ `idea-catalog_ai-batch-prompt-protocol_v0.md`

**Purpose**
- Provide paste-ready prompts + guardrails so AI outputs:
  - correct schema shape
  - does not invent taxonomy/slugs
  - flags unknowns as `NEEDS_MAPPING:<label>`
  - avoids micro‑chore spam (“do the dishes” etc.) unless abstracted

**Acceptance criteria**
- A standardized prompt reliably yields:
  - 25–100 idea rows that pass lint with minimal edits

**Dependencies**
- Facet Slug Reference Pack v0 (exists) + Title/Tone Style Guide v0 (exists).

---

## Phase B — Studio foundations (stabilize decisions before deep specs)

### B1) ADR: Studio data model strategy
**Doc to create**
- ⏳ `adr_studio-data-model_strategy_v0.md`

**Decision**
- “DB is canonical (draft/publish flags)” vs “staging tables + publish promotion”

**Acceptance criteria**
- Decision made and recorded before building publish workflow UX.

---

### B2) ADR: Editor roles + RLS
**Doc to create**
- ⏳ `adr_studio-roles-rls_v0.md`

**Decision**
- Roles (viewer/editor/reviewer/publisher/admin)
- How RLS separates:
  - production catalog safety
  - candidate inbox (untrusted content)
  - editorial metadata

---

### B3) ADR: Trait-driven Studio UI contract
**Doc to create**
- ⏳ `adr_trait-driven-studio-ui_contract_v0.md`

**Decision**
- Studio renders tagging UI from trait bindings:
  - required Tier 1 gates
  - quick filters vs “all filters”
  - grouping metadata and select mode

**Acceptance criteria**
- Prevents taxonomy drift between Studio and app.

---

## Phase C — Studio MVP module specs (write only after Phase B ADRs)

### C1) Studio MVP: Idea editor + publish gate UX
**Doc to create**
- ⏳ `idea-catalog_studio-mvp_idea-editor_v0.md`

**Scope**
- Draft create/edit
- Tier 1 completeness status
- “publishable” status and review flow
- “Preview in app” deep link action

---

### C2) Studio MVP: Trait tagging UX
**Doc to create**
- ⏳ `idea-catalog_studio-mvp_trait-tagging_v0.md`

**Scope**
- Tier 1 required panels
- Tier 2 recommended panels (coverage target tracking)
- Tier 3 advanced (collapsed, “only when confident”)

---

### C3) Studio MVP: Coverage dashboards
**Doc to create**
- ⏳ `idea-catalog_studio-mvp_coverage-dashboards_v0.md`

**Scope**
- Mirrors the pre‑Studio Coverage Dashboard doc:
  - quick filter cube (time/effort/cost)
  - logistics grid (presence/coordination)
  - format coverage
- Defines what metrics live in Studio vs what stays operational.

---

## Phase D — Flywheel: custom wishes + user submissions (after Studio MVP exists)

### D1) Candidate inbox workflow + moderation
**Doc to create**
- ⏳ `idea-catalog_candidate-inbox_workflow_v0.md`

**Scope**
- Inputs:
  - opt-in shared wishes
  - user-submitted ideas
- Triage states:
  - reject, needs rewrite, needs tags, duplicate, promote to draft

---

### D2) Rewards + attribution policy
**Doc to create**
- ⏳ `idea-catalog_rewards-and-attribution_policy_v0.md`

**Scope**
- Reward conditions:
  - “published to catalog” reward
  - “discovery improvement” reward (smaller)
- Anti-farming guardrails
- Attribution storage and privacy posture

---

## Phase E — Maintenance + governance (ongoing)

### E1) Taxonomy evolution governance
**Doc to create**
- ⏳ `idea-catalog_taxonomy-governance_v0.md`

**Scope**
- Deprecation over deletion
- Slug immutability
- Migration procedures
- Editorial guidelines for adding new options

---

### E2) Localization pipeline (when ready)
**Doc to create**
- ⏳ `idea-catalog_localization-pipeline_v0.md`

**Scope**
- Translation tables
- Editorial process for translations
- Validation requirements per locale

---

## 4) What we do next (recommended order)

1) **Phase A1** — Seed integration plan  
2) **Phase A3** — AI batch prompt protocol (so bulk creation scales immediately)  
3) **Phase B ADRs** — Studio decisions (data model + roles + trait UI contract)  
4) **Phase C** — Studio MVP module specs  
5) **Phase D** — Candidate inbox + rewards  
6) **Phase E** — Governance + localization

---

## 5) Completion checklist for each new doc

A doc is “complete” when:
- The scope is explicit (in/out).
- There’s a definition of done / acceptance criteria.
- Interfaces are defined (inputs/outputs/state transitions).
- Owners/actors are clear (editor, reviewer, publisher, admin).
- It has at least one example (happy path + one edge case).
