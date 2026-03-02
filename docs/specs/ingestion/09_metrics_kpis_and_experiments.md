# Metrics, KPIs, and Experiment Framework (v1)

## 1) Measurement Philosophy

Do not optimize for scraped volume. Optimize for accepted, publishable, diverse ideas delivered with low editorial friction.

## 2) North Star Metric

`Accepted publishable ideas per week` segmented by source and category diversity.

## 3) Core KPI Sets

### 3.1 Quality KPIs

1. Promotion rate (`promoted / reviewed`)
2. Rejection rate by reason
3. Edit burden before promotion (light/moderate/heavy)
4. Duplicate rate among reviewed candidates

### 3.2 Throughput KPIs

1. Candidates ingested per day/week
2. Reviewed candidates per editor per day
3. Time from candidate creation to decision
4. Time from promote to publishable status

### 3.3 Source Portfolio KPIs

1. Accepted ideas per source
2. Source precision proxy (`promoted / inboxed`)
3. Source freshness contribution
4. Source maintenance cost (failures, manual tune time)

### 3.4 Reliability KPIs

1. Run success/partial/failed rates
2. Mean time to detection for source breakage
3. Mean time to recovery
4. Scheduler adherence

## 4) Dashboard Requirements

1. ingestion operations dashboard
2. source health dashboard
3. editorial inbox quality dashboard
4. trend view over 7/30/90 days

## 5) Experiment Framework

Every tuning change should be tracked as an experiment:

1. hypothesis
2. change set
3. scope (sources/strategies)
4. success metric(s)
5. guardrail metric(s)
6. start/end dates
7. decision (adopt/revert/iterate)

## 6) Guardrail Metrics

1. safety flag rate must not worsen.
2. duplicate rate must not worsen.
3. legal/compliance incidents must not increase.
4. editor time per accepted idea should trend down.

## 7) Leading vs Lagging Indicators

Leading:

1. candidate quality score distribution
2. source extraction health
3. early rejection reasons

Lagging:

1. publishable idea output
2. downstream user engagement impact

## 8) Quarterly Review Template

1. Which sources created net value?
2. Which strategies are too expensive to maintain?
3. Which rejection reasons are most common?
4. Which taxonomy areas are under-supplied?
5. What experiments should run next quarter?
6. Use `16_quarterly_governance_review_operation.md` for required template fields, owner assignment, and completion SLA.

## 9) Gate Target Bands (for Implementation Phases)

Use trailing windows unless noted.

Gate A targets (Phase 0 exit, trailing 14 days):

1. run success rate >= 95%
2. promotion rate >= 10% on at least one active source
3. duplicate-confirmed rate <= 15%

Gate B targets (Phase 1 exit, trailing 14 days):

1. schedule adherence >= 97%
2. run success rate >= 97%
3. at least 4 active sources with weekly accepted ideas > 0

Gate C targets (Phase 3 exit, measured against baseline over at least 28 days):

1. rejection rate reduced by >= 20% on tuned sources
2. heavy rewrite share reduced by >= 25%
3. no guardrail regressions (safety, duplicates, incidents)

Gate D targets (Phase 4 exit, trailing 30 days):

1. run success rate >= 99%
2. mean time to recovery < 4 hours
3. sev-1 compliance incidents = 0
