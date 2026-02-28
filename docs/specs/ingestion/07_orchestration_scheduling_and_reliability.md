# Orchestration, Scheduling, and Reliability (v1)

## 1) Objective

Run ingestion continuously across many sources with predictable reliability, bounded cost, and strong recovery behavior.

## 2) Orchestration Responsibilities

1. trigger runs on schedule or manual command
2. enforce source-level concurrency and rate limits
3. route run stages (`discover -> extract -> normalize -> score -> persist`)
4. record run-level metrics and status
5. retry failed units safely

## 3) Scheduling Model

Use mixed cadence by source class:

1. high-yield stable sources: daily
2. medium-yield sources: every 2-3 days
3. low-yield experimental sources: weekly
4. degraded sources: paused or low-frequency probe mode

## 4) Run Types

1. Full run:
   - discover and extract across configured scope.
2. Incremental run:
   - only new/changed pages since last successful run.
3. Replay run:
   - reprocess historical run/pages with updated extraction logic.
4. Backfill run:
   - historical catch-up for newly onboarded source.

## 5) Queue Design

Work item hierarchy:

1. run job
2. page extraction job
3. candidate post-processing job

Each job must carry:

1. idempotency key
2. source key
3. attempt count
4. timeout budget

## 6) Failure Isolation

1. Source failure must not stop other sources.
2. Page failure must not fail full run by default.
3. Failed jobs should be retried with capped exponential backoff.
4. Persistent failures should open alerts with evidence.

## 7) Reliability Requirements

1. at-least-once execution with idempotent writes
2. replay-safe dedupe keys
3. durable run logs and snapshots
4. timeouts and circuit breakers per source

## 8) Observability Requirements

Run dashboard should show:

1. run success/partial/failed counts
2. per-source latency and failure rates
3. candidate yield per source
4. candidate quality distribution
5. backlog depth

Alerts:

1. zero-yield anomaly on normally high-yield source
2. extraction failure spike
3. sudden rejection-rate increase
4. schedule misses

## 9) Operational Runbooks

Required runbooks:

1. source extraction broke after site change
2. ingestion DB connectivity failure
3. queue backlog growth
4. duplicate explosion
5. low-quality surge in inbox

Each runbook should include:

1. detection signals
2. immediate mitigation
3. root-cause steps
4. rollback and replay steps

## 10) Environments

1. Local:
   - developer iteration and test runs.
2. Staging:
   - integration and canary tuning tests.
3. Production:
   - scheduled ingestion and live editorial feed.

Promotions between environments should be versioned and auditable.
