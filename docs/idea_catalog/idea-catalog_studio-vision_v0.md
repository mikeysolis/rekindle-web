# Rekindle — Idea Catalog Studio (Vision & Workflows) v0

**Status:** High-level product/ops vision (no implementation details)

The Studio is a separate web app (NextJS + Tailwind) that becomes the long-term “operating system” for the Idea catalog.

This document explains what the Studio is responsible for, how it relates to the pre-Studio bulk pipeline, and which workflows it must support.

---

## 1) Why a Studio exists

The catalog is not a one-time dump. It requires ongoing operations:

- drafting and editing Ideas
- tagging with guardrails
- validating publish readiness
- publishing and retiring
- deduping and merging
- coverage dashboards
- intake from users (custom wishes + submissions)

The Studio encodes the rules so quality is consistent and the catalog improves over time.

---

## 2) Studio’s core principle: trait-driven UI

The Studio should not hard-code tagging UI.

Instead, it should render tagging controls from the canonical **Traits Registry** and **trait bindings**:

- what’s required (Tier 1)
- select mode (single/multi)
- minimum required values (e.g., 1)
- UI group + UI hint (chips, sheet, hidden)
- “quick” filter flags

This prevents drift between Studio tagging and the mobile app’s search facets.

---

## 3) Studio modules (conceptual)

### 3.1 Catalog
- Idea list with search
- filters (mirroring app filters)
- bulk edit tools
- “coverage view” (what’s underrepresented)

### 3.2 Idea Editor
- editorial fields (title, reason snippet, description, steps)
- time/effort fields
- tag UI (Tier 1 first, then Tier 2, then Tier 3)
- validation warnings inline
- publish readiness panel

### 3.3 Publish Workflow
- statuses: draft → review → publishable → published
- publish gate enforcement (Tier 1 complete + validation clean)
- audit trail / revision history

### 3.4 Candidate Inbox (flywheel)
Unified intake for:
- **shared custom wishes** (opt-in)
- **user-submitted ideas**

Inbox actions:
- dedupe / match to existing catalog
- promote to Idea draft
- reject/archive with reason
- route “practical help micro-chores” to the correct handling path

### 3.5 Rewards & Attribution (optional module)
- track contributor attribution
- reward state (pending/approved/redeemed)
- allow smaller “discovery fix” rewards for helpful duplicates

---

## 4) Studio + deep linking (QA superpower)

Because deep linking is already being tested in the project, Studio should eventually provide:

- “Preview in app” for any Idea
- “Preview as Plan/Wish” for a test Person (dev-only)

This creates a tight feedback loop between catalog data and real UX.

---

## 5) How Studio and the bulk pipeline work together

Studio does **not** block initial catalog generation.

Instead:

### Stage 1 (pre-Studio)
- CSV pipeline produces the first corpus

### Stage 2 (Studio MVP)
- Studio becomes the editor/validator for new work
- CSV remains useful for massive batch imports and offline contributions

Over time, most daily catalog work moves to Studio, but we keep the CSV pipeline as a “power tool.”

---

## 6) Guardrails and governance

Studio should make good behavior the default:

- enforce Tier 1 requirements
- discourage guessing Tier 2/3
- require an editorial note for sensitive tags (e.g., non-neutral gender fit)
- support deprecation (do not delete published options)

---

## 7) Success criteria (what “good” looks like)

The Studio is successful when:

- editors can add high-quality Ideas quickly without breaking search
- coverage gaps are visible and easy to fill
- duplicates are prevented/merged
- inbound user ideas can be triaged safely
- publishing is controlled and auditable
