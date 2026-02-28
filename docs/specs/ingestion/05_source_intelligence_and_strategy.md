# Source Intelligence and Strategy Selection (v1)

## 1) Objective

Build a repeatable way to:

1. discover high-value sources,
2. determine the best extraction approach for each source,
3. adapt when source structures change.

## 2) Source Registry

Each source entry should store:

1. `source_key`
2. domain/base URLs
3. content type (`ideas`, `calendar`, `guides`, etc.)
4. discovery methods enabled (`sitemap`, `index_page`, `feed`, `manual_seed`)
5. extraction strategy preference order
6. crawl cadence and rate limits
7. legal/compliance metadata
8. health metrics and last-success timestamps
9. quality yield metrics

## 2.1) Source Registry Record Contract (Required)

Minimum record fields:

1. identity:
   - `source_key` (stable unique key)
   - `display_name`
   - `domains[]`
2. lifecycle:
   - `state` (`proposed|approved_for_trial|active|degraded|paused|retired`)
   - `owner_team`
   - `owner_user_id`
   - `reviewed_at`
   - `next_review_at`
3. discovery:
   - `discovery_methods[]` (`manual_seed|sitemap|feed|index_page|search_discovery`)
   - `seed_urls[]`
   - `include_url_patterns[]`
   - `exclude_url_patterns[]`
4. extraction:
   - `strategy_order[]` (`api|feed|sitemap_html|pdf|ics|headless`)
   - `selector_profile_version`
   - `quality_threshold`
5. runtime:
   - `cadence` (cron/rrule)
   - `max_rps`
   - `max_concurrency`
   - `timeout_seconds`
6. compliance:
   - `legal_risk_level` (`low|medium|high`)
   - `robots_checked_at`
   - `terms_checked_at`
   - `approved_for_prod` (boolean)
7. metrics cache:
   - `last_run_at`
   - `last_success_at`
   - `rolling_promotion_rate_30d`
   - `rolling_failure_rate_30d`

## 2.2) Source Registry API Contract (Required)

Core operations:

1. `createSourceProposal(payload)`
2. `approveSourceForTrial(source_key, approver)`
3. `activateSource(source_key, approver)`
4. `setSourceState(source_key, state, reason, actor)`
5. `updateSourceConfig(source_key, patch, config_version, actor)`
6. `listActiveSources()`
7. `getSourceHealth(source_key)`

Audit requirement:

1. Every lifecycle/config mutation must write immutable audit events with old/new values.

## 3) Source Discovery Channels

1. Human-seeded:
   - editorial or operator submits candidate source.
2. Search-driven:
   - query expansion on approved themes.
3. Web graph discovery:
   - related links from high-performing sources.
4. Structured source catalogs:
   - sitemaps and feeds from known domains.

Newly discovered sources must go through approval gates before active ingestion.

## 4) Strategy Selection Ladder

Apply the simplest stable strategy first:

1. Official API
2. Feed/structured endpoint (RSS, JSON, ICS)
3. Sitemap + static HTML extraction
4. Structured documents (PDF)
5. Dynamic rendering/headless browser

Selection criteria:

1. reliability
2. maintenance cost
3. legal risk
4. extraction precision
5. runtime cost

## 5) Source Profiling and Auto-Recommendation

On source onboarding, run a probe pass:

1. fetch root + known listing pages,
2. detect content structure and link patterns,
3. classify candidate strategy and confidence,
4. output recommended extraction plan for operator approval.

## 6) Strategy Pack Interface

Each strategy module should implement:

1. `discover(context) -> discovered pages`
2. `extract(page) -> extracted candidates`
3. `health_check() -> diagnostics`

Modules should be source-overridable and reusable.

## 7) Per-Source Fine-Tuning Controls

Configurable knobs:

1. include URL patterns
2. exclude URL patterns
3. selector priority list
4. text cleaning and filtering rules
5. dedupe sensitivity
6. safety term filtering
7. minimum quality score threshold for inbox

## 8) Breakage Handling

When extraction quality drops or failure spikes:

1. auto-mark source as degraded,
2. downgrade run frequency,
3. open operator alert with evidence,
4. fallback to secondary strategy if available.

## 9) Source Lifecycle States

1. `proposed`
2. `approved_for_trial`
3. `active`
4. `degraded`
5. `paused`
6. `retired`

Transitions should require explicit rationale in audit logs.

Allowed transitions:

1. `proposed -> approved_for_trial`
2. `approved_for_trial -> active|paused`
3. `active -> degraded|paused|retired`
4. `degraded -> active|paused|retired`
5. `paused -> active|retired`
6. `retired` is terminal

## 10) Multi-Source Portfolio Management

Sources should be prioritized by:

1. accepted-idea yield,
2. freshness value,
3. uniqueness/diversity contribution,
4. maintenance burden.

Goal: spend crawl budget on high-value sources while still testing new opportunities.
