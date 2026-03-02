# Decisions and Open Questions (v2)
_Last updated: 2026-02-28_

## 1) Global Constraints (Locked)

1. Ingestion durable store is separate from app editorial schema.
2. No automatic publish from ingestion output.
3. Studio Inbox is the human control point.
4. Promotion to draft must be idempotent and logged.
5. Source attribution is required at all stages.

## 2) Decision Log (Locked for Epics 2-5)

### DEC-001: Source discovery authority
Date locked: 2026-02-28  
Owner: Product Owner (with Editorial Ops)

Decision:
1. System can discover and propose new sources automatically.
2. Discovered sources must be created in `proposed` state only.
3. No source can move to `approved_for_trial` or `active` without human approval.

### DEC-002: Strategy automation scope
Date locked: 2026-02-28  
Owner: Ingestion Platform Engineer

Decision:
1. Automatic fallback is allowed only within a source's pre-approved `strategy_order`.
2. Runtime may auto-switch strategies only after degradation signals.
3. Runtime cannot auto-enable new source domains or bypass governance states.

### DEC-003: Quality model adoption policy
Date locked: 2026-02-28  
Owner: Product Owner + Studio Engineer

Decision:
1. Phase 0-2 use deterministic rules for inbox gating.
2. Model outputs are allowed in shadow/ranking assist mode only.
3. Model-based blocking decisions require explicit policy review after Gate C.

### DEC-004: Snapshot retention
Date locked: 2026-02-28  
Owner: Ingestion Platform Engineer

Decision:
1. Run snapshots (JSONL/object artifacts) keep 90 days in hot storage.
2. Snapshots are archived for 365 days in cold storage.
3. Run metadata and sync/audit logs remain long-term for traceability.

### DEC-005: Source policy governance authority
Date locked: 2026-02-28  
Owner: Product Owner (governance accountable)

Decision:
1. Trial approval (`proposed -> approved_for_trial`) requires Product Owner approval.
2. Production activation (`approved_for_trial -> active`) requires Product Owner + Compliance approval.
3. Retirement (`* -> retired`) requires Product Owner approval with compliance acknowledgment.

### DEC-006: Queue runtime decision
Date locked: 2026-02-28  
Owner: Ingestion Platform Engineer

Decision:
1. Phase 0-2 runtime is scheduler + worker process model in this repo.
2. Jobs must be idempotent and source-isolated with retry/backoff.
3. Revisit managed queue adoption when either:
   - active sources > 25, or
   - backlog delay > 15 minutes for 14 consecutive days.

### DEC-007: Configuration storage decision
Date locked: 2026-02-28  
Owner: Ingestion Platform Engineer

Decision:
1. Source runtime configuration is DB-managed through source registry contracts.
2. Repository config remains for defaults/templates and test fixtures.
3. Runtime changes require versioned audit events with actor identity.

### DEC-008: Replay reproducibility contract
Date locked: 2026-02-28  
Owner: Ingestion Platform Engineer

Decision:
1. Each run must store:
   - `extractor_version`
   - `strategy_version`
   - `source_config_version`
   - snapshot artifact location
2. Replay defaults to original run versions unless explicitly overridden.
3. Any replay override must be logged in run metadata.

### DEC-009: Duplicate detection strategy
Date locked: 2026-02-28  
Owner: Ingestion Platform Engineer + Studio Engineer

Decision:
1. Deterministic `candidate_key` is the hard dedupe mechanism.
2. Fuzzy similarity is advisory only and powers Studio duplicate hints.
3. Fuzzy match signals cannot auto-reject or auto-promote candidates.

### DEC-010: Mandatory legal review checklist
Date locked: 2026-02-28  
Owner: Compliance Owner

Decision:
1. Each source must record:
   - terms compatibility status
   - robots review timestamp
   - allowed extraction scope
   - attribution requirements
   - risk level and owner
2. Missing checklist fields block production activation.

### DEC-011: Excerpt length cap
Date locked: 2026-02-28  
Owner: Compliance Owner + Ingestion Platform Engineer

Decision:
1. `raw_excerpt` is capped at 500 characters in `ingest_candidates`.
2. Candidate rows must not store full-page copied text bodies.
3. Full snapshots, when needed for replay, stay in restricted storage and are not editor-default UI payloads.

### DEC-012: Automatic source pause/degrade thresholds
Date locked: 2026-02-28  
Owner: Ingestion Platform On-Call

Decision:
1. Immediate pause for:
   - compliance pre-run check failure
   - Sev-1 incident
2. Automatic degrade for:
   - >= 3 consecutive scheduled run failures, or
   - >= 50% run failure rate over trailing 24 hours (minimum 6 runs)
3. Automatic pause from degraded for:
   - >= 5 consecutive scheduled run failures, or
   - repeated guardrail regressions for 2 consecutive days

## 3) Ownership Matrix (Published)

1. Source proposal approval owner: Product Owner.
2. Source production activation approvers: Product Owner and Compliance Owner.
3. Source retirement owner: Product Owner (compliance acknowledgment required).
4. Emergency source pause authority: Ingestion Platform On-Call (immediate action allowed).
5. Source reactivation approvers after pause/degraded: Product Owner and Compliance Owner.

## 4) Remaining Open Questions (Non-Blocking for Current Execution)

1. Editorial taxonomy granularity:
   - final rejection taxonomy depth and naming conventions.
2. Secondary review policy:
   - which sensitive categories require two-step editorial approval.
3. Managed queue migration architecture:
   - exact provider/runtime choice if DEC-006 triggers are met.

## 5) Delivery Risks Requiring Active Management

1. Feature creep into autonomous publishing.
2. Over-indexing on candidate volume rather than acceptance quality.
3. Under-investment in feedback-loop instrumentation.
4. Expanding source count before source health tooling is stable.
