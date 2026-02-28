# Idea Catalog Linter + Validator Spec v0

> **Status:** Implementation-ready spec  
> **Audience:** internal devs + catalog editors (power users)  
> **Applies to:** bulk authoring phase (pre‑Studio), and later Studio ingestion pipelines

---

## 1) Purpose

We need to create **thousands of curated Ideas** quickly without sacrificing search quality. The Idea Catalog Linter + Validator is the gatekeeper that makes bulk authoring scalable:

- Ensures every Idea meets the **publish gate** (Tier 1 is complete).
- Prevents taxonomy drift by validating **trait slugs** against the canonical registry.
- Catches contradictions and low-quality entries early.
- Produces a **normalized, import-ready** representation that can be safely inserted into Supabase.

This tool is designed to be the “factory QA line” for the catalog.

---

## 2) Core principles

### 2.1 Treat bulk data as untrusted boundary input
Even if **we authored it**, bulk CSV/JSON must be treated as **untrusted boundary input**:
- Parse as `unknown`, validate + normalize at the boundary.
- Fail early with actionable messages.
- Do not let malformed rows reach DB writes.

(Aligned with the repo’s broader “type fence + guards + DTO mapping” philosophy.)

### 2.2 “Tag once” enforcement
Tier 1 facets are non-negotiable. If any Tier 1 facet is missing or invalid:
- The row is **not publishable**
- The import must **not** proceed for that row

### 2.3 Deterministic outcomes
Given the same inputs + registry snapshot, the linter must produce:
- the same normalized output
- the same error list
- the same derived values (ex: derived time bucket)

---

## 3) Inputs

### 3.1 Supported formats
- CSV (primary)
- JSON (optional; often used as an intermediate normalized output)

### 3.2 Canonical CSV schema
We use the project template as canonical (columns may evolve, but required columns must remain stable):

- `title`
- `reason_snippet`
- `description`
- `steps`
- `what_you_need`
- `tips_or_variations`
- `safety_or_boundaries_note`
- `min_minutes`
- `max_minutes`
- `effort_slug`
- `active`
- `cost_tier_slug`
- `coordination_level_slug`
- `presence_requirement_slug`
- `idea_format_slugs`
- `relationship_type_fit_slugs`
- `goal_slugs`
- `context_slugs`
- `idea_category_slugs`
- `time_bucket_slug` *(optional if derivable)*
- Tier 2 columns: `surprise_style_slug`, `energy_vibe_slug`, `social_setting_slugs`, `age_band_fit_slugs`, `event_tag_slugs`, `idea_collection_slugs`
- Tier 3 columns: `physical_intensity_slug`, `accessibility_flag_slugs`, `weather_dependence_slugs`, `gender_fit_slugs`
- Editorial-only columns (not necessarily imported): `status`, `editorial_note`, `source`

---

## 4) Outputs

### 4.1 Human-readable report (console)
- Summary counts (rows, pass, fail, warnings)
- Breakdown by error codes
- “coverage” stats for Tier 2 facets (for tracking ~80% targets)

### 4.2 Machine-readable report (JSON)
A JSON file to support Studio ingestion later.

Recommended schema:

```ts
type Severity = "error" | "warn" | "info";

type ValidationIssue = {
  severity: Severity;
  code: string;                 // e.g. IDEA_TIER1_MISSING, TRAIT_SLUG_UNKNOWN
  rowIndex: number;             // 1-based data row index (excluding header)
  column?: string;
  message: string;
  suggestion?: string;
};

type LintResult = {
  ok: boolean;                  // true when no errors
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  normalized?: NormalizedIdeaRow[]; // omitted unless requested
  metrics: {
    totalRows: number;
    passedRows: number;
    failedRows: number;
    warningCount: number;
    tier2Coverage: Record<string, { present: number; total: number; pct: number }>;
  };
};
```

### 4.3 Normalized output (JSON)
The linter can optionally output a normalized JSON file to be consumed by the importer:

- arrays instead of comma strings
- trimmed values
- derived time bucket (if enabled)
- canonical boolean parsing
- canonical trait type mapping (see section 7)

---

## 5) Registry / vocabulary sources (trait validity)

The linter must validate trait slugs against **canonical registry data**.

### Supported registry backends
**Option A (preferred for local dev & CI):**
- Read trait registry seed CSVs (ex: `supabase/seeds/registry/*.csv`), build an in-memory index.

**Option B (preferred for production imports):**
- Query Supabase for `trait_types` + `trait_options` (including `is_deprecated`).

### Required index structures
- `traitTypeBySlug: Map<string, { id: string; slug: string }>`
- `traitOptionByTypeAndSlug: Map<string /* typeSlug */, Map<string /* optionSlug */, TraitOption>>`
- where `TraitOption` includes: `id`, `slug`, `is_deprecated`

---

## 6) Parsing rules (CSV conventions)

### 6.1 Strings
- Trim leading/trailing whitespace
- Normalize internal repeated spaces (optional warning, not required)

### 6.2 Booleans
Accept:
- `true/false`
- `TRUE/FALSE`
- `1/0`
- `yes/no`

Output must be canonical boolean.

### 6.3 Lists
Columns ending in `_slugs` are interpreted as lists unless explicitly single-select.

Default list parsing:
- Split on commas `,`
- Trim each item
- Remove empty entries
- De-duplicate while preserving order

Example:
- `"message, call,call"` → `["message","call"]`

### 6.4 Steps
`steps` is parsed as a list using a separate delimiter:
- Split on `|` (pipe)
- Trim each step
- Remove empty steps
- Cap at 6 (warn if more)

---

## 7) Normalization (canonical mapping model)

The linter produces a normalized representation that aligns to the **traits system** and the `ideas` + `idea_traits` schema.

### 7.1 Canonical trait type mapping (CSV column → trait type slug)
This matters because some CSV column names are “friendly” but DB trait types are canonical:

| CSV column | Trait type slug | Select mode |
|---|---|---|
| `time_bucket_slug` | `time_bucket` | single |
| `effort_slug` | `effort` | single |
| `cost_tier_slug` | `cost_tier` | single |
| `coordination_level_slug` | `coordination_level` | single |
| `presence_requirement_slug` | `presence_requirement` | single |
| `idea_format_slugs` | `idea_format` | multi |
| `goal_slugs` | `goal` | multi |
| `context_slugs` | `context` | multi |
| `idea_category_slugs` | `idea_category` | multi |
| `relationship_type_fit_slugs` | `person_type` | multi |
| `event_tag_slugs` | `event_tag` | multi |
| `idea_collection_slugs` | `idea_collection` | multi |
| `surprise_style_slug` | `surprise_style` | single |
| `energy_vibe_slug` | `energy_vibe` | single |
| `social_setting_slugs` | `social_setting` | multi |
| `age_band_fit_slugs` | `age_band` | multi |
| `physical_intensity_slug` | `physical_intensity` | single |
| `accessibility_flag_slugs` | `accessibility_flag` | multi |
| `weather_dependence_slugs` | `weather_dependence` | multi |
| `gender_fit_slugs` | `person_gender` | multi |

---

## 8) Validation rules

### 8.1 CSV schema validation (structural)
**Errors**
- Missing required columns
- Invalid header name (typo) for required columns

**Warnings**
- Unknown extra columns (allowed, but flagged)
- Empty rows

### 8.2 Base editorial validation (content quality)
**Errors**
- `title` missing/blank
- `reason_snippet` missing/blank
- `description` missing/blank
- `min_minutes` or `max_minutes` missing/not numeric
- `min_minutes > max_minutes`

**Warnings**
- Title too long (> 80 chars)
- Reason snippet too long (> 140 chars)
- Description too short (< 30 chars) or too long (> 600 chars)
- Steps > 6 (truncate in normalized output; warn)

### 8.3 Tier 1 publish gate (mandatory facets)
**Errors**
- missing/empty: `effort_slug`
- missing/empty: `cost_tier_slug`
- missing/empty: `coordination_level_slug`
- missing/empty: `presence_requirement_slug`
- `idea_format_slugs` empty
- `relationship_type_fit_slugs` empty
- `goal_slugs` empty
- `context_slugs` empty
- `idea_category_slugs` empty
- `time_bucket_slug` missing **and** cannot be derived

### 8.4 Trait slug correctness (registry validation)
For each trait slug listed in a row:

**Errors**
- trait type not found (internal error; misconfigured mapping)
- option slug not found for that trait type
- option is deprecated (`is_deprecated = true`)

**Warnings**
- option exists but has suspicious meta (optional future rule)
- duplicate option in a list (auto-dedup; warn)

### 8.5 Consistency rules (contradictions)
These are “automatic validation recommended” rules.

**Warnings by default** (can be promoted to errors later):
- Presence vs contexts:
  - `presence_requirement = remote_ok` but no remote/digital-friendly context selected
  - `presence_requirement = in_person_required` but only remote contexts selected
- Coordination vs format:
  - `coordination_level = booking` but formats exclude `experience`/`gift` (review)
- Cost vs format:
  - `cost_tier = free` while formats include `gift`/`experience` (review)
- Age band vs relationship fit:
  - `age_band_fit` includes `kid` but relationship fit lacks `parent`/`child` (review)
- Gender fit:
  - gender fit is not neutral / too restrictive without an editorial note (review)

### 8.6 “Practical help micro‑chore” filter
Goal: avoid flooding catalog with low-signal chores (“take out trash”, “do dishes”).

**Warnings**
- Title matches micro-chore patterns (“do the dishes”, “take out the garbage”)
- Suggest: mark row `status=exclude_practical_help` or move to separate batch for later abstraction

This is not a taxonomy rule; it’s a **catalog noise** rule.

### 8.7 Duplicate detection
**Warnings**
- Duplicate `title` normalized within batch (case-insensitive)
- Duplicate `slug` within batch
- Near-duplicate title heuristic (optional phase 2)

---

## 9) Derived values

### 9.1 Derived time bucket
If `time_bucket_slug` is blank, attempt to derive it.

Preferred strategy:
- Trait options for `time_bucket` should include `meta` fields that allow mapping from minutes:
  - e.g. `{ "minMinutes": 0, "maxMinutes": 5 }`

Derivation algorithm:
1) Use `max_minutes` primarily (what users feel)
2) Find the first time_bucket option where `minMinutes <= max_minutes <= maxMinutes`
3) If ambiguous, choose the smallest bucket that still contains `max_minutes`
4) If none match: error `TIME_BUCKET_DERIVE_FAILED`

---

## 10) CLI + developer ergonomics

### 10.1 Proposed commands
- `npm run ideas:lint -- <path-to-csv>`
- `npm run ideas:lint:fix -- <path-to-csv>` *(optional, writes normalized output)*

### 10.2 Exit codes
- `0` = no errors
- `1` = errors present
- `2` = internal failure (registry missing, cannot read file)

### 10.3 Output files (optional)
- `./.artifacts/ideas-lint-report.json`
- `./.artifacts/ideas-normalized.json`

---

## 11) Acceptance criteria (definition of done)

The linter is “done” when:

1) It rejects any row missing Tier 1 facets (publish gate).
2) It rejects any unknown or deprecated trait slug.
3) It can produce a normalized JSON output that the importer can consume.
4) It integrates cleanly with the existing dev loop:
   - local run → seed local Supabase → verify Ideas Search behavior.

---

## 12) Future extensions (post‑v0)

- Multi-locale validation (ensure translation rows exist)
- “Taxonomy governance mode” (warn on new slugs, enforce immutability)
- Studio integration: real-time publish readiness checks
- Candidate inbox validation (user submissions + custom wishes)
