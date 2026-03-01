# Extraction Quality and Learning Loop (v1)

## 1) Goal

Continuously improve candidate precision and usefulness using editorial outcomes as training signals.

## 2) Learning Inputs

Capture structured labels from Studio actions:

1. promoted as-is
2. promoted after edits
3. rejected
4. needs work
5. rejection reason code
6. rewrite severity score (light/moderate/heavy)
7. duplicate confirmation (true/false)

Storage contract:

1. persist label rows in `ingest_editor_labels`
2. include `candidate_id`, `actor_user_id`, and timestamp for every label
3. enforce standardized reject reason taxonomy in Studio UI:
   - `not_actionable`
   - `too_vague_or_generic`
   - `duplicate_existing_idea`
   - `safety_or_harm_risk`
   - `policy_or_compliance_risk`
   - `off_topic_for_rekindle`
   - `low_content_quality`
   - `extraction_error_or_incomplete`
   - `paywalled_or_missing_context`

## 3) Quality Scoring Stages

1. Extraction Quality:
   - structural confidence (did parser likely read intended content?)
2. Idea Quality:
   - actionability score
   - clarity score
   - specificity score
3. Risk Quality:
   - safety/compliance risk
   - copyright risk proxy
   - duplicate risk

Candidates below threshold can be hidden or down-ranked from the inbox by default.

## 4) Rule and Model Layers

1. Deterministic rules:
   - URL filters
   - text-length and token heuristics
   - action-verb patterns
   - blocklists

2. Statistical/model layer (optional v2+):
   - idea-vs-noise classifier
   - duplicate similarity model
   - rewrite-needed predictor

Start with rules, then add models where they clearly reduce editorial burden.

## 5) Feedback Processing Pipeline

1. ingest labels from Studio events
2. join labels with extraction metadata
3. compute per-source/per-strategy performance
4. generate candidate tuning changes
5. validate on holdout data
6. deploy config/model updates with versioning

Experiment tracking requirement:

1. every tuning change maps to an `ingest_experiments` row
2. baseline/treatment metrics stored in `ingest_experiment_metrics`
3. deployed config changes stored in `ingest_tuning_changes`

## 6) Tuning Outputs

Tuning can adjust:

1. source include/exclude patterns
2. selector priority
3. text normalization rules
4. quality thresholds
5. source run frequency

Every change must be traceable to measured effects.

## 7) Evaluation Metrics

1. Promotion rate by source and strategy.
2. Rejection rate by reason.
3. Average edit distance before promotion.
4. Duplicate hit rate.
5. Time-to-decision in inbox.

## 8) Safe Deployment Pattern

1. candidate changes in shadow mode
2. A/B or canary on subset of sources
3. compare against baseline KPIs
4. promote only if metrics improve

Minimum sample size gate:

1. do not accept tuning changes until both control and treatment have at least 200 reviewed candidates or 14 days of data, whichever is longer.

## 9) Human Override Rules

1. Editors can always override machine score.
2. Admins can force source pause regardless of score.
3. Low confidence candidates must never auto-promote.

## 10) Learning Maturity Stages

1. Stage A:
   - manual tuning from dashboard observations.
2. Stage B:
   - automated rule suggestions.
3. Stage C:
   - model-assisted ranking and threshold suggestions.
4. Stage D:
   - self-optimizing recommendations with mandatory human approval gate.
