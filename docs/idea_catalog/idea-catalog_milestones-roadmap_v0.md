# Rekindle — Idea Catalog Milestones & Roadmap (v0)

**Status:** High-level roadmap (durable milestones, not implementation details)

This document turns the Idea Catalog Program Blueprint into a sequence of milestones that can be executed over time.

It covers both:
- the **pre‑Studio** phase (research + bulk authoring + import), and
- the **Studio** phase (ongoing ops + candidate intake).

---

## Guiding outcomes (what “success” looks like)

1) The catalog feels **useful on day one** (search doesn’t feel empty).
2) Every published Idea meets the **publish gate** (Tier 1 complete + editorial quality).
3) The system is **repeatable** (we can add 100+ ideas per week without chaos).
4) Maintenance is safe (dedupe, retagging, deprecations) without breaking the app.
5) User behavior and submissions create a **flywheel** (catalog improves over time).

---

## Milestone 0 — Lock the rules and vocabulary

**Goal**: One shared “definition of done” for Ideas that never changes casually.

**Deliverables**
- Publish gate checklist finalized (Tier 1 required; Tier 2/3 rules).
- Canonical trait vocabulary + allowed slugs identified as source-of-truth.
- Practical-help micro‑chores policy agreed (filter vs abstract templates).

**Exit criteria**
- No one is authoring “un-tagged” ideas.
- Everyone uses the same slugs.

**KPIs**
- 0% of published ideas missing Tier 1.

---

## Milestone 1 — Research engine online (coverage-driven backlog)

**Goal**: We always know what to research next.

**Deliverables**
- Coverage Dashboard is operating (even if it’s just a spreadsheet at first).
- Research Sprint definition (what a sprint is, how we pick a slice, how we measure completion).
- First set of Idea Pattern Templates (repeatable generation patterns).

**Exit criteria**
- A single “next sprint slice” can be chosen from coverage gaps in minutes.

**KPIs**
- % of quick-filter cube cells with at least a minimum viable count.

---

## Milestone 2 — Bulk authoring pipeline working (pre-Studio)

**Goal**: We can reliably create, validate, and import batches.

**Deliverables**
- Canonical bulk dataset format (CSV/JSON-friendly) used consistently.
- Validation rules applied before import (publish gate + consistency checks).
- Local test loop for data changes (seed → test search in app).

**Exit criteria**
- A batch can be drafted → validated → seeded locally without manual DB surgery.

**KPIs**
- Tier 1 completeness rate = 100% for imported ideas.
- Review pass completion rate (draft → reviewed).

---

## Milestone 3 — Initial catalog seed (first production-quality corpus)

**Goal**: The app feels immediately useful across common filters.

**Deliverables**
- A first “real-feeling” set of published ideas across:
  - time bucket × effort × cost tier
  - presence × coordination
  - a balanced distribution of formats

**Exit criteria**
- Most common searches return multiple good results.

**KPIs**
- Empty result rate for common quick-filter combinations.
- Distribution skew metrics (e.g., no single format dominates > X%).

---

## Milestone 4 — Studio MVP (editorial operations)

**Goal**: Studio becomes the home for editing + publishing.

**Deliverables**
- Idea list + editor + tagging UI.
- Publish readiness indicators (Tier 1 completeness, warnings).
- Draft → review → publish workflow.
- “Preview in app” deep-link action (QA convenience).

**Exit criteria**
- Most new ideas are created/edited in Studio (not in ad-hoc spreadsheets).

**KPIs**
- Median time from draft → published.

---

## Milestone 5 — Studio dashboards + maintenance tools

**Goal**: Prevent catalog drift and reduce manual cleanup.

**Deliverables**
- Coverage dashboards (quick-filter cube, logistics grid, format distribution).
- Dedupe workflow (suggest near-duplicates, merge/retire actions).
- Bulk operations (retagging, deprecations, batch edits).

**Exit criteria**
- We can confidently maintain/retag at scale.

**KPIs**
- Duplicate rate trend (down over time).
- Coverage trend (sparse cells decrease).

---

## Milestone 6 — Candidate inbox: wishes + user submissions

**Goal**: Build the flywheel.

**Deliverables**
- Unified inbox in Studio for:
  - opt-in shared custom wishes
  - user-submitted ideas
- Dedupe/match routing:
  - “already exists” → discovery fix
  - “novel” → promote to draft
- Reward attribution workflow (reward on published/approved outcomes).

**Exit criteria**
- Candidate intake is a normal part of weekly catalog ops.

**KPIs**
- Submission acceptance rate.
- Time from candidate → published.
- Count of “discovery fixes” driven by duplicates.

---

## Milestone 7 — Translation readiness (optional, when needed)

**Goal**: Prepare catalog content to scale internationally.

**Deliverables**
- Translation-ready authoring pattern (stable slugs; separate localized strings).
- Studio workflow for translation drafts and review.

**KPIs**
- % of published ideas with localized strings in target language(s).

---

## Roles (high-level)

- **Catalog Editor**: writes/rewrites ideas, applies tags.
- **Reviewer**: second-pass review for clarity, emotional safety, and consistency.
- **Catalog Admin**: governs taxonomy changes, deprecations, merge policy.
- **Engineer**: builds Studio + validation tooling + import workflows.

---

## Operating cadence (suggested)

- Weekly: 1–2 research sprints + one publish batch
- Weekly: coverage dashboard review (pick next gaps)
- Monthly: dedupe/maintenance sweep
- Quarterly: taxonomy review (careful, governed changes only)
