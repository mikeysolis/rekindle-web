-- Preferred routine cleanup for ingestion (non-destructive to source registry).
-- Run against the ingestion project in SQL editor or psql.
truncate table
  public.ingest_sync_log,
  public.ingest_candidate_traits,
  public.ingest_editor_labels,
  public.ingest_candidates,
  public.ingest_pages,
  public.ingest_runs
cascade;
