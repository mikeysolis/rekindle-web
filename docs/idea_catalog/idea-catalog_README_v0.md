# Rekindle — Idea Catalog Docs (v0)

This folder contains high-level (v0) documentation for building and operating Rekindle’s Idea catalog.

These docs are intentionally **strategy + operating system** level. They avoid implementation details so they remain stable as the code evolves.

---

## Start here

1) **Program Blueprint** — end-to-end system overview (research → bulk creation → Studio ops → user flywheel)
   - `idea-catalog_program-blueprint_v0.md`

2) **Research & Discovery Playbook** — methodical generation of the first thousands of Ideas (pre-Studio)
   - `idea-catalog_research-discovery-playbook_v0.md`

3) **Coverage Dashboard** — the backlog engine (what to research next, based on facet coverage)
   - `idea-catalog_coverage-dashboard_v0.md`

4) **Bulk Authoring & Import** — how we store/validate/import batches before Studio exists
   - `idea-catalog_bulk-authoring-and-import_v0.md`

5) **Studio Vision & Workflows** — how the NextJS Studio operationalizes this system long-term
   - `idea-catalog_studio-vision_v0.md`

6) **Catalog Intake Operator Guide** — how imported CSV title batches are reviewed and promoted inside Studio
   - `idea-catalog_catalog-intake_operator-guide_v0.md`

7) **Catalog Intake Full Flow** — the full cross-repo operator flow from generated CSVs to Studio drafts
   - `idea-catalog_catalog-intake_full-flow_v0.md`

8) **Studio Checkpoint Runbook** — how to preserve and restore Studio/editorial state across DB resets
   - `idea-catalog_checkpoint-runbook_v0.md`

9) **AI Context Pack** — how to use ChatGPT effectively for idea research and first-pass tagging
   - `ai-idea-research_context-pack_v0.md`

10) **Title + Tone Style Guide** — consistency rules + examples (human + AI)
   - `idea-catalog_title-tone-style-guide_v0.md`

11) **Milestones & Roadmap** — high-level execution plan across pre-Studio + Studio phases
   - `idea-catalog_milestones-roadmap_v0.md`

12) **Studio MVP Detailed Implementation Plan (Steps 1-2-3A)** — execution checklist and resume protocol
   - `studio_mvp_detailed_implementation_plan_v0.md`

13) **Studio MVP Schema SQL (Steps 1-2-3A)** — copy-ready table + RLS migration for DB repo
   - `studio_mvp_steps_1_2_3A_schema_v0.sql`

---

## Related existing specs

- `02_traits-registry_v1_seed-spec.md` — defines trait vocabulary + bindings
- `03_idea-catalog_data-tagging-spec_v1.md` — defines publish gate rules, tiers, and bulk schema

These two specs define the vocabulary (slugs) and the publish gate rules that the docs above assume.

## Checkpoint and publish planning

For the current checkpoint/restore and draft-publish planning work, use:

- [checkpoint README](/Users/mike/Code/rekindle_web/docs/specs/checkpoint/README.md)

Where these older v0 docs differ from the checkpoint spec pack, the checkpoint spec pack is authoritative for upcoming implementation.

Historical note:

- the older export-only Studio MVP docs in this folder reflect a prior `draft -> review -> publishable -> exported` direction
- they are useful as historical context, not as the implementation source for the current publish-first workflow
