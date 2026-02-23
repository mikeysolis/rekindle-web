# Rekindle — AI Idea Research Context Pack (v0)

**Status:** High-level guidance for using ChatGPT as a research + catalog authoring assistant

We plan to use AI (ChatGPT) to accelerate catalog research, ideation, rewriting, and first-pass tagging.

This document defines:

- what context the AI needs to be effective,
- how we ask questions (prompt templates), and
- what output formats are accepted (so results can be copied into the bulk dataset or Studio).

---

## 1) Operating assumptions (the AI must follow)

### 1.1 Catalog quality gate
AI output is **candidate content** until it passes the same publish gate as human-authored ideas:

- Tier 1 facets must be complete.
- Tier 2 facets only when clear (don’t guess).
- Tier 3 facets only when confidently applicable (never guess).
- A human review pass is required before import/publish.

### 1.2 “Quiet by default” UX
The catalog supports progressive disclosure: only a few quick filters are prominent; everything else is deeper.
This means AI should prioritize generating content that fills the common quick-filter slices first.

### 1.3 No personal data reuse
When working from user-authored wishes or submissions:

- The AI must generalize/anonymize (remove names/locations/identifying details).
- Rewrite into a reusable catalog Idea rather than reproducing user text.

---

## 2) The minimum context the AI needs

Create a reusable “Context Packet” you can paste at the top of a ChatGPT thread.

### 2.1 Project summary (short)
Provide 5–10 bullets:

- what the app does (relationship support through ideas)
- definition of Idea vs Plan vs Wish
- tone rules (emotionally safe, non-guilting)
- the publish gate idea (Tier 1 required)

### 2.2 Allowed facet slugs (authoritative)
Paste the canonical slugs for the core facets the AI must use.

At minimum, include Tier 1 and Tier 2 slugs:

- `cost_tier`: free, low, medium, high, luxury
- `coordination_level`: none, light, schedule, booking
- `presence_requirement`: remote_ok, in_person_required, either
- `idea_format`: message, call, quality_time, gift, service, experience, self_care
- `surprise_style`: surprise_friendly, heads_up_ok, coordinate_first
- `energy_vibe`: calm, moderate, high
- `social_setting`: solo, one_on_one, small_group, group_event
- `age_band`: kid, teen, adult, older_adult, any

And then paste your canonical slugs for the existing lookups:

- `goal_slugs`
- `context_slugs`
- `idea_category_slugs`
- `relationship_type_fit_slugs`

If the AI can’t see the allowed slugs, it will invent them.

### 2.3 Your current coverage gap
Give the AI the “slice” you’re trying to fill:

- time bucket(s)
- effort
- cost tier
- presence/coordination
- relationship type fit targets
- 3–5 goals and contexts you want more of

---

## 3) Output formats (so results are usable)

### 3.1 Recommended default: CSV rows (copy/paste)
Ask the AI to output rows with these fields:

- title
- reason_snippet
- description
- steps
- min_minutes
- max_minutes
- effort_slug
- cost_tier_slug
- coordination_level_slug
- presence_requirement_slug
- idea_format_slugs
- relationship_type_fit_slugs
- goal_slugs
- context_slugs
- idea_category_slugs
- (optional Tier 2) surprise_style_slug, energy_vibe_slug, social_setting_slugs, age_band_fit_slugs

### 3.2 Alternative: “Idea cards” for review
If you want readability first, ask for one idea per block with the same fields.

---

## 4) Prompt templates

### Template A — Generate a sprint batch (new ideas)
**Use when:** you have a coverage slice and want 25–100 ideas.

Prompt:
1) Here is my Context Packet (project summary + allowed slugs).
2) Generate **N** ideas for this slice:
   - time bucket: ...
   - effort: ...
   - cost tier: ...
   - presence: ...
   - coordination: ...
   - formats: ...
   - relationship fits: ...
   - include at least X of these goals: ...
   - include at least X of these contexts: ...
3) Output as **CSV rows** with the required fields.
4) Do not guess Tier 2/3 facets; leave blank when unclear.

### Template B — Rewrite + generalize user content (wish/submission → catalog draft)
**Use when:** you have an opt-in shared wish or submission.

Prompt:
“Rewrite this user text into a reusable catalog Idea:
- remove identifying details
- convert to verb-first title
- add a reason_snippet
- make the description actionable
- propose Tier 1 facets using only allowed slugs
- flag any uncertainties rather than guessing.”

### Template C — First-pass tagging for an existing draft
**Use when:** you already have an idea but need facet suggestions.

Prompt:
“Given this idea text, propose Tier 1 facet slugs (and Tier 2 only when obvious). If any Tier 1 facet is ambiguous, explain why and offer 1–2 plausible alternatives.”

### Template D — Dedupe: find near-duplicates and merge suggestions
**Use when:** you have a list of titles.

Prompt:
“Given this list of idea titles, group near-duplicates, pick a canonical version, and suggest how to merge or differentiate.”

### Template E — Practical-help micro-chores → abstract templates
**Use when:** you have lots of “dishes/trash/laundry” items.

Prompt:
“Convert these micro-chores into 5–10 higher-level ‘acts of service’ catalog ideas that don’t flood the user with chores. Keep them general, emotionally safe, and easy to tag.”

### Template F — Improve discoverability (synonyms + phrasing)
**Use when:** custom wishes suggest search failures.

Prompt:
“Here are common user phrasings for a need. Suggest better catalog titles, keywords/synonyms, and potential tag fixes so users can find the right idea.”

---

## 5) Human review checklist for AI output

Before any import/publish:

- Is the idea actually actionable?
- Is the title verb-first and specific?
- Is the language emotionally safe (no guilt, no pressure)?
- Are Tier 1 facets complete and consistent?
- Is it a duplicate of something we already have?

---

## 6) Suggested “Context Docs” to maintain

To keep AI effective over time, maintain these short markdown docs:

1) **Project summary + tone rules**
2) **Allowed facet slugs** (Tier 1 + Tier 2 + your core lookup slugs)
3) **Coverage dashboard snapshot** (what we’re missing)
4) **Title/description style guide** (examples of good vs bad)
5) **Practical-help policy** (what not to include; how to abstract)

Keeping these updated will make AI output dramatically more consistent.
