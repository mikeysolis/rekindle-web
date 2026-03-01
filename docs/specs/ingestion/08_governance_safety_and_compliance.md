# Governance, Safety, and Compliance (v1)

## 1) Governance Objectives

1. Protect users from harmful or low-integrity suggestions.
2. Respect source terms and legal boundaries.
3. Maintain auditability for every decision path.
4. Ensure ingestion can scale without policy drift.

## 2) Source Governance Policy

Before source activation:

1. confirm public accessibility and terms compatibility
2. classify legal risk level
3. define allowed extraction scope
4. define attribution requirements
5. assign owner and review cadence

No source should run in production without an approved registry entry.

## 2.1) Runtime Compliance Enforcement (Required)

Every scheduled run must pass pre-run checks:

1. source state is `active`
2. `approved_for_prod=true`
3. `robots_checked_at` is within policy TTL (recommended 7 days)
4. `terms_checked_at` is within policy TTL (recommended 30 days)
5. source is not on legal hold list

If any check fails:

1. block run execution
2. emit compliance alert
3. auto-transition source to `paused` or `degraded` per severity
4. require human review to reactivate

## 3) Content Handling Policy

1. Retain source URL for every candidate.
2. Store short excerpts only; avoid large verbatim copies by default.
3. Prefer rewritten editorial copy before publication.
4. Keep provenance metadata through promotion workflow.

## 4) Safety and Editorial Controls

1. Safety flags at ingestion stage:
   - harmful framing
   - manipulative/guilt language
   - unsafe physical suggestions

2. Mandatory human review for publication path.
3. Structured reject reasons for moderation analytics.

## 5) Access Control

1. Only editor/admin roles can mutate ingestion decisions.
2. Service-role credentials are server-only and never exposed to client.
3. All mutating actions require authenticated actor identity.

## 6) Audit and Traceability

Audit events must include:

1. actor
2. action
3. target IDs
4. timestamp
5. status and error text if any

Data lineage should allow tracing:

`source page -> candidate -> draft -> published idea`.

## 7) Privacy and Data Minimization

1. Avoid collecting unnecessary personal data.
2. If user-submitted ideas enter intake, treat them as untrusted boundary inputs.
3. Apply retention controls and redaction paths for sensitive content.

## 8) Incident Governance

When policy breaches occur:

1. pause affected source(s)
2. quarantine impacted candidates
3. notify owner and compliance channel
4. run root-cause and remediation

Incident severity minimums:

1. Sev-1:
   - legal/terms violation or harmful content published path
2. Sev-2:
   - repeated policy bypass with no published impact
3. Sev-3:
   - isolated policy flag caught before editorial action

## 9) Review Cadence

1. weekly: operational policy checks (source health and risk events)
2. monthly: compliance and source registry review
3. quarterly: policy updates and training refresh

## 10) Quarterly Governance Review Operation

Quarterly governance execution must follow:

1. `16_quarterly_governance_review_operation.md` template and schedule contract
2. portfolio decision framework (value vs maintenance burden)
3. mandatory policy update log and retraining action register with owners/dates
