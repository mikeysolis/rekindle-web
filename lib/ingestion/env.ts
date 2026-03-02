import "server-only";

export type IngestionEnv = {
  url: string;
  serviceRoleKey: string;
};

const ENV_CONTRACT_DOC_PATH = "docs/specs/ingestion/14_environment_and_secrets_contract.md";

let cachedEnv: IngestionEnv | null = null;

export function getIngestionEnv(): IngestionEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Forbidden env var NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is set. Service role keys must never be public. See " +
        ENV_CONTRACT_DOC_PATH +
        ".",
    );
  }

  if (process.env.INGEST_SUPABASE_KEY) {
    throw new Error(
      "Forbidden env var INGEST_SUPABASE_KEY is set. Use INGEST_SUPABASE_SERVICE_ROLE_KEY only. See " +
        ENV_CONTRACT_DOC_PATH +
        ".",
    );
  }

  const url = process.env.INGEST_SUPABASE_URL;
  const serviceRoleKey = process.env.INGEST_SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (url && appUrl && url === appUrl) {
    throw new Error(
      "INGEST_SUPABASE_URL must not match NEXT_PUBLIC_SUPABASE_URL. App and ingestion must use separate Supabase projects. See " +
        ENV_CONTRACT_DOC_PATH +
        ".",
    );
  }

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing ingestion env vars. Set INGEST_SUPABASE_URL and INGEST_SUPABASE_SERVICE_ROLE_KEY. See " +
        ENV_CONTRACT_DOC_PATH +
        ".",
    );
  }

  cachedEnv = { url, serviceRoleKey };
  return cachedEnv;
}
