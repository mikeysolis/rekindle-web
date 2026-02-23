# Facet Slug Reference Pack v0
_A paste-ready taxonomy reference for AI-assisted Idea research and tagging._

## Why this exists
When we use AI (ChatGPT) to generate and tag Ideas, we **must not invent taxonomy**.
This document is the canonical “slug list + rules” that you can paste into a ChatGPT session so outputs stay consistent with Rekindle’s trait system and can be imported without rework.

> Authoritative registry source is in `supabase/seeds/registry/*.csv` (this file is a working reference and should be updated whenever registry changes).

---

## Golden rules (for AI + humans)
1) **Only use listed slugs** for trait fields.
2) If you can’t find a slug, output `NEEDS_MAPPING:<human_name>` (do not guess a slug).
3) Prefer **Tier 1 completeness** over cleverness: an Idea is not publishable without Tier 1 facets.
4) Don’t produce “micro-chores” as standalone catalog Ideas (e.g., “take out the trash”). If relevant, abstract to a general service template (“Take one chore off their plate today”).

---

## Trait tiers for `idea` context (what must be tagged)

### Tier 1 (publish gate; required)
- `time_bucket` (single)
- `effort` (single)
- `cost_tier` (single)
- `coordination_level` (single)
- `presence_requirement` (single)
- `idea_format` (multi; min 1)
- `goal` (multi; min 1)
- `context` (multi; min 1)
- `idea_category` (multi; min 1)
- `person_type` (multi; min 1)  
  _Used heavily for scoring/fit; does not need to be a user-facing filter at launch._

### Tier 2 (recommended; target high coverage)
- `event_tag` (multi)
- `idea_collection` (multi)
- `surprise_style` (single)
- `energy_vibe` (single)
- `social_setting` (multi)
- `age_band` (multi)
- `cadence_tag` (multi; hidden in UI by default)

### Tier 3 (only when confident; usually hidden)
- `physical_intensity` (single)
- `accessibility_flag` (multi)
- `weather_dependence` (multi)
- `person_gender` (multi; hidden by default)

---

## Canonical option slugs for NEW trait types

### Tier 1 options

#### `cost_tier`
- `free`
- `low`
- `medium`
- `high`
- `luxury`

#### `coordination_level`
- `none`
- `light`
- `schedule`
- `booking`

#### `presence_requirement`
- `remote_ok`
- `in_person_required`
- `either`

#### `idea_format`
- `message`
- `call`
- `quality_time`
- `gift`
- `service`
- `experience`
- `self_care`

### Tier 2 options

#### `surprise_style`
- `surprise_friendly`
- `heads_up_ok`
- `coordinate_first`

#### `energy_vibe`
- `calm`
- `moderate`
- `high`

#### `social_setting`
- `solo`
- `one_on_one`
- `small_group`
- `group_event`

#### `age_band`
- `kid`
- `teen`
- `adult`
- `older_adult`
- `any`

### Tier 3 options

#### `physical_intensity`
- `low`
- `moderate`
- `high`

#### `accessibility_flag`
- `mobility_friendly`
- `seated_ok`
- `sensory_friendly`
- `low_vision_friendly`
- `hearing_friendly`

#### `weather_dependence`
- `indoor`
- `outdoor`
- `fair_weather_only`
- `any_weather`

---

## Migrated lookup trait types (option slugs come from DB)
These trait types are migrated from existing v2 lookup tables and must preserve their existing option slugs:
- `time_bucket`
- `effort`
- `goal`
- `context`
- `event_tag`
- `idea_category`
- `idea_collection`
- `cadence_tag`
- `person_type`
- `person_gender`

### How to keep this doc accurate
Paste the current option slugs below (exported from your canonical source).

**Recommended source of truth:**
- `supabase/seeds/registry/*.csv` (authoritative), or
- direct DB export queries like: `select slug from <table> order by sort_order`.

### Paste blocks (fill in)
> Tip: Keep these lists sorted and one slug per line.

#### `time_bucket` option slugs
_PASTE_HERE_

#### `effort` option slugs
_PASTE_HERE_

#### `goal` option slugs
_PASTE_HERE_

#### `context` option slugs
_PASTE_HERE_

#### `idea_category` option slugs
_PASTE_HERE_

#### `event_tag` option slugs
_PASTE_HERE_

#### `idea_collection` option slugs
_PASTE_HERE_

#### `cadence_tag` option slugs
_PASTE_HERE_

#### `person_type` option slugs
_PASTE_HERE_

#### `person_gender` option slugs
_PASTE_HERE_

---

## Optional UI metadata constants (Studio-safe)
These are stable group/hint names used in trait bindings and Studio rendering.

### `ui_group_slug` (suggested)
- `basics` — time/effort/cost (+ core intent facets)
- `fit` — person fit
- `format` — how it’s expressed (message/call/etc.)
- `logistics` — presence + coordination (+ weather)
- `mood` — energy + social
- `occasion` — event tags + collections (+ cadence)
- `safety` — surprise + accessibility + intensity

### `ui_hint` (suggested)
- `chips`
- `sheet`
- `toggle`
- `hidden`

---

## Paste-ready ChatGPT instruction block
Copy this into the start of any “Idea research” ChatGPT session:

> **Taxonomy rules:** Use only the slugs listed in the Facet Slug Reference Pack v0.  
> For any migrated lookup tag (goal/context/category/etc.) where you don’t know the slug, output `NEEDS_MAPPING:<name>` instead of guessing.  
> Every Idea must include Tier 1 facets: `time_bucket`, `effort`, `cost_tier`, `coordination_level`, `presence_requirement`, `idea_format`, plus at least one `goal`, `context`, `idea_category`, and `person_type` (or needs-mapping entries).  
> Avoid micro-chores as standalone Ideas; abstract to general service templates when appropriate.

