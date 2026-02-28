import "server-only";

export type IngestionEnv = {
  url: string;
  serviceRoleKey: string;
};

let cachedEnv: IngestionEnv | null = null;

export function getIngestionEnv(): IngestionEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const url = process.env.INGEST_SUPABASE_URL;
  const serviceRoleKey = process.env.INGEST_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing ingestion env vars. Set INGEST_SUPABASE_URL and INGEST_SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cachedEnv = { url, serviceRoleKey };
  return cachedEnv;
}
