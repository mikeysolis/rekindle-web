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

6) **AI Context Pack** — how to use ChatGPT effectively for idea research and first-pass tagging
   - `ai-idea-research_context-pack_v0.md`

7) **Title + Tone Style Guide** — consistency rules + examples (human + AI)
   - `idea-catalog_title-tone-style-guide_v0.md`

8) **Milestones & Roadmap** — high-level execution plan across pre-Studio + Studio phases
   - `idea-catalog_milestones-roadmap_v0.md`

9) **Studio MVP Detailed Implementation Plan (Steps 1-2-3A)** — execution checklist and resume protocol
   - `studio_mvp_detailed_implementation_plan_v0.md`

---

## Related existing specs

- `02_traits-registry_v1_seed-spec.md` — defines trait vocabulary + bindings
- `03_idea-catalog_data-tagging-spec_v1.md` — defines publish gate rules, tiers, and bulk schema

These two specs define the vocabulary (slugs) and the publish gate rules that the docs above assume.
