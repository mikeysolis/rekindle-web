# Rekindle — Idea Catalog Coverage Dashboard (v0)

**Status:** High-level tracking template (pre-Studio) that later becomes a Studio feature

This document defines *what we track* to ensure the Idea catalog stays discoverable and balanced during initial creation (pre-Studio), and how this dashboard drives a methodical research backlog.

It is intentionally “simple first”:
- A small set of tables that answer **where search will feel empty next**.
- A repeatable way to turn gaps into **research sprints**.
- A snapshot format we can paste into ChatGPT to accelerate ideation.

---

## 1) Why coverage tracking exists

A catalog can have thousands of ideas and still *feel empty* if:
- common filter combinations return few results,
- everything skews toward one format (e.g., “gift ideas”),
- or logistics constraints are underrepresented (e.g., remote/low-effort).

Coverage tracking prevents “random idea dumping” by turning creation into a **directed backlog**.

---

## 2) Core rule: track what the app surfaces first

The app is designed to be “quiet by default,” with a small set of **quick filters** surfaced first. Our coverage system starts there and expands only as needed.

### 2.1 Tier 0: Quick Filter Cube (highest ROI)

**Dimensions**
- `time_bucket`
- `effort`
- `cost_tier`

**Why this is first**
These are the fastest ways users narrow results, so sparse cells are immediately visible as “no good ideas.”

**Table template (example layout)**

> You can implement this in a spreadsheet with a pivot table, or manually maintain counts early on.

- Rows: `time_bucket`
- Columns: `effort × cost_tier`
- Cell: number of published ideas

**Suggested starter targets (adjust later)**
- “Healthy cell”: ≥ 20 ideas
- “Sparse cell”: 5–19 ideas
- “Empty cell”: 0–4 ideas

> Targets are deliberately simple; the goal is directional backlog, not perfection.

---

## 3) Tier 1: Feasibility coverage (logistics grid)

Some catalog gaps are not about content themes—they’re about *feasibility*.

### 3.1 Logistics Grid

**Dimensions**
- `presence_requirement` (remote / in-person / either)
- `coordination_level` (none / light / schedule / booking)

**Why it matters**
Without this, catalogs drift toward “in-person, scheduled” ideas and fail people who need:
- something they can do *today*,
- something *remote*,
- something requiring *no coordination*.

**Table template**
- Rows: `presence_requirement`
- Columns: `coordination_level`
- Cell: number of published ideas

**Starter heuristic**
Prioritize filling:
- `remote_ok × none`
- `either × none`
- `remote_ok × light`

These are the “daily touchpoint” cells that reduce empty-search experiences.

---

## 4) Tier 2: Format balance (shape of action)

### 4.1 Format distribution

**Dimension**
- `idea_format` (message, call, quality_time, gift, service, experience, self_care)

**Why it matters**
Users aren’t always looking for “something big.” Many needs are best served by:
- message/call (low effort, remote),
- service (remove friction),
- self-care (support in hard times).

**Table template**
- One table: counts by `idea_format`
- Optional: breakdown by `time_bucket` for each format

**Starter heuristic**
Ensure message/call/service have strong depth early so the app feels useful day-to-day.

---

## 5) Tier 3: Goal / context / category coverage (secondary balancing)

Goals, contexts, and categories explain **why** an idea exists and **when** it applies.
They are critical for relevance, but are harder to balance perfectly early.

### 5.1 Practical approach (v0)
Track:
- top 10 goals by count
- bottom 10 goals by count
- same for contexts
- same for idea categories

Then use these as sprint constraints *after* the quick filter cube and logistics grid are healthy.

---

## 6) Practical-help micro-chores: track separately

Because we intentionally avoid flooding the catalog with granular chores:
- Track “micro-chores filtered out” separately from “service templates published.”

**Why**
This protects the catalog from becoming a chore list while still ensuring “acts of service” are represented.

---

## 7) Turning the dashboard into a backlog (how we pick the next sprint)

### 7.1 Sprint selection rule (simple)
Pick the **lowest-filled cell** in:
1) the Quick Filter Cube, or
2) the Logistics Grid

Then choose:
- 1–2 formats to emphasize
- 3–5 goals/contexts/categories to target (optional)

### 7.2 Sprint definition (v0)
A sprint should specify:
- target slice (facet constraints)
- batch size (e.g., 25–100)
- definition of done (publish gate satisfied)
- review method (self-review + optional second pass)

---

## 8) “Coverage Snapshot” format (for AI context)

When using ChatGPT to help generate a sprint, paste a short snapshot like:

- **Slice we’re filling:** remote_ok + coordination=none + time_bucket=5min + effort=low + cost_tier=free/low
- **Formats to emphasize:** message, call
- **Goals to include (pick from allowed slugs):** …
- **Contexts to include:** …
- **What to avoid:** micro-chores as standalone ideas; guilt language

This dramatically improves AI output quality and keeps it aligned with our backlog.

---

## 9) How this evolves when Studio exists

In Studio maturity:
- these tables become real dashboards fed by production data,
- gaps become “one-click sprint definitions,”
- validation + publish readiness live in the editor,
- inbound sources (wishes/submissions) become additional backlog signals.

The dashboard remains the same conceptually—Studio just automates it.
