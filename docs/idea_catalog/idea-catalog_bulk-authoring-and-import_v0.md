# Rekindle — Bulk Authoring & Import (v0)

**Status:** High-level workflow (pre-Studio) for creating thousands of Ideas safely

This document defines how we store, validate, and import large batches of catalog **Ideas** before the Studio exists.

The goal is speed *without* losing data quality: every imported Idea should be publishable and discoverable.

---

## 1) Canonical data format

We will use a **CSV-first** canonical dataset (with optional JSON export), matching the bulk input schema from the tagging spec.

Practical rule: **one row = one Idea**.

### 1.1 Source of truth files

- `idea_catalog_v1.csv` — canonical importable dataset
- `idea_catalog_v1_working.csv` — optional superset with workflow fields (status, notes, reviewer)

Only the canonical importable dataset should be required to seed/import.

---

## 2) Required columns (publish gate)

The canonical dataset must include the minimum columns required to make Ideas useful and searchable:

### 2.1 Editorial fields
- `title`
- `reason_snippet`
- `description`
- `steps` (may be empty)
- `min_minutes`, `max_minutes`
- `effort_slug`
- `active` (if used)

### 2.2 Tier 1 facets (mandatory)
- `goal_slugs` (comma-separated)
- `context_slugs` (comma-separated)
- `cost_tier_slug`
- `coordination_level_slug`
- `presence_requirement_slug`
- `idea_format_slugs` (comma-separated)
- `relationship_type_fit_slugs` (comma-separated)
- `time_bucket_slug` (either explicit or derivable from minutes)

> Tier 1 completeness is a hard gate: if any Tier 1 facet is missing, the row is not importable.

---

## 3) Recommended columns (Tier 2)

Tier 2 facets add major value and should be included when clear:

- `surprise_style_slug`
- `energy_vibe_slug`
- `social_setting_slugs`
- `age_band_fit_slugs`

Coverage target: aim for **~80%** completion across the Tier 2 set.

---

## 4) Optional columns (Tier 3)

Only tag these when clearly applicable:

- `physical_intensity_slug`
- `accessibility_flag_slugs`
- `weather_dependence_slugs`
- `gender_fit_slugs`

Rule: **never guess** Tier 3.

---

## 5) Workflow columns (not in DB)

These are safe to keep in the *working* CSV and ignore during import:

- `status` (`draft | review | publishable | imported`)
- `reviewer`
- `editorial_note`
- `source`

---

## 6) Validation (pre-import)

Validation is mandatory before any import/seed.

### 6.1 Structural validation
- Required columns exist
- No empty titles
- Minutes parse and are sane (`min <= max`)

### 6.2 Slug validation
- Every slug exists in the canonical registry/lookups
- Comma-separated fields split cleanly

### 6.3 Publish gate validation
- Editorial required fields complete
- Tier 1 facets complete

### 6.4 Consistency validation (examples)
- presence requirement aligns with contexts
- booking coordination usually implies experience/gift-like formats (flag mismatches for review)
- cost tier sanity checks for gift/experience
- non-neutral gender fit requires an editorial note

Validation output should be actionable:
- fail rows that cannot ship
- warn rows that look suspicious but might be valid

---

## 7) Dedupe and normalization

We will see duplicates at scale. Preventing “catalog bloat” is part of quality.

### 7.1 Dedupe checks
- exact-match on normalized title
- near-duplicate detection (similar titles)
- “semantic dupes” flagged during review

### 7.2 Normalization rules
- Titles are verb-first and specific
- Avoid overly broad “umbrella ideas” (split if it needs 4+ formats)
- Keep language emotionally safe (avoid guilt/pressure framing)

---

## 8) Import / seed loop (no Studio)

### 8.1 Batch loop
1) Author/update CSV
2) Validate (structural + slugs + publish gate + consistency)
3) Seed/import into local Supabase
4) Test in mobile app search flows
5) Fix issues and repeat

### 8.2 “Fast feedback” principle
Keep batches small enough to review confidently (e.g., 25–100 Ideas per batch), then scale once the pipeline is smooth.

---

## 9) Hand-off to Studio

When Studio exists, it should:

- read/write the same Idea data model (or a compatible staging model)
- enforce the same publish gate and validation rules
- enable safe batch edits and coverage dashboards

The bulk CSV pipeline remains valuable for:
- massive one-time imports
- offline authoring
- partner/vendor contributions
