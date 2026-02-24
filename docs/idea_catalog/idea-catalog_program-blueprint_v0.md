# Rekindle — Idea Catalog Program Blueprint (v0)

**Status:** High-level program plan (no implementation details)

This blueprint describes the end-to-end system for creating, validating, importing, and maintaining a large, searchable catalog of curated **Ideas**.

It intentionally covers two phases that must work together:

1) **Initial catalog generation (without the Studio):** a methodical research + bulk authoring pipeline to create the first thousands of Ideas.
2) **Ongoing catalog operations (with the Studio):** a NextJS web “Studio” that becomes the long-term operating system for intake, editing, validation, publishing, and maintenance.

---

## 1) North Star

People often want to show up for others, but struggle to think of what to do. Rekindle’s job is to make it *fast* to find a good idea that fits the person and the moment.

The catalog must feel:

- **Discoverable:** search/filter results are rarely empty.
- **Person-aware:** ideas feel relevant to the relationship.
- **Actionable:** ideas are specific and easy to do.
- **Emotionally safe:** avoids guilt/shame framing.

---

## 2) Domain model (shared language)

- **Idea:** a curated catalog suggestion.
- **Plan:** created when an Idea is attached to a Person as “I intend to do this.”
- **Wish:** created when an Idea is attached to a Person as “I want / want to share.”

This program is specifically about catalog **Ideas**.

---

## 3) Hard rules (quality gate)

We treat the catalog tagging/authoring standard as a **quality gate**:

- If an Idea can’t be tagged to standard, it doesn’t ship.
- “Tag once” is the goal; we avoid re-tagging later by capturing the right facets up front.

### 3.1 Tagging tiers

- **Tier 1 (mandatory):** must be present on every Idea.
- **Tier 2 (recommended):** target high coverage, but never guess.
- **Tier 3 (only when confident):** only tag when clearly applicable; never guess.

### 3.2 Publish gate (Definition of Done)

An Idea is publishable only if:

- Required editorial fields are present (title, reason snippet, description, minutes, effort, etc.)
- Tier 1 facets are complete (logistics + format + fit + goals + contexts + time bucket).
- Consistency checks pass (no contradictory tags).
- A review pass confirms clarity + emotional safety.

---

## 4) Shared vocabulary: Traits Registry

The catalog’s tagging system uses a shared trait vocabulary:

- trait types (time, effort, cost, etc.)
- trait options (allowed slugs)
- trait bindings (what’s required/visible/filterable for Ideas)
- UI surfacing metadata (grouping + “quick filters”)

Key consequences:

- **Studio should be trait-driven, not hard-coded.**
- **Research planning should be trait-driven, too.** Our coverage goals are defined by the facets the app uses.

### 4.1 Quick filters (initial)

Quick filters are intentionally limited to three to avoid overload:

1) time bucket
2) effort
3) cost tier

This influences both:

- what users commonly filter on (so coverage must be good)
- what we request from users in submissions (low-friction tagging)

---

## 5) Two-phase system (how everything fits)

### Phase A — Initial catalog generation (no Studio required)

**Goal:** create the first thousands of publishable Ideas via a bulk authoring pipeline.

**Core loop:**

1) Identify coverage gaps (what will feel empty in search)
2) Run research + authoring “sprints” focused on those gaps
3) Write + tag ideas in a bulk dataset (CSV/JSON-friendly)
4) Validate (publish gate + consistency rules)
5) Seed/import into Supabase
6) Test in the mobile search UX

This phase relies on simple tools (spreadsheets/CSV + scripts) and does not require Studio to start.

### Phase B — Ongoing catalog operations (Studio)

**Goal:** make catalog work sustainable and safe at scale.

Studio becomes the place to:

- create/edit Ideas
- apply trait-driven tagging with guardrails
- show publish readiness (Tier 1 completeness, validation warnings)
- dedupe/merge/retire ideas
- run coverage dashboards
- manage inbound candidates (custom wishes + user submissions)
- optionally deep-link “Preview in app” for QA

---

## 6) Inbound flywheel (user data → better catalog)

We will use two inbound sources as long-term accelerators:

### 6.1 Custom wishes

Custom wishes can indicate:

1) A truly new catalog candidate
2) A discovery failure (catalog had it, but users couldn’t find it)
3) A demand signal (what people want, in their own words)

We do both:

- **Opt-in reuse:** ask if the user wants to share the content for potential catalog inclusion.
- **Aggregate learning:** even without reuse, use signals to improve search/discovery and set research priorities.

### 6.2 User-submitted ideas + rewards

Users can submit ideas intentionally; we reward users whose submissions are adapted into published catalog Ideas.

Important guardrail:

- submissions go into a **Candidate Inbox** (draft/staging), never directly into production.

### 6.3 Practical-help micro-chores policy

Some wishes are “micro chores” (dishes, trash, etc.).

Policy:

- Keep them valid as personal wishes (useful in real relationships).
- Avoid flooding the catalog with granular chores.
- Prefer either filtering them out of catalog ingestion **or** abstracting into a small set of higher-level “acts of service” templates.

---

## 7) Governance and safety

- Treat trait option slugs as immutable once published.
- Deprecate rather than delete.
- Treat inbound user text as untrusted boundary data; validate/sanitize and anonymize before reuse.

---

## 8) High-level milestones

### M0 — Rules locked
- Publish gate definition agreed.
- Traits registry treated as the canonical vocabulary.

### M1 — Research engine ready (no Studio)
- Coverage matrix defined (what to research is always knowable).
- Sprint playbook established.
- Bulk dataset template established.

### M2 — Bulk pipeline works end-to-end
- Author → validate → import/seed → test in app loop is smooth.
- First “real-feeling” corpus across quick filters.

### M3 — Studio MVP
- Draft/edit ideas.
- Trait-driven tag UI.
- Publish readiness view.

### M4 — Studio ops maturity
- Dashboards for coverage.
- Dedupe/merge + retirement.
- Candidate inbox (wishes + submissions).

### M5 — Flywheel + rewards
- User submission workflow.
- Reward workflow tied to published outcomes.
