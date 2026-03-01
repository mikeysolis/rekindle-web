# Quarterly Governance Review Operation (v1)

## 1) Purpose

Define a repeatable quarterly governance operation that:

1. assesses source portfolio value vs maintenance burden
2. records policy updates and retraining decisions
3. assigns owners and due dates for all follow-up actions

## 2) Cadence and Scheduling Contract

1. Run once per quarter within the first 10 business days.
2. Product owner is accountable for scheduling and completion.
3. Required participants:
   - product owner (chair)
   - ingestion owner / on-call representative
   - compliance owner
   - editorial operations lead
4. Required output is a completed quarterly record with named owners and dates.

## 3) Required Inputs (Pre-Read)

Assemble these before the meeting:

1. Source portfolio (7/30/90-day windows) from Studio Ingestion dashboard:
   - accepted ideas
   - precision proxy
   - maintenance failure rate
   - freshness contribution
   - diversity contribution
2. Source health and reliability evidence:
   - `npm run pipeline:source-health`
   - recent run outcomes from `ingest_runs`
3. Incident/compliance evidence:
   - `npm run pipeline:incident-alerts`
   - compliance and lifecycle metadata from `ingest_source_registry`
4. Learning-loop evidence:
   - label quality analytics (reject reasons, rewrite burden, duplicate-confirmed rate)
   - experiment and rollout outcomes from Studio tuning history

## 4) Decision Framework: Value vs Maintenance Burden

Evaluate each active source with this matrix:

1. High value + low burden:
   - keep active
   - consider increasing cadence/crawl budget
2. High value + high burden:
   - keep active with explicit stabilization plan
   - assign reliability/compliance remediation owner
3. Low value + low burden:
   - keep on low-frequency cadence
   - monitor for trend change
4. Low value + high burden:
   - pause or retire unless strategic rationale is documented

## 5) Mandatory Review Outputs

Every quarterly review record must include:

1. source lifecycle decisions (`active`, `degraded`, `paused`, `retired`)
2. top policy risks and accepted mitigations
3. policy update log with effective date
4. retraining action register with owners and due dates
5. experiment backlog for next quarter

## 6) Quarterly Record Template

Create one record per quarter, for example:

`docs/ops/ingestion/governance-reviews/2026/2026-Q2.md`

Use this template:

```markdown
# Ingestion Governance Review - <YYYY-Q#>
Date: <YYYY-MM-DD>
Chair: <name>
Attendees: <names>

## 1) Summary
1. Overall portfolio health: <green|yellow|red>
2. Key risks this quarter:
   - <risk 1>
   - <risk 2>
3. Key wins this quarter:
   - <win 1>
   - <win 2>

## 2) Source Portfolio Decisions
| Source | Value Signal | Burden Signal | Current State | Decision | Owner | Due Date |
|---|---|---|---|---|---|---|
| rak | high | medium | active | keep_active_with_tuning | <owner> | <date> |

## 3) Policy Update Log
| Policy Area | Problem Observed | Decision | Effective Date | Owner |
|---|---|---|---|---|
| compliance TTL | terms checks drifting | enforce monthly checklist reminder | <date> | <owner> |

## 4) Retraining Action Register
| Action | Audience | Training Asset | Owner | Due Date | Success Metric |
|---|---|---|---|---|---|
| reject-reason refresher | editors | <doc/link> | <owner> | <date> | heavy rewrite share < target |

## 5) Next-Quarter Experiments
| Hypothesis | Scope | Success Metric | Guardrails | Owner |
|---|---|---|---|---|
| <hypothesis> | <source set> | <metric> | <guardrails> | <owner> |

## 6) Sign-Off
1. Product owner: <name/date>
2. Compliance owner: <name/date>
3. Ingestion owner: <name/date>
4. Editorial operations lead: <name/date>
```

## 7) Completion SLA

1. Review record published within 3 business days of meeting.
2. All action items copied into backlog/tracker within 2 business days.
3. At least one owner and due date on every decision row.
