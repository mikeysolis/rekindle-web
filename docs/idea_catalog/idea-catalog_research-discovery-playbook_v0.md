# Rekindle — Idea Catalog Research & Discovery Playbook (v0)

**Status:** High-level process (designed for the pre-Studio phase)

This playbook defines a methodical way to generate the initial thousands of catalog **Ideas** *without* relying on the Studio.

It turns “research and brainstorming” into a repeatable system that:

- always knows what to research next,
- produces **publishable** Ideas (not a pile of drafts), and
- builds coverage where the app’s search experience will otherwise feel empty.

---

## 1) Inputs, outputs, and the core loop

### Inputs
- Canonical trait vocabulary and tagging rules (Tier 1 / 2 / 3).
- Existing lookup vocab (goals, contexts, categories, relationship types, etc.).
- Editorial guidelines (tone, clarity, emotional safety).

### Output
- A canonical bulk dataset (CSV/JSON-friendly) of **publishable** Ideas (not drafts), suitable for seeding/import.

### Core loop
1) Identify coverage gaps (“where search will feel empty”).
2) Choose a focused research slice (a small set of facet combinations).
3) Generate candidate ideas using repeatable patterns.
4) Write + tag immediately (Tier 1 complete).
5) Review + validate.
6) Import/seed and test in the mobile app.

---

## 2) Coverage-driven backlog (how we always know what to research)

### 2.1 The “Quick Filter Cube” (highest ROI)
Start by ensuring strong coverage across the three quick filters:

- **time bucket**
- **effort**
- **cost tier**

Track counts in a simple cube: `time_bucket × effort × cost_tier`.

This is the fastest way to prevent search from feeling sparse.

### 2.2 Logistics coverage (feasibility)
Track a second grid focused on feasibility:

- **presence requirement** (remote vs in-person)
- **coordination level** (none/light/schedule/booking)

This prevents over-indexing on “in-person, scheduled, moderate effort” ideas while leaving gaps for “remote, low effort, immediate” ideas.

### 2.3 Format coverage (shape of action)
Ensure each major action shape has depth:

- message
- call
- quality time
- gift
- service
- experience
- self care

### 2.4 Where goals/contexts/categories fit
Goals/contexts/categories are Tier 1 and define why an idea exists and when it applies.

Instead of trying to evenly cover every goal/context early, use them as “secondary balancing” after the quick filter cube and logistics grids are healthy.

---

## 3) Research sprints (repeatable production unit)

### Sprint definition
A sprint is a focused batch of Ideas (e.g., 25–100) constrained to a slice of the coverage matrix.

Each sprint should have:
- a **target slice** (the facets we’re filling)
- a **batch size**
- a **Definition of Done** (publish gate)
- a **review method** (second pass when possible)

### Example sprint slices
- Remote + free/low + low effort + short time (“daily touchpoints”)
- In-person + schedule + low/medium cost (“weekend connection”)
- Service + coordination=none (“take something off their plate”)
- Celebration contexts + surprise styles (“emotionally safe celebrations”)

### Sprint workflow (step-by-step)
1) **Pick the slice**
   - Limit to 2–4 constraints (so the sprint stays focused).
   - Example: `remote_ok + coordination=none + time<=5min`.

2) **Choose 1–2 formats to emphasize**
   - Example: `message` + `call` for a “touchpoints” sprint.

3) **Generate candidates using patterns**
   - Use the pattern library (Section 4) to create variations quickly.
   - Aim for specificity (a person can do it today) and avoid “generic advice”.

4) **Write + tag immediately (Tier 1 complete)**
   - Don’t defer tagging. If you can’t tag it to Tier 1, it’s not ready.

5) **Apply Tier 2 where clear**
   - Especially `surprise_style` for emotional safety.

6) **Self-review + (optional) second pass**
   - Confirm the idea is actionable, non-guilting, and consistent.

7) **Validate + import/seed**
   - Run the publish gate checklist and validation rules.

8) **Measure coverage and adjust backlog**
   - Update the coverage matrices and pick the next slice.

---

## 4) Idea pattern library (how we generate efficiently)

Instead of inventing every idea from scratch, we use “patterns” to generate high-quality variants.

### 4.1 Communication patterns
- **Appreciation ping:** “Send a message naming one specific thing you appreciate.”
- **Memory nudge:** “Share a photo or memory and ask a simple question.”
- **Future anchor:** “Suggest one small thing to look forward to together.”

### 4.2 Service patterns
- **Friction remover:** “Handle a small annoying task they’ve been putting off.”
- **Admin relief:** “Do a quick errand / admin step that helps their week.”
- **Space reset:** “Make one small area feel calmer (tidy, prep, setup).”

### 4.3 Experience patterns
- **Micro-outing:** “Pick a low-stakes outing with one constraint (time/cost/energy).”
- **Shared ritual:** “Establish a repeating 10-minute ritual (walk, tea, call).”

### 4.4 Gift patterns
- **Meaning-first gift:** “Choose a tiny gift that reflects something they care about.”
- **Homemade token:** “Make a small personal note or keepsake.”

### 4.5 Self-care patterns
- **Restore:** “Help them rest—reduce decisions, reduce friction, offer calm.”
- **Encourage:** “Support a small next step without pressure.”

**Rule of thumb:** if you need 4+ formats to describe it, the idea is too broad—split it.

---

## 5) “Practical help” micro-chores policy (during research)

Many raw inputs will look like chores (“do the dishes”).

Policy:
- Keep micro-chores valid in **personal wishes**.
- Do **not** generate hundreds of granular chores for the public catalog.
- If the theme is valuable, abstract into a small set of higher-level **service templates**:
  - “Take one chore off their plate today.”
  - “Handle the annoying errand they’ve been avoiding.”
  - “Do a 10-minute reset of the space they use most.”

---

## 6) Quality and review (how we prevent drift)

### 6.1 Publish gate (DoD)
An idea is “done” when:
- Base editorial fields are complete.
- Tier 1 facets are complete.
- Consistency checks pass.
- It reads as emotionally safe and non-guilting.

### 6.2 Review checklist (quick)
- Would a real person know what to do in 30 seconds?
- Is the title verb-first and specific?
- Does it avoid guilt or pressure?
- Are tags consistent with logistics/cost?
- Is it a duplicate of an existing idea?

---

## 7) Tooling (pre-Studio)

### Canonical storage
Use a single canonical CSV (plus optional workflow columns like status/reviewer/notes).

### Validation
Run lightweight checks before importing:
- Tier 1 completeness
- slug correctness
- obvious contradictions
- duplicate title warnings

### Test loop
Import/seed into local Supabase and test in the app.

### AI-assisted research
AI can speed up ideation, variation generation, and first-pass tagging, but it must work inside the same guardrails as humans:

- AI outputs are **candidates**, not publishable content by default.
- Never “guess” Tier 2/3 facets.
- Always require Tier 1 completeness before import.
- Always run a human review pass for clarity and emotional safety.

See: **`ai-idea-research_context-pack_v0.md`** for prompt templates, output formats, and guardrails.

---

## 8) Hand-off to Studio (how this evolves)

Once Studio exists, this playbook doesn’t disappear—it becomes “the production process” Studio supports.

Studio should eventually:
- generate coverage dashboards automatically,
- provide tagging UI with trait-driven guardrails,
- run validation checks on save/publish,
- host the candidate inbox (wishes + user submissions).
